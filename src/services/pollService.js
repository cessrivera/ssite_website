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

const COLLECTION = 'polls';

export const getPolls = async () => {
  try {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting polls:', error);
    throw error;
  }
};

export const createPoll = async (data) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      votes: {} // Initialize empty votes object
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating poll:', error);
    throw error;
  }
};

export const updatePoll = async (id, data) => {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating poll:', error);
    throw error;
  }
};

export const votePoll = async (pollId, optionIndex, userId) => {
  try {
    const pollRef = doc(db, COLLECTION, pollId);
    const pollsQuery = query(collection(db, COLLECTION));
    const pollSnapshot = await getDocs(pollsQuery);
    const pollDoc = pollSnapshot.docs.find(d => d.id === pollId);
    
    if (!pollDoc) {
      throw new Error('Poll not found');
    }

    const pollData = pollDoc.data();
    const options = pollData.options || [];
    const votedUsers = pollData.votedUsers || [];
    
    // Increment the vote count for the selected option
    options[optionIndex].votes = (options[optionIndex].votes || 0) + 1;
    
    // Add user to votedUsers array
    votedUsers.push(userId);
    
    // Update total votes
    const totalVotes = (pollData.totalVotes || 0) + 1;
    
    await updateDoc(pollRef, {
      options,
      votedUsers,
      totalVotes,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error voting on poll:', error);
    throw error;
  }
};

export const deletePoll = async (id) => {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
  } catch (error) {
    console.error('Error deleting poll:', error);
    throw error;
  }
};
