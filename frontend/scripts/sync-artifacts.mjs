import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../out/", import.meta.url));

function artifact(name) {
  const raw = JSON.parse(readFileSync(`${root}${name}.sol/${name}.json`, "utf8"));
  return { abi: raw.abi, bytecode: raw.bytecode.object };
}

const artifacts = {
  mockToken: artifact("MockToken"),
  airdrop: artifact("Airdrop"),
};

writeFileSync(
  fileURLToPath(new URL("../lib/artifacts.json", import.meta.url)),
  JSON.stringify(artifacts, null, 2)
);
console.log("Wrote lib/artifacts.json");
