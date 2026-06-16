import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Stethoscope,
  Pill,
  FlaskConical,
  Package,
  FileText,
  BarChart3,
  Shield,
  Activity,
  LogOut,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: string[];
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} />, roles: ['ADMIN', 'CLINICIAN', 'RECEPTION', 'PHARMACIST', 'LAB_TECHNICIAN', 'FINANCE_OFFICER', 'CLINIC_MANAGER', 'PATIENT'] },
    ],
  },
  {
    title: 'Clinical',
    items: [
      { label: 'Patients', path: '/patients', icon: <Users size={20} />, roles: ['ADMIN', 'CLINICIAN', 'RECEPTION', 'CLINIC_MANAGER'] },
      { label: 'Appointments', path: '/appointments', icon: <CalendarDays size={20} />, roles: ['ADMIN', 'CLINICIAN', 'RECEPTION', 'CLINIC_MANAGER', 'PATIENT'] },
      { label: 'Encounters', path: '/encounters', icon: <Stethoscope size={20} />, roles: ['ADMIN', 'CLINICIAN'] },
      { label: 'Prescriptions', path: '/prescriptions', icon: <Pill size={20} />, roles: ['ADMIN', 'CLINICIAN', 'PATIENT'] },
    ],
  },
  {
    title: 'Diagnostics',
    items: [
      { label: 'Lab Orders', path: '/lab', icon: <FlaskConical size={20} />, roles: ['ADMIN', 'CLINICIAN', 'LAB_TECHNICIAN'] },
    ],
  },
  {
    title: 'Pharmacy',
    items: [
      { label: 'Dispensing', path: '/pharmacy', icon: <Activity size={20} />, roles: ['ADMIN', 'PHARMACIST', 'CLINICIAN'] },
      { label: 'Inventory', path: '/inventory', icon: <Package size={20} />, roles: ['ADMIN', 'PHARMACIST', 'CLINIC_MANAGER'] },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Invoices', path: '/invoices', icon: <FileText size={20} />, roles: ['ADMIN', 'FINANCE_OFFICER', 'CLINIC_MANAGER', 'RECEPTION'] },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Reports', path: '/reports', icon: <BarChart3 size={20} />, roles: ['ADMIN', 'CLINIC_MANAGER', 'FINANCE_OFFICER'] },
      { label: 'Users', path: '/admin/users', icon: <Shield size={20} />, roles: ['ADMIN'] },
    ],
  },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const filteredSections = navSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => user && item.roles.includes(user.role)),
    }))
    .filter(section => section.items.length > 0);

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'show' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <Stethoscope size={20} />
          </div>
          <h2>Clinic Flow</h2>
        </div>

        <nav className="sidebar-nav">
          {filteredSections.map(section => (
            <div key={section.title}>
              <div className="sidebar-section-title">{section.title}</div>
              {section.items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive || location.pathname.startsWith(item.path + '/') ? 'active' : ''}`
                  }
                  onClick={onClose}
                >
                  <span className="icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-user" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }} title="View Profile">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info" style={{ overflow: 'hidden' }}>
            <div className="sidebar-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div className="sidebar-user-role">{user?.role.replace('_', ' ').toLowerCase()}</div>
          </div>
          <button className="sidebar-logout-btn" onClick={(e) => { e.stopPropagation(); logout(); }} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
    </>
  );
}
