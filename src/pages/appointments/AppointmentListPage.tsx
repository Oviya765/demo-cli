import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import '../../assets/styles/appointments/AppointmentFormPage.css';
import { 
  getAllAppointments, 
  getAppointmentsByPatient, 
  checkInAppointment, 
  cancelAppointment,
  getClinicians
} from '../../services/appointmentService';
import { getMyProfile } from '../../services/patientService';
import { getAllEncounters } from '../../services/encounterService';
import type { AppointmentResponseDto } from '../../models/types';
import {
  CalendarDays,
  Plus,
  Search,
  Check,
  X,
  Stethoscope,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AppointmentListPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();
  const PATIENT_ITEMS_PER_PAGE = 8;
  const CLINICIAN_ITEMS_PER_PAGE = 8;
  const DEFAULT_ITEMS_PER_PAGE = 8;
  const AUTO_CANCEL_AFTER_MINUTES = 30;

  const isAutoCancelRole = (role?: string) =>
    role === 'RECEPTION' || role === 'ADMIN' || role === 'CLINICIAN';

  useEffect(() => {
    loadAppointments();
  }, [user]);

  const loadAppointments = async () => {
    try {
      if (!user) return;
      setLoading(true);

      if (user.role === 'PATIENT') {
        try {
          const profile = await getMyProfile();
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
            setAppointments(data);
          } else {
            setAppointments([]);
          }
        } catch (err) {
          console.error('Patient appointments fetch failed', err);
          throw err;
        }
      } else {
        let data = await getAllAppointments();

        if (isAutoCancelRole(user.role)) {
          const cutoffTime = Date.now() - AUTO_CANCEL_AFTER_MINUTES * 60 * 1000;
          const overdueScheduled = data.filter(appt => {
            if (appt.status !== 'SCHEDULED') return false;
            const startTime = new Date(appt.startAt).getTime();
            if (Number.isNaN(startTime)) return false;
            return startTime <= cutoffTime;
          });

          if (overdueScheduled.length > 0) {
            await Promise.allSettled(overdueScheduled.map(appt => cancelAppointment(appt.apptId)));
            data = await getAllAppointments();
          }
        }

        // Clinicians should only see appointments booked with them
        if (user.role === 'CLINICIAN') {
          setAppointments(data.filter(a => a.clinicianId === user.userId));
        } else {
          setAppointments(data);
        }
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

  const handleNewEncounter = async (appt: AppointmentResponseDto, e: React.MouseEvent) => {
    e.stopPropagation();
    if (appt.status !== 'CHECKED_IN') {
      toast.error('Only checked-in appointments can start an encounter');
      return;
    }

    // Check if an in-progress encounter already exists for this patient
    try {
      const encounters = await getAllEncounters();
      const existingEncounter = encounters.find(
        enc => enc.patientId === appt.patientId && enc.status === 'IN_PROGRESS'
      );

      if (existingEncounter) {
        toast('Existing encounter found — redirecting...', { icon: '📋' });
        navigate(`/encounters/${existingEncounter.encounterId}?apptId=${appt.apptId}`);
        return;
      }
    } catch (err) {
      console.error('Failed to check existing encounters', err);
    }

    navigate(`/encounters/new?mrn=${encodeURIComponent(appt.patientMrn)}&apptId=${appt.apptId}`);
  };

  const handleViewEncounter = async (appt: AppointmentResponseDto, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const encounters = await getAllEncounters();
      const patientEncounters = encounters
        .filter(enc => enc.patientId === appt.patientId)
        .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

      const target = patientEncounters[0];
      if (!target) {
        toast.error('No encounter found for this appointment yet');
        return;
      }

      navigate(`/encounters/${target.encounterId}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load encounter details');
    }
  };

  const filtered = appointments.filter(appt => {
    const matchSearch =
      appt.patientName.toLowerCase().includes(search.toLowerCase()) ||
      appt.serviceType.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || appt.status === statusFilter;
    return matchSearch && matchStatus;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, user?.role]);

  const shouldPaginate = true;
  const itemsPerPage =
    user?.role === 'PATIENT'
      ? PATIENT_ITEMS_PER_PAGE
      : user?.role === 'CLINICIAN'
        ? CLINICIAN_ITEMS_PER_PAGE
        : DEFAULT_ITEMS_PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * itemsPerPage;
  const pageEnd = pageStart + itemsPerPage;
  const paginatedAppointments = filtered.slice(pageStart, pageEnd);

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

  const isTodayAppointment = (dateStr: string) => {
    const apptDate = new Date(dateStr);
    if (Number.isNaN(apptDate.getTime())) return false;
    const now = new Date();
    return (
      apptDate.getFullYear() === now.getFullYear() &&
      apptDate.getMonth() === now.getMonth() &&
      apptDate.getDate() === now.getDate()
    );
  };

  const isPatient = user?.role === 'PATIENT';
  const isReception = user?.role === 'RECEPTION' || user?.role === 'ADMIN';
  const isClinicianView = user?.role === 'CLINICIAN';
  const statusOptions = isClinicianView
    ? ['ALL', 'SCHEDULED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW']
    : ['ALL', 'SCHEDULED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED'];

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
            placeholder="Search patient or service type..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {statusOptions.map(status => (
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
        <>
          <div className="data-table-wrapper appointments-registry-table-wrapper">
            <table className="data-table appointments-uniform-table appointments-realtime-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Service Type</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAppointments.map(appt => {
                  const showCheckIn = appt.status === 'SCHEDULED' && isReception;
                  const canCheckIn = showCheckIn && isTodayAppointment(appt.startAt);
                  const canCancel = appt.status === 'SCHEDULED' && (isReception || isPatient);
                  const canStartEncounter = appt.status === 'CHECKED_IN' && isClinicianView;
                  const canViewEncounter = appt.status === 'COMPLETED' && isClinicianView;
                  const hasAction = showCheckIn || canCancel || canStartEncounter || canViewEncounter;

                  return (
                    <tr key={appt.apptId}>
                      <td>
                        <div className="cell-main">{appt.patientName}</div>
                        <div className="cell-sub">MRN: {appt.patientMrn}</div>
                      </td>
                      <td>
                        <span className="badge badge-primary appointments-service-badge">{appt.serviceType}</span>
                      </td>
                      <td>{formatDate(appt.startAt)}</td>
                      <td>{formatTime(appt.startAt)}</td>
                      <td>{getStatusBadge(appt.status)}</td>
                      <td>
                        <div className="appointments-actions-wrap" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {showCheckIn && (
                            <button
                              className="btn btn-primary appointments-action-btn"
                              style={{ padding: '6px 10px', fontSize: '0.75rem', height: 'auto' }}
                              onClick={(e) => handleCheckIn(appt.apptId, e)}
                              title={canCheckIn ? 'Check In Patient' : 'Check In is available only on appointment date'}
                              disabled={!canCheckIn}
                            >
                              <Check size={14} style={{ marginRight: '4px' }} /> Check In
                            </button>
                          )}

                          {canStartEncounter && (
                            <button
                              className="btn btn-primary appointments-action-btn"
                              style={{ padding: '6px 10px', fontSize: '0.75rem', height: 'auto' }}
                              onClick={(e) => handleNewEncounter(appt, e)}
                              title="Start Encounter"
                            >
                              <Stethoscope size={14} style={{ marginRight: '4px' }} /> Open Encounter
                            </button>
                          )}

                          {canCancel && (
                            <button
                              className="btn btn-danger appointments-action-btn appointments-action-btn-danger"
                              style={{ padding: '6px 10px', fontSize: '0.75rem', height: 'auto', background: 'transparent', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}
                              onClick={(e) => handleCancel(appt.apptId, e)}
                              title="Cancel Appointment"
                            >
                              <X size={14} style={{ marginRight: '4px' }} /> Cancel
                            </button>
                          )}

                          {canViewEncounter && (
                            <button
                              className="btn btn-secondary appointments-action-btn"
                              style={{ padding: '6px 10px', fontSize: '0.75rem', height: 'auto' }}
                              onClick={(e) => handleViewEncounter(appt, e)}
                              title="View Encounter"
                            >
                              View Encounter
                            </button>
                          )}

                          {!hasAction && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', paddingLeft: '8px' }}>—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {shouldPaginate && totalPages > 1 && (
            <div className="pagination-bar">
              <span className="pagination-info">
                Showing <strong>{filtered.length === 0 ? 0 : pageStart + 1}</strong> to <strong>{Math.min(pageEnd, filtered.length)}</strong> of <strong>{filtered.length}</strong> entries
              </span>
              <div className="pagination-buttons">
                <button
                  type="button"
                  className="btn btn-secondary pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={safePage === 1}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    type="button"
                    className={`btn ${safePage === page ? 'btn-primary' : 'btn-secondary'} pagination-btn`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn btn-secondary pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={safePage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}
