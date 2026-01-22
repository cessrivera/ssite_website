const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.deleteMember = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userId } = data;

  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'User ID is required');
  }

  try {
    // Get user document to check if requester is admin
    const requesterDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    
    if (!requesterDoc.exists || requesterDoc.data().role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can delete members');
    }

    // Delete user from Firebase Authentication
    await admin.auth().deleteUser(userId);
    console.log(`Successfully deleted user ${userId} from Firebase Authentication`);

    // Delete user from Firestore
    await admin.firestore().collection('users').doc(userId).delete();
    console.log(`Successfully deleted user ${userId} from Firestore`);

    return { success: true, message: 'Member deleted successfully from database and authentication' };
  } catch (error) {
    console.error('Error deleting member:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
