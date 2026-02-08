import mongoose from "mongoose";

const consultationSchema = new mongoose.Schema({
  lawyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lawyer",
    required: true,
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  scheduledDateTime: {
    type: Date,
    required: true,
    index: true,
  },
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["video", "phone", "in-person"],
    required: true,
  },
  notes: {
    type: String,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected", "completed", "cancelled"],
    default: "pending",
  },
  paid: {
    type: Boolean,
    default: false,
  },
  paymentDetails: {
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    amount: Number,
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    paidAt: Date,
  },
  unreadByClient: {
    type: Boolean,
    default: false,
  },
  message: {
    type: String,
  },
  rescheduleRequests: [
    {
      date: Date,
      time: String,
      message: String,
      requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
consultationSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const ConsultationModel = mongoose.model("Consultation", consultationSchema);

export default ConsultationModel;
