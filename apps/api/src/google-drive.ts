import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";
import * as fs from "fs";
import * as path from "path";

export interface DriveUploadResult {
  fileId: string;
  folderId: string;
  webViewLink: string;
  filename: string;
}

export interface DriveConfig {
  enabled: boolean;
  rootFolderId: string;
  incidentsFolderId: string;  // Carpeta raíz separada para incidentes procesados
  maxFileSize: number;
  allowedMimeTypes: string[];
}

class GoogleDriveService {
  private drive: drive_v3.Drive | null = null;
  private config: DriveConfig;
  private initialized: boolean = false;

  constructor() {
    this.config = {
      enabled: process.env.GDRIVE_ENABLED === "true",
      rootFolderId: process.env.GDRIVE_OC_ROOT_FOLDER_ID || "",
      incidentsFolderId: process.env.GDRIVE_INCIDENTS_FOLDER_ID || "",  // Carpeta separada para incidentes
      maxFileSize: parseInt(process.env.GDRIVE_MAX_FILE_SIZE || "10485760", 10),
      allowedMimeTypes: (process.env.GDRIVE_ALLOWED_MIME_TYPES || "application/pdf").split(",").map(s => s.trim())
    };
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    
    if (!this.config.enabled) {
      console.log("[GoogleDrive] Servicio deshabilitado (GDRIVE_ENABLED=false)");
      this.initialized = true;
      return;
    }

    try {
      let credentials: any;

      // Opción 1: Archivo de credenciales
      const credentialsPath = process.env.GDRIVE_SERVICE_ACCOUNT_PATH;
      if (credentialsPath && fs.existsSync(credentialsPath)) {
        const content = fs.readFileSync(credentialsPath, "utf-8");
        credentials = JSON.parse(content);
      }
      // Opción 2: Base64 encoded
      else if (process.env.GDRIVE_SERVICE_ACCOUNT_BASE64) {
        const decoded = Buffer.from(process.env.GDRIVE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf-8");
        credentials = JSON.parse(decoded);
      }

      if (!credentials) {
        console.warn("[GoogleDrive] No se encontraron credenciales de Service Account");
        this.initialized = true;
        return;
      }

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/drive.file"]
      });

      this.drive = google.drive({ version: "v3", auth });
      this.initialized = true;
      console.log("[GoogleDrive] Servicio inicializado correctamente");
    } catch (err) {
      console.error("[GoogleDrive] Error inicializando servicio:", err);
      this.initialized = true;
    }
  }

  isEnabled(): boolean {
    return this.config.enabled && !!this.config.rootFolderId;
  }

  getConfig(): DriveConfig {
    return { ...this.config };
  }

  validateFile(mimeType: string, sizeBytes: number): { valid: boolean; error?: string } {
    if (!this.config.allowedMimeTypes.includes(mimeType)) {
      return { 
        valid: false, 
        error: `Tipo de archivo no permitido: ${mimeType}. Permitidos: ${this.config.allowedMimeTypes.join(", ")}` 
      };
    }
    if (sizeBytes > this.config.maxFileSize) {
      const maxMB = Math.round(this.config.maxFileSize / 1024 / 1024);
      return { 
        valid: false, 
        error: `Archivo demasiado grande. Máximo: ${maxMB}MB` 
      };
    }
    return { valid: true };
  }

  async ensureFolder(folderName: string, parentId?: string): Promise<string> {
    await this.initialize();
    
    if (!this.drive) {
      throw new Error("Google Drive no está configurado");
    }

    const parent = parentId || this.config.rootFolderId;

    // Buscar si la carpeta ya existe
    const searchResponse = await this.drive.files.list({
      q: `name='${folderName}' and '${parent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id, name)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      spaces: "drive"
    });

    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      return searchResponse.data.files[0].id!;
    }

    // Crear la carpeta
    const createResponse = await this.drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parent]
      },
      supportsAllDrives: true,
      fields: "id"
    });

    console.log(`[GoogleDrive] Carpeta creada: ${folderName} (${createResponse.data.id})`);
    return createResponse.data.id!;
  }

  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    folderId: string
  ): Promise<DriveUploadResult> {
    await this.initialize();
    
    if (!this.drive) {
      throw new Error("Google Drive no está configurado");
    }

    // Convertir Buffer a Readable stream
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const response = await this.drive.files.create({
      requestBody: {
        name: filename,
        parents: [folderId]
      },
      media: {
        mimeType,
        body: stream
      },
      supportsAllDrives: true,
      fields: "id, webViewLink"
    });

    const fileId = response.data.id!;
    const webViewLink = response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    console.log(`[GoogleDrive] Archivo subido: ${filename} (${fileId})`);

    return {
      fileId,
      folderId,
      webViewLink,
      filename
    };
  }

  async moveFile(fileId: string, newFolderId: string, currentFolderId?: string): Promise<void> {
    await this.initialize();
    
    if (!this.drive) {
      throw new Error("Google Drive no está configurado");
    }

    // Obtener padres actuales si no se proporcionaron
    let removeParents = currentFolderId;
    if (!removeParents) {
      const file = await this.drive.files.get({
        fileId,
        supportsAllDrives: true,
        fields: "parents"
      });
      removeParents = file.data.parents?.join(",");
    }

    await this.drive.files.update({
      fileId,
      addParents: newFolderId,
      removeParents: removeParents,
      supportsAllDrives: true,
      fields: "id, parents"
    });

    console.log(`[GoogleDrive] Archivo movido: ${fileId} → carpeta ${newFolderId}`);
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.initialize();
    
    if (!this.drive) {
      throw new Error("Google Drive no está configurado");
    }

    await this.drive.files.delete({ fileId, supportsAllDrives: true });
    console.log(`[GoogleDrive] Archivo eliminado: ${fileId}`);
  }

  async getFileInfo(fileId: string): Promise<{ name: string; webViewLink: string; parents: string[] } | null> {
    await this.initialize();
    
    if (!this.drive) {
      return null;
    }

    try {
      const response = await this.drive.files.get({
        fileId,
        supportsAllDrives: true,
        fields: "name, webViewLink, parents"
      });
      return {
        name: response.data.name || "",
        webViewLink: response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
        parents: response.data.parents || []
      };
    } catch (err) {
      console.error(`[GoogleDrive] Error obteniendo info de archivo ${fileId}:`, err);
      return null;
    }
  }

  async createOcFolder(ocId: number): Promise<string> {
    const folderName = `OC_${ocId}_Cotizaciones`;
    return this.ensureFolder(folderName);
  }

  async createIncidentFolder(incidentId: string): Promise<string> {
    // Usar carpeta raíz de incidentes (separada de cotizaciones pendientes)
    const incidentsRoot = this.config.incidentsFolderId || this.config.rootFolderId;
    
    // Asegurar que el nombre de la carpeta tiene el prefijo "INC "
    // Si incidentId ya tiene el prefijo, usarlo; si no, agregarlo
    const folderName = incidentId.toUpperCase().startsWith('INC ') 
      ? incidentId 
      : `INC ${incidentId}`;
    
    return this.ensureFolder(folderName, incidentsRoot);
  }

  async moveDocumentsToIncidentFolder(
    fileIds: string[],
    incidentFolderId: string
  ): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    for (const fileId of fileIds) {
      try {
        await this.moveFile(fileId, incidentFolderId);
        success.push(fileId);
      } catch (err) {
        console.error(`[GoogleDrive] Error moviendo archivo ${fileId}:`, err);
        failed.push(fileId);
      }
    }

    return { success, failed };
  }
}

// Singleton
export const googleDriveService = new GoogleDriveService();
