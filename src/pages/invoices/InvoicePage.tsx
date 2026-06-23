import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { ArrowLeft, Pencil, Search, Trash2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import type {
  InvoiceResponseDto as Invoice,
  PatientResponseDto as Patient,
  EncounterResponseDto as Encounter,
  PaymentResponseDto as Payment,
  ServiceItemResponseDto as ServiceItem,
} from "../../models/types";
import { getAllInvoices, createInvoice, deleteInvoice, updateInvoice, getServiceItems } from "../../services/invoiceService";
import { getAllPayments, createPayment } from "../../services/paymentService";
import { getAllPatients } from "../../services/patientService";
import { getAllEncounters } from "../../services/encounterService";
import { Panel, Table, StatusBadge, Modal, Pagination, money, date, today } from "../../components/ui/components";
import "../../assets/styles/invoices/InvoicePage.css";

export interface LineItem {
  name: string;
  unitPrice: number;
  quantity: number;
  amount: number;
}

// Helper to get the current local date-time formatted for datetime-local inputs
function nowLocalForInput(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

// Helper to get a local date-time a number of days from now, formatted for datetime-local inputs
function addDaysLocalForInput(days: number): string {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

// Helper to format date values for local datetime inputs safely
function formatDateForInput(dateVal: any): string {
  if (!dateVal) return "";
  if (typeof dateVal === "string") return dateVal.slice(0, 16);
  if (Array.isArray(dateVal)) {
    const year = dateVal[0];
    const month = String(dateVal[1] || 1).padStart(2, "0");
    const day = String(dateVal[2] || 1).padStart(2, "0");
    const hour = String(dateVal[3] || 0).padStart(2, "0");
    const minute = String(dateVal[4] || 0).padStart(2, "0");
    return `${year}-${month}-${day}T${hour}:${minute}`;
  }
  return "";
}

// Helper to format date values for display in receipt modal
function formatDateForDisplay(dateVal: any): string {
  if (!dateVal) return "-";
  if (typeof dateVal === "string") {
    try {
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
    } catch {
      return "-";
    }
  }
  if (Array.isArray(dateVal)) {
    const year = dateVal[0];
    const month = String(dateVal[1] || 1).padStart(2, "0");
    const day = String(dateVal[2] || 1).padStart(2, "0");
    return `${day}/${month}/${year}`;
  }
  return "-";
}

export default function InvoicePage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showLogsPage, setShowLogsPage] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [logsSearchQuery, setLogsSearchQuery] = useState("");
  const [logsCurrentPage, setLogsCurrentPage] = useState(1);
  const [logsItemsPerPage, setLogsItemsPerPage] = useState(10);
  const [logsPatientFilterId, setLogsPatientFilterId] = useState<string>("");

  // Form States
  const [patientId, setPatientId] = useState<number>(0);
  const [encounterId, setEncounterId] = useState<string>("");
  const [issuedAt, setIssuedAt] = useState(nowLocalForInput());
  const [dueDate, setDueDate] = useState(addDaysLocalForInput(7));
  const [status, setStatus] = useState<string>("UNPAID");

  // Manual Payment States
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string>("");
  const [paymentPatientId, setPaymentPatientId] = useState<string>("");
  const [paymentPatientName, setPaymentPatientName] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [paymentPaidAt, setPaymentPaidAt] = useState<string>(today);
  const paymentStatus = "SUCCESS";

  // Service Items State - list of items already added to the invoice
  const [serviceItems, setServiceItems] = useState<{ serviceItemCode: string; quantity: number | "" }[]>([]);

  // Draft entry for the stationary "add service item" row
  const [draftCode, setDraftCode] = useState<string>("");
  const [draftQty, setDraftQty] = useState<number | "">(1);

  // Master list of available service items (with prices) used to compute totals live
  const [serviceItemCatalog, setServiceItemCatalog] = useState<ServiceItem[]>([]);

  // Fixed tax rate (10%) enforced by the backend; mirrored here only for live preview
  const TAX_RATE = 0.10;

  // Build a quick lookup of code (upper-cased) -> price
  const priceByCode = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of serviceItemCatalog) {
      if (item.code) map[item.code.trim().toUpperCase()] = item.price;
    }
    return map;
  }, [serviceItemCatalog]);

  // Live subtotal from the entered service items (codes matched against the catalog)
  const liveSubtotal = useMemo(() => {
    return serviceItems.reduce((sum, item) => {
      const code = item.serviceItemCode.trim().toUpperCase();
      const price = priceByCode[code];
      if (!code || price == null) return sum;
      const qty = item.quantity === "" ? 0 : Number(item.quantity);
      return sum + price * qty;
    }, 0);
  }, [serviceItems, priceByCode]);

  const liveTax = useMemo(() => Math.round(liveSubtotal * TAX_RATE * 100) / 100, [liveSubtotal]);
  const liveTotal = useMemo(() => Math.round((liveSubtotal + liveTax) * 100) / 100, [liveSubtotal, liveTax]);

  // Load datasets from backend APIs
  const loadData = async () => {
    try {
      setLoading(true);
      const [invoiceData, paymentData, patientData, encounterData] = await Promise.all([
        getAllInvoices(),
        getAllPayments(),
        getAllPatients(),
        getAllEncounters()
      ]);
      setInvoices(invoiceData);
      setPayments(paymentData);
      setPatients(patientData);
      setEncounters(encounterData);
      setCurrentPage(1); // Reset to first page when data loads
      if (patientData.length > 0 && !patientId) {
        setPatientId(patientData[0].patientId);
      }

      // Service item catalog is optional (used only for the live total preview).
      // Fetch it separately so a failure here doesn't break the whole page.
      try {
        const serviceItemData = await getServiceItems();
        setServiceItemCatalog(serviceItemData);
      } catch {
        setServiceItemCatalog([]);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load database records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter encounters to only show the selected patient's encounters
  const filteredEncounters = useMemo(() => {
    return encounters.filter((e) => e.patientId === Number(patientId));
  }, [encounters, patientId]);

  // Filter encounters that don't already have invoices
  const encountersWithoutInvoices = useMemo(() => {
    return filteredEncounters.filter(
      (encounter) => !invoices.some((inv) => inv.encounterId === encounter.encounterId)
    );
  }, [filteredEncounters, invoices]);

  // Calculate pagination
  const paginationData = useMemo(() => {
    const totalItems = invoices.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const paginatedInvoices = invoices.slice(startIdx, endIdx);

    return {
      paginatedInvoices,
      totalPages,
      totalItems,
      startIdx: totalItems > 0 ? startIdx + 1 : 0,
      endIdx: Math.min(endIdx, totalItems)
    };
  }, [invoices, currentPage, itemsPerPage]);

  const filteredPaymentLogs = useMemo(() => {
    const filteredByPatient = logsPatientFilterId
      ? payments.filter((payment) => payment.patientId === Number(logsPatientFilterId))
      : payments;

    if (!logsSearchQuery.trim()) return filteredByPatient;
    const query = logsSearchQuery.toLowerCase();
    return filteredByPatient.filter(
      (payment) =>
        String(payment.invoiceId).includes(query) ||
        String(payment.paymentId).includes(query) ||
        payment.patientName?.toLowerCase().includes(query) ||
        payment.method.toLowerCase().includes(query)
    );
  }, [payments, logsSearchQuery, logsPatientFilterId]);

  const patientPaymentLogs = useMemo(() => {
    if (!paymentPatientId) return [];
    return payments.filter((payment) => payment.patientId === Number(paymentPatientId));
  }, [payments, paymentPatientId]);

  const selectedPaymentInvoice = useMemo(() => {
    if (!paymentInvoiceId) return null;
    return invoices.find((invoice) => String(invoice.invoiceId) === paymentInvoiceId) || null;
  }, [invoices, paymentInvoiceId]);

  const isMedicineDispenseInvoice = useMemo(() => {
    if (!selectedPaymentInvoice?.lineItemsJson) return false;
    return selectedPaymentInvoice.lineItemsJson.includes("PHARMACY_DISPENSE");
  }, [selectedPaymentInvoice]);

  const maxPayableAmount = useMemo(() => {
    if (!selectedPaymentInvoice) return 0;
    return getRemainingAmount(selectedPaymentInvoice);
  }, [selectedPaymentInvoice, payments]);

  const logsPaginationData = useMemo(() => {
    const totalItems = filteredPaymentLogs.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / logsItemsPerPage));
    const safeCurrentPage = Math.min(logsCurrentPage, totalPages);
    const startIdx = (safeCurrentPage - 1) * logsItemsPerPage;
    const endIdx = startIdx + logsItemsPerPage;
    const paginatedLogs = filteredPaymentLogs.slice(startIdx, endIdx);

    return {
      paginatedLogs,
      totalPages,
      totalItems,
      safeCurrentPage,
    };
  }, [filteredPaymentLogs, logsCurrentPage, logsItemsPerPage]);

  useEffect(() => {
    setLogsCurrentPage(1);
  }, [logsSearchQuery, logsPatientFilterId]);

  useEffect(() => {
    if (logsCurrentPage !== logsPaginationData.safeCurrentPage) {
      setLogsCurrentPage(logsPaginationData.safeCurrentPage);
    }
  }, [logsCurrentPage, logsPaginationData.safeCurrentPage]);

  // Add the current draft entry to the list of service items
  function addServiceItem() {
    const code = draftCode.trim();
    if (!code) {
      toast.error("Please enter a service item code.");
      return;
    }

    // Only allow codes that exist in the service item catalog
    const catalogItem = serviceItemCatalog.find(
      (s) => s.code?.trim().toUpperCase() === code.toUpperCase()
    );
    if (!catalogItem) {
      toast.error(`"${code}" is not a valid service item code.`);
      return;
    }

    // Prevent adding the same code twice; merge quantities instead
    const qty = draftQty === "" || Number(draftQty) < 1 ? 1 : Number(draftQty);
    const normalizedCode = catalogItem.code;
    const existingIndex = serviceItems.findIndex(
      (item) => item.serviceItemCode.trim().toUpperCase() === normalizedCode.toUpperCase()
    );
    if (existingIndex !== -1) {
      setServiceItems((prev) =>
        prev.map((item, i) =>
          i === existingIndex
            ? { ...item, quantity: (item.quantity === "" ? 0 : Number(item.quantity)) + qty }
            : item
        )
      );
    } else {
      setServiceItems((prev) => [...prev, { serviceItemCode: normalizedCode, quantity: qty }]);
    }
    setDraftCode("");
    setDraftQty(1);
  }

  function removeServiceItem(index: number) {
    setServiceItems(serviceItems.filter((_, i) => i !== index));
  }

  // Handle Form Submission (Create or Update)
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!patientId) return;

    const formattedItems = serviceItems
      .filter(item => item.serviceItemCode.trim())
      .map(item => ({
        serviceItemCode: item.serviceItemCode.trim(),
        quantity: item.quantity === "" ? 1 : Number(item.quantity)
      }));

    if (formattedItems.length === 0) {
      toast.error("Please add at least one service item code.");
      return;
    }

    const formattedIssuedAt = (issuedAt && typeof issuedAt === "string" && issuedAt.includes("T") && issuedAt.length === 16) ? `${issuedAt}:00` : (issuedAt || "");
    const formattedDueDate = (dueDate && typeof dueDate === "string" && dueDate.includes("T") && dueDate.length === 16) ? `${dueDate}:00` : (dueDate || "");

    if (new Date(formattedDueDate).getTime() <= new Date(formattedIssuedAt).getTime()) {
      toast.error("Due date must be after the issue date.");
      return;
    }

    try {
      const payload = {
        patientId: Number(patientId),
        encounterId: encounterId ? Number(encounterId) : null,
        issuedAt: formattedIssuedAt,
        dueDate: formattedDueDate,
        status: status,
        serviceItems: formattedItems
      };

      if (editingInvoice) {
        await updateInvoice(editingInvoice.invoiceId, payload);
        toast.success("Invoice updated successfully.");
      } else {
        await createInvoice(payload);
        toast.success("Invoice created successfully.");
      }
      
      // Reset Form
      setEditingInvoice(null);
      setServiceItems([]);
      setDraftCode("");
      setDraftQty(1);
      setEncounterId("");
      setStatus("UNPAID");
      setShowForm(false);
      loadData();
    } catch (err: any) {
      const errorMessage = err.message || (editingInvoice ? "Failed to update invoice." : "Failed to create invoice.");
      // Enhanced error handling for duplicate invoice attempts
      if (errorMessage.includes("already exists") || errorMessage.includes("duplicate")) {
        toast.error("This encounter already has an invoice. Please select a different encounter or create a new invoice.");
      } else {
        toast.error(errorMessage);
      }
    }
  }

  // Handle Invoice Void (Delete)
  async function handleVoid(invoiceId: number) {
    if (!window.confirm("Are you sure you want to delete this invoice? This cannot be undone.")) return;
    try {
      await deleteInvoice(invoiceId);
      toast.success("Invoice deleted/voided successfully.");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete invoice.");
    }
  }

  // Select Invoice for Editing
  function handleEditSelect(inv: Invoice) {
    setEditingInvoice(inv);
    setPatientId(inv.patientId);
    setEncounterId(inv.encounterId ? String(inv.encounterId) : "");
    
    setIssuedAt(formatDateForInput(inv.issuedAt));
    setDueDate(formatDateForInput(inv.dueDate));
    
    setStatus(inv.status);
    
    try {
      const parsedItems = JSON.parse(inv.lineItemsJson || "[]");
      if (parsedItems.length > 0) {
        setServiceItems(parsedItems.map((item: any) => ({
          serviceItemCode: item.serviceItemCode || item.code || "",
          quantity: item.quantity || 1
        })));
      } else {
        setServiceItems([]);
      }
    } catch {
      setServiceItems([]);
    }
    
    setShowForm(true);
  }

  function getAlreadyPaid(invoiceId: number): number {
    return payments
      .filter((payment) => payment.invoiceId === invoiceId && (payment.status === "SUCCESS" || payment.status === "COMPLETED"))
      .reduce((sum, payment) => sum + payment.amount, 0);
  }

  function getRemainingAmount(invoice: Invoice): number {
    return Math.max(0, invoice.totalAmount - getAlreadyPaid(invoice.invoiceId));
  }

  function getInvoiceDeductionRows(invoice: Invoice): { paymentId: number; method: string; paidAt: string; amount: number; remaining: number }[] {
    const invoicePayments = payments
      .filter(
        (payment) =>
          payment.invoiceId === invoice.invoiceId &&
          (payment.status === "SUCCESS" || payment.status === "COMPLETED")
      )
      .sort((a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime());

    let remaining = invoice.totalAmount;

    return invoicePayments.map((payment) => {
      remaining = Math.max(0, remaining - payment.amount);
      return {
        paymentId: payment.paymentId,
        method: payment.method,
        paidAt: payment.paidAt,
        amount: payment.amount,
        remaining,
      };
    });
  }

  function handlePaySelect(invoice: Invoice) {
    const remaining = getRemainingAmount(invoice);
    if (remaining <= 0) {
      toast("This invoice is already fully paid.");
      return;
    }

    setPaymentInvoiceId(String(invoice.invoiceId));
    setPaymentPatientId(String(invoice.patientId));
    setPaymentPatientName(invoice.patientName || `Patient #${invoice.patientId}`);
    setPaymentAmount(remaining);
    setPaymentMethod("CASH");
    setPaymentPaidAt(today);
    setShowForm(false);
    setShowLogsPage(false);
    setShowPaymentForm(true);
  }

  function closePaymentForm() {
    setShowPaymentForm(false);
    setPaymentInvoiceId("");
    setPaymentPatientId("");
    setPaymentPatientName("");
    setPaymentAmount(0);
    setPaymentMethod("CASH");
    setPaymentPaidAt(today);
  }

  function openLogsPage() {
    setShowLogsPage(true);
    setShowForm(false);
    setShowPaymentForm(false);
  }

  function closeLogsPage() {
    setShowLogsPage(false);
  }

  async function submitManualPayment(event: React.FormEvent) {
    event.preventDefault();
    if (!paymentInvoiceId || !paymentPatientId || paymentAmount <= 0) return;

    const amountToSubmit = isMedicineDispenseInvoice && selectedPaymentInvoice
      ? getRemainingAmount(selectedPaymentInvoice)
      : paymentAmount;

    if (amountToSubmit <= 0) return;

    if (amountToSubmit > maxPayableAmount) {
      toast.error(`Payment amount cannot exceed ${money(maxPayableAmount)}.`);
      return;
    }

    const formattedPaidAt = paymentPaidAt.includes("T") && paymentPaidAt.length === 16 ? `${paymentPaidAt}:00` : paymentPaidAt;

    try {
      await createPayment({
        invoiceId: Number(paymentInvoiceId),
        patientId: Number(paymentPatientId),
        amount: amountToSubmit,
        method: paymentMethod,
        paidAt: formattedPaidAt,
        status: paymentStatus,
      });

      toast.success("Payment recorded successfully.");
      closePaymentForm();
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment.");
    }
  }

  // Parse invoice line items
  function getInvoiceItems(invoice: Invoice): LineItem[] {
    try {
      return JSON.parse(invoice.lineItemsJson || "[]");
    } catch {
      return [{ name: invoice.lineItemsJson || "Consultation Service", unitPrice: invoice.subtotal, quantity: 1, amount: invoice.subtotal }];
    }
  }

  const isInvoiceFormPage = showForm;
  const isPaymentPage = showPaymentForm;
  const canDeleteInvoice = user?.role !== "RECEPTION";

  function handleBackToMainPage() {
    setEditingInvoice(null);
    setServiceItems([]);
    setDraftCode("");
    setDraftQty(1);
    setEncounterId("");
    setStatus("UNPAID");
    setShowForm(false);
  }

  if (loading && invoices.length === 0) {
    return <div className="page-spinner"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Invoice Management</h1>
          <p>Generate invoice records, manage client billing lists, and configure itemized rates.</p>
        </div>
      </div>

      <Panel
        title={isInvoiceFormPage ? (editingInvoice ? `Update Invoice` : "Create New Invoice") : isPaymentPage ? "Record Payment" : showLogsPage ? "Payment Logs" : "Invoices List"}
        actions={
          isInvoiceFormPage ? (
            <button className="btn btn-secondary" onClick={handleBackToMainPage}>
              <ArrowLeft size={16} style={{ marginRight: "6px", verticalAlign: "text-bottom" }} />
              Back
            </button>
          ) : isPaymentPage ? (
            <button className="btn btn-secondary" onClick={closePaymentForm}>
              <ArrowLeft size={16} style={{ marginRight: "6px", verticalAlign: "text-bottom" }} />
              Back
            </button>
          ) : showLogsPage ? (
            <button className="btn btn-secondary" onClick={closeLogsPage}>
              <ArrowLeft size={16} style={{ marginRight: "6px", verticalAlign: "text-bottom" }} />
              Back
            </button>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              <button className="btn btn-primary" onClick={() => {
                if (showForm) {
                  setEditingInvoice(null);
                  setServiceItems([]);
                  setDraftCode("");
                  setDraftQty(1);
                  setEncounterId("");
                  setStatus("UNPAID");
                  setShowForm(false);
                } else {
                  setIssuedAt(nowLocalForInput());
                  setDueDate(addDaysLocalForInput(7));
                  setShowForm(true);
                }
              }}>
                {showForm ? "Cancel" : "+ New Invoice"}
              </button>
              <button className="btn btn-secondary" onClick={openLogsPage}>
                Show Logs
              </button>
            </div>
          )
        }
      >
        {showForm && (
          <form onSubmit={submit} style={{ background: "var(--color-bg)", padding: "24px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontWeight: 600 }}>{editingInvoice ? `Edit Invoice #${editingInvoice.invoiceId}` : "Create New Invoice"}</h3>
              <button type="button" style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--color-text-muted)" }} onClick={() => {
                setEditingInvoice(null);
                setServiceItems([]);
                setDraftCode("");
                setDraftQty(1);
                setEncounterId("");
                setStatus("UNPAID");
                setShowForm(false);
              }}>&times;</button>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Select Patient *</label>
                <select className="form-select" value={patientId} onChange={(e) => {
                  const pid = Number(e.target.value);
                  setPatientId(pid);
                  setEncounterId("");
                }} required>
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p) => (
                    <option key={p.patientId} value={p.patientId}>
                      {p.name} ({p.mrn})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Related Encounter</label>
                <select className="form-select" value={encounterId} onChange={(e) => setEncounterId(e.target.value)}>
                  <option value="">-- None / General --</option>
                  {encountersWithoutInvoices.map((e) => (
                    <option key={e.encounterId} value={e.encounterId}>
                      Encounter #{e.encounterId} - {e.visitType} ({e.chiefComplaint || "No details"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Issue Date *</label>
                <input className="form-input" type="datetime-local" value={issuedAt} readOnly required />
              </div>

              <div className="form-group">
                <label className="form-label">Due Date *</label>
                <input className="form-input" type="datetime-local" value={dueDate} min={issuedAt} onChange={(e) => setDueDate(e.target.value)} required />
              </div>
            </div>

            {/* <div className="form-row">
              <div className="form-group">
                <label className="form-label">Tax (Fixed 10% of Subtotal)</label>
                <input className="form-input" type="text" value={money(liveTax)} readOnly disabled />
                <small style={{ color: "var(--color-text-muted)", fontSize: "12px" }}>
                  Tax is automatically applied at 10% of the subtotal and cannot be changed.
                </small>
              </div>
            </div> */}

            <div style={{ marginTop: "20px" }}>
              <h4 style={{ marginBottom: "12px", fontSize: "14px", fontWeight: 600 }}>Service Items</h4>

              {/* Stationary add-item row: stays in place; added items appear in the table below */}
              <div className="item-row" style={{ display: "grid", gridTemplateColumns: "3fr 1.5fr auto", alignItems: "end", gap: "16px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Service Item Code</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="e.g. CONSULTATION, XRAY-01, LAB-05"
                    value={draftCode}
                    list="service-item-codes"
                    onChange={(e) => setDraftCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addServiceItem();
                      }
                    }}
                  />
                  <datalist id="service-item-codes">
                    {serviceItemCatalog.map((s) => (
                      <option key={s.serviceItemId} value={s.code}>{s.name}</option>
                    ))}
                  </datalist>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Quantity</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="1"
                    min="1"
                    value={draftQty}
                    onChange={(e) => setDraftQty(e.target.value === "" ? "" : Number(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addServiceItem();
                      }
                    }}
                  />
                </div>

                <button type="button" className="btn btn-primary" style={{ height: "42px" }} onClick={addServiceItem}>
                  + Add Item
                </button>
              </div>

              {/* Separate table listing the added service items, each with a Remove button */}
              <div style={{ marginTop: "16px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ background: "var(--color-surface)", textAlign: "left" }}>
                      <th style={{ padding: "10px 12px" }}>Code</th>
                      <th style={{ padding: "10px 12px" }}>Name</th>
                      <th style={{ padding: "10px 12px", textAlign: "right" }}>Unit Price</th>
                      <th style={{ padding: "10px 12px", textAlign: "right" }}>Qty</th>
                      <th style={{ padding: "10px 12px", textAlign: "right" }}>Amount</th>
                      <th style={{ padding: "10px 12px", textAlign: "center" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "16px 12px", textAlign: "center", color: "var(--color-text-muted)" }}>
                          No service items added yet. Use the row above to add items.
                        </td>
                      </tr>
                    ) : (
                      serviceItems.map((item, idx) => {
                        const code = item.serviceItemCode.trim().toUpperCase();
                        const catalogItem = serviceItemCatalog.find((s) => s.code?.trim().toUpperCase() === code);
                        const unitPrice = catalogItem?.price;
                        const qty = item.quantity === "" ? 0 : Number(item.quantity);
                        return (
                          <tr key={idx} style={{ borderTop: "1px solid var(--color-border)" }}>
                            <td style={{ padding: "10px 12px", fontWeight: 600 }}>{item.serviceItemCode}</td>
                            <td style={{ padding: "10px 12px" }}>{catalogItem?.name || "—"}</td>
                            <td style={{ padding: "10px 12px", textAlign: "right" }}>{unitPrice != null ? money(unitPrice) : "—"}</td>
                            <td style={{ padding: "10px 12px", textAlign: "right" }}>{item.quantity}</td>
                            <td style={{ padding: "10px 12px", textAlign: "right" }}>{unitPrice != null ? money(unitPrice * qty) : "—"}</td>
                            <td style={{ padding: "10px 12px", textAlign: "center" }}>
                              <button type="button" className="btn btn-danger btn-sm" onClick={() => removeServiceItem(idx)}>
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ marginTop: "20px", padding: "16px", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", maxWidth: "320px", marginLeft: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px" }}>
                <span>Subtotal:</span>
                <span>{money(liveSubtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px" }}>
                <span>Tax (10%):</span>
                <span>{money(liveTax)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid var(--color-border)", fontWeight: 600 }}>
                <span>Total:</span>
                <span>{money(liveTotal)}</span>
              </div>
            </div>

            <div style={{ marginTop: "16px", fontSize: "12px", color: "var(--color-text-muted)" }}>
              * Note: Totals shown are a live preview based on the entered service codes. A fixed 10% tax is applied to the subtotal and the final amounts are confirmed by the server. Codes not found in the catalog are excluded from the preview.
            </div>

            <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
              <button type="submit" className="btn btn-primary">{editingInvoice ? "Save Changes" : "Create Invoice"}</button>
              <button type="button" className="btn btn-secondary" onClick={() => {
                setEditingInvoice(null);
                setServiceItems([]);
                setDraftCode("");
                setDraftQty(1);
                setEncounterId("");
                setStatus("UNPAID");
                setShowForm(false);
              }}>Cancel</button>
            </div>
          </form>
        )}

        {!isInvoiceFormPage && !showLogsPage && !isPaymentPage && (
          <>
            <Table
              columns={["Invoice ID", "Patient", "Issued On", "Total Amount", "Status", "Actions"]}
              rows={paginationData.paginatedInvoices.map((inv) => [
                `#${inv.invoiceId}`,
                <div key={inv.invoiceId}>
                  <strong className="cell-main">{inv.patientName || `Patient #${inv.patientId}`}</strong>
                  <span className="cell-sub" style={{ display: "block" }}>
                    {patients.find((p) => p.patientId === inv.patientId)?.mrn || "No MRN"}
                  </span>
                </div>,
                date(inv.issuedAt),
                <strong>{money(inv.totalAmount)}</strong>,
                <StatusBadge key={`badge-${inv.invoiceId}`} status={inv.status} />,
                <div className="actions-cell" key={`actions-${inv.invoiceId}`}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setSelectedInvoice(inv)}>
                    View
                  </button>
                  {inv.status !== "PAID" && inv.status !== "CANCELLED" && (
                    <>
                      {!inv.lineItemsJson?.includes("PHARMACY_DISPENSE") ? (
                        <button className="btn btn-secondary btn-sm" style={{ border: "1px solid var(--color-warning, #eab308)", color: "var(--color-warning, #eab308)" }} onClick={() => handleEditSelect(inv)}>
                          <Pencil size={14} style={{ marginRight: "1px", verticalAlign: "text-bottom" }} />
                          Edit
                        </button>
                      ) : (
                        <button className="btn btn-secondary btn-sm" style={{ visibility: "hidden" }} aria-hidden="true" tabIndex={-1}>
                          <Pencil size={14} style={{ marginRight: "1px", verticalAlign: "text-bottom" }} />
                          Edit
                        </button>
                      )}
                      <button className="btn btn-primary btn-sm" onClick={() => handlePaySelect(inv)}>
                        Record Payment
                      </button>
                      {canDeleteInvoice && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleVoid(inv.invoiceId)}>
                          <Trash2 size={14} style={{ verticalAlign: "text-bottom" }} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              ])}
            />

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalPages={paginationData.totalPages}
              totalItems={paginationData.totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(items) => {
                setItemsPerPage(items);
                setCurrentPage(1);
              }}
            />
          </>
        )}

        {isPaymentPage && (
          <div className="payment-workspace">
            <div className="payment-workspace-left">
              <div className="payment-workspace-header">
                <h3>Record Manual Payment</h3>
              </div>

              <form onSubmit={submitManualPayment} className="payment-inline-form">
                <div className="form-row">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Invoice ID</label>
                    <input className="form-input" type="text" value={`#${paymentInvoiceId}`} readOnly style={{ background: "var(--color-border-light)", cursor: "not-allowed" }} />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Patient Name</label>
                    <input className="form-input" type="text" value={paymentPatientName} readOnly style={{ background: "var(--color-border-light)", cursor: "not-allowed" }} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Payment Amount (₹) *</label>
                    <input
                      className="form-input"
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*\.?[0-9]*"
                      max={maxPayableAmount}
                      value={isMedicineDispenseInvoice && selectedPaymentInvoice ? getRemainingAmount(selectedPaymentInvoice) : (paymentAmount || "")}
                      onChange={(e) => {
                        if (isMedicineDispenseInvoice) return;
                        const value = e.target.value;
                        if (value === "") {
                          setPaymentAmount(0);
                          return;
                        }
                        if (!/^\d*\.?\d*$/.test(value)) return;
                        const parsedValue = Number(value);
                        if (parsedValue > maxPayableAmount) return;
                        setPaymentAmount(parsedValue);
                      }}
                      readOnly={isMedicineDispenseInvoice}
                      style={isMedicineDispenseInvoice ? { background: "var(--color-border-light)", cursor: "not-allowed" } : undefined}
                      required
                    />
                    {isMedicineDispenseInvoice && (
                      <div style={{ marginTop: "6px", fontSize: "12px", color: "var(--color-text-secondary)" }}>
                        For dispensed medicine invoices, payment amount is locked to full remaining balance.
                      </div>
                    )}
                    {!isMedicineDispenseInvoice && (
                      <div style={{ marginTop: "6px", fontSize: "12px", color: "var(--color-text-secondary)" }}>
                        Maximum payable amount: {money(maxPayableAmount)}
                      </div>
                    )}
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Payment Method</label>
                    <select className="form-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                      <option value="CASH">CASH</option>
                      <option value="CARD">CARD</option>
                      <option value="UPI">UPI</option>
                      <option value="INSURANCE">INSURANCE</option>
                      <option value="BANK_TRANSFER">BANK TRANSFER</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Paid At *</label>
                  <input className="form-input" type="datetime-local" value={paymentPaidAt} onChange={(e) => setPaymentPaidAt(e.target.value)} required />
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                  <button type="submit" className="btn btn-primary" disabled={paymentAmount <= 0 || (!isMedicineDispenseInvoice && paymentAmount > maxPayableAmount)}>Record Payment</button>
                  <button type="button" className="btn btn-secondary" onClick={closePaymentForm}>Cancel</button>
                </div>
              </form>
            </div>

            <div className="payment-workspace-right">
              <div className="payment-workspace-header">
                <h3>Patient Payment Logs</h3>
              </div>
              <Table
                columns={["Payment ID", "Invoice ID", "Amount Paid", "Method", "Paid At", "Status"]}
                rows={patientPaymentLogs.map((payment) => [
                  `#${payment.paymentId}`,
                  `#${payment.invoiceId}`,
                  <strong>{money(payment.amount)}</strong>,
                  <span key={`patient-method-${payment.paymentId}`} style={{ fontWeight: 600 }}>{payment.method}</span>,
                  date(payment.paidAt),
                  <StatusBadge key={`patient-badge-${payment.paymentId}`} status={payment.status || "SUCCESS"} />
                ])}
              />
            </div>
          </div>
        )}

        {showLogsPage && (
          <>
            <div className="filters-bar" style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <div className="form-group" style={{ marginBottom: 0, minWidth: "260px" }}>
                <label className="form-label">Filter by Patient</label>
                <select className="form-select" value={logsPatientFilterId} onChange={(e) => setLogsPatientFilterId(e.target.value)}>
                  <option value="">All Patients</option>
                  {patients.map((patient) => (
                    <option key={patient.patientId} value={patient.patientId}>
                      {patient.name} ({patient.mrn})
                    </option>
                  ))}
                </select>
              </div>

              <div className="header-search search-input" style={{ flex: 1, maxWidth: "400px", marginTop: "22px" }}>
                <Search className="search-icon" size={16} />
                <input
                  className="form-input"
                  type="text"
                  placeholder="Search payments by Patient Name, Invoice ID, or Method..."
                  value={logsSearchQuery}
                  onChange={(e) => setLogsSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <Table
              columns={["Payment ID", "Invoice ID", "Patient Name", "Amount Paid", "Method", "Paid At", "Status"]}
              rows={logsPaginationData.paginatedLogs.map((payment) => [
                `#${payment.paymentId}`,
                `#${payment.invoiceId}`,
                payment.patientName || `Patient #${payment.patientId}`,
                <strong>{money(payment.amount)}</strong>,
                <span key={`method-${payment.paymentId}`} style={{ fontWeight: 600 }}>{payment.method}</span>,
                date(payment.paidAt),
                <StatusBadge key={`badge-${payment.paymentId}`} status={payment.status || "SUCCESS"} />
              ])}
            />

            <Pagination
              currentPage={logsPaginationData.safeCurrentPage}
              totalPages={logsPaginationData.totalPages}
              totalItems={logsPaginationData.totalItems}
              itemsPerPage={logsItemsPerPage}
              onPageChange={setLogsCurrentPage}
              onItemsPerPageChange={(items) => {
                setLogsItemsPerPage(items);
                setLogsCurrentPage(1);
              }}
            />
          </>
        )}

        {selectedInvoice && (
          <Modal isOpen={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} title={`Invoice Details #${selectedInvoice.invoiceId}`}>
            <div className="receipt">
              <div className="receipt-header">
                <div>
                  <span className="receipt-logo">ClinicFlow</span>
                  <span style={{ display: "block", color: "var(--color-text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>HEALTHCARE FINANCE</span>
                </div>
                <div className="receipt-meta">
                  <span className="receipt-title">Invoice Receipt</span>
                  <span>Invoice ID: #{selectedInvoice.invoiceId}</span>
                  <span>Date: {formatDateForDisplay(selectedInvoice.issuedAt)}</span>
                  <span>Due Date: {formatDateForDisplay(selectedInvoice.dueDate)}</span>
                </div>
              </div>

              <div className="receipt-info-grid">
                <div className="receipt-info-block">
                  <span>BILLED TO:</span>
                  <strong>{selectedInvoice.patientName || `Patient ID: ${selectedInvoice.patientId}`}</strong>
                  <span style={{ display: "block", fontSize: "12px", color: "var(--color-text)", fontWeight: "normal", marginTop: "4px" }}>
                    MRN: {patients.find((p) => p.patientId === selectedInvoice.patientId)?.mrn || "N/A"}
                  </span>
                  <span style={{ display: "block", fontSize: "12px", color: "var(--color-text-secondary)", fontWeight: "normal" }}>
                    Insurance ID: {patients.find((p) => p.patientId === selectedInvoice.patientId)?.insuranceId || "None"}
                  </span>
                </div>
                
                <div className="receipt-info-block" style={{ textAlign: "right" }}>
                  <span>STATUS:</span>
                  <div style={{ marginTop: "4px" }}>
                    <span
                      className={`receipt-status-chip ${
                        ["PAID", "SUCCESS", "COMPLETED"].includes((selectedInvoice.status || "").toUpperCase())
                          ? "receipt-status-success"
                          : ["UNPAID", "PENDING", "PARTIALLY_PAID"].includes((selectedInvoice.status || "").toUpperCase())
                          ? "receipt-status-warning"
                          : ["VOID", "CANCELLED", "FAILED", "OVERDUE"].includes((selectedInvoice.status || "").toUpperCase())
                          ? "receipt-status-danger"
                          : "receipt-status-neutral"
                      }`}
                    >
                      {selectedInvoice.status}
                    </span>
                  </div>
                  {selectedInvoice.encounterId && (
                    <span style={{ display: "block", fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "8px" }}>
                      Encounter reference: #{selectedInvoice.encounterId}
                    </span>
                  )}
                </div>
              </div>

              <table className="receipt-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Description</th>
                    <th style={{ textAlign: "right" }}>Unit Price</th>
                    <th style={{ textAlign: "center" }}>Qty</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {getInvoiceItems(selectedInvoice).map((item, index) => (
                    <tr key={index}>
                      <td>{item.name || "General Healthcare Service"}</td>
                      <td style={{ textAlign: "right" }}>{money(item.unitPrice)}</td>
                      <td style={{ textAlign: "center" }}>{item.quantity}</td>
                      <td style={{ textAlign: "right" }}>{money(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="receipt-summary">
                <div className="receipt-summary-row">
                  <span>Subtotal:</span>
                  <span>{money(selectedInvoice.subtotal)}</span>
                </div>
                <div className="receipt-summary-row">
                  <span>Tax:</span>
                  <span>{money(selectedInvoice.taxes)}</span>
                </div>
                <div className="receipt-summary-row" style={{ color: "var(--color-danger)" }}>
                  <span>Paid (Deducted):</span>
                  <span>-{money(getAlreadyPaid(selectedInvoice.invoiceId))}</span>
                </div>
                <div className="receipt-summary-row">
                  <span>Remaining:</span>
                  <span>{money(getRemainingAmount(selectedInvoice))}</span>
                </div>
                <div className="receipt-summary-row total">
                  <span>Total Amount:</span>
                  <span>{money(selectedInvoice.totalAmount)}</span>
                </div>
              </div>

              <div style={{ marginTop: "16px" }}>
                <h4 style={{ marginBottom: "10px", fontSize: "14px", fontWeight: 600 }}>Payment Deductions (This Invoice)</h4>
                <table className="receipt-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>Payment Ref</th>
                      <th style={{ textAlign: "left" }}>Method</th>
                      <th style={{ textAlign: "left" }}>Paid At</th>
                      <th style={{ textAlign: "right" }}>Deducted</th>
                      <th style={{ textAlign: "right" }}>Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getInvoiceDeductionRows(selectedInvoice).length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", color: "var(--color-text-secondary)" }}>No payments recorded for this invoice yet.</td>
                      </tr>
                    ) : (
                      getInvoiceDeductionRows(selectedInvoice).map((entry) => (
                        <tr key={entry.paymentId}>
                          <td>#{entry.paymentId}</td>
                          <td>{entry.method}</td>
                          <td>{date(entry.paidAt)}</td>
                          <td style={{ textAlign: "right", color: "var(--color-danger)", fontWeight: 700 }}>-{money(entry.amount)}</td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>{money(entry.remaining)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="receipt-footer">
                <p>Thank you for choosing ClinicFlow Services.</p>
                <p>For billing queries, please contact billing@clinicflow.com.</p>
              </div>

              <div className="modal-footer" style={{ marginTop: "24px", padding: 0 }}>
                <button className="btn btn-primary" onClick={() => window.print()}>Print Receipt</button>
                <button className="btn btn-secondary" onClick={() => setSelectedInvoice(null)}>Close</button>
              </div>
            </div>
          </Modal>
        )}
      </Panel>
    </div>
  );
}