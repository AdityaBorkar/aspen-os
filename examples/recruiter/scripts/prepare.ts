import { f } from "@/aspen/server";

f.prepare()
  .then(() => {
    console.log("Prepared");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
