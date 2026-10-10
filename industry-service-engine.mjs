// Industry-neutral service confirmation with additional cross-language trade terminology.
// Only company-approved knowledge passed in by the caller may prove a capability.
// A broad sector label ("autokorjaamo", "LVI", "electrician") is NEVER proof
// that a particular operation on a particular part is offered.

const norm=value=>String(value||'').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-z0-9\s-]/g,' ').replace(/\s+/g,' ').trim();

const actionGroups=[
  ['replace',/\b(?:vaih[dt]\w*|vaiht\w*|uusim\w*|replace\w*|swapp?\w*|byta|byter|byte\w*|utbyt\w*)\b/],
  ['patch',/\b(?:paikka\w*|paikk\w*|tulppa\w*|puncture\s+repair\w*|patch\w*|plugging|plug\s+repair|lappa\w*|punkter\w*)\b/],
  ['balance',/\b(?:tasapainot\w*|balanc\w*|balanser\w*)\b/],
  ['align',/\b(?:suunta\w*|nelipyorasuunta\w*|wheel\s+align\w*|hjulinstall\w*|fyrhjulsinstall\w*)\b/],
  ['diagnose',/\b(?:diagnos\w*|diagno\w*|vikakood\w*|vianets\w*|vikadiagno\w*|fault\s+code\w*|obd\w*|felsok\w*|fault\s+finding|troubleshoot\w*)\b/],
  ['inspect',/\b(?:tarkast\w*|katsast\w*|inspect\w*|besikt\w*|kontroll\w*|besiktning\w*)\b/],
  ['install',/\b(?:asenn\w*|asent\w*|install\w*|monter\w*|fitt?ing\b)\b/],
  ['repair',/\b(?:korj\w*|repair\w*|fix\b|fixing\b|laga\w*|reparer\w*|renover\w*)\b/],
  ['maintain',/\b(?:huol\w*|servic\w*|underhall\w*|maintain\w*|maintenance\b)\b/],
  ['clean',/\b(?:pesu\w*|pese\w*|pesem\w*|puhdist\w*|siivou\w*|tvatt\w*|wash\w*|clean\w*|rengor\w*|stad\w*)\b/],
  ['paint',/\b(?:maala\w*|paint\w*|malning\w*|maler\w*)\b/],
  ['cut',/\b(?:leikka\w*|klipp\w*|cutting\b|cut\b|haircut\w*)\b/],
  ['treat',/\b(?:hier\w*|hoit\w*|treat\w*|massage\w*|behandl\w*)\b/],
  ['transport',/\b(?:kuljet\w*|nout\w*|toimit\w*|transport\w*|deliver\w*|flytt\w*)\b/],
  ['build',/\b(?:rakenn\w*|remont\w*|saneera\w*|construct\w*|renovat\w*|bygga|bygg\w*)\b/],
  ['audit',/\b(?:kirjanpid\w*|tilintarkast\w*|accounting\b|bookkeep\w*|bokfor\w*|revision\w*)\b/],
];
// More-specific concepts precede their parent concepts. Terms in a group are
// equivalents, NOT adjacent capabilities (tire replacement != tire puncture repair).
const objectGroups=[
  ['tie_rod_end',/\b(?:raide(?:tangon|tankojen|tanko)\s+pa\w*|raid epa\w*|raidepaa\w*|tie\s+rod\s+end\w*|styrled\w*|styrstagsand\w*)\b/],
  ['tie_rod',/\b(?:raide(?:tanko|tangon|tankoja|tangot|tankojen)\w*|tie\s+rods?\b|styrstag\w*)\b/],
  ['agm_battery',/\b(?:agm[\s-]*akku\w*|agm[\s-]*batter\w*|agm[\s-]*battery|start[\s-]*stop[\s-]*(?:akku\w*|batter\w*|battery))\b/],
  ['battery',/\b(?:akku\w*|aku(?:n|t|ja|jen|sta|ssa|lle|lla)|batter(?:y|ies|i|ier|iet|ierna)\b|car\s+battery|bilbatter\w*)\b/],
  ['tire',/\b(?:reng\w*|renka\w*|renk\w*|tyres?\b|tires?\b|dack\w*|hjul\b)\b/],
  ['brake_disc',/\b(?:jarrulev\w*|brake\s+disc\w*|brake\s+rotor\w*|bromsskiv\w*)\b/],
  ['brake_pad',/\b(?:jarrupal\w*|brake\s+pad\w*|bromsbelagg\w*)\b/],
  ['brake',/\b(?:jarru\w*|brak\w*|broms\w*)\b/],
  ['timing_belt',/\b(?:jakohih\w*|timing\s+belt\w*|kamrem\w*)\b/],
  ['timing_chain',/\b(?:jakoketj\w*|timing\s+chain\w*|kamkedj\w*)\b/],
  ['clutch',/\b(?:kytkin\w*|kytkim\w*|clutch\w*|koppling\w*)\b/],
  ['alternator',/\b(?:laturi\w*|generaattor\w*|alternator\w*|generator\w*)\b/],
  ['starter_motor',/\b(?:starttimoottor\w*|starttimoottori\w*|starter\s+motor\w*|startmotor\w*)\b/],
  ['suspension',/\b(?:iskunvaimen\w*|jousit\w*|suspension\b|shock\s+absorber\w*|stotdampar\w*)\b/],
  ['air_conditioning',/\b(?:ilmastoin\w*|air[\s-]*condition\w*|ac[\s-]*service|ac[\s-]*recharg\w*|luftkondition\w*)\b/],
  ['oil',/\b(?:oljy\w*|oil\b|motorolja\w*|olja\w*)\b/],
  ['engine',/\b(?:moottor\w*|engine\w*|motor\w*)\b/],
  ['windshield',/\b(?:tuulilas\w*|windshield\w*|windscreen\w*|vindrut\w*)\b/],
  ['headlight',/\b(?:ajoval\w*|umpio\w*|headlight\w*|stralkastar\w*)\b/],
  ['exhaust',/\b(?:pakoputk\w*|pakokaas\w*|exhaust\w*|avgas\w*)\b/],
  ['window',/\b(?:ikkun\w*|window\w*|fonster\w*)\b/],
  ['roof',/\b(?:katto\w*|katon\w*|roof\w*|taklagg\w*|tak\b)\b/],
  ['gutter',/\b(?:ranni\w*|rann\w*|gutter\w*|hangrann\w*)\b/],
  ['toilet',/\b(?:wc[\s-]*istui\w*|wc[\s-]*pytt\w*|toilet\w*|toalett\w*|vessanpytt\w*)\b/],
  ['faucet',/\b(?:hana\w*|hanan\w*|sekoittaja\w*|faucet\w*|tap\b|blandar\w*)\b/],
  ['water_heater',/\b(?:lamminvesivaraaj\w*|water\s+heater\w*|varmvattenbered\w*)\b/],
  ['heat_pump',/\b(?:ilmalampopump\w*|lampopump\w*|heat\s+pump\w*|varmepump\w*)\b/],
  ['socket',/\b(?:pistorasi\w*|sahkopistok\w*|electrical\s+outlet\w*|socket\w*|vagguttag\w*|eluttag\w*)\b/],
  ['light',/\b(?:valais\w*|kattolamp\w*|lamp\w*|lighting\b|belysn\w*)\b/],
  ['hair',/\b(?:hius\w*|hiust\w*|hair\w*|harklipp\w*|frisyr\w*)\b/],
  ['beard',/\b(?:parran\w*|parta\w*|beard\w*|skagg\w*)\b/],
  ['nail',/\b(?:kyns\w*|nail\w*|nagel\w*)\b/],
  ['tooth',/\b(?:hampa\w*|hammas\w*|tooth\b|teeth\b|tand\w*)\b/],
  ['dog',/\b(?:koira\w*|dog\b|dogs\b|hund\w*)\b/],
  ['website',/\b(?:verkkosiv\w*|kotisiv\w*|website\w*|web\s+site\w*|hemsid\w*)\b/],
  ['computer',/\b(?:tietokone\w*|lapp ar\w*|laptop\w*|computer\w*|dator\w*)\b/],
  ['phone',/\b(?:puhelim\w*|alypuhelim\w*|smartphone\w*|mobile\s+phone\w*|telefon\w*)\b/],
  ['apartment',/\b(?:asunto\w*|asunn\w*|apartment\w*|bostad\w*|lagenhet\w*)\b/],
  ['furniture',/\b(?:huonekal\w*|furniture\b|mobel\w*)\b/],
  ['payroll',/\b(?:palkanlask\w*|payroll\b|loneadministr\w*)\b/],
  ['vat',/\b(?:arvonlisaver\w*|alv\b|vat\b|moms\b)\b/],
];
const overrides={
  tie_rod_end:new Set(['tie_rod']),
  agm_battery:new Set(['battery']),
  brake_disc:new Set(['brake']),
  brake_pad:new Set(['brake']),
  timing_chain:new Set(['engine']),
  timing_belt:new Set(['engine'])
};
function concepts(value){
  const q=norm(value);
  const found=new Set(objectGroups.filter(([,rx])=>rx.test(q)).map(([name])=>name));
  for(const [name,remove] of Object.entries(overrides)) if(found.has(name)) for(const item of remove) found.delete(item);
  return found;
}
function actions(value){const q=norm(value);return new Set(actionGroups.filter(([,rx])=>rx.test(q)).map(([name])=>name))}
const stop=/\b(?:paljonko|hinta|maksaa|cost|price|pris|kostar|milloin|when|nar|huomenna|tanaan|today|tomorrow|ilmais|gratis|free|takuu|warranty|garanti|toimitus|shipping|delivery|leverans|palautus|returns|refund)\b/;
const unsupportedModifier=/\b(?:agm|efb|start[\s-]*stop|hybrid\w*|hybrid\w*|sahkoaut\w*|electric\s+(?:car|vehicle)|ev\b|bmw|tesla|toyota|volvo|vw\b|volkswagen|mercedes|audi|ford|honda|prius|tubeless|run[\s-]*flat|rengaspaineantur\w*|tpms|tpms[\s-]*antur\w*|sensor\w*|abs\b|can[\s-]*vayl\w*|can[\s-]*bus|obd(?:[\s-]*ii|[\s-]*2)?|diesel\w*|bensiini\w*)\b/g;
const denial=/\b(?:emme|eivat|ei\b|not\b|never\b|don't\b|dont\b|doesn't\b|cannot\b|can't\b|inte\b|aldrig\b|ej\b)\b/;
const uncertain=/\b(?:ehka|mahdollisesti|voi\s+olla|perhaps|maybe|possibly|kanske|eventuellt)\b/;
const junk=/\b(?:arvostelu|testimonial|review|asiakaskokem|privacy|tietosuoja|kayttoeh|terms\s+of\s+service|cookie|evaste)\b/;
const isQuestion=/\b(?:vaihdatteko|vaihatteko|vaihtaisitteko|paikkaatteko|paikkaatteks|teetteko|tarjoatteko|huollatteko|korjaatteko|asennatteko|pystytteko|voitteko|voisitteko|onnistuuko|onnistuisko|hoidatteko|testaatteko|tarkastatteko|pesetteko|saako|loytyyko|onko\s+teilla|do\s+you|can\s+you|could\s+you|do\s+you\s+offer|is\s+it\s+possible|har\s+ni|kan\s+ni|byter\s+ni|erbjuder\s+ni|lagar\s+ni|gor\s+ni|utfor\s+ni)\b/;
function isServiceQuestion(message){
  const q=norm(message);
  if(!isQuestion.test(q) || stop.test(q)) return false;
  return /^(?:vaih\w*|paikka\w*|teetteko|tarjoatteko|huol\w*|korja\w*|asen\w*|pyst\w*|voitteko|voisitteko|onnistu\w*|hoidatteko|testaatteko|tarkastatteko|pesetteko|saako|loytyyko|onko\s+teilla|do\s+you|can\s+you|could\s+you|is\s+it\s+possible|har\s+ni|kan\s+ni|byter\s+ni|erbjuder\s+ni|lagar\s+ni|gor\s+ni|utfor\s+ni)\b/.test(q);
}
function requestedAction(message){
  const q=norm(message).replace(/^(?:do|can|could)\s+you\s+/,'')
    .replace(/^(?:kan|byter|lagar|gor|utfor)\s+ni\s+/,'');
  const found=actions(q);
  const direct=q.match(/^(vaih\w*|paikka\w*|korja\w*|huol\w*|asen\w*|testa\w*|tarkast\w*|pes\w*)/);
  if(direct){
    if(/^vaih/.test(direct[1])) found.add('replace');
    if(/^paikk/.test(direct[1])) found.add('patch');
    if(/^korj/.test(direct[1])) found.add('repair');
    if(/^huol/.test(direct[1])) found.add('maintain');
    if(/^asen/.test(direct[1])) found.add('install');
    if(/^test/.test(direct[1])) found.add('diagnose');
    if(/^tark/.test(direct[1])) found.add('inspect');
    if(/^pes/.test(direct[1])) found.add('clean');
  }
  // Never mistake an offer request's generic "teettekö" as a service action.
  return found;
}
const qualified=(text)=>[...new Set([...norm(text).matchAll(unsupportedModifier)].map(x=>x[0]))];
function qualifierMatch(question,source){
  const a=qualified(question), b=norm(source);
  if(!a.every(x=>b.includes(x))) return false;
  // Numeric model/year, exact part and measurements need explicit support.
  const numbers=[...norm(question).matchAll(/\b\d{2,6}(?:[.,]\d+)?\b/g)].map(x=>x[0]);
  return numbers.every(n=>new RegExp('(?:^|\\s)'+n.replace('.','\\.')+'(?:\\s|$)').test(b));
}
function splitEvidence(row){
  return [String(row.title||''),...String(row.answer||'')
    .split(/(?:[.!?;]\s+|\s+[•·]\s+|\s+(?:mutta|but|men|however)\s+|,\s*(?=(?:emme|ei|vaihd\w*|korj\w*|paikka\w*|we\s|vi\s)))/i)
    .filter(Boolean)];
}
function sourceQuality(row){
  const meta=norm(String(row.category||'')+' '+String(row.title||''));
  if(junk.test(meta)||junk.test(norm(row.answer).slice(0,200))) return false;
  if(!row.answer || String(row.answer).trim().length<3) return false;
  // The caller already filters approved, company-owned rows. Verify that this
  // fact is about services, not an automotive item offered for retail sale.
  return /\b(?:palvel\w*|services?\b|tjanst\w*|hinn\w*|pricing\b|price\s+list)\b/.test(meta) ||
    /\b(?:huol\w*|korj\w*|asenn\w*|vaiht\w*|paikk\w*|diagnos\w*|repair\w*|service\w*|install\w*|maintenance\b)\b/.test(meta);
}
function genericSubjectTokens(value){
  const input=norm(value).split(/\s+/).filter(Boolean);
  const ignore=/^(?:teetteko|tarjoatteko|vaihdatteko|vaihatteko|vaihtaisitteko|paikkaatteko|korjaatteko|huollatteko|asennatteko|hoidatteko|pystytteko|voitteko|voisitteko|onnistuuko|onko|teilla|te|ni|do|you|can|could|we|the|a|an|and|or|vai|ja|seka|myos|for|to|of|with|offer|provide|have|some|any|har|kan|byter|erbjuder|utfor|gor|laga|repair|replace|change|swap|install|fix|maintenance|byta|bytte|service|services|palvelu\w*|vaiht\w*|vaihd\w*|paikk\w*|korj\w*|huol\w*|asenn\w*|pes\w*|puhdist\w*|testa\w*|diagnos\w*|tarkast\w*)$/;
  return input.filter(x=>x.length>=5 && !ignore.test(x) && !stop.test(x));
}
function genericSubjectSupported(phrase,clause){
  const tokens=genericSubjectTokens(phrase);
  if(!tokens.length || tokens.length>4) return false;
  const source=norm(clause).split(/\s+/);
  // Five-character stems handle common Finnish case inflection, but do not
  // equate unrelated objects. Exact documented action remains mandatory.
  return tokens.every(word=>source.some(found=>
    found===word || (word.length>=6 && found.length>=6 &&
      found.slice(0,Math.min(6,word.length-1))===word.slice(0,Math.min(6,word.length-1)))));
}
function describe(question,lang){
  const s=String(question||'').trim().replace(/[?!.\s]+$/,'');
  return lang==='sv'?'Ja, enligt företagets uppgifter utför vi den tjänsten.'
    :lang==='en'?'Yes, according to the company information, we offer that service.'
      :'Kyllä, yrityksen tietojen mukaan tämä palvelu kuuluu valikoimaan.';
}
function explicitNo(lang){
  return lang==='sv'?'Enligt företagets uppgifter erbjuder vi inte den tjänsten.'
    :lang==='en'?'According to the company information, we do not offer that service.'
      :'Yrityksen tietojen mukaan emme tarjoa tätä palvelua.';
}
function unanswered(lang){
  return lang==='sv'
    ?'Jag hittar ingen bekräftelse på den här tjänsten i företagets uppgifter. Lämna gärna dina kontaktuppgifter så kan företaget kontrollera saken.'
    :lang==='en'
      ?'I could not verify that this specific service is offered. Leave your contact details so the company can confirm.'
      :'Yrityksen tiedoista ei löytynyt vahvistusta juuri tälle työlle. Jätä yhteystietosi, niin yritys voi varmistaa asian.';
}

export function industryServiceAnswer(rows,message,lang='fi'){
  if(!isServiceQuestion(message)) return null;
  const objects=concepts(message);
  const requested=requestedAction(message);
  if(!requested.size) return null;
  // An unfamiliar specialist term can be understood by direct matching against
  // the company's wording, but a named ontology object has stricter safeguards.
  const generic=!objects.size;
  if(generic && genericSubjectTokens(message).length===0) return null;
  const positives=[],negatives=[];
  for(const row of (rows||[])){
    if(!sourceQuality(row)) continue;
    const clauses=splitEvidence(row);
    const title=norm(row.title||'');
    const faqQuestion=/\?$/.test(String(row.title||'').trim());
    const faqYes=/^(?:kylla|yes|ja\b|on|onnistuu)\b/.test(norm(row.answer));
    const faqNo=/^(?:ei\b|no\b|nej\b|emme\b)\b/.test(norm(row.answer));
    for(let i=0;i<clauses.length;i++){
      if(i===0 && faqQuestion && !faqYes && !faqNo) continue;
      const clause=clauses[i];
      const normClause=norm(clause);
      if(!normClause || uncertain.test(normClause)) continue;
      const available=concepts(clause);
      const subjectOK=generic
        ? genericSubjectSupported(message,clause)
        :[...objects].every(name=>available.has(name) ||
          (name==='battery' && available.has('agm_battery')));
      if(!subjectOK) continue;
      if(!qualifierMatch(message,clause)) continue;
      const serviceActions=actions(clause);
      const actionOK=[...requested].every(x=>serviceActions.has(x));
      if(!actionOK) continue;
      // A named service in a service-list or price-list row proves an offer.
      // A review, speculative text or unrelated same-page mention does not.
      const isDenied=denial.test(normClause);
      (isDenied?negatives:positives).push(row);
    }
    // Some authored Q&A rows store the service name in the question and a
    // short "Kyllä / Ei" in the answer. The title cannot establish a "yes"
    // by itself; require an unambiguous explicit response.
    if(faqQuestion && (faqYes||faqNo) &&
      [...objects].every(name=>concepts(title).has(name)) &&
      [...requested].every(x=>actions(title).has(x)) &&
      qualifierMatch(message,title)){
      (faqNo?negatives:positives).push(row);
    }
  }
  // Contradictory company sources are not safe to answer from automatically.
  const chosen=positives.length&&!negatives.length?positives[0]:
    negatives.length&&!positives.length?negatives[0]:null;
  if(!chosen){
    return {answer:unanswered(lang),handoff:true,confidence:0.2,intent:'Palvelut',
      sourceIds:[],selected:[]};
  }
  const yes=positives.length>0;
  return {answer:yes?describe(message,lang):explicitNo(lang),
    handoff:false,confidence:0.96,intent:'Palvelut',
    sourceIds:chosen.id?[chosen.id]:[],selected:[chosen]};
}
