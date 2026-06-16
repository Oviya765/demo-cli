import { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { Search } from "lucide-react";
import type { PaymentResponseDto } from "../../models/types";
import { getAllPayments } from "../../services/paymentService";
import { Panel, Table, StatusBadge, Pagination, money, date } from "../../components/ui/components";
import "../../assets/styles/payment/PaymentPage.css";

export default function PaymentPage() {
  const [payments, setPayments] = useState<PaymentResponseDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadData = async () => {
    try {
      setLoading(true);
      const paymentData = await getAllPayments();
      setPayments(paymentData);
      setCurrentPage(1);
    } catch (err: any) {
      toast.error(err.message || "Failed to load payments details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter payments by search query
  const filteredPayments = useMemo(() => {
    if (!searchQuery.trim()) return payments;
    const query = searchQuery.toLowerCase();
    return payments.filter(
      (p) =>
        String(p.invoiceId).includes(query) ||
        String(p.paymentId).includes(query) ||
        p.patientName?.toLowerCase().includes(query) ||
        p.method.toLowerCase().includes(query)
    );
  }, [payments, searchQuery]);

  const paginationData = useMemo(() => {
    const totalItems = filteredPayments.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const startIdx = (safeCurrentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const paginatedPayments = filteredPayments.slice(startIdx, endIdx);

    return {
      paginatedPayments,
      totalPages,
      totalItems,
      safeCurrentPage
    };
  }, [filteredPayments, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (currentPage !== paginationData.safeCurrentPage) {
      setCurrentPage(paginationData.safeCurrentPage);
    }
  }, [currentPage, paginationData.safeCurrentPage]);

  if (loading && payments.length === 0) {
    return <div className="page-spinner"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Payments History</h1>
          <p>Trace patient transaction archives, log manual collections, and audit accounts receivable.</p>
        </div>
      </div>

      <Panel
        title="Transactions List"
        actions={null}
      >
        <div className="filters-bar">
          <div className="header-search search-input" style={{ flex: 1, maxWidth: "400px" }}>
            <Search className="search-icon" size={16} />
            <input
              className="form-input"
              type="text"
              placeholder="Search payments by Patient Name, Invoice ID, or Method..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Table
          columns={["Payment ID", "Invoice ID", "Patient Name", "Amount Paid", "Method", "Paid At", "Status"]}
          rows={paginationData.paginatedPayments.map((pay) => [
            `#${pay.paymentId}`,
            `#${pay.invoiceId}`,
            pay.patientName || `Patient #${pay.patientId}`,
            <strong>{money(pay.amount)}</strong>,
            <span key={`method-${pay.paymentId}`} style={{ fontWeight: 600 }}>{pay.method}</span>,
            date(pay.paidAt),
            <StatusBadge key={`badge-${pay.paymentId}`} status={pay.status || "SUCCESS"} />
          ])}
        />

        <Pagination
          currentPage={paginationData.safeCurrentPage}
          totalPages={paginationData.totalPages}
          totalItems={paginationData.totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(items) => {
            setItemsPerPage(items);
            setCurrentPage(1);
          }}
        />
      </Panel>
    </div>
  );
}