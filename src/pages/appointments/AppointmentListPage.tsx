import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import '../../assets/styles/appointments/AppointmentFormPage.css';
import { 
  getAllAppointments, 
  getAppointmentsByPatient, 
  checkInAppointment, 
  completeAppointment, 
  cancelAppointment,
  getClinicians
} from '../../services/appointmentService';
import { getMyProfile, getCachedPatientProfile } from '../../services/patientService';
import type { AppointmentResponseDto } from '../../models/types';
import { CalendarDays, Plus, Search, Check, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AppointmentListPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const navigate = useNavigate();

  useEffect(() => {
    loadAppointments();
  }, [user]);

  const loadAppointments = async () => {
    try {
      if (!user) return;
      setLoading(true);

      if (user.role === 'PATIENT') {
        // Try cached profile first
        let profile = getCachedPatientProfile();

        try {
          if (!profile) profile = await getMyProfile();
          if (profile) {
            let data = await getAppointmentsByPatient(profile.patientId);
            // Enrich clinician names from local clinicians list when possible
            try {
              const docs = await getClinicians();
              data = data.map(a => {
                const badName = !a.clinicianName || a.clinicianName.trim() === '' ||
                  (a.patientName && a.clinicianName && a.clinicianName.trim().toLowerCase() === a.patientName.trim().toLowerCase()) ||
                  (user?.name && a.clinicianName && a.clinicianName.trim().toLowerCase() === user.name.trim().toLowerCase());
                if (badName) {
                  const found = docs.find(c => c.userId === a.clinicianId);
                  if (found) {
                    const fn = found.name?.trim().toLowerCase();
                    const pn = a.patientName?.trim().toLowerCase();
                    const un = user?.name?.trim().toLowerCase();
                    if (fn && fn !== pn && fn !== un) a.clinicianName = found.name;
                  }
                }
                return a;
              });
            } catch {}
            // Merge cached new appointment if present
            try {
              const cachedAppt = localStorage.getItem('clinic_flow_new_appointment');
              if (cachedAppt) {
                const a = JSON.parse(cachedAppt);
                if (a && a.patientId === profile.patientId && !data.find(x => x.apptId === a.apptId)) {
                  data.unshift(a);
                }
              }
            } catch {}
            setAppointments(data);
          } else {
            setAppointments([]);
          }
        } catch (err) {
          console.error('Patient appointments fetch failed', err);
          // Fallback to showing a cached new appointment if available
          try {
            const cachedAppt = localStorage.getItem('clinic_flow_new_appointment');
            if (cachedAppt) {
              const a = JSON.parse(cachedAppt);
              if (a) setAppointments([a]);
              return;
            }
          } catch {}
          throw err;
        }
      } else {
        const data = await getAllAppointments();
        setAppointments(data);
      }
    } catch (err: any) {
      console.error('Failed to load appointments', err);
      const serverMsg = err?.response?.data?.message || err?.message;
      toast.error(serverMsg || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await checkInAppointment(id);
      toast.success('Patient checked in successfully!');
      loadAppointments();
    } catch (err: any) {
      toast.error(err.message || 'Check-in failed');
    }
  };

  const handleComplete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await completeAppointment(id);
      toast.success('Appointment marked as completed!');
      loadAppointments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete appointment');
    }
  };

  const handleCancel = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await cancelAppointment(id);
      toast.success('Appointment cancelled successfully!');
      loadAppointments();
    } catch (err: any) {
      toast.error(err.message || 'Cancellation failed');
    }
  };

  const filtered = appointments.filter(appt => {
    const matchSearch =
      appt.patientName.toLowerCase().includes(search.toLowerCase()) ||
      appt.clinicianName.toLowerCase().includes(search.toLowerCase()) ||
      appt.department.toLowerCase().includes(search.toLowerCase()) ||
      appt.serviceType.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || appt.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: string) => {
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const isPatient = user?.role === 'PATIENT';
  const isReception = user?.role === 'RECEPTION' || user?.role === 'ADMIN' || user?.role === 'CLINIC_MANAGER';
  const isClinician = user?.role === 'CLINICIAN' || user?.role === 'ADMIN';

  if (loading) {
    return <div className="page-spinner"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Appointments</h1>
          <p>Schedule and manage clinical appointments and bookings</p>
        </div>
        <div className="page-header-actions">
          {/* Patients and Receptionists can book appointments */}
          {(isPatient || isReception) && (
            <button className="btn btn-primary" onClick={() => navigate('/appointments/new')}>
              <Plus size={18} />
              Book Appointment
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar appointments-filters-bar">
        <div className="header-search search-input appointments-search">
          <Search className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Search patient, doctor, department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {['ALL', 'SCHEDULED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED'].map(status => (
          <button
            key={status}
            className={`filter-chip ${statusFilter === status ? 'active' : ''}`}
            onClick={() => setStatusFilter(status)}
          >
            {status === 'ALL' ? 'All' : status.replace('_', ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><CalendarDays size={28} /></div>
          <h3>No appointments found</h3>
          <p>Try adjusting your search filters or book a new appointment.</p>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Department</th>
                <th>Service Type</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(appt => (
                <tr key={appt.apptId}>
                  <td>
                    <div className="cell-main">{appt.patientName}</div>
                    <div className="cell-sub">MRN: {appt.patientMrn}</div>
                  </td>
                  <td>
                    <span className="appt-doctor-name">{appt.clinicianName}</span>
                  </td>
                  <td>{appt.department}</td>
                  <td>
                    <span className="badge badge-primary">{appt.serviceType}</span>
                  </td>
                  <td>{formatDate(appt.startAt)}</td>
                  <td>{formatTime(appt.startAt)}</td>
                  <td>{getStatusBadge(appt.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {/* Check-In Action: for scheduled appointments, allowed for Reception */}
                      {appt.status === 'SCHEDULED' && isReception && (
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '6px 10px', fontSize: '0.75rem', height: 'auto' }}
                          onClick={(e) => handleCheckIn(appt.apptId, e)}
                          title="Check In Patient"
                        >
                          <Check size={14} style={{ marginRight: '4px' }} /> Check In
                        </button>
                      )}

                      {/* Complete Action: for checked in appointments, allowed for Clinicians or Reception */}
                      {appt.status === 'CHECKED_IN' && (isClinician || isReception) && (
                        <button 
                          className="btn btn-success" 
                          style={{ padding: '6px 10px', fontSize: '0.75rem', height: 'auto', background: 'var(--color-success)', borderColor: 'var(--color-success)', color: '#ffffff' }}
                          onClick={(e) => handleComplete(appt.apptId, e)}
                          title="Complete Appointment"
                        >
                          <Check size={14} style={{ marginRight: '4px' }} /> Complete
                        </button>
                      )}

                      {/* Cancel Action: allowed for scheduled/checked-in if Patient (for their own) or Reception */}
                      {(appt.status === 'SCHEDULED' || appt.status === 'CHECKED_IN') && (isReception || isPatient) && (
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '6px 10px', fontSize: '0.75rem', height: 'auto', background: 'transparent', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}
                          onClick={(e) => handleCancel(appt.apptId, e)}
                          title="Cancel Appointment"
                        >
                          <X size={14} style={{ marginRight: '4px' }} /> Cancel
                        </button>
                      )}

                      {/* Completed / Cancelled state placeholder */}
                      {(appt.status === 'COMPLETED' || appt.status === 'CANCELLED' || appt.status === 'NO_SHOW') && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', paddingLeft: '8px' }}>—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
