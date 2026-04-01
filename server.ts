import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("GOOGLE_APPLICATION_CREDENTIALS:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
console.log("GOOGLE_CLOUD_PROJECT:", process.env.GOOGLE_CLOUD_PROJECT);
console.log("FIREBASE_CONFIG:", process.env.FIREBASE_CONFIG);

// Read Firebase config manually to avoid import issues
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "firebase-applet-config.json"), "utf8"));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  // Use the storageBucket from config as primary
  const bucketName = firebaseConfig.storageBucket;

  admin.initializeApp({
    projectId: firebaseConfig.projectId,
    storageBucket: bucketName
  });
  console.log("Firebase Admin initialized with project:", firebaseConfig.projectId);
  console.log("Configured bucket:", bucketName);
  
  // Firestore initialization
  const db = getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId);
  
  // Connection test
  const testConnections = async () => {
    // Test Firestore
    try {
      console.log(`Testing connection to Firestore Database ID: ${firebaseConfig.firestoreDatabaseId}...`);
      await db.collection('test').doc('connection').set({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        message: "Server startup test"
      });
      console.log("SUCCESS: Firestore is accessible.");
    } catch (e: any) {
      console.error(`CRITICAL: Firestore connection failed (${firebaseConfig.firestoreDatabaseId}):`, e.message);
    }
  };
  
  testConnections();
}

const storage = admin.storage();
const bucket = storage.bucket();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configure Multer for memory storage
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  });

  // API routes
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Serve local uploads
  app.use("/uploads", express.static(uploadsDir));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "The Beautiful Affair Server is Running" });
  });

  // Image upload endpoint - Uploads to Firebase Storage
  app.post("/api/upload", (req, res, next) => {
    console.log("POST /api/upload request received");
    upload.single("file")(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err);
        return res.status(400).json({ error: `Multer error: ${err.message}` });
      }
      console.log("Multer parsed file:", (req as any).file?.originalname);
      next();
    });
  }, async (req, res) => {
    const anyReq = req as any;
    if (!anyReq.file) {
      console.error("No file in request after Multer");
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log(`Received file: ${anyReq.file.originalname}, size: ${anyReq.file.size}, mimetype: ${anyReq.file.mimetype}`);

    try {
      const fileName = `uploads/${Date.now()}-${anyReq.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      
      // Try to upload using the configured bucket
      let uploadSuccess = false;
      let lastError: any = null;
      let finalFile: any = null;

      // List of bucket names to try in order of likelihood
      const bucketsToTry = [
        bucket, // The one from initializeApp
        storage.bucket(`${firebaseConfig.projectId}.firebasestorage.app`),
        storage.bucket(`${firebaseConfig.projectId}.appspot.com`),
        storage.bucket(firebaseConfig.projectId)
      ];

      for (const currentBucket of bucketsToTry) {
        try {
          console.log(`Attempting upload to bucket: ${currentBucket.name}...`);
          const file = currentBucket.file(fileName);
          await file.save(anyReq.file.buffer, {
            metadata: {
              contentType: anyReq.file.mimetype,
            },
          });
          finalFile = file;
          uploadSuccess = true;
          console.log(`SUCCESS: Uploaded to bucket: ${currentBucket.name}`);
          break;
        } catch (err: any) {
          lastError = err;
          console.warn(`Failed to upload to bucket ${currentBucket.name}:`, err.message || err);
          // Continue to next bucket regardless of error type
          continue;
        }
      }

      if (!uploadSuccess) {
        console.warn("All cloud storage buckets failed, falling back to local storage. Last error:", lastError?.message || lastError);
        // Local fallback
        const localPath = path.join(uploadsDir, fileName.replace('uploads/', ''));
        fs.writeFileSync(localPath, anyReq.file.buffer);
        
        // Construct local URL
        // We use a relative URL which works because we serve /uploads as static
        const localUrl = `/uploads/${path.basename(localPath)}`;
        console.log(`Successfully saved ${anyReq.file.originalname} to local storage: ${localUrl}`);
        return res.json({ url: localUrl });
      }

      // Get a signed URL that lasts for a long time
      const [url] = await finalFile.getSignedUrl({
        action: 'read',
        expires: '01-01-2100', // Far future
      });
      
      console.log(`Successfully uploaded ${anyReq.file.originalname} to Storage: ${url}`);
      
      return res.json({ url });
    } catch (uploadErr: any) {
      console.error("Storage upload error:", uploadErr);
      return res.status(500).json({ 
        error: "Failed to upload image to storage", 
        details: uploadErr.message
      });
    }
  });

  // Catch-all for API routes to ensure JSON 404 instead of HTML fallback
  app.all("/api/*", (req, res) => {
    console.warn(`API 404: ${req.method} ${req.url}`);
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Global error handler to ensure JSON responses
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Global error:", err);
    res.status(err.status || 500).json({ 
      error: err.name || "Internal server error", 
      message: err.message,
      details: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    });
  });

  // Mock products API
  app.get("/api/products", (req, res) => {
    res.json([
      { id: 's1', name: 'Velvet Rose Scrunchie', category: 'scrunchie', price: 299, image: '🎀' },
      { id: 'e1', name: 'Jhumka Gold Drop', category: 'earring', price: 599, image: '✨' },
      { id: 'n1', name: 'Layered Chain Set', category: 'necklace', price: 849, image: '📿' },
    ]);
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
