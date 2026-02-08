import TopicModel from "../models/Topic.js";
import UserModel from "../models/User.js";
import { logger } from "../utils/logger.js";

// Helper to create a reply object for mock data
function makeReply(id, content, userName, profileImage, createdAt) {
  return {
    id,
    content,
    user: { name: userName, profileImage: profileImage || "/lawyer.png" },
    voteScore: 0,
    createdAt: createdAt || new Date().toISOString(),
    replies: [],
  };
}

// In-memory store: replies must be arrays for topic detail; list API returns reply count
const mockTopics = [
  {
    id: "1",
    title: "Landlord won't fix heating, what are my options?",
    category: "Housing & Tenant Issues",
    user: {
      name: "John Smith",
      profileImage: "/lawyer.png",
    },
    anonymous: false,
    replies: [
      makeReply(
        "r1-1",
        "You may have a right to withhold rent or repair and deduct in many jurisdictions. Check your local tenant rights.",
        "Legal Helper",
        "/lawyer.png",
        "2023-10-26T10:00:00Z",
      ),
      makeReply(
        "r1-2",
        "Document every communication with your landlord and the dates the heating was out. This will help if you need to go to court.",
        "Tenant Advocate",
        "/lawyer.png",
        "2023-10-26T14:20:00Z",
      ),
    ],
    views: 234,
    voteScore: 12,
    createdAt: "2023-10-25T14:32:00Z",
    content:
      "My apartment heating has been broken for two weeks now and temperatures are dropping. I've contacted my landlord multiple times but they keep saying they'll 'get to it'. What are my legal options?",
  },
  {
    id: "2",
    title: "How does child custody work with an out-of-state move?",
    category: "Family Law",
    user: {
      name: "Parent In Need",
      profileImage: "/lawyer.png",
    },
    anonymous: false,
    replies: [],
    views: 128,
    voteScore: 8,
    createdAt: "2023-10-24T09:15:00Z",
    content:
      "I have joint custody of my children with my ex-spouse. I received a job offer in another state that would significantly improve our financial situation. How can I legally move with my children?",
  },
  {
    id: "3",
    title: "Employer not paying overtime, what documentation do I need?",
    category: "Employment Law",
    user: {
      name: "Worker Rights",
      profileImage: "/lawyer.png",
    },
    anonymous: false,
    replies: [],
    views: 302,
    voteScore: 15,
    createdAt: "2023-10-20T16:45:00Z",
    content:
      "I've been working 50+ hours weekly for the past three months, but my employer hasn't paid any overtime. What kind of documentation should I gather to support my case?",
  },
  {
    id: "4",
    title: "Success story: Won my security deposit case in small claims!",
    category: "Small Claims",
    user: {
      name: "Victorious Renter",
      profileImage: "/lawyer.png",
    },
    anonymous: false,
    replies: [],
    views: 253,
    voteScore: 6,
    createdAt: "2023-10-22T11:20:00Z",
    content:
      "Just wanted to share my success story of winning my security deposit case in small claims court. Happy to answer questions about the process!",
  },
];

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
        `Socket event ${event} not emitted: namespace not available`,
      );
    }
  } catch (error) {
    logger.error(`Socket emit error: ${error.message}`);
  }
};

// Helper function to map replies with vote scores
const mapReply = (reply) => {
  if (!reply) return reply;
  const replies = Array.isArray(reply.replies)
    ? reply.replies.map(mapReply)
    : [];
  const voteScore =
    typeof reply.voteScore === "number"
      ? reply.voteScore
      : (reply.upvotes?.length || 0) - (reply.downvotes?.length || 0);

  return {
    ...reply,
    id: reply._id?.toString?.() || reply.id,
    voteScore,
    replies,
  };
};

// Helper function to map topics with vote scores
const mapTopic = (
  topic,
  { list = false, userId = null, savedTopics = [] } = {},
) => {
  if (!topic) return topic;
  const voteScore =
    typeof topic.voteScore === "number"
      ? topic.voteScore
      : (topic.upvotes?.length || 0) - (topic.downvotes?.length || 0);

  // Check if current user has reported this topic
  const hasReported =
    userId && Array.isArray(topic.reports)
      ? topic.reports.some(
          (reportUserId) => reportUserId.toString() === userId.toString(),
        )
      : false;

  // Check if current user has saved this topic
  const topicIdStr = topic._id?.toString() || topic.id;
  const isSaved = savedTopics.some(
    (savedId) => savedId.toString() === topicIdStr,
  );

  return {
    ...topic,
    id: topicIdStr,
    voteScore,
    reportCount: Array.isArray(topic.reports) ? topic.reports.length : 0,
    hasReported,
    isSaved,
    replies: list
      ? Array.isArray(topic.replies)
        ? topic.replies.length
        : 0
      : Array.isArray(topic.replies)
        ? topic.replies.map(mapReply)
        : [],
  };
};

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
      filter.$or = [{ title: regex }, { content: regex }, { category: regex }];
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
 * @access  Public
 */
export const getTopicById = async (req, res) => {
  try {
    const userId = req.user?._id; // Optional auth

    // Fetch topic and increment views in one operation
    const topic = await TopicModel.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true },
    )
      .populate("user", "name profileImage createdAt")
      .populate({
        path: "replies",
        populate: {
          path: "user",
          select: "name profileImage",
        },
      });

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: "Topic not found",
      });
    }

    // Get user's saved topics if authenticated
    let savedTopics = [];
    if (userId) {
      const user = await UserModel.findById(userId).select("savedTopics");
      savedTopics = user?.savedTopics || [];
    }

    const mappedTopic = mapTopic(topic.toObject(), {
      list: false,
      userId,
      savedTopics,
    });

    res.json({
      success: true,
      data: mappedTopic,
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

    // Validate required fields
    if (!title || !category || !content) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: title, category, content",
      });
    }

    // Create a new topic document
    const newTopic = new TopicModel({
      title,
      category,
      content,
      anonymous: anonymous || false,
      user: req.user?._id,
      replies: [],
      views: 0,
      upvotes: [],
      downvotes: [],
      isPinned: false,
      createdAt: new Date(),
    });

    // Save to database
    const savedTopic = await newTopic.save();

    // Populate user data
    await savedTopic.populate("user", "name profileImage createdAt");

    // Get user's saved topics for isSaved field
    const userId = req.user._id;
    const user = await UserModel.findById(userId).select("savedTopics");
    const savedTopics = user?.savedTopics || [];

    const mappedTopic = mapTopic(savedTopic.toObject(), {
      list: false,
      userId,
      savedTopics,
    });

    // Emit WebSocket event for new topic (safely)
    safeEmitSocketEvent("new-topic", mappedTopic);

    res.status(201).json({
      success: true,
      data: mappedTopic,
    });
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

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Reply content is required",
      });
    }

    // Find the topic in database
    const topic = await TopicModel.findById(topicId);

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: "Topic not found",
      });
    }

    // Create new reply object
    const newReply = {
      user: req.user?._id,
      content,
      anonymous: anonymous || false,
      upvotes: [],
      downvotes: [],
      voteScore: 0,
      replies: [],
      createdAt: new Date(),
    };

    // If parentId is provided, add as nested reply
    if (parentId) {
      // Find and update the parent reply with nested reply
      const parentFound = topic.replies.some((reply) => {
        if (reply._id.toString() === parentId) {
          reply.replies.push(newReply);
          return true;
        }
        // Could implement recursive search for deeply nested replies here if needed
        return false;
      });

      if (!parentFound) {
        return res.status(404).json({
          success: false,
          message: "Parent reply not found",
        });
      }
    } else {
      // Add as top-level reply
      topic.replies.push(newReply);
    }

    // Save the updated topic
    await topic.save();

    // Populate and re-fetch to get proper user data
    await topic.populate([
      {
        path: "replies.user",
        select: "name profileImage",
      },
      {
        path: "replies.replies.user",
        select: "name profileImage",
      },
    ]);

    // Get the newly added reply for response
    const addedReply = parentId
      ? topic.replies
          .find((r) => r._id.toString() === parentId)
          ?.replies.find((nr) => nr._id.toString() === newReply._id?.toString())
      : topic.replies[topic.replies.length - 1];

    const mappedReply = addedReply
      ? mapReply(addedReply)
      : {
          id: "unknown",
          content,
          user: { name: "User", profileImage: "/lawyer.png" },
          voteScore: 0,
          createdAt: new Date().toISOString(),
          replies: [],
        };

    // Emit WebSocket event
    safeEmitSocketEvent(
      "new-reply",
      {
        topicId,
        reply: mappedReply,
        parentId,
      },
      `topic-${topicId}`,
    );

    res.status(201).json({
      success: true,
      data: mappedReply,
    });
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

    // Find the topic in our mock data
    const topic = mockTopics.find((t) => t.id === topicId);

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: "Topic not found",
      });
    }

    // Increment vote score
    topic.voteScore += 1;

    // Emit WebSocket event for topic vote update (safely)
    safeEmitSocketEvent("topic-vote-update", {
      topicId,
      voteScore: topic.voteScore,
    });

    res.json({
      success: true,
      data: {
        message: `Upvote for topic ID: ${req.params.id} registered`,
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

    // Find the topic in our mock data
    const topic = mockTopics.find((t) => t.id === topicId);

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: "Topic not found",
      });
    }

    // Decrement vote score
    topic.voteScore -= 1;

    // Emit WebSocket event for topic vote update (safely)
    safeEmitSocketEvent("topic-vote-update", {
      topicId,
      voteScore: topic.voteScore,
    });

    res.json({
      success: true,
      data: {
        message: `Downvote for topic ID: ${req.params.id} registered`,
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

    // Find the topic
    const topic = mockTopics.find((t) => t.id === topicId);

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: "Topic not found",
      });
    }

    // Find the reply and update its vote score
    let replyFound = false;
    let voteScore = 0;

    const findReplyAndUpvote = (commentsList) => {
      for (let comment of commentsList) {
        if (comment.id === replyId) {
          comment.voteScore = (comment.voteScore || 0) + 1;
          voteScore = comment.voteScore;
          return true;
        }

        // Check nested replies
        if (comment.replies && comment.replies.length > 0) {
          if (findReplyAndUpvote(comment.replies)) {
            return true;
          }
        }
      }
      return false;
    };

    if (topic.replies && topic.replies.length > 0) {
      replyFound = findReplyAndUpvote(topic.replies);
    }

    if (!replyFound) {
      return res.status(404).json({
        success: false,
        message: "Reply not found",
      });
    }

    // Emit WebSocket event for reply vote update (safely)
    safeEmitSocketEvent(
      "reply-vote-update",
      {
        topicId,
        replyId,
        voteScore,
      },
      `topic-${topicId}`,
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

    // Find the topic
    const topic = mockTopics.find((t) => t.id === topicId);

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: "Topic not found",
      });
    }

    // Find the reply and update its vote score
    let replyFound = false;
    let voteScore = 0;

    const findReplyAndDownvote = (commentsList) => {
      for (let comment of commentsList) {
        if (comment.id === replyId) {
          comment.voteScore = (comment.voteScore || 0) - 1;
          voteScore = comment.voteScore;
          return true;
        }

        // Check nested replies
        if (comment.replies && comment.replies.length > 0) {
          if (findReplyAndDownvote(comment.replies)) {
            return true;
          }
        }
      }
      return false;
    };

    if (topic.replies && topic.replies.length > 0) {
      replyFound = findReplyAndDownvote(topic.replies);
    }

    if (!replyFound) {
      return res.status(404).json({
        success: false,
        message: "Reply not found",
      });
    }

    // Emit WebSocket event for reply vote update (safely)
    safeEmitSocketEvent(
      "reply-vote-update",
      {
        topicId,
        replyId,
        voteScore,
      },
      `topic-${topicId}`,
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
 * @desc    Save/bookmark a topic
 * @route   POST /api/community/topics/:id/save
 * @access  Private
 */
export const saveTopic = async (req, res) => {
  try {
    const topicId = req.params.id;
    const userId = req.user._id;

    // Find the user
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if topic exists
    const topic = await TopicModel.findById(topicId);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: "Topic not found",
      });
    }

    // Check if already saved
    if (user.savedTopics.includes(topicId)) {
      return res.status(400).json({
        success: false,
        message: "Topic already saved",
      });
    }

    // Add to saved topics
    user.savedTopics.push(topicId);
    await user.save();

    logger.info(`User ${userId} saved topic ${topicId}`);

    res.json({
      success: true,
      message: "Topic saved successfully",
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
 * @desc    Unsave/unbookmark a topic
 * @route   DELETE /api/community/topics/:id/save
 * @access  Private
 */
export const unsaveTopic = async (req, res) => {
  try {
    const topicId = req.params.id;
    const userId = req.user._id;

    // Find the user and remove topic from savedTopics
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Remove from saved topics
    user.savedTopics = user.savedTopics.filter(
      (id) => id.toString() !== topicId,
    );
    await user.save();

    logger.info(`User ${userId} unsaved topic ${topicId}`);

    res.json({
      success: true,
      message: "Topic unsaved successfully",
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
 * @desc    Get user's saved topics
 * @route   GET /api/community/saved
 * @access  Private
 */
export const getSavedTopics = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find user and populate saved topics
    const user = await UserModel.findById(userId).populate({
      path: "savedTopics",
      populate: {
        path: "user",
        select: "name profileImage",
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Map topics with proper formatting
    const savedTopicIds = user.savedTopics.map((t) => t._id);
    const topics = user.savedTopics
      .filter((topic) => topic) // Filter out null/deleted topics
      .map((topic) =>
        mapTopic(topic.toObject ? topic.toObject() : topic, {
          list: true,
          userId,
          savedTopics: savedTopicIds,
        }),
      );

    res.json({
      success: true,
      count: topics.length,
      data: topics,
    });
  } catch (error) {
    logger.error("Get saved topics error:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving saved topics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get user's posted topics
 * @route   GET /api/community/my-topics
 * @access  Private
 */
export const getUserPostedTopics = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find topics created by the user
    const topics = await TopicModel.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("user", "name profileImage")
      .lean();

    // Get user's saved topics for isSaved field
    const user = await UserModel.findById(userId).select("savedTopics");
    const savedTopics = user?.savedTopics || [];

    // Map topics with proper formatting
    const mappedTopics = topics.map((topic) =>
      mapTopic(topic, {
        list: true,
        userId,
        savedTopics,
      }),
    );

    res.json({
      success: true,
      count: mappedTopics.length,
      data: mappedTopics,
    });
  } catch (error) {
    logger.error("Get user posted topics error:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving posted topics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get topics user has commented on
 * @route   GET /api/community/my-comments
 * @access  Private
 */
export const getUserCommentedTopics = async (req, res) => {
  try {
    const userId = req.user._id;
    const userIdStr = userId.toString();

    // Find all topics and filter those where user has replied
    const allTopics = await TopicModel.find()
      .populate("user", "name profileImage")
      .lean();

    // Helper function to check if user replied to this topic or any nested reply
    const hasUserReplied = (replies) => {
      if (!Array.isArray(replies)) return false;

      for (const reply of replies) {
        if (reply.user && reply.user.toString() === userIdStr) {
          return true;
        }
        if (hasUserReplied(reply.replies)) {
          return true;
        }
      }
      return false;
    };

    // Filter topics where user has commented
    const commentedTopics = allTopics.filter((topic) =>
      hasUserReplied(topic.replies),
    );

    // Sort by most recent activity
    commentedTopics.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );

    // Get user's saved topics for isSaved field
    const user = await UserModel.findById(userId).select("savedTopics");
    const savedTopics = user?.savedTopics || [];

    // Map topics with proper formatting
    const mappedTopics = commentedTopics.map((topic) =>
      mapTopic(topic, {
        list: true,
        userId,
        savedTopics,
      }),
    );

    res.json({
      success: true,
      count: mappedTopics.length,
      data: mappedTopics,
    });
  } catch (error) {
    logger.error("Get user commented topics error:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving commented topics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Report a topic
 * @route   POST /api/community/topics/:id/report
 * @access  Private
 */
export const reportTopic = async (req, res) => {
  try {
    const topicId = req.params.id;
    const userId = req.user._id;

    // Find topic
    const topic = await TopicModel.findById(topicId);

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: "Topic not found",
      });
    }

    // Check if user already reported
    const alreadyReported = topic.reports.some(
      (reportedUserId) => reportedUserId.toString() === userId.toString(),
    );

    if (alreadyReported) {
      return res.status(400).json({
        success: false,
        message: "You have already reported this topic",
      });
    }

    // Add user to reports
    topic.reports.push(userId);
    await topic.save();

    logger.info(
      `User ${userId} reported topic ${topicId}. Total reports: ${topic.reports.length}`,
    );

    res.json({
      success: true,
      reportCount: topic.reports.length,
      message: "Topic reported successfully",
    });
  } catch (error) {
    logger.error("Report topic error:", error);
    res.status(500).json({
      success: false,
      message: "Server error reporting topic",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Report a reply (increment counter)
 * @route   POST /api/community/topics/:id/replies/:replyId/report
 * @access  Private
 */
export const reportReply = async (req, res) => {
  try {
    const { id: topicId, replyId } = req.params;

    // Find topic and update reply report count
    const topic = await TopicModel.findByIdAndUpdate(
      topicId,
      { $inc: { "replies.$[elem].reports": 1 } },
      {
        new: true,
        arrayFilters: [{ "elem._id": replyId }],
      },
    );

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: "Topic not found",
      });
    }

    // Find the updated reply to get the report count
    const reply = topic.replies.find((r) => r._id.toString() === replyId);

    if (!reply) {
      return res.status(404).json({
        success: false,
        message: "Reply not found",
      });
    }

    logger.info(
      `Reply ${replyId} in topic ${topicId} reported. Total reports: ${reply.reports}`,
    );

    res.json({
      success: true,
      reportCount: reply.reports,
      message: "Reply reported successfully",
    });
  } catch (error) {
    logger.error("Report reply error:", error);
    res.status(500).json({
      success: false,
      message: "Server error reporting reply",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
