// First-party, source-bound moving enquiry workflow for the single approved
// Mainio Muuttopalvelu tenant. It creates a request for human review, never a
// confirmed order, calendar booking, price, or availability claim.
export const MAINIO_TENANT_ID='e7d3f365-0761-4d5e-ac20-b13b1748a497';
export const MAINIO_QUOTE_URL='https://tarjous.mainiomuuttopalvelu.fi/';
export const MAINIO_BOX_SOURCES=[
  'https://www.mainiomuuttopalvelu.fi/usein-muutosta-kysyttya',
  'https://www.mainiomuuttopalvelu.fi/muuttolaatikot-ja-tarvikkeet',
];

export const isMainioMovingTenant = (tenant) =>
  String(tenant?.id||'')===MAINIO_TENANT_ID &&
  /^https:\/\/(?:www\.)?mainiomuuttopalvelu\.fi(?:\/|$)/i.test(String(tenant?.website||''));

export function mainioMoveActions(lang='fi') {
  const labels={
    fi:['Kerro muutostasi ja pyydä tarjous','Avaa tarjouslomake'],
    sv:['Berätta om din flytt och begär offert','Öppna offertformuläret'],
    en:['Tell us about your move and request a quote','Open our quote form'],
  };
  const [form,link]=labels[lang]||labels.fi;
  return [
    {type:'quote',mode:'mainio_move_form',label:form},
    {type:'quote',url:MAINIO_QUOTE_URL,label:link},
  ];
}

export const MAINIO_BOX_RENTAL_URL='https://www.mainiomuuttopalvelu.fi/muuttolaatikot-ja-tarvikkeet';
export const MAINIO_VAN_RENTAL_URL='https://www.mainiomuuttopalvelu.fi/pakettiautojen-vuokraus';

const normalized=(message)=>String(message||'').normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').toLowerCase();

const mentionsMovingService=(q)=>/(?:muuttopalvel|kotimuut|yritysmuut|toimistomuut|muuton\b|muuttoon\b|muuttoa\b|muutosta\b|muutolle\b|muutot\b|muuttoja\b|muutto\b|muuttaa\b|muuttamaan\b|muutatte(?:ko|ks)?\b|muuttaisitte(?:ko)?\b|muuttaisit(?:ko)?\b|muutattehan\b|muutat(?:ko)?\b|muuttaako\b|muutetaanko\b|moving\s+service|book\s+(?:my|a)\s+move|flytt\w*|flytthjalp|flyttfirma)/.test(q);

// Identify a *move between places*, including ordinary spoken Finnish:
// "Onnistuuko muutto Rovaniemeltä Turkuun?" and "Ois muutto Oulusta Helsinkiin".
// This is intent detection only; it never determines actual service availability.
export function mainioMovingRouteIntent(message) {
  const q=normalized(message);
  const move=mentionsMovingService(q) ||
    (/(?:kuljet|siirt|vied|vieda|nout)/.test(q) &&
     /(?:tavarat|tavaroit|huonekalu|kaluste|kamat)/.test(q));
  if(!move || mainioInquiryKind(q)!=='moving')return false;
  const fiRoute=/\b[a-zåäö-]{3,45}(?:sta|sta|lta)\b[\s,–-]+(?:ihan\s+)?[a-zåäö-]{3,45}(?:lle|iin|uun|oon|aan|een|hun|ään|aan)\b/.test(q);
  const enSvRoute=/\b(?:from|fran)\s+[a-zåäö-]{3,55}\s+(?:to|till)\s+[a-zåäö-]{3,55}\b/.test(q);
  return fiRoute || enSvRoute;
}

// Strictly limited confidence check for common Finnish origin + destination
// pairs. The free intent classifier deliberately leaves route_scope unknown:
// a Finnish grammatical ending alone does not establish the country.
// Only use this when both named endpoints match two separate, known places.
const finnishRouteTowns=[
  ['turku',/\b(?:turku\w*|turu(?:sta|ssa|un|n)|abo\w*)\b/],
  ['pori',/\bpori\w*\b/],
  ['rovaniemi',/\brovaniem\w*\b/],
  ['helsinki',/\bhelsin\w*\b/],
  ['tampere',/\btampere\w*\b/],
  ['oulu',/\boulu\w*\b/],
  ['kuopio',/\bkuopio\w*\b/],
  ['joensuu',/\bjoensuu\w*\b/],
  ['espoo',/\bespoo\w*\b/],
  ['vantaa',/\bvantaa?\w*\b/],
  ['jyvaskyla',/\bjyvaskyl\w*\b/],
  ['lahti',/\b(?:lahte\w*|lahti\w*|lahd\w*)\b/],
  ['vaasa',/\bvaasa\w*\b/],
  ['kaarina',/\bkaarina\w*\b/],
  ['raisio',/\braisio\w*\b/],
  ['naantali',/\bnaantal\w*\b/],
  ['salo',/\bsalo\w*\b/],
  ['kotka',/\bkotka\w*\b/],
  ['lappeenranta',/\blappeenran\w*\b/],
  ['seinajoki',/\bseinajo\w*\b/],
  ['hameenlinna',/\bhameenlin\w*\b/],
  ['mikkeli',/\bmikkel\w*\b/],
  ['kouvola',/\bkouvol\w*\b/],
  ['porvoo',/\bporvoo\w*\b/],
];
export function mainioRecognizedDomesticRoute(message){
  if(!mainioMovingRouteIntent(message))return false;
  const q=normalized(message).replace(/[^a-z0-9\s-]/g,' ');
  // Only the actual origin and destination may establish Finnish coverage.
  // An international route "Helsingistä Tallinnaan Turun kautta" mentions
  // two Finnish cities, but Turku is a stopover, not the destination.
  const finnish=q.match(/\b([a-z-]{3,45}(?:sta|lta))[\s,-]+(?:ihan\s+)?([a-z-]{3,45}(?:lle|iin|uun|oon|aan|een|hun))\b/);
  const englishSwedish=q.match(/\b(?:from|fran)\s+([a-z-]{3,55})\s+(?:to|till)\s+([a-z-]{3,55})\b/);
  const route=finnish||englishSwedish;
  if(!route)return false;
  const resolveTown=(name)=>finnishRouteTowns.find(([,pattern])=>pattern.test(name))?.[0]||'';
  // Same-town moves (e.g. Turusta Turkuun) are valid domestic enquiries.
  return Boolean(resolveTown(route[1]) && resolveTown(route[2]));
}

// A customer may ask to rent just "laatikot" rather than explicitly
// "muuttolaatikot". In a moving-company context this is a box-rental enquiry
// only when rental language accompanies generic boxes. Do not interpret buying,
// packing or cardboard recycling as rental requests.
export function mainioBoxRentalIntent(message){
  const q=normalized(message).replace(/[^a-z0-9\s-]/g,' ');
  const exact=/(?:muuttolaatik|laatikko?vuokra|flyttkartong|flyttlad|moving\s+box|packing\s+box|box\s+rental)/.test(q);
  const generic=/(?:\b(?:laatik|laatiko|box|boxes|crate|crates|lador|kartong)\w*\b)/.test(q);
  const rental=/(?:vuokra|vuokratt|vuokral|lainaa|lainat|lainaksi|rent|rental|hire|hyra|hyr|lana)/.test(q);
  return exact || (generic && rental);
}

export function mainioVanRentalIntent(message){
  const q=normalized(message);
  if(/(?:pakettiaut|vuokrapaku|vuokra-auto|rent\s+(?:a\s+)?van|van\s+rental|sk[aå]pbil)/.test(q))return true;
  return /\b(?:paku|pakun|pakua|pakulla|pakulle|pakusta|pakut|pakuihin|van|vans)\b/.test(q) &&
    /(?:vuokra|vuokratt|vuokral|lainaa|lainaksi|rent|rental|hire|hyra|hyr)/.test(q);
}

export function mainioInquiryKind(message){
  const q=normalized(message);
  // Explicit moving-service intent has priority over accessories mentioned
  // in the same sentence, e.g. "tilaa muuttopalvelu ja muuttolaatikot".
  // Ordering the moving service itself takes priority when boxes or a van
  // are also mentioned, but "rent a van for a move" stays a van request.
  const explicitMovingService=/(?:muuttopalvel|kotimuut|yritysmuut|toimistomuut|moving\s+service|flyttfirma|flytthjalp)/.test(q) ||
    /(?:tilaa|tilata|tilaisin|varaa|varata|varaisin|book|bestall)\s+(?:[a-zåäö-]+\s+){0,2}(?:muuton|muuttoa|muutto)\b/.test(q);
  if(explicitMovingService)return 'moving';
  if(mainioBoxRentalIntent(q))return 'boxes';
  if(mainioVanRentalIntent(q))return 'van';
  return 'moving';
}

export function mainioInquiryActions(message,lang='fi'){
  const locale=['fi','sv','en'].includes(lang)?lang:'fi';
  const kind=mainioInquiryKind(message);
  if(kind==='boxes'){
    return [{type:'quote',
      label:locale==='en'?'Rent moving boxes':locale==='sv'?'Hyr flyttlådor':'Vuokraa muuttolaatikoita',
      url:MAINIO_BOX_RENTAL_URL}];
  }
  if(kind==='van'){
    return [{type:'booking',
      label:locale==='en'?'View van rentals':locale==='sv'?'Se hyrbilar':'Katso pakettiautojen vuokraus',
      url:MAINIO_VAN_RENTAL_URL}];
  }
  // A location, opening-hours or contact question is not a quote request.
  // Offer the moving form only when the customer expresses actual moving
  // booking/quote intent or asks about the price of a moving service.
  const q=normalized(message);
  const priceOrQuote=/(?:paljonko|hinta|maksa|kusta|tarjou|arvio|price|cost|quote|estimate|pris|kostar|offert)/.test(q);
  if(!mentionsMovingService(q) && !mainioMovingRouteIntent(message))return [];
  if(!(mainioMovingOrderIntent(message) || priceOrQuote || mainioMovingRouteIntent(message)))return [];
  return mainioMoveActions(locale);
}

export function mainioMovingOrderIntent(message){
  const q=normalized(message);
  if(mainioInquiryKind(q)!=='moving')return false;
  const move=mentionsMovingService(q);
  const order=/(?:tilaa|tilaamaan|tilata|tilaisin|varaa|varata|varaisin|tarjouspyyn|hinta-arvio|pyydan\s+tarjou|book|request\s+(?:a\s+)?quote|boka|bestall|offert)/.test(q);
  return move && order;
}

export function mainioIsSmallTalk(message) {
  return /^(?:moi|hei|terve|heippa|hello|hi|hey|kiitos|kiitti|thanks|thank you|tack|okei|ok|selva|hyva)[!.? ]*$/.test(normalized(message).trim());
}


const allowed={
  serviceType:['home','business','other'],
  wholeApartment:['yes','no','unknown'],
  originHousing:['apartment','detached','row','business','other','unknown'],
  destinationHousing:['apartment','detached','row','business','other','unknown'],
  originElevator:['yes','no','unknown','na'],
  destinationElevator:['yes','no','unknown','na'],
  originParking:['yes','no','unknown'],
  destinationParking:['yes','no','unknown'],
  ownBoxes:['yes','no','some','unknown'],
  carryingHelp:['yes','no','unknown'],
  packingHelp:['yes','no','unknown'],
  storageNeeded:['yes','no','unknown'],
};
const textFields={
  name:120,contact:220,extraContact:220,desiredDate:10,yearsAtCurrentHome:80,originAddress:220,originCity:100,
  originFloor:24,destinationAddress:220,destinationCity:100,
  destinationFloor:24,areaSqm:10,boxCount:6,peopleCount:4,
  specialItems:650,notes:850,
};
const values={
  name:'Asiakkaan nimi',contact:'Yhteystieto',extraContact:'Toinen yhteystieto',
  serviceType:'Palvelu',desiredDate:'Toivottu muuttopäivä',
  wholeApartment:'Muutetaanko koko asunto',yearsAtCurrentHome:'Asumisaika nykyisessä asunnossa',
  originAddress:'Lähtöosoite',originCity:'Lähtöpaikkakunta',
  originHousing:'Lähtökohteen tyyppi',originFloor:'Lähtökerros',
  originElevator:'Lähtökohteen hissi',originParking:'Muuttoauto oven eteen lähtöpaikassa',
  destinationAddress:'Kohdeosoite',destinationCity:'Kohdepaikkakunta',
  destinationHousing:'Kohteen tyyppi',destinationFloor:'Kohdekerros',
  destinationElevator:'Kohteen hissi',destinationParking:'Muuttoauto oven eteen kohteessa',
  areaSqm:'Asunnon pinta-ala (m²)',peopleCount:'Asukkaat',ownBoxes:'Omat muuttolaatikot',
  boxCount:'Toivotut vuokralaatikot (kpl)',carryingHelp:'Tarvitsee kantoapua',
  packingHelp:'Tarvitsee pakkausapua',storageNeeded:'Tarvitsee varastointia',
  specialItems:'Isot tai erityiset esineet',notes:'Lisätiedot',
};
const safeValue=(v,max)=>String(v??'').trim().replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,max);
const validContact=(s)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)||(/^[+]?[\d\s().-]{6,30}$/.test(s) && (s.match(/\d/g)||[]).length>=6);

// The two different quantities are explicitly stated on Mainio's own pages
// (FAQ: 0.8 per m², box rental page: approx. 1 per m²).
export function mainioBoxEstimate(area){
  const sqm=Number(area);
  if(!Number.isFinite(sqm)||sqm<=0||sqm>1500)return null;
  return {min:Math.ceil(0.8*sqm),max:Math.ceil(sqm)};
}

export function validateMainioMove(input,{today}={}) {
  if(!input||typeof input!=='object'||Array.isArray(input))return {error:'Virheellinen muuttopyyntö.'};
  if(input.consent!==true)return {error:'Hyväksy tietojen lähettäminen Mainio Muuttopalvelulle.'};
  const data={};
  for(const [key,max] of Object.entries(textFields))data[key]=safeValue(input[key],max);
  for(const [key,choices] of Object.entries(allowed)){
    const val=safeValue(input[key],32);
    if(val&&!choices.includes(val))return {error:'Tarkista muuton valinnat.'};
    data[key]=val||'unknown';
  }
  if(data.name.length<2)return {error:'Anna nimesi.'};
  if(!validContact(data.contact))return {error:'Anna puhelinnumero tai sähköpostiosoite.'};
  if(data.extraContact&&!validContact(data.extraContact))return {error:'Tarkista toinen yhteystieto.'};
  if(!/^\d{4}-\d{2}-\d{2}$/.test(data.desiredDate)||Number.isNaN(Date.parse(data.desiredDate+'T12:00:00Z'))||
    new Date(data.desiredDate+'T12:00:00Z').toISOString().slice(0,10)!==data.desiredDate)
    return {error:'Anna kelvollinen muuttopäivä.'};
  if(today&&data.desiredDate<today)return {error:'Muuttopäivä ei voi olla menneisyydessä.'};
  if(data.originAddress.length<5||data.destinationAddress.length<5||!data.originCity||!data.destinationCity)
    return {error:'Anna lähtö- ja kohdeosoitteet sekä paikkakunnat.'};
  if(data.serviceType==='unknown')return {error:'Valitse muuton tyyppi.'};
  if(!/^(?:[1-9]\d{0,3})(?:[.,]\d)?$/.test(data.areaSqm)||Number(data.areaSqm.replace(',','.'))>1500)
    return {error:'Anna asunnon tai toimitilan pinta-ala (m²).'};
  for(const prefix of ['origin','destination']){
    if(data[prefix+'Housing']==='apartment'&&!data[prefix+'Floor'])
      return {error:'Anna kerrostalokohteen kerros kummassakin osoitteessa.'};
  }
  if(data.boxCount&&!/^\d{1,4}$/.test(data.boxCount))return {error:'Tarkista laatikoiden määrä.'};
  if(data.peopleCount&&!/^\d{1,3}$/.test(data.peopleCount))return {error:'Tarkista asukkaiden määrä.'};
  return {data};
}
const mainioHumanLabels={
  yes:'Kyllä',no:'Ei',unknown:'Ei tiedossa',na:'Ei koske',some:'Osittain',
};
const mainioMoveTypeLabels={home:'Kotimuutto',business:'Yritysmuutto',other:'Muu kuljetus'};
const mainioHousingLabels={apartment:'Kerrostalo',detached:'Omakotitalo',row:'Rivitalo',business:'Yritystila',other:'Muu'};
function mainioHumanReadableValue(key,value){
  const raw=String(value??'').trim();
  if(!raw)return 'ei ilmoitettu';
  if(key==='serviceType')return mainioMoveTypeLabels[raw]||raw;
  if(key==='originHousing'||key==='destinationHousing')return mainioHousingLabels[raw]||mainioHumanLabels[raw]||raw;
  return mainioHumanLabels[raw]||raw;
}
export function mainioMoveDetails(data) {
  return [
    'MAINIO MUUTTOPALVELU – TARJOUSPYYNTÖ / IHMISEN HYVÄKSYNTÄÄN',
    ...Object.entries(values).map(([key,label])=>label+': '+mainioHumanReadableValue(key,data[key])),
    'Hinta, muuttopäivän saatavuus ja lopullinen tilaus vahvistetaan vain Mainion toimesta.',
    'Virallinen tilauslomake: '+MAINIO_QUOTE_URL,
  ].join('\n');
}
