import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createAdminUser } from '../config/setupAdmin';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const Login = () => {
  const navigate = useNavigate();
  const { login, currentUser, isAdmin } = useAuth();
  const [formData, setFormData] = useState({
    email: 'admin@ssite.com',
    password: 'admin123',
  });
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      // If admin login, check/create admin document in Firestore
      if (isAdminLogin) {
        try {
          const userRef = doc(db, 'users', result.user.uid);
          const userDoc = await getDoc(userRef);
          
          // If no user document exists, create it with admin role
          if (!userDoc.exists()) {
            await setDoc(userRef, {
              email: formData.email,
              role: 'admin',
              name: 'Admin User',
              createdAt: new Date().toISOString(),
              status: 'active'
            });
            console.log('Admin document created in Firestore');
          } else if (userDoc.data().role !== 'admin') {
            // User exists but is not admin
            setError('This account does not have admin privileges.');
            setLoading(false);
            return;
          }
          
          // Redirect to admin dashboard
          window.location.href = '/admin';
        } catch (err) {
          console.error('Error checking admin status:', err);
          setError('Error verifying admin status. Please try again.');
          setLoading(false);
        }
      } else {
        // Regular member login
        navigate('/');
      }
    } else {
      setError(result.error || 'Failed to login. Please check your credentials.');
      setLoading(false);
    }
  };



  // If already logged in as admin, redirect
  if (currentUser && isAdmin) {
    navigate('/admin');
    return null;
  }

  return (
    <div className="py-12 bg-gray-50 min-h-screen flex items-center">
      <div className="max-w-md mx-auto px-4 w-full">
        {isAdminLogin ? (
          // Admin Login Form
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-900 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
              <p className="text-gray-500 mt-1">SSITE Dashboard Access</p>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-3 text-sm">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@ssite.edu"
                  required
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-900 to-blue-700 text-white py-3.5 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:from-gray-400 disabled:to-gray-400 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Authenticating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Sign In
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsAdminLogin(false)}
                className="w-full border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Member Login
              </button>
            </form>

            {/* Admin Access Only Notice */}
            <div className="mt-6 bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-semibold text-amber-800 text-sm">Admin Access Only</p>
                  <p className="text-xs text-amber-700 mt-1">
                    This area is restricted to authorized administrators.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Member Login
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-900 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
              <p className="text-gray-500 mt-1">Sign in to your SSITE account</p>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-3 text-sm">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.name@ua.edu.ph"
                  required
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-900 to-blue-700 text-white py-3.5 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:from-gray-400 disabled:to-gray-400 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Sign In
                  </>
                )}
              </button>

              <p className="text-center">
                <Link to="/forgot-password" className="text-blue-600 text-sm font-medium hover:underline">
                  Forgot Password?
                </Link>
              </p>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-gray-600">
                Don't have an account?{' '}
                <Link to="/membership" className="text-blue-600 font-semibold hover:underline">
                  Register here
                </Link>
              </p>
            </div>

            {/* Admin Login Button */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <button
                onClick={() => setIsAdminLogin(true)}
                className="w-full border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Admin Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
