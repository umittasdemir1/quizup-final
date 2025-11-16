const {onCall, onRequest, HttpsError} = require('firebase-functions/v2/https');
const {logger} = require('firebase-functions/v2');
const admin = require('firebase-admin');
const cors = require('cors')({
  origin: true, // Allow all origins
  credentials: true
});

admin.initializeApp();

/**
 * Delete user from Firebase Auth
 *
 * HTTP Callable Function (v2) - Only admin/superadmin can call this
 * CORS is automatically handled by v2 functions
 *
 * Request body:
 * {
 *   "userId": "user-uid-to-delete"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Kullanıcı başarıyla silindi"
 * }
 */
// Callable function - CORS is automatically handled by Firebase SDK
exports.deleteUserByAdmin = onCall(async (request) => {
  // 1. Check authentication
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'Bu işlem için giriş yapmalısınız'
    );
  }

  // 2. Get caller's user document to check role
  const callerUid = request.auth.uid;
  const data = request.data;
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();

  if (!callerDoc.exists) {
    throw new HttpsError(
      'permission-denied',
      'Kullanıcı bilgileriniz bulunamadı'
    );
  }

  const callerData = callerDoc.data();
  const isAdmin = callerData.role === 'admin';
  const isSuperAdmin = callerData.isSuperAdmin === true;

  // 3. Check if user is admin or super admin
  if (!isAdmin && !isSuperAdmin) {
    throw new HttpsError(
      'permission-denied',
      'Bu işlem için yönetici yetkisi gerekiyor'
    );
  }

  // 4. Validate input
  const { userId } = data;
  if (!userId) {
    throw new HttpsError(
      'invalid-argument',
      'Kullanıcı ID\'si gerekli'
    );
  }

  // 5. Prevent self-deletion
  if (userId === callerUid) {
    throw new HttpsError(
      'invalid-argument',
      'Kendi hesabınızı silemezsiniz'
    );
  }

  try {
    // 6. Delete from Firebase Auth
    await admin.auth().deleteUser(userId);

    // 7. Also delete from Firestore (if not already deleted by client)
    await admin.firestore().collection('users').doc(userId).delete();

    logger.info(`User ${userId} deleted by admin ${callerUid}`);

    return {
      success: true,
      message: 'Kullanıcı başarıyla silindi'
    };
  } catch (error) {
    logger.error('Error deleting user:', error);

    // Handle specific errors
    if (error.code === 'auth/user-not-found') {
      // User already deleted from Auth, just delete Firestore doc
      await admin.firestore().collection('users').doc(userId).delete();
      return {
        success: true,
        message: 'Kullanıcı kaydı temizlendi'
      };
    }

    throw new HttpsError(
      'internal',
      'Kullanıcı silinirken hata oluştu: ' + error.message
    );
  }
});
