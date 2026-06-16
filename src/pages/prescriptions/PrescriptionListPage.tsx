import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllPrescriptions } from '../../services/prescriptionService';
import type { PrescriptionResponseDto } from '../../models/types';
import { Search, Pill } from 'lucide-react';
import { getPatientMrnSync } from '../../services/patientService';
import '../../assets/styles/prescriptions/prescription.css';

export default function PrescriptionListPage() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const navigate = useNavigate();

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    try {
      const data = await getAllPrescriptions();
      setPrescriptions(data);
    } catch (err) {
      console.error('Failed to load prescriptions', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = prescriptions.filter(rx => {
    const matchSearch =
      rx.patientName.toLowerCase().includes(search.toLowerCase()) ||
      rx.medicationName.toLowerCase().includes(search.toLowerCase()) ||
      rx.clinicianName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || rx.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      'DRAFT': { cls: 'badge-neutral', label: 'Draft' },
      'ISSUED': { cls: 'badge-success', label: 'Issued' },
      'DISPENSED': { cls: 'badge-info', label: 'Dispensed' },
      'CANCELLED': { cls: 'badge-danger', label: 'Cancelled' },
    };
    const s = map[status] || { cls: 'badge-neutral', label: status };
    return <span className={`badge ${s.cls}`}><span className="badge-dot"></span>{s.label}</span>;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return <div className="page-spinner"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Prescriptions</h1>
          <p>View and manage all prescriptions</p>
        </div>

      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="header-search search-input">
          <Search className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Search patient, medication..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {['ALL', 'DRAFT', 'ISSUED', 'DISPENSED', 'CANCELLED'].map(status => (
          <button
            key={status}
            className={`filter-chip ${statusFilter === status ? 'active' : ''}`}
            onClick={() => setStatusFilter(status)}
          >
            {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Pill size={28} /></div>
          <h3>No prescriptions found</h3>
          <p>Try adjusting your search.</p>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Medication</th>
                <th>Dosage</th>
                <th>Frequency</th>
                <th>Duration</th>
                <th>Route</th>
                <th>Prescriber</th>
                <th>Issued</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(rx => (
                <tr key={rx.rxId} className="clickable-row" onClick={() => navigate(`/prescriptions/${rx.rxId}`)}>
                  <td>
                    <div className="cell-main">{rx.patientName}</div>
                    <div className="cell-sub">MRN: {getPatientMrnSync(rx.patientId)}</div>
                  </td>
                  <td>
                    <div className="cell-main">{rx.medicationName}</div>
                  </td>
                  <td>{rx.dosage}</td>
                  <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {rx.frequency}
                  </td>
                  <td>{rx.durationDays} days</td>
                  <td>
                    <span className="badge badge-neutral">{rx.route}</span>
                  </td>
                  <td>{rx.clinicianName}</td>
                  <td>{formatDate(rx.issuedAt)}</td>
                  <td>{getStatusBadge(rx.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
