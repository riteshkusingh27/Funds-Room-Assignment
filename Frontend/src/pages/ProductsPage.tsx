import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Modal, Toast, LoadingSpinner, StatusBadge } from '../components/Common';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  PackagePlus,
  Search,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  History,
  Layers,
  MapPin,
} from 'lucide-react';

type Product = {
  id: number;
  name: string;
  sku: string;
  category: string;
  unitPrice: string;
  currentStock: number;
  minimumStock: number;
  warehouseLocation: string;
  createdAt: string;
};

type StockMovement = {
  id: number;
  productId: number;
  quantity: number;
  movementType: 'IN' | 'OUT';
  reason: string;
  createdAt: string;
};

export const ProductsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const canModify = hasRole(['ADMIN', 'WAREHOUSE']);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  // Form State - Add Product
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [currentStock, setCurrentStock] = useState('');
  const [minimumStock, setMinimumStock] = useState('');
  const [warehouseLocation, setWarehouseLocation] = useState('');

  // Form State - Adjust Stock
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [movementType, setMovementType] = useState<'IN' | 'OUT'>('IN');
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [reason, setReason] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let query = `/products?search=${encodeURIComponent(search)}&page=${page}&limit=10`;
      if (category) query += `&category=${encodeURIComponent(category)}`;
      if (lowStock) query += `&lowStock=true`;

      const res = await api.get<{
        items: Product[];
        totalPages: number;
      }>(query);
      setProducts(res.items);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }, [search, category, lowStock, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/products', {
        name,
        sku,
        category: productCategory,
        unitPrice: parseFloat(unitPrice),
        currentStock: parseInt(currentStock, 10),
        minimumStock: parseInt(minimumStock, 10),
        warehouseLocation,
      });

      setToast({ type: 'success', message: 'Product added to inventory catalog!' });
      setIsAddModalOpen(false);
      resetAddForm();
      fetchProducts();
    } catch (err) {
      if (err instanceof ApiError) {
        setToast({ type: 'error', message: err.message });
      } else {
        setToast({ type: 'error', message: 'Failed to create product' });
      }
    }
  };

  const resetAddForm = () => {
    setName('');
    setSku('');
    setProductCategory('');
    setUnitPrice('');
    setCurrentStock('');
    setMinimumStock('');
    setWarehouseLocation('');
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockProduct) return;

    try {
      await api.post('/products/stock-movements', {
        productId: stockProduct.id,
        quantity: parseInt(adjustQuantity, 10),
        movementType,
        reason,
      });

      setToast({ type: 'success', message: `Stock successfully adjusted (${movementType})!` });
      setIsStockModalOpen(false);
      setAdjustQuantity('');
      setReason('');
      setStockProduct(null);
      fetchProducts();
    } catch (err) {
      if (err instanceof ApiError) {
        setToast({ type: 'error', message: err.message });
      } else {
        setToast({ type: 'error', message: 'Failed to adjust stock' });
      }
    }
  };

  const openMovementsHistory = async (product: Product) => {
    setSelectedProduct(product);
    setLoadingMovements(true);
    try {
      const data = await api.get<{ items: StockMovement[] }>(`/products/${product.id}/movements?limit=20`);
      setMovements(data.items);
    } catch (err) {
      console.error('Failed to load stock movements:', err);
    } finally {
      setLoadingMovements(false);
    }
  };

  return (
    <Layout
      title="Products & Inventory Stock"
      subtitle="Catalog management, live stock levels, and audit logs for stock movements"
      actions={
        canModify ? (
          <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary">
            <PackagePlus size={18} />
            <span>Add New Product</span>
          </button>
        ) : undefined
      }
    >
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* Filters Bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '42px' }}
            placeholder="Search by product name or SKU..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <input
          type="text"
          className="form-input"
          style={{ width: '180px' }}
          placeholder="Filter by Category..."
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        />

        <button
          onClick={() => {
            setLowStock(!lowStock);
            setPage(1);
          }}
          className={`btn ${lowStock ? 'btn-danger' : 'btn-secondary'}`}
          style={{ gap: '8px' }}
        >
          <AlertTriangle size={16} />
          <span>Low Stock Warning {lowStock && 'Active'}</span>
        </button>
      </div>

      {/* Products Table */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Product & SKU</th>
                <th>Category</th>
                <th>Unit Price</th>
                <th>Current Stock</th>
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLow = p.currentStock <= p.minimumStock;

                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--primary)', marginTop: '2px' }}>
                          {p.sku}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Layers size={12} />
                          {p.category}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          ₹{parseFloat(p.unitPrice).toFixed(2)}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: isLow ? '#f87171' : '#34d399' }}>
                            {p.currentStock}
                          </div>
                          {isLow && (
                            <span className="badge badge-cancelled" style={{ fontSize: '0.6875rem' }}>
                              Low Stock (Min {p.minimumStock})
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} />
                          {p.warehouseLocation}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {canModify && (
                            <button
                              onClick={() => {
                                setStockProduct(p);
                                setIsStockModalOpen(true);
                              }}
                              className="btn btn-secondary btn-sm"
                            >
                              Adjust Stock
                            </button>
                          )}
                          <button
                            onClick={() => openMovementsHistory(p)}
                            className="btn btn-secondary btn-sm"
                          >
                            <History size={14} />
                            <span>Logs</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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

      {/* Modal: Add Product */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create New Product">
        <form onSubmit={handleCreateProduct}>
          <div className="input-group">
            <label className="input-label">Product Name *</label>
            <input type="text" className="form-input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Premium Cement 50kg" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="input-group">
              <label className="input-label">SKU Code *</label>
              <input type="text" className="form-input" required value={sku} onChange={(e) => setSku(e.target.value)} placeholder="CEM-PRM-50" />
            </div>
            <div className="input-group">
              <label className="input-label">Category *</label>
              <input type="text" className="form-input" required value={productCategory} onChange={(e) => setProductCategory(e.target.value)} placeholder="Building Materials" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div className="input-group">
              <label className="input-label">Unit Price (₹) *</label>
              <input type="number" step="0.01" className="form-input" required value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="450.00" />
            </div>
            <div className="input-group">
              <label className="input-label">Initial Stock *</label>
              <input type="number" className="form-input" required value={currentStock} onChange={(e) => setCurrentStock(e.target.value)} placeholder="100" />
            </div>
            <div className="input-group">
              <label className="input-label">Min Stock *</label>
              <input type="number" className="form-input" required value={minimumStock} onChange={(e) => setMinimumStock(e.target.value)} placeholder="15" />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: '24px' }}>
            <label className="input-label">Warehouse Location *</label>
            <input type="text" className="form-input" required value={warehouseLocation} onChange={(e) => setWarehouseLocation(e.target.value)} placeholder="Rack A-1, Section 3" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Save Product</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Adjust Stock IN/OUT */}
      <Modal isOpen={isStockModalOpen} onClose={() => setIsStockModalOpen(false)} title={`Manual Stock Movement — ${stockProduct?.name}`}>
        <form onSubmit={handleAdjustStock}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Current Stock Level:</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{stockProduct?.currentStock} units</div>
          </div>

          <div className="input-group">
            <label className="input-label">Movement Direction</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                className={`btn ${movementType === 'IN' ? 'btn-success' : 'btn-secondary'}`}
                onClick={() => setMovementType('IN')}
              >
                <ArrowUpRight size={16} />
                Stock IN (Received)
              </button>
              <button
                type="button"
                className={`btn ${movementType === 'OUT' ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => setMovementType('OUT')}
              >
                <ArrowDownRight size={16} />
                Stock OUT (Adjustment)
              </button>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Quantity *</label>
            <input type="number" min="1" className="form-input" required value={adjustQuantity} onChange={(e) => setAdjustQuantity(e.target.value)} placeholder="e.g. 50" />
          </div>

          <div className="input-group" style={{ marginBottom: '24px' }}>
            <label className="input-label">Reason / Reference Note *</label>
            <input type="text" className="form-input" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Supplier shipment, damaged goods removal..." />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => setIsStockModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Apply Stock Movement</button>
          </div>
        </form>
      </Modal>

      {/* Drawer: Stock Movement History Logs */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>{selectedProduct.name}</h3>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>{selectedProduct.sku}</span>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="btn btn-secondary btn-sm">Close</button>
            </div>

            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>
              Audit Trail — Stock Movements (Step ⑧)
            </h4>

            {loadingMovements ? (
              <LoadingSpinner />
            ) : movements.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.875rem' }}>
                No stock movements logged for this product yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
                {movements.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>{m.reason}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        {new Date(m.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <StatusBadge status={m.movementType} />
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: m.movementType === 'IN' ? '#34d399' : '#f87171' }}>
                        {m.movementType === 'IN' ? `+${m.quantity}` : `-${m.quantity}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};
