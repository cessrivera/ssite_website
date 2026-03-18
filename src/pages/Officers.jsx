import { useState, useEffect } from 'react';
import { getOfficers } from '../services/officerService';

const Officers = () => {
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStartYear, setSelectedStartYear] = useState('');
  const [selectedEndYear, setSelectedEndYear] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const parseAcademicTerm = (term) => {
    const termText = (term || '').toString();
    const matchedYears = termText.match(/\d{4}/g) || [];

    if (matchedYears.length >= 2) {
      return {
        startYear: matchedYears[0],
        endYear: matchedYears[1]
      };
    }

    if (matchedYears.length === 1) {
      const startYear = matchedYears[0];
      return {
        startYear,
        endYear: String(Number(startYear) + 1)
      };
    }

    return {
      startYear: '',
      endYear: ''
    };
  };

  // Generate dynamic year options from officers data + a reasonable range
  const currentYear = new Date().getFullYear();
  const allYearOptions = [];
  for (let y = currentYear + 1; y >= 2020; y--) {
    allYearOptions.push(`${y}`);
  }

  useEffect(() => {
    loadOfficers();
  }, []);

  useEffect(() => {
    // Set default filter to the latest academic year in data.
    if (officers.length > 0 && (!selectedStartYear || !selectedEndYear)) {
      const terms = [...new Set(officers.map((officer) => officer.term).filter(Boolean))]
        .map((term) => parseAcademicTerm(term))
        .filter((term) => term.startYear && term.endYear)
        .sort((a, b) => Number(b.startYear) - Number(a.startYear));

      if (terms.length > 0) {
        setSelectedStartYear(terms[0].startYear);
        setSelectedEndYear(terms[0].endYear);
      } else {
        setSelectedStartYear(allYearOptions[0]);
        setSelectedEndYear(String(Number(allYearOptions[0]) + 1));
      }
    }
  }, [officers, selectedStartYear, selectedEndYear]);

  const loadOfficers = async () => {
    try {
      const data = await getOfficers();
      data.sort((a, b) => (a.order || 999) - (b.order || 999));
      setOfficers(data);
    } catch (error) {
      console.error('Error loading officers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartYearChange = (e) => {
    setSelectedStartYear(e.target.value);
  };

  const handleEndYearChange = (e) => {
    setSelectedEndYear(e.target.value);
  };

  const filteredOfficers = officers.filter((officer) => {
    const term = parseAcademicTerm(officer.term);
    const matchesTerm = term.startYear === selectedStartYear && term.endYear === selectedEndYear;
    const matchesSearch = searchTerm === '' ||
      officer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      officer.position?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTerm && matchesSearch;
  });

  return (
    <div className="py-12 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">SSITE Officers</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">Meet the dedicated team behind SSITE who work tirelessly to serve our community</p>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-10 max-w-3xl mx-auto">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name or position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Two separate year dropdowns */}
          <div className="flex gap-4">
            {/* Primary year dropdown */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Start Year</label>
              <div className="relative">
                <select
                  value={selectedStartYear}
                  onChange={handleStartYearChange}
                  className="w-full border-2 rounded-xl px-5 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white font-medium cursor-pointer transition-all border-blue-500 text-blue-900"
                >
                  <option value="" disabled>Select year...</option>
                  {allYearOptions.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
                <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Secondary year dropdown */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">End Year</label>
              <div className="relative">
                <select
                  value={selectedEndYear}
                  onChange={handleEndYearChange}
                  className="w-full border-2 rounded-xl px-5 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white font-medium cursor-pointer transition-all border-blue-500 text-blue-900"
                >
                  <option value="" disabled>Select year...</option>
                  {allYearOptions.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
                <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
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
                      <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-blue-900 to-blue-700">
                        <span className="text-5xl font-bold text-white">
                          {officer.name?.charAt(0) || '?'}
                        </span>
                      </div>
                    )}
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-linear-to-t from-blue-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
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
