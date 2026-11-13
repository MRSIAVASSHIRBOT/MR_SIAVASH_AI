import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = await readFile(
  new URL("../.github/workflows/deploy.yml", import.meta.url),
  "utf8",
);

test("GitHub Pages publication is manual-only while quality checks stay on push", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /push:\s*\n\s*branches:\s*\n\s*- main/);
  assert.match(
    workflow,
    /if:\s*github\.ref == 'refs\/heads\/main' && github\.event_name == 'workflow_dispatch'/,
  );
  assert.doesNotMatch(workflow, /github\.event_name != 'pull_request'/);
});
