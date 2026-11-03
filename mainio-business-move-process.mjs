// Evidence-locked business/office-move process for Mainio's customer channels.
// The surrounding endpoints call this only after Mainio's tenant or official
// public-demo identity has been established. No generic tenant can opt in via
// its chat message. This module never fetches or assumes private customer data.
const normalize=(value)=>String(value||'').normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();

const businessMove=/(?:\b(?:yritysmuut\w*|toimistomuut\w*|liikemuut\w*|foretagsflytt\w*|kontorsflytt\w*|verksamhetsflytt\w*)\b|(?:business|company|office|corporate)\s+(?:move|moving|relocat\w*)\b|(?:moving|relocating|relocation)\s+(?:an?\s+|our\s+|the\s+)?(?:office|business|company)\b)/;
const processCue=/(?:\b(?:miten|mite|kuinka|vaihe\w*|prosessi\w*|etene\w*|edet\w*|suju\w*|hoid\w*|toteut\w*|kulku|jarjest\w*|how|steps?|process|workflow|work|handled?|happens?|hur|steg\w*|funger\w*|genomfor\w*|ordna\w*)\b|gar\s+(?:\w+\s+){0,5}till)/;
const separateQuestion=/(?:\b(?:hinta\w*|maksaa|maksavat|kustann\w*|paljonko|price|pricing|cost|costs|costing|pris\w*|kostar|budget|tarjous\w*|offert\w*|quote|lasku\w*|invoice|vuokra\w*|rental|pakettiaut\w*|paku\w*|muuttolaatik\w*|laatik\w*|varaus\w*|varata|varattu|vapaana|available|availability|ledig\w*|milloin|when|när|nar|ajankohta|kestaa|kauanko|duration|how long|hur lange|muuttopaiva\w*|muuttopaivan|hissi\w*|elevator|lift\w*)\b)/;

export function mainioBusinessMoveProcessQuestion(message,previousCustomerQuestion=''){
  const q=normalize(message);
  if(!q || q.length>420 || separateQuestion.test(q))return false;
  if(businessMove.test(q)&&processCue.test(q))return true;
  // Brief follow-up inherits only the TOPIC of the immediately previous
  // customer turn. Never inherit price, address, dates, or other assertions.
  const previous=normalize(previousCustomerQuestion);
  if(!businessMove.test(previous) || separateQuestion.test(previous))return false;
  return /^(?:miten (?:se|tama|homma) (?:etenee|sujuu|toimii)|mitka (?:ovat )?(?:sen |ne )?vaiheet|ent[aä] (?:ne )?vaiheet|how (?:does|will) (?:it|that) work|what (?:happens next|are the steps)|hur (?:gar det till|fungerar det)|vilka (?:ar )?stegen)\??$/.test(q);
}

const answerByLanguage={
  fi:'Yritysmuutto etenee näin:\n1. Aloitamme maksuttomalla suunnittelu- ja arviokäynnillä.\n2. Sovimme aikataulun ja nimeämme muuttovastaavan.\n3. Ohjeistamme henkilöstöä ja toimitamme pakkaustarvikkeet.\n4. Hoidamme sovitut pakkaus-, muutto- ja kalusteasennustyöt. Tarvittaessa autamme myös välivarastoinnissa ja kierrätyksessä.\nVoit aloittaa pyytämällä muuttotarjouksen.',
  sv:'Så här går en företagsflytt till:\n1. Vi börjar med ett kostnadsfritt planerings- och uppskattningsbesök.\n2. Vi kommer överens om tidsschemat och utser en flyttansvarig.\n3. Vi informerar personalen och levererar förpackningsmaterial.\n4. Vi utför de överenskomna packnings-, flytt- och möbelmonteringsarbetena. Vid behov hjälper vi även till med mellanlagring och återvinning.\nDu kan börja med att begära en flyttoffert.',
  en:'Here is how a business move works:\n1. We start with a free planning and assessment visit.\n2. We agree on a schedule and assign a move coordinator.\n3. We brief your staff and deliver packing materials.\n4. We carry out the agreed packing, moving and furniture-assembly work. Storage and recycling are available if needed.\nYou can get started by requesting a moving quote.',
};

export function mainioBusinessMoveProcessAnswer(rows,message,lang='fi',previousCustomerQuestion=''){
  if(!mainioBusinessMoveProcessQuestion(message,previousCustomerQuestion))return null;
  const row=(Array.isArray(rows)?rows:[]).find(item=>{
    if(!item?.id || item.approved!==true || item.source_type!=='website' ||
       item.title!=='Yritysmuuton eteneminen')return false;
    let source;
    try{source=new URL(String(item.source_url||''));}catch{return false;}
    if(source.protocol!=='https:' ||
       !['mainiomuuttopalvelu.fi','www.mainiomuuttopalvelu.fi'].includes(source.hostname) ||
       source.pathname.replace(/\/$/,'')!=='/yritysmuutot')return false;
    const evidence=normalize(item.answer);
    return ['maksuttomalla suunnittelu','muuttovastaav','pakkaustarvik','kalusteasenn','valivarastoin']
      .every(fragment=>evidence.includes(fragment));
  });
  if(!row)return null;
  return {
    answer:answerByLanguage[['fi','sv','en'].includes(lang)?lang:'fi'],
    handoff:false,confidence:1,verified:true,intent:'Yritysmuuton eteneminen',
    sourceIds:[row.id],selected:[row],
  };
}
