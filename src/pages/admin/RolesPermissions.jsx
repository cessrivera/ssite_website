import { useEffect, useState } from 'react';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

const PRIMARY_ADMIN_EMAIL = 'pderivera.student@ua.edu.ph';
const normalizeEmail = (email = '') => email.trim().toLowerCase();

const roles = [
  {
    id: 'updates-manager',
    title: 'Updates Manager',
    scope: 'Announcements and updates',
    description: 'Can manage announcements, news posts, and site updates.',
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

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs
        .map(userDoc => ({ id: userDoc.id, ...userDoc.data() }))
        .filter(user => normalizeEmail(user.email) !== normalizeEmail(PRIMARY_ADMIN_EMAIL))
        .filter(user => (user.status || 'active') === 'active')
        .sort((a, b) => (a.fullName || a.name || '').localeCompare(b.fullName || b.name || ''));

      setMembers(users);
    } catch (error) {
      console.error('Error loading role members:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRoleRecords = async (member, data) => {
    await Promise.allSettled([
      updateDoc(doc(db, 'users', member.id), data),
      updateDoc(doc(db, 'members', member.id), data)
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
            <label className="block text-sm font-semibold text-gray-700 mb-2">Active member</label>
            <select
              value={selectedUser}
              onChange={(event) => setSelectedUser(event.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select member</option>
              {members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.fullName || member.name || member.email} {member.permissionRoleLabel ? `- ${member.permissionRoleLabel}` : ''}
                </option>
              ))}
            </select>
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
