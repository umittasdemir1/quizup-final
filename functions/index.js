const {onCall, onRequest, HttpsError} = require('firebase-functions/v2/https');
const {logger} = require('firebase-functions/v2');
const admin = require('firebase-admin');
const cors = require('cors')({
  origin: true, // Allow all origins
  credentials: true
});

admin.initializeApp();

/**
 * Delete user from Firebase Auth - HTTP Endpoint with CORS
 *
 * This is an HTTP endpoint (not callable) to avoid CORS issues
 */
exports.deleteUserByAdminV2 = onRequest({cors: true}, async (req, res) => {
  // Only accept POST
  if (req.method !== 'POST') {
    res.status(405).json({error: 'Method not allowed'});
    return;
  }

  try {
    // Get ID token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({error: 'Unauthorized: Missing or invalid token'});
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Verify ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const callerUid = decodedToken.uid;

    // Get caller's user document to check role
    const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();

    if (!callerDoc.exists) {
      res.status(403).json({error: 'Kullanıcı bilgileriniz bulunamadı'});
      return;
    }

    const callerData = callerDoc.data();
    const isAdmin = callerData.role === 'admin';
    const isSuperAdmin = callerData.isSuperAdmin === true;

    // Check if user is admin or super admin
    if (!isAdmin && !isSuperAdmin) {
      res.status(403).json({error: 'Bu işlem için yönetici yetkisi gerekiyor'});
      return;
    }

    // Validate input
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({error: 'Kullanıcı ID\'si gerekli'});
      return;
    }

    // Prevent self-deletion
    if (userId === callerUid) {
      res.status(400).json({error: 'Kendi hesabınızı silemezsiniz'});
      return;
    }

    // Delete from Firebase Auth
    await admin.auth().deleteUser(userId);

    // Also delete from Firestore
    await admin.firestore().collection('users').doc(userId).delete();

    logger.info(`User ${userId} deleted by admin ${callerUid}`);

    res.status(200).json({
      success: true,
      message: 'Kullanıcı başarıyla silindi'
    });

  } catch (error) {
    logger.error('Error deleting user:', error);

    // Handle specific errors
    if (error.code === 'auth/user-not-found') {
      // User already deleted from Auth, just delete Firestore doc
      try {
        const { userId } = req.body;
        await admin.firestore().collection('users').doc(userId).delete();
        res.status(200).json({
          success: true,
          message: 'Kullanıcı kaydı temizlendi'
        });
      } catch (e) {
        res.status(500).json({error: 'Firestore silme hatası: ' + e.message});
      }
      return;
    }

    res.status(500).json({
      error: 'Kullanıcı silinirken hata oluştu: ' + error.message
    });
  }
});
