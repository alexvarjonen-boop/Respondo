// Bounded, optional translation fallback. If the public translation endpoint
// throttles or times out, do not queue many identical slow customer replies.
export function createResilientTranslationClient({
  fetcher = (...args) => globalThis.fetch(...args),
  clock = () => Date.now(),
  timeoutMs = 3000,
  cooldownMs = 45000,
  onError = () => {},
} = {}) {
  const cache = new Map(), inFlight = new Map();
  let unavailableUntil = 0;
  const supported = new Set(['fi','sv','en']);
  const translate = async (text, lang, sourceLang = 'auto') => {
    const target = supported.has(String(lang||'').toLowerCase()) ? String(lang).toLowerCase() : 'fi';
    const source = supported.has(String(sourceLang||'').toLowerCase()) ? String(sourceLang).toLowerCase() : 'auto';
    const input = String(text||'').trim();
    if(!input) return '';
    if(source===target) return input;
    const key = source+'>'+target+':'+input;
    if(cache.has(key)) return cache.get(key);
    if(inFlight.has(key)) return inFlight.get(key);
    if(clock()<unavailableUntil) return '';
    const task = (async()=>{
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),timeoutMs);
      try {
        const url=new URL('https://translate.googleapis.com/translate_a/single');
        url.search=new URLSearchParams({client:'gtx',sl:source,tl:target,dt:'t',q:input.slice(0,5000)}).toString();
        const response=await fetcher(url,{signal:controller.signal,headers:{Accept:'application/json'}});
        if(!response.ok)throw new Error('HTTP '+response.status);
        const payload=await response.json();
        const result=Array.isArray(payload?.[0]) ? payload[0].map(part=>Array.isArray(part)?String(part[0]||''):'').join('').trim() : '';
        if(!result)throw new Error('Empty translation');
        cache.set(key,result);
        if(cache.size>2500)for(const oldKey of [...cache.keys()].slice(0,500))cache.delete(oldKey);
        return result;
      }catch(error){
        // Temporary provider failure must not delay every subsequent chat.
        if(/HTTP (?:429|5\d\d)|aborted|aborterror/i.test(String(error?.message||error?.name||'')))
          unavailableUntil=Math.max(unavailableUntil,clock()+cooldownMs);
        onError(target,error);
        return '';
      }finally{clearTimeout(timer);}
    })();
    inFlight.set(key,task);
    try{return await task;}finally{inFlight.delete(key);}
  };
  return translate;
}
