// Evidence-locked business/office-move process for Mainio's customer channels.
// The surrounding endpoints call this only after Mainio's tenant or official
// public-demo identity has been established. No generic tenant can opt in via
// its chat message. This module never fetches or assumes private customer data.
const normalize=(value)=>String(value||'').normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();

// Intents are recognized by the whole request, not one exact FAQ sentence.
// Cover compound nouns, "firman muutto", "moving offices", spoken Finnish,
// Swedish inflections and English office-relocation terminology. Keep
// specific price, availability, booking and rental intents out of this rule.
const businessMove=/(?:\b(?:yritysmuut[a-z]*|yritysmuut[oö][a-z]*|yritys\s+muut[a-z]*|toimistomuut[a-z]*|toimisto\s+muut[a-z]*|liikemuut[a-z]*|firmamuut[a-z]*|firmanmuut[a-z]*|konttorimuut[a-z]*|foretagsflytt[a-z]*|kontorsflytt[a-z]*|verksamhetsflytt[a-z]*)\b|(?:yrityksen|yrityksemme|firmamme|firman|firma|toimiston|toimitilojen|toimitilan|toimitilamme|konttorin|liiketilan|liiketilojen|tyopaikan)\s+(?:\w+\s+){0,2}(?:muut[a-z]*|muuttami[a-z]*|siir[a-z]*|vaih[a-z]*)\b|(?:muut[a-z]*|siir[a-z]*|vaih[a-z]*)\s+(?:\w+\s+){0,2}(?:yritys|yritysta|yrityksen|firma|firmamme|toimisto|toimiston|konttori|toimitiloihin|toimitilat)\b|(?:business|company|corporate|office|workplace)\s+(?:move|moves|moving|relocation|relocating)\b|(?:moving|move|relocating|relocation)\s+(?:an?\s+|our\s+|the\s+)?(?:office|offices|business|company|workplace)\b|(?:flytta|flyttar|flytten|flytt|flyttning|byte)\s+(?:av\s+|vart\s+|ett\s+|en\s+)?(?:foretag|foretaget|kontor|kontoret|arbetsplats|verksamhet|lokal|lokaler)\b|(?:foretaget|kontoret|verksamheten)\s+(?:flyttar|flyttas|byter)\b)/;
const processCue=/(?:\b(?:miten|mite|mites|mitenka|mitenkas|kuinka|kuis|milla tavalla|vaihe[a-z]*|prosessi[a-z]*|etene[a-z]*|edet[a-z]*|suju[a-z]*|hoid[a-z]*|toteut[a-z]*|kulku|jarjest[a-z]*|organiso[a-z]*|alka[a-z]*|aloit[a-z]*|kaytann[a-z]*|how|what happens|what comes first|steps?|process|workflow|handled?|happens?|organized?|arranged?|planning|start|hur|steg[a-z]*|process[a-z]*|funger[a-z]*|genomfor[a-z]*|ordna[a-z]*|skot[a-z]*|forlopp[a-z]*|borja[a-z]*|borjar[a-z]*)\b|gar\s+(?:\w+\s+){0,5}till|vad\s+(?:hander|händer))/;
const separateQuestion=/(?:\b(?:hinta[a-z]*|hinnoit[a-z]*|maksaa|maksavat|kustann[a-z]*|paljonko|price|pricing|cost|costs|costing|charges?|pris[a-z]*|kostar|budget|tarjous[a-z]*|offert[a-z]*|quote|lasku[a-z]*|invoice|vuokra[a-z]*|rental|pakettiaut[a-z]*|paku[a-z]*|muuttolaatik[a-z]*|laatik[a-z]*|varaus[a-z]*|varata|varattu|vapaana|saatavilla|available|availability|ledig[a-z]*|milloin|when|nar|ajankohta|kestaa|kauanko|duration|how long|hur lange|muuttopaiva[a-z]*|muuttopaivan|hissi[a-z]*|elevator|lift[a-z]*|huomenna|huomis[a-z]*|tomorrow|imorgon|bokning|boka|tilaa|tilata|tilaaminen|order|book|international|abroad|overseas|ulkomaa[a-z]*|ulkoma[a-z]*|pakkaus[a-z]*|pakkauk[a-z]*|asiakirja[a-z]*|arkaluont[a-z]*|sopimus[a-z]*|saatavuus)\b)/;
const capabilityOnly=/^(?:voitteko|pystytteko|teetteko|hoidatteko|onnistuuko|tarjoatteko|saako|onko|can you|could you|do you|are you able|does your company|kan ni|gor ni|erbjuder ni)\b/;
const explicitProcess=/(?:\b(?:miten|mite|mites|mitenkas|mitenka|kuinka|vaihe[a-z]*|prosessi[a-z]*|etene[a-z]*|edet[a-z]*|suju[a-z]*|how|steps?|process|hur|steg[a-z]*|forlopp[a-z]*|funger[a-z]*)\b|gar\s+(?:\w+\s+){0,5}till)/;

export function mainioBusinessMoveProcessQuestion(message,previousCustomerQuestion=''){
  const q=normalize(message);
  if(!q || q.length>420 || separateQuestion.test(q))return false;
  if(businessMove.test(q) && processCue.test(q)){
    // "Can you handle an office move?" asks whether the service exists,
    // not for the process. "Can you explain how..." does ask for steps.
    if(capabilityOnly.test(q) && !explicitProcess.test(q))return false;
    return true;
  }
  // A short follow-up inherits the topic only from the immediately previous
  // customer question. It never inherits pricing, date, booking or other facts.
  const previous=normalize(previousCustomerQuestion);
  if(!businessMove.test(previous) || separateQuestion.test(previous))return false;
  return /^(?:(?:ja|no|entapa|enta|sitten)\s+)?(?:miten (?:se|tama|homma|toi) (?:etenee|menee|sujuu|toimii)|mitka (?:ovat )?(?:sen |ne )?vaiheet|(?:ne|sen) vaiheet|ent[aä] (?:ne )?vaiheet|mita sen jalkeen tapahtuu|mista aloitetaan|how (?:does|will) (?:it|that) work|how (?:does|will) it proceed|what (?:happens next|are the steps)|hur (?:gar det till|fungerar det)|vilka (?:ar )?stegen)\??$/.test(q);
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
