import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import '../../assets/styles/dashboard/DashboardPage.css';
import { getMyProfile, registerPatient, getAllPatients } from '../../services/patientService';
import { getCurrentUserProfile } from '../../services/authService';
import { 
  getAllAppointments, 
  getAppointmentsByPatient, 
  cancelAppointment, 
  getClinicians, 
  type Clinician 
} from '../../services/appointmentService';
import type { PatientResponseDto, AppointmentResponseDto } from '../../models/types';
import { toast } from 'react-hot-toast';
import { parseApiError } from '../../utils/validation';
import PatientDashboardLayout from '../patients/PatientDashboardLayout';
import ReceptionDashboardLayout from '../patients/ReceptionDashboardLayout';
import AdminDashboard from './AdminDashboard';
import ClinicianDashboard from './ClinicianDashboard';
import PharmacistDashboard from './PharmacistDashboard';
import LabTechDashboard from './LabTechDashboard';
import FinanceDashboard from './FinanceDashboard';
import PatientRoleDashboard from './PatientRoleDashboard';
import {
  Users,
  CalendarDays,
  Stethoscope,
  Pill,
  Clock,
  AlertCircle,
  Plus,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  // ── Global State ──
  const [profile, setProfile] = useState<PatientResponseDto | null>(null);
  const [appointments, setAppointments] = useState<AppointmentResponseDto[]>([]);
  const [patientsList, setPatientsList] = useState<PatientResponseDto[]>([]);
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Search & Filter State ──
  const [appointmentSearch, setAppointmentSearch] = useState('');

  // ── Modals State ──
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Form State (For Patient Registry / Add Patient) ──
  const [regName, setRegName] = useState(''); // Used by receptionist
  const [regEmail, setRegEmail] = useState(''); // Used by receptionist
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('MALE');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [zip, setZip] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [insuranceId, setInsuranceId] = useState('');
  const [regError, setRegError] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountPhone, setAccountPhone] = useState('');

  useEffect(() => {
    if (isLoading) return; // wait for auth restoration

    loadDashboardData();
  }, [user, isLoading]);

  // Helpers
  const normalizeDob = (d: string) => {
    if (!d) return d;
    // convert DD-MM-YYYY to YYYY-MM-DD
    const ddmmyyyy = /^([0-3]?\d)-([0-1]?\d)-(\d{4})$/;
    const m = d.match(ddmmyyyy);
    if (m) {
      const [, dd, mm, yyyy] = m;
      return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }
    // assume already YYYY-MM-DD
    return d;
  };

  // Initialize account fields when patient modal opens
  useEffect(() => {
    if (showRegisterModal && user && user.role === 'PATIENT') {
      setAccountName(user.name || '');
      const loadAccountProfile = async () => {
        try {
          const profile = await getCurrentUserProfile();
          setAccountName(profile.name || user.name || '');
          setAccountPhone(profile.phone || user.phone || '');
          setPhone(profile.phone || user.phone || '');
        } catch {
          setAccountPhone(user.phone || '');
          setPhone(user.phone || '');
        }
      };
      loadAccountProfile();
    }
  }, [showRegisterModal, user]);

  // Prefill and reset fields when modals open/close
  useEffect(() => {
    if (showRegisterModal) {
      setRegName(user?.name || '');
      setRegEmail(user?.email || '');
      setDob('');
      setGender('MALE');
      setPhone(user?.phone || '');
      setStreet('');
      setCity('');
      setStateCode('');
      setZip('');
      setEmergencyName('');
      setEmergencyPhone('');
      setInsuranceId('');
      setRegError('');
    } else {
      setRegError('');
    }
  }, [showRegisterModal, user]);

  useEffect(() => {
    if (showAddPatientModal) {
      setRegName('');
      setRegEmail('');
      setDob('');
      setGender('MALE');
      setPhone('');
      setStreet('');
      setCity('');
      setStateCode('');
      setZip('');
      setEmergencyName('');
      setEmergencyPhone('');
      setInsuranceId('');
      setRegError('');
    }
  }, [showAddPatientModal]);

  const loadDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (user.role === 'PATIENT') {
        const effectiveProfile = profile;
        // Ensure we have clinicians locally to map clinician names
        try {
          if (clinicians.length === 0) {
            const docs = await getClinicians();
            setClinicians(docs);
          }
        } catch {}
        // If we already have the profile (or cached one), avoid re-fetching
        if (effectiveProfile) {
          let appts = await getAppointmentsByPatient(effectiveProfile.patientId);
          // Enrich clinician names from local clinician list when possible
          try {
            appts = appts.map(a => {
              const badName = !a.clinicianName || a.clinicianName.trim() === '' ||
                (effectiveProfile && a.clinicianName && a.clinicianName.trim().toLowerCase() === effectiveProfile.name.trim().toLowerCase()) ||
                (user?.name && a.clinicianName && a.clinicianName.trim().toLowerCase() === user.name.trim().toLowerCase());
              if (badName) {
                const found = clinicians.find(c => c.userId === a.clinicianId);
                if (found) {
                  const fn = found.name?.trim().toLowerCase();
                  const pn = effectiveProfile?.name?.trim().toLowerCase();
                  const un = user?.name?.trim().toLowerCase();
                  if (fn && fn !== pn && fn !== un) a.clinicianName = found.name;
                }
              }
              return a;
            });
          } catch {}
          setAppointments(appts);
        } else {
          const patientProfile = await getMyProfile();
          if (patientProfile) {
            setProfile(patientProfile);
            const appts = await getAppointmentsByPatient(patientProfile.patientId);
            setAppointments(appts);
          } else {
            setProfile(null);
            setAppointments([]);
          }
        }
        try {
          const docs = await getClinicians();
          setClinicians(docs);
        } catch (err) {
          console.warn('Unable to refresh clinicians list for dashboard', err);
        }
      } else if (user.role === 'RECEPTION') {
        const patients = await getAllPatients();
        setPatientsList(patients);
        const appts = await getAllAppointments();
        setAppointments(appts);
      } else {
        // Roles with dedicated dashboards handle their own data loading
        // Skip fetching here to avoid Access Denied errors
      }
    } catch (err: any) {
      console.error('Failed to load dashboard data', err);
      const serverMsg = err?.response?.data?.message || err?.message;
      toast.error(serverMsg || 'Error fetching dashboard records');
    } finally {
      setLoading(false);
    }
  };

  // ── Actions ──
  const handleSelfRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setActionLoading(true);
    // Client-side validation
    const missing: string[] = [];
    if (!(accountName || user.name || '').trim()) missing.push('Full name');
    if (!dob) missing.push('Date of birth');
    if (!phone.trim()) missing.push('Phone number');
    if (!street.trim()) missing.push('Street address');
    if (!city.trim()) missing.push('City');
    if (!stateCode.trim()) missing.push('State');
    if (!zip.trim()) missing.push('Zip');
    if (!emergencyName.trim()) missing.push('Emergency contact name');
    if (!emergencyPhone.trim()) missing.push('Emergency contact phone');

    if (missing.length > 0) {
      toast.error(`Missing required fields: ${missing.join(', ')}`);
      setActionLoading(false);
      return;
    }

    // Date of birth must be a past date (backend @Past)
    const todayStr = new Date().toISOString().split('T')[0];
    if (dob >= todayStr) {
      toast.error('Date of birth must be a past date');
      setRegError('Date of birth must be a past date');
      setActionLoading(false);
      return;
    }

    // Phone format must match backend: digits, +, (), - and spaces; length 7-20
    const phonePattern = /^[0-9+()\-\s]{7,20}$/;
    const normalizedPhone = (accountPhone || phone || user.phone || '').trim().replace(/\s+/g, ' ');
    const normalizedEmergency = emergencyPhone.trim().replace(/\s+/g, ' ');
    if (!phonePattern.test(normalizedPhone)) {
      const hint = "Primary contact must be a phone number (digits, +, (), -, spaces) length 7-20. e.g. +91 98765 43210";
      toast.error('Invalid phone number. ' + hint);
      setRegError('Invalid phone number. ' + hint);
      setActionLoading(false);
      return;
    }
    if (!phonePattern.test(normalizedEmergency)) {
      const hint = "Emergency contact must be a phone number (digits, +, (), -, spaces) length 7-20.";
      toast.error('Invalid emergency contact phone. ' + hint);
      setRegError('Invalid emergency contact phone. ' + hint);
      setActionLoading(false);
      return;
    }
    try {
      const contactInfoJson = JSON.stringify({ email: user.email || '', phone: normalizedPhone });
      const addressJson = JSON.stringify({ line1: street.trim(), city: city.trim(), state: stateCode.trim(), zip: zip.trim() });
      const primaryContact = normalizedEmergency;
      const dobIso = normalizeDob(dob);
      const genderValue = (gender || '').toString().toUpperCase();

      const newProfile = await registerPatient({
        name: accountName.trim() || user.name,
        dob: dobIso,
        gender: genderValue,
        contactInfoJson,
        addressJson,
        primaryContact,
        insuranceId: insuranceId.trim() || undefined,
        status: 'ACTIVE'
      });

      toast.success('Patient registry completed successfully!');
      setProfile(newProfile);
      setShowRegisterModal(false);
      // Keep the returned profile in state and avoid reloading dashboard immediately.
      // This prevents the registration modal from reappearing if the auth token
      // hasn't changed immediately on the backend.
    } catch (err: any) {
      const msg = parseApiError(err, 'Registration failed.');
      setRegError(msg);
      console.error('Self registration failed', err);
      toast.error(msg.split('\n')[0]);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReceptionistRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    // Client-side validation for receptionist form
    const missing: string[] = [];
    if (!regName.trim()) missing.push('Full name');
    if (!regEmail.trim()) missing.push('Email');
    if (!dob) missing.push('Date of birth');
    if (!phone.trim()) missing.push('Phone number');
    if (!street.trim()) missing.push('Street address');
    if (!city.trim()) missing.push('City');
    if (!stateCode.trim()) missing.push('State');
    if (!zip.trim()) missing.push('Zip');
    if (!emergencyName.trim()) missing.push('Emergency contact name');
    if (!emergencyPhone.trim()) missing.push('Emergency contact phone');

    if (missing.length > 0) {
      toast.error(`Missing required fields: ${missing.join(', ')}`);
      setActionLoading(false);
      return;
    }

    // Date of birth must be a past date (backend @Past)
    const todayStr = new Date().toISOString().split('T')[0];
    if (dob >= todayStr) {
      toast.error('Date of birth must be a past date');
      setRegError('Date of birth must be a past date');
      setActionLoading(false);
      return;
    }

    const phonePattern = /^[0-9+()\-\s]{7,20}$/;
    const normalizedPhone = phone.trim().replace(/\s+/g, ' ');
    const normalizedEmergency = emergencyPhone.trim().replace(/\s+/g, ' ');
    if (!phonePattern.test(normalizedPhone)) {
      const hint = "Primary contact must be a phone number (digits, +, (), -, spaces) length 7-20. e.g. +91 98765 43210";
      toast.error('Invalid phone number. ' + hint);
      setRegError('Invalid phone number. ' + hint);
      setActionLoading(false);
      return;
    }
    if (!phonePattern.test(normalizedEmergency)) {
      const hint = "Emergency contact must be a phone number (digits, +, (), -, spaces) length 7-20.";
      toast.error('Invalid emergency contact phone. ' + hint);
      setRegError('Invalid emergency contact phone. ' + hint);
      setActionLoading(false);
      return;
    }
    try {
      const contactInfoJson = JSON.stringify({ email: regEmail.trim() || '', phone: normalizedPhone });
      const addressJson = JSON.stringify({ line1: street.trim(), city: city.trim(), state: stateCode.trim(), zip: zip.trim() });
      const primaryContact = normalizedEmergency;
      const dobIso = normalizeDob(dob);
      const genderValue = (gender || '').toString().toUpperCase();

      await registerPatient({
        name: regName.trim(),
        dob: dobIso,
        gender: genderValue,
        contactInfoJson,
        addressJson,
        primaryContact,
        insuranceId: insuranceId.trim() || undefined,
        status: 'ACTIVE'
      });

      toast.success('Patient registered successfully!');
      setShowAddPatientModal(false);
      // Reset Form fields
      setRegName('');
      setRegEmail('');
      setDob('');
      setPhone('');
      setStreet('');
      setCity('');
      setStateCode('');
      setZip('');
      setEmergencyName('');
      setEmergencyPhone('');
      setInsuranceId('');
      loadDashboardData();
    } catch (err: any) {
      const msg = parseApiError(err, 'Failed to register patient');
      setRegError(msg);
      console.error('Receptionist registration failed', err);
      toast.error(msg.split('\n')[0]);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelAppt = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await cancelAppointment(id);
      toast.success('Appointment cancelled successfully!');
      loadDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Cancellation failed');
    }
  };

  // ── Render Helpers ──
  const getStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      'SCHEDULED': { cls: 'badge-warning', label: 'Scheduled' },
      'CHECKED_IN': { cls: 'badge-info', label: 'Checked In' },
      'COMPLETED': { cls: 'badge-success', label: 'Completed' },
      'CANCELLED': { cls: 'badge-danger', label: 'Cancelled' },
      'NO_SHOW': { cls: 'badge-neutral', label: 'No Show' },
    };
    const s = map[status] || { cls: 'badge-neutral', label: status };
    return <span className={`badge ${s.cls}`}><span className="badge-dot"></span>{s.label}</span>;
  };

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

  const parseContact = (contactJson: string) => {
    try {
      return JSON.parse(contactJson);
    } catch {
      return { email: '', phone: contactJson };
    }
  };

  const parseAddress = (addressJson: string) => {
    try {
      return JSON.parse(addressJson);
    } catch {
      return { line1: addressJson, city: '', state: '', zip: '' };
    }
  };

  if (loading) {
    return <div className="page-spinner"><div className="spinner"></div></div>;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. PATIENT DASHBOARD LAYOUT
  // ─────────────────────────────────────────────────────────────────────────
  if (user?.role === 'PATIENT') {
    // If patient is registered, show role-based dashboard
    if (profile) {
      return <PatientRoleDashboard profile={profile} appointments={appointments} />;
    }
    // If not registered, show registration flow
    return (
      <PatientDashboardLayout
        userName={user.name}
        userEmail={user.email}
        userPhone={user.phone || ''}
        profile={profile}
        appointments={appointments}
        clinicians={clinicians}
        showRegisterModal={showRegisterModal}
        setShowRegisterModal={setShowRegisterModal}
        regError={regError}
        setRegError={setRegError}
        actionLoading={actionLoading}
        navigateToNewAppointment={() => navigate('/appointments/new')}
        handleSelfRegisterSubmit={handleSelfRegisterSubmit}
        handleCancelAppt={handleCancelAppt}
        getStatusBadge={getStatusBadge}
        formatDate={formatDate}
        formatTime={formatTime}
        parseContact={parseContact}
        parseAddress={parseAddress}
        accountName={accountName}
        accountPhone={accountPhone}
        dob={dob}
        setDob={setDob}
        gender={gender}
        setGender={setGender}
        street={street}
        setStreet={setStreet}
        city={city}
        setCity={setCity}
        stateCode={stateCode}
        setStateCode={setStateCode}
        zip={zip}
        setZip={setZip}
        emergencyName={emergencyName}
        setEmergencyName={setEmergencyName}
        emergencyPhone={emergencyPhone}
        setEmergencyPhone={setEmergencyPhone}
        insuranceId={insuranceId}
        setInsuranceId={setInsuranceId}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. RECEPTIONIST DASHBOARD LAYOUT
  // ─────────────────────────────────────────────────────────────────────────
  if (user?.role === 'RECEPTION') {
    return (
      <ReceptionDashboardLayout
        patientsList={patientsList}
        appointments={appointments}
        appointmentSearch={appointmentSearch}
        setAppointmentSearch={setAppointmentSearch}
        showAddPatientModal={showAddPatientModal}
        setShowAddPatientModal={setShowAddPatientModal}
        regName={regName}
        setRegName={setRegName}
        regEmail={regEmail}
        setRegEmail={setRegEmail}
        dob={dob}
        setDob={setDob}
        gender={gender}
        setGender={setGender}
        phone={phone}
        setPhone={setPhone}
        street={street}
        setStreet={setStreet}
        city={city}
        setCity={setCity}
        stateCode={stateCode}
        setStateCode={setStateCode}
        zip={zip}
        setZip={setZip}
        emergencyName={emergencyName}
        setEmergencyName={setEmergencyName}
        emergencyPhone={emergencyPhone}
        setEmergencyPhone={setEmergencyPhone}
        insuranceId={insuranceId}
        setInsuranceId={setInsuranceId}
        actionLoading={actionLoading}
        navigateToNewAppointment={() => navigate('/appointments/new')}
        navigateToInvoices={() => navigate('/invoices')}
        navigateToPatients={() => navigate('/patients')}
        handleReceptionistRegisterSubmit={handleReceptionistRegisterSubmit}
        getStatusBadge={getStatusBadge}
        formatTime={formatTime}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. ROLE-BASED DASHBOARD ROUTING
  // ─────────────────────────────────────────────────────────────────────────
  if (user?.role === 'ADMIN') {
    return <AdminDashboard />;
  }

  if (user?.role === 'CLINICIAN') {
    return <ClinicianDashboard />;
  }

  if (user?.role === 'PHARMACIST') {
    return <PharmacistDashboard />;
  }

  if (user?.role === 'LAB_TECHNICIAN') {
    return <LabTechDashboard />;
  }

  if (user?.role === 'FINANCE_OFFICER') {
    return <FinanceDashboard />;
  }

  // Fallback for any other roles (COMPLIANCE_OFFICER, etc.)
  return <AdminDashboard />;
}
