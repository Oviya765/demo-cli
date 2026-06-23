import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import type { PrescriptionResponseDto, DispenseResponseDto, InventoryResponseDto } from "../../models/types";
import { getAllPrescriptions } from "../../services/prescriptionService";
import { getAllInventory } from "../../services/inventoryService";
import { getAllDispenseRecords, dispensePrescription } from "../../services/pharmacyService";
import { Panel, Table, StatusBadge, Modal, money, date } from "../../components/ui/components";
import "../../assets/styles/pharmacy/PharmacyPage.css";

// Returns the whole number of days remaining until a batch expires.
// 0 means it expires today (treated as expired), negative means already expired.
function getDaysUntilExpiry(expiryDate: string): number {
  if (!expiryDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// A batch is unusable for dispensing if the backend flags it expired
// or if it expires today / in the past.
function isBatchExpired(item: InventoryResponseDto): boolean {
  return item.expired || getDaysUntilExpiry(item.expiryDate) <= 0;
}

export default function PharmacyPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"prescriptions" | "history">("prescriptions");
  const [prescriptions, setPrescriptions] = useState<PrescriptionResponseDto[]>([]);
  const [dispenseRecords, setDispenseRecords] = useState<DispenseResponseDto[]>([]);
  const [inventory, setInventory] = useState<InventoryResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [historySearch, setHistorySearch] = useState("");
  const [queueSearch, setQueueSearch] = useState("");

  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionResponseDto | null>(null);

  // Prescription details popup (shown when a queue row is clicked).
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailPrescription, setDetailPrescription] = useState<PrescriptionResponseDto | null>(null);

  // Dispense Form state
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [dispenseQty, setDispenseQty] = useState<number>(0);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rxList, dispenseList, stockList] = await Promise.all([
        getAllPrescriptions(),
        getAllDispenseRecords(),
        getAllInventory()
      ]);
      setPrescriptions(rxList);
      setDispenseRecords(dispenseList);
      setInventory(stockList);
    } catch (err: any) {
      toast.error(err.message || "Failed to load pharmacy data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter batches matching the selected prescription's medication.
  // Expired batches are excluded entirely so they can never be dispensed.
  const availableBatches = useMemo(() => {
    if (!selectedPrescription) return [];
    return inventory.filter(
      (item) => item.medicationId === selectedPrescription.medicationId && item.quantity > 0 && !isBatchExpired(item)
    );
  }, [selectedPrescription, inventory]);

  const selectedBatch = useMemo(() => {
    if (!selectedBatchId) return null;
    return inventory.find((item) => item.inventoryId === Number(selectedBatchId)) || null;
  }, [inventory, selectedBatchId]);

  // Days remaining for the currently selected batch (null when no batch chosen).
  const selectedBatchDaysToExpiry = useMemo(
    () => (selectedBatch ? getDaysUntilExpiry(selectedBatch.expiryDate) : null),
    [selectedBatch]
  );

  // The most units we can dispense from the selected batch, limited by both the
  // physical stock on hand and the number of days remaining before expiry.
  const maxDispensableQty = useMemo(() => {
    if (!selectedBatch || selectedBatchDaysToExpiry === null) return 0;
    if (selectedBatchDaysToExpiry <= 0) return 0;
    return Math.min(selectedBatch.quantity, selectedBatchDaysToExpiry);
  }, [selectedBatch, selectedBatchDaysToExpiry]);

  const filteredDispenseRecords = useMemo(() => {
    const query = historySearch.trim().toLowerCase();
    if (!query) return dispenseRecords;

    return dispenseRecords.filter((rec) =>
      [
        rec.dispenseId,
        rec.prescriptionId,
        rec.patientName,
        rec.medicationName,
        rec.batchNumber,
        rec.status,
        rec.dispensedByName,
      ]
        .map((value) => String(value ?? "").toLowerCase())
        .some((value) => value.includes(query))
    );
  }, [dispenseRecords, historySearch]);

  const dispenseUnitCost = selectedBatch?.costPrice || 0;
  const dispenseTotal = Math.max(0, dispenseQty || 0) * dispenseUnitCost;

  // Prescription queue filtered by patient (also matches medication/doctor/Rx id).
  const filteredPrescriptions = useMemo(() => {
    const query = queueSearch.trim().toLowerCase();
    if (!query) return prescriptions;

    return prescriptions.filter((rx) =>
      [rx.rxId, rx.patientName, rx.clinicianName, rx.medicationName, rx.status]
        .map((value) => String(value ?? "").toLowerCase())
        .some((value) => value.includes(query))
    );
  }, [prescriptions, queueSearch]);

  // Whether a prescription can still be dispensed from the queue.
  function isDispensable(rx: PrescriptionResponseDto) {
    return rx.status === "ISSUED" || rx.status === "ACTIVE";
  }

  // Open the read-only prescription details popup.
  function openDetail(rx: PrescriptionResponseDto) {
    setDetailPrescription(rx);
    setShowDetailModal(true);
  }

  // Handle opening of dispense modal
  function openDispense(rx: PrescriptionResponseDto) {
    setSelectedPrescription(rx);
    setDispenseQty(rx.quantity); // default to prescription quantity
    setShowDispenseModal(true);
  }

  async function handleDispense(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPrescription || !selectedBatchId || dispenseQty <= 0) {
      toast.error("Please select a batch and enter a valid quantity.");
      return;
    }

    const batch = inventory.find(i => i.inventoryId === Number(selectedBatchId));
    if (!batch) {
      toast.error("Selected batch could not be found. Please reselect a batch.");
      return;
    }

    // Hard stop: expired batches must never be dispensed under any circumstance.
    const daysToExpiry = getDaysUntilExpiry(batch.expiryDate);
    if (isBatchExpired(batch)) {
      toast.error("This batch has expired and cannot be dispensed. Please choose a non-expired batch.");
      return;
    }

    if (batch.quantity < dispenseQty) {
      toast.error(`Insufficient stock! Selected batch only has ${batch.quantity} items.`);
      return;
    }

    // Expiry-based cap: a batch can only safely supply as many units as there are
    // days left before it expires. If the requested quantity exceeds that, dispense
    // only the applicable amount and warn that the rest cannot be dispensed.
    let finalQty = dispenseQty;
    if (dispenseQty > daysToExpiry) {
      finalQty = daysToExpiry;
      toast(
        `Stock is expiring in ${daysToExpiry} day(s). Only ${finalQty} unit(s) can be dispensed before expiry; ` +
        `the remaining ${dispenseQty - finalQty} unit(s) cannot be dispensed.`,
        { icon: "⚠️", duration: 7000 }
      );
    }

    if (finalQty <= 0) {
      toast.error("This batch is too close to its expiry date to dispense any units.");
      return;
    }

    if (user?.userId == null) {
      toast.error("Your session is missing a user id. Please log out and log back in before dispensing.");
      return;
    }

    try {
      await dispensePrescription({
        prescriptionId: selectedPrescription.rxId,
        inventoryItemId: Number(selectedBatchId),
        quantity: finalQty,
        dispensedById: user.userId
      });

      toast.success(`Prescription dispensed (${finalQty} unit(s)) and invoice created successfully.`);
      setShowDispenseModal(false);
      setSelectedPrescription(null);
      setSelectedBatchId("");
      setDispenseQty(0);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to dispense prescription.");
    }
  }

  if (loading && prescriptions.length === 0) {
    return <div className="page-spinner"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Pharmacy Hub</h1>
          <p>Fulfill patient prescriptions, dispense medication batches, and keep a ledger of active collections.</p>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: "20px" }}>
        <button className={`tab ${activeTab === "prescriptions" ? "active" : ""}`} onClick={() => setActiveTab("prescriptions")}>Prescriptions Queue</button>
        <button className={`tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>Dispensing History Ledger</button>
      </div>

      {activeTab === "prescriptions" && (
        <Panel
          title="Active Prescriptions Queue"
          actions={
            <input
              className="form-input"
              type="text"
              placeholder="Search patients..."
              value={queueSearch}
              onChange={(e) => setQueueSearch(e.target.value)}
              style={{ minWidth: "280px" }}
            />
          }
        >
          <Table
            columns={["Rx ID", "Patient", "Doctor", "Medication", "Dosage & Frequency", "Qty to Dispense", "Status", "Actions"]}
            onRowClick={(index) => openDetail(filteredPrescriptions[index])}
            rows={filteredPrescriptions.map((rx) => [
              `#${rx.rxId}`,
              rx.patientName,
              rx.clinicianName,
              <strong>{rx.medicationName}</strong>,
              `${rx.dosage} (${rx.frequency})`,
              <strong>{rx.quantity}</strong>,
              <StatusBadge key={`badge-${rx.rxId}`} status={rx.status} />,
              <div className="actions-cell" key={`actions-${rx.rxId}`} onClick={(e) => e.stopPropagation()}>
                {isDispensable(rx) ? (
                  <button className="btn btn-success btn-sm" onClick={() => openDispense(rx)}>
                    Dispense Meds
                  </button>
                ) : (
                  <span style={{ color: "var(--color-text-muted)" }}>-</span>
                )}
              </div>
            ])}
          />
        </Panel>
      )}

      {activeTab === "history" && (
        <Panel
          title="Dispensing Ledger History"
          actions={
            <input
              className="form-input"
              type="text"
              placeholder="Search dispensing history..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              style={{ minWidth: "280px" }}
            />
          }
        >
          <Table
            columns={["Dispense ID", "Patient Name", "Medication", "Batch Code", "Quantity", "Dispensed On"]}
            rows={filteredDispenseRecords.map((rec) => [
              `#${rec.dispenseId}`,
              rec.patientName,
              <strong>{rec.medicationName}</strong>,
              rec.batchNumber,
              rec.quantity,
              date(rec.dispensedAt)
            ])}
          />
        </Panel>
      )}

      {showDispenseModal && selectedPrescription && (
        <Modal isOpen={showDispenseModal} onClose={() => { setShowDispenseModal(false); setSelectedPrescription(null); }} title={`Dispense Prescription #${selectedPrescription.rxId}`}>
          <form onSubmit={handleDispense}>
            <div className="prescription-card-detail">
              <h4 style={{ fontWeight: 600, marginBottom: "8px" }}>Prescription Details:</h4>
              <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
                Patient: <strong>{selectedPrescription.patientName}</strong><br />
                Medication: <strong>{selectedPrescription.medicationName}</strong><br />
                Required Qty: <strong>{selectedPrescription.quantity}</strong><br />
                Directions: {selectedPrescription.dosage} - {selectedPrescription.frequency} for {selectedPrescription.durationDays} days.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Select Stock Batch *</label>
              <select className="form-select" value={selectedBatchId} onChange={(e) => setSelectedBatchId(e.target.value)} required>
                <option value="">-- Choose Active Batch --</option>
                {availableBatches.map(batch => (
                  <option key={batch.inventoryId} value={batch.inventoryId}>
                    {batch.batchNumber} - {batch.location || "Default Location"} (Avail: {batch.quantity}) - Expires in {getDaysUntilExpiry(batch.expiryDate)} day(s) - Unit Cost: {money(batch.costPrice || 0)}
                  </option>
                ))}
              </select>
              {availableBatches.length === 0 && (
                <div style={{ color: "var(--color-danger)", fontSize: "12px", marginTop: "6px" }}>
                  Error: No non-expired stock batches available for this medication. Add fresh stock in the Inventory page first.
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Quantity to Dispense *</label>
              <input className="form-input" type="number" min="1" max={selectedPrescription.quantity} value={dispenseQty || ""} onChange={(e) => setDispenseQty(Number(e.target.value))} required />
            </div>

            {selectedBatch && selectedBatchDaysToExpiry !== null && (
              <div
                className="prescription-card-detail"
                style={{
                  marginTop: "12px",
                  background: dispenseQty > maxDispensableQty ? "rgba(220, 38, 38, 0.08)" : "var(--color-bg)",
                  border: dispenseQty > maxDispensableQty ? "1px solid var(--color-danger)" : "1px solid var(--color-border)"
                }}
              >
                <p style={{ fontSize: "13px", margin: 0, color: "var(--color-text-secondary)" }}>
                  Batch expiry: <strong>{date(selectedBatch.expiryDate)}</strong> ({selectedBatchDaysToExpiry} day(s) remaining)<br />
                  Max dispensable from this batch: <strong>{maxDispensableQty}</strong> unit(s)
                </p>
                {dispenseQty > maxDispensableQty && (
                  <p style={{ fontSize: "13px", margin: "8px 0 0", color: "var(--color-danger)", fontWeight: 600 }}>
                    ⚠️ Stock is expiring soon. Only {maxDispensableQty} unit(s) can be dispensed before expiry — the
                    remaining {dispenseQty - maxDispensableQty} unit(s) cannot be dispensed.
                  </p>
                )}
              </div>
            )}

            <div className="prescription-card-detail" style={{ marginTop: "12px" }}>
              <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: 0 }}>
                Unit Cost: <strong>{money(dispenseUnitCost)}</strong><br />
                Dispense Quantity: <strong>{dispenseQty || 0}</strong><br />
                Total Amount: <strong>{money(dispenseTotal)}</strong>
              </p>
            </div>

            <div className="modal-footer" style={{ marginTop: "24px", padding: 0 }}>
              <button type="submit" className="btn btn-primary" disabled={availableBatches.length === 0}>Confirm Dispense</button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowDispenseModal(false); setSelectedPrescription(null); }}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {showDetailModal && detailPrescription && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => { setShowDetailModal(false); setDetailPrescription(null); }}
          title={`Prescription #${detailPrescription.rxId} - ${detailPrescription.patientName}`}
        >
          <div className="prescription-card-detail">
            <h4 style={{ fontWeight: 600, marginBottom: "12px" }}>Prescription Details</h4>
            <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", lineHeight: 1.8, margin: 0 }}>
              Patient: <strong>{detailPrescription.patientName}</strong><br />
              Prescribing Doctor: <strong>{detailPrescription.clinicianName}</strong><br />
              Medication: <strong>{detailPrescription.medicationName}</strong><br />
              Dosage: <strong>{detailPrescription.dosage}</strong><br />
              Frequency: <strong>{detailPrescription.frequency}</strong><br />
              Route: <strong>{detailPrescription.route || "N/A"}</strong><br />
              Duration: <strong>{detailPrescription.durationDays} day(s)</strong><br />
              Quantity: <strong>{detailPrescription.quantity}</strong><br />
              Repeats: <strong>{detailPrescription.repeats}</strong><br />
              Status: <StatusBadge status={detailPrescription.status} />
            </p>
            {detailPrescription.notes && (
              <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginTop: "12px" }}>
                Notes: {detailPrescription.notes}
              </p>
            )}
          </div>

          <div className="modal-footer" style={{ marginTop: "24px", padding: 0 }}>
            {isDispensable(detailPrescription) && (
              <button
                className="btn btn-success"
                onClick={() => {
                  const rx = detailPrescription;
                  setShowDetailModal(false);
                  setDetailPrescription(null);
                  openDispense(rx);
                }}
              >
                Dispense Meds
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => { setShowDetailModal(false); setDetailPrescription(null); }}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
