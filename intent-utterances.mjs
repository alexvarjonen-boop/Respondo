export const INTENT_UTTERANCE_SEED_VERSION = '2026-10-07-v1';

export function normalizeIntentPhrase(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9åäö€+\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const LIMIT_PER_INTENT_LANGUAGE = 18000;

function addCartesian(store, language, intent, groups, limit = LIMIT_PER_INTENT_LANGUAGE) {
  let phrases = [''];
  for (const group of groups) {
    const values = [...new Set((group || []).map((x) => String(x ?? '').trim()))];
    const next = [];
    for (const left of phrases) {
      for (const right of values) {
        const value = [left, right].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
        if (value) next.push(value);
        if (next.length >= limit * 3) break;
      }
      if (next.length >= limit * 3) break;
    }
    phrases = next;
    if (!phrases.length) return;
  }
  let count = 0;
  for (const phrase of phrases) {
    const normalized = normalizeIntentPhrase(phrase);
    if (!normalized || normalized.length < 2) continue;
    const key = language + '|' + normalized;
    if (!store.has(key)) {
      store.set(key, { language, intent, phrase, normalized });
      count += 1;
      if (count >= limit) break;
    }
  }
}

function addSimple(store, language, intent, questions, subjects, tails = ['']) {
  addCartesian(store, language, intent, [questions, subjects, tails], 2400);
}

export function buildIntentUtteranceSeed() {
  const out = new Map();

  addCartesian(out,'fi','order',[
    ['miten','kuinka','millä tavalla','mitenkä','miten käytännössä','kuinka käytännössä'],
    ['','voin','voi','pystyn','pystyy','saan','saa','kannattaa','olisi mahdollista'],
    ['tilata','ostaa','hankkia','tehdä tilauksen','tehdä tilaus','saada tilattua','hoitaa tilauksen','jättää tilaus'],
    ['','tämän','sen','tuotteen','tuotteita','teiltä','teiltä tämän','verkkokaupasta','palvelun','tämän tuotteen','näitä','tuon'],
    ['','teiltä','käytännössä','netissä','verkossa','täältä','nyt','helpoiten','oikein']
  ]);
  addCartesian(out,'fi','order',[
    ['miten','kuinka','millä tavalla','miten käytännössä'],
    ['tilaus','tilaaminen','oston tekeminen','tilauksen tekeminen','ostaminen','tilaaminen teiltä'],
    ['tapahtuu','toimii','tehdään','onnistuu','hoidetaan','menee','käytännössä tapahtuu'],
    ['','teillä','täällä','verkkokaupassa','netissä']
  ],5000);

  addCartesian(out,'en','order',[
    ['how','how exactly','what is the way to','where can','can','could','what do i do to'],
    ['','do i','can i','should i','would i','am i able to'],
    ['order','buy','purchase','place an order for','get','complete an order for'],
    ['','this','it','the product','products','from you','this product','these','the service'],
    ['','from you','online','on the website','right now','in practice','easily']
  ]);
  addCartesian(out,'en','order',[
    ['how','how exactly','what is the way','can you explain how'],
    ['the order','ordering','placing an order','the purchase','buying'],
    ['works','happens','is done','is completed','goes','works in practice'],
    ['','here','with you','on the website','online']
  ],5000);

  addCartesian(out,'sv','order',[
    ['hur','på vilket sätt','hur exakt','hur i praktiken','var kan','kan','skulle jag kunna'],
    ['','kan jag','ska jag','kan man','går det att'],
    ['beställa','köpa','handla','göra en beställning','lägga en beställning','få beställt'],
    ['','den här','den','produkten','produkter','från er','den här produkten','dessa','tjänsten'],
    ['','från er','online','på webben','nu','i praktiken','enkelt']
  ]);
  addCartesian(out,'sv','order',[
    ['hur','på vilket sätt','hur exakt','hur i praktiken'],
    ['beställningen','beställning','att beställa','köpet','att köpa'],
    ['fungerar','går till','görs','sker','ordnas','fungerar i praktiken'],
    ['','hos er','här','i webbutiken','online']
  ],5000);

  const fiQ=['miten','kuinka','mikä','mitkä','missä','mistä','voiko','voinko','onko','paljonko','milloin','haluaisin tietää','kerro'];
  const enQ=['how','what','which','where','can i','can you','is there','are there','when','how much','i want to know','tell me'];
  const svQ=['hur','vad','vilken','vilka','var','kan jag','kan ni','finns det','är det','när','hur mycket','jag vill veta','berätta'];

  const defs = [
    ['pricing',
      ['hinta','hinnat','paljonko maksaa','mitä maksaa','hinnoittelu','paljonko tämä maksaa','paljonko se maksaa','paljonko tuotteet maksavat'],
      ['price','prices','how much is it','how much does it cost','pricing','cost','what does this cost','what do the products cost'],
      ['pris','priser','hur mycket kostar det','vad kostar det','prissättning','kostnad','vad kostar den här','vad kostar produkterna']],
    ['shipping',
      ['toimitus','toimitukset','toimituskulut','postitus','toimitusaika','miten toimitus toimii','paljonko toimitus maksaa','milloin paketti tulee'],
      ['shipping','delivery','shipping cost','delivery fee','delivery time','how shipping works','how much shipping costs','when the package arrives'],
      ['leverans','frakt','fraktkostnad','leveransavgift','leveranstid','hur leveransen fungerar','vad frakten kostar','när paketet kommer']],
    ['returns',
      ['palautus','palautukset','palauttaa tuotteen','vaihto','rahat takaisin','miten palautan','voiko palauttaa','palautusehdot'],
      ['return','returns','return a product','exchange','refund','how do i return','can i return it','return policy'],
      ['retur','returer','returnera en produkt','byte','återbetalning','hur returnerar jag','kan jag returnera','returvillkor']],
    ['location',
      ['sijainti','osoite','missä sijaitsette','missä olette','missä yritys on','myymälä','toimipaikka','mistä teidät löytää'],
      ['location','address','where are you located','where are you','where is the company','store location','where can i find you','where is your store'],
      ['plats','adress','var finns ni','var ligger ni','var finns företaget','butik','verksamhetsställe','var hittar jag er']],
    ['hours',
      ['aukioloajat','milloin olette auki','oletteko auki','mihin asti auki','auki tänään','auki huomenna','palveluajat','auki viikonloppuna'],
      ['opening hours','when are you open','are you open','how late are you open','open today','open tomorrow','business hours','open on weekends'],
      ['öppettider','när har ni öppet','har ni öppet','hur länge har ni öppet','öppet idag','öppet imorgon','öppettider idag','öppet på helgen']],
    ['contact',
      ['yhteystiedot','puhelinnumero','sähköposti','miten saan yhteyden','miten otan yhteyttä','numero','email','asiakaspalvelun yhteystiedot'],
      ['contact details','phone number','email','how do i contact you','how can i reach you','number','customer service contact','contact information'],
      ['kontaktuppgifter','telefonnummer','e-post','hur kontaktar jag er','hur når jag er','nummer','kundservice kontakt','kontaktinformation']],
    ['booking',
      ['ajanvaraus','varaa aika','varata aika','miten varaan ajan','voinko varata ajan','vapaat ajat','ajan varaaminen','ajanvarauslinkki'],
      ['booking','book an appointment','make an appointment','how do i book','can i book','available appointments','appointment booking','booking link'],
      ['bokning','boka tid','beställa tid','hur bokar jag','kan jag boka','lediga tider','tidsbokning','bokningslänk']],
    ['payment',
      ['maksutapa','maksutavat','miten voi maksaa','voiko maksaa kortilla','korttimaksu','lasku','klarna','mobilepay'],
      ['payment method','payment methods','how can i pay','can i pay by card','card payment','invoice','klarna','apple pay'],
      ['betalningsmetod','betalningssätt','hur kan jag betala','kan jag betala med kort','kortbetalning','faktura','klarna','mobilepay']],
    ['warranty',
      ['takuu','takuuaika','reklamaatio','miten takuu toimii','onko takuuta','kuinka pitkä takuu','tuotetakuu','virheellinen tuote'],
      ['warranty','warranty period','complaint','how does the warranty work','is there a warranty','how long is the warranty','product warranty','faulty product'],
      ['garanti','garantitid','reklamation','hur fungerar garantin','finns det garanti','hur lång garanti','produktgaranti','felaktig produkt']],
    ['availability',
      ['saatavuus','onko varastossa','löytyykö varastosta','saako tätä','onko saatavilla','varastotilanne','milloin saatavilla','tuotetta jäljellä'],
      ['availability','is it in stock','do you have it in stock','can i get this','is it available','stock status','when available','items left'],
      ['tillgänglighet','finns den i lager','har ni den i lager','kan jag få den här','finns den tillgänglig','lagerstatus','när finns den','produkter kvar']],
    ['products',
      ['tuotteet','mitä myytte','mitä tuotteita teillä on','valikoima','tuotevalikoima','mitä teiltä saa','mitä on myynnissä','kaikki tuotteet'],
      ['products','what do you sell','what products do you have','selection','product range','what can i buy from you','what is for sale','all products'],
      ['produkter','vad säljer ni','vilka produkter har ni','sortiment','produktsortiment','vad kan jag köpa av er','vad säljs','alla produkter']],
    ['services',
      ['palvelut','mitä teette','mitä palveluita tarjoatte','palveluvalikoima','mitä teiltä saa','mitä osaatte tehdä','tarjoamanne palvelut','kaikki palvelut'],
      ['services','what do you do','what services do you offer','service selection','what can you do','what do you provide','your services','all services'],
      ['tjänster','vad gör ni','vilka tjänster erbjuder ni','tjänsteutbud','vad kan ni göra','vad erbjuder ni','era tjänster','alla tjänster']],
    ['quote',
      ['tarjous','tarjouspyyntö','pyydä tarjous','miten saan tarjouksen','voinko pyytää tarjouksen','hinta-arvio','arvio hinnasta','tarjouksen tekeminen'],
      ['quote','request a quote','get a quote','how do i get a quote','can i request a quote','estimate','price estimate','quote request'],
      ['offert','offertförfrågan','begär offert','hur får jag en offert','kan jag begära offert','prisuppskattning','kostnadsförslag','offertbegäran']],
    ['safety',
      ['turvallisuus','onko tämä turvallinen','onko se turvallista','turvallinen käyttää','turvallinen tilata','maksaminen turvallista','tilaaminen turvallista','onko turvallista'],
      ['safety','is this safe','is it safe','safe to use','safe to order','is payment secure','is ordering secure','is it secure'],
      ['säkerhet','är detta säkert','är det säkert','säkert att använda','säkert att beställa','är betalningen säker','är beställningen säker','är det tryggt']],
    ['care',
      ['hoito-ohje','hoito','puhdistusohje','miten puhdistan','miten pesen','miten hoidan','tuotteen huolto','huolto-ohje'],
      ['care instructions','care','cleaning instructions','how do i clean it','how do i wash it','how do i care for it','product care','maintenance instructions'],
      ['skötselråd','skötsel','rengöringsinstruktioner','hur rengör jag','hur tvättar jag','hur sköter jag den','produktskötsel','underhållsinstruktioner']],
    ['size',
      ['koko','koot','kokotaulukko','mikä koko','mitä kokoja','mitat','koko-opas','sopiva koko'],
      ['size','sizes','size chart','what size','what sizes','dimensions','size guide','right size'],
      ['storlek','storlekar','storlekstabell','vilken storlek','vilka storlekar','mått','storleksguide','rätt storlek']],
    ['color',
      ['väri','värit','mitä värejä','missä väreissä','värivaihtoehdot','saako mustana','saako valkoisena','eri värit'],
      ['color','colors','what colors','which colors','color options','available in black','available in white','different colors'],
      ['färg','färger','vilka färger','i vilka färger','färgalternativ','finns i svart','finns i vitt','olika färger']],
    ['material',
      ['materiaali','materiaalit','mistä tehty','mistä tämä on tehty','mitä materiaalia','valmistusmateriaali','materiaalivaihtoehdot','koostumus'],
      ['material','materials','what is it made of','what is this made of','which material','manufacturing material','material options','composition'],
      ['material','materialer','vad är den gjord av','vad är detta gjort av','vilket material','tillverkningsmaterial','materialalternativ','sammansättning']]
  ];

  for (const [intent,fi,en,sv] of defs) {
    addSimple(out,'fi',intent,fiQ,fi,['','teillä','teiltä','tästä','tälle tuotteelle','käytännössä']);
    addSimple(out,'en',intent,enQ,en,['','with you','from you','for this','for this product','in practice']);
    addSimple(out,'sv',intent,svQ,sv,['','hos er','från er','om detta','för den här produkten','i praktiken']);
  }

  return [...out.values()];
}

export function classifyIntentByGrammar(value) {
  const q = normalizeIntentPhrase(value);
  if (!q) return '';

  const orderVerb = /\b(?:tilata|tilaan|tilataan|tilattua|tilauksen|tilaaminen|tilaus|ostaa|ostan|ostetaan|ostaminen|hankkia|hankin|beställa|beställning|beställningen|bestalla|bestallning|köpa|kopa|order|ordering|buy|purchase|placing an order)\b/;
  const orderHow = /\b(?:miten|kuinka|milla tavalla|mitenka|missa|mista|voinko|voiko|saanko|saako|how|where|can i|could i|what do i do|hur|var|kan jag|kan man|gar det)\b/;
  const orderProcess = /\b(?:tapahtuu|toimii|tehdään|tehdaan|onnistuu|hoidetaan|menee|works|happens|is done|is completed|goes|fungerar|går till|gar till|görs|gors|sker|ordnas)\b/;
  if ((orderVerb.test(q) && orderHow.test(q)) ||
      (/\b(?:tilaus|tilaaminen|tilauksen tekeminen|ostaminen|bestallning|bestallningen|ordering|the order|placing an order)\b/.test(q) && orderProcess.test(q))) {
    return 'order';
  }

  if (/\b(?:toimitus|toimituskulu|postitus|shipping|delivery|postage|frakt|leverans)\b/.test(q) &&
      /\b(?:hinta|maksaa|maksu|kulu|price|cost|fee|charge|pris|kostar|avgift)\b/.test(q)) return 'shipping';
  if (/\b(?:palautus|palauttaa|palautan|returns?|refund|retur|returnera|vaihto|exchange|återbetalning)\b/.test(q)) return 'returns';
  if (/\b(?:sijainti|osoite|missä sijait|missä olette|where are you located|where is the company|store location|var finns ni|var ligger ni|adress)\b/.test(q)) return 'location';
  if (/\b(?:aukiolo|auki|opening hours|open today|open tomorrow|öppettider|oppettider|öppet|oppet)\b/.test(q)) return 'hours';
  if (/\b(?:puhelin|phone number|telefon|sähköposti|sahkoposti|email|e-post|yhteystiedot|contact details|kontaktuppgifter)\b/.test(q)) return 'contact';
  if (/\b(?:ajanvaraus|varaa aika|varata aika|booking|appointment|boka tid|bokning|tidsbokning)\b/.test(q)) return 'booking';
  if (/\b(?:maksutapa|maksutavat|payment method|payment methods|betalningsmetod|betalningssätt|betalningssatt|klarna|mobilepay|apple pay|google pay)\b/.test(q)) return 'payment';
  if (/\b(?:takuu|warranty|garanti|reklamaatio|reklamation)\b/.test(q)) return 'warranty';
  if (/\b(?:varastossa|saatavilla|saatavuus|in stock|available|lagerstatus|i lager|tillgänglig|tillganglig)\b/.test(q)) return 'availability';
  if (/\b(?:mitä myytte|mita myytte|what do you sell|vad säljer ni|vad saljer ni|tuotevalikoima|product range|produktsortiment)\b/.test(q)) return 'products';
  if (/\b(?:mitä teette|mita teette|what do you do|vad gör ni|vad gor ni|palveluvalikoima|service selection|tjänsteutbud|tjansteutbud)\b/.test(q)) return 'services';
  if (/\b(?:tarjouspyyntö|tarjouspyynto|pyydä tarjous|pyyda tarjous|request a quote|get a quote|offertförfrågan|offertforfragan|begär offert|begar offert)\b/.test(q)) return 'quote';
  if (/\b(?:onko tämä turvallinen|onko tama turvallinen|onko se turvallista|is this safe|is it safe|är detta säkert|ar detta sakert|är det säkert|ar det sakert)\b/.test(q)) return 'safety';
  if (/\b(?:hoito-ohje|puhdistusohje|care instructions|cleaning instructions|skötselråd|skotselrad|rengöringsinstruktioner|rengoringsinstruktioner)\b/.test(q)) return 'care';
  if (/\b(?:kokotaulukko|koko-opas|size chart|size guide|storlekstabell|storleksguide)\b/.test(q)) return 'size';
  if (/\b(?:värivaihtoehdot|varivaihtoehdot|color options|färgalternativ|fargalternativ)\b/.test(q)) return 'color';
  if (/\b(?:mistä tehty|mista tehty|what is it made of|vad är den gjord av|vad ar den gjord av|materiaali|materials?)\b/.test(q)) return 'material';
  if (/\b(?:hinta|hinnoittelu|price|pricing|pris|prissättning|prissattning)\b/.test(q) ||
      /\b(?:paljonko|how much|hur mycket)\b.*\b(?:maksaa|cost|kostar)\b/.test(q)) return 'pricing';
  if (/\b(?:toimitus|shipping|delivery|frakt|leverans|tracking|seuranta)\b/.test(q)) return 'shipping';
  return '';
}
