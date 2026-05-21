import { useEffect, useState } from 'react';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { isFullAdminEmail } from '../../config/adminAccess';

const normalizeEmail = (email = '') => email.trim().toLowerCase();
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
  if (member.status === 'inactive' || member.status === 'archived') return 'inactive';
  const { termEndAt } = resolveTermDates(member);
  if (termEndAt && termEndAt.getTime() <= Date.now()) return 'inactive';
  return 'active';
};

const isFullAdminUser = (user = {}) =>
  user.role === 'admin' && isFullAdminEmail(user.email);

const mergeMemberRecord = (primary, secondary) => ({
  ...secondary,
  ...primary,
  fullName: primary.fullName || secondary.fullName || primary.name || secondary.name,
  name: primary.name || primary.fullName || secondary.name || secondary.fullName,
  email: primary.email || secondary.email,
  studentId: primary.studentId || secondary.studentId,
  course: primary.course || secondary.course,
  year: primary.year || secondary.year,
  status: primary.status || secondary.status,
  role: primary.role || secondary.role,
  permissionRole: primary.permissionRole || secondary.permissionRole || '',
  permissionRoleLabel: primary.permissionRoleLabel || secondary.permissionRoleLabel || '',
  permissions: primary.permissions || secondary.permissions || [],
  createdAt: primary.createdAt || secondary.createdAt,
  sourceIds: {
    members: [...new Set([...(secondary.sourceIds?.members || []), ...(primary.sourceIds?.members || [])])],
    users: [...new Set([...(secondary.sourceIds?.users || []), ...(primary.sourceIds?.users || [])])]
  }
});

const roles = [
  {
    id: 'updates-manager',
    title: 'Updates Manager',
    scope: 'Updates page',
    description: 'Can manage updates, news posts, and site updates.',
    permissions: ['announcements']
  },
  {
    id: 'events-manager',
    title: 'Events Manager',
    scope: 'Events page',
    description: 'Can create, edit, archive, and review event registrants.',
    permissions: ['events']
  },
  {
    id: 'polls-manager',
    title: 'Polls and Voting Manager',
    scope: 'Polls page',
    description: 'Can create polls, edit poll details, close polls, and review voter names.',
    permissions: ['polls']
  },
  {
    id: 'officers-manager',
    title: 'Officers Manager',
    scope: 'Officers page',
    description: 'Can add, edit, archive, restore, and delete officer records.',
    permissions: ['officers']
  }
];

const AdminRolesPermissions = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [searchMessage, setSearchMessage] = useState('');

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const [membersSnapshot, usersSnapshot] = await Promise.all([
        getDocs(collection(db, 'members')),
        getDocs(collection(db, 'users'))
      ]);

      const membersData = membersSnapshot.docs.map(memberDoc => ({
        id: memberDoc.id,
        sourceIds: { members: [memberDoc.id], users: [] },
        ...memberDoc.data()
      }));
      const usersData = usersSnapshot.docs.map(userDoc => ({
        id: userDoc.id,
        sourceIds: { members: [], users: [userDoc.id] },
        ...userDoc.data()
      }));
      const roleAssignedMembers = membersData.filter(
        member => Array.isArray(member.permissions) && member.permissions.length > 0
      );

      await Promise.allSettled(
        roleAssignedMembers.map(member =>
          setDoc(doc(db, 'users', member.id), {
            permissionRole: member.permissionRole || '',
            permissionRoleLabel: member.permissionRoleLabel || '',
            permissions: member.permissions,
            updatedAt: new Date().toISOString()
          }, { merge: true })
        )
      );

      const combinedMap = new Map();
      usersData.forEach(user => {
        const mergeKey = user.emailNormalized || normalizeEmail(user.email) || user.id;
        combinedMap.set(mergeKey, {
          ...user,
          fullName: user.fullName || user.name,
          role: isFullAdminUser(user) ? 'admin' : (user.role || 'member')
        });
      });
      membersData.forEach(member => {
        const mergeKey = member.emailNormalized || normalizeEmail(member.email) || member.id;
        const existing = combinedMap.get(mergeKey);
        combinedMap.set(mergeKey, existing ? mergeMemberRecord(member, existing) : member);
      });

      const users = Array.from(combinedMap.values())
        .filter(user => !isFullAdminUser(user))
        .filter(user => (user.role || 'member') !== 'admin')
        .map(user => ({ ...user, effectiveStatus: deriveStatus(user) }))
        .filter(user => user.effectiveStatus === 'active')
        .sort((a, b) => (a.fullName || a.name || '').localeCompare(b.fullName || b.name || ''));

      setMembers(users);
    } catch (error) {
      console.error('Error loading role members:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRoleRecords = async (member, data) => {
    const userIds = member.sourceIds?.users?.length ? member.sourceIds.users : [member.id];
    const memberIds = member.sourceIds?.members?.length ? member.sourceIds.members : [member.id];

    await Promise.allSettled([
      ...userIds.map(userId => setDoc(doc(db, 'users', userId), data, { merge: true })),
      ...memberIds.map(memberId => setDoc(doc(db, 'members', memberId), data, { merge: true }))
    ]);
  };

  const assignRole = async (role) => {
    const member = members.find(item => item.id === selectedUser);
    if (!member) return;

    setSavingRole(role.id);
    try {
      await updateRoleRecords(member, {
        permissionRole: role.id,
        permissionRoleLabel: role.title,
        permissions: role.permissions,
        updatedAt: new Date().toISOString()
      });
      setSelectedUser('');
      setMemberSearch('');
      setSearchMessage('');
      await loadMembers();
    } catch (error) {
      console.error('Error assigning role:', error);
    } finally {
      setSavingRole('');
    }
  };

  const removeRole = async (member) => {
    setSavingRole(member.permissionRole || member.id);
    try {
      await updateRoleRecords(member, {
        permissionRole: '',
        permissionRoleLabel: '',
        permissions: [],
        updatedAt: new Date().toISOString()
      });
      await loadMembers();
    } catch (error) {
      console.error('Error removing role:', error);
    } finally {
      setSavingRole('');
    }
  };

  const getRoleManagers = (roleId) => members.filter(member => member.permissionRole === roleId);
  const memberSearchMatches = memberSearch.trim()
    ? members.filter(member => {
      const query = memberSearch.trim().toLowerCase();
      return [member.fullName, member.name, member.email, member.studentId]
        .map(value => String(value || '').toLowerCase())
        .some(value => value.includes(query));
    }).slice(0, 5)
    : [];

  const handleSearchMember = () => {
    if (memberSearchMatches.length === 0) {
      setSelectedUser('');
      setSearchMessage('No active member found.');
      return;
    }

    setSelectedUser(memberSearchMatches[0].id);
    setSearchMessage('');
  };

  const selectedMember = members.find(member => member.id === selectedUser);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Roles & Permissions</h1>
        <p className="text-gray-500 mt-1">Assign page managers while the primary admin keeps full access.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Assign Member</h2>
            <p className="text-sm text-gray-500">Choose an active member, then add them to one of the roles below.</p>
          </div>
          <div className="w-full lg:max-w-md">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search active member</label>
            <div className="flex gap-2">
              <input
                type="search"
                value={memberSearch}
                onChange={(event) => {
                  setMemberSearch(event.target.value);
                  setSearchMessage('');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleSearchMember();
                  }
                }}
                placeholder="Name, email, or student number"
                className="min-w-0 flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleSearchMember}
                className="shrink-0 rounded-xl bg-blue-900 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-800"
              >
                Search
              </button>
            </div>
            {searchMessage && <p className="mt-2 text-sm text-red-600">{searchMessage}</p>}
            {selectedMember && (
              <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
                Selected: {selectedMember.fullName || selectedMember.name || selectedMember.email}
              </p>
            )}
            {memberSearchMatches.length > 0 && (
              <div className="mt-2 space-y-1">
                {memberSearchMatches.map(member => (
                  <button
                    type="button"
                    key={member.id}
                    onClick={() => {
                      setSelectedUser(member.id);
                      setSearchMessage('');
                    }}
                    className="block w-full rounded-lg border border-gray-100 px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    <span className="font-semibold text-gray-900">{member.fullName || member.name || 'Unnamed member'}</span>
                    <span className="block text-xs text-gray-500">{member.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500">Loading roles...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {roles.map(role => {
            const managers = getRoleManagers(role.id);
            return (
              <div key={role.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{role.title}</h2>
                    <p className="text-sm font-semibold text-blue-700 mt-1">Scope: {role.scope}</p>
                    <p className="text-gray-600 mt-3">{role.description}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {managers.length} manager{managers.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {role.permissions.map(permission => (
                    <span key={permission} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700">
                      {permission}
                    </span>
                  ))}
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Current Managers</h3>
                  {managers.length === 0 ? (
                    <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">No managers assigned yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {managers.map(manager => (
                        <div key={manager.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-4 py-3">
                          <div>
                            <p className="font-semibold text-gray-900">{manager.fullName || manager.name || 'Unnamed member'}</p>
                            <p className="text-xs text-gray-500">{manager.email}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeRole(manager)}
                            disabled={savingRole === role.id || savingRole === manager.permissionRole}
                            className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => assignRole(role)}
                  disabled={!selectedUser || savingRole === role.id}
                  className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 px-4 py-3 font-semibold text-white transition-all hover:shadow-lg disabled:from-gray-300 disabled:to-gray-300 disabled:shadow-none"
                >
                  {savingRole === role.id ? 'Saving...' : `Assign ${role.title}`}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminRolesPermissions;
