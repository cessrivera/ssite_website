import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

export const deleteMemberCompletely = async (userId) => {
  try {
    const deleteUserFunction = httpsCallable(functions, 'deleteMember');
    const result = await deleteUserFunction({ userId });
    return { success: true, message: result.data.message };
  } catch (error) {
    console.error('Error deleting member:', error);
    return { success: false, error: error.message };
  }
};
