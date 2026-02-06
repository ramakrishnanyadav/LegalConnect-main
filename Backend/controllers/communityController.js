import TopicModel from "../models/Topic.js";
import UserModel from "../models/User.js";
import { logger } from "../utils/logger.js";

function toIdString(id) {
  return id ? id.toString() : null;
}

function normalizeProfileImage(profileImage) {
  if (!profileImage || profileImage === "default-profile.png") return "/lawyer.png";
  return profileImage;
}

function countRepliesRecursive(replies) {
  if (!Array.isArray(replies)) return 0;
  return replies.reduce(
    (sum, r) => sum + 1 + countRepliesRecursive(r.replies),
    0
  );
}

function collectReplyUserIds(replies, out = new Set()) {
  if (!Array.isArray(replies)) return out;
  for (const r of replies) {
    if (r?.user) out.add(toIdString(r.user));
    if (r?.replies?.length) collectReplyUserIds(r.replies, out);
  }
  return out;
}

function findReplyById(replies, replyId) {
  if (!Array.isArray(replies)) return null;
  for (const r of replies) {
    if (toIdString(r._id) === replyId || r.id === replyId) return r;
    const found = findReplyById(r.replies, replyId);
    if (found) return found;
  }
  return null;
}

function formatReply(reply, userById) {
  const userId = toIdString(reply.user);
  const user = userById.get(userId);
  const anonymous = !!reply.anonymous;
  const upvotes = Array.isArray(reply.upvotes) ? reply.upvotes.length : 0;
  const downvotes = Array.isArray(reply.downvotes) ? reply.downvotes.length : 0;
  const voteScore =
    typeof reply.voteScore === "number" ? reply.voteScore : upvotes - downvotes;

  return {
    id: toIdString(reply._id) || reply.id,
    content: reply.content,
    anonymous,
    voteScore,
    createdAt: reply.createdAt,
    user: {
      name: anonymous ? "Anonymous" : user?.name || "Anonymous User",
      profileImage: anonymous
        ? "/lawyer.png"
        : normalizeProfileImage(user?.profileImage),
      createdAt: user?.createdAt,
    },
    replies: Array.isArray(reply.replies)
      ? reply.replies.map((r) => formatReply(r, userById))
      : [],
  };
}

// Helper to safely emit socket events (works in both environments)
const safeEmitSocketEvent = (event, data, room = null) => {
  try {
    // In production, socket events will be silently ignored
    if (process.env.NODE_ENV === "production") {
      return; // Skip socket events in production
    }

    if (global.communityNamespace) {
      if (room) {
        global.communityNamespace.to(room).emit(event, data);
        logger.debug(`Emitted ${event} to room ${room}`);
      } else {
        global.communityNamespace.emit(event, data);
        logger.debug(`Emitted ${event} to all clients`);
      }
    } else {
      logger.debug(
        `Socket event ${event} not emitted: namespace not available`
      );
    }
  } catch (error) {
    logger.error(`Socket emit error (${event}):`, error);
  }
};

// Helper to map topic for API response
function mapTopic(topic, { list = false } = {}) {
  if (!topic) return topic;
  const voteScore =
    typeof topic.voteScore === "number"
      ? topic.voteScore
      : (topic.upvotes?.length || 0) - (topic.downvotes?.length || 0);

  const mapReply = (reply) => {
    if (!reply) return reply;
    const replies = Array.isArray(reply.replies)
      ? reply.replies.map(mapReply)
      : [];
    const rs =
      typeof reply.voteScore === "number"
        ? reply.voteScore
        : (reply.upvotes?.length || 0) - (reply.downvotes?.length || 0);
    return {
      ...reply,
      id: reply._id?.toString?.() || reply.id,
      voteScore: rs,
      replies,
    };
  };

  return {
    ...topic,
    id: topic._id?.toString?.() || topic.id,
    voteScore,
    replies: list
      ? Array.isArray(topic.replies)
        ? topic.replies.length
        : 0
      : Array.isArray(topic.replies)
      ? topic.replies.map(mapReply)
      : [],
  };
}

export const getTopics = async (req, res) => {
      try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.category) {
          filter.category = req.query.category;
        }

        if (req.query.search) {
          const regex = new RegExp(req.query.search, "i");
          filter.$or = [
            { title: regex },
            { content: regex },
            { category: regex },
          ];
        }

        const topics = await TopicModel.find(filter)
          .sort({ isPinned: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate("user", "name profileImage createdAt")
          .lean();

        const listData = topics.map((topic) => mapTopic(topic, { list: true }));

        res.json({
          success: true,
          count: listData.length,
          data: listData,
        });
      } catch (error) {
        logger.error("Get topics error:", error);
        res.status(500).json({
          success: false,
          message: "Server error retrieving topics",
          error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
};

export const getCategories = async (req, res) => {
  try {
    const categories = [
      {
        name: "Housing & Tenant Issues",
        icon: "fa-home",
        topics: 523,
        posts: 2100,
      },
      {
        name: "Family Law",
        icon: "fa-user-friends",
        topics: 412,
        posts: 1800,
      },
      {
        name: "Employment Law",
        icon: "fa-briefcase",
        topics: 385,
        posts: 1500,
      },
      {
        name: "Small Claims",
        icon: "fa-gavel",
        topics: 247,
        posts: 982,
      },
    ];

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    logger.error("Get categories error:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving categories",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get topic by ID
 * @route   GET /api/community/topics/:id
 * @access  Public (optional auth adds isSaved)
 */
export const getTopicById = async (req, res) => {
  try {
    const topic = await TopicModel.findById(req.params.id).populate({
      path: "user",
      select: "name profileImage createdAt",
    });
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: "Topic not found",
      });
    }

    // Increment view count
    topic.views = (topic.views || 0) + 1;
    await topic.save({ validateBeforeSave: false });

    const userIds = collectReplyUserIds(topic.replies);
    if (topic.user) userIds.add(toIdString(topic.user._id));
    const users = await UserModel.find({ _id: { $in: Array.from(userIds) } }).select(
      "name profileImage createdAt"
    );
    const userById = new Map(users.map((u) => [toIdString(u._id), u]));

    const topicIdStr = toIdString(topic._id);
    const isSaved =
      req.user &&
      Array.isArray(req.user.savedTopics) &&
      req.user.savedTopics.some((id) => toIdString(id) === topicIdStr);

    const hasReported =
      req.user &&
      Array.isArray(topic.reporters) &&
      topic.reporters.some((r) => toIdString(r.user) === req.user.id);

    const formatted = {
      id: topicIdStr,
      title: topic.title,
      category: topic.category,
      content: topic.content,
      anonymous: !!topic.anonymous,
      user: {
        name: topic.anonymous ? "Anonymous" : topic.user?.name || "Anonymous User",
        profileImage: topic.anonymous
          ? "/lawyer.png"
          : normalizeProfileImage(topic.user?.profileImage),
        createdAt: topic.user?.createdAt,
      },
      replies: Array.isArray(topic.replies)
        ? topic.replies.map((r) => formatReply(r, userById))
        : [],
      views: topic.views || 0,
      voteScore: typeof topic.voteScore === "number" ? topic.voteScore : 0,
      createdAt: topic.createdAt,
      isSaved: !!isSaved,
      hasReported: !!hasReported,
    };

    res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    logger.error("Get topic by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving topic",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Create a new topic
 * @route   POST /api/community/topics
 * @access  Private
 */
export const createTopic = async (req, res) => {
  try {
    const { title, category, content, anonymous } = req.body;
    const topic = await TopicModel.create({
      title,
      category,
      content,
      anonymous: !!anonymous,
      user: req.user.id,
      replies: [],
    });

    const populated = await TopicModel.findById(topic._id).populate({
      path: "user",
      select: "name profileImage createdAt",
    });

    const formatted = {
      id: toIdString(populated._id),
      title: populated.title,
      category: populated.category,
      content: populated.content,
      anonymous: !!populated.anonymous,
      user: {
        name: populated.anonymous ? "Anonymous" : populated.user?.name || "Anonymous User",
        profileImage: populated.anonymous
          ? "/lawyer.png"
          : normalizeProfileImage(populated.user?.profileImage),
        createdAt: populated.user?.createdAt,
      },
      replies: 0,
      views: populated.views || 0,
      voteScore: populated.voteScore || 0,
      createdAt: populated.createdAt,
    };

    safeEmitSocketEvent("new-topic", formatted);

    res.status(201).json({ success: true, data: formatted });
  } catch (error) {
    logger.error("Create topic error:", error);
    res.status(500).json({
      success: false,
      message: "Server error creating topic",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Add reply to topic
 * @route   POST /api/community/topics/:id/replies
 * @access  Private
 */
export const addReply = async (req, res) => {
  try {
    const topicId = req.params.id;
    const { content, parentId, anonymous } = req.body;
    const topic = await TopicModel.findById(topicId);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: "Topic not found",
      });
    }

    const newReply = {
      content,
      user: req.user.id,
      anonymous: !!anonymous,
      upvotes: [],
      downvotes: [],
      replies: [],
    };

    if (parentId) {
      const parent = findReplyById(topic.replies, parentId);
      if (!parent) {
        return res.status(404).json({
          success: false,
          message: "Parent comment not found",
        });
      }
      if (!parent.replies) parent.replies = [];
      parent.replies.push(newReply);
    } else {
      topic.replies.push(newReply);
    }

    topic.updatedAt = new Date();
    await topic.save();

    const savedReply = parentId
      ? findReplyById(topic.replies, parentId)?.replies?.slice(-1)?.[0]
      : topic.replies.slice(-1)[0];

    const user = await UserModel.findById(req.user.id).select(
      "name profileImage createdAt"
    );
    const userById = new Map([[toIdString(user._id), user]]);
    const formattedReply = formatReply(savedReply, userById);

    safeEmitSocketEvent(
      "new-reply",
      {
        topicId,
        reply: formattedReply,
        parentId,
      },
      `topic-${topicId}`
    );

    res.json({ success: true, data: formattedReply });
  } catch (error) {
    logger.error("Add reply error:", error);
    res.status(500).json({
      success: false,
      message: "Server error adding reply",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Upvote a topic
 * @route   PUT /api/community/topics/:id/upvote
 * @access  Private
 */
export const upvoteTopic = async (req, res) => {
  try {
    const topicId = req.params.id;
    const topic = await TopicModel.findById(topicId);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: "Topic not found",
      });
    }
    const userId = req.user.id;
    const hasUpvoted = topic.upvotes.some((u) => toIdString(u.user) === userId);
    const hasDownvoted = topic.downvotes.some(
      (u) => toIdString(u.user) === userId
    );
    if (hasUpvoted) {
      topic.upvotes = topic.upvotes.filter((u) => toIdString(u.user) !== userId);
    } else {
      if (hasDownvoted) {
        topic.downvotes = topic.downvotes.filter(
          (u) => toIdString(u.user) !== userId
        );
      }
      topic.upvotes.push({ user: userId });
    }
    topic.voteScore = topic.upvotes.length - topic.downvotes.length;
    await topic.save();

    safeEmitSocketEvent("topic-vote-update", {
      topicId,
      voteScore: topic.voteScore,
    });

    res.json({
      success: true,
      data: {
        message: `Upvote for topic ID: ${topicId} registered`,
        voteScore: topic.voteScore,
      },
    });
  } catch (error) {
    logger.error("Upvote topic error:", error);
    res.status(500).json({
      success: false,
      message: "Server error upvoting topic",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Downvote a topic
 * @route   PUT /api/community/topics/:id/downvote
 * @access  Private
 */
export const downvoteTopic = async (req, res) => {
  try {
    const topicId = req.params.id;
    const topic = await TopicModel.findById(topicId);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: "Topic not found",
      });
    }
    const userId = req.user.id;
    const hasDownvoted = topic.downvotes.some(
      (u) => toIdString(u.user) === userId
    );
    const hasUpvoted = topic.upvotes.some((u) => toIdString(u.user) === userId);
    if (hasDownvoted) {
      topic.downvotes = topic.downvotes.filter(
        (u) => toIdString(u.user) !== userId
      );
    } else {
      if (hasUpvoted) {
        topic.upvotes = topic.upvotes.filter((u) => toIdString(u.user) !== userId);
      }
      topic.downvotes.push({ user: userId });
    }
    topic.voteScore = topic.upvotes.length - topic.downvotes.length;
    await topic.save();

    safeEmitSocketEvent("topic-vote-update", {
      topicId,
      voteScore: topic.voteScore,
    });

    res.json({
      success: true,
      data: {
        message: `Downvote for topic ID: ${topicId} registered`,
        voteScore: topic.voteScore,
      },
    });
  } catch (error) {
    logger.error("Downvote topic error:", error);
    res.status(500).json({
      success: false,
      message: "Server error downvoting topic",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Upvote a reply
 * @route   PUT /api/community/topics/:id/replies/:replyId/upvote
 * @access  Private
 */
export const upvoteReply = async (req, res) => {
  try {
    const topicId = req.params.id;
    const replyId = req.params.replyId;
    const topic = await TopicModel.findById(topicId);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: "Topic not found",
      });
    }
    const reply = findReplyById(topic.replies, replyId);
    if (!reply) {
      return res.status(404).json({
        success: false,
        message: "Reply not found",
      });
    }
    const userId = req.user.id;
    reply.upvotes = reply.upvotes || [];
    reply.downvotes = reply.downvotes || [];
    const hasUpvoted = reply.upvotes?.some((u) => toIdString(u.user) === userId);
    const hasDownvoted = reply.downvotes?.some(
      (u) => toIdString(u.user) === userId
    );
    if (hasUpvoted) {
      reply.upvotes = reply.upvotes.filter((u) => toIdString(u.user) !== userId);
    } else {
      if (hasDownvoted) {
        reply.downvotes = reply.downvotes.filter(
          (u) => toIdString(u.user) !== userId
        );
      }
      reply.upvotes.push({ user: userId });
    }
    const voteScore = (reply.upvotes?.length || 0) - (reply.downvotes?.length || 0);
    reply.voteScore = voteScore;
    await topic.save();

    safeEmitSocketEvent(
      "reply-vote-update",
      {
        topicId,
        replyId,
        voteScore,
      },
      `topic-${topicId}`
    );

    res.json({
      success: true,
      data: {
        message: `Upvote for reply ID: ${replyId} in topic ID: ${topicId} registered`,
        voteScore,
      },
    });
  } catch (error) {
    logger.error("Upvote reply error:", error);
    res.status(500).json({
      success: false,
      message: "Server error upvoting reply",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Downvote a reply
 * @route   PUT /api/community/topics/:id/replies/:replyId/downvote
 * @access  Private
 */
export const downvoteReply = async (req, res) => {
  try {
    const topicId = req.params.id;
    const replyId = req.params.replyId;
    const topic = await TopicModel.findById(topicId);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: "Topic not found",
      });
    }
    const reply = findReplyById(topic.replies, replyId);
    if (!reply) {
      return res.status(404).json({
        success: false,
        message: "Reply not found",
      });
    }
    const userId = req.user.id;
    reply.upvotes = reply.upvotes || [];
    reply.downvotes = reply.downvotes || [];
    const hasDownvoted = reply.downvotes?.some(
      (u) => toIdString(u.user) === userId
    );
    const hasUpvoted = reply.upvotes?.some((u) => toIdString(u.user) === userId);
    if (hasDownvoted) {
      reply.downvotes = reply.downvotes.filter(
        (u) => toIdString(u.user) !== userId
      );
    } else {
      if (hasUpvoted) {
        reply.upvotes = reply.upvotes.filter((u) => toIdString(u.user) !== userId);
      }
      reply.downvotes.push({ user: userId });
    }
    const voteScore = (reply.upvotes?.length || 0) - (reply.downvotes?.length || 0);
    reply.voteScore = voteScore;
    await topic.save();

    safeEmitSocketEvent(
      "reply-vote-update",
      {
        topicId,
        replyId,
        voteScore,
      },
      `topic-${topicId}`
    );

    res.json({
      success: true,
      data: {
        message: `Downvote for reply ID: ${replyId} in topic ID: ${topicId} registered`,
        voteScore,
      },
    });
  } catch (error) {
    logger.error("Downvote reply error:", error);
    res.status(500).json({
      success: false,
      message: "Server error downvoting reply",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Save a topic to user's saved list
 * @route   POST /api/community/topics/:id/save
 * @access  Private
 */
export const saveTopic = async (req, res) => {
  try {
    const userId = req.user.id;
    const topicId = req.params.id;
    const topic = await TopicModel.findById(topicId);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: "Topic not found",
      });
    }
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const savedIds = (user.savedTopics || []).map((id) => toIdString(id));
    if (savedIds.includes(topicId)) {
      return res.json({
        success: true,
        data: { saved: true, message: "Topic already saved" },
      });
    }
    user.savedTopics = user.savedTopics || [];
    user.savedTopics.push(topicId);
    await user.save();
    res.json({
      success: true,
      data: { saved: true, message: "Topic saved" },
    });
  } catch (error) {
    logger.error("Save topic error:", error);
    res.status(500).json({
      success: false,
      message: "Server error saving topic",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Remove a topic from user's saved list
 * @route   DELETE /api/community/topics/:id/save
 * @access  Private
 */
export const unsaveTopic = async (req, res) => {
  try {
    const userId = req.user.id;
    const topicId = req.params.id;
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    user.savedTopics = (user.savedTopics || []).filter(
      (id) => toIdString(id) !== topicId
    );
    await user.save();
    res.json({
      success: true,
      data: { saved: false, message: "Topic removed from saved" },
    });
  } catch (error) {
    logger.error("Unsave topic error:", error);
    res.status(500).json({
      success: false,
      message: "Server error unsaving topic",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Report a topic (one report per user; count stored on topic)
 * @route   POST /api/community/topics/:id/report
 * @access  Private
 */
export const reportTopic = async (req, res) => {
  try {
    const topicId = req.params.id;
    const userId = req.user.id;
    const topic = await TopicModel.findById(topicId);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: "Topic not found",
      });
    }

    topic.reporters = topic.reporters || [];
    const hasReported = topic.reporters.some((r) => toIdString(r.user) === userId);
    if (hasReported) {
      return res.status(400).json({
        success: false,
        message: "You have already reported this content.",
      });
    }

    topic.reporters.push({ user: userId });
    topic.reports = topic.reporters.length;
    await topic.save({ validateBeforeSave: false });

    res.json({
      success: true,
      data: {
        message: "Report submitted. We will review this content.",
        reports: topic.reports,
      },
    });
  } catch (error) {
    logger.error("Report topic error:", error);
    res.status(500).json({
      success: false,
      message: "Server error submitting report",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Report a reply/comment (one report per user per reply; count on reply)
 * @route   POST /api/community/topics/:id/replies/:replyId/report
 * @access  Private
 */
export const reportReply = async (req, res) => {
  try {
    const topicId = req.params.id;
    const replyId = req.params.replyId;
    const userId = req.user.id;
    const topic = await TopicModel.findById(topicId);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: "Topic not found",
      });
    }

    const reply = findReplyById(topic.replies, replyId);
    if (!reply) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    reply.reporters = reply.reporters || [];
    const hasReported = reply.reporters.some((r) => toIdString(r.user) === userId);
    if (hasReported) {
      return res.status(400).json({
        success: false,
        message: "You have already reported this comment.",
      });
    }

    reply.reporters.push({ user: userId });
    reply.reports = reply.reporters.length;
    await topic.save({ validateBeforeSave: false });

    res.json({
      success: true,
      data: {
        message: "Report submitted. We will review this content.",
        reports: reply.reports,
      },
    });
  } catch (error) {
    logger.error("Report reply error:", error);
    res.status(500).json({
      success: false,
      message: "Server error submitting report",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get user's saved topics
 * @route   GET /api/community/saved
 * @access  Private
 */
export const getSavedTopics = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await UserModel.findById(userId)
      .populate({
        path: "savedTopics",
        populate: { path: "user", select: "name profileImage createdAt" },
      })
      .lean();
    if (!user || !user.savedTopics) {
      return res.json({ success: true, count: 0, data: [] });
    }
    const topics = user.savedTopics
      .filter((t) => t != null)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((t) =>
        mapTopic(
          {
            ...t,
            user: t.user || { name: "Anonymous User", profileImage: "/lawyer.png" },
          },
          { list: true }
        )
      );
    res.json({ success: true, count: topics.length, data: topics });
  } catch (error) {
    logger.error("Get saved topics error:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving saved topics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
