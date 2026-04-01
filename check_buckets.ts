import { Storage } from "@google-cloud/storage";
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };

const storage = new Storage({
  projectId: "ais-dev-xzvtvmhg3cuklvhwmqpftt-178291757238"
});

async function tryBucket() {
  const bucketName = "ais-dev-xzvtvmhg3cuklvhwmqpftt-178291757238.appspot.com";
  try {
    const b = storage.bucket(bucketName);
    const [exists] = await b.exists();
    if (exists) {
      console.log(`Bucket ${bucketName} EXISTS!`);
      const file = b.file("test_write.txt");
      await file.save("Hello, world!");
      console.log("Upload successful!");
    } else {
      console.log(`Bucket ${bucketName} does not exist.`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

tryBucket();
