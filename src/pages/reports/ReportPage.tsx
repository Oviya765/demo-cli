import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import type { ReportResponseDto, InvoiceResponseDto, PaymentResponseDto } from "../../models/types";
import { getAllReports, createReport } from "../../services/reportService";
import { getAllInvoices } from "../../services/invoiceService";
import { getAllPayments } from "../../services/paymentService";
import { Panel, Table, Modal, money, date, today } from "../../components/ui/components";
import "../../assets/styles/reports/ReportPage.css";

export default function ReportPage() {
  const [reports, setReports] = useState<ReportResponseDto[]>([]);
  const [invoices, setInvoices] = useState<InvoiceResponseDto[]>([]);
  const [payments, setPayments] = useState<PaymentResponseDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportResponseDto | null>(null);

  // Form parameters
  const [scope, setScope] = useState<string>("daily-finance");
  const [startDate, setStartDate] = useState<string>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [generatedAt, setGeneratedAt] = useState<string>(today);

  // Calculated Preview State
  const [previewMetrics, setPreviewMetrics] = useState<{
    totalInvoiced: number;
    totalReceived: number;
    balanceDue: number;
    invoiceCount: number;
    paymentCount: number;
  } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reportData, invoiceData, paymentData] = await Promise.all([
        getAllReports(),
        getAllInvoices(),
        getAllPayments()
      ]);
      setReports(reportData);
      setInvoices(invoiceData);
      setPayments(paymentData);
    } catch (err: any) {
      toast.error(err.message || "Failed to load report dependencies.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Function to run the metrics calculation on the current data
  function calculateMetrics() {
    const start = new Date(startDate);
    const end = new Date(endDate + "T23:59:59");

    // Filter Invoices in date range
    const rangeInvoices = invoices.filter((inv) => {
      if (!inv.issuedAt) return false;
      const d = new Date(inv.issuedAt);
      return d >= start && d <= end;
    });

    // Filter Payments in date range
    const rangePayments = payments.filter((pay) => {
      if (!pay.paidAt || (pay.status !== "SUCCESS" && pay.status !== "COMPLETED")) return false;
      const d = new Date(pay.paidAt);
      return d >= start && d <= end;
    });

    const totalInvoiced = rangeInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalReceived = rangePayments.reduce((sum, pay) => sum + pay.amount, 0);

    const metrics = {
      totalInvoiced,
      totalReceived,
      balanceDue: Math.max(0, totalInvoiced - totalReceived),
      invoiceCount: rangeInvoices.length,
      paymentCount: rangePayments.length
    };

    setPreviewMetrics(metrics);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!previewMetrics) return;

    try {
      const parametersJson = JSON.stringify({ from: startDate, to: endDate });
      const metricsJson = JSON.stringify(previewMetrics);
      const reportUri = `/reports/finance-${scope}-${startDate}-to-${endDate}.pdf`;

      await createReport({
        scope,
        parametersJson,
        metricsJson,
        generatedAt: new Date(generatedAt).toISOString(),
        reportUri
      });

      toast.success("Report generated and archived successfully.");

      // Reset Form
      setPreviewMetrics(null);
      setShowForm(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save report.");
    }
  }

  // Parse helper for report tables
  function parseParams(report: ReportResponseDto): { from: string; to: string } {
    try {
      return JSON.parse(report.parametersJson || '{"from":"-","to":"-"}');
    } catch {
      return { from: "N/A", to: "N/A" };
    }
  }

  function parseMetrics(report: ReportResponseDto): {
    totalInvoiced: number;
    totalReceived: number;
    balanceDue: number;
    invoiceCount: number;
    paymentCount: number;
  } {
    try {
      return JSON.parse(report.metricsJson || '{"totalInvoiced":0,"totalReceived":0,"balanceDue":0,"invoiceCount":0,"paymentCount":0}');
    } catch {
      return { totalInvoiced: 0, totalReceived: 0, balanceDue: 0, invoiceCount: 0, paymentCount: 0 };
    }
  }

  if (loading && reports.length === 0) {
    return <div className="page-spinner"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Financial Analytics & Reports</h1>
          <p>Generate financial summaries, audit metrics, and archive performance analytics.</p>
        </div>
      </div>

      <Panel
        title="Audit Logs List"
        actions={
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ Generate Report"}
          </button>
        }
      >
        {showForm && (
          <form onSubmit={submit} style={{ background: "var(--color-bg)", padding: "24px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontWeight: 600 }}>Generate Financial Report</h3>
              <button type="button" style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--color-text-muted)" }} onClick={() => { setShowForm(false); setPreviewMetrics(null); }}>&times;</button>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Report Scope</label>
                <select className="form-select" value={scope} onChange={(e) => { setScope(e.target.value); setPreviewMetrics(null); }}>
                  <option value="daily-finance">Daily Finance Report</option>
                  <option value="weekly-finance">Weekly Summary</option>
                  <option value="monthly-finance">Monthly P&L Statement</option>
                  <option value="custom-finance">Custom Analytics Range</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Generation Time *</label>
                <input className="form-input" type="datetime-local" value={generatedAt} onChange={(e) => setGeneratedAt(e.target.value)} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input className="form-input" type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPreviewMetrics(null); }} required />
              </div>

              <div className="form-group">
                <label className="form-label">End Date *</label>
                <input className="form-input" type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPreviewMetrics(null); }} required />
              </div>
            </div>

            <div style={{ marginTop: "16px" }}>
              <button type="button" className="btn btn-secondary" onClick={calculateMetrics}>
                Calculate & Preview Analytics
              </button>
            </div>

            {previewMetrics && (
              <div style={{ marginTop: "24px", padding: "20px", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)" }}>
                <h4 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px", color: "var(--color-primary)" }}>Report Calculation Preview</h4>
                <div className="metrics-grid">
                  <div className="metric-card">
                    <span className="metric-label">Invoices Generated</span>
                    <strong className="metric-value">{previewMetrics.invoiceCount}</strong>
                  </div>
                  <div className="metric-card">
                    <span className="metric-label">Total Billed Amount</span>
                    <strong className="metric-value" style={{ color: "var(--color-primary)" }}>{money(previewMetrics.totalInvoiced)}</strong>
                  </div>
                  <div className="metric-card">
                    <span className="metric-label">Payments Logged</span>
                    <strong className="metric-value">{previewMetrics.paymentCount}</strong>
                  </div>
                  <div className="metric-card">
                    <span className="metric-label">Total Payments Received</span>
                    <strong className="metric-value" style={{ color: "var(--color-success)" }}>{money(previewMetrics.totalReceived)}</strong>
                  </div>
                  <div className="metric-card" style={{ gridColumn: "span 2" }}>
                    <span className="metric-label">Outstanding Balance Due</span>
                    <strong className="metric-value" style={{ color: "var(--color-warning)" }}>{money(previewMetrics.balanceDue)}</strong>
                  </div>
                </div>

                <div style={{ marginTop: "20px", display: "flex", gap: "12px" }}>
                  <button type="submit" className="btn btn-primary">Save & Archive Report</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setPreviewMetrics(null)}>Clear Preview</button>
                </div>
              </div>
            )}
          </form>
        )}

        <Table
          columns={["Report ID", "Scope", "Reporting Period", "Invoices Billed", "Revenue Billed", "Revenue Received", "Status", "Actions"]}
          rows={reports.map((rep) => {
            const params = parseParams(rep);
            const metrics = parseMetrics(rep);
            return [
              `#${rep.reportId}`,
              <span key={`scope-${rep.reportId}`} style={{ fontWeight: 600, textTransform: "capitalize" }}>
                {rep.scope.replace("-", " ")}
              </span>,
              `${params.from} to ${params.to}`,
              `${metrics.invoiceCount} invoices`,
              <strong>{money(metrics.totalInvoiced)}</strong>,
              <strong key={`received-${rep.reportId}`} style={{ color: "var(--color-success)" }}>{money(metrics.totalReceived)}</strong>,
              <span key={`status-${rep.reportId}`} className="badge badge-success"><span className="badge-dot"></span>Archived</span>,
              <div className="actions-cell" key={`actions-${rep.reportId}`}>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedReport(rep)}>
                  View Report
                </button>
              </div>
            ];
          })}
        />

        {selectedReport && (
          <Modal isOpen={!!selectedReport} onClose={() => setSelectedReport(null)} title={`Financial Report Summary #${selectedReport.reportId}`}>
            <div className="receipt">
              <div className="receipt-header">
                <div>
                  <span className="receipt-logo" style={{ color: "var(--color-primary)" }}>ClinicFlow Analytics</span>
                  <span style={{ display: "block", color: "var(--color-text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>EXECUTIVE FINANCIAL STATEMENT</span>
                </div>
                <div className="receipt-meta">
                  <span className="receipt-title">Financial Report</span>
                  <span>Report ID: #{selectedReport.reportId}</span>
                  <span>Generated: {date(selectedReport.generatedAt)}</span>
                  <span>By: {selectedReport.generatedByName || `User #${selectedReport.generatedById}`}</span>
                </div>
              </div>

              <div className="receipt-info-grid">
                <div className="receipt-info-block">
                  <span>REPORT SCOPE:</span>
                  <strong style={{ textTransform: "capitalize" }}>{selectedReport.scope.replace("-", " ")}</strong>
                </div>
                <div className="receipt-info-block" style={{ textAlign: "right" }}>
                  <span>REPORTING RANGE:</span>
                  <strong>
                    {parseParams(selectedReport).from} &rarr; {parseParams(selectedReport).to}
                  </strong>
                </div>
              </div>

              <h4 style={{ marginBottom: "12px", fontSize: "14px", fontWeight: 600 }}>Aggregated Performance Metrics</h4>
              <table className="receipt-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Financial Metric</th>
                    <th style={{ textAlign: "right" }}>Value / Count</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Total Billed Invoices count</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{parseMetrics(selectedReport).invoiceCount}</td>
                  </tr>
                  <tr>
                    <td>Total Gross Billed Revenue</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "var(--color-primary)" }}>{money(parseMetrics(selectedReport).totalInvoiced)}</td>
                  </tr>
                  <tr>
                    <td>Total Successful Payments count</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{parseMetrics(selectedReport).paymentCount}</td>
                  </tr>
                  <tr>
                    <td>Total Collections / Net Revenue Received</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "var(--color-success)" }}>{money(parseMetrics(selectedReport).totalReceived)}</td>
                  </tr>
                  <tr style={{ background: "var(--color-warning-bg)" }}>
                    <td style={{ fontWeight: 600, color: "#92400e" }}>Outstanding Accounts Receivable (Balance Due)</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#92400e" }}>{money(parseMetrics(selectedReport).balanceDue)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="receipt-footer">
                <p>ClinicFlow Finance. Confidential &amp; Internal Audit Use Only.</p>
                <p>Export file URI: {selectedReport.reportUri}</p>
              </div>

              <div className="modal-footer" style={{ marginTop: "24px", padding: 0 }}>
                <button className="btn btn-primary" onClick={() => window.print()}>Print Summary</button>
                <button className="btn btn-secondary" onClick={() => setSelectedReport(null)}>Close</button>
              </div>
            </div>
          </Modal>
        )}
      </Panel>
    </div>
  );
}
