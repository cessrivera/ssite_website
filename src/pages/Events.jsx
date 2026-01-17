import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEvents } from '../services/eventService';
import { registerForEvent, isUserRegistered } from '../services/eventRegistrationService';
import { useAuth } from '../contexts/AuthContext';

const Events = () => {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const [currentDate] = useState(new Date(2026, 0, 12)); // January 12, 2026
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (currentUser && selectedEvent) {
      checkRegistrationStatus();
    }
  }, [currentUser, selectedEvent]);

  const checkRegistrationStatus = async () => {
    if (currentUser && selectedEvent) {
      const registered = await isUserRegistered(currentUser.uid, selectedEvent.id);
      setIsAlreadyRegistered(registered);
    }
  };

  const loadEvents = async () => {
    try {
      const data = await getEvents();
      setEvents(data);
      if (data.length > 0) {
        setSelectedEvent(data[0]);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterClick = () => {
    if (!currentUser) {
      // Not logged in - show confirmation
      if (window.confirm('You need to sign up or log in to register for events. Would you like to go to the membership page?')) {
        navigate('/membership');
      }
      return;
    }

    // Logged in - show registration modal
    setShowRegistrationModal(true);
  };

  const handleConfirmRegistration = async () => {
    setRegistering(true);
    
    try {
      const registrationData = {
        eventId: selectedEvent.id,
        eventTitle: selectedEvent.title,
        eventDate: selectedEvent.date,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: userData?.name || currentUser.displayName || currentUser.email
      };

      const result = await registerForEvent(registrationData);
      
      if (result.success) {
        alert('Successfully registered for the event! You will receive a confirmation email shortly.');
        setShowRegistrationModal(false);
        setIsAlreadyRegistered(true);
      } else {
        alert('Error registering for event. Please try again.');
      }
    } catch (error) {
      console.error('Error registering:', error);
      alert('Error registering for event. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  const upcomingEvents = events;

  // Calendar helper
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = currentDate.getDate();

  // Get days from previous month
  const prevMonthDays = getDaysInMonth(year, month - 1);
  const prevDays = Array.from({ length: firstDay }, (_, i) => prevMonthDays - firstDay + i + 1);
  
  // Current month days
  const currentDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  // Next month days to fill the grid
  const remainingDays = 42 - (prevDays.length + currentDays.length);
  const nextDays = Array.from({ length: remainingDays }, (_, i) => i + 1);

  const eventDays = [16, 21, 22, 23, 30]; // Days with events

  return (
    <div className="py-12 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Events</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">Discover upcoming events, workshops, and activities from SSITE</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <button className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-xl font-bold text-gray-900">January 2026</h2>
                <button className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-sm font-semibold text-gray-400 py-3">
                    {day}
                  </div>
                ))}

                {/* Previous month days */}
                {prevDays.map((day) => (
                  <div key={`prev-${day}`} className="text-center py-3 text-gray-300 rounded-xl">
                    {day}
                  </div>
                ))}

                {/* Current month days */}
                {currentDays.map((day) => (
                  <div
                    key={day}
                    className={`text-center py-3 rounded-xl cursor-pointer transition-all duration-200 ${
                      day === today ? 'bg-gradient-to-br from-blue-900 to-blue-700 text-white font-bold shadow-lg' :
                      eventDays.includes(day) ? 'bg-blue-100 text-blue-900 font-semibold hover:bg-blue-200' :
                      'hover:bg-gray-100'
                    }`}
                  >
                    {day}
                    {eventDays.includes(day) && day !== today && (
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mx-auto mt-1"></div>
                    )}
                  </div>
                ))}

                {/* Next month days */}
                {nextDays.map((day) => (
                  <div key={`next-${day}`} className="text-center py-3 text-gray-300 rounded-xl">
                    {day}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming Events Sidebar */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Upcoming Events
            </h2>
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-3 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-500 text-sm">Loading events...</p>
                </div>
              ) : upcomingEvents.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-2xl border border-gray-100">
                  <p className="text-gray-500">No upcoming events</p>
                </div>
              ) : (
                upcomingEvents.map((event) => {
                  const eventDate = event.date ? new Date(event.date) : null;
                  const dayNum = eventDate ? eventDate.getDate() : '?';
                  const monthShort = eventDate ? eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : 'TBA';
                  
                  return (
                    <div 
                      key={event.id} 
                      className={`flex items-start gap-4 p-4 bg-white rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
                        selectedEvent?.id === event.id 
                          ? 'border-blue-500 shadow-md' 
                          : 'border-gray-100 hover:border-blue-200 hover:shadow-sm'
                      }`}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="bg-gradient-to-br from-blue-100 to-blue-50 text-blue-900 px-3 py-2 rounded-xl text-center min-w-[50px]">
                        <div className="text-xl font-bold">{dayNum}</div>
                        <div className="text-xs font-medium">{monthShort}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{event.title}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {event.venue || 'Venue TBA'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Event Details */}
        {selectedEvent && (
          <div className="mt-10 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Event Image */}
            <div className="h-72 relative overflow-hidden">
              {selectedEvent.imageUrl ? (
                <>
                  <img 
                    src={selectedEvent.imageUrl} 
                    alt={selectedEvent.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-8 text-white z-10">
                    <h2 className="text-3xl font-bold drop-shadow-lg">{selectedEvent.title}</h2>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-full bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center relative">
                    <div className="absolute inset-0 opacity-10">
                      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <pattern id="event-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                          <circle cx="20" cy="20" r="2" fill="white"/>
                        </pattern>
                        <rect width="100%" height="100%" fill="url(#event-pattern)"/>
                      </svg>
                    </div>
                    <div className="text-center text-white z-10">
                      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h2 className="text-3xl font-bold">{selectedEvent.title}</h2>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-6 md:p-8">
              <div className="flex flex-wrap gap-4 mb-8">
                <div className="flex items-center gap-3 bg-gray-50 px-5 py-4 rounded-xl flex-1 min-w-[200px]">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Date & Time</div>
                    <div className="font-semibold text-gray-900">{selectedEvent.date || 'TBA'}</div>
                    <div className="text-sm text-gray-500">{selectedEvent.time || 'Time TBA'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 px-5 py-4 rounded-xl flex-1 min-w-[200px]">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Venue</div>
                    <div className="font-semibold text-gray-900">{selectedEvent.venue || 'Venue TBA'}</div>
                  </div>
                </div>
              </div>

              <h3 className="font-bold text-gray-900 mb-3 text-lg">About This Event</h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                {selectedEvent.description || 'Event details coming soon. Stay tuned for more information about this exciting event!'}
              </p>

              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={handleRegisterClick}
                  disabled={isAlreadyRegistered}
                  className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
                    isAlreadyRegistered 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-900 to-blue-700 text-white hover:shadow-lg'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isAlreadyRegistered ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    )}
                  </svg>
                  {isAlreadyRegistered ? 'Already Registered' : 'Register for Event'}
                </button>
                <button className="border-2 border-gray-200 px-8 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Add to Calendar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Registration Modal */}
      {showRegistrationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Confirm Registration</h3>
              <p className="text-gray-600">Please confirm your event registration details</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
              <div>
                <p className="text-xs text-gray-500 font-medium">Event</p>
                <p className="font-semibold text-gray-900">{selectedEvent?.title}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Date & Time</p>
                <p className="font-semibold text-gray-900">{selectedEvent?.date || 'TBA'}</p>
                <p className="text-sm text-gray-600">{selectedEvent?.time || 'Time TBA'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Venue</p>
                <p className="font-semibold text-gray-900">{selectedEvent?.venue || 'Venue TBA'}</p>
              </div>
              <div className="border-t border-gray-200 pt-3 mt-3">
                <p className="text-xs text-gray-500 font-medium">Registering as</p>
                <p className="font-semibold text-gray-900">{userData?.name || currentUser?.displayName || currentUser?.email}</p>
                <p className="text-sm text-gray-600">{currentUser?.email}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRegistrationModal(false)}
                disabled={registering}
                className="flex-1 border-2 border-gray-200 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRegistration}
                disabled={registering}
                className="flex-1 bg-gradient-to-r from-blue-900 to-blue-700 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {registering ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Registering...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Confirm
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;
