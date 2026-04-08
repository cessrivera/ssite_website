import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION = 'announcements';

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getAnnouncementSortTime = (announcement) => {
  return (
    toMillis(announcement.createdAt) ||
    toMillis(announcement.updatedAt) ||
    toMillis(announcement.date)
  );
};

export const getAnnouncements = async () => {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION));
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((left, right) => {
        const timeDelta = getAnnouncementSortTime(right) - getAnnouncementSortTime(left);
        if (timeDelta !== 0) return timeDelta;
        return String(left.title || '').localeCompare(String(right.title || ''));
      });
  } catch (error) {
    console.error('Error getting announcements:', error);
    throw error;
  }
};

export const getAnnouncement = async (id) => {
  try {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting announcement:', error);
    throw error;
  }
};

export const createAnnouncement = async (data) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating announcement:', error);
    throw error;
  }
};

export const updateAnnouncement = async (id, data) => {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    throw error;
  }
};

export const deleteAnnouncement = async (id) => {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
  } catch (error) {
    console.error('Error deleting announcement:', error);
    throw error;
  }
};

export const archiveAnnouncement = async (id) => {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      archived: true,
      archivedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error archiving announcement:', error);
    throw error;
  }
};

export const unarchiveAnnouncement = async (id) => {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      archived: false,
      archivedAt: null,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error unarchiving announcement:', error);
    throw error;
  }
};
