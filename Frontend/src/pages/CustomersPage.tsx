import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { StatusBadge, Modal, Toast, LoadingSpinner } from '../components/Common';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  UserPlus,
  Search,
  MessageSquare,
  Calendar,
  Phone,
  Mail,
  Building,
  MapPin,
  ChevronRight,
  Clock,
  PlusCircle,
} from 'lucide-react';

type Customer = {
  id: number;
  name: string;
  mobile: string;
  email: string | null;
  businessName: string;
  gstNumber: string | null;
  customerType: 'Retail' | 'Wholesale' | 'Distributor';
  address: string;
  status: 'Lead' | 'Active' | 'Inactive';
  followUpDate: string | null;
  notes: string | null;
  createdAt: string;
};

type CustomerFollowup = {
  id: number;
  customerId: number;
  note: string;
  followUpDate: string | null;
  createdAt: string;
};

export const CustomersPage: React.FC = () => {
  const { hasRole } = useAuth();
  const canModify = hasRole(['ADMIN', 'SALES']);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [followups, setFollowups] = useState<CustomerFollowup[]>([]);
  const [loadingFollowups, setLoadingFollowups] = useState(false);

  // Form State - Customer Create
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [customerType, setCustomerType] = useState<'Retail' | 'Wholesale' | 'Distributor'>('Wholesale');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<'Lead' | 'Active' | 'Inactive'>('Lead');
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');

  // Form State - Follow-up Create
  const [newFollowupNote, setNewFollowupNote] = useState('');
  const [newFollowupDate, setNewFollowupDate] = useState('');

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{
        items: Customer[];
        totalPages: number;
      }>(`/customers?search=${encodeURIComponent(search)}&page=${page}&limit=10`);
      setCustomers(res.items);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/customers', {
        name,
        mobile,
        email: email || undefined,
        businessName,
        gstNumber: gstNumber || undefined,
        customerType,
        address,
        status,
        followUpDate: followUpDate || undefined,
        notes: notes || undefined,
      });

      setToast({ type: 'success', message: 'Customer registered successfully!' });
      setIsAddModalOpen(false);
      resetForm();
      fetchCustomers();
    } catch (err) {
      if (err instanceof ApiError) {
        setToast({ type: 'error', message: err.message });
      } else {
        setToast({ type: 'error', message: 'Failed to create customer' });
      }
    }
  };

  const resetForm = () => {
    setName('');
    setMobile('');
    setEmail('');
    setBusinessName('');
    setGstNumber('');
    setCustomerType('Wholesale');
    setAddress('');
    setStatus('Lead');
    setFollowUpDate('');
    setNotes('');
  };

  const openCustomerDetails = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setLoadingFollowups(true);
    try {
      const data = await api.get<CustomerFollowup[]>(`/customers/${customer.id}/followups`);
      setFollowups(data);
    } catch (err) {
      console.error('Failed to load follow-ups:', err);
    } finally {
      setLoadingFollowups(false);
    }
  };

  const handleCreateFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      const newFollowup = await api.post<CustomerFollowup>(`/customers/${selectedCustomer.id}/followups`, {
        note: newFollowupNote,
        followUpDate: newFollowupDate || undefined,
      });

      setFollowups([newFollowup, ...followups]);
      setNewFollowupNote('');
      setNewFollowupDate('');
      setToast({ type: 'success', message: 'Follow-up log added!' });
      fetchCustomers();
    } catch (err) {
      if (err instanceof ApiError) {
        setToast({ type: 'error', message: err.message });
      } else {
        setToast({ type: 'error', message: 'Failed to add follow-up' });
      }
    }
  };

  return (
    <Layout
      title="CRM Customers"
      subtitle="Manage business accounts, lead pipelines, and follow-up interaction history"
      actions={
        canModify ? (
          <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary">
            <UserPlus size={18} />
            <span>Add Customer</span>
          </button>
        ) : undefined
      }
    >
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* Filter Header */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '42px' }}
            placeholder="Search by name, business, mobile, or GST..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Customer List Table */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Customer & Business</th>
                <th>Contact Info</th>
                <th>Type</th>
                <th>Status</th>
                <th>Next Follow-up</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No customers found matching your search.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{c.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Building size={12} />
                        {c.businessName}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={12} color="var(--primary)" />
                        {c.mobile}
                      </div>
                      {c.email && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Mail size={12} />
                          {c.email}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        {c.customerType}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td>
                      {c.followUpDate ? (
                        <span style={{ fontSize: '0.8125rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} />
                          {c.followUpDate.slice(0, 10)}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>None scheduled</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => openCustomerDetails(c)}
                        className="btn btn-secondary btn-sm"
                      >
                        <MessageSquare size={14} />
                        <span>Timeline & Details</span>
                        <ChevronRight size={14} />
                      </button>
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
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="btn btn-secondary btn-sm"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page >= totalPages}
            className="btn btn-secondary btn-sm"
          >
            Next
          </button>
        </div>
      </div>

      {/* Modal: Add Customer */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register New Customer">
        <form onSubmit={handleCreateCustomer}>
          <div className="input-group">
            <label className="input-label">Contact Name *</label>
            <input type="text" className="form-input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rajesh Kumar" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="input-group">
              <label className="input-label">Mobile Number *</label>
              <input type="text" className="form-input" required value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="9876543210" />
            </div>
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="rajesh@company.com" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="input-group">
              <label className="input-label">Business Name *</label>
              <input type="text" className="form-input" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Kumar Traders" />
            </div>
            <div className="input-group">
              <label className="input-label">GST Number</label>
              <input type="text" className="form-input" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="GST29ABC1234XYZ" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="input-group">
              <label className="input-label">Customer Type</label>
              <select className="form-select" value={customerType} onChange={(e) => setCustomerType(e.target.value as any)}>
                <option value="Wholesale">Wholesale</option>
                <option value="Retail">Retail</option>
                <option value="Distributor">Distributor</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Pipeline Status</label>
              <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                <option value="Lead">Lead</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Address *</label>
            <textarea className="form-textarea" required rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full business address..." />
          </div>

          <div className="input-group">
            <label className="input-label">Initial Follow-up Date</label>
            <input type="date" className="form-input" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
          </div>

          <div className="input-group" style={{ marginBottom: '24px' }}>
            <label className="input-label">Notes</label>
            <textarea className="form-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Key interests, discussion summary..." />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Save Customer</button>
          </div>
        </form>
      </Modal>

      {/* Slide-over Drawer: Customer Details & Follow-up Timeline */}
      {selectedCustomer && (
        <div className="modal-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>{selectedCustomer.name}</h3>
                <div style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <Building size={14} />
                  {selectedCustomer.businessName}
                </div>
              </div>
              <StatusBadge status={selectedCustomer.status} />
            </div>

            {/* Quick Customer Info Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>Phone: </span>
                <strong style={{ color: 'var(--text-main)' }}>{selectedCustomer.mobile}</strong>
              </div>
              <div style={{ fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>Type: </span>
                <strong style={{ color: 'var(--text-main)' }}>{selectedCustomer.customerType}</strong>
              </div>
              <div style={{ fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>Email: </span>
                <strong style={{ color: 'var(--text-main)' }}>{selectedCustomer.email || 'N/A'}</strong>
              </div>
              <div style={{ fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>GST: </span>
                <strong style={{ color: 'var(--text-main)' }}>{selectedCustomer.gstNumber || 'N/A'}</strong>
              </div>
              <div style={{ gridColumn: '1 / -1', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={14} color="var(--text-dim)" />
                <span style={{ color: 'var(--text-muted)' }}>{selectedCustomer.address}</span>
              </div>
            </div>

            {/* Follow-up Timeline Header */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="var(--primary)" />
                Interaction & Follow-up Timeline
              </h4>

              {/* Add Follow-up Form */}
              {canModify && (
                <form onSubmit={handleCreateFollowup} style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.2)', marginBottom: '20px' }}>
                  <div className="input-group" style={{ marginBottom: '10px' }}>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="Add meeting note or phone conversation summary..."
                      value={newFollowupNote}
                      onChange={(e) => setNewFollowupNote(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="date"
                      className="form-input"
                      style={{ flex: 1 }}
                      value={newFollowupDate}
                      onChange={(e) => setNewFollowupDate(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary btn-sm">
                      <PlusCircle size={14} />
                      Log Follow-up
                    </button>
                  </div>
                </form>
              )}

              {/* Timeline List */}
              {loadingFollowups ? (
                <LoadingSpinner />
              ) : followups.length === 0 ? (
                <div style={{ fontSize: '0.875rem', color: 'var(--text-dim)', textAlign: 'center', padding: '16px' }}>
                  No follow-up logs yet. Add the first interaction note above.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '240px', overflowY: 'auto' }}>
                  {followups.map((f) => (
                    <div
                      key={f.id}
                      style={{
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderLeft: '3px solid var(--primary)',
                      }}
                    >
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginBottom: '6px' }}>{f.note}</p>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        <span>Logged: {new Date(f.createdAt).toLocaleDateString()}</span>
                        {f.followUpDate && (
                          <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                            Next: {f.followUpDate.slice(0, 10)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setSelectedCustomer(null)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
