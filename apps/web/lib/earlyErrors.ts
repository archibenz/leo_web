// Ранние ошибки: всё, что падает ДО гидрации. Сборщик (lib/clientErrors.ts)
// ставится эффектом, а он приходит после события load — ошибка загрузки
// страницы, упавший чанк, ошибка в раннем скрипте проходили мимо него. Хуже
// всего упавший чанк: гидрации нет вовсе, сборщик не появляется никогда, и
// белая страница у покупателя оставалась невидимой.
//
// Поэтому первым в <head> стоит этот инлайн — строкой, без сборки и без
// зависимостей, ES5: что здесь написано, то и исполняется. Он копит до 20
// ошибок в window.__earlyErrors. Сборщик при монтировании забирает буфер и
// ставит window.__earlyErrors = null — это и есть флаг «забрано»: инлайн
// сравнивает буфер со своим и больше ничего не копит и не шлёт. Если сборщик
// так и не пришёл, инлайн сам шлёт буфер sendBeacon'ом на скрытие вкладки —
// в том же формате, что сборщик (POST /api/client-errors).
//
// Отказ загрузки <script src> — не ErrorEvent: он не всплывает и в
// window.onerror не приходит, его видно только в фазе захвата. Берём лишь
// скрипты /_next/ (картинки и чужие скрипты — шум) и шлём как window_error
// класса ChunkLoadError — так же webpack называет отказ догружаемого чанка.
// Хэш сборки из имени файла убран: иначе каждая выкатка рождала бы «новую»
// ошибку с тем же смыслом.

export interface EarlyError {
  kind: 'window_error' | 'unhandled_rejection';
  error: unknown;
}

declare global {
  interface Window {
    __earlyErrors?: EarlyError[] | null;
  }
}

/** Забрать то, что поймал инлайн, и выключить его. Второй вызов вернёт []. */
export function takeEarlyErrors(): EarlyError[] {
  if (typeof window === 'undefined') return [];
  const early = window.__earlyErrors;
  window.__earlyErrors = null;
  return Array.isArray(early) ? early : [];
}

// Строка релиза вставляется в тело <script> — пропускаем только безопасный
// алфавит, иначе null (как у сборщика без NEXT_PUBLIC_RELEASE).
const SAFE_RELEASE = /^[\w.+-]{1,60}$/;

export function earlyErrorsScript(release?: string): string {
  const rel = release && SAFE_RELEASE.test(release) ? JSON.stringify(release) : 'null';
  return `(function(w,d){
if(w.__earlyErrors!==undefined)return;
var q=[];w.__earlyErrors=q;
function live(){return w.__earlyErrors===q}
function add(k,e){if(live()&&q.length<20)q.push({kind:k,error:e})}
w.addEventListener('error',function(e){
var t=e.target;
if(t&&t.tagName){
if(t.tagName!=='SCRIPT')return;
var s=String(t.src||'');
if(s.indexOf('/_next/')<0)return;
var p=s.replace(/^https?:\\/\\/[^\\/]+/,'').replace(/[?#].*$/,'').replace(/-[0-9a-f]{8,}(?=\\.js$)/,'');
var x=new Error('Loading script failed: '+p);x.name='ChunkLoadError';x.stack='';
add('window_error',x);return;
}
add('window_error',e.error||e.message);
},true);
w.addEventListener('unhandledrejection',function(e){add('unhandled_rejection',e.reason)});
function send(){
if(!live()||!q.length)return;
w.__earlyErrors=null;
var by={},ev=[];
for(var i=0;i<q.length;i++){
var r=q[i].error,m=String(r&&r.message!==undefined?r.message:r).slice(0,500);
if(/^Script error\\.?$/i.test(m))continue;
var c=(r&&r.name)||'Error',key=q[i].kind+'|'+c+'|'+m;
if(by[key]){by[key].count++;continue}
by[key]={kind:q[i].kind,errorClass:c,message:m,frames:[],route:location.pathname,browser:null,release:${rel},count:1};
ev.push(by[key]);
}
if(!ev.length||!navigator.sendBeacon)return;
try{navigator.sendBeacon('/api/client-errors',new Blob([JSON.stringify({events:ev})],{type:'application/json'}))}catch(_){}
}
w.addEventListener('pagehide',send);
d.addEventListener('visibilitychange',function(){if(d.visibilityState==='hidden')send()});
})(window,document);`;
}
