import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

export type UserRole = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';

export type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('fundsroom_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMe() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const userData = await api.get<User>('/auth/me');
        setUser(userData);
      } catch (err) {
        console.error('Failed to restore session:', err);
        localStorage.removeItem('fundsroom_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMe();
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('fundsroom_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('fundsroom_token');
    setToken(null);
    setUser(null);
  };

  const hasRole = (roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
