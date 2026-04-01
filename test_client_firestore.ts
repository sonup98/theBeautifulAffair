import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function testClient() {
  console.log(`Testing client-side read from Firestore Database ID: ${firebaseConfig.firestoreDatabaseId}`);
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    console.log("SUCCESS: Client-side read worked (or at least didn't get permission denied).");
  } catch (error) {
    console.error("FAILURE: Client-side read failed:", error.message);
  }
}

testClient();
