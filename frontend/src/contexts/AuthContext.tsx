import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

export interface LoginResult {
  otpRequired: boolean;
  email?: string;
  message?: string;
  otp?: string;
  user?: User;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyLoginOtp: (email: string, otp: string) => Promise<User>;
  resendLoginOtp: (email: string) => Promise<{ message: string; otp?: string }>;
  signup: (name: string, email: string, password: string, otp: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeUser = (user: Omit<User, 'role'> & { role?: string }): User => ({
  ...user,
  role: user.role === 'admin' ? 'admin' : 'user',
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On app load, restore session from token in localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.get('/auth/me')
      .then((res) => setUser(normalizeUser(res.data.user)))
      .catch(() => {
        localStorage.removeItem('token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // Step 1: Submit credentials to start login
  const login = async (email: string, password: string): Promise<LoginResult> => {
    const res = await api.post('/auth/login', { email, password });

    if (res.data.otpRequired) {
      return {
        otpRequired: true,
        email: res.data.email || email,
        message: res.data.message,
        otp: res.data.otp,
      };
    }

    // Direct token return fallback
    if (res.data.token && res.data.user) {
      localStorage.setItem('token', res.data.token);
      const authenticatedUser = normalizeUser(res.data.user);
      setUser(authenticatedUser);
      return {
        otpRequired: false,
        user: authenticatedUser,
      };
    }

    return { otpRequired: false };
  };

  // Step 2: Verify OTP received on email
  const verifyLoginOtp = async (email: string, otp: string): Promise<User> => {
    const res = await api.post('/auth/login-verify-otp', { email, otp });
    localStorage.setItem('token', res.data.token);
    const authenticatedUser = normalizeUser(res.data.user);
    setUser(authenticatedUser);
    return authenticatedUser;
  };

  // Resend Login OTP
  const resendLoginOtp = async (email: string): Promise<{ message: string; otp?: string }> => {
    const res = await api.post('/auth/resend-login-otp', { email });
    return res.data;
  };

  // Signup with OTP verification
  const signup = async (name: string, email: string, password: string, otp: string) => {
    const res = await api.post('/auth/signup', { name, email, password, otp });
    localStorage.setItem('token', res.data.token);
    setUser(normalizeUser(res.data.user));
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, verifyLoginOtp, resendLoginOtp, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};