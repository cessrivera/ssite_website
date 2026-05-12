import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const SUPPORT_SETTINGS_DOC = 'support';
const DEFAULT_SUPPORT_EMAIL = 'pderivera.student@ua.edu.ph';

export const getSupportEmail = async () => {
  try {
    const docRef = doc(db, 'settings', SUPPORT_SETTINGS_DOC);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return (docSnap.data()?.supportEmail || '').trim() || DEFAULT_SUPPORT_EMAIL;
    }
  } catch (error) {
    console.error('Error loading support email:', error);
  }

  return DEFAULT_SUPPORT_EMAIL;
};

export const saveSupportEmail = async (email, updatedBy) => {
  const docRef = doc(db, 'settings', SUPPORT_SETTINGS_DOC);
  const normalizedEmail = (email || '').trim();

  await setDoc(
    docRef,
    {
      supportEmail: normalizedEmail,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || 'admin'
    },
    { merge: true }
  );
};
