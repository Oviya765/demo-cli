import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAllPatients, registerPatient } from '../../services/patientService';
import { getAllAppointments } from '../../services/appointmentService';
import type { PatientResponseDto } from '../../models/types';
import { Users, Search, Plus, X, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { parseApiError } from '../../utils/validation';

export default function PatientListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientResponseDto | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
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

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const data = await getAllPatients();
      // Clinicians should only see their own patients (those who have an
      // appointment booked with the logged-in clinician).
      if (user?.role === 'CLINICIAN') {
        try {
          const appts = await getAllAppointments();
          const myPatientIds = new Set(
            appts
              .filter(a => a.clinicianId === user.userId)
              .map(a => a.patientId)
          );
          setPatients(data.filter(p => myPatientIds.has(p.patientId)));
        } catch (apptErr) {
          console.error('Failed to resolve clinician patients', apptErr);
          setPatients([]);
        }
      } else {
        setPatients(data);
      }
    } catch (err: any) {
      console.error('Failed to load patients list', err);
      toast.error('Failed to retrieve patient registry records');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (patient: PatientResponseDto) => {
    if (user?.role === 'CLINICIAN') {
      navigate(`/patients/${patient.patientId}`);
      return;
    }
    setSelectedPatient(patient);
    setShowDetailsModal(true);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    // Basic client-side validation
    if (!dob) {
      toast.error('Date of birth is required');
      setActionLoading(false);
      return;
    }
    if (new Date(dob) >= new Date()) {
      toast.error('Date of birth must be in the past');
      setActionLoading(false);
      return;
    }

    const normalizedPhone = phone.trim().replace(/\s+/g, ' ');
    const normalizedEmergency = emergencyPhone.trim().replace(/\s+/g, ' ');
    const phonePattern = /^[0-9+()\-\s]{7,20}$/;
    if (!phonePattern.test(normalizedPhone)) {
      toast.error('Invalid phone number');
      setActionLoading(false);
      return;
    }
    if (!phonePattern.test(normalizedEmergency)) {
      toast.error('Invalid emergency phone');
      setActionLoading(false);
      return;
    }

    try {
      const contactInfoJson = JSON.stringify({
        email: regEmail.trim(),
        phone: normalizedPhone
      });

      const addressJson = JSON.stringify({
        line1: street.trim(),
        city: city.trim(),
        state: stateCode.trim(),
        zip: zip.trim()
      });

      const primaryContact = normalizedEmergency; // emergency contact phone

      await registerPatient({
        name: regName.trim(),
        dob,
        gender: gender.toUpperCase(),
        contactInfoJson,
        addressJson,
        primaryContact,
        insuranceId: insuranceId.trim() || undefined,
        status: 'ACTIVE'
      });

      toast.success('Patient registered successfully!');
      setShowAddModal(false);

      // Reset Form
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

      loadPatients();
    } catch (err: any) {
      console.error('Register patient failed', err);
      const msg = parseApiError(err, 'Failed to register patient');
      msg.split('\n').forEach(line => toast.error(line));
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = patients.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.mrn.toLowerCase().includes(search.toLowerCase())
  );

  const isReception = user?.role === 'RECEPTION';

  useEffect(() => {
    setCurrentPage(1);
  }, [search, user?.role]);

  const shouldPaginate = true;
  const itemsPerPage = ITEMS_PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * itemsPerPage;
  const pageEnd = pageStart + itemsPerPage;
  const paginatedPatients = filtered.slice(pageStart, pageEnd);

  const parseContact = (contactJson: string) => {
    try {
      return JSON.parse(contactJson);
    } catch {
      return { email: '', phone: contactJson || '' };
    }
  };

  const parseAddress = (json: string) => {
    try {
      return JSON.parse(json);
    } catch {
      return { line1: json || '', city: '', state: '', zip: '' };
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) return <div className="page-spinner"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Patient Registry</h1>
          <p>Search, review, and register clinic patient records</p>
        </div>
        <div className="page-header-actions">
          {isReception && (
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={18} />
              Register Patient
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="header-search search-input" style={{ flex: 1, maxWidth: '400px' }}>
          <Search className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Search patients by name or MRN..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Users size={28} /></div>
          <h3>No patients found</h3>
          <p>Try adjusting your search criteria or add a new patient record.</p>
          {isReception && (
            <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Register Patient
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="data-table-wrapper patients-registry-table-wrapper">
            <table className="data-table patients-uniform-table patients-realtime-table" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '25%', textAlign: 'center' }}>MRN</th>
                  <th style={{ width: '25%', textAlign: 'center' }}>Name</th>
                  <th style={{ width: '25%', textAlign: 'center' }}>Email</th>
                  <th style={{ width: '25%', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPatients.map(p => {
                  const contact = parseContact(p.contactInfoJson);
                  return (
                    <tr key={p.patientId}>
                      <td style={{ textAlign: 'center' }}>
                        <span className="patients-mrn-text">{p.mrn}</span>
                      </td>
                      <td className="cell-main" style={{ textAlign: 'center' }}>{p.name}</td>
                      <td style={{ textAlign: 'center' }}>{contact.email || '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-sm patients-view-details-btn"
                          onClick={() => handleViewDetails(p)}
                        >
                          <Eye size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {shouldPaginate && totalPages > 1 && (
            <div className="pagination-bar">
              <span className="pagination-info">
                Showing <strong>{filtered.length === 0 ? 0 : pageStart + 1}</strong> to <strong>{Math.min(pageEnd, filtered.length)}</strong> of <strong>{filtered.length}</strong> entries
              </span>
              <div className="pagination-buttons">
                <button
                  type="button"
                  className="btn btn-secondary pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={safePage === 1}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    type="button"
                    className={`btn ${safePage === page ? 'btn-primary' : 'btn-secondary'} pagination-btn`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn btn-secondary pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={safePage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Add Patient Registry Modal ── */}
      {showAddModal && (
        <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(6px)' }}>
          <div className="modal" style={{ maxWidth: '650px', background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', boxShadow: '0 24px 80px rgba(15, 23, 42, 0.18)' }}>
            <div className="modal-header" style={{ padding: '24px 24px 8px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} style={{ color: 'var(--color-primary)' }} />
                Register New Clinic Patient
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            
            <form onSubmit={handleRegisterSubmit}>
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

              <div className="modal-footer" style={{ padding: '16px 24px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>Cancel</button>
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

      {/* ── View Patient Details Modal (non-clinician roles) ── */}
      {showDetailsModal && selectedPatient && (
        <div className="patients-modal-overlay">
          <div className="patients-modal patients-details-modal">
            <div className="patients-details-modal-header">
              <h2 className="patients-details-modal-title">
                <Users size={20} style={{ color: 'var(--color-primary)' }} />
                Patient Details
              </h2>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedPatient(null);
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="patients-modal-body patients-details-modal-body">
              <div className="patients-details-modal-patient-head">
                <h3 className="patients-details-modal-name">{selectedPatient.name}</h3>
                <span className="badge badge-neutral patients-details-modal-mrn">{selectedPatient.mrn}</span>
              </div>

              <div className="patients-details-grid">
                {(() => {
                  const contact = parseContact(selectedPatient.contactInfoJson);
                  const address = parseAddress(selectedPatient.addressJson);
                  return [
                    { label: 'Date of Birth', value: formatDate(selectedPatient.dob) },
                    { label: 'Gender', value: selectedPatient.gender ? selectedPatient.gender.charAt(0) + selectedPatient.gender.slice(1).toLowerCase() : '—' },
                    { label: 'Phone', value: contact.phone || '—' },
                    { label: 'Email', value: contact.email || '—' },
                    { label: 'Address', value: address.line1 ? `${address.line1}, ${address.city}, ${address.state} ${address.zip}` : '—' },
                    { label: 'Emergency Contact', value: selectedPatient.primaryContact || '—' },
                    { label: 'Insurance ID', value: selectedPatient.insuranceId || '—' },
                  ].map(row => (
                    <div key={row.label} className="patients-detail-item">
                      <div className="patients-detail-label">{row.label}</div>
                      <div className="patients-detail-value">{row.value}</div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="patients-modal-footer patients-details-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedPatient(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
