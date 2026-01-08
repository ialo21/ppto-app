import React, { useMemo, useState } from "react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../../styles/react-datepicker-overrides.css";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import FilterSelect from "../../components/ui/FilterSelect";
import Button from "../../components/ui/Button";
import { Table, Th, Td } from "../../components/ui/Table";
import { formatNumber } from "../../utils/numberFormat";
import ProveedorSelector from "../../components/ProveedorSelector";
import { Users, DollarSign, Building2, Package, ExternalLink, Calendar, TrendingUp } from "lucide-react";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📋 RECURSOS TERCERIZADOS - VISTA ÚNICA
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * VISTA COMBINADA:
 * - Estadísticas generales
 * - Vista agrupada por Gerencia TI o Proveedor (modo toggle)
 * - Tabla de gestión con filtros
 * - Formulario de registro/edición
 */

type RecursoTercerizado = {
  id: number;
  nombreCompleto: string;
  cargo: string;
  managementId: number;
  management: { id: number; name: string };
  proveedorId: number;
  proveedor: { id: number; razonSocial: string; ruc: string };
  supportId: number | null;
  support: { id: number; code: string; name: string } | null;
  fechaInicio: string;
  fechaFin: string;
  montoMensual: number;
  linkContrato: string | null;
  ocs: Array<{
    id: number;
    oc: { id: number; numeroOc: string | null; moneda: string; importeSinIgv: number; estado: string };
  }>;
  status: "ACTIVO" | "CESADO";
  observaciones: string | null;
};

type Estadisticas = {
  totalActivos: number;
  totalCesados: number;
  costoMensualTotal: number;
  porGerencia: Array<{ managementId: number; managementName: string; cantidad: number }>;
};

type ViewMode = "gerencia" | "proveedor";

const getStatusColor = (status: string): string => {
  return status === "ACTIVO" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800";
};

const calcularDiasRestantes = (fechaFin: string): number => {
  if (!fechaFin) return NaN;
  
  // Hoy a las 00:00:00 local
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  // Parse de fecha desde backend (ISO string o YYYY-MM-DD)
  // Extraer solo la parte de fecha YYYY-MM-DD para crear Date local
  const fechaSoloString = fechaFin.split('T')[0]; // "2026-01-31"
  const [year, month, day] = fechaSoloString.split('-').map(Number);
  const fin = new Date(year, month - 1, day);
  fin.setHours(0, 0, 0, 0);
  
  if (isNaN(fin.getTime())) return NaN;
  
  const diffTime = fin.getTime() - hoy.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getDiasRestantesInfo = (fechaFin: string): { dias: number; texto: string; colorClasses: string; iconColor: string } | null => {
  const dias = calcularDiasRestantes(fechaFin);
  
  if (isNaN(dias)) return null;
  
  if (dias < 0) {
    return {
      dias,
      texto: "Vencido",
      colorClasses: "bg-red-100 text-red-800 border border-red-300",
      iconColor: "text-red-600"
    };
  } else if (dias === 0) {
    return {
      dias,
      texto: "Hoy vence",
      colorClasses: "bg-red-100 text-red-800 border border-red-300",
      iconColor: "text-red-600"
    };
  } else if (dias <= 7) {
    return {
      dias,
      texto: `${dias} día${dias === 1 ? '' : 's'}`,
      colorClasses: "bg-red-100 text-red-800 border border-red-300",
      iconColor: "text-red-600"
    };
  } else if (dias <= 30) {
    return {
      dias,
      texto: `${dias} días`,
      colorClasses: "bg-yellow-100 text-yellow-800 border border-yellow-300",
      iconColor: "text-yellow-600"
    };
  } else {
    return {
      dias,
      texto: `${dias} días`,
      colorClasses: "bg-green-100 text-green-800 border border-green-300",
      iconColor: "text-green-600"
    };
  }
};

function StatCard({ title, value, icon: Icon, highlighted = false, subtitle }: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  highlighted?: boolean;
  subtitle?: string;
}) {
  return (
    <div className={`${highlighted ? 'bg-table-total border-brand-primary' : 'bg-white border-brand-border'} border rounded-xl p-4 flex flex-col transition-all duration-200 hover:shadow-medium`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs sm:text-sm text-brand-text-secondary uppercase tracking-wide font-semibold">{title}</p>
        <div className={`p-2 rounded-lg ${highlighted ? 'bg-brand-primary/10' : 'bg-brand-background'}`}>
          <Icon size={18} className={`${highlighted ? 'text-brand-primary' : 'text-brand-text-secondary'}`} strokeWidth={2} />
        </div>
      </div>
      <div className="text-2xl font-bold text-brand-text-primary mb-1">{value}</div>
      {subtitle && <p className="text-xs text-brand-text-disabled">{subtitle}</p>}
    </div>
  );
}

const FieldError = ({ error }: { error?: string }) => {
  if (!error) return null;
  return <p className="text-xs text-red-600 mt-1">{error}</p>;
};

const InputWithError = ({ error, ...props }: any) => (
  <div>
    <Input {...props} className={error ? "border-red-500 focus:ring-red-500" : ""} />
    <FieldError error={error} />
  </div>
);

const FilterSelectWithError = ({ error, ...props }: any) => (
  <div>
    <FilterSelect {...props} className={error ? "border-red-500" : props.className || ""} />
    <FieldError error={error} />
  </div>
);

export default function RecursosTercerizadosPage() {
  const queryClient = useQueryClient();

  const { data: recursos = [], isLoading } = useQuery<RecursoTercerizado[]>({
    queryKey: ["recursos-tercerizados"],
    queryFn: async () => (await api.get("/recursos-tercerizados")).data
  });

  const { data: estadisticas } = useQuery<Estadisticas>({
    queryKey: ["recursos-tercerizados-estadisticas"],
    queryFn: async () => (await api.get("/recursos-tercerizados/estadisticas")).data
  });

  const { data: managements } = useQuery({
    queryKey: ["managements"],
    queryFn: async () => (await api.get("/managements")).data
  });

  const { data: supports } = useQuery({
    queryKey: ["supports"],
    queryFn: async () => (await api.get("/supports")).data
  });

  const { data: ocs } = useQuery({
    queryKey: ["ocs"],
    queryFn: async () => (await api.get("/ocs")).data
  });

  const [viewMode, setViewMode] = useState<ViewMode>("gerencia");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const [form, setForm] = useState({
    nombreCompleto: "",
    cargo: "",
    managementId: "",
    proveedorId: null as number | null,
    supportId: "",
    fechaInicio: "",
    fechaFin: "",
    montoMensual: "",
    linkContrato: "",
    observaciones: ""
  });

  const [filters, setFilters] = useState({
    search: "",
    managementId: "",
    proveedorId: "",
    status: ""
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setForm({
      nombreCompleto: "",
      cargo: "",
      managementId: "",
      proveedorId: null,
      supportId: "",
      fechaInicio: "",
      fechaFin: "",
      montoMensual: "",
      linkContrato: "",
      observaciones: ""
    });
    setEditingId(null);
    setShowForm(false);
    setFieldErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.nombreCompleto.trim()) errors.nombreCompleto = "Nombre completo es requerido";
    if (!form.cargo.trim()) errors.cargo = "Cargo es requerido";
    if (!form.managementId) errors.managementId = "Gerencia TI es requerida";
    if (!form.proveedorId) errors.proveedorId = "Proveedor es requerido";
    if (!form.fechaInicio) errors.fechaInicio = "Fecha de inicio es requerida";
    if (!form.fechaFin) errors.fechaFin = "Fecha de fin es requerida";
    const montoNum = parseFloat(form.montoMensual);
    if (!form.montoMensual || isNaN(montoNum) || montoNum < 0) {
      errors.montoMensual = "Monto mensual debe ser mayor o igual a 0";
    }
    if (form.fechaInicio && form.fechaFin) {
      const inicio = new Date(form.fechaInicio);
      const fin = new Date(form.fechaFin);
      if (fin <= inicio) errors.fechaFin = "La fecha de fin debe ser posterior a la fecha de inicio";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!validateForm()) throw new Error("FRONTEND_VALIDATION_ERROR");
      const payload: any = {
        nombreCompleto: form.nombreCompleto.trim(),
        cargo: form.cargo.trim(),
        managementId: Number(form.managementId),
        proveedorId: Number(form.proveedorId),
        supportId: form.supportId ? Number(form.supportId) : null,
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin,
        montoMensual: parseFloat(form.montoMensual),
        linkContrato: form.linkContrato.trim() || undefined,
        observaciones: form.observaciones.trim() || undefined
      };
      console.log("Payload a enviar:", payload);
      if (editingId) {
        return (await api.patch(`/recursos-tercerizados/${editingId}`, payload)).data;
      } else {
        return (await api.post("/recursos-tercerizados", payload)).data;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Recurso actualizado" : "Recurso creado");
      queryClient.invalidateQueries({ queryKey: ["recursos-tercerizados"] });
      queryClient.invalidateQueries({ queryKey: ["recursos-tercerizados-estadisticas"] });
      resetForm();
    },
    onError: (error: any) => {
      console.error("Error completo:", error);
      console.error("Response data:", error.response?.data);
      if (error.message === "FRONTEND_VALIDATION_ERROR") {
        toast.error("Revisa los campos resaltados");
        return;
      }
      if (error.response?.status === 422 && error.response?.data?.issues) {
        const backendErrors: Record<string, string> = {};
        error.response.data.issues.forEach((issue: any) => {
          console.log("Issue:", issue);
          backendErrors[issue.path.join(".")] = issue.message;
        });
        setFieldErrors(backendErrors);
        toast.error("Revisa los campos resaltados");
      } else {
        toast.error(error.response?.data?.error || "Error al guardar");
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/recursos-tercerizados/${id}`)).data,
    onSuccess: () => {
      toast.success("Recurso eliminado");
      queryClient.invalidateQueries({ queryKey: ["recursos-tercerizados"] });
      queryClient.invalidateQueries({ queryKey: ["recursos-tercerizados-estadisticas"] });
    },
    onError: () => toast.error("No se pudo eliminar el recurso")
  });

  const handleEdit = (recurso: RecursoTercerizado) => {
    setForm({
      nombreCompleto: recurso.nombreCompleto,
      cargo: recurso.cargo,
      managementId: recurso.managementId.toString(),
      proveedorId: recurso.proveedorId,
      supportId: recurso.supportId?.toString() || "",
      fechaInicio: recurso.fechaInicio.split("T")[0],
      fechaFin: recurso.fechaFin.split("T")[0],
      montoMensual: recurso.montoMensual.toString(),
      linkContrato: recurso.linkContrato || "",
      observaciones: recurso.observaciones || ""
    });
    setEditingId(recurso.id);
    setShowForm(true);
  };

  const filteredRecursos = useMemo(() => {
    let result = [...recursos];
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter((r: RecursoTercerizado) =>
        r.nombreCompleto?.toLowerCase().includes(searchLower) ||
        r.cargo?.toLowerCase().includes(searchLower) ||
        r.proveedor?.razonSocial?.toLowerCase().includes(searchLower) ||
        r.management?.name?.toLowerCase().includes(searchLower)
      );
    }
    if (filters.managementId) result = result.filter(r => r.managementId === Number(filters.managementId));
    if (filters.proveedorId) result = result.filter(r => r.proveedorId === Number(filters.proveedorId));
    if (filters.status) result = result.filter(r => r.status === filters.status);
    return result;
  }, [recursos, filters]);

  const groupedRecursos = useMemo(() => {
    if (!filteredRecursos || filteredRecursos.length === 0) return [];
    const groups = new Map<string, RecursoTercerizado[]>();
    filteredRecursos.forEach(recurso => {
      const key = viewMode === "gerencia" ? recurso.management.name : recurso.proveedor.razonSocial;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(recurso);
    });
    const result: Array<{ groupName: string; recursos: RecursoTercerizado[]; subtotal: { activos: number; cesados: number; costoMensual: number } }> = [];
    groups.forEach((recursos, groupName) => {
      const activos = recursos.filter(r => r.status === "ACTIVO");
      result.push({
        groupName,
        recursos,
        subtotal: {
          activos: activos.length,
          cesados: recursos.length - activos.length,
          costoMensual: activos.reduce((sum, r) => sum + Number(r.montoMensual), 0)
        }
      });
    });
    return result.sort((a, b) => a.groupName.localeCompare(b.groupName));
  }, [filteredRecursos, viewMode]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    // Backend envía ISO timestamp: "2026-01-31T00:00:00.000Z"
    // Extraemos solo YYYY-MM-DD y parseamos local
    const fechaSolo = dateString.split('T')[0]; // "2026-01-31"
    const [year, month, day] = fechaSolo.split("-").map(Number);
    const localDate = new Date(year, month - 1, day);
    return localDate.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-text-primary">Recursos Tercerizados</h1>
          <p className="text-sm text-brand-text-secondary mt-1">Gestión de personas externas contratadas</p>
        </div>
        <Button onClick={() => {
          if (showForm) resetForm();
          else { setEditingId(null); setFieldErrors({}); setShowForm(true); }
        }}>
          {showForm ? "Cancelar" : "Nuevo Recurso"}
        </Button>
      </div>

      {!isLoading && estadisticas && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title="Total Activos" value={estadisticas.totalActivos} icon={Users} subtitle="Personas trabajando" highlighted />
          <StatCard title="Total Cesados" value={estadisticas.totalCesados} icon={Users} subtitle="Histórico" />
          <StatCard title="Costo Mensual" value={`PEN ${formatNumber(estadisticas.costoMensualTotal)}`} icon={DollarSign} subtitle="Solo recursos activos" />
          <StatCard title="Gerencias" value={estadisticas.porGerencia.length} icon={Building2} subtitle="Con recursos activos" />
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium">{editingId ? "Editar Recurso" : "Nuevo Recurso Tercerizado"}</h2>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Nombre Completo *</label>
                <InputWithError placeholder="Juan Pérez García" value={form.nombreCompleto} onChange={(e: any) => setForm(f => ({ ...f, nombreCompleto: e.target.value }))} error={fieldErrors.nombreCompleto} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cargo *</label>
                <InputWithError placeholder="Desarrollador Senior" value={form.cargo} onChange={(e: any) => setForm(f => ({ ...f, cargo: e.target.value }))} error={fieldErrors.cargo} />
              </div>
              <div className="md:col-span-3">
                <FilterSelectWithError label="Gerencia TI *" placeholder="Seleccionar gerencia" value={form.managementId} onChange={(value: string) => setForm(f => ({ ...f, managementId: value }))} options={managements?.map((m: any) => ({ value: String(m.id), label: m.name })) || []} error={fieldErrors.managementId} />
              </div>
              <div className="md:col-span-3">
                <ProveedorSelector label="Proveedor *" placeholder="Buscar o crear proveedor..." value={form.proveedorId} onChange={(proveedorId) => { setForm(f => ({ ...f, proveedorId })); if (proveedorId) setFieldErrors(e => ({ ...e, proveedorId: "" })); }} error={fieldErrors.proveedorId} allowCreate={true} />
              </div>
              <div className="md:col-span-3">
                <FilterSelectWithError label="Sustento (Opcional)" placeholder="Seleccionar sustento" value={form.supportId} onChange={(value: string) => setForm(f => ({ ...f, supportId: value }))} options={supports?.map((s: any) => ({ value: String(s.id), label: `${s.code} - ${s.name}`, searchText: `${s.code} ${s.name}` })) || []} error={fieldErrors.supportId} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha Inicio *</label>
                <div className={`border rounded-xl px-2 py-1 bg-white focus-within:ring-2 ${fieldErrors.fechaInicio ? 'border-red-500 focus-within:ring-red-500' : 'border-brand-border focus-within:ring-brand-primary'}`}>
                  <ReactDatePicker
                    selected={form.fechaInicio ? new Date(form.fechaInicio + 'T00:00:00') : null}
                    onChange={(date: Date | null) => {
                      if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        setForm(f => ({ ...f, fechaInicio: `${year}-${month}-${day}` }));
                      } else {
                        setForm(f => ({ ...f, fechaInicio: "" }));
                      }
                    }}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="dd/mm/aaaa"
                    className="w-full px-2 py-1 focus:outline-none text-sm"
                    popperPlacement="bottom-start"
                  />
                </div>
                <FieldError error={fieldErrors.fechaInicio} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha Fin *</label>
                <div className={`border rounded-xl px-2 py-1 bg-white focus-within:ring-2 ${fieldErrors.fechaFin ? 'border-red-500 focus-within:ring-red-500' : 'border-brand-border focus-within:ring-brand-primary'}`}>
                  <ReactDatePicker
                    selected={form.fechaFin ? new Date(form.fechaFin + 'T00:00:00') : null}
                    onChange={(date: Date | null) => {
                      if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        setForm(f => ({ ...f, fechaFin: `${year}-${month}-${day}` }));
                      } else {
                        setForm(f => ({ ...f, fechaFin: "" }));
                      }
                    }}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="dd/mm/aaaa"
                    className="w-full px-2 py-1 focus:outline-none text-sm"
                    popperPlacement="bottom-start"
                  />
                </div>
                <FieldError error={fieldErrors.fechaFin} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monto Mensual (PEN) *</label>
                <InputWithError type="number" step="0.01" min="0" placeholder="0.00" value={form.montoMensual} onChange={(e: any) => setForm(f => ({ ...f, montoMensual: e.target.value }))} error={fieldErrors.montoMensual} />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">Link del Contrato (Opcional)</label>
                <InputWithError placeholder="https://drive.google.com/..." value={form.linkContrato} onChange={(e: any) => setForm(f => ({ ...f, linkContrato: e.target.value }))} error={fieldErrors.linkContrato} />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">Observaciones (Opcional)</label>
                <textarea className="w-full h-20 px-3 py-2 text-sm rounded-xl border border-brand-border focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none" placeholder="Observaciones..." value={form.observaciones} onChange={(e) => setForm(f => ({ ...f, observaciones: e.target.value }))} />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={resetForm}>Cancelar</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Guardando..." : (editingId ? "Actualizar" : "Guardar")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium">Vista Agrupada</h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <Button size="sm" variant={viewMode === "gerencia" ? "primary" : "secondary"} onClick={() => setViewMode("gerencia")}>
                Por Gerencia TI
              </Button>
              <Button size="sm" variant={viewMode === "proveedor" ? "primary" : "secondary"} onClick={() => setViewMode("proveedor")}>
                Por Proveedor
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-brand-text-secondary">Cargando...</div>
          ) : groupedRecursos.length === 0 ? (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto mb-4 text-brand-text-disabled" />
              <p className="text-brand-text-secondary">No hay recursos tercerizados</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedRecursos.map((group) => (
                <div key={group.groupName}>
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-brand-border">
                    <div>
                      <h4 className="text-base font-semibold text-brand-text-primary">{group.groupName}</h4>
                      <p className="text-xs text-brand-text-secondary">
                        {group.subtotal.activos} activos • {group.subtotal.cesados} cesados
                        {group.subtotal.activos > 0 && ` • PEN ${formatNumber(group.subtotal.costoMensual)}/mes`}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {group.recursos.map((recurso) => (
                      <Card key={recurso.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-brand-text-primary">{recurso.nombreCompleto}</h3>
                              <p className="text-sm text-brand-text-secondary">{recurso.cargo}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(recurso.status)}`}>
                                {recurso.status}
                              </span>
                              {recurso.status === "ACTIVO" && (() => {
                                const diasInfo = getDiasRestantesInfo(recurso.fechaFin);
                                if (!diasInfo) return null;
                                return (
                                  <div className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold ${diasInfo.colorClasses}`}>
                                    <Calendar size={12} className={diasInfo.iconColor} />
                                    <span>{diasInfo.texto}</span>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                          <div className="mb-3 p-3 bg-brand-background rounded-lg">
                            <p className="text-xs text-brand-text-secondary mb-1">Monto Mensual</p>
                            <p className="text-xl font-bold text-brand-primary">PEN {formatNumber(recurso.montoMensual)}</p>
                          </div>
                          {viewMode === "gerencia" && (
                            <div className="mb-2">
                              <p className="text-xs text-brand-text-secondary">Proveedor</p>
                              <p className="text-sm text-brand-text-primary">{recurso.proveedor.razonSocial}</p>
                            </div>
                          )}
                          {viewMode === "proveedor" && (
                            <div className="mb-2">
                              <p className="text-xs text-brand-text-secondary">Gerencia TI</p>
                              <p className="text-sm text-brand-text-primary">{recurso.management.name}</p>
                            </div>
                          )}
                          <div className="mb-3">
                            <p className="text-xs text-brand-text-secondary">Plazo de Contrato</p>
                            <p className="text-sm text-brand-text-primary">
                              {formatDate(recurso.fechaInicio)} → {formatDate(recurso.fechaFin)}
                            </p>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <Button size="sm" variant="primary" onClick={() => window.location.href = `/contratos/recursos-tercerizados/${recurso.id}`} className="col-span-2">
                              Ver Detalle
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => handleEdit(recurso)} title="Editar">
                              <Package size={14} />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Tabla de Gestión</h2>
            <Button size="sm" variant="secondary" onClick={() => setShowTable(!showTable)}>
              {showTable ? "Ocultar" : "Mostrar"}
            </Button>
          </div>
        </CardHeader>
        {showTable && <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-brand-text-secondary">Buscar</label>
              <Input
                placeholder="Buscar..."
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                className="h-9 text-sm"
              />
            </div>
            <FilterSelect label="Gerencia TI" placeholder="Todas" value={filters.managementId} onChange={(value) => setFilters(f => ({ ...f, managementId: value }))} options={managements?.map((m: any) => ({ value: String(m.id), label: m.name })) || []} />
            <FilterSelect label="Proveedor" placeholder="Todos" value={filters.proveedorId} onChange={(value) => setFilters(f => ({ ...f, proveedorId: value }))} options={recursos.map(r => ({ value: String(r.proveedorId), label: r.proveedor.razonSocial })).filter((v, i, a) => a.findIndex(t => t.value === v.value) === i) || []} />
            <FilterSelect label="Estado" placeholder="Todos" value={filters.status} onChange={(value) => setFilters(f => ({ ...f, status: value }))} options={[{ value: "ACTIVO", label: "Activo" }, { value: "CESADO", label: "Cesado" }]} searchable={false} />
          </div>
          
          {isLoading ? (
            <div className="p-12 text-center text-brand-text-secondary">Cargando...</div>
          ) : filteredRecursos.length === 0 ? (
            <div className="p-12 text-center text-brand-text-secondary">No se encontraron recursos</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <Th>Nombre</Th>
                    <Th>Cargo</Th>
                    <Th>Gerencia TI</Th>
                    <Th>Proveedor</Th>
                    <Th>Contrato Vigente</Th>
                    <Th>Monto Mensual</Th>
                    <Th>Estado</Th>
                    <Th>Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecursos.map((recurso: RecursoTercerizado) => (
                    <tr key={recurso.id}>
                      <Td>{recurso.nombreCompleto}</Td>
                      <Td>{recurso.cargo}</Td>
                      <Td>{recurso.management.name}</Td>
                      <Td>{recurso.proveedor.razonSocial}</Td>
                      <Td>{formatDate(recurso.fechaInicio)} → {formatDate(recurso.fechaFin)}</Td>
                      <Td>PEN {formatNumber(recurso.montoMensual)}</Td>
                      <Td>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(recurso.status)}`}>
                          {recurso.status}
                        </span>
                      </Td>
                      <Td>
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => handleEdit(recurso)}>Editar</Button>
                          <Button size="sm" variant="secondary" onClick={() => confirm("¿Eliminar este recurso?") && deleteMutation.mutate(recurso.id)}>Eliminar</Button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardContent>}
      </Card>
    </div>
  );
}
