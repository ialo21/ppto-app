import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient, DocumentCategory } from "@prisma/client";
import multipart from "@fastify/multipart";
import { requireAuth, requirePermission } from "./auth";
import { googleDriveService } from "./google-drive";

const prisma = new PrismaClient();

export async function registerOcDocumentRoutes(app: FastifyInstance) {
  // Registrar plugin multipart si no está registrado
  if (!app.hasDecorator("multipartErrors")) {
    await app.register(multipart, {
      limits: {
        fileSize: googleDriveService.getConfig().maxFileSize
      }
    });
  }

  // GET /ocs/:id/documents - Listar documentos de una OC
  app.get("/ocs/:id/documents", { preHandler: [requireAuth, requirePermission("ocs")] }, async (req, reply) => {
    const ocId = Number((req.params as any).id);

    if (isNaN(ocId)) {
      return reply.code(400).send({ error: "ID de OC inválido" });
    }

    try {
      const documents = await prisma.oCDocument.findMany({
        where: { ocId },
        include: {
          document: {
            select: {
              id: true,
              driveFileId: true,
              driveFolderId: true,
              filename: true,
              mimeType: true,
              sizeBytes: true,
              category: true,
              uploadedAt: true,
              uploadedBy: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      });

      // Mapear a formato más plano para el frontend
      const result = documents.map(od => ({
        id: od.document.id,
        ocDocumentId: od.id,
        driveFileId: od.document.driveFileId,
        filename: od.document.filename,
        mimeType: od.document.mimeType,
        sizeBytes: od.document.sizeBytes,
        category: od.document.category,
        uploadedAt: od.document.uploadedAt,
        viewLink: `https://drive.google.com/file/d/${od.document.driveFileId}/view`
      }));

      return result;
    } catch (err: any) {
      console.error("[GET /ocs/:id/documents] Error:", err);
      return reply.code(500).send({ 
        error: "Error al obtener documentos",
        details: process.env.NODE_ENV === "development" ? err.message : undefined
      });
    }
  });

  // GET /ocs/:id/documents/config - Obtener configuración de Google Drive
  app.get("/ocs/:id/documents/config", { preHandler: [requireAuth, requirePermission("ocs")] }, async (req, reply) => {
    const config = googleDriveService.getConfig();
    return {
      enabled: googleDriveService.isEnabled(),
      maxFileSize: config.maxFileSize,
      allowedMimeTypes: config.allowedMimeTypes,
      maxFileSizeMB: Math.round(config.maxFileSize / 1024 / 1024)
    };
  });

  // POST /ocs/:id/documents - Subir documentos a una OC
  app.post("/ocs/:id/documents", { preHandler: [requireAuth, requirePermission("ocs")] }, async (req, reply) => {
    const ocId = Number((req.params as any).id);

    if (isNaN(ocId)) {
      return reply.code(400).send({ error: "ID de OC inválido" });
    }

    // Verificar que Google Drive está habilitado
    if (!googleDriveService.isEnabled()) {
      return reply.code(503).send({ 
        error: "Servicio de documentos no disponible",
        message: "La integración con Google Drive no está configurada"
      });
    }

    // Verificar que la OC existe y está en estado editable
    const oc = await prisma.oC.findUnique({
      where: { id: ocId },
      select: { id: true, estado: true }
    });

    if (!oc) {
      return reply.code(404).send({ error: "OC no encontrada" });
    }

    // Solo permitir subir documentos en estados editables
    const estadosEditables = ["PENDIENTE", "PROCESAR"];
    if (!estadosEditables.includes(oc.estado)) {
      return reply.code(400).send({ 
        error: "No se pueden agregar documentos",
        message: `La OC está en estado ${oc.estado}. Solo se pueden agregar documentos en estados: ${estadosEditables.join(", ")}`
      });
    }

    try {
      const parts = req.parts();
      const uploadedDocs: any[] = [];
      const errors: string[] = [];

      // Obtener usuario actual (si está disponible en la sesión)
      const userId = (req as any).session?.userId || null;

      // Crear carpeta de la OC si no existe
      const ocFolderId = await googleDriveService.createOcFolder(ocId);

      for await (const part of parts) {
        if (part.type === "file") {
          const { filename, mimetype } = part;
          
          // Validar archivo
          const buffer = await part.toBuffer();
          const validation = googleDriveService.validateFile(mimetype, buffer.length);
          
          if (!validation.valid) {
            errors.push(`${filename}: ${validation.error}`);
            continue;
          }

          try {
            // Subir a Google Drive
            const uploadResult = await googleDriveService.uploadFile(
              buffer,
              filename,
              mimetype,
              ocFolderId
            );

            // Crear registro en BD
            const document = await prisma.document.create({
              data: {
                driveFileId: uploadResult.fileId,
                driveFolderId: uploadResult.folderId,
                filename: filename,
                mimeType: mimetype,
                sizeBytes: buffer.length,
                category: DocumentCategory.COTIZACION,
                uploadedBy: userId
              }
            });

            // Crear relación OC-Document
            await prisma.oCDocument.create({
              data: {
                ocId,
                documentId: document.id
              }
            });

            uploadedDocs.push({
              id: document.id,
              filename: document.filename,
              driveFileId: document.driveFileId,
              viewLink: uploadResult.webViewLink
            });

          } catch (uploadErr: any) {
            console.error(`[POST /ocs/:id/documents] Error subiendo ${filename}:`, uploadErr);
            errors.push(`${filename}: Error al subir archivo`);
          }
        }
      }

      // Respuesta
      if (uploadedDocs.length === 0 && errors.length > 0) {
        return reply.code(400).send({ 
          error: "No se pudieron subir los archivos",
          errors 
        });
      }

      return {
        uploaded: uploadedDocs,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (err: any) {
      console.error("[POST /ocs/:id/documents] Error:", err);
      return reply.code(500).send({ 
        error: "Error al procesar documentos",
        details: process.env.NODE_ENV === "development" ? err.message : undefined
      });
    }
  });

  // DELETE /ocs/:id/documents/:documentId - Eliminar documento de una OC
  app.delete("/ocs/:id/documents/:documentId", { preHandler: [requireAuth, requirePermission("ocs")] }, async (req, reply) => {
    const ocId = Number((req.params as any).id);
    const documentId = Number((req.params as any).documentId);

    if (isNaN(ocId) || isNaN(documentId)) {
      return reply.code(400).send({ error: "IDs inválidos" });
    }

    // Verificar que la OC existe y está en estado editable
    const oc = await prisma.oC.findUnique({
      where: { id: ocId },
      select: { id: true, estado: true }
    });

    if (!oc) {
      return reply.code(404).send({ error: "OC no encontrada" });
    }

    const estadosEditables = ["PENDIENTE", "PROCESAR"];
    if (!estadosEditables.includes(oc.estado)) {
      return reply.code(400).send({ 
        error: "No se pueden eliminar documentos",
        message: `La OC está en estado ${oc.estado}`
      });
    }

    // Verificar que el documento existe y está asociado a esta OC
    const ocDocument = await prisma.oCDocument.findFirst({
      where: { ocId, documentId },
      include: { document: true }
    });

    if (!ocDocument) {
      return reply.code(404).send({ error: "Documento no encontrado en esta OC" });
    }

    try {
      // Eliminar de Google Drive (si está habilitado)
      if (googleDriveService.isEnabled()) {
        try {
          await googleDriveService.deleteFile(ocDocument.document.driveFileId);
        } catch (driveErr) {
          console.error("[DELETE] Error eliminando de Drive:", driveErr);
          // Continuar con la eliminación en BD aunque falle en Drive
        }
      }

      // Eliminar relación y documento (cascade)
      await prisma.$transaction([
        prisma.oCDocument.delete({ where: { id: ocDocument.id } }),
        prisma.document.delete({ where: { id: documentId } })
      ]);

      return { ok: true, message: "Documento eliminado" };

    } catch (err: any) {
      console.error("[DELETE /ocs/:id/documents/:documentId] Error:", err);
      return reply.code(500).send({ 
        error: "Error al eliminar documento",
        details: process.env.NODE_ENV === "development" ? err.message : undefined
      });
    }
  });

  // POST /ocs/:id/documents/organize - Reorganizar documentos a carpeta de incidente
  // Este endpoint es llamado cuando se genera el incidenteOc
  app.post("/ocs/:id/documents/organize", { preHandler: [requireAuth, requirePermission("ocs")] }, async (req, reply) => {
    const ocId = Number((req.params as any).id);

    if (isNaN(ocId)) {
      return reply.code(400).send({ error: "ID de OC inválido" });
    }

    // Verificar que la OC existe y tiene incidenteOc
    const oc = await prisma.oC.findUnique({
      where: { id: ocId },
      select: { id: true, incidenteOc: true }
    });

    if (!oc) {
      return reply.code(404).send({ error: "OC no encontrada" });
    }

    if (!oc.incidenteOc) {
      return reply.code(400).send({ 
        error: "OC sin incidente",
        message: "La OC no tiene un incidente asignado. Los documentos se reorganizan al generar el incidente."
      });
    }

    if (!googleDriveService.isEnabled()) {
      return reply.code(503).send({ error: "Servicio de documentos no disponible" });
    }

    try {
      // Obtener todos los documentos de la OC
      const documents = await prisma.oCDocument.findMany({
        where: { ocId },
        include: { document: true }
      });

      if (documents.length === 0) {
        return { message: "No hay documentos para reorganizar", moved: 0 };
      }

      // Crear carpeta del incidente
      const incidentFolderId = await googleDriveService.createIncidentFolder(oc.incidenteOc);

      // Mover documentos
      const fileIds = documents.map(d => d.document.driveFileId);
      const result = await googleDriveService.moveDocumentsToIncidentFolder(fileIds, incidentFolderId);

      // Actualizar driveFolderId en los documentos movidos exitosamente
      if (result.success.length > 0) {
        await prisma.document.updateMany({
          where: { driveFileId: { in: result.success } },
          data: { driveFolderId: incidentFolderId }
        });
      }

      return {
        message: "Documentos reorganizados",
        incidentFolder: oc.incidenteOc,
        moved: result.success.length,
        failed: result.failed.length
      };

    } catch (err: any) {
      console.error("[POST /ocs/:id/documents/organize] Error:", err);
      return reply.code(500).send({ 
        error: "Error al reorganizar documentos",
        details: process.env.NODE_ENV === "development" ? err.message : undefined
      });
    }
  });
}
