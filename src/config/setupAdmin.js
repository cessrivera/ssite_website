// Script to create the first admin user
// Run this ONCE in the browser console after logging in, or use it as a reference

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

const PRIMARY_ADMIN_EMAIL = 'admin@ssite.com';

export const createAdminUser = async (email, password) => {
  try {
    if ((email || '').trim().toLowerCase() !== PRIMARY_ADMIN_EMAIL) {
      return { success: false, error: 'Only admin@ssite.com can be created as admin.' };
    }

    // Create user in Firebase Auth
    const result = await createUserWithEmailAndPassword(auth, PRIMARY_ADMIN_EMAIL, password);
    
    // Create admin user document in Firestore
    await setDoc(doc(db, 'users', result.user.uid), {
      email: PRIMARY_ADMIN_EMAIL,
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
