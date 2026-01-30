import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import FilterSelect from "../../components/ui/FilterSelect";
import Input from "../../components/ui/Input";
import StatusMultiSelect from "../../components/ui/StatusMultiSelect";
import UserMultiSelect, { UserOption } from "../../components/ui/UserMultiSelect";
import Button from "../../components/ui/Button";
import SupportMultiSelect, { SupportOption } from "../../components/ui/SupportMultiSelect";
import { Table, Th, Td } from "../../components/ui/Table";
import OcStatusChip from "../../components/OcStatusChip";
import YearMonthPicker from "../../components/YearMonthPicker";
import OcFileUploader, { useOcPendingFiles } from "../../components/OcFileUploader";
import ProveedorSelector from "../../components/ProveedorSelector";
import ResponsableSelector from "../../components/ResponsableSelector";
import ProviderMultiSelect, { ProviderOption } from "../../components/ui/ProviderMultiSelect";
import { formatNumber } from "../../utils/numberFormat";
import { formatPeriodLabel } from "../../utils/periodFormat";
import { Pencil, Copy, Trash2 } from "lucide-react";

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
  const isLocalOcStatusChangeRef = useRef(false);
  const formRef = useRef<HTMLDivElement>(null);
  const { pendingFiles, setPendingFiles, uploadPendingFiles } = useOcPendingFiles();
  const { data: ocs, refetch, isLoading } = useQuery({
    queryKey: ["ocs"],
    queryFn: async () => (await api.get("/ocs")).data
  });

  // WebSocket se maneja centralizadamente en WebSocketProvider
  // Las actualizaciones de estado se reflejan automáticamente vía invalidación de queries

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

  const [filters, setFilters] = useState({
    proveedor: "",
    numeroOc: "",
    moneda: "",
    selectedEstados: ESTADOS_OC.filter(e => e !== "ATENDIDO"),
    search: "",
    selectedProviders: [] as string[],
    selectedUsers: [] as string[],
    selectedSupports: [] as string[]  // Multi-select de sustentos
  });

  // Filtrado parcial para opciones de filtros interconectados
  const getPartiallyFilteredOcs = (excludeFilter: string) => {
    if (!ocs) return [];
    let result = [...ocs];

    if (excludeFilter !== 'providers' && filters.selectedProviders.length > 0) {
      result = result.filter((oc: any) => {
        const proveedor = oc.proveedorRef?.razonSocial || oc.proveedor || "Sin proveedor";
        return filters.selectedProviders.includes(proveedor);
      });
    }

    if (excludeFilter !== 'users' && filters.selectedUsers.length > 0) {
      result = result.filter((oc: any) => {
        const email = oc.solicitanteUser?.email || oc.correoSolicitante;
        return email && filters.selectedUsers.includes(email);
      });
    }

    if (excludeFilter !== 'supports' && filters.selectedSupports.length > 0) {
      result = result.filter((oc: any) => {
        const supportName = oc.support?.name;
        return supportName && filters.selectedSupports.includes(supportName);
      });
    }

    if (excludeFilter !== 'numeroOc' && filters.numeroOc) {
      result = result.filter((oc: any) => oc.numeroOc?.toLowerCase().includes(filters.numeroOc.toLowerCase()));
    }

    if (excludeFilter !== 'moneda' && filters.moneda) {
      result = result.filter((oc: any) => oc.moneda === filters.moneda);
    }

    if (excludeFilter !== 'estados' && filters.selectedEstados.length > 0) {
      result = result.filter((oc: any) => filters.selectedEstados.includes(oc.estado));
    }

    if (excludeFilter !== 'search' && filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter((oc: any) => 
        oc.proveedor?.toLowerCase().includes(searchLower) ||
        oc.numeroOc?.toLowerCase().includes(searchLower) ||
        oc.ruc?.includes(searchLower) ||
        oc.support?.name?.toLowerCase().includes(searchLower)
      );
    }

    return result;
  };

  const availableProviders: ProviderOption[] = useMemo(() => {
    const partialData = getPartiallyFilteredOcs('providers');
    const map = new Map<string, ProviderOption>();
    partialData.forEach((oc: any) => {
      const label = oc.proveedorRef?.razonSocial || oc.proveedor || "Sin proveedor";
      const secondary = oc.proveedorRef?.ruc || oc.ruc || null;
      if (!map.has(label)) {
        map.set(label, { value: label, label, secondary });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [ocs, filters.selectedUsers, filters.selectedSupports, filters.numeroOc, filters.moneda, filters.selectedEstados, filters.search]);

  const availableSupports: SupportOption[] = useMemo(() => {
    const partialData = getPartiallyFilteredOcs('supports');
    const map = new Map<string, SupportOption>();
    partialData.forEach((oc: any) => {
      const supportName = oc.support?.name;
      if (supportName && !map.has(supportName)) {
        map.set(supportName, { 
          value: supportName, 
          label: supportName,
          code: oc.support?.code || null
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [ocs, filters.selectedUsers, filters.selectedProviders, filters.numeroOc, filters.moneda, filters.selectedEstados, filters.search]);

  const availableUsers: UserOption[] = useMemo(() => {
    const partialData = getPartiallyFilteredOcs('users');
    const userMap = new Map<string, UserOption>();
    partialData.forEach((oc: any) => {
      const email = oc.solicitanteUser?.email || oc.correoSolicitante;
      const name = oc.solicitanteUser?.name || oc.nombreSolicitante || null;
      
      if (email && !userMap.has(email)) {
        userMap.set(email, { email, name });
      }
    });
    return Array.from(userMap.values()).sort((a, b) => {
      const nameA = a.name || a.email;
      const nameB = b.name || b.email;
      return nameA.localeCompare(nameB);
    });
  }, [ocs, filters.selectedProviders, filters.selectedSupports, filters.numeroOc, filters.moneda, filters.selectedEstados, filters.search]);

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
    // NUEVO: solicitanteUserId para referencia a Usuario
    solicitanteUserId: null as number | null,
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
    linkCotizacion: "",
    deliveryLink: ""
  });


  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" | null }>({
    key: "id",
    direction: "desc"
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
      solicitanteUserId: null,
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
      linkCotizacion: "",
      deliveryLink: ""
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
    if (!form.solicitanteUserId) errors.solicitanteUserId = "Solicitante es requerido";

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

    // URL de OC entregada (opcional pero si tiene valor debe ser válida)
    if (form.deliveryLink && form.deliveryLink.trim()) {
      try {
        new URL(form.deliveryLink);
      } catch {
        errors.deliveryLink = "URL inválida";
      }
    }

    // VALIDACIÓN DE NEGOCIO: Estado PROCESAR requiere artículo
    if (form.estado === "PROCESAR" && !form.articuloId) {
      errors.articuloId = "Debe seleccionar un artículo para procesar la OC";
      errors.estado = "No se puede procesar sin artículo";
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
        incidenteOc: form.incidenteOc.trim() || undefined,
        solicitudOc: form.solicitudOc.trim() || undefined,
        fechaRegistro: fechaISO, // Convertido a ISO completo
        supportId: Number(form.supportId),
        periodoEnFechasText: form.periodoEnFechasText.trim() || undefined,
        descripcion: form.descripcion.trim() || undefined,
        solicitanteUserId: form.solicitanteUserId,
        proveedorId: form.proveedorId,
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
        linkCotizacion: form.linkCotizacion.trim() || undefined,
        deliveryLink: form.deliveryLink.trim() || undefined
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
    onSuccess: async (data) => {
      const isEdit = !!editingId;
      const ocId = data.id || editingId;
      
      // Si es creación y hay archivos pendientes, subirlos
      if (!isEdit && pendingFiles.length > 0 && ocId) {
        const uploadResult = await uploadPendingFiles(ocId);
        if (uploadResult.success > 0) {
          toast.success(`OC creada y ${uploadResult.success} archivo(s) subido(s)`);
        } else {
          toast.success("OC creada exitosamente");
        }
        if (uploadResult.errors.length > 0) {
          uploadResult.errors.forEach(err => toast.error(err));
        }
      } else {
        toast.success(isEdit ? "OC actualizada exitosamente" : "OC creada exitosamente");
      }
      
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
      // VALIDACIÓN DE NEGOCIO: Validar estado PROCESAR requiere artículo
      if (estado === "PROCESAR") {
        const oc = ocs?.find((o: any) => o.id === id);
        if (oc && !oc.articuloId) {
          throw new Error("VALIDATION_PROCESAR_SIN_ARTICULO");
        }
      }

      if (import.meta.env.DEV) {
        console.log("📤 Actualizando estado OC:", { id, estado });
      }
      return (await api.patch(`/ocs/${id}/status`, { estado })).data;
    },
    onMutate: async ({ id, estado }) => {
      // Marcar que este cambio proviene de esta pestaña
      isLocalOcStatusChangeRef.current = true;

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
      
      // Manejar error de validación específico
      if (error.message === "VALIDATION_PROCESAR_SIN_ARTICULO") {
        toast.error("No se puede cambiar a estado PROCESAR sin artículo asignado");
      } else {
        const errorMsg = error.response?.data?.message || error.response?.data?.error || "Error al actualizar estado";
        toast.error(errorMsg);
      }
      
      if (import.meta.env.DEV) {
        console.error("❌ Error actualizando estado OC:", error.response?.data || error);
      }
    },
    onSuccess: (data, { estado }) => {
      // Mostrar toast solo si fue un cambio iniciado en esta pestaña y la ventana está activa
      if (isLocalOcStatusChangeRef.current && document.visibilityState === "visible" && document.hasFocus()) {
        const estadoLabel = estado.replace(/_/g, " ");
        toast.success(`Estado actualizado a ${estadoLabel}`);
      }
      if (import.meta.env.DEV) {
        console.log("✅ Estado OC actualizado:", data);
      }
    },
    onSettled: () => {
      // Resetear flag y refrescar datos
      isLocalOcStatusChangeRef.current = false;
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
      solicitanteUserId: oc.solicitanteUserId || null,
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
      linkCotizacion: oc.linkCotizacion || "",
      deliveryLink: oc.deliveryLink || ""
    });
    setEditingId(oc.id);
    setShowForm(true);
    
    // Scroll al formulario para mejorar UX
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };
  
  // Función para duplicar una OC
  const handleDuplicate = (oc: any) => {
    // Extraer IDs de CECOs de la relación M:N
    const costCenterIds = oc.costCenters?.map((cc: any) => cc.costCenterId) || [];
    
    // Cargar datos de la OC en el formulario (similar a editar, pero sin ID y sin número OC)
    setForm({
      budgetPeriodFromId: oc.budgetPeriodFromId?.toString() || "",
      budgetPeriodToId: oc.budgetPeriodToId?.toString() || "",
      incidenteOc: "",  // Limpiar incidente en duplicación
      solicitudOc: "",  // Limpiar solicitud en duplicación
      fechaRegistro: new Date().toISOString().split("T")[0],  // Fecha actual
      supportId: oc.supportId?.toString() || "",
      periodoEnFechasText: oc.periodoEnFechasText || "",
      descripcion: oc.descripcion || "",
      solicitanteUserId: oc.solicitanteUserId || null,
      proveedorId: oc.proveedorId || null,
      proveedor: oc.proveedor || "",
      ruc: oc.ruc || "",
      moneda: oc.moneda || "PEN",
      importeSinIgv: oc.importeSinIgv?.toString() || "",
      estado: "PENDIENTE",  // Resetear a estado inicial
      numeroOc: "",  // Limpiar número OC en duplicación
      comentario: oc.comentario || "",
      articuloId: "",  // Limpiar artículo en duplicación
      cecoId: oc.cecoId?.toString() || "",
      costCenterIds: costCenterIds,
      linkCotizacion: oc.linkCotizacion || "",
      deliveryLink: ""  // Limpiar deliveryLink en duplicación
    });
    setEditingId(null);  // Null = nueva OC
    setShowForm(true);
    
    // Scroll al formulario para mejorar UX
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const filteredOcs = ocs?.filter((oc: any) => {
    if (filters.selectedProviders.length > 0) {
      const proveedor = oc.proveedorRef?.razonSocial || oc.proveedor || "Sin proveedor";
      if (!filters.selectedProviders.includes(proveedor)) return false;
    }
    if (filters.selectedUsers.length > 0) {
      const email = oc.solicitanteUser?.email || oc.correoSolicitante;
      if (!email || !filters.selectedUsers.includes(email)) return false;
    }
    if (filters.selectedSupports.length > 0) {
      const supportName = oc.support?.name;
      if (!supportName || !filters.selectedSupports.includes(supportName)) return false;
    }
    if (filters.numeroOc && !oc.numeroOc?.toLowerCase().includes(filters.numeroOc.toLowerCase())) return false;
    if (filters.moneda && oc.moneda !== filters.moneda) return false;
    // Filtro por estados seleccionados (multi-select)
    if (filters.selectedEstados.length > 0 && !filters.selectedEstados.includes(oc.estado)) return false;
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

  const sortedOcs = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return filteredOcs;

    return [...filteredOcs].sort((a: any, b: any) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.key) {
        case "numeroOc":
          aValue = a.numeroOc || "";
          bValue = b.numeroOc || "";
          break;
        case "incidenteOc":
          aValue = a.incidenteOc || "";
          bValue = b.incidenteOc || "";
          break;
        case "proveedor":
          aValue = a.proveedorRef?.razonSocial || a.proveedor || "";
          bValue = b.proveedorRef?.razonSocial || b.proveedor || "";
          break;
        case "support":
          aValue = a.support?.name || "";
          bValue = b.support?.name || "";
          break;
        case "periodo": {
          const aFrom = a.budgetPeriodFrom ? a.budgetPeriodFrom.year * 100 + a.budgetPeriodFrom.month : 0;
          const bFrom = b.budgetPeriodFrom ? b.budgetPeriodFrom.year * 100 + b.budgetPeriodFrom.month : 0;
          const aTo = a.budgetPeriodTo ? a.budgetPeriodTo.year * 100 + a.budgetPeriodTo.month : 0;
          const bTo = b.budgetPeriodTo ? b.budgetPeriodTo.year * 100 + b.budgetPeriodTo.month : 0;
          // ordenar por desde, luego hasta
          if (aFrom !== bFrom) {
            aValue = aFrom;
            bValue = bFrom;
          } else {
            aValue = aTo;
            bValue = bTo;
          }
          break;
        }
        case "moneda":
          aValue = a.moneda || "";
          bValue = b.moneda || "";
          break;
        case "importeSinIgv":
          aValue = Number(a.importeSinIgv) || 0;
          bValue = Number(b.importeSinIgv) || 0;
          break;
        case "estado":
          aValue = a.estado || "";
          bValue = b.estado || "";
          break;
        case "createdAt":
          aValue = new Date(a.createdAt || a.id).getTime();
          bValue = new Date(b.createdAt || b.id).getTime();
          break;
        default:
          aValue = a.id;
          bValue = b.id;
      }

      const isString = typeof aValue === "string" || typeof bValue === "string";
      if (isString) {
        const aStr = (aValue ?? "").toString().toLowerCase();
        const bStr = (bValue ?? "").toString().toLowerCase();
        const cmp = aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: "base" });
        if (cmp !== 0) return sortConfig.direction === "asc" ? cmp : -cmp;
        return 0;
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredOcs, sortConfig]);

  const handleSort = useCallback((key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === "asc") return { key, direction: "desc" };
        if (prev.direction === "desc") return { key: "id", direction: "desc" };
        return { key, direction: "asc" };
      }
      return { key, direction: "asc" };
    });
  }, []);

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (filters.moneda) params.set("moneda", filters.moneda);
    if (filters.selectedEstados.length > 0) params.set("estado", filters.selectedEstados.join(","));
    if (filters.selectedProviders.length > 0) params.set("proveedor", filters.selectedProviders.join(","));
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
              solicitanteUserId: null,
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
              linkCotizacion: "",
              deliveryLink: ""
            });
            setShowForm(true);
          }
        }}>
          {showForm ? "Cancelar" : "Nueva OC"}
        </Button>
      </div>

      {/* Formulario de registro/edición */}
      {showForm && (
        <div ref={formRef}>
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

              <div className="md:col-span-3">
                <ResponsableSelector
                  label="Solicitante *"
                  placeholder="Seleccionar solicitante..."
                  value={form.solicitanteUserId}
                  onChange={(userId) => {
                    setForm(f => ({ ...f, solicitanteUserId: userId }));
                    if (userId) {
                      setFieldErrors(e => {
                        const newErrors = { ...e };
                        delete newErrors.solicitanteUserId;
                        return newErrors;
                      });
                    }
                  }}
                  error={fieldErrors.solicitanteUserId}
                  allowCreate={true}
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
                      proveedor: proveedor?.razonSocial || "",
                      ruc: proveedor?.ruc || ""
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
                          label: `${cc.code} - ${cc.name || ''}`,
                          searchText: `${cc.code} ${cc.name || ''}`
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
                              <span>{ceco.code} - {ceco.name || ''}</span>
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

              {/* Documentos adjuntos - disponible en creación y edición */}
              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">Cotizaciones (PDF)</label>
                <OcFileUploader
                  ocId={editingId}
                  disabled={editingId ? !['PENDIENTE', 'PROCESAR'].includes(form.estado) : false}
                  onFilesChange={setPendingFiles}
                />
                {editingId && !['PENDIENTE', 'PROCESAR'].includes(form.estado) && (
                  <p className="text-xs text-slate-500 mt-1">
                    Los documentos no se pueden modificar en estado {form.estado.replace(/_/g, ' ')}
                  </p>
                )}
                {!editingId && (
                  <p className="text-xs text-slate-500 mt-1">
                    Los archivos se subirán automáticamente al guardar la OC
                  </p>
                )}
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">Link de OC Entregada</label>
                {form.deliveryLink && form.deliveryLink.trim() ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-700 truncate" title={form.deliveryLink}>
                            OC Entregada (Drive)
                          </p>
                          <p className="text-xs text-slate-400 truncate">{form.deliveryLink}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <a
                          href={form.deliveryLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded"
                          title="Abrir link"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, deliveryLink: "" }))}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Eliminar link"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newLink = prompt("Editar link de OC entregada:", form.deliveryLink);
                        if (newLink !== null) {
                          setForm(f => ({ ...f, deliveryLink: newLink.trim() }));
                        }
                      }}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      ✏️ Editar link
                    </button>
                  </div>
                ) : (
                  <>
                    <InputWithError 
                      type="url"
                      placeholder="https://drive.google.com/..." 
                      value={form.deliveryLink} 
                      onChange={(e: any) => setForm(f => ({ ...f, deliveryLink: e.target.value }))}
                      error={fieldErrors.deliveryLink}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Link del documento final de la OC entregada por compras
                    </p>
                  </>
                )}
              </div>

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
        </div>
      )}

      {/* Tabla de OCs */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium">Listado de Órdenes de Compra</h2>
        </CardHeader>
        <CardContent>
          {/* Primera fila de filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs text-brand-text-secondary font-medium mb-1">Búsqueda</label>
              <Input
                placeholder="Proveedor, OC, RUC..."
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              />
            </div>

            <UserMultiSelect
              users={availableUsers}
              selectedUsers={filters.selectedUsers}
              onChange={(selected) => setFilters(f => ({ ...f, selectedUsers: selected }))}
              label="Usuarios"
              placeholder="Todos los usuarios"
            />

            <ProviderMultiSelect
              label="Proveedores"
              providers={availableProviders}
              selectedProviders={filters.selectedProviders}
              onChange={(selected) => setFilters(f => ({ ...f, selectedProviders: selected }))}
              placeholder="Todos los proveedores"
            />

            <SupportMultiSelect
              label="Sustentos"
              supports={availableSupports}
              selectedSupports={filters.selectedSupports}
              onChange={(selected) => setFilters(f => ({ ...f, selectedSupports: selected }))}
              placeholder="Todos los sustentos"
            />

            <div>
              <label className="block text-xs text-brand-text-secondary font-medium mb-1">Número OC</label>
              <Input
                placeholder="Buscar por Número OC"
                value={filters.numeroOc}
                onChange={e => setFilters(f => ({ ...f, numeroOc: e.target.value }))}
              />
            </div>

            <FilterSelect
              label="Moneda"
              placeholder="Todas"
              value={filters.moneda}
              onChange={(value) => setFilters(f => ({ ...f, moneda: value }))}
              options={[
                { value: "PEN", label: "PEN" },
                { value: "USD", label: "USD" }
              ]}
              searchable={false}
              className="w-full"
            />
          </div>
          
          {/* Segunda fila de filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mt-3">
            <StatusMultiSelect
              label="Estado"
              placeholder="Todos los estados"
              statuses={ESTADOS_OC}
              selectedStatuses={filters.selectedEstados}
              onChange={(selected) => setFilters(f => ({ ...f, selectedEstados: selected }))}
              excludeStatus="ATENDIDO"
              excludeLabel="Todo menos ATENDIDO"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-4 text-sm text-brand-text-secondary">
              {filters.selectedUsers.length > 0 && (
                <span>Usuarios: {filters.selectedUsers.length}</span>
              )}
              {filters.selectedProviders.length > 0 && (
                <span>Proveedores: {filters.selectedProviders.length}</span>
              )}
              {filters.selectedSupports.length > 0 && (
                <span>Sustentos: {filters.selectedSupports.length}</span>
              )}
            </div>
            <Button variant="secondary" onClick={handleExportCSV} size="sm">
              Exportar CSV
            </Button>
          </div>

          {isLoading ? (
            <p>Cargando...</p>
          ) : (
            <div className="overflow-x-auto mt-4">
              <Table>
                <thead>
                  <tr>
                    <Th className="cursor-pointer hover:bg-slate-100 text-center" onClick={() => handleSort("numeroOc")}>
                      Número OC {sortConfig.key === "numeroOc" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100 text-center" onClick={() => handleSort("incidenteOc")}>
                      Incidente {sortConfig.key === "incidenteOc" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100 text-center" onClick={() => handleSort("proveedor")}>
                      Proveedor {sortConfig.key === "proveedor" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100 text-center" onClick={() => handleSort("support")}>
                      Sustento {sortConfig.key === "support" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100 text-center" onClick={() => handleSort("periodo")}>
                      Periodos {sortConfig.key === "periodo" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="text-center">CECOs</Th>
                    <Th className="cursor-pointer hover:bg-slate-100 text-center" onClick={() => handleSort("moneda")}>
                      Moneda {sortConfig.key === "moneda" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100 text-center" onClick={() => handleSort("importeSinIgv")}>
                      Importe sin IGV {sortConfig.key === "importeSinIgv" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100 text-center" onClick={() => handleSort("estado")}>
                      Estado {sortConfig.key === "estado" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="text-center">Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOcs.map((oc: any) => (
                    <tr key={oc.id}>
                      <Td className="text-center">{oc.numeroOc || "PENDIENTE"}</Td>
                      <Td className="text-center">{oc.incidenteOc || "-"}</Td>
                      <Td
                        className="max-w-[220px] whitespace-nowrap truncate text-center"
                        title={oc.proveedorRef?.razonSocial || oc.proveedor || "-"}
                      >
                        {oc.proveedorRef?.razonSocial || oc.proveedor || "-"}
                      </Td>
                      <Td className="text-xs text-center">{oc.support?.name || "-"}</Td>
                      <Td className="text-xs text-center">
                        {formatPeriodRange(oc.budgetPeriodFrom, oc.budgetPeriodTo)}
                      </Td>
                      <Td className="text-xs text-center">
                        {oc.costCenters && oc.costCenters.length > 0 ? (
                          <div className="flex flex-wrap gap-1 justify-center">
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
                      <Td className="text-center">{oc.moneda}</Td>
                      <Td className="text-center">{formatNumber(oc.importeSinIgv)}</Td>
                      <Td className="text-center">
                        <OcStatusChip
                          currentStatus={oc.estado}
                          onStatusChange={(newStatus) =>
                            updateStatusMutation.mutate({ id: oc.id, estado: newStatus })
                          }
                          isLoading={updateStatusMutation.isPending && updateStatusMutation.variables?.id === oc.id}
                        />
                      </Td>
                      <Td className="text-center">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(oc)}
                            title="Editar OC"
                            className="p-2 h-8 w-8"
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDuplicate(oc)}
                            title="Duplicar OC"
                            className="p-2 h-8 w-8"
                          >
                            <Copy size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("¿Eliminar esta OC?")) {
                                deleteMutation.mutate(oc.id);
                              }
                            }}
                            title="Eliminar OC"
                            className="p-2 h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 size={16} />
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
