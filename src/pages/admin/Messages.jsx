import { useState, useEffect } from 'react';
import { getMessages, deleteMessage } from '../../services/messageService';

const AdminMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const data = await getMessages();
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      const result = await deleteMessage(id);
      if (result.success) {
        setMessages(messages.filter(msg => msg.id !== id));
        setSelectedMessage(null);
      }
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading messages...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="text-gray-600">View and manage contact form submissions</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Messages List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-white rounded-lg shadow-md p-4 border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">Inbox</h2>
              <span className="bg-blue-100 text-blue-900 px-3 py-1 rounded-full text-sm font-semibold">
                {messages.length}
              </span>
            </div>

            {messages.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No messages yet</p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    onClick={() => setSelectedMessage(message)}
                    className={`p-3 rounded-lg cursor-pointer transition-all border ${
                      selectedMessage?.id === message.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-semibold text-sm truncate flex-1">{message.name}</p>
                      {message.status === 'unread' && (
                        <span className="w-2 h-2 bg-blue-600 rounded-full ml-2 mt-1.5"></span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mb-1">{message.email}</p>
                    <p className="text-xs text-gray-400">{formatDate(message.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-2">
          {selectedMessage ? (
            <div className="bg-white rounded-lg shadow-md border">
              {/* Header */}
              <div className="p-6 border-b bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">{selectedMessage.name}</h3>
                    <p className="text-blue-100 text-sm mb-1">{selectedMessage.email}</p>
                    <p className="text-blue-200 text-xs">{formatDate(selectedMessage.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(selectedMessage.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors text-sm flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>

              {/* Message Body */}
              <div className="p-6">
                <h4 className="text-sm font-semibold text-gray-500 mb-3">MESSAGE</h4>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedMessage.message}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md border h-full flex items-center justify-center p-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">Select a message to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMessages;
