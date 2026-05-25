import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getStoredToken, JWT_TOKEN_KEY, logout as apiLogout, USER_ROLE_KEY } from "./api";

type AuthState = {
  token: string | null;
  role: string | null;
  loading: boolean;
  setAuth: (token: string, role: string) => Promise<void>;
  clearAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  token: null,
  role: null,
  loading: true,
  setAuth: async () => {},
  clearAuth: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [t, r] = await AsyncStorage.multiGet([JWT_TOKEN_KEY, USER_ROLE_KEY]);
      setToken(t[1]);
      setRole(r[1]);
      setLoading(false);
    })();
  }, []);

  const setAuth = useCallback(async (t: string, r: string) => {
    await AsyncStorage.setItem(JWT_TOKEN_KEY, t);
    await AsyncStorage.setItem(USER_ROLE_KEY, r);
    setToken(t);
    setRole(r);
  }, []);

  const clearAuth = useCallback(async () => {
    await apiLogout();
    setToken(null);
    setRole(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, role, loading, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
