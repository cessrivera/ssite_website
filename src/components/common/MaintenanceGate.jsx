import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Maintenance from '../../pages/Maintenance';

const MaintenanceGate = ({ children }) => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'settings', 'maintenance'),
      (docSnap) => {
        if (docSnap.exists()) {
          setMaintenanceMode(docSnap.data().enabled === true);
        } else {
          setMaintenanceMode(false);
        }
        setLoading(false);
      },
      () => {
        // If document doesn't exist or permission error, assume not in maintenance
        setMaintenanceMode(false);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Admins bypass maintenance mode
  if (maintenanceMode && !isAdmin) {
    return <Maintenance />;
  }

  return children;
};

export default MaintenanceGate;
