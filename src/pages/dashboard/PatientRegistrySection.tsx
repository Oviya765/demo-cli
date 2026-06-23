import { Search, Users, X } from 'lucide-react';
import type { FormEvent } from 'react';
import type { PatientResponseDto } from '../../models/types';

interface PatientRegistrySectionProps {
  filteredPatients: PatientResponseDto[];
  patientSearch: string;
  setPatientSearch: (value: string) => void;
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
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const parseContact = (contactJson: string) => {
  try {
    return JSON.parse(contactJson);
  } catch {
    return { email: '', phone: contactJson };
  }
};

export default function PatientRegistrySection({
  filteredPatients,
  patientSearch,
  setPatientSearch,
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
  onSubmit,
}: PatientRegistrySectionProps) {
  return (
    <>
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

      {showAddPatientModal && (
        <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(6px)' }}>
          <div className="modal" style={{ maxWidth: '650px', background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', boxShadow: '0 24px 80px rgba(15, 23, 42, 0.18)' }}>
            <div className="modal-header" style={{ padding: '24px 24px 8px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} style={{ color: 'var(--color-primary)' }} />
                Register New Clinic Patient
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAddPatientModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={onSubmit}>
              <div className="modal-body" style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
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

              <div className="modal-footer" style={{ padding: '16px 24px 24px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #06b6d4, #0891b2)', border: 'none', borderRadius: '8px', color: '#ffffff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {actionLoading ? 'Registering...' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}