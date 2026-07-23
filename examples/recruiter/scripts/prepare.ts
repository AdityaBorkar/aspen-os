import { p } from "@/aspen/server";

p.prepareInfra()
  .then(() => {
    console.log("Prepared");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
