import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/legalconnect")
  .then(async () => {
    console.log("Connected to MongoDB for inspection");

    try {
      const db = mongoose.connection.db;

      // Find any documents where reports is NOT an array
      console.log("\n=== Topics with non-array reports ===");
      const nonArrayReports = await db
        .collection("topics")
        .find({ $expr: { $ne: [{ $type: "$reports" }, "array"] } })
        .limit(5)
        .toArray();

      if (nonArrayReports.length > 0) {
        nonArrayReports.forEach((doc) => {
          console.log(
            `ID: ${doc._id}, reports:`,
            doc.reports,
            "type:",
            typeof doc.reports,
          );
        });
      } else {
        console.log("No non-array reports found");
      }

      // Find topics where reports contains the number 0
      console.log("\n=== Topics with 0 in reports ===");
      const reportsWithZero = await db
        .collection("topics")
        .find({ reports: 0 })
        .limit(5)
        .toArray();

      if (reportsWithZero.length > 0) {
        reportsWithZero.forEach((doc) => {
          console.log(`ID: ${doc._id}, reports:`, doc.reports);
        });
      } else {
        console.log("No reports with 0 found");
      }

      // Sample reports values
      console.log("\n=== Sample reports values ===");
      const sample = await db
        .collection("topics")
        .aggregate([{ $limit: 10 }, { $project: { _id: 1, reports: 1 } }])
        .toArray();

      sample.forEach((doc) => {
        console.log(
          `ID: ${doc._id}, reports:`,
          doc.reports,
          "type:",
          Array.isArray(doc.reports) ? "array" : typeof doc.reports,
        );
      });

      process.exit(0);
    } catch (err) {
      console.error("Inspection error:", err);
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
