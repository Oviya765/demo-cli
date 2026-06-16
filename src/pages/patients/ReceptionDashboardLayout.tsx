import type { FormEvent, ReactNode } from 'react';
import { Activity, Calendar, CalendarDays, Clock, Plus, Search, Users, X } from 'lucide-react';
import type { AppointmentResponseDto, PatientResponseDto } from '../../models/types';
import '../../assets/styles/patients/patients.css';

interface ReceptionDashboardLayoutProps {
  patientsList: PatientResponseDto[];
  appointments: AppointmentResponseDto[];
  patientSearch: string;
  setPatientSearch: (value: string) => void;
  appointmentSearch: string;
  setAppointmentSearch: (value: string) => void;
  showAddPatientModal: boolean;
  setShowAddPatientModal: (value: boolean) => void;
  regName: string;
  setRegName: (value: string) => void;
  regEmail: string;
  setRegEmail: (value: string) => void;
  dob: string;
  setDob: (value: string) => void;
  gender: string;
  setGender: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  street: string;
  setStreet: (value: string) => void;
  city: string;
  setCity: (value: string) => void;
  stateCode: string;
  setStateCode: (value: string) => void;
  zip: string;
  setZip: (value: string) => void;
  emergencyName: string;
  setEmergencyName: (value: string) => void;
  emergencyPhone: string;
  setEmergencyPhone: (value: string) => void;
  insuranceId: string;
  setInsuranceId: (value: string) => void;
  actionLoading: boolean;
  navigateToNewAppointment: () => void;
  handleReceptionistRegisterSubmit: (e: FormEvent) => Promise<void>;
  handleCheckIn: (id: number) => Promise<void>;
  handleCancelAppt: (id: number) => Promise<void>;
  getStatusBadge: (status: string) => ReactNode;
  formatDate: (dateStr: string) => string;
  formatTime: (dateStr: string) => string;
  parseContact: (contactJson: string) => { email: string; phone: string };
}

export default function ReceptionDashboardLayout({
  patientsList,
  appointments,
  patientSearch,
  setPatientSearch,
  appointmentSearch,
  setAppointmentSearch,
  showAddPatientModal,
  setShowAddPatientModal,
  regName,
  setRegName,
  regEmail,
  setRegEmail,
  dob,
  setDob,
  gender,
  setGender,
  phone,
  setPhone,
  street,
  setStreet,
  city,
  setCity,
  stateCode,
  setStateCode,
  zip,
  setZip,
  emergencyName,
  setEmergencyName,
  emergencyPhone,
  setEmergencyPhone,
  insuranceId,
  setInsuranceId,
  actionLoading,
  navigateToNewAppointment,
  handleReceptionistRegisterSubmit,
  handleCheckIn,
  handleCancelAppt,
  getStatusBadge,
  formatDate,
  formatTime,
  parseContact,
}: ReceptionDashboardLayoutProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointmentsCount = appointments.filter(a => a.startAt.startsWith(todayStr)).length;
  const checkedInCount = appointments.filter(a => a.startAt.startsWith(todayStr) && a.status === 'CHECKED_IN').length;

  const stats = [
    { label: 'Total Registered Patients', value: patientsList.length.toString(), icon: <Users size={22} />, color: 'primary' },
    { label: 'Today\'s Appointments', value: todayAppointmentsCount.toString(), icon: <CalendarDays size={22} />, color: 'info' },
    { label: 'Patients Checked In', value: checkedInCount.toString(), icon: <Activity size={22} />, color: 'success' },
    { label: 'Scheduled Waitlist', value: appointments.filter(a => a.status === 'SCHEDULED').length.toString(), icon: <Clock size={22} />, color: 'warning' },
  ];

  const filteredPatients = patientsList.filter(p =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.mrn.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const todayAppts = appointments.filter(appt => {
    const matchSearch =
      appt.patientName.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
      appt.clinicianName.toLowerCase().includes(appointmentSearch.toLowerCase());
    const isToday = appt.startAt.startsWith(todayStr);
    return matchSearch && isToday;
  });

  return (
    <div>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
            Reception Desk 🏢
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Register clinic patients and manage doctor appointments.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => setShowAddPatientModal(true)}>
            <Plus size={18} /> Register Patient
          </button>
          <button className="btn btn-primary" onClick={navigateToNewAppointment}>
            <Calendar size={18} style={{ marginRight: '6px' }} /> Book Appointment
          </button>
        </div>
      </div>

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

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} style={{ color: 'var(--color-primary)' }} />
              Patient Registry
            </h3>
            <div className="header-search search-input" style={{ width: '220px', margin: 0 }}>
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search name or MRN..."
                value={patientSearch}
                onChange={e => setPatientSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="card-body" style={{ padding: '16px 0 0' }}>
            {filteredPatients.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 0' }}>
                <p style={{ color: 'var(--color-text-secondary)' }}>No registered patients found.</p>
              </div>
            ) : (
              <div className="data-table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>MRN</th>
                      <th>Name</th>
                      <th>DOB</th>
                      <th>Gender</th>
                      <th>Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map(p => {
                      const contact = parseContact(p.contactInfoJson);
                      return (
                        <tr key={p.patientId}>
                          <td><span className="badge badge-neutral" style={{ padding: '4px 6px', fontWeight: 600 }}>{p.mrn}</span></td>
                          <td className="cell-main">{p.name}</td>
                          <td>{formatDate(p.dob)}</td>
                          <td style={{ textTransform: 'capitalize' }}>{p.gender.toLowerCase()}</td>
                          <td>
                            <div style={{ fontSize: '0.8rem' }}>{contact.phone}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>{contact.email}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} style={{ color: 'var(--color-warning)' }} />
              Today's Appointments Desk
            </h3>
            <div className="header-search search-input" style={{ width: '200px', margin: 0 }}>
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Filter by patient/doctor..."
                value={appointmentSearch}
                onChange={e => setAppointmentSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="card-body" style={{ padding: '16px 0 0' }}>
            {todayAppts.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 0' }}>
                <p style={{ color: 'var(--color-text-secondary)' }}>No appointments scheduled for today.</p>
              </div>
            ) : (
              <div className="data-table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayAppts.map(appt => (
                      <tr key={appt.apptId}>
                        <td>
                          <div className="cell-main">{appt.patientName}</div>
                          <div className="cell-sub" style={{ fontSize: '0.7rem' }}>MRN: {appt.patientMrn}</div>
                        </td>
                        <td>{appt.clinicianName}</td>
                        <td>{formatTime(appt.startAt)}</td>
                        <td>{getStatusBadge(appt.status)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {appt.status === 'SCHEDULED' && (
                              <button
                                className="btn btn-primary"
                                style={{ padding: '4px 6px', fontSize: '0.7rem', height: 'auto' }}
                                onClick={() => handleCheckIn(appt.apptId)}
                              >
                                Check In
                              </button>
                            )}
                            {(appt.status === 'SCHEDULED' || appt.status === 'CHECKED_IN') && (
                              <button
                                className="btn btn-danger"
                                style={{ padding: '4px 6px', fontSize: '0.7rem', height: 'auto', background: 'transparent', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                                onClick={() => handleCancelAppt(appt.apptId)}
                              >
                                Cancel
                              </button>
                            )}
                            {!(appt.status === 'SCHEDULED' || appt.status === 'CHECKED_IN') && (
                              <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddPatientModal && (
        <div className="patients-modal-overlay" style={{ background: 'rgba(5, 8, 16, 0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="patients-modal" style={{ maxWidth: '650px', background: '#0d1527', border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff' }}>
            <div className="modal-header" style={{ padding: '24px 24px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} style={{ color: 'var(--color-primary)' }} />
                Register New Clinic Patient
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAddPatientModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleReceptionistRegisterSubmit}>
              <div className="patients-modal-body" style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Patient Full Name *</label>
                  <input
                    type="text"
                    placeholder="Enter patient full name"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#ffffff', outline: 'none' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Patient Email *</label>
                  <input
                    type="email"
                    placeholder="patient@email.com"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#ffffff', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Date of Birth *</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={e => setDob(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#ffffff', outline: 'none' }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Gender *</label>
                    <select
                      value={gender}
                      onChange={e => setGender(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 14px', background: '#0d1527', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#ffffff', outline: 'none' }}
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Phone Number *</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#ffffff', outline: 'none' }}
                  />
                </div>

                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', margin: '24px 0 16px' }}>Address Details</h3>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Street Address *</label>
                  <input
                    type="text"
                    placeholder="123 Health Ave"
                    value={street}
                    onChange={e => setStreet(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#ffffff', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>City *</label>
                    <input
                      type="text"
                      placeholder="Chennai"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#ffffff', outline: 'none' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>State *</label>
                    <input
                      type="text"
                      placeholder="TN"
                      value={stateCode}
                      onChange={e => setStateCode(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#ffffff', outline: 'none' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Zip *</label>
                    <input
                      type="text"
                      placeholder="600001"
                      value={zip}
                      onChange={e => setZip(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#ffffff', outline: 'none' }}
                    />
                  </div>
                </div>

                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', margin: '24px 0 16px' }}>Emergency Contact</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Contact Name *</label>
                    <input
                      type="text"
                      placeholder="Jane Doe (Spouse)"
                      value={emergencyName}
                      onChange={e => setEmergencyName(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#ffffff', outline: 'none' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Contact Phone *</label>
                    <input
                      type="tel"
                      placeholder="+91 98765 00000"
                      value={emergencyPhone}
                      onChange={e => setEmergencyPhone(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#ffffff', outline: 'none' }}
                    />
                  </div>
                </div>

                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', margin: '24px 0 16px' }}>Insurance Details (Optional)</h3>

                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Insurance Policy ID</label>
                  <input
                    type="text"
                    placeholder="INS-104928"
                    value={insuranceId}
                    onChange={e => setInsuranceId(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#ffffff', outline: 'none' }}
                  />
                </div>
              </div>

              <div className="patients-modal-footer" style={{ padding: '16px 24px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddPatientModal(false)}>Cancel</button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary"
                  style={{ flex: 2, background: 'linear-gradient(135deg, #06b6d4, #0891b2)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {actionLoading ? 'Registering...' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}