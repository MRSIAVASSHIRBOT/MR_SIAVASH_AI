(()=>{"use strict";
const $=selector=>document.querySelector(selector);
const API_BASE="https://mr-siavash-ai-gateway.mrsiavashirbot.workers.dev";
const root=document.documentElement||{dataset:{}};
const SUPPORT_RETENTION_DAYS=Number(root.dataset.supportRetentionDays||0);
const SUPPORT_API_ENABLED=root.dataset.supportApi==="enabled"&&Number.isInteger(SUPPORT_RETENTION_DAYS)&&SUPPORT_RETENTION_DAYS>=30&&SUPPORT_RETENTION_DAYS<=365;
let SUPPORT_TRACKING_READY=false;
let SUPPORT_INTAKE_READY=false;
const normalise=value=>String(value||"").normalize("NFKC").toLocaleLowerCase("fa")
 .replace(/[يى]/g,"ی").replace(/ك/g,"ک")
 .replace(/[\u064b-\u065f\u0670\u0640]/g,"")
 .replace(/[^\p{L}\p{N}]+/gu," ").trim();
let knowledge=[],loaded=false,loading=null;
function message(text,role="assistant",sources=[]){
 const p=document.createElement("p");p.className="assistant-bubble"+(role==="user"?" user":"");p.textContent=text;
 $("#assistantMessages").append(p);
 if(role==="assistant"&&sources.length){
  const refs=document.createElement("div");refs.className="assistant-sources";
  for(const source of sources.slice(0,3)){
   try{
    const url=new URL(source.href,location.href);
    if(url.origin!==location.origin||!/^https?:$/.test(url.protocol))continue;
    const link=document.createElement("a");link.href=url.href;link.textContent=source.title;refs.append(link);
   }catch{}
  }
  if(refs.childElementCount)$("#assistantMessages").append(refs);
 }
 $("#assistantMessages").scrollTop=$("#assistantMessages").scrollHeight;
}
function tab(name){
 document.querySelectorAll("[data-support-tab]").forEach(button=>button.setAttribute("aria-selected",String(button.dataset.supportTab===name)));
 document.querySelectorAll("[data-support-pane]").forEach(pane=>{pane.classList.toggle("is-active",pane.dataset.supportPane===name);pane.hidden=pane.dataset.supportPane!==name;});
}
const readJson=(path,maxBytes)=>window.MRSIAVASHReadJson(path,maxBytes);
async function loadKnowledge(){
 if(loading)return loading;
 loading=(async()=>{
  const [indexResult,moduleResult]=await Promise.allSettled([
   readJson("./search-index.json",96*1024),readJson("./modules.json",64*1024)
  ]);
  const items=[];
  if(indexResult.status==="fulfilled"){
   const index=indexResult.value;
   if(index?.schema==="mr-siavash-ai-search-index"&&index.version===1&&Array.isArray(index.items)&&index.items.length<=100){
    for(const item of index.items){
     if(!item||typeof item.title!=="string"||typeof item.description!=="string"||item.type==="action")continue;
     const href=typeof item.href==="string"?item.href:
      item.view==="home"?"./index.html#home":item.view==="modules"?"./index.html#modules":
      item.view==="workspace"?"./index.html#workspace":item.view==="identity"?"./index.html#identity":
      item.view==="about"?"./index.html#about":null;
     if(href&&href.startsWith("./")&&!href.startsWith("../")&&!href.includes("://"))items.push({title:item.title,description:item.description,href,terms:Array.isArray(item.terms)?item.terms:[]});
    }
   }
  }
  if(moduleResult.status==="fulfilled"){
   const registry=moduleResult.value;
   if(registry?.schema==="mr-siavash-ai-module-registry"&&registry.version===1&&Array.isArray(registry.modules)){
    for(const item of registry.modules){
     if(typeof item?.title!=="string"||typeof item?.description!=="string")continue;
     items.push({title:item.title,description:item.description,href:"./index.html#modules",terms:[item.id,item.categoryLabel,...(Array.isArray(item.features)?item.features:[])]});
    }
   }
  }
  knowledge=items;
  if(!knowledge.length)throw new Error("فهرست راهنمای محلی بارگذاری نشد.");
  loaded=true;
 })();
 try{return await loading;}finally{loading=null;}
}
function rank(query){
 const q=normalise(query),terms=[...new Set(q.split(/\s+/).filter(Boolean))];
 if(!terms.length)return [];
 return knowledge.map(item=>{
  const title=normalise(item.title),body=normalise([item.description,...item.terms].join(" "));
  let score=title===q?100:title.startsWith(q)?55:title.includes(q)?35:0,matched=0;
  for(const term of terms){let hit=false;if(title.includes(term)){score+=title.startsWith(term)?14:10;hit=true;}if(body.includes(term)){score+=4;hit=true;}if(hit)matched++;}
  if(matched===terms.length)score+=12;
  return {item,score};
 }).filter(result=>result.score>0).sort((a,b)=>b.score-a.score).slice(0,3);
}
async function ask(event){
 event.preventDefault();
 const input=$("#assistantInput"),text=input.value.trim();
 if(!text)return;
 input.value="";message(text,"user");
 const button=event.currentTarget.querySelector('button[type="submit"]');button.disabled=true;
 try{
  if(!loaded)await loadKnowledge();
  const found=rank(text);
  if(!found.length){message("در محتوای منتشرشدهٔ سایت، پاسخ مرتبط و قابل اتکایی پیدا نکردم. می‌توانی با جست‌وجوی اصلی سایت عبارت دیگری را امتحان کنی.");return;}
  const first=found[0].item;
  const answer="نزدیک‌ترین راهنمای موجود: "+first.title+"\n"+first.description+"\n\nبرای جزئیات بیشتر، یکی از منابع مرتبط زیر را باز کن.";
  message(answer,"assistant",found.map(result=>({title:result.item.title,href:result.item.href})));
 }catch(error){message("راهنمای محلی فعلاً بارگذاری نشد. لطفاً اتصال را بررسی و دوباره تلاش کن.");}
 finally{button.disabled=false;input.focus();}
}
async function apiRequest(path,{method="GET",body,token:secret}={}){
 const headers={Accept:"application/json"};
 if(body!==undefined)headers["Content-Type"]="application/json";
 if(secret)headers.Authorization="Bearer "+secret;
 const response=await fetch(API_BASE+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),credentials:"omit",cache:"no-store",referrerPolicy:"no-referrer"});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.error?.message||"درخواست پشتیبانی انجام نشد؛ دوباره تلاش کن.");
 return data;
}
function statusText(element,text){if(element)element.textContent=text;}
function setFormEnabled(formId,enabled){
 const form=$(formId);if(!form)return;
 form.querySelectorAll("input,select,textarea,button").forEach(control=>{control.disabled=!enabled;});
}
async function refreshSupportReadiness(){
 if(typeof fetch!=="function")return;
 try{
  const health=await apiRequest("/v1/health/ready");
  SUPPORT_TRACKING_READY=health.status==="ready"&&health.dependencies?.database==="ready";
  SUPPORT_INTAKE_READY=SUPPORT_API_ENABLED&&SUPPORT_TRACKING_READY&&health.features?.publicSupport===true&&health.features?.supportRetentionDays===SUPPORT_RETENTION_DAYS;
 }catch{
  SUPPORT_TRACKING_READY=false;SUPPORT_INTAKE_READY=false;
 }
 setFormEnabled("#ticketTrackForm",SUPPORT_TRACKING_READY);
 setFormEnabled("#supportRequestForm",SUPPORT_INTAKE_READY);
 statusText($("#ticketTrackResult"),SUPPORT_TRACKING_READY?"کد پیگیری و کلید خصوصی تیکت قبلی را وارد کن.":"پیگیری آنلاین در حال حاضر به پایگاه دادهٔ آماده نیاز دارد.");
 if(!SUPPORT_INTAKE_READY)statusText($("#supportRequestStatus"),"ثبت تیکت جدید تا انتشار نسخهٔ تأییدشده و فعال‌سازی دورهٔ نگهداری غیرفعال است.");
}

function formatDate(value){
 const date=new Date(value);
 return Number.isNaN(date.getTime())?"":date.toLocaleString("fa-IR");
}
function appendText(parent,tag,className,text){
 const element=document.createElement(tag);
 if(className)element.className=className;
 element.textContent=text;
 parent.append(element);
 return element;
}
function renderTicketCredentials(target,ticket){
 target.replaceChildren();
 appendText(target,"p","ticket-secret-notice","درخواست ثبت شد. کد پیگیری و کلید خصوصی را جداگانه و در جای امن نگه دار؛ کلید خصوصی فقط همین یک‌بار نمایش داده می‌شود.");
 for(const [label,value] of [["کد پیگیری",ticket.code],["کلید خصوصی",ticket.token]]){
  const row=document.createElement("div");row.className="ticket-secret-row";
  appendText(row,"strong","",label);
  const input=document.createElement("input");input.type="text";input.readOnly=true;input.value=value;input.autocomplete="off";input.setAttribute("aria-label",label);
  const copy=document.createElement("button");copy.type="button";copy.className="button button-quiet";copy.textContent="کپی";
  copy.addEventListener("click",async()=>{
   try{await navigator.clipboard.writeText(value);copy.textContent="کپی شد";}
   catch{input.focus();input.select();copy.textContent="متن انتخاب شد";}
  });
  row.append(input,copy);target.append(row);
 }
 appendText(target,"p","support-privacy-note","درخواست پس از "+(ticket.retention_days||SUPPORT_RETENTION_DAYS)+" روز بدون به‌روزرسانی حذف می‌شود.");
}
const STATUS_LABELS={open:"باز",in_progress:"در حال بررسی",waiting_user:"منتظر پاسخ شما",resolved:"پاسخ داده شد"};
async function loadTicket(code,secret,target){
 const data=await apiRequest("/v1/support/tickets/"+encodeURIComponent(code),{token:secret});
 target.replaceChildren();
 const ticket=data.ticket||{};
 appendText(target,"h3","ticket-result-title",ticket.subject||"درخواست پشتیبانی");
 appendText(target,"p","ticket-result-status","وضعیت: "+(STATUS_LABELS[ticket.status]||ticket.status||"نامشخص"));
 const messages=document.createElement("div");messages.className="ticket-message-list";
 for(const item of (Array.isArray(data.messages)?data.messages:[])){
  const role=item.sender_role==="admin"?"پشتیبانی":item.sender_role==="assistant"?"راهنمای سایت":"شما";
  const card=document.createElement("article");card.className="ticket-message";
  appendText(card,"strong","",role);
  appendText(card,"p","",item.body||"");
  if(item.created_at)appendText(card,"time","",formatDate(item.created_at));
  messages.append(card);
 }
 target.append(messages);
 const reply=document.createElement("form");reply.className="support-form ticket-reply-form";
 const label=appendText(reply,"label","","ارسال پیام جدید");
 const textarea=document.createElement("textarea");textarea.id="ticketReplyInput";textarea.rows=3;textarea.maxLength=4000;textarea.required=true;label.htmlFor=textarea.id;
 const button=document.createElement("button");button.type="submit";button.className="button button-primary";button.textContent="ارسال پاسخ";
 const result=appendText(reply,"p","","");
 reply.append(textarea,button);
 reply.addEventListener("submit",async event=>{
  event.preventDefault();const text=textarea.value.trim();if(!text)return;
  button.disabled=true;statusText(result,"در حال ارسال...");
  try{await apiRequest("/v1/support/tickets/"+encodeURIComponent(code)+"/messages",{method:"POST",token:secret,body:{message:text}});await loadTicket(code,secret,target);}
  catch(error){statusText(result,error.message);}
  finally{button.disabled=false;}
 });
 target.append(reply);
}
async function submitTicket(event){
 event.preventDefault();
 const form=event.currentTarget,status=$("#supportRequestStatus"),button=form.querySelector('button[type="submit"]');
 if(!SUPPORT_INTAKE_READY){statusText(status,"ثبت آنلاین تیکت هنوز فعال نشده است.");return;}
 if(!$("#supportConsent").checked){statusText(status,"برای ثبت درخواست، تأیید اطلاعیهٔ حریم خصوصی لازم است.");return;}
 const payload={
  category:$("#supportCategory").value,
  subject:$("#supportSubject").value.trim(),
  contact_email:$("#supportEmail").value.trim(),
  message:$("#supportMessage").value.trim(),
  website:$("#supportWebsite").value.trim(),
  consent:true
 };
 button.disabled=true;statusText(status,"در حال ثبت درخواست...");
 try{
  const data=await apiRequest("/v1/support/tickets",{method:"POST",body:payload});
  if(data.ticket?.code&&data.ticket?.token)renderTicketCredentials(status,data.ticket);
  else statusText(status,"درخواست دریافت شد.");
  form.reset();
 }catch(error){statusText(status,error.message);}
 finally{button.disabled=false;}
}
async function trackTicket(event){
 event.preventDefault();
 const form=event.currentTarget,code=$("#ticketCodeInput").value.trim().toUpperCase(),secret=$("#ticketTokenInput").value.trim(),target=$("#ticketTrackResult"),button=form.querySelector('button[type="submit"]');
 if(!SUPPORT_TRACKING_READY){statusText(target,"پیگیری آنلاین در حال حاضر در دسترس نیست.");return;}
 if(!/^MS-[A-F0-9]{16}$/.test(code)||!/^[a-f0-9]{64}$/i.test(secret)){statusText(target,"کد پیگیری یا کلید خصوصی معتبر نیست.");return;}
 button.disabled=true;statusText(target,"در حال دریافت گفتگو...");
 try{await loadTicket(code,secret,target);}
 catch(error){statusText(target,error.message);}
 finally{button.disabled=false;}
}
function disableUnavailable(formId,statusId,text){
 const form=$(formId),status=$(statusId);if(!form)return;
 form.querySelectorAll("input,select,textarea,button").forEach(control=>{control.disabled=true;});
 if(status)status.textContent=text;
}
function init(){
 const support=$("#supportDialog");if(!support)return;
 $("#supportLauncher").addEventListener("click",()=>{support.showModal();refreshSupportReadiness();});
 $("#supportClose").addEventListener("click",()=>support.close());
 support.addEventListener("close",()=>{
  const created=$("#supportRequestStatus"),tracked=$("#ticketTrackResult"),tokenInput=$("#ticketTokenInput");
  if(created)created.replaceChildren();
  if(tracked)tracked.replaceChildren();
  if(tokenInput)tokenInput.value="";
 });
 document.querySelectorAll("[data-support-tab]").forEach(button=>button.addEventListener("click",()=>tab(button.dataset.supportTab)));
 $("#assistantForm").addEventListener("submit",ask);
 $("#supportRequestForm").addEventListener("submit",submitTicket);
 $("#ticketTrackForm").addEventListener("submit",trackTicket);
 disableUnavailable("#supportRequestForm","#supportRequestStatus","ثبت تیکت جدید تا انتشار نسخهٔ تأییدشده و فعال‌سازی دورهٔ نگهداری غیرفعال است.");
 disableUnavailable("#ticketTrackForm","#ticketTrackResult","در حال بررسی آمادگی پایگاه داده برای پیگیری تیکت‌های قبلی...");
 refreshSupportReadiness();
 loadKnowledge().catch(()=>{});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();