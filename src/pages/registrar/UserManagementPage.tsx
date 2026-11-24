import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { AccountDialog, CredentialsDialog } from '../../components/ui/AccountDialog';
import { provisionExistingStaff, type TemporaryCredentials } from '../../services/accountApi';
import { RoleBadge } from '../../components/ui/RoleBadge';
import { useToast } from '../../context/ToastContext';
import {
  getAllUsers,
  createUser,
  updateUser,
  toggleUserStatus,
} from '../../services/userService';
import { getAllPrograms } from '../../services/programService';
import { UserProfile, UserRole, Program } from '../../types';
import { UserPlus, Edit2, KeyRound, Power } from 'lucide-react';

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('teacher');
  const [programId, setProgramId] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [credentials, setCredentials] = useState<TemporaryCredentials | null>(null);
  const [formError, setFormError] = useState('');
  const [legacyStaff, setLegacyStaff] = useState<UserProfile | null>(null);
  const [legacyBusy, setLegacyBusy] = useState(false);
  const [legacyError, setLegacyError] = useState('');
  const { success, error } = useToast();

  const loadData = useCallback(async () => {
    try {
      const [u, p] = await Promise.all([
        getAllUsers(),
        getAllPrograms(),
      ]);
      setUsers(u);
      setPrograms(p);
    } catch {
      error('Could not refresh user accounts. Try reloading this page.');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => { void loadData(); }, [loadData]);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormError('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setRole('teacher');
    setProgramId(programs[0]?.id || '');
    setPhone('');
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setFormError('');
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setEmail(user.email);
    setRole(user.role);
    setProgramId(user.programId || '');
    setPhone(user.phone || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setFormError('');
    setIsSubmitting(true);
    try {
      const details = {firstName, lastName, email, programId, phone};
      if (editingUser) {
        await updateUser(editingUser.uid, {...details, role});
        success('User account updated.');
      } else {
        if (role === 'student') throw new Error('Create student accounts through enrollment.');
        setCredentials(await createUser({...details, role}));
        success('Staff account created.');
      }
      setIsModalOpen(false);
      await loadData();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Could not save the user account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLegacyProvision = async () => {
    if (!legacyStaff || legacyBusy) return;
    setLegacyError('');
    setLegacyBusy(true);
    try {
      const issued = await provisionExistingStaff(legacyStaff.uid);
      setLegacyStaff(null);
      setCredentials(issued);
      success('Staff sign-in configured.');
      await loadData();
    } catch (cause) {
      setLegacyError(cause instanceof Error ? cause.message : 'Could not set up staff sign-in.');
    } finally {
      setLegacyBusy(false);
    }
  };

  const handleToggleStatus = async (user: UserProfile) => {
    try {
      const next = await toggleUserStatus(user.uid, user.status);
      success(`User account is now ${next}.`);
      await loadData();
    } catch (err: any) {
      error(err.message || 'Failed to update user status.');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.idNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const columns = [
    {
      key: 'name',
      header: 'Full Name & Email',
      render: (u: UserProfile) => (
        <div>
          <div className="font-bold text-slate-800">{u.fullName}</div>
          <div className="text-xs text-slate-400">{u.email}</div>
        </div>
      ),
    },
    {
      key: 'idNumber',
      header: 'ID Number',
      render: (u: UserProfile) => <span className="font-mono text-xs font-semibold text-slate-700">{u.idNumber}</span>,
    },
    {
      key: 'role',
      header: 'Assigned Role',
      render: (u: UserProfile) => <RoleBadge role={u.role} size="sm" />,
    },
    {
      key: 'program',
      header: 'Program / Section',
      render: (u: UserProfile) => (
        <span className="text-xs text-slate-600">
          {u.programCode ? `${u.programCode} ${u.sectionName ? `(${u.sectionName})` : ''}` : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (u: UserProfile) => (
        <Badge variant={u.status === 'active' ? 'success' : 'danger'}>
          {u.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (u: UserProfile) => (
        <div className="flex flex-wrap items-center gap-1.5">
          {u.role !== 'student' && u.status === 'active' && !u.authProvisioned && (
            <Button type="button" variant="ghost" size="sm" icon={<KeyRound className="size-4" />}
              onClick={() => { setLegacyError(''); setLegacyStaff(u); }}>
              Set up sign-in
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(u)}
            icon={<Edit2 className="w-3.5 h-3.5 text-slate-500" />}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleStatus(u)}
            className={u.status === 'active' ? 'text-rose-600 hover:text-rose-700' : 'text-emerald-600 hover:text-emerald-700'}
            icon={<Power className="w-3.5 h-3.5" />}
          >
            {u.status === 'active' ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Top Action */}
      <PageHeader
        title="User Accounts Management"
        subtitle="Sole institutional administrative authority: Provision, update, and manage university accounts."
        actions={
          <Button variant="primary" size="sm" onClick={openCreateModal} icon={<UserPlus className="w-4 h-4" />}>
            Create staff account
          </Button>
        }
      />

      {/* Role Filter Tabs (8px rhythm: gap-2) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['all', 'registrar', 'program_chair', 'teacher', 'student'].map(r => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 ${
              roleFilter === r
                ? 'bg-[#142D59] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {r === 'all' ? 'All Roles' : r.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading && <p className="text-sm text-slate-600" role="status">Loading records…</p>}
      <Table
        label="User accounts"
        data={filteredUsers}
        columns={columns}
        keyExtractor={u => u.uid}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by name, email, or ID number..."
      />

      {legacyStaff && (
        <AccountDialog title="Set up staff sign-in?" busy={legacyBusy} onClose={() => setLegacyStaff(null)}>
          <p className="text-sm text-slate-700">
            Create Firebase sign-in credentials for {legacyStaff.fullName} using their existing account record.
          </p>
          {legacyError && <p role="alert" className="mt-3 text-sm text-rose-700">{legacyError}</p>}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={legacyBusy} onClick={() => setLegacyStaff(null)}>Cancel</Button>
            <Button isLoading={legacyBusy} onClick={handleLegacyProvision}>Set up sign-in</Button>
          </div>
        </AccountDialog>
      )}
      {credentials && <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />}

      {/* User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { if (!isSubmitting) setIsModalOpen(false); }}
        title={editingUser ? `Edit account: ${editingUser.fullName}` : 'Create staff account'}
        subtitle="Registrar Master Account Authority"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="First Name"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="John"
              required
            />
            <Input
              label="Last Name"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Doe"
              required
            />
          </div>

          <Input
            label={editingUser?.role === 'student' ? 'Contact email (optional)' : 'Institutional email'}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="j.doe@example.edu"
            required={editingUser?.role !== 'student'}
          />

          {editingUser?.role === 'student' ? (
            <p className="rounded-lg bg-blue-50 p-3 text-sm text-[#142D59]">
              Student account. Update program, year level, and section in Student Enrollment.
            </p>
          ) : (
            <Select label="Role assignment" value={role} onChange={event => setRole(event.target.value as UserRole)}>
              <option value="teacher">Teacher / Faculty</option>
              <option value="program_chair">Program Chair</option>
              <option value="registrar">Registrar (Admin)</option>
            </Select>
          )}

          {role === 'program_chair' && (
            <Select label="Assigned program" value={programId} onChange={event => setProgramId(event.target.value)}>
              <option value="">Select academic program</option>
              {programs.map(program => (
                <option key={program.id} value={program.id}>{program.code} - {program.name}</option>
              ))}
            </Select>
          )}

          <Input
            label="Contact Phone"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+1 (555) 000-0000"
          />

          {formError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{formError}</p>}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" size="sm" disabled={isSubmitting} onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              {editingUser ? 'Save Updates' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
