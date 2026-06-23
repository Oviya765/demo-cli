import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getPrescriptionsByPatientId } from '../../services/prescriptionService';
import { getOrdersByPatientId } from '../../services/labService';
import { getAllInvoices } from '../../services/invoiceService';
import type { PatientResponseDto, AppointmentResponseDto, PrescriptionResponseDto, LabOrderResponseDto, InvoiceResponseDto } from '../../models/types';
import {
  CalendarDays,
  Pill,
  FlaskConical,
  FileText,
  Plus,
  Eye,
  Download,
} from 'lucide-react';

interface PatientRoleDashboardProps {
  profile: PatientResponseDto;
  appointments: AppointmentResponseDto[];
}

export default function PatientRoleDashboard({ profile, appointments }: PatientRoleDashboardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [prescriptions, setPrescriptions] = useState<PrescriptionResponseDto[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrderResponseDto[]>([]);
  const [invoices, setInvoices] = useState<InvoiceResponseDto[]>([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rxs, labs, invs] = await Promise.all([
        getPrescriptionsByPatientId(profile.patientId).catch(() => []),
        getOrdersByPatientId(profile.patientId).catch(() => []),
        getAllInvoices().catch(() => []),
      ]);
      setPrescriptions(rxs);
      setLabOrders(labs);
      setInvoices(invs.filter(i => i.patientId === profile.patientId));
    } catch (err: any) {
      console.error('Patient dashboard load error', err);
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingAppointments = appointments.filter(a => a.startAt >= todayStr && a.status === 'SCHEDULED');
  const pendingBills = invoices.filter(i => i.status === 'ISSUED' || i.status === 'OVERDUE' || i.status === 'UNPAID');

  const stats = [
    { label: 'Upcoming Appointments', value: upcomingAppointments.length.toString(), icon: <CalendarDays size={22} />, color: 'primary' },
    { label: 'Prescriptions', value: prescriptions.length.toString(), icon: <Pill size={22} />, color: 'success' },
    { label: 'Lab Reports', value: labOrders.length.toString(), icon: <FlaskConical size={22} />, color: 'info' },
    { label: 'Bills', value: pendingBills.length.toString(), icon: <FileText size={22} />, color: 'warning' },
  ];

  return (
    <div>
      {/* Welcome */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
          Welcome, {user?.name?.split(' ')[0]} 👋
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Your health overview and quick access to services.
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
          <div className="quick-action-card" onClick={() => navigate('/appointments/new')}>
            <div className="qa-icon" style={{ background: 'var(--color-primary-100)', color: 'var(--color-primary-dark)' }}>
              <Plus size={24} />
            </div>
            <h4>Book Appointment</h4>
            <p>Schedule a visit</p>
          </div>
          <div className="quick-action-card" onClick={() => navigate('/prescriptions')}>
            <div className="qa-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
              <Eye size={24} />
            </div>
            <h4>View Prescription</h4>
            <p>Your medications</p>
          </div>
          <div className="quick-action-card" onClick={() => navigate('/lab')}>
            <div className="qa-icon" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
              <Download size={24} />
            </div>
            <h4>Download Reports</h4>
            <p>Lab test results</p>
          </div>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarDays size={18} style={{ color: 'var(--color-primary)' }} />
            Upcoming Appointments
          </h3>
          <span className="badge badge-primary">{upcomingAppointments.length}</span>
        </div>
        <div className="card-body" style={{ padding: '16px 0 0' }}>
          {upcomingAppointments.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>No upcoming appointments.</p>
            </div>
          ) : (
            <div className="data-table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Department</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingAppointments.slice(0, 5).map((appt, i) => (
                    <tr key={i}>
                      <td className="cell-main">{appt.clinicianName}</td>
                      <td>{appt.department || appt.serviceType}</td>
                      <td>{new Date(appt.startAt).toLocaleDateString()}</td>
                      <td><span className="badge badge-warning"><span className="badge-dot"></span>Scheduled</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
