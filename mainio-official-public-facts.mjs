// Public, source-locked Mainio FAQ facts checked against official pages
// on 2026-11-02. Only the EXACT Mainio public-demo website identity may
// receive these. Never load another tenant's private knowledge or present
// a published price as proof of an individual date/booking availability.
// Update these published facts if Mainio changes its website.
const site='https://www.mainiomuuttopalvelu.fi/';
const box=site+'muuttolaatikot-ja-tarvikkeet';
const van=site+'pakettiautojen-vuokraus';
const faq=site+'usein-muutosta-kysyttya';
const area=site+'muuttolaatikot-ja-pakkausmateriaalit-panosta-laatuun-ja-suojaa-irtaimistosi-vaurioilta';
const specs=[
 ['Muuttopalvelut','Muuton toimialue',
  'Mainio palvelee Turussa ja Varsinais-Suomessa. Muutot voivat suuntautua myös muualle Suomeen; tarkka reitti, muuttopäivä ja hinta sovitaan erikseen.',area],
 ['Muuttolaatikot','Muuttolaatikoiden hinta',
  'Muuttolaatikoiden vuokra 0,20 euroa laatikolta vuorokaudessa. Minimilaskutus 10 euroa.',box],
 ['Muuttolaatikot','Muuttolaatikoiden mitat',
  'Muuttolaatikoidemme koko on 600 × 400 × 300 mm.',box],
 ['Muuttolaatikot','Kuinka monta muuttolaatikkoa tarvitsen?',
  'Mainion UKK:n mukaan noin 0,8 laatikkoa asuinneliötä kohden, ja muuttolaatikkosivulla noin yksi laatikko asuinneliötä kohden. Suuntaa-antava arvio on 0,8–1 laatikkoa/m²; määrä riippuu tavaroista.',faq],
 ['Muuttolaatikot','Laatikoiden kuljetusmaksu',
  'Muuttolaatikoiden kuljetus maksaa 25 euroa ajokerralta Turkuun, Raisioon, Kaarinaan, Maskuun, Lietoon ja Naantaliin. Muihin kuntiin toimitus sovitaan erikseen.',box],
 ['Muuttolaatikot','Laatikoiden toimitus ja palautus',
  'Toimitamme muuttolaatikot Turkuun ja lähialueille sekä noudamme ne pois. Omatoiminen nouto toimipisteeltä onnistuu vain erikseen sovittaessa.',box],
 ['Muuttolaatikot','Muuttolaatikkojen noutopäivät',
  'Muuttolaatikoiden nouto- ja toimituspäivät ovat maanantai, keskiviikko ja perjantai. Varausta ei voi tehdä seuraavalle päivälle alle 24 tunnin varoitusajalla.',box],
 ['Pakettiautot','Pakettiautojen omavastuu',
  'Vuokra-automme omavastuu on 1300 euroa vahinkoa kohden. Sen voi alentaa 650 euroon maksamalla 25 euron omavastuunpuolitusmaksun. Tarkemmat vuokrausehdot löytyvät verkkosivuiltamme.',van],
 ['Pakettiautot','Pakettiautojen ajokortti',
  'Kyllä, kaikkia vuokrattavia pakettiautojamme saa ajaa B-ajokortilla.',faq],
 ['Pakettiautot','Pakettiautojen yövuokraus',
  'Kyllä, pakettiauton voi vuokrata yön yli, mutta siitä täytyy sopia erikseen asiakaspalvelumme kanssa. Yön yli vuokraus ei onnistu nettivarauksen kautta.',faq],
 ['Pakettiautot','Pakettiauton nouto- ja palautusosoite',
  'Pakettiauto noudetaan ja palautetaan osoitteesta Tavarakatu 1, 20250 Turku. Vuokrausta edeltävänä päivänä saat tekstiviestillä tarkemmat auton nouto- ja palautusohjeet. Ohjeiden mukaan nouto ja palautus onnistuvat joustavasti.',van],
 ['Pakettiautot','Pakettiauton 5 tunnin vuokrahinnat',
  'Viiden tunnin vuokra: 13 m³ pakettiauto 70 euroa, 17 m³ pakettiauto 90 euroa ja 20 m³ pakettiauto 110 euroa. Hintoihin sisältyy 100 km.',van],
 ['Pakettiautot','Paljonko pakettiauton 3 tunnin vuokra maksaa?',
  'Kolmen tunnin vuokra: 13 m³ pakettiauto 50 euroa ja 17 m³ pakettiauto 70 euroa. Hintoihin sisältyy 100 km.',van],
 ['Pakettiautot','Pakettiauton vuorokausivuokra',
  'Vuorokausivuokra: 13 m³ pakettiauto 90 euroa, 17 m³ pakettiauto 110 euroa ja 20 m³ pakettiauto 140 euroa. Hintoihin sisältyy 150 km.',van],
 ['Kierrätys','Kierrätyksen alkaen hinta',
  'Kierrätyspalvelumme hinnat alkavat 25 eurosta. Tarkka hinta määräytyy noudettavien tavaroiden ja työn perusteella.',faq],
 ['Kierrätys','Voiko jätteen noutaa pakkaamatta?',
  'Kierrätettävää irtaimistoa ei tarvitse välttämättä pakata: voimme noutaa tavarat sellaisenaan.',faq],
 ['Kierrätys','Kierrätyspalvelu',
  'Voimme noutaa huonekaluja, sähkölaitteita, metalleja, puuta, pahvia, pienesineitä ja säkkejä sekä tyhjentää varastoja ja kellareita.',faq],
 ['Varastointi','Välivarastointi ennen muuttoa',
  'Tarjoamme välivarastointia, jos vanhasta asunnosta pitää lähteä ennen kuin uusi asunto vapautuu.',faq],
 ['Kalusteasennukset','Kalusteiden purkaminen ja kokoaminen',
  'Purkamiset, kokoamiset ja kalusteasennukset kuuluvat palveluihimme.',faq],
 ['Kalusteasennukset','TV ja reititinasennukset',
  'Mainio ei tee luvanvaraisia sähkö- tai putkitöitä. Mainio voi auttaa TV:n ja reitittimen asennuksessa.',faq],
 ['Muuttopalvelut','Muuttopäivän kulku',
  'Saat meiltä kattavat muutto-ohjeet, joissa käydään läpi muuttopäivän kulku.',faq],
 ['Muuttopalvelut','Muuton kesto',
  'Muuton kestoon vaikuttavat tavaramäärä, kerrokset, hissit, pakkaamisen valmius, kantomatkat, muuton etäisyys, pysäköintimahdollisuudet ja muuttajien määrä. Tarkkaa kestoa ei voi vahvistaa ilman muuton tietoja.',faq],
 ['Muuttopalvelut','Pakkaus- ja kantoapu',
  'Kyllä. Tarjoamme muuttopalvelun tavaroiden kantamisella ja tarvittaessa myös pakkaamisella. Sopiva avun määrä ja palvelun sisältö sovitaan ennen tilausta.',site+'muuttopalvelut'],
 ['Muuttopalvelut','Hissittömän muuton suunnittelu',
  'Kerrokset, hissit, tavaramäärä ja kantomatkat vaikuttavat muuton suunnitteluun ja kestoon. Kerro hissin puuttumisesta ja kerroksista tarjouspyynnössä, niin tarkistamme toteutuksen ja hinnan erikseen.',faq],
 ['Pakettiautot','Pakettiauton tavaratilan koko',
  'Vuokrattavien pakettiautojen kokoluokkia ovat 13 m³, 17 m³ ja 20 m³. Se, mahtuuko oma kuorma autoon, riippuu tavaroiden mitoista ja kuormauksesta. Tarkista sopiva koko ennen varausta.',van],
 ['Muuttopalvelut','Muuton hinta',
  'Muuton lopullinen hinta riippuu muun muassa asunnon koosta, tavaramäärästä, kerroksista, hissistä, kantomatkasta, muuttomatkasta ja tarvittavasta työstä. Tarkka tarjous vahvistetaan erikseen.',faq],
 ['Muuttopalvelut','Täyden palvelun avaimet käteen -muutto',
  'Kyllä, voimme hoitaa koko muuton myös tavaroiden pakkaamisen kanssa avaimet käteen -periaatteella. Sisältö sovitaan muuton suunnittelussa.',faq],
];
const OFFICIAL=Object.freeze(specs.map(([category,title,answer,source_url],i)=>Object.freeze({
  id:'demo-mainio-official-'+String(i+1).padStart(2,'0'),
  category,title,answer,source_type:'website',source_url,approved:true
})));
export function mainioOfficialPublicFacts(){
  return OFFICIAL.map(row=>({...row}));
}
export function mainioPublicKnowledgeWithOfficialFacts(importedRows){
  // Source-trusted, curated rows lead. Imported web text is retained only
  // for other questions: no facts are invented about specific reservations.
  return [...mainioOfficialPublicFacts(),...(Array.isArray(importedRows)?importedRows:[])];
}
