// Extract only explicitly labelled business Q&A and service records from
// first-party framework hydration JSON. Never execute arbitrary JavaScript.
const clean=x=>String(x||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
export function hydratedBusinessData(html){
  const result={faqPairs:[],servicePairs:[],found:false};
  const scripts=String(html||'').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi);
  let count=0;
  const used=new Set();
  for(const m of scripts){
    if(++count>150)break;
    const attr=m[1];
    if(!/(?:id\s*=\s*["']__NEXT_DATA__["']|id\s*=\s*["']__NUXT_DATA__["'])/i.test(attr))continue;
    if(!/type\s*=\s*["']application\/json["']/i.test(attr))continue;
    if(m[2].length>1_000_000)continue;
    let data;
    try{data=JSON.parse(m[2]);}catch{continue;}
    let scanned=0;
    const walk=(node,path=[],depth=0)=>{
      if(++scanned>2500||depth>11||!node||typeof node!=='object')return;
      if(Array.isArray(node)){
        const key=path.at(-1)||'';
        if(/^(?:faq|faqs|faqItems|questions|frequentlyAskedQuestions)$/i.test(key)){
          for(const q of node.slice(0,80)){
            const question=clean(q?.question||q?.title||q?.name);
            const answer=clean(q?.answer||q?.acceptedAnswer?.text||q?.body||q?.response);
            if(question.length<9||question.length>180||answer.length<15||answer.length>1200)continue;
            const hash=(question+'|'+answer).toLowerCase();
            if(!used.has(hash)){used.add(hash);result.faqPairs.push({title:question,answer});}
          }
        }
        if(/^(?:services|serviceList|serviceItems)$/i.test(key)){
          for(const item of node.slice(0,80)){
            const name=clean(item?.name||item?.title);
            const description=clean(item?.description||item?.summary||item?.text);
            if(name.length<4||name.length>100||description.length<18||description.length>700)continue;
            const hash=(name+'|'+description).toLowerCase();
            if(!used.has(hash)){used.add(hash);result.servicePairs.push({name,description});}
          }
        }
        node.slice(0,150).forEach(n=>walk(n,path,depth+1));
        return;
      }
      const key=path.at(-1)||'';
      if(/^(?:faq|faqs|faqItems|questions|frequentlyAskedQuestions)$/i.test(key)){
        const candidates=Array.isArray(node)?node:(node.items||node.entries||node.questions||[]);
        for(const q of (Array.isArray(candidates)?candidates:[]).slice(0,80)){
          const question=clean(q.question||q.title||q.name);
          const answer=clean(q.answer||q.acceptedAnswer?.text||q.body||q.response);
          if(question.length<9||question.length>180||answer.length<15||answer.length>1200)continue;
          const hash=(question+'|'+answer).toLowerCase();if(used.has(hash))continue;used.add(hash);
          result.faqPairs.push({title:question,answer});
        }
      }
      if(/^(?:services|serviceList|serviceItems)$/i.test(key)){
        const candidates=node.items||node.entries||[];
        for(const item of (Array.isArray(candidates)?candidates:[]).slice(0,80)){
          const name=clean(item.name||item.title);
          const description=clean(item.description||item.summary||item.text);
          if(name.length<4||name.length>100||description.length<18||description.length>700)continue;
          const hash=(name+'|'+description).toLowerCase();if(used.has(hash))continue;used.add(hash);
          result.servicePairs.push({name,description});
        }
      }
      for(const [k,v] of Object.entries(node).slice(0,75)){
        if(k==='translations'||k==='i18n'||k==='intl'||k==='localeStrings'||k==='analytics'||k==='secrets')continue;
        if(v&&typeof v==='object')walk(v,[...path,k],depth+1);
      }
    };
    // Restrict to the page's own public props, not build metadata.
    walk(data?.props?.pageProps||data?.data||data?.payload||{});
  }
  result.faqPairs=result.faqPairs.slice(0,80);
  result.servicePairs=result.servicePairs.slice(0,80);
  result.found=Boolean(result.faqPairs.length||result.servicePairs.length);
  return result;
}
