import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/royal-clans",
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "dev_access_secret_change_me",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "dev_refresh_secret_change_me",
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || "15m",
    refreshExpiryDays: Number(process.env.JWT_REFRESH_EXPIRY_DAYS) || 30,
  },
  clientUrls: (process.env.CLIENT_URLS || "http://localhost:3000,http://localhost:3001")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || "",
    privateKey: process.env.VAPID_PRIVATE_KEY || "",
    subject: process.env.VAPID_SUBJECT || "mailto:admin@royalclans.local",
  },
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || "",
};
