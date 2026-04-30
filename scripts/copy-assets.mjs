import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const assets = [
  {
    from: resolve("wxo.svg"),
    to: resolve("dist/nodes/WatsonxOrchestrate/wxo.svg"),
  },
];

for (const asset of assets) {
  mkdirSync(dirname(asset.to), { recursive: true });
  copyFileSync(asset.from, asset.to);
}

console.log(`Copied ${assets.length} asset(s) to dist.`);
