-- CreateTable
CREATE TABLE "OCStatusHistory" (
    "id" SERIAL NOT NULL,
    "ocId" INTEGER NOT NULL,
    "status" "OcStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" INTEGER,
    "note" TEXT,

    CONSTRAINT "OCStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ix_ocstatushistory_oc" ON "OCStatusHistory"("ocId");

-- CreateIndex
CREATE INDEX "ix_ocstatushistory_changed_at" ON "OCStatusHistory"("changedAt");

-- AddForeignKey
ALTER TABLE "OCStatusHistory" ADD CONSTRAINT "OCStatusHistory_ocId_fkey" FOREIGN KEY ("ocId") REFERENCES "OC"("id") ON DELETE CASCADE ON UPDATE CASCADE;
