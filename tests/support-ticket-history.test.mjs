import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const worker = await readFile(
  new URL("../cloudflare/gateway/src/index.js", import.meta.url),
  "utf8"
);
const tracking = await readFile(
  new URL("../support-tickets.mjs", import.meta.url),
  "utf8"
);
const styles = await readFile(
  new URL("../support.css", import.meta.url),
  "utf8"
);

test("customer and admin support views render bounded status history as text nodes", () => {
  assert.match(worker, /readTicketStatusHistory/);
  assert.match(worker, /status_history:status_history/);
  assert.match(worker, /status_history_has_more/);
  assert.match(worker, /status_history_next_cursor/);
  assert.match(worker, /decodeStatusHistoryCursor/);
  assert.match(worker, /loadOlderStatusHistory/);
  assert.match(worker, /id="statusHistory"/);
  assert.match(worker, /historyRoot\.replaceChildren\(\)/);
  assert.match(tracking, /renderTicketStatusHistory/);
  assert.match(tracking, /support-ticket-history-older/);
  assert.match(tracking, /status_cursor/);
  assert.match(tracking, /appendTicketStatusEvents/);
  assert.match(tracking, /Array\.isArray\(events\) \? events\.slice\(-50\)/);
  assert.match(tracking, /time\.dateTime = event\.created_at/);
  assert.doesNotMatch(tracking, /innerHTML\s*=/);
  assert.match(styles, /\.support-ticket-history/);
  assert.match(styles, /@media\(max-width:560px\)/);
});
