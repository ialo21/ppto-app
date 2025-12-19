import React, { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { useWebSocket } from "../../hooks/useWebSocket";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import FilterSelect from "../../components/ui/FilterSelect";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { Table, Th, Td } from "../../components/ui/Table";
import OcStatusChip from "../../components/OcStatusChip";
import YearMonthPicker from "../../components/YearMonthPicker";
import OcFileUploader from "../../components/OcFileUploader";
import ProveedorSelector from "../../components/ProveedorSelector";
import { formatNumber } from "../../utils/numberFormat";
import { formatPeriodLabel } from "../../utils/periodFormat";

/**
 * SUBMÓDULO: Gestión / Registro de Órdenes de Compra
 * 
 * Vista principal para registro y administración de OCs.
 * 
 * CARACTERÍSTICAS:
 * - Formulario completo de registro/edición de OCs
 * - Tabla de OCs con cambio de estado inline (estilo Facturas)
 * - Filtros y búsqueda
 * - Exportación a CSV
 * - Validaciones de negocio completas
 * 
 * CAMBIO DE ESTADO:
 * - Utiliza OcStatusChip (mismo patrón que StatusChip de Facturas)
 * - Actualización optimista con rollback en caso de error
 * - Transiciones visuales suaves
 */

// Función auxiliar para formatear rango de períodos
const formatPeriodRange = (periodFrom: any, periodTo: any): string => {
  if (!periodFrom || !periodTo) return "-";
  
  const fromLabel = formatPeriodLabel(periodFrom);
  const toLabel = formatPeriodLabel(periodTo);
  
  // Si son el mismo período, mostrar solo uno
  if (periodFrom.id === periodTo.id) {
    return fromLabel;
  }
  
  // Si son diferentes, mostrar el rango
  return `${fromLabel} → ${toLabel}`;
};

const ESTADOS_OC = [
  "PENDIENTE", "PROCESAR", "EN_PROCESO", "PROCESADO", "APROBACION_VP",
  "ANULAR", "ANULADO", "ATENDER_COMPRAS", "ATENDIDO"
];

// Normalización de fechas
const normalizeDateToISO = (dateInput: string): string | null => {
  if (!dateInput || !dateInput.trim()) return null;

  const input = dateInput.trim();
  
  // Si ya está en formato YYYY-MM-DD (del input type="date")
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const date = new Date(input + 'T00:00:00');
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  }

  // Formato DD/MM/YYYY
  const ddmmyyyyMatch = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
    if (isNaN(date.getTime())) return null;
    // Validar que la fecha es real (no 31/02)
    if (date.getDate() !== parseInt(day) || date.getMonth() + 1 !== parseInt(month)) {
      return null;
    }
    return date.toISOString();
  }

  // Formato MM/DD/YYYY (americano)
  const mmddyyyyMatch = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyyMatch) {
    const [, month, day, year] = mmddyyyyMatch;
    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  }

  // Intentar parsear como Date si es otro formato
  try {
    const date = new Date(input);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch {
    return null;
  }

  return null;
};

// Validar que una fecha sea válida
const isValidDate = (dateString: string): boolean => {
  if (!dateString || !dateString.trim()) return false;
  
  // Si está en formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const date = new Date(dateString + 'T00:00:00');
    return !isNaN(date.getTime());
  }

  // Si está en formato DD/MM/YYYY
  const ddmmyyyyMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
    // Validar que la fecha es real
    if (isNaN(date.getTime())) return false;
    if (date.getDate() !== parseInt(day) || date.getMonth() + 1 !== parseInt(month)) {
      return false;
    }
    return true;
  }

  return false;
};

// Componente para mostrar errores de campo
const FieldError = ({ error }: { error?: string }) => {
  if (!error) return null;
  return <p className="text-xs text-red-600 mt-1">{error}</p>;
};

// Wrapper para inputs con errores
const InputWithError = ({ error, ...props }: any) => {
  const hasError = !!error;
  return (
    <div>
      <Input 
        {...props} 
        className={hasError ? "border-red-500 focus:ring-red-500" : ""} 
      />
      <FieldError error={error} />
    </div>
  );
};

// Helper para mostrar FilterSelect con errores
const FilterSelectWithError = ({ error, label, options, ...props }: any) => {
  return (
    <div>
      <FilterSelect
        label={label}
        options={options}
        {...props}
        className={error ? "border-red-500" : props.className || ""}
      />
      <FieldError error={error} />
    </div>
  );
};

export default function OcGestionPage() {
  const queryClient = useQueryClient();
  const { data: ocs, refetch, isLoading } = useQuery({
    queryKey: ["ocs"],
    queryFn: async () => (await api.get("/ocs")).data
  });

  // WebSocket para actualizaciones en tiempo real
  useWebSocket({
    onOcStatusChange: (data) => {
      console.log(`[WS] OC ${data.ocId} cambió a estado ${data.newStatus}`);
      // Invalidar cache para refrescar la lista de OCs
      queryClient.invalidateQueries({ queryKey: ["ocs"] });
      // NOTA: No mostrar toast aquí para evitar duplicados.
      // El toast ya se muestra en updateStatusMutation.onSuccess cuando el usuario actual cambia el estado.
      // Este handler es principalmente para sincronizar cambios hechos por otros usuarios/sistemas.
    },
    onConnected: () => {
      console.log("[WS] Conectado - recibiendo actualizaciones en tiempo real");
    }
  });

  const { data: periods } = useQuery({
    queryKey: ["periods"],
    queryFn: async () => (await api.get("/periods")).data
  });

  const { data: supports } = useQuery({
    queryKey: ["supports"],
    queryFn: async () => (await api.get("/supports")).data
  });

  const { data: articulos } = useQuery({
    queryKey: ["articulos"],
    queryFn: async () => (await api.get("/articulos")).data
  });

  const { data: costCenters } = useQuery({
    queryKey: ["cost-centers"],
    queryFn: async () => (await api.get("/cost-centers")).data
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Ref para rastrear cambios programáticos
  const isProgrammaticChangeRef = useRef(false);

  const [form, setForm] = useState({
    budgetPeriodFromId: "",
    budgetPeriodToId: "",
    incidenteOc: "",
    solicitudOc: "",
    fechaRegistro: new Date().toISOString().split("T")[0],
    supportId: "",
    periodoEnFechasText: "",
    descripcion: "",
    nombreSolicitante: "",
    correoSolicitante: "",
    // NUEVO: proveedorId para referencia a entidad
    proveedorId: null as number | null,
    // DEPRECATED: mantener por compatibilidad con OCs existentes
    proveedor: "",
    ruc: "",
    moneda: "PEN",
    importeSinIgv: "",
    estado: "PENDIENTE",
    numeroOc: "",
    comentario: "",
    articuloId: "",
    cecoId: "",  // DEPRECATED: mantener por compatibilidad
    costCenterIds: [] as number[],  // NUEVO: múltiples CECOs
    linkCotizacion: ""
  });

  const [filters, setFilters] = useState({
    proveedor: "",
    numeroOc: "",
    moneda: "",
    estado: "",
    search: ""
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Filtrar CECOs según el sustento seleccionado
  const availableCostCenters = useMemo(() => {
    if (!form.supportId || !supports || !costCenters) return costCenters || [];
    
    const selectedSupport = supports.find((s: any) => s.id === Number(form.supportId));
    if (!selectedSupport) return costCenters || [];
    
    // Si el sustento tiene CECOs asociados (M:N), filtrar solo esos
    if (selectedSupport.costCenters && selectedSupport.costCenters.length > 0) {
      const cecoIds = new Set(selectedSupport.costCenters.map((cc: any) => cc.costCenterId));
      return costCenters.filter((cc: any) => cecoIds.has(cc.id));
    }
    
    // Si no tiene CECOs asociados, mostrar todos (compatibilidad legacy)
    return costCenters || [];
  }, [form.supportId, supports, costCenters]);

  // Limpiar CECOs si cambia el sustento y ya no son válidos
  useEffect(() => {
    if (form.supportId && form.costCenterIds.length > 0 && costCenters && supports) {
      const selectedSupport = supports.find((s: any) => s.id === Number(form.supportId));
      if (selectedSupport && selectedSupport.costCenters && selectedSupport.costCenters.length > 0) {
        const validCecoIds = new Set(selectedSupport.costCenters.map((cc: any) => cc.costCenterId));
        const filteredCecoIds = form.costCenterIds.filter(id => validCecoIds.has(id));
        
        // Solo actualizar si hay cambios
        if (filteredCecoIds.length !== form.costCenterIds.length) {
          setForm(f => ({ ...f, costCenterIds: filteredCecoIds }));
        }
      }
    }
  }, [form.supportId, form.costCenterIds, costCenters, supports]);

  const resetForm = () => {
    setForm({
      budgetPeriodFromId: "",
      budgetPeriodToId: "",
      incidenteOc: "",
      solicitudOc: "",
      fechaRegistro: new Date().toISOString().split("T")[0],
      supportId: "",
      periodoEnFechasText: "",
      descripcion: "",
      nombreSolicitante: "",
      correoSolicitante: "",
      proveedorId: null,
      proveedor: "",
      ruc: "",
      moneda: "PEN",
      importeSinIgv: "",
      estado: "PENDIENTE",
      numeroOc: "",
      comentario: "",
      articuloId: "",
      cecoId: "",
      costCenterIds: [],
      linkCotizacion: ""
    });
    setEditingId(null);
    setShowForm(false);
    setFieldErrors({});
  };

  // Validación frontend
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.budgetPeriodFromId) errors.budgetPeriodFromId = "Periodo desde es requerido";
    if (!form.budgetPeriodToId) errors.budgetPeriodToId = "Periodo hasta es requerido";
    
    // Validar rango de períodos cronológicamente
    if (form.budgetPeriodFromId && form.budgetPeriodToId && periods) {
      const fromPeriod = periods.find((p: any) => p.id === Number(form.budgetPeriodFromId));
      const toPeriod = periods.find((p: any) => p.id === Number(form.budgetPeriodToId));
      if (fromPeriod && toPeriod) {
        const fromValue = fromPeriod.year * 100 + fromPeriod.month;
        const toValue = toPeriod.year * 100 + toPeriod.month;
        if (fromValue > toValue) {
          errors.budgetPeriodToId = "El período hasta debe ser posterior o igual al período desde";
        }
      }
    }
    
    if (!form.supportId) errors.supportId = "Sustento es requerido";
    if (!form.nombreSolicitante.trim()) errors.nombreSolicitante = "Nombre solicitante es requerido";

    // Validar que haya al menos un CECO seleccionado
    if (!form.costCenterIds || form.costCenterIds.length === 0) {
      errors.costCenterIds = "Debe seleccionar al menos un CECO";
    } else if (form.supportId && supports && costCenters) {
      // Validar que todos los CECOs seleccionados estén asociados al sustento
      const selectedSupport = supports.find((s: any) => s.id === Number(form.supportId));
      if (selectedSupport && selectedSupport.costCenters && selectedSupport.costCenters.length > 0) {
        const validCecoIds = new Set(selectedSupport.costCenters.map((cc: any) => cc.costCenterId));
        const invalidCecos = form.costCenterIds.filter(id => !validCecoIds.has(id));
        if (invalidCecos.length > 0) {
          errors.costCenterIds = "Algunos CECOs seleccionados no están asociados al sustento";
        }
      }
    }
    
    // Fecha de registro
    if (!form.fechaRegistro || !form.fechaRegistro.trim()) {
      errors.fechaRegistro = "Fecha de registro es requerida";
    } else if (!isValidDate(form.fechaRegistro)) {
      errors.fechaRegistro = "Fecha inválida. Usa formato DD/MM/YYYY o YYYY-MM-DD";
    }
    
    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.correoSolicitante.trim()) {
      errors.correoSolicitante = "Correo es requerido";
    } else if (!emailRegex.test(form.correoSolicitante)) {
      errors.correoSolicitante = "Correo inválido";
    }

    if (!form.proveedor.trim()) errors.proveedor = "Proveedor es requerido";
    
    // RUC - exactamente 11 dígitos
    if (!form.ruc.trim()) {
      errors.ruc = "RUC es requerido";
    } else if (!/^\d{11}$/.test(form.ruc)) {
      errors.ruc = "RUC debe tener exactamente 11 dígitos";
    }

    // Importe
    const importe = parseFloat(form.importeSinIgv);
    if (!form.importeSinIgv) {
      errors.importeSinIgv = "Importe es requerido";
    } else if (isNaN(importe) || importe < 0) {
      errors.importeSinIgv = "Importe debe ser mayor o igual a 0";
    }

    // URL de cotización (opcional pero si tiene valor debe ser válida)
    if (form.linkCotizacion && form.linkCotizacion.trim()) {
      try {
        new URL(form.linkCotizacion);
      } catch {
        errors.linkCotizacion = "URL inválida";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      // Validar en frontend primero
      if (!validateForm()) {
        throw new Error("FRONTEND_VALIDATION_ERROR");
      }

      // Normalizar payload
      const fechaISO = normalizeDateToISO(form.fechaRegistro);
      if (!fechaISO) {
        setFieldErrors({ fechaRegistro: "Fecha inválida" });
        throw new Error("FRONTEND_VALIDATION_ERROR");
      }

      const payload: any = {
        budgetPeriodFromId: Number(form.budgetPeriodFromId),
        budgetPeriodToId: Number(form.budgetPeriodToId),
        // Fix: Enviar string vacío para permitir borrar estos campos
        incidenteOc: form.incidenteOc.trim(),
        solicitudOc: form.solicitudOc.trim(),
        fechaRegistro: fechaISO, // Convertido a ISO completo
        supportId: Number(form.supportId),
        periodoEnFechasText: form.periodoEnFechasText.trim() || undefined,
        descripcion: form.descripcion.trim() || undefined,
        nombreSolicitante: form.nombreSolicitante.trim(),
        correoSolicitante: form.correoSolicitante.trim(),
        proveedor: form.proveedor.trim(),
        ruc: form.ruc.trim(),
        moneda: form.moneda,
        importeSinIgv: parseFloat(form.importeSinIgv),
        estado: form.estado,
        // Fix: Enviar string vacío explícitamente para permitir borrar el número de OC
        numeroOc: form.numeroOc.trim(),
        comentario: form.comentario.trim() || undefined,
        articuloId: form.articuloId ? Number(form.articuloId) : null,
        costCenterIds: form.costCenterIds,  // NUEVO: array de CECOs
        linkCotizacion: form.linkCotizacion.trim() || undefined
      };

      // Debug en desarrollo
      if (import.meta.env.DEV) {
        console.log("📤 Payload OC:", payload);
      }

      if (editingId) {
        return (await api.patch(`/ocs/${editingId}`, payload)).data;
      } else {
        return (await api.post("/ocs", payload)).data;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "OC actualizada exitosamente" : "OC creada exitosamente");
      queryClient.invalidateQueries({ queryKey: ["ocs"] });
      refetch();
      resetForm();
    },
    onError: (error: any) => {
      if (error.message === "FRONTEND_VALIDATION_ERROR") {
        toast.error("Revisa los campos resaltados");
        return;
      }

      // Manejar errores 422 del backend con issues por campo
      if (error.response?.status === 422 && error.response?.data?.issues) {
        const backendErrors: Record<string, string> = {};
        error.response.data.issues.forEach((issue: any) => {
          const field = issue.path.join(".");
          backendErrors[field] = issue.message;
        });
        setFieldErrors(backendErrors);
        toast.error("Revisa los campos resaltados");

        // Debug en desarrollo
        if (import.meta.env.DEV) {
          console.error("❌ Errores de validación backend:", backendErrors);
        }
      } else {
        const errorMsg = error.response?.data?.error || "Error al guardar OC";
        toast.error(errorMsg);

        // Debug en desarrollo
        if (import.meta.env.DEV) {
          console.error("❌ Error completo:", error.response?.data || error);
        }
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/ocs/${id}`)).data,
    onSuccess: () => {
      toast.success("OC eliminada");
      queryClient.invalidateQueries({ queryKey: ["ocs"] });
      refetch();
    },
    onError: () => toast.error("No se pudo eliminar la OC")
  });

  /**
   * MUTACIÓN: Actualizar estado de OC
   * Emula el patrón de actualización de estado usado en Facturas con optimistic updates
   */
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, estado }: { id: number; estado: string }) => {
      if (import.meta.env.DEV) {
        console.log("📤 Actualizando estado OC:", { id, estado });
      }
      return (await api.patch(`/ocs/${id}/status`, { estado })).data;
    },
    onMutate: async ({ id, estado }) => {
      // Cancelar queries en curso
      await queryClient.cancelQueries({ queryKey: ["ocs"] });
      
      // Snapshot del estado previo
      const previousOcs = queryClient.getQueryData(["ocs"]);
      
      // Actualización optimista
      if (previousOcs) {
        queryClient.setQueryData(["ocs"], (old: any) => {
          if (!old) return old;
          return old.map((oc: any) =>
            oc.id === id ? { ...oc, estado } : oc
          );
        });
      }
      
      return { previousOcs };
    },
    onError: (error: any, variables, context) => {
      // Rollback en caso de error
      if (context?.previousOcs) {
        queryClient.setQueryData(["ocs"], context.previousOcs);
      }
      const errorMsg = error.response?.data?.error || "Error al actualizar estado";
      toast.error(errorMsg);
      if (import.meta.env.DEV) {
        console.error("❌ Error actualizando estado OC:", error.response?.data || error);
      }
    },
    onSuccess: (data, { estado }) => {
      const estadoLabel = estado.replace(/_/g, " ");
      toast.success(`Estado actualizado a ${estadoLabel}`);
      if (import.meta.env.DEV) {
        console.log("✅ Estado OC actualizado:", data);
      }
    },
    onSettled: () => {
      // Refrescar datos
      queryClient.invalidateQueries({ queryKey: ["ocs"] });
    }
  });

  const handleEdit = (oc: any) => {
    // Extraer IDs de CECOs de la relación M:N
    const costCenterIds = oc.costCenters?.map((cc: any) => cc.costCenterId) || [];
    
    setForm({
      budgetPeriodFromId: oc.budgetPeriodFromId?.toString() || "",
      budgetPeriodToId: oc.budgetPeriodToId?.toString() || "",
      incidenteOc: oc.incidenteOc || "",
      solicitudOc: oc.solicitudOc || "",
      fechaRegistro: oc.fechaRegistro?.split("T")[0] || new Date().toISOString().split("T")[0],
      supportId: oc.supportId?.toString() || "",
      periodoEnFechasText: oc.periodoEnFechasText || "",
      descripcion: oc.descripcion || "",
      nombreSolicitante: oc.nombreSolicitante || "",
      correoSolicitante: oc.correoSolicitante || "",
      proveedorId: oc.proveedorId || null,
      proveedor: oc.proveedor || "",
      ruc: oc.ruc || "",
      moneda: oc.moneda || "PEN",
      importeSinIgv: oc.importeSinIgv?.toString() || "",
      estado: oc.estado || "PENDIENTE",
      numeroOc: oc.numeroOc || "",
      comentario: oc.comentario || "",
      articuloId: oc.articuloId?.toString() || "",
      cecoId: oc.cecoId?.toString() || "",
      costCenterIds: costCenterIds,
      linkCotizacion: oc.linkCotizacion || ""
    });
    setEditingId(oc.id);
    setShowForm(true);
  };

  const filteredOcs = ocs?.filter((oc: any) => {
    if (filters.proveedor && !oc.proveedor?.toLowerCase().includes(filters.proveedor.toLowerCase())) return false;
    if (filters.numeroOc && !oc.numeroOc?.toLowerCase().includes(filters.numeroOc.toLowerCase())) return false;
    if (filters.moneda && oc.moneda !== filters.moneda) return false;
    if (filters.estado && oc.estado !== filters.estado) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        oc.proveedor?.toLowerCase().includes(searchLower) ||
        oc.numeroOc?.toLowerCase().includes(searchLower) ||
        oc.ruc?.includes(searchLower) ||
        oc.support?.name?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  }) || [];

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (filters.moneda) params.set("moneda", filters.moneda);
    if (filters.estado) params.set("estado", filters.estado);
    if (filters.proveedor) params.set("proveedor", filters.proveedor);
    if (filters.search) params.set("search", filters.search);
    window.open(`http://localhost:3001/ocs/export/csv?${params.toString()}`, "_blank");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gestión de Órdenes de Compra</h1>
          <p className="text-sm text-slate-600 mt-1">Registro y administración de OCs</p>
        </div>
        <Button onClick={() => {
          if (showForm) {
            // Cancelar: cerrar formulario y limpiar estado
            resetForm();
          } else {
            // Nueva OC: asegurar estado limpio antes de abrir
            setEditingId(null);
            setFieldErrors({});
            setForm({
              budgetPeriodFromId: "",
              budgetPeriodToId: "",
              incidenteOc: "",
              solicitudOc: "",
              fechaRegistro: new Date().toISOString().split("T")[0],
              supportId: "",
              periodoEnFechasText: "",
              descripcion: "",
              nombreSolicitante: "",
              correoSolicitante: "",
              proveedorId: null,
              proveedor: "",
              ruc: "",
              moneda: "PEN",
              importeSinIgv: "",
              estado: "PENDIENTE",
              numeroOc: "",
              comentario: "",
              articuloId: "",
              cecoId: "",
              costCenterIds: [],
              linkCotizacion: ""
            });
            setShowForm(true);
          }
        }}>
          {showForm ? "Cancelar" : "Nueva OC"}
        </Button>
      </div>

      {/* Formulario de registro/edición */}
      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium">{editingId ? "Editar OC" : "Nueva Orden de Compra"}</h2>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Periodo PPTO Desde *</label>
                <YearMonthPicker
                  value={form.budgetPeriodFromId ? Number(form.budgetPeriodFromId) : null}
                  onChange={(period) => {
                    const newFromId = period ? String(period.id) : "";
                    setForm(f => ({ ...f, budgetPeriodFromId: newFromId }));
                    
                    // Lógica: Si es cambio manual Y budgetPeriodToId está vacío → copiar Desde a Hasta
                    if (!isProgrammaticChangeRef.current && newFromId !== "" && form.budgetPeriodToId === "") {
                      setForm(f => ({ ...f, budgetPeriodToId: newFromId }));
                    }
                  }}
                  periods={periods || []}
                  placeholder="Seleccionar período desde..."
                  error={fieldErrors.budgetPeriodFromId}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Periodo PPTO Hasta *</label>
                <YearMonthPicker
                  value={form.budgetPeriodToId ? Number(form.budgetPeriodToId) : null}
                  onChange={(period) => setForm(f => ({ ...f, budgetPeriodToId: period ? String(period.id) : "" }))}
                  periods={periods || []}
                  minId={form.budgetPeriodFromId ? Number(form.budgetPeriodFromId) : undefined}
                  placeholder="Seleccionar período hasta..."
                  error={fieldErrors.budgetPeriodToId}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fecha Registro *</label>
                <InputWithError 
                  type="date" 
                  value={form.fechaRegistro} 
                  onChange={(e: any) => setForm(f => ({ ...f, fechaRegistro: e.target.value }))}
                  error={fieldErrors.fechaRegistro}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">INC de OC</label>
                <InputWithError 
                  placeholder="INC-2026-001" 
                  value={form.incidenteOc} 
                  onChange={(e: any) => setForm(f => ({ ...f, incidenteOc: e.target.value }))}
                  error={fieldErrors.incidenteOc}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Solicitud OC</label>
                <InputWithError 
                  placeholder="SOL-2026-001" 
                  value={form.solicitudOc} 
                  onChange={(e: any) => setForm(f => ({ ...f, solicitudOc: e.target.value }))}
                  error={fieldErrors.solicitudOc}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Número de OC</label>
                <InputWithError 
                  placeholder="OC-2026-0001" 
                  value={form.numeroOc} 
                  onChange={(e: any) => setForm(f => ({ ...f, numeroOc: e.target.value }))}
                  error={fieldErrors.numeroOc}
                />
              </div>

              <div className="md:col-span-3">
                <FilterSelectWithError
                  label="Sustento *"
                  placeholder="Seleccionar sustento"
                  value={form.supportId}
                  onChange={(value: string) => setForm(f => ({ ...f, supportId: value }))}
                  options={supports?.map((s: any) => ({
                    value: String(s.id),
                    label: `${s.code} - ${s.name}`,
                    searchText: `${s.code} ${s.name}`
                  })) || []}
                  error={fieldErrors.supportId}
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">Periodo en Fechas (texto libre)</label>
                <InputWithError 
                  placeholder="Enero - Febrero 2026" 
                  value={form.periodoEnFechasText} 
                  onChange={(e: any) => setForm(f => ({ ...f, periodoEnFechasText: e.target.value }))}
                  error={fieldErrors.periodoEnFechasText}
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <InputWithError 
                  placeholder="Descripción de la orden..." 
                  value={form.descripcion} 
                  onChange={(e: any) => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  error={fieldErrors.descripcion}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nombre Solicitante *</label>
                <InputWithError 
                  placeholder="Juan Pérez" 
                  value={form.nombreSolicitante} 
                  onChange={(e: any) => setForm(f => ({ ...f, nombreSolicitante: e.target.value }))}
                  error={fieldErrors.nombreSolicitante}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Correo Solicitante *</label>
                <InputWithError 
                  type="email" 
                  placeholder="juan.perez@empresa.com" 
                  value={form.correoSolicitante} 
                  onChange={(e: any) => setForm(f => ({ ...f, correoSolicitante: e.target.value }))}
                  error={fieldErrors.correoSolicitante}
                />
              </div>

              <div className="md:col-span-3">
                <ProveedorSelector
                  label="Proveedor *"
                  placeholder="Buscar o crear proveedor..."
                  value={form.proveedorId}
                  onChange={(proveedorId, proveedor) => {
                    setForm(f => ({
                      ...f,
                      proveedorId,
                      proveedor: proveedor?.razonSocial || f.proveedor,
                      ruc: proveedor?.ruc || f.ruc
                    }));
                    if (proveedorId) {
                      setFieldErrors(e => ({ ...e, proveedor: "", ruc: "" }));
                    }
                  }}
                  error={fieldErrors.proveedor}
                  allowCreate={true}
                />
              </div>

              <div>
                <FilterSelectWithError
                  label="Moneda *"
                  placeholder="Seleccionar moneda"
                  value={form.moneda}
                  onChange={(value: string) => setForm(f => ({ ...f, moneda: value }))}
                  options={[
                    { value: "PEN", label: "PEN - Soles" },
                    { value: "USD", label: "USD - Dólares" }
                  ]}
                  searchable={false}
                  error={fieldErrors.moneda}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Importe sin IGV *</label>
                <InputWithError 
                  type="number" 
                  step="0.01" 
                  min="0"
                  placeholder="0.00" 
                  value={form.importeSinIgv} 
                  onChange={(e: any) => setForm(f => ({ ...f, importeSinIgv: e.target.value }))}
                  error={fieldErrors.importeSinIgv}
                />
              </div>

              <div>
                <FilterSelectWithError
                  label="Estado *"
                  placeholder="Seleccionar estado"
                  value={form.estado}
                  onChange={(value: string) => setForm(f => ({ ...f, estado: value }))}
                  options={ESTADOS_OC.map(estado => ({
                    value: estado,
                    label: estado.replace(/_/g, " ")
                  }))}
                  error={fieldErrors.estado}
                />
              </div>

              <div>
                <FilterSelectWithError
                  label="Artículo"
                  placeholder="Ninguno"
                  value={form.articuloId}
                  onChange={(value: string) => setForm(f => ({ ...f, articuloId: value }))}
                  options={articulos?.map((a: any) => ({
                    value: String(a.id),
                    label: `${a.code} - ${a.name}`,
                    searchText: `${a.code} ${a.name}`
                  })) || []}
                  error={fieldErrors.articuloId}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Centros de Costo (CECO) *</label>
                {!form.supportId ? (
                  <div className="text-sm text-slate-500 italic py-2">
                    Selecciona un sustento primero
                  </div>
                ) : (
                  <>
                    <FilterSelect
                      placeholder="Selecciona uno o más CECOs..."
                      value=""
                      onChange={(value) => {
                        const cecoId = Number(value);
                        if (cecoId && !form.costCenterIds.includes(cecoId)) {
                          setForm(f => ({ ...f, costCenterIds: [...f.costCenterIds, cecoId] }));
                        }
                      }}
                      options={availableCostCenters
                        ?.filter((cc: any) => !form.costCenterIds.includes(cc.id))
                        .map((cc: any) => ({
                          value: String(cc.id),
                          label: `${cc.code} - ${cc.name}`,
                          searchText: `${cc.code} ${cc.name}`
                        })) || []}
                      className={fieldErrors.costCenterIds ? "border-red-500" : ""}
                    />
                    {/* Chips de CECOs seleccionados */}
                    {form.costCenterIds.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {form.costCenterIds.map(cecoId => {
                          const ceco = costCenters?.find((cc: any) => cc.id === cecoId);
                          return ceco ? (
                            <div
                              key={cecoId}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-brand-100 text-brand-800"
                            >
                              <span>{ceco.code} - {ceco.name}</span>
                              <button
                                type="button"
                                onClick={() => setForm(f => ({
                                  ...f,
                                  costCenterIds: f.costCenterIds.filter(id => id !== cecoId)
                                }))}
                                className="hover:text-brand-600"
                              >
                                ×
                              </button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
                    {fieldErrors.costCenterIds && (
                      <p className="text-xs text-red-600 mt-1">{fieldErrors.costCenterIds}</p>
                    )}
                  </>
                )}
              </div>

              {/* Documentos adjuntos - solo mostrar si es edición de OC existente */}
              {editingId && (
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium mb-1">Cotizaciones (PDF)</label>
                  <OcFileUploader
                    ocId={editingId}
                    disabled={!['PENDIENTE', 'PROCESAR'].includes(form.estado)}
                  />
                  {!['PENDIENTE', 'PROCESAR'].includes(form.estado) && (
                    <p className="text-xs text-slate-500 mt-1">
                      Los documentos no se pueden modificar en estado {form.estado.replace(/_/g, ' ')}
                    </p>
                  )}
                </div>
              )}

              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">Comentario</label>
                <InputWithError 
                  placeholder="Comentarios adicionales" 
                  value={form.comentario} 
                  onChange={(e: any) => setForm(f => ({ ...f, comentario: e.target.value }))}
                  error={fieldErrors.comentario}
                />
              </div>

              <div className="md:col-span-3 flex gap-2">
                <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Guardando..." : (editingId ? "Actualizar" : "Guardar")}
                </Button>
                <Button variant="secondary" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de OCs */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Buscar..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-auto flex-1 min-w-[200px]"
            />
            <Input
              placeholder="Proveedor"
              value={filters.proveedor}
              onChange={e => setFilters(f => ({ ...f, proveedor: e.target.value }))}
              className="w-auto flex-1 min-w-[150px]"
            />
            <Input
              placeholder="Número OC"
              value={filters.numeroOc}
              onChange={e => setFilters(f => ({ ...f, numeroOc: e.target.value }))}
              className="w-auto flex-1 min-w-[150px]"
            />
            <FilterSelect
              placeholder="(Moneda)"
              value={filters.moneda}
              onChange={(value) => setFilters(f => ({ ...f, moneda: value }))}
              options={[
                { value: "PEN", label: "PEN" },
                { value: "USD", label: "USD" }
              ]}
              searchable={false}
              className="w-auto min-w-[120px]"
            />
            <FilterSelect
              placeholder="(Estado)"
              value={filters.estado}
              onChange={(value) => setFilters(f => ({ ...f, estado: value }))}
              options={ESTADOS_OC.map(estado => ({
                value: estado,
                label: estado.replace(/_/g, " ")
              }))}
              className="w-auto min-w-[160px]"
            />
            <Button variant="secondary" onClick={handleExportCSV}>
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Cargando...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <Th>Número OC / INC</Th>
                    <Th>Proveedor</Th>
                    <Th>Moneda</Th>
                    <Th>Importe sin IGV</Th>
                    <Th>Estado</Th>
                    <Th>Sustento</Th>
                    <Th>CECOs</Th>
                    <Th>Periodo</Th>
                    <Th>Fecha</Th>
                    <Th>Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOcs.map((oc: any) => (
                    <tr key={oc.id}>
                      <Td>
                        {/* Prioridad: numeroOc > INC > Solicitud > "INC PENDIENTE" */}
                        {oc.numeroOc || 
                         (oc.incidenteOc ? `INC ${oc.incidenteOc}` : 
                         (oc.solicitudOc ? `SOL ${oc.solicitudOc}` : "INC PENDIENTE"))}
                      </Td>
                      <Td>{oc.proveedor}</Td>
                      <Td>{oc.moneda}</Td>
                      <Td className="text-right">{formatNumber(oc.importeSinIgv)}</Td>
                      <Td>
                        {/* Cambio de estado inline con OcStatusChip (estilo Facturas) */}
                        <OcStatusChip
                          currentStatus={oc.estado}
                          onStatusChange={(newStatus) => {
                            updateStatusMutation.mutate({ id: oc.id, estado: newStatus });
                          }}
                          isLoading={updateStatusMutation.isPending && updateStatusMutation.variables?.id === oc.id}
                        />
                      </Td>
                      <Td className="text-xs">{oc.support?.name || "-"}</Td>
                      <Td className="text-xs">
                        {oc.costCenters && oc.costCenters.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {oc.costCenters.map((cc: any) => (
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
                      <Td className="text-xs">
                        {formatPeriodRange(oc.budgetPeriodFrom, oc.budgetPeriodTo)}
                      </Td>
                      <Td className="text-xs">{new Date(oc.fechaRegistro).toLocaleDateString()}</Td>
                      <Td>
                        <div className="flex gap-1">
                          <Button size="sm" variant="secondary" onClick={() => handleEdit(oc)}>
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("¿Eliminar esta OC?")) deleteMutation.mutate(oc.id);
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
              {filteredOcs.length === 0 && (
                <p className="text-center text-slate-500 py-8">No se encontraron órdenes de compra</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

