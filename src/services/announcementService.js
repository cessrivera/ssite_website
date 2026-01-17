// Firestore helper functions for Announcements
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  query,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION = 'announcements';

// Get all announcements
export const getAnnouncements = async () => {
  try {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting announcements:', error);
    throw error;
  }
};

// Get single announcement
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

// Create announcement
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

// Update announcement
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

// Delete announcement
export const deleteAnnouncement = async (id) => {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
  } catch (error) {
    console.error('Error deleting announcement:', error);
    throw error;
  }
};
