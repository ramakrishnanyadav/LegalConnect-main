import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/legalconnect")
  .then(async () => {
    console.log("Connected to MongoDB for cleanup");

    try {
      const db = mongoose.connection.db;

      // 1. Find and remove any numeric 0 values from reports arrays in topics
      const result1 = await db
        .collection("topics")
        .updateMany({ reports: 0 }, { $pull: { reports: 0 } });
      console.log(
        `Removed 0 from topic reports: ${result1.modifiedCount} documents`,
      );

      // 2. Find and remove any numeric 0 values from nested reply reports
      const result2 = await db
        .collection("topics")
        .updateMany(
          { "replies.reports": 0 },
          { $pull: { "replies.$[].reports": 0 } },
        );
      console.log(
        `Removed 0 from nested reply reports: ${result2.modifiedCount} documents`,
      );

      // 3. Remove any string values that look like corrupted data from reports
      const result3 = await db
        .collection("topics")
        .updateMany(
          { reports: { $type: "string" } },
          { $set: { reports: [] } },
        );
      console.log(
        `Cleaned string values from topic reports: ${result3.modifiedCount} documents`,
      );

      // 4. Clean nested replies
      const result4 = await db
        .collection("topics")
        .updateMany(
          { "replies.reports": { $type: "string" } },
          { $set: { "replies.$[].reports": [] } },
        );
      console.log(
        `Cleaned string values from nested reply reports: ${result4.modifiedCount} documents`,
      );

      console.log("\nCleanup completed successfully!");
      process.exit(0);
    } catch (err) {
      console.error("Cleanup error:", err);
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
