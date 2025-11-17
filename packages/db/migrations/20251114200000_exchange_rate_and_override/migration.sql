-- CreateTable: ExchangeRate para TC anual
CREATE TABLE "ExchangeRate" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: year único
CREATE UNIQUE INDEX "ExchangeRate_year_key" ON "ExchangeRate"("year");

-- AlterTable: agregar exchangeRateOverride en Invoice
ALTER TABLE "Invoice" ADD COLUMN "exchangeRateOverride" DECIMAL(65,30);

