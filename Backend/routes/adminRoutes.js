import express from "express";
import {
  getDashboardStats,
  getUsers,
  deleteUser,
  getTopics,
  deleteTopic,
  getLawyers,
  deleteLawyer,
  getResources,
  deleteResource,
  getConsultations,
  deleteConsultation,
} from "../controllers/adminController.js";
import { protect } from "../config/auth.js";
import { admin } from "../config/auth.js";

const router = express.Router();

router.use(protect, admin);

router.get("/dashboard", getDashboardStats);
router.get("/users", getUsers);
router.delete("/users/:id", deleteUser);
router.get("/topics", getTopics);
router.delete("/topics/:id", deleteTopic);
router.get("/lawyers", getLawyers);
router.delete("/lawyers/:id", deleteLawyer);
router.get("/resources", getResources);
router.delete("/resources/:id", deleteResource);
router.get("/consultations", getConsultations);
router.delete("/consultations/:id", deleteConsultation);

export default router;
