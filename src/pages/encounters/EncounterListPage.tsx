import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllEncounters } from '../../services/encounterService';
import type { EncounterResponseDto } from '../../models/types';
import { Plus, Search, Stethoscope } from 'lucide-react';
import { getPatientMrnSync } from '../../services/patientService';
import { useAuth } from '../../contexts/AuthContext';
import '../../assets/styles/encounters/encounter.css';

export default function EncounterListPage() {
  const { user } = useAuth();
  const [encounters, setEncounters] = useState<EncounterResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const navigate = useNavigate();

  useEffect(() => {
    loadEncounters();
  }, []);

  const loadEncounters = async () => {
    try {
      const data = await getAllEncounters();
      setEncounters(data);
    } catch (err) {
      console.error('Failed to load encounters', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = encounters.filter(enc => {
    const matchSearch =
      enc.patientName.toLowerCase().includes(search.toLowerCase()) ||
      enc.chiefComplaint.toLowerCase().includes(search.toLowerCase()) ||
      enc.clinicianName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || enc.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      'IN_PROGRESS': { cls: 'badge-warning', label: 'In Progress' },
      'COMPLETED': { cls: 'badge-success', label: 'Completed' },
      'CANCELLED': { cls: 'badge-danger', label: 'Cancelled' },
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

  if (loading) {
    return <div className="page-spinner"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Encounters</h1>
          <p>Manage clinical encounters and patient visits</p>
        </div>
        {user?.role === 'CLINICIAN' && (
          <div className="page-header-actions">
            <button className="btn btn-primary" onClick={() => navigate('/encounters/new')}>
              <Plus size={18} />
              New Encounter
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="header-search search-input">
          <Search className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Search patient, complaint..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {['ALL', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(status => (
          <button
            key={status}
            className={`filter-chip ${statusFilter === status ? 'active' : ''}`}
            onClick={() => setStatusFilter(status)}
          >
            {status === 'ALL' ? 'All' : status.replace('_', ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Stethoscope size={28} /></div>
          <h3>No encounters found</h3>
          <p>Try adjusting your search or create a new encounter.</p>
          {user?.role === 'CLINICIAN' && (
            <button className="btn btn-primary" onClick={() => navigate('/encounters/new')}>
              <Plus size={16} /> New Encounter
            </button>
          )}
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Visit Type</th>
                <th>Chief Complaint</th>
                <th>Clinician</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(enc => (
                <tr
                  key={enc.encounterId}
                  className="clickable-row"
                  onClick={() => navigate(`/encounters/${enc.encounterId}`)}
                >
                  <td>
                    <div className="cell-main">{enc.patientName}</div>
                    <div className="cell-sub">MRN: {getPatientMrnSync(enc.patientId)}</div>
                  </td>
                  <td>
                    <span className="badge badge-primary">{enc.visitType}</span>
                  </td>
                  <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {enc.chiefComplaint}
                  </td>
                  <td>{enc.clinicianName}</td>
                  <td>{formatDate(enc.startAt)}</td>
                  <td>{formatTime(enc.startAt)}</td>
                  <td>{getStatusBadge(enc.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
