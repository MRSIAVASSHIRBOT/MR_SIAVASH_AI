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
test("ticket creation validates email before touching D1",async()=>{const r=await worker.fetch(req("/v1/support/tickets",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({subject:"سؤال",message:"سلام",contact_email:"invalid"})}),{DB:db()});assert.equal(r.status,400);});
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
