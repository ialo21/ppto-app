import { FastifyInstance } from "fastify";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const exchangeRateSchema = z.object({
  id: z.number().int().positive().optional(),
  year: z.number().int().min(2020).max(2050),
  rate: z.number().positive().refine(val => val > 0 && val < 100, {
    message: "El tipo de cambio debe estar entre 0 y 100"
  })
});

export async function registerExchangeRateRoutes(app: FastifyInstance) {
  // GET: Obtener todos los tipos de cambio anuales
  app.get("/exchange-rates", async () => {
    return prisma.exchangeRate.findMany({ orderBy: { year: "desc" } });
  });

  // GET: Obtener tipo de cambio por año
  app.get("/exchange-rates/year/:year", async (req, reply) => {
    const year = Number((req.params as any).year);
    if (!year || year < 2020 || year > 2050) {
      return reply.code(400).send({ error: "Año inválido" });
    }
    const rate = await prisma.exchangeRate.findUnique({ where: { year } });
    if (!rate) {
      return reply.code(404).send({ error: `No se encontró tipo de cambio para el año ${year}` });
    }
    return rate;
  });

  // POST: Crear nuevo tipo de cambio anual
  app.post("/exchange-rates", async (req, reply) => {
    const parsed = exchangeRateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Datos inválidos",
        issues: parsed.error.issues
      });
    }

    try {
      const created = await prisma.exchangeRate.create({
        data: {
          year: parsed.data.year,
          rate: parsed.data.rate
        }
      });
      return created;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return reply.code(409).send({ error: `Ya existe un tipo de cambio para el año ${parsed.data.year}` });
      }
      console.error("Error al crear tipo de cambio:", err);
      return reply.code(500).send({ error: "Error interno al crear tipo de cambio" });
    }
  });

  // PUT: Actualizar tipo de cambio existente
  app.put("/exchange-rates/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    const parsed = exchangeRateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Datos inválidos",
        issues: parsed.error.issues
      });
    }

    try {
      const updated = await prisma.exchangeRate.update({
        where: { id },
        data: {
          year: parsed.data.year,
          rate: parsed.data.rate
        }
      });
      return updated;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        return reply.code(404).send({ error: "Tipo de cambio no encontrado" });
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return reply.code(409).send({ error: `Ya existe un tipo de cambio para el año ${parsed.data.year}` });
      }
      console.error("Error al actualizar tipo de cambio:", err);
      return reply.code(500).send({ error: "Error interno al actualizar tipo de cambio" });
    }
  });

  // DELETE: Eliminar tipo de cambio
  app.delete("/exchange-rates/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    try {
      await prisma.exchangeRate.delete({ where: { id } });
      return { ok: true };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        return reply.code(404).send({ error: "Tipo de cambio no encontrado" });
      }
      console.error("Error al eliminar tipo de cambio:", err);
      return reply.code(500).send({ error: "Error interno al eliminar tipo de cambio" });
    }
  });
}

