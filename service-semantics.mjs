// A deliberately small, audited equivalence layer for specialist service questions.
// It is NOT a substitute for an LLM or proof that a business offers a service.
// A response is positive only when an approved service row explicitly names both
// the specific service subject and the corresponding action in the same clause.

const fold = value => String(value || '')
  .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s-]/g, ' ').replace(/[\s-]+/g, ' ').trim();

const ACTIONS = Object.freeze({
  replace: /\b(?:vaih\w*|byt\w*|utbyt\w*|replac\w*|chang\w*|replacement)\b/,
  install: /\b(?:asenn\w*|asent\w*|installer\w*|installation|monter\w*|fitt?ing)\b/,
  repair: /\b(?:korja\w*|repar\w*|repair\w*|lagning|lagar)\b/,
  patch: /\b(?:paik\w*|punctur\w*|punkter\w*|dacklagning|tyre\s+repair|tire\s+repair)\b/,
  clean: /\b(?:pes\w*|pese\w*|puhdist\w*|tvatt\w*|rengor\w*|clean\w*|wash\w*)\b/,
  open: /\b(?:ava\w*|aukais\w*|rens\w*|unblock\w*|unclog\w*)\b/,
  paint: /\b(?:maala\w*|mal\w*|paint\w*)\b/,
  maintain: /\b(?:huol\w*|underhall\w*|maintain\w*|servic\w*)\b/,
  sell: /\b(?:myy\w*|myytte\w*|s[aä]lj\w*|sell\w*|buy\w*|stock\w*|varast\w*|ost\w*)\b/,
  charge: /\b(?:lata\w*|ladd\w*|charg\w*)\b/,
});

const SERVICES = Object.freeze([
  {
    id: 'tie-rod-end',
    subject: /\b(?:raidetang\w*pa\w*|raidetang\w*\s+pa\w*|styrled\w*|tie rod end\w*|track rod end\w*)\b/,
    action: 'replace',
    yes: ['Kyllä, vaihdamme raidetangon päitä.', 'Ja, vi byter styrleder.', 'Yes, we replace tie rod ends.'],
    label: ['raidetangon päiden vaihdosta', 'byte av styrleder', 'tie rod end replacement'],
  },
  {
    id: 'car-battery',
    subject: /\b(?:auton\s+ak\w*|autoak\w*|bilbatter\w*|car batter\w*|vehicle batter\w*)\b/,
    action: 'replace',
    yes: ['Kyllä, vaihdamme auton akkuja.', 'Ja, vi byter bilbatterier.', 'Yes, we replace car batteries.'],
    label: ['auton akun vaihdosta', 'byte av bilbatterier', 'car battery replacement'],
  },
  {
    id: 'brake-pads',
    subject: /\b(?:jarrupala\w*|jarrupal\w*|bromsbelagg\w*|brake pad\w*)\b/,
    action: 'replace',
    yes: ['Kyllä, vaihdamme jarrupaloja.', 'Ja, vi byter bromsbelägg.', 'Yes, we replace brake pads.'],
    label: ['jarrupalojen vaihdosta', 'byte av bromsbelägg', 'brake pad replacement'],
  },
  {
    id: 'tyre-puncture',
    subject: /\b(?:renka\w*|renga\w*|dack\w*|tyre\w*|tire\w*)\b/,
    action: 'patch',
    yes: ['Kyllä, paikkaamme renkaita.', 'Ja, vi lagar punkterade däck.', 'Yes, we repair tyre punctures.'],
    label: ['renkaiden paikkauksesta', 'lagning av punkterade däck', 'tyre puncture repair'],
  },
  {
    id: 'oil-change',
    subject: /\b(?:moottoriolj\w*|oljy\w*|oljyn\w*|oljebyte|olje\w*|engine oil|motor oil|oil change)\b/,
    action: 'replace',
    // An oil change uses "change", not the general part-replacement patterns.
    actionPattern: /\b(?:oljynvaih\w*|oljyn\s+vaih\w*|oljy\w*\s+vaih\w*|oljebyte|olje\s*byte|oil chang\w*|chang\w*\s+(?:the\s+)?oil)\b/,
    yes: ['Kyllä, teemme öljynvaihtoja.', 'Ja, vi utför oljebyten.', 'Yes, we perform oil changes.'],
    label: ['öljynvaihdosta', 'oljebyte', 'oil changes'],
  },
  {
    id: 'tap-install',
    subject: /\b(?:vesihan\w*|keittiohan\w*|pesuallashan\w*|blandar\w*|vattenkran\w*|koksblandar\w*|faucet\w*|water tap\w*)\b/,
    action: 'install',
    yes: ['Kyllä, asennamme vesihanoja.', 'Ja, vi installerar vattenkranar.', 'Yes, we install water taps.'],
    label: ['vesihanojen asennuksesta', 'installation av vattenkranar', 'water tap installation'],
  },
  {
    id: 'drain-unblock',
    subject: /\b(?:viemar\w*|avlopp\w*|blocked drain\w*|clogged drain\w*|drain\w*)\b/,
    action: 'open',
    yes: ['Kyllä, avaamme tukkeutuneita viemäreitä.', 'Ja, vi rensar avlopp.', 'Yes, we unblock drains.'],
    label: ['viemärin avauksesta', 'avloppsrensning', 'drain unblocking'],
  },
]);

const QUESTION_CUE = /^(?:teetteko|vaihdatteko|paikkaatteko|korjaatteko|asennatteko|pesetteko|avaatteko|huollatteko|tarjoatteko|onnistuuko|onnistuisiko|pystytteko|voitteko|hoidatteko|saako|saanko|tarvitsen|haluaisin|can you|could you|do you|would you|is it possible|are you able|do you offer|kan ni|kan man|byter ni|lagar ni|fixar ni|reparerar ni|installerar ni|tvattar ni|rengor ni|erbjuder ni|utfor ni|gor ni)\b/;
const FOLLOW_UP_CUE = /^(?:enta|entapa|mites|what about|how about|and what about|och da|men hur|vad galler)\b/;
const EXCLUDE_QUESTION = /\b(?:how much|hur mycket|kuinka paljon|paljonko|maksaa|hinta|hinnoittel\w*|tarjous|ilmain\w*|alenn\w*|tanaan|huomenna|milloin|aikaisin|how much|price|cost|discount|free|today|tomorrow|when|pris|kostar|gratis|rabatt|idag|imorgon|nar|varata|booking|varaa|boka|kiire)\b|\d/;
const NOT_OFFERED = /\b(?:emme|eivat|ei|en|et|not|never|dont|do not|does not|cannot|can't|inte|ej|aldrig|erbjuder inte|utfors inte)\b/;
const IS_PRODUCT = /tuote|product|produkt|katalog|catalog|verkkokaup|webshop|category/;
const SERVICE_META = /palvel|service|tjanst|huolto|korjaamo|asenn|remont|lvi|putki|sahko|siivou|pesu|korjaus|repair|workshop|verkstad/;
const REVIEW_META = /arvost|review|testimonial|asiakaskokem|referens|feedback/;
// Narrow vehicle and equipment specs cannot be inferred from a generic
// service listing. Require those details in the same approved business row.
const EXACT_SERVICE_QUALIFIER = /\b(?:agm|efb|start stop|hybrid\w*|sahkoaut\w*|electric car|electric vehicle|elbil\w*|tesla|toyota|volvo|bmw|mercedes|audi|volkswagen|ford|honda|prius|tpms|run flat|tubeless|diesel\w*|19\d{2}|20\d{2}|12 v|24 v|front brakes?|rear brakes?|etujarru\w*|takajarru\w*)\b/g;
function exactServiceQualifiers(query) {
  return [...new Set(fold(query).match(EXACT_SERVICE_QUALIFIER) || [])];
}
function rowSupportsQualifiers(row, qualifiers) {
  const evidence=fold(String(row?.title||'')+' '+String(row?.answer||''));
  return qualifiers.every(term=>evidence.includes(term));
}


function questionAction(message) {
  const q = fold(message);
  if (/\b(?:fixar|fixa|onnistuuko|onnistuisiko|teetteko|tarjoatteko|do you offer|can you|could you|kan ni|erbjuder ni)\b/.test(q) && !Object.values(ACTIONS).some(rx=>rx.test(q))) return '';
  for (const [action, pattern] of Object.entries(ACTIONS)) if (pattern.test(q)) return action;
  return '';
}

function actionEvidence(text, service) {
  return (service.actionPattern || ACTIONS[service.action]).test(text);
}

// Owner-entered Q&A is also approved evidence when the question identifies the
// exact specialist service and the answer unambiguously starts yes or no.
// The question alone is not proof. A negative answer must never yield a yes.
function explicitFaqEvidence(row, service) {
  const meta=fold(String(row.category||'')+' '+String(row.title||''));
  if(IS_PRODUCT.test(meta) || REVIEW_META.test(meta) || row.approved===false) return '';
  const title=fold(row.title);
  if(!service.subject.test(title) || !actionEvidence(title,service)) return '';
  const answer=fold(row.answer);
  if(/^(?:ei|emme|eivat|no|nej|not|inte|aldrig)\b/.test(answer)) return 'negative';
  if(/^(?:kylla|yes|ja|onnistuu)\b/.test(answer) &&
     /(?:\?$|^vaihdatteko\b|^teetteko\b|^can you\b|^do you\b|^kan ni\b|^byter ni\b)/i.test(String(row.title||'').trim())) return 'positive';
  return '';
}

function serviceClauses(row) {
  const title=String(row.title || '');
  const answer=String(row.answer || '');
  // A URL, search keyword or unrelated FAQ is not verified service evidence.
  return [title, ...answer.split(/[.!?;\n]+/)].map(fold).filter(Boolean);
}

function isServiceRow(row) {
  const meta=fold(String(row.category || '')+' '+String(row.title || ''));
  const fromProduct=IS_PRODUCT.test(meta);
  const fromReview=REVIEW_META.test(meta);
  return !fromProduct && !fromReview && SERVICE_META.test(meta) &&
    Boolean(String(row.answer || '').trim()) && row.approved !== false;
}

function localize(values, lang) {
  return values[lang==='sv'?1:lang==='en'?2:0];
}

// Returns null when this layer should not own the question. Every non-null
// result uses only evidence from the passed tenant rows; no cross-tenant cache.
export function matchVerifiedSpecialistService({message, rows=[], history=[], lang='fi'} = {}) {
  const q=fold(message);
  if (!q || EXCLUDE_QUESTION.test(q) || /\b(?:ja|seka|and|och)\b|[,;&]/.test(q)) return null;
  // A short topic switch after a price answer still asks about price, not
  // whether the newly named service is offered.
  if(FOLLOW_UP_CUE.test(q) && Array.isArray(history)) {
    const previous=[...history].reverse().find(turn=>String(turn?.question||turn?.user||'').trim());
    const preceding=fold(previous?.question||previous?.user||'');
    if(/\b(?:hinta\w*|maks\w*|paljonko|hinnoittel\w*|price\w*|cost\w*|pricing|pris\w*|kostar|hur mycket|how much)\b/.test(preceding)) return null;
  }
  const subjects=SERVICES.filter(s=>s.subject.test(q));
  if(subjects.length !== 1) return null; // Compound questions require separate verification.
  const service=subjects[0];
  const cue=QUESTION_CUE.test(q) || FOLLOW_UP_CUE.test(q) ||
    actionEvidence(q,service);
  if(!cue) return null;

  let requestedAction=questionAction(q);
  if(!requestedAction && FOLLOW_UP_CUE.test(q) && Array.isArray(history)) {
    const last=[...history].reverse().find(turn=>String(turn?.question||turn?.user||'').trim());
    if(last) requestedAction=questionAction(String(last.question||last.user));
  }
  // Tyre punctures are normally described as repairs (EN) or "laga" (SV).
  // Only that particular question may equate repair with puncture patching.
  if(service.action==='patch' && requestedAction==='repair' &&
      /\b(?:punctur\w*|punkter\w*|lagar\b|lagning\b)\b/.test(q)) requestedAction='patch';
  // Never treat a request to repair as proof that replacement is offered,
  // or a request to replace tyres as a request for puncture repair.
  if(requestedAction && requestedAction !== service.action) return null;

  const positive=[], negative=[];
  const qualifiers=exactServiceQualifiers(q);
  for(const row of rows) {
    if(!rowSupportsQualifiers(row,qualifiers)) continue;
    // A FAQ title is the customer's question, not evidence. Its answer must
    // explicitly approve or deny the named service before a yes/no is issued.
    const faq=explicitFaqEvidence(row,service);
    if(faq==='positive') { positive.push(row); continue; }
    if(faq==='negative') { negative.push(row); continue; }
    const title=fold(row?.title);
    const answer=fold(row?.answer);
    const titleNamesService=service.subject.test(title) && actionEvidence(title,service);
    if(titleNamesService && /\?$/.test(String(row?.title||'').trim())) continue;
    if(!isServiceRow(row)) continue;
    // A heading can identify an offered job but must not override "Emme tee"
    // or "Unfortunately we do not offer it" in the accompanying answer.
    const answerDeniesOffer=/^(?:ei|emme|en|et|eivat|no|nej|not|inte|aldrig)\b|^(?:valitettavasti|sorry|unfortunately|tyvarr)\s+(?:emme|ei|not|we do not|vi erbjuder inte)\b/.test(answer);
    if(titleNamesService && answerDeniesOffer) { negative.push(row); continue; }
    const clauses=serviceClauses(row);
    const relevant=clauses.filter(clause=>service.subject.test(clause) && actionEvidence(clause,service));
    if(!relevant.length) continue;
    if(relevant.some(clause=>NOT_OFFERED.test(clause))) negative.push(row);
    else positive.push(row);
  }

  const locale=['fi','sv','en'].includes(lang)?lang:'fi';
  const label=localize(service.label,locale);
  const sourceIds=positive.map(row=>row.id).filter(Boolean);
  if(positive.length && !negative.length) return {
    answer:localize(service.yes,locale), handoff:false, confidence:0.96,
    intent:'Palvelut', sourceIds, selected:positive.slice(0,2),
  };
  if(negative.length && !positive.length) return {
    answer:locale==='en' ? 'According to the company information, this service is not offered.'
      : locale==='sv' ? 'Enligt företagets uppgifter erbjuds inte den här tjänsten.'
      : 'Yrityksen tietojen mukaan tätä palvelua ei tarjota.',
    handoff:false, confidence:0.9, intent:'Palvelut',
    sourceIds:negative.map(row=>row.id).filter(Boolean), selected:negative.slice(0,2),
  };
  // A conflicting, missing or weakly supported detail must never become "yes".
  return {
    answer:locale==='en' ? 'I could not verify '+label+' from the company information. The company can confirm this for you.'
      : locale==='sv' ? 'Jag kunde inte bekräfta '+label+' utifrån företagets uppgifter. Företaget kan kontrollera detta.'
      : 'En löytänyt yrityksen tiedoista vahvistusta '+label+'. Yritys voi varmistaa asian.',
    handoff:true, confidence:0.2, intent:'Palvelut', sourceIds:[], selected:[],
  };
}


/**
 * Separately verify two independent specialist jobs mentioned in a single
 * request. The only inherited information is the *explicit operation verb*
 * in the first half ("replace X and Y"). No company claim is inferred from
 * a known industry, a product listing, or a different service in a row.
 *
 * This is intentionally limited to specialist subjects without pre-existing
 * subtype-specific resolvers (e.g. roof cleaning).
 */
export function matchVerifiedCompoundSpecialistServices({message, rows=[], lang='fi'}={}) {
  const raw=String(message||'').trim();
  if(raw.length<18 || raw.length>320 || EXCLUDE_QUESTION.test(fold(raw))) return null;
  const clauses=raw.replace(/[?!.]+$/,'').split(/\s+(?:ja|sekä|seka|and|och)\s+/i);
  if(clauses.length!==2) return null;
  const [left,right]=clauses.map(x=>x.trim());
  if(!left || !right || /[,;&]/.test(left+right)) return null;

  const specialistIds=new Set([
    'tie-rod-end','car-battery','brake-pads','tyre-puncture',
    'oil-change','tap-install','drain-unblock'
  ]);
  const combinedSubjects=SERVICES.filter(s=>
    specialistIds.has(s.id) && s.subject.test(fold(raw)));
  if(combinedSubjects.length!==2) return null;
  const prefix=left.match(/^(?:vaihdatteko|vaihatteko|asennatteko|paikkaatteko|korjaatteko|avaatteko|teetteko|tarjoatteko|pystytteko|voitteko|can you (?:replace|change|repair|patch|install|unblock)|could you (?:replace|change|repair|patch|install|unblock)|do you (?:replace|change|repair|patch|install|unblock)|byter ni|kan ni byta|lagar ni|kan ni laga|installerar ni|kan ni installera|reparerar ni|kan ni reparera)\b/i)?.[0];
  if(!prefix) return null;
  const hasSecondVerb=/^(?:vaihdatteko|asennatteko|paikkaatteko|korjaatteko|teetteko|can you|could you|do you|byter ni|kan ni|lagar ni|installerar ni|reparerar ni)\b/i.test(right);
  const questions=[left,hasSecondVerb?right:prefix+' '+right];
  const matched=questions.map(text=>SERVICES.filter(s=>
    specialistIds.has(s.id) && s.subject.test(fold(text))));
  if(matched.some(x=>x.length!==1) || matched[0][0].id===matched[1][0].id) return null;
  const answers=questions.map(text=>
    matchVerifiedSpecialistService({message:text,rows,history:[],lang}));
  // Both subjects must be concrete, recognized operations. Otherwise defer to
  // the existing more general multi-intent handling.
  if(answers.some(answer=>!answer)) return null;
  const incomplete=answers.some(answer=>answer.handoff);
  return {
    answer:answers.map((answer,index)=>(index+1)+'. '+answer.answer).join('\n'),
    handoff:incomplete,
    confidence:incomplete?0.2:Math.min(...answers.map(x=>x.confidence)),
    intent:'Palvelut',
    sourceIds:[...new Set(answers.flatMap(x=>x.sourceIds||[]))],
    selected:[...new Map(answers.flatMap(x=>
      (x.selected||[]).map(r=>[String(r.id||r.title),r]))).values()],
  };
}
