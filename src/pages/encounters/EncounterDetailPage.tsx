import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getEncounterById,
  completeEncounter,
  deleteEncounter,
  updateEncounter
} from '../../services/encounterService';
import { getPatientById } from '../../services/patientService';
import { getAllPrescriptions, deletePrescription } from '../../services/prescriptionService';
import { getAllOrders, cancelLabOrder } from '../../services/labService';
import type { EncounterResponseDto, PatientResponseDto, PrescriptionResponseDto, LabOrderResponseDto } from '../../models/types';
import LabOrdersTable from '../../components/ui/LabOrdersTable';
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
  ListFilter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { validateVitals, validateSoapNote, validateForSigning } from '../../utils/validation';
import type { VitalsErrors, VitalsWarnings } from '../../utils/validation';
import { Modal } from '../../components/ui/components';
import { ICD10_CODES, validateDiagnosisInput } from '../../utils/icd10Codes';
import '../../assets/styles/encounters/encounter.css';

type TabType = 'Overview' | 'SOAP Notes' | 'Diagnosis' | 'Orders' | 'Prescriptions' | 'Timeline';
const TAB_ICONS: Record<TabType, React.ElementType> = { Overview: Activity, 'SOAP Notes': FileText, Diagnosis: ClipboardList, Orders: ListFilter, Prescriptions: Pill, Timeline: Clock };

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
  const [diagSuggestions, setDiagSuggestions] = useState<{ code: string; description: string }[]>([]);
  const [showDiagDropdown, setShowDiagDropdown] = useState(false);
  const [diagError, setDiagError] = useState('');

  // Vitals Validation
  const [vitalsErrors, setVitalsErrors] = useState<VitalsErrors>({});
  const [vitalsWarnings, setVitalsWarnings] = useState<VitalsWarnings>({});

  // SOAP Validation
  const [soapError, setSoapError] = useState('');

  // Confirmation Modals
  const [showSignModal, setShowSignModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteRxModal, setShowDeleteRxModal] = useState(false);
  const [pendingDeleteRxId, setPendingDeleteRxId] = useState<number | null>(null);
  const [showCancelLabModal, setShowCancelLabModal] = useState(false);
  const [pendingCancelLabId, setPendingCancelLabId] = useState<number | null>(null);
  const [signMissing, setSignMissing] = useState<string[]>([]);

  // Lab Orders State
  const [realLabOrders, setRealLabOrders] = useState<LabOrderResponseDto[]>([]);

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

      // Parse Diagnoses
      const diags = safeParse(encData.diagnosesJson) as string[] | null;
      setDiagnosesList(diags || []);

      // Fetch real lab orders for this encounter
      try {
        const allOrders = await getAllOrders();
        const encounterOrders = allOrders.filter(o => o.encounterId === Number(id));
        setRealLabOrders(encounterOrders);
      } catch (labErr) {
        console.error('Failed to load real lab orders', labErr);
      }
      
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

  const buildPayload = (overrides: Partial<{ vitalsJson: string; notesJson: string; diagnosesJson: string }> = {}) => ({
    patientId: encounter!.patientId,
    visitType: encounter!.visitType,
    chiefComplaint: encounter!.chiefComplaint,
    vitalsJson: overrides.vitalsJson ?? encounter!.vitalsJson,
    notesJson: overrides.notesJson ?? encounter!.notesJson,
    diagnosesJson: overrides.diagnosesJson ?? encounter!.diagnosesJson,
    ordersJson: encounter!.ordersJson,
    status: encounter!.status
  });

  const handleSaveVitals = async () => {
    if (!encounter) return;

    // Validate vitals
    const { errors, warnings, isValid } = validateVitals({
      temp: vitalsTemp, pulse: vitalsPulse, spo2: vitalsSpo2, rr: vitalsRr,
      weight: vitalsWeight, height: vitalsHeight, bpSystolic: vitalsBpSystolic, bpDiastolic: vitalsBpDiastolic
    });
    setVitalsErrors(errors);
    setVitalsWarnings(warnings);
    if (!isValid) {
      toast.error('Please fix vitals errors before saving.');
      return;
    }
    // Show warnings but allow save
    const warningCount = Object.keys(warnings).length;
    if (warningCount > 0) {
      toast(`${warningCount} vital(s) flagged as abnormal — review recommended.`, { icon: '⚠️' });
    }

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

      const updated = await updateEncounter(encounter.encounterId, buildPayload({ vitalsJson: updatedVitalsJson }));
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

    const fieldMap = { subjective: soapSubjective, objective: soapObjective, assessment: soapAssessment, plan: soapPlan };
    const result = validateSoapNote(fieldMap[field], field.charAt(0).toUpperCase() + field.slice(1));
    if (!result.isValid) {
      setSoapError(result.error || '');
      toast.error(result.error || 'Invalid SOAP note.');
      return;
    }
    setSoapError('');

    setActionLoading(true);
    try {
      const updatedNotes = {
        subjective: soapSubjective,
        objective: soapObjective,
        assessment: soapAssessment,
        plan: soapPlan
      };

      const updated = await updateEncounter(encounter.encounterId, buildPayload({ notesJson: JSON.stringify(updatedNotes) }));
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

  const handleDiagnosisSearch = (val: string) => {
    setNewDiagnosis(val);
    setDiagError('');
    if (!val.trim()) {
      setDiagSuggestions([]);
      setShowDiagDropdown(false);
      return;
    }
    const query = val.toLowerCase();
    const matches = ICD10_CODES.filter(
      item =>
        item.code.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
    ).slice(0, 8);
    setDiagSuggestions(matches);
    setShowDiagDropdown(matches.length > 0);
  };

  const selectDiagnosis = (item: { code: string; description: string }) => {
    setNewDiagnosis(`${item.code} - ${item.description}`);
    setDiagSuggestions([]);
    setShowDiagDropdown(false);
    setDiagError('');
  };

  const handleAddDiagnosis = async () => {
    if (!encounter || !newDiagnosis.trim()) return;

    // Validate ICD-10 format
    if (!validateDiagnosisInput(newDiagnosis.trim())) {
      setDiagError('Invalid format. Use ICD-10 code (e.g. J06.9) or select from suggestions.');
      return;
    }

    // Check for duplicates
    if (diagnosesList.includes(newDiagnosis.trim())) {
      setDiagError('This diagnosis has already been added.');
      return;
    }

    setActionLoading(true);
    try {
      const updatedList = [...diagnosesList, newDiagnosis.trim()];
      const updated = await updateEncounter(encounter.encounterId, buildPayload({ diagnosesJson: JSON.stringify(updatedList) }));

      setEncounter(updated);
      setDiagnosesList(updatedList);
      setNewDiagnosis('');
      setDiagError('');
      toast.success('Diagnosis added.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add diagnosis.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveDiagnosis = async (index: number) => {
    if (!encounter) return;
    setActionLoading(true);
    try {
      const updatedList = diagnosesList.filter((_, i) => i !== index);
      const updated = await updateEncounter(encounter.encounterId, buildPayload({ diagnosesJson: JSON.stringify(updatedList) }));

      setEncounter(updated);
      setDiagnosesList(updatedList);
      toast.success('Diagnosis removed.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove diagnosis.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelLabOrder = async (orderId: number) => {
    setPendingCancelLabId(orderId);
    setShowCancelLabModal(true);
  };

  const confirmCancelLabOrder = async () => {
    if (!pendingCancelLabId) return;
    setShowCancelLabModal(false);
    setActionLoading(true);
    try {
      await cancelLabOrder(pendingCancelLabId);
      toast.success('Lab order cancelled successfully.');
      const allOrders = await getAllOrders();
      const encounterOrders = allOrders.filter(o => o.encounterId === Number(id));
      setRealLabOrders(encounterOrders);
    } catch (err: any) {
      console.error('Failed to cancel lab order', err);
      toast.error(err.message || 'Failed to cancel lab order.');
    } finally {
      setActionLoading(false);
      setPendingCancelLabId(null);
    }
  };

  const confirmDeleteRx = async () => {
    if (!pendingDeleteRxId) return;
    setShowDeleteRxModal(false);
    try {
      await deletePrescription(pendingDeleteRxId);
      setPrescriptions(prev => prev.filter(p => p.rxId !== pendingDeleteRxId));
      toast.success('Prescription removed.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove prescription.');
    } finally {
      setPendingDeleteRxId(null);
    }
  };

  const handleComplete = async () => {
    if (!encounter || encounter.status !== 'IN_PROGRESS') return;

    // Pre-sign completeness validation
    const check = validateForSigning({
      bpSystolic: vitalsBpSystolic, bpDiastolic: vitalsBpDiastolic,
      temp: vitalsTemp, pulse: vitalsPulse,
      subjective: soapSubjective, assessment: soapAssessment,
      diagnosesCount: diagnosesList.length
    });

    if (!check.canSign) {
      setSignMissing(check.missing);
      setShowSignModal(true);
      return;
    }

    setSignMissing([]);
    setShowSignModal(true);
  };

  const confirmSign = async () => {
    if (!encounter) return;
    setShowSignModal(false);
    setActionLoading(true);
    try {
      const updated = await completeEncounter(encounter.encounterId);
      setEncounter(updated);

      // The backend atomically completes the linked appointment (if any)
      // when the encounter is signed, so no client-side appointment update
      // is needed here.
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
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!encounter) return;
    setShowDeleteModal(false);
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
              <button className="btn btn-secondary" onClick={() => navigate('/lab/new', { state: { encounterId: encounter.encounterId, patientId: encounter.patientId } })} title="Order Lab investigations">
                <ClipboardList size={16} /> Order Lab
              </button>
              <button className="btn btn-secondary" onClick={() => toast.success('Encounter progress saved as draft.')}>
                <Save size={16} /> Save Draft
              </button>
              <button className="btn btn-primary" style={{ background: '#10b981', borderColor: '#10b981' }} onClick={handleComplete} disabled={actionLoading}>
                <CheckCircle size={16} /> {actionLoading ? 'Signing...' : 'Sign Encounter'}
              </button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={actionLoading}>
                <Trash2 size={16} /> Delete
              </button>
            </>
          )}
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
          const Icon = TAB_ICONS[tab];
          return (
            <button key={tab} type="button" className={`encounter-tab-item ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
              <Icon size={16} /> {tab}
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
                    {[
                      { icon: <Heart size={16} />, bg: '#fef2f2', color: '#ef4444', value: vitalsBpSystolic && vitalsBpDiastolic ? `${vitalsBpSystolic}/${vitalsBpDiastolic}` : '—', label: 'BP', sub: 'mmHg' },
                      { icon: <Activity size={16} />, bg: '#fff7ed', color: '#f97316', value: vitalsTemp ? `${vitalsTemp}°C` : '—', label: 'Temp', sub: 'Celsius' },
                      { icon: <HeartPulse size={16} />, bg: '#fdf2f8', color: '#ec4899', value: vitalsPulse ? `${vitalsPulse} bpm` : '—', label: 'Pulse', sub: 'Beats/Min' },
                      { icon: <Activity size={16} />, bg: '#eff6ff', color: '#3b82f6', value: vitalsSpo2 ? `${vitalsSpo2}%` : '—', label: 'SpO2', sub: 'Oxygen Sat' },
                      { icon: <Info size={16} />, bg: '#faf5ff', color: '#a855f7', value: vitalsWeight ? `${vitalsWeight} kg` : '—', label: 'Weight', sub: 'Kilograms' },
                      { icon: <Info size={16} />, bg: '#f0fdf4', color: '#22c55e', value: vitalsHeight ? `${vitalsHeight} cm` : '—', label: 'Height', sub: 'Centimeters' },
                      { icon: <Activity size={16} />, bg: '#ecfdf5', color: '#10b981', value: vitalsRr ? `${vitalsRr} /m` : '—', label: 'RR', sub: 'Resp Rate' },
                    ].map(v => (
                      <div className="vital-stat-box" key={v.label}>
                        <div className="vital-stat-icon-wrapper" style={{ background: v.bg, color: v.color }}>{v.icon}</div>
                        <div className="vital-stat-value">{v.value}</div>
                        <div className="vital-stat-label">{v.label}</div>
                        <div className="vital-stat-sublabel">{v.sub}</div>
                      </div>
                    ))}
                  </div>

                  {encounter.status === 'IN_PROGRESS' && (
                    <div className="vitals-inputs-grid">
                      {[
                        { key: 'temp' as const, label: 'TEMP (°C)', value: vitalsTemp, set: setVitalsTemp, hasWarning: true },
                        { key: 'pulse' as const, label: 'PULSE (BPM)', value: vitalsPulse, set: setVitalsPulse, hasWarning: true },
                        { key: 'spo2' as const, label: 'SPO2 (%)', value: vitalsSpo2, set: setVitalsSpo2, hasWarning: true },
                        { key: 'rr' as const, label: 'RR (/MIN)', value: vitalsRr, set: setVitalsRr, hasWarning: true },
                        { key: 'weight' as const, label: 'WEIGHT (KG)', value: vitalsWeight, set: setVitalsWeight, hasWarning: false },
                        { key: 'height' as const, label: 'HEIGHT (CM)', value: vitalsHeight, set: setVitalsHeight, hasWarning: false },
                        { key: 'bpSystolic' as const, label: 'BP SYSTOLIC', value: vitalsBpSystolic, set: setVitalsBpSystolic, hasWarning: true },
                        { key: 'bpDiastolic' as const, label: 'BP DIASTOLIC', value: vitalsBpDiastolic, set: setVitalsBpDiastolic, hasWarning: true },
                      ].map(f => (
                        <div className="form-group" key={f.key}>
                          <label className="form-label" style={{ fontSize: '0.6875rem' }}>{f.label}</label>
                          <input className="form-input" type="text" value={f.value} onChange={e => f.set(e.target.value)} style={vitalsErrors[f.key] ? { borderColor: '#ef4444' } : f.hasWarning && vitalsWarnings[f.key] ? { borderColor: '#f59e0b' } : {}} />
                          {vitalsErrors[f.key] && <div style={{ color: '#ef4444', fontSize: '0.6875rem', marginTop: '2px' }}>{vitalsErrors[f.key]}</div>}
                          {!vitalsErrors[f.key] && f.hasWarning && vitalsWarnings[f.key] && <div style={{ color: '#f59e0b', fontSize: '0.6875rem', marginTop: '2px' }}>⚠ {vitalsWarnings[f.key]}</div>}
                        </div>
                      ))}
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
              {([
                { key: 'subjective' as const, letter: 'S', title: 'Subjective', color: '#2563eb', desc: "Patient's reported symptoms, history, and chief complaint", value: soapSubjective, set: setSoapSubjective },
                { key: 'objective' as const, letter: 'O', title: 'Objective', color: '#2563eb', desc: 'Physical exam findings, observations, and vital measurements', value: soapObjective, set: setSoapObjective },
                { key: 'assessment' as const, letter: 'A', title: 'Assessment', color: '#d97706', desc: 'Clinical impression, differential diagnosis, and assessment', value: soapAssessment, set: setSoapAssessment },
                { key: 'plan' as const, letter: 'P', title: 'Plan', color: '#10b981', desc: 'Treatment plan, lab orders, prescriptions, and follow-up instructions', value: soapPlan, set: setSoapPlan },
              ] as const).map(s => (
                <div className="soap-field-card" key={s.key}>
                  <div className="soap-field-header">
                    <span className="soap-field-title" style={{ color: s.color }}>{s.letter} — {s.title}</span>
                    {editingSoap !== s.key && encounter.status === 'IN_PROGRESS' && user?.role === 'CLINICIAN' && (
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditingSoap(s.key)}><Edit size={14} /> Edit</button>
                    )}
                  </div>
                  <div className="soap-field-desc">{s.desc}</div>
                  {editingSoap === s.key ? (
                    <div>
                      <textarea className="form-textarea" value={s.value} onChange={e => { s.set(e.target.value); setSoapError(''); }} rows={4} style={soapError && editingSoap === s.key ? { borderColor: '#ef4444' } : {}} />
                      {soapError && editingSoap === s.key && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>{soapError}</div>}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditingSoap(null); setSoapError(''); }}>Cancel</button>
                        <button className="btn btn-primary btn-sm" onClick={() => handleSaveSoapNote(s.key)} disabled={actionLoading}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <div className={`soap-field-content ${!s.value ? 'soap-field-empty' : ''}`}>{s.value || 'No notes recorded'}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'Diagnosis' && (
            <div className="section-card">
              <div className="section-card-header">
                <h3 style={{ margin: 0 }}>Encounter Diagnoses</h3>
              </div>
              <div className="section-card-body">
                {encounter.status === 'IN_PROGRESS' && user?.role === 'CLINICIAN' && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '10px', position: 'relative' }}>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Search ICD-10 code or description (e.g. J06.9, headache, diabetes)"
                          value={newDiagnosis}
                          onChange={e => handleDiagnosisSearch(e.target.value)}
                          onFocus={() => setShowDiagDropdown(diagSuggestions.length > 0)}
                          onBlur={() => setTimeout(() => setShowDiagDropdown(false), 200)}
                          style={{ borderColor: diagError ? 'var(--color-danger)' : undefined }}
                        />
                        {showDiagDropdown && diagSuggestions.length > 0 && (
                          <div className="autocomplete-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50 }}>
                            {diagSuggestions.map(item => (
                              <div
                                key={item.code}
                                className="autocomplete-item"
                                onMouseDown={() => selectDiagnosis(item)}
                              >
                                <div className="autocomplete-item-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontWeight: '700', color: '#2563eb', fontSize: '0.8125rem', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>{item.code}</span>
                                  <span>{item.description}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <button className="btn btn-primary" onClick={handleAddDiagnosis} disabled={actionLoading}>
                        <Plus size={16} /> Add Diagnosis
                      </button>
                    </div>
                    {diagError && (
                      <div style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '6px' }}>
                        {diagError}
                      </div>
                    )}
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                      Format: ICD-10 code (e.g. <strong>R51</strong>, <strong>J06.9</strong>) or select from suggestions. Manual entry must follow ICD-10 format.
                    </div>
                  </div>
                )}

                {diagnosesList.length === 0 ? (
                  <div className="dashed-empty-box">
                    <div className="dashed-empty-icon">🩺</div>
                    <h4>No Diagnosis Logged</h4>
                    <p>Add ICD-10 diagnosis codes to this encounter.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {diagnosesList.map((diag, index) => {
                      const parts = diag.split(' - ');
                      const code = parts[0];
                      const desc = parts.slice(1).join(' - ');
                      return (
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontWeight: '700', color: '#2563eb', fontSize: '0.8125rem', background: '#eff6ff', padding: '4px 8px', borderRadius: '4px' }}>{code}</span>
                            {desc && <span style={{ fontWeight: '500', color: 'var(--color-text)' }}>{desc}</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="badge badge-success">ICD-10</span>
                            {encounter.status === 'IN_PROGRESS' && user?.role === 'CLINICIAN' && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-icon"
                                style={{ color: '#ef4444', padding: '4px', minWidth: 'auto', height: 'auto' }}
                                onClick={() => handleRemoveDiagnosis(index)}
                                disabled={actionLoading}
                                title="Remove diagnosis"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

         {activeTab === 'Orders' && (
            <div className="section-card">
              <div className="section-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Lab Orders</h3>
                 {encounter.status === 'IN_PROGRESS' && user?.role === 'CLINICIAN' && realLabOrders.length > 0 && (
                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={() => navigate('/lab/new', { state: { encounterId: encounter.encounterId, patientId: encounter.patientId } })}
                  >
                    <Plus size={14} /> Create Lab Order
                  </button>
                )}
              </div>
              <div className="section-card-body">
                {realLabOrders.length === 0 ? (
                     <div className="dashed-empty-box">
                    <div className="dashed-empty-icon" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>🧪</div>
                    <h4>No lab orders yet</h4>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Order investigations for this encounter</p>
                    
                    {encounter.status === 'IN_PROGRESS' && user?.role === 'CLINICIAN' && (
                    <button 
                        className="btn btn-primary" 
                        style={{ marginTop: '16px' }}
                        onClick={() => navigate('/lab/new', { state: { encounterId: encounter.encounterId, patientId: encounter.patientId } })}
                      >
                        <Plus size={16} /> Create Lab Order
                      </button>
                     )}
                  </div>
                ) : (
               <LabOrdersTable
                    orders={realLabOrders}
                    context="encounter"
                    onCancelOrder={handleCancelLabOrder}
                    actionLoading={actionLoading}
                  />
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
                          {encounter.status === 'IN_PROGRESS' && user?.role === 'CLINICIAN' && <th style={{ textAlign: 'center' }}>Action</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {prescriptions.map((rx, i) => (
                          <tr key={i}>
                            <td className="cell-main">{rx.medicationName}</td>
                            <td>{rx.dosage}</td>
                            <td>{rx.frequency}</td>
                            <td>{rx.durationDays} days</td>
                            {encounter.status === 'IN_PROGRESS' && user?.role === 'CLINICIAN' && (
                              <td style={{ textAlign: 'center' }}>
                                {rx.status === 'ISSUED' || rx.status === 'DISPENSED' || rx.status === 'ACTIVE' || rx.status === 'COMPLETED' ? (
                                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>—</span>
                                ) : (
                                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                    <button
                                      type="button"
                                      className="btn btn-ghost btn-icon"
                                      style={{ color: '#2563eb', padding: '4px', minWidth: 'auto', height: 'auto' }}
                                      onClick={() => navigate(`/prescriptions/${rx.rxId}/edit`)}
                                      title="Edit prescription"
                                      disabled={actionLoading}
                                    >
                                      <Edit size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-ghost btn-icon"
                                      style={{ color: '#ef4444', padding: '4px', minWidth: 'auto', height: 'auto' }}
                                      onClick={() => {
                                        setPendingDeleteRxId(rx.rxId);
                                        setShowDeleteRxModal(true);
                                      }}
                                      title="Remove prescription"
                                      disabled={actionLoading}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            )}
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
              <div className="section-card-header"><h3 style={{ margin: 0 }}>Clinical Timeline Logs</h3></div>
              <div className="section-card-body" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '11px', top: '4px', bottom: '4px', width: '2px', background: '#e2e8f0' }}></div>
                  {[
                    { show: true, bg: '#dbeafe', color: '#2563eb', title: 'Encounter Started', desc: `Visit type initialized as ${encounter.visitType} by ${encounter.clinicianName}`, time: formatDateTime(encounter.startAt) },
                    { show: !!(vitalsBpSystolic || vitalsTemp), bg: '#fee2e2', color: '#ef4444', title: 'Vitals Logged', desc: 'Initial physical markers and blood pressure values registered' },
                    { show: !!(soapSubjective || soapAssessment), bg: '#fef3c7', color: '#d97706', title: 'SOAP Notes Drafted', desc: 'Clinician wrote down subjective symptoms and objective clinical observations' },
                    { show: encounter.status === 'COMPLETED', bg: '#d1fae5', color: '#10b981', title: 'Encounter Signed & Closed', desc: `Signed digitally by ${encounter.signedByName || encounter.clinicianName}`, time: encounter.signedAt ? formatDateTime(encounter.signedAt) : undefined },
                  ].filter(e => e.show).map(e => (
                    <div key={e.title} style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 1 }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: e.bg, border: '4px solid #ffffff', display: 'flex', alignItems: 'center', justifyItems: 'center', color: e.color }}></div>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--color-text)' }}>{e.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{e.desc}</div>
                        {e.time && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>{e.time}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Sign Encounter Modal */}
      <Modal isOpen={showSignModal} onClose={() => setShowSignModal(false)} title={signMissing.length > 0 ? 'Cannot Sign Encounter' : 'Sign & Complete Encounter'}>
        {signMissing.length > 0 ? (
          <>
            <p style={{ color: '#ef4444', fontWeight: 600 }}><AlertTriangle size={16} style={{ verticalAlign: 'middle' }} /> Complete these items before signing:</p>
            <ul style={{ margin: '8px 0 16px 20px', lineHeight: 2 }}>{signMissing.map((m, i) => <li key={i}>{m}</li>)}</ul>
            <div style={{ textAlign: 'right' }}><button className="btn btn-secondary" onClick={() => setShowSignModal(false)}>Close</button></div>
          </>
        ) : (
          <>
            <p><CheckCircle size={16} style={{ verticalAlign: 'middle', color: '#10b981' }} /> All required fields are complete. Signing marks the encounter as <strong>Completed</strong> and issues all DRAFT prescriptions. This cannot be undone.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn btn-secondary" onClick={() => setShowSignModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: '#10b981', borderColor: '#10b981' }} onClick={confirmSign} disabled={actionLoading}>
                <CheckCircle size={16} /> {actionLoading ? 'Signing...' : 'Confirm & Sign'}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Delete Encounter Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Encounter">
        <p>Permanently delete <strong>Encounter #{encounter.encounterId}</strong> for <strong>{encounter.patientName}</strong>? All associated data will be removed.</p>
        <p style={{ color: '#ef4444', fontSize: '0.8125rem' }}>This action cannot be undone.</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={confirmDelete} disabled={actionLoading}><Trash2 size={16} /> {actionLoading ? 'Deleting...' : 'Delete'}</button>
        </div>
      </Modal>

      {/* Delete Prescription Modal */}
      <Modal isOpen={showDeleteRxModal} onClose={() => { setShowDeleteRxModal(false); setPendingDeleteRxId(null); }} title="Remove Prescription">
        <p>Remove this prescription? This action cannot be undone.</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button className="btn btn-secondary" onClick={() => { setShowDeleteRxModal(false); setPendingDeleteRxId(null); }}>Cancel</button>
          <button className="btn btn-danger" onClick={confirmDeleteRx}><Trash2 size={16} /> Remove</button>
        </div>
      </Modal>

      {/* Cancel Lab Order Modal */}
      <Modal isOpen={showCancelLabModal} onClose={() => { setShowCancelLabModal(false); setPendingCancelLabId(null); }} title="Cancel Lab Order">
        <p>Cancel this lab order? This action cannot be undone.</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button className="btn btn-secondary" onClick={() => { setShowCancelLabModal(false); setPendingCancelLabId(null); }}>Keep Order</button>
          <button className="btn btn-danger" onClick={confirmCancelLabOrder} disabled={actionLoading}><Trash2 size={16} /> {actionLoading ? 'Cancelling...' : 'Cancel Order'}</button>
        </div>
      </Modal>
    </div>
  );
}
