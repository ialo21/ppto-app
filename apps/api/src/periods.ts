import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Helper: Ensure all 12 periods exist for a given year
 * Idempotent - creates only missing periods
 */
export async function ensureYearPeriods(year: number): Promise<void> {
  if (!year || year < 2000 || year > 2100) {
    throw new Error(`Invalid year: ${year}`);
  }

  // Check which months already exist
  const existing = await prisma.period.findMany({
    where: { year },
    select: { month: true }
  });

  const existingMonths = new Set(existing.map(p => p.month));
  const missingMonths = [];

  for (let month = 1; month <= 12; month++) {
    if (!existingMonths.has(month)) {
      missingMonths.push(month);
    }
  }

  // Create missing periods
  if (missingMonths.length > 0) {
    await prisma.period.createMany({
      data: missingMonths.map(month => ({
        year,
        month,
        label: null
      })),
      skipDuplicates: true
    });

    console.log(`[ensureYearPeriods] Created ${missingMonths.length} periods for year ${year}: months ${missingMonths.join(', ')}`);
  }
}

