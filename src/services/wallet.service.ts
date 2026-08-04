import { Types } from "mongoose";
import { User } from "../models/user.model";
import { Transaction, TransactionType, TransactionMethod } from "../models/transaction.model";
import { AppError } from "../utils/AppError";
import { notifyAdmins, sendPushToUser } from "./notification.service";

/**
 * Debits a user's wallet immediately (used for internal spends: tournament entry,
 * tournament create fee, quick match entry) and records an approved ledger entry.
 * Uses a conditional atomic update so the balance can never go negative under
 * concurrent requests, without requiring a MongoDB replica set / multi-doc transaction.
 */
export async function debitWallet(
  userId: string | Types.ObjectId,
  amount: number,
  type: TransactionType,
  opts: { relatedTournament?: string | Types.ObjectId } = {}
) {
  if (amount <= 0) throw new AppError(400, "Amount must be greater than zero");

  const user = await User.findOneAndUpdate(
    { _id: userId, walletBalance: { $gte: amount } },
    { $inc: { walletBalance: -amount } },
    { new: true }
  );
  if (!user) throw new AppError(400, "Insufficient wallet balance");

  const transaction = await Transaction.create({
    userId,
    type,
    amount,
    method: "internal",
    status: "approved",
    relatedTournament: opts.relatedTournament,
  });

  return { user, transaction };
}

/** Credits a user's wallet immediately (prize payouts, refunds, admin adjustments). */
export async function creditWallet(
  userId: string | Types.ObjectId,
  amount: number,
  type: TransactionType,
  opts: { relatedTournament?: string | Types.ObjectId; reviewedBy?: string | Types.ObjectId } = {}
) {
  if (amount <= 0) throw new AppError(400, "Amount must be greater than zero");

  const user = await User.findByIdAndUpdate(userId, { $inc: { walletBalance: amount } }, { new: true });
  if (!user) throw new AppError(404, "User not found");

  const transaction = await Transaction.create({
    userId,
    type,
    amount,
    method: "internal",
    status: "approved",
    relatedTournament: opts.relatedTournament,
    reviewedBy: opts.reviewedBy,
  });

  return { user, transaction };
}

/** Player submits a manual bKash/Nagad deposit — stays pending until an admin approves it. */
export async function requestDeposit(
  userId: string,
  amount: number,
  method: TransactionMethod,
  referenceId: string
) {
  if (amount <= 0) throw new AppError(400, "Amount must be greater than zero");
  const user = await User.findById(userId);
  const txn = await Transaction.create({ userId, type: "deposit", amount, method, referenceId, status: "pending" });

  notifyAdmins({
    title: "New deposit request",
    body: `৳${amount} via ${method} from ${user?.name ?? "a player"}`,
    url: "/transactions",
  });

  return txn;
}

/** Player requests a withdrawal — balance is only deducted once an admin approves it. */
export async function requestWithdrawal(userId: string, amount: number, method: TransactionMethod) {
  if (amount <= 0) throw new AppError(400, "Amount must be greater than zero");

  const user = await User.findById(userId);
  if (!user) throw new AppError(404, "User not found");
  if (user.walletBalance < amount) throw new AppError(400, "Insufficient wallet balance");

  const txn = await Transaction.create({ userId, type: "withdrawal", amount, method, status: "pending" });

  notifyAdmins({
    title: "New withdrawal request",
    body: `৳${amount} via ${method} from ${user.name}`,
    url: "/transactions",
  });

  return txn;
}

export async function listMyTransactions(userId: string, skip: number, limit: number) {
  const [items, total] = await Promise.all([
    Transaction.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Transaction.countDocuments({ userId }),
  ]);
  return { items, total };
}

export async function listPendingTransactions(skip: number, limit: number, type?: TransactionType) {
  const filter: Record<string, unknown> = { status: "pending" };
  if (type) filter.type = type;

  const [items, total] = await Promise.all([
    Transaction.find(filter).populate("userId", "name email").sort({ createdAt: 1 }).skip(skip).limit(limit),
    Transaction.countDocuments(filter),
  ]);
  return { items, total };
}

export async function approveTransaction(transactionId: string, adminId: string) {
  const txn = await Transaction.findById(transactionId);
  if (!txn || txn.status !== "pending") throw new AppError(400, "No pending transaction found with this id");

  if (txn.type === "deposit") {
    await User.findByIdAndUpdate(txn.userId, { $inc: { walletBalance: txn.amount } });
  } else if (txn.type === "withdrawal") {
    const user = await User.findOneAndUpdate(
      { _id: txn.userId, walletBalance: { $gte: txn.amount } },
      { $inc: { walletBalance: -txn.amount } }
    );
    if (!user) throw new AppError(400, "User no longer has sufficient balance for this withdrawal");
  } else {
    throw new AppError(400, `Transactions of type "${txn.type}" do not go through manual approval`);
  }

  txn.status = "approved";
  txn.reviewedBy = new Types.ObjectId(adminId);
  await txn.save();

  sendPushToUser(txn.userId.toString(), {
    title: `${txn.type === "deposit" ? "Deposit" : "Withdrawal"} approved`,
    body: `Your ${txn.type} of ৳${txn.amount} has been approved.`,
    url: "/wallet",
  });

  return txn;
}

export async function rejectTransaction(transactionId: string, adminId: string, reason: string) {
  const txn = await Transaction.findById(transactionId);
  if (!txn || txn.status !== "pending") throw new AppError(400, "No pending transaction found with this id");

  txn.status = "rejected";
  txn.reviewedBy = new Types.ObjectId(adminId);
  txn.rejectionReason = reason;
  await txn.save();

  sendPushToUser(txn.userId.toString(), {
    title: `${txn.type === "deposit" ? "Deposit" : "Withdrawal"} rejected`,
    body: `Your ${txn.type} of ৳${txn.amount} was rejected: ${reason}`,
    url: "/wallet",
  });

  return txn;
}
