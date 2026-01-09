import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../../styles/react-datepicker-overrides.css";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { Table, Th, Td } from "../../components/ui/Table";
import { formatNumber } from "../../utils/numberFormat";
import { ArrowLeft, Calendar, DollarSign, FileText, ExternalLink, Package, Building2, Users } from "lucide-react";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📋 DETALLE COMPLETO DE RECURSO TERCERIZADO
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * SECCIONES:
 * 1. Información general del recurso
 * 2. Contrato vigente (fechas y monto actual)
 * 3. Histórico de contratos (fechas históricas inicio/fin)
 * 4. OCs asociadas (múltiples)
 * 5. Facturas relacionadas
 */

type RecursoDetalle = {
  id: number;
  nombreCompleto: string;
  cargo: string;
  management: { id: number; name: string };
  proveedor: { id: number; razonSocial: string; ruc: string };
  support: { id: number; code: string; name: string } | null;
  fechaInicio: string;
  fechaFin: string;
  montoMensual: number;
  linkContrato: string | null;
  status: "ACTIVO" | "CESADO";
  observaciones: string | null;
  createdAt: string;
  updatedAt: string;
  historico: Array<{
    id: number;
    fechaInicio: string;
    fechaFin: string;
    montoMensual: number;
    linkContrato: string | null;
    createdAt: string;
  }>;
  ocs: Array<{
    id: number;
    oc: {
      id: number;
      numeroOc: string | null;
      moneda: string;
      importeSinIgv: number;
      fechaRegistro: string;
      estado: string;
      support: { id: number; name: string };
    };
  }>;
  ocsRelacionadas?: Array<{
    id: number;
    numeroOc: string | null;
    moneda: string;
    importeSinIgv: number;
    fechaRegistro: string;
    estado: string;
    support: { id: number; name: string };
  }>;
  facturasRelacionadas?: Array<{
    id: number;
    numeroFactura: string;
    fechaEmision: string;
    montoTotal: number;
    statusCurrent: string;
    oc: { id: number; numeroOc: string | null } | null;
    support: { id: number; name: string };
  }>;
};

const getStatusColor = (status: string): string => {
  return status === "ACTIVO" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800";
};

const formatDate = (dateString: string) => {
  if (!dateString) return "";
  // Backend envía ISO timestamp: "2026-01-31T00:00:00.000Z"
  // Extraemos solo YYYY-MM-DD y parseamos local para evitar desfase de timezone
  const fechaSolo = dateString.split('T')[0]; // "2026-01-31"
  const [year, month, day] = fechaSolo.split('-').map(Number);
  const localDate = new Date(year, month - 1, day);
  return localDate.toLocaleDateString('es-PE', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
};

export default function RecursoTercerizadoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Query base: info principal del recurso (carga rápida)
  const { data: recurso, isLoading: isLoadingBase } = useQuery({
    queryKey: ["recurso-tercerizado-base", id],
    queryFn: async () => (await api.get(`/recursos-tercerizados/${id}`)).data,
    enabled: !!id,
    staleTime: 1000 * 60 * 5 // 5 minutos de cache
  });

  // Query histórico: se carga independiente
  const { data: historico, isLoading: isLoadingHistorico } = useQuery({
    queryKey: ["recurso-tercerizado-historico", id],
    queryFn: async () => {
      const response = await api.get(`/recursos-tercerizados/${id}`);
      return response.data.historico || [];
    },
    enabled: !!id && !!recurso,
    staleTime: 1000 * 60 * 5
  });

  // Query OCs: se carga independiente
  const { data: ocs, isLoading: isLoadingOCs } = useQuery({
    queryKey: ["recurso-tercerizado-ocs", id],
    queryFn: async () => {
      const response = await api.get(`/recursos-tercerizados/${id}`);
      return response.data.ocs || [];
    },
    enabled: !!id && !!recurso,
    staleTime: 1000 * 60 * 5
  });

  // Query facturas: se carga independiente
  const { data: facturas, isLoading: isLoadingFacturas } = useQuery({
    queryKey: ["recurso-tercerizado-facturas", id],
    queryFn: async () => {
      const response = await api.get(`/recursos-tercerizados/${id}`);
      return response.data.facturasRelacionadas || [];
    },
    enabled: !!id && !!recurso,
    staleTime: 1000 * 60 * 5
  });

  const [showAddHistorico, setShowAddHistorico] = useState(false);
  const [historicoForm, setHistoricoForm] = useState({
    fechaInicio: "",
    fechaFin: "",
    montoMensual: "",
    linkContrato: ""
  });

  const [showNuevoContrato, setShowNuevoContrato] = useState(false);
  const [nuevoContratoForm, setNuevoContratoForm] = useState({
    fechaInicio: "",
    fechaFin: "",
    montoMensual: "",
    linkContrato: ""
  });

  const [showAsociarOC, setShowAsociarOC] = useState(false);
  const [selectedOcId, setSelectedOcId] = useState<string>("");

  const { data: ocsDisponibles } = useQuery({
    queryKey: ["ocs"],
    queryFn: async () => (await api.get("/ocs")).data
  });

  const addHistoricoMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        fechaInicio: historicoForm.fechaInicio,
        fechaFin: historicoForm.fechaFin,
        montoMensual: parseFloat(historicoForm.montoMensual),
        linkContrato: historicoForm.linkContrato.trim() || undefined
      };
      return (await api.post(`/recursos-tercerizados/${id}/historico`, payload)).data;
    },
    onSuccess: () => {
      toast.success("Histórico agregado");
      queryClient.invalidateQueries({ queryKey: ["recurso-tercerizado-historico", id] });
      queryClient.invalidateQueries({ queryKey: ["recurso-tercerizado-base", id] });
      setShowAddHistorico(false);
      setHistoricoForm({ fechaInicio: "", fechaFin: "", montoMensual: "", linkContrato: "" });
    },
    onError: () => toast.error("Error al agregar histórico")
  });

  const nuevoContratoMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        fechaInicio: nuevoContratoForm.fechaInicio,
        fechaFin: nuevoContratoForm.fechaFin,
        montoMensual: parseFloat(nuevoContratoForm.montoMensual),
        linkContrato: nuevoContratoForm.linkContrato.trim() || undefined
      };
      return (await api.post(`/recursos-tercerizados/${id}/nuevo-contrato`, payload)).data;
    },
    onSuccess: () => {
      toast.success("Nuevo contrato creado, el anterior se movió al histórico");
      queryClient.invalidateQueries({ queryKey: ["recurso-tercerizado-base", id] });
      queryClient.invalidateQueries({ queryKey: ["recurso-tercerizado-historico", id] });
      queryClient.invalidateQueries({ queryKey: ["recursos-tercerizados"] });
      setShowNuevoContrato(false);
      setNuevoContratoForm({ fechaInicio: "", fechaFin: "", montoMensual: "", linkContrato: "" });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Error al crear nuevo contrato");
    }
  });

  const asociarOCMutation = useMutation({
    mutationFn: async (ocId: number) => {
      return (await api.post(`/recursos-tercerizados/${id}/ocs/${ocId}`)).data;
    },
    onSuccess: () => {
      toast.success("OC asociada correctamente");
      queryClient.invalidateQueries({ queryKey: ["recurso-tercerizado-ocs", id] });
      setShowAsociarOC(false);
      setSelectedOcId("");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Error al asociar OC");
    }
  });

  const desasociarOCMutation = useMutation({
    mutationFn: async (ocId: number) => {
      return (await api.delete(`/recursos-tercerizados/${id}/ocs/${ocId}`)).data;
    },
    onSuccess: () => {
      toast.success("OC desasociada correctamente");
      queryClient.invalidateQueries({ queryKey: ["recurso-tercerizado-ocs", id] });
    },
    onError: () => toast.error("Error al desasociar OC")
  });

  // Solo bloquear si no existe el ID
  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-brand-text-secondary mb-4">ID inválido</p>
        <Button onClick={() => navigate("/contratos/recursos-tercerizados")}>Volver al listado</Button>
      </div>
    );
  }

  // Si no hay recurso base aún pero está cargando, mostrar skeleton base
  if (isLoadingBase || !recurso) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate("/contratos/recursos-tercerizados")}>
            <ArrowLeft size={16} />
          </Button>
          <div className="flex-1">
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-40 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-16 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate("/contratos/recursos-tercerizados")}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-brand-text-primary">{recurso.nombreCompleto}</h1>
            <p className="text-sm text-brand-text-secondary">{recurso.cargo}</p>
          </div>
        </div>
        <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${getStatusColor(recurso.status)}`}>
          {recurso.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-background rounded-lg">
                <Building2 size={20} className="text-brand-primary" />
              </div>
              <div>
                <p className="text-xs text-brand-text-secondary">Gerencia TI</p>
                <p className="text-sm font-semibold text-brand-text-primary">{recurso.management.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-background rounded-lg">
                <Users size={20} className="text-brand-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-brand-text-secondary">Proveedor</p>
                <p className="text-sm font-semibold text-brand-text-primary truncate" title={recurso.proveedor.razonSocial}>{recurso.proveedor.razonSocial}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-background rounded-lg">
                <DollarSign size={20} className="text-brand-primary" />
              </div>
              <div>
                <p className="text-xs text-brand-text-secondary">Monto Mensual</p>
                <p className="text-sm font-semibold text-brand-text-primary">PEN {formatNumber(recurso.montoMensual)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-background rounded-lg">
                <Calendar size={20} className="text-brand-primary" />
              </div>
              <div>
                <p className="text-xs text-brand-text-secondary">Período Vigente</p>
                <p className="text-xs font-semibold text-brand-text-primary">
                  {formatDate(recurso.fechaInicio)} - {formatDate(recurso.fechaFin)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Contrato Vigente</h2>
            <div className="flex gap-2">
              {recurso.linkContrato && (
                <Button size="sm" variant="secondary" onClick={() => window.open(recurso.linkContrato!, '_blank')}>
                  <ExternalLink size={14} className="mr-2" />
                  Ver Contrato
                </Button>
              )}
              <Button size="sm" onClick={() => setShowNuevoContrato(!showNuevoContrato)}>
                {showNuevoContrato ? "Cancelar" : "Nuevo Contrato"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showNuevoContrato && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-semibold mb-2 text-blue-900">Nuevo Contrato</h3>
              <p className="text-xs text-blue-700 mb-3">El contrato actual se moverá automáticamente al histórico</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Fecha Inicio</label>
                  <div className="border border-brand-border rounded-lg px-2 py-1 bg-white focus-within:ring-2 focus-within:ring-brand-primary">
                    <ReactDatePicker
                      selected={nuevoContratoForm.fechaInicio ? new Date(nuevoContratoForm.fechaInicio + 'T00:00:00') : null}
                      onChange={(date: Date | null) => {
                        if (date) {
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          setNuevoContratoForm(f => ({ ...f, fechaInicio: `${year}-${month}-${day}` }));
                        } else {
                          setNuevoContratoForm(f => ({ ...f, fechaInicio: "" }));
                        }
                      }}
                      dateFormat="dd/MM/yyyy"
                      placeholderText="dd/mm/aaaa"
                      className="w-full px-2 py-1 focus:outline-none text-sm"
                      popperPlacement="bottom-start"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Fecha Fin</label>
                  <div className="border border-brand-border rounded-lg px-2 py-1 bg-white focus-within:ring-2 focus-within:ring-brand-primary">
                    <ReactDatePicker
                      selected={nuevoContratoForm.fechaFin ? new Date(nuevoContratoForm.fechaFin + 'T00:00:00') : null}
                      onChange={(date: Date | null) => {
                        if (date) {
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          setNuevoContratoForm(f => ({ ...f, fechaFin: `${year}-${month}-${day}` }));
                        } else {
                          setNuevoContratoForm(f => ({ ...f, fechaFin: "" }));
                        }
                      }}
                      dateFormat="dd/MM/yyyy"
                      placeholderText="dd/mm/aaaa"
                      className="w-full px-2 py-1 focus:outline-none text-sm"
                      popperPlacement="bottom-start"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Monto Mensual</label>
                  <input type="number" step="0.01" min="0" className="w-full px-3 py-2 text-sm rounded-lg border border-brand-border" value={nuevoContratoForm.montoMensual} onChange={e => setNuevoContratoForm(f => ({ ...f, montoMensual: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Link Contrato</label>
                  <input type="text" className="w-full px-3 py-2 text-sm rounded-lg border border-brand-border" placeholder="https://..." value={nuevoContratoForm.linkContrato} onChange={e => setNuevoContratoForm(f => ({ ...f, linkContrato: e.target.value }))} />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button size="sm" onClick={() => nuevoContratoMutation.mutate()} disabled={nuevoContratoMutation.isPending || !nuevoContratoForm.fechaInicio || !nuevoContratoForm.fechaFin || !nuevoContratoForm.montoMensual}>
                  {nuevoContratoMutation.isPending ? "Creando..." : "Crear Nuevo Contrato"}
                </Button>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-brand-text-secondary mb-1">Fecha de Inicio</p>
              <p className="text-base font-semibold text-brand-text-primary">{formatDate(recurso.fechaInicio)}</p>
            </div>
            <div>
              <p className="text-sm text-brand-text-secondary mb-1">Fecha de Fin / Cese</p>
              <p className="text-base font-semibold text-brand-text-primary">{formatDate(recurso.fechaFin)}</p>
            </div>
            <div>
              <p className="text-sm text-brand-text-secondary mb-1">Monto Mensual</p>
              <p className="text-base font-semibold text-brand-primary">PEN {formatNumber(recurso.montoMensual)}</p>
            </div>
          </div>
          {recurso.support && (
            <div className="mt-4 p-3 bg-brand-background rounded-lg">
              <p className="text-xs text-brand-text-secondary mb-1">Sustento Presupuestario</p>
              <p className="text-sm font-medium text-brand-text-primary">
                {recurso.support.code} - {recurso.support.name}
              </p>
            </div>
          )}
          {recurso.observaciones && (
            <div className="mt-4">
              <p className="text-sm text-brand-text-secondary mb-1">Observaciones</p>
              <p className="text-sm text-brand-text-primary">{recurso.observaciones}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Histórico de Contratos</h2>
            <Button size="sm" variant="secondary" onClick={() => setShowAddHistorico(!showAddHistorico)}>
              {showAddHistorico ? "Cancelar" : "Agregar Histórico"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddHistorico && (
            <div className="mb-4 p-4 bg-brand-background rounded-lg">
              <h3 className="text-sm font-semibold mb-3">Nuevo Período Histórico</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Fecha Inicio</label>
                  <div className="border border-brand-border rounded-lg px-2 py-1 bg-white focus-within:ring-2 focus-within:ring-brand-primary">
                    <ReactDatePicker
                      selected={historicoForm.fechaInicio ? new Date(historicoForm.fechaInicio + 'T00:00:00') : null}
                      onChange={(date: Date | null) => {
                        if (date) {
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          setHistoricoForm(f => ({ ...f, fechaInicio: `${year}-${month}-${day}` }));
                        } else {
                          setHistoricoForm(f => ({ ...f, fechaInicio: "" }));
                        }
                      }}
                      dateFormat="dd/MM/yyyy"
                      placeholderText="dd/mm/aaaa"
                      className="w-full px-2 py-1 focus:outline-none text-sm"
                      popperPlacement="bottom-start"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Fecha Fin</label>
                  <div className="border border-brand-border rounded-lg px-2 py-1 bg-white focus-within:ring-2 focus-within:ring-brand-primary">
                    <ReactDatePicker
                      selected={historicoForm.fechaFin ? new Date(historicoForm.fechaFin + 'T00:00:00') : null}
                      onChange={(date: Date | null) => {
                        if (date) {
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          setHistoricoForm(f => ({ ...f, fechaFin: `${year}-${month}-${day}` }));
                        } else {
                          setHistoricoForm(f => ({ ...f, fechaFin: "" }));
                        }
                      }}
                      dateFormat="dd/MM/yyyy"
                      placeholderText="dd/mm/aaaa"
                      className="w-full px-2 py-1 focus:outline-none text-sm"
                      popperPlacement="bottom-start"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Monto Mensual</label>
                  <input type="number" step="0.01" min="0" className="w-full px-3 py-2 text-sm rounded-lg border border-brand-border" value={historicoForm.montoMensual} onChange={e => setHistoricoForm(f => ({ ...f, montoMensual: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Link Contrato</label>
                  <input type="text" className="w-full px-3 py-2 text-sm rounded-lg border border-brand-border" value={historicoForm.linkContrato} onChange={e => setHistoricoForm(f => ({ ...f, linkContrato: e.target.value }))} />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button size="sm" onClick={() => addHistoricoMutation.mutate()} disabled={addHistoricoMutation.isPending || !historicoForm.fechaInicio || !historicoForm.fechaFin || !historicoForm.montoMensual}>
                  {addHistoricoMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>
          )}

          {isLoadingHistorico ? (
            <div className="py-8">
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ) : !historico || historico.length === 0 ? (
            <p className="text-sm text-brand-text-secondary text-center py-8">No hay histórico de contratos registrado</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <Th>Período</Th>
                    <Th>Fecha Inicio</Th>
                    <Th>Fecha Fin / Cese</Th>
                    <Th>Monto Mensual</Th>
                    <Th>Contrato</Th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((h: any, idx: number) => (
                    <tr key={h.id}>
                      <Td>Período {historico.length - idx}</Td>
                      <Td>{formatDate(h.fechaInicio)}</Td>
                      <Td>{formatDate(h.fechaFin)}</Td>
                      <Td>PEN {formatNumber(h.montoMensual)}</Td>
                      <Td>
                        {h.linkContrato ? (
                          <Button size="sm" variant="secondary" onClick={() => window.open(h.linkContrato!, '_blank')}>
                            <ExternalLink size={12} className="mr-1" />
                            Ver
                          </Button>
                        ) : (
                          <span className="text-xs text-brand-text-disabled">Sin link</span>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Órdenes de Compra Asociadas</h2>
            <Button size="sm" onClick={() => setShowAsociarOC(!showAsociarOC)}>
              {showAsociarOC ? "Cancelar" : "Asociar OC"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAsociarOC && (
            <div className="mb-4 p-4 bg-brand-background rounded-lg">
              <h3 className="text-sm font-semibold mb-3">Asociar Nueva OC</h3>
              <div className="flex gap-3">
                <select 
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-brand-border"
                  value={selectedOcId}
                  onChange={e => setSelectedOcId(e.target.value)}
                >
                  <option value="">Seleccionar OC...</option>
                  {ocsDisponibles?.map((oc: any) => (
                    <option key={oc.id} value={oc.id}>
                      {oc.numeroOc || `OC #${oc.id}`} - {oc.moneda} {formatNumber(oc.importeSinIgv)}
                    </option>
                  ))}
                </select>
                <Button 
                  size="sm" 
                  onClick={() => asociarOCMutation.mutate(Number(selectedOcId))} 
                  disabled={!selectedOcId || asociarOCMutation.isPending}
                >
                  {asociarOCMutation.isPending ? "Asociando..." : "Asociar"}
                </Button>
              </div>
            </div>
          )}

          {isLoadingOCs ? (
            <div className="py-8">
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ) : !ocs || ocs.length === 0 ? (
            <p className="text-sm text-brand-text-secondary text-center py-8">No hay OCs asociadas</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <Th>Número OC</Th>
                    <Th>Fecha Registro</Th>
                    <Th>Sustento</Th>
                    <Th>Monto</Th>
                    <Th>Estado</Th>
                    <Th>Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {ocs.map((item: any) => (
                    <tr key={item.id}>
                      <Td>{item.oc.numeroOc || `OC #${item.oc.id}`}</Td>
                      <Td>{formatDate(item.oc.fechaRegistro)}</Td>
                      <Td>{item.oc.support.name}</Td>
                      <Td>{item.oc.moneda} {formatNumber(item.oc.importeSinIgv)}</Td>
                      <Td>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                          {item.oc.estado}
                        </span>
                      </Td>
                      <Td>
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          onClick={() => {
                            if (confirm('¿Desasociar esta OC del recurso?')) {
                              desasociarOCMutation.mutate(item.oc.id);
                            }
                          }}
                          disabled={desasociarOCMutation.isPending}
                        >
                          Desasociar
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium">Facturas Relacionadas</h2>
        </CardHeader>
        <CardContent>
          {isLoadingFacturas ? (
            <div className="py-8">
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ) : !facturas || facturas.length === 0 ? (
            <p className="text-sm text-brand-text-secondary text-center py-8">No hay facturas relacionadas</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <Th>Número Factura</Th>
                    <Th>Fecha Emisión</Th>
                    <Th>OC Asociada</Th>
                    <Th>Sustento</Th>
                    <Th>Monto Total</Th>
                    <Th>Estado</Th>
                  </tr>
                </thead>
                <tbody>
                  {facturas.map((f: any) => (
                    <tr key={f.id}>
                      <Td>{f.numeroFactura}</Td>
                      <Td>{formatDate(f.fechaEmision)}</Td>
                      <Td>{f.oc ? f.oc.numeroOc || `OC #${f.oc.id}` : "-"}</Td>
                      <Td>{f.support.name}</Td>
                      <Td>PEN {formatNumber(f.montoTotal)}</Td>
                      <Td>
                        <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                          {f.statusCurrent}
                        </span>
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
