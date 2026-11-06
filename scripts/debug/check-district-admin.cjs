require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function main() {
  const users = await db.user.findMany({
    where: {
      role: "DISTRICT_ADMIN"
    },
    select: {
      id: true,
      email: true,
      role: true,
      districtId: true,
      active: true
    }
  });

  console.table(users);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
