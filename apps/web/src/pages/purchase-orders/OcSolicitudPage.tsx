import React, { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import FilterSelect from "../../components/ui/FilterSelect";
import YearMonthPicker from "../../components/YearMonthPicker";
import Button from "../../components/ui/Button";
import OcFileUploader, { useOcPendingFiles } from "../../components/OcFileUploader";
import ProveedorSelector from "../../components/ProveedorSelector";
import { FileText, Send, AlertCircle, Calendar, Package, FileSignature, DollarSign, Paperclip, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * SUBMÓDULO: Solicitud de Orden de Compra
 * 
 * Formulario MULTI-PASO guiado para solicitar OCs.
 * Las solicitudes se crean con estado PENDIENTE y aparecen automáticamente
 * en las vistas de Listado y Gestión.
 * 
 * MEJORA UX (Diciembre 2024):
 * - Formulario dividido en 6 pasos progresivos
 * - Navegación clara entre pasos (Anterior/Siguiente)
 * - Validación por paso antes de avanzar
 * - Resumen final antes de enviar
 * - Redirección automática al listado tras envío exitoso
 * 
 * CARACTERÍSTICAS:
 * - Auto-relleno de solicitante desde usuario logueado
 * - Selección dinámica de sustento, período y CECOs
 * - Validaciones frontend completas
 * - Descripción limitada a 20 palabras
 * - Adjuntar cotizaciones en PDF (Google Drive)
 * - Crea OC en estado PENDIENTE
 */

const STEPS = [
  { id: 1, title: "Período", icon: Calendar, description: "Selecciona el período presupuestal" },
  { id: 2, title: "Sustento", icon: Package, description: "Línea de presupuesto y CECOs" },
  { id: 3, title: "Descripción", icon: FileSignature, description: "Describe el requerimiento" },
  { id: 4, title: "Proveedor y monto", icon: DollarSign, description: "Información del proveedor y monto" },
  { id: 5, title: "Documentos", icon: Paperclip, description: "Adjunta cotizaciones" },
  { id: 6, title: "Revisión", icon: CheckCircle2, description: "Verifica y envía" }
];

const FieldError = ({ error }: { error?: string }) => {
  if (!error) return null;
  return <p className="text-xs text-red-600 mt-1">{error}</p>;
};

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

export default function OcSolicitudPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(1);

  const { data: periods } = useQuery({
    queryKey: ["periods"],
    queryFn: async () => (await api.get("/periods")).data
  });

  const { data: supports } = useQuery({
    queryKey: ["supports"],
    queryFn: async () => (await api.get("/supports")).data
  });

  const { data: costCenters } = useQuery({
    queryKey: ["cost-centers"],
    queryFn: async () => (await api.get("/cost-centers")).data
  });

  const { data: managements } = useQuery({
    queryKey: ["managements"],
    queryFn: async () => (await api.get("/managements")).data
  });

  const { data: recursosTercerizados } = useQuery({
    queryKey: ["recursos-tercerizados", { status: "ACTIVO" }],
    queryFn: async () => (await api.get("/recursos-tercerizados", { params: { status: "ACTIVO" } })).data
  });

  const [form, setForm] = useState({
    budgetPeriodFromId: "",
    budgetPeriodToId: "",
    managementId: "",
    supportId: "",
    descripcion: "",
    // NUEVO: usar proveedorId para referencia a entidad
    proveedorId: null as number | null,
    proveedorNombre: "",  // Para mostrar en resumen
    proveedorRuc: "",     // Para mostrar en resumen
    moneda: "PEN" as "PEN" | "USD",
    importeSinIgv: "",
    costCenterIds: [] as number[],
    // NUEVO: recursoTercId para asociación con recursos tercerizados
    recursoTercId: null as number | null
  });

  const [esRecursoTercerizado, setEsRecursoTercerizado] = useState(false);

  // Hook para manejar archivos pendientes (se suben después de crear la OC)
  const { pendingFiles, setPendingFiles, uploadPendingFiles, hasPendingFiles } = useOcPendingFiles();

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const filteredSupports = useMemo(() => {
    if (!supports) return [];
    if (!form.managementId) return supports;
    
    const managementIdNum = Number(form.managementId);
    return supports.filter((s: any) => s.managementId === managementIdNum);
  }, [supports, form.managementId]);

  const availableCostCenters = useMemo(() => {
    if (!form.supportId || !supports || !costCenters) return costCenters || [];
    
    const selectedSupport = supports.find((s: any) => s.id === Number(form.supportId));
    if (!selectedSupport) return costCenters || [];
    
    if (selectedSupport.costCenters && selectedSupport.costCenters.length > 0) {
      const cecoIds = new Set(selectedSupport.costCenters.map((cc: any) => cc.costCenterId));
      return costCenters.filter((cc: any) => cecoIds.has(cc.id));
    }
    
    return costCenters || [];
  }, [form.supportId, supports, costCenters]);

  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.budgetPeriodFromId) errors.budgetPeriodFromId = "Periodo desde es requerido";
    if (!form.budgetPeriodToId) errors.budgetPeriodToId = "Periodo hasta es requerido";
    
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

    if (!form.descripcion.trim()) {
      errors.descripcion = "Descripción es requerida";
    } else if (countWords(form.descripcion) > 20) {
      errors.descripcion = "La descripción no puede exceder 20 palabras";
    }

    if (!form.proveedorId) errors.proveedor = "Proveedor es requerido";

    const importe = parseFloat(form.importeSinIgv);
    if (!form.importeSinIgv) {
      errors.importeSinIgv = "Monto estimado es requerido";
    } else if (isNaN(importe) || importe <= 0) {
      errors.importeSinIgv = "El monto debe ser mayor a 0";
    }

    if (!form.costCenterIds || form.costCenterIds.length === 0) {
      errors.costCenterIds = "Debe seleccionar al menos un CECO";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!validateForm()) {
        throw new Error("VALIDATION_ERROR");
      }

      const payload = {
        budgetPeriodFromId: Number(form.budgetPeriodFromId),
        budgetPeriodToId: Number(form.budgetPeriodToId),
        supportId: Number(form.supportId),
        descripcion: form.descripcion.trim(),
        solicitanteUserId: user?.id,  // Usar ID del usuario autenticado
        proveedorId: form.proveedorId,
        proveedor: form.proveedorNombre.trim(),
        ruc: form.proveedorRuc.trim(),
        moneda: form.moneda,
        importeSinIgv: parseFloat(form.importeSinIgv),
        estado: "PENDIENTE",
        costCenterIds: form.costCenterIds,
        recursoTercId: form.recursoTercId  // NUEVO: asociación con recurso tercerizado
      };

      const ocResponse = await api.post("/ocs", payload);
      const createdOc = ocResponse.data;

      // Subir archivos pendientes si hay
      if (hasPendingFiles && createdOc?.id) {
        const uploadResult = await uploadPendingFiles(createdOc.id);
        if (uploadResult.success > 0) {
          toast.success(`${uploadResult.success} archivo(s) adjuntado(s)`);
        }
        if (uploadResult.errors.length > 0) {
          uploadResult.errors.forEach(err => toast.error(err));
        }
      }

      return createdOc;
    },
    onSuccess: () => {
      toast.success("Solicitud de OC enviada exitosamente");
      queryClient.invalidateQueries({ queryKey: ["ocs"] });
      
      setForm({
        budgetPeriodFromId: "",
        budgetPeriodToId: "",
        managementId: "",
        supportId: "",
        descripcion: "",
        proveedorId: null,
        proveedorNombre: "",
        proveedorRuc: "",
        moneda: "PEN",
        importeSinIgv: "",
        costCenterIds: [],
        recursoTercId: null
      });
      setPendingFiles([]);
      setEsRecursoTercerizado(false);
      setFieldErrors({});
      setCurrentStep(1);
      
      setTimeout(() => {
        navigate("/purchase-orders/listado");
      }, 500);
    },
    onError: (error: any) => {
      if (error.message === "VALIDATION_ERROR") {
        toast.error("Revisa los campos resaltados");
        return;
      }

      if (error.response?.status === 422 && error.response?.data?.issues) {
        const backendErrors: Record<string, string> = {};
        error.response.data.issues.forEach((issue: any) => {
          const field = issue.path.join(".");
          backendErrors[field] = issue.message;
        });
        setFieldErrors(backendErrors);
        toast.error("Revisa los campos resaltados");
      } else {
        const errorMsg = error.response?.data?.error || "Error al enviar solicitud";
        toast.error(errorMsg);
      }
    }
  });

  const wordCount = countWords(form.descripcion);
  const isDescriptionValid = wordCount <= 20;

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!form.budgetPeriodFromId) errors.budgetPeriodFromId = "Periodo desde es requerido";
        if (!form.budgetPeriodToId) errors.budgetPeriodToId = "Periodo hasta es requerido";
        
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
        break;

      case 2:
        if (!form.supportId) errors.supportId = "Sustento es requerido";
        if (!form.costCenterIds || form.costCenterIds.length === 0) {
          errors.costCenterIds = "Debe seleccionar al menos un CECO";
        }
        break;

      case 3:
        if (!form.descripcion.trim()) {
          errors.descripcion = "Descripción es requerida";
        } else if (countWords(form.descripcion) > 20) {
          errors.descripcion = "La descripción no puede exceder 20 palabras";
        }
        break;

      case 4:
        if (!form.proveedorId) errors.proveedor = "Proveedor es requerido";
        const importe = parseFloat(form.importeSinIgv);
        if (!form.importeSinIgv) {
          errors.importeSinIgv = "Monto estimado es requerido";
        } else if (isNaN(importe) || importe <= 0) {
          errors.importeSinIgv = "El monto debe ser mayor a 0";
        }
        break;

      case 5:
        break;

      case 6:
        return validateForm();
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
      setFieldErrors({});
    } else {
      toast.error("Completa los campos requeridos antes de continuar");
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setFieldErrors({});
  };

  const handleStepClick = (stepId: number) => {
    for (let i = currentStep; i < stepId; i++) {
      if (!validateStep(i)) {
        toast.error(`Completa el paso ${i} antes de continuar`);
        return;
      }
    }
    setCurrentStep(stepId);
    setFieldErrors({});
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="bg-brand-50 border border-brand-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-brand-700">
          <strong>Instrucción:</strong> Selecciona el rango de períodos presupuestales que cubrirá esta orden de compra.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-brand-text-primary mb-1">
            Periodo PPTO Desde *
          </label>
          <YearMonthPicker
            value={form.budgetPeriodFromId ? Number(form.budgetPeriodFromId) : null}
            onChange={(period) => {
              const newFromId = period ? String(period.id) : "";
              setForm(f => ({ 
                ...f, 
                budgetPeriodFromId: newFromId,
                budgetPeriodToId: newFromId && !f.budgetPeriodToId ? newFromId : f.budgetPeriodToId
              }));
            }}
            periods={periods || []}
            placeholder="Seleccionar período desde..."
            error={fieldErrors.budgetPeriodFromId}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-text-primary mb-1">
            Periodo PPTO Hasta *
          </label>
          <YearMonthPicker
            value={form.budgetPeriodToId ? Number(form.budgetPeriodToId) : null}
            onChange={(period) => setForm(f => ({ ...f, budgetPeriodToId: period ? String(period.id) : "" }))}
            periods={periods || []}
            minId={form.budgetPeriodFromId ? Number(form.budgetPeriodFromId) : undefined}
            placeholder="Seleccionar período hasta..."
            error={fieldErrors.budgetPeriodToId}
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="bg-brand-50 dark:bg-slate-800 border border-brand-200 dark:border-slate-600 rounded-lg p-4 mb-4">
        <p className="text-sm text-brand-700 dark:text-gray-200">
          <strong className="text-brand-800 dark:text-gray-100">Instrucción:</strong> Selecciona la línea de presupuesto/sustento y los centros de costo asociados.
        </p>
      </div>

      <div>
        <FilterSelectWithError
          label="Gerencia (opcional - para filtrar sustentos)"
          placeholder="Seleccionar gerencia..."
          value={form.managementId}
          onChange={(value: string) => {
            setForm(f => ({ 
              ...f, 
              managementId: value,
              supportId: "",
              costCenterIds: []
            }));
          }}
          options={managements?.map((m: any) => ({
            value: String(m.id),
            label: m.name,
            searchText: m.name
          })) || []}
          error={fieldErrors.managementId}
          className="dark:bg-slate-800 dark:border-slate-600 dark:text-gray-100"
        />
        {form.managementId && (
          <p className="text-xs text-brand-text-disabled dark:text-gray-400 mt-1">
            Mostrando solo sustentos de la gerencia seleccionada
          </p>
        )}
      </div>

      <div>
        <FilterSelectWithError
          label="Línea de Presupuesto / Sustento *"
          placeholder="Seleccionar línea de presupuesto"
          value={form.supportId}
          onChange={(value: string) => {
            setForm(f => ({ ...f, supportId: value, costCenterIds: [] }));
            
            if (value && supports) {
              const selectedSupport = supports.find((s: any) => s.id === Number(value));
              if (selectedSupport?.managementId && !form.managementId) {
                setForm(f => ({ ...f, managementId: String(selectedSupport.managementId) }));
              }
            }
          }}
          options={filteredSupports?.map((s: any) => ({
            value: String(s.id),
            label: s.name,
            searchText: s.name
          })) || []}
          error={fieldErrors.supportId}
          className="dark:bg-slate-800 dark:border-slate-600 dark:text-gray-100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text-primary mb-1">
          Centros de Costo (CECO) *
        </label>
        {!form.supportId ? (
          <div className="text-sm text-brand-text-disabled dark:text-gray-300 italic py-2 px-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-transparent dark:border-slate-700">
            Selecciona primero una línea de presupuesto
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
                  label: cc.code,
                  searchText: cc.code
                })) || []}
              className={fieldErrors.costCenterIds ? "border-red-500" : ""}
            />
            {form.costCenterIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.costCenterIds.map(cecoId => {
                  const ceco = costCenters?.find((cc: any) => cc.id === cecoId);
                  if (!ceco) return null;
                  return (
                    <span
                      key={cecoId}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-brand-200 text-brand-800 dark:bg-slate-700/80 dark:text-gray-200 dark:border dark:border-slate-600"
                    >
                      {ceco.code}
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, costCenterIds: f.costCenterIds.filter(id => id !== cecoId) }))}
                        className="ml-1 hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            <FieldError error={fieldErrors.costCenterIds} />
          </>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="bg-brand-50 border border-brand-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-brand-700">
          <strong>Instrucción:</strong> Describe brevemente el requerimiento en máximo 20 palabras.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text-primary mb-1">
          Descripción del Requerimiento * (máximo 20 palabras)
        </label>
        <InputWithError
          placeholder="Describe brevemente el requerimiento..."
          value={form.descripcion}
          onChange={(e: any) => setForm(f => ({ ...f, descripcion: e.target.value }))}
          error={fieldErrors.descripcion}
        />
        <p className={`text-xs mt-1 ${
          wordCount > 20 ? 'text-red-600 font-semibold' : 
          wordCount > 15 ? 'text-orange-600' : 
          'text-brand-text-disabled'
        }`}>
          {wordCount} / 20 palabras
        </p>
      </div>

      {/* Checkbox: Asociar con Recurso Tercerizado */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input 
            type="checkbox" 
            checked={esRecursoTercerizado}
            onChange={(e) => {
              setEsRecursoTercerizado(e.target.checked);
              if (!e.target.checked) {
                setForm(f => ({ ...f, recursoTercId: null }));
              }
            }}
            className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
          />
          Esta OC es para un recurso tercerizado
        </label>
        <p className="text-xs text-brand-text-secondary mt-1">
          Si esta OC corresponde a un contrato de personal tercerizado registrado anteriormente, selecciona el recurso de la lista. Si no lo encuentras, desmarca esta casilla.
        </p>
      </div>

      {/* Selector de Recurso Tercerizado (solo si checkbox está marcado) */}
      {esRecursoTercerizado && (
        <div>
          <label className="block text-sm font-medium text-brand-text-primary mb-1">
            Recurso Tercerizado *
          </label>
          <FilterSelectWithError
            placeholder="Seleccionar recurso..."
            value={form.recursoTercId?.toString() || ""}
            onChange={(value: string) => setForm(f => ({ ...f, recursoTercId: value ? Number(value) : null }))}
            options={
              recursosTercerizados
                ?.map((r: any) => ({
                  value: r.id.toString(),
                  label: `${r.nombreCompleto} - ${r.cargo} (${r.proveedor.razonSocial})`,
                  searchText: `${r.nombreCompleto} ${r.cargo} ${r.proveedor.razonSocial} ${r.management?.name || ''}`
                })) || []
            }
            error={fieldErrors.recursoTercId}
          />
          {form.recursoTercId && recursosTercerizados && (
            <p className="text-xs text-green-600 mt-1">
              ✓ Esta OC se asociará automáticamente al recurso seleccionado
            </p>
          )}
          {esRecursoTercerizado && (!recursosTercerizados || recursosTercerizados.length === 0) && (
            <p className="text-xs text-orange-600 mt-1">
              No hay recursos tercerizados activos disponibles
            </p>
          )}
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="bg-brand-50 border border-brand-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-brand-700">
          <strong>Instrucción:</strong> Selecciona el proveedor y el monto de la orden de compra. 
          Puedes buscar proveedores existentes o crear uno nuevo.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <ProveedorSelector
            label="Proveedor (estimado) *"
            placeholder="Buscar o crear proveedor..."
            value={form.proveedorId}
            onChange={(proveedorId, proveedor) => {
              setForm(f => ({
                ...f,
                proveedorId,
                proveedorNombre: proveedor?.razonSocial || "",
                proveedorRuc: proveedor?.ruc || ""
              }));
              if (proveedorId) {
                setFieldErrors(e => ({ ...e, proveedor: "" }));
              }
            }}
            error={fieldErrors.proveedor}
            allowCreate={true}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <FilterSelectWithError
            label="Moneda *"
            placeholder="Seleccionar moneda"
            value={form.moneda}
            onChange={(value: string) => setForm(f => ({ ...f, moneda: value as "PEN" | "USD" }))}
            options={[
              { value: "PEN", label: "PEN - Soles" },
              { value: "USD", label: "USD - Dólares" }
            ]}
            searchable={false}
            error={fieldErrors.moneda}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-text-primary mb-1">
            Monto Estimado (sin IGV) *
          </label>
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
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-4">
      <div className="bg-brand-50 border border-brand-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-brand-700">
          <strong>Instrucción:</strong> Adjunta las cotizaciones en formato PDF (opcional).
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text-primary mb-1">
          Cotizaciones (PDF)
        </label>
        <OcFileUploader
          ocId={null}
          onFilesChange={setPendingFiles}
          disabled={submitMutation.isPending}
        />
        {hasPendingFiles && (
          <p className="text-xs text-green-600 mt-2">
            ✓ Archivos listos para subir después de crear la OC
          </p>
        )}
      </div>
    </div>
  );

  const renderStep6 = () => {
    const selectedPeriodFrom = periods?.find((p: any) => p.id === Number(form.budgetPeriodFromId));
    const selectedPeriodTo = periods?.find((p: any) => p.id === Number(form.budgetPeriodToId));
    const selectedSupport = supports?.find((s: any) => s.id === Number(form.supportId));
    const selectedManagement = managements?.find((m: any) => m.id === Number(form.managementId));

    return (
      <div className="space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-green-800 mb-1">Revisión Final</p>
              <p className="text-sm text-green-700">
                Verifica que toda la información sea correcta antes de enviar la solicitud.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-brand-100 border border-brand-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="text-brand-700 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-brand-800 mb-1">Información del Solicitante</p>
              <p className="text-brand-700">Nombre: <span className="font-semibold">{user?.name || user?.email}</span></p>
              <p className="text-brand-700">Correo: <span className="font-semibold">{user?.email}</span></p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border-brand-200">
            <CardHeader className="pb-3">
              <h4 className="text-sm font-semibold text-brand-text-primary flex items-center gap-2">
                <Calendar size={16} className="text-brand-primary" />
                Período Presupuestal
              </h4>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="text-brand-text-secondary">Desde: <span className="font-medium text-brand-text-primary">
                {selectedPeriodFrom ? `${selectedPeriodFrom.year}-${String(selectedPeriodFrom.month).padStart(2, '0')}` : '-'}
              </span></p>
              <p className="text-brand-text-secondary">Hasta: <span className="font-medium text-brand-text-primary">
                {selectedPeriodTo ? `${selectedPeriodTo.year}-${String(selectedPeriodTo.month).padStart(2, '0')}` : '-'}
              </span></p>
            </CardContent>
          </Card>

          <Card className="border-brand-200">
            <CardHeader className="pb-3">
              <h4 className="text-sm font-semibold text-brand-text-primary flex items-center gap-2">
                <Package size={16} className="text-brand-primary" />
                Sustento y CECOs
              </h4>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {selectedManagement && (
                <p className="text-brand-text-secondary">Gerencia: <span className="font-medium text-brand-text-primary">
                  {selectedManagement.name}
                </span></p>
              )}
              <p className="text-brand-text-secondary">Sustento: <span className="font-medium text-brand-text-primary">
                {selectedSupport ? `${selectedSupport.code || ''} - ${selectedSupport.name}` : '-'}
              </span></p>
              <div>
                <p className="text-brand-text-secondary mb-1">CECOs:</p>
                <div className="flex flex-wrap gap-1">
                  {form.costCenterIds.map(cecoId => {
                    const ceco = costCenters?.find((cc: any) => cc.id === cecoId);
                    return ceco ? (
                      <span key={cecoId} className="inline-block px-2 py-0.5 text-xs rounded bg-brand-200 text-brand-800">
                        {ceco.code}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-brand-200">
          <CardHeader className="pb-3">
            <h4 className="text-sm font-semibold text-brand-text-primary flex items-center gap-2">
              <FileSignature size={16} className="text-brand-primary" />
              Descripción
            </h4>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-brand-text-primary">{form.descripcion || '-'}</p>
            <p className="text-xs text-brand-text-disabled mt-1">{wordCount} palabras</p>
          </CardContent>
        </Card>

        <Card className="border-brand-200">
          <CardHeader className="pb-3">
            <h4 className="text-sm font-semibold text-brand-text-primary flex items-center gap-2">
              <DollarSign size={16} className="text-brand-primary" />
              Información del Proveedor y Monto
            </h4>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="text-brand-text-secondary">Proveedor: <span className="font-medium text-brand-text-primary">{form.proveedorNombre || "No seleccionado"}</span></p>
            <p className="text-brand-text-secondary">RUC: <span className="font-medium text-brand-text-primary">{form.proveedorRuc || "-"}</span></p>
            <p className="text-brand-text-secondary">Moneda: <span className="font-medium text-brand-text-primary">{form.moneda}</span></p>
            <p className="text-brand-text-secondary">Monto (sin IGV): <span className="font-semibold text-lg text-brand-primary">
              {form.moneda} {parseFloat(form.importeSinIgv || '0').toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span></p>
          </CardContent>
        </Card>

        {hasPendingFiles && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <h4 className="text-sm font-semibold text-green-800 flex items-center gap-2">
                <Paperclip size={16} className="text-green-600" />
                Documentos Adjuntos
              </h4>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="text-green-700">✓ Archivos listos para subir</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderStepContent = () => {
    const currentStepInfo = STEPS.find(s => s.id === currentStep);
    
    return (
      <div className="min-h-[400px]">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-brand-text-primary flex items-center gap-2">
            {currentStepInfo && <currentStepInfo.icon className="text-brand-primary" size={24} />}
            Paso {currentStep}: {currentStepInfo?.title}
          </h3>
          <p className="text-sm text-brand-text-secondary mt-1">{currentStepInfo?.description}</p>
        </div>

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
        {currentStep === 6 && renderStep6()}
      </div>
    );
  };

  const renderStepIndicator = () => (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const Icon = step.icon;
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <button
                  onClick={() => handleStepClick(step.id)}
                  disabled={currentStep < step.id}
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center transition-all
                    ${isActive ? 'bg-brand-primary text-white scale-110 shadow-lg' : ''}
                    ${isCompleted ? 'bg-green-500 text-white cursor-pointer hover:scale-105' : ''}
                    ${!isActive && !isCompleted ? 'bg-gray-200 text-gray-400' : ''}
                    ${currentStep < step.id ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <Icon size={20} />
                  )}
                </button>
                <p className={`text-xs mt-2 text-center max-w-[110px] whitespace-nowrap ${
                  isActive ? 'text-brand-primary font-semibold' : 'text-gray-500'
                }`}>
                  {step.title}
                </p>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-text-primary">Solicitud de Orden de Compra</h1>
          <p className="text-sm text-brand-text-secondary mt-1">
            Completa el formulario paso a paso para solicitar una nueva orden de compra
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="text-brand-primary" size={24} />
            <h2 className="text-lg font-medium text-brand-text-primary">Nueva Solicitud de OC</h2>
          </div>
        </CardHeader>
        <CardContent>
          {renderStepIndicator()}
          
          <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-6">
            {renderStepContent()}

            <div className="flex justify-between pt-6 border-t border-brand-border">
              <div>
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handlePrevious}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft size={16} />
                    Anterior
                  </Button>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    if (confirm("¿Estás seguro de que deseas limpiar el formulario?")) {
                      setForm({
                        budgetPeriodFromId: "",
                        budgetPeriodToId: "",
                        managementId: "",
                        supportId: "",
                        descripcion: "",
                        proveedorId: null,
                        proveedorNombre: "",
                        proveedorRuc: "",
                        moneda: "PEN",
                        importeSinIgv: "",
                        costCenterIds: [],
                        recursoTercId: null
                      });
                      setPendingFiles([]);
                      setFieldErrors({});
                      setCurrentStep(1);
                      setEsRecursoTercerizado(false);
                    }
                  }}
                >
                  Limpiar
                </Button>
                
                {currentStep < STEPS.length ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2"
                  >
                    Siguiente
                    <ChevronRight size={16} />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => {
                      if (validateForm()) {
                        submitMutation.mutate();
                      } else {
                        toast.error("Revisa los campos resaltados");
                      }
                    }}
                    disabled={submitMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Send size={16} />
                    {submitMutation.isPending ? "Enviando..." : "Enviar Solicitud"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-brand-50 border-brand-200">
        <CardContent className="py-4">
          <h3 className="text-sm font-semibold text-brand-text-primary mb-2">Nota Importante</h3>
          <p className="text-sm text-brand-text-secondary">
            Tu solicitud será registrada con estado <span className="font-semibold">PENDIENTE</span> y 
            aparecerá inmediatamente en el Listado de Órdenes de Compra. 
            El equipo de Gobierno la revisará y procesará según el flujo establecido.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

