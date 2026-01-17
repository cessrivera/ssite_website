import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import { AdminRoute } from './components/auth/ProtectedRoute';
import AdminLayout from './components/admin/AdminLayout';

import Home from './pages/Home';
import Announcements from './pages/Announcements';
import Events from './pages/Events';
import Officers from './pages/Officers';
import Polls from './pages/Polls';
import Contact from './pages/Contact';
import Membership from './pages/Membership';
import Login from './pages/Login';

import AdminDashboard from './pages/admin/Dashboard';
import AdminAnnouncements from './pages/admin/Announcements';
import AdminEvents from './pages/admin/Events';
import AdminOfficers from './pages/admin/Officers';
import AdminPolls from './pages/admin/Polls';
import AdminMembers from './pages/admin/Members';
import AdminMessages from './pages/admin/Messages';
import AdminSettings from './pages/admin/Settings';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout><Home /></Layout>} />
          <Route path="/announcements" element={<Layout><Announcements /></Layout>} />
          <Route path="/events" element={<Layout><Events /></Layout>} />
          <Route path="/officers" element={<Layout><Officers /></Layout>} />
          <Route path="/polls" element={<Layout><Polls /></Layout>} />
          <Route path="/contact" element={<Layout><Contact /></Layout>} />
          <Route path="/membership" element={<Layout><Membership /></Layout>} />
          <Route path="/login" element={<Layout><Login /></Layout>} />

          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="events" element={<AdminEvents />} />
            <Route path="officers" element={<AdminOfficers />} />
            <Route path="polls" element={<AdminPolls />} />
            <Route path="members" element={<AdminMembers />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
