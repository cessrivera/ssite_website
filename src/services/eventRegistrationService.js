import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query,
  where,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';

const registrationsCollection = collection(db, 'eventRegistrations');

export const registerForEvent = async (registrationData) => {
  try {
    const docRef = await addDoc(registrationsCollection, {
      ...registrationData,
      registeredAt: serverTimestamp(),
      status: 'confirmed'
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error registering for event:', error);
    return { success: false, error: error.message };
  }
};

export const getEventRegistrations = async (eventId) => {
  try {
    const q = query(
      registrationsCollection, 
      where('eventId', '==', eventId),
      orderBy('registeredAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting event registrations:', error);
    throw error;
  }
};

export const getUserRegistrations = async (userId) => {
  try {
    const q = query(
      registrationsCollection,
      where('userId', '==', userId),
      orderBy('registeredAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting user registrations:', error);
    throw error;
  }
};

export const isUserRegistered = async (userId, eventId) => {
  try {
    const q = query(
      registrationsCollection,
      where('userId', '==', userId),
      where('eventId', '==', eventId)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking registration:', error);
    return false;
  }
};

export const deleteRegistration = async (id) => {
  try {
    await deleteDoc(doc(db, 'eventRegistrations', id));
    return { success: true };
  } catch (error) {
    console.error('Error deleting registration:', error);
    return { success: false, error: error.message };
  }
};
