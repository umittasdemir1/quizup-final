const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const cors = require("cors");

admin.initializeApp();

// CORS configuration with explicit allowed origins
const allowedOrigins = [
  'https://quizupplus.netlify.app',
  'http://localhost:8080',
  'http://localhost:5173',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:5173'
];

const corsHandler = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204
});

exports.deleteUserByAdminV2 = onRequest(
  { region: "us-central1" },
  (req, res) => {
    corsHandler(req, res, async () => {
      // Handle preflight OPTIONS request
      if (req.method === "OPTIONS") {
        res.set('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.set('Access-Control-Max-Age', '3600');
        return res.status(204).send("");
      }

      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      try {
        // Set CORS headers for all responses
        res.set('Access-Control-Allow-Origin', req.headers.origin || 'https://quizupplus.netlify.app');
        res.set('Access-Control-Allow-Credentials', 'true');

        const authHeader = req.headers.authorization || "";
        if (!authHeader.startsWith("Bearer ")) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const idToken = authHeader.split("Bearer ")[1];
        const decoded = await admin.auth().verifyIdToken(idToken);
        const callerUid = decoded.uid;

        const callerDoc = await admin.firestore()
          .collection("users")
          .doc(callerUid)
          .get();

        if (!callerDoc.exists) {
          return res.status(403).json({ error: "User doc missing" });
        }

        const caller = callerDoc.data();
        const isAdmin = caller.role === "admin";
        const isSuper = caller.isSuperAdmin === true;

        if (!isAdmin && !isSuper) {
          return res.status(403).json({ error: "Not authorized" });
        }

        const { userId } = req.body;
        if (!userId) {
          return res.status(400).json({ error: "userId required" });
        }

        if (userId === callerUid) {
          return res.status(400).json({ error: "Cannot delete yourself" });
        }

        await admin.auth().deleteUser(userId);
        await admin.firestore().collection("users").doc(userId).delete();

        return res.json({
          success: true,
          message: "User deleted"
        });

      } catch (err) {
        console.error("Error in deleteUserByAdminV2:", err);
        return res.status(500).json({ error: err.message });
      }
    });
  }
);
