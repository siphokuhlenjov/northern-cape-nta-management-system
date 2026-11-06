require('dotenv').config();
const readline = require('readline');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = q => new Promise(resolve => rl.question(q, resolve));
(async () => {
  try {
    const email = (await ask('Staff email: ')).trim().toLowerCase();
    const role = (await ask('Role (DISTRICT_ADMIN / PROVINCIAL_OFFICIAL / SYSTEM_ADMIN): ')).trim().toUpperCase();
    if (!['DISTRICT_ADMIN','PROVINCIAL_OFFICIAL','SYSTEM_ADMIN'].includes(role)) throw new Error('Invalid staff role.');
    let districtId = null;
    if (role === 'DISTRICT_ADMIN') {
      const districts = await prisma.district.findMany({ orderBy: { name: 'asc' } });
      if (!districts.length) throw new Error('No districts found. Run npm run db:seed first.');
      console.log('Available districts:'); districts.forEach((d,i)=>console.log(`${i+1}. ${d.name}`));
      const choice = Number(await ask('Select district number: '));
      if (!Number.isInteger(choice) || choice < 1 || choice > districts.length) throw new Error('Invalid district selection.');
      districtId = districts[choice-1].id;
    }
    const password = await ask('Temporary password (12+ characters; input is visible): ');
    if (password.length < 12) throw new Error('Password must contain at least 12 characters.');
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw new Error('That email is already registered.');
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { email, passwordHash, role, districtId } });
    console.log(`Created ${user.role} account for ${user.email}. Store credentials securely and change the temporary password through an approved process.`);
  } catch (e) { console.error(`Could not create staff account: ${e.message}`); process.exitCode = 1; }
  finally { rl.close(); await prisma.$disconnect(); }
})();
