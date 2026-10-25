
import express from "express";
import jwt from "jsonwebtoken";
import { query } from "../db.js";
import {
  requireAuth,
  COOKIE,
  cookieOptions,
  signToken,
} from "../middleware.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured");
}

// POST /api/impersonation/start/:userId
router.post("/start/:userId", requireAuth, async (req, res) => {
  try {
    // Only administrators may start impersonation.
    if (Number(req.user.role_id) !== 1) {
      return res.status(403).json({
        message: "Only administrators can impersonate users.",
      });
    }

    // Verify the current token is not already an impersonation token.
    const token = req.cookies?.[COOKIE];

    if (!token) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.impersonatedBy || decoded.impersonationLogId) {
      return res.status(403).json({
        message: "Nested impersonation is not allowed.",
      });
    }

    const targetId = Number(req.params.userId);
    const adminId = Number(req.user.id);

    if (!Number.isSafeInteger(targetId) || targetId <= 0) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    if (targetId === adminId) {
      return res.status(400).json({
        message: "You cannot impersonate your own account.",
      });
    }

    // Confirm that the target account exists and is eligible.
    const targetResult = await query(
      `SELECT id, role_id, status, is_blocked, is_removed
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [targetId]
    );

    const target = targetResult.rows[0];

    if (!target) {
      return res.status(404).json({ message: "User not found." });
    }

    if (
      Number(target.status) !== 1 ||
      Boolean(target.is_blocked) ||
      Boolean(target.is_removed)
    ) {
      return res.status(403).json({
        message: "This account is not eligible for impersonation.",
      });
    }

    // Avoid impersonating another administrator.
    if (Number(target.role_id) === 1) {
      return res.status(403).json({
        message: "Administrator accounts cannot be impersonated.",
      });
    }

    // Record the start before issuing the impersonation token.
    const logResult = await query(
      `INSERT INTO impersonation_logs (admin_user_id, target_user_id)
       VALUES ($1, $2)
       RETURNING id`,
      [adminId, targetId]
    );

    const logId = logResult.rows[0].id;

    const impersonationToken = jwt.sign(
      {
        sub: String(targetId),
        impersonatedBy: adminId,
        impersonationLogId: logId,
      },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.cookie(COOKIE, impersonationToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    return res.json({
      message: "Impersonation started.",
      impersonating: true,
      targetUserId: targetId,
    });
  } catch (error) {
    console.error("Start impersonation error:", error);

    return res.status(500).json({
      message: "Unable to start impersonation.",
    });
  }
});

// POST /api/impersonation/stop
router.post("/stop", requireAuth, async (req, res) => {
  try {
    const token = req.cookies?.[COOKIE];

    if (!token) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded.impersonatedBy || !decoded.impersonationLogId) {
      return res.status(400).json({
        message: "No active impersonation session.",
      });
    }

    const adminId = Number(decoded.impersonatedBy);

    // Verify the original administrator still exists and is still an admin.
    const adminResult = await query(
      `SELECT id, role_id, status, is_blocked, is_removed
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [adminId]
    );

    const admin = adminResult.rows[0];

    if (
      !admin ||
      Number(admin.role_id) !== 1 ||
      Number(admin.status) !== 1 ||
      Boolean(admin.is_blocked) ||
      Boolean(admin.is_removed)
    ) {
      res.clearCookie(COOKIE, cookieOptions);

      return res.status(403).json({
        message: "The original administrator account is no longer eligible.",
      });
    }

    await query(
      `UPDATE impersonation_logs
       SET ended_at = NOW(), end_reason = 'admin_exit'
       WHERE id = $1
         AND admin_user_id = $2
         AND ended_at IS NULL`,
      [decoded.impersonationLogId, adminId]
    );

    // Restore a regular administrator token.
    const restoredToken = signToken(admin.id);

    res.cookie(COOKIE, restoredToken, cookieOptions);

    return res.json({
      message: "Impersonation ended.",
      impersonating: false,
    });
  } catch (error) {
    console.error("Stop impersonation error:", error);

    return res.status(500).json({
      message: "Unable to stop impersonation.",
    });
  }
});

// GET /api/impersonation/status
router.get("/status", requireAuth, (req, res) => {
  try {
    const token = req.cookies?.[COOKIE];

    if (!token) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const impersonating = Boolean(
      decoded.impersonatedBy && decoded.impersonationLogId
    );

    return res.json({
      impersonating,
      originalAdminId: impersonating ? decoded.impersonatedBy : null,
    });
  } catch {
    return res.status(401).json({ message: "Invalid session." });
  }
});

export default router;
