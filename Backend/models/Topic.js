import mongoose from "mongoose";

const replySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    content: {
      type: String,
      required: [true, "Reply cannot be empty"],
    },
    anonymous: {
      type: Boolean,
      default: false,
    },
    upvotes: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    downvotes: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    voteScore: {
      type: Number,
      default: 0,
    },
    reports: {
      type: Number,
      default: 0,
    },
    reporters: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
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
  },
  { _id: true }
);

replySchema.add({
  replies: [replySchema],
});

const topicSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Please add a title"],
    trim: true,
    maxlength: [200, "Title cannot be more than 200 characters"],
  },
  content: {
    type: String,
    required: [true, "Please add content"],
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  anonymous: {
    type: Boolean,
    default: false,
  },
  category: {
    type: String,
    enum: [
      "Housing & Tenant Issues",
      "Family Law",
      "Employment Law",
      "Small Claims",
      "Traffic & Driving",
      "Consumer Protection",
      "Immigration",
      "Other",
    ],
    required: [true, "Please specify category"],
  },
  isLocked: {
    type: Boolean,
    default: false,
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
  views: {
    type: Number,
    default: 0,
  },
  reports: {
    type: Number,
    default: 0,
  },
  reporters: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
  ],
  upvotes: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
  ],
  downvotes: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
  ],
  voteScore: {
    type: Number,
    default: 0,
  },
  replies: [replySchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Create index for search
topicSchema.index({
  title: "text",
  content: "text",
  category: "text",
});

// Calculate vote score
topicSchema.pre("save", function (next) {
  this.voteScore = this.upvotes.length - this.downvotes.length;
  next();
});

const TopicModel = mongoose.model("Topic", topicSchema);

export default TopicModel;
