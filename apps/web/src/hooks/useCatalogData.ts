import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useManagements() {
  return useQuery({
    queryKey: ["managements"],
    queryFn: async () => (await api.get("/managements")).data
  });
}

export function useAreas() {
  return useQuery({
    queryKey: ["areas"],
    queryFn: async () => (await api.get("/areas")).data
  });
}

export function useExpensePackages() {
  return useQuery({
    queryKey: ["expense-packages"],
    queryFn: async () => (await api.get("/expense-packages")).data
  });
}

export function useCostCenters() {
  return useQuery({
    queryKey: ["cost-centers"],
    queryFn: async () => (await api.get("/cost-centers")).data
  });
}

