import React from "react";
 
export const today = new Date().toISOString().slice(0, 16);
 
export function Panel({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>{title}</h2>
        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
 
export function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="form-input" {...inputProps} />
    </div>
  );
}
 
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: { value: string | number; label: string }[] }) {
  const { label, options, ...selectProps } = props;
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <select className="form-select" {...selectProps}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
 
export function Table({ columns, rows, onRowClick }: { columns: string[]; rows: React.ReactNode[][]; onRowClick?: (index: number) => void }) {
  return (
    <div className="data-table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "40px 0" }}>
                No records found.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={index}
                onClick={onRowClick ? () => onRowClick(index) : undefined}
                style={onRowClick ? { cursor: "pointer" } : undefined}
              >
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
 
export function StatusBadge({ status }: { status: string }) {
  const normalized = (status || "").toUpperCase();
  let className = "badge-neutral";
 
  if (normalized === "PAID" || normalized === "SUCCESS" || normalized === "COMPLETED") {
    className = "badge-success";
  } else if (normalized === "UNPAID" || normalized === "PENDING" || normalized === "PARTIALLY_PAID") {
    className = "badge-warning";
  } else if (normalized === "VOID" || normalized === "CANCELLED" || normalized === "FAILED" || normalized === "OVERDUE") {
    className = "badge-danger";
  }
 
  return (
    <span className={`badge ${className}`}>
      <span className="badge-dot"></span>
      {status}
    </span>
  );
}
 
export function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null;
 
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px" }}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose} style={{ fontSize: "1.5rem" }}>
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
 
export function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value || 0);
}
 
export function date(value?: any) {
  if (!value) return "-";
  if (Array.isArray(value)) {
    const year = value[0];
    const month = String(value[1] || 1).padStart(2, "0");
    const day = String(value[2] || 1).padStart(2, "0");
    const hour = String(value[3] || 0).padStart(2, "0");
    const minute = String(value[4] || 0).padStart(2, "0");
    const second = String(value[5] || 0).padStart(2, "0");
    value = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  }
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  } catch {
    return "-";
  }
}
 
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  itemsPerPageOptions?: number[];
}
 
export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [5, 10, 20, 50]
}: PaginationProps) {
  if (totalItems === 0) return null;
 
  const startIdx = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIdx = Math.min(currentPage * itemsPerPage, totalItems);
 
  // Show max 5 page buttons with ellipsis
  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [];
    if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };
 
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", padding: "12px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>Rows:</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          style={{
            padding: "4px 8px",
            borderRadius: "6px",
            border: "1px solid var(--color-border)",
            background: "var(--color-bg)",
            cursor: "pointer",
            fontSize: "0.8125rem",
            color: "var(--color-text)",
            outline: "none"
          }}
        >
          {itemsPerPageOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
 
      <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
        {startIdx}–{endIdx} of {totalItems}
      </span>
 
      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          style={{
            padding: "6px 10px",
            borderRadius: "6px",
            border: "1px solid var(--color-border)",
            background: "var(--color-bg)",
            color: currentPage === 1 ? "var(--color-text-muted)" : "var(--color-text)",
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
            fontSize: "0.8125rem",
            opacity: currentPage === 1 ? 0.5 : 1
          }}
        >
          ‹
        </button>
 
        {getPageNumbers().map((page, idx) =>
          page === '...' ? (
            <span key={`ellipsis-${idx}`} style={{ padding: "0 4px", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>…</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "6px",
                border: page === currentPage ? "none" : "1px solid transparent",
                background: page === currentPage ? "var(--color-primary)" : "transparent",
                color: page === currentPage ? "#fff" : "var(--color-text)",
                cursor: "pointer",
                fontSize: "0.8125rem",
                fontWeight: page === currentPage ? 600 : 400,
                transition: "all 0.15s ease"
              }}
            >
              {page}
            </button>
          )
        )}
 
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          style={{
            padding: "6px 10px",
            borderRadius: "6px",
            border: "1px solid var(--color-border)",
            background: "var(--color-bg)",
            color: currentPage === totalPages ? "var(--color-text-muted)" : "var(--color-text)",
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            fontSize: "0.8125rem",
            opacity: currentPage === totalPages ? 0.5 : 1
          }}
        >
          ›
        </button>
      </div>
    </div>
  );
}
 