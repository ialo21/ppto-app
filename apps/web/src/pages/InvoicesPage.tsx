import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Button from "../components/ui/Button";
import { Table, Th, Td } from "../components/ui/Table";
import StatusChip from "../components/StatusChip";

type OC = {
  id: number;
  numeroOc: string | null;
  proveedor: string;
  moneda: string;
  importeSinIgv: number;
  support: { id: number; name: string };
};

type Invoice = {
  id: number;
  ocId: number | null;
  oc: {
    id: number;
    numeroOc: string | null;
    proveedor: string;
    moneda: string;
    importeSinIgv: number;
    support: {
      id: number;
      name: string;
      expensePackage?: { id: number; name: string } | null;
      expenseConcept?: { id: number; name: string } | null;
      costCenter?: { id: number; code: string; name: string } | null;
    };
    ceco?: { id: number; code: string; name: string } | null;
  } | null;
  docType: string;
  numberNorm: string | null;
  currency: string;
  montoSinIgv: number | null;
  statusCurrent: string;
  ultimusIncident: string | null;
  detalle: string | null;
  createdAt: string;
};

type ConsumoOC = {
  importeTotal: number;
  consumido: number;
  saldoDisponible: number;
  moneda: string;
  proveedor: string;
};

export default function InvoicesPage() {
  const queryClient = useQueryClient();

  // Queries
  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["invoices"],
    queryFn: async () => (await api.get("/invoices")).data
  });

  // Fix: Use correct endpoint /ocs (plural) and prefetch on mount
  const ocsQuery = useQuery<OC[]>({
    queryKey: ["ocs"],
    queryFn: async () => (await api.get("/ocs")).data,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Prefetch OCs on component mount
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ["ocs"],
      queryFn: async () => (await api.get("/ocs")).data,
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);

  // Estados
  const [filters, setFilters] = useState({ status: "", docType: "", numeroOc: "" });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" | null }>({
    key: "createdAt",
    direction: "desc"
  });
  
  // Default sort order
  const DEFAULT_SORT = { key: "createdAt", direction: "desc" as const };
  
  const [form, setForm] = useState({
    id: "",
    ocId: "",
    docType: "FACTURA",
    numberNorm: "",
    montoSinIgv: "",
    ultimusIncident: "",
    detalle: ""
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Query consumo de OC seleccionada
  const { data: consumoOC } = useQuery<ConsumoOC>({
    queryKey: ["invoices", "oc", form.ocId, "consumo"],
    queryFn: async () => (await api.get(`/invoices/oc/${form.ocId}/consumo`)).data,
    enabled: !!form.ocId && Number(form.ocId) > 0
  });

  // OC seleccionada (para mostrar datos read-only)
  const selectedOC = useMemo(() => {
    if (!form.ocId) return null;
    return (ocsQuery.data || []).find(oc => oc.id === Number(form.ocId));
  }, [form.ocId, ocsQuery.data]);

  // Facturas filtradas y ordenadas
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    
    // Filtrar
    let filtered = invoices.filter(inv => {
      if (filters.status && inv.statusCurrent !== filters.status) return false;
      if (filters.docType && inv.docType !== filters.docType) return false;
      if (filters.numeroOc && inv.oc?.numeroOc?.toLowerCase().includes(filters.numeroOc.toLowerCase()) === false) return false;
      return true;
    });

    // Ordenar
    if (sortConfig.key && sortConfig.direction) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case "numberNorm":
            aValue = a.numberNorm || "";
            bValue = b.numberNorm || "";
            break;
          case "docType":
            aValue = a.docType;
            bValue = b.docType;
            break;
          case "numeroOc":
            aValue = a.oc?.numeroOc || "";
            bValue = b.oc?.numeroOc || "";
            break;
          case "proveedor":
            aValue = a.oc?.proveedor || "";
            bValue = b.oc?.proveedor || "";
            break;
          case "currency":
            aValue = a.currency;
            bValue = b.currency;
            break;
          case "montoSinIgv":
            aValue = a.montoSinIgv ? Number(a.montoSinIgv) : 0;
            bValue = b.montoSinIgv ? Number(b.montoSinIgv) : 0;
            break;
          case "paquete":
            aValue = a.oc?.support?.expensePackage?.name || "";
            bValue = b.oc?.support?.expensePackage?.name || "";
            break;
          case "concepto":
            aValue = a.oc?.support?.expenseConcept?.name || "";
            bValue = b.oc?.support?.expenseConcept?.name || "";
            break;
          case "ceco":
            aValue = (a.oc?.ceco?.name || a.oc?.support?.costCenter?.name) || "";
            bValue = (b.oc?.ceco?.name || b.oc?.support?.costCenter?.name) || "";
            break;
          case "ultimusIncident":
            aValue = a.ultimusIncident || "";
            bValue = b.ultimusIncident || "";
            break;
          case "statusCurrent":
            aValue = a.statusCurrent;
            bValue = b.statusCurrent;
            break;
          case "createdAt":
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [invoices, filters, sortConfig]);

  // Handler para ordenamiento
  const handleSort = useCallback((key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        // Ciclo: asc -> desc -> default
        if (prev.direction === "asc") return { key, direction: "desc" };
        if (prev.direction === "desc") return DEFAULT_SORT; // Reset a default
        return { key, direction: "asc" };
      } else {
        return { key, direction: "asc" };
      }
    });
  }, []);

  // Reset form
  const resetForm = () => {
    setForm({
      id: "",
      ocId: "",
      docType: "FACTURA",
      numberNorm: "",
      montoSinIgv: "",
      ultimusIncident: "",
      detalle: ""
    });
    setFieldErrors({});
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async () => {
      // Validación frontend
      const errors: Record<string, string> = {};
      if (!form.ocId) errors.ocId = "OC es requerida";
      if (!form.numberNorm.trim()) errors.numberNorm = "Número es requerido";
      if (!form.montoSinIgv || Number(form.montoSinIgv) < 0) errors.montoSinIgv = "Monto inválido";

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        throw new Error("FRONTEND_VALIDATION_ERROR");
      }

      const payload = {
        ocId: Number(form.ocId),
        docType: form.docType,
        numberNorm: form.numberNorm.trim(),
        montoSinIgv: Number(form.montoSinIgv),
        ultimusIncident: form.ultimusIncident.trim() || undefined,
        detalle: form.detalle.trim() || undefined
      };

      // Debug log in development
      if (import.meta.env.DEV) {
        console.log("📤 Payload factura:", JSON.stringify(payload, null, 2));
      }

      if (form.id) {
        return (await api.patch(`/invoices/${form.id}`, payload)).data;
      } else {
        return (await api.post("/invoices", payload)).data;
      }
    },
    onSuccess: () => {
      toast.success(form.id ? "Factura actualizada" : "Factura creada");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      // Invalidate OCs cache when invoice is created/updated (consumption changes)
      queryClient.invalidateQueries({ queryKey: ["ocs"] });
    },
    onError: (error: any) => {
      if (error.message === "FRONTEND_VALIDATION_ERROR") {
        toast.error("Revisa los campos resaltados");
        return;
      }

      if (error.response?.status === 422 && error.response?.data?.issues) {
        const errors: Record<string, string> = {};
        error.response.data.issues.forEach((issue: any) => {
          const field = issue.path.join(".");
          errors[field] = issue.message;
        });
        setFieldErrors(errors);
        toast.error("Revisa los campos resaltados");
        if (import.meta.env.DEV) {
          console.error("❌ Errores de validación backend:", errors);
          console.error("❌ Response completo:", error.response?.data);
        }
      } else {
        toast.error(error.response?.data?.error || "Error al guardar la factura");
        if (import.meta.env.DEV) {
          console.error("❌ Error completo:", error.response?.data || error);
        }
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/invoices/${id}`)).data,
    onSuccess: () => {
      toast.success("Factura eliminada");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: () => toast.error("Error al eliminar la factura")
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      if (import.meta.env.DEV) {
        console.log("📤 Actualizando estado factura:", { id, status });
      }
      return (await api.patch(`/invoices/${id}/status`, { status })).data;
    },
    onMutate: async ({ id, status }) => {
      // Cancelar refetch en curso para evitar sobrescritura
      await queryClient.cancelQueries({ queryKey: ["invoices"] });
      
      // Snapshot del estado anterior
      const previousInvoices = queryClient.getQueryData<Invoice[]>(["invoices"]);
      
      // Optimistic update: actualizar estado in-place
      if (previousInvoices) {
        queryClient.setQueryData<Invoice[]>(["invoices"], (old) => {
          if (!old) return old;
          return old.map(inv => 
            inv.id === id 
              ? { ...inv, statusCurrent: status }
              : inv
          );
        });
      }
      
      return { previousInvoices };
    },
    onError: (error: any, variables, context) => {
      // Rollback al snapshot
      if (context?.previousInvoices) {
        queryClient.setQueryData(["invoices"], context.previousInvoices);
      }
      
      const errorMsg = error.response?.data?.error || "Error al actualizar estado";
      toast.error(errorMsg);
      
      if (import.meta.env.DEV) {
        console.error("❌ Error actualizando estado:", error.response?.data || error);
      }
    },
    onSuccess: (data, { status }) => {
      const statusLabel = status.replace(/_/g, " ");
      toast.success(`Estado actualizado a ${statusLabel}`);
      
      if (import.meta.env.DEV) {
        console.log("✅ Estado actualizado:", data);
      }
    },
    onSettled: () => {
      // Refetch para asegurar consistencia con el servidor
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    }
  });

  // Handlers estables con useCallback para evitar re-renders innecesarios
  // Fix: Remove fieldErrors from dependency array to prevent re-creating handler
  const handleFormChange = useCallback((field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo al cambiar
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []); // Empty deps - stable reference

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Facturas</h1>

      {/* Formulario de Creación/Edición */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium">{form.id ? "Editar Factura" : "Nueva Factura"}</h2>
          {form.id && (
            <Button variant="ghost" size="sm" onClick={resetForm} className="ml-auto">
              Cancelar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Tipo */}
            <div className="w-full">
              <Select
                value={form.docType}
                onChange={(e) => handleFormChange("docType", e.target.value)}
                className={fieldErrors.docType ? "border-red-500" : ""}
              >
                <option value="FACTURA">FACTURA</option>
                <option value="NOTA_CREDITO">NOTA DE CRÉDITO</option>
              </Select>
              {fieldErrors.docType && <p className="text-xs text-red-600 mt-1">{fieldErrors.docType}</p>}
            </div>

            {/* OC */}
            <div className="md:col-span-2 w-full">
              <Select
                value={form.ocId}
                onChange={(e) => handleFormChange("ocId", e.target.value)}
                className={fieldErrors.ocId ? "border-red-500" : ""}
              >
                <option value="">Selecciona una OC</option>
                {(ocsQuery.data || []).map(oc => (
                  <option key={oc.id} value={oc.id}>
                    {oc.numeroOc || `OC-${oc.id}`} - {oc.proveedor} ({oc.moneda} {Number(oc.importeSinIgv).toFixed(2)})
                  </option>
                ))}
              </Select>
              {fieldErrors.ocId && <p className="text-xs text-red-600 mt-1">{fieldErrors.ocId}</p>}
            </div>

            {/* Número de Factura */}
            <div className="w-full">
              <Input
                placeholder="Número de Factura *"
                value={form.numberNorm}
                onChange={(e) => handleFormChange("numberNorm", e.target.value)}
                className={fieldErrors.numberNorm ? "border-red-500 focus:ring-red-500" : ""}
              />
              {fieldErrors.numberNorm && <p className="text-xs text-red-600 mt-1">{fieldErrors.numberNorm}</p>}
            </div>

            {/* Monto sin IGV */}
            <div className="w-full">
              <Input
                type="number"
                step="0.01"
                placeholder="Monto sin IGV *"
                value={form.montoSinIgv}
                onChange={(e) => handleFormChange("montoSinIgv", e.target.value)}
                className={fieldErrors.montoSinIgv ? "border-red-500 focus:ring-red-500" : ""}
              />
              {fieldErrors.montoSinIgv && <p className="text-xs text-red-600 mt-1">{fieldErrors.montoSinIgv}</p>}
            </div>

            {/* Incidente Ultimus */}
            <div className="w-full">
              <Input
                placeholder="Incidente Ultimus"
                value={form.ultimusIncident}
                onChange={(e) => handleFormChange("ultimusIncident", e.target.value)}
                className={fieldErrors.ultimusIncident ? "border-red-500 focus:ring-red-500" : ""}
              />
              {fieldErrors.ultimusIncident && <p className="text-xs text-red-600 mt-1">{fieldErrors.ultimusIncident}</p>}
            </div>

            {/* Detalle */}
            <div className="md:col-span-3 w-full">
              <Input
                placeholder="Detalle (opcional)"
                value={form.detalle}
                onChange={(e) => handleFormChange("detalle", e.target.value)}
                className={fieldErrors.detalle ? "border-red-500 focus:ring-red-500" : ""}
              />
              {fieldErrors.detalle && <p className="text-xs text-red-600 mt-1">{fieldErrors.detalle}</p>}
            </div>
          </div>

          {/* Información de OC (Read-only) - Fix: Use theme tokens */}
          {selectedOC && (
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2">
              <h3 className="font-medium text-sm text-slate-900 dark:text-slate-100">Información de la OC</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Proveedor:</span>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{selectedOC.proveedor}</p>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Moneda:</span>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{selectedOC.moneda}</p>
                </div>
                {consumoOC && (
                  <>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400">Importe Total:</span>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{consumoOC.moneda} {consumoOC.importeTotal.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400">Consumido:</span>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{consumoOC.moneda} {consumoOC.consumido.toFixed(2)}</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-slate-600 dark:text-slate-400">Saldo Disponible:</span>
                      <p className={`font-medium ${consumoOC.saldoDisponible < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                        {consumoOC.moneda} {consumoOC.saldoDisponible.toFixed(2)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="mt-4">
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {form.id ? "Actualizar Factura" : "Crear Factura"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filtros y Tabla */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium">Listado de Facturas</h2>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Select
              value={filters.docType}
              onChange={e => {
                setFilters(f => ({ ...f, docType: e.target.value }));
                // Reset sorting al cambiar filtros
                setSortConfig(DEFAULT_SORT);
              }}
            >
              <option value="">Todos los tipos</option>
              <option value="FACTURA">FACTURA</option>
              <option value="NOTA_CREDITO">NOTA DE CRÉDITO</option>
            </Select>

            <Select
              value={filters.status}
              onChange={e => {
                setFilters(f => ({ ...f, status: e.target.value }));
                // Reset sorting al cambiar filtros
                setSortConfig(DEFAULT_SORT);
              }}
            >
              <option value="">Todos los estados</option>
              <option value="INGRESADO">INGRESADO</option>
              <option value="EN_APROBACION">EN APROBACIÓN</option>
              <option value="EN_CONTABILIDAD">EN CONTABILIDAD</option>
              <option value="EN_TESORERIA">EN TESORERÍA</option>
              <option value="EN_ESPERA_DE_PAGO">EN ESPERA DE PAGO</option>
              <option value="PAGADO">PAGADO</option>
              <option value="RECHAZADO">RECHAZADO</option>
          </Select>

            <Input
              placeholder="Buscar por Número OC"
              value={filters.numeroOc}
              onChange={e => {
                setFilters(f => ({ ...f, numeroOc: e.target.value }));
                // Reset sorting al cambiar filtros
                setSortConfig(DEFAULT_SORT);
              }}
              className="max-w-xs"
            />

            <Button
              onClick={() => {
                const p = new URLSearchParams();
                if (filters.status) p.set("status", filters.status);
                if (filters.docType) p.set("docType", filters.docType);
                window.open(`http://localhost:3001/invoices/export/csv?${p.toString()}`, "_blank");
              }}
            >
              Exportar CSV
            </Button>
        </div>

          {isLoading ? (
            <p>Cargando...</p>
          ) : (
            <div className="overflow-x-auto">
          <Table>
                <thead>
                  <tr>
                    <Th className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort("numberNorm")}>
                      Número {sortConfig.key === "numberNorm" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort("docType")}>
                      Tipo {sortConfig.key === "docType" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort("numeroOc")}>
                      OC {sortConfig.key === "numeroOc" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort("proveedor")}>
                      Proveedor {sortConfig.key === "proveedor" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort("currency")}>
                      Moneda {sortConfig.key === "currency" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort("montoSinIgv")}>
                      Monto sin IGV {sortConfig.key === "montoSinIgv" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort("paquete")}>
                      Paquete {sortConfig.key === "paquete" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort("concepto")}>
                      Concepto {sortConfig.key === "concepto" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort("ceco")}>
                      CECO {sortConfig.key === "ceco" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort("ultimusIncident")}>
                      Incidente {sortConfig.key === "ultimusIncident" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort("statusCurrent")}>
                      Estado {sortConfig.key === "statusCurrent" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th>Acciones</Th>
                  </tr>
                </thead>
            <tbody>
                  {filteredInvoices.map((inv: Invoice) => (
                <tr key={inv.id}>
                      <Td>{inv.numberNorm || "-"}</Td>
                      <Td>
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            inv.docType === "FACTURA" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                          }`}
                        >
                          {inv.docType}
                        </span>
                      </Td>
                      <Td>{inv.oc?.numeroOc || "-"}</Td>
                      <Td>{inv.oc?.proveedor || "-"}</Td>
                      <Td>{inv.currency}</Td>
                      <Td className="text-right">{inv.montoSinIgv ? Number(inv.montoSinIgv).toFixed(2) : "-"}</Td>
                      <Td>{inv.oc?.support?.expensePackage?.name || "-"}</Td>
                      <Td>{inv.oc?.support?.expenseConcept?.name || "-"}</Td>
                      <Td>{(inv.oc?.ceco?.name || inv.oc?.support?.costCenter?.name) || "-"}</Td>
                      <Td className="text-xs">{inv.ultimusIncident || "-"}</Td>
                      <Td>
                        <StatusChip
                          currentStatus={inv.statusCurrent}
                          onStatusChange={(newStatus) => 
                            updateStatusMutation.mutate({ id: inv.id, status: newStatus })
                          }
                          isLoading={updateStatusMutation.isPending && updateStatusMutation.variables?.id === inv.id}
                        />
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setForm({
                                id: String(inv.id),
                                ocId: inv.ocId ? String(inv.ocId) : "",
                                docType: inv.docType,
                                numberNorm: inv.numberNorm || "",
                                montoSinIgv: inv.montoSinIgv ? String(inv.montoSinIgv) : "",
                                ultimusIncident: inv.ultimusIncident || "",
                                detalle: inv.detalle || ""
                              })
                            }
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("¿Eliminar esta factura?")) {
                                deleteMutation.mutate(inv.id);
                              }
                            }}
                          >
                            Eliminar
                          </Button>
                        </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
            </div>
        )}
        </CardContent>
      </Card>
    </div>
  );
}
