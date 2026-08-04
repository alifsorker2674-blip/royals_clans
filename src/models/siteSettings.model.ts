import { Schema, model, Document } from "mongoose";

/** Singleton doc for admin-controlled site content (announcement bar, home banner). */
export interface ISiteSettings extends Document {
  announcement: string;
  bannerUrl: string;
  updatedAt: Date;
}

const siteSettingsSchema = new Schema<ISiteSettings>(
  {
    announcement: { type: String, default: "", trim: true, maxlength: 500 },
    bannerUrl: { type: String, default: "", trim: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const SiteSettings = model<ISiteSettings>("SiteSettings", siteSettingsSchema);
