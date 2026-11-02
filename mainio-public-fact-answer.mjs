// Source-locked customer FAQ routing for Mainio only. Applied after tenant
// identity is confirmed. Semantic intent rules choose an APPROVED known row,
// never manufacture a fact or reuse a price/availability from another topic.
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const area=(q,rx)=>rx.test(q);
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
        /(?:laatik\w*.*(?:tarvit|riitt|maara|menekki)|(?:tarvit|riitt|maara|menekki).*laatik)/.test(q) ||
        /(?:paljonko|kuinka paljon).*laatik.*(?:pit|vara)/.test(q)
      )},
  {title:'Muuttolaatikoiden hinta',
    check:q=>/laatik/.test(q)&&
      /(?:hinta|maks\w*|paljonko|vuokra.*(?:hinta|maks|paljonko)|(?:hinta|maks|paljonko).*vuokra)/.test(q)},
  {title:'Muuttolaatikoiden mitat',
    check:q=>/laatik/.test(q)&&/(?:\bmitat\b|\bmittoja\b|\bmitta\w*\b|kokois|\bkokoa\b|kokoisia|millainen koko)/.test(q)},
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
    check:q=>/(?:pakettiaut|paku|vuokra aut)/.test(q)&&
      /(?:mista.*nout|mista.*hae|mihin.*palaut|nouto osoit|noutopaik|palautuspaik)/.test(q)},
  {title:'Pakettiauton 5 tunnin vuokrahinnat',
    check:q=>/(?:pakettiaut|paku|vuokra aut)/.test(q)&&
      /(?:viidelta tunn|viiden tunn|viisi tunt|5 tunn|5 h)/.test(q)&&
      /(?:hinta|maksaa|paljonko|vuokra|kustann)/.test(q)},
  {title:'Paljonko pakettiauton 3 tunnin vuokra maksaa?',
    check:q=>/(?:pakettiaut|paku|vuokra aut)/.test(q)&&
      /(?:kolmen tunn|kolme tunt|3 tunn|3 h)/.test(q)&&
      /(?:hinta|maksaa|paljonko|vuokra|kustann)/.test(q)},
  {title:'Pakettiauton vuorokausivuokra',
    check:q=>/(?:pakettiaut|paku|vuokra aut)/.test(q)&&
      /(?:vuorokau|paivavuokra|paivaksi|vuorokaudelta)/.test(q)&&
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
  {title:'Muuton hinta',
    check:q=>/(?:muuton hinta|muutto maksaa|muuttokustann|muuton kustann|muuton hint|mista muuton hinta muodostu)/.test(q) &&
      !/(?:laatik|pakettiaut|paku)/.test(q)},
  {title:'Täyden palvelun avaimet käteen -muutto',
    check:q=>/(?:avaimet kateen|pakkaatteko|hoidatteko koko muuton)/.test(q)},
];
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
export function mainioPublicFactAnswer(rows,message,lang='fi'){
  if(lang!=='fi')return null; // never reply in Finnish to an English/Swedish user
  const q=norm(message);
  if(!q||q.length>420)return null;
  for(const rule of RULES){
    if(!rule.check(q))continue;
    const chosen=(rows||[]).find(row=>approvedRow(row)&&norm(row.title)===norm(rule.title));
    if(!chosen)continue;
    let answer=String(chosen.answer).trim().replace(/\s+/g,' ');
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
