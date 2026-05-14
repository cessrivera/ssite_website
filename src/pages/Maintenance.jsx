import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, getDocs, query, setDoc, where, writeBatch, collection } from 'firebase/firestore';
import { db } from '../config/firebase';

const PRIMARY_ADMIN_EMAIL = 'pderivera.student@ua.edu.ph';
const normalizeEmail = (email = '') => email.trim().toLowerCase();

const Maintenance = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      try {
        const userRef = doc(db, 'users', result.user.uid);
        const userDoc = await getDoc(userRef);
        const adminData = {
          email: PRIMARY_ADMIN_EMAIL,
          role: 'admin',
          name: 'Admin User',
          status: 'active',
          updatedAt: new Date().toISOString()
        };
        
        if (!userDoc.exists()) {
          await setDoc(userRef, {
            ...adminData,
            createdAt: new Date().toISOString()
          });
        } else {
          await setDoc(userRef, adminData, { merge: true });
        }

        const adminsQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
        const adminsSnapshot = await getDocs(adminsQuery);
        const batch = writeBatch(db);
        let hasDemotions = false;

        adminsSnapshot.forEach((adminDoc) => {
          const data = adminDoc.data();
          const adminEmail = normalizeEmail(data.email);
          if (adminEmail !== PRIMARY_ADMIN_EMAIL) {
            batch.update(adminDoc.ref, {
              role: 'member',
              updatedAt: new Date().toISOString()
            });
            hasDemotions = true;
          }
        });

        if (hasDemotions) {
          await batch.commit();
        }
        
        window.location.href = '/admin';
      } catch (err) {
        console.error('Error verifying admin status:', err);
        setError('Error verifying admin status. Please try again.');
        setLoading(false);
      }
    } else {
      setError(result.error || 'Failed to login. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
      {/* Admin Login Button - Top Right */}
      <button
        onClick={() => setShowLoginModal(true)}
        className="absolute top-6 right-6 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition-colors font-medium text-sm"
      >
        Admin Login
      </button>

      {/* Admin Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Admin Login</h2>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setEmail('');
                  setPassword('');
                  setError('');
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="Enter your email"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="Enter your password"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-lg w-full text-center">
        {/* Gear Icon Animation */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          <svg className="w-32 h-32 text-white/20 animate-spin" style={{ animationDuration: '8s' }} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97s-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1s.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64L19.43 12.97z"/>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-12 h-12 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>

        {/* Main Content */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          We're Under Maintenance
        </h1>
        <p className="text-blue-200 text-lg mb-8 leading-relaxed">
          We're making some improvements to serve you better.
          Please check back shortly!
        </p>

        {/* Info Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="text-yellow-400 font-semibold text-sm uppercase tracking-wide">System Update in Progress</span>
          </div>
          <p className="text-blue-100 text-sm">
            Our team is working to bring you new features and improvements.
            We apologize for any inconvenience.
          </p>
        </div>

        {/* SSITE Branding */}
        <div className="mt-12 text-blue-300/60 text-sm">
          <p className="font-semibold">SSITE</p>
          <p>Student Society on Information Technology Education</p>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
