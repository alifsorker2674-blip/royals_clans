import { Router } from "express";
import healthRoute from "./health.route";
import authRoute from "./auth.route";
import walletRoute from "./wallet.route";
import tournamentRoute from "./tournament.route";
import feeConfigRoute from "./feeConfig.route";
import adminRoute from "./admin.route";
import dashboardRoute from "./dashboard.route";
import matchRoute from "./match.route";
import pushRoute from "./push.route";
import quickMatchRoute from "./quickMatch.route";
import leaderboardRoute from "./leaderboard.route";
import clanRoute from "./clan.route";
import organizerRoute from "./organizer.route";
import uploadRoute from "./upload.route";
import siteSettingsRoute from "./siteSettings.route";

const router = Router();

router.use("/health", healthRoute);
router.use("/auth", authRoute);
router.use("/wallet", walletRoute);
router.use("/tournaments", tournamentRoute);
router.use("/fee-config", feeConfigRoute);
router.use("/admin", adminRoute);
router.use("/dashboard", dashboardRoute);
router.use("/matches", matchRoute);
router.use("/push", pushRoute);
router.use("/quick-match", quickMatchRoute);
router.use("/leaderboard", leaderboardRoute);
router.use("/clans", clanRoute);
router.use("/organizer", organizerRoute);
router.use("/uploads", uploadRoute);
router.use("/settings", siteSettingsRoute);

export default router;
