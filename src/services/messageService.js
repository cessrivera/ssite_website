import { auth, db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  getDoc,
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc,
  orderBy, 
  query,
  serverTimestamp 
} from 'firebase/firestore';
import { createUserNotification } from './userNotificationService';

const messagesCollection = collection(db, 'messages');
const normalizeEmail = (email = '') => email.trim().toLowerCase();

export const createMessage = async (messageData) => {
  try {
    const name = (messageData.name || '').trim();
    const authEmail = (auth.currentUser?.email || '').trim();
    const providedEmail = (messageData.email || '').trim();
    const email = authEmail || providedEmail;
    const emailNormalized = normalizeEmail(email);
    const message = (messageData.message || '').trim();

    if (!name || !email || !message) {
      return { success: false, error: 'Name, email, and message are required.' };
    }

    const docRef = await addDoc(messagesCollection, {
      name,
      email,
      emailNormalized,
      message,
      senderUid: auth.currentUser?.uid || null,
      senderAuthEmail: authEmail || null,
      createdAt: serverTimestamp(),
      status: 'unread'
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating message:', error);
    return { success: false, error: error.message };
  }
};

export const getMessages = async () => {
  try {
    const q = query(messagesCollection, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return messages;
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
};

export const deleteMessage = async (id) => {
  try {
    await deleteDoc(doc(db, 'messages', id));
    return { success: true };
  } catch (error) {
    console.error('Error deleting message:', error);
    return { success: false, error: error.message };
  }
};

export const replyToMessage = async (messageId, replyData, originalMessage) => {
  try {
    // Update the original message with the reply
    await updateDoc(doc(db, 'messages', messageId), {
      reply: replyData.content,
      repliedAt: serverTimestamp(),
      repliedBy: replyData.adminEmail || 'Admin',
      status: 'replied'
    });

    // Create a notification for the user so they can see the reply
    if (originalMessage) {
      let recipientUserId = (originalMessage.senderUid || '').trim();
      let recipientEmail = (originalMessage.senderAuthEmail || originalMessage.email || '').trim();

      if (recipientUserId && !recipientEmail) {
        const userDoc = await getDoc(doc(db, 'users', recipientUserId));
        if (userDoc.exists()) {
          recipientEmail = (userDoc.data()?.email || '').trim();
        }
      }

      if (!recipientUserId && recipientEmail) {
        const usersByExactEmail = await getDocs(
          query(collection(db, 'users'), where('email', '==', recipientEmail))
        );

        if (!usersByExactEmail.empty) {
          recipientUserId = usersByExactEmail.docs[0].id;
        } else {
          const usersByNormalizedEmail = await getDocs(
            query(collection(db, 'users'), where('email', '==', normalizeEmail(recipientEmail)))
          );
          if (!usersByNormalizedEmail.empty) {
            recipientUserId = usersByNormalizedEmail.docs[0].id;
          }
        }
      }

      await createUserNotification({
        userEmail: recipientEmail || originalMessage.email || '',
        userId: recipientUserId || null,
        userName: originalMessage.name,
        subject: 'Reply to your message',
        message: replyData.content,
        originalMessage: originalMessage.message,
        messageId,
        repliedBy: replyData.adminEmail || 'Admin'
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error replying to message:', error);
    return { success: false, error: error.message };
  }
};

export const updateMessageStatus = async (id, status) => {
  try {
    await updateDoc(doc(db, 'messages', id), { status });
    return { success: true };
  } catch (error) {
    console.error('Error updating message status:', error);
    return { success: false, error: error.message };
  }
};
