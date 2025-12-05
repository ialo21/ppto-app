import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import Input from "../components/ui/Input";
import FilterSelect from "../components/ui/FilterSelect";
import Button from "../components/ui/Button";
import { Table, Th, Td } from "../components/ui/Table";
import YearMonthPicker from "../components/YearMonthPicker";

type Provision = {
  id: number;
  sustentoId: number;
  periodoPpto: string;
  periodoContable: string;
  montoPen: number;
  detalle: string | null;
  createdAt: string;
  updatedAt: string;
  sustento: {
    id: number;
    code: string | null;
    name: string;
    expensePackage?: { id: number; name: string } | null;
    expenseConcept?: { id: number; name: string } | null;
  };
};

function formatCurrency(value: number): string {
  const formatted = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2
  }).format(value);
  return formatted;
}

function formatMonthYear(periodStr: string): string {
  if (!periodStr || !periodStr.match(/^\d{4}-\d{2}$/)) return periodStr;
  const [year, month] = periodStr.split('-');
  return `${year}-${month}`;
}

export default function ProvisionsPage() {
  const queryClient = useQueryClient();

  // Queries
  const { data: provisions, isLoading } = useQuery<Provision[]>({
    queryKey: ["provisions"],
    queryFn: async () => (await api.get("/provisions")).data
  });

  const { data: supports } = useQuery({
    queryKey: ["supports"],
    queryFn: async () => (await api.get("/supports")).data
  });

  const { data: periods } = useQuery({
    queryKey: ["periods"],
    queryFn: async () => (await api.get("/periods")).data
  });

  // Estados
  const [filters, setFilters] = useState({ sustentoId: "", periodoPpto: "", periodoContable: "" });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" | null }>({
    key: "periodoContable",
    direction: "desc"
  });

  const DEFAULT_SORT = { key: "periodoContable", direction: "desc" as const };

  const [form, setForm] = useState({
    id: "",
    sustentoId: "",
    montoPen: "",
    detalle: ""
  });

  const [periodoPptoPeriodId, setPeriodoPptoPeriodId] = useState<number | null>(null);
  const [periodoContablePeriodId, setPeriodoContablePeriodId] = useState<number | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);

  // Provisiones filtradas y ordenadas
  const filteredProvisions = useMemo(() => {
    if (!provisions) return [];

    let filtered = provisions.filter(prov => {
      if (filters.sustentoId && prov.sustentoId !== Number(filters.sustentoId)) return false;
      if (filters.periodoPpto && prov.periodoPpto !== filters.periodoPpto) return false;
      if (filters.periodoContable && prov.periodoContable !== filters.periodoContable) return false;
      return true;
    });

    if (sortConfig.key && sortConfig.direction) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case "sustentoName":
            aValue = a.sustento?.name || "";
            bValue = b.sustento?.name || "";
            break;
          case "periodoPpto":
            aValue = a.periodoPpto;
            bValue = b.periodoPpto;
            break;
          case "periodoContable":
            aValue = a.periodoContable;
            bValue = b.periodoContable;
            break;
          case "montoPen":
            aValue = Number(a.montoPen);
            bValue = Number(b.montoPen);
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
  }, [provisions, filters, sortConfig]);

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
      sustentoId: "",
      montoPen: "",
      detalle: ""
    });
    setPeriodoPptoPeriodId(null);
    setPeriodoContablePeriodId(null);
    setFieldErrors({});
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async () => {
      // Validación frontend
      const errors: Record<string, string> = {};
      if (!form.sustentoId) errors.sustentoId = "Sustento es requerido";
      if (!periodoPptoPeriodId) errors.periodoPpto = "Período PPTO es requerido";
      if (!periodoContablePeriodId) errors.periodoContable = "Período contable es requerido";
      if (!form.montoPen || Number(form.montoPen) === 0) errors.montoPen = "Monto es requerido y no puede ser 0";

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        throw new Error("FRONTEND_VALIDATION_ERROR");
      }

      // Calcular periodoPpto y periodoContable en formato YYYY-MM
      const periodoPptoPeriod = periods.find((p: any) => p.id === periodoPptoPeriodId);
      const periodoContablePeriod = periods.find((p: any) => p.id === periodoContablePeriodId);

      if (!periodoPptoPeriod || !periodoContablePeriod) {
        setFieldErrors({ periodoPpto: "Períodos inválidos" });
        throw new Error("FRONTEND_VALIDATION_ERROR");
      }

      const periodoPptoStr = `${periodoPptoPeriod.year}-${String(periodoPptoPeriod.month).padStart(2, '0')}`;
      const periodoContableStr = `${periodoContablePeriod.year}-${String(periodoContablePeriod.month).padStart(2, '0')}`;

      const payload: any = {
        sustentoId: Number(form.sustentoId),
        periodoPpto: periodoPptoStr,
        periodoContable: periodoContableStr,
        montoPen: Number(form.montoPen),
        detalle: form.detalle.trim() || undefined
      };

      if (import.meta.env.DEV) {
        console.log("📤 Payload provisión:", JSON.stringify(payload, null, 2));
      }

      if (form.id) {
        return (await api.patch(`/provisions/${form.id}`, payload)).data;
      } else {
        return (await api.post("/provisions", payload)).data;
      }
    },
    onSuccess: () => {
      toast.success(form.id ? "Provisión actualizada" : "Provisión creada");
      resetForm();
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["provisions"] });
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
        toast.error(error.response?.data?.error || "Error al guardar la provisión");
        if (import.meta.env.DEV) {
          console.error("❌ Error completo:", error.response?.data || error);
        }
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/provisions/${id}`)).data,
    onSuccess: () => {
      toast.success("Provisión eliminada");
      queryClient.invalidateQueries({ queryKey: ["provisions"] });
    },
    onError: () => toast.error("Error al eliminar la provisión")
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Provisiones</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancelar" : "Nueva Provisión"}
        </Button>
      </div>

      {/* Formulario de Creación/Edición */}
      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium">{form.id ? "Editar Provisión" : "Nueva Provisión"}</h2>
            {form.id && (
              <Button variant="ghost" size="sm" onClick={resetForm} className="ml-auto">
                Cancelar
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Sustento */}
              <div className="w-full">
                <FilterSelect
                  label="Sustento *"
                  placeholder="Seleccionar sustento"
                  value={form.sustentoId}
                  onChange={(value) => handleFormChange("sustentoId", value)}
                  options={(supports || []).map((sup: any) => ({
                    value: String(sup.id),
                    label: sup.code ? `${sup.code} - ${sup.name}` : sup.name,
                    searchText: `${sup.code || ''} ${sup.name}`
                  }))}
                  className={fieldErrors.sustentoId ? "border-red-500" : ""}
                />
                {fieldErrors.sustentoId && <p className="text-xs text-red-600 mt-1">{fieldErrors.sustentoId}</p>}
              </div>

              {/* Período PPTO */}
              <div className="w-full">
                <label className="block text-sm font-medium mb-1">Período PPTO *</label>
                <YearMonthPicker
                  value={periodoPptoPeriodId}
                  onChange={(period) => setPeriodoPptoPeriodId(period ? period.id : null)}
                  periods={periods || []}
                  placeholder="Seleccionar período PPTO..."
                  error={fieldErrors.periodoPpto}
                  clearable={true}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Mes del presupuesto al que afecta esta provisión
                </p>
              </div>

              {/* Período Contable */}
              <div className="w-full">
                <label className="block text-sm font-medium mb-1">Período Contable *</label>
                <YearMonthPicker
                  value={periodoContablePeriodId}
                  onChange={(period) => setPeriodoContablePeriodId(period ? period.id : null)}
                  periods={periods || []}
                  placeholder="Seleccionar período contable..."
                  error={fieldErrors.periodoContable}
                  clearable={true}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Mes contable del cierre en el que se registra
                </p>
              </div>

              {/* Monto */}
              <div className="w-full">
                <label className="block text-sm font-medium mb-1">Monto (PEN) *</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Monto en soles"
                  value={form.montoPen}
                  onChange={(e) => handleFormChange("montoPen", e.target.value)}
                  className={fieldErrors.montoPen ? "border-red-500" : ""}
                />
                {fieldErrors.montoPen && <p className="text-xs text-red-600 mt-1">{fieldErrors.montoPen}</p>}
                <p className="text-xs text-slate-500 mt-1">
                  • <strong>Positivo</strong>: Provisión (disminuye disponible) <br />
                  • <strong>Negativo</strong>: Liberación/Extorno (aumenta disponible)
                </p>
              </div>

              {/* Detalle */}
              <div className="md:col-span-2 w-full">
                <label className="block text-sm font-medium mb-1">Detalle (opcional)</label>
                <Input
                  placeholder="Observaciones o glosa"
                  value={form.detalle}
                  onChange={(e) => handleFormChange("detalle", e.target.value)}
                  className={fieldErrors.detalle ? "border-red-500" : ""}
                />
                {fieldErrors.detalle && <p className="text-xs text-red-600 mt-1">{fieldErrors.detalle}</p>}
              </div>
            </div>

            <div className="mt-4">
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                {form.id ? "Actualizar Provisión" : "Crear Provisión"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros y Tabla */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium">Listado de Provisiones</h2>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <FilterSelect
              placeholder="Todos los sustentos"
              value={filters.sustentoId}
              onChange={(value) => {
                setFilters(f => ({ ...f, sustentoId: value }));
                setSortConfig(DEFAULT_SORT);
              }}
              options={(supports || []).map((sup: any) => ({
                value: String(sup.id),
                label: sup.code ? `${sup.code} - ${sup.name}` : sup.name,
                searchText: `${sup.code || ''} ${sup.name}`
              }))}
              className="w-auto min-w-[200px]"
            />

            <Input
              placeholder="Período PPTO (YYYY-MM)"
              value={filters.periodoPpto}
              onChange={e => {
                setFilters(f => ({ ...f, periodoPpto: e.target.value }));
                setSortConfig(DEFAULT_SORT);
              }}
              className="max-w-xs"
            />

            <Input
              placeholder="Período Contable (YYYY-MM)"
              value={filters.periodoContable}
              onChange={e => {
                setFilters(f => ({ ...f, periodoContable: e.target.value }));
                setSortConfig(DEFAULT_SORT);
              }}
              className="max-w-xs"
            />

            <Button
              onClick={() => {
                const p = new URLSearchParams();
                if (filters.sustentoId) p.set("sustentoId", filters.sustentoId);
                if (filters.periodoPpto) p.set("periodoPpto", filters.periodoPpto);
                if (filters.periodoContable) p.set("periodoContable", filters.periodoContable);
                window.open(`http://localhost:3001/provisions/export/csv?${p.toString()}`, "_blank");
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
                    <Th className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort("sustentoName")}>
                      Sustento {sortConfig.key === "sustentoName" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort("periodoContable")}>
                      Período Contable {sortConfig.key === "periodoContable" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort("periodoPpto")}>
                      Período PPTO {sortConfig.key === "periodoPpto" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort("montoPen")}>
                      Monto (PEN) {sortConfig.key === "montoPen" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th>Detalle</Th>
                    <Th className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort("createdAt")}>
                      Fecha Creación {sortConfig.key === "createdAt" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th>Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProvisions.map((prov: Provision) => (
                    <tr key={prov.id}>
                      <Td className="text-sm">
                        {prov.sustento?.code ? `${prov.sustento.code} - ` : ""}
                        {prov.sustento?.name || "-"}
                      </Td>
                      <Td className="text-sm">{formatMonthYear(prov.periodoContable)}</Td>
                      <Td className="text-sm">{formatMonthYear(prov.periodoPpto)}</Td>
                      <Td className={`text-right font-medium ${Number(prov.montoPen) >= 0 ? "text-red-600" : "text-green-600"}`}>
                        {formatCurrency(Number(prov.montoPen))}
                      </Td>
                      <Td className="text-xs max-w-md truncate">{prov.detalle || "-"}</Td>
                      <Td className="text-xs">{new Date(prov.createdAt).toLocaleDateString()}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setForm({
                                id: String(prov.id),
                                sustentoId: String(prov.sustentoId),
                                montoPen: String(prov.montoPen),
                                detalle: prov.detalle || ""
                              });

                              // Buscar el periodo de PPTO
                              const [yearPpto, monthPpto] = prov.periodoPpto.split('-').map(Number);
                              const pptoP = periods?.find((p: any) => p.year === yearPpto && p.month === monthPpto);
                              setPeriodoPptoPeriodId(pptoP ? pptoP.id : null);

                              // Buscar el periodo contable
                              const [yearCont, monthCont] = prov.periodoContable.split('-').map(Number);
                              const contP = periods?.find((p: any) => p.year === yearCont && p.month === monthCont);
                              setPeriodoContablePeriodId(contP ? contP.id : null);

                              setShowForm(true);
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("¿Eliminar esta provisión?")) {
                                deleteMutation.mutate(prov.id);
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
              {filteredProvisions.length === 0 && (
                <p className="text-center text-slate-500 py-8">No se encontraron provisiones</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

