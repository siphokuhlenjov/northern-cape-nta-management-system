require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function main() {
  const app = await db.application.findUnique({
    where: {
      id: "cmvr7eahq002w02vw6q74y0p3"
    },
    select: {
      id: true,
      applicationNumber: true,
      status: true,
      createdAt: true
    }
  });

  console.table(app ? [app] : []);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
