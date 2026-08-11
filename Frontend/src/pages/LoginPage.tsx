import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../context/AuthContext';
import { api, ApiError } from '../api/client';
import { Toast } from '../components/Common';
import { Building2, Lock, Mail, ArrowRight } from 'lucide-react';

type LoginResponse = {
  token: string;
  expiresIn: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: UserRole;
  };
};

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await api.post<LoginResponse>('/auth/login', { email, password });
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to log in. Please check your network connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.3)), url("https://res.cloudinary.com/dtigmagdl/image/upload/v1786445808/ChatGPT_Image_Aug_11_2026_03_48_23_PM_odau2l.png")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '36px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.7)',
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '16px',
        }}
      >
        {/* Logo Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              background: '#4f46e5',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
              color: '#ffffff',
            }}
          >
            <Building2 size={26} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            FundsRoom ERP
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '4px' }}>
            Sign in to access your enterprise operations dashboard
          </p>
        </div>

        {error && <Toast type="error" message={error} onClose={() => setError(null)} />}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                className="form-input"
                style={{ paddingLeft: '40px' }}
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: '24px' }}>
            <label className="input-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '40px' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
};
