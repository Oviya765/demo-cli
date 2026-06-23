import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import type { InventoryResponseDto, MedicationResponseDto } from "../../models/types";
import { 
  getAllInventory, 
  getExpiringInventory, 
  getExpiredInventory, 
  createInventoryItem, 
  createMedication,
  adjustStock, 
  getAllMedications,
  deleteInventoryItem
} from "../../services/inventoryService";
import { Panel, Table, StatusBadge, Modal } from "../../components/ui/components";
import "../../assets/styles/inventory/InventoryPage.css";

// Whole days remaining until a batch expires. 0 = expires today, negative = expired.
function getDaysUntilExpiry(expiryDate: string): number {
  if (!expiryDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// A batch is expired if the backend flags it, or it expires today / in the past.
function isBatchExpired(item: InventoryResponseDto): boolean {
  return item.expired || getDaysUntilExpiry(item.expiryDate) <= 0;
}

// Displays storage locations in aisle terms. Any legacy "Pharmacy Rack" / "Rack" /
// "Shelf" wording coming from the backend is normalised to an "Aisle ..." label.
function formatStorageLocation(location?: string | null): string {
  const raw = (location || "").trim();
  if (!raw) return "N/A";

  // Already expressed as an aisle.
  if (/aisle/i.test(raw)) return raw;

  // Pull a trailing identifier (letter or number) if one is present, e.g.
  // "Pharmacy Rack 3" -> "Aisle 3", "Rack B" -> "Aisle B".
  const match = raw.match(/(?:pharmacy\s*rack|rack|shelf|bay|bin)\s*[-#]?\s*([A-Za-z0-9]+)/i);
  if (match) {
    return `Aisle ${match[1].toUpperCase()}`;
  }

  // Generic fallback: swap the rack/shelf wording for "Aisle".
  if (/pharmacy\s*rack|rack|shelf|bay|bin/i.test(raw)) {
    return raw.replace(/pharmacy\s*rack|rack|shelf|bay|bin/gi, "Aisle");
  }

  return raw;
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"all" | "low" | "out" | "expiring" | "expired">("all");
  const [inventoryList, setInventoryList] = useState<InventoryResponseDto[]>([]);
  const [medications, setMedications] = useState<MedicationResponseDto[]>([]);
  const [summary, setSummary] = useState<{ total: number; low: number; outOfStock: number; expired: number; expiring: number }>({
    total: 0,
    low: 0,
    outOfStock: 0,
    expired: 0,
    expiring: 0
  });
  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);
  const [showStockForm, setShowStockForm] = useState(false);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryResponseDto | null>(null);

  // Form Fields for Add Batch
  const [medicationId, setMedicationId] = useState<string>("");
  const [batchNumber, setBatchNumber] = useState("");
  const [quantity, setQuantity] = useState<number>(0);
  const [unit, setUnit] = useState("TABLET");
  const [expiryDate, setExpiryDate] = useState("");
  const [location, setLocation] = useState("");
  const [costPrice, setCostPrice] = useState<number>(0);

  // Form Fields for New Medication
  const [newMedicationCode, setNewMedicationCode] = useState("");
  const [newMedicationName, setNewMedicationName] = useState("");
  const [newMedicationFormulation, setNewMedicationFormulation] = useState("TABLET");
  const [newMedicationStrength, setNewMedicationStrength] = useState("");
  const [newMedicationAtcCode, setNewMedicationAtcCode] = useState("");
  const [newMedicationControlledFlag, setNewMedicationControlledFlag] = useState(false);

  // Adjust Form Fields
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState("RESTOCK");

  const loadData = async () => {
    try {
      setLoading(true);
      const [allStock, meds, expiringList, expiredList] = await Promise.all([
        getAllInventory(),
        getAllMedications(),
        getExpiringInventory(30),
        getExpiredInventory()
      ]);

      setInventoryList(allStock);
      setMedications(meds);
      
      setSummary({
        total: allStock.length,
        low: allStock.filter(item => item.status === "LOW_STOCK").length,
        outOfStock: allStock.filter(item => item.status === "OUT_OF_STOCK").length,
        expired: expiredList.length,
        expiring: expiringList.length
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to load inventory logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const availableMedications = useMemo(() => {
    return medications;
  }, [medications]);

  const displayedList = useMemo(() => {
    if (activeTab === "low") {
      return inventoryList.filter(item => !isBatchExpired(item) && item.status === "LOW_STOCK");
    }
    if (activeTab === "out") {
      return inventoryList.filter(item => !isBatchExpired(item) && item.status === "OUT_OF_STOCK");
    }
    if (activeTab === "expiring") {
      // Expiring soon = NOT yet expired but within the next 30 days.
      return inventoryList.filter(
        item => !isBatchExpired(item) && getDaysUntilExpiry(item.expiryDate) <= 30
      );
    }
    if (activeTab === "expired") {
      // Dedicated section that all expired batches are moved into.
      return inventoryList.filter(item => isBatchExpired(item));
    }
    // "All Stock" excludes expired batches — they live in the Expired section.
    return inventoryList.filter(item => !isBatchExpired(item));
  }, [inventoryList, activeTab]);

  const filteredList = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return displayedList;

    return displayedList.filter((item) =>
      [item.medicationName, item.medicationCode, item.batchNumber, formatStorageLocation(item.location), item.status]
        .map((value) => String(value ?? "").toLowerCase())
        .some((value) => value.includes(query))
    );
  }, [displayedList, searchTerm]);

  async function handleCreateBatch(e: React.FormEvent) {
    e.preventDefault();
    if (!medicationId || !batchNumber || quantity <= 0 || !expiryDate) {
      toast.error("Please fill in all required fields.");
      return;
    }

    // Block stocking any batch whose expiry date is today or in the past.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedExpiry = new Date(expiryDate);
    selectedExpiry.setHours(0, 0, 0, 0);
    if (selectedExpiry <= today) {
      toast.error("Expired medicines can't be stocked. Please enter a valid future expiry date.");
      return;
    }

    try {
      await createInventoryItem({
        medicationId: Number(medicationId),
        batchNumber,
        quantity,
        unit,
        expiryDate,
        location: location || "Aisle A",
        costPrice: costPrice && costPrice > 0 ? costPrice : 1.00
      });

      toast.success("Inventory batch added successfully.");
      setShowStockForm(false);
      
      // Reset Form
      setMedicationId("");
      setBatchNumber("");
      setQuantity(0);
      setUnit("TABLET");
      setExpiryDate("");
      setLocation("");
      setCostPrice(0);
      
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to add inventory batch.");
    }
  }

  async function handleCreateMedication(e: React.FormEvent) {
    e.preventDefault();
    if (!newMedicationCode || !newMedicationName || !newMedicationStrength) {
      toast.error("Please fill in all required medication fields.");
      return;
    }

    const normalizedCode = newMedicationCode.trim().toUpperCase();
    const codeExists = medications.some(
      (med) => (med.code || "").trim().toUpperCase() === normalizedCode
    );
    if (codeExists) {
      toast.error("Medication code already exists. Please use a different code.");
      return;
    }

    try {
      const createdMedication = await createMedication({
        code: normalizedCode,
        name: newMedicationName.trim(),
        formulation: newMedicationFormulation,
        strength: newMedicationStrength.trim(),
        atcCode: newMedicationAtcCode.trim() || null,
        controlledFlag: newMedicationControlledFlag
      });

      setMedications((prev) => {
        if (prev.some((med) => med.medId === createdMedication.medId)) {
          return prev;
        }
        return [...prev, createdMedication];
      });
      setMedicationId(String(createdMedication.medId));

      toast.success("Medication created successfully.");
      setShowMedicationForm(false);
      setShowStockForm(true);
      setNewMedicationCode("");
      setNewMedicationName("");
      setNewMedicationFormulation("TABLET");
      setNewMedicationStrength("");
      setNewMedicationAtcCode("");
      setNewMedicationControlledFlag(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create medication.");
    }
  }

  async function handleAdjustStock(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem || adjustQty === 0) return;

    try {
      await adjustStock(selectedItem.inventoryId, {
        quantityDelta: adjustQty,
        notes: adjustReason // using 'unit' field to pass reason in RequestDto if backend expects it in PharmacyRequestDto
      });

      toast.success("Stock level adjusted successfully.");
      setShowAdjustModal(false);
      setSelectedItem(null);
      setAdjustQty(0);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to adjust stock level.");
    }
  }

  async function handleDeleteStock(item: InventoryResponseDto) {
    const confirmed = window.confirm(
      `Delete batch ${item.batchNumber} for ${item.medicationName}? This will permanently remove this stock record.`
    );
    if (!confirmed) return;

    try {
      await deleteInventoryItem(item.inventoryId);
      setInventoryList((prev) => prev.filter((entry) => entry.inventoryId !== item.inventoryId));
      toast.success("Stock batch deleted successfully.");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete stock batch.");
    }
  }

  if (loading && inventoryList.length === 0) {
    return <div className="page-spinner"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Medication Inventory</h1>
          <p>Supervise pharmaceutical batches, monitor stock replenishment levels, and review expiry schedules.</p>
        </div>
      </div>

      {/* Dashboard KPI Summary */}
      <div className="inventory-summary">
        <div className="summary-card">
          <span className="summary-card-label">Total Batches</span>
          <strong className="summary-card-value">{summary.total}</strong>
        </div>
        <div className="summary-card alert-warning">
          <span className="summary-card-label">Low Stock Batches</span>
          <strong className="summary-card-value" style={{ color: "var(--color-warning)" }}>{summary.low}</strong>
        </div>
        <div className="summary-card alert-warning">
          <span className="summary-card-label">Out of Stock Alerts</span>
          <strong className="summary-card-value" style={{ color: "var(--color-warning)" }}>{summary.outOfStock}</strong>
        </div>
        <div className="summary-card alert-danger">
          <span className="summary-card-label">Expired Batches</span>
          <strong className="summary-card-value" style={{ color: "var(--color-danger)" }}>{summary.expired}</strong>
        </div>
        <div className="summary-card alert-success">
          <span className="summary-card-label">Expiring Soon (&lt; 30 Days)</span>
          <strong className="summary-card-value" style={{ color: "var(--color-success)" }}>{summary.expiring}</strong>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: "20px" }}>
        <button className={`tab ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")}>All Stock</button>
        <button className={`tab ${activeTab === "low" ? "active" : ""}`} onClick={() => setActiveTab("low")}>Low Stock Alerts</button>
        <button className={`tab ${activeTab === "out" ? "active" : ""}`} onClick={() => setActiveTab("out")}>Out of Stock Alerts</button>
        <button className={`tab ${activeTab === "expiring" ? "active" : ""}`} onClick={() => setActiveTab("expiring")}>Expiring Soon</button>
        <button className={`tab ${activeTab === "expired" ? "active" : ""}`} onClick={() => setActiveTab("expired")}>Expired Stock</button>
      </div>

      <Panel
        title="Stock Ledger"
        actions={
          <>
            <input
              className="form-input"
              type="text"
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ minWidth: "240px" }}
            />
            <button className="btn btn-secondary" onClick={() => setShowMedicationForm(!showMedicationForm)}>
              {showMedicationForm ? "Cancel" : "+ New Medication"}
            </button>
            <button className="btn btn-primary" onClick={() => setShowStockForm(!showStockForm)}>
              {showStockForm ? "Cancel" : "+ Add Stock Batch"}
            </button>
          </>
        }
      >
        {showMedicationForm && (
          <form onSubmit={handleCreateMedication} style={{ background: "var(--color-bg)", padding: "24px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontWeight: 600 }}>New Medication</h3>
              <button type="button" style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--color-text-muted)" }} onClick={() => setShowMedicationForm(false)}>&times;</button>
            </div>

            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Medication Code *</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. MED011"
                  list="medication-code-suggestions"
                  value={newMedicationCode}
                  onChange={(e) => setNewMedicationCode(e.target.value)}
                  required
                />
                <datalist id="medication-code-suggestions">
                  <option value="MED016" />
                  <option value="MED017" />
                  <option value="MED018" />
                  <option value="MED019" />
                  <option value="MED020" />
                </datalist>
              </div>

              <div className="form-group">
                <label className="form-label">Medication Name *</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Doxycycline"
                  list="medication-name-suggestions"
                  value={newMedicationName}
                  onChange={(e) => setNewMedicationName(e.target.value)}
                  required
                />
                <datalist id="medication-name-suggestions">
                  <option value="Doxycycline" />
                  <option value="Levocetirizine" />
                  <option value="Montelukast" />
                  <option value="Losartan" />
                  <option value="Cefixime" />
                </datalist>
              </div>

              <div className="form-group">
                <label className="form-label">Strength *</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. 100mg"
                  list="medication-strength-suggestions"
                  value={newMedicationStrength}
                  onChange={(e) => setNewMedicationStrength(e.target.value)}
                  required
                />
                <datalist id="medication-strength-suggestions">
                  <option value="5mg" />
                  <option value="10mg" />
                  <option value="20mg" />
                  <option value="50mg" />
                  <option value="100mg" />
                  <option value="250mg" />
                  <option value="500mg" />
                </datalist>
              </div>
            </div>

            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Formulation *</label>
                <input
                  className="form-input"
                  type="text"
                  list="medication-formulation-suggestions"
                  value={newMedicationFormulation}
                  onChange={(e) => setNewMedicationFormulation(e.target.value.toUpperCase())}
                  required
                />
                <datalist id="medication-formulation-suggestions">
                  <option value="TABLET" />
                  <option value="CAPSULE" />
                  <option value="SYRUP" />
                  <option value="VIAL" />
                  <option value="INJECTION" />
                  <option value="OINTMENT" />
                </datalist>
              </div>

              <div className="form-group">
                <label className="form-label">ATC Code</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. J01AA02"
                  list="medication-atc-suggestions"
                  value={newMedicationAtcCode}
                  onChange={(e) => setNewMedicationAtcCode(e.target.value.toUpperCase())}
                />
                <datalist id="medication-atc-suggestions">
                  <option value="J01AA02" />
                  <option value="R06AE09" />
                  <option value="R03DC03" />
                  <option value="C09CA01" />
                  <option value="J01DD08" />
                </datalist>
              </div>

              <div className="form-group">
                <label className="form-label">Controlled Drug</label>
                <select
                  className="form-select"
                  value={newMedicationControlledFlag ? "YES" : "NO"}
                  onChange={(e) => setNewMedicationControlledFlag(e.target.value === "YES")}
                >
                  <option value="NO">No</option>
                  <option value="YES">Yes</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: "20px", display: "flex", gap: "12px" }}>
              <button type="submit" className="btn btn-primary">Create Medication</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowMedicationForm(false)}>Cancel</button>
            </div>
          </form>
        )}

        {showStockForm && (
          <form onSubmit={handleCreateBatch} style={{ background: "var(--color-bg)", padding: "24px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontWeight: 600 }}>Add Stock Batch</h3>
              <button type="button" style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--color-text-muted)" }} onClick={() => setShowStockForm(false)}>&times;</button>
            </div>

            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Select Medication *</label>
                <select
                  className="form-select"
                  value={medicationId}
                  onChange={(e) => setMedicationId(e.target.value)}
                  required
                >
                  <option value="">-- Select Medication --</option>
                  {availableMedications.map(med => (
                    <option key={med.medId} value={med.medId}>{med.name} ({med.code})</option>
                  ))}
                </select>
                {availableMedications.length === 0 && (
                  <div style={{ color: "var(--color-warning)", fontSize: "12px", marginTop: "6px" }}>
                    No medicines available. Create a new one.
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Batch Number *</label>
                <input className="form-input" type="text" placeholder="e.g. BATCH-2026-001" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Initial Quantity *</label>
                <input className="form-input" type="number" min="1" value={quantity || ""} onChange={(e) => setQuantity(Number(e.target.value))} required />
              </div>
            </div>

            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Unit Type</label>
                <select className="form-select" value={unit} onChange={(e) => setUnit(e.target.value)}>
                  <option value="TABLET">TABLET</option>
                  <option value="CAPSULE">CAPSULE</option>
                  <option value="VIAL">VIAL</option>
                  <option value="SYRUP">SYRUP</option>
                  <option value="OINTMENT">OINTMENT</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Expiry Date *</label>
                <input className="form-input" type="date" min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]} value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Storage Location (Aisle)</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Aisle A, Shelf 4"
                  list="storage-aisle-suggestions"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
                <datalist id="storage-aisle-suggestions">
                  <option value="Aisle A" />
                  <option value="Aisle B" />
                  <option value="Aisle C" />
                  <option value="Aisle D" />
                  <option value="Aisle E" />
                  <option value="Aisle F" />
                </datalist>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Unit Cost Price (₹)</label>
                <input className="form-input" type="number" step="0.01" value={costPrice || ""} onChange={(e) => setCostPrice(Number(e.target.value))} />
              </div>
            </div>

            <div style={{ marginTop: "20px", display: "flex", gap: "12px" }}>
              <button type="submit" className="btn btn-primary">Add Batch</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowStockForm(false)}>Cancel</button>
            </div>
          </form>
        )}

        <Table
          columns={["Medication", "Batch Code", "Current Qty", "Unit", "Storage Location", "Expiry", "Status", "Actions"]}
          rows={filteredList.map(item => [
            <div key={item.inventoryId}>
              <strong className="cell-main">{item.medicationName}</strong>
              <span className="cell-sub" style={{ display: "block" }}>Code: {item.medicationCode}</span>
            </div>,
            item.batchNumber,
            <strong>{item.quantity}</strong>,
            item.unit,
            formatStorageLocation(item.location),
            <span key={`expiry-${item.inventoryId}`} style={{ color: isBatchExpired(item) ? "var(--color-danger)" : "inherit" }}>
              {new Date(item.expiryDate).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
              {isBatchExpired(item) && " (EXPIRED)"}
            </span>,
            <StatusBadge key={`badge-${item.inventoryId}`} status={item.status} />,
            <div className="actions-cell" key={`actions-${item.inventoryId}`}>
              {!isBatchExpired(item) && (
                <button
                  className="btn btn-secondary btn-sm btn-icon"
                  title="Adjust quantity"
                  aria-label="Adjust quantity"
                  onClick={() => { setSelectedItem(item); setShowAdjustModal(true); }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                </button>
              )}
              <button
                className="btn btn-danger btn-sm btn-icon"
                title="Delete batch"
                aria-label="Delete batch"
                onClick={() => handleDeleteStock(item)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            </div>
          ])}
        />

        {showAdjustModal && selectedItem && (
          <Modal isOpen={showAdjustModal} onClose={() => { setShowAdjustModal(false); setSelectedItem(null); }} title={`Adjust Stock - Batch ${selectedItem.batchNumber}`}>
            <form onSubmit={handleAdjustStock}>
              <p style={{ marginBottom: "16px", fontSize: "14px", color: "var(--color-text-secondary)" }}>
                Item: <strong>{selectedItem.medicationName}</strong> (Current Stock: {selectedItem.quantity} {selectedItem.unit}s)
              </p>
              
              <div className="form-group">
                <label className="form-label">Stock Change Quantity (Positive to add, Negative to deduct) *</label>
                <input className="form-input" type="number" placeholder="e.g. 100 or -50" value={adjustQty || ""} onChange={(e) => setAdjustQty(Number(e.target.value))} required />
              </div>

              <div className="form-group">
                <label className="form-label">Reason for Adjustment</label>
                <select className="form-select" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)}>
                  <option value="RESTOCK">Stock replenishment (Restock)</option>
                  <option value="DAMAGE">Deduction due to damage / spillage</option>
                  <option value="CORRECTION">Manual correction / Audit balance</option>
                </select>
              </div>

              <div className="modal-footer" style={{ marginTop: "24px", padding: 0 }}>
                <button type="submit" className="btn btn-primary">Save Changes</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowAdjustModal(false); setSelectedItem(null); }}>Cancel</button>
              </div>
            </form>
          </Modal>
        )}
      </Panel>
    </div>
  );
}
