import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc,
  orderBy, 
  query,
  serverTimestamp 
} from 'firebase/firestore';

const messagesCollection = collection(db, 'messages');

export const createMessage = async (messageData) => {
  try {
    const docRef = await addDoc(messagesCollection, {
      ...messageData,
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

export const replyToMessage = async (messageId, replyData) => {
  try {
    await updateDoc(doc(db, 'messages', messageId), {
      reply: replyData.content,
      repliedAt: serverTimestamp(),
      repliedBy: replyData.adminEmail || 'Admin',
      status: 'replied'
    });
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
