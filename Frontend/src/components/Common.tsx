import React from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  badgeColor?: 'primary' | 'success' | 'warning' | 'danger';
}> = ({ title, value, subtitle, icon, trend, badgeColor = 'primary' }) => {
  const glowMap = {
    primary: '#eef2ff',
    success: '#ecfdf5',
    warning: '#fffbeb',
    danger: '#fef2f2',
  };

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </span>
        <div
          style={{
            padding: '8px',
            borderRadius: 'var(--radius-md)',
            background: glowMap[badgeColor],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
      </div>
      <div>
        <div style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          {value}
        </div>
        {subtitle && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            {subtitle}
          </div>
        )}
      </div>
      {trend && (
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: badgeColor === 'danger' ? '#dc2626' : '#059669' }}>
          {trend}
        </div>
      )}
    </div>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getBadgeClass = (s: string) => {
    switch (s.toUpperCase()) {
      case 'LEAD': return 'badge-lead';
      case 'ACTIVE': return 'badge-active';
      case 'INACTIVE': return 'badge-inactive';
      case 'DRAFT': return 'badge-draft';
      case 'CONFIRMED': return 'badge-confirmed';
      case 'CANCELLED': return 'badge-cancelled';
      case 'IN': return 'badge-in';
      case 'OUT': return 'badge-out';
      default: return 'badge-lead';
    }
  };

  return <span className={`badge ${getBadgeClass(status)}`}>{status}</span>;
};

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const Toast: React.FC<{
  type: 'success' | 'error' | 'info';
  message: string;
  onClose?: () => void;
}> = ({ type, message, onClose }) => {
  const bgMap = {
    success: '#ecfdf5',
    error: '#fef2f2',
    info: '#f0f9ff',
  };
  const borderMap = {
    success: '#a7f3d0',
    error: '#fecaca',
    info: '#bae6fd',
  };
  const textMap = {
    success: '#065f46',
    error: '#991b1b',
    info: '#075985',
  };
  const iconMap = {
    success: <CheckCircle size={18} color="#059669" />,
    error: <AlertCircle size={18} color="#dc2626" />,
    info: <Info size={18} color="#0284c7" />,
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        background: bgMap[type],
        border: `1px solid ${borderMap[type]}`,
        borderRadius: 'var(--radius-md)',
        marginBottom: '16px',
        fontSize: '0.875rem',
      }}
    >
      {iconMap[type]}
      <span style={{ flex: 1, color: textMap[type], fontWeight: 500 }}>{message}</span>
      {onClose && (
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: textMap[type] }}>
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export const LoadingSpinner: React.FC = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
    <div
      style={{
        width: '32px',
        height: '32px',
        border: '3px solid #e2e8f0',
        borderTopColor: 'var(--primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);
