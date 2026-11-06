"use strict";
// Run with: npm run doctor
// Checks the local setup and tells you exactly what to fix. Never prints passwords or secrets.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
let problems = 0, warnings = 0;
const ok = m => console.log("  \u2714 " + m);
const bad = (m, fix) => { problems++; console.log("  \u2716 " + m); if (fix) console.log("      \u2192 Fix: " + fix); };
const warn = (m, fix) => { warnings++; console.log("  \u26A0 " + m); if (fix) console.log("      \u2192 " + fix); };

(async () => {
  console.log("\nNTA setup check\n");
  console.log("Environment");
  if (!fs.existsSync(path.join(__dirname, "..", ".env"))) bad(".env file is missing", "Copy .env.example to .env and edit it");
  else ok(".env file found");

  const url = process.env.DATABASE_URL || "";
  if (!url) bad("DATABASE_URL is not set", "Set it in .env");
  else {
    try {
      const u = new URL(url);
      ok(`DATABASE_URL points to ${u.hostname}:${u.port || 5432}/${u.pathname.slice(1)} as user "${decodeURIComponent(u.username)}"`);
      if (/CHANGE_ME/i.test(url)) bad("DATABASE_URL still contains the CHANGE_ME placeholder password", "Put your real PostgreSQL password in .env (URL-encode special characters such as @ as %40)");
    } catch { bad("DATABASE_URL is not a valid URL", 'Format: postgresql://USER:PASSWORD@localhost:5432/DBNAME?schema=public'); }
  }
  const secret = process.env.SESSION_SECRET || "";
  if (secret.length < 32 || /replace-with/i.test(secret)) warn("SESSION_SECRET is short or still the placeholder", "Use a long random value (32+ characters)");
  else ok("SESSION_SECRET looks strong");
  ok(`NODE_ENV=${process.env.NODE_ENV || "(not set)"}  PORT=${process.env.PORT || 3000}`);

  console.log("\nDatabase");
  let connected = false;
  try { await prisma.$queryRaw`SELECT 1`; connected = true; ok("Connected to PostgreSQL"); }
  catch (e) {
    const code = e.code || "";
    if (code === "P1000") bad("PostgreSQL rejected the username/password", "Check the user and password in DATABASE_URL (pgAdmin login must match)");
    else if (code === "P1001") bad("Cannot reach PostgreSQL", "Start the PostgreSQL service and check host/port in DATABASE_URL");
    else if (code === "P1003") bad("The database does not exist", "Create it in pgAdmin: CREATE DATABASE nta_northern_cape;");
    else bad("Could not connect: " + String(e.message).split("\n").filter(Boolean).pop(), "Check DATABASE_URL and that PostgreSQL is running");
  }

  if (connected) {
    const tryCount = async (label, fn, minOk, fixIfLow) => {
      try {
        const n = await fn();
        if (n >= minOk) ok(`${label}: ${n}`); else warn(`${label}: ${n}`, fixIfLow);
        return n;
      } catch (e) {
        bad(`${label}: table missing or out of date`, "Stop the server, then run: npx prisma generate && npx prisma db push");
        return null;
      }
    };
    await tryCount("Award categories", () => prisma.ntaCategory.count(), 15, "Run: npm run db:seed");
    await tryCount("Districts", () => prisma.district.count(), 5, "Run: npm run db:seed");
    await tryCount("Schools in directory", () => prisma.school.count(), 1, "Teachers cannot start an application without schools. Add them in the School Directory screen, or for a demo run: npm run db:seed:demo");
    try {
      const open = await prisma.awardCycle.findFirst({ where: { status: "OPEN" } });
      if (!open) warn("No OPEN award cycle", "Teachers cannot create applications. Create/open one in the Award cycles screen, or for a demo run: npm run db:seed:demo");
      else {
        const now = new Date();
        if (open.closesAt && open.closesAt < now) warn(`Cycle "${open.name}" is OPEN but its closing date has passed`, "Edit the closing date in Award cycles");
        else if (open.opensAt && open.opensAt > now) warn(`Cycle "${open.name}" is OPEN but has not reached its opening date`, "Edit the opening date in Award cycles");
        else ok(`Open award cycle: ${open.name}`);
      }
    } catch { bad("AwardCycle table missing or out of date", "Run: npx prisma generate && npx prisma db push"); }
    try {
      const groups = await prisma.user.groupBy({ by: ["role"], _count: { _all: true } });
      const by = Object.fromEntries(groups.map(g => [g.role, g._count._all]));
      ok(`Accounts: ${Object.entries(by).map(([r, n]) => `${r}=${n}`).join(", ") || "none yet"}`);
      for (const r of ["SYSTEM_ADMIN", "PROVINCIAL_OFFICIAL", "DISTRICT_ADMIN"]) if (!by[r]) warn(`No ${r} account`, "Create one with: npm run staff:create (or npm run db:seed:demo for demo accounts)");
    } catch { bad("User table missing or out of date", "Run: npx prisma generate && npx prisma db push"); }
    try { await prisma.passwordResetToken.count(); ok("Password-reset table present"); }
    catch { bad("Password-reset table missing (Forgot password will not work)", "Stop the server, then run: npx prisma generate && npx prisma db push"); }
  }

  console.log(`\n${problems ? "\u2716 " + problems + " problem(s) to fix" : "\u2714 No blocking problems"}${warnings ? `, ${warnings} warning(s)` : ""}.\n`);
  await prisma.$disconnect();
  process.exit(problems ? 1 : 0);
})().catch(async e => { console.error("Doctor crashed:", e.message); await prisma.$disconnect(); process.exit(1); });
