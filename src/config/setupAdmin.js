// Script to create the first admin user
// Run this ONCE in the browser console after logging in, or use it as a reference

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export const createAdminUser = async (email, password) => {
  try {
    // Create user in Firebase Auth
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create admin user document in Firestore
    await setDoc(doc(db, 'users', result.user.uid), {
      email: email,
      role: 'admin',
      name: 'Admin User',
      createdAt: new Date().toISOString(),
      status: 'active'
    });
    
    console.log('Admin user created successfully!');
    return { success: true, user: result.user };
  } catch (error) {
    console.error('Error creating admin:', error);
    return { success: false, error: error.message };
  }
};

// Example usage:
// createAdminUser('admin@ssite.com', 'YourSecurePassword123');
