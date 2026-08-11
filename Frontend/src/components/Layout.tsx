import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  LogOut,
  Shield,
  Building2,
} from 'lucide-react';

type NavItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: UserRole[];
};

export const Sidebar: React.FC = () => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: <LayoutDashboard size={18} />,
      roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
    },
    {
      label: 'Customers (CRM)',
      path: '/customers',
      icon: <Users size={18} />,
      roles: ['ADMIN', 'SALES', 'ACCOUNTS'],
    },
    {
      label: 'Products & Stock',
      path: '/products',
      icon: <Package size={18} />,
      roles: ['ADMIN', 'SALES', 'WAREHOUSE'],
    },
    {
      label: 'Sales Challans',
      path: '/challans',
      icon: <FileText size={18} />,
      roles: ['ADMIN', 'SALES', 'ACCOUNTS'],
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      style={{
        width: '240px',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        background: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '20px 14px',
        zIndex: 50,
      }}
    >
      <div>
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 6px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <Building2 size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              FundsRoom ERP
            </h1>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b' }}>
              Enterprise Operations
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '20px' }}>
          {navItems
            .filter((item) => hasRole(item.roles))
            .map((item) => {
              const isActive = location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    color: isActive ? '#4f46e5' : '#475569',
                    background: isActive ? '#eef2ff' : 'transparent',
                    borderLeft: isActive ? '3px solid #4f46e5' : '3px solid transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ color: isActive ? '#4f46e5' : '#64748b' }}>{item.icon}</span>
                  {item.label}
                </NavLink>
              );
            })}
        </nav>
      </div>

      {/* User Profile Footer */}
      <div style={{ paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', padding: '0 4px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: '#eef2ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.8125rem',
              color: '#4f46e5',
              border: '1px solid #c7d2fe',
            }}
          >
            {user?.name.slice(0, 2).toUpperCase() || 'US'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <Shield size={11} color="#4f46e5" />
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' }}>
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="btn btn-secondary"
          style={{ width: '100%', justifyContent: 'flex-start', gap: '8px', padding: '7px 12px', fontSize: '0.8125rem' }}
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export const Header: React.FC<{ title: string; subtitle?: string; actions?: React.ReactNode }> = ({
  title,
  subtitle,
  actions,
}) => {
  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e2e8f0',
      }}
    >
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '3px' }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div style={{ display: 'flex', gap: '10px' }}>{actions}</div>}
    </header>
  );
};

export const Layout: React.FC<{ title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  subtitle,
  actions,
  children,
}) => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Sidebar />
      <main
        style={{
          marginLeft: '240px',
          flex: 1,
          padding: '28px 36px',
          maxWidth: '1400px',
        }}
      >
        <Header title={title} subtitle={subtitle} actions={actions} />
        {children}
      </main>
    </div>
  );
};
