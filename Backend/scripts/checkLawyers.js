import mongoose from "mongoose";
import dotenv from "dotenv";
import LawyerModel from "../models/Lawyer.js";
import UserModel from "../models/User.js";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/legalconnect";

async function checkLawyers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB\n");

    const lawyers = await LawyerModel.find().populate("user", "name email");

    console.log(`Found ${lawyers.length} lawyers:\n`);
    console.log("=" .repeat(80));
    console.log("LOGIN CREDENTIALS FOR ALL LAWYERS:");
    console.log("=" .repeat(80));
    console.log("Password for all lawyers: password123\n");

    lawyers.forEach((lawyer, index) => {
      console.log(`[${index + 1}] ${lawyer.user.name}`);
      console.log(`    Email: ${lawyer.user.email}`);
      console.log(`    Profile Image: ${lawyer.profileImage || "NOT SET"}`);
      console.log(`    Practice Areas: ${lawyer.practiceAreas.join(", ")}`);
      console.log();
    });

    console.log("=" .repeat(80));
    console.log("ADMIN LOGIN:");
    console.log("=" .repeat(80));
    const admin = await UserModel.findOne({ role: "admin" });
    if (admin) {
      console.log(`Email: ${admin.email}`);
      console.log(`Password: demo123`);
    }
    console.log();

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkLawyers();
