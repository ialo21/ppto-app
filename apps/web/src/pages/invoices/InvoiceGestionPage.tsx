import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import FilterSelect from "../../components/ui/FilterSelect";
import Button from "../../components/ui/Button";
import { Table, Th, Td } from "../../components/ui/Table";
import StatusChip from "../../components/StatusChip";
import YearMonthPicker from "../../components/YearMonthPicker";
import ResponsableSelector from "../../components/ResponsableSelector";
import StatusMultiSelect from "../../components/ui/StatusMultiSelect";
import ProviderMultiSelect, { ProviderOption } from "../../components/ui/ProviderMultiSelect";
import UserMultiSelect, { UserOption } from "../../components/ui/UserMultiSelect";
import SupportMultiSelect, { SupportOption } from "../../components/ui/SupportMultiSelect";
import { formatNumber } from "../../utils/numberFormat";
import { formatPeriodLabel } from "../../utils/periodFormat";
import ProveedorSelector from "../../components/ProveedorSelector";
import { Pencil, Copy, Trash2, LayoutGrid, CheckCircle2, Package, FileText } from "lucide-react";
import Modal from "../../components/ui/Modal";

type OC = {
  id: number;
  numeroOc: string | null;
  proveedor: string;
  proveedorRef?: { razonSocial?: string | null; ruc?: string | null } | null;
  solicitanteUser?: { id: number; name: string | null; email: string } | null;
  moneda: string;
  importeSinIgv: number;
  support: { 
    id: number; 
    name: string;
    expensePackage?: { id: number; name: string } | null;
    expenseConcept?: { id: number; name: string } | null;
  };
  costCenters?: { id: number; costCenterId: number; costCenter: { id: number; code: string; name: string } }[];
  budgetPeriodFrom?: { id: number; year: number; month: number };
  budgetPeriodTo?: { id: number; year: number; month: number };
};

type Invoice = {
  id: number;
  ocId: number | null;
  // Sustento (facturas sin OC)
  supportId?: number | null;
  support?: {
    id: number;
    name: string;
    expensePackage?: { id: number; name: string } | null;
    expenseConcept?: { id: number; name: string } | null;
  } | null;
  // Proveedor para facturas sin OC
  proveedorId?: number | null;
  proveedor?: { id: number; razonSocial: string; ruc: string } | null;
  oc: {
    id: number;
    numeroOc: string | null;
    proveedor: string;
    proveedorRef?: { razonSocial?: string | null; ruc?: string | null } | null;
    solicitanteUser?: { id: number; name: string | null; email: string } | null;
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
  vendorId?: number | null;
  createdByUser?: { id: number; name: string | null; email: string } | null;
  approvedByUser?: { id: number; name: string | null; email: string } | null;
  docType: string;
  numberNorm: string | null;
  currency: string;
  montoSinIgv: number | null;
  exchangeRateOverride: number | null;
  statusCurrent: string;
  ultimusIncident: string | null;
  detalle: string | null;
  createdAt: string;
  periods?: { id: number; periodId: number; period: { id: number; year: number; month: number; label?: string } }[];
  costCenters?: { id: number; costCenterId: number; amount?: number; percentage?: number; costCenter: { id: number; code: string; name: string } }[];
  // Campos contables
  mesContable?: string | null;
  tcEstandar?: number | null;
  tcReal?: number | null;
  montoPEN_tcEstandar?: number | null;
  montoPEN_tcReal?: number | null;
  diferenciaTC?: number | null;
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

export default function InvoiceGestionPage() {
  const queryClient = useQueryClient();
  const isLocalStatusChangeRef = useRef(false);
  const formRef = useRef<HTMLDivElement>(null);

  // WebSocket se maneja centralizadamente en WebSocketProvider
  // Las actualizaciones de estado se reflejan automáticamente vía invalidación de queries

  // Queries
  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["invoices"],
    queryFn: async () => (await api.get("/invoices")).data,
    staleTime: 30 * 1000, // 30 segundos - reducir refetches automáticos
    refetchOnWindowFocus: false
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

  // Estados de filtros
  const [filters, setFilters] = useState({ 
    selectedEstados: [] as string[],  // Multi-select de estados
    docType: "", 
    numeroOc: "",
    numeroFactura: "",
    selectedProviders: [] as string[],
    selectedUsers: [] as string[],
    selectedSupports: [] as string[]  // Multi-select de sustentos
  });

  // Filtrado parcial para opciones de filtros interconectados
  const getPartiallyFilteredInvoices = (excludeFilter: string) => {
    if (!invoices) return [];
    let result = [...invoices];

    if (excludeFilter !== 'estados' && filters.selectedEstados.length > 0) {
      result = result.filter(inv => filters.selectedEstados.includes(inv.statusCurrent));
    }

    if (excludeFilter !== 'docType' && filters.docType) {
      result = result.filter(inv => inv.docType === filters.docType);
    }

    if (excludeFilter !== 'numeroOc' && filters.numeroOc) {
      const search = filters.numeroOc.toLowerCase();
      result = result.filter(inv => {
        const ocNumber = inv.oc?.numeroOc?.toLowerCase();
        return ocNumber ? ocNumber.includes(search) : false;
      });
    }

    if (excludeFilter !== 'numeroFactura' && filters.numeroFactura) {
      const search = filters.numeroFactura.toLowerCase();
      result = result.filter(inv => inv.numberNorm?.toLowerCase().includes(search));
    }

    if (excludeFilter !== 'users' && filters.selectedUsers.length > 0) {
      result = result.filter(inv => {
        const createdByEmail = inv.createdByUser?.email;
        const solicitanteEmail = inv.oc?.solicitanteUser?.email;
        return (
          (createdByEmail && filters.selectedUsers.includes(createdByEmail)) ||
          (solicitanteEmail && filters.selectedUsers.includes(solicitanteEmail))
        );
      });
    }

    if (excludeFilter !== 'providers' && filters.selectedProviders.length > 0) {
      result = result.filter(inv => {
        const proveedor =
          inv.oc?.proveedorRef?.razonSocial ||
          inv.oc?.proveedor ||
          inv.proveedor?.razonSocial ||
          "Sin proveedor";
        return filters.selectedProviders.includes(proveedor);
      });
    }

    if (excludeFilter !== 'supports' && filters.selectedSupports.length > 0) {
      result = result.filter(inv => {
        const supportName = inv.oc?.support?.name || inv.support?.name;
        return supportName && filters.selectedSupports.includes(supportName);
      });
    }

    return result;
  };

  const availableProviders: ProviderOption[] = useMemo(() => {
    const partialData = getPartiallyFilteredInvoices('providers');
    const map = new Map<string, ProviderOption>();
    partialData.forEach((inv: any) => {
      const label = inv.oc?.proveedorRef?.razonSocial || inv.oc?.proveedor || inv.proveedor?.razonSocial || "Sin proveedor";
      const secondary = inv.oc?.proveedorRef?.ruc || inv.proveedor?.ruc || null;
      if (!map.has(label)) {
        map.set(label, { value: label, label, secondary });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [invoices, filters.selectedEstados, filters.docType, filters.numeroOc, filters.selectedUsers, filters.selectedSupports]);

  const availableSupports: SupportOption[] = useMemo(() => {
    const partialData = getPartiallyFilteredInvoices('supports');
    const map = new Map<string, SupportOption>();
    partialData.forEach((inv: any) => {
      const supportName = inv.oc?.support?.name || inv.support?.name;
      if (supportName && !map.has(supportName)) {
        map.set(supportName, { 
          value: supportName, 
          label: supportName,
          code: null
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [invoices, filters.selectedEstados, filters.docType, filters.numeroOc, filters.selectedUsers, filters.selectedProviders]);

  const availableUsers: UserOption[] = useMemo(() => {
    const partialData = getPartiallyFilteredInvoices('users');
    const map = new Map<string, UserOption>();
    partialData.forEach((inv: any) => {
      // Incluir createdByUser (facturas sin OC o usuario explícito)
      const email = inv.createdByUser?.email;
      const name = inv.createdByUser?.name || null;
      if (email && !map.has(email)) {
        map.set(email, { email, name });
      }
      
      // Incluir oc.solicitanteUser (facturas con OC que tienen solicitante)
      const ocSolicitanteEmail = inv.oc?.solicitanteUser?.email;
      const ocSolicitanteName = inv.oc?.solicitanteUser?.name || null;
      if (ocSolicitanteEmail && !map.has(ocSolicitanteEmail)) {
        map.set(ocSolicitanteEmail, { email: ocSolicitanteEmail, name: ocSolicitanteName });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      const nameA = a.name || a.email;
      const nameB = b.name || b.email;
      return nameA.localeCompare(nameB);
    });
  }, [invoices, filters.selectedEstados, filters.docType, filters.numeroOc, filters.selectedProviders, filters.selectedSupports]);

  const { data: supports } = useQuery({
    queryKey: ["supports"],
    queryFn: async () => (await api.get("/supports")).data
  });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" | null }>({
    key: "createdAt",
    direction: "desc"
  });

  const DEFAULT_SORT = { key: "createdAt", direction: "desc" as const };

  const [hasOC, setHasOC] = useState(true);  // Toggle Con OC / Sin OC
  const [form, setForm] = useState({
    id: "",
    ocId: "",
    supportId: "",  // Para modo sin OC
    responsableUserId: null as number | null,  // Responsable para facturas sin OC
    docType: "FACTURA",
    numberNorm: "",
    montoSinIgv: "",
    exchangeRateOverride: "",
    ultimusIncident: "",
    detalle: "",
    proveedorId: null as number | null,
    proveedor: "",
    moneda: "PEN",
    // Campos contables
    mesContable: "",
    tcReal: ""
  });
  const [periodFromId, setPeriodFromId] = useState<number | null>(null);
  const [periodToId, setPeriodToId] = useState<number | null>(null);
  const [mesContablePeriodId, setMesContablePeriodId] = useState<number | null>(null);
  
  // Ref para rastrear cambios programáticos (ej. al seleccionar OC)
  const isProgrammaticChangeRef = useRef(false);
  const [cecoSearchCode, setCecoSearchCode] = useState("");
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);
  
  /**
   * Modo del formulario: 'create' | 'edit' | null
   * 
   * DIFERENCIACIÓN ENTRE CREAR Y EDITAR:
   * - 'create': Formulario en modo creación (formulario limpio, sin datos previos)
   * - 'edit': Formulario en modo edición (cargado con datos de una factura existente)
   * - null: Formulario cerrado o sin modo definido
   * 
   * Esta separación evita que se mezclen estados entre crear y editar:
   * - Al hacer clic en "Nueva Factura" → se llama openCreateForm() → formMode = 'create'
   * - Al hacer clic en "Editar" → se llama openEditForm() → formMode = 'edit'
   * - Al cancelar o resetear → formMode = null
   */
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);

  // Estado para modal de distribución
  const [isDistributionModalOpen, setIsDistributionModalOpen] = useState(false);
  const [distributionIncidents, setDistributionIncidents] = useState<Record<number, string>>({});
  const [distributionSort, setDistributionSort] = useState<'asc' | 'desc'>('asc');

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
  
  // Moneda actual: viene de OC si hay OC, sino del formulario
  const currentCurrency = useMemo(() => {
    if (hasOC && selectedOC) {
      return selectedOC.moneda;
    }
    return form.moneda || "PEN";
  }, [hasOC, selectedOC, form.moneda]);

  // Support seleccionado (modo sin OC)
  const selectedSupport = useMemo(() => {
    if (!form.supportId || hasOC) return null;
    return (supports || []).find((s: any) => s.id === Number(form.supportId));
  }, [form.supportId, hasOC, supports]);

  // CECOs disponibles
  const availableCostCenters = useMemo(() => {
    if (hasOC && selectedOC && selectedOC.costCenters) {
      return selectedOC.costCenters.map(cc => cc.costCenter);
    }
    if (!hasOC && selectedSupport && selectedSupport.costCenters) {
      return selectedSupport.costCenters.map((sc: any) => sc.costCenter);
    }
    return [];
  }, [hasOC, selectedOC, selectedSupport]);

  // CECOs filtrados por búsqueda de código
  const filteredCostCenters = useMemo(() => {
    if (!cecoSearchCode.trim()) return availableCostCenters;
    const searchLower = cecoSearchCode.toLowerCase();
    return availableCostCenters.filter((cc: any) => 
      cc.code?.toLowerCase().includes(searchLower)
    );
  }, [availableCostCenters, cecoSearchCode]);

  // Generar periodIds desde el rango (desde → hasta)
  const periodIds = useMemo(() => {
    if (!periodFromId || !periodToId || !periods) return [];
    
    const fromPeriod = periods.find((p: any) => p.id === periodFromId);
    const toPeriod = periods.find((p: any) => p.id === periodToId);
    if (!fromPeriod || !toPeriod) return [];
    
    const fromValue = fromPeriod.year * 100 + fromPeriod.month;
    const toValue = toPeriod.year * 100 + toPeriod.month;
    
    return periods
      .filter((p: any) => {
        const pValue = p.year * 100 + p.month;
        return pValue >= fromValue && pValue <= toValue;
      })
      .sort((a: any, b: any) => (a.year * 100 + a.month) - (b.year * 100 + b.month))
      .map((p: any) => p.id);
  }, [periodFromId, periodToId, periods]);

  // Min/Max para selector de periodos según OC o global
  // IMPORTANTE: Regla de negocio - las facturas pueden usar periodos en retrospectiva.
  // Solo aplicamos restricciones de OC en modo CREACIÓN. En modo EDICIÓN, el usuario
  // puede seleccionar cualquier periodo del catálogo, sin limitarse a la fecha actual
  // ni a los periodos originales de la OC. El cierre contable se gestiona en backend.
  const periodMinMax = useMemo(() => {
    // Solo aplicar restricciones de OC si estamos en modo creación
    if (formMode === 'create' && hasOC && selectedOC && selectedOC.budgetPeriodFrom && selectedOC.budgetPeriodTo) {
      return {
        minId: selectedOC.budgetPeriodFrom.id,
        maxId: selectedOC.budgetPeriodTo.id
      };
    }
    // En modo edición o sin OC: sin restricciones (cualquier periodo disponible)
    return { minId: undefined, maxId: undefined };
  }, [formMode, hasOC, selectedOC]);

  // Facturas filtradas y ordenadas
  // Facturas INGRESADO para modal de distribución
  const ingresadoInvoices = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter(inv => inv.statusCurrent === "INGRESADO");
  }, [invoices]);

  const sortedIngresadoInvoices = useMemo(() => {
    const list = [...ingresadoInvoices];
    return list.sort((a, b) => {
      const aNum = a.numberNorm || "";
      const bNum = b.numberNorm || "";
      return distributionSort === 'asc' ? aNum.localeCompare(bNum) : bNum.localeCompare(aNum);
    });
  }, [ingresadoInvoices, distributionSort]);

  // Inicializar incidentes editables cuando se abre el modal
  useEffect(() => {
    if (isDistributionModalOpen && ingresadoInvoices.length > 0) {
      const incidents: Record<number, string> = {};
      ingresadoInvoices.forEach(inv => {
        incidents[inv.id] = inv.ultimusIncident || "";
      });
      setDistributionIncidents(incidents);
    }
  }, [isDistributionModalOpen, ingresadoInvoices]);

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];

    let filtered = invoices.filter(inv => {
      if (filters.selectedEstados.length > 0 && !filters.selectedEstados.includes(inv.statusCurrent)) return false;
      if (filters.docType && inv.docType !== filters.docType) return false;
      if (filters.numeroOc) {
        const ocNumber = inv.oc?.numeroOc?.toLowerCase();
        if (!ocNumber || !ocNumber.includes(filters.numeroOc.toLowerCase())) return false;
      }
      if (filters.numeroFactura) {
        const num = inv.numberNorm?.toLowerCase();
        if (!num || !num.includes(filters.numeroFactura.toLowerCase())) return false;
      }
      if (filters.selectedUsers.length > 0) {
        // Verificar tanto createdByUser como oc.solicitanteUser
        const createdByEmail = inv.createdByUser?.email;
        const solicitanteEmail = inv.oc?.solicitanteUser?.email;
        const hasMatch = 
          (createdByEmail && filters.selectedUsers.includes(createdByEmail)) ||
          (solicitanteEmail && filters.selectedUsers.includes(solicitanteEmail));
        if (!hasMatch) return false;
      }
      if (filters.selectedProviders.length > 0) {
        const proveedor =
          inv.oc?.proveedorRef?.razonSocial ||
          inv.oc?.proveedor ||
          inv.proveedor?.razonSocial ||
          "Sin proveedor";
        if (!filters.selectedProviders.includes(proveedor)) return false;
      }
      if (filters.selectedSupports.length > 0) {
        const supportName = inv.oc?.support?.name || inv.support?.name;
        if (!supportName || !filters.selectedSupports.includes(supportName)) return false;
      }
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
      supportId: "",
      responsableUserId: null,
      docType: "FACTURA",
      numberNorm: "",
      montoSinIgv: "",
      exchangeRateOverride: "",
      ultimusIncident: "",
      detalle: "",
      proveedorId: null,
      proveedor: "",
      moneda: "PEN",
      mesContable: "",
      tcReal: ""
    });
    setPeriodFromId(null);
    setPeriodToId(null);
    setMesContablePeriodId(null);
    setAllocations([]);
    setCecoSearchCode("");
    setFieldErrors({});
    setHasOC(true);
    setFormMode(null);
  };
  
  // Función para abrir formulario en modo creación
  const openCreateForm = () => {
    resetForm();
    setFormMode('create');
    setShowForm(true);
  };
  
  // Función para abrir formulario en modo edición
  const openEditForm = (invoice: Invoice) => {
    // Cargar datos de la factura en el formulario
    setForm({
      id: String(invoice.id),
      ocId: invoice.ocId ? String(invoice.ocId) : "",
      supportId: invoice.supportId ? String(invoice.supportId) : "",
      responsableUserId: invoice.createdByUser?.id || null,  // Cargar responsable actual
      docType: invoice.docType,
      numberNorm: invoice.numberNorm || "",
      montoSinIgv: invoice.montoSinIgv ? String(invoice.montoSinIgv) : "",
      exchangeRateOverride: invoice.exchangeRateOverride ? String(invoice.exchangeRateOverride) : "",
      ultimusIncident: invoice.ultimusIncident || "",
      detalle: invoice.detalle || "",
      proveedorId: (invoice as any).proveedorId || null,
      proveedor: (invoice as any).proveedor?.razonSocial || invoice.oc?.proveedor || "",
      moneda: invoice.oc?.moneda || invoice.currency || "PEN",
      mesContable: "",
      tcReal: invoice.tcReal ? String(invoice.tcReal) : ""
    });
    setHasOC(!!invoice.ocId);
    
    // Establecer rango de periodos desde/hasta
    if (invoice.periods && invoice.periods.length > 0) {
      const sortedPeriods = [...invoice.periods].sort((a, b) => {
        const aVal = a.period.year * 100 + a.period.month;
        const bVal = b.period.year * 100 + b.period.month;
        return aVal - bVal;
      });
      setPeriodFromId(sortedPeriods[0].periodId);
      setPeriodToId(sortedPeriods[sortedPeriods.length - 1].periodId);
    }
    
    // Cargar mes contable si existe, o limpiarlo si es null/vacío
    // IMPORTANTE: Al editar, si mesContable es null, debemos limpiar el estado
    if (invoice.mesContable && periods) {
      const [year, month] = invoice.mesContable.split('-').map(Number);
      const mesContablePeriod = periods.find((p: any) => p.year === year && p.month === month);
      if (mesContablePeriod) {
        setMesContablePeriodId(mesContablePeriod.id);
      } else {
        setMesContablePeriodId(null);
      }
    } else {
      setMesContablePeriodId(null);
    }
    
    // Cargar allocations (convertir montos a porcentajes si es necesario)
    const montoTotal = invoice.montoSinIgv ? Number(invoice.montoSinIgv) : 0;
    setAllocations(
      invoice.costCenters?.map(cc => {
        let percentage = cc.percentage ? Number(cc.percentage) : undefined;
        // Si no hay percentage pero hay amount, calcularlo
        if (!percentage && cc.amount && montoTotal > 0) {
          percentage = (Number(cc.amount) / montoTotal) * 100;
        }
        return {
          costCenterId: cc.costCenterId,
          percentage: percentage || 0
        };
      }) || []
    );
    
    setFormMode('edit');
    setShowForm(true);
    
    // Scroll al formulario para mejorar UX
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };
  
  // Función para duplicar una factura
  const handleDuplicate = (invoice: Invoice) => {
    // Cargar datos de la factura en el formulario (similar a editar, pero sin ID)
    setForm({
      id: "",  // Sin ID = nueva factura
      ocId: invoice.ocId ? String(invoice.ocId) : "",
      supportId: invoice.supportId ? String(invoice.supportId) : "",
      responsableUserId: invoice.createdByUser?.id || null,
      docType: invoice.docType,
      numberNorm: "",  // Dejar vacío para que el usuario ingrese el nuevo número
      montoSinIgv: invoice.montoSinIgv ? String(invoice.montoSinIgv) : "",
      exchangeRateOverride: invoice.exchangeRateOverride ? String(invoice.exchangeRateOverride) : "",
      ultimusIncident: invoice.ultimusIncident || "",
      detalle: invoice.detalle || "",
      proveedorId: (invoice as any).proveedorId || null,
      proveedor: (invoice as any).proveedor?.razonSocial || invoice.oc?.proveedor || "",
      moneda: invoice.oc?.moneda || invoice.currency || "PEN",
      mesContable: "",  // Limpiar mes contable en duplicación
      tcReal: ""  // Limpiar TC real en duplicación
    });
    setHasOC(!!invoice.ocId);
    
    // Establecer rango de periodos desde/hasta
    if (invoice.periods && invoice.periods.length > 0) {
      const sortedPeriods = [...invoice.periods].sort((a, b) => {
        const aVal = a.period.year * 100 + a.period.month;
        const bVal = b.period.year * 100 + b.period.month;
        return aVal - bVal;
      });
      setPeriodFromId(sortedPeriods[0].periodId);
      setPeriodToId(sortedPeriods[sortedPeriods.length - 1].periodId);
    }
    
    // No cargar mes contable en duplicación
    setMesContablePeriodId(null);
    
    // Cargar allocations (convertir montos a porcentajes si es necesario)
    const montoTotal = invoice.montoSinIgv ? Number(invoice.montoSinIgv) : 0;
    setAllocations(
      invoice.costCenters?.map(cc => {
        let percentage = cc.percentage ? Number(cc.percentage) : undefined;
        // Si no hay percentage pero hay amount, calcularlo
        if (!percentage && cc.amount && montoTotal > 0) {
          percentage = (Number(cc.amount) / montoTotal) * 100;
        }
        return {
          costCenterId: cc.costCenterId,
          percentage: percentage || 0
        };
      }) || []
    );
    
    setFormMode('create');  // Modo creación para duplicar
    setShowForm(true);
    
    // Scroll al formulario para mejorar UX
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Auto-distribuir porcentajes entre CECOs
  const distributePercentages = (cecoIds: number[]) => {
    if (cecoIds.length === 0) return [];
    if (cecoIds.length === 1) {
      return [{ costCenterId: cecoIds[0], percentage: 100 }];
    }
    const perCeco = 100 / cecoIds.length;
    return cecoIds.map(id => ({
      costCenterId: id,
      percentage: Math.round(perCeco * 100) / 100
    }));
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async () => {
      // Validación frontend
      const errors: Record<string, string> = {};
      if (hasOC && !form.ocId) errors.ocId = "OC es requerida";
      if (!hasOC && !form.supportId) errors.supportId = "Sustento es requerido";
      if (!hasOC && !form.proveedorId) errors.proveedorId = "Proveedor es requerido";
      if (!hasOC && !form.responsableUserId) errors.responsableUserId = "Responsable es requerido";
      if (!form.numberNorm.trim()) errors.numberNorm = "Número es requerido";
      if (!form.montoSinIgv || Number(form.montoSinIgv) < 0) errors.montoSinIgv = "Monto inválido";
      if (!periodFromId || !periodToId) errors.periodIds = "Debe seleccionar rango de periodos (desde → hasta)";
      if (periodIds.length === 0) errors.periodIds = "Rango de periodos inválido";
      if (allocations.length === 0) errors.allocations = "Debe seleccionar al menos un CECO";

      // Validar porcentajes suman 100%
      const totalPercent = allocations.reduce((sum, a) => sum + (a.percentage || 0), 0);
      if (Math.abs(totalPercent - 100) > 0.01) {
        errors.allocations = `El total de porcentajes debe ser 100% (actualmente: ${totalPercent.toFixed(2)}%)`;
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        throw new Error("FRONTEND_VALIDATION_ERROR");
      }

      // Convertir porcentajes a montos para el backend
      const montoTotal = Number(form.montoSinIgv);
      const allocationsWithAmount = allocations.map(alloc => ({
        costCenterId: alloc.costCenterId,
        amount: Math.round((montoTotal * (alloc.percentage || 0) / 100) * 100) / 100,
        percentage: alloc.percentage
      }));

      // Calcular mesContable en formato YYYY-MM si hay periodId
      // IMPORTANTE: Si el usuario borra el mes contable, debemos enviar null explícitamente
      // para que la factura deje de estar procesada contablemente en el backend.
      let mesContableStr: string | null = null;
      if (mesContablePeriodId && periods) {
        const mesContablePeriod = periods.find((p: any) => p.id === mesContablePeriodId);
        if (mesContablePeriod) {
          mesContableStr = `${mesContablePeriod.year}-${String(mesContablePeriod.month).padStart(2, '0')}`;
        }
      }

      const payload: any = {
        ocId: hasOC ? Number(form.ocId) : undefined,
        docType: form.docType,
        numberNorm: form.numberNorm.trim(),
        montoSinIgv: montoTotal,
        exchangeRateOverride: form.exchangeRateOverride ? Number(form.exchangeRateOverride) : undefined,
        periodIds,
        allocations: allocationsWithAmount,
        // IMPORTANTE: Si el campo está vacío, enviar null explícitamente para borrar el valor en BD
        ultimusIncident: form.ultimusIncident.trim() ? form.ultimusIncident.trim() : null,
        detalle: form.detalle.trim() ? form.detalle.trim() : null,
        // Campos contables
        // IMPORTANTE: mesContable se envía explícitamente como null si se borró
        mesContable: mesContableStr,
        // tcReal solo tiene sentido si hay mesContable; si no hay, enviamos undefined (backend lo ignora)
        tcReal: form.tcReal ? Number(form.tcReal) : undefined
      };

      if (!hasOC) {
        payload.supportId = form.supportId ? Number(form.supportId) : undefined;
        payload.proveedorId = form.proveedorId;
        payload.moneda = form.moneda;
        payload.responsableUserId = form.responsableUserId;  // Asignar responsable para facturas sin OC
      } else if (form.responsableUserId) {
        // Para facturas CON OC: también permitir override del responsable si se especifica
        payload.responsableUserId = form.responsableUserId;
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
      toast.success(formMode === 'edit' ? "Factura actualizada" : "Factura creada");
      resetForm();
      setShowForm(false);
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
      // Marcar que este cambio proviene de esta pestaña
      isLocalStatusChangeRef.current = true;

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
      // Mostrar toast solo si fue un cambio iniciado en esta pestaña y la ventana está activa
      if (isLocalStatusChangeRef.current && document.visibilityState === "visible" && document.hasFocus()) {
        const statusLabel = status.replace(/_/g, " ");
        toast.success(`Estado actualizado a ${statusLabel}`);
      }
      if (import.meta.env.DEV) {
        console.log("✅ Estado actualizado:", data);
      }
    }
    // NOTA: No invalidar aquí - el optimistic update en onMutate ya actualiza la UI,
    // y el WebSocket sincroniza cambios de otros usuarios si es necesario.
    ,
    onSettled: () => {
      // Resetear flag para evitar que futuros eventos (WS) muestren toast en otras pestañas
      isLocalStatusChangeRef.current = false;
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

  // Cuando se selecciona OC, auto-cargar periodos y CECOs (solo en modo creación)
  useEffect(() => {
    if (hasOC && selectedOC && formMode === 'create') {
      // Auto-cargar rango de periodos (desde/hasta)
      if (selectedOC.budgetPeriodFrom && selectedOC.budgetPeriodTo) {
        isProgrammaticChangeRef.current = true;
        setPeriodFromId(selectedOC.budgetPeriodFrom.id);
        setPeriodToId(selectedOC.budgetPeriodTo.id);
        isProgrammaticChangeRef.current = false;
      }

      // Auto-cargar CECOs con distribución de porcentajes
      if (selectedOC.costCenters && selectedOC.costCenters.length > 0) {
        const cecoIds = selectedOC.costCenters.map(cc => cc.costCenterId);
        setAllocations(distributePercentages(cecoIds));
      }
    }
  }, [hasOC, selectedOC, formMode]);

  // Auto-asignar 100% si solo hay 1 CECO disponible (solo en modo creación)
  useEffect(() => {
    if (availableCostCenters.length === 1 && allocations.length === 0 && formMode === 'create') {
      setAllocations([{
        costCenterId: availableCostCenters[0].id,
        percentage: 100
      }]);
    }
  }, [availableCostCenters, allocations.length, formMode]);

  // Mutation para actualizar incidente y estado juntos
  const approveInvoiceMutation = useMutation({
    mutationFn: async ({ id, ultimusIncident }: { id: number; ultimusIncident: string }) => {
      // Primero actualizar el incidente si cambió
      const invoice = invoices?.find(inv => inv.id === id);
      if (invoice && ultimusIncident !== (invoice.ultimusIncident || "")) {
        await api.patch(`/invoices/${id}`, { ultimusIncident: ultimusIncident.trim() || undefined });
      }
      // Luego cambiar el estado a EN_APROBACION
      return await api.patch(`/invoices/${id}/status`, { status: "EN_APROBACION" });
    },
    onSuccess: (data, variables) => {
      toast.success(`Factura aprobada y enviada a EN_APROBACION`);
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      // Remover de la lista local
      setDistributionIncidents(prev => {
        const newIncidents = { ...prev };
        delete newIncidents[variables.id];
        return newIncidents;
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Error al aprobar la factura");
    }
  });

  const handleApproveInvoice = (invoiceId: number) => {
    const incident = distributionIncidents[invoiceId] || "";
    if (!incident.trim()) {
      toast.error("El incidente Ultimus es requerido para aprobar");
      return;
    }
    approveInvoiceMutation.mutate({ id: invoiceId, ultimusIncident: incident });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gestión de Facturas</h1>
          <p className="text-sm text-slate-600 mt-1">Registro y administración de facturas</p>
        </div>
        <Button onClick={() => {
          if (showForm) {
            resetForm();
            setShowForm(false);
          } else {
            openCreateForm();
          }
        }}>
          {showForm ? "Cancelar" : "Nueva Factura"}
        </Button>
      </div>

      {/* Formulario de Creación/Edición */}
      {showForm && (
        <div ref={formRef}>
        <Card>
        <CardHeader>
          <h2 className="text-lg font-medium">{formMode === 'edit' ? "Editar Factura" : "Nueva Factura"}</h2>
          {formMode === 'edit' && (
            <Button variant="ghost" size="sm" onClick={() => {
              resetForm();
              setShowForm(false);
            }} className="ml-auto">
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

          <div className="grid md:grid-cols-3 gap-3">
            {/* Tipo */}
            <div>
              <FilterSelect
                label="Tipo *"
                placeholder="Seleccionar tipo"
                value={form.docType}
                onChange={(value) => handleFormChange("docType", value)}
                options={[
                  { value: "FACTURA", label: "FACTURA" },
                  { value: "NOTA_CREDITO", label: "NOTA DE CRÉDITO" }
                ]}
                searchable={false}
                className={fieldErrors.docType ? "border-red-500" : ""}
              />
              {fieldErrors.docType && <p className="text-xs text-red-600 mt-1">{fieldErrors.docType}</p>}
            </div>

            {/* OC o Proveedor/Moneda manual */}
            {hasOC ? (
              <div className="md:col-span-2">
                <FilterSelect
                  label="Orden de Compra *"
                  placeholder="Seleccionar OC"
                  value={form.ocId}
                  onChange={(value) => handleFormChange("ocId", value)}
                  options={(ocsQuery.data || []).map(oc => ({
                    value: String(oc.id),
                    label: `${oc.numeroOc || `OC-${oc.id}`} - ${oc.proveedorRef?.razonSocial || oc.proveedor} (${oc.moneda} ${formatNumber(oc.importeSinIgv)})`,
                    searchText: `${oc.numeroOc || oc.id} ${oc.proveedorRef?.razonSocial || oc.proveedor}`
                  }))}
                  className={fieldErrors.ocId ? "border-red-500" : ""}
                />
                {fieldErrors.ocId && <p className="text-xs text-red-600 mt-1">{fieldErrors.ocId}</p>}
              </div>
            ) : (
              <>
                <div>
                  <FilterSelect
                    label="Sustento *"
                    placeholder="Seleccionar sustento"
                    value={form.supportId}
                    onChange={(value) => {
                      handleFormChange("supportId", value);
                      // Limpiar allocations al cambiar sustento
                      setAllocations([]);
                    }}
                    options={(supports || []).map((sup: any) => ({
                      value: String(sup.id),
                      label: sup.name,
                      searchText: `${sup.code || ''} ${sup.name}`
                    }))}
                    className={fieldErrors.supportId ? "border-red-500" : ""}
                  />
                  {fieldErrors.supportId && <p className="text-xs text-red-600 mt-1">{fieldErrors.supportId}</p>}
                </div>
                <div className="md:col-span-2">
                  <ProveedorSelector
                    label="Proveedor *"
                    placeholder="Buscar o crear proveedor..."
                    value={form.proveedorId}
                    onChange={(proveedorId, proveedor) => {
                      setForm(f => ({
                        ...f,
                        proveedorId,
                        proveedor: proveedor?.razonSocial || ""
                      }));
                      if (proveedorId) {
                        setFieldErrors(e => {
                          const newErrors = { ...e };
                          delete newErrors.proveedorId;
                          return newErrors;
                        });
                      }
                    }}
                    error={fieldErrors.proveedorId}
                    allowCreate={true}
                  />
                </div>
                <div>
                  <FilterSelect
                    label="Moneda *"
                    placeholder="Seleccionar moneda"
                    value={form.moneda}
                    onChange={(value) => handleFormChange("moneda", value)}
                    options={[
                      { value: "PEN", label: "PEN" },
                      { value: "USD", label: "USD" }
                    ]}
                    searchable={false}
                    className={fieldErrors.moneda ? "border-red-500" : ""}
                  />
                  {fieldErrors.moneda && <p className="text-xs text-red-600 mt-1">{fieldErrors.moneda}</p>}
                </div>
                
                {/* Responsable (solo para facturas sin OC) */}
                <div>
                  <ResponsableSelector
                    label="Responsable *"
                    placeholder="Seleccionar responsable..."
                    value={form.responsableUserId}
                    onChange={(userId) => {
                      setForm(f => ({ ...f, responsableUserId: userId }));
                      if (userId) {
                        setFieldErrors(e => {
                          const newErrors = { ...e };
                          delete newErrors.responsableUserId;
                          return newErrors;
                        });
                      }
                    }}
                    error={fieldErrors.responsableUserId}
                    allowCreate={true}
                  />
                </div>
              </>
            )}

            {/* Número de Factura */}
            <div>
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
            <div>
              <label className="block text-sm font-medium mb-1">Monto sin IGV *</label>
              <Input
                type="number"
                step="0.01"
                placeholder="Monto sin IGV"
                value={form.montoSinIgv}
                onChange={(e) => handleFormChange("montoSinIgv", e.target.value)}
                className={fieldErrors.montoSinIgv ? "border-red-500" : ""}
              />
              {fieldErrors.montoSinIgv && <p className="text-xs text-red-600 mt-1">{fieldErrors.montoSinIgv}</p>}
            </div>

            {/* Tipo de cambio override (solo si moneda ≠ PEN) */}
            {currentCurrency !== "PEN" && (
              <div>
                <label className="block text-sm font-medium mb-1">TC (opcional)</label>
                <Input
                  type="number"
                  step="0.0001"
                  placeholder="Tipo de cambio USD → PEN (ej. 3.7500)"
                  value={form.exchangeRateOverride}
                  onChange={(e) => handleFormChange("exchangeRateOverride", e.target.value)}
                  className={fieldErrors.exchangeRateOverride ? "border-red-500" : ""}
                />
                {fieldErrors.exchangeRateOverride && <p className="text-xs text-red-600 mt-1">{fieldErrors.exchangeRateOverride}</p>}
                <p className="text-xs text-slate-500 mt-1">
                  Si no se ingresa, se usará el TC anual configurado
                </p>
              </div>
            )}

            {/* Incidente Ultimus */}
            <div>
              <label className="block text-sm font-medium mb-1">Incidente Ultimus</label>
              <Input
                placeholder="Incidente Ultimus"
                value={form.ultimusIncident}
                onChange={(e) => handleFormChange("ultimusIncident", e.target.value)}
                className={fieldErrors.ultimusIncident ? "border-red-500" : ""}
              />
              {fieldErrors.ultimusIncident && <p className="text-xs text-red-600 mt-1">{fieldErrors.ultimusIncident}</p>}
            </div>

            {/* Separador */}
            <div className="col-span-full border-t border-slate-200 dark:border-slate-700 pt-4">
              <h3 className="text-md font-semibold text-slate-700 dark:text-gray-200 mb-3">📅 Periodos y Distribución</h3>
            </div>

            {/* Periodos (rango desde/hasta) */}
            <div>
              <label className="block text-sm font-medium mb-1">Periodo Desde *</label>
              <YearMonthPicker
                value={periodFromId}
                onChange={(period) => {
                  const newFromId = period ? period.id : null;
                  setPeriodFromId(newFromId);
                  
                  // Lógica: Si es cambio manual Y periodToId está vacío → copiar Desde a Hasta
                  if (!isProgrammaticChangeRef.current && newFromId !== null && periodToId === null) {
                    setPeriodToId(newFromId);
                  }
                }}
                periods={periods || []}
                minId={periodMinMax.minId}
                maxId={periodToId || periodMinMax.maxId}
                placeholder="Seleccionar período desde..."
                clearable={false}
                error={fieldErrors.periodIds}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Periodo Hasta *</label>
              <YearMonthPicker
                value={periodToId}
                onChange={(period) => setPeriodToId(period ? period.id : null)}
                periods={periods || []}
                minId={periodFromId || periodMinMax.minId}
                maxId={periodMinMax.maxId}
                placeholder="Seleccionar período hasta..."
                error={fieldErrors.periodIds}
              />
              {periodIds.length > 0 && (
                <p className="text-xs text-slate-600 mt-1">
                  {periodIds.length} mes(es) seleccionado(s)
                </p>
              )}
            </div>

            {/* Detalle */}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium mb-1">Detalle</label>
              <Input
                placeholder="Detalle (opcional)"
                value={form.detalle}
                onChange={(e) => handleFormChange("detalle", e.target.value)}
                className={fieldErrors.detalle ? "border-red-500" : ""}
              />
              {fieldErrors.detalle && <p className="text-xs text-red-600 mt-1">{fieldErrors.detalle}</p>}
            </div>

            {/* Separador */}
            <div className="col-span-full border-t border-slate-200 dark:border-slate-700 pt-4">
              <h3 className="text-md font-semibold text-slate-700 dark:text-gray-200 mb-3">📊 Datos Contables</h3>
            </div>

            {/* Mes Contable */}
            <div>
              <label className="block text-sm font-medium mb-1">Mes Contable (opcional)</label>
              <YearMonthPicker
                value={mesContablePeriodId}
                onChange={(period) => setMesContablePeriodId(period ? period.id : null)}
                periods={periods || []}
                placeholder="Seleccionar mes contable..."
                error={fieldErrors.mesContable}
                clearable={true}
              />
              <p className="text-xs text-slate-500 mt-1">
                Opcional. Al ingresar un mes contable, la factura se considera "procesada contablemente" y se habilita el campo TC Real.
              </p>
            </div>

            {/* TC Real (solo si USD Y hay mes contable) */}
            {/* 
              CONDICIÓN PARA MOSTRAR EL CAMPO TC REAL:
              - currentCurrency === "USD": La moneda debe ser USD
                (viene de selectedOC.moneda si hay OC, sino de form.moneda)
              - mesContablePeriodId !== null: Debe haber un mes contable seleccionado
              
              Esta lógica funciona tanto en CREACIÓN como en EDICIÓN:
              - En CREACIÓN: El usuario selecciona un mes contable → aparece el campo TC Real
              - En EDICIÓN: Si la factura ya tiene mes contable → aparece el campo TC Real
              
              El campo se muestra cuando la factura se considera "procesada contablemente"
              (es decir, cuando tiene un mes contable asignado).
            */}
            {currentCurrency === "USD" && mesContablePeriodId && (
              <div>
                <label className="block text-sm font-medium mb-1">TC Real (editable)</label>
                <Input
                  type="number"
                  step="0.0001"
                  placeholder="TC Real (ej. 3.7650)"
                  value={form.tcReal}
                  onChange={(e) => handleFormChange("tcReal", e.target.value)}
                  className={fieldErrors.tcReal ? "border-red-500" : ""}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Si no se ingresa, se usará el TC estándar del año.
                </p>
                {fieldErrors.tcReal && <p className="text-xs text-red-600 mt-1">{fieldErrors.tcReal}</p>}
              </div>
            )}

            {/* Info: Los campos calculados se mostrarán después de guardar */}
            {currentCurrency === "USD" && (
              <div className="col-span-full">
                <p className="text-xs text-slate-600 italic">
                  ℹ️ Los montos en PEN (TC estándar y TC real) se calcularán automáticamente al guardar la factura.
                </p>
              </div>
            )}
          </div>

          {/* Distribución por CECO */}
          <div className="mt-4">
            <h3 className="text-md font-medium mb-2">Distribución por CECO *</h3>
            
            {/* Buscador de CECO por código (solo sin OC) */}
            {!hasOC && (
              <div className="mb-3">
                <Input
                  placeholder="Buscar CECO por código..."
                  value={cecoSearchCode}
                  onChange={(e) => setCecoSearchCode(e.target.value)}
                  className="max-w-xs"
                />
              </div>
            )}

            {availableCostCenters.length === 0 ? (
              <div className="text-sm text-slate-500 italic py-2">
                {hasOC ? "Selecciona una OC primero" : "Selecciona un sustento primero"}
              </div>
            ) : availableCostCenters.length === 1 ? (
              // Solo 1 CECO → 100% automático bloqueado
              <div className="p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium dark:text-gray-200">
                    {availableCostCenters[0].code} - {availableCostCenters[0].name}
                  </span>
                  <span className="text-sm font-bold text-brand-600 dark:text-blue-400">
                    100%
                  </span>
                </div>
              </div>
            ) : (
              // Múltiples CECOs → inputs de porcentaje
              <div className="space-y-2">
                {filteredCostCenters.map((ceco: any) => {
                  const allocation = allocations.find(a => a.costCenterId === ceco.id);
                  return (
                    <div key={ceco.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!allocation}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const currentAllocations = allocations.filter(a => a.costCenterId !== ceco.id);
                            const newCecoIds = [...currentAllocations.map(a => a.costCenterId), ceco.id];
                            setAllocations(distributePercentages(newCecoIds));
                          } else {
                            const filtered = allocations.filter(a => a.costCenterId !== ceco.id);
                            if (filtered.length > 0) {
                              setAllocations(distributePercentages(filtered.map(a => a.costCenterId)));
                            } else {
                              setAllocations([]);
                            }
                          }
                        }}
                        className="rounded"
                      />
                      <span className="flex-1 text-sm">{ceco.code} - {ceco.name || ''}</span>
                      {allocation && (
                        <>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={allocation.percentage || ""}
                            onChange={(e) => {
                              const newPercent = Number(e.target.value) || 0;
                              setAllocations(prev =>
                                prev.map(a =>
                                  a.costCenterId === ceco.id
                                    ? { ...a, percentage: newPercent }
                                    : a
                                )
                              );
                            }}
                            className="w-24 text-sm"
                            placeholder="%"
                          />
                          <span className="text-xs text-slate-600 w-6">%</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Total de porcentajes */}
            {allocations.length > 0 && availableCostCenters.length > 1 && (
              <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded-md">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Total:</span>
                  <span className={`font-bold ${
                    Math.abs(allocations.reduce((sum, a) => sum + (a.percentage || 0), 0) - 100) > 0.01
                      ? "text-red-600"
                      : "text-green-600"
                  }`}>
                    {allocations.reduce((sum, a) => sum + (a.percentage || 0), 0).toFixed(2)}%
                  </span>
                </div>
              </div>
            )}

            {fieldErrors.allocations && <p className="text-xs text-red-600 mt-1">{fieldErrors.allocations}</p>}
          </div>

          {/* Información de OC (Read-only) */}
          {selectedOC && consumoOC && (
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg space-y-2">
              <h3 className="font-medium text-sm text-slate-900 dark:text-gray-100">Información de la OC</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>
                  <span className="text-slate-600 dark:text-gray-300">Proveedor:</span>
                  <p className="font-medium text-slate-900 dark:text-gray-100">{selectedOC.proveedorRef?.razonSocial || selectedOC.proveedor || ""}</p>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-gray-300">Moneda:</span>
                  <p className="font-medium text-slate-900 dark:text-gray-100">{selectedOC.moneda}</p>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-gray-300">Importe Total:</span>
                  <p className="font-medium text-slate-900 dark:text-gray-100">{selectedOC.moneda} {formatNumber(selectedOC.importeSinIgv)}</p>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-gray-300">Consumido:</span>
                  <p className="font-medium text-slate-900 dark:text-gray-100">{consumoOC.moneda} {formatNumber(consumoOC.consumido)}</p>
                </div>
                <div className="md:col-span-2">
                  <span className="text-slate-600 dark:text-gray-300">Saldo Disponible:</span>
                  <p className={`font-medium ${consumoOC.saldoDisponible < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                    {consumoOC.moneda} {formatNumber(consumoOC.saldoDisponible)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4">
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {formMode === 'edit' ? "Actualizar Factura" : "Crear Factura"}
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
      )}

      {/* Filtros y Tabla */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium">Listado de Facturas</h2>
        </CardHeader>
        <CardContent>
          {/* Primera fila de filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <UserMultiSelect
              label="Responsable"
              users={availableUsers}
              selectedUsers={filters.selectedUsers}
              onChange={(selected) => setFilters(f => ({ ...f, selectedUsers: selected }))}
              placeholder="Todos los responsables"
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

            <FilterSelect
              label="Tipo"
              placeholder="Todos los tipos"
              value={filters.docType}
              onChange={(value) => {
                setFilters(f => ({ ...f, docType: value }));
                setSortConfig(DEFAULT_SORT);
              }}
              options={[
                { value: "FACTURA", label: "FACTURA" },
                { value: "NOTA_CREDITO", label: "NOTA DE CRÉDITO" }
              ]}
              searchable={false}
              className="w-full"
            />
          </div>

          {/* Segunda fila de filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-3">
            <div>
              <label className="block text-xs text-brand-text-secondary font-medium mb-1">Número de Factura</label>
              <Input
                placeholder="Buscar por número de factura"
                value={filters.numeroFactura}
                onChange={e => {
                  setFilters(f => ({ ...f, numeroFactura: e.target.value }));
                  setSortConfig(DEFAULT_SORT);
                }}
              />
            </div>

            <div>
              <label className="block text-xs text-brand-text-secondary font-medium mb-1">Número OC</label>
              <Input
                placeholder="Buscar por Número OC"
                value={filters.numeroOc}
                onChange={e => {
                  setFilters(f => ({ ...f, numeroOc: e.target.value }));
                  setSortConfig(DEFAULT_SORT);
                }}
              />
            </div>

            <StatusMultiSelect
              label="Estado"
              placeholder="Todos los estados"
              statuses={[
                "INGRESADO",
                "EN_APROBACION",
                "APROBACION_HEAD",
                "APROBACION_VP",
                "EN_CONTABILIDAD",
                "EN_TESORERIA",
                "EN_ESPERA_DE_PAGO",
                "PAGADO",
                "RECHAZADO"
              ]}
              selectedStatuses={filters.selectedEstados}
              onChange={(selected) => {
                setFilters(f => ({ ...f, selectedEstados: selected }));
                setSortConfig(DEFAULT_SORT);
              }}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-3 text-sm text-brand-text-secondary">
              {filters.selectedUsers.length > 0 && (
                <span>Responsables: {filters.selectedUsers.length}</span>
              )}
              {filters.selectedProviders.length > 0 && (
                <span>Proveedores: {filters.selectedProviders.length}</span>
              )}
              {filters.selectedSupports.length > 0 && (
                <span>Sustentos: {filters.selectedSupports.length}</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setIsDistributionModalOpen(true)}
                size="sm"
                className="flex items-center gap-2"
              >
                <LayoutGrid size={16} />
                Distribución
                {ingresadoInvoices.length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center min-w-[22px] h-5 px-2 text-xs font-semibold leading-none rounded-full bg-blue-600 text-white shadow-sm border border-blue-600">
                    {ingresadoInvoices.length}
                  </span>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  const p = new URLSearchParams();
                  if (filters.selectedEstados.length > 0) p.set("status", filters.selectedEstados.join(","));
                  if (filters.docType) p.set("docType", filters.docType);
                  window.open(`http://localhost:3001/invoices/export/csv?${p.toString()}`, "_blank");
                }}
                size="sm"
              >
                Exportar CSV
              </Button>
            </div>
          </div>

          <div className="mt-4" />

          {isLoading ? (
            <p>Cargando...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <Th className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-center" onClick={() => handleSort("numberNorm")}>
                      Número {sortConfig.key === "numberNorm" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-center" onClick={() => handleSort("docType")}>
                      Tipo {sortConfig.key === "docType" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-center" onClick={() => handleSort("numeroOc")}>
                      OC {sortConfig.key === "numeroOc" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-center" onClick={() => handleSort("proveedor")}>
                      Proveedor {sortConfig.key === "proveedor" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-center" onClick={() => handleSort("currency")}>
                      Moneda {sortConfig.key === "currency" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-center" onClick={() => handleSort("montoSinIgv")}>
                      Monto sin IGV {sortConfig.key === "montoSinIgv" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="text-center">Periodos</Th>
                    <Th className="text-center">CECOs</Th>
                    <Th className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-center" onClick={() => handleSort("ultimusIncident")}>
                      Incidente {sortConfig.key === "ultimusIncident" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-center" onClick={() => handleSort("statusCurrent")}>
                      Estado {sortConfig.key === "statusCurrent" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </Th>
                    <Th className="text-center">Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv: Invoice) => (
                    <tr key={inv.id}>
                      <Td className="text-center">{inv.numberNorm || "-"}</Td>
                      <Td className="text-center">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            inv.docType === "FACTURA" ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"
                          }`}
                        >
                          {inv.docType}
                        </span>
                      </Td>
                      <Td className="text-center">{inv.oc?.numeroOc || "-"}</Td>
                      <Td
                        className="max-w-[220px] whitespace-nowrap truncate text-center"
                        title={inv.oc?.proveedorRef?.razonSocial || inv.oc?.proveedor || inv.proveedor?.razonSocial || "-"}
                      >
                        {inv.oc?.proveedorRef?.razonSocial || inv.oc?.proveedor || inv.proveedor?.razonSocial || "-"}
                      </Td>
                      <Td className="text-center">{inv.currency}</Td>
                      <Td className="text-center">{inv.montoSinIgv ? formatNumber(inv.montoSinIgv) : "-"}</Td>
                      <Td className="text-xs text-center">
                        {inv.periods && inv.periods.length > 0
                          ? formatPeriodsRange(inv.periods.map(p => p.period))
                          : "-"}
                      </Td>
                      <Td className="text-xs text-center">
                        {inv.costCenters && inv.costCenters.length > 0 ? (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {inv.costCenters.map((cc: any) => (
                              <span
                                key={cc.id}
                                className="inline-block px-1.5 py-0.5 text-xs rounded bg-slate-100 dark:bg-slate-700/80 dark:text-gray-200 dark:border dark:border-slate-600"
                              >
                                {cc.costCenter.code}
                              </span>
                            ))}
                          </div>
                        ) : (
                          "-"
                        )}
                      </Td>
                      <Td className="text-xs text-center">{inv.ultimusIncident || "-"}</Td>
                      <Td className="text-center">
                        <StatusChip
                          currentStatus={inv.statusCurrent}
                          onStatusChange={(newStatus) =>
                            updateStatusMutation.mutate({ id: inv.id, status: newStatus })
                          }
                          isLoading={updateStatusMutation.isPending && updateStatusMutation.variables?.id === inv.id}
                        />
                      </Td>
                      <Td className="text-center">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditForm(inv)}
                            title="Editar factura"
                            className="p-2 h-8 w-8"
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDuplicate(inv)}
                            title="Duplicar factura"
                            className="p-2 h-8 w-8"
                          >
                            <Copy size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("¿Eliminar esta factura?")) {
                                deleteMutation.mutate(inv.id);
                              }
                            }}
                            title="Eliminar factura"
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

      {/* Modal de Distribución */}
      <Modal
        isOpen={isDistributionModalOpen}
        onClose={() => setIsDistributionModalOpen(false)}
        title="Distribución de Facturas"
        size="2xl"
      >
        <div className="p-6">
          {/* Header con información */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-xl border border-blue-100 dark:border-slate-600">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white dark:bg-slate-600 rounded-lg shadow-sm">
                <FileText className="text-brand-600 dark:text-blue-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-brand-text-primary dark:text-white mb-1">
                  Facturas pendientes de aprobación
                </h3>
                <p className="text-sm text-brand-text-secondary dark:text-gray-300">
                  Revisa y completa la información de las facturas en estado <span className="font-semibold">INGRESADO</span> antes de enviarlas a aprobación.
                </p>
                <div className="mt-3 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand-600"></div>
                    <span className="text-brand-text-secondary dark:text-gray-300">
                      <span className="font-semibold text-brand-text-primary dark:text-white">{ingresadoInvoices.length}</span> factura{ingresadoInvoices.length !== 1 ? 's' : ''} pendiente{ingresadoInvoices.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de distribución */}
          {ingresadoInvoices.length === 0 ? (
            <div className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 mb-4">
                <CheckCircle2 className="text-slate-400 dark:text-slate-500" size={32} />
              </div>
              <h3 className="text-lg font-medium text-brand-text-primary dark:text-white mb-2">
                No hay facturas pendientes
              </h3>
              <p className="text-sm text-brand-text-secondary dark:text-gray-400">
                Todas las facturas han sido procesadas o no hay facturas en estado INGRESADO.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-b-2 border-slate-200 dark:border-slate-600">
                    <th
                      className="px-3 py-3 text-left text-xs font-semibold text-brand-text-primary dark:text-white uppercase tracking-wider w-[12%] cursor-pointer select-none"
                      onClick={() => setDistributionSort(prev => prev === 'asc' ? 'desc' : 'asc')}
                    >
                      <span className="inline-flex items-center gap-1">
                        N° Factura
                        <span className="text-[10px] text-brand-text-secondary dark:text-gray-400">
                          {distributionSort === 'asc' ? '↑' : '↓'}
                        </span>
                      </span>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-brand-text-primary dark:text-white uppercase tracking-wider w-[18%]">
                      <div className="flex items-center gap-1">
                        <Package size={14} />
                        Paquete
                      </div>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-brand-text-primary dark:text-white uppercase tracking-wider w-[18%]">
                      Concepto
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-brand-text-primary dark:text-white uppercase tracking-wider w-[15%]">
                      CECOs
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-brand-text-primary dark:text-white uppercase tracking-wider w-[25%]">
                      Incidente Ultimus
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-brand-text-primary dark:text-white uppercase tracking-wider w-[12%]">
                      pase Aprobación
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {sortedIngresadoInvoices.map((invoice) => {
                    const support = invoice.oc?.support || invoice.support;
                    const hasFixedIncident = !!invoice.ultimusIncident;
                    const currentIncident = distributionIncidents[invoice.id] || "";
                    
                    return (
                      <tr
                        key={invoice.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-150"
                      >
                        {/* Número de Factura */}
                        <td className="px-3 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-sm text-brand-text-primary dark:text-white">
                              {invoice.numberNorm || "-"}
                            </span>
                            <span className="text-xs text-brand-text-secondary dark:text-gray-400">
                              {invoice.oc?.numeroOc ? `OC: ${invoice.oc.numeroOc}` : "Sin OC"}
                            </span>
                          </div>
                        </td>

                        {/* Paquete de Gasto */}
                        <td className="px-3 py-3">
                          {support?.expensePackage ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                              <Package size={12} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                              <span className="text-xs font-medium text-blue-900 dark:text-blue-300 truncate">
                                {support.expensePackage.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500 italic">Sin paquete</span>
                          )}
                        </td>

                        {/* Concepto de Gasto */}
                        <td className="px-3 py-3">
                          {support?.expenseConcept ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800">
                              <span className="text-xs font-medium text-purple-900 dark:text-purple-300 truncate">
                                {support.expenseConcept.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500 italic">Sin concepto</span>
                          )}
                        </td>

                        {/* CECOs */}
                        <td className="px-3 py-3">
                          {invoice.costCenters && invoice.costCenters.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {invoice.costCenters.map((cc) => (
                                <div
                                  key={cc.id}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                                >
                                  <span className="text-xs font-mono font-semibold text-brand-text-primary dark:text-white">
                                    {cc.costCenter.code}
                                  </span>
                                  {cc.percentage && (
                                    <span className="text-xs text-brand-text-secondary dark:text-gray-400">
                                      ({cc.percentage}%)
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500 italic">Sin CECOs</span>
                          )}
                        </td>

                        {/* Incidente Ultimus */}
                        <td className="px-3 py-3">
                          {hasFixedIncident ? (
                            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
                              <CheckCircle2 size={12} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                              <span className="text-xs font-medium text-green-900 dark:text-green-300 truncate">
                                {invoice.ultimusIncident}
                              </span>
                            </div>
                          ) : (
                            <Input
                              placeholder="Ingresar incidente..."
                              value={currentIncident}
                              onChange={(e) => {
                                setDistributionIncidents(prev => ({
                                  ...prev,
                                  [invoice.id]: e.target.value
                                }));
                              }}
                              className="text-xs h-8"
                            />
                          )}
                        </td>

                        {/* Acción */}
                        <td className="px-3 py-3 text-center">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleApproveInvoice(invoice.id)}
                            disabled={!currentIncident.trim() || approveInvoiceMutation.isPending}
                            className="flex items-center justify-center mx-auto h-9 w-9 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-green-400"
                            title="Aprobar"
                          >
                            <CheckCircle2 size={16} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </Modal>
    </div>
  );
}

