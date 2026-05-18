import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, userData, loading } = useAuth();
  const hasScopedAccess = Array.isArray(userData?.permissions) && userData.permissions.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin && !hasScopedAccess) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export const PermissionRoute = ({ permission, adminOnly = false, children }) => {
  const { isAdmin, userData } = useAuth();
  const permissions = Array.isArray(userData?.permissions) ? userData.permissions : [];

  if (isAdmin) return children;
  if (!adminOnly && permission && permissions.includes(permission)) return children;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
      <h1 className="text-2xl font-bold text-gray-900">No Access</h1>
      <p className="text-gray-500 mt-2">Your assigned role does not include this page.</p>
    </div>
  );
};

export const AdminIndexRoute = ({ children }) => {
  const { isAdmin, userData } = useAuth();
  const permissions = Array.isArray(userData?.permissions) ? userData.permissions : [];
  const firstAllowedPage = [
    { permission: 'announcements', path: '/admin/announcements' },
    { permission: 'events', path: '/admin/events' },
    { permission: 'officers', path: '/admin/officers' },
    { permission: 'polls', path: '/admin/polls' }
  ].find((page) => permissions.includes(page.permission));

  if (isAdmin) return children;
  if (firstAllowedPage) return <Navigate to={firstAllowedPage.path} replace />;

  return <Navigate to="/" replace />;
};

export default ProtectedRoute;
