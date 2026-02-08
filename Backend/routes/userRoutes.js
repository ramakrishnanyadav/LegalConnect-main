import express from "express";
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  uploadUserProfileImage,
  changePassword,
  changeEmail,
} from "../controllers/userController.js";
import {
  getClientConsultations,
  getClientUnreadCount,
  markClientConsultationsRead,
} from "../controllers/consultationController.js";
import { protect } from "../config/auth.js";
import { uploadProfile, processUpload } from "../utils/imagekit.js";

const router = express.Router();

// User routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.put("/change-password", protect, changePassword);
router.put("/change-email", protect, changeEmail);
router.get("/consultations/unread-count", protect, getClientUnreadCount);
router.post("/consultations/mark-read", protect, markClientConsultationsRead);
router.get("/consultations", protect, getClientConsultations);

// Fix the profile upload route
router.post(
  "/profile/upload",
  protect,
  (req, res, next) => {
    uploadProfile(req, res, (err) => {
      if (err) {
        console.error("Upload middleware error:", err);
        return res.status(400).json({
          success: false,
          message: err.message || "File upload failed",
        });
      }
      next();
    });
  },
  processUpload,
  uploadUserProfileImage,
);

export default router;
