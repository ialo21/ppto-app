import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import { Table, Th, Td } from "../components/ui/Table";

type ExpenseConcept = { id: number; name: string; packageId: number };
type ExpensePackage = { id: number; name: string; concepts: ExpenseConcept[] };
type CostCenter = { id: number; code: string; name: string };
type Articulo = { id: number; code: string; name: string };
type Support = {
  id: number;
  code: string | null;
  name: string;
  management: string | null;
  area: string | null;
  expenseType: string | null;
  costCenter: CostCenter | null;
  expensePackage: { id: number; name: string } | null;
  expenseConcept: { id: number; name: string; packageId: number } | null;
};

type ManagementOption = { management: string; areas: string[] };

const expenseTypes = [
  { label: "Sin tipo", value: "" },
  { label: "Administrativo", value: "ADMINISTRATIVO" },
  { label: "Producto", value: "PRODUCTO" },
  { label: "Distribuible", value: "DISTRIBUIBLE" }
];

type SectionKey = "packages" | "concepts" | "costCenters" | "articulos" | "supports";

const sections: Array<{ key: SectionKey; label: string; description: string }> = [
  { key: "packages", label: "Paquetes", description: "Agrupa conceptos de gasto de forma lógica." },
  { key: "concepts", label: "Conceptos", description: "Define los conceptos que se asignan dentro de cada paquete." },
  { key: "costCenters", label: "Centros de costo", description: "Gestiona los centros de costo disponibles para los sustentos." },
  { key: "articulos", label: "Artículos", description: "Gestiona el catálogo de artículos para las órdenes de compra." },
  { key: "supports", label: "Sustentos", description: "Administra el catálogo completo de sustentos." }
];

type ConceptOption = ExpenseConcept & { packageName?: string };

function useExpensePackages() {
  return useQuery({
    queryKey: ["expense-packages"],
    queryFn: async () => (await api.get("/expense-packages")).data as ExpensePackage[]
  });
}

function useCostCenters() {
  return useQuery({
    queryKey: ["cost-centers"],
    queryFn: async () => (await api.get("/cost-centers")).data as CostCenter[]
  });
}

function useSupports() {
  return useQuery({
    queryKey: ["supports"],
    queryFn: async () => (await api.get("/supports")).data as Support[]
  });
}

function useArticulos() {
  return useQuery({
    queryKey: ["articulos"],
    queryFn: async () => (await api.get("/articulos")).data as Articulo[]
  });
}

export default function CatalogsPage() {
  const queryClient = useQueryClient();

  const packagesQuery = useExpensePackages();
  const costCentersQuery = useCostCenters();
  const supportsQuery = useSupports();
  const articulosQuery = useArticulos();

  const [section, setSection] = useState<SectionKey>("packages");

  const [packageForm, setPackageForm] = useState({ id: "", name: "" });
  const [conceptForm, setConceptForm] = useState({ id: "", packageId: "", name: "" });
  const [costCenterForm, setCostCenterForm] = useState({ id: "", code: "", name: "" });
  const [articuloForm, setArticuloForm] = useState({ id: "", code: "", name: "" });
  const [supportForm, setSupportForm] = useState({
    id: "",
    name: "",
    code: "",
    management: "",
    area: "",
    costCenterId: "",
    packageId: "",
    conceptId: "",
    expenseType: ""
  });

  const conceptRows = useMemo(() => {
    const list: Array<ExpenseConcept & { packageName: string }> = [];
    (packagesQuery.data || []).forEach(pkg => {
      pkg.concepts.forEach(concept => {
        list.push({ ...concept, packageName: pkg.name });
      });
    });
    return list;
  }, [packagesQuery.data]);

  const availableConcepts = useMemo<ConceptOption[]>(() => {
    if (supportForm.packageId) {
      const pkg = (packagesQuery.data || []).find(p => p.id === Number(supportForm.packageId));
      return (pkg?.concepts || []).map(concept => ({ ...concept, packageName: pkg?.name }));
    }
    return conceptRows;
  }, [packagesQuery.data, conceptRows, supportForm.packageId]);

  const managementOptions = useMemo<ManagementOption[]>(() => {
    const map = new Map<string, Set<string>>();
    (supportsQuery.data || []).forEach(support => {
      if (!support.management) return;
      if (!map.has(support.management)) {
        map.set(support.management, new Set<string>());
      }
      if (support.area) {
        map.get(support.management)!.add(support.area);
      }
    });
    return Array.from(map.entries())
      .map(([management, areas]) => ({
        management,
        areas: Array.from(areas).sort((a, b) => a.localeCompare(b))
      }))
      .sort((a, b) => a.management.localeCompare(b.management));
  }, [supportsQuery.data]);

  const allAreas = useMemo<string[]>(() => {
    const set = new Set<string>();
    (supportsQuery.data || []).forEach(({ area }) => {
      if (area) set.add(area);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [supportsQuery.data]);

  const areaOptions = useMemo<string[]>(() => {
    if (supportForm.management) {
      const match = managementOptions.find(option => option.management === supportForm.management);
      if (match) return match.areas;
    }
    return allAreas;
  }, [supportForm.management, managementOptions, allAreas]);

  const savePackage = useMutation({
    mutationFn: async () => {
      const name = packageForm.name.trim();
      if (!name) throw new Error("El nombre es obligatorio");
      const payload: { id?: number; name: string } = { name };
      if (packageForm.id) payload.id = Number(packageForm.id);
      return (await api.post("/expense-packages", payload)).data;
    },
    onSuccess: () => {
      toast.success("Paquete guardado");
      setPackageForm({ id: "", name: "" });
      queryClient.invalidateQueries({ queryKey: ["expense-packages"] });
      queryClient.invalidateQueries({ queryKey: ["supports"] });
    },
    onError: () => toast.error("No se pudo guardar el paquete")
  });

  const deletePackage = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/expense-packages/${id}`)).data,
    onSuccess: () => {
      toast.success("Paquete eliminado");
      if (packageForm.id) setPackageForm({ id: "", name: "" });
      queryClient.invalidateQueries({ queryKey: ["expense-packages"] });
      queryClient.invalidateQueries({ queryKey: ["supports"] });
    },
    onError: () => toast.error("No se pudo eliminar el paquete")
  });

  const saveConcept = useMutation({
    mutationFn: async () => {
      const name = conceptForm.name.trim();
      if (!name || !conceptForm.packageId) throw new Error("Completa los campos requeridos");
      const payload: { id?: number; name: string; packageId: number } = {
        name,
        packageId: Number(conceptForm.packageId)
      };
      if (conceptForm.id) payload.id = Number(conceptForm.id);
      return (await api.post("/expense-concepts", payload)).data;
    },
    onSuccess: () => {
      toast.success("Concepto guardado");
      setConceptForm({ id: "", name: "", packageId: "" });
      queryClient.invalidateQueries({ queryKey: ["expense-packages"] });
      queryClient.invalidateQueries({ queryKey: ["supports"] });
    },
    onError: () => toast.error("No se pudo guardar el concepto")
  });

  const deleteConcept = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/expense-concepts/${id}`)).data,
    onSuccess: () => {
      toast.success("Concepto eliminado");
      if (conceptForm.id) setConceptForm({ id: "", name: "", packageId: "" });
      queryClient.invalidateQueries({ queryKey: ["expense-packages"] });
      queryClient.invalidateQueries({ queryKey: ["supports"] });
    },
    onError: () => toast.error("No se pudo eliminar el concepto")
  });

  const saveCostCenter = useMutation({
    mutationFn: async () => {
      const code = costCenterForm.code.trim();
      const name = costCenterForm.name.trim();
      if (!code || !name) throw new Error("Completa los campos requeridos");
      const payload: { id?: number; code: string; name: string } = { code, name };
      if (costCenterForm.id) payload.id = Number(costCenterForm.id);
      return (await api.post("/cost-centers", payload)).data;
    },
    onSuccess: () => {
      toast.success("Centro de costo guardado");
      setCostCenterForm({ id: "", code: "", name: "" });
      queryClient.invalidateQueries({ queryKey: ["cost-centers"] });
      queryClient.invalidateQueries({ queryKey: ["supports"] });
    },
    onError: () => toast.error("No se pudo guardar el centro de costo")
  });

  const deleteCostCenter = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/cost-centers/${id}`)).data,
    onSuccess: () => {
      toast.success("Centro de costo eliminado");
      if (costCenterForm.id) setCostCenterForm({ id: "", code: "", name: "" });
      queryClient.invalidateQueries({ queryKey: ["cost-centers"] });
      queryClient.invalidateQueries({ queryKey: ["supports"] });
    },
    onError: () => toast.error("No se pudo eliminar el centro de costo")
  });

  const saveArticulo = useMutation({
    mutationFn: async () => {
      const code = articuloForm.code.trim();
      const name = articuloForm.name.trim();
      if (!code || !name) throw new Error("Completa los campos requeridos");
      const payload: { id?: number; code: string; name: string } = { code, name };
      if (articuloForm.id) payload.id = Number(articuloForm.id);
      return (await api.post("/articulos", payload)).data;
    },
    onSuccess: () => {
      toast.success("Artículo guardado");
      setArticuloForm({ id: "", code: "", name: "" });
      queryClient.invalidateQueries({ queryKey: ["articulos"] });
    },
    onError: () => toast.error("No se pudo guardar el artículo")
  });

  const deleteArticulo = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/articulos/${id}`)).data,
    onSuccess: () => {
      toast.success("Artículo eliminado");
      if (articuloForm.id) setArticuloForm({ id: "", code: "", name: "" });
      queryClient.invalidateQueries({ queryKey: ["articulos"] });
    },
    onError: () => toast.error("No se pudo eliminar el artículo")
  });

  const saveSupport = useMutation({
    mutationFn: async () => {
      const name = supportForm.name.trim();
      if (!name) throw new Error("El nombre es obligatorio");
      const payload: any = {
        id: supportForm.id ? Number(supportForm.id) : undefined,
        name,
        code: supportForm.code.trim() || undefined,
        management: supportForm.management.trim() || undefined,
        area: supportForm.area.trim() || undefined,
        expenseType: supportForm.expenseType || undefined,
        active: true
      };
      if (supportForm.costCenterId) payload.costCenterId = Number(supportForm.costCenterId);
      if (supportForm.conceptId) {
        payload.expenseConceptId = Number(supportForm.conceptId);
      } else if (supportForm.packageId) {
        payload.expensePackageId = Number(supportForm.packageId);
      }
      return (await api.post("/supports", payload)).data;
    },
    onSuccess: () => {
      toast.success("Sustento guardado");
      setSupportForm({
        id: "",
        name: "",
        code: "",
        management: "",
        area: "",
        costCenterId: "",
        packageId: "",
        conceptId: "",
        expenseType: ""
      });
      queryClient.invalidateQueries({ queryKey: ["supports"] });
    },
    onError: () => toast.error("No se pudo guardar el sustento")
  });

  const deleteSupport = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/supports/${id}`)).data,
    onSuccess: () => {
      toast.success("Sustento eliminado");
      if (supportForm.id) {
        setSupportForm({
          id: "",
          name: "",
          code: "",
          management: "",
          area: "",
          costCenterId: "",
          packageId: "",
          conceptId: "",
          expenseType: ""
        });
      }
      queryClient.invalidateQueries({ queryKey: ["supports"] });
    },
    onError: () => toast.error("No se pudo eliminar el sustento")
  });

  const selectedSection = sections.find(s => s.key === section);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Catálogos maestros</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Administra los paquetes, conceptos, centros de costo y sustentos que utiliza la aplicación.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {sections.map(item => (
          <Button
            key={item.key}
            variant={section === item.key ? "primary" : "secondary"}
            size="sm"
            onClick={() => setSection(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      {selectedSection && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {selectedSection.description}
        </p>
      )}

      {section === "packages" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Paquetes de gasto</h2>
              {packageForm.id && (
                <Button variant="ghost" size="sm" onClick={() => setPackageForm({ id: "", name: "" })}>
                  Cancelar
                </Button>
              )}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Input
                placeholder="ID (para editar)"
                value={packageForm.id}
                onChange={e => setPackageForm(f => ({ ...f, id: e.target.value }))}
              />
              <Input
                placeholder="Nombre del paquete"
                value={packageForm.name}
                onChange={e => setPackageForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="mt-3">
              <Button onClick={() => savePackage.mutate()} disabled={savePackage.isPending || !packageForm.name.trim()}>
                {packageForm.id ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {packagesQuery.isLoading ? (
              "Cargando..."
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>ID</Th>
                    <Th>Nombre</Th>
                    <Th>Conceptos</Th>
                    <Th>Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {(packagesQuery.data || []).map(pkg => (
                    <tr key={pkg.id}>
                      <Td>{pkg.id}</Td>
                      <Td>{pkg.name}</Td>
                      <Td>{pkg.concepts.length}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPackageForm({ id: String(pkg.id), name: pkg.name })}
                          >
                            Editar
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deletePackage.mutate(pkg.id)}>
                            Eliminar
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {section === "concepts" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Conceptos de gasto</h2>
              {conceptForm.id && (
                <Button variant="ghost" size="sm" onClick={() => setConceptForm({ id: "", name: "", packageId: "" })}>
                  Cancelar
                </Button>
              )}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Input
                placeholder="ID (para editar)"
                value={conceptForm.id}
                onChange={e => setConceptForm(f => ({ ...f, id: e.target.value }))}
              />
              <Select
                value={conceptForm.packageId}
                onChange={e => setConceptForm(f => ({ ...f, packageId: e.target.value }))}
              >
                <option value="">Selecciona un paquete</option>
                {(packagesQuery.data || []).map(pkg => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name}
                  </option>
                ))}
              </Select>
              <Input
                placeholder="Nombre del concepto"
                value={conceptForm.name}
                onChange={e => setConceptForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="mt-3">
              <Button
                onClick={() => saveConcept.mutate()}
                disabled={saveConcept.isPending || !conceptForm.name.trim() || !conceptForm.packageId}
              >
                {conceptForm.id ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {packagesQuery.isLoading ? (
              "Cargando..."
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>ID</Th>
                    <Th>Concepto</Th>
                    <Th>Paquete</Th>
                    <Th>Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {conceptRows.map(concept => (
                    <tr key={concept.id}>
                      <Td>{concept.id}</Td>
                      <Td>{concept.name}</Td>
                      <Td>{concept.packageName}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setConceptForm({
                                id: String(concept.id),
                                name: concept.name,
                                packageId: String(concept.packageId)
                              })
                            }
                          >
                            Editar
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteConcept.mutate(concept.id)}>
                            Eliminar
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {section === "costCenters" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Centros de costo</h2>
              {costCenterForm.id && (
                <Button variant="ghost" size="sm" onClick={() => setCostCenterForm({ id: "", code: "", name: "" })}>
                  Cancelar
                </Button>
              )}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Input
                placeholder="ID (para editar)"
                value={costCenterForm.id}
                onChange={e => setCostCenterForm(f => ({ ...f, id: e.target.value }))}
              />
              <Input
                placeholder="Código"
                value={costCenterForm.code}
                onChange={e => setCostCenterForm(f => ({ ...f, code: e.target.value }))}
              />
              <Input
                placeholder="Nombre"
                value={costCenterForm.name}
                onChange={e => setCostCenterForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="mt-3">
              <Button
                onClick={() => saveCostCenter.mutate()}
                disabled={saveCostCenter.isPending || !costCenterForm.code.trim() || !costCenterForm.name.trim()}
              >
                {costCenterForm.id ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {costCentersQuery.isLoading ? (
              "Cargando..."
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>ID</Th>
                    <Th>Código</Th>
                    <Th>Nombre</Th>
                    <Th>Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {(costCentersQuery.data || []).map(cc => (
                    <tr key={cc.id}>
                      <Td>{cc.id}</Td>
                      <Td>{cc.code}</Td>
                      <Td>{cc.name}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCostCenterForm({ id: String(cc.id), code: cc.code, name: cc.name })}
                          >
                            Editar
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteCostCenter.mutate(cc.id)}>
                            Eliminar
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {section === "articulos" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Artículos</h2>
              {articuloForm.id && (
                <Button variant="ghost" size="sm" onClick={() => setArticuloForm({ id: "", code: "", name: "" })}>
                  Cancelar
                </Button>
              )}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Input
                placeholder="ID (para editar)"
                value={articuloForm.id}
                onChange={e => setArticuloForm(f => ({ ...f, id: e.target.value }))}
              />
              <Input
                placeholder="Código"
                value={articuloForm.code}
                onChange={e => setArticuloForm(f => ({ ...f, code: e.target.value }))}
              />
              <Input
                placeholder="Nombre"
                value={articuloForm.name}
                onChange={e => setArticuloForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="mt-3">
              <Button
                onClick={() => saveArticulo.mutate()}
                disabled={saveArticulo.isPending || !articuloForm.code.trim() || !articuloForm.name.trim()}
              >
                {articuloForm.id ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {articulosQuery.isLoading ? (
              "Cargando..."
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>ID</Th>
                    <Th>Código</Th>
                    <Th>Nombre</Th>
                    <Th>Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {(articulosQuery.data || []).map(art => (
                    <tr key={art.id}>
                      <Td>{art.id}</Td>
                      <Td>{art.code}</Td>
                      <Td>{art.name}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setArticuloForm({ id: String(art.id), code: art.code, name: art.name })}
                          >
                            Editar
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteArticulo.mutate(art.id)}>
                            Eliminar
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {section === "supports" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Sustentos</h2>
              {supportForm.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setSupportForm({
                      id: "",
                      name: "",
                      code: "",
                      management: "",
                      area: "",
                      costCenterId: "",
                      packageId: "",
                      conceptId: "",
                      expenseType: ""
                    })
                  }
                >
                  Cancelar
                </Button>
              )}
            </div>
            {supportForm.id && (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Editando sustento #{supportForm.id}
                {supportForm.code ? ` (${supportForm.code})` : ""}
              </p>
            )}
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Input
                placeholder="Nombre"
                value={supportForm.name}
                onChange={e => setSupportForm(f => ({ ...f, name: e.target.value }))}
              />
              <Select
                value={supportForm.management}
                onChange={e =>
                  setSupportForm(f => ({
                    ...f,
                    management: e.target.value,
                    area: ""
                  }))
                }
              >
                <option value="">Sin gerencia</option>
                {managementOptions.map(option => (
                  <option key={option.management} value={option.management}>
                    {option.management}
                  </option>
                ))}
              </Select>
              <Select
                value={supportForm.area}
                onChange={e => setSupportForm(f => ({ ...f, area: e.target.value }))}
              >
                <option value="">Sin área</option>
                {areaOptions.map(area => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </Select>
              <Select
                value={supportForm.costCenterId}
                onChange={e => setSupportForm(f => ({ ...f, costCenterId: e.target.value }))}
              >
                <option value="">Sin centro de costo</option>
                {(costCentersQuery.data || []).map(cc => (
                  <option key={cc.id} value={cc.id}>
                    {cc.code} — {cc.name}
                  </option>
                ))}
              </Select>
              <Select
                value={supportForm.packageId}
                onChange={e =>
                  setSupportForm(f => ({
                    ...f,
                    packageId: e.target.value,
                    conceptId: ""
                  }))
                }
              >
                <option value="">Sin paquete</option>
                {(packagesQuery.data || []).map(pkg => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name}
                  </option>
                ))}
              </Select>
              <Select
                value={supportForm.conceptId}
                onChange={e => {
                  const conceptId = e.target.value;
                  const concept = conceptRows.find(item => item.id === Number(conceptId));
                  setSupportForm(f => ({
                    ...f,
                    conceptId,
                    packageId: conceptId ? String(concept?.packageId ?? "") : f.packageId
                  }));
                }}
              >
                <option value="">Sin concepto</option>
                {availableConcepts.map(concept => (
                  <option key={concept.id} value={concept.id}>
                    {concept.name}
                    {concept.packageName ? ` — ${concept.packageName}` : ""}
                  </option>
                ))}
              </Select>
              <Select
                value={supportForm.expenseType}
                onChange={e => setSupportForm(f => ({ ...f, expenseType: e.target.value }))}
              >
                {expenseTypes.map(option => (
                  <option key={option.value || "none"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="mt-3">
              <Button onClick={() => saveSupport.mutate()} disabled={saveSupport.isPending || !supportForm.name.trim()}>
                {supportForm.id ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {supportsQuery.isLoading ? (
              "Cargando..."
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>ID</Th>
                    <Th>Nombre</Th>
                    <Th>Código</Th>
                    <Th>Gerencia</Th>
                    <Th>Área</Th>
                    <Th>Centro de costo</Th>
                    <Th>Paquete</Th>
                    <Th>Concepto</Th>
                    <Th>Tipo gasto</Th>
                    <Th>Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {(supportsQuery.data || []).map(support => (
                    <tr key={support.id}>
                      <Td>{support.id}</Td>
                      <Td>{support.name}</Td>
                      <Td>{support.code || ""}</Td>
                      <Td>{support.management || ""}</Td>
                      <Td>{support.area || ""}</Td>
                      <Td>
                        {support.costCenter ? `${support.costCenter.code} — ${support.costCenter.name}` : ""}
                      </Td>
                      <Td>{support.expensePackage?.name || ""}</Td>
                      <Td>{support.expenseConcept?.name || ""}</Td>
                      <Td>{support.expenseType || ""}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setSupportForm({
                                id: String(support.id),
                                name: support.name,
                                code: support.code ?? "",
                                management: support.management ?? "",
                                area: support.area ?? "",
                                costCenterId: support.costCenter ? String(support.costCenter.id) : "",
                                packageId: support.expensePackage ? String(support.expensePackage.id) : "",
                                conceptId: support.expenseConcept ? String(support.expenseConcept.id) : "",
                                expenseType: support.expenseType ?? ""
                              })
                            }
                          >
                            Editar
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteSupport.mutate(support.id)}>
                            Eliminar
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
