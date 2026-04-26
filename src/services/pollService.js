import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  setDoc,
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
    const polls = snapshot.docs.map((pollDoc) => ({ id: pollDoc.id, ...pollDoc.data() }));

    try {
      const votesSnapshot = await getDocs(collection(db, 'pollVotes'));
      const votesByPoll = new Map();

      votesSnapshot.docs.forEach((voteDoc) => {
        const voteData = voteDoc.data();
        if (!voteData?.pollId) return;

        const pollVotes = votesByPoll.get(voteData.pollId) || [];
        pollVotes.push(voteData);
        votesByPoll.set(voteData.pollId, pollVotes);
      });

      return polls.map((poll) => {
        const pollVotes = votesByPoll.get(poll.id) || [];
        const options = (poll.options || []).map((option, idx) => ({
          ...option,
          votes: pollVotes.filter((vote) => vote.optionIndex === idx).length,
        }));
        const votedUsers = [...new Set(pollVotes.map((vote) => vote.userId).filter(Boolean))];

        return {
          ...poll,
          options,
          totalVotes: pollVotes.length,
          votedUsers,
        };
      });
    } catch {
      return polls;
    }
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
    const pollDoc = await getDoc(pollRef);
    if (!pollDoc.exists()) {
      throw new Error('Poll not found');
    }

    const pollData = pollDoc.data();
    const options = pollData.options || [];
    if (!pollData.active) throw new Error('This poll is closed.');
    if (!userId) throw new Error('You must be logged in to vote.');
    if (!options[optionIndex]) throw new Error('Invalid poll option.');

    const voteRef = doc(db, 'pollVotes', `${pollId}_${userId}`);
    const existingVote = await getDoc(voteRef);
    if (existingVote.exists()) {
      throw new Error('You have already voted in this poll.');
    }

    await setDoc(voteRef, {
      pollId,
      userId,
      optionIndex,
      votedAt: Timestamp.now(),
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
