-- CreateTable
CREATE TABLE "Management" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Management_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "managementId" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Management_code_key" ON "Management"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Area_code_key" ON "Area"("code");

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_managementId_fkey" FOREIGN KEY ("managementId") REFERENCES "Management"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add new FK columns to Support (nullable for backward compatibility)
ALTER TABLE "Support" ADD COLUMN "managementId" INTEGER;
ALTER TABLE "Support" ADD COLUMN "areaId" INTEGER;

-- AddForeignKey
ALTER TABLE "Support" ADD CONSTRAINT "Support_managementId_fkey" FOREIGN KEY ("managementId") REFERENCES "Management"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Support" ADD CONSTRAINT "Support_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

