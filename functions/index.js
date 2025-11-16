const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Delete user from Firebase Auth
 *
 * HTTP Callable Function - Only admin/superadmin can call this
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
exports.deleteUserByAdmin = functions.https.onCall(async (data, context) => {
  // 1. Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Bu işlem için giriş yapmalısınız'
    );
  }

  // 2. Get caller's user document to check role
  const callerUid = context.auth.uid;
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();

  if (!callerDoc.exists) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Kullanıcı bilgileriniz bulunamadı'
    );
  }

  const callerData = callerDoc.data();
  const isAdmin = callerData.role === 'admin';
  const isSuperAdmin = callerData.isSuperAdmin === true;

  // 3. Check if user is admin or super admin
  if (!isAdmin && !isSuperAdmin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Bu işlem için yönetici yetkisi gerekiyor'
    );
  }

  // 4. Validate input
  const { userId } = data;
  if (!userId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Kullanıcı ID\'si gerekli'
    );
  }

  // 5. Prevent self-deletion
  if (userId === callerUid) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Kendi hesabınızı silemezsiniz'
    );
  }

  try {
    // 6. Delete from Firebase Auth
    await admin.auth().deleteUser(userId);

    // 7. Also delete from Firestore (if not already deleted by client)
    await admin.firestore().collection('users').doc(userId).delete();

    functions.logger.info(`User ${userId} deleted by admin ${callerUid}`);

    return {
      success: true,
      message: 'Kullanıcı başarıyla silindi'
    };
  } catch (error) {
    functions.logger.error('Error deleting user:', error);

    // Handle specific errors
    if (error.code === 'auth/user-not-found') {
      // User already deleted from Auth, just delete Firestore doc
      await admin.firestore().collection('users').doc(userId).delete();
      return {
        success: true,
        message: 'Kullanıcı kaydı temizlendi'
      };
    }

    throw new functions.https.HttpsError(
      'internal',
      'Kullanıcı silinirken hata oluştu: ' + error.message
    );
  }
});
