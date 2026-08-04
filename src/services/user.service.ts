import { User, UserRole } from "../models/user.model";
import { AppError } from "../utils/AppError";

export async function listUsers(
  filters: { role?: UserRole; isBanned?: boolean; search?: string },
  skip: number,
  limit: number
) {
  const filter: Record<string, unknown> = {};
  if (filters.role) filter.role = filters.role;
  if (filters.isBanned !== undefined) filter.isBanned = filters.isBanned;
  if (filters.search) {
    filter.$or = [
      { name: { $regex: filters.search, $options: "i" } },
      { email: { $regex: filters.search, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  return { items, total };
}

export async function setBanStatus(userId: string, isBanned: boolean) {
  const user = await User.findByIdAndUpdate(userId, { isBanned }, { new: true });
  if (!user) throw new AppError(404, "User not found");
  return user;
}

export async function changeRole(userId: string, role: UserRole, requesterId: string) {
  if (userId === requesterId) {
    throw new AppError(400, "You cannot change your own role");
  }
  const user = await User.findByIdAndUpdate(userId, { role }, { new: true });
  if (!user) throw new AppError(404, "User not found");
  return user;
}
