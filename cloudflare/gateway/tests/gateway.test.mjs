import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";
const req=(path,options={})=>new Request("https://gateway.example.test"+path,options);
const env={ALLOWED_ORIGINS:"https://app.example.test"};
function db(){return{prepare(sql){if(sql==="SELECT 1 AS ok")return{first:async()=>({ok:1})};throw new Error("unexpected SQL in route test");}};}
test("liveness is independent of D1",async()=>{const r=await worker.fetch(req("/v1/health/live"),{});assert.equal(r.status,200);assert.equal((await r.json()).status,"ok");assert.ok(r.headers.get("x-request-id"));});
test("readiness requires the D1 binding",async()=>{assert.equal((await worker.fetch(req("/v1/health/ready"),{})).status,503);assert.equal((await worker.fetch(req("/v1/health/ready"),{DB:db()})).status,200);});
test("CORS allows only exact origin and approved methods and headers",async()=>{const r=await worker.fetch(req("/v1/health/live",{method:"OPTIONS",headers:{Origin:"https://app.example.test","Access-Control-Request-Method":"POST","Access-Control-Request-Headers":"content-type,authorization,x-request-id"}}),env);assert.equal(r.status,204);assert.equal(r.headers.get("access-control-allow-methods"),"GET, POST, PATCH");assert.equal(r.headers.get("access-control-allow-credentials"),"true");const bad=await worker.fetch(req("/v1/health/live",{method:"OPTIONS",headers:{Origin:"https://evil.test","Access-Control-Request-Method":"DELETE"}}),env);assert.equal(bad.status,403);assert.equal(bad.headers.get("access-control-allow-origin"),null);});
test("unknown routes and unsupported methods fail closed",async()=>{assert.equal((await worker.fetch(req("/v1/nope"),{})).status,404);assert.equal((await worker.fetch(req("/v1/health/live",{method:"DELETE"}),{})).status,405);});
test("assistant validates input and fails closed without database",async()=>{const r=await worker.fetch(req("/v1/assistant/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:"سلام"})}),{});assert.equal(r.status,503);});
test("admin dashboard and APIs reject requests without verified Access JWT",async()=>{const page=await worker.fetch(req("/admin"),{});assert.equal(page.status,401);const r=await worker.fetch(req("/v1/admin/support/tickets"),{DB:db()});assert.equal(r.status,401);assert.equal((await r.json()).error.code,"admin_auth_required");});

function createAccessJwt(privateKey, overrides = {}) {
 const now = Math.floor(Date.now() / 1000);
 const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "preview-test-key" })).toString("base64url");
 const claims = {
  iss: "https://preview-team.cloudflareaccess.com",
  aud: ["preview-aud"],
  exp: now + 300,
  nbf: now - 30,
  email: "admin@example.test",
  ...overrides
 };
 const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
 const signingInput = header + "." + payload;
 return signingInput + "." + sign("RSA-SHA256", Buffer.from(signingInput), privateKey).toString("base64url");
}

test("admin routes accept only a valid signed Access JWT for the configured audience and allowlisted identity", async () => {
 const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
 const jwk = {
  ...publicKey.export({ format: "jwk" }),
  kid: "preview-test-key",
  alg: "RS256",
  use: "sig"
 };
 const originalFetch = globalThis.fetch;
 globalThis.fetch = async url => {
  assert.equal(String(url), "https://preview-team.cloudflareaccess.com/cdn-cgi/access/certs");
  return new Response(JSON.stringify({ keys: [jwk] }), {
   status: 200,
   headers: { "Content-Type": "application/json" }
  });
 };
 const env = {
  CF_ACCESS_TEAM_DOMAIN: "preview-team.cloudflareaccess.com",
  CF_ACCESS_AUD: "preview-aud",
  ADMIN_EMAILS: "ADMIN@example.test",
  DB: { prepare() { return { all: async () => ({ results: [] }) }; } }
 };
 try {
  const valid = createAccessJwt(privateKey);
  const page = await worker.fetch(req("/admin", {
   headers: { "Cf-Access-Jwt-Assertion": valid }
  }), env);
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type") || "", /text\/html/i);
  assert.match(await page.text(), /SUPPORT CONSOLE/);

  const api = await worker.fetch(req("/v1/admin/support/tickets", {
   headers: { "Cf-Access-Jwt-Assertion": valid }
  }), env);
  assert.equal(api.status, 200);
  assert.deepEqual((await api.json()).tickets, []);

  const rejected = [
   createAccessJwt(privateKey, { iss: "https://attacker.cloudflareaccess.com" }),
   createAccessJwt(privateKey, { aud: ["wrong-audience"] }),
   createAccessJwt(privateKey, { exp: Math.floor(Date.now() / 1000) - 1 }),
   createAccessJwt(privateKey, { nbf: Math.floor(Date.now() / 1000) + 60 }),
   createAccessJwt(privateKey, { email: "intruder@example.test" })
  ];
  for (const token of rejected) {
   const response = await worker.fetch(req("/v1/admin/support/tickets", {
    headers: { "Cf-Access-Jwt-Assertion": token }
   }), env);
   assert.equal(response.status, 401);
  }

  const [header, payload, signature] = valid.split(".");
  const changedSignature = (signature[0] === "A" ? "B" : "A") + signature.slice(1);
  const forged = await worker.fetch(req("/admin", {
   headers: { "Cf-Access-Jwt-Assertion": header + "." + payload + "." + changedSignature }
  }), env);
  assert.equal(forged.status, 401);
 } finally {
  globalThis.fetch = originalFetch;
 }
});

test("admin routes fail closed when the Access signing-key endpoint is unavailable", async () => {
 const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
 const originalFetch = globalThis.fetch;
 globalThis.fetch = async () => { throw new Error("simulated key service outage"); };
 try {
  const response = await worker.fetch(req("/v1/admin/support/tickets", {
   headers: { "Cf-Access-Jwt-Assertion": createAccessJwt(privateKey) }
  }), {
   CF_ACCESS_TEAM_DOMAIN: "preview-team.cloudflareaccess.com",
   CF_ACCESS_AUD: "preview-aud",
   ADMIN_EMAILS: "admin@example.test",
   DB: { prepare() { return { all: async () => ({ results: [] }) }; } }
  });
  assert.equal(response.status, 401);
 } finally {
  globalThis.fetch = originalFetch;
 }
});

test("scheduled cleanup fails closed when no retention period is configured",async()=>{
 let batches=0;
 const DB={prepare(){throw new Error("cleanup must not prepare SQL without an approved retention period");},batch(){batches++;}};
 await assert.rejects(worker.scheduled({}, {DB}),/SUPPORT_RETENTION_DAYS must be explicitly configured/);
 assert.equal(batches,0);
});
test("scheduled cleanup applies the configured 30-day inactivity window",async()=>{
 const statements=[];
 const DB={
  prepare(sql){return{bind(...values){const statement={sql,values};statements.push(statement);return statement;}};},
  async batch(items){assert.equal(items.length,3);return items;}
 };
 await worker.scheduled({}, {DB,SUPPORT_RETENTION_DAYS:"30"});
 assert.equal(statements.length,3);
 assert.match(statements[0].sql,/DELETE FROM support_tickets WHERE updated_at < \?/);
 const cutoff=Date.parse(statements[0].values[0]);
 assert.ok(Number.isFinite(cutoff));
 assert.ok(Math.abs((Date.now()-cutoff)-30*86400000)<5000);
});
test("ticket creation validates email before touching D1",async()=>{const r=await worker.fetch(req("/v1/support/tickets",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({subject:"سؤال",message:"سلام",contact_email:"invalid"})}),{DB:db(),SUPPORT_RETENTION_DAYS:"90"});assert.equal(r.status,400);});
test("public ticket reads require a bearer token",async()=>{const r=await worker.fetch(req("/v1/support/tickets/MS-ABC1234567"),{DB:db()});assert.equal(r.status,404);});
test("request body limits are enforced",async()=>{const r=await worker.fetch(req("/v1/assistant/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:"x".repeat(13000)})}),{DB:db()});assert.equal(r.status,413);});

function rateDb(){return{prepare(){return{bind(){return this;},first:async()=>({request_count:1})};}};}
test("assistant defaults to the multilingual free-tier model and returns grounded sources",async()=>{
 let selectedModel=null;
 const response=await worker.fetch(req("/v1/assistant/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:"آموزش پایتون"})}),{
  DB:rateDb(),
  AI:{run:async(model,input)=>{selectedModel=model;assert.ok(input.messages.some(x=>x.role==="system"&&x.content.includes("Verified website context")));return{response:"دوره پایتون شامل ۱۲ درس است."};}}
 });
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(selectedModel,"@cf/zai-org/glm-4.7-flash");
 assert.equal(data.mode,"ai_grounded");
 assert.ok(data.sources.some(x=>x.href==="./python.html"));
});
test("assistant hands off questions with no verified site context",async()=>{
 let called=false;
 const response=await worker.fetch(req("/v1/assistant/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:"آمار ترافیک روزانه و تعداد بازدیدکنندگان"})}),{
  DB:rateDb(),AI:{run:async()=>{called=true;return{response:"guess"};}}
 });
 const data=await response.json();
 assert.equal(response.status,200);
 assert.equal(data.handoff,true);
 assert.equal(called,false);
});

test("assistant knowledge distinguishes roadmap modules from active local modules",async()=>{
 const response=await worker.fetch(req("/v1/assistant/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:"Secure Lab"})}),{DB:rateDb()});
 const data=await response.json();
 assert.equal(response.status,200);
 assert.equal(data.mode,"knowledge_fallback");
 assert.match(data.answer,/نقشه راه/);
});


import { createHash, generateKeyPairSync, sign } from "node:crypto";

function supportDb() {
 const tickets = new Map();
 const messages = [];
 const rates = new Map();
 const db = {
  prepare(sql) {
   let values = [];
   return {
    sql,
    get values() { return values; },
    bind(...args) { values = args; return this; },
    async first() {
     if (sql.startsWith("INSERT INTO api_rate_limits")) {
      const bucket = values[0];
      const count = (rates.get(bucket) || 0) + 1;
      rates.set(bucket, count);
      return { request_count: count };
     }
     if (sql.startsWith("SELECT id,ticket_code,category,subject,status,created_at,updated_at FROM support_tickets WHERE ticket_code=? AND access_token_hash=?")) {
      const [code, hash] = values;
      return [...tickets.values()].find(ticket => ticket.ticket_code === code && ticket.access_token_hash === hash) || null;
     }
     return null;
    },
    async all() {
     if (sql.startsWith("SELECT sender_role,body,created_at FROM support_messages WHERE ticket_id=?")) {
      return { results: messages.filter(message => message.ticket_id === values[0]).map(({ sender_role, body, created_at }) => ({ sender_role, body, created_at })) };
     }
     return { results: [] };
    }
   };
  },
  async batch(statements) {
   for (const statement of statements) {
    const values = statement.values;
    if (statement.sql.startsWith("INSERT INTO support_tickets")) {
     const [id, ticket_code, access_token_hash, category, subject, contact_email, created_at, updated_at] = values;
     tickets.set(id, { id, ticket_code, access_token_hash, category, subject, contact_email, status: "open", created_at, updated_at });
    } else if (statement.sql.startsWith("INSERT INTO support_messages")) {
     const isPublicReply = statement.sql.includes("VALUES(?,?, 'user',?,?)");
     const [id, ticket_id, roleOrBody, bodyOrCreated, createdAt] = values;
     messages.push(isPublicReply
      ? { id, ticket_id, sender_role: "user", body: roleOrBody, created_at: bodyOrCreated }
      : { id, ticket_id, sender_role: roleOrBody, body: bodyOrCreated, created_at: createdAt });
    } else if (statement.sql.startsWith("UPDATE support_tickets SET status='open'")) {
     const [updated_at, id] = values;
     const ticket = tickets.get(id);
     if (ticket) { ticket.status = "open"; ticket.updated_at = updated_at; }
    }
   }
   return [];
  }
 };
 return { db, tickets, messages };
}

test("support ticket credentials are stored as hashes and authorize private follow-up", async () => {
 const store = supportDb();
 const created = await worker.fetch(req("/v1/support/tickets", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ category: "question", subject: "پرسش آزمایشی", message: "سلام، این یک آزمون است.", consent: true })
 }), { DB: store.db, SUPPORT_RETENTION_DAYS: "90" });
 assert.equal(created.status, 201);
 const data = await created.json();
 const { id, code, token: secret } = data.ticket;
 assert.match(code, /^MS-[A-F0-9]{16}$/);
 assert.match(secret, /^[a-f0-9]{64}$/);
 assert.equal(data.ticket.retention_days,90);
 const stored = store.tickets.get(id);
 assert.ok(stored);
 assert.notEqual(stored.access_token_hash, secret);
 assert.equal(stored.access_token_hash, createHash("sha256").update(secret).digest("hex"));

 const denied = await worker.fetch(req("/v1/support/tickets/" + code), { DB: store.db });
 assert.equal(denied.status, 404);

 const read = await worker.fetch(req("/v1/support/tickets/" + code, {
  headers: { Authorization: "Bearer " + secret }
 }), { DB: store.db });
 assert.equal(read.status, 200);
 const privateData = await read.json();
 assert.equal(privateData.ticket.id, id);
 assert.equal(privateData.messages.length, 1);
 assert.equal(privateData.messages[0].body, "سلام، این یک آزمون است.");

 stored.status = "resolved";
 const reply = await worker.fetch(req("/v1/support/tickets/" + code + "/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: "Bearer " + secret },
  body: JSON.stringify({ message: "ممنون از پاسخ‌گویی." })
 }), { DB: store.db });
 assert.equal(reply.status, 201);
 assert.equal(stored.status, "open");

 const afterReply = await worker.fetch(req("/v1/support/tickets/" + code, {
  headers: { Authorization: "Bearer " + secret }
 }), { DB: store.db });
 const updated = await afterReply.json();
 assert.equal(updated.messages.length, 2);
 assert.equal(updated.messages[1].body, "ممنون از پاسخ‌گویی.");
});

test("assistant rate limits are enforced before invoking Workers AI", async () => {
 let called = false;
 const limitedDb = {
  prepare() {
   return { bind() { return this; }, first: async () => ({ request_count: 21 }) };
  }
 };
 const response = await worker.fetch(req("/v1/assistant/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: "آموزش پایتون" })
 }), {
  DB: limitedDb,
  AI: { run: async () => { called = true; return { response: "unexpected" }; } }
 });
 assert.equal(response.status, 429);
 assert.equal(called, false);
});


test("public module metadata matches the versioned API contract without requiring D1", async () => {
 const response = await worker.fetch(req("/v1/modules"), {});
 assert.equal(response.status, 200);
 const data = await response.json();
 assert.equal(data.items.length, 9);
 assert.equal(data.items.find(x => x.id === "workspace").availability, "available");
 assert.equal(data.items.find(x => x.id === "secure").availability, "planned");
 assert.equal(data.nextCursor, null);
});
test("public module metadata filters by category and paginates with a bounded cursor", async () => {
 const first = await worker.fetch(req("/v1/modules?category=ai&limit=1"), {});
 const firstData = await first.json();
 assert.equal(first.status, 200);
 assert.equal(firstData.items.length, 1);
 assert.equal(firstData.items[0].id, "ai-hub");
 assert.equal(firstData.nextCursor, "1");
 const second = await worker.fetch(req("/v1/modules?category=ai&limit=1&cursor=1"), {});
 const secondData = await second.json();
 assert.equal(second.status, 200);
 assert.equal(secondData.items[0].id, "agents");
 assert.equal(secondData.nextCursor, null);
});
test("public module metadata rejects invalid categories, limits and cursors", async () => {
 for (const query of [
  "?category=unknown",
  "?limit=0",
  "?limit=51",
  "?limit=1.5",
  "?cursor=-1",
  "?cursor=999999"
 ]) {
  const response = await worker.fetch(req("/v1/modules" + query), {});
  assert.equal(response.status, 400, query);
 }
});


function retentionDb(){
 const statements=[];
 const db={
  prepare(sql){
   const statement={sql,values:[],bind(...values){this.values=values;return this;}};
   return statement;
  },
  async batch(batch){statements.push(...batch);return batch.map(()=>({meta:{changes:0}}));}
 };
 return {db,statements};
}
test("scheduled cleanup expires inactive support tickets, idempotency rows and rate-limit buckets",async()=>{
 const store=retentionDb();
 await worker.scheduled({scheduledTime:Date.now()},{DB:store.db,SUPPORT_RETENTION_DAYS:"90"});
 assert.equal(store.statements.length,3);
 assert.match(store.statements[0].sql,/DELETE FROM support_tickets WHERE updated_at < \?/);
 assert.match(store.statements[1].sql,/DELETE FROM workspace_idempotency WHERE expires_at <= \?/);
 assert.match(store.statements[2].sql,/DELETE FROM api_rate_limits WHERE expires_at <= \?/);
 const cutoff=Date.parse(store.statements[0].values[0]);
 assert.ok(Number.isFinite(cutoff));
 assert.ok(Math.abs((Date.now()-cutoff)-90*86400000)<5000);
 assert.ok(Number.isFinite(Date.parse(store.statements[1].values[0])));
 assert.ok(Number.isInteger(store.statements[2].values[0]));
});
test("scheduled cleanup emits aggregate telemetry without ticket or user data",async()=>{
 const events=[],originalInfo=console.info;
 const DB={
  prepare(sql){return{sql,bind(){return this;}};},
  async batch(){return[{meta:{changes:2}},{meta:{changes:3}},{meta:{changes:4}}];}
 };
 const scheduledTime=Date.UTC(2026,10,11,3,0,0);
 console.info=(message)=>events.push(message);
 try{
  await worker.scheduled({scheduledTime},{DB,SUPPORT_RETENTION_DAYS:"90"});
 }finally{
  console.info=originalInfo;
 }
 assert.equal(events.length,1);
 const event=JSON.parse(events[0]);
 assert.deepEqual(event,{
  event:"support_retention_cleanup_completed",
  scheduled_time:new Date(scheduledTime).toISOString(),
  retention_days:90,
  deleted:{support_tickets:2,idempotency_records:3,rate_limit_buckets:4}
 });
 assert.doesNotMatch(events[0],/ticket_id|access_token|contact_email|message_body/i);
});
test("scheduled cleanup rejects unsafe retention settings before touching D1",async()=>{
 const store=retentionDb();
 await assert.rejects(worker.scheduled({}, {DB:store.db,SUPPORT_RETENTION_DAYS:"7"}),/between 30 and 365/);
 assert.equal(store.statements.length,0);
});
test("scheduled cleanup emits no completion event when D1 batch fails",async()=>{
 const events=[],originalInfo=console.info;
 const DB={
  prepare(sql){return{sql,bind(){return this;}};},
  async batch(){throw new Error("database unavailable");}
 };
 console.info=(message)=>events.push(message);
 try{
  await assert.rejects(
   worker.scheduled({scheduledTime:Date.UTC(2026,10,11,3,0,0)},{DB,SUPPORT_RETENTION_DAYS:"90"}),
   /database unavailable/
  );
 }finally{
  console.info=originalInfo;
 }
 assert.deepEqual(events,[]);
});

test("public support readiness is fail-closed until a valid retention policy is configured",async()=>{
 const database=()=>({prepare(sql){if(sql==="SELECT 1 AS ok")return{first:async()=>({ok:1})};throw new Error("unexpected SQL");}});
 const disabled=await worker.fetch(req("/v1/health/ready"),{DB:database()});
 const disabledBody=await disabled.json();
 assert.equal(disabledBody.features.publicSupport,false);
 assert.equal(disabledBody.features.supportRetentionDays,null);
 const enabled=await worker.fetch(req("/v1/health/ready"),{DB:database(),SUPPORT_RETENTION_DAYS:"90"});
 const enabledBody=await enabled.json();
 assert.equal(enabledBody.features.publicSupport,true);
 assert.equal(enabledBody.features.supportRetentionDays,90);
 const invalid=await worker.fetch(req("/v1/health/ready"),{DB:database(),SUPPORT_RETENTION_DAYS:"7"});
 const invalidBody=await invalid.json();
 assert.equal(invalidBody.features.publicSupport,false);
 assert.equal(invalidBody.features.supportRetentionDays,null);
});

test("new public support tickets are rejected server-side until retention is configured",async()=>{
 const database={prepare(sql){if(sql.startsWith("INSERT INTO api_rate_limits"))return{bind(){return this;},first:async()=>({request_count:1})};throw new Error("ticket creation must stop before D1 writes");}};
 const response=await worker.fetch(req("/v1/support/tickets",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({category:"question",subject:"آزمون",message:"پیام آزمایشی",consent:true})}),{DB:database});
 assert.equal(response.status,503);
 assert.equal((await response.json()).error.code,"support_retention_required");
});

test("ticket creation requires explicit consent before writing data",async()=>{
 const store=supportDb();
 const response=await worker.fetch(req("/v1/support/tickets",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({category:"question",subject:"پرسش",message:"متن درخواست",consent:false})}),{DB:store.db,SUPPORT_RETENTION_DAYS:"90"});
 assert.equal(response.status,400);
 assert.equal((await response.json()).error.code,"consent_required");
 assert.equal(store.tickets.size,0);
});

test("assistant falls back safely when the configured provider fails", async () => {
 const response = await worker.fetch(req("/v1/assistant/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: "آموزش پایتون" })
 }), {
  DB: rateDb(),
  AI: { run: async () => { throw new Error("401 invalid provider credential: do-not-leak"); } }
 });
 const data = await response.json();
 assert.equal(response.status, 200);
 assert.equal(data.mode, "knowledge_fallback");
 assert.ok(data.answer.length > 0);
 assert.doesNotMatch(JSON.stringify(data), /do-not-leak|credential/i);
});
