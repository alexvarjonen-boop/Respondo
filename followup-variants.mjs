// Context-aware follow-up forms, generated in memory and never stored in the
// database. A phrase classifies a question; it never supplies a business fact.
import { normalizeIntentPhrase } from './intent-utterances.mjs';

export const FOLLOWUP_VARIANT_TARGET = 100_000;

// Phrases are complete noun phrases that can follow conversational introductions.
// The same grammar understands concise questions and polite natural variations.
const LEXICON = Object.freeze({
  fi:{
    starters:['entä','entäs','entäpä','no entä','ja entä','mutta entä','mites','miten olisi','mitä sitten','haluaisin myös tietää','voitko vielä kertoa','kertoisitko vielä','voisitko selventää','kiinnostaisi myös'],
    endings:['','ihan käytännössä','siis käytännössä','tässä tilanteessa','silloin','myös','teillä','vielä','tarkemmin','mahdollisimman lyhyesti','muuten','kyseisessä tapauksessa','jos mahdollista','tässä tapauksessa','tuossa tilanteessa','yleisesti','vielä tarkemmin','tältä osin','siinä tapauksessa','tämän ostoksen kohdalla','lisäksi','sitä varten','nyt','ihan nopeasti'],
    subjects:{
      shipping_below:['alle rajan','sen alle','tuon rajan alle','rajaa pienemmät tilaukset','ilmaisen toimituksen rajaa pienemmät ostokset','jos tilaus jää alle rajan','toimitus rajan alla','alle ilmaisen toimituksen summan','sen summan alle jäävät ostokset','toimituskulut rajan alapuolella','rajan alle jäävän tilauksen toimitus','jos ostos on rajan alapuolella'],
      shipping_above:['yli rajan','sen yli','rajan ylittävä tilaus','ilmaisen toimituksen rajan ylittävät ostokset','toimitus yli rajan','jos tilaus ylittää tuon summan','rajaa suuremmat tilaukset','yli ilmaisen toimituksen summan','sen summan ylittävä ostos','rajan yläpuolella','kun ostos ylittää rajan','ilmaisen toimituksen ylittävä tilaus'],
      shipping_cost:['toimituskulut','postikulut','toimitusmaksut','toimituksen hinta','postitusmaksut','kuljetuksen hinta','toimitushinnat','kuljetuskulut','postimaksu','toimituksen maksullisuus','toimitusmaksun suuruus','tilauksen lähetyskulut'],
      delivery_time:['toimitusaika','toimituksen kesto','paketin saapuminen','kauanko toimitus kestää','milloin lähetys saapuu','tilauksen toimitusnopeus','saapumisaika','toimituspäivät','lähetyksen kesto','montako päivää toimitus kestää','paketin arvioitu saapumispäivä','kotiinkuljetuksen kesto'],
      returns:['palautus','palautusaika','palautusehdot','tuotteen palauttaminen','rahojen palautus','palautusmaksu','vaihtaminen','palautuksen kesto','saanko palauttaa sen','palautustapa','tuotevaihto','peruutusoikeus'],
      warranty:['takuu','takuuaika','takuuehdot','tuotteen takuu','takuun kesto','mitä takuu kattaa','takuukorjaus','takuun voimassaolo','takuuasioiden hoito','tuotetakuu','takuurajoitukset','reklamaatio'],
      pricing:['sen hinta','paljonko se maksaa','saman tuotteen hinta','tuon palvelun hinta','hinnoittelu','hinta siinä tapauksessa','mitä se maksaa','tuotteen lopullinen hinta','palvelun kustannus','hintavaihtoehdot','lisähinta','hinta-arvio'],
      stock:['varastotilanne','saatavuus','onko sitä varastossa','tuotteen saatavuus','varastomäärä','löytyykö sitä vielä','onko tätä saatavana','onko tuotetta jäljellä','saatavilla olevat kappaleet','tuotteen loppuminen','uusien erien saatavuus','sen tilaaminen varastosta'],
      colors:['värivaihtoehdot','muut värit','saako sen mustana','saman tuotteen värit','valittavat värit','onko sitä sinisenä','löytyykö valkoista','tuotteen värivalikoima','minkä värisiä niitä on','vaihtoehtoiset värit','tuotteen värimallit','punainen vaihtoehto'],
      sizes:['kokovaihtoehdot','eri koot','tuotteen mitat','sama tuote eri koossa','minkä kokoisia niitä on','löytyykö isompaa kokoa','löytyykö pienempää kokoa','tuotteen kokotaulukko','saatavilla olevat koot','pienin koko','suurin koko','tuotteen koko-opas'],
      hours:['aukioloajat','aukiolo viikonloppuna','huomisen aukiolo','milloin olette auki','aukioloaika','aukiolo lauantaina','aukiolo sunnuntaina','liikkeen aukiolo','palveluajat','sulkemisaika','aukioloaika tänään','asiointiaika'],
      payment:['maksutavat','maksaminen','korttimaksu','voiko maksaa laskulla','verkkopankkimaksu','osamaksu','käykö mobilepay','toimivatko maksukortit','maksuvaihtoehdot','käykö klarna','maksun käsittely','maksuehdot'],
      booking:['ajanvaraus','vapaat ajat','varausajat','ajan varaaminen','voiko varata huomiseksi','ajan siirtäminen','ajan peruminen','varaamisen onnistuminen','varattavissa olevat ajat','ajanvarauskalenteri','varaustapa','ajanvarauksen vahvistus'],
      contact:['yhteydenotto','puhelinnumero','sähköpostiosoite','soittaminen','yhteystiedot','asiakaspalvelun numero','tavoitettavuus','kontaktin ottaminen','miten saan yhteyden','tukipalvelun sähköposti','asiakaspalveluun yhteys','viestin lähettäminen']
    }
  },
  en:{
    starters:['what about','and what about','how about','and how about','but what about','ok but what about','so what about','could you explain','can you tell me about','could you tell me about','I would also like to know about','I am also wondering about','another question about','and then what about'],
    endings:['','in practice','in this case','then','too','for this order','with you','as well','in detail','more specifically','if possible','for the same item','right now','for this purchase','in that case','for me','in general','a little more','please','quickly','as an example','for the order','on your website','at the moment'],
    subjects:{
      shipping_below:['below the threshold','under that amount','orders below the limit','an order under the free shipping threshold','shipping under the limit','purchases below the threshold','if my order is under the limit','orders under that sum','the delivery fee below the limit','shipping below the free delivery amount','purchases under the amount','if I spend less than the threshold'],
      shipping_above:['above the threshold','over that amount','orders above the limit','an order over the free shipping threshold','shipping over the limit','purchases above the threshold','if my order exceeds the limit','orders exceeding that sum','delivery over the limit','shipping above the free delivery amount','purchases over the amount','if I spend more than the threshold'],
      shipping_cost:['shipping costs','delivery fees','delivery cost','shipping price','postage costs','the shipping fee','the delivery charge','the price of shipping','what shipping costs','shipping charges','freight charges','the postage fee'],
      delivery_time:['delivery time','how long shipping takes','when the package arrives','delivery duration','estimated delivery date','how many days shipping takes','shipment time','arrival date','parcel transit time','the delivery schedule','how soon it arrives','the shipping speed'],
      returns:['returns','the return period','the return policy','sending it back','getting a refund','return shipping fees','exchanges','time for a return','returning the product','refund eligibility','exchange conditions','the cancellation policy'],
      warranty:['warranty','warranty duration','warranty coverage','the product warranty','the warranty period','what warranty includes','warranty repairs','warranty expiration','warranty service','the guarantee','warranty exclusions','filing a claim'],
      pricing:['the price','what that costs','the same product price','the service price','pricing','the price in this case','how much it is','total product price','service costs','price options','extra charges','price estimates'],
      stock:['stock levels','availability','whether it is in stock','product availability','stock count','whether you still have it','whether this is available','remaining items','units available','restocking','future availability','inventory'],
      colors:['color options','other colors','it in black','colors for the same item','the available colors','whether it comes in blue','the white option','product colors','which colors it comes in','alternative colors','color variants','the red option'],
      sizes:['size options','other sizes','the item dimensions','the same item in another size','available sizes','a larger size','a smaller size','the size chart','which sizes are in stock','smallest size','largest size','the sizing guide'],
      hours:['opening hours','weekend opening','tomorrow opening hours','when you are open','business hours','saturday opening','sunday opening','store hours','service hours','closing time','today opening hours','visiting hours'],
      payment:['payment methods','making payments','card payment','paying by invoice','online bank transfer','installments','mobilepay','accepted cards','payment options','klarna','payment processing','payment terms'],
      booking:['booking','available times','appointment slots','making an appointment','booking for tomorrow','rescheduling','cancelling an appointment','booking availability','open appointment times','booking calendar','how to book','booking confirmation'],
      contact:['getting in touch','phone number','email address','calling you','contact details','customer support number','availability of support','contacting someone','how to reach you','support email','customer service contact','sending a message']
    }
  },
  sv:{
    starters:['och','och då','men hur är det med','hur är det med','vad gäller','och vad gäller','men vad gäller','vad säger ni om','kan ni berätta om','kan du berätta om','jag undrar också över','jag skulle även vilja veta om','en fråga till om','dessutom undrar jag över'],
    endings:['','i praktiken','i det här fallet','då','också','för den här beställningen','hos er','dessutom','mer detaljerat','lite närmare','om möjligt','för samma vara','just nu','för det här köpet','i så fall','för mig','i allmänhet','lite mer','tack','snabbt','till exempel','för ordern','på er webbplats','för tillfället'],
    subjects:{
      shipping_below:['under gränsen','under den summan','beställningar under gränsen','köp under gränsen för fri frakt','frakten under gränsen','köp under den nivån','om min beställning är under gränsen','beställningar under beloppet','fraktkostnad under gränsen','frakt under beloppet för fri frakt','köp under summan','om jag köper för mindre än gränsen'],
      shipping_above:['över gränsen','över den summan','beställningar över gränsen','köp över gränsen för fri frakt','frakten över gränsen','köp över den nivån','om min beställning överskrider gränsen','beställningar som överstiger beloppet','frakt över gränsen','frakt över beloppet för fri frakt','köp över summan','om jag köper för mer än gränsen'],
      shipping_cost:['fraktkostnader','leveransavgifter','leveranskostnad','fraktpriser','porto','fraktavgiften','leveransavgiften','priset för frakten','vad frakten kostar','fraktavgifter','transportavgifter','portokostnader'],
      delivery_time:['leveranstid','hur lång tid frakten tar','när paketet kommer','leveranstidens längd','beräknat leveransdatum','hur många dagar leveransen tar','frakttid','ankomstdatum','paketets transporttid','leveransschema','hur snabbt det kommer','leveranshastighet'],
      returns:['returer','returperioden','returvillkor','att skicka tillbaka','att få pengarna tillbaka','returkostnader','byten','tid för en retur','returnera varan','rätt till återbetalning','bytesvillkor','ångerrätt'],
      warranty:['garanti','garantins längd','garantivillkor','produktgaranti','garantitiden','vad garantin omfattar','garantireparation','när garantin upphör','garantiservice','produktens garanti','garantibegränsningar','reklamation'],
      pricing:['priset','vad den kostar','priset för samma produkt','priset för tjänsten','prissättning','priset i det här fallet','hur mycket det kostar','slutpriset','tjänstens kostnad','prisalternativ','extra avgifter','prisuppskattning'],
      stock:['lagerstatus','tillgänglighet','om den finns i lager','produktens tillgänglighet','lagersaldo','om ni har den kvar','om den är tillgänglig','antal kvar','tillgängliga exemplar','när den kommer in igen','framtida tillgång','lagret'],
      colors:['färgalternativ','andra färger','den i svart','färger för samma produkt','tillgängliga färger','om den finns i blått','den vita varianten','produktens färger','vilka färger den finns i','alternativa färger','färgvarianter','den röda varianten'],
      sizes:['storleksalternativ','andra storlekar','produktens mått','samma vara i annan storlek','vilka storlekar som finns','en större storlek','en mindre storlek','storlekstabellen','tillgängliga storlekar','minsta storleken','största storleken','storleksguide'],
      hours:['öppettider','helgöppet','öppettider imorgon','när ni har öppet','butikstider','öppet på lördag','öppet på söndag','öppettider för butiken','servicetider','stängningstid','öppettider idag','besökstider'],
      payment:['betalningsmetoder','betalning','kortbetalning','att betala mot faktura','banköverföring','avbetalning','mobilepay','accepterade kort','betalningsalternativ','klarna','betalningshantering','betalningsvillkor'],
      booking:['tidsbokning','lediga tider','bokningsbara tider','att boka tid','bokning för imorgon','ombokning','avbokning','tillgängliga tider','lediga besökstider','bokningskalender','bokningssätt','bokningsbekräftelse'],
      contact:['att ta kontakt','telefonnummer','e-postadress','att ringa','kontaktuppgifter','kundservicens nummer','supportens tillgänglighet','att kontakta någon','hur jag når er','supportens e-post','kundservicekontakt','att skicka ett meddelande']
    }
  }
});

const LANGUAGES=['fi','sv','en'];
const TOPICS=Object.keys(LEXICON.fi.subjects);
let runtimeMap;

// 100,000 distinct, normalized, context-dependent phrase forms. Balanced
// between 14 topics and 3 languages, not 100k copies of one example.
export function buildFollowupVariantSeed(limit=FOLLOWUP_VARIANT_TARGET){
  const requested=Math.max(0,Math.min(FOLLOWUP_VARIANT_TARGET,Number(limit)||0));
  const groups=[];
  for(const language of LANGUAGES){
    const cfg=LEXICON[language];
    for(const kind of TOPICS){
      const phrases=[];
      const seen=new Set();
      for(const starter of cfg.starters){
        for(const subject of cfg.subjects[kind]){
          for(const ending of cfg.endings){
            const phrase=[starter,subject,ending].filter(Boolean).join(' ');
            const normalized=normalizeIntentPhrase(phrase);
            if(!normalized||seen.has(normalized))continue;
            seen.add(normalized);
            phrases.push({language,kind,phrase,normalized});
          }
        }
      }
      groups.push(phrases);
    }
  }
  const result=[], global=new Set();
  let index=0;
  while(result.length<requested){
    let progressed=false;
    for(const group of groups){
      if(index>=group.length)continue;
      const item=group[index],key=item.language+'|'+item.normalized;
      if(!global.has(key)){
        global.add(key);result.push(item);progressed=true;
        if(result.length===requested)break;
      }
    }
    if(!progressed)break;
    index++;
  }
  return result;
}

const FOLLOWUP_START=/^(?:ent[aä](?:s|p[aä])?|no ent[aä]|ja ent[aä]|mutta ent[aä]|mites|miten olisi|mit[aä] sitten|haluaisin|voitko|kertoisitko|voisitko|kiinnostaisi|what about|and what about|how about|and how about|but what about|ok but what about|so what about|could you|can you|i would|i am|another question|and then what about|och|och d[aå]|men|hur [aä]r det med|vad g[aä]ller|vad s[aä]ger|kan ni|kan du|jag undrar|jag skulle|en fr[aå]ga|dessutom)(?=\s|$)/i;
const BELOW=/(?:alle|alapuole|pienemm|below|under|less than|lägre|under gr[aä]ns|mindre [aä]n)/i;
const ABOVE=/(?:yli|ylitt[aä]|suuremm|above|over|exceed|greater than|[oö]ver|[oö]verskrid|mer [aä]n)/i;

export function detectContextualFollowup(message, history=[]){
  if(!Array.isArray(history)||!history.some(turn=>String(turn?.question||turn?.user||'').trim()))return null;
  const raw=String(message||'').trim();
  if(!raw||raw.length>240||!FOLLOWUP_START.test(raw))return null;
  if(!runtimeMap){
    runtimeMap=new Map(buildFollowupVariantSeed().map(item=>[item.language+'|'+item.normalized,item.kind]));
  }
  const normalized=normalizeIntentPhrase(raw);
  for(const language of LANGUAGES){
    const kind=runtimeMap.get(language+'|'+normalized);
    if(kind)return {kind,language,normalized,matched:'lexicon'};
  }
  // Robust, conservative coverage for unseen inflections and short messages.
  // A novel word order is recognized only with an explicit follow-up marker.
  const body=normalized.replace(FOLLOWUP_START,'').trim();
  if(!body)return null;
  const previous=String([...history].reverse().find(turn=>String(turn?.question||'').trim())?.question||'');
  const previousShipping=/(?:toimitus|postikul|postitus|shipping|delivery|postage|frakt|leverans)/i.test(previous);
  if(BELOW.test(body) && (/(?:toimitus|postikul|shipping|delivery|frakt|leverans|tilaus|order|best[aä]llning|ostok)/i.test(body)||previousShipping))return {kind:'shipping_below',language:'',matched:'grammar'};
  if(ABOVE.test(body) && (/(?:toimitus|postikul|shipping|delivery|frakt|leverans|tilaus|order|best[aä]llning|ostok)/i.test(body)||previousShipping))return {kind:'shipping_above',language:'',matched:'grammar'};
  const topics=[
    ['shipping_cost',/toimituskulu|toimitusmaks|postikul|postimaks|shipping (?:cost|fee|price|charg)|delivery (?:cost|fee|charg)|postage|fraktkost|fraktpris|leveransavgift/],
    ['delivery_time',/toimitusaika|toimituksen kesto|paketin saap|delivery time|arriv|shipping speed|leveranstid|paketet kommer|frakttid/],
    ['returns',/palautus|palautta|vaihtaminen|retur|return|refund|[aå]terbetalning/],
    ['warranty',/takuu|takuuaika|reklamaatio|garanti|warranty|guarantee|reklamation/],
    ['pricing',/hinta|hintavaihto|paljonko.*maks|price|pricing|cost|priset|kostar|priss[aä]ttning/],
    ['stock',/varasto|saatavuu|stock|availability|inventory|lager|tillg[aä]nglig/],
    ['colors',/v[aä]ri|v[aä]rei|color|colour|f[aä]rg/],
    ['sizes',/koko|mitat|size|dimension|storlek|m[aå]tt/],
    ['hours',/aukiolo|auki|opening hours|business hours|[oö]ppettider|[oö]ppet/],
    ['payment',/maksutapa|maksaminen|korttimaks|klarna|mobilepay|payment|betalning/],
    ['booking',/ajanvaraus|varausai|ajan vara|booking|appointment|bokning|boka tid/],
    ['contact',/yhteystie|yhteyden|puhelinnumero|s[aä]hk[oö]posti|contact|phone|e-?mail|kontakt|telefon/]
  ];
  for(const [kind,pattern] of topics)if(pattern.test(body))return {kind,language:'',matched:'grammar'};
  return null;
}

export function followupCanonicalQuestion(kind,lang='fi'){
  const questions={
    fi:{shipping_below:'Entä alle?',shipping_above:'Mitä toimitus maksaa?',shipping_cost:'Mitä toimitus maksaa?',delivery_time:'Kuinka kauan toimitus kestää?',returns:'Mikä on palautusaika?',warranty:'Mikä on tuotteen takuu?',pricing:'Paljonko se maksaa?',stock:'Onko sitä varastossa?',colors:'Mitä värejä tuotteesta on?',sizes:'Mitä kokoja tuotteesta on?',hours:'Mitkä ovat aukioloajat?',payment:'Mitä maksutapoja hyväksytte?',booking:'Miten varaan ajan?',contact:'Mitkä ovat yhteystietonne?'},
    en:{shipping_below:'What about below?',shipping_above:'What does shipping cost?',shipping_cost:'What does shipping cost?',delivery_time:'How long does delivery take?',returns:'What is the return period?',warranty:'What is the product warranty?',pricing:'How much does it cost?',stock:'Is it in stock?',colors:'What colors are available?',sizes:'What sizes are available?',hours:'What are your opening hours?',payment:'Which payment methods do you accept?',booking:'How do I book an appointment?',contact:'What are your contact details?'},
    sv:{shipping_below:'Och under?',shipping_above:'Vad kostar frakten?',shipping_cost:'Vad kostar frakten?',delivery_time:'Hur lång tid tar leveransen?',returns:'Hur lång är returtiden?',warranty:'Hur lång är garantin?',pricing:'Vad kostar det?',stock:'Finns den i lager?',colors:'Vilka färger finns?',sizes:'Vilka storlekar finns?',hours:'Vilka är era öppettider?',payment:'Vilka betalningsmetoder accepterar ni?',booking:'Hur bokar jag tid?',contact:'Vilka är era kontaktuppgifter?'}
  };
  return (questions[lang]||questions.fi)[kind]||'';
}
