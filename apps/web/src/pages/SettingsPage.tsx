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
type Management = { id: number; code?: string | null; name: string; active: boolean; areas: Area[] };
type Area = { id: number; code?: string | null; name: string; managementId: number; active: boolean; management?: Management };
type Support = {
  id: number;
  code: string | null;
  name: string;
  managementId?: number | null;
  areaId?: number | null;
  managementRef?: Management | null;
  areaRef?: Area | null;
  management: string | null;  // DEPRECATED: legacy
  area: string | null;  // DEPRECATED: legacy
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

type SectionKey = "packages" | "costCenters" | "articulos" | "managements" | "supports";

const sections: Array<{ key: SectionKey; label: string; description: string }> = [
  { key: "packages", label: "Paquetes & Conceptos", description: "Gestiona paquetes y sus conceptos de gasto asociados." },
  { key: "costCenters", label: "Centros de costo", description: "Gestiona los centros de costo disponibles para los sustentos." },
  { key: "articulos", label: "Artículos", description: "Gestiona el catálogo de artículos para las órdenes de compra." },
  { key: "managements", label: "Gerencias & Áreas", description: "Gestiona gerencias y sus áreas organizacionales." },
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

function useManagements() {
  return useQuery({
    queryKey: ["managements"],
    queryFn: async () => (await api.get("/managements")).data as Management[]
  });
}

function useAreas() {
  return useQuery({
    queryKey: ["areas"],
    queryFn: async () => (await api.get("/areas")).data as Area[]
  });
}

export default function CatalogsPage() {
  const queryClient = useQueryClient();

  const packagesQuery = useExpensePackages();
  const costCentersQuery = useCostCenters();
  const supportsQuery = useSupports();
  const articulosQuery = useArticulos();
  const managementsQuery = useManagements();
  const areasQuery = useAreas();

  const [section, setSection] = useState<SectionKey>("packages");
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [selectedManagementId, setSelectedManagementId] = useState<number | null>(null);

  const [packageForm, setPackageForm] = useState({ id: "", name: "" });
  const [conceptForm, setConceptForm] = useState({ id: "", packageId: "", name: "" });
  const [costCenterForm, setCostCenterForm] = useState({ id: "", code: "", name: "" });
  const [articuloForm, setArticuloForm] = useState({ id: "", code: "", name: "" });
  const [managementForm, setManagementForm] = useState({ id: "", name: "" });
  const [areaForm, setAreaForm] = useState({ id: "", name: "", managementId: "" });
  const [supportForm, setSupportForm] = useState({
    id: "",
    name: "",
    code: "",
    managementId: "",  // Cambiado de string "management" a ID
    areaId: "",  // Cambiado de string "area" a ID
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

  // Áreas disponibles según la Gerencia seleccionada
  const availableAreas = useMemo(() => {
    if (supportForm.managementId) {
      const mgmt = (managementsQuery.data || []).find(m => m.id === Number(supportForm.managementId));
      return mgmt?.areas || [];
    }
    return areasQuery.data || [];
  }, [supportForm.managementId, managementsQuery.data, areasQuery.data]);

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

  const [managementErrors, setManagementErrors] = useState<Record<string, string>>({});

  const saveManagement = useMutation({
    mutationFn: async () => {
      const name = managementForm.name.trim();
      if (!name) throw new Error("El nombre es obligatorio");
      const payload: { id?: number; name: string } = { name };
      if (managementForm.id) payload.id = Number(managementForm.id);
      return (await api.post("/managements", payload)).data;
    },
    onSuccess: () => {
      toast.success("Gerencia guardada");
      setManagementForm({ id: "", name: "" });
      setManagementErrors({});
      queryClient.invalidateQueries({ queryKey: ["managements"] });
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      queryClient.invalidateQueries({ queryKey: ["supports"] });
    },
    onError: (error: any) => {
      if (error.response?.status === 422 && error.response?.data?.issues) {
        const errors: Record<string, string> = {};
        error.response.data.issues.forEach((issue: any) => {
          const field = issue.path.join(".");
          errors[field] = issue.message;
        });
        setManagementErrors(errors);
        toast.error("Revisa los campos resaltados");
      } else {
        toast.error("No se pudo guardar la gerencia");
      }
    }
  });

  const deleteManagement = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/managements/${id}`)).data,
    onSuccess: () => {
      toast.success("Gerencia eliminada");
      if (managementForm.id) setManagementForm({ id: "", name: "" });
      if (selectedManagementId) setSelectedManagementId(null);
      setManagementErrors({});
      queryClient.invalidateQueries({ queryKey: ["managements"] });
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      queryClient.invalidateQueries({ queryKey: ["supports"] });
    },
    onError: () => toast.error("No se pudo eliminar la gerencia")
  });

  const [areaErrors, setAreaErrors] = useState<Record<string, string>>({});

  const saveArea = useMutation({
    mutationFn: async () => {
      const name = areaForm.name.trim();
      const managementId = areaForm.managementId || (selectedManagementId ? String(selectedManagementId) : "");
      if (!name || !managementId) throw new Error("Completa los campos requeridos");
      const payload: { id?: number; name: string; managementId: number } = { 
        name, 
        managementId: Number(managementId) 
      };
      if (areaForm.id) payload.id = Number(areaForm.id);
      return (await api.post("/areas", payload)).data;
    },
    onSuccess: () => {
      toast.success("Área guardada");
      setAreaForm({ id: "", name: "", managementId: "" });
      setAreaErrors({});
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      queryClient.invalidateQueries({ queryKey: ["managements"] });
      queryClient.invalidateQueries({ queryKey: ["supports"] });
    },
    onError: (error: any) => {
      if (error.response?.status === 422 && error.response?.data?.issues) {
        const errors: Record<string, string> = {};
        error.response.data.issues.forEach((issue: any) => {
          const field = issue.path.join(".");
          errors[field] = issue.message;
        });
        setAreaErrors(errors);
        toast.error("Revisa los campos resaltados");
      } else {
        toast.error("No se pudo guardar el área");
      }
    }
  });

  const deleteArea = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/areas/${id}`)).data,
    onSuccess: () => {
      toast.success("Área eliminada");
      if (areaForm.id) setAreaForm({ id: "", name: "", managementId: "" });
      setAreaErrors({});
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      queryClient.invalidateQueries({ queryKey: ["managements"] });
      queryClient.invalidateQueries({ queryKey: ["supports"] });
    },
    onError: () => toast.error("No se pudo eliminar el área")
  });

  const [supportErrors, setSupportErrors] = useState<Record<string, string>>({});

  const saveSupport = useMutation({
    mutationFn: async () => {
      const name = supportForm.name.trim();
      if (!name) throw new Error("El nombre es obligatorio");
      const payload: any = {
        id: supportForm.id ? Number(supportForm.id) : undefined,
        name,
        code: supportForm.code.trim() || undefined,
        managementId: supportForm.managementId ? Number(supportForm.managementId) : undefined,
        areaId: supportForm.areaId ? Number(supportForm.areaId) : undefined,
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
        managementId: "",
        areaId: "",
        costCenterId: "",
        packageId: "",
        conceptId: "",
        expenseType: ""
      });
      setSupportErrors({});
      queryClient.invalidateQueries({ queryKey: ["supports"] });
    },
    onError: (error: any) => {
      if (error.response?.status === 422 && error.response?.data?.issues) {
        const errors: Record<string, string> = {};
        error.response.data.issues.forEach((issue: any) => {
          const field = issue.path.join(".");
          errors[field] = issue.message;
        });
        setSupportErrors(errors);
        toast.error("Revisa los campos resaltados");
      } else {
        toast.error("No se pudo guardar el sustento");
      }
    }
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
          managementId: "",
          areaId: "",
          costCenterId: "",
          packageId: "",
          conceptId: "",
          expenseType: ""
        });
      }
      setSupportErrors({});
      queryClient.invalidateQueries({ queryKey: ["supports"] });
    },
    onError: () => toast.error("No se pudo eliminar el sustento")
  });

  const selectedSection = sections.find(s => s.key === section);

  // Filtrar conceptos por paquete seleccionado
  const filteredConcepts = useMemo(() => {
    if (!selectedPackageId) return conceptRows;
    return conceptRows.filter(c => c.packageId === selectedPackageId);
  }, [conceptRows, selectedPackageId]);

  // Filtrar áreas por gerencia seleccionada
  const filteredAreas = useMemo(() => {
    if (!selectedManagementId) return areasQuery.data || [];
    return (areasQuery.data || []).filter(a => a.managementId === selectedManagementId);
  }, [areasQuery.data, selectedManagementId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Catálogos</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Administra los catálogos maestros que utiliza la aplicación.
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
        <div className="grid gap-4 md:grid-cols-2">
          {/* Paquetes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Paquetes</h2>
                {packageForm.id && (
                  <Button variant="ghost" size="sm" onClick={() => setPackageForm({ id: "", name: "" })}>
                    Cancelar
                  </Button>
                )}
              </div>
              <div className="mt-4 space-y-3">
                <Input
                  placeholder="Nombre del paquete"
                  value={packageForm.name}
                  onChange={e => setPackageForm(f => ({ ...f, name: e.target.value }))}
                />
                <Button onClick={() => savePackage.mutate()} disabled={savePackage.isPending || !packageForm.name.trim()}>
                  {packageForm.id ? "Actualizar Paquete" : "Crear Paquete"}
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
                      <Th>Paquete</Th>
                      <Th>Conceptos</Th>
                      <Th>Acciones</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {(packagesQuery.data || []).map(pkg => (
                      <tr 
                        key={pkg.id}
                        className={selectedPackageId === pkg.id ? "bg-brand-50 dark:bg-brand-950" : ""}
                      >
                        <Td 
                          className="cursor-pointer hover:text-brand-600"
                          onClick={() => setSelectedPackageId(pkg.id === selectedPackageId ? null : pkg.id)}
                        >
                          {pkg.name}
                        </Td>
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

          {/* Conceptos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Conceptos
                  {selectedPackageId && (
                    <span className="ml-2 text-sm font-normal text-slate-500">
                      ({(packagesQuery.data || []).find(p => p.id === selectedPackageId)?.name})
                    </span>
                  )}
                </h2>
                {conceptForm.id && (
                  <Button variant="ghost" size="sm" onClick={() => setConceptForm({ id: "", name: "", packageId: "" })}>
                    Cancelar
                  </Button>
                )}
              </div>
              <div className="mt-4 space-y-3">
                <Select
                  value={conceptForm.packageId || (selectedPackageId ? String(selectedPackageId) : "")}
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
                <Button
                  onClick={() => saveConcept.mutate()}
                  disabled={saveConcept.isPending || !conceptForm.name.trim() || !conceptForm.packageId}
                >
                  {conceptForm.id ? "Actualizar Concepto" : "Crear Concepto"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {packagesQuery.isLoading ? (
                "Cargando..."
              ) : (
                <>
                  {selectedPackageId && filteredConcepts.length === 0 && (
                    <p className="text-center text-sm text-slate-500 py-4">
                      Este paquete no tiene conceptos. Crea uno arriba.
                    </p>
                  )}
                  {filteredConcepts.length > 0 && (
                    <Table>
                      <thead>
                        <tr>
                          <Th>Concepto</Th>
                          {!selectedPackageId && <Th>Paquete</Th>}
                          <Th>Acciones</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredConcepts.map(concept => (
                          <tr key={concept.id}>
                            <Td>{concept.name}</Td>
                            {!selectedPackageId && <Td>{concept.packageName}</Td>}
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
                </>
              )}
            </CardContent>
          </Card>
        </div>
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
                    <Th>Código</Th>
                    <Th>Nombre</Th>
                    <Th>Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {(costCentersQuery.data || []).map(cc => (
                    <tr key={cc.id}>
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
                    <Th>Código</Th>
                    <Th>Nombre</Th>
                    <Th>Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {(articulosQuery.data || []).map(art => (
                    <tr key={art.id}>
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

      {section === "managements" && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Gerencias */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Gerencias</h2>
                {managementForm.id && (
                  <Button variant="ghost" size="sm" onClick={() => setManagementForm({ id: "", code: "", name: "" })}>
                    Cancelar
                  </Button>
                )}
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <Input
                    placeholder="Nombre"
                    value={managementForm.name}
                    onChange={e => setManagementForm(f => ({ ...f, name: e.target.value }))}
                    className={managementErrors.name ? "border-red-500" : ""}
                  />
                  {managementErrors.name && <p className="text-xs text-red-600 mt-1">{managementErrors.name}</p>}
                </div>
                <Button 
                  onClick={() => saveManagement.mutate()} 
                  disabled={saveManagement.isPending || !managementForm.name.trim()}
                >
                  {managementForm.id ? "Actualizar Gerencia" : "Crear Gerencia"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {managementsQuery.isLoading ? (
                "Cargando..."
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Gerencia</Th>
                      <Th>Áreas</Th>
                      <Th>Acciones</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {(managementsQuery.data || []).map(mgmt => (
                      <tr 
                        key={mgmt.id}
                        className={selectedManagementId === mgmt.id ? "bg-brand-50 dark:bg-brand-950" : ""}
                      >
                        <Td 
                          className="cursor-pointer hover:text-brand-600"
                          onClick={() => setSelectedManagementId(mgmt.id === selectedManagementId ? null : mgmt.id)}
                        >
                          <div>
                            <div className="font-medium">{mgmt.name}</div>
                            <div className="text-xs text-slate-500">{mgmt.code}</div>
                          </div>
                        </Td>
                        <Td>{mgmt.areas?.length || 0}</Td>
                        <Td>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setManagementForm({ id: String(mgmt.id), code: mgmt.code, name: mgmt.name })}
                            >
                              Editar
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteManagement.mutate(mgmt.id)}>
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

          {/* Áreas */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Áreas
                  {selectedManagementId && (
                    <span className="ml-2 text-sm font-normal text-slate-500">
                      ({(managementsQuery.data || []).find(m => m.id === selectedManagementId)?.name})
                    </span>
                  )}
                </h2>
                {areaForm.id && (
                  <Button variant="ghost" size="sm" onClick={() => setAreaForm({ id: "", code: "", name: "", managementId: "" })}>
                    Cancelar
                  </Button>
                )}
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <Select
                    value={areaForm.managementId || (selectedManagementId ? String(selectedManagementId) : "")}
                    onChange={e => setAreaForm(f => ({ ...f, managementId: e.target.value }))}
                    className={areaErrors.managementId ? "border-red-500" : ""}
                  >
                    <option value="">Selecciona una gerencia</option>
                    {(managementsQuery.data || []).map(mgmt => (
                      <option key={mgmt.id} value={mgmt.id}>
                        {mgmt.name}
                      </option>
                    ))}
                  </Select>
                  {areaErrors.managementId && <p className="text-xs text-red-600 mt-1">{areaErrors.managementId}</p>}
                </div>
                <div>
                  <Input
                    placeholder="Nombre"
                    value={areaForm.name}
                    onChange={e => setAreaForm(f => ({ ...f, name: e.target.value }))}
                    className={areaErrors.name ? "border-red-500" : ""}
                  />
                  {areaErrors.name && <p className="text-xs text-red-600 mt-1">{areaErrors.name}</p>}
                </div>
                <Button
                  onClick={() => saveArea.mutate()}
                  disabled={saveArea.isPending || !areaForm.name.trim() || !(areaForm.managementId || selectedManagementId)}
                >
                  {areaForm.id ? "Actualizar Área" : "Crear Área"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {areasQuery.isLoading ? (
                "Cargando..."
              ) : (
                <>
                  {selectedManagementId && filteredAreas.length === 0 && (
                    <p className="text-center text-sm text-slate-500 py-4">
                      Esta gerencia no tiene áreas. Crea una arriba.
                    </p>
                  )}
                  {filteredAreas.length > 0 && (
                    <Table>
                      <thead>
                        <tr>
                          <Th>Área</Th>
                          {!selectedManagementId && <Th>Gerencia</Th>}
                          <Th>Acciones</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAreas.map(area => (
                          <tr key={area.id}>
                            <Td>
                              <div>
                                <div className="font-medium">{area.name}</div>
                                <div className="text-xs text-slate-500">{area.code}</div>
                              </div>
                            </Td>
                            {!selectedManagementId && <Td>{area.management?.name}</Td>}
                            <Td>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setAreaForm({
                                      id: String(area.id),
                                      code: area.code,
                                      name: area.name,
                                      managementId: String(area.managementId)
                                    })
                                  }
                                >
                                  Editar
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => deleteArea.mutate(area.id)}>
                                  Eliminar
                                </Button>
                              </div>
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
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
              <div>
                <Select
                  value={supportForm.managementId}
                  onChange={e =>
                    setSupportForm(f => ({
                      ...f,
                      managementId: e.target.value,
                      areaId: ""
                    }))
                  }
                  className={supportErrors.managementId ? "border-red-500" : ""}
                >
                  <option value="">Sin gerencia</option>
                  {(managementsQuery.data || []).map(mgmt => (
                    <option key={mgmt.id} value={mgmt.id}>
                      {mgmt.name}
                    </option>
                  ))}
                </Select>
                {supportErrors.managementId && <p className="text-xs text-red-600 mt-1">{supportErrors.managementId}</p>}
              </div>
              <div>
                <Select
                  value={supportForm.areaId}
                  onChange={e => setSupportForm(f => ({ ...f, areaId: e.target.value }))}
                  className={supportErrors.areaId ? "border-red-500" : ""}
                >
                  <option value="">Sin área</option>
                  {availableAreas.map(area => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </Select>
                {supportErrors.areaId && <p className="text-xs text-red-600 mt-1">{supportErrors.areaId}</p>}
              </div>
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
                      <Td>{support.name}</Td>
                      <Td>{support.code || ""}</Td>
                      <Td>{support.managementRef?.name || support.management || ""}</Td>
                      <Td>{support.areaRef?.name || support.area || ""}</Td>
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
                                managementId: support.managementRef?.id ? String(support.managementRef.id) : "",
                                areaId: support.areaRef?.id ? String(support.areaRef.id) : "",
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
