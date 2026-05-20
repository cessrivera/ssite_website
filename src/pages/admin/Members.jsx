import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const PRIMARY_ADMIN_EMAIL = 'pderivera.student@ua.edu.ph';
const MEMBER_TERM_YEARS = 5;
const normalizeEmail = (email = '') => email.trim().toLowerCase();
const isPrimaryAdminUser = (user = {}) =>
  user.role === 'admin' && normalizeEmail(user.email) === PRIMARY_ADMIN_EMAIL;

const emptyMemberForm = {
  name: '',
  email: '',
  studentId: '',
  course: 'BSIT',
  year: ''
};
const blockedDocIdCharacters = new RegExp('[\\\\/#?\\[\\]]', 'g');

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
  if (member.status === 'inactive' || member.status === 'archived') return 'inactive';
  const { termEndAt } = resolveTermDates(member);
  if (termEndAt && termEndAt.getTime() <= Date.now()) return 'inactive';
  return 'active';
};

const matchesSearch = (member = {}, rawQuery = '') => {
  const search = rawQuery.trim().toLowerCase();
  if (!search) return true;

  return [member.name, member.fullName, member.email, member.studentId]
    .map((value) => String(value || '').toLowerCase())
    .some((value) => value.includes(search));
};

const getMemberDocId = (email) =>
  normalizeEmail(email).replace(blockedDocIdCharacters, '_');

const splitCsvLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];

    if (character === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') {
      inQuotes = !inQuotes;
    } else if (character === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }

  values.push(current.trim());
  return values;
};

const normalizeCsvHeader = (header = '') => {
  const key = header.trim().toLowerCase().replace(/[\s_-]+/g, '');
  const aliases = {
    studentnumber: 'studentId',
    studentno: 'studentId',
    studentid: 'studentId',
    fullname: 'name',
    name: 'name',
    email: 'email',
    emailaddress: 'email',
    course: 'course',
    year: 'year',
    yearlevel: 'year'
  };
  return aliases[key] || key;
};

const parseCsvRows = (csvText) => {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const firstRow = splitCsvLine(lines[0]).map(normalizeCsvHeader);
  const hasHeader = firstRow.includes('email') || firstRow.includes('name') || firstRow.includes('studentId');
  const headers = hasHeader ? firstRow : ['studentId', 'name', 'email', 'year'];
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const values = splitCsvLine(line);
    return headers.reduce((row, header, index) => {
      row[header] = values[index] || '';
      return row;
    }, {});
  });
};

const AdminMembers = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSearch, setActiveSearch] = useState('');
  const [inactiveSearch, setInactiveSearch] = useState('');
  const [selectedMembers, setSelectedMembers] = useState({ active: [], inactive: [] });
  const [addFormData, setAddFormData] = useState(emptyMemberForm);
  const [csvText, setCsvText] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [editingMember, setEditingMember] = useState(null);
  const [editFormData, setEditFormData] = useState({ ...emptyMemberForm, status: 'active' });
  const [saving, setSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  useEffect(() => {
    loadMembers();
  }, []);

  const mergeMemberRecord = (primary, secondary = {}) => ({
    ...secondary,
    ...primary,
    id: primary.id || secondary.id,
    sourceIds: {
      members: [...new Set([...(secondary.sourceIds?.members || []), ...(primary.sourceIds?.members || [])])],
      users: [...new Set([...(secondary.sourceIds?.users || []), ...(primary.sourceIds?.users || [])])]
    },
    fullName: primary.fullName || primary.name || secondary.fullName || secondary.name || '',
    name: primary.name || primary.fullName || secondary.name || secondary.fullName || '',
    email: primary.email || secondary.email || '',
    emailNormalized: primary.emailNormalized || secondary.emailNormalized || normalizeEmail(primary.email || secondary.email || ''),
    studentId: primary.studentId || secondary.studentId || '',
    course: primary.course || secondary.course || 'BSIT',
    year: primary.year || secondary.year || '',
    status: primary.status || secondary.status || 'active',
    role: primary.role || secondary.role || 'member',
    createdAt: primary.createdAt || secondary.createdAt
  });

  const loadMembers = async () => {
    setLoading(true);
    try {
      const [membersSnapshot, usersSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'members'), orderBy('createdAt', 'desc'))),
        getDocs(collection(db, 'users'))
      ]);

      const rawRecords = [
        ...membersSnapshot.docs.map((memberDoc) => ({
          id: memberDoc.id,
          sourceIds: { members: [memberDoc.id], users: [] },
          ...memberDoc.data()
        })),
        ...usersSnapshot.docs.map((userDoc) => ({
          id: userDoc.id,
          sourceIds: { members: [], users: [userDoc.id] },
          ...userDoc.data()
        }))
      ];

      const nonPrimaryAdmins = rawRecords.filter((record) =>
        record.sourceIds.users.length > 0 && record.role === 'admin' && !isPrimaryAdminUser(record)
      );

      if (nonPrimaryAdmins.length > 0) {
        await Promise.all(nonPrimaryAdmins.flatMap((record) =>
          record.sourceIds.users.map((userId) =>
            updateDoc(doc(db, 'users', userId), {
              role: 'member',
              updatedAt: new Date().toISOString()
            })
          )
        ));
      }

      const combinedMap = new Map();
      rawRecords.forEach((record) => {
        const emailKey = record.emailNormalized || normalizeEmail(record.email);
        const mergeKey = emailKey || record.id;
        const normalizedRecord = {
          ...record,
          role: isPrimaryAdminUser(record) ? 'admin' : (record.role || 'member')
        };
        const existing = combinedMap.get(mergeKey);
        combinedMap.set(mergeKey, existing ? mergeMemberRecord(normalizedRecord, existing) : normalizedRecord);
      });

      const combinedMembers = Array.from(combinedMap.values())
        .map((member) => {
          const { termStartAt, termEndAt } = resolveTermDates(member);
          return {
            ...member,
            termStartAt: member.termStartAt || termStartAt?.toISOString(),
            termEndAt: member.termEndAt || termEndAt?.toISOString(),
            effectiveStatus: deriveStatus({ ...member, termStartAt, termEndAt })
          };
        })
        .filter((member) => (member.role || 'member') !== 'admin')
        .sort((a, b) => (a.name || a.email || '').localeCompare(b.name || b.email || ''));

      setMembers(combinedMembers);
    } catch (error) {
      console.error('Error loading members:', error);
      setFeedback({ type: 'error', message: 'Members could not be loaded.' });
    } finally {
      setLoading(false);
    }
  };

  const buildMemberRecord = (input) => {
    const email = normalizeEmail(input.email);
    const now = new Date();
    const termEndAt = addYears(now, MEMBER_TERM_YEARS);

    return {
      userId: getMemberDocId(email),
      name: (input.name || '').trim(),
      fullName: (input.name || '').trim(),
      email,
      emailNormalized: email,
      studentId: (input.studentId || '').trim(),
      course: 'BSIT',
      year: (input.year || '').trim(),
      role: 'member',
      status: 'active',
      archived: false,
      authProvider: 'google',
      termStartAt: now.toISOString(),
      termEndAt: termEndAt?.toISOString(),
      termYears: MEMBER_TERM_YEARS,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
  };

  const saveMemberRecord = async (input) => {
    const email = normalizeEmail(input.email);
    if (!email) throw new Error('Email is required.');

    const id = getMemberDocId(email);
    const record = buildMemberRecord(input);

    await Promise.all([
      setDoc(doc(db, 'members', id), record, { merge: true }),
      setDoc(doc(db, 'users', id), record, { merge: true })
    ]);

    if (record.studentId) {
      await setDoc(doc(db, 'memberStudentIds', record.studentId), {
        userId: id,
        email,
        emailNormalized: email,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  };

  const updateMemberRecords = async (member, data) => {
    const memberIds = member.sourceIds?.members?.length ? member.sourceIds.members : [member.id];
    const userIds = member.sourceIds?.users?.length ? member.sourceIds.users : [member.id];

    await Promise.allSettled([
      ...memberIds.map((memberId) => setDoc(doc(db, 'members', memberId), data, { merge: true })),
      ...userIds.map((userId) => setDoc(doc(db, 'users', userId), data, { merge: true }))
    ]);
  };

  const deleteMemberRecords = async (member) => {
    const memberIds = member.sourceIds?.members?.length ? member.sourceIds.members : [member.id];
    const userIds = member.sourceIds?.users?.length ? member.sourceIds.users : [member.id];

    await Promise.allSettled([
      ...memberIds.map((memberId) => deleteDoc(doc(db, 'members', memberId))),
      ...userIds.map((userId) => deleteDoc(doc(db, 'users', userId))),
      member.studentId ? deleteDoc(doc(db, 'memberStudentIds', String(member.studentId))) : Promise.resolve()
    ]);
  };

  const handleAddFormChange = (event) => {
    setAddFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
    setFeedback({ type: '', message: '' });
  };

  const handleAddMember = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      await saveMemberRecord(addFormData);
      setAddFormData(emptyMemberForm);
      setFeedback({ type: 'success', message: 'Member added. They can now sign in with Google.' });
      await loadMembers();
    } catch (error) {
      console.error('Error adding member:', error);
      setFeedback({ type: 'error', message: error.message || 'Member could not be added.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCsvFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCsvText(await file.text());
    setFeedback({ type: '', message: '' });
  };

  const handleCsvImport = async () => {
    const rows = parseCsvRows(csvText).filter((row) => normalizeEmail(row.email));
    if (rows.length === 0) {
      setFeedback({ type: 'error', message: 'Upload a CSV with at least an email column.' });
      return;
    }

    setCsvImporting(true);
    setFeedback({ type: '', message: '' });

    try {
      await Promise.all(rows.map(saveMemberRecord));
      setCsvText('');
      setFeedback({ type: 'success', message: `${rows.length} member${rows.length === 1 ? '' : 's'} imported.` });
      await loadMembers();
    } catch (error) {
      console.error('Error importing members:', error);
      setFeedback({ type: 'error', message: error.message || 'CSV import failed.' });
    } finally {
      setCsvImporting(false);
    }
  };

  const clearSelection = (section) => {
    setSelectedMembers((current) => ({ ...current, [section]: [] }));
  };

  const toggleMemberSelection = (section, memberId) => {
    setSelectedMembers((current) => {
      const selected = current[section] || [];
      return {
        ...current,
        [section]: selected.includes(memberId)
          ? selected.filter((id) => id !== memberId)
          : [...selected, memberId]
      };
    });
  };

  const toggleAllMembers = (section, list) => {
    setSelectedMembers((current) => {
      const selected = current[section] || [];
      const ids = list.map((member) => member.id);
      const allSelected = ids.length > 0 && ids.every((id) => selected.includes(id));
      return { ...current, [section]: allSelected ? [] : ids };
    });
  };

  const runBulkAction = (section, list, action, { title, message }) => {
    const selectedIds = selectedMembers[section] || [];
    const selectedList = list.filter((member) => selectedIds.includes(member.id));
    if (selectedList.length === 0) return;

    setConfirmDialog({
      isOpen: true,
      title,
      message: `${message} (${selectedList.length} selected)`,
      onConfirm: async () => {
        try {
          await Promise.all(selectedList.map(action));
          clearSelection(section);
          await loadMembers();
        } catch (error) {
          console.error('Error running bulk action:', error);
        } finally {
          setConfirmDialog((current) => ({ ...current, isOpen: false }));
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
      course: member.course || 'BSIT',
      year: member.year || '',
      status: member.effectiveStatus || member.status || 'active'
    });
  };

  const handleEditFormChange = (event) => {
    setEditFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editingMember) return;

    setSaving(true);
    try {
      const updateData = {
        name: editFormData.name.trim(),
        fullName: editFormData.name.trim(),
        studentId: editFormData.studentId.trim(),
        course: 'BSIT',
        year: editFormData.year,
        status: editFormData.status,
        updatedAt: new Date().toISOString()
      };

      const nextStudentId = String(editFormData.studentId || '').trim();
      const previousStudentId = String(editingMember.studentId || '').trim();

      await updateMemberRecords(editingMember, updateData);

      if (previousStudentId && previousStudentId !== nextStudentId) {
        await deleteDoc(doc(db, 'memberStudentIds', previousStudentId));
      }

      if (nextStudentId && previousStudentId !== nextStudentId) {
        await setDoc(doc(db, 'memberStudentIds', nextStudentId), {
          userId: editingMember.id,
          email: editingMember.email || '',
          emailNormalized: normalizeEmail(editingMember.email || ''),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      setEditingMember(null);
      await loadMembers();
    } catch (error) {
      console.error('Error updating member:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (member) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Member',
      message: 'Are you sure you want to delete this member? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteMemberRecords(member);
          await loadMembers();
        } catch (error) {
          console.error('Error deleting member:', error);
        } finally {
          setConfirmDialog((current) => ({ ...current, isOpen: false }));
        }
      }
    });
  };

  const closeEditModal = () => {
    setEditingMember(null);
    setEditFormData({ ...emptyMemberForm, status: 'active' });
  };

  const activeMembersList = members
    .filter((member) => member.effectiveStatus === 'active')
    .filter((member) => matchesSearch(member, activeSearch));

  const inactiveMembersList = members
    .filter((member) => member.effectiveStatus === 'inactive')
    .filter((member) => matchesSearch(member, inactiveSearch));

  const activeSelected = selectedMembers.active.length;
  const inactiveSelected = selectedMembers.inactive.length;

  const renderSearch = (value, onChange, placeholder, color = 'blue') => (
    <div className="relative w-full md:w-72">
      <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-xl border bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
          color === 'slate'
            ? 'border-slate-200 focus:ring-slate-400'
            : 'border-blue-200 focus:ring-blue-400'
        }`}
      />
    </div>
  );

  const renderMemberTable = (list, section, emptyMessage, headerClass) => (
    loading ? (
      <div className="text-center py-12">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-500">Loading members...</p>
      </div>
    ) : list.length === 0 ? (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="bi bi-people text-3xl text-gray-400" aria-hidden="true"></i>
        </div>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px]">
          <thead className={headerClass}>
            <tr>
              <th className="text-left py-4 px-6 font-semibold text-white">
                <input
                  type="checkbox"
                  checked={list.length > 0 && list.every((member) => selectedMembers[section].includes(member.id))}
                  onChange={() => toggleAllMembers(section, list)}
                  className="h-4 w-4 rounded border-white/60"
                  aria-label={`Select all ${section} members`}
                />
              </th>
              <th className="text-left py-4 px-6 font-semibold text-white">Student #</th>
              <th className="text-left py-4 px-6 font-semibold text-white">Name</th>
              <th className="text-left py-4 px-6 font-semibold text-white">Course</th>
              <th className="text-left py-4 px-6 font-semibold text-white">Year</th>
              <th className="text-left py-4 px-6 font-semibold text-white">Status</th>
              <th className="text-left py-4 px-6 font-semibold text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((member, index) => (
              <tr key={member.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors`}>
                <td className="py-4 px-6">
                  <input
                    type="checkbox"
                    checked={selectedMembers[section].includes(member.id)}
                    onChange={() => toggleMemberSelection(section, member.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    aria-label={`Select ${member.name || 'member'}`}
                  />
                </td>
                <td className="py-4 px-6 text-gray-600 font-medium">{member.studentId || 'N/A'}</td>
                <td className="py-4 px-6">
                  <p className="font-semibold text-gray-900">{member.name || 'No name'}</p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </td>
                <td className="py-4 px-6 text-gray-600">{member.course || 'BSIT'}</td>
                <td className="py-4 px-6 text-gray-600">{member.year || 'N/A'}</td>
                <td className="py-4 px-6">
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${member.effectiveStatus === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {member.effectiveStatus === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditClick(member)}
                      className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors flex items-center gap-1"
                    >
                      <i className="bi bi-pencil-square" aria-hidden="true"></i>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(member)}
                      className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center gap-1"
                    >
                      <i className="bi bi-trash" aria-hidden="true"></i>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Manage Members</h1>
        <p className="text-gray-500 mt-1">Add members by Google email or import a CSV file.</p>
      </div>

      {feedback.message && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${
          feedback.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {feedback.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <i className="bi bi-people-fill text-2xl text-white" aria-hidden="true"></i>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">{members.length}</div>
              <div className="text-gray-500 text-sm">Total Members</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <i className="bi bi-check-circle-fill text-2xl text-white" aria-hidden="true"></i>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">{activeMembersList.length}</div>
              <div className="text-gray-500 text-sm">Active Members</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center shadow-lg shadow-slate-500/30">
              <i className="bi bi-pause-circle-fill text-2xl text-white" aria-hidden="true"></i>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">{inactiveMembersList.length}</div>
              <div className="text-gray-500 text-sm">Inactive Members</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/30">
              <i className="bi bi-google text-2xl text-white" aria-hidden="true"></i>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">Google</div>
              <div className="text-gray-500 text-sm">Sign-in Method</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <form onSubmit={handleAddMember} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-900">Add Google Member</h2>
            <p className="text-sm text-gray-500 mt-1">Add an approved student email before they sign in with Google.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <input name="name" value={addFormData.name} onChange={handleAddFormChange} placeholder="Full name" required className="border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input name="email" type="email" value={addFormData.email} onChange={handleAddFormChange} placeholder="student@ua.edu.ph" required className="border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input name="studentId" value={addFormData.studentId} onChange={handleAddFormChange} placeholder="Student number" className="border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <select name="year" value={addFormData.year} onChange={handleAddFormChange} className="border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Select year</option>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
            </select>
            <input
              name="course"
              value="BSIT"
              readOnly
              className="border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-gray-700 md:col-span-2"
            />
          </div>
          <button type="submit" disabled={saving} className="mt-5 w-full rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 px-4 py-3 font-semibold text-white transition-all hover:shadow-lg disabled:from-gray-300 disabled:to-gray-300">
            {saving ? 'Saving...' : 'Add Member'}
          </button>
        </form>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-900">Import CSV File</h2>
            <p className="text-sm text-gray-500 mt-1">Use columns: studentId, name, email, year. Course is always BSIT.</p>
          </div>
          <input type="file" accept=".csv,text/csv" onChange={handleCsvFile} className="w-full rounded-xl border-2 border-dashed border-gray-200 p-4 text-sm text-gray-600" />
          <textarea
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
            placeholder="studentId,name,email,year"
            rows={7}
            className="mt-4 w-full resize-none rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="button" onClick={handleCsvImport} disabled={csvImporting || !csvText.trim()} className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300">
            {csvImporting ? 'Importing...' : 'Import Members'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-blue-100/50">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <i className="bi bi-people-fill text-blue-600" aria-hidden="true"></i>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Active Members</h2>
                <p className="text-sm text-gray-500">{activeMembersList.length} active member{activeMembersList.length === 1 ? '' : 's'}</p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={activeSelected !== 1} onClick={() => handleEditClick(activeMembersList.find((member) => member.id === selectedMembers.active[0]))} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300">Edit Selected</button>
                <button type="button" disabled={activeSelected === 0} onClick={() => runBulkAction('active', activeMembersList, (member) => updateMemberRecords(member, { status: 'inactive', updatedAt: new Date().toISOString() }), { title: 'Deactivate Members', message: 'Deactivate selected members?' })} className="rounded-lg bg-slate-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-gray-300">Deactivate Selected</button>
                <button type="button" disabled={activeSelected === 0} onClick={() => runBulkAction('active', activeMembersList, deleteMemberRecords, { title: 'Delete Members', message: 'Delete selected members? This cannot be undone.' })} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300">Delete Selected</button>
              </div>
              {renderSearch(activeSearch, setActiveSearch, 'Search active...')}
            </div>
          </div>
        </div>
        {renderMemberTable(activeMembersList, 'active', 'No active members found', 'bg-gradient-to-r from-blue-600 to-blue-700')}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-slate-100/50">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <i className="bi bi-pause-circle-fill text-slate-600" aria-hidden="true"></i>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Inactive Members</h2>
                <p className="text-sm text-gray-500">{inactiveMembersList.length} inactive member{inactiveMembersList.length === 1 ? '' : 's'}</p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={inactiveSelected === 0} onClick={() => runBulkAction('inactive', inactiveMembersList, (member) => updateMemberRecords(member, { status: 'active', updatedAt: new Date().toISOString() }), { title: 'Activate Members', message: 'Activate selected members?' })} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300">Activate Selected</button>
                <button type="button" disabled={inactiveSelected === 0} onClick={() => runBulkAction('inactive', inactiveMembersList, deleteMemberRecords, { title: 'Delete Members', message: 'Delete selected members? This cannot be undone.' })} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300">Delete Selected</button>
              </div>
              {renderSearch(inactiveSearch, setInactiveSearch, 'Search inactive...', 'slate')}
            </div>
          </div>
        </div>
        {renderMemberTable(inactiveMembersList, 'inactive', 'No inactive members', 'bg-gradient-to-r from-slate-600 to-slate-700')}
      </div>

      {editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Edit Member</h2>
              <button type="button" onClick={closeEditModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <i className="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
              <input name="name" value={editFormData.name} onChange={handleEditFormChange} placeholder="Full name" required className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input name="email" type="email" value={editFormData.email} disabled className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-100 text-gray-500 cursor-not-allowed" />
              <input name="studentId" value={editFormData.studentId} onChange={handleEditFormChange} placeholder="Student ID" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="grid grid-cols-2 gap-4">
                <input
                  name="course"
                  value="BSIT"
                  readOnly
                  className="border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-gray-700"
                />
                <select name="year" value={editFormData.year} onChange={handleEditFormChange} className="border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select Year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>
              <select name="status" value={editFormData.status} onChange={handleEditFormChange} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeEditModal} className="flex-1 border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-gradient-to-r from-blue-900 to-blue-700 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:from-gray-400 disabled:to-gray-400">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((current) => ({ ...current, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Confirm"
      />
    </div>
  );
};

export default AdminMembers;
