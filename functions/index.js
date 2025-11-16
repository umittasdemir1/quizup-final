const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors");

admin.initializeApp();
const corsHandler = cors({ origin: true });

const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

exports.deleteUserByAdminV2 = onRequest(
  {
    cors: true, // 🔥 2nd Gen'de CORS'u FİREBASE OTOMATİK AÇAR
  },
  async (req, res) => {

    // 🔥 Manuel header ekliyoruz (Chrome preflight için zorunlu)
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // 🔥 OPTIONS ise hemen çık (CORS preflight OK)
    if (req.method === "OPTIONS") {
      return res.status(204).send(""); 
    }

    // 🔥 Sadece POST kabul et
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      // 🔐 Token kontrolü
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decoded = await admin.auth().verifyIdToken(idToken);

      const callerUid = decoded.uid;

      // 🔐 Admin kontrolü
      const callerDoc = await admin.firestore()
        .collection("users")
        .doc(callerUid)
        .get();

      if (!callerDoc.exists) {
        return res.status(403).json({ error: "Kullanıcı belgesi bulunamadı" });
      }

      const callerData = callerDoc.data();
      const isAdmin = callerData.role === "admin";
      const isSuper = callerData.isSuperAdmin === true;

      if (!isAdmin && !isSuper) {
        return res.status(403).json({ error: "Bu işlem için admin yetkisi gerekiyor" });
      }

      // 🔎 Silinecek kullanıcı ID
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId gerekli" });
      }

      // ❌ Kendini silmeye izin yok
      if (userId === callerUid) {
        return res.status(400).json({ error: "Kendi hesabınızı silemezsiniz" });
      }

      // 🔥 Auth'tan sil
      await admin.auth().deleteUser(userId);

      // 🔥 Firestore'dan sil
      await admin.firestore()
        .collection("users")
        .doc(userId)
        .delete();

      return res.json({
        success: true,
        message: "Kullanıcı başarıyla silindi"
      });

    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
);
