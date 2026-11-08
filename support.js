(()=>{"use strict";
const $=selector=>document.querySelector(selector);
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
async function readJson(path,maxBytes){
 const response=await fetch(path,{credentials:"omit",cache:"no-cache"});
 if(!response.ok)throw new Error("راهنمای سایت در دسترس نیست.");
 const type=response.headers.get("content-type")||"";
 if(!/^application\/(?:json|[a-z0-9.+-]+\+json)(?:\s*;|$)/i.test(type))throw new Error("نوع داده راهنما معتبر نیست.");
 const text=await response.text();
 if(new TextEncoder().encode(text).byteLength>maxBytes)throw new Error("حجم راهنمای سایت بیش از حد مجاز است.");
 return JSON.parse(text);
}
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
  knowledge=items;loaded=true;
  if(!knowledge.length)throw new Error("فهرست راهنمای محلی بارگذاری نشد.");
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
function disableUnavailable(formId,statusId,text){
 const form=$(formId),status=$(statusId);if(!form)return;
 form.querySelectorAll("input,select,textarea,button").forEach(control=>{control.disabled=true;});
 if(status)status.textContent=text;
}
function init(){
 const support=$("#supportDialog");if(!support)return;
 $("#supportLauncher").addEventListener("click",()=>support.showModal());
 $("#supportClose").addEventListener("click",()=>support.close());
 document.querySelectorAll("[data-support-tab]").forEach(button=>button.addEventListener("click",()=>tab(button.dataset.supportTab)));
 $("#assistantForm").addEventListener("submit",ask);
 disableUnavailable("#supportRequestForm","#supportRequestStatus","ثبت آنلاین درخواست هنوز در نسخهٔ مستقرشده فعال نیست. لطفاً فعلاً اطلاعات تماس یا پیام خصوصی وارد نکن.");
 disableUnavailable("#ticketTrackForm","#ticketTrackResult","پیگیری آنلاین هنوز فعال نیست؛ API پشتیبانی در محیط تولید مستقر نشده است.");
 loadKnowledge().catch(()=>{});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();