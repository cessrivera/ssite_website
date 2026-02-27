import { useState, useEffect } from 'react';
import { getAnnouncements } from '../../services/announcementService';
import { getEvents } from '../../services/eventService';
import { getOfficers } from '../../services/officerService';
import { getPolls } from '../../services/pollService';
import { getMembers } from '../../services/memberService';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';

const Analytics = () => {
  const [stats, setStats] = useState({
    totalAnnouncements: 0,
    publishedAnnouncements: 0,
    draftAnnouncements: 0,
    totalEvents: 0,
    upcomingEvents: 0,
    pastEvents: 0,
    totalMembers: 0,
    activeMembers: 0,
    pendingMembers: 0,
    totalAdmins: 0,
    totalPolls: 0,
    activePolls: 0,
    inactivePolls: 0,
    pollResults: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      // Load all data
      const [announcements, events, officers, polls, members] = await Promise.all([
        getAnnouncements(),
        getEvents(),
        getOfficers(),
        getPolls(),
        getMembers()
      ]);

      // Get users collection for admin and status info
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate statistics
      const publishedAnnouncements = announcements.filter(a => a.status === 'Published').length;
      const draftAnnouncements = announcements.filter(a => a.status === 'Draft').length;

      const today = new Date();
      const upcomingEvents = events.filter(e => new Date(e.date) >= today).length;
      const pastEvents = events.filter(e => new Date(e.date) < today).length;

      const adminUsers = users.filter(u => u.role === 'admin');
      const activeMembers = users.filter(u => u.role !== 'admin' && u.status === 'active').length;
      const pendingMembers = users.filter(u => u.role !== 'admin' && u.status === 'pending').length;
      const memberCollectionCount = members.length;
      const totalMembers = activeMembers + pendingMembers + memberCollectionCount;

      const activePolls = polls.filter(p => p.active).length;
      const inactivePolls = polls.filter(p => !p.active).length;

      // Calculate poll participation stats
      const pollResults = polls.map(p => ({
        question: p.question,
        totalVotes: p.totalVotes || 0,
        totalOptionsCount: p.options?.length || 0,
        active: p.active
      })).sort((a, b) => b.totalVotes - a.totalVotes).slice(0, 5);

      setStats({
        totalAnnouncements: announcements.length,
        publishedAnnouncements,
        draftAnnouncements,
        totalEvents: events.length,
        upcomingEvents,
        pastEvents,
        totalMembers,
        activeMembers,
        pendingMembers,
        totalAdmins: adminUsers.length,
        totalPolls: polls.length,
        activePolls,
        inactivePolls,
        pollResults
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-500 mt-1">System-wide statistics and insights</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Announcements */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-600">Total Announcements</h3>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalAnnouncements}</p>
          <p className="text-xs text-gray-500 mt-2">
            <span className="text-green-600 font-semibold">{stats.publishedAnnouncements}</span> Published, 
            <span className="text-amber-600 font-semibold ml-1">{stats.draftAnnouncements}</span> Draft
          </p>
        </div>

        {/* Events */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-600">Total Events</h3>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalEvents}</p>
          <p className="text-xs text-gray-500 mt-2">
            <span className="text-blue-600 font-semibold">{stats.upcomingEvents}</span> Upcoming,
            <span className="text-gray-600 font-semibold ml-1">{stats.pastEvents}</span> Past
          </p>
        </div>

        {/* Members */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-600">Total Members</h3>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalMembers}</p>
          <p className="text-xs text-gray-500 mt-2">
            <span className="text-green-600 font-semibold">{stats.activeMembers}</span> Active,
            <span className="text-yellow-600 font-semibold ml-1">{stats.pendingMembers}</span> Pending
          </p>
        </div>

        {/* Admins */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-600">Administrators</h3>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalAdmins}</p>
          <p className="text-xs text-gray-500 mt-2">System administrators</p>
        </div>
      </div>

      {/* Polls Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Polls Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Polls Overview</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">Total Polls</span>
                <span className="text-2xl font-bold text-gray-900">{stats.totalPolls}</span>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">Active</span>
                <span className="text-lg font-bold text-green-600">{stats.activePolls}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-green-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${stats.totalPolls > 0 ? (stats.activePolls / stats.totalPolls) * 100 : 0}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">Inactive</span>
                <span className="text-lg font-bold text-gray-600">{stats.inactivePolls}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-gray-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${stats.totalPolls > 0 ? (stats.inactivePolls / stats.totalPolls) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top Polls */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Top Polls by Participation</h3>
          
          {stats.pollResults.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No polls created yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.pollResults.map((poll, index) => (
                <div key={index} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 line-clamp-2">{poll.question}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {poll.totalVotes} votes • {poll.totalOptionsCount} options
                        {poll.active && <span className="ml-2 text-green-600 font-semibold">Active</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">{poll.totalVotes}</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: '100%' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-sm p-6 text-white">
          <h3 className="text-sm font-semibold text-blue-100 mb-2">System Status</h3>
          <p className="text-lg">{stats.totalMembers > 0 ? 'Active' : 'Setting up'}</p>
          <p className="text-xs text-blue-100 mt-3">{stats.totalMembers} registered members</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-2xl shadow-sm p-6 text-white">
          <h3 className="text-sm font-semibold text-green-100 mb-2">Content Published</h3>
          <p className="text-lg">{stats.publishedAnnouncements + stats.totalEvents + (stats.activePolls || 0)}</p>
          <p className="text-xs text-green-100 mt-3">Announcements, Events & Active Polls</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl shadow-sm p-6 text-white">
          <h3 className="text-sm font-semibold text-purple-100 mb-2">Engagement Rate</h3>
          <p className="text-lg">{stats.totalMembers > 0 ? Math.round((stats.activeMembers / stats.totalMembers) * 100) : 0}%</p>
          <p className="text-xs text-purple-100 mt-3">Active member participation</p>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
