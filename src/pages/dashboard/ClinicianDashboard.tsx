import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAllEncounters } from '../../services/encounterService';
import { getAllPrescriptions } from '../../services/prescriptionService';
import { getAllOrders } from '../../services/labService';
import { getAllAppointments } from '../../services/appointmentService';
import type { EncounterResponseDto, PrescriptionResponseDto, LabOrderResponseDto, AppointmentResponseDto } from '../../models/types';
import { toast } from 'react-hot-toast';
import {
  Stethoscope,
  Users,
  Clock,
  FlaskConical,
  Plus,
  Search,
  Pill,
} from 'lucide-react';

export default function ClinicianDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [encounters, setEncounters] = useState<EncounterResponseDto[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionResponseDto[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrderResponseDto[]>([]);
  const [appointments, setAppointments] = useState<AppointmentResponseDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [encs, rxs, labs, appts] = await Promise.all([
        getAllEncounters(),
        getAllPrescriptions(),
        getAllOrders(),
        getAllAppointments(),
      ]);
      setEncounters(encs);
      setPrescriptions(rxs);
      setLabOrders(labs);
      setAppointments(appts);
    } catch (err: any) {
      console.error('Clinician dashboard load error', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="page-spinner"><div className="spinner"></div></div>;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todayEncounters = encounters.filter(e => e.startAt?.startsWith(todayStr));
  const patientsSeen = todayEncounters.filter(e => e.status === 'COMPLETED').length;
  const pendingEncounters = encounters.filter(e => e.status === 'IN_PROGRESS').length;
  const pendingPrescriptions = prescriptions.filter(rx => rx.status === 'DRAFT' || rx.status === 'ISSUED').length;
  const labOrdersRequested = labOrders.filter(l => l.status === 'ORDERED').length;

  // Today's patients from appointments
  const todayPatients = appointments
    .filter(a => a.startAt.startsWith(todayStr))
    .slice(0, 10);

  // Recent encounters
  const recentEncounters = [...encounters]
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
    .slice(0, 5);

  const stats = [
    { label: "Today's Encounters", value: todayEncounters.length.toString(), icon: <Stethoscope size={22} />, color: 'primary' },
    { label: 'Patients Seen', value: patientsSeen.toString(), icon: <Users size={22} />, color: 'success' },
    { label: 'Pending Encounters', value: pendingEncounters.toString(), icon: <Clock size={22} />, color: 'warning' },
    { label: 'Pending Prescriptions', value: pendingPrescriptions.toString(), icon: <Pill size={22} />, color: 'info' },
    { label: 'Lab Orders Requested', value: labOrdersRequested.toString(), icon: <FlaskConical size={22} />, color: 'warning' },
  ];

  const getApptStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      'SCHEDULED': { cls: 'badge-warning', label: 'Scheduled' },
      'CHECKED_IN': { cls: 'badge-info', label: 'Checked In' },
      'COMPLETED': { cls: 'badge-success', label: 'Completed' },
      'CANCELLED': { cls: 'badge-danger', label: 'Cancelled' },
      'NO_SHOW': { cls: 'badge-neutral', label: 'No Show' },
    };
    const s = map[status] || { cls: 'badge-neutral', label: status };
    return <span className={`badge ${s.cls}`}><span className="badge-dot"></span>{s.label}</span>;
  };

  return (
    <div>
      {/* Welcome */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
          Good day, Dr. {user?.name?.split(' ')[0]} 🩺
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Manage your encounters and patient consultations.
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
          <div className="quick-action-card" onClick={() => navigate('/encounters/new')}>
            <div className="qa-icon" style={{ background: 'var(--color-primary-100)', color: 'var(--color-primary-dark)' }}>
              <Plus size={24} />
            </div>
            <h4>New Encounter</h4>
            <p>Start a clinical visit</p>
          </div>
          <div className="quick-action-card" onClick={() => navigate('/patients')}>
            <div className="qa-icon" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
              <Search size={24} />
            </div>
            <h4>Search Patient</h4>
            <p>Find patient records</p>
          </div>
          <div className="quick-action-card" onClick={() => navigate('/prescriptions')}>
            <div className="qa-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
              <Pill size={24} />
            </div>
            <h4>View Prescriptions</h4>
            <p>Manage medications</p>
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className="dashboard-grid">
        {/* Today's Patients */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} style={{ color: 'var(--color-warning)' }} />
              Today's Patients
            </h3>
            <span className="badge badge-warning">{todayPatients.length}</span>
          </div>
          <div className="card-body" style={{ padding: '16px 0 0' }}>
            {todayPatients.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>No patients scheduled for today.</p>
              </div>
            ) : (
              <div className="data-table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Chief Complaint</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayPatients.map((appt, i) => (
                      <tr key={i}>
                        <td className="cell-main">{appt.patientName}</td>
                        <td>{appt.serviceType || '—'}</td>
                        <td>{getApptStatusBadge(appt.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent Encounters */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Stethoscope size={18} style={{ color: 'var(--color-primary)' }} />
              Recent Encounters
            </h3>
            <span className="badge badge-primary">{recentEncounters.length}</span>
          </div>
          <div className="card-body" style={{ padding: '16px 0 0' }}>
            {recentEncounters.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>No encounters yet.</p>
              </div>
            ) : (
              <div className="data-table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Encounter ID</th>
                      <th>Patient</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEncounters.map((enc, i) => (
                      <tr key={i}>
                        <td className="cell-main">#{enc.encounterId}</td>
                        <td>{enc.patientName}</td>
                        <td>{new Date(enc.startAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
