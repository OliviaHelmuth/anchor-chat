import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./config";

// `next build` against a non-default distDir (.next-test) auto-adds
// `.next-test/**` entries to the committed tsconfig.json's `include` array
// every time it runs — a harmless but noisy side effect of Next's own
// "reconfigure tsconfig for this build output" step. Strip them back out so
// a local integration/E2E test run doesn't leave a dirty tsconfig.json
// behind. Run standalone (npx tsx integration/prune-tsconfig.ts) right after
// `next build` in any script that builds into .next-test.
export function pruneTestBuildTypesFromTsconfig(): void {
  const tsconfigPath = path.join(REPO_ROOT, "tsconfig.json");
  const raw = readFileSync(tsconfigPath, "utf-8");
  // Line-based removal, not a JSON parse/stringify round trip — this file is
  // hand-formatted and committed; a full re-dump would reformat unrelated
  // parts of it (array line-wrapping, etc.) as a side effect of every test run.
  const lines = raw.split("\n");
  const pruned = lines.filter((line) => !line.trim().startsWith('".next-test/'));
  if (pruned.length === lines.length) return;
  // Drop a now-dangling trailing comma on the line before a removed entry.
  for (let i = 0; i < pruned.length - 1; i++) {
    const current = pruned[i].trimEnd();
    const next = pruned[i + 1].trim();
    if (current.endsWith(",") && (next === "]" || next === "],")) {
      pruned[i] = current.slice(0, -1);
    }
  }
  writeFileSync(tsconfigPath, pruned.join("\n"));
}

if (require.main === module) {
  pruneTestBuildTypesFromTsconfig();
}
