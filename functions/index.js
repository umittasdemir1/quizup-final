const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors");

admin.initializeApp();
const corsHandler = cors({ origin: true });

const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
admin.initializeApp();

exports.deleteUserByAdminV2 = onRequest((req, res) => {
  // --- CORS headers ---
  res.set("Access-Control-Allow-Origin", "https://quizupplus.netlify.app");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Credentials", "true");

  // 🔹 Preflight (OPTIONS) → CORS izin ver
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  // 🔹 Sadece POST kabul et
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  (async () => {
    try {
      // Token al
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decoded = await admin.auth().verifyIdToken(idToken);
      const callerUid = decoded.uid;

      // Rol kontrol
      const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();
      if (!callerDoc.exists) {
        return res.status(403).json({ error: "Kullanıcı bulunamadı" });
      }

      const isAdmin =
        callerDoc.data().role === "admin" ||
        callerDoc.data().isSuperAdmin === true;

      if (!isAdmin) {
        return res.status(403).json({ error: "Yetki yok" });
      }

      // Silinecek kullanıcı
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "Kullanıcı ID gerekli" });
      }

      if (userId === callerUid) {
        return res.status(400).json({ error: "Kendinizi silemezsiniz" });
      }

      // Auth + Firestore sil
      await admin.auth().deleteUser(userId);
      await admin.firestore().collection("users").doc(userId).delete();

      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  })();
});
