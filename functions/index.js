const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

admin.initializeApp();

exports.deleteUserByAdminV2 = onRequest((req, res) => {
  cors(req, res, async () => {

    // ⭐ PRE-FLIGHT (OPTIONS) İŞLEMİ MUTLAKA OLMALI
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return res.status(204).send('');
    }

    // ⭐ Sadece POST kabul et
    if (req.method !== 'POST') {
      res.set('Access-Control-Allow-Origin', '*');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      // ⭐ Token kontrolü
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.set('Access-Control-Allow-Origin', '*');
        return res.status(401).json({ error: 'Unauthorized: Missing token' });
      }

      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const callerUid = decodedToken.uid;

      // ⭐ Rol kontrolü
      const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
      if (!callerDoc.exists) {
        res.set('Access-Control-Allow-Origin', '*');
        return res.status(403).json({ error: 'Kullanıcı bulunamadı' });
      }

      const caller = callerDoc.data();
      if (!(caller.role === 'admin' || caller.isSuperAdmin === true)) {
        res.set('Access-Control-Allow-Origin', '*');
        return res.status(403).json({ error: 'Yetkisiz işlem' });
      }

      const { userId } = req.body;
      if (!userId) {
        res.set('Access-Control-Allow-Origin', '*');
        return res.status(400).json({ error: 'userId gerekli' });
      }

      if (userId === callerUid) {
        res.set('Access-Control-Allow-Origin', '*');
        return res.status(400).json({ error: 'Kendinizi silemezsiniz' });
      }

      // ⭐ Auth + Firestore silme
      await admin.auth().deleteUser(userId);
      await admin.firestore().collection('users').doc(userId).delete();

      res.set('Access-Control-Allow-Origin', '*');
      return res.status(200).json({
        success: true,
        message: 'Kullanıcı başarıyla silindi'
      });

    } catch (error) {
      logger.error(error);
      res.set('Access-Control-Allow-Origin', '*');
      return res.status(500).json({ error: error.message });
    }

  });
});
