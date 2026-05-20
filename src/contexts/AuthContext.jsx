import { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext();
const PRIMARY_ADMIN_EMAIL = 'pderivera.student@ua.edu.ph';
const normalizeEmail = (email = '') => email.trim().toLowerCase();
const MEMBER_TERM_YEARS = 5;
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

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

const isInactiveMember = (data = {}) => data.status === 'inactive' || data.status === 'archived';

const findManagedMemberByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const [usersSnapshot, membersSnapshot] = await Promise.all([
    getDocs(query(collection(db, 'users'), where('emailNormalized', '==', normalizedEmail))),
    getDocs(query(collection(db, 'members'), where('emailNormalized', '==', normalizedEmail)))
  ]);

  const records = [
    ...usersSnapshot.docs.map((record) => ({ id: record.id, ...record.data() })),
    ...membersSnapshot.docs.map((record) => ({ id: record.id, ...record.data() }))
  ];

  return records.find((record) => !isInactiveMember(record)) || records[0] || null;
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

        if (userData.status === 'pending') {
          await updateDoc(userRef, {
            status: 'active',
            updatedAt: new Date().toISOString()
          });
        }

        if (isInactiveMember(userData)) {
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

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const normalizedEmail = normalizeEmail(result.user.email || '');
      const userRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userRef);
      let resolvedUserData = userDoc.exists() ? userDoc.data() : null;

      if (!resolvedUserData) {
        const managedMember = await findManagedMemberByEmail(normalizedEmail);

        if (!managedMember) {
          await signOut(auth);
          return {
            success: false,
            error: 'This Google account is not on the member list yet. Please contact an administrator.'
          };
        }

        if (isInactiveMember(managedMember)) {
          await signOut(auth);
          return {
            success: false,
            error: 'Your account has been deactivated. Please contact an administrator.'
          };
        }

        const { termStartAt, termEndAt } = resolveTermDates(managedMember);
        const createdAt = managedMember.createdAt || new Date().toISOString();
        resolvedUserData = {
          email: normalizedEmail,
          emailNormalized: normalizedEmail,
          role: 'member',
          name: managedMember.name || managedMember.fullName || result.user.displayName || '',
          fullName: managedMember.fullName || managedMember.name || result.user.displayName || '',
          studentId: managedMember.studentId || '',
          year: managedMember.year || '',
          course: managedMember.course || 'BSIT',
          status: 'active',
          authProvider: 'google',
          permissions: managedMember.permissions || [],
          permissionRole: managedMember.permissionRole || '',
          permissionRoleLabel: managedMember.permissionRoleLabel || '',
          termStartAt: termStartAt?.toISOString(),
          termEndAt: termEndAt?.toISOString(),
          termYears: managedMember.termYears || MEMBER_TERM_YEARS,
          createdAt,
          updatedAt: new Date().toISOString()
        };

        await setDoc(userRef, resolvedUserData, { merge: true });
      }

      if (resolvedUserData.status === 'pending') {
        resolvedUserData = { ...resolvedUserData, status: 'active' };
        await setDoc(userRef, {
          status: 'active',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      if (isInactiveMember(resolvedUserData)) {
        await signOut(auth);
        return {
          success: false,
          error: 'Your account has been deactivated. Please contact an administrator.'
        };
      }

      const { termStartAt, termEndAt } = resolveTermDates(resolvedUserData);
      const termExpired = termEndAt ? termEndAt.getTime() <= Date.now() : false;

      if (termExpired) {
        await setDoc(userRef, {
          status: 'inactive',
          termStartAt: termStartAt?.toISOString(),
          termEndAt: termEndAt?.toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
        await signOut(auth);
        return {
          success: false,
          error: 'Your membership term has expired. Please contact an administrator.'
        };
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
    loginWithGoogle
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
