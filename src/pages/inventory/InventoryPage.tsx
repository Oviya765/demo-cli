import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import type { InventoryResponseDto, MedicationResponseDto } from "../../models/types";
import { 
  getAllInventory, 
  getLowStock, 
  getExpiringInventory, 
  getExpiredInventory, 
  createInventoryItem, 
  adjustStock, 
  deleteInventoryItem,
  getAllMedications
} from "../../services/inventoryService";
import { Panel, Table, StatusBadge, Modal } from "../../components/ui/components";
import "../../assets/styles/inventory/InventoryPage.css";

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"all" | "low" | "expiring">("all");
  const [inventoryList, setInventoryList] = useState<InventoryResponseDto[]>([]);
  const [medications, setMedications] = useState<MedicationResponseDto[]>([]);
  const [summary, setSummary] = useState<{ total: number; low: number; expired: number; expiring: number }>({
    total: 0,
    low: 0,
    expired: 0,
    expiring: 0
  });

  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
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

  // Adjust Form Fields
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState("RESTOCK");

  const loadData = async () => {
    try {
      setLoading(true);
      const [allStock, meds, lowList, expiringList, expiredList] = await Promise.all([
        getAllInventory(),
        getAllMedications(),
        getLowStock(),
        getExpiringInventory(30),
        getExpiredInventory()
      ]);

      setInventoryList(allStock);
      setMedications(meds);
      
      setSummary({
        total: allStock.length,
        low: lowList.length,
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

  const displayedList = useMemo(() => {
    if (activeTab === "low") {
      return inventoryList.filter(item => item.quantity <= 50 || item.status === "LOW_STOCK" || item.status === "OUT_OF_STOCK");
    }
    if (activeTab === "expiring") {
      return inventoryList.filter(item => item.expired || new Date(item.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    }
    return inventoryList;
  }, [inventoryList, activeTab]);

  async function handleCreateBatch(e: React.FormEvent) {
    e.preventDefault();
    if (!medicationId || !batchNumber || quantity <= 0 || !expiryDate) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      await createInventoryItem({
        medicationId: Number(medicationId),
        batchNumber,
        quantity,
        unit,
        expiryDate: new Date(expiryDate).toISOString(),
        location,
        costPrice
      });

      toast.success("Inventory batch added successfully.");
      setShowForm(false);
      
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

  async function handleAdjustStock(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem || adjustQty === 0) return;

    try {
      await adjustStock(selectedItem.inventoryId, {
        quantity: adjustQty,
        unit: adjustReason // using 'unit' field to pass reason in RequestDto if backend expects it in PharmacyRequestDto
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

  async function handleDeleteItem(id: number) {
    if (!window.confirm("Are you sure you want to delete this inventory item?")) return;
    try {
      await deleteInventoryItem(id);
      toast.success("Inventory item deleted.");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete item.");
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
        <button className={`tab ${activeTab === "expiring" ? "active" : ""}`} onClick={() => setActiveTab("expiring")}>Expiring / Expired</button>
      </div>

      <Panel
        title="Stock Ledger"
        actions={
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ Add Stock Batch"}
          </button>
        }
      >
        {showForm && (
          <form onSubmit={handleCreateBatch} style={{ background: "var(--color-bg)", padding: "24px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontWeight: 600 }}>Add Stock Batch</h3>
              <button type="button" style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--color-text-muted)" }} onClick={() => setShowForm(false)}>&times;</button>
            </div>

            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Select Medication *</label>
                <select className="form-select" value={medicationId} onChange={(e) => setMedicationId(e.target.value)} required>
                  <option value="">-- Select Medication --</option>
                  {medications.map(med => (
                    <option key={med.medId} value={med.medId}>{med.name} ({med.code})</option>
                  ))}
                </select>
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
                <input className="form-input" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Storage Location</label>
                <input className="form-input" type="text" placeholder="e.g. Aisle B, Shelf 4" value={location} onChange={(e) => setLocation(e.target.value)} />
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
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        )}

        <Table
          columns={["Medication", "Batch Code", "Current Qty", "Unit", "Storage Location", "Expiry", "Status", "Actions"]}
          rows={displayedList.map(item => [
            <div key={item.inventoryId}>
              <strong className="cell-main">{item.medicationName}</strong>
              <span className="cell-sub" style={{ display: "block" }}>Code: {item.medicationCode}</span>
            </div>,
            item.batchNumber,
            <strong>{item.quantity}</strong>,
            item.unit,
            item.location || "N/A",
            <span key={`expiry-${item.inventoryId}`} style={{ color: item.expired ? "var(--color-danger)" : "inherit" }}>
              {new Date(item.expiryDate).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
              {item.expired && " (EXPIRED)"}
            </span>,
            <StatusBadge key={`badge-${item.inventoryId}`} status={item.status} />,
            <div className="actions-cell" key={`actions-${item.inventoryId}`}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedItem(item); setShowAdjustModal(true); }}>
                Adjust Qty
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteItem(item.inventoryId)}>
                Delete
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
