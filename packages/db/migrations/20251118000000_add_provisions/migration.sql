-- CreateTable
CREATE TABLE "Provision" (
    "id" SERIAL NOT NULL,
    "sustentoId" INTEGER NOT NULL,
    "periodoPpto" TEXT NOT NULL,
    "periodoContable" TEXT NOT NULL,
    "montoPen" DECIMAL(65,30) NOT NULL,
    "detalle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ix_provision_sustento" ON "Provision"("sustentoId");

-- CreateIndex
CREATE INDEX "ix_provision_periodo_ppto" ON "Provision"("periodoPpto");

-- CreateIndex
CREATE INDEX "ix_provision_periodo_contable" ON "Provision"("periodoContable");

-- AddForeignKey
ALTER TABLE "Provision" ADD CONSTRAINT "Provision_sustentoId_fkey" FOREIGN KEY ("sustentoId") REFERENCES "Support"("id") ON DELETE CASCADE ON UPDATE CASCADE;

