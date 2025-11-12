import React, { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader } from "./ui/Card";
import Button from "./ui/Button";
import Select from "./ui/Select";
import { Table, Th, Td } from "./ui/Table";

type RowResult = {
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
  rows: RowResult[];
};

interface BulkUploaderProps {
  title: string;
  description: string;
  templateUrl: string;
  uploadUrl: string;
  templateFilename?: string;
  additionalParams?: Record<string, any>;
  onSuccess?: () => void;
  showOverwriteBlanks?: boolean;
}

export default function BulkUploader({
  title,
  description,
  templateUrl,
  uploadUrl,
  templateFilename = "template.csv",
  additionalParams = {},
  onSuccess,
  showOverwriteBlanks = false
}: BulkUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDryRun, setIsDryRun] = useState(true);
  const [overwriteBlanks, setOverwriteBlanks] = useState(false);
  const [result, setResult] = useState<BulkResponse | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;

  const uploadMutation = useMutation({
    mutationFn: async ({ file, dryRun }: { file: File; dryRun: boolean }) => {
      const formData = new FormData();
      formData.append("file", file);

      const params = new URLSearchParams({
        dryRun: String(dryRun),
        ...additionalParams,
        ...(showOverwriteBlanks ? { overwriteBlanks: String(overwriteBlanks) } : {})
      });

      const response = await api.post(`${uploadUrl}?${params.toString()}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      return response.data;
    },
    onSuccess: (data) => {
      setResult(data);
      if (!data.dryRun) {
        if (data.summary.errors === 0) {
          toast.success(`Carga completada: ${data.summary.created} creados, ${data.summary.updated} actualizados`);
          setFile(null);
          setResult(null);
          onSuccess?.();
        } else {
          toast.error(`Carga con errores: ${data.summary.errors} errores encontrados`);
        }
      } else {
        if (data.summary.errors > 0) {
          toast.warning(`Vista previa: ${data.summary.errors} errores encontrados`);
        } else {
          toast.success("Vista previa completada sin errores");
        }
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || "Error al procesar el archivo";
      toast.error(message);
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        toast.error("Por favor selecciona un archivo CSV");
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
    const url = api.defaults.baseURL + templateUrl;
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
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
            {description}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Button variant="secondary" size="sm" onClick={handleDownloadTemplate}>
                📥 Descargar Plantilla CSV
              </Button>
              <p className="text-xs text-slate-500 mt-1">
                Descarga un archivo CSV de ejemplo con las cabeceras correctas.
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

            {showOverwriteBlanks && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="overwriteBlanks"
                  checked={overwriteBlanks}
                  onChange={e => setOverwriteBlanks(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <label htmlFor="overwriteBlanks" className="text-sm font-medium">
                  Sobrescribir vacíos como 0
                </label>
                <span className="text-xs text-slate-500">
                  — Celdas vacías en el CSV se guardarán como 0
                </span>
              </div>
            )}

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
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {result.summary.created}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">Creados</div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded">
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {result.summary.updated}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">Actualizados</div>
                </div>
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded">
                  <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                    {result.summary.skipped}
                  </div>
                  <div className="text-sm text-yellow-600 dark:text-yellow-400">Omitidos</div>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded">
                  <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {result.summary.errors}
                  </div>
                  <div className="text-sm text-red-600 dark:text-red-400">Errores</div>
                </div>
              </div>

              {Object.keys(result.byType).length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">Por tipo de entidad:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                    {Object.entries(result.byType).map(([type, stats]) => (
                      <div key={type} className="p-2 bg-slate-50 dark:bg-slate-800 rounded">
                        <div className="font-semibold">{type}</div>
                        <div className="text-slate-600 dark:text-slate-400">
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
                <Select value={filterType} onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }} className="text-sm">
                  <option value="all">Todos los tipos</option>
                  {uniqueTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Select>
                <Select value={filterAction} onChange={e => { setFilterAction(e.target.value); setCurrentPage(1); }} className="text-sm">
                  <option value="all">Todas las acciones</option>
                  <option value="created">Creados</option>
                  <option value="updated">Actualizados</option>
                  <option value="skipped">Omitidos</option>
                  <option value="error">Errores</option>
                </Select>
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
                      row.action === "error" ? "bg-red-50 dark:bg-red-950" :
                      row.action === "created" ? "bg-green-50 dark:bg-green-950" :
                      row.action === "updated" ? "bg-blue-50 dark:bg-blue-950" :
                      "bg-yellow-50 dark:bg-yellow-950"
                    }>
                      <Td>{row.row}</Td>
                      <Td className="font-mono text-xs">{row.type}</Td>
                      <Td>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          row.action === "created" ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200" :
                          row.action === "updated" ? "bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200" :
                          row.action === "skipped" ? "bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200" :
                          "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200"
                        }`}>
                          {row.action}
                        </span>
                      </Td>
                      <Td>
                        {row.issues && row.issues.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {Array.from(new Set(row.issues.map(issue => issue.path.join(".")))).map((path, i) => (
                              <span key={i} className="inline-block px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs font-mono">
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
                          <ul className="text-xs text-red-600 dark:text-red-400 mt-1 space-y-0.5">
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

