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

export function Table({ columns, rows }: { columns: string[]; rows: React.ReactNode[][] }) {
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
              <tr key={index}>
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

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", padding: "16px", background: "var(--color-bg-subtle)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>
          Items per page:
        </span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          style={{
            padding: "6px 8px",
            borderRadius: "4px",
            border: "1px solid var(--color-border)",
            background: "var(--color-bg)",
            cursor: "pointer",
            fontSize: "14px"
          }}
        >
          {itemsPerPageOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div style={{ fontSize: "14px", color: "var(--color-text)" }}>
        Showing {startIdx} to {endIdx} of {totalItems} items
      </div>

      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="btn btn-secondary"
          style={{ padding: "6px 12px", fontSize: "14px" }}
        >
          ← Previous
        </button>

        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              style={{
                padding: "6px 10px",
                borderRadius: "4px",
                border: page === currentPage ? "none" : "1px solid var(--color-border)",
                background: page === currentPage ? "var(--color-primary)" : "var(--color-bg)",
                color: page === currentPage ? "white" : "var(--color-text)",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: page === currentPage ? "600" : "400"
              }}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="btn btn-secondary"
          style={{ padding: "6px 12px", fontSize: "14px" }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}