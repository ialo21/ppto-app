import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Button from "../components/ui/Button";
import { Table, Th, Td } from "../components/ui/Table";

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
  oc: OC | null;
  docType: string;
  numberNorm: string | null;
  currency: string;
  montoSinIgv: number | null;
  statusCurrent: string;
  ultimusIncident: string | null;
  detalle: string | null;
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

  const ocsQuery = useQuery<OC[]>({
    queryKey: ["ocs"],
    queryFn: async () => (await api.get("/oc")).data
  });

  // Estados
  const [filters, setFilters] = useState({ status: "", docType: "", numeroOc: "" });
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

  // Facturas filtradas
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter(inv => {
      if (filters.status && inv.statusCurrent !== filters.status) return false;
      if (filters.docType && inv.docType !== filters.docType) return false;
      if (filters.numeroOc && inv.oc?.numeroOc?.toLowerCase().includes(filters.numeroOc.toLowerCase()) === false) return false;
      return true;
    });
  }, [invoices, filters]);

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
        numberNorm: form.numberNorm,
        montoSinIgv: Number(form.montoSinIgv),
        ultimusIncident: form.ultimusIncident || undefined,
        detalle: form.detalle || undefined
      };

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
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      (await api.patch(`/invoices/${id}/status`, { status })).data,
    onSuccess: () => {
      toast.success("Estado actualizado");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: () => toast.error("Error al actualizar estado")
  });

  // Componentes de error
  const FieldError = ({ error }: { error?: string }) => {
    if (!error) return null;
    return <p className="text-xs text-red-600 mt-1">{error}</p>;
  };

  const InputWithError = ({ error, ...props }: any) => {
    const hasError = !!error;
    return (
      <div className="w-full">
        <Input {...props} className={hasError ? "border-red-500 focus:ring-red-500" : ""} />
        <FieldError error={error} />
      </div>
    );
  };

  const SelectWithError = ({ error, ...props }: any) => {
    const hasError = !!error;
    return (
      <div className="w-full">
        <Select {...props} className={hasError ? "border-red-500" : ""} />
        <FieldError error={error} />
      </div>
    );
  };

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
            <SelectWithError
              value={form.docType}
              onChange={(e: any) => setForm(f => ({ ...f, docType: e.target.value }))}
              error={fieldErrors.docType}
            >
              <option value="FACTURA">FACTURA</option>
              <option value="NOTA_CREDITO">NOTA DE CRÉDITO</option>
            </SelectWithError>

            {/* OC */}
            <div className="md:col-span-2">
              <SelectWithError
                value={form.ocId}
                onChange={(e: any) => setForm(f => ({ ...f, ocId: e.target.value }))}
                error={fieldErrors.ocId}
              >
                <option value="">Selecciona una OC</option>
                {(ocsQuery.data || []).map(oc => (
                  <option key={oc.id} value={oc.id}>
                    {oc.numeroOc || `OC-${oc.id}`} - {oc.proveedor} ({oc.moneda} {Number(oc.importeSinIgv).toFixed(2)})
                  </option>
                ))}
              </SelectWithError>
            </div>

            {/* Número de Factura */}
            <InputWithError
              placeholder="Número de Factura *"
              value={form.numberNorm}
              onChange={(e: any) => setForm(f => ({ ...f, numberNorm: e.target.value }))}
              error={fieldErrors.numberNorm}
            />

            {/* Monto sin IGV */}
            <InputWithError
              type="number"
              step="0.01"
              placeholder="Monto sin IGV *"
              value={form.montoSinIgv}
              onChange={(e: any) => setForm(f => ({ ...f, montoSinIgv: e.target.value }))}
              error={fieldErrors.montoSinIgv}
            />

            {/* Incidente Ultimus */}
            <InputWithError
              placeholder="Incidente Ultimus"
              value={form.ultimusIncident}
              onChange={(e: any) => setForm(f => ({ ...f, ultimusIncident: e.target.value }))}
              error={fieldErrors.ultimusIncident}
            />

            {/* Detalle */}
            <div className="md:col-span-3">
              <InputWithError
                placeholder="Detalle (opcional)"
                value={form.detalle}
                onChange={(e: any) => setForm(f => ({ ...f, detalle: e.target.value }))}
                error={fieldErrors.detalle}
              />
            </div>
          </div>

          {/* Información de OC (Read-only) */}
          {selectedOC && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-2">
              <h3 className="font-medium text-sm text-slate-700">Información de la OC</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>
                  <span className="text-slate-600">Proveedor:</span>
                  <p className="font-medium">{selectedOC.proveedor}</p>
                </div>
                <div>
                  <span className="text-slate-600">Moneda:</span>
                  <p className="font-medium">{selectedOC.moneda}</p>
                </div>
                {consumoOC && (
                  <>
                    <div>
                      <span className="text-slate-600">Importe Total:</span>
                      <p className="font-medium">{consumoOC.moneda} {consumoOC.importeTotal.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-slate-600">Consumido:</span>
                      <p className="font-medium">{consumoOC.moneda} {consumoOC.consumido.toFixed(2)}</p>
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
              onChange={e => setFilters(f => ({ ...f, docType: e.target.value }))}
            >
              <option value="">Todos los tipos</option>
              <option value="FACTURA">FACTURA</option>
              <option value="NOTA_CREDITO">NOTA DE CRÉDITO</option>
            </Select>

            <Select
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
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
              onChange={e => setFilters(f => ({ ...f, numeroOc: e.target.value }))}
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
                    <Th>Número</Th>
                    <Th>Tipo</Th>
                    <Th>OC</Th>
                    <Th>Proveedor</Th>
                    <Th>Moneda</Th>
                    <Th>Monto sin IGV</Th>
                    <Th>Estado</Th>
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
                      <Td>
                        <span className="text-xs">{inv.statusCurrent}</span>
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
                          {["EN_APROBACION", "EN_CONTABILIDAD", "PAGADO", "RECHAZADO"].map(s => (
                            <Button
                              key={s}
                              size="sm"
                              variant="secondary"
                              onClick={() => updateStatusMutation.mutate({ id: inv.id, status: s })}
                            >
                              {s.replace("EN_", "")}
                            </Button>
                          ))}
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
