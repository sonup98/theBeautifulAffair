import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };

if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

async function checkDatabase(dbId: string) {
  console.log(`\n--- Checking Firestore Database ID: ${dbId} ---`);
  const db = getFirestore(admin.app(), dbId);
  try {
    const collections = await db.listCollections();
    console.log("Collections found:", collections.map(c => c.id));
    
    if (collections.length === 0) {
      console.log("No collections found. The database might be empty.");
    } else {
      for (const col of collections) {
        const snapshot = await col.limit(1).get();
        console.log(`Collection ${col.id} has ${snapshot.empty ? 0 : "at least 1"} document(s).`);
      }
    }
  } catch (error) {
    console.error(`Error checking Firestore (${dbId}):`, error.message);
  }
}

async function run() {
  await checkDatabase(firebaseConfig.firestoreDatabaseId);
  await checkDatabase("(default)");
}

run();
