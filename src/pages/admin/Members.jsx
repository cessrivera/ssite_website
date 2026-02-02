import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';

const AdminMembers = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMember, setEditingMember] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    studentId: '',
    course: '',
    year: '',
    status: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      // Get members from members collection
      const membersQuery = query(collection(db, 'members'), orderBy('createdAt', 'desc'));
      const membersSnapshot = await getDocs(membersQuery);
      const membersData = membersSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        source: 'members',
        ...doc.data() 
      }));

      // Get users from users collection (including admins)
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs
        .map(doc => ({ id: doc.id, source: 'users', ...doc.data() }))
        .map(user => ({
          id: user.id,
          source: 'users',
          name: user.fullName || user.name || 'N/A',
          email: user.email || 'N/A',
          studentId: user.studentId || 'N/A',
          course: user.course || 'N/A',
          year: user.year || 'N/A',
          status: user.status || 'active',
          role: user.role || 'member',
          createdAt: user.createdAt
        }));

      // Combine both lists
      const combinedMembers = [...membersData, ...usersData];
      setMembers(combinedMembers);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id, source = 'members') => {
    try {
      const collectionName = source === 'users' ? 'users' : 'members';
      await updateDoc(doc(db, collectionName, id), { status: 'active' });
      loadMembers();
    } catch (error) {
      console.error('Error approving member:', error);
    }
  };

  const handleReject = async (id, source = 'members') => {
    if (window.confirm('Are you sure you want to reject this member?')) {
      try {
        const collectionName = source === 'users' ? 'users' : 'members';
        await deleteDoc(doc(db, collectionName, id));
        loadMembers();
      } catch (error) {
        console.error('Error rejecting member:', error);
      }
    }
  };

  const handleUpdateRole = async (id, newRole, source = 'members') => {
    try {
      const collectionName = source === 'users' ? 'users' : 'members';
      await updateDoc(doc(db, collectionName, id), { role: newRole });
      loadMembers();
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const handleDelete = async (id, source = 'members') => {
    if (window.confirm('Are you sure you want to delete this member?')) {
      try {
        const collectionName = source === 'users' ? 'users' : 'members';
        await deleteDoc(doc(db, collectionName, id));
        loadMembers();
      } catch (error) {
        console.error('Error deleting member:', error);
        alert('Failed to delete member. Please try again.');
      }
    }
  };

  const handleEditClick = (member) => {
    setEditingMember(member);
    setEditFormData({
      name: member.name || '',
      email: member.email || '',
      studentId: member.studentId || '',
      course: member.course || '',
      year: member.year || '',
      status: member.status || 'active'
    });
  };

  const handleEditFormChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingMember) return;
    
    setSaving(true);
    try {
      const collectionName = editingMember.source === 'users' ? 'users' : 'members';
      const updateData = {
        name: editFormData.name,
        studentId: editFormData.studentId,
        course: editFormData.course,
        year: editFormData.year,
        status: editFormData.status,
        updatedAt: new Date().toISOString()
      };
      
      // For users collection, also update fullName
      if (editingMember.source === 'users') {
        updateData.fullName = editFormData.name;
      }
      
      await updateDoc(doc(db, collectionName, editingMember.id), updateData);
      setEditingMember(null);
      loadMembers();
    } catch (error) {
      console.error('Error updating member:', error);
      alert('Failed to update member. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseEditModal = () => {
    setEditingMember(null);
    setEditFormData({
      name: '',
      email: '',
      studentId: '',
      course: '',
      year: '',
      status: ''
    });
  };

  const filteredMembers = members
    .filter(member => (member.role || 'member') !== 'admin')
    .filter(member =>
      member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.studentId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const totalMembers = members.filter(m => (m.role || 'member') !== 'admin').length;
  const pendingMembers = members.filter(m => m.status === 'pending' && (m.role || 'member') !== 'admin').length;
  const activeMembers = members.filter(m => m.status === 'active' && (m.role || 'member') !== 'admin').length;

  const getStatusBadge = (status) => {
    if (status === 'active') return 'bg-green-100 text-green-700';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') return 'bg-red-100 text-red-700';
    return 'bg-blue-100 text-blue-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Manage Members</h1>
        <p className="text-gray-500 mt-1">View and manage organization members</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">{totalMembers}</div>
              <div className="text-gray-500 text-sm">Total Members</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">{pendingMembers}</div>
              <div className="text-gray-500 text-sm">Pending Approval</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">{activeMembers}</div>
              <div className="text-gray-500 text-sm">Active Members</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">All Members</h2>
          <div className="relative">
            <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search Members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-2 border-gray-200 rounded-xl pl-12 pr-4 py-3 w-72 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-16">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-500">Loading members...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-gray-500">No members found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-700">
              <tr>
                <th className="text-left py-4 px-6 font-semibold text-white">Student #</th>
                <th className="text-left py-4 px-6 font-semibold text-white">Name</th>
                <th className="text-left py-4 px-6 font-semibold text-white">Course</th>
                <th className="text-left py-4 px-6 font-semibold text-white">Year</th>
                <th className="text-left py-4 px-6 font-semibold text-white">Status</th>
                <th className="text-left py-4 px-6 font-semibold text-white">Role</th>
                <th className="text-left py-4 px-6 font-semibold text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member, index) => (
                <tr key={member.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors`}>
                  <td className="py-4 px-6 text-gray-600 font-medium">
                    {member.studentId || 'N/A'}
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <p className="font-semibold text-gray-900">{member.name || 'No name'}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-gray-600">{member.course || 'BSIT'}</td>
                  <td className="py-4 px-6 text-gray-600">{member.year || 'N/A'}</td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${getStatusBadge(member.status)}`}>
                      {member.status || 'Active'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${getRoleBadge(member.role)}`}>
                      {member.role || 'Member'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex gap-2">
                      {member.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleApprove(member.id, member.source)}
                            className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-200 transition-colors flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(member.id, member.source)}
                            className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Reject
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditClick(member)}
                            className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(member.id, member.source)}
                            className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
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

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Edit Member</h2>
                <button
                  onClick={handleCloseEditModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={editFormData.name}
                  onChange={handleEditFormChange}
                  required
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={editFormData.email}
                  disabled
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-100 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Student ID
                </label>
                <input
                  type="text"
                  name="studentId"
                  value={editFormData.studentId}
                  onChange={handleEditFormChange}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Course
                  </label>
                  <select
                    name="course"
                    value={editFormData.course}
                    onChange={handleEditFormChange}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select Course</option>
                    <option value="BSIT">BSIT</option>
                    <option value="BSCS">BSCS</option>
                    <option value="BSIS">BSIS</option>
                    <option value="ACT">ACT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Year Level
                  </label>
                  <select
                    name="year"
                    value={editFormData.year}
                    onChange={handleEditFormChange}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select Year</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={editFormData.status}
                  onChange={handleEditFormChange}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="flex-1 border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-blue-900 to-blue-700 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:from-gray-400 disabled:to-gray-400 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMembers;
