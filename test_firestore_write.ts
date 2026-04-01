import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };

if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = getFirestore(admin.app(), "(default)");

async function testWrite() {
  console.log(`Testing write to Firestore Database ID: (default)`);
  try {
    const docRef = db.collection("test").doc("connection");
    await docRef.set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      message: "Testing connection from server"
    });
    console.log("SUCCESS: Document written to Firestore.");
  } catch (error) {
    console.error("FAILURE: Could not write to Firestore:", error.message);
  }
}

testWrite();
