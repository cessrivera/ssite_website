import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { getAnnouncements } from '../../services/announcementService';
import { getEvents } from '../../services/eventService';
import { getOfficers } from '../../services/officerService';
import { getPolls } from '../../services/pollService';
import { getMembers } from '../../services/memberService';
import { getMessages } from '../../services/messageService';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

const COLORS = {
  blue: '#1d4ed8',
  lightBlue: '#3b82f6',
  sky: '#60a5fa',
  green: '#16a34a',
  lightGreen: '#4ade80',
  amber: '#d97706',
  yellow: '#fbbf24',
  purple: '#7c3aed',
  indigo: '#4f46e5',
  red: '#dc2626',
  gray: '#6b7280',
  lightGray: '#d1d5db',
  emerald: '#059669',
  teal: '#0d9488',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
        {label && <p className="font-semibold text-gray-700 mb-1">{label}</p>}
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-medium">
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Analytics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAnalytics(); }, []);

  const loadAnalytics = async () => {
    try {
      const [announcements, events, officers, polls, members, messages] = await Promise.all([
        getAnnouncements(), getEvents(), getOfficers(), getPolls(), getMembers(), getMessages()
      ]);

      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const registrationsSnapshot = await getDocs(collection(db, 'eventRegistrations'));
      const totalRegistrations = registrationsSnapshot.size;

      // Announcements
      const publishedAnn = announcements.filter(a => a.status === 'Published' && !a.archived).length;
      const draftAnn = announcements.filter(a => a.status === 'Draft' && !a.archived).length;
      const archivedAnn = announcements.filter(a => a.archived).length;

      // Events
      const today = new Date();
      const activeEvents = events.filter(e => !e.archived);
      const upcomingEvents = activeEvents.filter(e => new Date(e.date) >= today).length;
      const pastEvents = activeEvents.filter(e => new Date(e.date) < today).length;
      const archivedEvents = events.filter(e => e.archived).length;

      // Members
      const adminUsers = users.filter(u => u.role === 'admin');
      const activeMembers = users.filter(u => u.role !== 'admin' && u.status === 'active').length;
      const pendingMembers = users.filter(u => u.role !== 'admin' && u.status === 'pending').length;
      const totalMembers = activeMembers + pendingMembers + members.length;

      // Polls
      const activePolls = polls.filter(p => p.active).length;
      const inactivePolls = polls.filter(p => !p.active).length;
      const totalVotes = polls.reduce((sum, p) => sum + (p.totalVotes || 0), 0);
      const pollResults = polls
        .map(p => ({ question: p.question, totalVotes: p.totalVotes || 0, options: p.options || [], active: p.active }))
        .sort((a, b) => b.totalVotes - a.totalVotes)
        .slice(0, 6);

      // Messages
      const unreadMessages = messages.filter(m => m.status === 'unread').length;
      const repliedMessages = messages.filter(m => m.status === 'replied').length;
      const readMessages = messages.filter(m => m.status === 'read').length;

      // Officers by term
      const termMap = {};
      officers.forEach(o => {
        const term = o.term || 'Unknown';
        termMap[term] = (termMap[term] || 0) + 1;
      });
      const officersByTerm = Object.entries(termMap)
        .map(([term, count]) => ({ term, count }))
        .sort((a, b) => b.term.localeCompare(a.term))
        .slice(0, 6);

      // Content overview for bar chart
      const contentOverview = [
        { name: 'Announcements', total: announcements.length, active: publishedAnn, inactive: draftAnn + archivedAnn },
        { name: 'Events', total: events.length, active: upcomingEvents, inactive: pastEvents + archivedEvents },
        { name: 'Polls', total: polls.length, active: activePolls, inactive: inactivePolls },
        { name: 'Messages', total: messages.length, active: repliedMessages, inactive: unreadMessages },
        { name: 'Officers', total: officers.length, active: officers.length, inactive: 0 },
      ];

      setStats({
        totalAnnouncements: announcements.length,
        publishedAnn, draftAnn, archivedAnn,
        totalEvents: events.length,
        upcomingEvents, pastEvents, archivedEvents,
        totalMembers, activeMembers, pendingMembers,
        totalAdmins: adminUsers.length,
        totalPolls: polls.length,
        activePolls, inactivePolls, totalVotes,
        pollResults,
        totalMessages: messages.length,
        unreadMessages, repliedMessages, readMessages,
        totalOfficers: officers.length,
        officersByTerm,
        totalRegistrations,
        contentOverview,
        // Chart data
        announcementsBreakdown: [
          { name: 'Published', value: publishedAnn },
          { name: 'Draft', value: draftAnn },
          { name: 'Archived', value: archivedAnn },
        ],
        eventsBreakdown: [
          { name: 'Upcoming', value: upcomingEvents },
          { name: 'Past', value: pastEvents },
          { name: 'Archived', value: archivedEvents },
        ],
        membersBreakdown: [
          { name: 'Active', value: activeMembers },
          { name: 'Pending', value: pendingMembers },
        ],
        messagesBreakdown: [
          { name: 'Unread', value: unreadMessages },
          { name: 'Replied', value: repliedMessages },
          { name: 'Read', value: readMessages },
        ],
        pollsBreakdown: [
          { name: 'Active', value: activePolls },
          { name: 'Closed', value: inactivePolls },
        ],
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">System-wide statistics and insights</p>
      </div>

      {/* Content Overview Bar Chart + Members Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Content Overview — clustered bar */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Content Overview</h3>
          <p className="text-sm text-gray-500 mb-5">Active vs inactive content across all categories</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.contentOverview} barCategoryGap="30%" barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="active" name="Active" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
              <Bar dataKey="inactive" name="Inactive / Archived" fill={COLORS.sky} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Members Donut */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Member Status</h3>
          <p className="text-sm text-gray-500 mb-4">Active vs pending members</p>
          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stats.membersBreakdown}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {stats.membersBreakdown.map((_, i) => (
                    <Cell key={i} fill={[COLORS.blue, COLORS.sky][i % 2]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center mt-2">
            <p className="text-2xl font-bold text-gray-900">{stats.totalMembers}</p>
            <p className="text-sm text-gray-500">Total members</p>
          </div>
        </div>
      </div>

      {/* Events Breakdown + Messages Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Events Area/Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Events Breakdown</h3>
          <p className="text-sm text-gray-500 mb-5">Upcoming, past, and archived events</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.eventsBreakdown} barCategoryGap="40%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Events" radius={[6, 6, 0, 0]}>
                {stats.eventsBreakdown.map((_, i) => (
                  <Cell key={i} fill={[COLORS.indigo, COLORS.lightBlue, COLORS.lightGray][i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Messages Donut */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Messages Breakdown</h3>
          <p className="text-sm text-gray-500 mb-4">Unread, replied, and read messages</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={stats.messagesBreakdown}
                cx="50%" cy="50%"
                innerRadius={55} outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {stats.messagesBreakdown.map((_, i) => (
                  <Cell key={i} fill={[COLORS.red, COLORS.green, COLORS.gray][i]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Polls Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Polls active/closed donut */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center">
          <h3 className="text-lg font-bold text-gray-900 mb-1 self-start">Poll Status</h3>
          <p className="text-sm text-gray-500 mb-4 self-start">Active vs closed polls</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={stats.pollsBreakdown}
                cx="50%" cy="50%"
                innerRadius={55} outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {stats.pollsBreakdown.map((_, i) => (
                  <Cell key={i} fill={[COLORS.amber, COLORS.lightGray][i]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalVotes}</p>
          <p className="text-sm text-gray-500">total votes</p>
        </div>

        {/* Top Polls by Votes — horizontal bars */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Top Polls by Participation</h3>
          <p className="text-sm text-gray-500 mb-5">Polls ranked by total votes received</p>
          {stats.pollResults.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-gray-400">No polls created yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.pollResults.map((poll, i) => {
                const maxVotes = Math.max(...stats.pollResults.map(p => p.totalVotes), 1);
                const pct = Math.round((poll.totalVotes / maxVotes) * 100);
                return (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-700 font-medium truncate max-w-xs">{poll.question}</span>
                      <span className="text-sm font-bold text-blue-700 ml-2 whitespace-nowrap">{poll.totalVotes} votes</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${COLORS.blue}, ${COLORS.sky})`
                        }}
                      />
                    </div>
                    {poll.options.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {poll.options.slice(0, 3).map((opt, j) => {
                          const optPct = poll.totalVotes > 0 ? Math.round(((opt.votes || 0) / poll.totalVotes) * 100) : 0;
                          return (
                            <span key={j} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                              {opt.text}: {optPct}%
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Officers by Term */}
      {stats.officersByTerm.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Officers by Term</h3>
          <p className="text-sm text-gray-500 mb-5">Number of officers per academic term</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.officersByTerm} barCategoryGap="40%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="term" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Officers" fill={COLORS.teal} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Announcements Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Announcements Status</h3>
          <p className="text-sm text-gray-500 mb-5">Published, draft, and archived counts</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.announcementsBreakdown} barCategoryGap="45%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]}>
                {stats.announcementsBreakdown.map((_, i) => (
                  <Cell key={i} fill={[COLORS.green, COLORS.amber, COLORS.lightGray][i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary gradient cards */}
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 text-white">
            <p className="text-blue-200 text-sm font-semibold">Content Published</p>
            <p className="text-4xl font-bold mt-1">{stats.publishedAnn + stats.totalEvents + stats.activePolls}</p>
            <p className="text-blue-200 text-xs mt-2">Announcements, events & active polls</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-5 text-white">
            <p className="text-emerald-200 text-sm font-semibold">Engagement Rate</p>
            <p className="text-4xl font-bold mt-1">
              {stats.totalMembers > 0 ? Math.round((stats.activeMembers / stats.totalMembers) * 100) : 0}%
            </p>
            <p className="text-emerald-200 text-xs mt-2">Active member participation</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
