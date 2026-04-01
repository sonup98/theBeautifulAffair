import { Storage } from "@google-cloud/storage";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "firebase-applet-config.json"), "utf8"));

const storage = new Storage({
  projectId: firebaseConfig.projectId,
});

async function listBuckets() {
  try {
    console.log("Listing buckets for project:", firebaseConfig.projectId);
    const [buckets] = await storage.getBuckets();
    console.log("Found buckets:");
    buckets.forEach(bucket => {
      console.log("- ", bucket.name);
    });
    
    if (buckets.length === 0) {
      console.log("No buckets found.");
    }
  } catch (error) {
    console.error("Error listing buckets:", error.message);
  }
}

listBuckets();
