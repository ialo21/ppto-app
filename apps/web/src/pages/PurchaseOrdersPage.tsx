import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Button from "../components/ui/Button";
import { Table, Th, Td } from "../components/ui/Table";
import { toast } from "sonner";

const ESTADOS_OC = [
  "PENDIENTE", "PROCESAR", "PROCESADO", "APROBACION_VP",
  "ANULAR", "ANULADO", "ATENDER_COMPRAS", "ATENDIDO"
];

export default function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const { data: ocs, refetch, isLoading } = useQuery({
    queryKey: ["ocs"],
    queryFn: async () => (await api.get("/ocs")).data
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
    proveedor: "",
    ruc: "",
    moneda: "PEN",
    importeSinIgv: "",
    estado: "PENDIENTE",
    numeroOc: "",
    comentario: "",
    articuloId: "",
    cecoId: "",
    linkCotizacion: ""
  });

  const [filters, setFilters] = useState({
    proveedor: "",
    numeroOc: "",
    moneda: "",
    estado: "",
    search: ""
  });

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
      proveedor: "",
      ruc: "",
      moneda: "PEN",
      importeSinIgv: "",
      estado: "PENDIENTE",
      numeroOc: "",
      comentario: "",
      articuloId: "",
      cecoId: "",
      linkCotizacion: ""
    });
    setEditingId(null);
    setShowForm(false);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        budgetPeriodFromId: Number(form.budgetPeriodFromId),
        budgetPeriodToId: Number(form.budgetPeriodToId),
        incidenteOc: form.incidenteOc || undefined,
        solicitudOc: form.solicitudOc || undefined,
        fechaRegistro: form.fechaRegistro,
        supportId: Number(form.supportId),
        periodoEnFechasText: form.periodoEnFechasText || undefined,
        descripcion: form.descripcion || undefined,
        nombreSolicitante: form.nombreSolicitante,
        correoSolicitante: form.correoSolicitante,
        proveedor: form.proveedor,
        ruc: form.ruc,
        moneda: form.moneda,
        importeSinIgv: Number(form.importeSinIgv),
        estado: form.estado,
        numeroOc: form.numeroOc || undefined,
        comentario: form.comentario || undefined,
        articuloId: form.articuloId ? Number(form.articuloId) : null,
        cecoId: form.cecoId ? Number(form.cecoId) : null,
        linkCotizacion: form.linkCotizacion || undefined
      };

      if (editingId) {
        return (await api.patch(`/ocs/${editingId}`, payload)).data;
      } else {
        return (await api.post("/ocs", payload)).data;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "OC actualizada" : "OC creada");
      refetch();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Error al guardar OC");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/ocs/${id}`)).data,
    onSuccess: () => {
      toast.success("OC eliminada");
      refetch();
    },
    onError: () => toast.error("No se pudo eliminar la OC")
  });

  const handleEdit = (oc: any) => {
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
      proveedor: oc.proveedor || "",
      ruc: oc.ruc || "",
      moneda: oc.moneda || "PEN",
      importeSinIgv: oc.importeSinIgv?.toString() || "",
      estado: oc.estado || "PENDIENTE",
      numeroOc: oc.numeroOc || "",
      comentario: oc.comentario || "",
      articuloId: oc.articuloId?.toString() || "",
      cecoId: oc.cecoId?.toString() || "",
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Órdenes de Compra</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancelar" : "Nueva OC"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium">{editingId ? "Editar OC" : "Nueva Orden de Compra"}</h2>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Periodo PPTO Desde *</label>
                <Select value={form.budgetPeriodFromId} onChange={e => setForm(f => ({ ...f, budgetPeriodFromId: e.target.value }))}>
                  <option value="">Seleccionar...</option>
                  {periods?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.year}-{String(p.month).padStart(2, "0")} {p.label || ""}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Periodo PPTO Hasta *</label>
                <Select value={form.budgetPeriodToId} onChange={e => setForm(f => ({ ...f, budgetPeriodToId: e.target.value }))}>
                  <option value="">Seleccionar...</option>
                  {periods?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.year}-{String(p.month).padStart(2, "0")} {p.label || ""}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fecha Registro *</label>
                <Input type="date" value={form.fechaRegistro} onChange={e => setForm(f => ({ ...f, fechaRegistro: e.target.value }))} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">INC de OC</label>
                <Input placeholder="INC-2026-001" value={form.incidenteOc} onChange={e => setForm(f => ({ ...f, incidenteOc: e.target.value }))} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Solicitud OC</label>
                <Input placeholder="SOL-2026-001" value={form.solicitudOc} onChange={e => setForm(f => ({ ...f, solicitudOc: e.target.value }))} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Número de OC</label>
                <Input placeholder="OC-2026-0001" value={form.numeroOc} onChange={e => setForm(f => ({ ...f, numeroOc: e.target.value }))} />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">Sustento *</label>
                <Select value={form.supportId} onChange={e => setForm(f => ({ ...f, supportId: e.target.value }))}>
                  <option value="">Seleccionar sustento...</option>
                  {supports?.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                  ))}
                </Select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">Periodo en Fechas (texto libre)</label>
                <Input placeholder="Enero - Febrero 2026" value={form.periodoEnFechasText} onChange={e => setForm(f => ({ ...f, periodoEnFechasText: e.target.value }))} />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <Input placeholder="Descripción del servicio o producto" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nombre Solicitante *</label>
                <Input placeholder="Juan Pérez" value={form.nombreSolicitante} onChange={e => setForm(f => ({ ...f, nombreSolicitante: e.target.value }))} />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Correo Solicitante *</label>
                <Input type="email" placeholder="juan.perez@empresa.com" value={form.correoSolicitante} onChange={e => setForm(f => ({ ...f, correoSolicitante: e.target.value }))} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Proveedor *</label>
                <Input placeholder="Nombre del proveedor" value={form.proveedor} onChange={e => setForm(f => ({ ...f, proveedor: e.target.value }))} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">RUC (11 dígitos) *</label>
                <Input placeholder="20123456789" maxLength={11} value={form.ruc} onChange={e => setForm(f => ({ ...f, ruc: e.target.value.replace(/\D/g, "") }))} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Moneda *</label>
                <Select value={form.moneda} onChange={e => setForm(f => ({ ...f, moneda: e.target.value }))}>
                  <option value="PEN">Soles (PEN)</option>
                  <option value="USD">Dólares (USD)</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Importe sin IGV *</label>
                <Input type="number" step="0.01" min="0" placeholder="0.00" value={form.importeSinIgv} onChange={e => setForm(f => ({ ...f, importeSinIgv: e.target.value }))} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Estado *</label>
                <Select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                  {ESTADOS_OC.map(estado => (
                    <option key={estado} value={estado}>{estado.replace(/_/g, " ")}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Artículo</label>
                <Select value={form.articuloId} onChange={e => setForm(f => ({ ...f, articuloId: e.target.value }))}>
                  <option value="">Sin artículo</option>
                  {articulos?.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Centro de Costo (CECO)</label>
                <Select value={form.cecoId} onChange={e => setForm(f => ({ ...f, cecoId: e.target.value }))}>
                  <option value="">Sin CECO</option>
                  {costCenters?.map((cc: any) => (
                    <option key={cc.id} value={cc.id}>{cc.code} - {cc.name}</option>
                  ))}
                </Select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">Link de Cotización (URL)</label>
                <Input type="url" placeholder="https://ejemplo.com/cotizacion" value={form.linkCotizacion} onChange={e => setForm(f => ({ ...f, linkCotizacion: e.target.value }))} />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">Comentario</label>
                <Input placeholder="Comentarios adicionales" value={form.comentario} onChange={e => setForm(f => ({ ...f, comentario: e.target.value }))} />
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
            <Select value={filters.moneda} onChange={e => setFilters(f => ({ ...f, moneda: e.target.value }))} className="w-auto">
              <option value="">(Moneda)</option>
              <option value="PEN">PEN</option>
              <option value="USD">USD</option>
            </Select>
            <Select value={filters.estado} onChange={e => setFilters(f => ({ ...f, estado: e.target.value }))} className="w-auto">
              <option value="">(Estado)</option>
              {ESTADOS_OC.map(estado => (
                <option key={estado} value={estado}>{estado.replace(/_/g, " ")}</option>
              ))}
            </Select>
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
                    <Th>ID</Th>
                    <Th>Número OC</Th>
                    <Th>Proveedor</Th>
                    <Th>Moneda</Th>
                    <Th>Importe sin IGV</Th>
                    <Th>Estado</Th>
                    <Th>Sustento</Th>
                    <Th>Periodo</Th>
                    <Th>Fecha</Th>
                    <Th>Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOcs.map((oc: any) => (
                    <tr key={oc.id}>
                      <Td>{oc.id}</Td>
                      <Td>{oc.numeroOc || "-"}</Td>
                      <Td>{oc.proveedor}</Td>
                      <Td>{oc.moneda}</Td>
                      <Td>{Number(oc.importeSinIgv).toFixed(2)}</Td>
                      <Td>
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
                          {oc.estado.replace(/_/g, " ")}
                        </span>
                      </Td>
                      <Td className="text-xs">{oc.support?.name || "-"}</Td>
                      <Td className="text-xs">
                        {oc.budgetPeriodFrom?.label || ""} - {oc.budgetPeriodTo?.label || ""}
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


