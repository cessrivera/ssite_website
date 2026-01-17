import { useState, useEffect } from 'react';
import { getPolls, votePoll } from '../services/pollService';
import { useAuth } from '../contexts/AuthContext';

const Polls = () => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    loadPolls();
  }, []);

  const loadPolls = async () => {
    try {
      const data = await getPolls();
      setPolls(data.filter(p => p.active));
    } catch (error) {
      console.error('Error loading polls:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (pollId, optionIndex) => {
    if (!currentUser) {
      alert('Please log in to vote');
      return;
    }

    const poll = polls.find(p => p.id === pollId);
    if (poll.votedUsers?.includes(currentUser.uid)) {
      alert('You have already voted on this poll');
      return;
    }

    try {
      await votePoll(pollId, optionIndex, currentUser.uid);
      alert('Vote submitted successfully!');
      loadPolls();
      setSelectedPoll(null);
      setSelectedOption(null);
    } catch (error) {
      console.error('Error voting:', error);
      alert('Error submitting vote. Please try again.');
    }
  };

  const activePolls = polls;

  return (
    <div className="py-12 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Polls & Voting</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">Have your voice heard! Participate in active polls and help shape SSITE decisions</p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading polls...</p>
          </div>
        ) : activePolls.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">No active polls at the moment</p>
            <p className="text-gray-400 text-sm mt-1">Check back later for new polls!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activePolls.map((poll) => {
              const hasVoted = currentUser && poll.votedUsers?.includes(currentUser.uid);
              const totalVotes = poll.totalVotes || 0;

              return (
                <div key={poll.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Poll Header */}
                  <div className="p-6 md:p-8 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">{poll.question}</h2>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="flex items-center gap-2 text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Ends: {poll.endDate}
                      </span>
                      <span className="flex items-center gap-2 text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {totalVotes} Votes
                      </span>
                      {hasVoted && (
                        <span className="flex items-center gap-1 text-emerald-600 font-medium bg-emerald-50 px-3 py-1.5 rounded-full">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          You voted
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Voting Options / Results */}
                  <div className="p-6 md:p-8">
                    {selectedPoll === poll.id ? (
                      <div className="space-y-3">
                        {poll.options?.map((option, idx) => (
                          <div key={idx}>
                            <label className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                              selectedOption === idx 
                                ? 'bg-blue-50 border-2 border-blue-500' 
                                : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                            }`}>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                selectedOption === idx ? 'border-blue-500' : 'border-gray-300'
                              }`}>
                                {selectedOption === idx && (
                                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                                )}
                              </div>
                              <span className="font-medium text-gray-700">{option.text}</span>
                            </label>
                          </div>
                        ))}
                        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                          <button
                            onClick={() => handleVote(poll.id, selectedOption)}
                            disabled={selectedOption === null}
                            className="bg-gradient-to-r from-blue-900 to-blue-700 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Submit Vote
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPoll(null);
                              setSelectedOption(null);
                            }}
                            className="border-2 border-gray-200 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors text-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Show Results */}
                        <div className="space-y-5 mb-6">
                          {poll.options?.map((option, idx) => {
                            const votes = option.votes || 0;
                            const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : 0;
                            
                            return (
                              <div key={idx}>
                                <div className="flex justify-between mb-2">
                                  <span className="font-medium text-gray-700">{option.text}</span>
                                  <span className="text-blue-900 font-bold">{percentage}%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-blue-900 to-blue-600 rounded-full h-3 transition-all duration-700"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <p className="text-sm text-gray-500 mt-1">{votes} votes</p>
                              </div>
                            );
                          })}
                        </div>

                        {!hasVoted && currentUser && (
                          <button
                            onClick={() => setSelectedPoll(poll.id)}
                            className="w-full bg-blue-50 text-blue-900 border-2 border-blue-200 px-6 py-3 rounded-xl font-semibold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Cast Your Vote
                          </button>
                        )}
                        {!currentUser && (
                          <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-100">
                            <p className="text-amber-700 font-medium flex items-center justify-center gap-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              Please log in to participate in this poll
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Polls;
