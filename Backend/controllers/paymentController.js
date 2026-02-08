import Razorpay from "razorpay";
import crypto from "crypto";
import ConsultationModel from "../models/Consultation.js";
import LawyerModel from "../models/Lawyer.js";

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * @desc    Create Razorpay order for consultation payment
 * @route   POST /api/payments/create-order
 * @access  Private (Client)
 */
export const createPaymentOrder = async (req, res) => {
  try {
    const { consultationId } = req.body;

    if (!consultationId) {
      return res.status(400).json({
        success: false,
        message: "Consultation ID is required",
      });
    }

    // Find consultation and populate lawyer details
    const consultation = await ConsultationModel.findById(consultationId)
      .populate({
        path: "lawyer",
        select: "consultationFee user",
      })
      .populate({
        path: "client",
        select: "name email",
      });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: "Consultation not found",
      });
    }

    // Verify the user is the client for this consultation
    if (consultation.client._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to pay for this consultation",
      });
    }

    // Check if consultation is already paid
    if (consultation.paid) {
      return res.status(400).json({
        success: false,
        message: "This consultation has already been paid",
      });
    }

    // Check if consultation is accepted
    if (consultation.status !== "accepted") {
      return res.status(400).json({
        success: false,
        message: "Payment can only be made for accepted consultations",
      });
    }

    // Get consultation fee
    const amount = consultation.lawyer.consultationFee || 0;

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Consultation fee must be greater than zero",
      });
    }

    // Create Razorpay order
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise (smallest currency unit)
      currency: "INR",
      receipt: `consultation_${consultationId}`,
      notes: {
        consultationId: consultationId.toString(),
        clientId: consultation.client._id.toString(),
        clientName: consultation.client.name,
        clientEmail: consultation.client.email,
      },
    };

    const order = await razorpay.orders.create(options);

    // Update consultation with order details
    consultation.paymentDetails = {
      razorpayOrderId: order.id,
      amount: amount,
      currency: "INR",
      status: "pending",
    };
    await consultation.save();

    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: amount,
        currency: "INR",
        consultationId: consultationId,
        key: process.env.RAZORPAY_KEY_ID,
      },
      message: "Payment order created successfully",
    });
  } catch (error) {
    console.error("Create payment order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment order",
      error: error.message,
    });
  }
};

/**
 * @desc    Verify Razorpay payment signature and update consultation
 * @route   POST /api/payments/verify
 * @access  Private (Client)
 */
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      consultationId,
    } = req.body;

    if (
      !razorpayOrderId ||
      !razorpayPaymentId ||
      !razorpaySignature ||
      !consultationId
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required payment verification parameters",
      });
    }

    // Find consultation
    const consultation = await ConsultationModel.findById(consultationId);

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: "Consultation not found",
      });
    }

    // Verify the user is the client for this consultation
    if (consultation.client.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to verify payment for this consultation",
      });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      // Signature verification failed
      consultation.paymentDetails.status = "failed";
      await consultation.save();

      return res.status(400).json({
        success: false,
        message: "Payment verification failed - invalid signature",
      });
    }

    // Payment verified successfully - update consultation
    consultation.paid = true;
    consultation.paymentDetails.razorpayPaymentId = razorpayPaymentId;
    consultation.paymentDetails.razorpaySignature = razorpaySignature;
    consultation.paymentDetails.status = "success";
    consultation.paymentDetails.paidAt = new Date();
    await consultation.save();

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: {
        consultationId: consultation._id,
        paid: true,
        paymentId: razorpayPaymentId,
      },
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify payment",
      error: error.message,
    });
  }
};

/**
 * @desc    Get payment details for a consultation
 * @route   GET /api/payments/consultation/:id
 * @access  Private (Client/Lawyer)
 */
export const getPaymentDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const consultation = await ConsultationModel.findById(id)
      .select("paid paymentDetails client lawyer")
      .populate("client", "name email")
      .populate({
        path: "lawyer",
        select: "user",
        populate: {
          path: "user",
          select: "name email",
        },
      });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: "Consultation not found",
      });
    }

    // Check if user is authorized (client or lawyer)
    const isClient = consultation.client._id.toString() === req.user.id;
    const isLawyer = consultation.lawyer.user._id.toString() === req.user.id;

    if (!isClient && !isLawyer) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view payment details",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        paid: consultation.paid,
        paymentDetails: consultation.paymentDetails || null,
      },
    });
  } catch (error) {
    console.error("Get payment details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get payment details",
      error: error.message,
    });
  }
};
