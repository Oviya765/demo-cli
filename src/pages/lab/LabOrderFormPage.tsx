import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createLabOrder } from '../../services/labService';
import { searchPatients, getPatientById } from '../../services/patientService';
import { getAllEncounters } from '../../services/encounterService';
import type { PatientResponseDto, EncounterResponseDto } from '../../models/types';
import { ArrowLeft, Save, User, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import '../../assets/styles/lab/LabOrderFormPage.css';

const COMMON_TESTS = [
  { code: 'CBC', name: 'Complete Blood Count' },
  { code: 'CRP', name: 'C-Reactive Protein' },
  { code: 'LFT', name: 'Liver Function Test' },
  { code: 'KFT', name: 'Kidney Function Test' },
  { code: 'HbA1c', name: 'Glycated Hemoglobin' },
  { code: 'Lipid Profile', name: 'Lipid Panel' },
  { code: 'Urine Routine', name: 'Urinalysis' },
  { code: 'Thyroid Panel', name: 'TSH / Free T4' },
];

export default function LabOrderFormPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [encounters, setEncounters] = useState<EncounterResponseDto[]>([]);

  // Pre-filled from redirect state if coming from Encounter details
  const stateEncounterId = location.state?.encounterId;
  const statePatientId = location.state?.patientId;

  // Patient selection state
  const [patientQuery, setPatientQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientResponseDto | null>(null);
  const [searchResults, setSearchResults] = useState<PatientResponseDto[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Form states
  const [encounterId, setEncounterId] = useState<number | ''>('');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [customTest, setCustomTest] = useState('');
  const [sampleId, setSampleId] = useState('');

  useEffect(() => {
    if (statePatientId && stateEncounterId) {
      resolveStateData();
    }
  }, [statePatientId, stateEncounterId]);

  useEffect(() => {
    if (selectedPatient) {
      loadPatientEncounters(selectedPatient.patientId);
    } else {
      setEncounters([]);
      setEncounterId('');
    }
  }, [selectedPatient]);

  const resolveStateData = async () => {
    setLoading(true);
    try {
      const patient = await getPatientById(Number(statePatientId));
      setSelectedPatient(patient);
      setPatientQuery(patient.name);
      setEncounterId(Number(stateEncounterId));
    } catch (err: any) {
      toast.error('Failed to resolve patient details');
    } finally {
      setLoading(false);
    }
  };

  const loadPatientEncounters = async (patientId: number) => {
    try {
      const all = await getAllEncounters();
      const patientEncs = all.filter(e => e.patientId === patientId);
      setEncounters(patientEncs);
      
      // Auto select the first encounter if none is selected
      if (patientEncs.length > 0 && !encounterId) {
        setEncounterId(patientEncs[0].encounterId);
      }
    } catch (err) {
      console.error('Failed to fetch patient encounters', err);
    }
  };

  const handlePatientSearch = async (val: string) => {
    setPatientQuery(val);
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

  const handleToggleTest = (code: string) => {
    if (selectedTests.includes(code)) {
      setSelectedTests(selectedTests.filter(t => t !== code));
    } else {
      setSelectedTests([...selectedTests, code]);
    }
  };

  const handleAddCustomTest = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && customTest.trim()) {
      e.preventDefault();
      const val = customTest.trim();
      if (!selectedTests.includes(val)) {
        setSelectedTests([...selectedTests, val]);
      }
      setCustomTest('');
    }
  };

  const handleAddCustomTestClick = () => {
    if (customTest.trim()) {
      const val = customTest.trim();
      if (!selectedTests.includes(val)) {
        setSelectedTests([...selectedTests, val]);
      }
      setCustomTest('');
    }
  };

  const handleRemoveTest = (code: string) => {
    setSelectedTests(selectedTests.filter(t => t !== code));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedPatient) {
      toast.error('Please select a valid patient.');
      return;
    }

    if (!encounterId) {
      toast.error('Please select or create an encounter for this patient.');
      return;
    }

    if (selectedTests.length === 0) {
      toast.error('Please select or add at least one test.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        encounterId: Number(encounterId),
        testsJson: JSON.stringify(selectedTests),
        sampleId: sampleId.trim() || undefined,
        collectedAt: undefined // Backend handles time control
      };

      await createLabOrder(payload);
      toast.success('Lab order placed successfully!');
      navigate(stateEncounterId ? `/encounters/${stateEncounterId}` : '/lab');
    } catch (err: any) {
      toast.error(err.message || 'Failed to place lab order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => navigate(stateEncounterId ? `/encounters/${stateEncounterId}` : '/lab')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>Order Diagnostics Test</h1>
            <p>Select a patient and configure the requested laboratory panels</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="dashboard-grid" style={{ gridTemplateColumns: '3fr 2fr', gap: '32px' }}>
          
          {/* Column Left: Demographics & Test Configuration */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Patient Select Card */}
            <div className="card" style={{ padding: '24px' }}>
              <div className="card-header" style={{ marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={18} style={{ color: 'var(--color-primary)' }} />
                  Patient Selection
                </h3>
              </div>
              <div className="card-body">
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">Search Patient (Name or MRN) <span className="required">*</span></label>
                  <div className="autocomplete-container">
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Type patient MRN or Name to search..."
                      value={patientQuery}
                      onChange={e => handlePatientSearch(e.target.value)}
                      onFocus={() => setShowDropdown(searchResults.length > 0)}
                      onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                      disabled={!!statePatientId}
                      required
                    />
                    {showDropdown && searchResults.length > 0 && (
                      <div className="autocomplete-dropdown">
                        {searchResults.map(p => (
                          <div
                            key={p.patientId}
                            className="autocomplete-item"
                            onMouseDown={() => {
                              setSelectedPatient(p);
                              setPatientQuery(p.name);
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
                </div>

                {selectedPatient && (
                  <div className="patient-summary-card" style={{ marginTop: '20px' }}>
                    <div className="patient-summary-icon"><User size={18} /></div>
                    <div className="patient-summary-info">
                      <div className="patient-summary-name">{selectedPatient.name}</div>
                      <div className="patient-summary-meta">
                        MRN: {selectedPatient.mrn} | DOB: {selectedPatient.dob} | Gender: {selectedPatient.gender.toLowerCase()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Test Panels Configuration Card */}
            <div className="card" style={{ padding: '24px' }}>
              <div className="card-header" style={{ marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <h3>Configure Test Panels</h3>
              </div>
              <div className="card-body">
                
                {/* Standard Checkboxes */}
                <label className="form-label" style={{ marginBottom: '12px' }}>Common Lab Panels</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
                  {COMMON_TESTS.map(test => {
                    const checked = selectedTests.includes(test.code);
                    return (
                      <label 
                        key={test.code}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          borderRadius: '8px',
                          border: checked ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.05)',
                          background: checked ? 'rgba(6, 182, 212, 0.05)' : 'rgba(255,255,255,0.01)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleTest(test.code)}
                          style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{test.code}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>{test.name}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Add Custom Test */}
                <div className="form-group">
                  <label className="form-label">Add Custom / Specific Test Code</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="e.g. Troponin-I, BMP, Vitamin D..."
                      value={customTest}
                      onChange={e => setCustomTest(e.target.value)}
                      onKeyDown={handleAddCustomTest}
                    />
                    <button type="button" className="btn btn-secondary" onClick={handleAddCustomTestClick}>
                      <Plus size={16} /> Add
                    </button>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', display: 'block', marginTop: '4px' }}>Press Enter or click Add to append to the requested panels list</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column Right: Encounter Association & Sample details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Encounter Card */}
            <div className="card" style={{ padding: '24px' }}>
              <div className="card-header" style={{ marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <h3>Encounter Association</h3>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Select Encounter <span className="required">*</span></label>
                  {!selectedPatient ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                      Please select a patient to fetch their visits history.
                    </div>
                  ) : encounters.length === 0 ? (
                    <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem' }}>
                      No active clinical encounters found for this patient. A lab order must be associated with a valid visit.
                    </div>
                  ) : (
                    <select
                      className="form-select"
                      value={encounterId}
                      onChange={e => setEncounterId(Number(e.target.value))}
                      disabled={!!stateEncounterId}
                      required
                    >
                      {encounters.map(enc => (
                        <option key={enc.encounterId} value={enc.encounterId}>
                          #{enc.encounterId} - {enc.visitType} ({new Date(enc.startAt).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="form-group" style={{ marginTop: '20px' }}>
                  <label className="form-label">Sample Barcode ID (Optional)</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="e.g. BARCODE-049102 (Generated if blank)"
                    value={sampleId}
                    onChange={e => setSampleId(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Selected Panels Checklist */}
            <div className="card" style={{ padding: '24px', flex: 1 }}>
              <div className="card-header" style={{ marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <h3>Configured Panels Checklist</h3>
              </div>
              <div className="card-body">
                {selectedTests.length === 0 ? (
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>No panels selected yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedTests.map(code => (
                      <div 
                        key={code}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: 'rgba(255,255,255,0.01)',
                          border: '1px solid rgba(255,255,255,0.04)',
                          borderRadius: '6px'
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{code}</span>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '4px', height: 'auto', minWidth: 'auto', color: 'var(--color-danger)' }}
                          onClick={() => handleRemoveTest(code)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(stateEncounterId ? `/encounters/${stateEncounterId}` : '/lab')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !selectedPatient || !encounterId || selectedTests.length === 0}>
            <Save size={18} /> {loading ? 'Placing Order...' : 'Place Lab Order'}
          </button>
        </div>
      </form>
    </div>
  );
}