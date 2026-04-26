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

const normalizeRecipient = (recipient) => {
  if (typeof recipient === 'string') {
    const rawEmail = recipient.trim();
    return {
      userId: '',
      userEmail: rawEmail,
      userEmailNormalized: normalizeEmail(rawEmail),
    };
  }

  const payload = recipient || {};
  const rawEmail = (payload.email || payload.userEmail || '').trim();
  return {
    userId: (payload.userId || '').trim(),
    userEmail: rawEmail,
    userEmailNormalized: normalizeEmail(payload.emailNormalized || payload.userEmailNormalized || rawEmail),
  };
};

const buildRecipientQueries = (recipient) => {
  const clauses = [];
  if (recipient.userId) clauses.push(query(notificationsCollection, where('userId', '==', recipient.userId)));
  if (recipient.userEmail) clauses.push(query(notificationsCollection, where('userEmail', '==', recipient.userEmail)));
  if (recipient.userEmailNormalized && recipient.userEmailNormalized !== recipient.userEmail) {
    clauses.push(query(notificationsCollection, where('userEmail', '==', recipient.userEmailNormalized)));
  }
  if (recipient.userEmailNormalized) {
    clauses.push(query(notificationsCollection, where('userEmailNormalized', '==', recipient.userEmailNormalized)));
  }
  return clauses;
};

const sortByNewest = (items = []) =>
  [...items].sort((a, b) => {
    const aMs = a?.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a?.createdAt || 0).getTime();
    const bMs = b?.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b?.createdAt || 0).getTime();
    return bMs - aMs;
  });

const mergeNotifications = (items = []) => {
  const byId = new Map();
  items.forEach((item) => {
    if (!item?.id) return;
    byId.set(item.id, item);
  });
  return sortByNewest([...byId.values()]);
};

// Create a notification for user when admin replies
export const createUserNotification = async (notificationData) => {
  try {
    const rawEmail = (notificationData.userEmail || '').trim();
    const normalizedEmail = normalizeEmail(rawEmail);
    const normalizedUserId = (notificationData.userId || '').trim();

    if (!normalizedEmail && !normalizedUserId) {
      return { success: false, error: 'Recipient email or user ID is required.' };
    }

    const docRef = await addDoc(notificationsCollection, {
      userEmail: rawEmail || normalizedEmail,
      userEmailNormalized: normalizedEmail || null,
      userId: normalizedUserId || null,
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

// Get notifications for a specific user by email or uid
export const getUserNotifications = async (recipientValue) => {
  try {
    const recipient = normalizeRecipient(recipientValue);
    if (!recipient.userEmail && !recipient.userEmailNormalized && !recipient.userId) return [];

    const snapshots = await Promise.all(
      buildRecipientQueries(recipient).map((recipientQuery) => getDocs(recipientQuery))
    );
    const notifications = snapshots.flatMap((snapshot) =>
      snapshot.docs.map((notificationDoc) => ({ id: notificationDoc.id, ...notificationDoc.data() }))
    );

    return mergeNotifications(notifications);
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
};

// Realtime notifications subscription for immediate UI updates
export const subscribeToUserNotifications = (recipientValue, callback) => {
  const recipient = normalizeRecipient(recipientValue);

  if (!recipient.userEmail && !recipient.userEmailNormalized && !recipient.userId) {
    callback([]);
    return () => {};
  }

  const queryKeys = [];
  const queryResults = {};
  const unsubscribers = buildRecipientQueries(recipient).map((recipientQuery, idx) => {
    const key = `query-${idx}`;
    queryKeys.push(key);
    queryResults[key] = [];

    return onSnapshot(
      recipientQuery,
      (snapshot) => {
        queryResults[key] = snapshot.docs.map((notificationDoc) => ({
          id: notificationDoc.id,
          ...notificationDoc.data()
        }));
        callback(mergeNotifications(queryKeys.flatMap((queryKey) => queryResults[queryKey] || [])));
      },
      (error) => {
        console.error('Error subscribing to user notifications:', error);
        queryResults[key] = [];
        callback(mergeNotifications(queryKeys.flatMap((queryKey) => queryResults[queryKey] || [])));
      }
    );
  });

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
};

// Get unread count for a user
export const getUnreadCount = async (recipientValue) => {
  try {
    const notifications = await getUserNotifications(recipientValue);
    return notifications.reduce((count, notification) => (notification.read ? count : count + 1), 0);
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId) => {
  try {
    await updateDoc(doc(db, 'userNotifications', notificationId), { read: true });
    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: error.message };
  }
};

// Mark all notifications as read for a user
export const markAllAsRead = async (recipientValue) => {
  try {
    const recipient = normalizeRecipient(recipientValue);
    if (!recipient.userEmail && !recipient.userEmailNormalized && !recipient.userId) return { success: true };

    const snapshots = await Promise.all(
      buildRecipientQueries(recipient).map((recipientQuery) => getDocs(recipientQuery))
    );
    const docsById = new Map();
    snapshots.forEach((snapshot) => {
      snapshot.docs.forEach((notificationDoc) => {
        docsById.set(notificationDoc.id, notificationDoc);
      });
    });

    await Promise.all(
      [...docsById.values()].map((notificationDoc) =>
        notificationDoc.data().read ? Promise.resolve() : updateDoc(notificationDoc.ref, { read: true })
      )
    );

    return { success: true };
  } catch (error) {
    console.error('Error marking all as read:', error);
    return { success: false, error: error.message };
  }
};
