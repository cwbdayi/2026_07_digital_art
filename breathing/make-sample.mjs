import { writeFile } from "node:fs/promises";
import { renderDemoWave } from "./wave.js";

const data = renderDemoWave();
const target = new URL("./sample-wave.json", import.meta.url);
await writeFile(target, `${JSON.stringify(data)}\n`);
console.log(`wrote ${data.samples.length} samples, ${data.duration}s -> ${target.pathname}`);
