import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getAllUsers,
  createUser,
  updateUser,
  deactivateUser,
} from '../../services/adminUserService';
import type { UserResponseDto } from '../../models/types';
import {
  UserPlus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  Shield,
  Stethoscope,
  FlaskConical,
  X,
  Users,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { validatePassword } from '../../utils/validation';

const AVAILABLE_ROLES = [
  'CLINICIAN',
  'LAB_TECHNICIAN',
  'ADMIN',
  'PHARMACIST',
  'RECEPTION',
  'FINANCE_OFFICER',
];

const SUPPORTED_ROLES = new Set([
  'ADMIN',
  'PATIENT',
  'RECEPTION',
  'CLINICIAN',
  'PHARMACIST',
  'LAB_TECHNICIAN',
  'FINANCE_OFFICER',
]);

const normalizeRoleForApi = (roleName: string): string => {
  const normalized = (roleName || '').toUpperCase().trim();
  if (normalized === 'COMPLIANCE_OFFICER') return 'ADMIN';
  return SUPPORTED_ROLES.has(normalized) ? normalized : 'CLINICIAN';
};

export default function AdminUserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [selectedUser, setSelectedUser] = useState<UserResponseDto | null>(null);

  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CLINICIAN');
  const [status, setStatus] = useState('ACTIVE');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalMode('CREATE');
    setSelectedUser(null);
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setRole('CLINICIAN');
    setStatus('ACTIVE');
    setShowPassword(false);
    setShowModal(true);
  };

  const openEditModal = (user: UserResponseDto) => {
    setModalMode('EDIT');
    setSelectedUser(user);
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone || '');
    setPassword('');
    setRole(user.role);
    setStatus(user.status);
    setShowPassword(false);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim() || !phone.trim() || !role) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (modalMode === 'CREATE' && !password) {
      toast.error('Password is required for new users.');
      return;
    }

    if (modalMode === 'CREATE') {
      const passwordCheck = validatePassword(password);
      if (!passwordCheck.isValid) {
        toast.error(passwordCheck.error || 'Password is not strong enough.');
        return;
      }
    } else if (modalMode === 'EDIT' && password.trim()) {
      const passwordCheck = validatePassword(password);
      if (!passwordCheck.isValid) {
        toast.error(passwordCheck.error || 'Password is not strong enough.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (modalMode === 'CREATE') {
        const payload = {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          role: normalizeRoleForApi(role),
          status
        };
        await createUser(payload);
        toast.success('User account created successfully!');
      } else if (modalMode === 'EDIT' && selectedUser) {
        const payload = {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          role: normalizeRoleForApi(role),
          status,
          ...(password.trim() ? { password } : {})
        };
        await updateUser(selectedUser.userId, payload);
        toast.success('User account updated successfully!');
      }
      setShowModal(false);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit user details');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (userId: number) => {
    if (userId === currentUser?.userId) {
      toast.error('You cannot deactivate your own administrative session!');
      return;
    }

    if (!window.confirm('Are you sure you want to suspend/deactivate this user?')) {
      return;
    }

    try {
      await deactivateUser(userId);
      toast.success('User deactivated/suspended.');
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to deactivate user');
    }
  };

  const handleReactivate = async (u: UserResponseDto) => {
    try {
      const payload = {
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: normalizeRoleForApi(u.role),
        status: 'ACTIVE'
      };
      await updateUser(u.userId, payload);
      toast.success('User reactivated successfully!');
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reactivate user');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm));
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // KPI calculations
  const totalUsers = users.length;
  const totalClinicians = users.filter(u => u.role === 'CLINICIAN').length;
  const totalLabTechs = users.filter(u => u.role === 'LAB_TECHNICIAN').length;
  const totalInactive = users.filter(u => u.status === 'INACTIVE').length;

  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case 'ADMIN': return <Shield size={14} />;
      case 'CLINICIAN': return <Stethoscope size={14} />;
      case 'LAB_TECHNICIAN': return <FlaskConical size={14} />;
      default: return <UserCheck size={14} />;
    }
  };

  const getRoleBadgeClass = (roleName: string) => {
    switch (roleName) {
      case 'ADMIN': return 'badge-danger';
      case 'CLINICIAN': return 'badge-primary';
      case 'LAB_TECHNICIAN': return 'badge-info';
      case 'PHARMACIST': return 'badge-warning';
      default: return 'badge-neutral';
    }
  };

  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatRole = (role: string) => {
    return role.replace(/_/g, ' ');
  };

  if (loading) {
    return <div className="page-spinner"><div className="spinner"></div></div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p>Configure administrative access, staff credentials, and security roles</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={openCreateModal}>
            <UserPlus size={18} />
            Create User Account
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div className="stat-card">
          <div className="stat-card-icon primary"><Users size={20} /></div>
          <div className="stat-card-info">
            <h3>{totalUsers}</h3>
            <p>Total Registered Users</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon info"><Stethoscope size={20} /></div>
          <div className="stat-card-info">
            <h3>{totalClinicians}</h3>
            <p>Medical Clinicians</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon success"><FlaskConical size={20} /></div>
          <div className="stat-card-info">
            <h3>{totalLabTechs}</h3>
            <p>Lab Technicians</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon danger"><AlertTriangle size={20} /></div>
          <div className="stat-card-info">
            <h3>{totalInactive}</h3>
            <p>Suspended/Inactive Users</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filters-bar" style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
        <div className="header-search search-input" style={{ flex: 1, maxWidth: '360px' }}>
          <Search className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Search by Name, Email, or Phone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['ALL', 'CLINICIAN', 'LAB_TECHNICIAN', 'ADMIN', 'PHARMACIST', 'RECEPTION'].map(roleOpt => (
            <button
              key={roleOpt}
              className={`filter-chip ${roleFilter === roleOpt ? 'active' : ''}`}
              onClick={() => setRoleFilter(roleOpt)}
            >
              {roleOpt === 'ALL' ? 'All Roles' : roleOpt.replace('_', ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Users Data Table */}
      {filteredUsers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Users size={28} /></div>
          <h3>No users found</h3>
          <p>No account entries match your filters/search query.</p>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Phone Number</th>
                <th>Role Assignment</th>
                <th>Created Date</th>
                <th>System Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.userId}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: u.status === 'ACTIVE' ? 'linear-gradient(135deg, #06b6d4, #8b5cf6)' : 'rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: u.status === 'ACTIVE' ? 'white' : 'var(--color-text-muted)',
                        fontSize: '0.85rem',
                        fontWeight: 600
                      }}>
                        {getInitials(u.name)}
                      </div>
                      <div>
                        <div className="cell-main">{u.name} {u.userId === currentUser?.userId && <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontStyle: 'italic' }}>(you)</span>}</div>
                        <div className="cell-sub">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{u.phone || '—'}</td>
                  <td>
                    <span className={`badge ${getRoleBadgeClass(u.role)}`}>
                      {getRoleIcon(u.role)}
                      <span style={{ marginLeft: '4px' }}>{formatRole(u.role)}</span>
                    </span>
                  </td>
                  <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                  <td>
                    {u.status === 'ACTIVE' ? (
                      <span className="badge badge-success"><span className="badge-dot"></span>Active</span>
                    ) : (
                      <span className="badge badge-danger"><span className="badge-dot"></span>Suspended</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="actions-cell" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                      {u.userId === currentUser?.userId ? (
                        <span style={{ color: 'var(--color-text-muted)', paddingRight: '8px', userSelect: 'none' }}>—</span>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon btn-sm"
                            title="Edit User Details"
                            onClick={() => openEditModal(u)}
                          >
                            <Edit2 size={14} />
                          </button>
                          {u.status === 'ACTIVE' ? (
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon btn-sm"
                              title="Suspend/Deactivate User"
                              style={{ color: 'var(--color-danger)' }}
                              onClick={() => handleDeactivate(u.userId)}
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon btn-sm"
                              title="Reactivate User"
                              style={{ color: 'var(--color-success)' }}
                              onClick={() => handleReactivate(u)}
                            >
                              <CheckCircle size={14} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Floating Modal for Add/Edit User */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '520px',
            maxHeight: '92vh',
            overflowY: 'auto',
            position: 'relative',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-xl)',
            padding: '32px'
          }}>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              style={{ position: 'absolute', top: '16px', right: '16px' }}
              onClick={() => setShowModal(false)}
            >
              <X size={18} />
            </button>

            <h2 style={{ marginBottom: '24px' }}>
              {modalMode === 'CREATE' ? 'Register New Staff Member' : 'Modify User Credentials'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Dr. Asha Mehta"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address <span className="required">*</span></label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. asha.mehta@clinicflow.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number <span className="required">*</span></label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g. +91 98765 00001"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Security Password {modalMode === 'EDIT' && <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(leave blank to keep unchanged)</span>}
                  {modalMode === 'CREATE' && <span className="required">*</span>}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder={modalMode === 'CREATE' ? 'Min. 8 chars (caps, small, digit, symbol)' : '••••••••'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required={modalMode === 'CREATE'}
                    minLength={8}
                  />
                  <button
                    type="button"
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-text-muted)'
                    }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Role Assignment <span className="required">*</span></label>
                  <select
                    className="form-select"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    disabled={modalMode === 'EDIT' && selectedUser?.userId === currentUser?.userId}
                  >
                    {AVAILABLE_ROLES.map(r => (
                      <option key={r} value={r}>
                        {r.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">System Status <span className="required">*</span></label>
                  <select
                    className="form-select"
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    disabled={modalMode === 'EDIT' && selectedUser?.userId === currentUser?.userId}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">SUSPENDED</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save User Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
