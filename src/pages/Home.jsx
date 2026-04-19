import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getAnnouncements } from '../services/announcementService';
import DOMPurify from 'dompurify';

const Home = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const data = await getAnnouncements();
      setAnnouncements(
        data.filter((announcement) => announcement.archived !== true && announcement.status !== 'Draft')
      );
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

  const renderContent = (content) => {
    if (!content) return null;
    if (content.includes('<')) {
      return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} className="prose prose-sm max-w-none" />;
    }
    return <p className="text-gray-600 mb-6 leading-relaxed">{content.substring(0, 180)}...</p>;
  };

  return (
    <div className="bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-linear-to-br from-blue-900 via-blue-800 to-blue-900 text-white overflow-hidden">

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
                <div className={`w-14 h-14 bg-linear-to-br ${item.color} rounded-xl flex items-center justify-center text-2xl mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
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
            <button
              type="button"
              onClick={() => setSelectedAnnouncement(featuredAnnouncement)}
              className="w-full text-left bg-linear-to-br from-gray-50 to-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300"
              aria-label={`Open announcement: ${featuredAnnouncement.title}`}
            >
              <div className="grid md:grid-cols-2 gap-0">
                {featuredAnnouncement.imageUrl && featuredAnnouncement.imageUrl.trim() !== '' ? (
                  <div className="h-64 md:h-auto overflow-hidden">
                    <img
                      src={featuredAnnouncement.imageUrl}
                      alt={featuredAnnouncement.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.parentElement.innerHTML = '<div class="h-64 md:h-auto bg-linear-to-br from-blue-900 to-blue-700 flex items-center justify-center"><span class="text-white text-6xl opacity-50">📢</span></div>';
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-64 md:h-auto bg-linear-to-br from-blue-900 to-blue-700 flex items-center justify-center">
                    <span className="text-white text-6xl opacity-50">📢</span>
                  </div>
                )}

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
                  {renderContent(featuredAnnouncement.content)}
                  <p className="text-sm font-medium text-blue-900">Click to view full announcement</p>
                </div>
              </div>
            </button>
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
                <button
                  type="button"
                  key={announcement.id}
                  onClick={() => setSelectedAnnouncement(announcement)}
                  className="w-full text-left bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group cursor-pointer"
                  aria-label={`Open announcement: ${announcement.title}`}
                >
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
                </button>
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

      {/* Full Announcement Modal */}
      {selectedAnnouncement && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedAnnouncement(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col min-w-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with Image */}
            {selectedAnnouncement.imageUrl ? (
              <div className="relative h-64 md:h-80 shrink-0">
                <img
                  src={selectedAnnouncement.imageUrl}
                  alt={selectedAnnouncement.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent"></div>
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm text-white p-2 rounded-full hover:bg-white/30 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="absolute bottom-4 left-6 right-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      selectedAnnouncement.category === 'Academic' ? 'bg-blue-100 text-blue-700' :
                      selectedAnnouncement.category === 'Achievement' ? 'bg-emerald-100 text-emerald-700' :
                      selectedAnnouncement.category === 'Competition' ? 'bg-red-100 text-red-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {selectedAnnouncement.category}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-white/90">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {selectedAnnouncement.date}
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white">{selectedAnnouncement.title}</h2>
                </div>
              </div>
            ) : (
              <div className="relative bg-linear-to-br from-blue-600 to-blue-800 p-6 shrink-0">
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm text-white p-2 rounded-full hover:bg-white/30 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedAnnouncement.category === 'Academic' ? 'bg-blue-100 text-blue-700' :
                    selectedAnnouncement.category === 'Achievement' ? 'bg-emerald-100 text-emerald-700' :
                    selectedAnnouncement.category === 'Competition' ? 'bg-red-100 text-red-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {selectedAnnouncement.category}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-white/90">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {selectedAnnouncement.date}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">{selectedAnnouncement.title}</h2>
              </div>
            )}

            {/* Modal Content */}
            <div className="p-6 md:p-8 overflow-y-auto overflow-x-hidden grow min-w-0">
              {selectedAnnouncement.content && (
                selectedAnnouncement.content.includes('<') ? (
                  <div
                    className="prose max-w-none text-gray-700 leading-relaxed wrap-anywhere **:max-w-full [&_img]:h-auto [&_pre]:whitespace-pre-wrap [&_pre]:wrap-anywhere"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedAnnouncement.content) }}
                  />
                ) : (
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap wrap-anywhere">{selectedAnnouncement.content}</p>
                )
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 shrink-0">
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
