import { rm } from "fs/promises";
import { resolve } from "path";

const OUTPUT = resolve(process.cwd(), "../htdocs/luci-static/shadcn");
const RESOURCES = resolve(process.cwd(), "../htdocs/luci-static/resources");

await rm(OUTPUT, { recursive: true, force: true });
await rm(RESOURCES, { recursive: true, force: true });
console.log("Cleaned build output.");
