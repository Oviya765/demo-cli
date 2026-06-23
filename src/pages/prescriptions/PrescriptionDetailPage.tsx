import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPrescriptionById, deletePrescription } from '../../services/prescriptionService';
import type { PrescriptionResponseDto } from '../../models/types';
import { ArrowLeft, Trash2, Edit, Pill, User, Clock, FileText } from 'lucide-react';
import { fetchMrnByPatientId } from '../../services/patientService';
import '../../assets/styles/prescriptions/prescription.css';

export default function PrescriptionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rx, setRx] = useState<PrescriptionResponseDto | null>(null);
  const [patientMrn, setPatientMrn] = useState('—');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrescription();
  }, [id]);

  const loadPrescription = async () => {
    try {
      const data = await getPrescriptionById(Number(id));
      setRx(data);
      const mrn = await fetchMrnByPatientId(data.patientId);
      setPatientMrn(mrn);
    } catch (err) {
      console.error('Failed to load prescription', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!rx || !confirm('Delete this prescription?')) return;
    try {
      await deletePrescription(rx.rxId);
      navigate('/prescriptions', { replace: true });
    } catch (err) {
      console.error('Failed to delete prescription', err);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      'DRAFT': { cls: 'badge-neutral', label: 'Draft' },
      'ISSUED': { cls: 'badge-success', label: 'Issued' },
      'DISPENSED': { cls: 'badge-info', label: 'Dispensed' },
      'CANCELLED': { cls: 'badge-danger', label: 'Cancelled' },
    };
    const s = map[status] || { cls: 'badge-neutral', label: status };
    return <span className={`badge ${s.cls}`}><span className="badge-dot"></span>{s.label}</span>;
  };

  if (loading) return <div className="page-spinner"><div className="spinner"></div></div>;
  if (!rx) {
    return (
      <div className="empty-state">
        <h3>Prescription not found</h3>
        <button className="btn btn-primary" onClick={() => navigate('/prescriptions')}>Back to list</button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/prescriptions')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1>Prescription #{rx.rxId}</h1>
              {getStatusBadge(rx.status)}
            </div>
            <p>{rx.medicationName} — {rx.patientName}</p>
          </div>
        </div>
        <div className="page-header-actions">
          {rx.status === 'DRAFT' && (
            <>
              <button className="btn btn-secondary" onClick={() => navigate(`/prescriptions/${rx.rxId}/edit`)}>
                <Edit size={16} /> Edit
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                <Trash2 size={16} /> Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Patient & Prescriber */}
      <div className="section-card">
        <div className="section-card-header">
          <h3><User size={16} /> Patient & Prescriber</h3>
        </div>
        <div className="section-card-body">
          <div className="detail-grid">
            <div className="detail-item">
              <label>Patient</label>
              <p>{rx.patientName}</p>
            </div>
            <div className="detail-item">
              <label>Patient MRN</label>
              <p>{patientMrn}</p>
            </div>
            <div className="detail-item">
              <label>Prescriber</label>
              <p>{rx.clinicianName}</p>
            </div>
            <div className="detail-item">
              <label>Encounter ID</label>
              <p>#{rx.encounterId}</p>
            </div>
            <div className="detail-item">
              <label>Issued At</label>
              <p style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> {formatDate(rx.issuedAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Medication Details */}
      <div className="section-card">
        <div className="section-card-header">
          <h3><Pill size={16} /> Medication Details</h3>
        </div>
        <div className="section-card-body">
          <div className="detail-grid">
            <div className="detail-item">
              <label>Medication</label>
              <p>{rx.medicationName}</p>
            </div>
            <div className="detail-item">
              <label>Dosage</label>
              <p>{rx.dosage}</p>
            </div>
            <div className="detail-item">
              <label>Frequency</label>
              <p>{rx.frequency}</p>
            </div>
            <div className="detail-item">
              <label>Route</label>
              <p><span className="badge badge-neutral">{rx.route}</span></p>
            </div>
            <div className="detail-item">
              <label>Duration</label>
              <p>{rx.durationDays} days</p>
            </div>
            <div className="detail-item">
              <label>Quantity</label>
              <p>{rx.quantity}</p>
            </div>
            <div className="detail-item">
              <label>Repeats</label>
              <p>{rx.repeats}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {rx.notes && (
        <div className="section-card">
          <div className="section-card-header">
            <h3><FileText size={16} /> Notes</h3>
          </div>
          <div className="section-card-body">
            <p style={{ fontSize: '0.9375rem', lineHeight: 1.7 }}>{rx.notes}</p>
          </div>
        </div>
      )}
    </div>
  );
}
