import type { FormEvent, ReactNode } from 'react';
import { AlertCircle, CalendarDays, MapPin, Plus, User, Users, X } from 'lucide-react';
import type { AppointmentResponseDto, PatientResponseDto } from '../../models/types';
import type { Clinician } from '../../services/appointmentService';
import '../../assets/styles/patients/patients.css';
import '../../assets/styles/patients/PatientDashboard.css';

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
  const todayStr = new Date().toISOString().split('T')[0];
  const scheduledAppointments = appointments.filter(appt => appt.status === 'SCHEDULED');

  return (
    <div className="pd-root">
      <div className="pd-hero">
        <div className="pd-hero-text">
          <h2>Welcome back, {userName} 👋</h2>
          <p>Access your digital medical records, track appointments, and book consultations with our specialists.</p>
        </div>
        {profile && (
          <div className="pd-hero-actions">
            <button className="btn btn-primary" onClick={navigateToNewAppointment}>
              <Plus size={18} /> Book Appointment
            </button>
          </div>
        )}
      </div>

      {!profile && (
        <div className="pd-alert">
          <div className="pd-alert-icon"><AlertCircle size={22} /></div>
          <div>
            <h4>Medical Record Not Activated</h4>
            <p>
              To book appointments or receive prescriptions online, the clinic requires you to submit your demographics registry profile.
            </p>
            <button className="btn btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={() => setShowRegisterModal(true)}>
              Activate Clinic Profile
            </button>
          </div>
        </div>
      )}

      <div className="pd-grid pd-grid-single">
        <div className="pd-col">
          {profile && (
            <div className="pd-card">
              <div className="pd-card-header">
                <h3 className="pd-card-title">
                  <span className="pd-title-icon"><User size={16} /></span>
                  My Demographic Profile
                </h3>
                <span className="badge badge-success" style={{ textTransform: 'uppercase' }}>MRN: {profile.mrn}</span>
              </div>
              <div className="pd-card-body">
                <div className="pd-profile-grid">
                  <div className="pd-field">
                    <span className="pd-field-label">DOB</span>
                    <span className="pd-field-value">{formatDate(profile.dob)}</span>
                  </div>
                  <div className="pd-field">
                    <span className="pd-field-label">Gender</span>
                    <span className="pd-field-value" style={{ textTransform: 'capitalize' }}>{profile.gender.toLowerCase()}</span>
                  </div>
                  <div className="pd-field">
                    <span className="pd-field-label">Phone</span>
                    <span className="pd-field-value">{parsedContact.phone || '—'}</span>
                  </div>
                  <div className="pd-field">
                    <span className="pd-field-label">Email</span>
                    <span className="pd-field-value">{parsedContact.email}</span>
                  </div>
                  <div className="pd-field span-2">
                    <span className="pd-field-label">Address</span>
                    <span className="pd-field-value">
                      <MapPin size={14} style={{ color: 'var(--color-primary)' }} />
                      {parsedAddress ? `${parsedAddress.line1}, ${parsedAddress.city}, ${parsedAddress.state} ${parsedAddress.zip}` : '—'}
                    </span>
                  </div>
                  <div className="pd-field">
                    <span className="pd-field-label">Emergency Contact</span>
                    <span className="pd-field-value">{profile.primaryContact || '—'}</span>
                  </div>
                  <div className="pd-field">
                    <span className="pd-field-label">Insurance Policy ID</span>
                    <span className="pd-field-value">{profile.insuranceId || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pd-card">
            <div className="pd-card-header">
              <h3 className="pd-card-title">
                <span className="pd-title-icon"><CalendarDays size={16} /></span>
                My Scheduled Appointments
              </h3>
            </div>
            <div className="pd-card-body">
              {scheduledAppointments.length === 0 ? (
                <div className="pd-empty">
                  <div className="pd-empty-icon"><CalendarDays size={20} /></div>
                  <p>No scheduled appointments.</p>
                </div>
              ) : (
                <div className="pd-table-wrapper">
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
                      {scheduledAppointments.map(appt => (
                        <tr key={appt.apptId}>
                          <td className="cell-main">{appt.clinicianName}</td>
                          <td>{appt.department}</td>
                          <td>{formatDate(appt.startAt)}</td>
                          <td>{formatTime(appt.startAt)}</td>
                          <td>{getStatusBadge(appt.status)}</td>
                          <td>
                            {appt.status === 'SCHEDULED' && (
                              <button
                                className="btn pd-cancel-btn"
                                onClick={() => handleCancelAppt(appt.apptId)}
                              >
                                Cancel
                              </button>
                            )}
                            {appt.status !== 'SCHEDULED' && (
                              <span className="pd-dash">—</span>
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

      </div>

      {showRegisterModal && (
        <div className="patients-modal-overlay pd-activate-modal-overlay">
          <div className="patients-modal pd-activate-modal">
            <div className="pd-activate-modal-header">
              <h2>
                <Users size={20} style={{ color: 'var(--color-primary)' }} />
                Complete Patient Registry
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={() => { setShowRegisterModal(false); setRegError(''); }}><X size={18} /></button>
            </div>

            <form onSubmit={handleSelfRegisterSubmit}>
              <div className="pd-activate-modal-body">
                <p>
                  To finalize your activation and enable scheduling, please fill in your demographics and emergency details for your clinic record.
                </p>

                <div className="pd-form-grid-2">
                  <div className="form-group">
                    <label className="pd-form-label">Full Name</label>
                    <input
                      type="text"
                      className="pd-form-input"
                      value={accountName || userName || ''}
                      readOnly
                    />
                  </div>
                  <div className="form-group">
                    <label className="pd-form-label">Phone Number</label>
                    <input
                      type="tel"
                      className="pd-form-input"
                      value={accountPhone || userPhone || ''}
                      readOnly
                    />
                  </div>
                </div>

                {regError && (
                  <div className="pd-form-error-alert">
                    <strong>Server validation error:</strong>
                    <div className="pd-form-error-alert-text">{regError}</div>
                  </div>
                )}

                <div className="pd-form-grid-2">
                  <div className="form-group">
                    <label className="pd-form-label">Date of Birth *</label>
                    <input
                      type="date"
                      className="pd-form-input pd-form-input-white"
                      value={dob}
                      onChange={e => setDob(e.target.value)}
                      required
                      max={todayStr}
                    />
                  </div>

                  <div className="form-group">
                    <label className="pd-form-label">Gender *</label>
                    <select
                      value={gender}
                      onChange={e => setGender(e.target.value)}
                      required
                      className="pd-form-select"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <h3 className="pd-form-section-title">Address Details</h3>

                <div className="pd-form-grid-full">
                  <div className="form-group">
                    <label className="pd-form-label">Street Address *</label>
                    <input
                      type="text"
                      placeholder="123 Health Ave"
                      value={street}
                      onChange={e => setStreet(e.target.value)}
                      required
                      className="pd-form-input pd-form-input-white"
                    />
                  </div>
                </div>

                <div className="pd-form-grid-3">
                  <div className="form-group">
                    <label className="pd-form-label">City *</label>
                    <input
                      type="text"
                      placeholder="Chennai"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      required
                      className="pd-form-input pd-form-input-white"
                    />
                  </div>
                  <div className="form-group">
                    <label className="pd-form-label">State *</label>
                    <input
                      type="text"
                      placeholder="TN"
                      value={stateCode}
                      onChange={e => setStateCode(e.target.value)}
                      required
                      className="pd-form-input pd-form-input-white"
                    />
                  </div>
                  <div className="form-group">
                    <label className="pd-form-label">Zip *</label>
                    <input
                      type="text"
                      placeholder="600001"
                      value={zip}
                      onChange={e => setZip(e.target.value)}
                      required
                      className="pd-form-input pd-form-input-white"
                    />
                  </div>
                </div>

                <h3 className="pd-form-section-title">Emergency Contact</h3>

                <div className="pd-form-grid-2">
                  <div className="form-group">
                    <label className="pd-form-label">Contact Name *</label>
                    <input
                      type="text"
                      placeholder="Jane Doe (Spouse)"
                      value={emergencyName}
                      onChange={e => setEmergencyName(e.target.value)}
                      required
                      className="pd-form-input pd-form-input-white"
                    />
                  </div>
                  <div className="form-group">
                    <label className="pd-form-label">Contact Phone *</label>
                    <input
                      type="tel"
                      placeholder="+91 98765 00000"
                      value={emergencyPhone}
                      onChange={e => setEmergencyPhone(e.target.value)}
                      required
                      className="pd-form-input pd-form-input-white"
                    />
                  </div>
                </div>

                <h3 className="pd-form-section-title">Insurance Details (Optional)</h3>

                <div className="pd-form-grid-full">
                  <div className="form-group">
                    <label className="pd-form-label">Insurance Policy ID</label>
                    <input
                      type="text"
                      placeholder="INS-104928"
                      value={insuranceId}
                      onChange={e => setInsuranceId(e.target.value)}
                      className="pd-form-input pd-form-input-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pd-activate-modal-footer">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="pd-activate-submit-btn"
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