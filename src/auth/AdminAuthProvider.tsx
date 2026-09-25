import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import { adminAuthApi } from "@api/admin";
import type { AdminMe, Permission } from "@api/types";

type AdminAuthContextValue = {
  user: AdminMe | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: PropsWithChildren): JSX.Element {
  const [user, setUser] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onRefresh = (event: Event): void => setUser((event as CustomEvent<AdminMe>).detail);
    window.addEventListener("naucto:session-refreshed", onRefresh);
    return () => window.removeEventListener("naucto:session-refreshed", onRefresh);
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const me = await adminAuthApi.me();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const me = await adminAuthApi.me();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const me = await adminAuthApi.login(email, password);
    setUser(me);
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminAuthApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AdminAuthContextValue>(
    () => ({ user, loading, login, logout, refreshMe }),
    [user, loading, login, logout, refreshMe]
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return ctx;
}

export function usePermissions(): (permission: Permission) => boolean {
  const { user } = useAdminAuth();
  return (permission) => user?.permissions.includes(permission) ?? false;
}

export function useIsStaff(): boolean {
  const { user } = useAdminAuth();
  return Boolean(user?.permissions.length);
}
