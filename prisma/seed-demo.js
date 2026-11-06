"use strict";
// OPTIONAL demo data for presentations: npm run db:seed:demo
// Creates clearly-labelled DEMO schools, an OPEN demo award cycle and demo staff accounts.
// These are NOT official schools or people. Never use this on a real/production database.
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to create demo data when NODE_ENV=production.");
  process.exit(1);
}

const PASSWORD = process.env.DEMO_PASSWORD || "DemoPassw0rd!2026";
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

(async () => {
  const districts = await prisma.district.findMany({ orderBy: { name: "asc" } });
  if (!districts.length) throw new Error("No districts found. Run: npm run db:seed first.");

  // Demo schools (EMIS numbers are fake and start with DEMO-)
  let schools = 0;
  for (const [i, d] of districts.entries()) {
    const code = String(i + 1).padStart(2, "0");
    for (const [type, n] of [["Primary", "P"], ["Secondary", "S"]]) {
      await prisma.school.upsert({
        where: { emisNumber: `DEMO-${code}-${n}` },
        update: {},
        create: { name: `DEMO ${type} School (${d.name})`, emisNumber: `DEMO-${code}-${n}`, schoolType: type, districtId: d.id, quintile: "3", urbanRural: "Urban" }
      });
      schools++;
    }
  }

  // Open demo cycle
  const now = Date.now();
  const cycle = await prisma.awardCycle.upsert({
    where: { name: "DEMO 2026 Cycle" },
    update: { status: "OPEN", opensAt: new Date(now - 86400000), closesAt: new Date(now + 45 * 86400000) },
    create: { name: "DEMO 2026 Cycle", year: 2026, status: "OPEN", opensAt: new Date(now - 86400000), closesAt: new Date(now + 45 * 86400000), notes: "Demo cycle for presentations only." }
  });

  // Demo staff accounts
  const hash = await bcrypt.hash(PASSWORD, 12);
  const accounts = [
    { email: "admin@demo.nta.test", role: "SYSTEM_ADMIN", districtId: null },
    { email: "provincial@demo.nta.test", role: "PROVINCIAL_OFFICIAL", districtId: null },
    ...districts.map(d => ({ email: `district.${slug(d.name)}@demo.nta.test`, role: "DISTRICT_ADMIN", districtId: d.id }))
  ];
  for (const a of accounts) {
    await prisma.user.upsert({
      where: { email: a.email },
      update: { passwordHash: hash, role: a.role, districtId: a.districtId, active: true },
      create: { ...a, passwordHash: hash }
    });
  }

  console.log(`\nDemo data ready: ${schools} demo schools, open cycle "${cycle.name}" (closes ${cycle.closesAt.toISOString().slice(0, 10)}).`);
  console.log("\nDemo staff logins (password for all: " + PASSWORD + ")");
  console.table(accounts.map(a => ({ email: a.email, role: a.role })));
  console.log("Teachers: register live on the home page during the demo.\n");
})().catch(e => { console.error("Demo seed failed:", e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
