import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/index.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (identifier: string, password?: string) => Promise<boolean>;
  logout: () => void;
  quickSwitch: (role: UserRole, customIdentifier?: string) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('tkrec_token') || localStorage.getItem('apex_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        localStorage.removeItem('tkrec_token');
        localStorage.removeItem('apex_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (identifier: string, password = 'college123'): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Authentication failed');
      }

      const data = await res.json();
      localStorage.setItem('tkrec_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return true;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('tkrec_token');
    localStorage.removeItem('apex_token');
    setToken(null);
    setUser(null);
  };

  const quickSwitch = async (role: UserRole, customIdentifier?: string): Promise<boolean> => {
    let targetIdentifier = customIdentifier;
    if (!targetIdentifier) {
      switch (role) {
        case 'student':
          targetIdentifier = '22TKRECCSE001';
          break;
        case 'faculty':
          targetIdentifier = 'FAC-CSE-02';
          break;
        case 'hod':
          targetIdentifier = 'hod_cse';
          break;
        case 'placement':
          targetIdentifier = 'placement_head';
          break;
        case 'admin':
          targetIdentifier = 'admin';
          break;
      }
    }
    return login(targetIdentifier!, 'college123');
  };

  const refreshProfile = async () => {
    if (token) {
      await fetchProfile(token);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, quickSwitch, refreshProfile }}>
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
