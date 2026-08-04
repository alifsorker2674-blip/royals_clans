import webpush from "web-push";
import { env } from "../config/env";
import { PushSubscription } from "../models/pushSubscription.model";
import { User } from "../models/user.model";

if (env.vapid.publicKey && env.vapid.privateKey) {
  webpush.setVapidDetails(env.vapid.subject, env.vapid.publicKey, env.vapid.privateKey);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/** Sends a push notification to every device a user has subscribed from. Prunes dead subscriptions. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!env.vapid.publicKey || !env.vapid.privateKey) return; // push not configured — no-op

  const subs = await PushSubscription.find({ userId });
  if (subs.length === 0) return;

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify(payload)
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription is gone (unsubscribed / expired) — clean it up.
          await PushSubscription.deleteOne({ _id: sub._id });
        } else {
          console.error("Push notification failed:", err);
        }
      }
    })
  );
}

export async function sendPushToAdmins(payload: PushPayload): Promise<void> {
  const admins = await User.find({ role: "admin" }).select("_id");
  await Promise.allSettled(admins.map((admin) => sendPushToUser(admin._id.toString(), payload)));
}

export async function sendDiscordMessage(content: string): Promise<void> {
  if (!env.discordWebhookUrl) return; // Discord not configured — no-op

  try {
    await fetch(env.discordWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  } catch (err) {
    console.error("Discord webhook failed:", err);
  }
}

/** Notifies admins on both channels — push (to their subscribed devices) and Discord. */
export async function notifyAdmins(payload: PushPayload, discordContent?: string): Promise<void> {
  await Promise.allSettled([
    sendPushToAdmins(payload),
    sendDiscordMessage(discordContent ?? `**${payload.title}**\n${payload.body}`),
  ]);
}
