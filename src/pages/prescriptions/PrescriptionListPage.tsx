import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllPrescriptions, getPrescriptionsByPatientId } from '../../services/prescriptionService';
import { getMyProfile } from '../../services/patientService';
import type { PrescriptionResponseDto } from '../../models/types';
import { Search, Pill, Eye } from 'lucide-react';
import { fetchMrnByPatientId } from '../../services/patientService';
import { useAuth } from '../../contexts/AuthContext';
import { Pagination } from '../../components/ui/components';
import '../../assets/styles/prescriptions/prescription.css';

export default function PrescriptionListPage() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<PrescriptionResponseDto[]>([]);
  const [mrnMap, setMrnMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showMineOnly, setShowMineOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const navigate = useNavigate();

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    try {
      let data: PrescriptionResponseDto[];
      if (user?.role === 'PATIENT') {
        const profile = await getMyProfile();
        data = profile ? await getPrescriptionsByPatientId(profile.patientId) : [];
      } else {
        data = await getAllPrescriptions();
      }
      setPrescriptions(data);
      loadMrns(data);
    } catch (err) {
      console.error('Failed to load prescriptions', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMrns = async (data: PrescriptionResponseDto[]) => {
    const uniqueIds = Array.from(new Set(data.map(rx => rx.patientId)));
    const entries = await Promise.all(
      uniqueIds.map(async (pid) => [pid, await fetchMrnByPatientId(pid)] as const)
    );
    setMrnMap(Object.fromEntries(entries));
  };

  const filtered = prescriptions.filter(rx => {
    const matchSearch =
      rx.patientName.toLowerCase().includes(search.toLowerCase()) ||
      rx.medicationName.toLowerCase().includes(search.toLowerCase()) ||
      rx.clinicianName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || rx.status === statusFilter;
    const matchMine = !showMineOnly || rx.clinicianId === user?.userId;
    return matchSearch && matchStatus && matchMine;
  });

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, showMineOnly]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
            className={`filter-chip ${statusFilter === status && !showMineOnly ? 'active' : ''}`}
            onClick={() => { setStatusFilter(status); setShowMineOnly(false); }}
          >
            {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
          </button>
        ))}
        {user?.role === 'CLINICIAN' && (
          <button
            className={`filter-chip ${showMineOnly ? 'active' : ''}`}
            onClick={() => { setShowMineOnly(true); setStatusFilter('ALL'); }}
            style={{ marginLeft: '8px' }}
          >
            My Prescriptions
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Pill size={28} /></div>
          <h3>No prescriptions found</h3>
          <p>Try adjusting your search.</p>
        </div>
      ) : (
        <>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Medication</th>
                <th>Prescriber</th>
                <th>Issued</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map(rx => (
                <tr key={rx.rxId} className="clickable-row" onClick={() => navigate(`/prescriptions/${rx.rxId}`)}>
                  <td>
                    <div className="cell-main">{rx.patientName}</div>
                    <div className="cell-sub">MRN: {mrnMap[rx.patientId] ?? '…'}</div>
                  </td>
                  <td>
                    <div className="cell-main">{rx.medicationName}</div>
                  </td>
                  <td>{rx.clinicianName}</td>
                  <td>{formatDate(rx.issuedAt)}</td>
                  <td>{getStatusBadge(rx.status)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="btn btn-ghost btn-icon"
                      style={{ padding: '4px', minWidth: 'auto', height: 'auto', color: 'var(--color-primary)' }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/prescriptions/${rx.rxId}`); }}
                      title="View details"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
        />
        </>
      )}
    </div>
  );
}
