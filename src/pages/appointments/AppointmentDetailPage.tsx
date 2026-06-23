import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, FileText, Stethoscope } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getAllAppointments } from '../../services/appointmentService';
import { getAllEncounters } from '../../services/encounterService';
import { getAllPrescriptions } from '../../services/prescriptionService';
import type { AppointmentResponseDto, EncounterResponseDto, PrescriptionResponseDto } from '../../models/types';

export default function AppointmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<AppointmentResponseDto | null>(null);
  const [encounters, setEncounters] = useState<EncounterResponseDto[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionResponseDto[]>([]);

  const apptId = useMemo(() => Number(id), [id]);

  useEffect(() => {
    const load = async () => {
      if (!apptId || Number.isNaN(apptId)) {
        toast.error('Invalid appointment id');
        navigate('/appointments');
        return;
      }

      setLoading(true);
      try {
        const allAppointments = await getAllAppointments();
        const target = allAppointments.find(a => a.apptId === apptId) || null;

        if (!target) {
          toast.error('Appointment not found');
          navigate('/appointments');
          return;
        }

        setAppointment(target);

        const [allEncounters, allPrescriptions] = await Promise.all([
          getAllEncounters().catch(() => [] as EncounterResponseDto[]),
          getAllPrescriptions().catch(() => [] as PrescriptionResponseDto[]),
        ]);

        setEncounters(
          allEncounters
            .filter(en => en.patientId === target.patientId)
            .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
        );

        setPrescriptions(
          allPrescriptions
            .filter(rx => rx.patientId === target.patientId)
            .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
        );
      } catch (err: any) {
        toast.error(err?.message || 'Failed to load appointment details');
        navigate('/appointments');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [apptId, navigate]);

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

  const safeJoin = (json?: string): string => {
    if (!json) return '';
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        return parsed
          .map(item => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object') {
              return item.name || item.description || item.code || item.label || item.text || JSON.stringify(item);
            }
            return String(item);
          })
          .filter(Boolean)
          .join(', ');
      }
      if (parsed && typeof parsed === 'object') {
        return Object.values(parsed).filter(Boolean).join(', ');
      }
      return String(parsed);
    } catch {
      return json;
    }
  };

  if (loading) {
    return <div className="page-spinner"><div className="spinner"></div></div>;
  }

  if (!appointment) {
    return null;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Appointment Details</h1>
          <p>{appointment.patientName} · MRN: {appointment.patientMrn}</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/appointments')}>Back</button>
          {(appointment.status === 'SCHEDULED' || appointment.status === 'CHECKED_IN') && (
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/encounters/new?mrn=${encodeURIComponent(appointment.patientMrn)}`)}
            >
              <Stethoscope size={16} style={{ marginRight: '6px' }} /> Start Encounter
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={16} /> Appointment Info
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px 24px' }}>
          {[
            { label: 'Date', value: formatDate(appointment.startAt) },
            { label: 'Time', value: formatTime(appointment.startAt) },
            { label: 'Visit Type', value: appointment.serviceType || '—' },
            { label: 'Department', value: appointment.department || '—' },
            { label: 'Status', value: appointment.status },
            { label: 'Clinician', value: appointment.clinicianName || '—' },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>{item.label}</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 500 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: '20px', marginTop: '16px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarDays size={16} /> Previous Visit Summary
        </h3>
        {encounters.length === 0 ? (
          <div className="empty-state" style={{ padding: '16px' }}>
            <h3 style={{ fontSize: '1rem' }}>No previous visits recorded</h3>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {encounters.slice(0, 5).map(enc => (
              <div key={enc.encounterId} style={{ border: '1px solid var(--color-border)', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{formatDate(enc.startAt)} · {enc.visitType || 'Visit'}</span>
                  <span className={`badge ${enc.status === 'COMPLETED' ? 'badge-success' : enc.status === 'CANCELLED' ? 'badge-danger' : 'badge-warning'}`}>{enc.status}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', display: 'grid', gap: '3px' }}>
                  <div><span>Complaint: </span>{enc.chiefComplaint || '—'}</div>
                  <div><span>Diagnoses: </span>{safeJoin(enc.diagnosesJson) || '—'}</div>
                  <div><span>Notes: </span>{safeJoin(enc.notesJson) || '—'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: '20px', marginTop: '16px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={16} /> Prescriptions History
        </h3>
        {prescriptions.length === 0 ? (
          <div className="empty-state" style={{ padding: '16px' }}>
            <h3 style={{ fontSize: '1rem' }}>No prescriptions on record</h3>
          </div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Medication</th>
                  <th>Dosage</th>
                  <th>Frequency</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map(rx => (
                  <tr key={rx.rxId}>
                    <td>{formatDate(rx.issuedAt)}</td>
                    <td className="cell-main">{rx.medicationName}</td>
                    <td>{rx.dosage || '—'}</td>
                    <td>{rx.frequency || '—'}</td>
                    <td><span className="badge badge-neutral">{rx.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
