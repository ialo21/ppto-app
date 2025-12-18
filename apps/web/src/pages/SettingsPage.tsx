import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import Input from "../components/ui/Input";
import FilterSelect from "../components/ui/FilterSelect";
import MultiSelectFilter from "../components/ui/MultiSelectFilter";
import Button from "../components/ui/Button";
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
  costCenter: CostCenter | null;  // DEPRECATED: relación 1:N legacy
  costCenters: Array<{ id: number; costCenter: CostCenter }>;  // M:N: múltiples CECOs
  expensePackage: { id: number; name: string } | null;
  expenseConcept: { id: number; name: string; packageId: number } | null;
};
type ExchangeRate = { id: number; year: number; rate: number };
type ApprovalThreshold = { id: number; key: string; description: string | null; amountPEN: number; active: boolean };

type ManagementOption = { management: string; areas: string[] };

const expenseTypes = [
  { label: "Sin tipo", value: "" },
  { label: "Administrativo", value: "ADMINISTRATIVO" },
  { label: "Producto", value: "PRODUCTO" },
  { label: "Distribuible", value: "DISTRIBUIBLE" }
];

type SectionKey = "packages" | "costCenters" | "articulos" | "managements" | "supports" | "exchangeRates" | "approvalThresholds" | "bulk";

const sections: Array<{ key: SectionKey; label: string; description: string }> = [
  { key: "packages", label: "Paquetes & Conceptos", description: "Gestiona paquetes y sus conceptos de gasto asociados." },
  { key: "costCenters", label: "Centros de costo", description: "Gestiona los centros de costo disponibles para los sustentos." },
  { key: "articulos", label: "Artículos", description: "Gestiona el catálogo de artículos para las órdenes de compra." },
  { key: "managements", label: "Gerencias & Áreas", description: "Gestiona gerencias y sus áreas organizacionales." },
  { key: "supports", label: "Sustentos", description: "Administra el catálogo completo de sustentos." },
  { key: "exchangeRates", label: "Tipos de cambio (TC)", description: "Gestiona tipos de cambio anuales para conversión USD → PEN." },
  { key: "approvalThresholds", label: "Umbrales de Aprobación", description: "Configura umbrales monetarios para aprobaciones VP de facturas." },
  { key: "bulk", label: "Carga masiva (CSV)", description: "Importa múltiples ítems de catálogos desde un archivo CSV." }
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

function useExchangeRates() {
  return useQuery({
    queryKey: ["exchange-rates"],
    queryFn: async () => (await api.get("/exchange-rates")).data as ExchangeRate[]
  });
}

function useApprovalThresholds() {
  return useQuery({
    queryKey: ["approval-thresholds"],
    queryFn: async () => (await api.get("/approval-thresholds")).data as ApprovalThreshold[]
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

  // Búsqueda con debounce para CECO y Artículos
  const [costCenterSearch, setCostCenterSearch] = useState("");
  const [articuloSearch, setArticuloSearch] = useState("");
  const [managementForm, setManagementForm] = useState({ id: "", name: "" });
  const [areaForm, setAreaForm] = useState({ id: "", name: "", managementId: "" });
  
  // Estado inicial del formulario de Sustentos (para reset seguro)
  const INITIAL_SUPPORT_FORM = {
    id: "",
    name: "",
    code: "",
    managementId: "",
    areaId: "",
    costCenterId: "",  // DEPRECATED
    costCenterIds: [] as number[],  // M:N
    packageId: "",
    conceptId: "",
    expenseType: ""
  };
  
  const [supportForm, setSupportForm] = useState(INITIAL_SUPPORT_FORM);
  const [exchangeRateForm, setExchangeRateForm] = useState({ id: "", year: "", rate: "" });
  const [approvalThresholdForm, setApprovalThresholdForm] = useState({ id: "", amountPEN: "" });

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
      // M:N: Enviar array de costCenterIds
      const costCenterIds = supportForm.costCenterIds ?? [];
      if (costCenterIds.length > 0) {
        payload.costCenterIds = costCenterIds;
      }
      if (supportForm.conceptId) {
        payload.expenseConceptId = Number(supportForm.conceptId);
      } else if (supportForm.packageId) {
        payload.expensePackageId = Number(supportForm.packageId);
      }
      return (await api.post("/supports", payload)).data;
    },
    onSuccess: () => {
      toast.success("Sustento guardado");
      setSupportForm(INITIAL_SUPPORT_FORM);
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
      toast.success("Sustento y sus registros asociados eliminados correctamente");
      if (supportForm.id) {
        setSupportForm(INITIAL_SUPPORT_FORM);
      }
      setSupportErrors({});
      queryClient.invalidateQueries({ queryKey: ["supports"] });
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error || "No se pudo eliminar el sustento";
      toast.error(errorMsg);
    }
  });

  // Exchange Rates mutations
  const exchangeRatesQuery = useExchangeRates();
  
  const saveExchangeRate = useMutation({
    mutationFn: async (data: { id?: number; year: number; rate: number }) => {
      if (data.id) {
        return (await api.put(`/exchange-rates/${data.id}`, data)).data;
      }
      return (await api.post("/exchange-rates", data)).data;
    },
    onSuccess: () => {
      toast.success("Tipo de cambio guardado");
      setExchangeRateForm({ id: "", year: "", rate: "" });
      queryClient.invalidateQueries({ queryKey: ["exchange-rates"] });
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error || "No se pudo guardar el tipo de cambio";
      toast.error(errorMsg);
    }
  });

  const deleteExchangeRate = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/exchange-rates/${id}`)).data,
    onSuccess: () => {
      toast.success("Tipo de cambio eliminado");
      setExchangeRateForm({ id: "", year: "", rate: "" });
      queryClient.invalidateQueries({ queryKey: ["exchange-rates"] });
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error || "No se pudo eliminar el tipo de cambio";
      toast.error(errorMsg);
    }
  });

  // Approval Thresholds mutations
  const approvalThresholdsQuery = useApprovalThresholds();
  
  const saveApprovalThreshold = useMutation({
    mutationFn: async (data: { id: number; amountPEN: number }) => {
      return (await api.put(`/approval-thresholds/${data.id}`, { amountPEN: data.amountPEN })).data;
    },
    onSuccess: () => {
      toast.success("Umbral de aprobación actualizado");
      setApprovalThresholdForm({ id: "", amountPEN: "" });
      queryClient.invalidateQueries({ queryKey: ["approval-thresholds"] });
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error || "No se pudo actualizar el umbral";
      toast.error(errorMsg);
    }
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

  // Filtrar centros de costo por búsqueda (código y nombre, case-insensitive)
  const filteredCostCenters = useMemo(() => {
    if (!costCenterSearch.trim()) return costCentersQuery.data || [];
    const search = costCenterSearch.toLowerCase();
    return (costCentersQuery.data || []).filter(cc => 
      cc.code.toLowerCase().includes(search) || 
      (cc.name?.toLowerCase() || "").includes(search)
    );
  }, [costCentersQuery.data, costCenterSearch]);

  // Filtrar artículos por búsqueda (código y nombre, case-insensitive)
  const filteredArticulos = useMemo(() => {
    if (!articuloSearch.trim()) return articulosQuery.data || [];
    const search = articuloSearch.toLowerCase();
    return (articulosQuery.data || []).filter(art => 
      art.code.toLowerCase().includes(search) || 
      art.name.toLowerCase().includes(search)
    );
  }, [articulosQuery.data, articuloSearch]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Catálogos</h1>
        <p className="mt-2 text-sm text-slate-600">
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
        <p className="text-sm text-slate-500">
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
                        className={selectedPackageId === pkg.id ? "bg-brand-50" : ""}
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
                <FilterSelect
                  label="Paquete de Gasto *"
                  placeholder="Seleccionar paquete"
                  value={conceptForm.packageId || (selectedPackageId ? String(selectedPackageId) : "")}
                  onChange={(value) => setConceptForm(f => ({ ...f, packageId: value }))}
                  options={(packagesQuery.data || []).map(pkg => ({
                    value: String(pkg.id),
                    label: pkg.name
                  }))}
                />
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
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Código (obligatorio)"
                value={costCenterForm.code}
                onChange={e => setCostCenterForm(f => ({ ...f, code: e.target.value }))}
              />
              <Input
                placeholder="Nombre (opcional)"
                value={costCenterForm.name}
                onChange={e => setCostCenterForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="mt-3">
              <Button
                onClick={() => saveCostCenter.mutate()}
                disabled={saveCostCenter.isPending || !costCenterForm.code.trim()}
              >
                {costCenterForm.id ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input
                placeholder="🔍 Buscar por código o nombre..."
                value={costCenterSearch}
                onChange={e => setCostCenterSearch(e.target.value)}
              />
            </div>
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
                  {filteredCostCenters.map(cc => (
                    <tr key={cc.id}>
                      <Td>{cc.code}</Td>
                      <Td>{cc.name || "—"}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCostCenterForm({ id: String(cc.id), code: cc.code, name: cc.name || "" })}
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
            <div className="mt-4 grid gap-3 md:grid-cols-2">
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
            <div className="mb-4">
              <Input
                placeholder="🔍 Buscar por código o nombre..."
                value={articuloSearch}
                onChange={e => setArticuloSearch(e.target.value)}
              />
            </div>
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
                  {filteredArticulos.map(art => (
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
                  <Button variant="ghost" size="sm" onClick={() => setManagementForm({ id: "", name: "" })}>
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
                        className={selectedManagementId === mgmt.id ? "bg-brand-50" : ""}
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
                              onClick={() => setManagementForm({ id: String(mgmt.id), name: mgmt.name })}
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
                  <Button variant="ghost" size="sm" onClick={() => setAreaForm({ id: "", name: "", managementId: "" })}>
                    Cancelar
                  </Button>
                )}
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <FilterSelect
                    label="Gerencia *"
                    placeholder="Seleccionar gerencia"
                    value={areaForm.managementId || (selectedManagementId ? String(selectedManagementId) : "")}
                    onChange={(value) => setAreaForm(f => ({ ...f, managementId: value }))}
                    options={(managementsQuery.data || []).map(mgmt => ({
                      value: String(mgmt.id),
                      label: mgmt.name
                    }))}
                    className={areaErrors.managementId ? "border-red-500" : ""}
                  />
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
                  onClick={() => {
                    setSupportForm(INITIAL_SUPPORT_FORM);
                    setSupportErrors({});
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
            {supportForm.id && (
              <p className="mt-2 text-sm text-slate-500">
                Editando sustento #{supportForm.id}
                {supportForm.code ? ` (${supportForm.code})` : ""}
              </p>
            )}
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div>
                <label className="block text-xs text-brand-text-secondary font-medium mb-1">Nombre</label>
                <Input
                  placeholder="Nombre"
                  value={supportForm.name}
                  onChange={e => setSupportForm(f => ({ ...f, name: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div>
                <FilterSelect
                  label="Gerencia"
                  placeholder="Sin gerencia"
                  value={supportForm.managementId}
                  onChange={(value) =>
                    setSupportForm(f => ({
                      ...f,
                      managementId: value,
                      areaId: ""
                    }))
                  }
                  options={(managementsQuery.data || []).map(mgmt => ({
                    value: String(mgmt.id),
                    label: mgmt.name
                  }))}
                  className={supportErrors.managementId ? "border-red-500" : ""}
                />
                {supportErrors.managementId && <p className="text-xs text-red-600 mt-1">{supportErrors.managementId}</p>}
              </div>
              <div>
                <FilterSelect
                  label="Área"
                  placeholder="Sin área"
                  value={supportForm.areaId}
                  onChange={(value) => setSupportForm(f => ({ ...f, areaId: value }))}
                  options={availableAreas.map(area => ({
                    value: String(area.id),
                    label: area.name
                  }))}
                  className={supportErrors.areaId ? "border-red-500" : ""}
                />
                {supportErrors.areaId && <p className="text-xs text-red-600 mt-1">{supportErrors.areaId}</p>}
              </div>
              <div>
                <MultiSelectFilter
                  label="Centros de costo (múltiples)"
                  placeholder="Sin CECOs"
                  values={(supportForm.costCenterIds ?? []).map(id => String(id))}
                  onChange={(values) => setSupportForm(f => ({
                    ...f,
                    costCenterIds: values.map(v => Number(v))
                  }))}
                  options={(costCentersQuery.data || []).map(cc => ({
                    value: String(cc.id),
                    label: `${cc.code} — ${cc.name || "—"}`,
                    searchText: `${cc.code} ${cc.name || ""}`
                  }))}
                  className={supportErrors.costCenterIds ? "border-red-500" : ""}
                />
                {supportErrors.costCenterIds && (
                  <p className="text-xs text-red-600 mt-1">{supportErrors.costCenterIds}</p>
                )}
              </div>
              <FilterSelect
                label="Paquete de Gasto"
                placeholder="Sin paquete"
                value={supportForm.packageId}
                onChange={(value) =>
                  setSupportForm(f => ({
                    ...f,
                    packageId: value,
                    conceptId: ""
                  }))
                }
                options={(packagesQuery.data || []).map(pkg => ({
                  value: String(pkg.id),
                  label: pkg.name
                }))}
              />
              <FilterSelect
                label="Concepto de Gasto"
                placeholder="Sin concepto"
                value={supportForm.conceptId}
                onChange={(value) => {
                  const conceptId = value;
                  const concept = conceptRows.find(item => item.id === Number(conceptId));
                  setSupportForm(f => ({
                    ...f,
                    conceptId,
                    packageId: conceptId ? String(concept?.packageId ?? "") : f.packageId
                  }));
                }}
                options={availableConcepts.map(concept => ({
                  value: String(concept.id),
                  label: concept.packageName ? `${concept.name} — ${concept.packageName}` : concept.name,
                  searchText: `${concept.name} ${concept.packageName || ''}`
                }))}
              />
              <FilterSelect
                label="Tipo de Gasto"
                placeholder="Seleccionar tipo"
                value={supportForm.expenseType}
                onChange={(value) => setSupportForm(f => ({ ...f, expenseType: value }))}
                options={expenseTypes.map(option => ({
                  value: option.value,
                  label: option.label
                }))}
                searchable={false}
              />
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
                        {support.costCenters && support.costCenters.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {support.costCenters.map(link => (
                              <span
                                key={link.id}
                                className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs"
                                title={`${link.costCenter.code} — ${link.costCenter.name || "—"}`}
                              >
                                {link.costCenter.code}
                              </span>
                            ))}
                          </div>
                        ) : (
                          support.costCenter ? `${support.costCenter.code} — ${support.costCenter.name || "—"}` : "—"
                        )}
                      </Td>
                      <Td>{support.expensePackage?.name || ""}</Td>
                      <Td>{support.expenseConcept?.name || ""}</Td>
                      <Td>{support.expenseType || ""}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSupportForm({
                                id: String(support.id),
                                name: support.name,
                                code: support.code ?? "",
                                managementId: support.managementRef?.id ? String(support.managementRef.id) : "",
                                areaId: support.areaRef?.id ? String(support.areaRef.id) : "",
                                costCenterId: support.costCenter ? String(support.costCenter.id) : "",
                                costCenterIds: (support.costCenters ?? []).map(link => link.costCenter.id),
                                packageId: support.expensePackage ? String(support.expensePackage.id) : "",
                                conceptId: support.expenseConcept ? String(support.expenseConcept.id) : "",
                                expenseType: support.expenseType ?? ""
                              });
                            }}
                          >
                            Editar
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              if (confirm(
                                `¿Eliminar el sustento "${support.name}"?\n\n` +
                                `Se eliminarán también OCs y Facturas asociadas. ¿Seguro?`
                              )) {
                                deleteSupport.mutate(support.id);
                              }
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
            )}
          </CardContent>
        </Card>
      )}

      {section === "exchangeRates" && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Tipos de Cambio Anuales</h2>
            <p className="text-sm text-slate-600">
              Gestiona los tipos de cambio USD → PEN por año. Se usan para facturas sin TC manual.
            </p>
          </CardHeader>
          <CardContent>
            <div className="mb-6 border-b pb-4">
              <h3 className="text-sm font-medium mb-3">
                {exchangeRateForm.id ? "Editar tipo de cambio" : "Nuevo tipo de cambio"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  type="number"
                  placeholder="Año (ej. 2025)"
                  value={exchangeRateForm.year}
                  onChange={(e: any) => setExchangeRateForm({ ...exchangeRateForm, year: e.target.value })}
                />
                <Input
                  type="number"
                  step="0.0001"
                  placeholder="Tasa (ej. 3.7500)"
                  value={exchangeRateForm.rate}
                  onChange={(e: any) => setExchangeRateForm({ ...exchangeRateForm, rate: e.target.value })}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      const year = Number(exchangeRateForm.year);
                      const rate = Number(exchangeRateForm.rate);
                      if (!year || year < 2020 || year > 2050) {
                        toast.error("Año debe estar entre 2020 y 2050");
                        return;
                      }
                      if (!rate || rate <= 0) {
                        toast.error("Tasa debe ser mayor a 0");
                        return;
                      }
                      saveExchangeRate.mutate({
                        id: exchangeRateForm.id ? Number(exchangeRateForm.id) : undefined,
                        year,
                        rate
                      });
                    }}
                  >
                    {exchangeRateForm.id ? "Actualizar" : "Crear"}
                  </Button>
                  {exchangeRateForm.id && (
                    <Button
                      variant="ghost"
                      onClick={() => setExchangeRateForm({ id: "", year: "", rate: "" })}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {exchangeRatesQuery.isLoading && <div className="text-center py-4">Cargando...</div>}
            {exchangeRatesQuery.data && exchangeRatesQuery.data.length === 0 && (
              <div className="text-center py-4 text-slate-500">
                No hay tipos de cambio configurados
              </div>
            )}
            {exchangeRatesQuery.data && exchangeRatesQuery.data.length > 0 && (
              <Table>
                <thead>
                  <tr>
                    <Th>Año</Th>
                    <Th>Tasa (USD → PEN)</Th>
                    <Th>Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {exchangeRatesQuery.data.map((rate: ExchangeRate) => (
                    <tr key={rate.id}>
                      <Td>{rate.year}</Td>
                      <Td>{Number(rate.rate).toFixed(4)}</Td>
                      <Td>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExchangeRateForm({
                              id: rate.id.toString(),
                              year: rate.year.toString(),
                              rate: rate.rate.toString()
                            })}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`¿Eliminar tipo de cambio para ${rate.year}?`)) {
                                deleteExchangeRate.mutate(rate.id);
                              }
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
            )}
          </CardContent>
        </Card>
      )}

      {section === "approvalThresholds" && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Umbrales de Aprobación</h2>
            <p className="text-sm text-slate-600">
              Configura los umbrales monetarios para determinar qué facturas requieren aprobación VP.
              <br />
              <strong>Regla:</strong> Si el monto total con IGV de una factura supera el umbral, pasa a Aprobación VP después de Head.
            </p>
          </CardHeader>
          <CardContent>
            {approvalThresholdsQuery.isLoading && <div className="text-center py-4">Cargando...</div>}
            {approvalThresholdsQuery.data && approvalThresholdsQuery.data.length === 0 && (
              <div className="text-center py-4 text-slate-500">
                No hay umbrales configurados. Ejecute el seed de la base de datos para crear el umbral por defecto.
              </div>
            )}
            {approvalThresholdsQuery.data && approvalThresholdsQuery.data.length > 0 && (
              <div className="space-y-4">
                {approvalThresholdsQuery.data.map((threshold: ApprovalThreshold) => (
                  <div key={threshold.id} className="border rounded-lg p-4 bg-slate-50">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">
                          {threshold.key === "INVOICE_VP_THRESHOLD" 
                            ? "Umbral VP para Facturas" 
                            : threshold.key}
                        </h3>
                        <p className="text-sm text-slate-600 mt-1">
                          {threshold.description || "Monto con IGV a partir del cual se requiere aprobación VP"}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            threshold.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}>
                            {threshold.active ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {approvalThresholdForm.id === threshold.id.toString() ? (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">S/</span>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Monto en PEN"
                                value={approvalThresholdForm.amountPEN}
                                onChange={(e: any) => setApprovalThresholdForm({ 
                                  ...approvalThresholdForm, 
                                  amountPEN: e.target.value 
                                })}
                                className="w-32"
                              />
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                const amount = Number(approvalThresholdForm.amountPEN);
                                if (!amount || amount <= 0) {
                                  toast.error("El monto debe ser mayor a 0");
                                  return;
                                }
                                saveApprovalThreshold.mutate({
                                  id: threshold.id,
                                  amountPEN: amount
                                });
                              }}
                              disabled={saveApprovalThreshold.isPending}
                            >
                              Guardar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setApprovalThresholdForm({ id: "", amountPEN: "" })}
                            >
                              Cancelar
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-brand-primary">
                                S/ {Number(threshold.amountPEN).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-xs text-slate-500">con IGV</div>
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setApprovalThresholdForm({
                                id: threshold.id.toString(),
                                amountPEN: threshold.amountPEN.toString()
                              })}
                            >
                              Editar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">💡 Ejemplo de funcionamiento</h4>
                  <p className="text-sm text-blue-700">
                    Si el umbral es <strong>S/ 10,000</strong> y una factura tiene un monto total con IGV de:
                  </p>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1">
                    <li>• <strong>S/ 8,500</strong> → Aprobado por Head → pasa directo a Contabilidad</li>
                    <li>• <strong>S/ 12,000</strong> → Aprobado por Head → pasa a Aprobación VP → VP aprueba → Contabilidad</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {section === "bulk" && <BulkUploadSection queryClient={queryClient} />}
    </div>
  );
}

// Componente de carga masiva CSV
type BulkRowResult = {
  row: number;
  type: string;
  action: "created" | "updated" | "skipped" | "error";
  message: string;
  issues?: Array<{ path: string[]; message: string }>;
};

type BulkResponse = {
  dryRun: boolean;
  summary: { created: number; updated: number; skipped: number; errors: number };
  byType: Record<string, { created: number; updated: number; skipped: number; errors: number }>;
  rows: BulkRowResult[];
};

function BulkUploadSection({ queryClient }: { queryClient: any }) {
  const [file, setFile] = useState<File | null>(null);
  const [isDryRun, setIsDryRun] = useState(true);
  const [result, setResult] = useState<BulkResponse | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  const uploadMutation = useMutation({
    mutationFn: async ({ file, dryRun }: { file: File; dryRun: boolean }) => {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const response = await api.post(`/bulk/catalogs?dryRun=${dryRun}`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        return response.data as BulkResponse;
      } catch (error: any) {
        // Si es error 422 con formato de validación, tratarlo como resultado
        if (error.response?.status === 422 && error.response?.data?.rows) {
          return error.response.data as BulkResponse;
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      setResult(data);
      if (data.summary.errors > 0) {
        toast.error(`Errores de validación en el CSV. Ver detalle abajo.`);
      } else if (!data.dryRun && data.summary.errors === 0) {
        toast.success(`Carga completada: ${data.summary.created} creados, ${data.summary.updated} actualizados`);
        // Refrescar todas las queries de catálogos
        queryClient.invalidateQueries({ queryKey: ["expense-packages"] });
        queryClient.invalidateQueries({ queryKey: ["cost-centers"] });
        queryClient.invalidateQueries({ queryKey: ["articulos"] });
        queryClient.invalidateQueries({ queryKey: ["managements"] });
        queryClient.invalidateQueries({ queryKey: ["areas"] });
        queryClient.invalidateQueries({ queryKey: ["supports"] });
      } else if (data.dryRun) {
        toast.info("Vista previa generada. Revisa los resultados antes de confirmar.");
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Error al procesar el archivo");
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        toast.error("Solo se permiten archivos CSV");
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("El archivo no debe superar 5 MB");
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleProcess = () => {
    if (!file) {
      toast.error("Selecciona un archivo CSV primero");
      return;
    }
    uploadMutation.mutate({ file, dryRun: isDryRun });
  };

  const handleConfirm = () => {
    if (!file) return;
    setIsDryRun(false);
    uploadMutation.mutate({ file, dryRun: false });
  };

  const handleDownloadTemplate = () => {
    const url = api.defaults.baseURL + "/bulk/template";
    window.open(url, "_blank");
  };

  const filteredRows = useMemo(() => {
    if (!result) return [];
    return result.rows.filter(row => {
      if (filterType !== "all" && row.type !== filterType) return false;
      if (filterAction !== "all" && row.action !== filterAction) return false;
      return true;
    });
  }, [result, filterType, filterAction]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, currentPage]);

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);

  const uniqueTypes = useMemo(() => {
    if (!result) return [];
    return Array.from(new Set(result.rows.map(r => r.type))).sort();
  }, [result]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Carga masiva desde CSV</h2>
          <p className="text-sm text-slate-600 mt-2">
            Importa múltiples ítems de catálogos (Gerencias, Áreas, Paquetes, Conceptos, Centros de costo, Artículos y Sustentos) desde un archivo CSV.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Button variant="secondary" size="sm" onClick={handleDownloadTemplate}>
                📥 Descargar Plantilla CSV
              </Button>
              <p className="text-xs text-slate-500 mt-1">
                Descarga un archivo CSV de ejemplo con las cabeceras correctas y ejemplos de datos.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Seleccionar archivo CSV</label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded file:border-0
                  file:text-sm file:font-semibold
                  file:bg-brand-50 file:text-brand-700
                  hover:file:bg-brand-100 cursor-pointer"
              />
              {file && (
                <p className="text-xs text-slate-600 mt-1">
                  Archivo seleccionado: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="dryRun"
                checked={isDryRun}
                onChange={e => setIsDryRun(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300"
              />
              <label htmlFor="dryRun" className="text-sm font-medium">
                Modo Vista Previa (Dry-Run)
              </label>
              <span className="text-xs text-slate-500">
                — Simula la carga sin guardar cambios
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleProcess}
                disabled={!file || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? "Procesando..." : isDryRun ? "Vista Previa" : "Procesar y Guardar"}
              </Button>
              {result && result.dryRun && result.summary.errors === 0 && (
                <Button variant="primary" onClick={handleConfirm} disabled={uploadMutation.isPending}>
                  ✓ Confirmar y Guardar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">
                {result.dryRun ? "Vista Previa de Resultados" : "Resultados de la Carga"}
              </h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-green-50 rounded">
                  <div className="text-2xl font-bold text-green-700">
                    {result.summary.created}
                  </div>
                  <div className="text-sm text-green-600">Creados</div>
                </div>
                <div className="p-3 bg-blue-50 rounded">
                  <div className="text-2xl font-bold text-blue-700">
                    {result.summary.updated}
                  </div>
                  <div className="text-sm text-blue-600">Actualizados</div>
                </div>
                <div className="p-3 bg-yellow-50 rounded">
                  <div className="text-2xl font-bold text-yellow-700">
                    {result.summary.skipped}
                  </div>
                  <div className="text-sm text-yellow-600">Omitidos</div>
                </div>
                <div className="p-3 bg-red-50 rounded">
                  <div className="text-2xl font-bold text-red-700">
                    {result.summary.errors}
                  </div>
                  <div className="text-sm text-red-600">Errores</div>
                </div>
              </div>

              {Object.keys(result.byType).length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">Por tipo de entidad:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                    {Object.entries(result.byType).map(([type, stats]) => (
                      <div key={type} className="p-2 bg-slate-50 rounded">
                        <div className="font-semibold">{type}</div>
                        <div className="text-slate-600">
                          C:{stats.created} | U:{stats.updated} | S:{stats.skipped} | E:{stats.errors}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Detalle de Filas ({filteredRows.length})</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                <FilterSelect
                  placeholder="Todos los tipos"
                  value={filterType}
                  onChange={(value) => { setFilterType(value); setCurrentPage(1); }}
                  options={[{ value: "all", label: "Todos los tipos" }, ...uniqueTypes.map(type => ({
                    value: type,
                    label: type
                  }))]}
                  searchable={false}
                  className="text-sm w-auto min-w-[160px]"
                />
                <FilterSelect
                  placeholder="Todas las acciones"
                  value={filterAction}
                  onChange={(value) => { setFilterAction(value); setCurrentPage(1); }}
                  options={[
                    { value: "all", label: "Todas las acciones" },
                    { value: "created", label: "Creados" },
                    { value: "updated", label: "Actualizados" },
                    { value: "skipped", label: "Omitidos" },
                    { value: "error", label: "Errores" }
                  ]}
                  searchable={false}
                  className="text-sm w-auto min-w-[180px]"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <thead>
                  <tr>
                    <Th>Fila</Th>
                    <Th>Tipo</Th>
                    <Th>Acción</Th>
                    <Th>Columna(s)</Th>
                    <Th>Mensaje</Th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((row, idx) => (
                    <tr key={idx} className={
                      row.action === "error" ? "bg-red-50" :
                      row.action === "created" ? "bg-green-50" :
                      row.action === "updated" ? "bg-blue-50" :
                      "bg-yellow-50"
                    }>
                      <Td>{row.row}</Td>
                      <Td className="font-mono text-xs">{row.type}</Td>
                      <Td>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          row.action === "created" ? "bg-green-200 text-green-800" :
                          row.action === "updated" ? "bg-blue-200 text-blue-800" :
                          row.action === "skipped" ? "bg-yellow-200 text-yellow-800" :
                          "bg-red-200 text-red-800"
                        }`}>
                          {row.action}
                        </span>
                      </Td>
                      <Td>
                        {row.issues && row.issues.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {Array.from(new Set(row.issues.map(issue => issue.path.join(".")))).map((path, i) => (
                              <span key={i} className="inline-block px-2 py-0.5 bg-slate-200 rounded text-xs font-mono">
                                {path}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </Td>
                      <Td>
                        <div className="text-sm">{row.message}</div>
                        {row.issues && row.issues.length > 0 && (
                          <ul className="text-xs text-red-600 mt-1 space-y-0.5">
                            {row.issues.map((issue, i) => (
                              <li key={i}>
                                • {issue.message}
                              </li>
                            ))}
                          </ul>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    ← Anterior
                  </Button>
                  <span className="text-sm">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente →
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
