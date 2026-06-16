import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import '../../assets/styles/dashboard/DashboardPage.css';
import { getMyProfile, registerPatient, getAllPatients, getCachedPatientProfile, cachePatientProfile } from '../../services/patientService';
import { getCurrentUserProfile } from '../../services/authService';
import { 
  getAllAppointments, 
  getAppointmentsByPatient, 
  checkInAppointment, 
  cancelAppointment, 
  getClinicians, 
  type Clinician 
} from '../../services/appointmentService';
import { getAllUsers } from '../../services/adminUserService';
import { getAllOrders } from '../../services/labService';
import { getAllEncounters } from '../../services/encounterService';
import { getAllPrescriptions } from '../../services/prescriptionService';
import { getAllPayments } from '../../services/paymentService';
import type { 
  PatientResponseDto, 
  AppointmentResponseDto,
  UserResponseDto,
  LabOrderResponseDto,
  EncounterResponseDto,
  PrescriptionResponseDto,
  PaymentResponseDto
} from '../../models/types';
import { toast } from 'react-hot-toast';
import PatientDashboardLayout from '../patients/PatientDashboardLayout';
import ReceptionDashboardLayout from '../patients/ReceptionDashboardLayout';
import {
  Users,
  CalendarDays,
  Stethoscope,
  Pill,
  Clock,
  AlertCircle,
  Plus,
  Activity,
  FlaskConical,
  DollarSign,
  UserCheck,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  // ── Global State ──
  const [profile, setProfile] = useState<PatientResponseDto | null>(null);
  const [appointments, setAppointments] = useState<AppointmentResponseDto[]>([]);
  const [patientsList, setPatientsList] = useState<PatientResponseDto[]>([]);
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [usersList, setUsersList] = useState<UserResponseDto[]>([]);
  const [labOrdersList, setLabOrdersList] = useState<LabOrderResponseDto[]>([]);
  const [encountersList, setEncountersList] = useState<EncounterResponseDto[]>([]);
  const [prescriptionsList, setPrescriptionsList] = useState<PrescriptionResponseDto[]>([]);
  const [paymentsList, setPaymentsList] = useState<PaymentResponseDto[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Search & Filter State ──
  const [patientSearch, setPatientSearch] = useState('');
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

    const cached = getCachedPatientProfile();
    if (cached?.patientId) {
      setProfile(cached);
      loadDashboardData(cached);
      return;
    }

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

  const loadDashboardData = async (cachedProfile?: PatientResponseDto | null) => {
    if (!user) return;
    setLoading(true);
    try {
      if (user.role === 'PATIENT') {
        const effectiveProfile = cachedProfile || profile;
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
          try {
            const cachedAppt = localStorage.getItem('clinic_flow_new_appointment');
            if (cachedAppt) {
              const a = JSON.parse(cachedAppt);
              if (a && a.patientId === effectiveProfile.patientId && !appts.find(x => x.apptId === a.apptId)) {
                appts = [a, ...appts];
                // clear cached appointment after merging to avoid duplicates next load
                try { localStorage.removeItem('clinic_flow_new_appointment'); } catch {}
              }
            }
          } catch {}
          setAppointments(appts);
        } else {
          const patientProfile = await getMyProfile();
          if (patientProfile) {
            setProfile(patientProfile);
            let appts = await getAppointmentsByPatient(patientProfile.patientId);
            try {
              const cachedAppt = localStorage.getItem('clinic_flow_new_appointment');
              if (cachedAppt) {
                const a = JSON.parse(cachedAppt);
                if (a && a.patientId === patientProfile.patientId && !appts.find(x => x.apptId === a.apptId)) {
                  appts = [a, ...appts];
                  try { localStorage.removeItem('clinic_flow_new_appointment'); } catch {}
                }
              }
            } catch {}
            setAppointments(appts);
          } else {
            setProfile(null);
            setAppointments([]);
          }
        }
        const docs = await getClinicians();
        setClinicians(docs);
      } else if (user.role === 'RECEPTION') {
        const patients = await getAllPatients();
        setPatientsList(patients);
        const appts = await getAllAppointments();
        setAppointments(appts);
      } else if (user.role === 'ADMIN') {
        const [appts, patients, users, labs, encounters, prescriptions, payments, docs] = await Promise.all([
          getAllAppointments().catch(() => []),
          getAllPatients().catch(() => []),
          getAllUsers().catch(() => []),
          getAllOrders().catch(() => []),
          getAllEncounters().catch(() => []),
          getAllPrescriptions().catch(() => []),
          getAllPayments().catch(() => []),
          getClinicians().catch(() => [])
        ]);
        setAppointments(appts);
        setPatientsList(patients);
        setUsersList(users);
        setLabOrdersList(labs);
        setEncountersList(encounters);
        setPrescriptionsList(prescriptions);
        setPaymentsList(payments);
        setClinicians(docs);
      } else {
        // Clinicians / Other
        const appts = await getAllAppointments();
        setAppointments(appts);
        const patients = await getAllPatients();
        setPatientsList(patients);
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
      const primaryContact = normalizedPhone;
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
      cachePatientProfile(newProfile);
      setShowRegisterModal(false);
      // Keep the returned profile in state and avoid reloading dashboard immediately.
      // This prevents the registration modal from reappearing if the auth token
      // hasn't changed immediately on the backend.
    } catch (err: any) {
      const resp = err?.response?.data;
      let msg = '';
      if (resp) {
        if (Array.isArray(resp.fieldErrors) && resp.fieldErrors.length > 0) {
          msg = resp.fieldErrors.map((f: any) => `${f.field || f.defaultMessage || f}: ${f.defaultMessage || f.message || JSON.stringify(f)}`).join('\n');
        } else if (Array.isArray(resp.errors) && resp.errors.length > 0) {
          msg = resp.errors.map((f: any) => (f.field ? `${f.field}: ${f.defaultMessage || f.message}` : (f.defaultMessage || f.message || JSON.stringify(f)) )).join('\n');
        } else if (resp.message) {
          msg = resp.message;
        } else {
          msg = JSON.stringify(resp);
        }
      } else {
        msg = err?.message || 'Registration failed.';
      }
      // also include raw response for debugging
      try {
        setRegError(msg + '\n\n' + JSON.stringify(err?.response?.data, null, 2));
      } catch {
        setRegError(msg);
      }
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
      const primaryContact = normalizedPhone;
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
      // show raw server response when available
      const resp = err?.response?.data;
      let raw = err?.message || 'Failed to register patient';
      try {
        raw = JSON.stringify(resp, null, 2) || raw;
      } catch {}
      setRegError(raw);
      toast.error((err?.message) || 'Failed to register patient');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckIn = async (id: number) => {
    try {
      await checkInAppointment(id);
      toast.success('Patient checked in successfully!');
      loadDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Check-in failed');
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
        patientSearch={patientSearch}
        setPatientSearch={setPatientSearch}
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
        handleReceptionistRegisterSubmit={handleReceptionistRegisterSubmit}
        handleCheckIn={handleCheckIn}
        handleCancelAppt={handleCancelAppt}
        getStatusBadge={getStatusBadge}
        formatDate={formatDate}
        formatTime={formatTime}
        parseContact={parseContact}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. ADMIN DASHBOARD LAYOUT
  // ─────────────────────────────────────────────────────────────────────────
  if (user?.role === 'ADMIN') {
    const isSameDay = (d1: Date, d2: Date) => {
      return d1.getFullYear() === d2.getFullYear() &&
             d1.getMonth() === d2.getMonth() &&
             d1.getDate() === d2.getDate();
    };

    const isThisMonth = (d: Date) => {
      const now = new Date();
      return d.getFullYear() === now.getFullYear() &&
             d.getMonth() === now.getMonth();
    };

    const isThisWeek = (d: Date) => {
      const now = new Date();
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return d >= oneWeekAgo && d <= now;
    };

    // ── Metric Computations ──
    const safePatients = patientsList || [];
    const safeClinicians = clinicians || [];
    const safeUsers = usersList || [];
    const safeAppointments = appointments || [];
    const safeEncounters = encountersList || [];
    const safePrescriptions = prescriptionsList || [];
    const safeLabOrders = labOrdersList || [];
    const safePayments = paymentsList || [];

    const totalPatients = safePatients.length;
    const totalDoctors = safeClinicians.length;
    const totalStaff = safeUsers.filter(u => u.role !== 'PATIENT' && u.role !== 'CLINICIAN').length;
    const todayAppts = safeAppointments.filter(a => a.startAt && isSameDay(new Date(a.startAt), new Date())).length;
    const activeAdmissions = safeEncounters.filter(e => e.status === 'IN_PROGRESS').length;
    const pendingRx = safePrescriptions.filter(p => p.status === 'ACTIVE' || p.status === 'ISSUED' || p.status === 'DRAFT').length;
    const pendingLabs = safeLabOrders.filter(l => l.status === 'ORDERED' || l.status === 'COLLECTED').length;
    const todayRevenue = safePayments
      .filter(p => p.paidAt && isSameDay(new Date(p.paidAt), new Date()))
      .reduce((sum, p) => sum + p.amount, 0);

    // ── Hospital Overview ──
    const patientsThisMonth = safePatients.filter(p => p.createdAt && isThisMonth(new Date(p.createdAt))).length;
    const apptsThisMonth = safeAppointments.filter(a => a.startAt && isThisMonth(new Date(a.startAt))).length;
    const revenueThisMonth = safePayments
      .filter(p => p.paidAt && isThisMonth(new Date(p.paidAt)))
      .reduce((sum, p) => sum + p.amount, 0);
    const newPatientsThisWeek = safePatients.filter(p => p.createdAt && isThisWeek(new Date(p.createdAt))).length;

    // ── Charts Calculations ──
    const getLast7Days = () => {
      const list = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        list.push(d);
      }
      return list;
    };

    const dailyAppts = getLast7Days().map(day => {
      const count = safeAppointments.filter(a => a.startAt && isSameDay(new Date(a.startAt), day)).length;
      const label = day.toLocaleDateString('en-IN', { weekday: 'short' });
      return { label, count };
    });

    const getLast6Months = () => {
      const list = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        list.push(d);
      }
      return list;
    };

    const monthlyRevenue = getLast6Months().map(m => {
      const total = safePayments
        .filter(p => {
          if (!p.paidAt) return false;
          const pd = new Date(p.paidAt);
          return pd.getFullYear() === m.getFullYear() && pd.getMonth() === m.getMonth();
        })
        .reduce((sum, p) => sum + p.amount, 0);
      const label = m.toLocaleDateString('en-IN', { month: 'short' });
      return { label, total };
    });

    const monthlyPatients = getLast6Months().map(m => {
      const count = safePatients.filter(p => {
        if (!p.createdAt) return false;
        const cd = new Date(p.createdAt);
        return cd.getFullYear() === m.getFullYear() && cd.getMonth() === m.getMonth();
      }).length;
      const label = m.toLocaleDateString('en-IN', { month: 'short' });
      return { label, count };
    });

    const maxAppts = Math.max(...dailyAppts.map(d => d.count), 5);
    const maxRevenue = Math.max(...monthlyRevenue.map(m => m.total), 1000);
    const maxPatients = Math.max(...monthlyPatients.map(m => m.count), 5);

    const stats8 = [
      { label: 'Total Patients', value: totalPatients.toString(), icon: <Users size={22} />, color: 'primary' },
      { label: 'Total Doctors', value: totalDoctors.toString(), icon: <Stethoscope size={22} />, color: 'success' },
      { label: 'Total Staff', value: totalStaff.toString(), icon: <UserCheck size={22} />, color: 'info' },
      { label: "Today's Appointments", value: todayAppts.toString(), icon: <CalendarDays size={22} />, color: 'warning' },
      { label: 'Active Admissions', value: activeAdmissions.toString(), icon: <Activity size={22} />, color: 'primary' },
      { label: 'Pending Prescriptions', value: pendingRx.toString(), icon: <Pill size={22} />, color: 'success' },
      { label: 'Pending Lab Orders', value: pendingLabs.toString(), icon: <FlaskConical size={22} />, color: 'info' },
      { label: "Today's Revenue", value: `₹${todayRevenue.toLocaleString('en-IN')}`, icon: <DollarSign size={22} />, color: 'warning' },
    ];

    const overviewMetrics = [
      { label: 'Total Patients Registered (Month)', value: patientsThisMonth.toString(), change: `${newPatientsThisWeek} new this week`, color: 'primary', icon: <Users size={18} /> },
      { label: 'Total Appointments (Month)', value: apptsThisMonth.toString(), change: 'Monthly volume', color: 'info', icon: <CalendarDays size={18} /> },
      { label: 'Revenue Generated (Month)', value: `₹${revenueThisMonth.toLocaleString('en-IN')}`, change: 'Month-to-date earnings', color: 'success', icon: <DollarSign size={18} /> },
      { label: 'New Registrations (Week)', value: newPatientsThisWeek.toString(), change: 'Last 7 days registration', color: 'warning', icon: <TrendingUp size={18} /> },
    ];

    return (
      <div>
        {/* Welcome */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
            Good day, {user?.name?.split(' ')[0]} 👋
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Monitor clinic metrics, admissions, and hospital analytics in real-time.
          </p>
        </div>

        {/* 1. Symmetrical Stats Grid */}
        <div className="stats-grid" style={{ marginBottom: '32px' }}>
          {stats8.map((stat, i) => (
            <div className="stat-card" key={i}>
              <div className={`stat-card-icon ${stat.color}`}>
                {stat.icon}
              </div>
              <div className="stat-card-info">
                <h3>{stat.value}</h3>
                <p>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 2. Hospital Overview Section */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} style={{ color: 'var(--color-primary)' }} />
            Hospital Overview (This Month)
          </h3>
          <div className="stats-grid">
            {overviewMetrics.map((metric, i) => (
              <div className="stat-card" key={i}>
                <div className={`stat-card-icon ${metric.color}`}>
                  {metric.icon}
                </div>
                <div className="stat-card-info">
                  <h3>{metric.value}</h3>
                  <p>{metric.label}</p>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600, marginTop: '4px' }}>
                    {metric.change}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. SVG Analytics Charts */}
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={18} style={{ color: 'var(--color-primary)' }} />
            System Analytics Trends
          </h3>
          
          <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
            {/* Chart 1: Appointment Trends */}
            <div className="card">
              <div className="card-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CalendarDays size={18} style={{ color: 'var(--color-primary)' }} />
                  Appointment Trends
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Daily (Last 7 days)</span>
              </div>
              <div className="card-body" style={{ padding: '16px 20px 24px' }}>
                <div style={{ height: '200px', width: '100%' }}>
                  <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" />
                        <stop offset="100%" stopColor="var(--color-primary-dark, var(--color-primary))" />
                      </linearGradient>
                    </defs>
                    <line x1="30" y1="30" x2="480" y2="30" stroke="var(--color-border)" strokeWidth="1" opacity="0.4" />
                    <line x1="30" y1="90" x2="480" y2="90" stroke="var(--color-border)" strokeWidth="1" opacity="0.4" />
                    <line x1="30" y1="150" x2="480" y2="150" stroke="var(--color-border)" strokeWidth="1" opacity="0.4" />
                    
                    {dailyAppts.map((d, i) => {
                      const x = 50 + i * 62;
                      const h = (d.count / maxAppts) * 120;
                      const y = 150 - h;
                      return (
                        <g key={i}>
                          <rect x={x} y={y} width="28" height={h} rx="4" fill="url(#barGrad)" />
                          <text x={x + 14} y={y - 6} textAnchor="middle" fill="var(--color-text)" fontSize="10" fontWeight="700">
                            {d.count}
                          </text>
                          <text x={x + 14} y="172" textAnchor="middle" fill="var(--color-text-secondary)" fontSize="10">
                            {d.label}
                          </text>
                        </g>
                      );
                    })}
                    <line x1="30" y1="150" x2="480" y2="150" stroke="var(--color-text-secondary)" strokeWidth="1" opacity="0.3" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Chart 2: Revenue Analytics */}
            <div className="card">
              <div className="card-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DollarSign size={18} style={{ color: 'var(--color-success)' }} />
                  Revenue Analytics
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Monthly (Last 6 months)</span>
              </div>
              <div className="card-body" style={{ padding: '16px 20px 24px' }}>
                <div style={{ height: '200px', width: '100%' }}>
                  <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-success)" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="var(--color-success)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <line x1="30" y1="30" x2="480" y2="30" stroke="var(--color-border)" strokeWidth="1" opacity="0.4" />
                    <line x1="30" y1="90" x2="480" y2="90" stroke="var(--color-border)" strokeWidth="1" opacity="0.4" />
                    <line x1="30" y1="150" x2="480" y2="150" stroke="var(--color-border)" strokeWidth="1" opacity="0.4" />

                    {(() => {
                      const points = monthlyRevenue.map((m, i) => {
                        const x = 50 + i * 82;
                        const y = 150 - (m.total / maxRevenue) * 120;
                        return { x, y, total: m.total, label: m.label };
                      });

                      const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                      const areaD = `${pathD} L ${points[points.length - 1].x} 150 L ${points[0].x} 150 Z`;

                      return (
                        <g>
                          <path d={areaD} fill="url(#areaGrad)" />
                          <path d={pathD} fill="none" stroke="var(--color-success)" strokeWidth="3" strokeLinecap="round" />
                          {points.map((p, i) => (
                            <g key={i}>
                              <circle cx={p.x} cy={p.y} r="5" fill="var(--color-success)" stroke="#fff" strokeWidth="2" />
                              <text x={p.x} y={p.y - 8} textAnchor="middle" fill="var(--color-text)" fontSize="9" fontWeight="700">
                                ₹{(p.total / 1000).toFixed(0)}k
                              </text>
                              <text x={p.x} y="172" textAnchor="middle" fill="var(--color-text-secondary)" fontSize="10">
                                {p.label}
                              </text>
                            </g>
                          ))}
                        </g>
                      );
                    })()}
                    <line x1="30" y1="150" x2="480" y2="150" stroke="var(--color-text-secondary)" strokeWidth="1" opacity="0.3" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Chart 3: Patient Registration Trend (Full Width) */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} style={{ color: 'var(--color-primary)' }} />
                Patient Registration Trend
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>New Patients Added (Last 6 months)</span>
            </div>
            <div className="card-body" style={{ padding: '16px 20px 24px' }}>
              <div style={{ height: '200px', width: '100%' }}>
                <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" />
                      <stop offset="100%" stopColor="var(--color-primary-dark, var(--color-primary))" />
                    </linearGradient>
                  </defs>
                  <line x1="30" y1="30" x2="480" y2="30" stroke="var(--color-border)" strokeWidth="1" opacity="0.4" />
                  <line x1="30" y1="90" x2="480" y2="90" stroke="var(--color-border)" strokeWidth="1" opacity="0.4" />
                  <line x1="30" y1="150" x2="480" y2="150" stroke="var(--color-border)" strokeWidth="1" opacity="0.4" />

                  {monthlyPatients.map((m, i) => {
                    const x = 50 + i * 82;
                    const h = (m.count / maxPatients) * 120;
                    const y = 150 - h;
                    return (
                      <g key={i}>
                        <rect x={x} y={y} width="32" height={h} rx="4" fill="url(#emeraldGrad)" />
                        <text x={x + 16} y={y - 6} textAnchor="middle" fill="var(--color-text)" fontSize="10" fontWeight="700">
                          {m.count}
                        </text>
                        <text x={x + 16} y="172" textAnchor="middle" fill="var(--color-text-secondary)" fontSize="10">
                          {m.label}
                        </text>
                      </g>
                    );
                  })}
                  <line x1="30" y1="150" x2="480" y2="150" stroke="var(--color-text-secondary)" strokeWidth="1" opacity="0.3" />
                </svg>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. CLINICIAN / ADMIN (DEFAULT) DASHBOARD LAYOUT
  // ─────────────────────────────────────────────────────────────────────────
  const stats = [
    { label: 'Total Registered Patients', value: patientsList.length.toString(), icon: <Users size={22} />, color: 'primary' },
    { label: 'Today\'s Scheduled Appointments', value: appointments.length.toString(), icon: <CalendarDays size={22} />, color: 'info' },
    { label: 'Active Encounters', value: appointments.filter(a => a.status === 'CHECKED_IN').length.toString(), icon: <Stethoscope size={22} />, color: 'warning' },
    { label: 'Completed Visits Today', value: appointments.filter(a => a.status === 'COMPLETED').length.toString(), icon: <Pill size={22} />, color: 'success' },
  ];

  const recentActivities = [
    { text: 'Patient checked in at Reception Desk', time: 'Just now', color: 'var(--color-info)' },
    { text: 'Encounter completed by Clinician', time: '10 minutes ago', color: 'var(--color-success)' },
    { text: 'New prescription issued for Patient', time: '25 minutes ago', color: 'var(--color-primary)' },
    { text: 'Patient registration updated', time: '1 hour ago', color: 'var(--color-warning)' },
  ];

  return (
    <div>
      {/* Welcome */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
          Good day, {user?.name?.split(' ')[0]} 👋
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Review clinic outpatient statistics and manage active medical encounters.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '32px' }}>
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <div className={`stat-card-icon ${stat.color}`}>{stat.icon}</div>
            <div className="stat-card-info">
              <h3>{stat.value}</h3>
              <p>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Quick Actions</h3>
        <div className="quick-actions">
          <div className="quick-action-card" onClick={() => navigate('/encounters/new')}>
            <div className="qa-icon" style={{ background: 'var(--color-primary-100)', color: 'var(--color-primary-dark)' }}>
              <Plus size={24} />
            </div>
            <h4>New Encounter</h4>
            <p>Start a clinical visit</p>
          </div>
          <div className="quick-action-card" onClick={() => navigate('/prescriptions')}>
            <div className="qa-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
              <Pill size={24} />
            </div>
            <h4>Write Prescription</h4>
            <p>Prescribe medication</p>
          </div>
          <div className="quick-action-card" onClick={() => navigate('/encounters')}>
            <div className="qa-icon" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
              <Stethoscope size={24} />
            </div>
            <h4>View Encounters</h4>
            <p>Review clinical notes</p>
          </div>
          <div className="quick-action-card" onClick={() => navigate('/appointments')}>
            <div className="qa-icon" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
              <CalendarDays size={24} />
            </div>
            <h4>Appointments</h4>
            <p>Manage clinic schedule</p>
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Appointments List */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} style={{ color: 'var(--color-primary)' }} />
              Today's Scheduled Appointments
            </h3>
            <span className="badge badge-primary">{appointments.length}</span>
          </div>
          <div className="card-body" style={{ padding: '16px 0 0' }}>
            {appointments.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>No appointments scheduled for today.</p>
              </div>
            ) : (
              <div className="data-table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Time</th>
                      <th>Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appt, i) => (
                      <tr key={i}>
                        <td className="cell-main">{appt.patientName}</td>
                        <td>{formatTime(appt.startAt)}</td>
                        <td>{appt.serviceType}</td>
                        <td>{getStatusBadge(appt.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} style={{ color: 'var(--color-warning)' }} />
              Recent Activity
            </h3>
          </div>
          <div className="activity-list">
            {recentActivities.map((activity, i) => (
              <div className="activity-item" key={i}>
                <div className="activity-dot" style={{ background: activity.color }} />
                <div className="activity-content">
                  <p>{activity.text}</p>
                  <span>{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
