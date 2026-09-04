import { readFileSync } from "node:fs";
import { validateCatalogComponents } from "../src/lib/catalog/validate";

const raw = readFileSync(
  new URL(
    "../src/lib/catalog/__fixtures__/all-stock-statuses.json",
    import.meta.url,
  ),
  "utf8",
);
const parsed = JSON.parse(raw);
const result = validateCatalogComponents(parsed.components);
if (!result.ok) {
  for (const issue of result.issues) {
    // biome-ignore lint/suspicious/noConsole: CLI helper writes validation issues to stdout for `node scripts/check-issues.ts` invocation.
    console.log(issue.path, "->", issue.message);
  }
} else {
  // biome-ignore lint/suspicious/noConsole: CLI helper reports the validation verdict to stdout.
  console.log("VALID");
}
