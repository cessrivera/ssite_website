import { useState, useEffect } from 'react';
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, archiveAnnouncement, unarchiveAnnouncement } from '../../services/announcementService';
import Modal from '../../components/common/Modal';
import ImageUploader from '../../components/common/ImageUploader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['link'],
    ['clean']
  ],
};

const quillFormats = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'list', 'align', 'link'
];

const AdminAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'Academic',
    date: '',
    status: 'Published',
    imageUrl: ''
  });

  const categories = ['Academic', 'Achievement', 'Competition', 'Event', 'General'];
  const statuses = ['Published', 'Draft'];
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, confirmText: 'Confirm' });
  const [showArchived, setShowArchived] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAnnouncement) {
        await updateAnnouncement(editingAnnouncement.id, formData);
      } else {
        await createAnnouncement(formData);
      }
      resetForm();
      loadAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
    }
  };

  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content || '',
      category: announcement.category || 'Academic',
      date: announcement.date || '',
      status: announcement.status || 'Published',
      imageUrl: announcement.imageUrl || ''
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Announcement',
      message: 'Are you sure you want to permanently delete this announcement? This action cannot be undone.',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await deleteAnnouncement(id);
          loadAnnouncements();
        } catch (error) {
          console.error('Error deleting announcement:', error);
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleArchive = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Archive Announcement',
      message: 'Are you sure you want to archive this announcement? It will be hidden from the public page.',
      confirmText: 'Archive',
      onConfirm: async () => {
        try {
          await archiveAnnouncement(id);
          loadAnnouncements();
        } catch (error) {
          console.error('Error archiving announcement:', error);
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleUnarchive = async (id) => {
    try {
      await unarchiveAnnouncement(id);
      loadAnnouncements();
    } catch (error) {
      console.error('Error unarchiving announcement:', error);
    }
  };

  const resetForm = () => {
    setFormData({ title: '', content: '', category: 'Academic', date: '', status: 'Published', imageUrl: '' });
    setEditingAnnouncement(null);
    setShowForm(false);
  };

  const getCategoryBadge = (category) => {
    const colors = {
      'Academic': 'bg-blue-100 text-blue-700 border border-blue-300',
      'Achievement': 'bg-green-100 text-green-700 border border-green-300',
      'Competition': 'bg-red-100 text-red-700 border border-red-300',
      'Event': 'bg-purple-100 text-purple-700 border border-purple-300',
      'General': 'bg-gray-100 text-gray-700 border border-gray-300'
    };
    return colors[category] || colors['General'];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Announcements</h1>
          <p className="text-gray-500 mt-1">Create, edit, and publish announcements</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-5 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Announcement
        </button>
      </div>

      {/* Modal Form */}
      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title={editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
        size="3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Content</label>
            <ReactQuill
              theme="snow"
              value={formData.content}
              onChange={(value) => setFormData({ ...formData, content: value })}
              modules={quillModules}
              formats={quillFormats}
              className="bg-white rounded-xl [&_.ql-toolbar]:rounded-t-xl [&_.ql-toolbar]:border-gray-200 [&_.ql-container]:rounded-b-xl [&_.ql-container]:border-gray-200 [&_.ql-editor]:min-h-[120px]"
            />
          </div>

          <ImageUploader
            value={formData.imageUrl}
            onChange={(url) => setFormData({ ...formData, imageUrl: url })}
            folder="ssite/announcements"
            label="Announcement Image"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
              <div className="relative">
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <div className="relative">
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
                >
                  {statuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {editingAnnouncement ? 'Update Announcement' : 'Create Announcement'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="border-2 border-gray-200 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors text-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Announcements Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Tab Toggle */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setShowArchived(false)}
            className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${!showArchived ? 'text-blue-700 border-b-2 border-blue-700 bg-blue-50/50' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Active ({announcements.filter(a => !a.archived).length})
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${showArchived ? 'text-amber-700 border-b-2 border-amber-700 bg-amber-50/50' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Archived ({announcements.filter(a => a.archived).length})
          </button>
        </div>
        {loading ? (
          <div className="text-center py-16">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-500">Loading announcements...</p>
          </div>
        ) : announcements.filter(a => showArchived ? a.archived : !a.archived).length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <p className="text-gray-500">{showArchived ? 'No archived announcements.' : 'No announcements yet. Create your first one!'}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <tr>
                <th className="text-left py-4 px-6 font-semibold">Title</th>
                <th className="text-left py-4 px-6 font-semibold">Date</th>
                <th className="text-left py-4 px-6 font-semibold">Category</th>
                <th className="text-left py-4 px-6 font-semibold">Status</th>
                <th className="text-left py-4 px-6 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {announcements.filter(a => showArchived ? a.archived : !a.archived).map((announcement, index) => (
                <tr key={announcement.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                  <td className="py-4 px-6">
                    <div className="max-w-md">
                      <p className="font-medium text-gray-900 line-clamp-2">{announcement.title}</p>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-gray-600">{announcement.date || 'No date'}</td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${getCategoryBadge(announcement.category)}`}>
                      {announcement.category || 'General'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      announcement.status === 'Published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {announcement.status || 'Published'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex gap-2">
                      {showArchived ? (
                        <>
                          <button
                            onClick={() => handleUnarchive(announcement.id)}
                            className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-200 transition-colors flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Restore
                          </button>
                          <button
                            onClick={() => handleDelete(announcement.id)}
                            className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(announcement)}
                            className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handleArchive(announcement.id)}
                            className="bg-amber-100 text-amber-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                            Archive
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText || 'Confirm'}
      />
    </div>
  );
};

export default AdminAnnouncements;
