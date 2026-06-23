import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllPrescriptions } from '../../services/prescriptionService';
import { getAllDispenseRecords } from '../../services/pharmacyService';
import { getLowStock, getExpiredInventory } from '../../services/inventoryService';
import type { PrescriptionResponseDto, DispenseResponseDto, InventoryResponseDto } from '../../models/types';
import type { StockSummaryResponseDto } from '../../services/inventoryService';
import { toast } from 'react-hot-toast';
import {
  Pill,
  Package,
  AlertTriangle,
  Clock,
  Plus,
  Archive,
  ShoppingCart,
} from 'lucide-react';

export default function PharmacistDashboard() {
  const navigate = useNavigate();

  const [prescriptions, setPrescriptions] = useState<PrescriptionResponseDto[]>([]);
  const [dispenseRecords, setDispenseRecords] = useState<DispenseResponseDto[]>([]);
  const [lowStock, setLowStock] = useState<StockSummaryResponseDto[]>([]);
  const [expiredMeds, setExpiredMeds] = useState<InventoryResponseDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rxs, dispenses, low, expired] = await Promise.all([
        getAllPrescriptions(),
        getAllDispenseRecords(),
        getLowStock(),
        getExpiredInventory(),
      ]);
      setPrescriptions(rxs);
      setDispenseRecords(dispenses);
      setLowStock(low);
      setExpiredMeds(expired);
    } catch (err: any) {
      console.error('Pharmacist dashboard load error', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="page-spinner"><div className="spinner"></div></div>;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const pendingPrescriptions = prescriptions.filter(rx => rx.status === 'ISSUED' || rx.status === 'ACTIVE');
  const dispensedToday = dispenseRecords.filter(d => d.dispensedAt?.startsWith(todayStr));

  const stats = [
    { label: 'Pending Prescriptions', value: pendingPrescriptions.length.toString(), icon: <Clock size={22} />, color: 'warning' },
    { label: 'Medicines Dispensed Today', value: dispensedToday.length.toString(), icon: <Pill size={22} />, color: 'success' },
    { label: 'Low Stock Medicines', value: lowStock.length.toString(), icon: <AlertTriangle size={22} />, color: 'warning' },
    { label: 'Expired Medicines', value: expiredMeds.length.toString(), icon: <Package size={22} />, color: 'primary' },
  ];

  const getStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      'DRAFT': { cls: 'badge-neutral', label: 'Draft' },
      'ISSUED': { cls: 'badge-warning', label: 'Issued' },
      'ACTIVE': { cls: 'badge-info', label: 'Active' },
      'DISPENSED': { cls: 'badge-success', label: 'Dispensed' },
      'COMPLETED': { cls: 'badge-success', label: 'Completed' },
      'CANCELLED': { cls: 'badge-danger', label: 'Cancelled' },
      'EXPIRED': { cls: 'badge-danger', label: 'Expired' },
    };
    const s = map[status] || { cls: 'badge-neutral', label: status };
    return <span className={`badge ${s.cls}`}><span className="badge-dot"></span>{s.label}</span>;
  };

  return (
    <div>
      {/* Welcome */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
          Pharmacy Dashboard 💊
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Manage prescriptions, dispense medicines and track inventory.
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
          <div className="quick-action-card" onClick={() => navigate('/pharmacy')}>
            <div className="qa-icon" style={{ background: 'var(--color-primary-100)', color: 'var(--color-primary-dark)' }}>
              <ShoppingCart size={24} />
            </div>
            <h4>Dispense Medicines</h4>
            <p>Process prescriptions</p>
          </div>
          <div className="quick-action-card" onClick={() => navigate('/inventory')}>
            <div className="qa-icon" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
              <Archive size={24} />
            </div>
            <h4>Manage Inventory</h4>
            <p>Stock management</p>
          </div>
          <div className="quick-action-card" onClick={() => navigate('/inventory')}>
            <div className="qa-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
              <Plus size={24} />
            </div>
            <h4>Add Medicine</h4>
            <p>Add new medication</p>
          </div>
        </div>
      </div>

      {/* Pending Prescriptions Table */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Pill size={18} style={{ color: 'var(--color-warning)' }} />
            Pending Prescriptions
          </h3>
          <span className="badge badge-warning">{pendingPrescriptions.length}</span>
        </div>
        <div className="card-body" style={{ padding: '16px 0 0' }}>
          {pendingPrescriptions.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>No pending prescriptions.</p>
            </div>
          ) : (
            <div className="data-table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Prescription ID</th>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPrescriptions.slice(0, 10).map((rx, i) => (
                    <tr key={i}>
                      <td className="cell-main">#{rx.rxId}</td>
                      <td>{rx.patientName}</td>
                      <td>{rx.clinicianName}</td>
                      <td>{getStatusBadge(rx.status)}</td>
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
