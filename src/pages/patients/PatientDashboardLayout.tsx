import type { FormEvent, ReactNode } from 'react';
import { AlertCircle, CalendarDays, Heart, MapPin, Plus, User, Users, X } from 'lucide-react';
import type { AppointmentResponseDto, PatientResponseDto } from '../../models/types';
import type { Clinician } from '../../services/appointmentService';
import '../../assets/styles/patients/patients.css';

interface ParsedContact {
  email: string;
  phone: string;
}

interface ParsedAddress {
  line1: string;
  city: string;
  state: string;
  zip: string;
}

interface PatientDashboardLayoutProps {
  userName: string;
  userEmail: string;
  userPhone: string;
  profile: PatientResponseDto | null;
  appointments: AppointmentResponseDto[];
  clinicians: Clinician[];
  showRegisterModal: boolean;
  setShowRegisterModal: (value: boolean) => void;
  regError: string;
  setRegError: (value: string) => void;
  actionLoading: boolean;
  navigateToNewAppointment: () => void;
  handleSelfRegisterSubmit: (e: FormEvent) => Promise<void>;
  handleCancelAppt: (id: number) => Promise<void>;
  getStatusBadge: (status: string) => ReactNode;
  formatDate: (dateStr: string) => string;
  formatTime: (dateStr: string) => string;
  parseContact: (contactJson: string) => ParsedContact;
  parseAddress: (addressJson: string) => ParsedAddress;
  accountName: string;
  accountPhone: string;
  dob: string;
  setDob: (value: string) => void;
  gender: string;
  setGender: (value: string) => void;
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
}

export default function PatientDashboardLayout({
  userName,
  userEmail,
  userPhone,
  profile,
  appointments,
  clinicians,
  showRegisterModal,
  setShowRegisterModal,
  regError,
  setRegError,
  actionLoading,
  navigateToNewAppointment,
  handleSelfRegisterSubmit,
  handleCancelAppt,
  getStatusBadge,
  formatDate,
  formatTime,
  parseContact,
  parseAddress,
  accountName,
  accountPhone,
  dob,
  setDob,
  gender,
  setGender,
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
}: PatientDashboardLayoutProps) {
  const parsedContact = profile ? parseContact(profile.contactInfoJson) : { email: userEmail, phone: '' };
  const parsedAddress = profile ? parseAddress(profile.addressJson) : null;

  return (
    <div>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
            Welcome back, {userName} 👋
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Access your digital medical records and book consultations.
          </p>
        </div>
        {profile && (
          <button className="btn btn-primary" onClick={navigateToNewAppointment}>
            <Plus size={18} /> Book Appointment
          </button>
        )}
      </div>

      {!profile && (
        <div className="card" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '32px', padding: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div style={{ color: '#ef4444', marginTop: '2px' }}><AlertCircle size={24} /></div>
            <div>
              <h4 style={{ fontWeight: 600, color: '#fca5a5', marginBottom: '6px' }}>Medical Record Not Activated</h4>
              <p style={{ color: '#cbd5e1', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '16px' }}>
                To book appointments or receive prescriptions online, the clinic requires you to submit your demographics registry profile.
              </p>
              <button className="btn btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={() => setShowRegisterModal(true)}>
                Activate Clinic Profile
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {profile && (
            <div className="card">
              <div className="card-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={18} style={{ color: 'var(--color-primary)' }} />
                  My Demographic Profile
                </h3>
                <span className="badge badge-success" style={{ textTransform: 'uppercase' }}>MRN: {profile.mrn}</span>
              </div>
              <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '24px 0 8px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>DOB</label>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{formatDate(profile.dob)}</span>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Gender</label>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500, textTransform: 'capitalize' }}>{profile.gender.toLowerCase()}</span>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Phone</label>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{parsedContact.phone || '—'}</span>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Email</label>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{parsedContact.email}</span>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Address</label>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={14} style={{ color: 'var(--color-primary)' }} />
                    {parsedAddress ? `${parsedAddress.line1}, ${parsedAddress.city}, ${parsedAddress.state} ${parsedAddress.zip}` : '—'}
                  </span>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Emergency Contact</label>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{profile.primaryContact || '—'}</span>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Insurance Policy ID</label>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{profile.insuranceId || 'Not provided'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarDays size={18} style={{ color: 'var(--color-primary)' }} />
                My Scheduled Appointments
              </h3>
            </div>
            <div className="card-body" style={{ padding: '16px 0 0' }}>
              {appointments.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <div className="empty-state-icon" style={{ width: 48, height: 48 }}><CalendarDays size={18} /></div>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>No appointments booked yet.</p>
                </div>
              ) : (
                <div className="data-table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Doctor</th>
                        <th>Department</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map(appt => (
                        <tr key={appt.apptId}>
                          <td className="cell-main">{appt.clinicianName}</td>
                          <td>{appt.department}</td>
                          <td>{formatDate(appt.startAt)}</td>
                          <td>{formatTime(appt.startAt)}</td>
                          <td>{getStatusBadge(appt.status)}</td>
                          <td>
                            {(appt.status === 'SCHEDULED' || appt.status === 'CHECKED_IN') && (
                              <button
                                className="btn btn-danger"
                                style={{ padding: '4px 8px', fontSize: '0.7rem', height: 'auto', background: 'transparent', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                                onClick={() => handleCancelAppt(appt.apptId)}
                              >
                                Cancel
                              </button>
                            )}
                            {!(appt.status === 'SCHEDULED' || appt.status === 'CHECKED_IN') && (
                              <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>—</span>
                            )}
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

        <div className="card">
          <div className="card-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Heart size={18} style={{ color: 'var(--color-danger)' }} />
              Clinic Doctors Directory
            </h3>
          </div>
          <div className="card-body" style={{ padding: '20px 0 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {clinicians.map((doc) => (
              <div
                key={doc.userId}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', gap: '12px' }}
              >
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #0891b2, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: '#ffffff', fontSize: '0.85rem' }}>
                  Dr
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{doc.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{doc.department}</div>
                </div>
                <div>
                  <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>Available</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showRegisterModal && (
        <div className="patients-modal-overlay" style={{ background: 'rgba(5, 8, 16, 0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="patients-modal" style={{ maxWidth: '650px', background: '#0d1527', border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff' }}>
            <div className="modal-header" style={{ padding: '24px 24px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} style={{ color: 'var(--color-primary)' }} />
                Complete Patient Registry
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={() => { setShowRegisterModal(false); setRegError(''); }}><X size={18} /></button>
            </div>

            <form onSubmit={handleSelfRegisterSubmit}>
              <div className="patients-modal-body" style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
                  To finalize your activation and enable scheduling, please fill in your demographics and emergency details for your clinic record.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Full Name</label>
                    <input
                      type="text"
                      value={accountName || userName || ''}
                      readOnly
                      style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#94a3b8', outline: 'none' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Phone Number</label>
                    <input
                      type="tel"
                      value={accountPhone || userPhone || ''}
                      readOnly
                      style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#94a3b8', outline: 'none' }}
                    />
                  </div>
                </div>

                {regError && (
                  <div style={{ marginBottom: '12px', padding: '10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', color: '#fca5a5' }}>
                    <strong>Server validation error:</strong>
                    <div style={{ marginTop: '6px', fontSize: '0.9rem', color: '#ffd6d6', whiteSpace: 'pre-wrap' }}>{regError}</div>
                  </div>
                )}

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

              <div className="patients-modal-footer" style={{ padding: '16px 24px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #06b6d4, #0891b2)', border: 'none', borderRadius: '8px', color: '#ffffff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {actionLoading ? 'Activating Profile...' : 'Complete Registration & Activate Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}