import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const PRIMARY_ADMIN_EMAIL = 'pderivera.student@ua.edu.ph';
const normalizeEmail = (email = '') => email.trim().toLowerCase();
const isPrimaryAdminUser = (user = {}) =>
  user.role === 'admin' && normalizeEmail(user.email) === PRIMARY_ADMIN_EMAIL;
const MEMBER_TERM_YEARS = 5;

const toDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const addYears = (date, years) => {
  if (!date) return null;
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
};

const resolveTermDates = (member = {}) => {
  const termStartAt = toDateValue(member.termStartAt) || toDateValue(member.createdAt) || new Date();
  const termEndAt = toDateValue(member.termEndAt) || addYears(termStartAt, MEMBER_TERM_YEARS);
  return { termStartAt, termEndAt };
};

const deriveStatus = (member = {}) => {
  if (member.status === 'pending') return 'pending';
  if (member.status === 'inactive' || member.status === 'archived') return 'inactive';
  const { termEndAt } = resolveTermDates(member);
  if (termEndAt && termEndAt.getTime() <= Date.now()) return 'inactive';
  return 'active';
};

const matchesSearch = (member = {}, rawQuery = '') => {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;
  return [member.name, member.email, member.studentId]
    .map((value) => String(value || '').toLowerCase())
    .some((value) => value.includes(query));
};

const AdminMembers = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingSearch, setPendingSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [inactiveSearch, setInactiveSearch] = useState('');
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
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

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
      const usersRaw = usersSnapshot.docs
        .map(doc => ({ id: doc.id, source: 'users', ...doc.data() }));

      const nonPrimaryAdmins = usersRaw.filter(user =>
        user.role === 'admin' && !isPrimaryAdminUser(user)
      );

      if (nonPrimaryAdmins.length > 0) {
        await Promise.all(nonPrimaryAdmins.map(user =>
          updateDoc(doc(db, 'users', user.id), {
            role: 'member',
            updatedAt: new Date().toISOString()
          })
        ));
      }

      const usersData = usersRaw
        .map(user => ({
          id: user.id,
          source: 'users',
          name: user.fullName || user.name || 'N/A',
          email: user.email || 'N/A',
          studentId: user.studentId || 'N/A',
          course: user.course || 'N/A',
          year: user.year || 'N/A',
          status: user.status || 'active',
          role: isPrimaryAdminUser(user) ? 'admin' : 'member',
          createdAt: user.createdAt
        }));

      const mergeMemberRecord = (primary, secondary) => ({
        ...secondary,
        ...primary,
        name: primary.name || secondary.name,
        email: primary.email || secondary.email,
        studentId: primary.studentId || secondary.studentId,
        course: primary.course || secondary.course,
        year: primary.year || secondary.year,
        status: primary.status || secondary.status,
        role: primary.role || secondary.role,
        createdAt: primary.createdAt || secondary.createdAt,
        source: primary.source || secondary.source
      });

      // Combine both lists, de-duplicating by user id
      const combinedMap = new Map();
      membersData.forEach(member => {
        combinedMap.set(member.id, member);
      });
      usersData.forEach(user => {
        const existing = combinedMap.get(user.id);
        if (existing) {
          combinedMap.set(user.id, mergeMemberRecord(existing, user));
        } else {
          combinedMap.set(user.id, user);
        }
      });

      const combinedMembers = Array.from(combinedMap.values()).map((member) => {
        const { termStartAt, termEndAt } = resolveTermDates(member);
        const termStartAtIso = termStartAt?.toISOString();
        const termEndAtIso = termEndAt?.toISOString();
        return {
          ...member,
          termStartAt: member.termStartAt || termStartAtIso,
          termEndAt: member.termEndAt || termEndAtIso,
          effectiveStatus: deriveStatus({ ...member, termStartAt, termEndAt })
        };
      });

      setMembers(combinedMembers);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateMemberRecords = async (member, data) => {
    const updates = [
      updateDoc(doc(db, 'members', member.id), data),
      updateDoc(doc(db, 'users', member.id), data)
    ];

    await Promise.allSettled(updates);
  };

  const deleteMemberRecords = async (member) => {
    const deletes = [
      deleteDoc(doc(db, 'members', member.id)),
      deleteDoc(doc(db, 'users', member.id))
    ];

    if (member.studentId) {
      deletes.push(deleteDoc(doc(db, 'memberStudentIds', String(member.studentId))));
    }

    await Promise.allSettled(deletes);
  };

  const handleApprove = async (member, status = 'active') => {
    try {
      await updateMemberRecords(member, {
        status,
        updatedAt: new Date().toISOString()
      });
      loadMembers();
    } catch (error) {
      console.error('Error approving member:', error);
    }
  };

  const handleReject = (member) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Reject Member',
      message: 'Are you sure you want to reject this member? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteMemberRecords(member);
          loadMembers();
        } catch (error) {
          console.error('Error rejecting member:', error);
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleDelete = (member) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Member',
      message: 'Are you sure you want to delete this member? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteMemberRecords(member);
          loadMembers();
        } catch (error) {
          console.error('Error deleting member:', error);
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
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
      const updateData = {
        name: editFormData.name,
        studentId: editFormData.studentId,
        course: editFormData.course,
        year: editFormData.year,
        status: editFormData.status,
        updatedAt: new Date().toISOString()
      };

      // For users collection, also update fullName
      updateData.fullName = editFormData.name;

      const nextStudentId = String(editFormData.studentId || '').trim();
      const prevStudentId = String(editingMember.studentId || '').trim();

      await updateMemberRecords(editingMember, updateData);

      if (prevStudentId && prevStudentId !== nextStudentId) {
        await deleteDoc(doc(db, 'memberStudentIds', prevStudentId));
      }

      if (nextStudentId && prevStudentId !== nextStudentId) {
        await setDoc(doc(db, 'memberStudentIds', nextStudentId), {
          userId: editingMember.id,
          email: editingMember.email || 'N/A',
          emailNormalized: normalizeEmail(editingMember.email || ''),
          updatedAt: new Date().toISOString()
        });
      }
      setEditingMember(null);
      loadMembers();
    } catch (error) {
      console.error('Error updating member:', error);
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

  // Filter out admins from the main list
  const nonAdminMembers = members.filter(member => (member.role || 'member') !== 'admin');

  const pendingMembersList = nonAdminMembers
    .filter(member => member.effectiveStatus === 'pending')
    .filter(member => matchesSearch(member, pendingSearch));

  const activeMembersList = nonAdminMembers
    .filter(member => member.effectiveStatus === 'active')
    .filter(member => matchesSearch(member, activeSearch));

  const inactiveMembersList = nonAdminMembers
    .filter(member => member.effectiveStatus === 'inactive')
    .filter(member => matchesSearch(member, inactiveSearch));

  const totalMembers = nonAdminMembers.length;
  const pendingMembers = nonAdminMembers.filter(m => m.effectiveStatus === 'pending').length;
  const activeMembers = nonAdminMembers.filter(m => m.effectiveStatus === 'active').length;
  const inactiveMembers = nonAdminMembers.filter(m => m.effectiveStatus === 'inactive').length;
  const adminMembers = members.filter(member => member.role === 'admin');
  const totalAdmins = adminMembers.length;

  const getStatusBadge = (status) => {
    if (status === 'active') return 'bg-green-100 text-green-700';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
    if (status === 'inactive') return 'bg-gray-100 text-gray-700';
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
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
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center shadow-lg shadow-slate-500/30">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">{inactiveMembers}</div>
              <div className="text-gray-500 text-sm">Inactive Members</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">{totalAdmins}</div>
              <div className="text-gray-500 text-sm">Administrators</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Approval Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-amber-100/50">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Pending Approval</h2>
              <p className="text-sm text-gray-500">{pendingMembersList.length} member{pendingMembersList.length !== 1 ? 's' : ''} waiting for approval</p>
            </div>
            </div>
            <div className="relative w-full md:w-72">
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search pending..."
                value={pendingSearch}
                onChange={(e) => setPendingSearch(e.target.value)}
                className="w-full border border-amber-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-white"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : pendingMembersList.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-500">No pending approvals</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gradient-to-r from-amber-500 to-amber-600">
              <tr>
                <th className="text-left py-4 px-6 font-semibold text-white">Student #</th>
                <th className="text-left py-4 px-6 font-semibold text-white">Name</th>
                <th className="text-left py-4 px-6 font-semibold text-white">Course</th>
                <th className="text-left py-4 px-6 font-semibold text-white">Year</th>
                <th className="text-left py-4 px-6 font-semibold text-white">Status</th>
                <th className="text-left py-4 px-6 font-semibold text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingMembersList.map((member, index) => (
                <tr key={member.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-amber-50/30'} hover:bg-amber-50 transition-colors`}>
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
                    <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-yellow-100 text-yellow-700">
                      Pending
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(member, 'active')}
                        className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-200 transition-colors flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(member)}
                        className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Active Members Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-blue-100/50">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Active Members</h2>
              <p className="text-sm text-gray-500">{activeMembersList.length} approved member{activeMembersList.length !== 1 ? 's' : ''}</p>
            </div>
            </div>
            <div className="relative w-full md:w-72">
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search active..."
                value={activeSearch}
                onChange={(e) => setActiveSearch(e.target.value)}
                className="w-full border border-blue-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-500">Loading members...</p>
          </div>
        ) : activeMembersList.length === 0 ? (
          <div className="text-center py-12">
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
              {activeMembersList.map((member, index) => (
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
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${getStatusBadge(member.effectiveStatus || member.status)}`}>
                      {member.effectiveStatus === 'active' ? 'Active' : (member.status || 'Active')}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${getRoleBadge(member.role)}`}>
                      {member.role || 'Member'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex gap-2">
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
                        onClick={() => handleDelete(member)}
                        className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Inactive Members Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-slate-100/50">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Inactive Members</h2>
                <p className="text-sm text-gray-500">{inactiveMembersList.length} inactive member{inactiveMembersList.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="relative w-full md:w-72">
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search inactive..."
                value={inactiveSearch}
                onChange={(e) => setInactiveSearch(e.target.value)}
                className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent bg-white"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-slate-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-500">Loading inactive members...</p>
          </div>
        ) : inactiveMembersList.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-500">No inactive members</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gradient-to-r from-slate-600 to-slate-700">
              <tr>
                <th className="text-left py-4 px-6 font-semibold text-white">Student #</th>
                <th className="text-left py-4 px-6 font-semibold text-white">Name</th>
                <th className="text-left py-4 px-6 font-semibold text-white">Course</th>
                <th className="text-left py-4 px-6 font-semibold text-white">Year</th>
                <th className="text-left py-4 px-6 font-semibold text-white">Status</th>
                <th className="text-left py-4 px-6 font-semibold text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {inactiveMembersList.map((member, index) => (
                <tr key={member.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-slate-50 transition-colors`}>
                  <td className="py-4 px-6 text-gray-600 font-medium">{member.studentId || 'N/A'}</td>
                  <td className="py-4 px-6">
                    <div>
                      <p className="font-semibold text-gray-900">{member.name || 'No name'}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-gray-600">{member.course || 'BSIT'}</td>
                  <td className="py-4 px-6 text-gray-600">{member.year || 'N/A'}</td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${getStatusBadge('inactive')}`}>
                      Inactive
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(member, 'active')}
                        className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-200 transition-colors flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Activate
                      </button>
                      <button
                        onClick={() => handleDelete(member)}
                        className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Delete
                      </button>
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

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Confirm"
      />
    </div>
  );
};

export default AdminMembers;
