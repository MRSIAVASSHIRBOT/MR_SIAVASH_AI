import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = await readFile(
  new URL("../.github/workflows/gateway-smoke.yml", import.meta.url),
  "utf8",
);

test("Production runtime smoke rejects anonymous access to administrator routes", () => {
  assert.match(workflow, /Verify administrator routes fail closed without an Access identity/);
  for (const path of ["/admin", "/v1/admin/support/tickets"]) {
    assert.ok(workflow.includes(path), "production smoke must check " + path);
  }
  assert.match(workflow, /302\|401\|403/);
  assert.match(workflow, /GATEWAY_BASE_URL\$path/);
});
