import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getOrderById, createLabResult, deleteLabResult } from '../../services/labService';
import type { LabOrderResponseDto, LabResultFlag } from '../../models/types';
import {
  ArrowLeft,
  FlaskConical,
  Plus,
  Trash2,
  AlertOctagon,
  Calendar,
  AlertTriangle,
  Beaker,
  CheckCircle,
  Clock
} from 'lucide-react';
import MrnLabel from '../../components/ui/MrnLabel';
import { toast } from 'react-hot-toast';
import '../../assets/styles/lab/LabOrderDetailPage.css';

export default function LabOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [order, setOrder] = useState<LabOrderResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Result Form States
  const [testCode, setTestCode] = useState('');
  const [value, setValue] = useState('');
  const [units, setUnits] = useState('');
  const [refMin, setRefMin] = useState('');
  const [refMax, setRefMax] = useState('');
  const [flag, setFlag] = useState<LabResultFlag>('NORMAL');

  useEffect(() => {
    loadOrderDetails();
  }, [id]);

  const loadOrderDetails = async () => {
    setLoading(true);
    try {
      const data = await getOrderById(Number(id));
      
      // Access Control: reported details can only be viewed by Clinicians.
      // Technicians can access during COLLECTED phase to publish results.
      const isReported = data.status === 'RESULTS_REPORTED' || data.status === 'CRITICAL_REPORTED';
      const isTechnician = user?.role === 'LAB_TECHNICIAN';
      const isClinician = user?.role === 'CLINICIAN';
      
      if (isReported) {
        if (!isClinician) {
          toast.error('Access restricted. Only clinicians can view reported lab results.');
          navigate('/lab');
          return;
        }
      } else {
        if (data.status === 'COLLECTED' && isTechnician) {
          // OK: Technician is updating results
        } else {
          toast.error('Details are only available once results are reported.');
          navigate('/lab');
          return;
        }
      }

      setOrder(data);
      
      // Auto-set the first test code from ordered list in form
      const tests = parseTests(data.testsJson);
      if (tests.length > 0) {
        setTestCode(tests[0]);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    if (!testCode.trim() || !value.trim()) {
      toast.error('Test code and value are required.');
      return;
    }

    setActionLoading(true);

    try {
      // Build reference range JSON
      let referenceRangeJson = '';
      if (refMin.trim() || refMax.trim()) {
        referenceRangeJson = JSON.stringify({
          min: refMin.trim() || '—',
          max: refMax.trim() || '—'
        });
      }

      await createLabResult({
        labOrderId: order.labOrderId,
        testCode: testCode.trim(),
        value: value.trim(),
        units: units.trim() || undefined,
        referenceRangeJson: referenceRangeJson || undefined,
        flag,
        reportedAt: undefined // Server controls time
      });

      toast.success('Lab result reported successfully!');
      
      // Reset result inputs
      setValue('');
      setUnits('');
      setRefMin('');
      setRefMax('');
      setFlag('NORMAL');
      
      // Refresh details
      loadOrderDetails();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save lab result');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteResult = async (resultId: number) => {
    if (!window.confirm('Are you sure you want to delete this result?')) return;
    setActionLoading(true);
    try {
      await deleteLabResult(resultId);
      toast.success('Lab result deleted.');
      loadOrderDetails();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete result');
    } finally {
      setActionLoading(false);
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

  const getResultFlagBadge = (itemFlag: LabResultFlag) => {
    switch (itemFlag) {
      case 'CRITICAL':
        return <span className="badge badge-danger badge-pulse" style={{ fontSize: '0.7rem' }}><AlertOctagon size={10} style={{ marginRight: 2, display: 'inline' }} /> Critical</span>;
      case 'HIGH':
        return <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}><AlertTriangle size={10} style={{ marginRight: 2, display: 'inline' }} /> High</span>;
      case 'LOW':
        return <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}><AlertTriangle size={10} style={{ marginRight: 2, display: 'inline' }} /> Low</span>;
      default:
        return <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Normal</span>;
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      // fallthrough to splitting
    }

    return String(testsJson).split(/[,;]+/).map(s => s.trim()).filter(Boolean);
  };

  const parseRefRange = (refJson: string) => {
    if (!refJson) return '—';
    try {
      const parsed = JSON.parse(refJson);
      if (parsed.min && parsed.max) {
        return `${parsed.min} - ${parsed.max}`;
      }
      return refJson;
    } catch {
      return refJson;
    }
  };

  if (loading) {
    return <div className="page-spinner"><div className="spinner"></div></div>;
  }

  if (!order) {
    return (
      <div className="empty-state">
        <h3>Lab Order Not Found</h3>
        <button className="btn btn-primary" onClick={() => navigate('/lab')}>Back to Dashboard</button>
      </div>
    );
  }

  const testsList = parseTests(order.testsJson);
  const isTechnician = user?.role === 'LAB_TECHNICIAN';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => navigate('/lab')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1>Lab Order #{order.labOrderId}</h1>
              {getStatusBadge(order.status)}
            </div>
            <p>Patient: <strong>{order.patientName}</strong> (MRN: <MrnLabel patientId={order.patientId} />)</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: isTechnician && order.status !== 'CANCELLED' ? '3fr 2fr' : '1fr', gap: '32px' }}>
        
        {/* Left Column: Details & Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Order General Information */}
          <div className="card" style={{ padding: '24px' }}>
            <div className="card-header" style={{ marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FlaskConical size={18} style={{ color: 'var(--color-primary)' }} />
                Order Specifications
              </h3>
            </div>
            <div className="card-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Sample barcode ID</label>
                  <p><code style={{ color: 'var(--color-primary-light)', fontSize: '0.95rem' }}>{order.sampleId}</code></p>
                </div>
                <div className="detail-item">
                  <label>Encounter association</label>
                  <p>Visit #{order.encounterId || '—'}</p>
                </div>
                <div className="detail-item">
                  <label>Prescribed by</label>
                  <p>{order.orderedByName || '—'}</p>
                </div>
                <div className="detail-item">
                  <label>Requested tests</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                    {testsList.map((t, idx) => (
                      <span key={idx} className="badge badge-info" style={{ fontSize: '0.7rem', padding: '2px 6px', textTransform: 'none' }}>{t}</span>
                    ))}
                  </div>
                </div>
                <div className="detail-item">
                  <label>Sample collection date</label>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} /> {order.collectedAt ? formatDateTime(order.collectedAt) : 'Not collected yet'}
                  </p>
                </div>
                <div className="detail-item">
                  <label>Report status</label>
                  <p>{order.status.replace(/_/g, ' ').toLowerCase()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Diagnostic Lab Results Table */}
          <div className="card" style={{ padding: '24px' }}>
            <div className="card-header" style={{ marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Beaker size={18} style={{ color: 'var(--color-info)' }} />
                Diagnostic Metrics & Measurements
              </h3>
            </div>
            <div className="card-body">
              {!order.results || order.results.length === 0 ? (
                <div className="empty-state" style={{ padding: '32px 0' }}>
                  <div className="empty-state-icon"><Clock size={20} /></div>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>No results have been reported yet for this order.</p>
                </div>
              ) : (
                <div className="data-table-wrapper" style={{ border: 'none', boxShadow: 'none', background: 'transparent' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Test Code</th>
                        <th>Measured Value</th>
                        <th>Units</th>
                        <th>Reference Range</th>
                        <th>Evaluation</th>
                        {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {order.results.map((res) => (
                        <tr key={res.resultId} className={res.flag === 'CRITICAL' ? 'row-critical-highlight' : ''}>
                          <td className="cell-main">{res.testCode}</td>
                          <td style={{ fontWeight: 700, fontSize: '0.95rem' }}>{res.value}</td>
                          <td>{res.units || '—'}</td>
                          <td>{parseRefRange((res as any).referenceRangeJson)}</td>
                          <td>{getResultFlagBadge(res.flag)}</td>
                          {isAdmin && (
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ padding: '4px', height: 'auto', minWidth: 'auto', color: 'var(--color-danger)' }}
                                onClick={() => handleDeleteResult(res.resultId)}
                                disabled={actionLoading}
                                title="Delete Result"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Lab Technician Panel (Create Result) */}
        {isTechnician && order.status !== 'CANCELLED' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            <div className="card" style={{ padding: '24px' }}>
              <div className="card-header" style={{ marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={18} style={{ color: 'var(--color-primary)' }} />
                  Report Test Metric
                </h3>
              </div>
              <div className="card-body">
                {order.status === 'ORDERED' ? (
                  <div style={{ padding: '16px', background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.15)', borderRadius: '8px', color: '#fef08a', fontSize: '0.85rem', lineHeight: 1.5 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <AlertTriangle size={18} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <strong>Sample Required:</strong> You must register sample collection on the dashboard before recording test measurements.
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleAddResult}>
                    {/* Select test code from order list */}
                    <div className="form-group">
                      <label className="form-label">Select Test Code <span className="required">*</span></label>
                      <select
                        className="form-select"
                        value={testCode}
                        onChange={e => setTestCode(e.target.value)}
                        required
                      >
                        {testsList.map(code => (
                          <option key={code} value={code}>{code}</option>
                        ))}
                      </select>
                    </div>

                    {/* Measured Value */}
                    <div className="form-group">
                      <label className="form-label">Measured Value <span className="required">*</span></label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder="e.g. 13.4, Positive, 98..."
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        required
                      />
                    </div>

                    {/* Units */}
                    <div className="form-group">
                      <label className="form-label">Measurement Units</label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder="e.g. g/dL, mg/dL, %"
                        value={units}
                        onChange={e => setUnits(e.target.value)}
                      />
                    </div>

                    {/* Reference Range */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div className="form-group">
                        <label className="form-label">Ref Min</label>
                        <input
                          className="form-input"
                          type="text"
                          placeholder="e.g. 12.0"
                          value={refMin}
                          onChange={e => setRefMin(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Ref Max</label>
                        <input
                          className="form-input"
                          type="text"
                          placeholder="e.g. 16.0"
                          value={refMax}
                          onChange={e => setRefMax(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Alert Flag */}
                    <div className="form-group" style={{ marginBottom: '24px' }}>
                      <label className="form-label">Alert Evaluation Flag</label>
                      <select
                        className="form-select"
                        value={flag}
                        onChange={e => setFlag(e.target.value as LabResultFlag)}
                        required
                      >
                        <option value="NORMAL">Normal</option>
                        <option value="HIGH">High</option>
                        <option value="LOW">Low</option>
                        <option value="CRITICAL">Critical Alert</option>
                      </select>
                    </div>

                    {/* Submit Button */}
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={actionLoading}>
                      <CheckCircle size={16} /> {actionLoading ? 'Saving...' : 'Publish Test Result'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}