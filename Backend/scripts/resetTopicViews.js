/**
 * Script to reset topic views to 0
 * Usage: node scripts/resetTopicViews.js
 */

import mongoose from "mongoose";
import TopicModel from "../models/Topic.js";
import * as dotenv from "dotenv";

dotenv.config();

async function resetTopicViews() {
  try {
    console.log("🔄 Connecting to database...");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to database");

    // Reset all topic views to 0
    const result = await TopicModel.updateMany({}, { $set: { views: 0 } });

    console.log(`\n✓ Reset complete!`);
    console.log(`  - Modified: ${result.modifiedCount} topics`);
    console.log(`  - All topic views are now 0\n`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error resetting views:", error.message);
    process.exit(1);
  }
}

resetTopicViews();
