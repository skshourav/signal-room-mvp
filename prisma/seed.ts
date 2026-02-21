import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash("admin123", 10);
  const clientPass = await bcrypt.hash("client123", 10);

  await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: {},
    create: { email: "admin@test.com", password: adminPass, role: "ADMIN" },
  });

  const client = await prisma.user.upsert({
    where: { email: "client@test.com" },
    update: {},
    create: { email: "client@test.com", password: clientPass, role: "CLIENT" },
  });

  // Create a client account + risk profile if missing
  const existingAccount = await prisma.clientAccount.findFirst({
    where: { userId: client.id },
  });

  if (!existingAccount) {
    await prisma.clientAccount.create({
      data: {
        userId: client.id,
        name: "Main",
        startingBalance: 10000,
        currentEquity: 10000,

        phase1TargetPct: 8,
        phase2TargetPct: 5,
        maxLossPct: 10,

        riskProfile: { create: { riskPercent: 1.0 } },

      },
    });
  }

  // Sessions
  await prisma.session.upsert({
    where: { id: "london-session" },
    update: {},
    create: {
      id: "london-session",
      name: "London",
      timezone: "Europe/London",
      startTime: "08:00",
      endTime: "11:00",
    },
  });

  await prisma.session.upsert({
    where: { id: "ny-session" },
    update: {},
    create: {
      id: "ny-session",
      name: "NY",
      timezone: "America/New_York",
      startTime: "08:00",
      endTime: "11:00",
    },
  });

  console.log("Seed complete ✅");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
