(() => {
  "use strict";
  const KEY = "mr-siavash-ai.academy.content-drafts.v1";
  const COURSES = new Set(["html","css","javascript","git","linux","web-security"]);
  const $ = selector => document.querySelector(selector);
  const form = $("#academyDraftForm"), list = $("#academyDraftList"), status = $("#academyDraftStatus");
  let drafts = readDrafts(), selectedId = null;
  function cleanText(value, max) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
  function validate(item) {
    if (!item || typeof item !== "object" || !COURSES.has(item.course)) return null;
    const title = cleanText(item.title, 120), objective = cleanText(item.objective, 1000), content = cleanText(item.content, 8000);
    if (!title || !objective || !content) return null;
    return { id: typeof item.id === "string" && /^[a-f0-9-]{16,64}$/i.test(item.id) ? item.id : crypto.randomUUID(),
      course: item.course, title, objective, content, exercise: cleanText(item.exercise, 2000),
      criteria: Array.isArray(item.criteria) ? item.criteria.slice(0, 20).map(x => cleanText(x, 200)).filter(Boolean) : [],
      updatedAt: typeof item.updatedAt === "string" && !Number.isNaN(Date.parse(item.updatedAt)) ? item.updatedAt : new Date().toISOString() };
  }
  function readDrafts() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(parsed) ? parsed.slice(0, 100).map(validate).filter(Boolean) : [];
    } catch { return []; }
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(drafts)); return true; }
    catch { status.textContent = "ذخیره محلی ناموفق بود؛ فضای ذخیره‌سازی مرورگر را بررسی کن."; return false; }
  }
  function el(tag, cls, value) { const node = document.createElement(tag); if (cls) node.className = cls; if (value !== undefined) node.textContent = value; return node; }
  function render() {
    list.replaceChildren();
    if (!drafts.length) { list.append(el("p","academy-content-caption","هنوز پیش‌نویسی ثبت نشده است.")); return; }
    for (const draft of drafts) {
      const row = el("div","academy-draft-row");
      const open = el("button","academy-draft-open",draft.title);
      open.type = "button"; open.setAttribute("aria-pressed",String(draft.id===selectedId));
      open.addEventListener("click",()=>loadDraft(draft.id));
      const remove = el("button","academy-draft-remove","حذف");
      remove.type = "button"; remove.addEventListener("click",()=>removeDraft(draft.id));
      row.append(open,remove); list.append(row);
    }
  }
  function loadDraft(id) {
    const draft = drafts.find(x=>x.id===id); if (!draft) return;
    selectedId=id; $("#academyDraftCourse").value=draft.course; $("#academyDraftTitle").value=draft.title;
    $("#academyDraftObjective").value=draft.objective; $("#academyDraftContent").value=draft.content;
    $("#academyDraftExercise").value=draft.exercise; $("#academyDraftCriteria").value=draft.criteria.join("\n");
    status.textContent="پیش‌نویس برای ویرایش بارگذاری شد."; render();
  }
  function clearForm() { selectedId=null; form.reset(); status.textContent="فرم برای پیش‌نویس جدید آماده است."; render(); }
  function removeDraft(id) {
    drafts=drafts.filter(x=>x.id!==id); if(selectedId===id) clearForm();
    persist(); render(); status.textContent="پیش‌نویس از حافظه محلی حذف شد.";
  }
  form.addEventListener("submit",event=>{
    event.preventDefault();
    const item=validate({id:selectedId||crypto.randomUUID(),course:$("#academyDraftCourse").value,title:$("#academyDraftTitle").value,
      objective:$("#academyDraftObjective").value,content:$("#academyDraftContent").value,exercise:$("#academyDraftExercise").value,
      criteria:$("#academyDraftCriteria").value.split("\n"),updatedAt:new Date().toISOString()});
    if(!item){status.textContent="مسیر، عنوان، هدف و محتوای آموزشی معتبر لازم است.";return;}
    const index=drafts.findIndex(x=>x.id===item.id);
    if(index<0&&drafts.length>=100){status.textContent="سقف ۱۰۰ پیش‌نویس پر شده است؛ ابتدا موردی را خروجی بگیر یا حذف کن.";return;}
    if(index>=0)drafts[index]=item;else drafts.unshift(item);
    if(!persist())return; selectedId=item.id; render(); status.textContent="پیش‌نویس در همین مرورگر ذخیره شد؛ هنوز منتشر نشده است.";
  });
  $("#academyDraftNew").addEventListener("click",clearForm);
  $("#academyDraftExport").addEventListener("click",()=>{
    const blob=new Blob([JSON.stringify({schema:"mr-siavash-ai-academy-drafts",version:1,exportedAt:new Date().toISOString(),drafts},null,2)],{type:"application/json;charset=utf-8"});
    const url=URL.createObjectURL(blob),a=el("a");a.href=url;a.download="mr-siavash-ai-academy-drafts.json";a.click();URL.revokeObjectURL(url);
  });
  $("#academyDraftImport").addEventListener("change",async event=>{
    const file=event.target.files?.[0]; if(!file)return;
    if(file.size>1024*1024){status.textContent="حجم فایل باید کمتر از ۱ مگابایت باشد.";event.target.value="";return;}
    try{
      const parsed=JSON.parse(await file.text());
      if(parsed?.schema!=="mr-siavash-ai-academy-drafts"||parsed.version!==1||!Array.isArray(parsed.drafts))throw new Error("ساختار فایل معتبر نیست.");
      const incoming=parsed.drafts.slice(0,100).map(validate).filter(Boolean), merged=new Map(drafts.map(x=>[x.id,x]));
      for(const item of incoming)merged.set(item.id,item);
      drafts=[...merged.values()].slice(0,100);
      if(!persist())return;render();status.textContent=incoming.length+" پیش‌نویس معتبر وارد شد.";
    }catch{status.textContent="فایل JSON قابل‌خواندن یا مطابق قالب آکادمی نیست.";}
    finally{event.target.value="";}
  });
  render();
})();
