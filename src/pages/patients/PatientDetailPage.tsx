import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Users, FileText, Stethoscope } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { getPatientById } from '../../services/patientService';
import { getAllEncounters } from '../../services/encounterService';
import { getAllAppointments } from '../../services/appointmentService';
import type { PatientResponseDto, EncounterResponseDto } from '../../models/types';

export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<PatientResponseDto | null>(null);
  const [patientEncounters, setPatientEncounters] = useState<EncounterResponseDto[]>([]);
  const [encountersLoading, setEncountersLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const patientId = Number(id);
      if (!patientId || Number.isNaN(patientId)) {
        toast.error('Invalid patient id');
        navigate('/patients');
        return;
      }

      setLoading(true);
      try {
        // For clinicians, verify they have an appointment with this patient
        if (user?.role === 'CLINICIAN') {
          try {
            const allAppointments = await getAllAppointments();
            const hasAccess = allAppointments.some(
              a => a.patientId === patientId && a.clinicianId === user.userId
            );
            if (!hasAccess) {
              toast.error('You do not have permission to view this patient');
              navigate('/patients');
              setLoading(false);
              return;
            }
          } catch (authErr) {
            console.error('Failed to verify clinician access', authErr);
            toast.error('Failed to verify access permissions');
            navigate('/patients');
            setLoading(false);
            return;
          }
        }

        const p = await getPatientById(patientId);
        setPatient(p);

        if (user?.role === 'CLINICIAN') {
          setEncountersLoading(true);
          const all = await getAllEncounters();
          const history = all
            .filter(e => e.patientId === p.patientId)
            .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
          setPatientEncounters(history);
          setEncountersLoading(false);
        }
      } catch (err) {
        console.error('Failed to load patient details', err);
        toast.error('Failed to load patient details');
        navigate('/patients');
      } finally {
        setEncountersLoading(false);
        setLoading(false);
      }
    };

    load();
  }, [id, navigate, user]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const parseContact = (contactJson: string) => {
    try {
      return JSON.parse(contactJson);
    } catch {
      return { email: '', phone: contactJson || '' };
    }
  };

  const parseAddress = (json: string) => {
    try {
      return JSON.parse(json);
    } catch {
      return { line1: json || '', city: '', state: '', zip: '' };
    }
  };

  const safeJoin = (json: string): string => {
    if (!json) return '';
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        return parsed
          .map(item => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object') {
              return item.name || item.description || item.code || item.label || JSON.stringify(item);
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

  if (loading) return <div className="page-spinner"><div className="spinner"></div></div>;
  if (!patient) return null;

  const contact = parseContact(patient.contactInfoJson);
  const address = parseAddress(patient.addressJson);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Patient Details</h1>
          <p>Comprehensive patient information and treatment history</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/patients')}>Back</button>
        </div>
      </div>

      <div className="card" style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Users size={20} style={{ color: '#06b6d4' }} /> {patient.name}
          <span className="badge badge-neutral" style={{ fontWeight: 600, marginLeft: '4px' }}>{patient.mrn}</span>
        </h2>

        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#06b6d4', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={16} /> Patient Information
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', marginBottom: '24px' }}>
          {[
            { label: 'Date of Birth', value: formatDate(patient.dob) },
            { label: 'Gender', value: patient.gender ? patient.gender.charAt(0) + patient.gender.slice(1).toLowerCase() : '—' },
            { label: 'Phone', value: contact.phone || '—' },
            { label: 'Email', value: contact.email || '—' },
            { label: 'Address', value: address.line1 ? `${address.line1}, ${address.city}, ${address.state} ${address.zip}` : '—' },
            { label: 'Emergency Contact', value: patient.primaryContact || '—' },
            { label: 'Insurance ID', value: patient.insuranceId || '—' },
            { label: 'Status', value: patient.status || '—' },
          ].map(r => (
            <div key={r.label}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>{r.label}</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{r.value}</div>
            </div>
          ))}
        </div>

        {user?.role === 'CLINICIAN' && (
          <>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#06b6d4', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Stethoscope size={16} /> Past Treatment History
            </h3>

            {encountersLoading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading treatment history…</div>
            ) : patientEncounters.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                No past treatment history available for this patient.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {patientEncounters.map(enc => {
                  const diagnoses = safeJoin(enc.diagnosesJson);
                  return (
                    <div
                      key={enc.encounterId}
                      onClick={() => navigate(`/encounters/${enc.encounterId}/summary`)}
                      style={{
                        border: '1px solid var(--color-border)',
                        borderRadius: '10px',
                        padding: '14px 16px',
                        background: 'var(--color-surface)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-primary)';
                        e.currentTarget.style.background = 'var(--color-primary-50)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border)';
                        e.currentTarget.style.background = 'var(--color-surface)';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formatDate(enc.startAt)} · {enc.visitType || 'Visit'}</span>
                        <span className={`badge ${enc.status === 'COMPLETED' ? 'badge-success' : enc.status === 'CANCELLED' ? 'badge-danger' : 'badge-warning'}`}>{enc.status}</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', display: 'grid', gap: '4px' }}>
                        <div><span>Chief Complaint: </span>{enc.chiefComplaint || '—'}</div>
                        <div><span>Diagnoses: </span>{diagnoses || '—'}</div>
                        <div><span>Clinician: </span>{enc.clinicianName || '—'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
