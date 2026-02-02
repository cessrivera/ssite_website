import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc,
  doc, 
  query,
  where,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';

const notificationsCollection = collection(db, 'userNotifications');

// Create a notification for user when admin replies
export const createUserNotification = async (notificationData) => {
  try {
    const docRef = await addDoc(notificationsCollection, {
      userEmail: notificationData.userEmail,
      userName: notificationData.userName,
      subject: notificationData.subject || 'Reply to your message',
      message: notificationData.message,
      originalMessage: notificationData.originalMessage,
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
    const q = query(
      notificationsCollection, 
      where('userEmail', '==', userEmail),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return notifications;
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
};

// Get unread count for a user
export const getUnreadCount = async (userEmail) => {
  try {
    const q = query(
      notificationsCollection, 
      where('userEmail', '==', userEmail),
      where('read', '==', false)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
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
    const q = query(
      notificationsCollection, 
      where('userEmail', '==', userEmail),
      where('read', '==', false)
    );
    const snapshot = await getDocs(q);
    
    const updatePromises = snapshot.docs.map(doc => 
      updateDoc(doc.ref, { read: true })
    );
    
    await Promise.all(updatePromises);
    return { success: true };
  } catch (error) {
    console.error('Error marking all as read:', error);
    return { success: false, error: error.message };
  }
};
