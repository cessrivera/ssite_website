import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import { AdminRoute } from './components/auth/ProtectedRoute';
import AdminLayout from './components/admin/AdminLayout';
import MaintenanceGate from './components/common/MaintenanceGate';

import Home from './pages/Home';
import Announcements from './pages/Announcements';
import Events from './pages/Events';
import Officers from './pages/Officers';
import Polls from './pages/Polls';
import Contact from './pages/Contact';
import Membership from './pages/Membership';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';

import AdminDashboard from './pages/admin/Dashboard';
import AdminAnnouncements from './pages/admin/Announcements';
import AdminEvents from './pages/admin/Events';
import AdminOfficers from './pages/admin/Officers';
import AdminPolls from './pages/admin/Polls';
import AdminMembers from './pages/admin/Members';
import AdminMessages from './pages/admin/Messages';
import AdminSettings from './pages/admin/Settings';
import AdminAnalytics from './pages/admin/Analytics';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes - wrapped in MaintenanceGate */}
          <Route path="/" element={<MaintenanceGate><Layout><Home /></Layout></MaintenanceGate>} />
          <Route path="/announcements" element={<MaintenanceGate><Layout><Announcements /></Layout></MaintenanceGate>} />
          <Route path="/events" element={<MaintenanceGate><Layout><Events /></Layout></MaintenanceGate>} />
          <Route path="/officers" element={<MaintenanceGate><Layout><Officers /></Layout></MaintenanceGate>} />
          <Route path="/polls" element={<MaintenanceGate><Layout><Polls /></Layout></MaintenanceGate>} />
          <Route path="/contact" element={<MaintenanceGate><Layout><Contact /></Layout></MaintenanceGate>} />
          <Route path="/membership" element={<MaintenanceGate><Layout><Membership /></Layout></MaintenanceGate>} />
          <Route path="/login" element={<Layout><Login /></Layout>} />
          <Route path="/admin-login" element={<Layout><Login defaultAdminLogin={true} /></Layout>} />
          <Route path="/forgot-password" element={<Layout><ForgotPassword /></Layout>} />

          {/* Admin Routes - never blocked by maintenance */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="events" element={<AdminEvents />} />
            <Route path="officers" element={<AdminOfficers />} />
            <Route path="polls" element={<AdminPolls />} />
            <Route path="members" element={<AdminMembers />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="analytics" element={<AdminAnalytics />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
