import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getAnnouncements } from '../services/announcementService';

const Home = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const data = await getAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  // Quick access items based on wireframe
  const quickAccess = [
    { icon: '📢', label: 'Announcements', sublabel: 'Latest Updates', path: '/announcements', color: 'from-blue-500 to-blue-600' },
    { icon: '📅', label: 'Events', sublabel: 'Upcoming Activities', path: '/events', color: 'from-purple-500 to-purple-600' },
    { icon: '👥', label: 'Officers', sublabel: 'Meet the Team', path: '/officers', color: 'from-emerald-500 to-emerald-600' },
    { icon: '📊', label: 'Polls', sublabel: 'Vote Now', path: '/polls', color: 'from-amber-500 to-amber-600' },
    { icon: '🎓', label: 'Membership', sublabel: 'Sign Up', path: '/membership', color: 'from-rose-500 to-rose-600' },
  ];

  // Get latest announcements and featured announcement
  const latestAnnouncements = announcements.slice(0, 3);
  const featuredAnnouncement = announcements.length > 0 ? announcements[0] : null;

  return (
    <div className="bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white overflow-hidden">
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Build Your <span className="text-yellow-400">Future</span>
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-10 leading-relaxed">
              Empowering students through technology, innovation, and community. 
              Join SSITE and be part of the next generation of IT leaders.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/membership"
                className="bg-yellow-400 text-blue-900 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-yellow-300 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Join SSITE Today
              </Link>
              <Link
                to="/announcements"
                className="bg-white/10 backdrop-blur text-white border-2 border-white/30 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-200"
              >
                View Announcements
              </Link>
            </div>
          </div>
        </div>
        
        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#f9fafb"/>
          </svg>
        </div>
      </section>

      {/* Quick Access Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Quick Access</h2>
            <p className="text-gray-600">Everything you need, just one click away</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {quickAccess.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-transparent transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center text-2xl mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {item.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{item.label}</h3>
                <p className="text-sm text-gray-500">{item.sublabel}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Announcement */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Featured Announcement</h2>
              <p className="text-gray-600">Stay updated with our latest news</p>
            </div>
            <Link to="/announcements" className="hidden sm:flex items-center gap-2 text-blue-900 font-medium hover:text-blue-700 transition-colors">
              View All
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          
          {featuredAnnouncement ? (
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="grid md:grid-cols-2 gap-0">
                {/* Image */}
                <div className="h-64 md:h-auto bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center relative overflow-hidden">
                  {featuredAnnouncement.imageUrl ? (
                    <img 
                      src={featuredAnnouncement.imageUrl} 
                      alt={featuredAnnouncement.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      <div className="absolute inset-0 opacity-20">
                        <div className="absolute inset-0" style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.4' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
                        }}></div>
                      </div>
                      <span className="text-white text-6xl opacity-50">📢</span>
                    </>
                  )}
                </div>
                
                {/* Content */}
                <div className="p-8 md:p-10 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      featuredAnnouncement.category === 'Academic' ? 'bg-blue-100 text-blue-700' :
                      featuredAnnouncement.category === 'Achievement' ? 'bg-emerald-100 text-emerald-700' :
                      featuredAnnouncement.category === 'Competition' ? 'bg-red-100 text-red-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {featuredAnnouncement.category}
                    </span>
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {featuredAnnouncement.date}
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">{featuredAnnouncement.title}</h3>
                  {featuredAnnouncement.content && (
                    <p className="text-gray-600 mb-6 leading-relaxed">{featuredAnnouncement.content.substring(0, 180)}...</p>
                  )}
                  <Link
                    to="/announcements"
                    className="inline-flex items-center gap-2 text-blue-900 font-semibold hover:text-blue-700 transition-colors group"
                  >
                    Read Full Article
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📢</span>
              </div>
              <p className="text-gray-500">No announcements yet</p>
            </div>
          )}
        </div>
      </section>

      {/* Latest Announcements */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Latest Announcements</h2>
              <p className="text-gray-600">Don't miss any important updates</p>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading announcements...</p>
            </div>
          ) : latestAnnouncements.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-8">
              {latestAnnouncements.map((announcement) => (
                <div key={announcement.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4 ${
                    announcement.category === 'Academic' ? 'bg-blue-100 text-blue-700' :
                    announcement.category === 'Achievement' ? 'bg-emerald-100 text-emerald-700' :
                    announcement.category === 'Competition' ? 'bg-red-100 text-red-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {announcement.category || 'General'}
                  </span>
                  <h3 className="font-bold text-lg text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-900 transition-colors">{announcement.title}</h3>
                  <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {announcement.date}
                  </p>
                  <Link
                    to="/announcements"
                    className="text-blue-900 text-sm font-semibold hover:text-blue-700 inline-flex items-center gap-1 group-hover:gap-2 transition-all"
                  >
                    Read More
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📋</span>
              </div>
              <p className="text-gray-500">No announcements available</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
