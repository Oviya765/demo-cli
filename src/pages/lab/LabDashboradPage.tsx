import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAllOrders, collectSample, cancelLabOrder } from '../../services/labService';
import type { LabOrderResponseDto } from '../../models/types';
import { toast } from 'react-hot-toast';
import {
  FlaskConical,
  Plus,
  Search,
  Check,
  X,
  FileText,
  AlertOctagon,
  ClipboardList,
  Clock,
  ArrowRight,
  Activity
} from 'lucide-react';
import MrnLabel from '../../components/ui/MrnLabel';
import '../../assets/styles/lab/LabDashboardPage.css';

export default function LabDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<LabOrderResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'ORDERED' | 'COLLECTED' | 'RESULTS_REPORTED' | 'CRITICAL_REPORTED' | 'CANCELLED'>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    loadOrders();
  }, []);

  // Reset page number on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await getAllOrders();
      setOrders(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load lab orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCollectSample = async (id: number) => {
    setActionLoadingId(id);
    try {
      await collectSample(id);
      toast.success('Sample collection registered successfully!');
      loadOrders();
    } catch (err: any) {
      toast.error(err.message || 'Failed to collect sample');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelOrder = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this lab order?')) return;
    setActionLoadingId(id);
    try {
      await cancelLabOrder(id);
      toast.success('Lab order cancelled successfully!');
      loadOrders();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel lab order');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      'ORDERED': { cls: 'badge-warning', label: 'Ordered' },
      'COLLECTED': { cls: 'badge-info', label: 'Sample Collected' },
      'RESULTS_REPORTED': { cls: 'badge-success', label: 'Results Reported' },
      'CRITICAL_REPORTED': { cls: 'badge-danger badge-pulse', label: 'Critical Alert' },
      'CANCELLED': { cls: 'badge-neutral', label: 'Cancelled' },
    };
    const s = map[status] || { cls: 'badge-neutral', label: status };
    
    return (
      <span className={`badge ${s.cls}`}>
        {status === 'CRITICAL_REPORTED' && <AlertOctagon size={12} style={{ marginRight: 4, display: 'inline' }} />}
        <span className="badge-dot"></span>
        {s.label}
      </span>
    );
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

  const parseTests = (testsJson: string): string[] => {
    if (!testsJson) return [];
    try {
      const parsed = JSON.parse(testsJson);
      if (!parsed) return [];
      if (Array.isArray(parsed)) {
        return parsed.map(item => (typeof item === 'string' ? item : (item.name || item.testName || JSON.stringify(item))));
      }
      if (typeof parsed === 'string') {
        return parsed.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
      }
      if (typeof parsed === 'object') {
        if (Array.isArray((parsed as any).tests)) {
          return (parsed as any).tests.map((t: any) => (typeof t === 'string' ? t : (t.name || t.testName || JSON.stringify(t))));
        }
        return Object.values(parsed).map(v => (typeof v === 'string' ? v : JSON.stringify(v)));
      }
    } catch {
      // ignore
    }
    return String(testsJson).split(/[,;]+/).map(s => s.trim()).filter(Boolean);
  };

  // KPI calculations
  const totalCount = orders.length;
  const pendingCollection = orders.filter(o => o.status === 'ORDERED').length;
  const collected = orders.filter(o => o.status === 'COLLECTED').length;
  const critical = orders.filter(o => o.status === 'CRITICAL_REPORTED').length;

  // Filtering logic
  const filteredOrders = orders.filter(order => {
    const tests = parseTests(order.testsJson).join(', ').toLowerCase();
    const matchesSearch = 
      order.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.sampleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tests.includes(searchQuery.toLowerCase());
    
    if (activeTab === 'ALL') return matchesSearch;
    return order.status === activeTab && matchesSearch;
  });

  // Pagination calculation
  const totalItems = filteredOrders.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  // Strict role boundaries
  const isTechnician = user?.role === 'LAB_TECHNICIAN';
  const isClinician = user?.role === 'CLINICIAN';
  const isAdmin = user?.role === 'ADMIN';
  const isPatient = user?.role === 'PATIENT';

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="sidebar-brand-icon" style={{ padding: 10, background: 'var(--color-primary-light)', borderRadius: '12px', color: 'var(--color-primary)' }}>
            <FlaskConical size={28} />
          </div>
          <div>
            <h1>Diagnostics & Lab Hub</h1>
            <p>
              {isPatient 
                ? 'View your registered lab orders and published medical test results' 
                : 'Track laboratory orders, record sample collections, and publish diagnostic results'}
            </p>
          </div>
        </div>
        
        {isClinician && (
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/lab/new')}>
            <Plus size={18} /> New Lab Order
          </button>
        )}
      </div>

      {/* KPI Stats Panel (Hidden for patients since it is clinic-wide metrics) */}
      {!isPatient && (
        <div className="dashboard-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: 'rgba(6, 182, 212, 0.08)', color: 'var(--color-primary)' }}>
              <ClipboardList size={22} />
            </div>
            <div className="kpi-data">
              <div className="kpi-value">{totalCount}</div>
              <div className="kpi-label">Total Lab Orders</div>
            </div>
          </div>
          
          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: 'rgba(234, 179, 8, 0.08)', color: 'var(--color-warning)' }}>
              <Clock size={22} />
            </div>
            <div className="kpi-data">
              <div className="kpi-value">{pendingCollection}</div>
              <div className="kpi-label">Pending Collection</div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.08)', color: 'var(--color-info)' }}>
              <Activity size={22} />
            </div>
            <div className="kpi-data">
              <div className="kpi-value">{collected}</div>
              <div className="kpi-label">Sample Processing</div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: 'rgba(239, 68, 68, 0.08)', color: 'var(--color-danger)' }}>
              <AlertOctagon size={22} />
            </div>
            <div className="kpi-data">
              <div className="kpi-value" style={{ color: critical > 0 ? '#ef4444' : 'inherit' }}>{critical}</div>
              <div className="kpi-label">Critical Alerts</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Section */}
      <div className="card" style={{ marginBottom: '32px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '20px', marginBottom: '20px' }}>
          
          {/* Tab Filters */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Orders' },
              { id: 'ORDERED', label: 'Ordered' },
              { id: 'COLLECTED', label: 'In Progress' },
              { id: 'RESULTS_REPORTED', label: 'Reported' },
              { id: 'CRITICAL_REPORTED', label: 'Critical' },
              { id: 'CANCELLED', label: 'Cancelled' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: activeTab === tab.id ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                  background: activeTab === tab.id ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="header-search search-input" style={{ width: '280px', margin: 0 }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search patient, sample, test..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Lab Orders List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <div className="spinner"></div>
          </div>
        ) : totalItems === 0 ? (
          <div className="empty-state" style={{ padding: '60px 0' }}>
            <div className="empty-state-icon"><FlaskConical size={32} /></div>
            <h3>No Lab Orders Found</h3>
            <p>There are no diagnostic orders matching the filters.</p>
          </div>
        ) : (
          <div>
            <div className="data-table-wrapper" style={{ border: 'none', boxShadow: 'none', background: 'transparent' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order Details</th>
                    <th>Patient</th>
                    <th>Tests</th>
                    <th>Dates</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map(order => {
                    const testsList = parseTests(order.testsJson);
                    return (
                      <tr key={order.labOrderId} className={order.status === 'CRITICAL_REPORTED' ? 'row-critical-highlight' : ''}>
                        <td className="cell-main" onClick={() => navigate(`/lab/${order.labOrderId}`)} style={{ cursor: 'pointer' }}>
                          <div>Order #{order.labOrderId}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            ID: <code style={{ color: 'var(--color-primary-light)' }}>{order.sampleId}</code>
                          </div>
                        </td>
                        <td onClick={() => navigate(`/lab/${order.labOrderId}`)} style={{ cursor: 'pointer' }}>
                          <div style={{ fontWeight: 600 }}>{order.patientName}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                          MRN: <MrnLabel patientId={order.patientId} />
                        </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {testsList.map((test, index) => (
                              <span key={index} className="badge badge-info" style={{ fontSize: '0.7rem', textTransform: 'none', padding: '2px 6px' }}>
                                {test}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.85rem' }}>Ordered: {formatDate(order.collectedAt || new Date().toISOString())}</div>
                          {order.collectedAt && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                              Time: {formatTime(order.collectedAt)}
                            </div>
                          )}
                        </td>
                        <td>{getStatusBadge(order.status)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            
                            {/* Technician Sample Collection */}
                            {isTechnician && order.status === 'ORDERED' && (
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ padding: '6px 12px', fontSize: '0.75rem', height: 'auto' }}
                                onClick={() => handleCollectSample(order.labOrderId)}
                                disabled={actionLoadingId === order.labOrderId}
                              >
                                <Check size={14} style={{ marginRight: 4 }} /> Collect Sample
                              </button>
                            )}

                            {/* Technician Result Entry */}
                            {isTechnician && (order.status === 'COLLECTED' || order.status === 'RESULTS_REPORTED' || order.status === 'CRITICAL_REPORTED') && (
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ padding: '6px 12px', fontSize: '0.75rem', height: 'auto', background: 'linear-gradient(135deg, #0284c7, #0369a1)', borderColor: '#0284c7' }}
                                onClick={() => navigate(`/lab/${order.labOrderId}`)}
                              >
                                <FileText size={14} style={{ marginRight: 4 }} /> Add/Edit Results
                              </button>
                            )}

                            {/* Detail View */}
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.75rem', height: 'auto' }}
                              onClick={() => navigate(`/lab/${order.labOrderId}`)}
                            >
                              Details <ArrowRight size={12} style={{ marginLeft: '4px' }} />
                            </button>

                            {/* Cancel Order (Admin only) */}
                            {isAdmin && order.status === 'ORDERED' && (
                              <button
                                type="button"
                                className="btn btn-danger btn-icon"
                                style={{ padding: '6px 8px', height: 'auto', width: 'auto' }}
                                onClick={() => handleCancelOrder(order.labOrderId)}
                                disabled={actionLoadingId === order.labOrderId}
                                title="Cancel Order"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination-bar">
                <span className="pagination-info">
                  Showing <strong>{startIndex + 1}</strong> to <strong>{Math.min(startIndex + itemsPerPage, totalItems)}</strong> of <strong>{totalItems}</strong> entries
                </span>
                <div className="pagination-buttons">
                  <button
                    type="button"
                    className="btn btn-secondary pagination-btn"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      type="button"
                      className={`btn ${currentPage === page ? 'btn-primary' : 'btn-secondary'} pagination-btn`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn btn-secondary pagination-btn"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}