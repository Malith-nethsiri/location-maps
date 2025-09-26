import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';

// Types
interface User {
  id: number;
  uuid: string;
  email: string;
  emailVerified: boolean;
  profile: UserProfile | null;
}

interface UserProfile {
  id: number;
  honorable?: string;
  full_name: string;
  professional_title?: string;
  qualifications?: string[];
  professional_status?: string;
  house_number?: string;
  street_name?: string;
  area_name?: string;
  city?: string;
  district?: string;
  province?: string;
  telephone?: string;
  mobile?: string;
  email_address?: string;
  ivsl_registration?: string;
  professional_body?: string;
  profile_completed: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  initialized: boolean;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: { user: User; token: string } }
  | { type: 'CLEAR_USER' }
  | { type: 'UPDATE_PROFILE'; payload: UserProfile }
  | { type: 'SET_INITIALIZED' };

interface AuthContextValue {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profileData: Partial<UserProfile>) => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  professionalTitle: string;
}

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  loading: false,
  initialized: false
};

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_USER':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        initialized: true
      };

    case 'CLEAR_USER':
      return {
        ...state,
        user: null,
        token: null,
        loading: false,
        initialized: true
      };

    case 'UPDATE_PROFILE':
      return {
        ...state,
        user: state.user ? { ...state.user, profile: action.payload } : null
      };

    case 'SET_INITIALIZED':
      return { ...state, initialized: true };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext<AuthContextValue | null>(null);

// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true
});

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Add token to requests
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use(
      (config) => {
        if (state.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
    };
  }, [state.token]);

  // Response interceptor for handling auth errors
  useEffect(() => {
    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          handleLogout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Check authentication status on app load
  const checkAuthStatus = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Check for stored token
      const storedToken = localStorage.getItem('auth_token');
      if (!storedToken) {
        dispatch({ type: 'SET_INITIALIZED' });
        return;
      }

      // Validate token with server
      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      const response = await api.get('/auth/me');

      if (response.data.success) {
        dispatch({
          type: 'SET_USER',
          payload: {
            user: response.data.data.user,
            token: storedToken
          }
        });
      } else {
        localStorage.removeItem('auth_token');
        dispatch({ type: 'SET_INITIALIZED' });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
      dispatch({ type: 'SET_INITIALIZED' });
    }
  };

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const response = await api.post('/auth/login', { email, password });

      if (response.data.success) {
        const { user, token } = response.data.data;

        // Store token
        localStorage.setItem('auth_token', token);

        // Update state
        dispatch({ type: 'SET_USER', payload: { user, token } });
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error: any) {
      dispatch({ type: 'SET_LOADING', payload: false });
      const message = error.response?.data?.message || error.message || 'Login failed';
      throw new Error(message);
    }
  };

  // Register function
  const register = async (data: RegisterData): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const response = await api.post('/auth/register', data);

      if (response.data.success) {
        dispatch({ type: 'SET_LOADING', payload: false });
        // Registration successful - user needs to verify email
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error: any) {
      dispatch({ type: 'SET_LOADING', payload: false });
      const message = error.response?.data?.message || error.message || 'Registration failed';
      throw new Error(message);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      handleLogout();
    }
  };

  // Handle logout cleanup
  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    delete api.defaults.headers.common['Authorization'];
    dispatch({ type: 'CLEAR_USER' });
  };

  // Update profile function
  const updateProfile = async (profileData: Partial<UserProfile>): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const response = await api.put('/auth/profile', profileData);

      if (response.data.success) {
        dispatch({ type: 'UPDATE_PROFILE', payload: response.data.data.profile });
      } else {
        throw new Error(response.data.message || 'Profile update failed');
      }
    } catch (error: any) {
      dispatch({ type: 'SET_LOADING', payload: false });
      const message = error.response?.data?.message || error.message || 'Profile update failed';
      throw new Error(message);
    }
  };

  // Initialize auth on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value: AuthContextValue = {
    state,
    login,
    register,
    logout,
    updateProfile,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export types
export type { User, UserProfile, RegisterData };