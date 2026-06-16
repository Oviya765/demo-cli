import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import type { PrescriptionResponseDto, DispenseResponseDto, InventoryResponseDto } from "../../models/types";
import { getAllPrescriptions } from "../../services/prescriptionService";
import { getAllInventory } from "../../services/inventoryService";
import { getAllDispenseRecords, dispensePrescription, returnDispense } from "../../services/pharmacyService";
import { Panel, Table, StatusBadge, Modal, date } from "../../components/ui/components";
import "../../assets/styles/pharmacy/PharmacyPage.css";

export default function PharmacyPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"prescriptions" | "history">("prescriptions");
  const [prescriptions, setPrescriptions] = useState<PrescriptionResponseDto[]>([]);
  const [dispenseRecords, setDispenseRecords] = useState<DispenseResponseDto[]>([]);
  const [inventory, setInventory] = useState<InventoryResponseDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionResponseDto | null>(null);

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

  // Filter batches matching the selected prescription's medication
  const availableBatches = useMemo(() => {
    if (!selectedPrescription) return [];
    return inventory.filter(
      (item) => item.medicationId === selectedPrescription.medicationId && item.quantity > 0 && !item.expired
    );
  }, [selectedPrescription, inventory]);

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
    if (batch && batch.quantity < dispenseQty) {
      toast.error(`Insufficient stock! Selected batch only has ${batch.quantity} items.`);
      return;
    }

    try {
      await dispensePrescription({
        prescriptionId: selectedPrescription.rxId,
        inventoryItemId: Number(selectedBatchId),
        quantity: dispenseQty,
        dispensedById: user?.userId
      });

      toast.success("Prescription dispensed successfully.");
      setShowDispenseModal(false);
      setSelectedPrescription(null);
      setSelectedBatchId("");
      setDispenseQty(0);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to dispense prescription.");
    }
  }

  async function handleReturn(dispenseId: number, quantity: number) {
    if (!window.confirm("Are you sure you want to log a return for this dispense record?")) return;
    try {
      await returnDispense(dispenseId, { quantity });
      toast.success("Items successfully returned to inventory.");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to log return.");
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
        <Panel title="Active Prescriptions Queue">
          <Table
            columns={["Rx ID", "Patient", "Doctor", "Medication", "Dosage & Frequency", "Qty to Dispense", "Status", "Actions"]}
            rows={prescriptions.map((rx) => [
              `#${rx.rxId}`,
              rx.patientName,
              rx.clinicianName,
              <strong>{rx.medicationName}</strong>,
              `${rx.dosage} (${rx.frequency})`,
              <strong>{rx.quantity}</strong>,
              <StatusBadge key={`badge-${rx.rxId}`} status={rx.status} />,
              <div className="actions-cell" key={`actions-${rx.rxId}`}>
                {(rx.status === "ISSUED" || rx.status === "ACTIVE") && (
                  <button className="btn btn-primary btn-sm" onClick={() => openDispense(rx)}>
                    Dispense Meds
                  </button>
                )}
              </div>
            ])}
          />
        </Panel>
      )}

      {activeTab === "history" && (
        <Panel title="Dispensing Ledger History">
          <Table
            columns={["Dispense ID", "Rx Ref", "Patient Name", "Medication", "Batch Code", "Quantity", "Dispensed On", "Status", "Actions"]}
            rows={dispenseRecords.map((rec) => [
              `#${rec.dispenseId}`,
              `#${rec.prescriptionId}`,
              rec.patientName,
              <strong>{rec.medicationName}</strong>,
              rec.batchNumber,
              rec.quantity,
              date(rec.dispensedAt),
              <StatusBadge key={`badge-${rec.dispenseId}`} status={rec.status} />,
              <div className="actions-cell" key={`actions-${rec.dispenseId}`}>
                {rec.status === "DISPENSED" && (
                  <button className="btn btn-danger btn-sm" onClick={() => handleReturn(rec.dispenseId, rec.quantity)}>
                    Return Stock
                  </button>
                )}
              </div>
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
                    {batch.batchNumber} - {batch.location || "Default Location"} (Avail: {batch.quantity})
                  </option>
                ))}
              </select>
              {availableBatches.length === 0 && (
                <div style={{ color: "var(--color-danger)", fontSize: "12px", marginTop: "6px" }}>
                  Error: No stock batches available for this medication. Add stock in the Inventory page first.
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Quantity to Dispense *</label>
              <input className="form-input" type="number" min="1" max={selectedPrescription.quantity} value={dispenseQty || ""} onChange={(e) => setDispenseQty(Number(e.target.value))} required />
            </div>

            <div className="modal-footer" style={{ marginTop: "24px", padding: 0 }}>
              <button type="submit" className="btn btn-primary" disabled={availableBatches.length === 0}>Confirm Dispense</button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowDispenseModal(false); setSelectedPrescription(null); }}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
