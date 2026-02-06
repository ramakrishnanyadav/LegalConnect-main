/**
 * Script to promote a user to admin role.
 * Usage: node scripts/createAdmin.js <email>
 * Example: node scripts/createAdmin.js admin@legalconnect.com
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import UserModel from "../models/User.js";

dotenv.config();

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/createAdmin.js <email>");
  process.exit(1);
}

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await UserModel.findOneAndUpdate(
      { email: email.toLowerCase() },
      { role: "admin" },
      { new: true }
    );
    if (!user) {
      console.error(`User with email "${email}" not found.`);
      process.exit(1);
    }
    console.log(`User ${user.email} (${user.name}) is now an admin.`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();
