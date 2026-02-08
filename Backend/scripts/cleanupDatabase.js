import mongoose from "mongoose";
import dotenv from "dotenv";
import UserModel from "../models/User.js";
import TopicModel from "../models/Topic.js";
import ConsultationModel from "../models/Consultation.js";
import LawyerModel from "../models/Lawyer.js";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/legalconnect";

async function cleanupDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find the admin user (demo)
    const adminUser = await UserModel.findOne({ email: "demo@gmail.in" });
    if (!adminUser) {
      console.log(
        "⚠️  Admin user (demo@gmail.in) not found. Skipping cleanup.",
      );
      process.exit(1);
    }
    console.log(`Found admin user: ${adminUser.name}`);

    // Delete all topics
    const topicsDeleted = await TopicModel.deleteMany({});
    console.log(`✓ Deleted ${topicsDeleted.deletedCount} topics`);

    // Delete all consultations
    const consultationsDeleted = await ConsultationModel.deleteMany({});
    console.log(`✓ Deleted ${consultationsDeleted.deletedCount} consultations`);

    // Delete all lawyers
    const lawyersDeleted = await LawyerModel.deleteMany({});
    console.log(`✓ Deleted ${lawyersDeleted.deletedCount} lawyer profiles`);

    // Delete all users except admin
    const usersDeleted = await UserModel.deleteMany({
      _id: { $ne: adminUser._id },
    });
    console.log(
      `✓ Deleted ${usersDeleted.deletedCount} users (kept admin: ${adminUser.email})`,
    );

    console.log("\n✓ Database cleanup completed successfully!");
    console.log(
      `Admin user still intact: ${adminUser.name} (${adminUser.email})`,
    );

    process.exit(0);
  } catch (error) {
    console.error("Error cleaning up database:", error);
    process.exit(1);
  }
}

cleanupDatabase();
