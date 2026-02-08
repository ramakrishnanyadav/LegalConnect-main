/**
 * Migration script: Add scheduledDateTime field to existing consultations
 * This combines the existing date and time fields into a single UTC datetime
 *
 * Usage: node scripts/migrateConsultationTimezones.js
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import ConsultationModel from "../models/Consultation.js";

dotenv.config();

async function migrateConsultations() {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      console.error("MONGODB_URI not set in .env");
      process.exit(1);
    }

    await mongoose.connect(mongoURI, { dbName: "legalconnect" });
    console.log("Connected to MongoDB");

    // Find all consultations that don't have scheduledDateTime
    const consultations = await ConsultationModel.find({
      $or: [
        { scheduledDateTime: { $exists: false } },
        { scheduledDateTime: null },
      ],
    });

    console.log(`Found ${consultations.length} consultations to migrate`);

    let updated = 0;
    let errors = 0;

    for (const consultation of consultations) {
      try {
        // Parse the time string (format: "HH:MM")
        const timeParts = (consultation.time || "00:00").split(":");
        const hours = parseInt(timeParts[0], 10) || 0;
        const minutes = parseInt(timeParts[1], 10) || 0;

        // Create scheduledDateTime by combining date and time
        const scheduledDateTime = new Date(consultation.date);
        scheduledDateTime.setUTCHours(hours, minutes, 0, 0);

        // Update the consultation
        await ConsultationModel.findByIdAndUpdate(consultation._id, {
          scheduledDateTime: scheduledDateTime,
        });

        updated++;
        console.log(
          `✓ Updated consultation ${consultation._id}: ${consultation.date} ${consultation.time} -> ${scheduledDateTime.toISOString()}`,
        );
      } catch (err) {
        errors++;
        console.error(
          `✗ Error updating consultation ${consultation._id}:`,
          err.message,
        );
      }
    }

    console.log("\n=== Migration Summary ===");
    console.log(`Total consultations found: ${consultations.length}`);
    console.log(`Successfully updated: ${updated}`);
    console.log(`Errors: ${errors}`);

    if (updated > 0) {
      console.log("\n✅ Migration completed successfully!");
    } else {
      console.log("\nℹ️ No consultations needed migration.");
    }
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  }
}

migrateConsultations();
