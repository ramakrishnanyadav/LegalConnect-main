import UserModel from "../models/User.js";
import LawyerModel from "../models/Lawyer.js";
import TopicModel from "../models/Topic.js";
import ResourceModel from "../models/Resource.js";
import ConsultationModel from "../models/Consultation.js";
import { logger } from "../utils/logger.js";

/**
 * @desc    Get dashboard stats (admin only)
 * @route   GET /api/admin/dashboard
 * @access  Private/Admin
 */
export const getDashboardStats = async (req, res) => {
  try {
    const [usersCount, lawyersCount, topicsCount, resourcesCount, consultationsCount, reportedTopics] =
      await Promise.all([
        UserModel.countDocuments(),
        LawyerModel.countDocuments(),
        TopicModel.countDocuments(),
        ResourceModel.countDocuments(),
        ConsultationModel.countDocuments(),
        TopicModel.countDocuments({ reports: { $gt: 0 } }),
      ]);

    const topicsWithReports = await TopicModel.find({ reports: { $gt: 0 } })
      .sort({ reports: -1 })
      .limit(10)
      .select("title reports createdAt")
      .populate("user", "name email")
      .lean();

    res.json({
      success: true,
      data: {
        users: usersCount,
        lawyers: lawyersCount,
        topics: topicsCount,
        resources: resourcesCount,
        consultations: consultationsCount,
        reportedTopicsCount: reportedTopics,
        topReportedTopics: topicsWithReports.map((t) => ({
          id: t._id.toString(),
          title: t.title,
          reports: t.reports,
          createdAt: t.createdAt,
          author: t.user?.name || "Unknown",
        })),
      },
    });
  } catch (error) {
    logger.error("Admin dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Server error loading dashboard",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get all users
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
export const getUsers = async (req, res) => {
  try {
    const users = await UserModel.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    const data = users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
    }));

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    logger.error("Admin get users error:", error);
    res.status(500).json({
      success: false,
      message: "Server error loading users",
    });
  }
};

/**
 * @desc    Delete user (admin only)
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
export const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account.",
      });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await LawyerModel.findOneAndDelete({ user: userId });
    await ConsultationModel.deleteMany({ client: userId });
    await TopicModel.deleteMany({ user: userId });
    await UserModel.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    logger.error("Admin delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting user",
    });
  }
};

/**
 * @desc    Get all topics (admin)
 * @route   GET /api/admin/topics
 * @access  Private/Admin
 */
export const getTopics = async (req, res) => {
  try {
    const topics = await TopicModel.find()
      .sort({ createdAt: -1 })
      .populate("user", "name email")
      .select("title category reports views voteScore createdAt")
      .lean();

    const data = topics.map((t) => ({
      id: t._id.toString(),
      title: t.title,
      category: t.category,
      reports: t.reports || 0,
      views: t.views || 0,
      voteScore: t.voteScore || 0,
      createdAt: t.createdAt,
      author: t.user?.name || "Unknown",
      authorEmail: t.user?.email,
    }));

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    logger.error("Admin get topics error:", error);
    res.status(500).json({
      success: false,
      message: "Server error loading topics",
    });
  }
};

/**
 * @desc    Delete topic (admin only)
 * @route   DELETE /api/admin/topics/:id
 * @access  Private/Admin
 */
export const deleteTopic = async (req, res) => {
  try {
    const topic = await TopicModel.findByIdAndDelete(req.params.id);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: "Topic not found",
      });
    }
    res.json({
      success: true,
      message: "Topic deleted successfully",
    });
  } catch (error) {
    logger.error("Admin delete topic error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting topic",
    });
  }
};

/**
 * @desc    Get all lawyers (admin)
 * @route   GET /api/admin/lawyers
 * @access  Private/Admin
 */
export const getLawyers = async (req, res) => {
  try {
    const lawyers = await LawyerModel.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const data = lawyers.map((l) => ({
      id: l._id.toString(),
      name: l.user?.name,
      email: l.user?.email,
      practiceAreas: l.practiceAreas,
      createdAt: l.createdAt,
    }));

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    logger.error("Admin get lawyers error:", error);
    res.status(500).json({
      success: false,
      message: "Server error loading lawyers",
    });
  }
};

/**
 * @desc    Delete lawyer (admin only)
 * @route   DELETE /api/admin/lawyers/:id
 * @access  Private/Admin
 */
export const deleteLawyer = async (req, res) => {
  try {
    const lawyer = await LawyerModel.findById(req.params.id);
    if (!lawyer) {
      return res.status(404).json({
        success: false,
        message: "Lawyer not found",
      });
    }

    await ConsultationModel.deleteMany({ lawyer: lawyer._id });
    await LawyerModel.findByIdAndDelete(lawyer._id);
    await UserModel.findByIdAndUpdate(lawyer.user, { role: "user" });

    res.json({
      success: true,
      message: "Lawyer profile deleted successfully",
    });
  } catch (error) {
    logger.error("Admin delete lawyer error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting lawyer",
    });
  }
};

/**
 * @desc    Get all resources (admin)
 * @route   GET /api/admin/resources
 * @access  Private/Admin
 */
export const getResources = async (req, res) => {
  try {
    const resources = await ResourceModel.find()
      .sort({ createdAt: -1 })
      .lean();

    const data = resources.map((r) => ({
      id: r._id.toString(),
      title: r.title,
      type: r.type,
      category: r.category,
      createdAt: r.createdAt,
    }));

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    logger.error("Admin get resources error:", error);
    res.status(500).json({
      success: false,
      message: "Server error loading resources",
    });
  }
};

/**
 * @desc    Delete resource (admin only)
 * @route   DELETE /api/admin/resources/:id
 * @access  Private/Admin
 */
export const deleteResource = async (req, res) => {
  try {
    const resource = await ResourceModel.findByIdAndDelete(req.params.id);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }
    res.json({
      success: true,
      message: "Resource deleted successfully",
    });
  } catch (error) {
    logger.error("Admin delete resource error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting resource",
    });
  }
};

/**
 * @desc    Get all consultations (admin)
 * @route   GET /api/admin/consultations
 * @access  Private/Admin
 */
export const getConsultations = async (req, res) => {
  try {
    const consultations = await ConsultationModel.find()
      .populate({ path: "lawyer", populate: { path: "user", select: "name email" } })
      .populate("client", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const data = consultations.map((c) => ({
      id: c._id.toString(),
      lawyerName: c.lawyer?.user?.name || "—",
      clientName: c.client?.name,
      date: c.date,
      status: c.status,
      type: c.type,
      createdAt: c.createdAt,
    }));

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    logger.error("Admin get consultations error:", error);
    res.status(500).json({
      success: false,
      message: "Server error loading consultations",
    });
  }
};

/**
 * @desc    Delete consultation (admin only)
 * @route   DELETE /api/admin/consultations/:id
 * @access  Private/Admin
 */
export const deleteConsultation = async (req, res) => {
  try {
    const consultation = await ConsultationModel.findByIdAndDelete(req.params.id);
    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: "Consultation not found",
      });
    }
    res.json({
      success: true,
      message: "Consultation deleted successfully",
    });
  } catch (error) {
    logger.error("Admin delete consultation error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting consultation",
    });
  }
};
