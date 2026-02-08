import express from "express";
import {
  createPaymentOrder,
  verifyPayment,
  getPaymentDetails,
} from "../controllers/paymentController.js";
import { protect } from "../config/auth.js";

const router = express.Router();

// Payment routes
router.post("/create-order", protect, createPaymentOrder);
router.post("/verify", protect, verifyPayment);
router.get("/consultation/:id", protect, getPaymentDetails);

export default router;
