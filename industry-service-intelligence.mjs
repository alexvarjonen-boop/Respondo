// Specialist service matching across industries. Dictionaries identify terms,
// never assert that a business actually provides any of these services.
// Only approved, tenant-scoped service facts are accepted as evidence.
const norm=value=>String(value||'').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9+\s-]/g,' ')
  .replace(/-/g,' ').replace(/\s+/g,' ').trim();

const SUBJECTS={
  battery:['akku','akkuja','akun','akut','starttiakku','kaynnistysakku','battery','batteries','car battery','bilbatteri','startbatteri'],
  hv_battery:['ajoakku','ajoakun','korkeajanniteakku','high voltage battery','traction battery','hogvoltsbatteri'],
  tie_rod_end:['raidetangon paa','raidetangon paat','raidetangonpaan','raidetangonpaat','raidetangon paiden','raidetangon paita','raidetangonpaiden','tie rod end','track rod end','styrled'],
  tie_rod:['raidetanko','raidetankoja','raidetangon','tie rod','track rod','styrstag'],
  tire:['rengas','renkaan','renkaita','renkaat','tire','tires','tyre','tyres','dack','dacket','dacken'],
  brake_pad:['jarrupala','jarrupalat','jarrupaloja','jarrupalan','jarrupalojen','brake pad','bromsbelagg'],
  brake_disc:['jarrulevy','jarrulevyt','jarrulevyjen','brake disc','brake rotor','bromsskiva'],
  brake:['jarru','jarrut','jarrujen','brake','brakes','bromsar'],
  clutch:['kytkin','kytkimen','clutch','koppling'],
  alternator:['laturi','laturin','alternator','generator','bilgenerator'],
  starter:['starttimoottori','kaynnistinmoottori','starter motor','startmotor'],
  shock:['iskunvaimennin','iskunvaimentimet','shock absorber','stotdampare'],
  alignment:['pyorankulmat','pyorankulma','nelipyorasuuntaus','wheel alignment','hjulinstallning'],
  aircon:['ilmastointi','ilmastoinnin','air conditioning','aircon','klimatanlaggning'],
  dpf:['hiukkassuodatin','hiukkassuodattimen','dpf','partikelfilter'],
  belt:['jakohihna','jakohihnan','timing belt','kamrem'],
  chain:['jakoketju','jakoketjun','timing chain','kamkedja'],
  oil:['oljyn','oljy','oljyt','engine oil','motorolja'],
  gearbox:['vaihteisto','vaihteiston','transmission','gearbox','vaxellada'],
  radiator:['jaahdytin','jaahdyttimen','radiator','kylare'],
  windshield:['tuulilasi','tuulilasin','windshield','windscreen','vindruta'],
  drain:['viemari','viemarin','viemareita','drain','drains','avlopp'],
  pipe:['putki','putken','putkia','pipes','pipe','roren'],
  toilet:['wc istuin','wc pytty','toilet','toalettstol'],
  window:['ikkuna','ikkunan','ikkunoita','window','windows','fonster'],
  roof:['katto','katon','kattoja','roof','roofs','tak'],
  hair:['hiukset','hiusten','hiuksia','hair','haret'],
  nail:['kynnet','kynsia','nail','nails','naglar'],
  payroll:['palkanlaskenta','payroll','loneadministration'],
  tax:['veroilmoitus','tax return','skattedeklaration'],
};
const ALIASES=Object.fromEntries(Object.entries(SUBJECTS)
  .map(([key,list])=>[key,list.map(norm)]));
const OPERATIONS={
  replace:/\b(?:vaihd\w*|vaiht\w*|uusim\w*|replace\w*|replacement\w*|swap\w*|byt\w*|utbyt\w*)\b/,
  patch:/\b(?:paik\w*|patch\w*|puncture\w*|punkter\w*|plug\w*|lagning\w*)\b/,
  repair:/\b(?:korja\w*|repar\w*|repair\w*|fix\w*|laga)\b/,
  install:/\b(?:asenn\w*|asent\w*|install\w*|mont\w*|fitting)\b/,
  diagnose:/\b(?:diagnos\w*|vikakood\w*|vianetsin\w*|vianhak\w*|fault\s+code|felsok\w*)\b/,
  align:/\b(?:saat\w*|suunta\w*|align\w*|installning\w*|juster\w*)\b/,
  balance:/\b(?:tasapain\w*|balanc\w*|balanser\w*)\b/,
  service:/\b(?:huol\w*|servic\w*|underhall\w*)\b/,
  clean:/\b(?:pes\w*|puhdist\w*|siivo\w*|clean\w*|wash\w*|tvatt\w*|rengor\w*)\b/,
  inspect:/\b(?:tarkast\w*|katsast\w*|inspect\w*|check\w*|kontroll\w*)\b/,
  paint:/\b(?:maala\w*|maalau\w*|paint\w*|mal\w*|lack\w*)\b/,
  unblock:/\b(?:avaa\w*|avaus\w*|aukais\w*|unblock\w*|unclog\w*|rens\w*)\b/,
  cut:/\b(?:leikka\w*|leikkau\w*|cut\w*|klipp\w*)\b/,
};
const NO_WORDS=new Set([
  'teetteko','tarjoatteko','onnistuuko','onnistuisko','pystytteko','voitteko','voisitteko',
  'onko','teilla','teilta','meilta','saisiko','saako','voiko','voinko','saanko',
  'haluaisin','mina','myos','edes','te','ni','ja','tai','seka',
  'do','you','offer','provide','can','could','we','i','get','have','please','the','and','for',
  'with','your','does','this','that','there','here','from','would','will','they',
  'har','kan','ni','jag','hos','er','erbjuder','och','eller','ett','med','till','mig'
]);
const MODIFIERS={
  electric:/\b(?:sahkoauto\w*|electric\s+(?:car|vehicle)|elbil\w*)\b/,
  hybrid:/\b(?:hybrid\w*|laddhybrid\w*)\b/,
  highVoltage:/\b(?:korkeajannit\w*|high\s+voltage|hogvolt\w*)\b/,
  twelveVolt:/\b(?:12\s*v|12\s*volt)\b/,
  tubeless:/\b(?:tubeless|sisarenkaaton|slanglos\w*)\b/,
};
const NEGATIVE=/\b(?:emme|ei|eivat|not|never|dont|do\s+not|doesnt|cannot|cant|inte|aldrig|ej)\b/;
const RESTRICTED=/\b(?:ilmais\w*|free\b|gratis|tanaan|huomenna|tomorrow|today|same\s+day|heti|immediately|takuu|warranty|garanti|hinta|maksaa|paljonko|price|cost|pris|kostar|kuinka\s+kauan|how\s+long|hur\s+lang)\b/;
const QUESTION=/^(?:vaihdatteko|vaihtaisitteko|paikkaatteko|korjaatteko|asennatteko|huollatteko|tarkastatteko|puhdistatteko|pesetteko|saadatteko|suuntaatteko|avaatteko|teetteko|tarjoatteko|onnistuuko|onnistuisko|hoidatteko|pystytteko|voitteko|voisitteko|saako|saanko|onko\s+teilla|loytyyko\s+teilta|voiko\s+teilla|voinko\s+teilta|do\s+you|can\s+you|could\s+you|can\s+i\s+get|does\s+your\s+shop|har\s+ni|erbjuder\s+ni|kan\s+ni|byter\s+ni|lagar\s+ni|reparerar\s+ni|monterar\s+ni|utfor\s+ni|fixar\s+ni)\b/;
const getActions=text=>Object.entries(OPERATIONS).filter(([,re])=>re.test(text)).map(([key])=>key);
const words=text=>norm(text).split(/\s+/).filter(Boolean);
function hasTerm(text,phrase) {
  return (' '+norm(text)+' ').includes(' '+phrase+' ') ||
    new RegExp('(?:^|\\s)'+phrase.replace(/[- ]/g,'\\s+').replace(/[+]/g,'\\+')+'\\w*\\b').test(text);
}
function getConcepts(text) {
  const match=new Set();
  for(const [key,values] of Object.entries(ALIASES))
    if(values.some(term=>hasTerm(text,term))) match.add(key);
  // A narrow part is NOT an assertion about the parent assembly.
  if(match.has('tie_rod_end'))match.delete('tie_rod');
  if(match.has('hv_battery'))match.delete('battery');
  if(match.has('brake_pad')||match.has('brake_disc'))match.delete('brake');
  return match;
}
function stem(token){
  const t=norm(token);
  if(t.length<5)return t.endsWith('s') && t.length>=4?t.slice(0,-1):t;
  return t.replace(/(?:oihin|oista|eista|uista|yista|oiden|eiden|uiden|yiden|oilla|oille|oissa|oita|eita|uita|yita|illa|ille|issa|ista|ojen|eja|uja|jen|ien|ssa|sta|lla|lle|ksi|ita|ja|er|s|t|n)$/,'');
}
function subTokens(text) {
  return words(text).filter(t=>t.length>=4&&!NO_WORDS.has(t)&&!getActions(t).length);
}
function sameSubject(query,fragment,concepts) {
  const evidence=getConcepts(fragment);
  for(const c of concepts)if(!evidence.has(c))return false;
  // "Replacing tie rods" and "replacing tie-rod ends" are separate jobs.
  if(concepts.has('tie_rod')&&evidence.has('tie_rod_end'))return false;
  if(concepts.has('battery')&&evidence.has('hv_battery'))return false;
  if(concepts.has('brake')&&(evidence.has('brake_pad')||evidence.has('brake_disc')))return false;
  const sourceTokens=subTokens(fragment).map(stem);
  const queryTokens=subTokens(query);
  const aliases=new Set([...concepts].flatMap(c=>ALIASES[c].flatMap(x=>words(x).map(stem))));
  const remaining=queryTokens.filter(t=>!aliases.has(stem(t)) && 
    ![...aliases].some(x=>x.length>=5 && stem(t).startsWith(x)));
  const required=concepts.size?remaining:queryTokens;
  if(!concepts.size&&!required.length)return false;
  return required.every(t=>{
    const root=stem(t);
    if(concepts.size && /^(?:auto|auton|car|bil|vehicle|ajoneuv)/.test(t))return true;
    return sourceTokens.some(s=>s===root || (root.length>=6 && s.length>=6 && root.slice(0,6)===s.slice(0,6)));
  });
}
function serviceRow(row) {
  const meta=norm(String(row?.category||'')+' '+String(row?.title||''));
  if(/\b(?:tuotte|products?|hinnat|pricing|contact|yhteystiedot|arvostel|reviews?|privacy|tietosuoja|legal)\b/.test(meta))return false;
  return /\b(?:palvelu\w*|service\w*|tjanst\w*|huol\w*|asenn\w*|korja\w*|repar\w*)\b/.test(meta) &&
    !!String(row?.answer||'').trim();
}
function snippets(row) {
  const title=String(row.title||'').replace(/^(?:palvelut|services|tjanster)\s*:\s*/i,'').trim();
  return [...String(row.answer||'').split(/[.;!?\n•]+|\s*[|]\s*|\s*,\s*/),title]
    .map(norm).filter(x=>x.length>=5&&x.length<=450);
}
function recognize(message) {
  const q=norm(message);
  if(!q||q.length>260||!QUESTION.test(q)||RESTRICTED.test(q))return null;
  const actions=getActions(q);
  const offerOnly=/^(?:teetteko|tarjoatteko|do\s+you\s+(?:offer|provide)|har\s+ni|erbjuder\s+ni)\b/.test(q);
  if(!actions.length && !(offerOnly && ['payroll','tax'].some(c=>getConcepts(q).has(c))))return null;
  const concepts=getConcepts(q);
  if(!concepts.size&&!subTokens(q).length)return null;
  // Existing long-standing Finnish service handlers remain authoritative for
  // familiar roof, terrace, haircut and cleaning forms. This resolver is
  // primarily for specialist object/action pairs and otherwise exact matches.
  const modifiers=Object.keys(MODIFIERS).filter(k=>MODIFIERS[k].test(q));
  return {q,actions,concepts,modifiers,original:String(message||'')};
}
function isOperationEvidence(actions,fragment) {
  const offered=new Set(getActions(fragment));
  // A generic "tire repair" does not establish puncture patching.
  return !actions.length || actions.some(a=>offered.has(a) || (a==='patch'&&/\b(?:puncture\s+repair)\b/.test(fragment)));
}
function reply(req,lang){
  if(lang==='en')return 'Yes, that service is listed among our services.';
  if(lang==='sv')return 'Ja, den tjänsten finns i vårt tjänsteutbud.';
  const verbs={vaihdatteko:'vaihdamme',paikkaatteko:'paikkaamme',korjaatteko:'korjaamme',
    asennatteko:'asennamme',huollatteko:'huollamme',puhdistatteko:'puhdistamme',pesetteko:'pesemme'};
  const first=req.q.split(' ')[0], rest=req.original.trim().replace(/^\S+\s+/,'').replace(/[.?!]+$/,'').trim();
  return verbs[first]&&rest&&rest.length<85?'Kyllä, '+verbs[first]+' '+rest+'.':
    'Kyllä, kyseinen työ kuuluu palveluihimme.';
}

/**
 * Any industry can be supported through the tenant's own precise service facts.
 * Recognition is NOT proof: missing or contradictory evidence means handoff,
 * never assuming every car mechanic replaces every component.
 */
export function verifiedIndustryServiceAnswer(rows,message,lang='fi') {
  const req=recognize(message);
  if(!req)return null;
  const found=[];
  for(const row of rows||[]) {
    if(!serviceRow(row))continue;
    for(const fragment of snippets(row)) {
      if(!sameSubject(req.q,fragment,req.concepts))continue;
      if(!isOperationEvidence(req.actions,fragment))continue;
      if(req.modifiers.some(k=>!MODIFIERS[k].test(fragment)))continue;
      found.push({row,negative:NEGATIVE.test(fragment)});
      break;
    }
  }
  // Never assert an offering if another approved row explicitly denies it.
  if(!found.length && !req.concepts.size) return null;
  if(!found.length||found.some(x=>x.negative))return {
    answer:'',handoff:true,confidence:0.2,intent:'Palvelut',sourceIds:[],selected:[]
  };
  const source=found[0].row;
  return {answer:reply(req,lang),handoff:false,confidence:0.94,intent:'Palvelut',
    sourceIds:source.id?[source.id]:[],selected:[source]};
}
