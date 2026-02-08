import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import imagekit from "../utils/imagekit.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const profilesDir = path.join(__dirname, "../uploads/profiles");

async function uploadProfiles() {
  try {
    console.log("Starting profile image upload to ImageKit...\n");

    const files = fs
      .readdirSync(profilesDir)
      .filter((file) => file.endsWith(".jpg") || file.endsWith(".png"));

    console.log(`Found ${files.length} profile images\n`);

    const uploadedUrls = {};

    for (const file of files) {
      try {
        const filePath = path.join(profilesDir, file);
        const fileBuffer = fs.readFileSync(filePath);

        console.log(`Uploading ${file}...`);

        const result = await imagekit.upload({
          file: fileBuffer,
          fileName: file,
          folder: "/legalconnect/profiles",
          useUniqueFileName: false,
        });

        uploadedUrls[file] = result.url;
        console.log(`✓ Uploaded: ${result.url}\n`);
      } catch (error) {
        console.error(`✗ Failed to upload ${file}:`, error.message);
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("UPLOAD SUMMARY:");
    console.log("=".repeat(80));
    console.log(JSON.stringify(uploadedUrls, null, 2));
    console.log("\n");

    return uploadedUrls;
  } catch (error) {
    console.error("Error uploading profiles:", error);
    process.exit(1);
  }
}

uploadProfiles().then(() => {
  console.log("✓ All uploads complete!");
  process.exit(0);
});
