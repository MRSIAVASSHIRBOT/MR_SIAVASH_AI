/* Accessible, opt-in interface sounds. No autoplay and no external audio assets. */
(() => {
 "use strict";
 const KEY="mr-siavash-ai-ui-sounds-v1";
 const button= document.getElementById("soundToggle");
 let enabled=false;
 let audioContext=null;
 try { enabled=window.localStorage.getItem(KEY)==="on"; } catch {}
 function syncButton(){
  if(!button)return;
  button.setAttribute("aria-pressed",String(enabled));
  button.setAttribute("aria-label",enabled?"خاموش‌کردن صداهای رابط کاربری":"فعال‌کردن صداهای رابط کاربری");
  button.title=enabled?"صداهای رابط روشن هستند":"صداهای رابط خاموش هستند";
  const label=button.querySelector(".sound-label");
  if(label)label.textContent=enabled?"صدا روشن":"صدا خاموش";
  const icon=button.querySelector(".sound-icon");
  if(icon)icon.textContent=enabled?"♫":"♪";
 }
 function getContext(){
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)return null;
  if(!audioContext)audioContext=new Audio();
  if(audioContext.state==="suspended")audioContext.resume().catch(()=>{});
  return audioContext;
 }
 function tone(ctx,frequency,duration,volume,delay=0,endFrequency=frequency){
  const oscillator=ctx.createOscillator();
  const gain=ctx.createGain();
  const start=ctx.currentTime+delay;
  oscillator.type="sine";
  oscillator.frequency.setValueAtTime(frequency,start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1,endFrequency),start+duration);
  gain.gain.setValueAtTime(0.0001,start);
  gain.gain.exponentialRampToValueAtTime(volume,start+Math.min(.012,duration/3));
  gain.gain.exponentialRampToValueAtTime(0.0001,start+duration);
  oscillator.connect(gain);gain.connect(ctx.destination);
  oscillator.start(start);oscillator.stop(start+duration+.01);
 }
 function play(kind="click"){
  if(!enabled)return;
  const ctx=getContext();
  if(!ctx)return;
  if(kind==="navigate"){
   tone(ctx,360,.075,.018,0,470);
   tone(ctx,560,.09,.012,.055,690);
  }else if(kind==="success"){
   tone(ctx,520,.075,.014,0,650);
   tone(ctx,780,.11,.012,.07,920);
  }else{
   tone(ctx,720,.035,.009,0,610);
  }
 }
 if(button){
  syncButton();
  button.addEventListener("click",()=>{
   enabled=!enabled;
   try{window.localStorage.setItem(KEY,enabled?"on":"off");}catch{}
   syncButton();
   if(enabled)play("success");
  });
 }
 document.addEventListener("click",event=>{
  const target=event.target instanceof Element?event.target.closest("button,a,[role='button']"):null;
  if(!target||target.disabled||target===button||target.id==="soundToggle")return;
  if(target.hasAttribute("data-view"))return;
  const isPageLink=target.matches("a[href]")&&/\.html(?:$|[?#])/.test(target.getAttribute("href")||"");
  play(isPageLink?"navigate":"click");
 },true);
 window.MRSound=Object.freeze({play,isEnabled:()=>enabled});
 syncButton();
})();