// Firestore helper functions for Officers
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION = 'officers';

// Get all officers
export const getOfficers = async () => {
  try {
    const q = query(collection(db, COLLECTION), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting officers:', error);
    throw error;
  }
};

// Create officer
export const createOfficer = async (data) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating officer:', error);
    throw error;
  }
};

// Update officer
export const updateOfficer = async (id, data) => {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating officer:', error);
    throw error;
  }
};

// Delete officer
export const deleteOfficer = async (id) => {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
  } catch (error) {
    console.error('Error deleting officer:', error);
    throw error;
  }
};
