import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { protect } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { AppError } from "../utils/AppError";

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".png";
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new AppError(400, "Only image files (png/jpg/webp/gif) are allowed"));
  },
});

const router = Router();

/**
 * @openapi
 * /uploads/screenshot:
 *   post:
 *     tags: [Uploads]
 *     summary: Upload a match-result screenshot (image, max 5 MB)
 *     description: Returns an absolute URL to use as `screenshotUrl` when submitting a result.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Uploaded — response contains the public URL
 *       400:
 *         description: Not an image, or over the size limit
 */
router.post(
  "/screenshot",
  protect,
  upload.single("file"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw new AppError(400, "No file was uploaded — send it as multipart field \"file\"");
    const url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    sendSuccess(res, 200, { url }, "Screenshot uploaded");
  })
);

export default router;
