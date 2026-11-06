require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function main() {
  const id = "cmvr7eahq002w02vw6q74y0p3";

  const relations = [
    "category",
    "district",
    "school",
    "teacher",
    "documents",
    "vetting",
    "statusHistory",
    "disputes",
    "tasks"
  ];

  for (const relation of relations) {
    try {
      await db.application.findUnique({
        where: { id },
        include: { [relation]: true }
      });

      console.log("PASS:", relation);
    } catch (error) {
      console.error("FAILED:", relation);
      console.error(error.message);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
