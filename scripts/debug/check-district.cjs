require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function main() {
  const district = await db.district.findUnique({
    where: { id: "cmvo7nlmv000f026g1fn8hylq" },
    select: { id: true, name: true }
  });

  console.table(district ? [district] : []);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
