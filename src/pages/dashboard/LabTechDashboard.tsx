import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllOrders, getAllResults } from '../../services/labService';
import type { LabOrderResponseDto, LabResultResponseDto } from '../../models/types';
import { toast } from 'react-hot-toast';
import {
  FlaskConical,
  TestTube2,
  FileCheck,
  Clock,
  ClipboardList,
  Eye,
} from 'lucide-react';

export default function LabTechDashboard() {
  const navigate = useNavigate();

  const [labOrders, setLabOrders] = useState<LabOrderResponseDto[]>([]);
  const [labResults, setLabResults] = useState<LabResultResponseDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [orders, results] = await Promise.all([
        getAllOrders(),
        getAllResults(),
      ]);
      setLabOrders(orders);
      setLabResults(results);
    } catch (err: any) {
      console.error('Lab tech dashboard load error', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="page-spinner"><div className="spinner"></div></div>;
  }

  const pendingOrders = labOrders.filter(o => o.status === 'ORDERED');
  const samplesCollected = labOrders.filter(o => o.status === 'COLLECTED');
  const completedReports = labResults.length;

  const stats = [
    { label: 'Pending Lab Orders', value: pendingOrders.length.toString(), icon: <Clock size={22} />, color: 'warning' },
    { label: 'Samples Collected', value: samplesCollected.length.toString(), icon: <TestTube2 size={22} />, color: 'info' },
    { label: 'Completed Reports', value: completedReports.toString(), icon: <FileCheck size={22} />, color: 'success' },
  ];

  const getLabStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      'ORDERED': { cls: 'badge-warning', label: 'Ordered' },
      'COLLECTED': { cls: 'badge-info', label: 'Collected' },
      'RESULTS_REPORTED': { cls: 'badge-success', label: 'Reported' },
      'CRITICAL_REPORTED': { cls: 'badge-danger', label: 'Critical' },
      'CANCELLED': { cls: 'badge-neutral', label: 'Cancelled' },
    };
    const s = map[status] || { cls: 'badge-neutral', label: status };
    return <span className={`badge ${s.cls}`}><span className="badge-dot"></span>{s.label}</span>;
  };

  const parseTests = (testsJson: string): string => {
    try {
      const tests = JSON.parse(testsJson);
      if (Array.isArray(tests)) {
        return tests.map((t: any) => t.testName || t.name || t.code || t).join(', ');
      }
      return testsJson;
    } catch {
      return testsJson || '—';
    }
  };

  return (
    <div>
      {/* Welcome */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
          Lab Technician Dashboard 🔬
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Process lab orders, collect samples, and report results.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '32px' }}>
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

      {/* Quick Actions */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Quick Actions</h3>
        <div className="quick-actions">
          <div className="quick-action-card" onClick={() => navigate('/lab')}>
            <div className="qa-icon" style={{ background: 'var(--color-primary-100)', color: 'var(--color-primary-dark)' }}>
              <ClipboardList size={24} />
            </div>
            <h4>Record Results</h4>
            <p>Enter lab test results</p>
          </div>
          <div className="quick-action-card" onClick={() => navigate('/lab')}>
            <div className="qa-icon" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
              <Eye size={24} />
            </div>
            <h4>View Orders</h4>
            <p>See pending lab orders</p>
          </div>
        </div>
      </div>

      {/* Lab Orders Table */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FlaskConical size={18} style={{ color: 'var(--color-primary)' }} />
            Lab Orders
          </h3>
          <span className="badge badge-primary">{labOrders.length}</span>
        </div>
        <div className="card-body" style={{ padding: '16px 0 0' }}>
          {labOrders.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>No lab orders found.</p>
            </div>
          ) : (
            <div className="data-table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Test</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {labOrders.slice(0, 10).map((order, i) => (
                    <tr key={i}>
                      <td className="cell-main">{order.patientName}</td>
                      <td>{parseTests(order.testsJson)}</td>
                      <td>{getLabStatusBadge(order.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
