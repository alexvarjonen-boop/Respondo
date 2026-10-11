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
  {
    id: 'window-clean',
    subject: /\b(?:ikkun\w*|fonster\w*|window\w*)\b/,
    action: 'clean',
    yes: ['Kyllä, pesemme ikkunoita.', 'Ja, vi tvättar fönster.', 'Yes, we clean windows.'],
    label: ['ikkunanpesusta', 'fönstertvätt', 'window cleaning'],
  },
  {
    id: 'roof-clean',
    subject: /\b(?:katon\b|katto\w*|peltikat\w*|tiilikat\w*|taket\b|tak(?:pann\w*|tvatt\w*)?\b|roof\w*)\b/,
    action: 'clean',
    yes: ['Kyllä, pesemme kattoja.', 'Ja, vi tvättar tak.', 'Yes, we wash roofs.'],
    label: ['katonpesusta', 'taktvätt', 'roof cleaning'],
  },
]);

const QUESTION_CUE = /^(?:teetteko|vaihdatteko|paikkaatteko|korjaatteko|asennatteko|pesetteko|avaatteko|huollatteko|tarjoatteko|onnistuuko|onnistuisiko|pystytteko|voitteko|hoidatteko|saako|saanko|tarvitsen|haluaisin|can you|could you|do you|would you|is it possible|are you able|do you offer|kan ni|kan man|byter ni|lagar ni|fixar ni|reparerar ni|installerar ni|tvattar ni|rengor ni|erbjuder ni|utfor ni|gor ni)\b/;
const FOLLOW_UP_CUE = /^(?:enta|entapa|mites|what about|how about|and what about|och da|men hur|vad galler)\b/;
const EXCLUDE_QUESTION = /\b(?:how much|hur mycket|kuinka paljon|paljonko|maksaa|hinta|hinnoittel\w*|tarjous|ilmain\w*|alenn\w*|tanaan|huomenna|milloin|aikaisin|how much|price|cost|discount|free|today|tomorrow|when|pris|kostar|gratis|rabatt|idag|imorgon|nar|varata|booking|varaa|boka|kiire)\b|\d/;
const NOT_OFFERED = /\b(?:emme|eivat|ei|en|et|not|never|dont|do not|does not|cannot|can't|inte|ej|aldrig|erbjuder inte|utfors inte)\b/;
const IS_PRODUCT = /tuote|product|produkt|katalog|catalog|verkkokaup|webshop|category/;
const SERVICE_META = /palvel|service|tjanst|huolto|korjaamo|asenn|remont|lvi|putki|sahko|siivou|pesu|korjaus|repair|workshop|verkstad/;
const REVIEW_META = /arvost|review|testimonial|asiakaskokem|referens|feedback/;

function questionAction(message) {
  const q = fold(message);
  if (/\b(?:fixar|fixa|onnistuuko|onnistuisiko|teetteko|tarjoatteko|do you offer|can you|could you|kan ni|erbjuder ni)\b/.test(q) && !Object.values(ACTIONS).some(rx=>rx.test(q))) return '';
  for (const [action, pattern] of Object.entries(ACTIONS)) if (pattern.test(q)) return action;
  return '';
}

function actionEvidence(text, service) {
  return (service.actionPattern || ACTIONS[service.action]).test(text);
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
  for(const row of rows) {
    if(!isServiceRow(row)) continue;
    const clauses=serviceClauses(row);
    const relevant=clauses.filter(clause=>service.subject.test(clause) && actionEvidence(clause,service));
    if(!relevant.length) continue;
    // The explicit negative statement takes precedence over a positive title.
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
