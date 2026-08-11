import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { StatusBadge, Modal, Toast, LoadingSpinner } from '../components/Common';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ChallanInvoiceModal } from '../components/ChallanInvoiceModal';
import {
  Plus,
  Zap,
  XCircle,
  Eye,
  Trash2,
  FileText,
  Download,
} from 'lucide-react';

type ChallanItem = {
  id: number;
  productId: number;
  productName: string;
  sku: string;
  unitPrice: string;
  quantity: number;
};

type Challan = {
  id: number;
  challanNumber: string;
  customerId: number;
  totalQuantity: number;
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
  items?: ChallanItem[];
};

type Customer = {
  id: number;
  name: string;
  businessName: string;
};

type Product = {
  id: number;
  name: string;
  sku: string;
  unitPrice: string;
  currentStock: number;
};

export const ChallansPage: React.FC = () => {
  const { hasRole } = useAuth();
  const canCreate = hasRole(['ADMIN', 'SALES']);
  const canConfirm = hasRole(['ADMIN', 'SALES', 'WAREHOUSE']);
  const canCancel = hasRole(['ADMIN']);

  const [challans, setChallans] = useState<Challan[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Modals & Detail State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState<Challan | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [pdfModalChallanId, setPdfModalChallanId] = useState<number | null>(null);

  // Create Form State
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [lineItems, setLineItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: '', quantity: 1 },
  ]);

  const fetchChallans = useCallback(async () => {
    setLoading(true);
    try {
      let query = `/challans?page=${page}&limit=10`;
      if (statusFilter) query += `&status=${statusFilter}`;

      const res = await api.get<{
        items: Challan[];
        totalPages: number;
      }>(query);
      setChallans(res.items);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Failed to load challans:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchChallans();
  }, [fetchChallans]);

  const openCreateModal = async () => {
    try {
      const custRes = await api.get<{ items: Customer[] }>('/customers?limit=100');
      const prodRes = await api.get<{ items: Product[] }>('/products?limit=100');
      setCustomersList(custRes.items);
      setProductsList(prodRes.items);
      setIsCreateModalOpen(true);
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to load options for challan creation' });
    }
  };

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { productId: '', quantity: 1 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (index: number, field: 'productId' | 'quantity', value: string | number) => {
    const updated = [...lineItems];
    if (field === 'productId') {
      updated[index].productId = value as string;
    } else {
      updated[index].quantity = Math.max(1, Number(value));
    }
    setLineItems(updated);
  };

  const handleCreateChallan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setToast({ type: 'error', message: 'Please select a customer' });
      return;
    }

    const validItems = lineItems
      .filter((i) => i.productId !== '')
      .map((i) => ({ productId: parseInt(i.productId, 10), quantity: i.quantity }));

    if (validItems.length === 0) {
      setToast({ type: 'error', message: 'Please add at least one product line item' });
      return;
    }

    try {
      await api.post('/challans', {
        customerId: parseInt(selectedCustomerId, 10),
        items: validItems,
      });

      setToast({ type: 'success', message: 'Sales Challan created in DRAFT status!' });
      setIsCreateModalOpen(false);
      setSelectedCustomerId('');
      setLineItems([{ productId: '', quantity: 1 }]);
      fetchChallans();
    } catch (err) {
      if (err instanceof ApiError) {
        setToast({ type: 'error', message: err.message });
      } else {
        setToast({ type: 'error', message: 'Failed to create sales challan' });
      }
    }
  };

  /**
   * ⚡ THE CRITICAL STEP: CONFIRM SALE
   * Executes atomic transaction: Check Stock (SELECT FOR UPDATE) -> Confirm Challan -> Reduce Stock -> Log Movement
   */
  const handleConfirmSale = async (challanId: number) => {
    setConfirmingId(challanId);
    setToast(null);

    try {
      const confirmed = await api.post<Challan>(`/challans/${challanId}/confirm`);
      setToast({
        type: 'success',
        message: 'Sale confirmed successfully. Inventory updated and movement logged.',
      });
      if (selectedChallan && selectedChallan.id === challanId) {
        setSelectedChallan(confirmed);
      }
      fetchChallans();
    } catch (err) {
      if (err instanceof ApiError) {
        setToast({ type: 'error', message: `Confirm Failed: ${err.message}` });
      } else {
        setToast({ type: 'error', message: 'Failed to confirm sale' });
      }
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCancelChallan = async (challanId: number) => {
    if (!window.confirm('Are you sure you want to cancel this DRAFT sales challan?')) return;

    try {
      await api.post(`/challans/${challanId}/cancel`);
      setToast({ type: 'info', message: 'Sales Challan cancelled' });
      if (selectedChallan && selectedChallan.id === challanId) {
        setSelectedChallan(null);
      }
      fetchChallans();
    } catch (err) {
      if (err instanceof ApiError) {
        setToast({ type: 'error', message: err.message });
      } else {
        setToast({ type: 'error', message: 'Failed to cancel challan' });
      }
    }
  };

  const openChallanDetails = async (challan: Challan) => {
    try {
      const detail = await api.get<Challan>(`/challans/${challan.id}`);
      setSelectedChallan(detail);
    } catch (err) {
      console.error('Failed to load details:', err);
    }
  };

  return (
    <Layout
      title="Sales Delivery Challans"
      subtitle="Issue delivery challans, verify real-time stock balances, and execute sale confirmations"
      actions={
        canCreate ? (
          <button onClick={openCreateModal} className="btn btn-primary">
            <Plus size={16} />
            <span>Create Delivery Challan</span>
          </button>
        ) : undefined
      }
    >
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {['', 'DRAFT', 'CONFIRMED', 'CANCELLED'].map((st) => (
          <button
            key={st}
            onClick={() => {
              setStatusFilter(st);
              setPage(1);
            }}
            className={`btn ${statusFilter === st ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          >
            {st === '' ? 'All Challans' : st}
          </button>
        ))}
      </div>

      {/* Challans Table */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Challan Number</th>
                <th>Total Items Qty</th>
                <th>Status</th>
                <th>Issued Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {challans.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No sales challans found.
                  </td>
                </tr>
              ) : (
                challans.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                        {c.challanNumber}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                        {c.totalQuantity} units
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
                        {new Date(c.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button onClick={() => openChallanDetails(c)} className="btn btn-secondary btn-sm">
                          <Eye size={14} />
                          <span>View Detail</span>
                        </button>

                        <button onClick={() => setPdfModalChallanId(c.id)} className="btn btn-primary btn-sm" style={{ padding: '6px 10px' }}>
                          <FileText size={14} />
                          <span>PDF Invoice</span>
                        </button>

                        {c.status === 'DRAFT' && canConfirm && (
                          <button
                            onClick={() => handleConfirmSale(c.id)}
                            disabled={confirmingId === c.id}
                            className="btn btn-success btn-sm"
                          >
                            <Zap size={14} />
                            <span>{confirmingId === c.id ? 'Checking Stock...' : 'Confirm Sale'}</span>
                          </button>
                        )}

                        {c.status === 'DRAFT' && canCancel && (
                          <button onClick={() => handleCancelChallan(c.id)} className="btn btn-danger btn-sm">
                            <XCircle size={14} />
                            <span>Cancel</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Page {page} of {totalPages || 1}
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1} className="btn btn-secondary btn-sm">
            Previous
          </button>
          <button onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page >= totalPages} className="btn btn-secondary btn-sm">
            Next
          </button>
        </div>
      </div>

      {/* Modal: Create Sales Challan */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create Sales Delivery Challan">
        <form onSubmit={handleCreateChallan}>
          <div className="input-group">
            <label className="input-label">Select Customer Account *</label>
            <select
              className="form-select"
              required
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
            >
              <option value="">-- Choose Customer --</option>
              {customersList.map((cust) => (
                <option key={cust.id} value={cust.id}>
                  {cust.name} ({cust.businessName})
                </option>
              ))}
            </select>
          </div>

          <div style={{ margin: '20px 0 12px' }}>
            <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Line Items & Quantities *</span>
              <button type="button" onClick={handleAddLineItem} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: '0.75rem' }}>
                + Add Item
              </button>
            </label>
          </div>

          {lineItems.map((item, idx) => {
            return (
              <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ flex: 2 }}>
                  <select
                    className="form-select"
                    required
                    value={item.productId}
                    onChange={(e) => handleLineItemChange(idx, 'productId', e.target.value)}
                  >
                    <option value="">-- Select Product --</option>
                    {productsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stock: {p.currentStock}) - ₹{p.unitPrice}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleLineItemChange(idx, 'quantity', e.target.value)}
                  />
                </div>

                {lineItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveLineItem(idx)}
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#f87171', padding: '10px' }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Issue DRAFT Challan
            </button>
          </div>
        </form>
      </Modal>

      {/* Drawer: Challan Detail */}
      {selectedChallan && (
        <div className="modal-overlay" onClick={() => setSelectedChallan(null)}>
          <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                  {selectedChallan.challanNumber}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Issued: {new Date(selectedChallan.createdAt).toLocaleString()}
                </div>
              </div>
              <StatusBadge status={selectedChallan.status} />
            </div>

            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>
              Line Items Breakdown
            </h4>

            <div className="table-container" style={{ marginBottom: '20px' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Product & SKU</th>
                    <th>Unit Price</th>
                    <th>Qty</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedChallan.items?.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.productName}</div>
                        <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>{item.sku}</div>
                      </td>
                      <td>₹{parseFloat(item.unitPrice).toFixed(2)}</td>
                      <td>{item.quantity}</td>
                      <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                        ₹{(parseFloat(item.unitPrice) * item.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Total Quantity: <strong style={{ color: 'var(--text-main)' }}>{selectedChallan.totalQuantity} units</strong>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setPdfModalChallanId(selectedChallan.id)} className="btn btn-primary">
                  <Download size={16} />
                  <span>PDF Invoice</span>
                </button>

                {selectedChallan.status === 'DRAFT' && canConfirm && (
                  <button
                    onClick={() => handleConfirmSale(selectedChallan.id)}
                    disabled={confirmingId === selectedChallan.id}
                    className="btn btn-success"
                  >
                    <Zap size={16} />
                    <span>⚡ Confirm Sale</span>
                  </button>
                )}
                <button onClick={() => setSelectedChallan(null)} className="btn btn-secondary">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pdfModalChallanId !== null && (
        <ChallanInvoiceModal challanId={pdfModalChallanId} onClose={() => setPdfModalChallanId(null)} />
      )}
    </Layout>
  );
};
