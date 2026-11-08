(()=>{"use strict";
const $=s=>document.querySelector(s);
const normalise=value=>String(value||"").normalize("NFKC").toLocaleLowerCase("fa")
  .replace(/[يى]/g,"ی").replace(/ك/g,"ک")
  .replace(/[\u064b-\u065f\u0670\u0640]/g,"")
  .replace(/[^\p{L}\p{N}]+/gu," ").trim();
const LABELS={course:"مسیر آموزشی",lesson:"فصل آکادمی", "python-lesson":"درس پایتون",module:"ماژول",page:"صفحه",action:"دسترسی سریع"};
const ALLOWED_VIEWS=new Set(["home","modules","workspace","identity","about"]);
let entries=[],active=-1,ready=false;
const dialog=()=>$("#siteSearchDialog");
const input=()=>$("#siteSearchInput");
const root=()=>$("#siteSearchResults");
function validIndex(value){
 if(!value||value.schema!=="mr-siavash-ai-search-index"||value.version!==1||!Array.isArray(value.items)||value.items.length>100)return false;
 const ids=new Set();
 return value.items.every(item=>{
  if(!item||typeof item!=="object"||typeof item.id!=="string"||!/^[a-z0-9-]{2,80}$/.test(item.id)||ids.has(item.id)||
    typeof item.title!=="string"||!item.title.trim()||item.title.length>100||
    typeof item.description!=="string"||item.description.length>400||
    !["course","lesson","python-lesson","page","action"].includes(item.type))return false;
  ids.add(item.id);
  if(item.href!==undefined&&(typeof item.href!=="string"||!item.href.startsWith("./")||item.href.startsWith("../")||item.href.includes("://")))return false;
  if(item.view!==undefined&&!ALLOWED_VIEWS.has(item.view))return false;
  if(item.action!==undefined&&item.action!=="support")return false;
  return item.terms===undefined||(Array.isArray(item.terms)&&item.terms.length<=12&&item.terms.every(x=>typeof x==="string"&&x.length<=80));
 });
}
async function readJson(path,maxBytes){
 const response=await fetch(path,{credentials:"omit",cache:"no-cache"});
 if(!response.ok)throw new Error("Search resource unavailable");
 const type=response.headers.get("content-type")||"";
 if(!/^application\/(?:json|[a-z0-9.+-]+\+json)(?:\s*;|$)/i.test(type))throw new Error("Invalid search resource type");
 const text=await response.text();
 if(new TextEncoder().encode(text).byteLength>maxBytes)throw new Error("Search resource too large");
 return JSON.parse(text);
}
async function load(){
 const [indexResult,moduleResult]=await Promise.allSettled([
  readJson("./search-index.json",96*1024),
  readJson("./modules.json",64*1024)
 ]);
 const found=[];
 if(indexResult.status==="fulfilled"&&validIndex(indexResult.value))found.push(...indexResult.value.items);
 if(moduleResult.status==="fulfilled"){
  const data=moduleResult.value;
  if(data&&data.schema==="mr-siavash-ai-module-registry"&&data.version===1&&Array.isArray(data.modules)){
   for(const module of data.modules){
    if(!module||typeof module.id!=="string"||typeof module.title!=="string"||typeof module.description!=="string")continue;
    found.push({id:"module-"+module.id,type:"module",title:module.title,description:module.description,terms:[module.id,module.categoryLabel,...(Array.isArray(module.features)?module.features:[])],view:"modules",moduleId:module.id});
   }
  }
 }
 entries=found;
 ready=true;
 if(!entries.length)showMessage("فهرست جست‌وجو بارگذاری نشد. اتصال را بررسی و صفحه را تازه‌سازی کن.");
}
function score(item,query,terms){
 const title=normalise(item.title),body=normalise([item.description,...(item.terms||[])].join(" "));
 let score=0,matched=0;
 if(title===query)score+=100;
 else if(title.startsWith(query))score+=55;
 else if(title.includes(query))score+=35;
 for(const term of terms){
  let hit=false;
  if(title.includes(term)){score+=title.startsWith(term)?14:10;hit=true;}
  if(body.includes(term)){score+=4;hit=true;}
  if(hit)matched++;
 }
 if(matched===terms.length)score+=12;
 return matched?score:0;
}
function showMessage(text){
 const p=document.createElement("p");p.className="search-empty";p.textContent=text;root().replaceChildren(p);active=-1;
}
function activate(item){
 dialog().close();
 if(item.action==="support"){const support=$("#supportDialog");if(support&&!support.open)support.showModal();return;}
 if(item.view){
  document.querySelector('[data-view="'+item.view+'"]')?.click();
  if(item.moduleId){
   const search=$("#moduleSearch");
   if(search){search.value=item.title;search.dispatchEvent(new Event("input",{bubbles:true}));}
  }
  return;
 }
 if(item.href)location.href=item.href;
}
function setActive(next){
 const options=[...root().querySelectorAll('[role="option"]')];
 if(!options.length){active=-1;return;}
 active=Math.max(0,Math.min(next,options.length-1));
 options.forEach((option,i)=>option.setAttribute("aria-selected",String(i===active)));
 options[active].scrollIntoView({block:"nearest"});
 input().setAttribute("aria-activedescendant",options[active].id);
}
function render(query){
 const q=normalise(query);
 root().replaceChildren();input().removeAttribute("aria-activedescendant");active=-1;
 if(!q){showMessage("برای شروع، نام یک موضوع، دوره یا قابلیت را بنویس.");return;}
 if(!ready){showMessage("در حال آماده‌سازی فهرست جست‌وجو…");return;}
 const terms=[...new Set(q.split(/\s+/).filter(Boolean))];
 const results=entries.map(item=>({item,score:score(item,q,terms)}))
  .filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.item.title.localeCompare(b.item.title,"fa")).slice(0,14);
 if(!results.length){showMessage("نتیجه‌ای پیدا نشد. عبارت دیگری را امتحان کن.");return;}
 results.forEach(({item},i)=>{
  const button=document.createElement("button");button.type="button";button.className="search-result";button.id="site-search-result-"+i;button.setAttribute("role","option");button.setAttribute("aria-selected","false");
  const title=document.createElement("strong"),description=document.createElement("span"),kind=document.createElement("small");
  title.textContent=item.title;description.textContent=item.description;kind.textContent=LABELS[item.type]||"نتیجه";
  button.append(title,description,kind);button.addEventListener("click",()=>activate(item));root().append(button);
 });
}
function open(){
 if(!dialog().open)dialog().showModal();
 input().focus();render(input().value);
}
function init(){
 if(!dialog()||!input()||!root())return;
 $("#globalSearchButton").addEventListener("click",open);
 $("#siteSearchClose").addEventListener("click",()=>dialog().close());
 input().addEventListener("input",event=>render(event.target.value));
 input().addEventListener("keydown",event=>{
  if(event.key==="ArrowDown"){event.preventDefault();setActive(active+1);}
  else if(event.key==="ArrowUp"){event.preventDefault();setActive(active<0?0:active-1);}
  else if(event.key==="Enter"&&active>=0){event.preventDefault();root().querySelectorAll('[role="option"]')[active]?.click();}
 });
 load().then(()=>{if(dialog().open)render(input().value);});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();