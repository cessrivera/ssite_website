import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

const AdminMaintenance = () => {
  const { currentUser } = useAuth();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusText, setStatusText] = useState('');

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const snapshot = await getDoc(doc(db, 'settings', 'maintenance'));
        if (snapshot.exists()) {
          setMaintenanceMode(snapshot.data().enabled === true);
        }
      } catch (error) {
        console.error('Error loading maintenance status:', error);
        setStatusText('Failed to load maintenance status.');
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
  }, []);

  const handleToggle = async () => {
    setSaving(true);
    setStatusText('');
    try {
      const nextValue = !maintenanceMode;
      await setDoc(
        doc(db, 'settings', 'maintenance'),
        {
          enabled: nextValue,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser?.email || 'admin',
        },
        { merge: true }
      );
      setMaintenanceMode(nextValue);
      setStatusText(nextValue ? 'Maintenance mode enabled.' : 'Maintenance mode disabled.');
    } catch (error) {
      console.error('Error updating maintenance mode:', error);
      setStatusText('Failed to update maintenance mode.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Maintenance</h1>
        <p className="text-gray-600">Temporarily show a maintenance page to public users.</p>
      </div>

      <div className="max-w-2xl bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        {loading ? (
          <div className="flex items-center gap-3 py-4">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-500 text-sm">Loading maintenance status...</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${maintenanceMode ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`}></div>
                <p className="font-medium text-gray-700">
                  {maintenanceMode ? 'Maintenance is ON' : 'Site is LIVE'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggle}
                disabled={saving}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  maintenanceMode
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                } ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {saving
                  ? 'Saving...'
                  : maintenanceMode
                    ? 'Turn OFF Maintenance'
                    : 'Turn ON Maintenance'}
              </button>
            </div>

            <p className="text-sm text-gray-500 mt-4">
              When enabled, public pages are replaced with a maintenance screen. Admin routes remain accessible.
            </p>

            {statusText && (
              <p className="text-sm mt-3 text-blue-700">{statusText}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminMaintenance;
