import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { StatCard, LoadingSpinner } from '../components/Common';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Package,
  FileText,
  AlertTriangle,
  TrendingUp,
  PlusCircle,
  PackageCheck,
} from 'lucide-react';

type DashboardData = {
  customerCount: number;
  productCount: number;
  lowStockCount: number;
  pendingChallans: number;
  confirmedChallans: number;
};

export const DashboardPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardMetrics() {
      try {
        const customersRes = await api.get<{ total: number }>('/customers?limit=1').catch(() => ({ total: 0 }));
        const productsRes = await api.get<{ total: number }>('/products?limit=1').catch(() => ({ total: 0 }));
        const lowStockRes = await api.get<{ total: number }>('/products?lowStock=true&limit=1').catch(() => ({ total: 0 }));
        const pendingChallansRes = await api.get<{ total: number }>('/challans?status=DRAFT&limit=1').catch(() => ({ total: 0 }));
        const confirmedChallansRes = await api.get<{ total: number }>('/challans?status=CONFIRMED&limit=1').catch(() => ({ total: 0 }));

        setData({
          customerCount: customersRes.total,
          productCount: productsRes.total,
          lowStockCount: lowStockRes.total,
          pendingChallans: pendingChallansRes.total,
          confirmedChallans: confirmedChallansRes.total,
        });
      } catch (err) {
        console.error('Failed to load metrics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardMetrics();
  }, []);

  return (
    <Layout
      title={`Dashboard — Welcome, ${user?.name}`}
      subtitle={`Operational summary and real-time ERP indicators for ${user?.role} role`}
    >
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Key Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            <StatCard
              title="Registered Customers"
              value={data?.customerCount ?? 0}
              subtitle="Active accounts & leads"
              icon={<Users size={20} color="#4f46e5" />}
              badgeColor="primary"
            />
            <StatCard
              title="Catalog Products"
              value={data?.productCount ?? 0}
              subtitle="Total active SKUs"
              icon={<Package size={20} color="#2563eb" />}
              badgeColor="primary"
            />
            <StatCard
              title="Low Stock Alerts"
              value={data?.lowStockCount ?? 0}
              subtitle="Items below threshold"
              icon={<AlertTriangle size={20} color="#d97706" />}
              badgeColor={data?.lowStockCount ? 'warning' : 'success'}
            />
            <StatCard
              title="Pending Draft Sales"
              value={data?.pendingChallans ?? 0}
              subtitle="Awaiting inventory check"
              icon={<FileText size={20} color="#0284c7" />}
              badgeColor="warning"
            />
            <StatCard
              title="Confirmed Orders"
              value={data?.confirmedChallans ?? 0}
              subtitle="Completed stock deductions"
              icon={<TrendingUp size={20} color="#059669" />}
              badgeColor="success"
            />
          </div>

          {/* Operational Workflow Shortcuts */}
          <div className="card" style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <img
                src="https://res.cloudinary.com/dtigmagdl/image/upload/v1786448704/ddf06e94-85f0-426a-8aa1-b9dfe8e34c83_kzejjt.png"
                alt="FundsRoom Logo"
                style={{ width: '24px', height: '24px', objectFit: 'contain' }}
              />
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>Enterprise Operations Overview</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              {hasRole(['ADMIN', 'SALES', 'ACCOUNTS']) && (
                <div
                  onClick={() => navigate('/customers')}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', marginBottom: '4px' }}>CRM Operations</div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>Customer Accounts</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Manage client profiles & sales follow-ups</div>
                </div>
              )}

              {hasRole(['ADMIN', 'SALES', 'WAREHOUSE']) && (
                <div
                  onClick={() => navigate('/products')}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', marginBottom: '4px' }}>Inventory Control</div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>Products & Stock</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Track stock levels & movement logs</div>
                </div>
              )}

              {hasRole(['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']) && (
                <div
                  onClick={() => navigate('/challans')}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', marginBottom: '4px' }}>Order Processing</div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>Delivery Challans</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Issue & review delivery orders</div>
                </div>
              )}

              {hasRole(['ADMIN', 'SALES', 'WAREHOUSE']) && (
                <div
                  onClick={() => navigate('/challans')}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', marginBottom: '4px' }}>Fulfillment</div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>Stock Dispatch</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Execute stock deduction & confirm order</div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Shortcuts */}
          <div className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', color: 'var(--text-main)' }}>Quick Actions</h2>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {hasRole(['ADMIN', 'SALES']) && (
                <button onClick={() => navigate('/customers')} className="btn btn-primary">
                  <PlusCircle size={16} />
                  <span>New Customer</span>
                </button>
              )}
              {hasRole(['ADMIN', 'WAREHOUSE']) && (
                <button onClick={() => navigate('/products')} className="btn btn-primary">
                  <PlusCircle size={16} />
                  <span>Add Product</span>
                </button>
              )}
              {hasRole(['ADMIN', 'SALES', 'WAREHOUSE']) && (
                <button onClick={() => navigate('/products')} className="btn btn-secondary">
                  <PackageCheck size={16} />
                  <span>Manage Inventory</span>
                </button>
              )}
              {hasRole(['ADMIN', 'SALES']) && (
                <button onClick={() => navigate('/challans')} className="btn btn-success">
                  <FileText size={16} />
                  <span>Create Delivery Challan</span>
                </button>
              )}
              {hasRole(['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']) && (
                <button onClick={() => navigate('/challans')} className="btn btn-secondary">
                  <FileText size={16} />
                  <span>Delivery Orders & Invoices</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
};
