import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { createPrescription, searchMedications, getPrescriptionById, updatePrescription } from '../../services/prescriptionService';
import { searchPatients, getPatientById } from '../../services/patientService';
import type { PatientResponseDto } from '../../models/types';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Save, User, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { validateMedFields, validateContextFields } from '../../utils/prescriptionValidation';
import type { RxFieldErrors, RxFieldWarnings } from '../../utils/prescriptionValidation';
import '../../assets/styles/prescriptions/prescription.css';

interface MedicationItem {
  medId: number;
  name: string;
  code: string;
  formulation: string;
}

interface PrescriptionItem {
  id: string;
  medicationId: number;
  medicationName: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  quantity: number;
  repeats: number;
  route: string;
  notes: string;
}

export default function PrescriptionFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { user } = useAuth();
  const isEditMode = Boolean(id);
  const navigationState = location.state as { encounterId?: number; patientId?: number } | null;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  // Encounter & Patient
  const [encounterId, setEncounterId] = useState('');
  const [patientMrn, setPatientMrn] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientResponseDto | null>(null);
  const [searchResults, setSearchResults] = useState<PatientResponseDto[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [patientError, setPatientError] = useState('');

  // Prescription Items List
  const [items, setItems] = useState<PrescriptionItem[]>([]);

  // Current Medication Form State
  const [selectedMedication, setSelectedMedication] = useState<MedicationItem | null>(null);
  const [medSearchQuery, setMedSearchQuery] = useState('');
  const [medSearchResults, setMedSearchResults] = useState<MedicationItem[]>([]);
  const [showMedDropdown, setShowMedDropdown] = useState(false);

  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Once daily (OD)');
  const [durationDays, setDurationDays] = useState('');
  const [quantity, setQuantity] = useState('');
  const [repeats, setRepeats] = useState('0');
  const [route, setRoute] = useState('Oral');
  const [notes, setNotes] = useState('');

  // Validation State
  const [fieldErrors, setFieldErrors] = useState<RxFieldErrors>({});
  const [fieldWarnings, setFieldWarnings] = useState<RxFieldWarnings>({});
  const [encounterError, setEncounterError] = useState('');

  // Auto-populate from Encounter details page
  useEffect(() => {
    if (isEditMode && id) {
      loadPrescriptionForEdit(Number(id));
    } else {
      if (navigationState?.encounterId) {
        setEncounterId(String(navigationState.encounterId));
      }
      if (navigationState?.patientId) {
        const loadPatient = async () => {
          try {
            const p = await getPatientById(navigationState.patientId!);
            setSelectedPatient(p);
            setPatientMrn(p.mrn);
          } catch (err) {
            console.error('Failed to pre-load patient', err);
          }
        };
        loadPatient();
      }
    }
  }, [id, navigationState]);

  const loadPrescriptionForEdit = async (rxId: number) => {
    setInitialLoading(true);
    try {
      const rx = await getPrescriptionById(rxId);
      setEncounterId(String(rx.encounterId));
      setDosage(rx.dosage);
      setFrequency(rx.frequency);
      setDurationDays(String(rx.durationDays));
      setQuantity(String(rx.quantity));
      setRepeats(String(rx.repeats));
      setRoute(rx.route);
      setNotes(rx.notes || '');

      // Load patient
      const p = await getPatientById(rx.patientId);
      setSelectedPatient(p);
      setPatientMrn(p.mrn);

      // Set medication info
      setSelectedMedication({ medId: rx.medicationId, name: rx.medicationName, code: '', formulation: '' });
      setMedSearchQuery(rx.medicationName);
    } catch (err) {
      console.error('Failed to load prescription for editing', err);
      toast.error('Failed to load prescription data.');
      navigate('/prescriptions');
    } finally {
      setInitialLoading(false);
    }
  };

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

  const handleMedSearch = async (val: string) => {
    setMedSearchQuery(val);
    if (!val.trim()) {
      setMedSearchResults([]);
      setShowMedDropdown(false);
      setSelectedMedication(null);
      return;
    }
    try {
      const results = await searchMedications(val);
      const mappedResults = results.map((m: any) => ({
        medId: m.medId,
        name: m.name,
        code: m.code,
        formulation: m.formulation
      }));
      setMedSearchResults(mappedResults);
      setShowMedDropdown(true);

      const exact = mappedResults.find((m: any) => m.name.toLowerCase() === val.trim().toLowerCase());
      if (exact) {
        setSelectedMedication(exact);
      } else {
        setSelectedMedication(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddItem = () => {
    const { errors, warnings, isValid } = validateMedFields({
      medication: selectedMedication,
      dosage,
      durationDays,
      quantity,
      repeats,
      notes,
      frequency,
      existingMedIds: items.map(i => i.medicationId),
    });
    setFieldErrors(errors);
    setFieldWarnings(warnings);

    if (!isValid) {
      toast.error('Please fix errors before adding medication.');
      return;
    }

    // Show warnings but allow add
    const warnCount = Object.values(warnings).filter(Boolean).length;
    if (warnCount > 0) {
      toast(`${warnCount} warning(s) flagged — review recommended.`, { icon: '⚠️' });
    }

    const newItem: PrescriptionItem = {
      id: Math.random().toString(36).substring(2, 9),
      medicationId: selectedMedication!.medId,
      medicationName: selectedMedication!.name,
      dosage,
      frequency,
      durationDays: Number(durationDays),
      quantity: Number(quantity),
      repeats: Number(repeats),
      route,
      notes,
    };

    setItems([...items, newItem]);
    setFieldErrors({});
    setFieldWarnings({});

    // Reset current item fields for the next add
    setSelectedMedication(null);
    setMedSearchQuery('');
    setDosage('');
    setFrequency('Once daily (OD)');
    setDurationDays('');
    setQuantity('');
    setRepeats('0');
    setRoute('Oral');
    setNotes('');
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate context fields
    const ctxErrors = validateContextFields({
      selectedPatient: !!selectedPatient,
      encounterId,
      hasEncounterFromNav: !!navigationState?.encounterId,
    });
    if (ctxErrors.patient) setPatientError(ctxErrors.patient);
    if (ctxErrors.encounterId) setEncounterError(ctxErrors.encounterId);
    if (Object.keys(ctxErrors).length > 0) {
      toast.error('Please fix patient/encounter errors before submitting.');
      return;
    }
    setEncounterError('');

    let itemsToSave = [...items];

    // Safe fallback: If they didn't click "Add Medication" but filled the form, auto-validate & add
    if (itemsToSave.length === 0) {
      if (selectedMedication && dosage && durationDays && quantity) {
        const { errors, isValid } = validateMedFields({
          medication: selectedMedication,
          dosage, durationDays, quantity, repeats, notes, frequency,
          existingMedIds: [],
        });
        if (!isValid) {
          setFieldErrors(errors);
          toast.error('Please fix medication errors before saving.');
          return;
        }
        itemsToSave.push({
          id: 'temp',
          medicationId: selectedMedication.medId,
          medicationName: selectedMedication.name,
          dosage,
          frequency,
          durationDays: Number(durationDays),
          quantity: Number(quantity),
          repeats: Number(repeats),
          route,
          notes,
        });
      } else {
        toast.error('Please add at least one medication to the prescription list.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isEditMode && id) {
        // Edit mode: update existing prescription
        await updatePrescription(Number(id), {
          encounterId: Number(encounterId) || 1,
          patientId: selectedPatient.patientId,
          clinicianId: user?.userId || 2,
          medicationId: itemsToSave[0].medicationId,
          dosage: itemsToSave[0].dosage,
          frequency: itemsToSave[0].frequency,
          durationDays: itemsToSave[0].durationDays,
          quantity: itemsToSave[0].quantity,
          repeats: itemsToSave[0].repeats,
          route: itemsToSave[0].route,
          notes: itemsToSave[0].notes,
          status: 'DRAFT',
        });
        toast.success('Prescription updated successfully!');
        navigate(`/prescriptions/${id}`);
      } else {
        // Create mode: create each prescription
        for (const item of itemsToSave) {
          await createPrescription({
            encounterId: Number(encounterId) || 1,
            patientId: selectedPatient.patientId,
            clinicianId: user?.userId || 2,
            medicationId: item.medicationId,
            dosage: item.dosage,
            frequency: item.frequency,
            durationDays: item.durationDays,
            quantity: item.quantity,
            repeats: item.repeats,
            route: item.route,
            notes: item.notes,
            status: 'DRAFT',
          });
        }
        toast.success('Prescription(s) created successfully!');
        if (navigationState?.encounterId) {
          navigate(`/encounters/${navigationState.encounterId}`);
        } else {
          navigate('/prescriptions');
        }
      }
    } catch (err) {
      console.error('Failed to save prescription(s)', err);
      toast.error(isEditMode ? 'Failed to update prescription.' : 'Failed to create prescription.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="page-spinner"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => {
              if (isEditMode) {
                navigate(`/prescriptions/${id}`);
              } else if (navigationState?.encounterId) {
                navigate(`/encounters/${navigationState.encounterId}`);
              } else {
                navigate('/prescriptions');
              }
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>{isEditMode ? 'Edit Prescription' : 'New Prescription'}</h1>
            {isEditMode ? (
              <p>Update prescription #{id}</p>
            ) : navigationState?.encounterId ? (
              <p>Adding prescription for Encounter #{navigationState.encounterId}</p>
            ) : (
              <p>Write a new prescription for a patient</p>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Patient & Encounter */}
        <div className="section-card">
          <div className="section-card-header">
            <h3>Patient & Encounter Context</h3>
          </div>
          <div className="section-card-body">
            <div className="form-row-2">
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Patient MRN <span className="required">*</span></label>
                <div className="autocomplete-container">
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Type MRN or Name..."
                    value={patientMrn}
                    onChange={e => handlePatientSearch(e.target.value)}
                    onFocus={() => setShowDropdown(searchResults.length > 0)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    required
                    disabled={!!navigationState?.patientId} // lock if pre-populated
                  />
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

              {!navigationState?.encounterId ? (
                <div className="form-group">
                  <label className="form-label">Encounter ID <span className="required">*</span></label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="Enter encounter ID"
                    value={encounterId}
                    onChange={e => { setEncounterId(e.target.value); setEncounterError(''); }}
                    required
                    style={{ borderColor: encounterError ? 'var(--color-danger)' : undefined }}
                  />
                  {encounterError && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>{encounterError}</div>}
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Associated Encounter</label>
                  <div
                    style={{
                      padding: '10px 14px',
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: 'var(--color-text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      height: '42px'
                    }}
                  >
                    <span className="badge badge-primary">Active</span> Encounter #{navigationState.encounterId}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Medication Details Entry */}
        <div className="section-card">
          <div className="section-card-header">
            <h3>Add Medication details</h3>
          </div>
          <div className="section-card-body">
            <div className="form-row-2">
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Medication Search <span className="required">*</span></label>
                <div className="autocomplete-container">
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Search medication by name or code..."
                    value={medSearchQuery}
                    onChange={e => handleMedSearch(e.target.value)}
                    onFocus={() => setShowMedDropdown(medSearchResults.length > 0)}
                    onBlur={() => setTimeout(() => setShowMedDropdown(false), 200)}
                    required={items.length === 0}
                  />
                  {showMedDropdown && medSearchResults.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {medSearchResults.map(m => (
                        <div
                          key={m.medId}
                          className="autocomplete-item"
                          onMouseDown={() => {
                            setSelectedMedication(m);
                            setMedSearchQuery(m.name);
                            setMedSearchResults([]);
                            setShowMedDropdown(false);
                          }}
                        >
                          <div className="autocomplete-item-name">{m.name}</div>
                          <div className="autocomplete-item-sub">Code: {m.code} | Formulation: {m.formulation}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {selectedMedication && (
                  <div style={{ marginTop: '8px', fontSize: '0.8125rem' }}>
                    <span className="badge badge-success">Selected</span> <strong style={{ color: 'var(--color-text)' }}>{selectedMedication.name}</strong> ({selectedMedication.code})
                  </div>
                )}
                {fieldErrors.medication && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>{fieldErrors.medication}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Dosage <span className="required">*</span></label>
                <input
                  className="form-input"
                  placeholder="e.g. 500mg, 1 tablet, 5ml"
                  value={dosage}
                  onChange={e => { setDosage(e.target.value); if (fieldErrors.dosage) setFieldErrors(prev => ({ ...prev, dosage: undefined })); }}
                  required={items.length === 0}
                  style={{ borderColor: fieldErrors.dosage ? 'var(--color-danger)' : undefined }}
                  maxLength={50}
                />
                {fieldErrors.dosage && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>{fieldErrors.dosage}</div>}
              </div>
            </div>

            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Frequency <span className="required">*</span></label>
                <select className="form-select" value={frequency} onChange={e => setFrequency(e.target.value)}>
                  <option value="Once daily (OD)">Once daily (OD)</option>
                  <option value="Twice daily (BD)">Twice daily (BD)</option>
                  <option value="Three times daily (TDS)">Three times daily (TDS)</option>
                  <option value="Four times daily (QDS)">Four times daily (QDS)</option>
                  <option value="Every 4 hours (Q4H)">Every 4 hours (Q4H)</option>
                  <option value="Every 6 hours (Q6H)">Every 6 hours (Q6H)</option>
                  <option value="Every 8 hours (Q8H)">Every 8 hours (Q8H)</option>
                  <option value="As needed (PRN)">As needed (PRN)</option>
                  <option value="At bedtime (HS)">At bedtime (HS)</option>
                  <option value="Stat (STAT)">Stat (STAT)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Route <span className="required">*</span></label>
                <select className="form-select" value={route} onChange={e => setRoute(e.target.value)}>
                  <option value="Oral">Oral</option>
                  <option value="Topical">Topical</option>
                  <option value="Intravenous">Intravenous (IV)</option>
                  <option value="Intramuscular">Intramuscular (IM)</option>
                  <option value="Subcutaneous">Subcutaneous (SC)</option>
                  <option value="Sublingual">Sublingual</option>
                  <option value="Rectal">Rectal</option>
                  <option value="Inhalation">Inhalation</option>
                  <option value="Ophthalmic">Ophthalmic</option>
                  <option value="Otic">Otic</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Duration (days) <span className="required">*</span></label>
                <input
                  className="form-input"
                  type="number"
                  min={1}
                  max={365}
                  placeholder="e.g. 7"
                  value={durationDays}
                  onChange={e => { setDurationDays(e.target.value); if (fieldErrors.durationDays) setFieldErrors(prev => ({ ...prev, durationDays: undefined })); }}
                  required={items.length === 0}
                  style={{ borderColor: fieldErrors.durationDays ? 'var(--color-danger)' : undefined }}
                />
                {fieldErrors.durationDays && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>{fieldErrors.durationDays}</div>}
                {!fieldErrors.durationDays && fieldWarnings.durationDays && <div style={{ color: '#f59e0b', fontSize: '0.75rem', marginTop: '4px' }}>⚠ {fieldWarnings.durationDays}</div>}
              </div>
            </div>

            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Quantity <span className="required">*</span></label>
                <input
                  className="form-input"
                  type="number"
                  min={1}
                  max={9999}
                  placeholder="Total units to dispense"
                  value={quantity}
                  onChange={e => { setQuantity(e.target.value); if (fieldErrors.quantity) setFieldErrors(prev => ({ ...prev, quantity: undefined })); }}
                  required={items.length === 0}
                  style={{ borderColor: fieldErrors.quantity ? 'var(--color-danger)' : undefined }}
                />
                {fieldErrors.quantity && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>{fieldErrors.quantity}</div>}
                {!fieldErrors.quantity && fieldWarnings.quantity && <div style={{ color: '#f59e0b', fontSize: '0.75rem', marginTop: '4px' }}>⚠ {fieldWarnings.quantity}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Repeats</label>
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  max={12}
                  placeholder="0"
                  value={repeats}
                  onChange={e => { setRepeats(e.target.value); if (fieldErrors.repeats) setFieldErrors(prev => ({ ...prev, repeats: undefined })); }}
                  style={{ borderColor: fieldErrors.repeats ? 'var(--color-danger)' : undefined }}
                />
                {fieldErrors.repeats && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>{fieldErrors.repeats}</div>}
                {!fieldErrors.repeats && fieldWarnings.repeats && <div style={{ color: '#f59e0b', fontSize: '0.75rem', marginTop: '4px' }}>⚠ {fieldWarnings.repeats}</div>}
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%', gap: '8px', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
                  onClick={handleAddItem}
                >
                  <Plus size={16} /> Add Medication
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">Notes / Instructions <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>({notes.length}/500)</span></label>
              <textarea
                className="form-textarea"
                placeholder="Special warnings, patient advice..."
                value={notes}
                onChange={e => { setNotes(e.target.value); if (fieldErrors.notes) setFieldErrors(prev => ({ ...prev, notes: undefined })); }}
                rows={2}
                maxLength={500}
                style={{ borderColor: fieldErrors.notes ? 'var(--color-danger)' : undefined }}
              />
              {fieldErrors.notes && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>{fieldErrors.notes}</div>}
            </div>
          </div>
        </div>

        {/* Prescribed Medications List Table */}
        {items.length > 0 && (
          <div className="section-card" style={{ marginTop: '24px', animation: 'fadeIn 300ms ease-out' }}>
            <div className="section-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Medications Added to Prescription</h3>
              <span className="badge badge-success">{items.length} item{items.length > 1 ? 's' : ''}</span>
            </div>
            <div className="section-card-body" style={{ padding: 0 }}>
              <div className="data-table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Medication</th>
                      <th>Dosage</th>
                      <th>Frequency</th>
                      <th>Route</th>
                      <th>Duration</th>
                      <th>Qty</th>
                      <th>Repeats</th>
                      <th>Notes</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id}>
                        <td className="cell-main">{item.medicationName}</td>
                        <td>{item.dosage}</td>
                        <td>{item.frequency}</td>
                        <td><span className="badge badge-neutral">{item.route}</span></td>
                        <td>{item.durationDays} days</td>
                        <td>{item.quantity}</td>
                        <td>{item.repeats}</td>
                        <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.notes || '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--color-danger)', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => handleRemoveItem(item.id)}
                            title="Remove medication"
                          >
                            <Trash2 size={14} /> Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (isEditMode) {
                navigate(`/prescriptions/${id}`);
              } else if (navigationState?.encounterId) {
                navigate(`/encounters/${navigationState.encounterId}`);
              } else {
                navigate('/prescriptions');
              }
            }}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            <Save size={18} />
            {loading ? 'Saving...' : isEditMode ? 'Update Prescription' : items.length > 0 ? `Save ${items.length} Prescription(s)` : 'Save Prescription'}
          </button>
        </div>
      </form>
    </div>
  );
}
