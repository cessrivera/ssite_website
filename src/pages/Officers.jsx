import { useState, useEffect } from 'react';
import { getOfficers } from '../services/officerService';

const Officers = () => {
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('2025-2026');

  useEffect(() => {
    loadOfficers();
  }, []);

  const loadOfficers = async () => {
    try {
      const data = await getOfficers();
      // Sort by order field
      data.sort((a, b) => (a.order || 999) - (b.order || 999));
      setOfficers(data);
    } catch (error) {
      console.error('Error loading officers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOfficers = officers.filter((officer) => officer.term === selectedYear);

  return (
    <div className="py-12 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">SSITE Officers</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">Meet the dedicated team behind SSITE who work tirelessly to serve our community</p>
        </div>

        {/* Filter by School Year */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-10 max-w-md mx-auto">
          <label className="block text-sm font-semibold text-gray-700 mb-3 text-center">
            Select Academic Year
          </label>
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-5 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white font-medium text-gray-700 cursor-pointer"
            >
              <option value="2025-2026">2025 - 2026</option>
              <option value="2024-2025">2024 - 2025</option>
              <option value="2023-2024">2023 - 2024</option>
            </select>
            <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Officers Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading officers...</p>
          </div>
        ) : filteredOfficers.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">No officers found for this year</p>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {filteredOfficers.map((officer) => (
                <div key={officer.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  {/* Officer Photo */}
                  <div className="w-full aspect-square bg-gray-100 overflow-hidden relative">
                    {officer.image ? (
                      <img 
                        src={officer.image} 
                        alt={officer.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-700">
                        <span className="text-5xl font-bold text-white">
                          {officer.name?.charAt(0) || '?'}
                        </span>
                      </div>
                    )}
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                      <span className="text-white text-sm font-medium">{officer.term}</span>
                    </div>
                  </div>

                  {/* Officer Info */}
                  <div className="p-4 text-center">
                    <h3 className="font-bold text-gray-900 mb-1 truncate">{officer.name}</h3>
                    <p className="text-sm font-semibold text-blue-600 mb-1">
                      {officer.position}
                    </p>
                    <p className="text-xs text-gray-500">
                      {officer.course} - {officer.year}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Officers;
