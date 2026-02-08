import express from "express";
import {
  getTopics,
  getTopicById,
  createTopic,
  addReply,
  upvoteTopic,
  downvoteTopic,
  upvoteReply,
  downvoteReply,
  getCategories,
  saveTopic,
  unsaveTopic,
  getSavedTopics,
  getUserPostedTopics,
  getUserCommentedTopics,
  reportTopic,
  reportReply,
} from "../controllers/communityController.js";
import {
  authenticate,
  optionalAuthenticate,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.get("/topics", getTopics);
router.get("/categories", getCategories);

// Topic by ID: optional auth (adds isSaved when logged in)
router.get("/topics/:id", optionalAuthenticate, getTopicById);

// Saved topics - must be before /topics/:id/save to avoid conflict
router.get("/saved", authenticate, getSavedTopics);

// User's activity routes
router.get("/my-topics", authenticate, getUserPostedTopics);
router.get("/my-comments", authenticate, getUserCommentedTopics);

// Protected routes that require authentication
router.post("/topics", authenticate, createTopic);
router.post("/topics/:id/save", authenticate, saveTopic);
router.delete("/topics/:id/save", authenticate, unsaveTopic);
router.post("/topics/:id/report", authenticate, reportTopic);
router.post("/topics/:id/replies/:replyId/report", authenticate, reportReply);
router.post("/topics/:id/replies", authenticate, addReply);
router.put("/topics/:id/upvote", authenticate, upvoteTopic);
router.put("/topics/:id/downvote", authenticate, downvoteTopic);
router.put("/topics/:id/replies/:replyId/upvote", authenticate, upvoteReply);
router.put(
  "/topics/:id/replies/:replyId/downvote",
  authenticate,
  downvoteReply,
);

export default router;
