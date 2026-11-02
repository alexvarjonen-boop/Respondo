// First-party, source-verified Mainio rental tariff replies in FI / SV / EN.
// Prices must be present in approved official Mainio website evidence.
// Public prices never imply availability or confirmed bookings.
const clean=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const evidence={
  h3:{title:'Paljonko pakettiauton 3 tunnin vuokra maksaa?',match:[/13 m³ pakettiauto 50 euroa/,/17 m³ pakettiauto 70 euroa/,/100 km/]},
  h5:{title:'Pakettiauton 5 tunnin vuokrahinnat',match:[/13 m³ pakettiauto 70 euroa/,/17 m³ pakettiauto 90 euroa/,/20 m³ pakettiauto 110 euroa/,/100 km/]},
  day:{title:'Pakettiauton vuorokausivuokra',match:[/13 m³ pakettiauto 90 euroa/,/17 m³ pakettiauto 110 euroa/,/20 m³ pakettiauto 140 euroa/,/150 km/]},
  box:{title:'Muuttolaatikoiden hinta',match:[/0,20 euroa/,/10 euroa/]},
  delivery:{title:'Laatikoiden kuljetusmaksu',match:[/25 euroa/,/Turkuun/,/Naantaliin/]},
  boxService:{title:'Laatikoiden toimitus ja palautus',match:[/Toimitamme muuttolaatikot/,/noudamme ne pois/]},
  boxSize:{title:'Muuttolaatikoiden mitat',match:[/600/,/400/,/300/]},
  boxDays:{title:'Muuttolaatikkojen noutopäivät',match:[/maanantai/,/keskiviikko/,/perjantai/]}
};
const strings={
  fi:{
    h3:'3 h: 13 m³ 50 € ja 17 m³ 70 € (100 km sisältyy).',
    h5:'5 h: 13 m³ 70 €, 17 m³ 90 € ja 20 m³ 110 € (100 km sisältyy).',
    day:'Vuorokausi: 13 m³ 90 €, 17 m³ 110 € ja 20 m³ 140 € (150 km sisältyy).',
    box:'Muuttolaatikoiden vuokra maksaa 0,20 €/laatikko/vrk. Minimilaskutus on 10 €.',
    delivery:'Muuttolaatikoiden kuljetus maksaa 25 €/ajokerta Turkuun, Raisioon, Kaarinaan, Maskuun, Lietoon ja Naantaliin. Muihin kuntiin sopimuksen mukaan.',
    boxService:'Kyllä, toimitamme muuttolaatikot Turkuun ja lähialueille sekä noudamme ne pois. Noudosta toimipisteeltä on sovittava erikseen.',
    boxSize:'Muuttolaatikoiden mitat ovat 600 × 400 × 300 mm.',
    boxDays:'Muuttolaatikoita toimitetaan ja noudetaan maanantaisin, keskiviikkoisin ja perjantaisin. Tarkka ajankohta vahvistetaan erikseen.',
    intro:'Pakettiautojen vuokrahinnat:',note:'Saatavuus ja yksittäinen varaus vahvistetaan erikseen.',
    vanAction:'Katso pakettiautojen vuokraus',boxAction:'Vuokraa muuttolaatikoita'},
  sv:{
    h3:'3 timmar: 13 m³ 50 € och 17 m³ 70 € (100 km ingår).',
    h5:'5 timmar: 13 m³ 70 €, 17 m³ 90 € och 20 m³ 110 € (100 km ingår).',
    day:'Ett dygn: 13 m³ 90 €, 17 m³ 110 € och 20 m³ 140 € (150 km ingår).',
    box:'Hyra av flyttlådor kostar 0,20 € per låda och dygn. Minsta debitering är 10 €.',
    delivery:'Leverans av flyttlådor till Åbo, Reso, S:t Karins, Masku, Lundo och Nådendal kostar 25 € per körning. Andra orter enligt överenskommelse.',
    boxService:'Ja, vi levererar flyttlådor i Åbo med omnejd och hämtar dem efteråt. Hämtning på plats måste avtalas separat.',
    boxSize:'Flyttlådornas mått är 600 × 400 × 300 mm.',
    boxDays:'Flyttlådor levereras och hämtas på måndagar, onsdagar och fredagar. Exakt tidpunkt måste bekräftas separat.',
    intro:'Hyrpriser för skåpbilar:',note:'Tillgänglighet och enskilda bokningar bekräftas separat.',
    vanAction:'Se skåpbilar',boxAction:'Hyr flyttlådor'},
  en:{
    h3:'3 hours: 13 m³ €50 and 17 m³ €70 (100 km included).',
    h5:'5 hours: 13 m³ €70, 17 m³ €90 and 20 m³ €110 (100 km included).',
    day:'24 hours: 13 m³ €90, 17 m³ €110 and 20 m³ €140 (150 km included).',
    box:'Moving boxes cost €0.20 per box per day, with a €10 minimum charge.',
    delivery:'Moving-box delivery to Turku, Raisio, Kaarina, Masku, Lieto and Naantali costs €25 per trip. Other locations by arrangement.',
    boxService:'Yes, we deliver moving boxes in Turku and nearby areas and collect them afterward. Self-pickup must be arranged separately.',
    boxSize:'Our moving boxes measure 600 × 400 × 300 mm.',
    boxDays:'Moving boxes are delivered and collected on Mondays, Wednesdays and Fridays. Exact arrangements must be confirmed separately.',
    intro:'Van rental prices:',note:'Availability and individual bookings must be confirmed separately.',
    vanAction:'View van rentals',boxAction:'Rent moving boxes'}
};
function verified(rows,key){
  const spec=evidence[key];
  return (rows||[]).find(row=>{
    if(!row?.id || row?.approved!==true || row?.source_type!=='website' || row?.title!==spec.title)return false;
    let url;try{url=new URL(row.source_url);}catch{return false;}
    return url.protocol==='https:' && ['mainiomuuttopalvelu.fi','www.mainiomuuttopalvelu.fi'].includes(url.hostname)
      && spec.match.every(pattern=>pattern.test(String(row.answer||'')));
  })||null;
}
const vanUrl='https://www.mainiomuuttopalvelu.fi/pakettiautojen-vuokraus';
const boxUrl='https://www.mainiomuuttopalvelu.fi/muuttolaatikot-ja-tarvikkeet';
export function mainioMultilingualTariffAnswer(rows,message,lang='fi',previousCustomerQuestion=''){
  if(!Object.hasOwn(strings,lang))return null;
  const q=clean(message),prev=clean(previousCustomerQuestion);
  if(!q || q.length>420)return null;
  // A published tariff is never evidence of a personal booking or time slot.
  if(/\b(?:vapaa|vapaana|saatavilla|saatavuus|varattu|varaus|vahvistettu|vuokrattu|available|availability|booked|confirmed|ledig|lediga|bokad|bokat|bekraftad)\b/.test(q))return null;
  const price=lang==='fi'
    ? /(?:paljonko|paljol|mita maksaa|mika hinta|hinnasto|hinnat|hinta|maksaa|maksais|kustann|vuokrahinn|kuljetusmaks|toimitusmaks)/.test(q)
    :lang==='sv'
      ? /(?:vad kostar|hur mycket|pris|hyrpris|kostnad|kostar)/.test(q)
      :/(?:how much|what does|what is the price|price|cost|rates|rental rate)/.test(q);
  const van=lang==='fi'
    ? /(?:pakettiaut|paku|pakun|pakua|vuokrapaku|vuokra auto)/.test(q)
    :lang==='sv'
      ? /(?:skapbil|hyrbil|flyttbil|bilhyra)/.test(q)
      :/\b(?:van|vans|moving truck|rental van)\b/.test(q);
  const box=lang==='fi'
    ? /(?:muuttolaatik|laatikoi|laatikon|laatikoiden|laatikot)/.test(q)
    :lang==='sv'
      ? /(?:flyttlad|flyttkartong|flyttbox|lador)/.test(q)
      :/(?:moving box|packing box|moving crate|box rental|boxes)/.test(q);
  const delivery=lang==='fi'?/(?:toimitus|kuljetus|kotiinkuljet)/.test(q)
    :lang==='sv'?/(?:leverans|transport|hemleverans)/.test(q)
    :/(?:delivery|deliver|shipping|transport)/.test(q);
  const otherMove=lang==='fi'?/(?:muuton hinta|muutto maksaa|muuttopalvel)/.test(q)
    :lang==='sv'?/(?:flyttfirma|flytthjalp|flyttens pris)/.test(q)
    :/(?:moving service|house move|moving company|cost of moving)/.test(q);
  // Resolve short follow-ups only against an explicit, recent moving-box topic
  // from Mainio's conversational history. Do not carry context through unrelated
  // questions, cardboard recycling, or a vehicle rental topic.
  const prevBox=/(?:muuttolaatik|vuokralaatik|flyttlad|flyttkartong|flyttbox|moving box|packing box|box rental)/.test(prev) &&
    !/(?:pahvilaatik|kierrat|recycl|cardboard|buying boxes|selling boxes)/.test(prev);
  const activeBox=box || (prevBox&&!van);
  const deliveryRequest=lang==='fi'
    ? /(?:toimitatteko|tuotteko|noudatteko|haetteko|saako.*kotiin)/.test(q)
    :lang==='sv'
      ? /(?:kan ni leverera|levererar ni|kan ni hamta|hamtar ni|levereras.*hem)/.test(q)
      :/(?:can you deliver|do you deliver|could you deliver|will you deliver|do you ship|can you bring|can you collect|do you collect|do you offer delivery)/.test(q);
  const sizeRequest=lang==='fi'?/(?:mink[aä] koko|mitat|kokoisia)/.test(q)
    :lang==='sv'?/(?:hur stora|vilken storlek|matt|storlek)/.test(q)
    :/(?:how big|what size|dimensions|measurements)/.test(q);
  const daysRequest=lang==='fi'?/(?:milloin|mina paivina).*(?:toimit|nout)/.test(q)
    :lang==='sv'?/(?:vilka dagar|nar.*leverer|nar.*hamt)/.test(q)
    :/(?:when.*deliver|which days.*deliver|when.*collect|when.*pick up)/.test(q);
  if(otherMove)return null;
  // Dates and times of a customer's individual delivery are not verifiable.
  if((deliveryRequest||daysRequest)&&/(?:tomorrow|today|tonight|imorgon|idag|ikvall|huomenna|tanaan|tana iltana)/.test(q))return null;
  // A freight/transport price without a box topic is not a van tariff.
  if(!activeBox && /(?:kuljetus|toimitus|kotiinkuljetus|delivery|shipping|transport|leverans|frakt)/.test(q))return null;
  if(!price&&!deliveryRequest&&!sizeRequest&&!daysRequest)return null;
  let keys,subject;
  if(activeBox){
    if(delivery&&price)keys=['delivery'];
    else if(daysRequest)keys=['boxDays'];
    else if(deliveryRequest)keys=['boxService'];
    else if(sizeRequest)keys=['boxSize'];
    else if(price)keys=['box'];
    else return null;
    subject='box';
  }
  else {
    const previousVan=lang==='fi'?/(?:pakettiaut|paku|vuokra auto)/.test(prev)
      :lang==='sv'?/(?:skapbil|hyrbil|flyttbil)/.test(prev)
      :/\b(?:van|vans|moving truck)\b/.test(prev);
    if((!van&&!previousVan)||otherMove||box)return null;
    const h3=lang==='fi'?/(?:3\s*h\b|kolm\w*\s+tun)/.test(q)
      :lang==='sv'?/(?:3\s*h\b|3\s*timm|tre\s*timm)/.test(q)
      :/(?:3\s*h\b|3\s*hour|three\s*hour)/.test(q);
    const h5=lang==='fi'?/(?:5\s*h\b|viid\w*\s+tun|viisi\s+tun)/.test(q)
      :lang==='sv'?/(?:5\s*h\b|5\s*timm|fem\s*timm)/.test(q)
      :/(?:5\s*h\b|5\s*hour|five\s*hour)/.test(q);
    const day=lang==='fi'?/(?:24\s*h\b|vrk|vuorokau|paivaksi|paivavuokra|paivaks)/.test(q)
      :lang==='sv'?/(?:24\s*h\b|dygn|dag|dagen)/.test(q)
      :/(?:24\s*h\b|24\s*hour|per day|a day|full day|daily|one day)/.test(q);
    keys=h3?['h3']:h5?['h5']:day?['day']:['h3','h5','day'];subject='van';
  }
  const selected=keys.map(key=>verified(rows,key));
  if(selected.some(row=>!row))return null;
  const langData=strings[lang];
  const answer=subject==='van'
    ? (keys.length===3?langData.intro+' ':'')+keys.map(key=>langData[key]).join(' ')+' '+langData.note
    :langData[keys[0]];
  return {answer,handoff:false,confidence:1,verified:true,
    intent:subject==='van'?'Pakettiautojen vuokraus':'Muuttolaatikot',
    selected,sourceIds:selected.map(row=>row.id),
    actions:[{type:subject==='van'?'booking':'quote',url:subject==='van'?vanUrl:boxUrl,
      label:subject==='van'?langData.vanAction:langData.boxAction}]};
}
