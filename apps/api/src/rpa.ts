import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

 function formatBudgetPeriodRange(
   from: { year: number; month: number } | null | undefined,
   to: { year: number; month: number } | null | undefined
 ) {
   if (!from || !to) return null;
 
   const fromText = `${from.year}-${String(from.month).padStart(2, "0")}`;
   const toText = `${to.year}-${String(to.month).padStart(2, "0")}`;

   if (from.year === to.year && from.month === to.month) {
     return fromText;
   }

   return `${fromText} a ${toText}`;
 }

export async function requireRpaKey(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ error: "Token RPA requerido" });
  }
  
  const token = authHeader.substring(7);
  const expectedToken = process.env.RPA_API_KEY;
  
  if (!expectedToken) {
    console.error("[RPA] RPA_API_KEY no configurada en el servidor");
    return reply.code(500).send({ error: "Configuración del servidor incompleta" });
  }
  
  if (token !== expectedToken) {
    return reply.code(401).send({ error: "Token RPA inválido" });
  }
}

const completeOcSchema = z.object({
  ok: z.boolean(),
  solicitudOc: z.string().optional(),
  incidenteOc: z.string().optional(),
  errorMessage: z.string().optional()
});

export async function registerRpaRoutes(app: FastifyInstance) {
  app.get("/rpa/ocs/to-process", { preHandler: requireRpaKey }, async (req, reply) => {
    try {
      const { limit } = req.query as any;
      const limitNum = limit ? Math.min(Math.max(1, Number(limit)), 100) : 10;

      const ocs = await prisma.oC.findMany({
        where: { estado: "PROCESAR" },
        orderBy: [{ fechaRegistro: "asc" }, { id: "asc" }],
        take: limitNum,
        include: {
          support: { select: { id: true, code: true, name: true } },
          articulo: { select: { id: true, code: true, name: true } },
          costCenters: {
            include: {
              costCenter: { select: { id: true, code: true, name: true } }
            }
          },
          budgetPeriodFrom: { select: { id: true, year: true, month: true, label: true } },
          budgetPeriodTo: { select: { id: true, year: true, month: true, label: true } }
        }
      });

      const mapped = ocs.map(oc => {
        const motivoParts: string[] = [];
        
        if (oc.support?.name) {
          motivoParts.push(`PPTO: ${oc.support.name}`);
        }
        
        const periodoText =
          oc.periodoEnFechasText ||
          formatBudgetPeriodRange(oc.budgetPeriodFrom, oc.budgetPeriodTo);
        
        if (periodoText) {
          motivoParts.push(`Periodo: ${periodoText}`);
        }
        
        if (oc.descripcion) {
          motivoParts.push(oc.descripcion);
        }
        
        if (oc.nombreSolicitante) {
          motivoParts.push(`A solicitud de ${oc.nombreSolicitante}`);
        }
        
        const motivo = motivoParts.join('\n');
        
        return {
          id: oc.id,
          proveedor: oc.proveedor,
          ruc: oc.ruc,
          moneda: oc.moneda,
          importeSinIgv: oc.importeSinIgv.toString(),
          descripcion: oc.descripcion || "",
          motivo: motivo || oc.comentario || "",
          articulo: oc.articulo?.code || "",
          ceco: oc.costCenters.length > 0 
            ? oc.costCenters[0].costCenter.code 
            : "",
          costCenters: oc.costCenters.map(cc => ({
            id: cc.costCenter.id,
            code: cc.costCenter.code,
            name: cc.costCenter.name
          })),
          support: oc.support,
          estado: oc.estado,
          fechaRegistro: oc.fechaRegistro.toISOString(),
          solicitudOc: oc.solicitudOc,
          incidenteOc: oc.incidenteOc,
          nombreSolicitante: oc.nombreSolicitante,
          periodoEnFechasText: periodoText
        };
      });

      return { ocs: mapped, count: mapped.length };
    } catch (err: any) {
      console.error('[RPA] Error listing OCs to process:', err);
      return reply.code(500).send({ 
        error: "Error al obtener OCs para procesar",
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  app.post("/rpa/ocs/:id/claim", { preHandler: requireRpaKey }, async (req, reply) => {
    try {
      const id = Number((req.params as any).id);
      
      if (isNaN(id)) {
        return reply.code(400).send({ error: "ID inválido" });
      }

      const oc = await prisma.oC.findUnique({
        where: { id },
        include: {
          support: { select: { id: true, code: true, name: true } },
          articulo: { select: { id: true, code: true, name: true } },
          costCenters: {
            include: {
              costCenter: { select: { id: true, code: true, name: true } }
            }
          },
          budgetPeriodFrom: { select: { id: true, year: true, month: true, label: true } },
          budgetPeriodTo: { select: { id: true, year: true, month: true, label: true } }
        }
      });

      if (!oc) {
        return reply.code(404).send({ error: "OC no encontrada" });
      }

      if (oc.estado !== "PROCESAR") {
        return reply.code(409).send({ 
          error: "OC no disponible para procesar",
          currentState: oc.estado
        });
      }

      const motivoParts: string[] = [];
      
      if (oc.support?.name) {
        motivoParts.push(`PPTO: ${oc.support.name}`);
      }
      
      const periodoText =
        oc.periodoEnFechasText ||
        formatBudgetPeriodRange(oc.budgetPeriodFrom, oc.budgetPeriodTo);
      
      if (periodoText) {
        motivoParts.push(`Periodo: ${periodoText}`);
      }
      
      if (oc.descripcion) {
        motivoParts.push(oc.descripcion);
      }
      
      if (oc.nombreSolicitante) {
        motivoParts.push(`A solicitud de ${oc.nombreSolicitante}`);
      }
      
      const motivo = motivoParts.join('\n');

      const mapped = {
        id: oc.id,
        proveedor: oc.proveedor,
        ruc: oc.ruc,
        moneda: oc.moneda,
        importeSinIgv: oc.importeSinIgv.toString(),
        descripcion: oc.descripcion || "",
        motivo: motivo || oc.comentario || "",
        articulo: oc.articulo?.code || "",
        ceco: oc.costCenters.length > 0 
          ? oc.costCenters[0].costCenter.code 
          : "",
        costCenters: oc.costCenters.map(cc => ({
          id: cc.costCenter.id,
          code: cc.costCenter.code,
          name: cc.costCenter.name
        })),
        support: oc.support,
        estado: oc.estado,
        fechaRegistro: oc.fechaRegistro.toISOString(),
        solicitudOc: oc.solicitudOc,
        incidenteOc: oc.incidenteOc,
        nombreSolicitante: oc.nombreSolicitante,
        periodoEnFechasText: periodoText
      };

      return { oc: mapped };
    } catch (err: any) {
      console.error('[RPA] Error claiming OC:', err);
      return reply.code(500).send({ 
        error: "Error al reclamar OC",
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  app.post("/rpa/ocs/:id/complete", { preHandler: requireRpaKey }, async (req, reply) => {
    try {
      const id = Number((req.params as any).id);
      
      if (isNaN(id)) {
        return reply.code(400).send({ error: "ID inválido" });
      }

      const parsed = completeOcSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(422).send({
          error: "VALIDATION_ERROR",
          issues: parsed.error.errors.map(err => ({
            path: err.path,
            message: err.message
          }))
        });
      }

      const data = parsed.data;

      const result = await prisma.$transaction(async (tx) => {
        const oc = await tx.oC.findUnique({ where: { id } });

        if (!oc) {
          throw { code: 404, message: "OC no encontrada" };
        }

        if (oc.estado !== "PROCESAR") {
          throw { 
            code: 409, 
            message: "OC no está en estado PROCESAR",
            currentState: oc.estado
          };
        }

        if (data.ok) {
          const updateData: any = {
            estado: "PROCESADO"
          };

          if (data.solicitudOc) {
            updateData.solicitudOc = data.solicitudOc;
          }
          if (data.incidenteOc) {
            updateData.incidenteOc = data.incidenteOc;
          }

          const updated = await tx.oC.update({
            where: { id },
            data: updateData,
            include: {
              support: { select: { id: true, code: true, name: true } },
              articulo: { select: { id: true, code: true, name: true } },
              costCenters: {
                include: {
                  costCenter: { select: { id: true, code: true, name: true } }
                }
              }
            }
          });

          await tx.oCStatusHistory.create({
            data: {
              ocId: id,
              status: "PROCESADO",
              note: "Procesado por RPA"
            }
          });

          return { success: true, oc: updated, message: "OC procesada exitosamente" };
        } else {
          let errorNote = "Error en procesamiento RPA";
          if (data.errorMessage) {
            errorNote = `Error RPA: ${data.errorMessage}`;
          }

          const updateData: any = {};
          
          if (data.errorMessage) {
            const currentComment = oc.comentario || "";
            const errorPrefix = `[ERROR RPA ${new Date().toISOString()}]: ${data.errorMessage}`;
            updateData.comentario = currentComment 
              ? `${errorPrefix}\n\n${currentComment}` 
              : errorPrefix;
          }

          let updated = oc;
          if (Object.keys(updateData).length > 0) {
            updated = await tx.oC.update({
              where: { id },
              data: updateData
            });
          }

          await tx.oCStatusHistory.create({
            data: {
              ocId: id,
              status: "PROCESAR",
              note: errorNote
            }
          });

          return { 
            success: false, 
            oc: updated, 
            message: "Error registrado, OC mantiene estado PROCESAR para reintento" 
          };
        }
      });

      return result;
    } catch (err: any) {
      if (err.code === 404) {
        return reply.code(404).send({ error: err.message });
      }
      if (err.code === 409) {
        return reply.code(409).send({ 
          error: err.message,
          currentState: err.currentState
        });
      }

      console.error('[RPA] Error completing OC:', err);
      return reply.code(500).send({ 
        error: "Error al completar OC",
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });
}
