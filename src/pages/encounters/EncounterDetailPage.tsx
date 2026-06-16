import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getEncounterById,
  completeEncounter,
  deleteEncounter,
  updateEncounter
} from '../../services/encounterService';
import { getPatientById } from '../../services/patientService';
import { getAllPrescriptions } from '../../services/prescriptionService';
import type { EncounterResponseDto, PatientResponseDto, PrescriptionResponseDto } from '../../models/types';
import {
  ArrowLeft,
  CheckCircle,
  Trash2,
  Edit,
  Heart,
  FileText,
  Stethoscope,
  ClipboardList,
  Pill,
  User,
  Clock,
  Activity,
  Calendar,
  AlertTriangle,
  HeartPulse,
  Info,
  Plus,
  Save,
  Printer,
  Share2,
  ListFilter
} from 'lucide-react';
import toast from 'react-hot-toast';
import '../../assets/styles/encounters/encounter.css';

type TabType = 'Overview' | 'SOAP Notes' | 'Diagnosis' | 'Orders' | 'Prescriptions' | 'Timeline';

export default function EncounterDetailPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [encounter, setEncounter] = useState<EncounterResponseDto | null>(null);
  const [patient, setPatient] = useState<PatientResponseDto | null>(null);
  const [prescriptions, setPrescriptions] = useState<PrescriptionResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Tab Navigation
  const [activeTab, setActiveTab] = useState<TabType>('Overview');

  // Vitals State Inputs
  const [vitalsTemp, setVitalsTemp] = useState('');
  const [vitalsPulse, setVitalsPulse] = useState('');
  const [vitalsSpo2, setVitalsSpo2] = useState('');
  const [vitalsRr, setVitalsRr] = useState('');
  const [vitalsWeight, setVitalsWeight] = useState('');
  const [vitalsHeight, setVitalsHeight] = useState('');
  const [vitalsBpSystolic, setVitalsBpSystolic] = useState('');
  const [vitalsBpDiastolic, setVitalsBpDiastolic] = useState('');

  // SOAP Edit States
  const [editingSoap, setEditingSoap] = useState<'subjective' | 'objective' | 'assessment' | 'plan' | null>(null);
  const [soapSubjective, setSoapSubjective] = useState('');
  const [soapObjective, setSoapObjective] = useState('');
  const [soapAssessment, setSoapAssessment] = useState('');
  const [soapPlan, setSoapPlan] = useState('');

  // Diagnosis State
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const [diagnosesList, setDiagnosesList] = useState<string[]>([]);

  // Orders State
  const [newOrder, setNewOrder] = useState('');
  const [ordersList, setOrdersList] = useState<string[]>([]);

  useEffect(() => {
    loadEncounterDetails();
  }, [id]);

  const loadEncounterDetails = async () => {
    try {
      setLoading(true);
      const encData = await getEncounterById(Number(id));
      setEncounter(encData);

      // Fetch Patient demographics
      const patData = await getPatientById(encData.patientId);
      setPatient(patData);

      // Parse Vitals
      const vitals = safeParse(encData.vitalsJson) as Record<string, string> | null;
      if (vitals) {
        setVitalsTemp(vitals.temp || '37.0');
        setVitalsPulse(vitals.pulse || '72');
        setVitalsSpo2(vitals.spo2 || '98');
        setVitalsRr(vitals.rr || '16');
        setVitalsWeight(vitals.weight || '70');
        setVitalsHeight(vitals.height || '175');
        setVitalsBpSystolic(vitals.bpSystolic || (vitals.bp ? vitals.bp.split('/')[0] : '120'));
        setVitalsBpDiastolic(vitals.bpDiastolic || (vitals.bp ? vitals.bp.split('/')[1] : '80'));
      }

      // Parse SOAP
      const notes = safeParse(encData.notesJson) as Record<string, string> | null;
      if (notes) {
        setSoapSubjective(notes.subjective || '');
        setSoapObjective(notes.objective || '');
        setSoapAssessment(notes.assessment || '');
        setSoapPlan(notes.plan || '');
      }

      // Parse Diagnoses & Orders
      const diags = safeParse(encData.diagnosesJson) as string[] | null;
      setDiagnosesList(diags || []);

      const ords = safeParse(encData.ordersJson) as string[] | null;
      setOrdersList(ords || []);

      try {
        const allRx = await getAllPrescriptions();
        const encounterRx = allRx.filter(rx => rx.encounterId === Number(id));
        setPrescriptions(encounterRx);
      } catch (rxErr) {
        console.error('Failed to load prescriptions', rxErr);
      }

    } catch (err) {
      console.error('Failed to load encounter details', err);
      toast.error('Failed to load encounter details.');
    } finally {
      setLoading(false);
    }
  };

  const safeParse = (json: string): unknown => {
    try { return JSON.parse(json); }
    catch { return null; }
  };

  const handleSaveVitals = async () => {
    if (!encounter) return;
    setActionLoading(true);
    try {
      const updatedVitalsJson = JSON.stringify({
        bp: `${vitalsBpSystolic}/${vitalsBpDiastolic}`,
        bpSystolic: vitalsBpSystolic,
        bpDiastolic: vitalsBpDiastolic,
        temp: vitalsTemp,
        pulse: vitalsPulse,
        spo2: vitalsSpo2,
        weight: vitalsWeight,
        height: vitalsHeight,
        rr: vitalsRr
      });

      const updated = await updateEncounter(encounter.encounterId, {
        patientId: encounter.patientId,
        visitType: encounter.visitType,
        chiefComplaint: encounter.chiefComplaint,
        vitalsJson: updatedVitalsJson,
        notesJson: encounter.notesJson,
        diagnosesJson: encounter.diagnosesJson,
        ordersJson: encounter.ordersJson,
        status: encounter.status
      });

      setEncounter(updated);
      toast.success('Patient vitals saved successfully!');
    } catch (err) {
      console.error('Failed to save vitals', err);
      toast.error('Failed to save vitals.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSoapNote = async (field: 'subjective' | 'objective' | 'assessment' | 'plan') => {
    if (!encounter) return;
    setActionLoading(true);
    try {
      const updatedNotes = {
        subjective: soapSubjective,
        objective: soapObjective,
        assessment: soapAssessment,
        plan: soapPlan
      };

      const updated = await updateEncounter(encounter.encounterId, {
        patientId: encounter.patientId,
        visitType: encounter.visitType,
        chiefComplaint: encounter.chiefComplaint,
        vitalsJson: encounter.vitalsJson,
        notesJson: JSON.stringify(updatedNotes),
        diagnosesJson: encounter.diagnosesJson,
        ordersJson: encounter.ordersJson,
        status: encounter.status
      });

      setEncounter(updated);
      setEditingSoap(null);
      toast.success(`SOAP ${field.toUpperCase()} note saved!`);
    } catch (err) {
      console.error('Failed to save SOAP note', err);
      toast.error('Failed to save clinical note.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddDiagnosis = async () => {
    if (!encounter || !newDiagnosis.trim()) return;
    setActionLoading(true);
    try {
      const updatedList = [...diagnosesList, newDiagnosis.trim()];
      const updated = await updateEncounter(encounter.encounterId, {
        patientId: encounter.patientId,
        visitType: encounter.visitType,
        chiefComplaint: encounter.chiefComplaint,
        vitalsJson: encounter.vitalsJson,
        notesJson: encounter.notesJson,
        diagnosesJson: JSON.stringify(updatedList),
        ordersJson: encounter.ordersJson,
        status: encounter.status
      });

      setEncounter(updated);
      setDiagnosesList(updatedList);
      setNewDiagnosis('');
      toast.success('Diagnosis added.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add diagnosis.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddOrder = async () => {
    if (!encounter || !newOrder.trim()) return;
    setActionLoading(true);
    try {
      const updatedList = [...ordersList, newOrder.trim()];
      const updated = await updateEncounter(encounter.encounterId, {
        patientId: encounter.patientId,
        visitType: encounter.visitType,
        chiefComplaint: encounter.chiefComplaint,
        vitalsJson: encounter.vitalsJson,
        notesJson: encounter.notesJson,
        diagnosesJson: encounter.diagnosesJson,
        ordersJson: JSON.stringify(updatedList),
        status: encounter.status
      });

      setEncounter(updated);
      setOrdersList(updatedList);
      setNewOrder('');
      toast.success('Lab order added.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add order.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!encounter || encounter.status !== 'IN_PROGRESS') return;
    setActionLoading(true);
    try {
      const updated = await completeEncounter(encounter.encounterId);
      setEncounter(updated);
      toast.success('Encounter signed and completed!');
    } catch (err) {
      console.error('Failed to complete encounter', err);
      toast.error('Failed to complete encounter.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!encounter) return;
    if (!confirm('Are you sure you want to delete this encounter?')) return;
    setActionLoading(true);
    try {
      await deleteEncounter(encounter.encounterId);
      toast.success('Encounter deleted successfully.');
      navigate('/encounters', { replace: true });
    } catch (err) {
      console.error('Failed to delete encounter', err);
      toast.error('Failed to delete encounter.');
    } finally {
      setActionLoading(false);
    }
  };

  const getAge = (dobString?: string) => {
    if (!dobString) return 'N/A';
    try {
      const birth = new Date(dobString);
      const diffMs = Date.now() - birth.getTime();
      const ageDate = new Date(diffMs);
      return Math.abs(ageDate.getUTCFullYear() - 1970) + 'y';
    } catch {
      return 'N/A';
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      'IN_PROGRESS': { cls: 'badge-warning', label: 'Open' },
      'COMPLETED': { cls: 'badge-success', label: 'Completed' },
      'CANCELLED': { cls: 'badge-danger', label: 'Cancelled' },
    };
    const s = map[status] || { cls: 'badge-neutral', label: status };
    return (
      <span className={`badge ${s.cls}`}>
        <span className="badge-dot"></span>
        {s.label}
      </span>
    );
  };

  if (loading) {
    return <div className="page-spinner"><div className="spinner"></div></div>;
  }

  if (!encounter) {
    return (
      <div className="empty-state">
        <h3>Encounter not found</h3>
        <button className="btn btn-primary" onClick={() => navigate('/encounters')}>Back to list</button>
      </div>
    );
  }

  return (
    <div>
      {/* Top Banner Header Row */}
      <div className="page-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/encounters')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ margin: 0 }}>Encounter #{encounter.encounterId}</h1>
              {getStatusBadge(encounter.status)}
            </div>
            <p style={{ margin: '4px 0 0 0' }}>Started {formatDateTime(encounter.startAt)}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons Row (Evenly Spaced Layout Grid) */}
      {user?.role === 'CLINICIAN' && (
        <div className="detail-actions-row">
          {encounter.status === 'IN_PROGRESS' && (
            <>
              <button className="btn btn-secondary" onClick={() => navigate(`/encounters/${encounter.encounterId}/edit`)}>
                <Edit size={16} /> Edit
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/prescriptions/new', { state: { encounterId: encounter.encounterId, patientId: encounter.patientId } })}>
                <Pill size={16} /> Add Prescription
              </button>
              <button className="btn btn-secondary" onClick={() => setActiveTab('Orders')} title="Order Lab investigations">
                <ClipboardList size={16} /> Order Lab
              </button>
              <button className="btn btn-secondary" onClick={() => toast.success('Encounter progress saved as draft.')}>
                <Save size={16} /> Save Draft
              </button>
              <button className="btn btn-primary" style={{ background: '#10b981', borderColor: '#10b981' }} onClick={handleComplete} disabled={actionLoading}>
                <CheckCircle size={16} /> {actionLoading ? 'Signing...' : 'Sign Encounter'}
              </button>
            </>
          )}
          <button className="btn btn-danger" onClick={handleDelete} disabled={actionLoading}>
            <Trash2 size={16} /> Delete
          </button>
        </div>
      )}

      {/* Patient Demographic Banner Card */}
      <div className="demographics-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 auto', minWidth: '0' }}>
          <button
            type="button"
            className="demographics-avatar"
            onClick={() => navigate('/patients')}
            title="View Patient Profile"
            style={{ border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {patient?.name ? patient.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'PT'}
          </button>
          <div className="demographics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '16px', flex: '1 1 auto' }}>
            <div className="demographics-item">
              <label>Patient</label>
              <p>{patient?.name || encounter.patientName}</p>
            </div>
            <div className="demographics-item">
              <label>MRN</label>
              <p>{patient?.mrn || 'N/A'}</p>
            </div>
            <div className="demographics-item">
              <label>Age / Gender</label>
              <p>{getAge(patient?.dob)} — {patient?.gender || 'N/A'}</p>
            </div>
            <div className="demographics-item">
              <label>Physician</label>
              <p>{encounter.clinicianName}</p>
            </div>
            <div className="demographics-item">
              <label>Insurance</label>
              <p>{patient?.insuranceId ? 'Blue Cross Blue Shield' : 'Self Pay'}</p>
            </div>
            <div className="demographics-item">
              <label>Allergies</label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="allergy-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', verticalAlign: 'middle', lineHeight: '1', padding: '4px 8px' }}>
                  <AlertTriangle size={12} style={{ flexShrink: 0 }} /> Penicillin
                </span>
              </div>
            </div>
          </div>
        </div>
        <div style={{ flexShrink: 0 }}>
          <button type="button" className="patient-profile-btn" onClick={() => navigate('/patients')}>
            <User size={14} /> Patient Profile
          </button>
        </div>
      </div>

      {/* Redesigned Premium Segmented Tabs Control Bar */}
      <div className="encounter-tabs-bar">
        {(['Overview', 'SOAP Notes', 'Diagnosis', 'Orders', 'Prescriptions', 'Timeline'] as TabType[]).map(tab => {
          return (
            <button
              key={tab}
              type="button"
              className={`encounter-tab-item ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'Overview' && <Activity size={16} />}
              {tab === 'SOAP Notes' && <FileText size={16} />}
              {tab === 'Diagnosis' && <ClipboardList size={16} />}
              {tab === 'Orders' && <ListFilter size={16} />}
              {tab === 'Prescriptions' && <Pill size={16} />}
              {tab === 'Timeline' && <Clock size={16} />}
              {tab}
            </button>
          );
        })}
      </div>

      {/* Main Splits Layout: Content on Left, Sticky Alerts/Quick Actions Sidebar on Right across ALL sections */}
      <div className="overview-layout">
        
        {/* Left Panel: Dynamic Tabbed content */}
        <div>
          
          {activeTab === 'Overview' && (
            <div>
              {/* Chief Complaint Card */}
              <div className="complaint-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>
                  <Stethoscope size={16} style={{ color: '#2563eb' }} />
                  Chief Complaint
                </div>
                <div className="complaint-text-well">
                  {encounter.chiefComplaint}
                </div>
                <div className="complaint-timestamp">
                  <Calendar size={12} />
                  Started {formatDateTime(encounter.startAt)}
                </div>
              </div>

              {/* Vitals Visual Widget Card */}
              <div className="section-card">
                <div className="section-card-body">
                  <div className="vitals-header">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: 'var(--font-size-base)', fontWeight: '600' }}>
                      <Heart size={18} style={{ color: '#ef4444' }} />
                      Vitals
                    </h3>
                    {encounter.status === 'IN_PROGRESS' && (
                      <button className="btn btn-secondary btn-sm" onClick={handleSaveVitals} disabled={actionLoading}>
                        <Save size={14} /> Save Vitals
                      </button>
                    )}
                  </div>

                  <div className="vitals-summary-grid">
                    <div className="vital-stat-box">
                      <div className="vital-stat-icon-wrapper" style={{ background: '#fef2f2', color: '#ef4444' }}>
                        <Heart size={16} />
                      </div>
                      <div className="vital-stat-value">{vitalsBpSystolic && vitalsBpDiastolic ? `${vitalsBpSystolic}/${vitalsBpDiastolic}` : '—'}</div>
                      <div className="vital-stat-label">BP</div>
                      <div className="vital-stat-sublabel">mmHg</div>
                    </div>

                    <div className="vital-stat-box">
                      <div className="vital-stat-icon-wrapper" style={{ background: '#fff7ed', color: '#f97316' }}>
                        <Activity size={16} />
                      </div>
                      <div className="vital-stat-value">{vitalsTemp ? `${vitalsTemp}°C` : '—'}</div>
                      <div className="vital-stat-label">Temp</div>
                      <div className="vital-stat-sublabel">Celsius</div>
                    </div>

                    <div className="vital-stat-box">
                      <div className="vital-stat-icon-wrapper" style={{ background: '#fdf2f8', color: '#ec4899' }}>
                        <HeartPulse size={16} />
                      </div>
                      <div className="vital-stat-value">{vitalsPulse ? `${vitalsPulse} bpm` : '—'}</div>
                      <div className="vital-stat-label">Pulse</div>
                      <div className="vital-stat-sublabel">Beats/Min</div>
                    </div>

                    <div className="vital-stat-box">
                      <div className="vital-stat-icon-wrapper" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                        <Activity size={16} />
                      </div>
                      <div className="vital-stat-value">{vitalsSpo2 ? `${vitalsSpo2}%` : '—'}</div>
                      <div className="vital-stat-label">SpO2</div>
                      <div className="vital-stat-sublabel">Oxygen Sat</div>
                    </div>

                    <div className="vital-stat-box">
                      <div className="vital-stat-icon-wrapper" style={{ background: '#faf5ff', color: '#a855f7' }}>
                        <Info size={16} />
                      </div>
                      <div className="vital-stat-value">{vitalsWeight ? `${vitalsWeight} kg` : '—'}</div>
                      <div className="vital-stat-label">Weight</div>
                      <div className="vital-stat-sublabel">Kilograms</div>
                    </div>

                    <div className="vital-stat-box">
                      <div className="vital-stat-icon-wrapper" style={{ background: '#f0fdf4', color: '#22c55e' }}>
                        <Info size={16} />
                      </div>
                      <div className="vital-stat-value">{vitalsHeight ? `${vitalsHeight} cm` : '—'}</div>
                      <div className="vital-stat-label">Height</div>
                      <div className="vital-stat-sublabel">Centimeters</div>
                    </div>

                    <div className="vital-stat-box">
                      <div className="vital-stat-icon-wrapper" style={{ background: '#ecfdf5', color: '#10b981' }}>
                        <Activity size={16} />
                      </div>
                      <div className="vital-stat-value">{vitalsRr ? `${vitalsRr} /m` : '—'}</div>
                      <div className="vital-stat-label">RR</div>
                      <div className="vital-stat-sublabel">Resp Rate</div>
                    </div>
                  </div>

                  {encounter.status === 'IN_PROGRESS' && (
                    <div className="vitals-inputs-grid">
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.6875rem' }}>TEMP (°C)</label>
                        <input className="form-input" type="text" value={vitalsTemp} onChange={e => setVitalsTemp(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.6875rem' }}>PULSE (BPM)</label>
                        <input className="form-input" type="text" value={vitalsPulse} onChange={e => setVitalsPulse(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.6875rem' }}>SPO2 (%)</label>
                        <input className="form-input" type="text" value={vitalsSpo2} onChange={e => setVitalsSpo2(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.6875rem' }}>RR (/MIN)</label>
                        <input className="form-input" type="text" value={vitalsRr} onChange={e => setVitalsRr(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.6875rem' }}>WEIGHT (KG)</label>
                        <input className="form-input" type="text" value={vitalsWeight} onChange={e => setVitalsWeight(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.6875rem' }}>HEIGHT (CM)</label>
                        <input className="form-input" type="text" value={vitalsHeight} onChange={e => setVitalsHeight(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.6875rem' }}>BP SYSTOLIC</label>
                        <input className="form-input" type="text" value={vitalsBpSystolic} onChange={e => setVitalsBpSystolic(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.6875rem' }}>BP DIASTOLIC</label>
                        <input className="form-input" type="text" value={vitalsBpDiastolic} onChange={e => setVitalsBpDiastolic(e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Encounter Information Meta Card */}
              <div className="section-card">
                <div className="section-card-header">
                  <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: '600' }}>Encounter Information</h3>
                </div>
                <div className="section-card-body">
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Encounter ID</label>
                      <p>#{encounter.encounterId}</p>
                    </div>
                    <div className="detail-item">
                      <label>Status</label>
                      <p>{encounter.status}</p>
                    </div>
                    <div className="detail-item">
                      <label>Created By</label>
                      <p>{encounter.clinicianName}</p>
                    </div>
                    <div className="detail-item">
                      <label>Signed By</label>
                      <p>{encounter.signedByName || '—'}</p>
                    </div>
                    <div className="detail-item">
                      <label>Started At</label>
                      <p>{formatDateTime(encounter.startAt)}</p>
                    </div>
                    <div className="detail-item">
                      <label>Ended At</label>
                      <p>{encounter.endAt ? formatDateTime(encounter.endAt) : '—'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'SOAP Notes' && (
            <div className="soap-card-container">
              {/* Subjective */}
              <div className="soap-field-card">
                <div className="soap-field-header">
                  <span className="soap-field-title" style={{ color: '#2563eb' }}>S — Subjective</span>
                  {editingSoap !== 'subjective' && encounter.status === 'IN_PROGRESS' && user?.role === 'CLINICIAN' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingSoap('subjective')}>
                      <Edit size={14} /> Edit
                    </button>
                  )}
                </div>
                <div className="soap-field-desc">Patient's reported symptoms, history, and chief complaint</div>
                {editingSoap === 'subjective' ? (
                  <div>
                    <textarea
                      className="form-textarea"
                      value={soapSubjective}
                      onChange={e => setSoapSubjective(e.target.value)}
                      rows={4}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditingSoap(null)}>Cancel</button>
                      <button className="btn btn-primary btn-sm" onClick={() => handleSaveSoapNote('subjective')} disabled={actionLoading}>Save</button>
                    </div>
                  </div>
                ) : (
                  <div className={`soap-field-content ${!soapSubjective ? 'soap-field-empty' : ''}`}>
                    {soapSubjective || 'No notes recorded'}
                  </div>
                )}
              </div>

              {/* Objective */}
              <div className="soap-field-card">
                <div className="soap-field-header">
                  <span className="soap-field-title" style={{ color: '#2563eb' }}>O — Objective</span>
                  {editingSoap !== 'objective' && encounter.status === 'IN_PROGRESS' && user?.role === 'CLINICIAN' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingSoap('objective')}>
                      <Edit size={14} /> Edit
                    </button>
                  )}
                </div>
                <div className="soap-field-desc">Physical exam findings, observations, and vital measurements</div>
                {editingSoap === 'objective' ? (
                  <div>
                    <textarea
                      className="form-textarea"
                      value={soapObjective}
                      onChange={e => setSoapObjective(e.target.value)}
                      rows={4}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditingSoap(null)}>Cancel</button>
                      <button className="btn btn-primary btn-sm" onClick={() => handleSaveSoapNote('objective')} disabled={actionLoading}>Save</button>
                    </div>
                  </div>
                ) : (
                  <div className={`soap-field-content ${!soapObjective ? 'soap-field-empty' : ''}`}>
                    {soapObjective || 'No notes recorded'}
                  </div>
                )}
              </div>

              {/* Assessment */}
              <div className="soap-field-card">
                <div className="soap-field-header">
                  <span className="soap-field-title" style={{ color: '#d97706' }}>A — Assessment</span>
                  {editingSoap !== 'assessment' && encounter.status === 'IN_PROGRESS' && user?.role === 'CLINICIAN' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingSoap('assessment')}>
                      <Edit size={14} /> Edit
                    </button>
                  )}
                </div>
                <div className="soap-field-desc">Clinical impression, differential diagnosis, and assessment</div>
                {editingSoap === 'assessment' ? (
                  <div>
                    <textarea
                      className="form-textarea"
                      value={soapAssessment}
                      onChange={e => setSoapAssessment(e.target.value)}
                      rows={4}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditingSoap(null)}>Cancel</button>
                      <button className="btn btn-primary btn-sm" onClick={() => handleSaveSoapNote('assessment')} disabled={actionLoading}>Save</button>
                    </div>
                  </div>
                ) : (
                  <div className={`soap-field-content ${!soapAssessment ? 'soap-field-empty' : ''}`}>
                    {soapAssessment || 'No notes recorded'}
                  </div>
                )}
              </div>

              {/* Plan */}
              <div className="soap-field-card">
                <div className="soap-field-header">
                  <span className="soap-field-title" style={{ color: '#10b981' }}>P — Plan</span>
                  {editingSoap !== 'plan' && encounter.status === 'IN_PROGRESS' && user?.role === 'CLINICIAN' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingSoap('plan')}>
                      <Edit size={14} /> Edit
                    </button>
                  )}
                </div>
                <div className="soap-field-desc">Treatment plan, lab orders, prescriptions, and follow-up instructions</div>
                {editingSoap === 'plan' ? (
                  <div>
                    <textarea
                      className="form-textarea"
                      value={soapPlan}
                      onChange={e => setSoapPlan(e.target.value)}
                      rows={4}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditingSoap(null)}>Cancel</button>
                      <button className="btn btn-primary btn-sm" onClick={() => handleSaveSoapNote('plan')} disabled={actionLoading}>Save</button>
                    </div>
                  </div>
                ) : (
                  <div className={`soap-field-content ${!soapPlan ? 'soap-field-empty' : ''}`}>
                    {soapPlan || 'No notes recorded'}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Diagnosis' && (
            <div className="section-card">
              <div className="section-card-header">
                <h3 style={{ margin: 0 }}>Encounter Diagnoses</h3>
              </div>
              <div className="section-card-body">
                {encounter.status === 'IN_PROGRESS' && user?.role === 'CLINICIAN' && (
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Type diagnosis (e.g. J06.9 - Acute upper respiratory infection)"
                      value={newDiagnosis}
                      onChange={e => setNewDiagnosis(e.target.value)}
                    />
                    <button className="btn btn-primary" onClick={handleAddDiagnosis} disabled={actionLoading}>
                      <Plus size={16} /> Add Diagnosis
                    </button>
                  </div>
                )}

                {diagnosesList.length === 0 ? (
                  <div className="dashed-empty-box">
                    <div className="dashed-empty-icon">🩺</div>
                    <h4>No Diagnosis Logged</h4>
                    <p>Add diagnosis codes or clinical findings to this encounter.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {diagnosesList.map((diag, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '12px 16px',
                          background: '#f8fafc',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ fontWeight: '500', color: 'var(--color-text)' }}>{diag}</div>
                        <span className="badge badge-success">ICD-10</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Orders' && (
            <div className="section-card">
              <div className="section-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Lab Orders</h3>
                {encounter.status === 'IN_PROGRESS' && user?.role === 'CLINICIAN' && ordersList.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-input form-input-sm"
                      placeholder="Fast lab order..."
                      value={newOrder}
                      onChange={e => setNewOrder(e.target.value)}
                      style={{ width: '220px' }}
                    />
                    <button className="btn btn-primary btn-sm" onClick={handleAddOrder} disabled={actionLoading}>
                      <Plus size={14} /> Create Lab Order
                    </button>
                  </div>
                )}
              </div>
              <div className="section-card-body">
                {ordersList.length === 0 ? (
                  <div className="dashed-empty-box">
                    <div className="dashed-empty-icon" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>🧪</div>
                    <h4>No lab orders yet</h4>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Order investigations for this encounter</p>
                    
                    {encounter.status === 'IN_PROGRESS' && user?.role === 'CLINICIAN' && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. CBC, Lipid Profile, Chest X-ray"
                          value={newOrder}
                          onChange={e => setNewOrder(e.target.value)}
                        />
                        <button className="btn btn-primary" onClick={handleAddOrder} disabled={actionLoading}>
                          <Plus size={16} /> Create Lab Order
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {ordersList.map((order, index) => (
                      <span
                        key={index}
                        className="badge"
                        style={{
                          background: '#f5f3ff',
                          color: '#8b5cf6',
                          border: '1px solid #ddd6fe',
                          padding: '8px 14px',
                          fontSize: '0.8125rem',
                          fontWeight: '600',
                          borderRadius: 'var(--radius-full)'
                        }}
                      >
                        {order}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Prescriptions' && (
            <div className="section-card">
              <div className="section-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Prescriptions</h3>
                {encounter.status === 'IN_PROGRESS' && prescriptions && prescriptions.length > 0 && (
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/prescriptions/new', { state: { encounterId: encounter.encounterId, patientId: encounter.patientId } })}>
                    <Plus size={14} /> Create Prescription
                  </button>
                )}
              </div>
              <div className="section-card-body">
                {!prescriptions || prescriptions.length === 0 ? (
                  <div className="dashed-empty-box">
                    <div className="dashed-empty-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>💊</div>
                    <h4>No Prescription Created</h4>
                    <p style={{ color: 'var(--color-text-secondary)' }}>No medications have been prescribed for this encounter</p>
                    {encounter.status === 'IN_PROGRESS' && (
                      <button
                        className="btn btn-primary"
                        style={{ background: '#059669', borderColor: '#059669', marginTop: '16px' }}
                        onClick={() => navigate('/prescriptions/new', { state: { encounterId: encounter.encounterId, patientId: encounter.patientId } })}
                      >
                        <Plus size={16} /> Create Prescription
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="data-table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Medication</th>
                          <th>Dosage</th>
                          <th>Frequency</th>
                          <th>Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prescriptions.map((rx, i) => (
                          <tr key={i}>
                            <td className="cell-main">{rx.medicationName}</td>
                            <td>{rx.dosage}</td>
                            <td>{rx.frequency}</td>
                            <td>{rx.durationDays} days</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Timeline' && (
            <div className="section-card">
              <div className="section-card-header">
                <h3 style={{ margin: 0 }}>Clinical Timeline Logs</h3>
              </div>
              <div className="section-card-body" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
                  {/* Vertical line connector */}
                  <div style={{ position: 'absolute', left: '11px', top: '4px', bottom: '4px', width: '2px', background: '#e2e8f0' }}></div>

                  <div style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 1 }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#dbeafe', border: '4px solid #ffffff', display: 'flex', alignItems: 'center', justifyItems: 'center', color: '#2563eb' }}></div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--color-text)' }}>Encounter Started</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Visit type initialized as {encounter.visitType} by {encounter.clinicianName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>{formatDateTime(encounter.startAt)}</div>
                    </div>
                  </div>

                  {(vitalsBpSystolic || vitalsTemp) && (
                    <div style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 1 }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#fee2e2', border: '4px solid #ffffff', display: 'flex', alignItems: 'center', justifyItems: 'center', color: '#ef4444' }}></div>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--color-text)' }}>Vitals Logged</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Initial physical markers and blood pressure values registered</div>
                      </div>
                    </div>
                  )}

                  {(soapSubjective || soapAssessment) && (
                    <div style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 1 }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#fef3c7', border: '4px solid #ffffff', display: 'flex', alignItems: 'center', justifyItems: 'center', color: '#d97706' }}></div>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--color-text)' }}>SOAP Notes Drafted</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Clinician wrote down subjective symptoms and objective clinical observations</div>
                      </div>
                    </div>
                  )}

                  {encounter.status === 'COMPLETED' && (
                    <div style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 1 }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#d1fae5', border: '4px solid #ffffff', display: 'flex', alignItems: 'center', justifyItems: 'center', color: '#10b981' }}></div>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--color-text)' }}>Encounter Signed & Closed</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Signed digitally by {encounter.signedByName || encounter.clinicianName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>{encounter.signedAt ? formatDateTime(encounter.signedAt) : '—'}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Sticky Alerts & Quick Actions Sidebar (visible on all sections) */}
        <div>
          {/* Clinical Alerts Card */}
          <div className="alerts-card">
            <div className="alerts-header">
              <AlertTriangle size={16} />
              Clinical Alerts
            </div>
            <div className="alerts-body">
              <div className="alert-subcard alert-subcard-red">
                <div className="alert-subcard-label">Drug Allergy</div>
                <div className="alert-subcard-val">Penicillin</div>
              </div>
              <div className="alert-subcard alert-subcard-grey">
                <div className="alert-subcard-label">Blood Group</div>
                <div className="alert-subcard-val">O+</div>
              </div>
              <div className="alert-subcard alert-subcard-grey">
                <div className="alert-subcard-label">Insurance ID</div>
                <div className="alert-subcard-val">{patient?.insuranceId || 'BCBS-112233'}</div>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="section-card">
            <div className="section-card-header" style={{ padding: '12px 16px' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>Quick Actions</h3>
            </div>
            <div className="section-card-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', color: '#2563eb', borderColor: '#dbeafe' }}
                onClick={() => setActiveTab('SOAP Notes')}
              >
                <FileText size={16} /> Add Note
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', color: '#10b981', borderColor: '#a7f3d0' }}
                onClick={() => navigate('/prescriptions/new', { state: { encounterId: encounter.encounterId, patientId: encounter.patientId } })}
              >
                <Pill size={16} /> Add Prescription
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', color: '#8b5cf6', borderColor: '#ddd6fe' }}
                onClick={() => setActiveTab('Orders')}
              >
                <ClipboardList size={16} /> Order Lab
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', color: '#64748b' }}
                onClick={() => {
                  toast.success('Printing Encounter summary...');
                  window.print();
                }}
              >
                <Printer size={16} /> Print Encounter
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', color: '#64748b' }}
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Encounter link copied to clipboard!');
                }}
              >
                <Share2 size={16} /> Share Encounter
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
