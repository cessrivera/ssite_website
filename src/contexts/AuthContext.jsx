import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  deleteUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext();
const PRIMARY_ADMIN_EMAIL = 'pderivera.student@ua.edu.ph';
const normalizeEmail = (email = '') => email.trim().toLowerCase();
const MEMBER_TERM_YEARS = 5;

const toDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const addYears = (date, years) => {
  if (!date) return null;
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
};

const resolveTermDates = (data = {}) => {
  const termStart = toDateValue(data.termStartAt) || toDateValue(data.createdAt) || new Date();
  const termEnd = toDateValue(data.termEndAt) || addYears(termStart, MEMBER_TERM_YEARS);
  return {
    termStartAt: termStart,
    termEndAt: termEnd
  };
};

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
  const registerInFlight = useRef(false);

  const login = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Fetch user data to check approval status
      const userRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const { termStartAt, termEndAt } = resolveTermDates(userData);
        const termEndIso = termEndAt?.toISOString();

        if (termEndIso && !userData.termEndAt) {
          await updateDoc(userRef, {
            termStartAt: termStartAt?.toISOString(),
            termEndAt: termEndIso,
            termYears: MEMBER_TERM_YEARS,
            updatedAt: new Date().toISOString()
          });
        }

        const termExpired = termEndAt ? termEndAt.getTime() <= Date.now() : false;

        // If user is pending approval, sign them out and return error
        if (userData.status === 'pending') {
          await signOut(auth);
          return { 
            success: false, 
            error: 'Your account is pending admin approval. Please wait for confirmation.' 
          };
        }
        // If user is archived/inactive, prevent login
        if (userData.status === 'inactive' || userData.status === 'archived') {
          await signOut(auth);
          return { 
            success: false, 
            error: 'Your account has been deactivated. Please contact an administrator.' 
          };
        }

        if (termExpired) {
          await updateDoc(userRef, {
            status: 'inactive',
            termEndAt: termEndIso,
            updatedAt: new Date().toISOString()
          });
          await signOut(auth);
          return {
            success: false,
            error: 'Your membership term has expired. Please contact an administrator.'
          };
        }
      }
      
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

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

  const register = async (email, password, userData) => {
    if (registerInFlight.current) {
      return { success: false, error: 'Registration already in progress. Please wait.' };
    }

    registerInFlight.current = true;
    let createdUser = null;

    try {
      const normalizedEmail = normalizeEmail(email);
      const trimmedStudentId = (userData?.studentId || '').trim();
      const trimmedName = (userData?.name || '').trim();
      const trimmedYear = (userData?.year || '').trim();
      const trimmedCourse = (userData?.course || 'BSIT').trim();
      const termStartAt = new Date();
      const termEndAt = addYears(termStartAt, MEMBER_TERM_YEARS);

      if (!normalizedEmail) {
        return { success: false, error: 'Email is required.' };
      }

      const result = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      createdUser = result.user;

      const batch = writeBatch(db);
      const createdAt = new Date().toISOString();
      const termStartAtIso = termStartAt.toISOString();
      const termEndAtIso = termEndAt?.toISOString();

      batch.set(doc(db, 'users', result.user.uid), {
        email: normalizedEmail,
        emailNormalized: normalizedEmail,
        role: 'member',
        name: trimmedName,
        studentId: trimmedStudentId,
        year: trimmedYear,
        course: trimmedCourse,
        termStartAt: termStartAtIso,
        termEndAt: termEndAtIso,
        termYears: MEMBER_TERM_YEARS,
        createdAt,
        status: 'pending'
      });

      batch.set(doc(db, 'members', result.user.uid), {
        userId: result.user.uid,
        studentId: trimmedStudentId,
        name: trimmedName,
        year: trimmedYear,
        course: trimmedCourse,
        email: normalizedEmail,
        emailNormalized: normalizedEmail,
        role: 'member',
        status: 'pending',
        archived: false,
        termStartAt: termStartAtIso,
        termEndAt: termEndAtIso,
        termYears: MEMBER_TERM_YEARS,
        createdAt,
        updatedAt: createdAt
      });

      if (trimmedStudentId) {
        batch.set(doc(db, 'memberStudentIds', trimmedStudentId), {
          userId: result.user.uid,
          email: normalizedEmail,
          emailNormalized: normalizedEmail,
          createdAt
        });
      }

      await batch.commit();

      // Sign out immediately — pending users must not access the app
      await signOut(auth);

      return { success: true, user: result.user };
    } catch (error) {
      if (createdUser && auth.currentUser?.uid === createdUser.uid) {
        try {
          await deleteUser(createdUser);
        } catch (cleanupError) {
          console.error('Failed to clean up auth user after registration error:', cleanupError);
        }
      }

      if (error?.code === 'auth/email-already-in-use') {
        return { success: false, error: 'Email already registered. Please log in or use a different email.' };
      }

      if (error?.code === 'permission-denied') {
        return { success: false, error: 'Student number already registered. Please contact an administrator.' };
      }

      return { success: false, error: error.message };
    } finally {
      registerInFlight.current = false;
    }
  };

  const fetchUserData = async (uid, authEmail = '') => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData(data);
        const role = data.role || 'member';
        const email = normalizeEmail(data.email || authEmail);

        if (role === 'admin' && email !== PRIMARY_ADMIN_EMAIL) {
          return 'member';
        }

        return role;
      }
      setUserData(null);
      return 'member';
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUserData(null);
      return 'member';
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        const role = await fetchUserData(user.uid, user.email || '');
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
