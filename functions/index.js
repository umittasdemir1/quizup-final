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

        // 🔒 SECURITY: Multi-tenant isolation - Admin can only delete users from their own company
        if (!isSuper) {
          const targetUserDoc = await admin.firestore()
            .collection("users")
            .doc(userId)
            .get();

          if (!targetUserDoc.exists) {
            return res.status(404).json({ error: "User not found" });
          }

          const targetUser = targetUserDoc.data();

          // Admin can only delete users from the same company
          if (targetUser.company !== caller.company) {
            return res.status(403).json({ error: "Cannot delete user from different company" });
          }
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

// Create demo account
exports.createDemoAccount = onRequest(
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
        const { fullName, companyName, email, password } = req.body;

        // Validation
        if (!fullName || !companyName || !email || !password) {
          return res.status(400).json({ error: "Tüm alanlar zorunludur" });
        }

        if (password.length < 6) {
          return res.status(400).json({ error: "Şifre en az 6 karakter olmalı" });
        }

        // Check if demo feature is enabled
        const demoSettingsDoc = await admin.firestore()
          .collection("settings")
          .doc("demoFeature")
          .get();

        if (!demoSettingsDoc.exists) {
          return res.status(404).json({ error: "Demo özelliği bulunamadı" });
        }

        const demoSettings = demoSettingsDoc.data();

        if (!demoSettings.enabled) {
          return res.status(403).json({ error: "Demo dönemi sona erdi" });
        }

        const endDate = new Date(demoSettings.endDate);
        if (endDate < new Date()) {
          return res.status(403).json({ error: "Demo dönemi sona erdi" });
        }

        // Generate unique company ID for demo
        const companyId = `DEMO_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        // Calculate expiry date (7 days from now)
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);

        // Create Firebase Auth user
        let userRecord;
        try {
          userRecord = await admin.auth().createUser({
            email: email.toLowerCase().trim(),
            password: password,
            displayName: fullName
          });
        } catch (authError) {
          if (authError.code === 'auth/email-already-exists') {
            return res.status(400).json({ error: "Bu email adresi zaten kullanımda" });
          }
          throw authError;
        }

        // Create Firestore user document
        await admin.firestore().collection("users").doc(userRecord.uid).set({
          firstName: fullName.split(' ')[0] || fullName,
          lastName: fullName.split(' ').slice(1).join(' ') || '',
          email: email.toLowerCase().trim(),
          company: companyId,
          companyName: companyName,
          role: 'admin',
          isDemo: true,
          expiryDate: expiryDate.toISOString(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          limits: {
            maxAdmins: 1,
            maxManagers: 3,
            maxQuestions: 25
          }
        });

        // Create company document
        await admin.firestore().collection("companies").doc(companyId).set({
          name: companyName,
          displayName: companyName,
          isDemo: true,
          expiryDate: expiryDate.toISOString(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: userRecord.uid,
          limits: {
            maxAdmins: 1,
            maxManagers: 3,
            maxQuestions: 25
          }
        });

        // Update demo settings - increment counter
        await admin.firestore()
          .collection("settings")
          .doc("demoFeature")
          .update({
            totalCreated: admin.firestore.FieldValue.increment(1)
          });

        console.log(`Demo account created: ${email} (${companyId})`);

        return res.json({
          success: true,
          message: "Demo hesap başarıyla oluşturuldu",
          userId: userRecord.uid,
          company: companyId,
          expiryDate: expiryDate.toISOString()
        });

      } catch (err) {
        console.error("Error in createDemoAccount:", err);
        return res.status(500).json({ error: err.message || "Demo hesap oluşturulamadı" });
      }
    });
  }
);

// Clean up expired demo accounts (scheduled function)
const { onSchedule } = require("firebase-functions/v2/scheduler");

exports.cleanupExpiredDemos = onSchedule(
  {
    schedule: "0 3 * * *", // Run daily at 3 AM
    timeZone: "Europe/Istanbul",
    region: "us-central1"
  },
  async (event) => {
    try {
      const now = new Date();
      const firestore = admin.firestore();

      console.log(`Starting cleanup of expired demos at ${now.toISOString()}`);

      // Find expired demo users
      const usersSnapshot = await firestore
        .collection("users")
        .where("isDemo", "==", true)
        .get();

      let deletedCount = 0;
      const batch = firestore.batch();
      const companiesToDelete = new Set();

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const expiryDate = new Date(userData.expiryDate);

        if (expiryDate < now) {
          const company = userData.company;
          companiesToDelete.add(company);

          // Delete user from Firestore
          batch.delete(userDoc.ref);

          // Delete user from Firebase Auth
          try {
            await admin.auth().deleteUser(userDoc.id);
            console.log(`Deleted Auth user: ${userDoc.id}`);
          } catch (authError) {
            console.error(`Failed to delete Auth user ${userDoc.id}:`, authError);
          }

          deletedCount++;
        }
      }

      // Commit user deletions
      await batch.commit();

      // Delete related data for each expired company
      for (const company of companiesToDelete) {
        console.log(`Cleaning up company data: ${company}`);

        // Delete questions
        const questionsSnapshot = await firestore
          .collection("questions")
          .where("company", "==", company)
          .get();

        const questionsBatch = firestore.batch();
        questionsSnapshot.docs.forEach(doc => {
          questionsBatch.delete(doc.ref);
        });
        await questionsBatch.commit();
        console.log(`Deleted ${questionsSnapshot.size} questions for ${company}`);

        // Delete quiz sessions
        const sessionsSnapshot = await firestore
          .collection("quizSessions")
          .where("company", "==", company)
          .get();

        const sessionsBatch = firestore.batch();
        sessionsSnapshot.docs.forEach(doc => {
          sessionsBatch.delete(doc.ref);
        });
        await sessionsBatch.commit();
        console.log(`Deleted ${sessionsSnapshot.size} quiz sessions for ${company}`);

        // Delete results
        const resultsSnapshot = await firestore
          .collection("results")
          .where("company", "==", company)
          .get();

        const resultsBatch = firestore.batch();
        resultsSnapshot.docs.forEach(doc => {
          resultsBatch.delete(doc.ref);
        });
        await resultsBatch.commit();
        console.log(`Deleted ${resultsSnapshot.size} results for ${company}`);

        // Delete company document
        await firestore.collection("companies").doc(company).delete();
        console.log(`Deleted company document: ${company}`);
      }

      console.log(`Cleanup completed: ${deletedCount} users deleted, ${companiesToDelete.size} companies cleaned`);

      return {
        success: true,
        deletedUsers: deletedCount,
        deletedCompanies: companiesToDelete.size
      };

    } catch (error) {
      console.error("Error in cleanupExpiredDemos:", error);
      throw error;
    }
  }
);
