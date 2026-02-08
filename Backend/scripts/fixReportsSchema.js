import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const clearAllReports = async () => {
  try {
    // Connect to MongoDB directly (not through Mongoose models)
    const client = await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Get raw database and collection
    const db = mongoose.connection.db;
    const topicsCollection = db.collection("topics");

    // Use raw MongoDB updateMany to bypass Mongoose validation
    // This fixes the corrupted string data like "[ 1 ]"
    const result1 = await topicsCollection.updateMany(
      {},
      { $set: { reports: [] } },
    );

    console.log(`✓ Cleared top-level reports: ${result1.modifiedCount} topics`);

    // Fix nested replies reports by replacing with unset and then empty array
    // First, remove all nested reply reports
    const result2 = await topicsCollection.updateMany(
      {},
      { $unset: { "replies.$[].reports": "" } },
    );

    console.log(
      `✓ Removed corrupted nested reports: ${result2.modifiedCount} topics`,
    );

    // Now set them as empty arrays
    const result3 = await topicsCollection.updateMany(
      {},
      { $set: { "replies.$[].reports": [] } },
    );

    console.log(
      `✓ Set nested reports to empty array: ${result3.modifiedCount} topics`,
    );

    console.log(`\nCleanup complete! Database is now clean and ready.`);
    console.log(`Please restart your backend server now.`);

    process.exit(0);
  } catch (error) {
    console.error("Clear error:", error);
    process.exit(1);
  }
};

clearAllReports();
