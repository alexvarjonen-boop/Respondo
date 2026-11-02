// Source-locked customer FAQ routing for Mainio only. Applied after tenant
// identity is confirmed. Semantic intent rules choose an APPROVED known row,
// never manufacture a fact or reuse a price/availability from another topic.
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const area=(q,rx)=>rx.test(q);
import {mainioBoxRentalIntent,mainioBoxRentalFollowupIntent,mainioBoxRentalFollowupKind,mainioVanRentalIntent} from './mainio-moving-intake.mjs';

// Accept the common spoken and inflected forms used by customers.
function vanRentalDuration(q){
  if(/(?:kolmen tunn|kolme tunt|kolmeksi tunn|kolmeksi tunt|kolmeks tunn|3 tunn|3 tunt|3h\b|3 h\b)/.test(q))return 3;
  if(/(?:viiden tunn|viidelta tunn|viidelta tunt|viideksi tunn|viideksi tunt|viideks tunn|viisi tunt|5 tunn|5 tunt|5h\b|5 h\b)/.test(q))return 5;
  if(/(?:vuorokau|paivavuokra|paivaksi|vuorokaudelta|24 h\b|24h\b|24 tunt)/.test(q))return 24;
  return 0;
}
// Source allowlist for the anonymous Mainio website demo only. This is
// explicitly not permission to read private Mainio tenant knowledge.
export function mainioPublicWebsiteEvidence(rows){
  return (rows||[]).filter(row=>{
    if(row?.approved===false || String(row?.source_type||'')!=='website')return false;
    try{
      const url=new URL(String(row.source_url||''));
      return url.protocol==='https:' &&
        ['mainiomuuttopalvelu.fi','www.mainiomuuttopalvelu.fi'].includes(url.hostname);
    }catch{return false;}
  });
}

const RULES=[
  // Match the actual question type before amounts. A delivery-fee question
  // must not receive the 0,20 €/day rental price, and box quantities must
  // not be misread as monetary "paljonko" questions.
  {title:'Laatikoiden kuljetusmaksu',
    check:q=>/laatik/.test(q)&&(
      /(?:kuljetusmaks|toimitusmaks|kuljetuskulu|toimituskulu|kotiinkuljet)/.test(q) &&
        /(?:hinta|maks|paljonko|kustann|kulu|ilmain)/.test(q) ||
      /(?:toimitu|kuljetu|kotiinkuljet).*?(?:hinta|maks|paljonko|kustann|ilmain)/.test(q) ||
      /(?:hinta|maks|paljonko|kustann).*?(?:toimitu|kuljetu|kotiinkuljet)/.test(q)
    )},
  {title:'Kuinka monta muuttolaatikkoa tarvitsen?',
    check:q=>/laatik/.test(q)&&
      !/(?:vuokra|hinta|maks\w*|kustann|kuljetus|toimitus)/.test(q)&&(
        /(?:kuinka monta|montako)/.test(q) ||
        /(?:paljonko|kuinka paljon).*laatik.*(?:tarvit|pit|vara|riitt)/.test(q) ||
        /(?:laatik.*(?:maara|menekki)|(?:maara|menekki).*laatik)/.test(q) ||
        (/(?:laatik.*(?:tarvit|riitt)|(?:tarvit|riitt).*laatik)/.test(q) &&
          /(?:neli|\bm2\b|\basuntoon\b)/.test(q)) ||
        /riitt.*\b\d+\s*(?:muutto)?laatik/.test(q)
      )},
  {title:'Muuttolaatikoiden hinta',
    check:q=>/laatik/.test(q)&&
      /(?:hinta|maks\w*|paljonko|minimiveloitus|minimilaskutus|vuokra.*(?:hinta|maks|paljonko)|(?:hinta|maks|paljonko).*vuokra)/.test(q)},
  {title:'Muuttolaatikoiden mitat',
    check:q=>/laatik/.test(q)&&/(?:\bmitat\b|\bmittoja\b|\bmitta\w*\b|kokois|\bkoko\b|\bkokoa\b|kokoja|kokoisia|isoja|suuria|tilavuus|millainen koko)/.test(q)},
  {title:'Muuttolaatikkojen noutopäivät',
    check:q=>/laatik/.test(q)&&/(?:milloin|mika paiva|mitka paiva|mihin aikaan|noutopaiv|toimituspaiv)/.test(q)&&
      /(?:toimit|nout|hae|hake|tuod|tuotte|haett)/.test(q)},
  {title:'Laatikoiden toimitus ja palautus',
    check:q=>/laatik/.test(q)&&/(?:toimit|nout|tuotte|tuoda|palaut|hake|kotiin|kuljet)/.test(q)},
  // Specific vehicle pricing/safety must never resolve to pick-up instructions.
  {title:'Pakettiautojen omavastuu',
    check:q=>/(?:pakettiaut|paku|vuokra aut)/.test(q)&&/omavastuu/.test(q)},
  {title:'Pakettiautojen ajokortti',
    check:q=>/(?:pakettiaut|paku|vuokra aut)/.test(q)&&/(?:ajokort|b kort|kortilla.*aja|milla kortilla)/.test(q)},
  {title:'Pakettiautojen yövuokraus',
    check:q=>/(?:pakettiaut|paku|muuttoaut|vuokra aut)/.test(q)&&
      /(?:yon yli|yoksi|yovuokra|overnight)/.test(q)},
  {title:'Pakettiauton nouto- ja palautusosoite',
    check:q=>/(?:pakettiaut|paku|vuokra aut|auto\w*)/.test(q)&&
      /(?:mista.*nout|mista.*(?:hae|hak)|mista.*saa.*(?:aut|paku)|mihin.*palaut|nouto osoit|noutopaik|palautuspaik|miss[aä].*(?:nout|hae|palaut))/.test(q)},
  {title:'Pakettiauton 5 tunnin vuokrahinnat',
    check:q=>/(?:pakettiaut|paku|vuokra aut)/.test(q)&&
      /(?:viiden tunn|viidelta tunn|viidelta tunt|viideksi tunn|viideksi tunt|viideks tunn|viisi tunt|5 tunn|5 tunt|5 h\b|5h\b)/.test(q)&&
      /(?:hinta|maksaa|paljonko|vuokra|kustann)/.test(q)},
  {title:'Paljonko pakettiauton 3 tunnin vuokra maksaa?',
    check:q=>/(?:pakettiaut|paku|vuokra aut)/.test(q)&&
      /(?:kolmen tunn|kolme tunt|kolmeksi tunn|kolmeksi tunt|kolmeks tunn|3 tunn|3 tunt|3 h|3h)/.test(q)&&
      /(?:hinta|maksaa|paljonko|vuokra|kustann)/.test(q)},
  {title:'Pakettiauton vuorokausivuokra',
    check:q=>/(?:pakettiaut|paku|vuokra aut)/.test(q)&&
      /(?:vuorokau|paivavuokra|paivaksi|vuorokaudelta|24 h\b|24h\b|24 tunt)/.test(q)&&
      /(?:hinta|maksaa|paljonko|vuokra|kustann)/.test(q)},
  {title:'Kierrätyksen alkaen hinta',
    check:q=>/(?:kierrat|jate|jatte)/.test(q)&&
      /(?:hinn|alka|paljonko|maksaa|kustann)/.test(q)},
  {title:'Kuolinpesän tyhjennys',
    check:q=>/(?:kuolinpes|perunkirjoituksen.*tyhjenn)/.test(q)&&
      /(?:tyhjent|nout|hoida|teetteko|voitteko|tarjoa|palvelu)/.test(q)},
  {title:'Voiko jätteen noutaa pakkaamatta?',
    check:q=>/(?:kierrat|jate|jatte)/.test(q)&&
      /(?:pakkaamatt|pakata|pakkaamista|ilman pakkau)/.test(q)},
  {title:'Kierrätyspalvelu',
    check:q=>/(?:kierratyspalvel|jate nout|jatteiden nout|kierratysnout)/.test(q)},
  {title:'Välivarastointi ennen muuttoa',
    check:q=>/(?:valivarast|varastoin|varastoida)/.test(q)&&
      /(?:muutto|muuton|muuton ajaks|muutossa|tarjoatteko|onko|voiko)/.test(q)},
  {title:'Kalusteiden purkaminen ja kokoaminen',
    check:q=>/(?:huonekal|kaluste|sohva|sanky|kaapp)/.test(q)&&
      /(?:purka|purku|koota|kokoam|asent)/.test(q)},
  {title:'TV ja reititinasennukset',
    check:q=>/(?:luvanvarai|sahkoasen|sahkot|putkit)/.test(q)&&
      /(?:teetteko|tehd|voi|pystyt|onko|asenn)/.test(q)},
  {title:'Muuttopäivän kulku',
    check:q=>/(?:muuttopaiva|muuttopaivan|muuton paiva)/.test(q) &&
      /(?:miten|mita|millainen|toim|suj|tapahtu|ohje)/.test(q)},
  {title:'Muuton kesto',
    check:q=>/(?:muutto|muuton|muuttopalvel)/.test(q) &&
      /(?:kuinka kauan|kauanko|kesto|kestaa|aikaa kuluu)/.test(q)},
  {title:'Pakettiauton tavaratilan koko',
    check:q=>/(?:pakettiaut|paku|vuokra\s*aut)/.test(q) &&
      /(?:kuuti|m3\b|tilavuu|tavaratila|kuorma|mahtu)/.test(q) &&
      !/(?:hinta|maksaa|paljonko|vuokra.*hinta|kustann)/.test(q)},
  {title:'Pakkaus- ja kantoapu',
    check:q=>/(?:pakkausapu|pakkaus\s*ja\s*kantoapu|kantamis|kantoapu|pakkaamis|pakkaatte|pakkau\w*)/.test(q) &&
      /(?:onko|onks|saako|tarjoa|tarvit|voitte|pystyt|teette|teilt|teilla|avuksi|apu\b)/.test(q) &&
      !/(?:laatik|tarvik|pakkaustarvike|kuplamuov)/.test(q)},
  {title:'Hissittömän muuton suunnittelu',
    check:q=>/(?:muutto|muuttaa|muuton|muuttamis|kerrostal)/.test(q) &&
      /(?:hissitt|ilman hissia|ei ole hissia|hissi.*puuttu)/.test(q)},
  {title:'Muuton hinta',
    check:q=>/(?:muuton hinta|muutto maksaa|muuttokustann|muuton kustann|muuton hint|mista muuton hinta muodostu|muut(?:to|on|toa|tto)?\s*(?:\w+\s+){0,5}(?:maks|kustan|hinta|hintaa)|(?:paljonko|kuinka paljon|mita)\s*(?:\w+\s+){0,7}muut(?:to|to\w*|on))/i.test(q) &&
      !/(?:laatik|pakettiaut|paku)/.test(q)},
  {title:'Täyden palvelun avaimet käteen -muutto',
    check:q=>/(?:avaimet kateen|pakkaatteko|hoidatteko koko muuton|voitteko pakata|hoidatteko.*pakkaamisen|tavaroiden pakkaamisen|pakkausapu)/.test(q)},
];
// Website importers can give a correctly sourced fact a descriptive heading
// different from a curated FAQ title. Permit narrowly checked alternatives,
// but only when the actual source text spells out the requested fact. Never
// infer prices, availability, or rental terms from a page URL alone.
const approvedMainioAlternative=(rows,title)=>{
  const checks={
    'Pakettiauton 5 tunnin vuokrahinnat':{
      path:'/pakettiautojen-vuokraus',
      verify:text=>/(?:5\s*h\b|5\s*tunn|viiden\s+tunn)/.test(text) &&
        /\b13\s*m(?:3)?\s+70\b/.test(text) &&
        /\b17\s*m(?:3)?\s+90\b/.test(text) &&
        /\b20\s*m(?:3)?\s+110\b/.test(text)
    },
    'Pakettiautojen yövuokraus':{
      path:'/usein-muutosta-kysyttya',
      verify:text=>/(?:yon\s+yli|yoksi|yovuokra)/.test(text) &&
        /(?:pakettiaut|vuokra\s+aut|paku)/.test(text) &&
        /(?:erikseen|asiakaspalvel|netti|verkko)/.test(text)
    },
    'Muuttolaatikoiden hinta':{
      path:'/muuttolaatikot-ja-tarvikkeet',
      verify:text=>/laatik/.test(text) && /\b0\s+20\b/.test(text) &&
        /(?:vrk|vuorokau|paiva)/.test(text) && /(?:minimi|vahint|10\s*(?:euro|eur))/i.test(text)
    }
  };
  const spec=checks[title];
  if(!spec)return null;
  return (rows||[]).find(row=>{
    if(!approvedRow(row))return false;
    const url=new URL(String(row.source_url||''));
    if(url.pathname.replace(/\/$/,'')!==spec.path)return false;
    return spec.verify(norm(String(row.title||'')+' '+String(row.answer||'')));
  })||null;
};
const approvedRow=(r)=>r&&r.id&&r.approved!==false &&
  String(r.source_type||'').toLowerCase()==='website'&&
  (()=>{
    try {const url=new URL(r.source_url);return url.protocol==='https:' &&
      ['www.mainiomuuttopalvelu.fi','mainiomuuttopalvelu.fi'].includes(url.hostname);}
    catch{return false;}
  })() && String(r.answer||'').trim().length>=12 &&
  String(r.answer||'').length<=1300;

// To prevent a false affirmative, an incoming "no/not" about a service
// does not invert the affirmative response; answers remain exact source facts.
export function mainioPublicFactAnswer(rows,message,lang='fi',previousCustomerQuestion=''){
  if(lang!=='fi')return null; // never reply in Finnish to an English/Swedish user
  const currentQ=norm(message);
  if(!currentQ||currentQ.length>420)return null;
  const previousQ=norm(previousCustomerQuestion);
  const boxFollowupKind=mainioBoxRentalFollowupKind(message,previousCustomerQuestion);
  const boxFollowup=Boolean(boxFollowupKind);
  // Resolve a clear vehicle follow-up only against the immediately preceding
  // customer question, and only when both turns name the same rental subject.
  const vehicleFollowup=/(?:enta|entas|sitten|mites|ja)\b/.test(currentQ) &&
    /(?:pakettiaut|paku)\w*/.test(currentQ) &&
    /(?:pakettiaut|paku)\w*/.test(previousQ);
  // "auton vuokra" is an ordinary synonym for renting Mainio's van. Only
  // add the vehicle topic for an explicit car rental question, never for
  // unrelated vehicle maintenance or ownership questions.
  const genericCarRental=mainioVanRentalIntent(message) &&
    /(?:auton vuokra|auton vuokrahinn|auto vuokra|vuokra aut|vuokraus aut)/.test(currentQ);
  const boxFollowupQuery={
    price:'paljonko muuttolaatikoiden vuokra maksaa',
    delivery:'miten laatikoiden toimitus ja palautus hoidetaan',
    transport_fee:'paljonko laatikoiden kuljetusmaksu maksaa',
    size:'mitkä ovat muuttolaatikoiden mitat',
    quantity:'kuinka monta muuttolaatikkoa tarvitsen',
    days:'milloin muuttolaatikot toimitetaan ja noudetaan',
  }[boxFollowupKind]||'';
  const q=(boxFollowup?boxFollowupQuery:vehicleFollowup?norm(String(previousCustomerQuestion)+' '+String(message)):currentQ) +
    (genericCarRental?' pakettiauto':'');
  // Published tariffs cannot establish personal booking status or live
  // availability. This guard also applies to compound rental requests.
  const asksForBookingStatus=/(?:\b(?:vapaa|vapaana|vapaita|saatavilla|saatavuus|varattu|varannut|varaus|vuokrattu|vahvistettu|vahvistitte|varmistettu|varmasti)\b)/.test(q);
  const asksForPrice=/(?:paljonko|kuinka paljon|hinta|hinnasto|maksaa|maksavat|mita maksaa|kustann|hintainen|minimiveloitus|minimilaskutus)/.test(q);
  if(asksForBookingStatus&&!asksForPrice)return null;
  // A combined van + box request is two separate rental intents. Answer both
  // from their respective approved Mainio source rows instead of letting the
  // first matched FAQ topic hide the second.
  const combinedRental=mainioVanRentalIntent(message)&&mainioBoxRentalIntent(message)&&
    /(?:vuokra|vuokr|rent|hire|hyra)/.test(currentQ);
  // Resolve short follow-ups about the timing of pickup instructions against
  // the immediately preceding, explicit Mainio vehicle-pickup question.
  const previousVehiclePickup=/(?:pakettiaut|paku|auto\w*)/.test(previousQ)&&
    /(?:mista.*(?:hae|hak|nout)|mihin.*palaut|nouto|palautus)/.test(previousQ);
  const asksPickupInstructionTiming=/(?:nouto|ohje|tekstiviest|sms)/.test(currentQ)&&
    /(?:milloin|koska|saan|saanko|tulee|saap)/.test(currentQ);
  if(previousVehiclePickup&&asksPickupInstructionTiming){
    const pickupRow=(rows||[]).find(row=>approvedRow(row)&&
      norm(row.title)===norm('Pakettiauton nouto- ja palautusosoite'));
    if(pickupRow){
      return {
        answer:'Saat tarkemmat auton nouto- ja palautusohjeet tekstiviestillä vuokrausta edeltävänä päivänä.',
        handoff:false,confidence:1,intent:'Pakettiauton nouto-ohjeet',
        sourceIds:[pickupRow.id],selected:[pickupRow],verified:true
      };
    }
  }
  const duration=vanRentalDuration(currentQ);
  if(combinedRental&&duration&&!asksForBookingStatus){
    const vanTitle=duration===3?'Paljonko pakettiauton 3 tunnin vuokra maksaa?':
      duration===5?'Pakettiauton 5 tunnin vuokrahinnat':'Pakettiauton vuorokausivuokra';
    const vanRow=(rows||[]).find(row=>approvedRow(row)&&norm(row.title)===norm(vanTitle));
    const boxRow=(rows||[]).find(row=>approvedRow(row)&&norm(row.title)===norm('Muuttolaatikoiden hinta'));
    if(vanRow&&boxRow){
      return {
        answer:'Kyllä, molempia voi vuokrata. '+String(vanRow.answer).trim().replace(/\s+/g,' ')+' '+String(boxRow.answer).trim().replace(/\s+/g,' '),
        handoff:false,confidence:1,intent:'Pakettiautojen ja muuttolaatikoiden vuokraus',
        sourceIds:[vanRow.id,boxRow.id],selected:[vanRow,boxRow],verified:true
      };
    }
  }
  // An explicit price question may still receive the sourced price without
  // implying that a specific vehicle/date is available.
  for(const rule of RULES){
    if(!rule.check(q))continue;
    const chosen=(rows||[]).find(row=>approvedRow(row)&&norm(row.title)===norm(rule.title)) ||
      approvedMainioAlternative(rows,rule.title);
    if(!chosen)continue;
    let answer=String(chosen.answer).trim().replace(/\s+/g,' ');
    // If the customer supplies the apartment area, give a useful numerical
    // box estimate rather than just quoting the general 0.8/m² rule. Only
    // calculate from the corresponding approved source evidence; otherwise
    // preserve that source verbatim. A number of boxes is NOT an area.
    if(rule.title==='Kuinka monta muuttolaatikkoa tarvitsen?'){
      const matched=String(message).match(/\b([1-9]\d{0,3}(?:[.,]\d)?)\s*(?:m²|m2|neliö(?:n|ön|öön|tä|iseen|istä|inen|itä|iä)?|neliometri(?:ä|n|in)?)(?=\W|$)/i);
      const sqm=matched?Number(matched[1].replace(',','.')):NaN;
      if(Number.isFinite(sqm) && sqm>0 && sqm<=1500 &&
         /0[,.]8/.test(answer)){
        const lower=Math.ceil(sqm*0.8);
        const bothSources=/0[,.]8\s*[-–]\s*1\b/.test(answer);
        const upper=Math.ceil(sqm);
        const band=bothSources && upper>lower ? lower+'–'+upper : String(lower);
        answer='Noin '+band+' muuttolaatikkoa '+matched[1].replace('.',',')+
          ' m² asuntoon. Tämä on suuntaa-antava arvio (0,8'+
          (bothSources?'–1':'')+
          ' laatikkoa/m²); lopullinen määrä riippuu tavaroiden määrästä.';
      }
    }
    // The source states this explicit negative and it must remain negative.
    if(rule.title==='TV ja reititinasennukset'){
      if(!/ei tee luvanvaraisia sahko tai putkitoita/.test(norm(answer)))return null;
      answer='Emme tee luvanvaraisia sähkö- tai putkitöitä. Voimme auttaa TV:n ja reitittimen asennuksessa.';
    }
    return {
      answer,handoff:false,confidence:1,intent:chosen.category||'Mainion palvelut',
      sourceIds:[chosen.id],selected:[chosen],verified:true
    };
  }
  return null;
}
