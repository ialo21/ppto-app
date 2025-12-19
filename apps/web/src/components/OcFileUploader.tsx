import React, { useState, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/api";
import Button from "./ui/Button";
import { FileText, Upload, Trash2, ExternalLink, X, AlertCircle } from "lucide-react";

interface OcDocument {
  id: number;
  ocDocumentId: number;
  driveFileId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number | null;
  category: string;
  uploadedAt: string;
  viewLink: string;
}

interface DriveConfig {
  enabled: boolean;
  maxFileSize: number;
  allowedMimeTypes: string[];
  maxFileSizeMB: number;
}

interface OcFileUploaderProps {
  ocId: number | null;  // null si es OC nueva (subida diferida)
  disabled?: boolean;
  onFilesChange?: (files: File[]) => void;  // Para OCs nuevas
}

export default function OcFileUploader({ ocId, disabled = false, onFilesChange }: OcFileUploaderProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);  // Para OCs nuevas

  // Obtener configuración de Drive
  const { data: config } = useQuery<DriveConfig>({
    queryKey: ["oc-documents-config", ocId],
    queryFn: async () => {
      if (!ocId) return { enabled: false, maxFileSize: 10485760, allowedMimeTypes: ["application/pdf"], maxFileSizeMB: 10 };
      return (await api.get(`/ocs/${ocId}/documents/config`)).data;
    },
    staleTime: 60000
  });

  // Obtener documentos existentes
  const { data: documents = [], isLoading } = useQuery<OcDocument[]>({
    queryKey: ["oc-documents", ocId],
    queryFn: async () => {
      if (!ocId) return [];
      return (await api.get(`/ocs/${ocId}/documents`)).data;
    },
    enabled: !!ocId
  });

  // Subir archivos
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!ocId) throw new Error("OC no guardada");

      const formData = new FormData();
      files.forEach(file => formData.append("files", file));

      return (await api.post(`/ocs/${ocId}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })).data;
    },
    onSuccess: (data) => {
      const uploaded = data.uploaded?.length || 0;
      const errors = data.errors?.length || 0;

      if (uploaded > 0) {
        toast.success(`${uploaded} archivo(s) subido(s) correctamente`);
        queryClient.invalidateQueries({ queryKey: ["oc-documents", ocId] });
      }
      if (errors > 0) {
        data.errors.forEach((err: string) => toast.error(err));
      }
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error || error.response?.data?.message || "Error al subir archivos";
      toast.error(msg);
    }
  });

  // Eliminar archivo
  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      if (!ocId) throw new Error("OC no guardada");
      return (await api.delete(`/ocs/${ocId}/documents/${documentId}`)).data;
    },
    onSuccess: () => {
      toast.success("Documento eliminado");
      queryClient.invalidateQueries({ queryKey: ["oc-documents", ocId] });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error || "Error al eliminar documento";
      toast.error(msg);
    }
  });

  const validateFile = useCallback((file: File): string | null => {
    if (!config) return null;

    if (!config.allowedMimeTypes.includes(file.type)) {
      return `Tipo no permitido: ${file.type}. Solo se aceptan: ${config.allowedMimeTypes.join(", ")}`;
    }
    if (file.size > config.maxFileSize) {
      return `Archivo muy grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: ${config.maxFileSizeMB}MB`;
    }
    return null;
  }, [config]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    errors.forEach(err => toast.error(err));

    if (validFiles.length === 0) return;

    if (ocId) {
      // OC existente: subir inmediatamente
      uploadMutation.mutate(validFiles);
    } else {
      // OC nueva: agregar a pendientes
      const newPending = [...pendingFiles, ...validFiles];
      setPendingFiles(newPending);
      onFilesChange?.(newPending);
    }
  }, [ocId, validateFile, uploadMutation, pendingFiles, onFilesChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  }, [disabled, handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = "";  // Reset para permitir seleccionar el mismo archivo
    }
  }, [handleFiles]);

  const handleRemovePending = useCallback((index: number) => {
    const newPending = pendingFiles.filter((_, i) => i !== index);
    setPendingFiles(newPending);
    onFilesChange?.(newPending);
  }, [pendingFiles, onFilesChange]);

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const isUploading = uploadMutation.isPending;
  const isDeleting = deleteMutation.isPending;
  const isDisabled = disabled || isUploading || isDeleting;

  // Si Drive no está habilitado, mostrar mensaje
  if (ocId && config && !config.enabled) {
    return (
      <div className="border border-dashed border-slate-300 rounded-lg p-4 bg-slate-50">
        <div className="flex items-center gap-2 text-slate-500">
          <AlertCircle size={18} />
          <span className="text-sm">
            La gestión de documentos no está disponible. Contacte al administrador.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Zona de drop */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isDisabled && fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
          ${dragOver ? "border-brand-500 bg-brand-50" : "border-slate-300 hover:border-brand-400"}
          ${isDisabled ? "opacity-50 cursor-not-allowed bg-slate-50" : "hover:bg-slate-50"}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={config?.allowedMimeTypes.join(",") || "application/pdf"}
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={isDisabled}
        />
        <Upload className={`mx-auto mb-2 ${dragOver ? "text-brand-500" : "text-slate-400"}`} size={24} />
        <p className="text-sm text-slate-600">
          {isUploading ? (
            "Subiendo archivos..."
          ) : (
            <>
              <span className="font-medium text-brand-600">Haz clic</span> o arrastra archivos aquí
            </>
          )}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Solo PDF, máximo {config?.maxFileSizeMB || 10}MB por archivo
        </p>
      </div>

      {/* Lista de documentos existentes (OC guardada) */}
      {ocId && documents.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Documentos adjuntos ({documents.length})</p>
          <div className="space-y-1">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText size={18} className="text-red-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700 truncate">{doc.filename}</p>
                    <p className="text-xs text-slate-400">{formatFileSize(doc.sizeBytes)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a
                    href={doc.viewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded"
                    title="Ver en Drive"
                  >
                    <ExternalLink size={16} />
                  </a>
                  {!disabled && (
                    <button
                      onClick={() => deleteMutation.mutate(doc.id)}
                      disabled={isDeleting}
                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de archivos pendientes (OC nueva) */}
      {!ocId && pendingFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">
            Archivos seleccionados ({pendingFiles.length})
          </p>
          <p className="text-xs text-slate-500">
            Se subirán automáticamente al guardar la OC
          </p>
          <div className="space-y-1">
            {pendingFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText size={18} className="text-amber-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemovePending(index)}
                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded flex-shrink-0"
                  title="Quitar"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estado de carga */}
      {isLoading && ocId && (
        <p className="text-sm text-slate-500 text-center">Cargando documentos...</p>
      )}
    </div>
  );
}

// Hook para manejar archivos pendientes en OCs nuevas
export function useOcPendingFiles() {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const uploadPendingFiles = async (ocId: number): Promise<{ success: number; errors: string[] }> => {
    if (pendingFiles.length === 0) {
      return { success: 0, errors: [] };
    }

    try {
      const formData = new FormData();
      pendingFiles.forEach(file => formData.append("files", file));

      const response = await api.post(`/ocs/${ocId}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const data = response.data;
      setPendingFiles([]);  // Limpiar después de subir

      return {
        success: data.uploaded?.length || 0,
        errors: data.errors || []
      };
    } catch (error: any) {
      return {
        success: 0,
        errors: [error.response?.data?.error || "Error al subir documentos"]
      };
    }
  };

  return {
    pendingFiles,
    setPendingFiles,
    uploadPendingFiles,
    hasPendingFiles: pendingFiles.length > 0
  };
}
