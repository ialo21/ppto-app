-- CreateEnum
CREATE TYPE "OcStatus" AS ENUM ('PENDIENTE', 'PROCESAR', 'PROCESADO', 'APROBACION_VP', 'ANULAR', 'ANULADO', 'ATENDER_COMPRAS', 'ATENDIDO');

-- CreateTable
CREATE TABLE "Articulo" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Articulo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OC" (
    "id" SERIAL NOT NULL,
    "budgetPeriodFromId" INTEGER NOT NULL,
    "budgetPeriodToId" INTEGER NOT NULL,
    "incidenteOc" TEXT,
    "solicitudOc" TEXT,
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supportId" INTEGER NOT NULL,
    "periodoEnFechasText" TEXT,
    "descripcion" TEXT,
    "nombreSolicitante" TEXT NOT NULL,
    "correoSolicitante" TEXT NOT NULL,
    "proveedor" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "moneda" TEXT NOT NULL,
    "importeSinIgv" DECIMAL(65,30) NOT NULL,
    "estado" "OcStatus" NOT NULL DEFAULT 'PENDIENTE',
    "numeroOc" TEXT,
    "comentario" TEXT,
    "articuloId" INTEGER,
    "cecoId" INTEGER,
    "linkCotizacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OC_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Articulo_code_key" ON "Articulo"("code");

-- CreateIndex
CREATE UNIQUE INDEX "OC_numeroOc_key" ON "OC"("numeroOc");

-- CreateIndex
CREATE INDEX "ix_oc_support" ON "OC"("supportId");

-- CreateIndex
CREATE INDEX "ix_oc_estado" ON "OC"("estado");

-- CreateIndex
CREATE INDEX "ix_oc_fecha_registro" ON "OC"("fechaRegistro");

-- AddForeignKey
ALTER TABLE "OC" ADD CONSTRAINT "OC_budgetPeriodFromId_fkey" FOREIGN KEY ("budgetPeriodFromId") REFERENCES "Period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OC" ADD CONSTRAINT "OC_budgetPeriodToId_fkey" FOREIGN KEY ("budgetPeriodToId") REFERENCES "Period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OC" ADD CONSTRAINT "OC_supportId_fkey" FOREIGN KEY ("supportId") REFERENCES "Support"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OC" ADD CONSTRAINT "OC_articuloId_fkey" FOREIGN KEY ("articuloId") REFERENCES "Articulo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OC" ADD CONSTRAINT "OC_cecoId_fkey" FOREIGN KEY ("cecoId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;


