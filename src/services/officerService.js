import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION = 'officers';

export const getOfficers = async (options = {}) => {
  const { includeArchived = true } = options;
  try {
    const q = query(collection(db, COLLECTION), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    const officers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (includeArchived) return officers;
    return officers.filter((officer) => !officer.archived);
  } catch (error) {
    console.error('Error getting officers:', error);
    throw error;
  }
};

export const createOfficer = async (data) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      archived: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating officer:', error);
    throw error;
  }
};

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

export const archiveOfficers = async (officerIds = [], metadata = {}) => {
  if (!officerIds.length) return { success: false, error: 'No officers selected.' };

  try {
    const batch = writeBatch(db);
    const archivedAt = Timestamp.now();

    officerIds.forEach((id) => {
      const docRef = doc(db, COLLECTION, id);
      batch.update(docRef, {
        archived: true,
        archivedAt,
        ...metadata,
        updatedAt: archivedAt
      });
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error archiving officers:', error);
    return { success: false, error: error.message };
  }
};

export const deleteOfficer = async (id) => {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
  } catch (error) {
    console.error('Error deleting officer:', error);
    throw error;
  }
};
