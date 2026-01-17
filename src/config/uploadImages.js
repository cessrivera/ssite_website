// Script to upload officer images to Firebase Storage and get public URLs
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

// Upload a single image file to Firebase Storage
export const uploadOfficerImage = async (file, filename) => {
  try {
    const storageRef = ref(storage, `officers/${filename}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return { success: true, url: downloadURL };
  } catch (error) {
    console.error('Error uploading image:', error);
    return { success: false, error: error.message };
  }
};

// Get the download URL for an existing image
export const getOfficerImageURL = async (filename) => {
  try {
    const storageRef = ref(storage, `officers/${filename}`);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (error) {
    console.error('Error getting image URL:', error);
    return null;
  }
};
