import { classifyLeadIntent } from './lead-qualification.mjs';

export const INDUSTRY_INTAKE_INTENT = 'Industry intake';

const limit = (value, length = 200) => String(value ?? '').normalize('NFC').trim().slice(0, length);
const fold = value => limit(value, 1200).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const locale = value => ['fi', 'sv', 'en'].includes(value) ? value : 'fi';
const quoteStart = /^(?:tarjouspyynto|offertforfragan|quote request)\b|\b(?:halua\w*|pyyd\w*|tarvits\w*|saanko|voinko saada|voisinko saada)\b.{0,45}\b(?:tarjousta|tarjouksen|hinta-arvio\w*)\b|\b(?:vill|skulle vilja|behover|kan jag)\b.{0,40}\b(?:offert\w*|prisforslag\w*)\b|\b(?:get|give|need|request|send|like)\b.{0,30}\b(?:quote|estimate|quotation)\b/;
const bookingStart = /\b(?:halua\w* varata|haluaisin ajan|varais\w* ajan|voinko varata|ajanvaraus\w*|vill boka|kan jag boka|(?:want|need|like|can i|could i)\b.{0,25}\b(?:book|schedule)|book (?:a|an|the) (?:time|appointment))\b/;
const retailStart = /\b(?:autatko valitsemaan|auta valitsemaan|hjalp\w* att valja|help me choose|help choosing)\b/;
const noCommitment = /^(?:(?:ei|en|no|nope|nej)(?:\s+(?:kiitos|thanks|tack))?|(?:please )?(?:peruuta|stop|cancel|avbryt))[!. ]*$/;
const confirm = /^(?:kylla|joo|juu|sopii|oikein|tiedot ovat oikein|vahvistan|yes|yes please|correct|looks good|i confirm|ja|stammer|det stammer|jag bekraftar)[.! ]*$/;
const noPreference = /^(?:ei valia|ei viela tiedossa|en tieda|milloin vain|ei erityistoiveita|vet inte|ingen preferens|nar som helst|ingen sarskild|no preference|whenever|not sure yet|i don'?t know|any time)[.! ]*$/;

// Both a concrete customer subject and approved company evidence are required.
// A policy page mentioning a return shipment is not a moving service.
const profiles = {
  moving: {
    cue: /\b(?:muutto(?!siivou)\w*|moving\b|move(?:rs?)?\b(?![- ]out cleaning)|flytt(?!stad)\w*)/,
    fields: ['route', 'load', 'date']
  },
  garage: {
    cue: /\b(?:auto(?:huol|korja)\w*|auton huol\w*|rengas\w*|oljynvaih\w*|jarru\w*|garage|car (?:service|repair)|vehicle (?:service|repair)|oil change|brake\w*|tyres?|tires?|bil(?:service|verkstad)|dack\w*|oljebyte|broms\w*)\b/,
    fields: ['vehicle', 'repair', 'date']
  },
  cleaning: {
    cue: /(?:siivou\w*|ikkun\w*.{0,20}pes\w*|ikkunanpes\w*|window\s+(?:clean|wash)\w*|cleaning\b|f[oö]nster(?:puts|tvatt)\w*|stadn\w*)/,
    fields: ['scope', 'area', 'date']
  },
  plumbing: {
    cue: /(?:putkit(?:yo|oi)|putkimies|putkiasenn|putkivuoto|hanan vaiht|plumb(?:ing|er)|pipe leak|tap replacement|rorlagg|rorarbete|rorlack|kranbyte)/,
    fields: ['job', 'site', 'date']
  },
  painting: {
    cue: /(?:maalaus|maalari|seinamaal|house painting|wall painting|painting service|malning|malare)/,
    fields: ['job', 'site', 'date']
  },
  landscaping: {
    cue: /(?:pihaty|pihanhoito|puutarhanhoito|nurmikon leik|landscap|garden maintenance|lawn mowing|tradgardsskotsel|grasklippning)/,
    fields: ['job', 'site', 'date']
  },
  retail: {
    cue: retailStart,
    fields: ['product', 'preference']
  }
};
const datePattern = /\b(?:ensi (?:viik|maanantai|tiistai|keskiviik|torstai|perjantai|lauantai|sunnuntai)\p{L}*|huomenna|tänään|maanantai\p{L}*|tiistai\p{L}*|keskiviik\p{L}*|torstai\p{L}*|perjantai\p{L}*|lauantai\p{L}*|sunnuntai\p{L}*|next (?:week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|nästa vecka|i morgon|imorgon|måndag\p{L}*|tisdag\p{L}*|onsdag\p{L}*|torsdag\p{L}*|fredag\p{L}*|lördag\p{L}*|söndag\p{L}*)\b|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[./]\d{1,2}(?:[./]\d{4})?(?!\d)/giu;
const timePattern = /\b(?:klo\.?|kl\.?|at)\s*(?:[01]?\d|2[0-3])(?::[0-5]\d)?(?:\s*(?:a\.?m\.?|p\.?m\.?))?\b/giu;
const areaPattern = /\b\d{1,5}(?:[.,]\d{1,2})?\s*(?:m²|m2|sqm|neliötä|neliöö|square met(?:res|ers)|kvadratmeter|ikkunan|ikkunaa|ikkunoita|windows?|fönster|huonetta|rooms?|rum)(?!\p{L})/iu;
const repairPattern = /(?:öljynvaih\p{L}*|renkaanvaih\p{L}*|renkaiden vaiht\p{L}*|jarru\p{L}*\s+(?:vaiht|korja)\p{L}*|määräaikaishuol\p{L}*|oil change|tyre change|tire change|brake repair|brake replacement|scheduled service|oljebyte|däckbyte|bromsreparation|bilservice)/iu;
const cleanScopePattern = /(?:ikkunanpes\p{L}*|ikkun(?:an|oiden) pes\p{L}*|muuttosiivou\p{L}*|kotisiivou\p{L}*|toimistosiivou\p{L}*|window (?:cleaning|washing)|move[- ]out cleaning|deep cleaning|home cleaning|office cleaning|fönster(?:puts|tvätt)\p{L}*|flyttstäd\p{L}*|hemstäd\p{L}*|kontorsstäd\p{L}*)/iu;
const preferencePattern = /\b(?:budjetti|budget|enintään|max(?:imum)?|högst|alle|under)\s*[:=]?\s*(?:on\s+)?(?:€|\$)?\s*\d{1,5}\s*(?:€|\$|euros?|kr|sek)?|(?:koko|size|storlek|väri|colou?r|färg)\s*[:=]?\s*[\p{L}\d-]{1,24}/iu;
const vehiclePattern = /(?:^|[;,.]\s*|\b(?:auto|ajoneuvo|car|vehicle|bil|fordon)\s*[:=]\s*)([\p{L}][\p{L}\d-]+\s+[\p{L}\d][\p{L}\d-]*(?:\s+(?:19|20)\d{2}))(?!\d)/iu;
const routes = [
  /\b(?:from|från)\s+([\p{L}][\p{L}\d -]{0,42}?)\s+(?:to|till)\s+([\p{L}][\p{L}\d -]{0,42}?)(?=\s+(?:on|next|this|i|på|nästa)\b|[.,;!?]|$)/iu,
  /\b([\p{L}]{2,30}(?:sta|stä))\s+([\p{L}]{2,33}(?:lle|seen|iin|aan|ään))\b/iu
];
const productSubjectPattern = /\b(?:autatko valitsemaan|auta valitsemaan|hjälp\p{L}* att välja|help me choose|help choosing)\s+([^.;!?]{2,150})/iu;

const texts = {
  fi: {
    kind: {quote:'Tarjouspyyntö', booking:'Ajanvarauspyyntö', purchase:'Ostoaikomus'},
    route:['Lähtö- ja määränpää', 'Mistä paikkakunnalta minne olet muuttamassa?'],
    load:['Muuttokuorman koko', 'Minkä kokoinen muuttokuorma on? Esimerkiksi asunnon pinta-ala tai huonemäärä riittää.'],
    date:['Toivottu ajankohta', 'Milloin haluaisit työn tehtäväksi? Voit sanoa, jos ajankohta on vielä avoin.'],
    vehicle:['Auto', 'Mikä on auton merkki, malli ja vuosimalli, jos tiedät sen?'],
    repair:['Huollon tarve', 'Mitä huoltoa tarvitset tai mikä autossa oireilee?'],
    scope:['Siivoustyö', 'Millaista siivoustyötä tarvitset?'],
    area:['Työn laajuus', 'Kuinka laaja työ on? Kerro esimerkiksi pinta-ala tai pestävien ikkunoiden määrä.'],
    job:['Työ','Mitä haluat tehtäväksi?'],
    site:['Kohde','Millainen kohde on ja kuinka laaja työ on?'],
    product:['Etsittävä tuote', 'Millaista tuotetta etsit?'],
    preference:['Toiveet', 'Onko sinulla käyttötarkoitusta, budjettia tai muita toiveita?'],
    flexible:'Ei vielä tiedossa', review:'Kokosin nämä tiedot. Ovatko ne oikein? Voit korjata tietoja tässä chatissa.',
    revise:'Mitä haluaisit muuttaa?', canceled:'Selvä, jätetään pyyntö tähän.',
    ready:'Voit nyt jättää yhteystietosi alla, jos haluat yrityksen palaavan asiaan.'
  },
  sv: {
    kind: {quote:'Offertförfrågan', booking:'Bokningsförfrågan', purchase:'Köpförfrågan'},
    route:['Från och till', 'Mellan vilka orter ska du flytta?'],
    load:['Flyttens omfattning', 'Hur stor är flytten? Bostadens yta eller antal rum räcker.'],
    date:['Önskad tid', 'När vill du ha arbetet utfört? Säg gärna till om tiden är öppen.'],
    vehicle:['Bil', 'Vilket märke, vilken modell och vilken årsmodell har bilen, om du vet?'],
    repair:['Servicebehov', 'Vilken service behöver du, eller vilka problem har bilen?'],
    scope:['Städarbete', 'Vilken sorts städning behöver du?'],
    area:['Arbetets omfattning', 'Hur omfattande är arbetet? Ange gärna ytan eller antalet fönster.'],
    job:['Arbete','Vad vill du få gjort?'],
    site:['Objekt','Vad är det för objekt och hur omfattande är arbetet?'],
    product:['Produkt', 'Vilken typ av produkt söker du?'],
    preference:['Önskemål', 'Vad ska du använda den till, eller har du en budget eller andra önskemål?'],
    flexible:'Ännu inte bestämt', review:'Jag har sammanställt uppgifterna. Stämmer de? Du kan rätta uppgifterna här i chatten.',
    revise:'Vad vill du ändra?', canceled:'Okej, vi avslutar förfrågan här.',
    ready:'Du kan lämna dina kontaktuppgifter nedan om du vill att företaget återkommer.'
  },
  en: {
    kind: {quote:'Quote request', booking:'Booking request', purchase:'Purchase enquiry'},
    route:['From and to', 'Where are you moving from and to?'],
    load:['Move size', 'How big is the move? The size of your home or number of rooms is enough.'],
    date:['Preferred time', 'When would you like the work done? Let me know if the timing is still open.'],
    vehicle:['Vehicle', 'What are the make, model and year of the car, if you know them?'],
    repair:['Service needed', 'What service do you need, or what symptoms are you seeing?'],
    scope:['Cleaning work', 'What kind of cleaning do you need?'],
    area:['Amount of work', 'How much work is there? An area or number of windows is enough.'],
    job:['Work','What would you like done?'],
    site:['Site','What kind of site is it, and how extensive is the work?'],
    product:['Product', 'What kind of product are you looking for?'],
    preference:['Preferences', 'Do you have a use in mind, a budget, or any other preferences?'],
    flexible:'Still open', review:'Here’s what I have. Is it correct? You can make changes in this chat.',
    revise:'What would you like to change?', canceled:'Okay, we’ll leave the request here.',
    ready:'You can leave your contact details below if you’d like the company to follow up.'
  }
};

const cleanValue = value => limit(String(value || '')
  .replace(/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g, '')
  .replace(/(?:\+\d[\d .()-]{7,}|\b0\d{7,}\b)/g, '')
  .replace(/[\x00-\x1f\x7f<>]/g, ' ').replace(/\s+/g, ' '), 180);

function supportsService(profile, rows) {
  return rows.some(row => {
    const evidence = fold(row.title + ' ' + row.answer);
    return profiles[profile].cue.test(evidence) &&
      !/\b(?:emme tee|emme tarjoa|does not offer|do not offer|don'?t offer|erbjuder inte|utfor inte)\b/.test(evidence);
  });
}

export function industryIntakeKind(message) {
  const s = fold(message);
  const classification = classifyLeadIntent(s).intent;
  if (classification === 'support' || /\b(?:en halua|en tarvitse|jag vill inte|i don['’]?t want|do not want)\b/.test(s)) return '';
  if (quoteStart.test(s)) return 'quote';
  if (bookingStart.test(s)) return 'booking';
  return retailStart.test(s) ? 'purchase' : '';
}

function inferProfile(message, kind, serviceRows, hasCatalog) {
  const subject = fold(message);
  if (kind === 'purchase') {
    return hasCatalog ? 'retail' : '';
  }
  const candidates = Object.entries(profiles).filter(([key, profile]) => key !== 'retail' &&
    profile.cue.test(subject) &&
    supportsService(key, serviceRows));
  return candidates.length === 1 ? candidates[0][0] : '';
}

function factsIn(message, profile) {
  const source = limit(message, 1200);
  const route = routes.map(pattern=>source.match(pattern)).find(Boolean);
  const get = pattern => source.match(pattern)?.[0];
  const product = source.match(productSubjectPattern)?.[1];
  const date = source.match(datePattern)?.at(-1);
  const time = source.match(timePattern)?.at(-1);
  const preferred = date ? [date,time].filter(Boolean).join(' ') : time;
  const facts = {
    moving: {route:route?.slice(1,3).join(' → '), load:get(areaPattern), date:preferred},
    garage: {vehicle:source.match(vehiclePattern)?.[1], repair:get(repairPattern), date:preferred},
    cleaning: {scope:get(cleanScopePattern), area:get(areaPattern), date:preferred},
    retail: {product:product?.split(/\s+(?:under|budget|alle|högst|in size|med storlek)\b/iu)[0], preference:get(preferencePattern)}
  }[profile] || {
    job:fold(source).match(profiles[profile].cue) ? source.replace(/^(?:haluaisin|tarvitsen|i need|i want|jag vill ha|jag behöver)\s+/iu,'') : '',
    site:get(areaPattern), date:preferred
  };
  return Object.fromEntries(Object.entries(facts).map(([key,value])=>[key,cleanValue(value)]).filter(([,value])=>value));
}

function quoteLines(state, words) {
  return [words.kind[state.kind],
    ...profiles[state.profile].fields.map(key => words[key][0] + ': ' + state.values[key])
  ].join('\n');
}

function followupValue(pending, subject, message, extracted, words) {
  if (!pending || extracted[pending]) return '';
  if (noPreference.test(subject)) return ['date', 'preference'].includes(pending) ? words.flexible : '';
  if (pending === 'date' || /\?$/.test(message)) return '';
  const content = cleanValue(message.replace(/^(?:tarkoitin|actually|jag menade)\s+/iu, ''));
  if (pending === 'area' && /^\d{1,5}(?:[,;.]|$)/.test(content)) return content.match(/^\d+/)[0];
  if (Object.keys(extracted).length > 0) return '';
  return content.length >= 2 && /\p{L}/u.test(content) ? content : '';
}

export function advanceIndustryIntake({
  message, language, serviceRows = [], hasCatalog = false, previous, topic = ''
} = {}) {
  const text = limit(message, 1200);
  const subject = fold(text);
  const lang = locale(language);
  const words = texts[lang];
  if (!subject) return null;
  const active = previous && Object.hasOwn(profiles,previous.profile) &&
    ['details','review','revision'].includes(previous.stage) && Object.hasOwn(words.kind,previous.kind);
  if (active && noCommitment.test(subject)) {
    if (previous.stage === 'review' && /^(?:ei|en|no|nope|nej)[!. ]*$/.test(subject)) {
      return {answer:words.revise, state:{...previous,stage:'revision'}};
    }
    return {answer:words.canceled, state:{stage:'cancelled'}};
  }

  const kind = industryIntakeKind(text);
  const profile = kind ? inferProfile(text,kind,serviceRows,hasCatalog) : '';
  if (!active && !profile) return null;
  // A new explicit request can change the flow, while an unrelated FAQ goes
  // back through ordinary retrieval. Prior assistant text never supplies facts.
  if (!profile && /^(?:pricing|hours|contact|stores|delivery|returns|warranty|payment)$/.test(topic)) return null;
  const startsNew = !active || (profile && (profile !== previous.profile || kind !== previous.kind));
  const draft = startsNew
    ? {kind, profile, stage:'details', values:{}}
    : {...previous, values:{...previous.values}};
  // A withdrawal from the approved inventory ends the in-progress intake.
  if (draft.profile === 'retail'
    ? !hasCatalog
    : !supportsService(draft.profile,serviceRows)) return null;

  if (draft.stage === 'review' && confirm.test(subject)) {
    return {answer:words.ready, state:{...draft, stage:'confirmed'}, summary:quoteLines(draft,words)};
  }
  if (confirm.test(subject) && draft.stage === 'details' && draft.pending) {
    // A bare yes answers only the review prompt, never a quantity or date.
    return {answer:words[draft.pending][1],state:draft};
  }
  const extracted = factsIn(text,draft.profile);
  Object.assign(draft.values,extracted);
  const value = followupValue(draft.pending,subject,text,extracted,words);
  if (draft.pending && value) draft.values[draft.pending] = value;

  if (draft.stage === 'revision' && Object.keys(extracted).length === 0) {
    const field = profiles[draft.profile].fields.find(key=>fold(words[key][0])===subject);
    if (field) return {answer:words[field][1],state:{...draft,stage:'details',pending:field}};
    return {answer:words.revise,state:draft};
  }
  const pending = profiles[draft.profile].fields.find(key => !draft.values[key]);
  if (pending) {
    return {answer:words[pending][1],state:{...draft,stage:'details',pending}};
  }
  return {answer:words.review+'\n'+quoteLines(draft,words),state:{...draft,stage:'review',pending:null}};
}
