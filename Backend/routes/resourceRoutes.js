import express from "express";
import {
  getResources,
  getResourceById,
  getResourceCategories,
  getResourceFile,
} from "../controllers/resourceController.js";

const router = express.Router();

// Resource routes
router.get("/", getResources);
router.get("/categories", getResourceCategories);
router.get("/:id", getResourceById);
router.get("/:id/file", getResourceFile);

export default router;
