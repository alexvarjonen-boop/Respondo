// Customer-facing language selection: question first, page locale only as a fallback.
// Language detection never provides or changes company facts.
import { interpretCustomerQuestion } from './query-typos.mjs';

const LANGS=['fi','sv','en'];
const strong={
  fi:new Set(('hei moi moikka terve kiitos kiitti onko onks paljonko paljoks paljo maksaa maksa hinta hinnat hinnoittelu mitä mikä mitkä missä mistä milloin miten miksi kuinka kauan kauanko kestää kestaako saako saaks voiko voiks voinko löytyykö loytyyko teillä teilla teettekö teetteko myyttekö myytteko toimitus toimituskulut toimitusaika takuu takuuta takuun takuuaika ajanvaraus varata auki aukioloajat huomenna tänään tanaan sähköposti sahkoposti puhelinnumero palvelut palautus tuotteen tuotteet').split(' ')),
  sv:new Set(('hej hejsan tjena tack vad varför varfor när nar var vilken vilka hur mycket länge lange kostar kosta pris priset priser prissättning har ni är ar inte finns öppet oppet öppettider oppettider leverans leveranstid frakt beställning bestallning beställa bestalla tjänst tjanst tjänster tjanster imorgon imorn idag garantin garantivillkor bokning boka kontaktuppgifter säljer saljer köper koper återbetalning aterbetalning storlekar färger farger flytten flyttlådor flyttlador').split(' ')),
  en:new Set(('hello hi hey thanks thank what why when where which how much many long does do did are is can could would should price prices pricing cost costs warranty warranties shipping shipment delivery deliver returns return refund exchange appointment appointments book booking hours open closed tomorrow today available availability products product service services contact email phone address sell buy purchase ordering payment order'.split(' ')))
};
const weak={
  fi:new Set('minä minäkin sinä te yritys teidän meidän löytyy haluan haluaisin saisin nyt entä sitten'.split(' ')),
  sv:new Set('jag du ni er ert det den dem vi oss ni kan får far med för fran från till skulle vill behöver behover'.split(' ')),
  en:new Set('i you your we our the a an it they them we have has there my your please of for to from'.split(' '))
};
const phrases={
  fi:[/\b(?:paljonko|paljoks|kuinka kauan|mitä maksaa|mita maksaa|onko|saanko|voitko|voitteko|teettekö|teetteko|myyttekö|myytteko)\b/u,/\b(?:mihin aikaan|mistä löyty|mista loyty|kauanko kestää)\b/u],
  sv:[/\b(?:hur mycket|hur länge|hur lange|vad kostar|vad är|vad ar|har ni|kan ni|är det|ar det|finns det|när kan|nar kan|hur bokar|vill boka)\b/u,/\b(?:hur fungerar|hur gör|hur gor|vilka tider|hur många|hur manga)\b/u],
  en:[/\b(?:how much|how long|what does|what is|what are|do you|does it|can you|could you|would you|where can|where is|is there|how do|how can|when will)\b/u,/\b(?:i would like|i want to|can i book|how many|are you open|do you have)\b/u]
};
function clean(input){
  return String(input||'').toLocaleLowerCase('en')
    .replace(/https?:\/\/\S+|www\.\S+|\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gu,' ')
    .replace(/[^a-zåäö\s']/gu,' ').replace(/\s+/gu,' ').trim();
}
function classify(message){
  const raw=String(message||'').trim().slice(0,1200);
  const score={fi:0,sv:0,en:0};
  if(!raw)return {lang:'',score:0,margin:0};
  const rawLower=clean(raw);
  for(const lang of LANGS){
    // Try only this locale's conservative, fact-preserving typo aliases.
    // Never normalize a Swedish query as Finnish before language selection.
    const corrected=clean(interpretCustomerQuestion(raw,lang).text);
    const words=corrected.split(' ').filter(Boolean);
    for(const word of words){
      if(strong[lang].has(word))score[lang]+=2;
      else if(weak[lang].has(word))score[lang]+=1;
    }
    for(const phrase of phrases[lang]) if(phrase.test(corrected))score[lang]+=3;
    // Swedish uses å; ä and ö occur in both Finnish and Swedish.
    if(lang==='sv' && /å/u.test(rawLower))score.sv+=1;
  }
  const ranking=LANGS.map(lang=>({lang,n:score[lang]})).sort((a,b)=>b.n-a.n);
  const margin=ranking[0].n-ranking[1].n;
  // One distinct topic word ("price", "öppet", "onko") is sufficient,
  // but a shared name or an ambiguous fragment is not.
  const certain=ranking[0].n>=2 && margin>=2;
  return {lang:certain?ranking[0].lang:'',score:ranking[0].n,margin};
}
export function detectCustomerQuestionLanguage(message,pageLanguage='fi',history=[]){
  const page=LANGS.includes(String(pageLanguage||'').toLowerCase())
    ? String(pageLanguage).toLowerCase() : 'fi';
  const current=classify(message);
  if(current.lang)return current.lang;
  // For "ok", "ja", a product name, or pronoun-only follow-ups, preserve
  // the last confidently identifiable CUSTOMER language, never bot prose.
  if(Array.isArray(history)){
    for(const turn of history.slice(-6).reverse()){
      const prior=String(turn?.question||turn?.user||turn?.message||'').trim();
      if(!prior)continue;
      const previous=classify(prior);
      if(previous.lang)return previous.lang;
    }
  }
  return page;
}
