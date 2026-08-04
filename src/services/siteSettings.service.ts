import { SiteSettings } from "../models/siteSettings.model";

/** Singleton — created empty on first read, same pattern as feeConfig. */
export async function getSiteSettings() {
  let settings = await SiteSettings.findOne();
  if (!settings) settings = await SiteSettings.create({});
  return settings;
}

export async function updateSiteSettings(updates: { announcement?: string; bannerUrl?: string }) {
  const settings = await getSiteSettings();
  if (updates.announcement !== undefined) settings.announcement = updates.announcement;
  if (updates.bannerUrl !== undefined) settings.bannerUrl = updates.bannerUrl;
  await settings.save();
  return settings;
}
