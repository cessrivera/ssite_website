import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc,
  doc, 
  query,
  where,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';

const notificationsCollection = collection(db, 'userNotifications');
const normalizeEmail = (email = '') => email.trim().toLowerCase();

const sortByNewest = (items = []) =>
  [...items].sort((a, b) => {
    const aMs = a?.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a?.createdAt || 0).getTime();
    const bMs = b?.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b?.createdAt || 0).getTime();
    return bMs - aMs;
  });

// Create a notification for user when admin replies
export const createUserNotification = async (notificationData) => {
  try {
    const normalizedEmail = normalizeEmail(notificationData.userEmail);

    if (!normalizedEmail) {
      return { success: false, error: 'Recipient email is required.' };
    }

    const docRef = await addDoc(notificationsCollection, {
      userEmail: normalizedEmail,
      userName: notificationData.userName,
      subject: notificationData.subject || 'Reply to your message',
      message: notificationData.message,
      originalMessage: notificationData.originalMessage,
      messageId: notificationData.messageId || null,
      repliedBy: notificationData.repliedBy || 'Admin',
      createdAt: serverTimestamp(),
      read: false
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating user notification:', error);
    return { success: false, error: error.message };
  }
};

// Get notifications for a specific user by email
export const getUserNotifications = async (userEmail) => {
  try {
    const normalizedEmail = normalizeEmail(userEmail);
    if (!normalizedEmail) return [];

    const q = query(
      notificationsCollection, 
      where('userEmail', '==', normalizedEmail)
    );
    const snapshot = await getDocs(q);
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return sortByNewest(notifications);
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
};

// Realtime notifications subscription for immediate UI updates
export const subscribeToUserNotifications = (userEmail, callback) => {
  const normalizedEmail = normalizeEmail(userEmail);

  if (!normalizedEmail) {
    callback([]);
    return () => {};
  }

  const q = query(
    notificationsCollection,
    where('userEmail', '==', normalizedEmail)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data()
      }));

      callback(sortByNewest(notifications));
    },
    (error) => {
      console.error('Error subscribing to user notifications:', error);
      callback([]);
    }
  );
};

// Get unread count for a user
export const getUnreadCount = async (userEmail) => {
  try {
    const normalizedEmail = normalizeEmail(userEmail);
    if (!normalizedEmail) return 0;

    const q = query(
      notificationsCollection, 
      where('userEmail', '==', normalizedEmail)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.reduce((count, document) => {
      const data = document.data();
      return data.read ? count : count + 1;
    }, 0);
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId) => {
  try {
    await updateDoc(doc(db, 'userNotifications', notificationId), {
      read: true
    });
    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: error.message };
  }
};

// Mark all notifications as read for a user
export const markAllAsRead = async (userEmail) => {
  try {
    const normalizedEmail = normalizeEmail(userEmail);
    if (!normalizedEmail) return { success: true };

    const q = query(
      notificationsCollection, 
      where('userEmail', '==', normalizedEmail)
    );
    const snapshot = await getDocs(q);
    
    const updatePromises = snapshot.docs.map(doc => 
      doc.data().read ? Promise.resolve() : updateDoc(doc.ref, { read: true })
    );
    
    await Promise.all(updatePromises);
    return { success: true };
  } catch (error) {
    console.error('Error marking all as read:', error);
    return { success: false, error: error.message };
  }
};
