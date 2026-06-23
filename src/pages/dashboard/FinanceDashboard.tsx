import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllInvoices } from '../../services/invoiceService';
import { getAllPayments } from '../../services/paymentService';
import type { InvoiceResponseDto, PaymentResponseDto } from '../../models/types';
import { toast } from 'react-hot-toast';
import {
  FileText,
  DollarSign,
  Clock,
  CreditCard,
  Plus,
  Receipt,
  Shield,
} from 'lucide-react';

export default function FinanceDashboard() {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState<InvoiceResponseDto[]>([]);
  const [payments, setPayments] = useState<PaymentResponseDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invs, pays] = await Promise.all([
        getAllInvoices(),
        getAllPayments(),
      ]);
      setInvoices(invs);
      setPayments(pays);
    } catch (err: any) {
      console.error('Finance dashboard load error', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="page-spinner"><div className="spinner"></div></div>;
  }

  const pendingPayments = invoices.filter(i => i.status === 'ISSUED' || i.status === 'OVERDUE' || i.status === 'UNPAID');
  const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);
  const insuranceClaims = invoices.filter(i => i.status === 'PARTIALLY_PAID');

  const stats = [
    { label: 'Invoices Generated', value: invoices.length.toString(), icon: <FileText size={22} />, color: 'primary' },
    { label: 'Payments Received', value: `₹${totalReceived.toLocaleString()}`, icon: <DollarSign size={22} />, color: 'success' },
    { label: 'Pending Payments', value: pendingPayments.length.toString(), icon: <Clock size={22} />, color: 'warning' },
    { label: 'Insurance Claims', value: insuranceClaims.length.toString(), icon: <Shield size={22} />, color: 'info' },
  ];

  const getInvoiceStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      'DRAFT': { cls: 'badge-neutral', label: 'Draft' },
      'ISSUED': { cls: 'badge-warning', label: 'Issued' },
      'PAID': { cls: 'badge-success', label: 'Paid' },
      'OVERDUE': { cls: 'badge-danger', label: 'Overdue' },
      'CANCELLED': { cls: 'badge-neutral', label: 'Cancelled' },
      'UNPAID': { cls: 'badge-warning', label: 'Unpaid' },
      'PARTIALLY_PAID': { cls: 'badge-info', label: 'Partial' },
    };
    const s = map[status] || { cls: 'badge-neutral', label: status };
    return <span className={`badge ${s.cls}`}><span className="badge-dot"></span>{s.label}</span>;
  };

  return (
    <div>
      {/* Welcome */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
          Finance Dashboard 💰
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Manage invoices, track payments, and handle billing.
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
          <div className="quick-action-card" onClick={() => navigate('/invoices')}>
            <div className="qa-icon" style={{ background: 'var(--color-primary-100)', color: 'var(--color-primary-dark)' }}>
              <Plus size={24} />
            </div>
            <h4>Generate Invoice</h4>
            <p>Create new billing invoice</p>
          </div>
          <div className="quick-action-card" onClick={() => navigate('/payments')}>
            <div className="qa-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
              <Receipt size={24} />
            </div>
            <h4>Record Payment</h4>
            <p>Log incoming payment</p>
          </div>
        </div>
      </div>

      {/* Pending Bills Table */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={18} style={{ color: 'var(--color-warning)' }} />
            Pending Bills
          </h3>
          <span className="badge badge-warning">{pendingPayments.length}</span>
        </div>
        <div className="card-body" style={{ padding: '16px 0 0' }}>
          {pendingPayments.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>No pending bills.</p>
            </div>
          ) : (
            <div className="data-table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Patient</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPayments.slice(0, 10).map((inv, i) => (
                    <tr key={i}>
                      <td className="cell-main">#{inv.invoiceId}</td>
                      <td>{inv.patientName}</td>
                      <td>₹{inv.totalAmount.toLocaleString()}</td>
                      <td>{getInvoiceStatusBadge(inv.status)}</td>
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
