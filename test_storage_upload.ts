import admin from "firebase-admin";
import { getStorage } from "firebase-admin/storage";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "firebase-applet-config.json"), "utf8"));

if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket
  });
}

const storage = getStorage();

async function testUpload(bucketName) {
  try {
    console.log(`Testing upload to bucket: ${bucketName || 'default'}...`);
    const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
    const file = bucket.file("test_connection.txt");
    await file.save("Connection test successful at " + new Date().toISOString());
    console.log(`SUCCESS: Uploaded to ${bucketName || 'default'}`);
    return true;
  } catch (error) {
    console.error(`FAILED: ${bucketName || 'default'} - ${error.message}`);
    return false;
  }
}

async function runTests() {
  const bucketNames = [
    firebaseConfig.storageBucket,
    firebaseConfig.storageBucket.replace('.firebasestorage.app', '.appspot.com'),
    firebaseConfig.projectId,
    firebaseConfig.projectId + ".appspot.com",
    firebaseConfig.projectId + ".firebasestorage.app",
    firebaseConfig.projectId + "-firebasestorage",
    firebaseConfig.projectId + "-firebasestorage.appspot.com",
    firebaseConfig.projectId + "-firebasestorage.firebasestorage.app",
    undefined // Default bucket
  ];
  
  for (const name of bucketNames) {
    const success = await testUpload(name);
    if (success) {
      console.log("Found working bucket:", name || 'default');
      break;
    }
  }
}

runTests();
