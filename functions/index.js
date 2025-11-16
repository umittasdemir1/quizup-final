const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors");

admin.initializeApp();
const corsHandler = cors({ origin: true });

exports.deleteUserByAdminV2 = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {

    // Preflight
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      return res.status(204).send("");
    }

    if (req.method !== "POST") {
      res.set("Access-Control-Allow-Origin", "*");
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      // Token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.set("Access-Control-Allow-Origin", "*");
        return res.status(401).json({ error: "Unauthorized" });
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decoded = await admin.auth().verifyIdToken(idToken);
      const callerUid = decoded.uid;

      // Role check
      const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();
      const caller = callerDoc.data();
      if (!(caller.role === "admin" || caller.isSuperAdmin)) {
        res.set("Access-Control-Allow-Origin", "*");
        return res.status(403).json({ error: "Yetkiniz yok" });
      }

      // Input
      const { userId } = req.body;
      if (!userId) {
        res.set("Access-Control-Allow-Origin", "*");
        return res.status(400).json({ error: "userId gerekli" });
      }
      if (userId === callerUid) {
        res.set("Access-Control-Allow-Origin", "*");
        return res.status(400).json({ error: "Kendinizi silemezsiniz" });
      }

      await admin.auth().deleteUser(userId);
      await admin.firestore().collection("users").doc(userId).delete();

      res.set("Access-Control-Allow-Origin", "*");
      return res.status(200).json({ success: true });

    } catch (err) {
      res.set("Access-Control-Allow-Origin", "*");
      return res.status(500).json({ error: err.message });
    }

  });
});
