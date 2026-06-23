import { type FormEvent, type ReactNode, useState } from 'react';
import { Activity, Calendar, CalendarDays, CheckCircle2, Clock, FileText, Plus, Search, UserX, Users, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { AppointmentResponseDto, PatientResponseDto } from '../../models/types';
import '../../assets/styles/patients/patients.css';

interface ReceptionDashboardLayoutProps {
  patientsList: PatientResponseDto[];
  appointments: AppointmentResponseDto[];
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
  navigateToInvoices: () => void;
  navigateToPatients: () => void;
  handleReceptionistRegisterSubmit: (e: FormEvent) => Promise<void>;
  getStatusBadge: (status: string) => ReactNode;
  formatTime: (dateStr: string) => string;
}

export default function ReceptionDashboardLayout({
  patientsList,
  appointments,
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
  navigateToInvoices,
  navigateToPatients,
  handleReceptionistRegisterSubmit,
  getStatusBadge,
  formatTime,
}: ReceptionDashboardLayoutProps) {
  const [todayApptPage, setTodayApptPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const NO_SHOW_GRACE_MINUTES = 30;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const isNoShowDataPoint = (appt: AppointmentResponseDto) => {
    if (appt.status === 'NO_SHOW') return true;
    if (appt.status !== 'CANCELLED') return false;

    const startTime = new Date(appt.startAt).getTime();
    if (Number.isNaN(startTime)) return false;

    const cutoff = Date.now() - NO_SHOW_GRACE_MINUTES * 60 * 1000;
    return startTime <= cutoff;
  };

  const todayAppointmentsCount = appointments.filter(a => a.startAt.startsWith(todayStr)).length;
  const checkedInCount = appointments.filter(a => a.startAt.startsWith(todayStr) && a.status === 'CHECKED_IN').length;
  const todayCompletedCount = appointments.filter(a => a.startAt.startsWith(todayStr) && a.status === 'COMPLETED').length;
  const todayNoShowCount = appointments.filter(a => a.startAt.startsWith(todayStr) && isNoShowDataPoint(a)).length;

  const stats = [
    { label: 'Total Registered Patients', value: patientsList.length.toString(), icon: <Users size={22} />, color: 'primary' },
    { label: 'Today\'s Appointments', value: todayAppointmentsCount.toString(), icon: <CalendarDays size={22} />, color: 'info' },
    { label: 'Patients Checked In', value: checkedInCount.toString(), icon: <Activity size={22} />, color: 'success' },
    { label: 'Scheduled Waitlist', value: appointments.filter(a => a.status === 'SCHEDULED').length.toString(), icon: <Clock size={22} />, color: 'warning' },
    { label: 'Completed Appointments', value: todayCompletedCount.toString(), icon: <CheckCircle2 size={22} />, color: 'success' },
    { label: 'No-Show Patients', value: todayNoShowCount.toString(), icon: <UserX size={22} />, color: 'warning' },
  ];

  const todayAppts = appointments.filter(appt => {
    const matchSearch =
      appt.patientName.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
      appt.clinicianName.toLowerCase().includes(appointmentSearch.toLowerCase());
    const isToday = appt.startAt.startsWith(todayStr);
    return matchSearch && isToday;
  });

  // Appointment Analysis - Last 7 days
  const last7DaysDate = new Date();
  last7DaysDate.setDate(last7DaysDate.getDate() - 7);
  const last7DaysStr = last7DaysDate.toISOString().split('T')[0];
  const last7DaysAppts = appointments.filter(a => a.startAt >= last7DaysStr);
  const completedAppts = last7DaysAppts.filter(a => a.status === 'COMPLETED').length;
  const cancelledAppts = last7DaysAppts.filter(a => a.status === 'CANCELLED').length;
  const noShowAppts = last7DaysAppts.filter(a => isNoShowDataPoint(a)).length;
  const avgApptPerDay = Math.round(last7DaysAppts.length / 7);

  // Chart data for appointment analysis
  const analysisChartData = [
    { name: 'Total', value: last7DaysAppts.length },
    { name: 'Completed', value: completedAppts },
    { name: 'Cancelled', value: cancelledAppts },
    { name: 'No Show', value: noShowAppts },
    { name: 'Avg/Day', value: avgApptPerDay },
  ];

  return (
    <div className="reception-dashboard-shell">
      <div className="reception-topbar" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
            Reception Desk 🏢
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Register clinic patients and manage doctor appointments.
          </p>
        </div>
        <div className="reception-top-actions" style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={() => setShowAddPatientModal(true)}>
            <Plus size={18} /> Register Patient
          </button>
          <button className="btn btn-primary" onClick={navigateToNewAppointment}>
            <Calendar size={18} style={{ marginRight: '6px' }} /> Book Appointment
          </button>
        </div>
      </div>

      <div className="stats-grid reception-stats-grid" style={{ marginBottom: '32px' }}>
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

      <div className="reception-quick-section" style={{ marginBottom: '32px' }}>
        <h3 className="reception-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>
          <Activity size={18} style={{ color: 'var(--color-primary)' }} />
          Quick Actions
        </h3>
        <div className="reception-quick-actions">
          <button className="reception-quick-action-card qa-book" onClick={navigateToNewAppointment}>
            <div className="qa-icon" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
              <CalendarDays size={22} />
            </div>
            <h4>Book Appointment</h4>
            <p>Schedule a patient visit quickly</p>
          </button>

          <button className="reception-quick-action-card qa-register" onClick={() => setShowAddPatientModal(true)}>
            <div className="qa-icon" style={{ background: 'var(--color-primary-100)', color: 'var(--color-primary-dark)' }}>
              <Users size={22} />
            </div>
            <h4>Register Patient</h4>
            <p>Add new patient to clinic registry</p>
          </button>

          <button className="reception-quick-action-card qa-invoice" onClick={navigateToInvoices}>
            <div className="qa-icon" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
              <FileText size={22} />
            </div>
            <h4>Fetch Invoice</h4>
            <p>Open billing and invoice records</p>
          </button>

          <button className="reception-quick-action-card qa-search" onClick={navigateToPatients}>
            <div className="qa-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
              <Search size={22} />
            </div>
            <h4>Search Patient</h4>
            <p>Find patient profile by MRN</p>
          </button>
        </div>
      </div>

      <div className="reception-live-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
        {/* Left side - Today's Appointments */}
        <div className="card reception-card reception-today-desk">
          <div className="card-header reception-card-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} style={{ color: 'var(--color-warning)' }} />
              Today's Appointments Desk
            </h3>
            <div className="header-search search-input reception-search" style={{ width: '200px', margin: 0 }}>
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
              <>
                <div className="data-table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayAppts.slice((todayApptPage - 1) * ITEMS_PER_PAGE, todayApptPage * ITEMS_PER_PAGE).map(appt => (
                        <tr key={appt.apptId}>
                          <td>
                            <div className="cell-main">{appt.patientName}</div>
                            <div className="cell-sub">MRN: {appt.patientMrn}</div>
                          </td>
                          <td>{appt.clinicianName}</td>
                          <td>{formatTime(appt.startAt)}</td>
                          <td>{getStatusBadge(appt.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {todayAppts.length > ITEMS_PER_PAGE && (
                  <div className="pagination-bar" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                    <button 
                      className="pagination-btn" 
                      onClick={() => setTodayApptPage(p => Math.max(1, p - 1))}
                      disabled={todayApptPage === 1}
                    >
                      ← Previous
                    </button>
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                      Page {todayApptPage} of {Math.ceil(todayAppts.length / ITEMS_PER_PAGE)}
                    </span>
                    <button 
                      className="pagination-btn" 
                      onClick={() => setTodayApptPage(p => Math.min(Math.ceil(todayAppts.length / ITEMS_PER_PAGE), p + 1))}
                      disabled={todayApptPage === Math.ceil(todayAppts.length / ITEMS_PER_PAGE)}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right side - Appointment Analysis */}
        <div className="card reception-card reception-analysis-desk" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header reception-card-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Activity size={18} style={{ color: 'var(--color-primary)' }} />
              Analysis (Last 7 Days)
            </h3>
          </div>
          <div className="card-body analysis-desk-body" style={{ padding: '12px 0', flex: 1 }}>
            <div className="analysis-chart-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analysisChartData} margin={{ top: 5, right: 15, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-text-secondary)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--color-text-secondary)" tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                />
                <Bar dataKey="value" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {showAddPatientModal && (
        <div className="patients-modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(6px)' }}>
          <div className="patients-modal" style={{ maxWidth: '650px', background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', boxShadow: '0 24px 80px rgba(15, 23, 42, 0.18)' }}>
            <div className="modal-header" style={{ padding: '24px 24px 8px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} style={{ color: 'var(--color-primary)' }} />
                Register New Clinic Patient
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAddPatientModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleReceptionistRegisterSubmit}>
              <div className="patients-modal-body" style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#334155', display: 'block', marginBottom: '6px' }}>Patient Full Name *</label>
                  <input
                    type="text"
                    placeholder="Enter patient full name"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', outline: 'none' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#334155', display: 'block', marginBottom: '6px' }}>Patient Email *</label>
                  <input
                    type="email"
                    placeholder="patient@email.com"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#334155', display: 'block', marginBottom: '6px' }}>Date of Birth *</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={e => setDob(e.target.value)}
                      required
                      max={todayStr}
                      style={{ width: '100%', padding: '10px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', outline: 'none' }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#334155', display: 'block', marginBottom: '6px' }}>Gender *</label>
                    <select
                      value={gender}
                      onChange={e => setGender(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', outline: 'none' }}
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#334155', display: 'block', marginBottom: '6px' }}>Phone Number *</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', outline: 'none' }}
                  />
                </div>

                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', margin: '24px 0 16px' }}>Address Details</h3>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#334155', display: 'block', marginBottom: '6px' }}>Street Address *</label>
                  <input
                    type="text"
                    placeholder="123 Health Ave"
                    value={street}
                    onChange={e => setStreet(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#334155', display: 'block', marginBottom: '6px' }}>City *</label>
                    <input
                      type="text"
                      placeholder="Chennai"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', outline: 'none' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#334155', display: 'block', marginBottom: '6px' }}>State *</label>
                    <input
                      type="text"
                      placeholder="TN"
                      value={stateCode}
                      onChange={e => setStateCode(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', outline: 'none' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#334155', display: 'block', marginBottom: '6px' }}>Zip *</label>
                    <input
                      type="text"
                      placeholder="600001"
                      value={zip}
                      onChange={e => setZip(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', outline: 'none' }}
                    />
                  </div>
                </div>

                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', margin: '24px 0 16px' }}>Emergency Contact</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#334155', display: 'block', marginBottom: '6px' }}>Contact Name *</label>
                    <input
                      type="text"
                      placeholder="Jane Doe (Spouse)"
                      value={emergencyName}
                      onChange={e => setEmergencyName(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', outline: 'none' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#334155', display: 'block', marginBottom: '6px' }}>Contact Phone *</label>
                    <input
                      type="tel"
                      placeholder="+91 98765 00000"
                      value={emergencyPhone}
                      onChange={e => setEmergencyPhone(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', outline: 'none' }}
                    />
                  </div>
                </div>

                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', margin: '24px 0 16px' }}>Insurance Details (Optional)</h3>

                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#334155', display: 'block', marginBottom: '6px' }}>Insurance Policy ID</label>
                  <input
                    type="text"
                    placeholder="INS-104928"
                    value={insuranceId}
                    onChange={e => setInsuranceId(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', outline: 'none' }}
                  />
                </div>
              </div>

              <div className="patients-modal-footer" style={{ padding: '16px 24px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px' }}>
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