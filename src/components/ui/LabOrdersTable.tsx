import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getResultsByOrderId } from '../../services/labService';
import { getPatientById } from '../../services/patientService';
import { downloadLabReport, parseRefRange as parseRefRangeUtil } from '../../utils/labReport';
import type { LabOrderResponseDto } from '../../models/types';
import {
  Check,
  X,
  FileText,
  ArrowRight,
  Trash2,
  AlertOctagon,
  Download
} from 'lucide-react';
import MrnLabel from './MrnLabel';
import React, { useState } from 'react';

// Formatting helpers
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

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
    // ignore
  }
  return String(testsJson).split(/[,;]+/).map(s => s.trim()).filter(Boolean);
};

const getLabStatusBadge = (status: string) => {
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

interface LabOrdersTableProps {
  orders: LabOrderResponseDto[];
  context: 'dashboard' | 'encounter';
  onCollectSample?: (id: number) => Promise<void>;
  onCancelOrder?: (id: number) => Promise<void>;
  actionLoadingId?: number | null;
  actionLoading?: boolean;
}

export default function LabOrdersTable({
  orders,
  context,
  onCollectSample,
  onCancelOrder,
  actionLoadingId,
  actionLoading
}: LabOrdersTableProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isTechnician = user?.role === 'LAB_TECHNICIAN';
  const isClinician = user?.role === 'CLINICIAN';
  const isAdmin = user?.role === 'ADMIN';
  const isPatient = user?.role === 'PATIENT';

  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const handleDownload = async (order: LabOrderResponseDto) => {
    setDownloadingId(order.labOrderId);
    try {
      let detailed: any[] = [];
      try {
        detailed = await getResultsByOrderId(order.labOrderId);
      } catch {
        detailed = [];
      }
      let patient = null;
      try {
        patient = await getPatientById(order.patientId);
      } catch {
        patient = null;
      }
      const results = (detailed.length ? detailed : order.results || []).map((r: any) => ({
        testCode: r.testCode,
        value: r.value,
        units: r.units,
        referenceRange: parseRefRangeUtil(r.referenceRangeJson),
        flag: r.flag,
        reportedAt: r.reportedAt,
      }));
      downloadLabReport({ order, patient, results });
    } finally {
      setDownloadingId(null);
    }
  };

  const renderActions = (order: LabOrderResponseDto) => {
    const isReported = order.status === 'RESULTS_REPORTED' || order.status === 'CRITICAL_REPORTED';
    const canViewDetails = isReported && (isClinician || isAdmin || isPatient);
    const canDownload = isReported && (isClinician || isAdmin || isPatient);
    
    const showCollectSample = isTechnician && order.status === 'ORDERED';
    const showAddEditResults = isTechnician && order.status === 'COLLECTED';
    const showCancelOrder = (isAdmin || isClinician) && order.status === 'ORDERED';
    
    const buttons: React.ReactNode[] = [];
    
    if (context === 'dashboard') {
      if (showCollectSample && onCollectSample) {
        buttons.push(
          <button
            key="collect"
            type="button"
            className="btn btn-primary"
            style={{ padding: '6px 12px', fontSize: '0.75rem', height: 'auto' }}
            onClick={() => onCollectSample(order.labOrderId)}
            disabled={actionLoadingId === order.labOrderId}
          >
            <Check size={14} style={{ marginRight: 4 }} /> Collect Sample
          </button>
        );
      }
      
      if (showAddEditResults) {
        buttons.push(
          <button
            key="results"
            type="button"
            className="btn btn-primary"
            style={{ padding: '6px 12px', fontSize: '0.75rem', height: 'auto', background: 'linear-gradient(135deg, #0284c7, #0369a1)', borderColor: '#0284c7' }}
            onClick={() => navigate(`/lab/${order.labOrderId}`)}
          >
            <FileText size={14} style={{ marginRight: 4 }} /> Add/Edit Results
          </button>
        );
      }
      
      if (canViewDetails) {
        buttons.push(
          <button
            key="details"
            type="button"
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.75rem', height: 'auto' }}
            onClick={() => navigate(`/lab/${order.labOrderId}`)}
          >
            Details <ArrowRight size={12} style={{ marginLeft: '4px' }} />
          </button>
        );
      }

      if (canDownload) {
        buttons.push(
          <button
            key="download"
            type="button"
            className="btn btn-primary"
            style={{ padding: '6px 12px', fontSize: '0.75rem', height: 'auto' }}
            onClick={() => handleDownload(order)}
            disabled={downloadingId === order.labOrderId}
            title="Download lab report"
          >
            <Download size={14} style={{ marginRight: 4 }} /> {downloadingId === order.labOrderId ? 'Preparing...' : 'Report'}
          </button>
        );
      }
      
      if (showCancelOrder && onCancelOrder) {
        buttons.push(
          <button
            key="cancel"
            type="button"
            className="btn btn-danger"
            style={{ padding: '6px 12px', fontSize: '0.75rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            onClick={() => onCancelOrder(order.labOrderId)}
            disabled={actionLoadingId === order.labOrderId}
            title="Cancel Order"
          >
            <X size={14} /> Cancel
          </button>
        );
      }
    } else {
      // Encounter details tab context
      if (canViewDetails) {
        buttons.push(
          <button
            key="view-details"
            className="btn btn-ghost"
            style={{ padding: '4px 8px', fontSize: '0.75rem', height: 'auto', minWidth: 'auto' }}
            onClick={() => navigate(`/lab/${order.labOrderId}`)}
          >
            View Details
          </button>
        );
      }

      if (canDownload) {
        buttons.push(
          <button
            key="download-enc"
            className="btn btn-ghost"
            style={{ padding: '4px 8px', fontSize: '0.75rem', height: 'auto', minWidth: 'auto', color: 'var(--color-primary)' }}
            onClick={() => handleDownload(order)}
            disabled={downloadingId === order.labOrderId}
            title="Download lab report"
          >
            <Download size={12} style={{ marginRight: 4 }} /> Report
          </button>
        );
      }
      
      if (showCancelOrder && onCancelOrder) {
        buttons.push(
          <button
            key="cancel-order"
            className="btn btn-danger"
            style={{ padding: '6px 10px', fontSize: '0.75rem', height: 'auto', minWidth: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ffffff' }}
            onClick={() => onCancelOrder(order.labOrderId)}
            disabled={actionLoading}
          >
            <Trash2 size={12} /> Cancel
          </button>
        );
      }
    }
    
    if (buttons.length === 0) {
      return '—';
    }
    
    return (
      <div style={{ display: 'flex', justifyContent: context === 'dashboard' ? 'flex-end' : 'flex-start', gap: '8px', alignItems: 'center' }}>
        {buttons}
      </div>
    );
  };

  return (
    <div className="data-table-wrapper" style={{ border: 'none', boxShadow: 'none', background: 'transparent' }}>
      <table className="data-table">
        <thead>
          {context === 'dashboard' ? (
            <tr>
              <th>Order Details</th>
              <th>Patient</th>
              <th>Tests</th>
              <th>Dates</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          ) : (
            <tr>
              <th>Tests Requested</th>
              <th>Sample Barcode</th>
              <th>Sample Collected Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          )}
        </thead>
        <tbody>
          {orders.map((order) => {
            const testsList = parseTests(order.testsJson);
            const isReported = order.status === 'RESULTS_REPORTED' || order.status === 'CRITICAL_REPORTED';
            const isClinician = user?.role === 'CLINICIAN';
            const isTechnician = user?.role === 'LAB_TECHNICIAN';
            
            const canViewDetails = isReported && isClinician;
            const canEnterResults = order.status === 'COLLECTED' && isTechnician;
            const canNavigate = canViewDetails || canEnterResults;
            
            return (
              <tr 
                key={order.labOrderId} 
                className={order.status === 'CRITICAL_REPORTED' && context === 'dashboard' ? 'row-critical-highlight' : ''} 
                style={{ opacity: (isReported && !isClinician) ? 0.7 : 1 }}
              >
                {context === 'dashboard' ? (
                  <>
                    <td 
                      className="cell-main" 
                      onClick={() => canNavigate && navigate(`/lab/${order.labOrderId}`)} 
                      style={{ cursor: canNavigate ? 'pointer' : 'default' }}
                    >
                      <div>Order #{order.labOrderId}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        ID: {order.sampleId ? <code style={{ color: 'var(--color-primary-light)' }}>{order.sampleId}</code> : '—'}
                      </div>
                    </td>
                    <td 
                      onClick={() => canNavigate && navigate(`/lab/${order.labOrderId}`)} 
                      style={{ cursor: canNavigate ? 'pointer' : 'default' }}
                    >
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
                    <td>{getLabStatusBadge(order.status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {renderActions(order)}
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ fontWeight: 500 }}>
                      {testsList.join(', ') || '—'}
                    </td>
                    <td>{order.sampleId || '—'}</td>
                    <td>{order.collectedAt ? formatDateTime(order.collectedAt.toString()) : '—'}</td>
                    <td>{getLabStatusBadge(order.status)}</td>
                    <td>
                      {renderActions(order)}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
