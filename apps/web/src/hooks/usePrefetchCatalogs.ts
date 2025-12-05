import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

/**
 * Hook de precarga de catálogos críticos
 * 
 * Precarga en background los datos más usados en la aplicación
 * para evitar el "mini refresh" inicial al entrar al Dashboard.
 * 
 * Estos catálogos se usan en múltiples páginas (Dashboard, Reportes, 
 * Facturas, OCs, Provisiones, PPTO) por lo que tenerlos pre-cargados
 * mejora significativamente la experiencia de usuario.
 * 
 * @param isAuthenticated - Si el usuario está autenticado
 */
export function usePrefetchCatalogs(isAuthenticated: boolean = false) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Solo precargar si el usuario está autenticado
    if (!isAuthenticated) return;

    // Lista de catálogos críticos a precargar
    const catalogsToPreload = [
      { key: ["periods"], endpoint: "/periods" },
      { key: ["supports"], endpoint: "/supports" },
      { key: ["cost-centers"], endpoint: "/cost-centers" },
      { key: ["managements"], endpoint: "/managements" },
      { key: ["areas"], endpoint: "/areas" },
      { key: ["expense-packages"], endpoint: "/expense-packages" },
    ];

    // Precargar cada catálogo en background
    catalogsToPreload.forEach(({ key, endpoint }) => {
      queryClient.prefetchQuery({
        queryKey: key,
        queryFn: async () => (await api.get(endpoint)).data,
        // Mantener los datos en caché por 10 minutos
        staleTime: 10 * 60 * 1000,
      });
    });

    // Precargar también el Dashboard con valores por defecto
    // (año actual, modo execution, sin filtros)
    const currentYear = new Date().getFullYear();
    queryClient.prefetchQuery({
      queryKey: ["dashboard", currentYear, "execution", "", "", "", "", "", null, null],
      queryFn: async () => {
        const params = { year: currentYear, mode: "execution" };
        return (await api.get("/reports/dashboard", { params })).data;
      },
      staleTime: 5 * 60 * 1000, // 5 minutos
    });
  }, [queryClient, isAuthenticated]);
}
