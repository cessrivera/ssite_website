import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth, db } from '../../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AdminSettings = () => {
  const { currentUser } = useAuth();
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);

  useEffect(() => {
    loadMaintenanceStatus();
  }, []);

  const loadMaintenanceStatus = async () => {
    try {
      const docRef = doc(db, 'settings', 'maintenance');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setMaintenanceMode(docSnap.data().enabled === true);
      }
    } catch (error) {
      console.error('Error loading maintenance status:', error);
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const toggleMaintenanceMode = async () => {
    setMaintenanceSaving(true);
    try {
      const newValue = !maintenanceMode;
      await setDoc(doc(db, 'settings', 'maintenance'), {
        enabled: newValue,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.email || 'admin'
      });
      setMaintenanceMode(newValue);
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
    } finally {
      setMaintenanceSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setLoading(true);

    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Update password
      await updatePassword(auth.currentUser, passwordData.newPassword);

      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error updating password:', error);
      if (error.code === 'auth/wrong-password') {
        setMessage({ type: 'error', text: 'Current password is incorrect' });
      } else {
        setMessage({ type: 'error', text: 'Error updating password. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600">Manage your admin account and site settings</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Maintenance Mode */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Maintenance Mode</h2>
              <p className="text-sm text-gray-500">Show a maintenance page to visitors while you make updates</p>
            </div>
          </div>

          {maintenanceLoading ? (
            <div className="flex items-center gap-3 py-4">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-500 text-sm">Loading...</span>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${maintenanceMode ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`}></div>
                <span className="font-medium text-gray-700">
                  {maintenanceMode ? 'Maintenance mode is ON' : 'Site is live'}
                </span>
              </div>
              <button
                onClick={toggleMaintenanceMode}
                disabled={maintenanceSaving}
                className={`relative inline-flex h-7 w-12 rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                  maintenanceMode ? 'bg-amber-500' : 'bg-gray-300'
                } ${maintenanceSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out mt-1 ${
                    maintenanceMode ? 'translate-x-6 ml-0.5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}

          {maintenanceMode && (
            <p className="text-amber-600 text-sm mt-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Public users will see a maintenance page. Admin panel remains accessible.
            </p>
          )}
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-bold mb-6">Change Password</h2>

          {message.text && (
            <div className={`p-4 rounded-xl mb-4 ${
              message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Current Password</label>
              <input
                type="password"
                placeholder="Enter current password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
              <input
                type="password"
                placeholder="Enter new password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
              <input
                type="password"
                placeholder="Confirm new password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:from-gray-400 disabled:to-gray-400"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Account Information */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-bold mb-6">Account Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-500 mb-1">Username</label>
              <div className="border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-gray-700">
                {currentUser?.displayName || 'admin.user'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-500 mb-1">Email</label>
              <div className="border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-gray-700">
                {currentUser?.email || 'admin@ssite.edu'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-500 mb-1">Role</label>
              <div className="border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-gray-700">
                Super Admin
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-500 mb-1">Last Login</label>
              <div className="border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-gray-700">
                {formatDate(currentUser?.metadata?.lastSignInTime)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
