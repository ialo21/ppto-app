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
  costCenters?: { id: number; costCenterId: number; costCenter: { id: number; code: string; name: string } }[];
  budgetPeriodFrom?: { id: number; year: number; month: number };
  budgetPeriodTo?: { id: number; year: number; month: number };
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
    costCenters?: { id: number; costCenterId: number; costCenter: { id: number; code: string; name: string } }[];
    budgetPeriodFrom?: { id: number; year: number; month: number };
    budgetPeriodTo?: { id: number; year: number; month: number };
  } | null;
  docType: string;
  numberNorm: string | null;
  currency: string;
  montoSinIgv: number | null;
  statusCurrent: string;
  ultimusIncident: string | null;
  detalle: string | null;
  createdAt: string;
  periods?: { id: number; periodId: number; period: { id: number; year: number; month: number; label?: string } }[];
  costCenters?: { id: number; costCenterId: number; amount?: number; percentage?: number; costCenter: { id: number; code: string; name: string } }[];
};

type ConsumoOC = {
  importeTotal: number;
  consumido: number;
  saldoDisponible: number;
  moneda: string;
  proveedor: string;
};

type Allocation = {
  costCenterId: number;
  amount?: number;
  percentage?: number;
};

function formatPeriodLabel(period: { year: number; month: number }): string {
  return `${period.year}-${String(period.month).padStart(2, '0')}`;
}

function formatPeriodsRange(periods: { year: number; month: number }[]): string {
  if (!periods || periods.length === 0) return "-";
  if (periods.length === 1) return formatPeriodLabel(periods[0]);
  const sorted = [...periods].sort((a, b) => {
    const aValue = a.year * 100 + a.month;
    const bValue = b.year * 100 + b.month;
    return aValue - bValue;
  });
  return `${formatPeriodLabel(sorted[0])} → ${formatPeriodLabel(sorted[sorted.length - 1])}`;
}

export default function InvoicesPage() {
  const queryClient = useQueryClient();

  // Queries
  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["invoices"],
    queryFn: async () => (await api.get("/invoices")).data
  });

  const ocsQuery = useQuery<OC[]>({
    queryKey: ["ocs"],
    queryFn: async () => (await api.get("/ocs")).data,
    staleTime: 5 * 60 * 1000,
  });

  const { data: periods } = useQuery({
    queryKey: ["periods"],
    queryFn: async () => (await api.get("/periods")).data
  });

  const { data: costCenters } = useQuery({
    queryKey: ["cost-centers"],
    queryFn: async () => (await api.get("/cost-centers")).data
  });

  // Estados
  const [filters, setFilters] = useState({ status: "", docType: "", numeroOc: "" });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" | null }>({
    key: "createdAt",
    direction: "desc"
  });

  const DEFAULT_SORT = { key: "createdAt", direction: "desc" as const };

  const [hasOC, setHasOC] = useState(true);  // Toggle Con OC / Sin OC
  const [form, setForm] = useState({
    id: "",
    ocId: "",
    docType: "FACTURA",
    numberNorm: "",
    montoSinIgv: "",
    ultimusIncident: "",
    detalle: "",
    proveedor: "",
    moneda: "PEN"
  });
  const [periodIds, setPeriodIds] = useState<number[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Query consumo de OC seleccionada
  const { data: consumoOC } = useQuery<ConsumoOC>({
    queryKey: ["invoices", "oc", form.ocId, "consumo"],
    queryFn: async () => (await api.get(`/invoices/oc/${form.ocId}/consumo`)).data,
    enabled: !!form.ocId && Number(form.ocId) > 0
  });

  // OC seleccionada
  const selectedOC = useMemo(() => {
    if (!form.ocId) return null;
    return (ocsQuery.data || []).find(oc => oc.id === Number(form.ocId));
  }, [form.ocId, ocsQuery.data]);

  // CECOs disponibles (desde OC seleccionada o todos si sin OC)
  const availableCostCenters = useMemo(() => {
    if (hasOC && selectedOC && selectedOC.costCenters) {
      return selectedOC.costCenters.map(cc => cc.costCenter);
    }
    return costCenters || [];
  }, [hasOC, selectedOC, costCenters]);

  // Periodos disponibles (desde OC seleccionada o todos si sin OC)
  const availablePeriods = useMemo(() => {
    if (!periods) return [];
    if (hasOC && selectedOC && selectedOC.budgetPeriodFrom && selectedOC.budgetPeriodTo) {
      const fromValue = selectedOC.budgetPeriodFrom.year * 100 + selectedOC.budgetPeriodFrom.month;
      const toValue = selectedOC.budgetPeriodTo.year * 100 + selectedOC.budgetPeriodTo.month;
      return periods.filter((p: any) => {
        const pValue = p.year * 100 + p.month;
        return pValue >= fromValue && pValue <= toValue;
      });
    }
    return periods;
  }, [hasOC, selectedOC, periods]);

  // Facturas filtradas y ordenadas
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];

    let filtered = invoices.filter(inv => {
      if (filters.status && inv.statusCurrent !== filters.status) return false;
      if (filters.docType && inv.docType !== filters.docType) return false;
      if (filters.numeroOc && inv.oc?.numeroOc?.toLowerCase().includes(filters.numeroOc.toLowerCase()) === false) return false;
      return true;
    });

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

  const handleSort = useCallback((key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === "asc") return { key, direction: "desc" };
        if (prev.direction === "desc") return DEFAULT_SORT;
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
      detalle: "",
      proveedor: "",
      moneda: "PEN"
    });
    setPeriodIds([]);
    setAllocations([]);
    setFieldErrors({});
    setHasOC(true);
  };

  // Auto-distribuir monto entre CECOs
  const distributeAmount = (amount: number, cecoIds: number[]) => {
    if (cecoIds.length === 0) return [];
    const perCeco = amount / cecoIds.length;
    return cecoIds.map(id => ({
      costCenterId: id,
      amount: Math.round(perCeco * 100) / 100,
      percentage: Math.round((100 / cecoIds.length) * 100) / 100
    }));
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async () => {
      // Validación frontend
      const errors: Record<string, string> = {};
      if (hasOC && !form.ocId) errors.ocId = "OC es requerida";
      if (!hasOC && !form.proveedor.trim()) errors.proveedor = "Proveedor es requerido";
      if (!form.numberNorm.trim()) errors.numberNorm = "Número es requerido";
      if (!form.montoSinIgv || Number(form.montoSinIgv) < 0) errors.montoSinIgv = "Monto inválido";
      if (periodIds.length === 0) errors.periodIds = "Debe seleccionar al menos un periodo";
      if (allocations.length === 0) errors.allocations = "Debe seleccionar al menos un CECO";

      const totalAllocated = allocations.reduce((sum, a) => sum + (a.amount || 0), 0);
      const tolerance = 0.01;
      if (Math.abs(totalAllocated - Number(form.montoSinIgv)) > tolerance) {
        errors.allocations = `La suma de las distribuciones (${totalAllocated.toFixed(2)}) no coincide con el monto total (${Number(form.montoSinIgv).toFixed(2)})`;
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        throw new Error("FRONTEND_VALIDATION_ERROR");
      }

      const payload: any = {
        ocId: hasOC ? Number(form.ocId) : undefined,
        docType: form.docType,
        numberNorm: form.numberNorm.trim(),
        montoSinIgv: Number(form.montoSinIgv),
        periodIds,
        allocations,
        ultimusIncident: form.ultimusIncident.trim() || undefined,
        detalle: form.detalle.trim() || undefined
      };

      if (!hasOC) {
        payload.proveedor = form.proveedor.trim();
        payload.moneda = form.moneda;
      }

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
      await queryClient.cancelQueries({ queryKey: ["invoices"] });
      const previousInvoices = queryClient.getQueryData<Invoice[]>(["invoices"]);
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
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    }
  });

  const handleFormChange = useCallback((field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  // Cuando se selecciona OC, auto-cargar periodos y CECOs
  useEffect(() => {
    if (hasOC && selectedOC && !form.id) {
      // Auto-cargar periodos (desde hasta)
      if (selectedOC.budgetPeriodFrom && selectedOC.budgetPeriodTo && periods) {
        const fromValue = selectedOC.budgetPeriodFrom.year * 100 + selectedOC.budgetPeriodFrom.month;
        const toValue = selectedOC.budgetPeriodTo.year * 100 + selectedOC.budgetPeriodTo.month;
        const relevantPeriods = periods.filter((p: any) => {
          const pValue = p.year * 100 + p.month;
          return pValue >= fromValue && pValue <= toValue;
        });
        setPeriodIds(relevantPeriods.map((p: any) => p.id));
      }

      // Auto-cargar CECOs
      if (selectedOC.costCenters && selectedOC.costCenters.length > 0) {
        const cecoIds = selectedOC.costCenters.map(cc => cc.costCenterId);
        const amount = Number(form.montoSinIgv) || 0;
        if (amount > 0) {
          setAllocations(distributeAmount(amount, cecoIds));
        }
      }
    }
  }, [hasOC, selectedOC, form.id, form.montoSinIgv, periods]);

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
          {/* Toggle Con OC / Sin OC */}
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={hasOC}
                onChange={(e) => {
                  setHasOC(e.target.checked);
                  if (e.target.checked) {
                    setForm(f => ({ ...f, proveedor: "", moneda: "PEN" }));
                  } else {
                    setForm(f => ({ ...f, ocId: "" }));
                  }
                }}
                className="rounded"
              />
              Asociar a Orden de Compra
            </label>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Tipo */}
            <div className="w-full">
              <label className="block text-sm font-medium mb-1">Tipo *</label>
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

            {/* OC o Proveedor/Moneda manual */}
            {hasOC ? (
              <div className="md:col-span-2 w-full">
                <label className="block text-sm font-medium mb-1">Orden de Compra *</label>
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
            ) : (
              <>
                <div className="w-full">
                  <label className="block text-sm font-medium mb-1">Proveedor *</label>
                  <Input
                    placeholder="Proveedor"
                    value={form.proveedor}
                    onChange={(e) => handleFormChange("proveedor", e.target.value)}
                    className={fieldErrors.proveedor ? "border-red-500" : ""}
                  />
                  {fieldErrors.proveedor && <p className="text-xs text-red-600 mt-1">{fieldErrors.proveedor}</p>}
                </div>
                <div className="w-full">
                  <label className="block text-sm font-medium mb-1">Moneda *</label>
                  <Select
                    value={form.moneda}
                    onChange={(e) => handleFormChange("moneda", e.target.value)}
                    className={fieldErrors.moneda ? "border-red-500" : ""}
                  >
                    <option value="PEN">PEN</option>
                    <option value="USD">USD</option>
                  </Select>
                  {fieldErrors.moneda && <p className="text-xs text-red-600 mt-1">{fieldErrors.moneda}</p>}
                </div>
              </>
            )}

            {/* Número de Factura */}
            <div className="w-full">
              <label className="block text-sm font-medium mb-1">Número de Factura *</label>
              <Input
                placeholder="Número de Factura"
                value={form.numberNorm}
                onChange={(e) => handleFormChange("numberNorm", e.target.value)}
                className={fieldErrors.numberNorm ? "border-red-500" : ""}
              />
              {fieldErrors.numberNorm && <p className="text-xs text-red-600 mt-1">{fieldErrors.numberNorm}</p>}
            </div>

            {/* Monto sin IGV */}
            <div className="w-full">
              <label className="block text-sm font-medium mb-1">Monto sin IGV *</label>
              <Input
                type="number"
                step="0.01"
                placeholder="Monto sin IGV"
                value={form.montoSinIgv}
                onChange={(e) => {
                  handleFormChange("montoSinIgv", e.target.value);
                  // Redistribuir si ya hay CECOs seleccionados
                  if (allocations.length > 0 && Number(e.target.value) > 0) {
                    const cecoIds = allocations.map(a => a.costCenterId);
                    setAllocations(distributeAmount(Number(e.target.value), cecoIds));
                  }
                }}
                className={fieldErrors.montoSinIgv ? "border-red-500" : ""}
              />
              {fieldErrors.montoSinIgv && <p className="text-xs text-red-600 mt-1">{fieldErrors.montoSinIgv}</p>}
            </div>

            {/* Incidente Ultimus */}
            <div className="w-full">
              <label className="block text-sm font-medium mb-1">Incidente Ultimus</label>
              <Input
                placeholder="Incidente Ultimus"
                value={form.ultimusIncident}
                onChange={(e) => handleFormChange("ultimusIncident", e.target.value)}
                className={fieldErrors.ultimusIncident ? "border-red-500" : ""}
              />
              {fieldErrors.ultimusIncident && <p className="text-xs text-red-600 mt-1">{fieldErrors.ultimusIncident}</p>}
            </div>

            {/* Periodos (múltiple) */}
            <div className="md:col-span-2 w-full">
              <label className="block text-sm font-medium mb-1">Meses de Registro *</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {availablePeriods.map((period: any) => {
                  const isSelected = periodIds.includes(period.id);
                  return (
                    <button
                      key={period.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setPeriodIds(prev => prev.filter(id => id !== period.id));
                        } else {
                          setPeriodIds(prev => [...prev, period.id]);
                        }
                      }}
                      className={`px-2 py-1 text-xs rounded ${
                        isSelected
                          ? "bg-brand-500 text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {formatPeriodLabel(period)}
                    </button>
                  );
                })}
              </div>
              {fieldErrors.periodIds && <p className="text-xs text-red-600 mt-1">{fieldErrors.periodIds}</p>}
            </div>

            {/* Detalle */}
            <div className="md:col-span-3 w-full">
              <label className="block text-sm font-medium mb-1">Detalle</label>
              <Input
                placeholder="Detalle (opcional)"
                value={form.detalle}
                onChange={(e) => handleFormChange("detalle", e.target.value)}
                className={fieldErrors.detalle ? "border-red-500" : ""}
              />
              {fieldErrors.detalle && <p className="text-xs text-red-600 mt-1">{fieldErrors.detalle}</p>}
            </div>
          </div>

          {/* Distribución por CECO */}
          <div className="mt-4">
            <h3 className="text-md font-medium mb-2">Distribución por CECO *</h3>
            <div className="space-y-2">
              {availableCostCenters.map((ceco: any) => {
                const allocation = allocations.find(a => a.costCenterId === ceco.id);
                return (
                  <div key={ceco.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!allocation}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const amount = Number(form.montoSinIgv) || 0;
                          const currentAllocations = allocations.filter(a => a.costCenterId !== ceco.id);
                          const newCecoIds = [...currentAllocations.map(a => a.costCenterId), ceco.id];
                          setAllocations(distributeAmount(amount, newCecoIds));
                        } else {
                          setAllocations(prev => {
                            const filtered = prev.filter(a => a.costCenterId !== ceco.id);
                            const amount = Number(form.montoSinIgv) || 0;
                            if (filtered.length > 0 && amount > 0) {
                              return distributeAmount(amount, filtered.map(a => a.costCenterId));
                            }
                            return filtered;
                          });
                        }
                      }}
                      className="rounded"
                    />
                    <span className="flex-1 text-sm">{ceco.code} - {ceco.name}</span>
                    {allocation && (
                      <Input
                        type="number"
                        step="0.01"
                        value={allocation.amount || ""}
                        onChange={(e) => {
                          const newAmount = Number(e.target.value) || 0;
                          setAllocations(prev =>
                            prev.map(a =>
                              a.costCenterId === ceco.id
                                ? { ...a, amount: newAmount, percentage: (newAmount / Number(form.montoSinIgv)) * 100 }
                                : a
                            )
                          );
                        }}
                        className="w-32 text-sm"
                        placeholder="Monto"
                      />
                    )}
                    {allocation && allocation.percentage !== undefined && (
                      <span className="text-xs text-slate-600 w-12 text-right">
                        {allocation.percentage.toFixed(1)}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {fieldErrors.allocations && <p className="text-xs text-red-600 mt-1">{fieldErrors.allocations}</p>}
            {allocations.length > 0 && (
              <div className="mt-2 text-sm text-slate-600">
                Total distribuido: {allocations.reduce((sum, a) => sum + (a.amount || 0), 0).toFixed(2)} / {Number(form.montoSinIgv || 0).toFixed(2)}
              </div>
            )}
          </div>

          {/* Información de OC (Read-only) */}
          {selectedOC && (
            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <h3 className="font-medium text-sm text-slate-900">Información de la OC</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>
                  <span className="text-slate-600">Proveedor:</span>
                  <p className="font-medium text-slate-900">{selectedOC.proveedor}</p>
                </div>
                <div>
                  <span className="text-slate-600">Moneda:</span>
                  <p className="font-medium text-slate-900">{selectedOC.moneda}</p>
                </div>
                {consumoOC && (
                  <>
                    <div>
                      <span className="text-slate-600">Importe Total:</span>
                      <p className="font-medium text-slate-900">{consumoOC.moneda} {consumoOC.importeTotal.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-slate-600">Consumido:</span>
                      <p className="font-medium text-slate-900">{consumoOC.moneda} {consumoOC.consumido.toFixed(2)}</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-slate-600">Saldo Disponible:</span>
                      <p className={`font-medium ${consumoOC.saldoDisponible < 0 ? "text-red-600" : "text-green-600"}`}>
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
                    <Th className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort("numberNorm")}>
                      Número {sortConfig.key === "numberNorm" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort("docType")}>
                      Tipo {sortConfig.key === "docType" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort("numeroOc")}>
                      OC {sortConfig.key === "numeroOc" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort("proveedor")}>
                      Proveedor {sortConfig.key === "proveedor" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort("currency")}>
                      Moneda {sortConfig.key === "currency" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort("montoSinIgv")}>
                      Monto sin IGV {sortConfig.key === "montoSinIgv" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th>Periodos</Th>
                    <Th>CECOs</Th>
                    <Th className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort("ultimusIncident")}>
                      Incidente {sortConfig.key === "ultimusIncident" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort("statusCurrent")}>
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
                            inv.docType === "FACTURA" ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"
                          }`}
                        >
                          {inv.docType}
                        </span>
                      </Td>
                      <Td>{inv.oc?.numeroOc || "-"}</Td>
                      <Td>{inv.oc?.proveedor || "-"}</Td>
                      <Td>{inv.currency}</Td>
                      <Td className="text-right">{inv.montoSinIgv ? Number(inv.montoSinIgv).toFixed(2) : "-"}</Td>
                      <Td className="text-xs">
                        {inv.periods && inv.periods.length > 0
                          ? formatPeriodsRange(inv.periods.map(p => p.period))
                          : "-"}
                      </Td>
                      <Td className="text-xs">
                        {inv.costCenters && inv.costCenters.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {inv.costCenters.map((cc: any) => (
                              <span
                                key={cc.id}
                                className="inline-block px-1.5 py-0.5 text-xs rounded bg-slate-100"
                              >
                                {cc.costCenter.code}
                              </span>
                            ))}
                          </div>
                        ) : (
                          "-"
                        )}
                      </Td>
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
                            onClick={() => {
                              setForm({
                                id: String(inv.id),
                                ocId: inv.ocId ? String(inv.ocId) : "",
                                docType: inv.docType,
                                numberNorm: inv.numberNorm || "",
                                montoSinIgv: inv.montoSinIgv ? String(inv.montoSinIgv) : "",
                                ultimusIncident: inv.ultimusIncident || "",
                                detalle: inv.detalle || "",
                                proveedor: inv.oc?.proveedor || "",
                                moneda: inv.currency || "PEN"
                              });
                              setHasOC(!!inv.ocId);
                              setPeriodIds(inv.periods?.map(p => p.periodId) || []);
                              setAllocations(
                                inv.costCenters?.map(cc => ({
                                  costCenterId: cc.costCenterId,
                                  amount: cc.amount ? Number(cc.amount) : undefined,
                                  percentage: cc.percentage ? Number(cc.percentage) : undefined
                                })) || []
                              );
                            }}
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

