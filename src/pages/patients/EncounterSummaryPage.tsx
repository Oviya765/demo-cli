import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Stethoscope, Pill, FlaskConical, FileText, ArrowLeft, ClipboardList } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getEncounterById } from '../../services/encounterService';
import { getAllPrescriptions } from '../../services/prescriptionService';
import { getAllOrders } from '../../services/labService';
import type { EncounterResponseDto, PrescriptionResponseDto, LabOrderResponseDto } from '../../models/types';

export default function EncounterSummaryPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [encounter, setEncounter] = useState<EncounterResponseDto | null>(null);
  const [prescriptions, setPrescriptions] = useState<PrescriptionResponseDto[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrderResponseDto[]>([]);

  useEffect(() => {
    const load = async () => {
      const encId = Number(id);
      if (!encId || Number.isNaN(encId)) {
        toast.error('Invalid encounter id');
        navigate(-1);
        return;
      }

      setLoading(true);
      try {
        const [enc, allRx, allLab] = await Promise.all([
          getEncounterById(encId),
          getAllPrescriptions(),
          getAllOrders(),
        ]);
        setEncounter(enc);
        setPrescriptions(allRx.filter(rx => rx.encounterId === encId));
        setLabOrders(allLab.filter(lo => lo.encounterId === encId));
      } catch (err) {
        console.error('Failed to load encounter summary', err);
        toast.error('Failed to load encounter details');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, navigate]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const safeArray = (json: string): string[] => {
    if (!json) return [];
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        return parsed.map(item => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object')
            return item.name || item.description || item.code || item.label || JSON.stringify(item);
          return String(item);
        }).filter(Boolean);
      }
      return [];
    } catch {
      return json ? [json] : [];
    }
  };

  const safeTests = (testsJson: string): string[] => {
    if (!testsJson) return [];
    try {
      const parsed = JSON.parse(testsJson);
      if (Array.isArray(parsed)) return parsed.map(String);
      if (typeof parsed === 'string') return [parsed];
      return [];
    } catch {
      return testsJson ? [testsJson] : [];
    }
  };

  const statusBadge = (status: string) => {
    const cls =
      status === 'COMPLETED' || status === 'RESULTS_REPORTED' ? 'badge-success'
      : status === 'CANCELLED' ? 'badge-danger'
      : status === 'CRITICAL_REPORTED' ? 'badge-danger'
      : 'badge-warning';
    return <span className={`badge ${cls}`}>{status.replace(/_/g, ' ')}</span>;
  };

  const rxStatusBadge = (status: string) => {
    const cls =
      status === 'DISPENSED' || status === 'COMPLETED' || status === 'ACTIVE' ? 'badge-success'
      : status === 'CANCELLED' || status === 'EXPIRED' ? 'badge-danger'
      : 'badge-warning';
    return <span className={`badge ${cls}`}>{status}</span>;
  };

  const flagColor = (flag: string) =>
    flag === 'CRITICAL' ? '#ef4444'
    : flag === 'HIGH' || flag === 'LOW' ? '#f59e0b'
    : 'var(--color-text-secondary)';

  if (loading) return <div className="page-spinner"><div className="spinner"></div></div>;
  if (!encounter) return null;

  const diagnoses = safeArray(encounter.diagnosesJson);
  const orders = safeArray(encounter.ordersJson);

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Encounter Summary</h1>
          <p>{formatDate(encounter.startAt)} &middot; {encounter.visitType || 'Visit'} &middot; {encounter.patientName}</p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => navigate(`/patients/${encounter.patientId}`)}
          >
            <ArrowLeft size={16} /> Back to Patient
          </button>
        </div>
      </div>

      {/* Encounter Info Card */}
      <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
        <h3 style={sectionHeadingStyle}>
          <FileText size={16} /> Encounter Information
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
          {[
            { label: 'Visit Type', value: encounter.visitType || '—' },
            { label: 'Chief Complaint', value: encounter.chiefComplaint || '—' },
            { label: 'Clinician', value: encounter.clinicianName || '—' },
            { label: 'Status', value: statusBadge(encounter.status) },
            { label: 'Date', value: formatDate(encounter.startAt) },
            { label: 'Signed By', value: encounter.signedByName || '—' },
          ].map(r => (
            <div key={r.label}>
              <div style={labelStyle}>{r.label}</div>
              <div style={valueStyle}>{r.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Diagnoses Card */}
      <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
        <h3 style={sectionHeadingStyle}>
          <Stethoscope size={16} /> Diagnoses
        </h3>
        {diagnoses.length === 0 ? (
          <p style={emptyStyle}>No diagnoses recorded for this encounter.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {diagnoses.map((d, i) => (
              <div key={i} style={itemRowStyle}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-primary-50)', color: 'var(--color-primary-900)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: '0.9rem' }}>{d}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Orders Card */}
      {orders.length > 0 && (
        <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
          <h3 style={sectionHeadingStyle}>
            <ClipboardList size={16} /> Clinical Orders
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {orders.map((o, i) => (
              <div key={i} style={itemRowStyle}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-primary-50)', color: 'var(--color-primary-900)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: '0.9rem' }}>{o}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lab Orders Card */}
      <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
        <h3 style={sectionHeadingStyle}>
          <FlaskConical size={16} /> Lab Orders
        </h3>
        {labOrders.length === 0 ? (
          <p style={emptyStyle}>No lab orders linked to this encounter.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {labOrders.map(lo => {
              const tests = safeTests(lo.testsJson);
              return (
                <div key={lo.labOrderId} style={cardItemStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      Lab Order #{lo.labOrderId}
                      {lo.sampleId ? <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: '8px', fontSize: '0.8rem' }}>Sample: {lo.sampleId}</span> : null}
                    </span>
                    {statusBadge(lo.status)}
                  </div>

                  {tests.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <div style={labelStyle}>Tests Ordered</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                        {tests.map((t, i) => (
                          <span key={i} style={{ padding: '2px 10px', borderRadius: '20px', background: 'var(--color-primary-50)', color: 'var(--color-primary-900)', fontSize: '0.78rem', fontWeight: 500 }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {lo.results && lo.results.length > 0 && (
                    <div>
                      <div style={labelStyle}>Results</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '6px', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                            {['Test', 'Value', 'Units', 'Flag', 'Reported At'].map(h => (
                              <th key={h} style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {lo.results.map(r => (
                            <tr key={r.resultId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                              <td style={{ padding: '6px 8px' }}>{r.testCode}</td>
                              <td style={{ padding: '6px 8px', fontWeight: 600 }}>{r.value}</td>
                              <td style={{ padding: '6px 8px', color: 'var(--color-text-secondary)' }}>{r.units || '—'}</td>
                              <td style={{ padding: '6px 8px', color: flagColor(r.flag), fontWeight: 600 }}>{r.flag}</td>
                              <td style={{ padding: '6px 8px', color: 'var(--color-text-secondary)' }}>{formatDate(r.reportedAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {lo.collectedAt && (
                    <div style={{ marginTop: '6px', fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                      Collected: {formatDate(lo.collectedAt)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Prescriptions Card */}
      <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
        <h3 style={sectionHeadingStyle}>
          <Pill size={16} /> Prescriptions
        </h3>
        {prescriptions.length === 0 ? (
          <p style={emptyStyle}>No prescriptions issued for this encounter.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {prescriptions.map(rx => (
              <div key={rx.rxId} style={cardItemStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{rx.medicationName}</span>
                  {rxStatusBadge(rx.status)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 16px', fontSize: '0.82rem' }}>
                  {[
                    { label: 'Dosage', value: rx.dosage || '—' },
                    { label: 'Frequency', value: rx.frequency || '—' },
                    { label: 'Route', value: rx.route || '—' },
                    { label: 'Duration', value: rx.durationDays ? `${rx.durationDays} days` : '—' },
                    { label: 'Quantity', value: rx.quantity != null ? String(rx.quantity) : '—' },
                    { label: 'Repeats', value: rx.repeats != null ? String(rx.repeats) : '—' },
                  ].map(f => (
                    <div key={f.label}>
                      <div style={labelStyle}>{f.label}</div>
                      <div style={{ fontWeight: 500 }}>{f.value}</div>
                    </div>
                  ))}
                </div>
                {rx.notes && (
                  <div style={{ marginTop: '10px', fontSize: '0.82rem', padding: '8px 12px', borderRadius: '6px', background: 'var(--color-primary-50)', color: 'var(--color-primary-900)', borderLeft: '3px solid var(--color-primary)' }}>
                    <strong>Notes:</strong> {rx.notes}
                  </div>
                )}
                {rx.issuedAt && (
                  <div style={{ marginTop: '6px', fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                    Issued: {formatDate(rx.issuedAt)} &middot; By: {rx.clinicianName}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared style helpers ──

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  fontWeight: 600,
  color: '#06b6d4',
  borderBottom: '1px solid var(--color-border)',
  paddingBottom: '6px',
  marginBottom: '14px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: 'var(--color-text-secondary)',
  marginBottom: '2px',
};

const valueStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  fontWeight: 500,
};

const emptyStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  color: 'var(--color-text-secondary)',
  padding: '16px 0',
};

const itemRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 12px',
  borderRadius: '8px',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
};

const cardItemStyle: React.CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: '10px',
  padding: '14px 16px',
  background: 'var(--color-surface)',
};
