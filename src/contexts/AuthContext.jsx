import { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin' or 'member'
  const [userData, setUserData] = useState(null); // Full user data from Firestore
  const [loading, setLoading] = useState(true);

  // Sign in with email and password
  const login = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Sign out
  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserRole(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Register new member
  const register = async (email, password, userData) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', result.user.uid), {
        email: email,
        role: 'member', // Default role
        ...userData,
        createdAt: new Date().toISOString(),
        status: 'pending' // Pending approval
      });
      
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Fetch user data from Firestore
  const fetchUserData = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData(data);
        return data.role || 'member';
      }
      setUserData(null);
      return 'member';
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUserData(null);
      return 'member';
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        const role = await fetchUserData(user.uid);
        setUserRole(role);
      } else {
        setUserRole(null);
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    userData,
    isAdmin: userRole === 'admin',
    isMember: userRole === 'member',
    isAuthenticated: !!currentUser,
    loading,
    login,
    logout,
    register
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
