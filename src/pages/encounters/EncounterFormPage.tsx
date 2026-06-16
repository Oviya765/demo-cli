import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEncounter } from '../../services/encounterService';
import { searchPatients } from '../../services/patientService';
import type { PatientResponseDto } from '../../models/types';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowLeft,
  Check,
  CheckCircle,
  User,
  Activity,
  AlertTriangle,
  HeartPulse,
  Calendar,
  Search,
  Sparkles
} from 'lucide-react';
import '../../assets/styles/encounters/encounter.css';

const ENCOUNTER_TYPES = [
  {
    type: 'Consultation',
    icon: Activity,
    title: 'Consultation',
    desc: 'Specialist clinical review or standard visit.',
  },
  {
    type: 'Follow-Up',
    icon: Calendar,
    title: 'Follow-Up',
    desc: 'Standard review of existing care plan.',
  },
  {
    type: 'Emergency',
    icon: AlertTriangle,
    title: 'Emergency',
    desc: 'Urgent/high priority immediate care.',
  },
  {
    type: 'Routine Check',
    icon: HeartPulse,
    title: 'Routine Check',
    desc: 'General health checkup and assessment.',
  },
];

const SUGGESTION_TAGS = [
  'Headache',
  'Chest pain',
  'Fever',
  'Cough',
  'Shortness of breath',
  'Abdominal pain',
  'Sore throat',
  'Nausea',
  'Dizziness',
  'Fatigue'
];

export default function EncounterFormPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [patientMrn, setPatientMrn] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientResponseDto | null>(null);
  const [searchResults, setSearchResults] = useState<PatientResponseDto[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [patientError, setPatientError] = useState('');

  const [visitType, setVisitType] = useState('Consultation');
  const [chiefComplaint, setChiefComplaint] = useState('');

  const handlePatientSearch = async (val: string) => {
    setPatientMrn(val);
    setPatientError('');
    if (!val.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      setSelectedPatient(null);
      return;
    }
    try {
      const results = await searchPatients(val);
      setSearchResults(results);
      setShowDropdown(true);

      const exact = results.find(p => p.mrn.toLowerCase() === val.trim().toLowerCase());
      if (exact) {
        setSelectedPatient(exact);
        setShowDropdown(false);
      } else {
        setSelectedPatient(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      setPatientError('Please search and select a valid patient.');
      return;
    }

    setLoading(true);

    try {
      const newEnc = await createEncounter({
        patientId: selectedPatient.patientId,
        visitType,
        chiefComplaint,
        vitalsJson: JSON.stringify({ bp: '', temp: '', pulse: '', spo2: '', weight: '' }),
        notesJson: JSON.stringify({ subjective: '', objective: '', assessment: '', plan: '' }),
        diagnosesJson: '[]',
        ordersJson: '[]',
      });
      navigate(`/encounters/${newEnc.encounterId}`);
    } catch (err) {
      console.error('Failed to create encounter', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedTypeObj = ENCOUNTER_TYPES.find(t => t.type === visitType) || ENCOUNTER_TYPES[0];
  const TypeIcon = selectedTypeObj.icon;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => navigate('/encounters')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>Open New Encounter</h1>
            <p>Create a dynamic step-by-step patient encounter</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="encounter-split-container">
          {/* Left Side: Step by Step Form */}
          <div className="encounter-form-steps">
            
            {/* Step 1: Patient Search */}
            <div className="section-card">
              <div className="section-card-body">
                <div className="step-header">
                  <div className="step-number">1</div>
                  <div className="step-title">Patient Identification</div>
                  {selectedPatient && <Check className="step-success-check" size={18} />}
                </div>
                
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">Search Patient (MRN or Name) <span className="required">*</span></label>
                  <div className="autocomplete-container">
                    <div style={{ position: 'relative' }}>
                      <input
                        className="form-input"
                        type="text"
                        placeholder="Type patient name or MRN to search..."
                        value={patientMrn}
                        onChange={e => handlePatientSearch(e.target.value)}
                        onFocus={() => setShowDropdown(searchResults.length > 0)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                        required
                        style={{ paddingLeft: '36px' }}
                      />
                      <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    </div>
                    {showDropdown && searchResults.length > 0 && (
                      <div className="autocomplete-dropdown">
                        {searchResults.map(p => (
                          <div
                            key={p.patientId}
                            className="autocomplete-item"
                            onMouseDown={() => {
                              setSelectedPatient(p);
                              setPatientMrn(p.mrn);
                              setSearchResults([]);
                              setShowDropdown(false);
                            }}
                          >
                            <div className="autocomplete-item-name">{p.name}</div>
                            <div className="autocomplete-item-sub">MRN: {p.mrn} | DOB: {p.dob}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {patientError && <div style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '4px' }}>{patientError}</div>}
                  
                  {selectedPatient && (
                    <div className="patient-summary-card">
                      <div className="patient-summary-icon">
                        <User size={18} />
                      </div>
                      <div className="patient-summary-info">
                        <div className="patient-summary-name">{selectedPatient.name}</div>
                        <div className="patient-summary-meta">MRN: {selectedPatient.mrn} | DOB: {selectedPatient.dob} | Gender: {selectedPatient.gender}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2: Encounter Type Selector */}
            <div className="section-card">
              <div className="section-card-body">
                <div className="step-header">
                  <div className="step-number">2</div>
                  <div className="step-title">Encounter Category / Visit Type</div>
                  <Check className="step-success-check" size={18} />
                </div>

                <div className="encounter-types-grid">
                  {ENCOUNTER_TYPES.map(item => {
                    const CardIcon = item.icon;
                    const isSelected = visitType === item.type;
                    return (
                      <div
                        key={item.type}
                        className={`encounter-type-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setVisitType(item.type)}
                      >
                        <div className="encounter-type-card-icon">
                          <CardIcon size={20} />
                        </div>
                        <div className="encounter-type-card-title">{item.title}</div>
                        <div className="encounter-type-card-desc">{item.desc}</div>
                        {isSelected && (
                          <div className="encounter-type-card-check">
                            <CheckCircle size={16} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Step 3: Attending Physician */}
            <div className="section-card">
              <div className="section-card-body">
                <div className="step-header">
                  <div className="step-number">3</div>
                  <div className="step-title">Attending Clinician</div>
                  <Check className="step-success-check" size={18} />
                </div>

                <div className="physician-card">
                  <div className="physician-avatar">
                    {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'DR'}
                  </div>
                  <div className="physician-info">
                    <div className="physician-name">Dr. {user?.name || 'Attending Physician'}</div>
                    <div className="physician-role-email">{user?.role || 'CLINICIAN'} | {user?.email || 'N/A'}</div>
                  </div>
                  <div className="physician-badge">
                    <CheckCircle size={16} /> Assigned
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Chief Complaint */}
            <div className="section-card">
              <div className="section-card-body">
                <div className="step-header">
                  <div className="step-number">4</div>
                  <div className="step-title">Chief Complaint</div>
                  {chiefComplaint.trim() && <Check className="step-success-check" size={18} />}
                </div>

                <div className="form-group">
                  <label className="form-label">Primary Reason for Visit <span className="required">*</span></label>
                  <textarea
                    className="form-textarea"
                    placeholder="Enter the primary complaint, symptoms or reason for clinical visit..."
                    value={chiefComplaint}
                    onChange={e => setChiefComplaint(e.target.value)}
                    rows={4}
                    required
                  />
                  <div className="complaint-tags">
                    {SUGGESTION_TAGS.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        className="complaint-tag"
                        onClick={() => {
                          if (chiefComplaint.trim() === '') {
                            setChiefComplaint(tag);
                          } else {
                            setChiefComplaint(prev => prev.trim().endsWith(',') || prev.trim().endsWith('.') ? `${prev.trim()} ${tag}` : `${prev.trim()}, ${tag}`);
                          }
                        }}
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/encounters')}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                <Sparkles size={18} />
                {loading ? 'Creating...' : 'Open Encounter'}
              </button>
            </div>

          </div>

          {/* Right Side: Sticky Preview Sidebar */}
          <div className="encounter-preview-sidebar">
            <div className="encounter-preview-card">
              <div className="encounter-preview-header">
                <div className="encounter-preview-title">Encounter Summary</div>
                <div className="encounter-preview-type">
                  <TypeIcon size={20} />
                  {visitType}
                </div>
              </div>

              <div className="encounter-preview-body">
                <div className="encounter-preview-item">
                  <div className="encounter-preview-label">Patient</div>
                  <div className={`encounter-preview-val ${!selectedPatient ? 'empty' : ''}`}>
                    {selectedPatient ? selectedPatient.name : 'No patient selected'}
                  </div>
                </div>

                <div className="encounter-preview-item">
                  <div className="encounter-preview-label">MRN</div>
                  <div className={`encounter-preview-val ${!selectedPatient ? 'empty' : ''}`}>
                    {selectedPatient ? selectedPatient.mrn : '—'}
                  </div>
                </div>

                <div className="encounter-preview-item">
                  <div className="encounter-preview-label">Clinician</div>
                  <div className="encounter-preview-val">
                    Dr. {user?.name || 'Clinician'}
                  </div>
                </div>

                <div className="encounter-preview-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                  <div className="encounter-preview-label">Chief Complaint</div>
                  <div className={`encounter-preview-val ${!chiefComplaint ? 'empty' : ''}`} style={{ textAlign: 'left', width: '100%', wordBreak: 'break-word', fontSize: '0.8125rem' }}>
                    {chiefComplaint ? chiefComplaint : 'No complaint entered yet'}
                  </div>
                </div>
              </div>

              <div className="encounter-preview-footer">
                <span className="badge badge-warning" style={{ fontSize: '0.6875rem' }}>
                  <span className="badge-dot"></span> Draft - Ready
                </span>
              </div>
            </div>

            <div className="info-card">
              <div className="info-card-header">
                <Activity size={16} />
                After Opening Encounter
              </div>
              <ul className="info-card-list">
                <li>Record real-time patient Vitals</li>
                <li>Write down clinical notes (SOAP layout)</li>
                <li>Add ICD-10 Diagnoses & Lab Orders</li>
                <li>Issue e-Prescriptions directly linked to visit</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
