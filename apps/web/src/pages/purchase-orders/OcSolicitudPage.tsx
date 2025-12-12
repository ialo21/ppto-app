import React, { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import FilterSelect from "../../components/ui/FilterSelect";
import YearMonthPicker from "../../components/YearMonthPicker";
import Button from "../../components/ui/Button";
import { FileText, Send, AlertCircle } from "lucide-react";

/**
 * SUBMÓDULO: Solicitud de Orden de Compra
 * 
 * Formulario simplificado para que usuarios soliciten OCs.
 * Las solicitudes se crean con estado PENDIENTE y aparecen automáticamente
 * en las vistas de Listado y Gestión.
 * 
 * CARACTERÍSTICAS:
 * - Auto-relleno de solicitante desde usuario logueado
 * - Selección dinámica de sustento, período y CECOs
 * - Validaciones frontend completas
 * - Descripción limitada a 20 palabras
 * - Link de cotización (sin archivos)
 * - Crea OC en estado PENDIENTE
 */

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

  const [form, setForm] = useState({
    budgetPeriodFromId: "",
    budgetPeriodToId: "",
    managementId: "",
    supportId: "",
    descripcion: "",
    proveedor: "",
    ruc: "",
    moneda: "PEN" as "PEN" | "USD",
    importeSinIgv: "",
    costCenterIds: [] as number[],
    linkCotizacion: ""
  });

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

    if (!form.proveedor.trim()) errors.proveedor = "Proveedor es requerido";
    
    if (!form.ruc.trim()) {
      errors.ruc = "RUC es requerido";
    } else if (!/^\d{11}$/.test(form.ruc)) {
      errors.ruc = "RUC debe tener exactamente 11 dígitos";
    }

    const importe = parseFloat(form.importeSinIgv);
    if (!form.importeSinIgv) {
      errors.importeSinIgv = "Monto estimado es requerido";
    } else if (isNaN(importe) || importe <= 0) {
      errors.importeSinIgv = "El monto debe ser mayor a 0";
    }

    if (!form.costCenterIds || form.costCenterIds.length === 0) {
      errors.costCenterIds = "Debe seleccionar al menos un CECO";
    }

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
        nombreSolicitante: user?.name || user?.email || "Usuario",
        correoSolicitante: user?.email || "",
        proveedor: form.proveedor.trim(),
        ruc: form.ruc.trim(),
        moneda: form.moneda,
        importeSinIgv: parseFloat(form.importeSinIgv),
        estado: "PENDIENTE",
        costCenterIds: form.costCenterIds,
        linkCotizacion: form.linkCotizacion.trim() || undefined
      };

      return (await api.post("/ocs", payload)).data;
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
        proveedor: "",
        ruc: "",
        moneda: "PEN",
        importeSinIgv: "",
        costCenterIds: [],
        linkCotizacion: ""
      });
      setFieldErrors({});
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-text-primary">Solicitud de Orden de Compra</h1>
          <p className="text-sm text-brand-text-secondary mt-1">
            Completa el formulario para solicitar una nueva orden de compra
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="text-brand-primary" size={24} />
            <h2 className="text-lg font-medium text-brand-text-primary">Información de la Solicitud</h2>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); submitMutation.mutate(); }} className="space-y-6">
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
              />
              {form.managementId && (
                <p className="text-xs text-brand-text-disabled mt-1">
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
                  label: `${s.code || ''} - ${s.name}`,
                  searchText: `${s.code || ''} ${s.name}`
                })) || []}
                error={fieldErrors.supportId}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-text-primary mb-1">
                Centros de Costo (CECO) *
              </label>
              {!form.supportId ? (
                <div className="text-sm text-brand-text-disabled italic py-2 px-3 bg-slate-50 rounded-lg">
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
                        label: `${cc.code} - ${cc.name || ''}`,
                        searchText: `${cc.code} ${cc.name || ''}`
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
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-brand-100 text-brand-800"
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

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-brand-text-primary mb-1">
                  Proveedor (estimado) *
                </label>
                <InputWithError
                  placeholder="Nombre del proveedor"
                  value={form.proveedor}
                  onChange={(e: any) => setForm(f => ({ ...f, proveedor: e.target.value }))}
                  error={fieldErrors.proveedor}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text-primary mb-1">
                  RUC *
                </label>
                <InputWithError
                  placeholder="20123456789"
                  maxLength={11}
                  value={form.ruc}
                  onChange={(e: any) => setForm(f => ({ ...f, ruc: e.target.value.replace(/\D/g, '') }))}
                  error={fieldErrors.ruc}
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

            <div>
              <label className="block text-sm font-medium text-brand-text-primary mb-1">
                Link a la Cotización
              </label>
              <InputWithError
                type="url"
                placeholder="https://..."
                value={form.linkCotizacion}
                onChange={(e: any) => setForm(f => ({ ...f, linkCotizacion: e.target.value }))}
                error={fieldErrors.linkCotizacion}
              />
              <p className="text-xs text-brand-text-disabled mt-1">
                Proporciona un enlace a Google Drive, Dropbox u otro servicio
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-brand-border">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setForm({
                    budgetPeriodFromId: "",
                    budgetPeriodToId: "",
                    managementId: "",
                    supportId: "",
                    descripcion: "",
                    proveedor: "",
                    ruc: "",
                    moneda: "PEN",
                    importeSinIgv: "",
                    costCenterIds: [],
                    linkCotizacion: ""
                  });
                  setFieldErrors({});
                }}
              >
                Limpiar Formulario
              </Button>
              <Button
                type="submit"
                disabled={submitMutation.isPending}
                className="flex items-center gap-2"
              >
                <Send size={16} />
                {submitMutation.isPending ? "Enviando..." : "Enviar Solicitud"}
              </Button>
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

