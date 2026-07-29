'use client';

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { AuthenticatedUser, UserProfile, UserCredits } from '@/lib/types';

// =============================================
// 状态类型
// =============================================
interface AuthState {
  user: AuthenticatedUser | null;
  isLoading: boolean;
}

type AuthAction =
  | { type: 'SET_USER'; user: AuthenticatedUser }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SIGN_OUT' }
  | { type: 'UPDATE_PROFILE'; profile: UserProfile };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_USER':
      return { user: action.user, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading };
    case 'SIGN_OUT':
      return { user: null, isLoading: false };
    case 'UPDATE_PROFILE':
      if (!state.user) return state;
      return {
        ...state,
        user: { ...state.user, profile: action.profile },
      };
    default:
      return state;
  }
}

// =============================================
// Context 值类型
// =============================================
interface AuthContextValue {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => void;
  refreshUser: () => Promise<void>;
  updateProfile: (data: { full_name: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// =============================================
// Provider Props
// =============================================
interface AuthProviderProps {
  children: ReactNode;
  initialUser?: AuthenticatedUser | null;
}

// =============================================
// Provider 组件
// =============================================
export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, {
    user: initialUser || null,
    isLoading: !initialUser, // 有 initialUser 则无需 loading
  });

  // 调用 API 获取用户信息
  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/protected/profile');
      if (res.ok) {
        const data = await res.json();
        dispatch({
          type: 'SET_USER',
          user: {
            id: data.profile?.id || '',
            profile: data.profile,
            credits: data.credits || { remaining_analyses: 0, total_purchased: 0 },
          },
        });
      } else {
        dispatch({ type: 'SIGN_OUT' });
      }
    } catch {
      dispatch({ type: 'SIGN_OUT' });
    }
  }, []);

  // 初始化：如果没有 initialUser，主动请求
  useEffect(() => {
    if (initialUser) return; // 已有服务端数据，跳过

    dispatch({ type: 'SET_LOADING', isLoading: true });
    fetchUser();
  }, [initialUser, fetchUser]);

  // 监听 Supabase 认证状态变化
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) {
          await fetchUser();
        }
      } else if (event === 'SIGNED_OUT') {
        dispatch({ type: 'SIGN_OUT' });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUser]);

  // 退出登录
  const signOut = useCallback(() => {
    const supabase = createSupabaseBrowserClient();
    dispatch({ type: 'SIGN_OUT' });
    // 硬跳转到首页，清除所有状态
    window.location.href = '/';
  }, []);

  // 刷新用户信息
  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  // 更新 Profile
  const updateProfile = useCallback(
    async (data: { full_name: string }) => {
      const res = await fetch('/api/protected/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || '更新失败');
      }
      dispatch({ type: 'UPDATE_PROFILE', profile: result.profile });
    },
    []
  );

  const value: AuthContextValue = {
    user: state.user,
    isLoading: state.isLoading,
    isAuthenticated: !!state.user,
    signOut,
    refreshUser,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// =============================================
// useAuth hook
// =============================================
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用');
  }
  return context;
}
