import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "../lib/api";
import { usePrefetchCatalogs } from "../hooks/usePrefetchCatalogs";

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  permissions: string[];
  roles: { id: number; name: string }[];
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  isSuperAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar sesión al cargar
  useEffect(() => {
    checkSession();
  }, []);

  // Precargar catálogos cuando el usuario esté autenticado
  // Esto evita el "mini refresh" al entrar al Dashboard por primera vez
  usePrefetchCatalogs(!!user && !loading);

  async function checkSession() {
    try {
      const response = await api.get("/auth/me");
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  // Ya no necesitamos login manual, OAuth maneja todo
  async function login(email: string, name?: string) {
    // Redirigir a OAuth en lugar de POST
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
    window.location.href = `${apiUrl}/auth/google`;
  }

  async function logout() {
    // Primero llamar al backend para destruir la sesión
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Error al cerrar sesión en el servidor:", error);
      // Continuar con el logout del cliente incluso si falla el servidor
    }
    
    // Limpiar estado local después de que el backend responda
    setUser(null);
  }

  function hasPermission(permission: string): boolean {
    if (!user) return false;
    return user.permissions.includes(permission);
  }

  function isSuperAdmin(): boolean {
    if (!user) return false;
    return user.roles.some(role => role.name === "super_admin");
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}
