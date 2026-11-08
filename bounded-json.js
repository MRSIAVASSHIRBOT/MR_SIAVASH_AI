(()=>{"use strict";
async function readJson(path,maxBytes,timeoutMs=5000){
 if(typeof path!=="string"||!path.trim()||!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>1024*1024||
  !Number.isSafeInteger(timeoutMs)||timeoutMs<100||timeoutMs>30000)throw new TypeError("Invalid bounded JSON request");
 const url=new window.URL(path,window.location.href);
 if(url.origin!==window.location.origin||!/^https?:$/.test(url.protocol)||url.username||url.password||url.search||url.hash)
  throw new Error("JSON resource must be same-origin and path-only");
 const controller=typeof window.AbortController==="function"?new window.AbortController():null;
 const timeoutId=controller?window.setTimeout(()=>controller.abort(),timeoutMs):null;
 try{
  const options={method:"GET",credentials:"omit",cache:"no-cache"};
  if(controller)options.signal=controller.signal;
  const response=await window.fetch(url.href,options);
  if(!response.ok)throw new Error("JSON resource unavailable");
  const contentType=response.headers&&response.headers.get("content-type")||"";
  if(!/^application\/(?:json|[a-z0-9.+-]+\+json)(?:\s*;|$)/i.test(contentType))throw new Error("Invalid JSON resource type");
  const declaredLength=Number(response.headers&&response.headers.get("content-length"));
  if(Number.isFinite(declaredLength)&&declaredLength>maxBytes)throw new Error("JSON resource too large");
  let payload;
  if(response.body&&typeof response.body.getReader==="function"){
   const reader=response.body.getReader(),chunks=[];
   let totalBytes=0;
   try{
    while(true){
     const part=await reader.read();
     if(part.done)break;
     if(!part.value||!Number.isSafeInteger(part.value.byteLength))throw new Error("Invalid JSON resource stream");
     totalBytes+=part.value.byteLength;
     if(totalBytes>maxBytes){
      try{await reader.cancel();}catch{}
      throw new Error("JSON resource too large");
     }
     chunks.push(part.value);
    }
   }finally{if(typeof reader.releaseLock==="function")reader.releaseLock();}
   const bytes=new Uint8Array(totalBytes);let offset=0;
   for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
   payload=new window.TextDecoder("utf-8",{fatal:true}).decode(bytes);
  }else{
   payload=await response.text();
   if(new window.TextEncoder().encode(payload).byteLength>maxBytes)throw new Error("JSON resource too large");
  }
  return JSON.parse(payload);
 }finally{if(timeoutId!==null)window.clearTimeout(timeoutId);}
}
window.MRSIAVASHReadJson=readJson;
})();