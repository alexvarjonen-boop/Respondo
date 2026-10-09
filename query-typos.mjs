// Typo-tolerant customer question interpretation for FI / SV / EN.
// Only intent wording is corrected; original messages, URLs, company names,
// numbers, prices and persisted chat history remain unchanged.
// Deliberately conservative: no broad dictionary-based guessing.
const rawTerms = {
  fi: [
    'paljonko','maksaa','maksavat','hinta','hinnat','hinnoittelu','kustannus','halvempi','kalliimpi',
    'toimitus','toimitukset','toimituskulut','toimituskulu','toimitusmaksu','toimitushinta',
    'toimitusaika','toimituksessa','toimitukseen','toimitatte','postikulut','postimaksu','postitus',
    'kuljetus','kuljetuskulut','noutopiste','pakettiautomaatti','saapuu','saapuminen','perille','kestää',
    'tilaus','tilaukset','tilauksen','tilaukseen','tilata','tilaan','tilaisin','ostaa','ostoksen',
    'palautus','palauttaa','palautukset','palautusehdot','palautusaika','palautusoikeus','rahat',
    'takuu','takuuaika','takuuehdot','takuukorjaus','reklamaatio','tuote','tuotteet','tuotteen',
    'palvelu','palvelut','palvelun','saatavuus','saatavilla','varastossa','varastoon','väri','värit',
    'värivaihtoehdot','koko','koot','kootaan','kokovaihtoehdot','materiaalit','materiaali',
    'auki','aukioloajat','aukioloaika','huomenna','tänään','lauantaina','sunnuntaina','viikonloppuna',
    'ajanvaraus','ajanvarausta','varata','ajan','varaus','varaukset','ajanvarauksen',
    'yhteystiedot','yhteydenotto','puhelinnumero','sähköposti','osoite','sijainti','myymälä',
    'maksutapa','maksutavat','kortilla','korttimaksu','laskulla','osamaksu','maksaminen',
    'turvallisuus','turvallinen','puhdistus','puhdistaa','hoito-ohje','paljon','milloin',
    'kuinka','kauan','montako','miten','miksi','mistä','missä','mitä','mikä','mitkä','teillä',
    'löytyykö','voinko','voiko','onko','ootteko','saisinko','saanko','haluaisin','entä','entäs',
    'alle','yli','rajan','rajaa','pienempi','suurempi','ilmainen','ilmaiseksi','maksuton',
    'kotiinkuljetus','vaihto','vaihtaa','varastotilanne','alennus','alennukset','tarjouspyyntö',
    'tarjous','hinta-arvio','paljonko','saatteko','katsoa','löytyykö','kiitos','hei','moi','apua',
    'huolto','huoltaa','asennus','korjaus','siivous','hiustenleikkaus','parturi'
  ],
  sv: [
    'leverans','leveransen','leveranstid','leveranstiden','leveransavgift','leveranskostnad',
    'frakt','frakten','fraktkostnad','fraktkostnader','fraktpris','fri','gratis','porto',
    'beställning','beställningen','beställningar','beställa','köpa','köpet','kosta','kostar',
    'pris','priset','priser','prissättning','betala','betalning','betalningsmetoder','betalningssätt',
    'retur','returer','returvillkor','returperiod','returnera','återbetalning','byte',
    'garanti','garantin','garantitid','garantivillkor','reklamation',
    'produkt','produkten','produkter','sortiment','tjänst','tjänster','tjänsten',
    'lager','lagerstatus','tillgänglighet','tillgänglig','färg','färger','färgalternativ',
    'storlek','storlekar','storleksguide','material','öppettider','öppet','öppna','stängt',
    'idag','imorgon','lördag','söndag','helgen','helg','bokning','boka','tidsbokning',
    'kontakt','kontaktuppgifter','telefon','telefonnummer','e-post','adress','butik',
    'hur','länge','många','när','vilken','vilka','var','vad','varför','kan','finns','har',
    'under','över','gränsen','beloppet','summan','billigare','dyrare','tack','hej','hjälp',
    'säker','säkerhet','rengöring','skötselråd','faktura','kortbetalning','avbetalning'
  ],
  en: [
    'shipping','shipment','shipments','delivery','deliveries','delivered','deliver','cost','costs',
    'charge','charges','fee','fees','price','prices','pricing','postage','tracking',
    'threshold','below','above','under','over','free','order','orders','ordering',
    'purchase','purchases','buy','buying','return','returns','returning','refund','refunded',
    'exchange','exchanges','warranty','guarantee','replacement','coverage',
    'product','products','service','services','stock','inventory','available','availability',
    'color','colors','colour','colours','sizes','size','sizing','dimensions','material','materials',
    'opening','hours','open','closed','today','tomorrow','weekend','saturday','sunday',
    'booking','book','appointment','appointments','reservation','cancel','reschedule',
    'contact','contacts','phone','number','email','address','location','store',
    'payment','payments','methods','card','credit','invoice','installments',
    'business','days','weeks','arrive','arrival','takes','take','long','many','how',
    'what','when','where','which','does','do','can','could','would','should',
    'much','more','less','cheap','cheaper','expensive','get','have','is','are','it','there',
    'thanks','thank','hello','help','safe','secure','clean','care','repair'
  ]
};
// Abbreviations / colloquialisms are explicit mappings; these are not fuzzy
// corrections of arbitrary merchant/product text.
const aliases = {
  fi:{
    'paljo':'paljonko','paljoko':'paljonko','paljokse':'paljonko se','paljoks':'paljonko',
    'paljoon':'paljonko','paljkon':'paljonko','paljonkoe':'paljonko',
    'maksa':'maksaa','maksais':'maksaa','maksaisko':'maksaa','makasaa':'maksaa','maksaaa':'maksaa',
    'toimtius':'toimitus','toimitius':'toimitus','tuotius':'toimitus',
    'toimituks':'toimitus','toimtus':'toimitus','toimuts':'toimitus','toimituus':'toimitus',
    'toimituskult':'toimituskulut','postikulutko':'postikulut',
    'kuikn':'kuinka','kuinak':'kuinka','kuika':'kuinka',
    'kaua':'kauan','kauankoha':'kauanko','kui':'kuinka','kauaa':'kauan',
    'kestaa':'kestää','kestääköhän':'kestää','kestaaako':'kestää',
    'onsko':'onko','onks':'onko','oks':'onko','onkos':'onko',
    'teill':'teillä','teil':'teillä','teilt':'teillä',
    'ootteks':'oletteko','ootteko':'oletteko','oletteks':'oletteko','oletteko':'oletteko',
    'huome':'huomenna','huomen':'huomenna','huomenn':'huomenna',
    'aukioloajaat':'aukioloajat','aukiolot':'aukioloajat',
    'voiks':'voiko','voik':'voiko','voiko':'voiko','voink':'voinko',
    'palautaa':'palauttaa','palautta':'palauttaa','paluttaa':'palauttaa',
    'palautuks':'palautus','palauttaaako':'palauttaa',
    'värei':'värit','varei':'värit','väreiä':'värejä','varii':'väri',
    'tuotet':'tuotteet','tuotte':'tuotteet','tuottee':'tuotteen',
    'varastos':'varastossa','varastoos':'varastossa',
    'varastoo':'varastossa','löytyyk':'löytyykö','loytyyko':'löytyykö',
    'millo':'milloin','millon':'milloin','milloinn':'milloin',
    'mitäa':'mitä','mitäkö':'mitä','mita':'mitä','missaa':'missä',
    'saahkoposti':'sähköposti','sahkoposti':'sähköposti',
    'puhnumero':'puhelinnumero','puhelinumer':'puhelinnumero',
    'ajanvarauss':'ajanvaraus','ajanvaruks':'ajanvaraus',
    'varat':'varata','varatta':'varata',
    'ente':'entä','entäa':'entä','entas':'entäs','entap':'entäpä',
    'taku':'takuu','takuuuaika':'takuuaika',
    'paljoonko':'paljonko','ilmasen':'ilmaisen','ilmane':'ilmainen'
  },
  sv:{
    'frackt':'frakt','fraktt':'frakt','fraktkostnd':'fraktkostnad',
    'levernas':'leverans','leveransen':'leveransen','leveransitd':'leveranstid',
    'levrantid':'leveranstid','levarans':'leverans',
    'bestalning':'beställning','bestallning':'beställning','beställa':'beställa',
    'bestalla':'beställa','beställnig':'beställning',
    'kostaar':'kostar','kstar':'kostar','kostra':'kostar',
    'returr':'retur','returnera':'returnera',
    'garantii':'garanti','garantiid':'garantitid',
    'oppettider':'öppettider','oppetider':'öppettider',
    'imorn':'imorgon','imorron':'imorgon','omorgon':'imorgon',
    'storlekarna':'storlekar','storleek':'storlek',
    'nara':'när','nar':'när','vilak':'vilka','vilkan':'vilken',
    'hurra':'hur','hurr':'hur','lange':'länge',
    'undergransen':'under gränsen','overgransen':'över gränsen',
    'tjanster':'tjänster','tjanst':'tjänst','farger':'färger',
    'farg':'färg','fraga':'fråga'
  },
  en:{
    'shiping':'shipping','shippng':'shipping','shippping':'shipping','shippin':'shipping',
    'delivry':'delivery','delvery':'delivery','dleivery':'delivery',
    'delviery':'delivery','deliverry':'delivery','dilevery':'delivery',
    'delverytime':'delivery time','deliveri':'delivery',
    'retun':'return','retrun':'return','retruns':'returns',
    'waranty':'warranty','warrenty':'warranty','warrnty':'warranty',
    'garrantee':'guarantee','guarentee':'guarantee',
    'availble':'available','avaiable':'available','availaible':'available',
    'avilable':'available','avalability':'availability','availibility':'availability',
    'shippment':'shipment','appoitment':'appointment','apointment':'appointment',
    'appoinment':'appointment','bokking':'booking',
    'prcie':'price','pirce':'price','proce':'price',
    'caost':'cost','cst':'cost','costs':'costs',
    'whre':'where','wher':'where','waht':'what','whta':'what',
    'wht':'what','hwo':'how','hwoe':'how','hw':'how',
    'des':'does','deos':'does','dose':'does','doe':'does',
    'tkae':'take','tak':'take','longg':'long','lng':'long',
    'bellow':'below','belwo':'below','undr':'under','abve':'above',
    'mush':'much','mucth':'much','hwomuch':'how much',
    'shppingcost':'shipping cost','shipingcost':'shipping cost',
    'returnd':'returned','servce':'service','servises':'services',
    'qustion':'question','contcat':'contact','adress':'address',
    'recieve':'receive','recieved':'received',
    'colours':'colours','collor':'color','colourss':'colours'
  }
};
const normalize = value=>String(value||'').toLocaleLowerCase('en')
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const vocabulary=Object.fromEntries(Object.entries(rawTerms).map(([lang,terms])=>[lang,
  [...new Set(terms.map(normalize).filter(word=>word.length>=5))]]));

// Bounded Damerau–Levenshtein: typo distance 1 for 5–8 letters and at most 2
// for 9+ letters. Transposed adjacent letters cost 1. Words below five letters
// require an explicit alias. Exact matches and tied candidates stay unchanged.
function distance(a,b,max){
  if(Math.abs(a.length-b.length)>max) return max+1;
  const d=Array.from({length:a.length+1},()=>new Uint8Array(b.length+1));
  for(let i=0;i<=a.length;i++)d[i][0]=i;
  for(let j=0;j<=b.length;j++)d[0][j]=j;
  for(let i=1;i<=a.length;i++){
    let rowMin=255;
    for(let j=1;j<=b.length;j++){
      let x=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
      if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])
        x=Math.min(x,d[i-2][j-2]+1);
      d[i][j]=x; if(x<rowMin)rowMin=x;
    }
    if(rowMin>max && i>b.length+max) return max+1;
  }
  return d[a.length][b.length];
}

function correctWord(word,lang){
  if(word.length<3||word.length>28)return word;
  const key=normalize(word);
  const explicit=aliases[lang]?.[key];
  if(explicit)return explicit;
  const vocab=vocabulary[lang]||[];
  if(vocab.includes(key)||key.length<5||key.length>19)return word;
  // For long domain terms, recognize one internal keyboard slip. Do not
  // "fix" short ordinary words, inflection endings, or proper nouns.
  // Otherwise e.g. "musta" (black) can become "mista" (from where).
  if(key.length<9) return word;
  const limit=1;
  let candidate='',best=limit+1,tie=false;
  for(const target of vocab){
    if(Math.abs(target.length-key.length)>limit||target.slice(0,3)!==key.slice(0,3)||target.slice(-3)!==key.slice(-3))continue;
    const score=distance(key,target,limit);
    if(score<best){best=score;candidate=target;tie=false;}
    else if(score===best&&score<=limit&&target!==candidate)tie=true;
  }
  return candidate&&!tie&&best<=limit?candidate:word;
}

// Avoid interpreting text as company facts. Only a customer question is
// normalized locally before intent matching; caller keeps original verbatim.
export function interpretCustomerQuestion(message,lang='fi'){
  const input=String(message||'');
  const language=['fi','sv','en'].includes(lang)?lang:'fi';
  if(!input||input.length>1200)return {text:input,changed:false};
  const chunks=input.split(/(\s+)/u);
  const out=chunks.map(chunk=>{
    if(!chunk.trim()||/^(?:https?:\/\/|www\.)/i.test(chunk)||chunk.includes('@')||/\d/.test(chunk))return chunk;
    const match=chunk.match(/^([^\p{L}]*)([\p{L}]+)([^\p{L}]*)$/u);
    if(!match)return chunk;
    const [,before,word,after]=match;
    if(word.length>28)return chunk;
    const candidate=correctWord(word,language);
    return before+candidate+after;
  }).join(' ');
  // Preserve exactly original whitespace if no correction was needed.
  const changed=out.replace(/\s+/g,' ').trim()!==input.replace(/\s+/g,' ').trim();
  return {text:changed?out.replace(/\s+/g,' ').trim():input,changed};
}
