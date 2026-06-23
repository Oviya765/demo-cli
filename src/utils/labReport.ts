import type { LabOrderResponseDto, PatientResponseDto } from '../models/types';

/**
 * Lab report generation utility.
 *
 * Builds a self-contained, print-ready HTML document styled to look like a
 * clinical laboratory report and opens it in a new window so the user can
 * print it or "Save as PDF" from the browser print dialog.
 */

interface ReportResult {
  testCode: string;
  value: string;
  units?: string;
  referenceRange?: string;
  flag?: string;
  reportedAt?: string;
}

interface BuildReportArgs {
  order: LabOrderResponseDto;
  patient?: PatientResponseDto | null;
  results: ReportResult[];
}

function escapeHtml(input: unknown): string {
  const str = input == null ? '' : String(input);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function calcAge(dob?: string): string {
  if (!dob) return '—';
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  return age >= 0 ? `${age} yrs` : '—';
}

export function parseTestsJson(testsJson?: string): string[] {
  if (!testsJson) return [];
  try {
    const parsed = JSON.parse(testsJson);
    if (Array.isArray(parsed)) {
      return parsed.map(item => (typeof item === 'string' ? item : item?.name || item?.testName || JSON.stringify(item)));
    }
    if (typeof parsed === 'string') {
      return parsed.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
    }
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.tests)) {
        return parsed.tests.map((t: any) => (typeof t === 'string' ? t : t?.name || JSON.stringify(t)));
      }
      return Object.values(parsed).map(v => (typeof v === 'string' ? v : JSON.stringify(v)));
    }
  } catch {
    /* fall through */
  }
  return String(testsJson).split(/[,;]+/).map(s => s.trim()).filter(Boolean);
}

export function parseRefRange(refJson?: string): string {
  if (!refJson) return '—';
  try {
    const parsed = JSON.parse(refJson);
    if (parsed?.min && parsed?.max) return `${parsed.min} - ${parsed.max}`;
    if (parsed?.min) return `> ${parsed.min}`;
    if (parsed?.max) return `< ${parsed.max}`;
    return refJson;
  } catch {
    return refJson;
  }
}

function flagLabel(flag?: string): { text: string; cls: string } {
  switch ((flag || 'NORMAL').toUpperCase()) {
    case 'CRITICAL':
      return { text: 'CRITICAL', cls: 'flag-critical' };
    case 'HIGH':
      return { text: 'HIGH \u25B2', cls: 'flag-abnormal' };
    case 'LOW':
      return { text: 'LOW \u25BC', cls: 'flag-abnormal' };
    default:
      return { text: 'Normal', cls: 'flag-normal' };
  }
}

export function buildLabReportHtml({ order, patient, results }: BuildReportArgs): string {
  const tests = parseTestsJson(order.testsJson);
  const reportedAt = results.find(r => r.reportedAt)?.reportedAt || order.collectedAt;
  const isCritical = order.status === 'CRITICAL_REPORTED' || results.some(r => (r.flag || '').toUpperCase() === 'CRITICAL');

  const rows = results.length
    ? results
        .map(r => {
          const f = flagLabel(r.flag);
          return `
            <tr class="${f.cls === 'flag-critical' ? 'row-critical' : ''}">
              <td class="test-name">${escapeHtml(r.testCode)}</td>
              <td class="result-value">${escapeHtml(r.value)}</td>
              <td>${escapeHtml(r.units || '—')}</td>
              <td>${escapeHtml(r.referenceRange || '—')}</td>
              <td class="${f.cls}">${f.text}</td>
            </tr>`;
        })
        .join('')
    : `<tr><td colspan="5" style="text-align:center;color:#888;padding:24px;">No results reported.</td></tr>`;

  const reportId = `LR-${String(order.labOrderId).padStart(6, '0')}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Lab Report ${escapeHtml(reportId)} - ${escapeHtml(order.patientName)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", Arial, sans-serif;
    color: #1a1a1a;
    margin: 0;
    padding: 32px;
    background: #f5f5f5;
  }
  .sheet {
    max-width: 820px;
    margin: 0 auto;
    background: #fff;
    padding: 40px 48px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.1);
  }
  .report-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 3px solid #0e7490;
    padding-bottom: 16px;
  }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand-mark {
    width: 46px; height: 46px; border-radius: 10px;
    background: #0e7490; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 24px; font-weight: 700;
  }
  .brand h1 { margin: 0; font-size: 22px; color: #0e7490; letter-spacing: 0.5px; }
  .brand p { margin: 2px 0 0; font-size: 12px; color: #666; }
  .lab-meta { text-align: right; font-size: 12px; color: #444; line-height: 1.6; }
  .lab-meta strong { color: #111; }

  .report-title {
    text-align: center;
    margin: 20px 0 12px;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #0e7490;
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 32px;
    border: 1px solid #e2e2e2;
    border-radius: 6px;
    padding: 16px 20px;
    margin-bottom: 20px;
    font-size: 13px;
  }
  .info-row { display: flex; justify-content: space-between; padding: 3px 0; }
  .info-row .label { color: #666; }
  .info-row .val { font-weight: 600; color: #111; text-align: right; }

  table.results {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    margin-top: 8px;
  }
  table.results thead th {
    background: #0e7490;
    color: #fff;
    text-align: left;
    padding: 10px 12px;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  table.results tbody td {
    padding: 10px 12px;
    border-bottom: 1px solid #ececec;
  }
  table.results tbody tr:nth-child(even) { background: #fafafa; }
  .test-name { font-weight: 600; }
  .result-value { font-weight: 700; font-size: 14px; }
  .row-critical { background: #fff4f4 !important; }
  .flag-normal { color: #15803d; font-weight: 600; }
  .flag-abnormal { color: #b45309; font-weight: 700; }
  .flag-critical { color: #b91c1c; font-weight: 800; }

  .critical-banner {
    margin: 16px 0;
    padding: 12px 16px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-left: 4px solid #b91c1c;
    color: #991b1b;
    font-size: 13px;
    border-radius: 4px;
  }

  .footer {
    margin-top: 40px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-top: 1px solid #e2e2e2;
    padding-top: 16px;
  }
  .sign-box { text-align: center; font-size: 12px; color: #555; }
  .sign-line { width: 200px; border-top: 1px solid #999; margin-bottom: 6px; }
  .disclaimer {
    margin-top: 24px;
    font-size: 10.5px;
    color: #999;
    text-align: center;
    line-height: 1.5;
  }
  .tests-requested { font-size: 12px; color: #555; margin-bottom: 16px; }
  .tests-requested span {
    display: inline-block;
    background: #ecfeff;
    border: 1px solid #cffafe;
    color: #0e7490;
    padding: 2px 8px;
    border-radius: 10px;
    margin: 2px 4px 2px 0;
    font-size: 11px;
  }

  @media print {
    body { background: #fff; padding: 0; }
    .sheet { box-shadow: none; max-width: none; padding: 24px 32px; }
    .no-print { display: none !important; }
  }
  .print-bar {
    max-width: 820px; margin: 0 auto 16px; text-align: right;
  }
  .print-bar button {
    background: #0e7490; color: #fff; border: none;
    padding: 10px 20px; border-radius: 6px; font-size: 14px;
    cursor: pointer; font-weight: 600;
  }
</style>
</head>
<body>
  <div class="print-bar no-print">
    <button onclick="window.print()">\u2193 Download / Print Report</button>
  </div>
  <div class="sheet">
    <div class="report-header">
      <div class="brand">
        <div class="brand-mark">+</div>
        <div>
          <h1>Clinic Flow Diagnostics</h1>
          <p>Accredited Clinical Laboratory &bull; NABL Certified</p>
        </div>
      </div>
      <div class="lab-meta">
        <div>Report No: <strong>${escapeHtml(reportId)}</strong></div>
        <div>Sample ID: <strong>${escapeHtml(order.sampleId || '—')}</strong></div>
        <div>Generated: <strong>${escapeHtml(formatDateTime(new Date().toISOString()))}</strong></div>
      </div>
    </div>

    <div class="report-title">Laboratory Test Report</div>

    <div class="info-grid">
      <div class="info-row"><span class="label">Patient Name</span><span class="val">${escapeHtml(order.patientName)}</span></div>
      <div class="info-row"><span class="label">MRN</span><span class="val">${escapeHtml(patient?.mrn || `MRN-${order.patientId}`)}</span></div>
      <div class="info-row"><span class="label">Age / Sex</span><span class="val">${escapeHtml(calcAge(patient?.dob))} / ${escapeHtml(patient?.gender || '—')}</span></div>
      <div class="info-row"><span class="label">Date of Birth</span><span class="val">${escapeHtml(formatDate(patient?.dob))}</span></div>
      <div class="info-row"><span class="label">Referred By</span><span class="val">${escapeHtml(order.orderedByName || '—')}</span></div>
      <div class="info-row"><span class="label">Encounter</span><span class="val">Visit #${escapeHtml(order.encounterId || '—')}</span></div>
      <div class="info-row"><span class="label">Sample Collected</span><span class="val">${escapeHtml(formatDateTime(order.collectedAt))}</span></div>
      <div class="info-row"><span class="label">Reported On</span><span class="val">${escapeHtml(formatDateTime(reportedAt))}</span></div>
    </div>

    ${tests.length ? `<div class="tests-requested">Requested: ${tests.map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div>` : ''}

    ${isCritical ? `<div class="critical-banner"><strong>&#9888; CRITICAL VALUES DETECTED.</strong> Immediate clinical attention is advised.</div>` : ''}

    <table class="results">
      <thead>
        <tr>
          <th style="width:28%">Investigation</th>
          <th style="width:18%">Result</th>
          <th style="width:14%">Units</th>
          <th style="width:22%">Biological Ref. Range</th>
          <th style="width:18%">Flag</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="footer">
      <div class="sign-box">
        <div class="sign-line"></div>
        Lab Technician
      </div>
      <div class="sign-box">
        <div class="sign-line"></div>
        Authorized Pathologist
      </div>
    </div>

    <div class="disclaimer">
      This is an electronically generated laboratory report. Results relate only to the sample tested.
      Please correlate clinically. In case of any unexpected result, kindly contact the laboratory.
      <br/>Clinic Flow Diagnostics &bull; Generated by Clinic Flow HMS
    </div>
  </div>
</body>
</html>`;
}

/**
 * Opens the generated lab report in a new browser tab/window and triggers the
 * print dialog (which allows "Save as PDF"). Returns false if popup blocked.
 */
export function downloadLabReport(args: BuildReportArgs): boolean {
  const html = buildLabReportHtml(args);

  // NOTE: do NOT pass 'noopener'/'noreferrer' here. When those are set the
  // browser returns null and opens a blank (white) window we cannot write to.
  const win = window.open('', '_blank', 'width=900,height=1000');

  if (win && win.document) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    // Give the new window a tick to render before invoking print.
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch {
        /* user can still use the in-page Download/Print button */
      }
    }, 500);
    return true;
  }

  // Fallback when popups are blocked: download the report as a standalone
  // .html file the user can open and print.
  try {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lab-Report-${args.order.labOrderId}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}
