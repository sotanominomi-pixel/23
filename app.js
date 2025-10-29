/* app.js — main logic for N Clock with multi-alarms, bottom-sheet picker, language, big displays, SW notification attempts */

/* DOM */
const display = document.getElementById('display');
const slider = document.getElementById('sliderHours');
const labelHours = document.getElementById('labelHours');
const sliderBox = document.getElementById('sliderBox');

const tabClock = document.getElementById('tabClock');
const tabStopwatch = document.getElementById('tabStopwatch');
const tabAlarm = document.getElementById('tabAlarm');

const stopwatchArea = document.getElementById('stopwatchArea');
const swDisplay = document.getElementById('swDisplay');
const startBtn = document.getElementById('startBtn');
const lapBtn = document.getElementById('lapBtn');
const resetBtn = document.getElementById('resetBtn');
const lapsDiv = document.getElementById('laps');

const alarmArea = document.getElementById('alarmArea');
const addAlarmBtn = document.getElementById('addAlarmBtn');
const alarmsList = document.getElementById('alarmsList');

const sheetBackdrop = document.getElementById('sheetBackdrop');
const sheetTime = document.getElementById('sheetTime');
const sheetConfirm = document.getElementById('sheetConfirm');
const sheetCancel = document.getElementById('sheetCancel');
const sheetTitle = document.getElementById('sheetTitle');

const langSelect = document.getElementById('langSelect');
const labelText = document.getElementById('labelText');

/* state */
let customHours = Number(localStorage.getItem('nclock_hours')) || 24;
slider.value = customHours;
labelHours.textContent = `${customHours} 時間`;

let mode = localStorage.getItem('nclock_mode') || 'clock';
let elapsedMs = Number(localStorage.getItem('nclock_elapsed')) || 0;
let running = false;
let lastPerf = performance.now();
let laps = JSON.parse(localStorage.getItem('nclock_laps')||'[]');

let alarms = JSON.parse(localStorage.getItem('nclock_alarms')||'[]');
// alarms: [{id,time:"HH:MM",enabled:true}]

/* language */
let lang = localStorage.getItem('nclock_lang') || 'ja';
langSelect.value = lang;
const I18N = {
  ja:{
    clock:'時計', stopwatch:'ストップウォッチ', alarm:'アラーム', addAlarm:'＋ アラームを追加', sheetTitle:'アラーム時間を選択',
    cancel:'キャンセル', add:'追加', dayLabel:'1日の長さ', hoursLabel: (h)=>`${h} 時間`, saved:'設定は自動保存されます。'
  },
  en:{
    clock:'Clock', stopwatch:'Stopwatch', alarm:'Alarm', addAlarm:'+ Add Alarm', sheetTitle:'Pick alarm time',
    cancel:'Cancel', add:'Add', dayLabel:'Day length', hoursLabel: (h)=>`${h} hours`, saved:'Settings are saved automatically.'
  }
};

function applyLang(){
  const t = I18N[lang];
  tabClock.textContent = t.clock;
  tabStopwatch.textContent = t.stopwatch;
  tabAlarm.textContent = t.alarm;
  addAlarmBtn.textContent = t.addAlarm;
  sheetTitle.textContent = t.sheetTitle;
  sheetConfirm.textContent = t.add;
  sheetCancel.textContent = t.cancel;
  labelText.textContent = t.dayLabel;
  labelHours.textContent = t.hoursLabel(customHours);
  localStorage.setItem('nclock_lang', lang);
}
applyLang();

/* UI helpers */
function saveAll(){
  localStorage.setItem('nclock_hours', String(customHours));
  localStorage.setItem('nclock_mode', mode);
  localStorage.setItem('nclock_elapsed', String(elapsedMs));
  localStorage.setItem('nclock_laps', JSON.stringify(laps));
  localStorage.setItem('nclock_alarms', JSON.stringify(alarms));
  localStorage.setItem('nclock_lang', lang);
}

/* mode switching */
function showMode(m){
  mode = m;
  tabClock.classList.toggle('active', m==='clock');
  tabStopwatch.classList.toggle('active', m==='stopwatch');
  tabAlarm.classList.toggle('active', m==='alarm');

  sliderBox.style.display = (m==='clock'||m==='stopwatch') ? 'block' : 'none';
  stopwatchArea.style.display = (m==='stopwatch') ? 'block' : 'none';
  alarmArea.style.display = (m==='alarm') ? 'block' : 'none';

  display.style.display = (m==='alarm') ? 'none' : 'block';

  saveAll();
}
showMode(mode);

/* slider */
slider.addEventListener('input', e=>{
  customHours = Number(e.target.value);
  labelHours.textContent = I18N[lang].hoursLabel(customHours);
  saveAll();
});

/* language */
langSelect.addEventListener('change', e=>{
  lang = e.target.value; applyLang();
});

/* tabs events */
tabClock.addEventListener('click', ()=> showMode('clock'));
tabStopwatch.addEventListener('click', ()=> showMode('stopwatch'));
tabAlarm.addEventListener('click', ()=> showMode('alarm'));

/* stopwatch logic */
startBtn.addEventListener('click', ()=>{
  if(!running){
    running = true;
    lastPerf = performance.now();
    startBtn.textContent = (lang==='ja') ? 'ストップ' : 'Stop';
    startBtn.classList.remove('btn-start'); startBtn.classList.add('btn-stop');
    lapBtn.disabled = false; resetBtn.disabled = true;
  } else {
    running = false;
    startBtn.textContent = (lang==='ja') ? 'スタート' : 'Start';
    startBtn.classList.remove('btn-stop'); startBtn.classList.add('btn-start');
    lapBtn.disabled = true; resetBtn.disabled = false;
    saveAll();
  }
});
lapBtn.addEventListener('click', ()=>{
  laps.unshift(swDisplay.textContent);
  if(laps.length>200) laps.pop();
  renderLaps();
  saveAll();
});
resetBtn.addEventListener('click', ()=>{
  running=false; elapsedMs=0; laps=[]; renderLaps(); resetBtn.disabled=true; saveAll();
});
function renderLaps(){
  lapsDiv.innerHTML = '';
  if(!laps.length){ lapsDiv.innerHTML = `<div style="color:var(--muted); padding:8px;">${lang==='ja'?'ラップなし':'No laps'}</div>`; return; }
  laps.forEach((t,i)=>{
    const el = document.createElement('div'); el.style.padding='6px 0'; el.style.color='var(--muted)';
    el.textContent = `${i+1}. ${t}`; lapsDiv.appendChild(el);
  });
}

/* alarms UI */
function renderAlarms(){
  alarmsList.innerHTML = '';
  if(alarms.length===0){ alarmsList.innerHTML = `<div style="color:var(--muted); padding:8px;">${lang==='ja'?'アラームがありません':'No alarms'}</div>`; return; }
  alarms.forEach((a,idx)=>{
    const row = document.createElement('div'); row.className='alarm-row';
    const left = document.createElement('div'); left.style.display='flex'; left.style.flexDirection='column';
    const t = document.createElement('div'); t.className='alarm-time'; t.textContent = a.time;
    const meta = document.createElement('div'); meta.className='alarm-meta'; meta.textContent = a.enabled ? (lang==='ja'?'ON':'ON') : (lang==='ja'?'OFF':'OFF');
    left.appendChild(t); left.appendChild(meta);
    const actions = document.createElement('div'); actions.className='alarm-actions';
    // switch
    const sw = document.createElement('label'); sw.className='switch';
    const inp = document.createElement('input'); inp.type='checkbox'; inp.checked = !!a.enabled;
    const span = document.createElement('span'); span.className='slider-toggle';
    inp.addEventListener('change', ()=>{ a.enabled = inp.checked; saveAll(); renderAlarms(); scheduleAlarmAttempt(a); });
    sw.appendChild(inp); sw.appendChild(span);
    // delete
    const del = document.createElement('button'); del.className='del-btn'; del.innerHTML='🗑';
    del.addEventListener('click', ()=>{ alarms = alarms.filter(x=>x.id!==a.id); saveAll(); renderAlarms(); });
    actions.appendChild(sw); actions.appendChild(del);
    row.appendChild(left); row.appendChild(actions);
    alarmsList.appendChild(row);
  });
}
renderAlarms();

/* bottom-sheet picker (C) */
addAlarmBtn.addEventListener('click', ()=>{
  sheetTime.value = new Date().toTimeString().slice(0,5);
  sheetBackdrop.style.display = 'flex';
});
sheetCancel.addEventListener('click', ()=> sheetBackdrop.style.display='none');
sheetBackdrop.addEventListener('click', (e)=>{ if(e.target===sheetBackdrop) sheetBackdrop.style.display='none'; });

sheetConfirm.addEventListener('click', ()=>{
  const val = sheetTime.value;
  if(!val){ sheetBackdrop.style.display='none'; return; }
  const id = 'a_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
  const alarm = { id, time: val, enabled: true };
  alarms.push(alarm); saveAll(); renderAlarms(); sheetBackdrop.style.display='none';
  scheduleAlarmAttempt(alarm);
});

/* scheduling attempt:
   - we try Notification Triggers API (if supported) via service worker registration.showNotification with showTrigger
   - fallback: schedule in-page timer that will fire even if page stays open
   - compute real epoch ms for next time when virtual clock equals alarm time
*/
function computeNextRealEpochMsForAlarm(targetHHMM){
  const [th, tm] = targetHHMM.split(':').map(Number);
  const targetSeconds = th*3600 + tm*60;
  const r = 24 / customHours; // speed ratio
  const nowMs = Date.now();
  const nowSec = Math.floor(nowMs/1000);
  // try k = 0..2 to find minimal candidate >= nowSec
  for(let k=0;k<3;k++){
    const candidateRealSec = Math.ceil( (targetSeconds + k*86400) / r );
    if(candidateRealSec*1000 >= nowMs) return candidateRealSec*1000;
  }
  // fallback: next day
  const candidate = Math.ceil( (targetSeconds + 2*86400) / r );
  return candidate*1000;
}

/* keep list of in-page timers so we can clear if user deletes alarm */
const inPageTimers = {}; // id -> timeoutId

function scheduleAlarmAttempt(alarm){
  // clear previous timer if any
  if(inPageTimers[alarm.id]){ clearTimeout(inPageTimers[alarm.id]); delete inPageTimers[alarm.id]; }

  if(!alarm.enabled) return;

  const targetMs = computeNextRealEpochMsForAlarm(alarm.time);
  const delay = Math.max(0, targetMs - Date.now());

  // First: try to use Notification Triggers API via service worker registration (experimental)
  // If not supported, fallback to in-page timer.
  if('serviceWorker' in navigator && 'showNotification' in ServiceWorkerRegistration.prototype){
    navigator.serviceWorker.getRegistration().then(reg=>{
      if(!reg) return;
      // try experimental showTrigger (may not exist)
      try{
        // TimestampTrigger may not be available; guard by checking window.TimestampTrigger
        if('showTrigger' in Notification.prototype || ('TimestampTrigger' in window)){
          // try to use registration.showNotification with showTrigger option
          // Note: this API is experimental and may throw
          const opts = { body: (lang==='ja' ? 'アラーム' : 'Alarm') + ' ' + alarm.time, tag: alarm.id, renotify: true };
          // Use showTrigger if available
          if(window.TimestampTrigger){
            opts.showTrigger = new TimestampTrigger(targetMs);
            reg.showNotification((lang==='ja' ? 'アラーム' : 'Alarm'), opts).catch(()=>{ /* ignore */ });
            return;
          } else if('showTrigger' in Notification.prototype){
            opts.showTrigger = { timestamp: targetMs };
            reg.showNotification((lang==='ja' ? 'アラーム' : 'Alarm'), opts).catch(()=>{ /* ignore */ });
            return;
          }
        }
      }catch(e){
        // ignore and fallback
      }
    }).catch(()=>{ /* ignore */ });
  }

  // fallback: in-page timer (works while page/tab is open)
  const to = setTimeout(()=>{
    triggerAlarm(alarm);
    delete inPageTimers[alarm.id];
    // schedule next occurrence (tomorrow)
    scheduleAlarmAttempt(alarm);
  }, delay);
  inPageTimers[alarm.id] = to;
}

/* trigger action */
function triggerAlarm(alarm){
  // play chime
  playChime();
  // show notification via SW if possible
  if('serviceWorker' in navigator && navigator.serviceWorker.controller){
    navigator.serviceWorker.controller.postMessage({ type:'showNotification', title: (lang==='ja'?'アラーム':'Alarm'), body: (lang==='ja'?'時間です: ':'Time: ') + alarm.time, tag: alarm.id });
  }
  // also show simple alert dialog if page visible
  try{ if(document.visibilityState==='visible'){ alert((lang==='ja'?'アラーム: ':'Alarm: ') + alarm.time); } }catch(e){}
}

/* simple chime */
let audioCtx = null;
function playChime(){
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx;
    const tones = [880, 660, 988];
    let now = ctx.currentTime;
    tones.forEach((f,i)=>{
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type='sine'; o.frequency.value = f;
      g.gain.value = 0;
      o.connect(g); g.connect(ctx.destination);
      o.start(now + i*0.16);
      g.gain.linearRampToValueAtTime(0.12, now + i*0.16 + 0.02);
      g.gain.linearRampToValueAtTime(0, now + i*0.16 + 0.14);
      o.stop(now + i*0.16 + 0.16);
    });
  }catch(e){}
}

/* schedule existing alarms on load */
function scheduleAll(){
  // clear timers
  Object.values(inPageTimers).forEach(id=>clearTimeout(id));
  Object.keys(inPageTimers).forEach(k=>delete inPageTimers[k]);
  // schedule
  alarms.forEach(a=>{ if(a.enabled) scheduleAlarmAttempt(a); });
}

/* restore alarms */
scheduleAll();

/* watch for changes: when alarms array changes, re-render and schedule */
function addAlarmObject(obj){
  alarms.push(obj); saveAll(); renderAlarms(); scheduleAlarmAttempt(obj);
}
addAlarmBtn.addEventListener('click', ()=>{ sheetTime.value = new Date().toTimeString().slice(0,5); sheetBackdrop.style.display='flex'; });
sheetCancel.addEventListener('click', ()=> sheetBackdrop.style.display='none');
sheetConfirm.addEventListener('click', ()=>{
  const val = sheetTime.value;
  if(!val) { sheetBackdrop.style.display='none'; return; }
  const id = 'a_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
  const obj = { id, time: val, enabled: true };
  addAlarmObject(obj);
  sheetBackdrop.style.display='none';
});
function renderAlarms(){ renderAlarmsUI(); scheduleAll(); saveAll(); }
function renderAlarmsUI(){
  alarmsList.innerHTML=''; if(alarms.length===0){ alarmsList.innerHTML=`<div style="color:var(--muted); padding:8px;">${lang==='ja'?'アラームがありません':'No alarms'}</div>`; return;}
  alarms.forEach(a=>{
    const row = document.createElement('div'); row.className='alarm-row';
    const left = document.createElement('div'); left.style.display='flex'; left.style.flexDirection='column';
    const timeEl = document.createElement('div'); timeEl.className='alarm-time'; timeEl.textContent = a.time;
    const meta = document.createElement('div'); meta.className='alarm-meta'; meta.textContent = a.enabled ? (lang==='ja'?'ON':'ON') : (lang==='ja'?'OFF':'OFF');
    left.appendChild(timeEl); left.appendChild(meta);
    const actions = document.createElement('div');
    const swLabel = document.createElement('label'); swLabel.className='switch';
    const inp = document.createElement('input'); inp.type='checkbox'; inp.checked = !!a.enabled;
    const span = document.createElement('span'); span.className='slider-toggle';
    inp.addEventListener('change', ()=>{ a.enabled = inp.checked; saveAll(); renderAlarmsUI(); if(a.enabled) scheduleAlarmAttempt(a); else { if(inPageTimers[a.id]){ clearTimeout(inPageTimers[a.id]); delete inPageTimers[a.id]; } }});
    swLabel.appendChild(inp); swLabel.appendChild(span);
    const del = document.createElement('button'); del.className='del-btn'; del.innerHTML='🗑'; del.addEventListener('click', ()=>{ alarms=alarms.filter(x=>x.id!==a.id); saveAll(); renderAlarmsUI(); });
    actions.appendChild(swLabel); actions.appendChild(del);
    row.appendChild(left); row.appendChild(actions);
    alarmsList.appendChild(row);
  });
}
renderAlarmsUI();

/* tick loop for display & stopwatch & alarm-check */
let lastNow = performance.now();
function tick(now){
  const dt = now - lastNow; lastNow = now;
  if(running){
    elapsedMs += dt * (24 / customHours);
  }
  // Virtual clock = real seconds * r
  const d = new Date();
  const realSeconds = d.getHours()*3600 + d.getMinutes()*60 + d.getSeconds() + d.getMilliseconds()/1000;
  const r = 24 / customHours;
  const virtualSeconds = realSeconds * r;
  const vh = Math.floor(virtualSeconds/3600) % 24;
  const vm = Math.floor(virtualSeconds/60) % 60;
  const vs = Math.floor(virtualSeconds) % 60;

  if(mode==='clock'){
    display.style.display='block';
    display.textContent = `${String(vh).padStart(2,'0')}:${String(vm).padStart(2,'0')}:${String(vs).padStart(2,'0')}`;
    // check per minute at second 0
    if(vs===0) {
      // check alarms for this minute
      alarms.forEach(a=>{
        if(!a.enabled) return;
        const [ah,am] = a.time.split(':').map(Number);
        if(ah===vh && am===vm){
          triggerAlarm(a);
        }
      });
    }
  } else if(mode==='stopwatch'){
    const total = Math.floor(elapsedMs / 1000);
    const hh = Math.floor(total/3600);
    const mm = Math.floor(total/60)%60;
    const ss = total%60;
    swDisplay.textContent = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  } else {
    // alarm mode hides main display by CSS/JS showMode
  }

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

/* triggerAlarm wrapper for immediate action */
function triggerAlarm(alarm){
  playChime();
  // show notification via SW if possible
  if('serviceWorker' in navigator && navigator.serviceWorker.controller){
    navigator.serviceWorker.controller.postMessage({ type:'showNotification', title: (lang==='ja'?'アラーム':'Alarm'), body: alarm.time, tag: alarm.id });
  }
  // in-page visible alert
  if(document.visibilityState === 'visible'){
    setTimeout(()=>{ alert((lang==='ja'?'アラーム: ':'Alarm: ') + alarm.time); }, 100);
  }
}

/* request notification permission */
if('Notification' in window && Notification.permission !== 'granted'){
  Notification.requestPermission().catch(()=>{});
}

/* play chime */
let audioCtx = null;
function playChime(){
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx; const tones=[880,660,988]; let now = ctx.currentTime;
    tones.forEach((f,i)=>{ const o=ctx.createOscillator(), g=ctx.createGain(); o.type='sine'; o.frequency.value = f; g.gain.value = 0; o.connect(g); g.connect(ctx.destination); o.start(now + i*0.12); g.gain.linearRampToValueAtTime(0.12, now + i*0.12 + 0.01); g.gain.linearRampToValueAtTime(0, now + i*0.12 + 0.11); o.stop(now + i*0.12 + 0.12); });
  }catch(e){}
}

/* schedule existing alarms on load */
scheduleAll();

/* save periodically */
setInterval(saveAll, 2000);

/* register SW for notifications */
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js').catch(()=>{});
}
