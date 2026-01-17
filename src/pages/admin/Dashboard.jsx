import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAnnouncements } from '../../services/announcementService';
import { getEvents } from '../../services/eventService';
import { getOfficers } from '../../services/officerService';
import { getPolls } from '../../services/pollService';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    members: 0,
    announcements: 0,
    events: 0,
    polls: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load counts
      const [announcements, events, officers, polls] = await Promise.all([
        getAnnouncements(),
        getEvents(),
        getOfficers(),
        getPolls()
      ]);

      // Get members count
      const membersSnapshot = await getDocs(collection(db, 'users'));
      
      setStats({
        members: membersSnapshot.size,
        announcements: announcements.length,
        events: events.length,
        polls: polls.filter(p => p.active).length
      });

      // Build recent activity from data
      const activities = [];
      
      // Add recent announcements
      announcements.slice(0, 2).forEach(a => {
        activities.push({
          type: 'announcement',
          message: 'Announcement published',
          detail: a.title,
          time: a.createdAt ? formatTimeAgo(a.createdAt.toDate?.() || new Date(a.createdAt)) : 'Recently',
          icon: '📢'
        });
      });

      // Add recent polls
      polls.slice(0, 1).forEach(p => {
        activities.push({
          type: 'poll',
          message: 'Poll Created',
          detail: p.question,
          time: p.createdAt ? formatTimeAgo(p.createdAt.toDate?.() || new Date(p.createdAt)) : 'Recently',
          icon: '📊'
        });
      });

      setRecentActivity(activities.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  const quickActions = [
    { label: 'Add Announcement', path: '/admin/announcements', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', color: 'from-blue-900 via-blue-800 to-blue-900' },
    { label: 'Add Event', path: '/admin/events', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'from-blue-900 via-blue-800 to-blue-900' },
    { label: 'Add Officer', path: '/admin/officers', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', color: 'from-blue-900 via-blue-800 to-blue-900' },
    { label: 'Create Poll', path: '/admin/polls', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: 'from-blue-900 via-blue-800 to-blue-900' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here's what's happening with SSITE</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/30">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">{loading ? '...' : stats.members}</div>
              <div className="text-gray-500 text-sm font-medium">Total Members</div>
              <div className="text-blue-600 text-xs mt-1">+12 this month</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/30">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">{loading ? '...' : stats.announcements}</div>
              <div className="text-gray-500 text-sm font-medium">Announcements</div>
              <div className="text-blue-600 text-xs mt-1">{stats.announcements} published</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/30">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">{loading ? '...' : stats.events}</div>
              <div className="text-gray-500 text-sm font-medium">Total Events</div>
              <div className="text-blue-600 text-xs mt-1">{stats.events} upcoming</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/30">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">{loading ? '...' : stats.polls}</div>
              <div className="text-gray-500 text-sm font-medium">Active Polls</div>
              <div className="text-blue-600 text-xs mt-1">{stats.polls} ongoing</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.path}
              className={`bg-gradient-to-br ${action.color} text-white rounded-xl p-5 text-center hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group`}
            >
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                </svg>
              </div>
              <span className="font-medium text-sm">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-500">Loading activity...</p>
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-500">No recent activity</p>
            </div>
          ) : (
            recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  activity.type === 'announcement' ? 'bg-emerald-100 text-emerald-600' :
                  activity.type === 'poll' ? 'bg-amber-100 text-amber-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  <span className="text-lg">{activity.icon}</span>
                </div>
                <div className="flex-grow min-w-0">
                  <p className="font-semibold text-gray-900">{activity.message}</p>
                  {activity.detail && (
                    <p className="text-sm text-gray-500 truncate">{activity.detail}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap bg-white px-2 py-1 rounded-lg">{activity.time}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
