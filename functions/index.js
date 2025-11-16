const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

exports.deleteUserByAdminV2 = onRequest(
  { cors: true },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const idToken = auth.split("Bearer ")[1];
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

      return res.json({ success: true, message: "User deleted" });

    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
);
