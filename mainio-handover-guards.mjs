// Strict Mainio-only corrections for real customer-facing failures from 2026-11-02.
// Called only after trusted tenant/website identity has been established.
// All factual answers require matching approved evidence from Mainio's HTTPS site.
// No generative fallback may turn a box price into a moving quote or promise
// availability for a specific date.
import {MAINIO_QUOTE_URL} from './mainio-moving-intake.mjs';

const norm=(text)=>String(text||'').normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();

const official=(rows,title,need=[])=>{
  const row=(rows||[]).find(r=>{
    if(!r?.id || r.approved!==true || r.source_type!=='website'||r.title!==title)return false;
    let url;try{url=new URL(r.source_url)}catch{return false}
    return url.protocol==='https:' &&
      ['mainiomuuttopalvelu.fi','www.mainiomuuttopalvelu.fi'].includes(url.hostname) &&
      need.every(fragment=>norm(r.answer).includes(norm(fragment)));
  });
  return row||null;
};
const quoteAction=lang=>({type:'quote',url:MAINIO_QUOTE_URL,
  label:lang==='sv'?'Öppna offertformuläret':lang==='en'?'Open our quote form':'Avaa tarjouslomake'});
const vanAction=lang=>({type:'booking',url:'https://www.mainiomuuttopalvelu.fi/pakettiautojen-vuokraus',
  label:lang==='sv'?'Se hyrbilar':lang==='en'?'View van rentals':'Katso pakettiautojen vuokraus'});
const boxAction=lang=>({type:'quote',url:'https://www.mainiomuuttopalvelu.fi/muuttolaatikot-ja-tarvikkeet',
  label:lang==='sv'?'Hyr flyttlådor':lang==='en'?'Rent moving boxes':'Vuokraa muuttolaatikoita'});
function reply(answer,row,intent,actions=[]){
  return {answer,handoff:false,confidence:1,verified:true,intent,
    selected:row?[row]:[],sourceIds:row?[row.id]:[],actions};
}
const vanName=/(?:pakettiaut|\bpaku\b|\bpakun\b|\bvuokra aut|\bvan\b|\bvans\b|rental van|sk[aå]pbil|hyrbil|flyttbil)/;
const boxName=/(?:muuttolaatik|vuokralaatik|laatik|flyttlad|flyttkartong|flyttbox|lador|moving box|packing box|boxes|box rental)/;
const moveName=/(?:muutto|muuton|muuttaa|muuttopalvel|flytt(?:en|ning|service)?\b|flytta|flytten|move\b|moving|relocat|full service)/;
const notBoxPrice=(q)=>!/(?:muuttolaatik|laatik|flyttlad|flyttkartong|moving box|packing box|boxes|box rental|pakettiaut|sk[aå]pbil|\bvan\b|\bvans\b)/.test(q);

export function mainioVerifiedHandoverAnswer(rows,message,lang='fi',previousCustomerQuestion=''){
  if(!['fi','sv','en'].includes(lang))return null;
  const q=norm(message),prev=norm(previousCustomerQuestion);
  if(!q||q.length>420)return null;
  // Courtesies never need factual retrieval or contact capture.
  if(/^(?:kiitos(?: avusta| paljon| todella paljon)?|kiitti(?: avusta)?|thanks(?: for (?:your |the )?help)?|thank you(?: for (?:your |the )?help)?|tack(?: for hjalpen| sa mycket)?)[!. ]*$/.test(q)){
    const answer=lang==='en'?'You are welcome! Let us know if you need anything else.'
      :lang==='sv'?'Varsågod! Hör gärna av dig om du behöver mer hjälp.'
      :'Ole hyvä! Autamme mielellämme, jos sinulla on muita kysymyksiä.';
    return reply(answer,null,'Kiitos');
  }
  // Human-only scheduling: a service description never proves a particular date.
  const tomorrow=/(?:huomen|tanaan|ylihuomen|imorgon|i morgon|idag|tomorrow|today|tonight|this weekend|tana viikonloppuna|ensi viikonloppuna)/.test(q);
  const guarantee=/(?:varmast|varmuudel|takuu|takaa|lupaat|vahvist|onnistuuko|pystytteko|voidaanko|taat|garanter|lova|bekraft|saker|confirm|guarantee|promise|definitely|for sure|certainly|available)/.test(q);
  if(tomorrow&&guarantee&&(moveName.test(q)||/(?:move|flytt|muutto)/.test(prev))){
    const row=official(rows,'Muuton toimialue',['tarkka reitti','sovitaan erikseen']);
    if(!row)return null;
    const answer=lang==='en'
      ? 'I cannot guarantee a move for tomorrow. We must check the route, date and availability with Mainio before confirming a booking. You can request a quote below.'
      :lang==='sv'
        ? 'Jag kan inte garantera en flytt imorgon. Mainio måste kontrollera rutten, datumet och tillgängligheten innan bokningen bekräftas. Du kan begära en offert nedan.'
        : 'En voi luvata muuttoa huomiseksi. Tarkistamme reitin, muuttopäivän ja saatavuuden ennen kuin vahvistamme varauksen. Voit pyytää tarjouksen alta.';
    return reply(answer,row,'Muuton saatavuus',[quoteAction(lang)]);
  }
  // A quoted box-day price must never be presented as the cost of a move.
  const movingPrice=notBoxPrice(q) && moveName.test(q) &&
    /(?:paljonko|hinta|hintaa|maksaa|maksais|kustan|price|how much|cost|charge|pris|kostar|kostnad|offert)/.test(q);
  if(movingPrice){
    const row=official(rows,'Muuton hinta',['tavaram','tarkka tarjous']);
    if(!row)return null;
    const answer=lang==='en'
      ? 'The cost of a move depends on the apartment size, amount of belongings, floors, lifts, carrying distance, route and work required. We will confirm an individual quote after reviewing your move details.'
      :lang==='sv'
        ? 'Priset för en flytt beror på bostadens storlek, mängden saker, våningsplan, hiss, bäravstånd, flyttsträcka och arbetet som behövs. Vi lämnar en individuell offert efter att vi granskat uppgifterna.'
        : row.answer;
    return reply(answer,row,'Muuton hinta',[quoteAction(lang)]);
  }
  // Licensed electrical/plumbing tasks are explicitly outside this mover's scope.
  const licensed=/(?:luvanvarai|sahkoasenn|sahkot|sahko ty|putkito|electric(?:al)? install|licensed electric|qualified electric|rewiring|behorighet|elinstall|elarbete|auktoriserad el|rorarbete)/.test(q);
  if(licensed&&/(?:teette|hoidat|tehda|saanko|voi|pysty|autat|can|do you|perform|install|offer|utf[oö]r|gor|kan ni|hjalp|kraver|license|licensed|behorighet|luvanvarai)/.test(q)){
    const row=official(rows,'TV ja reititinasennukset',['ei tee luvanvaraisia','sahko']);
    if(!row)return null;
    return reply(lang==='en'
      ? 'No. We do not perform electrical or plumbing work that requires a license. We can help with setting up a TV or router.'
      :lang==='sv'
        ? 'Nej, vi utför inte el- eller VVS-arbeten som kräver behörighet. Vi kan hjälpa till med installation av TV och router.'
        : 'Emme tee luvanvaraisia sähkö- tai putkitöitä. Voimme auttaa TV:n ja reitittimen asennuksessa.',
      row,'Luvanvaraiset asennukset');
  }
  const driveLicense=/(?:ajokort|b kort|b kortti|b luok|driving licen|driver s licen|category b|b licen|korkort|b behorighet|b kort|vanligt korkort)/.test(q);
  if(driveLicense && (vanName.test(q)||!boxName.test(q)&&!moveName.test(q))){
    const row=official(rows,'Pakettiautojen ajokortti',['b-ajokortilla']);
    if(!row)return null;
    return reply(lang==='en'?'Yes, a category B driving licence is sufficient for all our rental vans.'
      :lang==='sv'?'Ja, B-körkort räcker för alla våra hyrda skåpbilar.'
        :'Kyllä, kaikkia vuokrattavia pakettiautojamme saa ajaa B-ajokortilla.',
      row,'Pakettiauton ajokortti',[vanAction(lang)]);
  }
  // Pronoun-only five-hour follow-ups: resolve against explicit van conversation,
  // never invent van rental prices for moving services or box rental.
  const prevVan=vanName.test(prev)&&!boxName.test(prev);
  const fiveHours=/(?:viideksi tunn|viideks tunn|viiden tunn|5 tunn|5 h\b|five hours|five hour|5 hours|5 hour|fem timmar|fem timmar|5 timmar|i fem timm)/.test(q);
  if(fiveHours&&(vanName.test(q)||prevVan)&&!boxName.test(q)&&!moveName.test(q)){
    const row=official(rows,'Pakettiauton 5 tunnin vuokrahinnat',['13 m','70 euroa','20 m','110 euroa']);
    if(!row)return null;
    const answer=lang==='en'
      ? 'For 5 hours: 13 m³ van €70, 17 m³ van €90 or 20 m³ van €110. 100 km are included. Availability is confirmed separately.'
      :lang==='sv'
        ? 'För 5 timmar: 13 m³ skåpbil 70 €, 17 m³ 90 € eller 20 m³ 110 €. 100 km ingår. Tillgänglighet bekräftas separat.'
        : 'Viideksi tunniksi: 13 m³ pakettiauto 70 €, 17 m³ 90 € tai 20 m³ 110 €. Hintoihin sisältyy 100 km. Saatavuus vahvistetaan erikseen.';
    return reply(answer,row,'Pakettiauton 5 tunnin vuokra',[vanAction(lang)]);
  }
  const overnight=/(?:yon yli|yoksi|yovuokra|overnight|over night|through the night|natten|over natten|nattuthyr)/.test(q);
  if(overnight&&(vanName.test(q)||prevVan)&&!boxName.test(q)&&!moveName.test(q)){
    const row=official(rows,'Pakettiautojen yövuokraus',['yon yli','erikseen']);
    if(!row)return null;
    return reply(lang==='en'
      ? 'Yes, you can rent a van overnight, but this must be agreed separately with customer service. Overnight rental cannot be booked through the online reservation.'
      :lang==='sv'
        ? 'Ja, en skåpbil kan hyras över natten, men det måste avtalas separat med kundtjänsten. Nattuthyrning kan inte bokas via nätbokningen.'
        :row.answer,row,'Pakettiauton yövuokraus',[vanAction(lang)]);
  }
  const pickup=/(?:mista.*(?:nout|hae|hak)|noutopaik|nouto osoit|miss[aä].*paku|where.*pick up|where.*collect|where.*get.*van|pickup address|var.*(?:hamtar|hamta|hyrbil|skapbil)|var.*(?:upphamt)|hamtningsadress)/.test(q);
  if(pickup&&(vanName.test(q)||prevVan)&&!boxName.test(q)){
    const row=official(rows,'Pakettiauton nouto- ja palautusosoite',['Tavarakatu 1','20250 Turku']);
    if(!row)return null;
    return reply(lang==='en'
      ? 'Pick up and return your rental van at Tavarakatu 1, 20250 Turku. Detailed instructions are sent by SMS the day before your rental.'
      :lang==='sv'
        ? 'Du hämtar och lämnar skåpbilen på Tavarakatu 1, 20250 Turku. Närmare instruktioner skickas via SMS dagen före hyran.'
        : 'Pakettiauto noudetaan ja palautetaan osoitteessa Tavarakatu 1, 20250 Turku. Tarkemmat ohjeet lähetetään tekstiviestillä edellisenä päivänä.',
      row,'Pakettiauton nouto',[vanAction(lang)]);
  }
  // Compact box hire-period questions ("Moneksi päiväksi saan ne?")
  // are different from the weekdays when Mainio delivers the boxes.
  const period=/(?:moneksi paivaksi|montako paivaa|kuinka monta paivaa|kauanko|kuinka kauan|how many days|how long|rental period|maximum rental|hur lange|hur manga dagar|hyrestid)/.test(q);
  const boxContext=boxName.test(q)||boxName.test(prev)&&!vanName.test(prev);
  const boxPronoun=/(?:\bne\b|\bniita\b|\bthem\b|\bthey\b|\bdem\b|\bde\b)/.test(q);
  if(period&&boxContext&&(boxName.test(q)||boxPronoun||/(?:vuokra|rent|hyr)/.test(q))){
    const row=official(rows,'Muuttolaatikoiden hinta',['0,20','10 euroa']);
    if(!row)return null;
    return reply(lang==='en'
      ? 'Moving boxes cost €0.20 per box per day (minimum €10). The website does not specify a maximum rental period. Agree the rental duration and return date with Mainio.'
      :lang==='sv'
        ? 'Flyttlådor kostar 0,20 € per låda och dygn (minst 10 €). Någon längsta hyrestid anges inte på webbplatsen. Kom överens med Mainio om hyrestiden och återlämningen.'
        : 'Muuttolaatikoiden vuokra on 0,20 €/laatikko/vrk (minimiveloitus 10 €). Enimmäisvuokra-aikaa ei ole ilmoitettu verkkosivuilla. Sovi vuokra-aika ja palautuspäivä erikseen.',
      row,'Muuttolaatikoiden vuokra-aika',[boxAction(lang)]);
  }
  // A bare quote request must actually include the quote URL action.
  const quote=/(?:tarjouspyyn|tarjouksen|tarjousta|\btarjous\b|\boffert\b|\bquote\b|\bestimate\b|\boffer\b)/.test(q) ||
    /(?:begara offert|begar offert|request a quote|pyytaa tarjou)/.test(q);
  if(quote&&!boxName.test(q)&&!vanName.test(q)){
    const row=official(rows,'Muuton hinta',['tarkka tarjous']);
    if(!row)return null;
    return reply(lang==='en'
      ? 'You can request a moving quote using the button below. We will review the move details before confirming the price and date.'
      :lang==='sv'
        ? 'Du kan begära en flyttoffert via knappen nedan. Vi kontrollerar uppgifterna innan vi bekräftar pris och datum.'
        : 'Voit pyytää muuttotarjouksen alla olevasta painikkeesta. Tarkistamme tiedot ennen hinnan ja ajankohdan vahvistusta.',
      row,'Muuttotarjouspyyntö',[quoteAction(lang)]);
  }
  return null;
}
