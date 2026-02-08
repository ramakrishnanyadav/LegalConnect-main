import mongoose from "mongoose";
import dotenv from "dotenv";
import UserModel from "../models/User.js";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/legalconnect";

async function findAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);

    const admin = await UserModel.findOne({ role: "admin" });
    if (admin) {
      console.log(`Found admin: ${admin.email}`);
      process.exit(0);
    } else {
      console.log("No admin user found");
      const allUsers = await UserModel.find().select("email role name");
      console.log("Users in database:", allUsers);
      process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

findAdmin();
