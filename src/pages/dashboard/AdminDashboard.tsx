import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllPatients } from '../../services/patientService';
import { getAllUsers } from '../../services/adminUserService';
import { getAllAppointments } from '../../services/appointmentService';
import { getAllInvoices } from '../../services/invoiceService';
import { getAllPayments } from '../../services/paymentService';
import { getAllPrescriptions } from '../../services/prescriptionService';
import { getAllOrders } from '../../services/labService';
import type { PatientResponseDto, UserResponseDto, AppointmentResponseDto, InvoiceResponseDto, PaymentResponseDto, PrescriptionResponseDto, LabOrderResponseDto } from '../../models/types';
import { toast } from 'react-hot-toast';
import {
  Users,
  CalendarDays,
  DollarSign,
  FileText,
  FlaskConical,
  UserPlus,
  BarChart3,
  Shield,
  Settings,
  AlertCircle,
} from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [patients, setPatients] = useState<PatientResponseDto[]>([]);
  const [staff, setStaff] = useState<UserResponseDto[]>([]);
  const [appointments, setAppointments] = useState<AppointmentResponseDto[]>([]);
  const [invoices, setInvoices] = useState<InvoiceResponseDto[]>([]);
  const [payments, setPayments] = useState<PaymentResponseDto[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionResponseDto[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrderResponseDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pats, users, appts, invs, pays, rxs, labs] = await Promise.all([
        getAllPatients().catch(() => []),
        getAllUsers().catch(() => []),
        getAllAppointments().catch(() => []),
        getAllInvoices().catch(() => []),
        getAllPayments().catch(() => []),
        getAllPrescriptions().catch(() => []),
        getAllOrders().catch(() => []),
      ]);
      setPatients(pats);
      setStaff(users);
      setAppointments(appts);
      setInvoices(invs);
      setPayments(pays);
      setPrescriptions(rxs);
      setLabOrders(labs);
    } catch (err: any) {
      console.error('Admin dashboard load error', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="page-spinner"><div className="spinner"></div></div>;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(a => a.startAt.startsWith(todayStr));
  const pendingBills = invoices.filter(i => i.status === 'ISSUED' || i.status === 'OVERDUE' || i.status === 'UNPAID');
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

  const stats = [
    { label: 'Total Patients', value: patients.length.toString(), icon: <Users size={22} />, color: 'primary' },
    { label: 'Total Staff', value: staff.length.toString(), icon: <Shield size={22} />, color: 'info' },
    { label: "Today's Appointments", value: todayAppointments.length.toString(), icon: <CalendarDays size={22} />, color: 'warning' },
    { label: 'Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: <DollarSign size={22} />, color: 'success' },
    { label: 'Pending Bills', value: pendingBills.length.toString(), icon: <FileText size={22} />, color: 'warning' },
    { label: 'Lab Orders', value: labOrders.length.toString(), icon: <FlaskConical size={22} />, color: 'info' },
  ];

  const recentPatients = [...patients].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const recentPayments = [...payments].sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()).slice(0, 5);
  const recentPrescriptions = [...prescriptions].sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()).slice(0, 5);

  return (
    <div>
      {/* Welcome */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
          Admin Dashboard 🛡️
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          System overview and management controls.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '32px' }}>
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <div className={`stat-card-icon ${stat.color}`}>{stat.icon}</div>
            <div className="stat-card-info">
              <h3>{stat.value}</h3>
              <p>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Quick Actions</h3>
        <div className="quick-actions">
          <div className="quick-action-card" onClick={() => navigate('/admin')}>
            <div className="qa-icon" style={{ background: 'var(--color-primary-100)', color: 'var(--color-primary-dark)' }}>
              <UserPlus size={24} />
            </div>
            <h4>Add User</h4>
            <p>Create new staff account</p>
          </div>
          <div className="quick-action-card" onClick={() => navigate('/reports')}>
            <div className="qa-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
              <BarChart3 size={24} />
            </div>
            <h4>View Reports</h4>
            <p>System analytics</p>
          </div>
          <div className="quick-action-card" onClick={() => navigate('/admin')}>
            <div className="qa-icon" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
              <Shield size={24} />
            </div>
            <h4>Manage Roles</h4>
            <p>User role management</p>
          </div>
          <div className="quick-action-card" onClick={() => navigate('/admin')}>
            <div className="qa-icon" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
              <Settings size={24} />
            </div>
            <h4>System Settings</h4>
            <p>Configure clinic system</p>
          </div>
        </div>
      </div>

      {/* Recent Activity Tables */}
      <div className="dashboard-grid">
        {/* Recently Registered Patients */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} style={{ color: 'var(--color-primary)' }} />
              Recently Registered Patients
            </h3>
            <span className="badge badge-primary">{recentPatients.length}</span>
          </div>
          <div className="activity-list">
            {recentPatients.map((p, i) => (
              <div className="activity-item" key={i}>
                <div className="activity-dot" style={{ background: 'var(--color-primary)' }} />
                <div className="activity-content">
                  <p>{p.name}</p>
                  <span>MRN: {p.mrn} • {new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {recentPatients.length === 0 && (
              <div className="activity-item"><div className="activity-content"><p>No recent registrations</p></div></div>
            )}
          </div>
        </div>

        {/* Latest Payments */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={18} style={{ color: 'var(--color-success)' }} />
              Latest Payments
            </h3>
            <span className="badge badge-success">{recentPayments.length}</span>
          </div>
          <div className="activity-list">
            {recentPayments.map((p, i) => (
              <div className="activity-item" key={i}>
                <div className="activity-dot" style={{ background: 'var(--color-success)' }} />
                <div className="activity-content">
                  <p>{p.patientName} — ₹{p.amount.toLocaleString()}</p>
                  <span>{p.method} • {new Date(p.paidAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {recentPayments.length === 0 && (
              <div className="activity-item"><div className="activity-content"><p>No recent payments</p></div></div>
            )}
          </div>
        </div>
      </div>

      {/* Latest Prescriptions */}
      <div style={{ marginTop: 'var(--space-lg)' }}>
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} style={{ color: 'var(--color-warning)' }} />
              Latest Prescriptions
            </h3>
            <span className="badge badge-warning">{recentPrescriptions.length}</span>
          </div>
          <div className="activity-list">
            {recentPrescriptions.map((rx, i) => (
              <div className="activity-item" key={i}>
                <div className="activity-dot" style={{ background: 'var(--color-warning)' }} />
                <div className="activity-content">
                  <p>{rx.patientName} — {rx.medicationName}</p>
                  <span>By {rx.clinicianName} • {new Date(rx.issuedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {recentPrescriptions.length === 0 && (
              <div className="activity-item"><div className="activity-content"><p>No recent prescriptions</p></div></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
