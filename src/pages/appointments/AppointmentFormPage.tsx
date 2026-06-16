import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  createAppointment, 
  getClinicians, 
  getClinicianAppointments, 
  type Clinician 
} from '../../services/appointmentService';
import { searchPatients, getMyProfile, getPatientByMrn, getCachedPatientProfile } from '../../services/patientService';
import type { PatientResponseDto, AppointmentResponseDto, AppointmentRequestDto } from '../../models/types';
import { ArrowLeft, Save, User, Search, Heart } from 'lucide-react';
import { toast } from 'react-hot-toast';
import '../../assets/styles/appointments/AppointmentFormPage.css';

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', 
  '11:00', '11:30', '12:00', '12:30', 
  '13:00', '13:30', '14:00', '14:30', 
  '15:00', '15:30', '16:00', '16:30'
];

export default function AppointmentFormPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [bookedAppointments, setBookedAppointments] = useState<AppointmentResponseDto[]>([]);

  // Search Filter state for doctors
  const [doctorSearch, setDoctorSearch] = useState('');

  // Patient Select State
  const [patientMrn, setPatientMrn] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientResponseDto | null>(null);
  const [searchResults, setSearchResults] = useState<PatientResponseDto[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [patientError, setPatientError] = useState('');

  // Booking fields
  const [clinicianId, setClinicianId] = useState<number | ''>('');
  const [department, setDepartment] = useState('General Medicine');
  const [serviceType, setServiceType] = useState('Consultation');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState(''); // Selected slot
  const [duration, setDuration] = useState(30); // minutes

  useEffect(() => {
    if (isLoading) return; // wait until auth is restored
    loadClinicians();
    loadPatientProfileIfPatient();
  }, [user, isLoading]);

  // Query booked appointments in real-time when doctor, date or duration is changed
  useEffect(() => {
    if (clinicianId && bookingDate) {
      loadBookedSlots();
    } else {
      setBookedAppointments([]);
    }
  }, [clinicianId, bookingDate]);

  const loadClinicians = async () => {
    try {
      const data = await getClinicians();
      setClinicians(data);
      if (data.length > 0) {
        setClinicianId(data[0].userId);
        setDepartment(data[0].department);
      }
    } catch (err) {
      console.error('Failed to load clinicians list', err);
    }
  };

  const loadPatientProfileIfPatient = async () => {
    if (user && user.role === 'PATIENT') {
      const cached = getCachedPatientProfile();
      if (cached?.patientId && cached.status === 'ACTIVE') {
        setSelectedPatient(cached);
        setPatientMrn(cached.mrn);
      }

      try {
        const profile = await getMyProfile();
        if (profile) {
          setSelectedPatient(profile);
          setPatientMrn(profile.mrn);
          return;
        }
      } catch (err) {
        console.error('Failed to load patient profile', err);
      }

      if (!cached?.patientId || cached.status !== 'ACTIVE') {
        setPatientError('Complete your patient registry first to schedule appointments.');
        toast.error('Complete your patient registry to proceed.');
        navigate('/dashboard');
      }
    }
  };

  const loadBookedSlots = async () => {
    if (!clinicianId || !bookingDate) return;
    try {
      const from = `${bookingDate}T00:00:00`;
      const to = `${bookingDate}T23:59:59`;
      const data = await getClinicianAppointments(Number(clinicianId), from, to);
      setBookedAppointments(data);
      setBookingTime(''); // Reset selected time slot
    } catch (err: any) {
      console.error('Failed to load booked slots for clinician', err);
      setBookedAppointments([]);
      toast.error(err?.message || 'Unable to load slot availability right now.');
    }
  };

  const handlePatientSearch = async (val: string) => {
    setPatientMrn(val);
    setPatientError('');
    const q = val.trim();
    if (!q) {
      setSearchResults([]);
      setShowDropdown(false);
      setSelectedPatient(null);
      return;
    }
    try {
      // If the user typed an MRN-like token (no spaces, alphanumeric), try exact MRN lookup first
      if (/^[A-Za-z0-9-]+$/.test(q)) {
        try {
          const resolved = await getPatientByMrn(q.toUpperCase());
          if (resolved) {
            setSelectedPatient(resolved);
            setPatientMrn(resolved.mrn);
            setSearchResults([]);
            setShowDropdown(false);
            return;
          }
        } catch (innerErr) {
          // ignore and fall back to search list
        }
      }

      const results = await searchPatients(val);
      setSearchResults(results);
      setShowDropdown(true);

      // Auto-select when MRN matches exactly
      const exactMrn = results.find(p => p.mrn.toLowerCase() === q.toLowerCase());
      if (exactMrn) {
        setSelectedPatient(exactMrn);
        setPatientMrn(exactMrn.mrn);
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      // Auto-select when name matches exactly (user typed full name)
      const exactName = results.find(p => p.name.toLowerCase() === q.toLowerCase());
      if (exactName) {
        setSelectedPatient(exactName);
        setPatientMrn(exactName.mrn);
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      // If only one result, assume selection intent
      if (results.length === 1) {
        setSelectedPatient(results[0]);
        setPatientMrn(results[0].mrn);
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      setSelectedPatient(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClinicianSelect = (c: Clinician) => {
    setClinicianId(c.userId);
    setDepartment(c.department);
  };

  const formatLocalISO = (dateStr: string, timeStr: string) => {
    return `${dateStr}T${timeStr}:00`;
  };

  // Helper to check if a specific slot is booked (overlapping)
  const isSlotBooked = (timeStr: string) => {
    if (!bookingDate) return false;
    
    const slotStart = new Date(`${bookingDate}T${timeStr}:00`);
    const slotEnd = new Date(slotStart.getTime() + duration * 60000);

    return bookedAppointments.some(appt => {
      if (appt.status === 'CANCELLED') return false;
      const apptStart = new Date(appt.startAt);
      const apptEnd = new Date(appt.endAt);
      return apptStart < slotEnd && apptEnd > slotStart;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // If user typed an MRN but didn't explicitly select, try to resolve it first
    if (!selectedPatient && patientMrn.trim()) {
      try {
        const resolved = await getPatientByMrn(patientMrn.trim().toUpperCase());
        if (resolved) {
          setSelectedPatient(resolved);
        }
      } catch (err) {
        // surface server lookup error to the user
        const msg = (err as any)?.response?.data?.message || (err as any)?.message;
        if (msg) setPatientError(String(msg));
      }
    }

    if (!selectedPatient) {
      setPatientError('Please search and select a valid patient by MRN.');
      return;
    }
    if (!clinicianId) {
      toast.error('Please select a doctor.');
      return;
    }
    if (!bookingDate) {
      toast.error('Please choose a date.');
      return;
    }
    if (!bookingTime) {
      toast.error('Please select a time slot.');
      return;
    }
    if (!user?.userId) {
      toast.error('Session not ready. Please sign out and sign in again.');
      return;
    }

    setLoading(true);

    try {
      const startAtStr = formatLocalISO(bookingDate, bookingTime);
      const startDate = new Date(startAtStr);
      
      const endDate = new Date(startDate.getTime() + duration * 60000);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const endAtStr = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:00`;

      const payload: AppointmentRequestDto = {
        patientId: selectedPatient.patientId,
        clinicianId: Number(clinicianId),
        department,
        serviceType,
        startAt: startAtStr,
        endAt: endAtStr,
        createdById: user.userId,
        status: 'SCHEDULED'
      };
      console.debug('Creating appointment with payload:', payload);
      const created = await createAppointment(payload);
      // Ensure clinicianName is correct locally — backend may not populate it immediately
      try {
        const clinician = clinicians.find(x => x.userId === Number(clinicianId));
        if (clinician) (created as any).clinicianName = clinician.name;
      } catch {}
      try { localStorage.setItem('clinic_flow_new_appointment', JSON.stringify(created)); } catch {}
      toast.success('Appointment booked successfully!');
      navigate('/appointments');
    } catch (err: any) {
      console.error('Failed to create appointment', err);
      toast.error(err?.message || 'Failed to create appointment');
    } finally {
      setLoading(false);
    }
  };

  const isPatient = user?.role === 'PATIENT';

  const filteredClinicians = clinicians.filter(c => 
    c.name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
    c.department.toLowerCase().includes(doctorSearch.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/appointments')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>Book Appointment</h1>
            <p>Schedule a new patient visit and clinician slot</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="dashboard-grid">
          {/* Column Left: Patient Select & Doctor search directory */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Patient Select Card */}
            <div className="card">
              <div className="card-header">
                <h3>Patient Demographics</h3>
              </div>
              <div className="card-body" style={{ padding: '16px 0 0' }}>
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">Patient MRN or Name <span className="required">*</span></label>
                  <div className="autocomplete-container">
                    {!isPatient ? (
                      <>
                        <input
                          className="form-input"
                          type="text"
                          placeholder="Type MRN or Name to search..."
                          value={patientMrn}
                          onChange={e => handlePatientSearch(e.target.value)}
                          onFocus={() => setShowDropdown(searchResults.length > 0)}
                          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
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
                      </>
                    ) : (
                      // For logged-in patients hide the input and show their profile summary
                      selectedPatient ? (
                        <div style={{ marginTop: '8px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>Booking as <strong>{selectedPatient.name}</strong> (MRN: {selectedPatient.mrn})</div>
                        </div>
                      ) : (
                        <div style={{ marginTop: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Loading your profile...</div>
                      )
                    )}
                  </div>
                  {patientError && <div style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '4px' }}>{patientError}</div>}
                  
                  {selectedPatient && (
                    <div className="patient-summary-card" style={{ marginTop: '16px' }}>
                      <div className="patient-summary-icon">
                        <User size={18} />
                      </div>
                      <div className="patient-summary-info">
                        <div className="patient-summary-name">{selectedPatient.name}</div>
                        <div className="patient-summary-meta">
                          MRN: {selectedPatient.mrn} | DOB: {selectedPatient.dob} | Gender: {selectedPatient.gender}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Doctor search grid list */}
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Heart size={18} style={{ color: 'var(--color-danger)' }} />
                  Select Doctor
                </h3>
                <div className="header-search search-input" style={{ width: '220px', margin: 0 }}>
                  <Search size={16} className="search-icon" />
                  <input 
                    type="text" 
                    placeholder="Search doctor or specialty..."
                    value={doctorSearch}
                    onChange={e => setDoctorSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="card-body" style={{ padding: '20px 0 0', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '380px', overflowY: 'auto' }}>
                {filteredClinicians.length === 0 ? (
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>No doctors found.</p>
                ) : (
                  filteredClinicians.map(c => (
                    <div
                      key={c.userId}
                      onClick={() => handleClinicianSelect(c)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '12px 16px', 
                        background: clinicianId === c.userId ? 'rgba(6, 182, 212, 0.08)' : 'var(--color-surface)',
                        border: clinicianId === c.userId ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                        borderRadius: '8px', 
                        cursor: 'pointer',
                        gap: '12px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: clinicianId === c.userId ? 'var(--color-primary)' : 'var(--color-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: clinicianId === c.userId ? '#ffffff' : 'var(--color-text)', fontSize: '0.75rem' }}>
                        Dr
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: clinicianId === c.userId ? 'var(--color-primary)' : 'var(--color-text)' }}>{c.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>{c.department}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Column Right: Date and interactive Slot Booking Grid */}
          <div className="card">
            <div className="card-header">
              <h3>Date & Availability Slots</h3>
            </div>
            <div className="card-body" style={{ padding: '16px 0 0' }}>
              <div className="form-row" style={{ marginBottom: '24px' }}>
                {/* Date Selection */}
                <div className="form-group">
                  <label className="form-label">Select Date <span className="required">*</span></label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={bookingDate} 
                    onChange={e => setBookingDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]} 
                    required
                  />
                </div>

                {/* Duration */}
                <div className="form-group">
                  <label className="form-label">Duration <span className="required">*</span></label>
                  <select 
                    className="form-select" 
                    value={duration} 
                    onChange={e => setDuration(Number(e.target.value))}
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </div>
              </div>

              {/* Service Type Selection */}
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Service Type <span className="required">*</span></label>
                <select className="form-select" value={serviceType} onChange={e => setServiceType(e.target.value)}>
                  <option value="Consultation">Consultation</option>
                  <option value="Follow Up">Follow Up</option>
                  <option value="Routine Check">Routine Check</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Preventative">Preventative</option>
                </select>
              </div>

              {/* Interactive Time Slots Grid */}
              <div className="form-group">
                <label className="form-label" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Select Time Slot <span className="required">*</span></span>
                  {bookingTime && <span className="badge badge-success">Selected: {bookingTime}</span>}
                </label>

                {!bookingDate ? (
                  <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '8px', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                    Choose a date to review doctor availability slots
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                    {TIME_SLOTS.map(slot => {
                      const booked = isSlotBooked(slot);
                      const isSelected = bookingTime === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={booked}
                          onClick={() => setBookingTime(slot)}
                          style={{
                            padding: '10px 8px',
                            borderRadius: '6px',
                            border: isSelected 
                              ? '1px solid var(--color-primary)' 
                              : booked 
                                ? '1px solid rgba(239, 68, 68, 0.15)' 
                                : '1px solid rgba(255, 255, 255, 0.05)',
                            background: isSelected 
                              ? 'rgba(6, 182, 212, 0.15)' 
                              : booked 
                                ? 'rgba(239, 68, 68, 0.05)' 
                                : 'rgba(255, 255, 255, 0.02)',
                            color: isSelected 
                              ? 'var(--color-primary)' 
                              : booked 
                                ? '#ef4444' 
                                : '#e2e8f0',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: booked ? 'not-allowed' : 'pointer',
                            textDecoration: booked ? 'line-through' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/appointments')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !bookingTime || (isPatient && !selectedPatient)}>
            <Save size={18} />
            {loading ? 'Booking...' : 'Book Appointment'}
          </button>
        </div>
      </form>
    </div>
  );
}
