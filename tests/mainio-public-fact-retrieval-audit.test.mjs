// Source-locked, public-fact fixtures reflecting Mainio's approved knowledge
// as of 2026-11-02. This is a retrieval/answer test, not a live booking test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateGroundedAnswer} from '../server.mjs';
import {mainioPublicFactAnswer} from '../mainio-public-fact-answer.mjs';
import {mainioCustomerVoice} from '../mainio-customer-voice.mjs';

const faq='https://www.mainiomuuttopalvelu.fi/usein-muutosta-kysyttya';
const boxes='https://www.mainiomuuttopalvelu.fi/muuttolaatikot-ja-tarvikkeet';
const vans='https://www.mainiomuuttopalvelu.fi/pakettiautojen-vuokraus';
const overview='https://www.mainiomuuttopalvelu.fi/';
const fact=(category,title,answer,url=faq)=>({
  id:'mainio-fixture-'+title,category,title,answer,keywords:[],
  source_type:'website',source_url:url,approved:true
});
const rows=[
 fact('Muuttolaatikot','Muuttolaatikoiden hinta','Mainion muuttolaatikoiden hinnasto: vuokra 0,20 euroa laatikolta vuorokaudessa ja minimilaskutus 10 euroa. Vuokraus- ja toimitusehdot tarkistetaan yritykseltä.',boxes),
 fact('Muuttolaatikot','Muuttolaatikoiden mitat','Mainion muuttolaatikoiden koko on 600 × 400 × 300 mm.',boxes),
 fact('Muuttolaatikot','Kuinka monta muuttolaatikkoa tarvitsen?','Mainion UKK arvioi tarvittavaksi noin 0,8 laatikkoa asuinneliötä kohti, kun taas laatikkovuokraussivu käyttää noin yhtä laatikkoa neliötä kohti. Kyse on suuntaa-antavasta noin 0,8–1 laatikon arviosta neliötä kohden; lopullinen määrä riippuu tavaroista.'),
 fact('Muuttolaatikot','Laatikoiden kuljetusmaksu','Mainion muuttolaatikoiden kuljetus maksaa hinnaston mukaan 25 euroa ajokerralta Turkuun, Raisioon, Kaarinaan, Maskuun, Lietoon ja Naantaliin. Muut kunnat sopimuksen mukaan.',boxes),
 fact('Muuttolaatikot','Laatikoiden toimitus ja palautus','Mainio voi toimittaa muuttolaatikot ja noutaa ne pois Turussa ja lähialueilla. Omatoiminen nouto toimipisteeltä on mahdollista vain erikseen sovittaessa.',boxes),
 fact('Muuttolaatikot','Muuttolaatikkojen noutopäivät','Mainion verkkosivujen muuttolaatikkolomakkeessa nouto- ja toimituspäiviksi on ilmoitettu maanantai, keskiviikko ja perjantai. Verkkolomakkeessa varoitusaika on vähintään 24 tuntia.',boxes),
 fact('Pakettiautot','Pakettiautojen ajokortti','Mainion FAQ:n mukaan kaikkia sen vuokrattavia pakettiautoja saa ajaa B-ajokortilla.'),
 fact('Pakettiautot','Pakettiautojen yövuokraus','Mainion UKK:n mukaan pakettiauton yön yli vuokrauksesta on sovittava erikseen asiakaspalvelun kanssa; nettivaraus ei kata yön yli vuokrausta.'),
 fact('Pakettiautot','Pakettiautojen omavastuu','Mainion suomenkielisen pakettiautosivun mukaan vuokraajan omavastuu on 1300 euroa vahinkoa kohden. Omavastuun voi alentaa 650 euroon maksamalla 25 euron omavastuunpuolitusmaksun. Tarkat vuokrausehdot tulee tarkistaa yritykseltä.',vans),
 fact('Pakettiautot','Pakettiauton nouto- ja palautusosoite','Mainion vuokra-autojen nouto ja palautus tapahtuvat osoitteessa Tavarakatu 1, 20250 Turku, vanhalla tavara-asemalla Koulukadun ABC:tä vastapäätä.',vans),
 fact('Pakettiautot','Pakettiauton 5 tunnin vuokrahinnat','Mainion suomenkielisen pakettiautosivun hinnasto: 13 m³ pakettiauto 70 euroa / 5 h, 17 m³ 90 euroa / 5 h ja 20 m³ 110 euroa / 5 h. Näihin sisältyy 100 km.',vans),
 fact('Pakettiautot','Pakettiauton vuorokausivuokra','Mainion suomenkielisen pakettiautosivun hinnasto: 13 m³ pakettiauto 90 euroa/vrk, 17 m³ 110 euroa/vrk ja 20 m³ 140 euroa/vrk; vuorokausivuokraan sisältyy 150 km. Yön yli vuokrauksesta sovitaan erikseen.',vans),
 fact('Kierrätys','Kierrätyksen alkaen hinta','Mainion UKK:n mukaan kierrätyspalvelun hinnat alkavat 25 eurosta. Lopullinen hinta tarkistetaan palvelun sisällön perusteella.'),
 fact('Kierrätys','Kuolinpesän tyhjennys','Mainio tarjoaa asuntojen, varastojen ja kuolinpesien tyhjennyspalveluja. Lopullinen hinta riippuu tavaramäärästä, kulkuyhteyksistä, työstä ja jätteenkäsittelystä.','https://www.mainiomuuttopalvelu.fi/asunnon-tyhjennyksen-hinta-mista-kustannus-koostuu'),
 fact('Kierrätys','Kierrätyspalvelu','Mainio tarjoaa erillisiä kierrätys- ja jätteennoutopalveluja. Se voi noutaa mm. huonekaluja, sähkölaitteita, metalleja, puuta, pahvia ja sekalaista irtaimistoa.'),
 fact('Kierrätys','Voiko jätteen noutaa pakkaamatta?','Mainion kierrätyspalvelussa tavaroita ei tarvitse välttämättä pakata, vaan ne voidaan noutaa sellaisenaan. Tarkempi toteutus sovitaan yrityksen kanssa.'),
 fact('Varastointi','Välivarastointi ennen muuttoa','Mainio tarjoaa välivarastointia, jos vanhasta asunnosta on lähdettävä ennen uuden vapautumista. Tavarat voidaan toimittaa uuteen asuntoon tämän vapauduttua.'),
 fact('Kalusteasennukset','Kalusteiden purkaminen ja kokoaminen','Mainio tekee huonekalujen purkua, kokoamista ja asennuksia kodin ja yritysten tiloihin.'),
 fact('Kalusteasennukset','TV ja reititinasennukset','Mainion UKK:ssa mainitaan TV-asennukset sekä internetin peruskytkennät ja reitittimien asennus. Yritys ei tee luvanvaraisia sähkö- tai putkitöitä.'),
 fact('Muuttopalvelut','Muuton hinta','Muuton hinta arvioidaan muuton tietojen perusteella. Siihen vaikuttavat mm. tavaramäärä, asunnon koko, hissit, kerrokset, kantomatkat, muuttomatka, pakkaus ja muuttopäivä.'),
 fact('Muuttopalvelut','Kotimuuttojen palvelut','Mainio Muuttopalvelu hoitaa kotimuuttoja, tarvittaessa koko muuton tai vain osan siitä. Palvelu voidaan räätälöidä asiakkaan tarpeisiin.',overview),
 fact('Muuttopalvelut','Täyden palvelun avaimet käteen -muutto','Mainio voi hoitaa muuton avaimet käteen -periaatteella myös tavaroiden pakkaamisen. Tarkka työn sisältö sovitaan etukäteen.'),
];

// Minimum grounded factual checkpoints. An abstention is a failure on these
// when the exact supporting item exists in the provided knowledge.
const cases=[
 ['Mitä muuttolaatikon vuokra maksaa?',['0,20']],
 ['Paljonko muuttolaatikoiden vuokra on?',['0,20']],
 ['Minkä kokoisia muuttolaatikot ovat?',['600','400']],
 ['Kuinka monta muuttolaatikkoa tarvitsen?',['0,8']],
 ['Mikä on laatikoiden kuljetusmaksu?',['25']],
 ['Toimitatteko muuttolaatikot kotiin?',['toimittaa']],
 ['Milloin muuttolaatikoita toimitetaan?',['maanantai']],
 ['Riittääkö B-ajokortti pakettiauton ajoon?',['B-ajokort']],
 ['Saako pakettiauton vuokrata yön yli?',['erikseen']],
 ['Mikä on pakettiauton omavastuu?',['1300']],
 ['Mistä pakettiauton saa noutaa?',['Tavarakatu 1']],
 ['Paljonko pakettiauton vuokra maksaa viideltä tunnilta?',['70','90']],
 ['Paljonko pakettiauton vuokra maksaa vuorokaudelta?',['90','110','140']],
 ['Mistä kierrätyksen hinnat alkavat?',['25']],
 ['Voitteko tyhjentää kuolinpesän?',['kuolinpes']],
 ['Onko teillä kierrätyspalvelua?',['kierrätys']],
 ['Voiko kierrätystavarat noutaa ilman pakkaamista?',['pakata']],
 ['Tarjoatteko välivarastointia?',['välivarast']],
 ['Voitteko purkaa ja koota huonekaluja?',['koko']],
 ['Teettekö luvanvaraisia sähkötöitä?',['ei']],
 ['Mistä muuton hinta muodostuu?',['tavaramäär']],
 ['Onnistuuko avaimet käteen -muutto?',['avaimet käteen']],
];
test('Mainio approved-facts semantic FAQ retrieval across 22 concrete customer needs',async()=>{
  const fails=[];
  for(const [message,phrases] of cases){
    const result=mainioPublicFactAnswer(rows,message,'fi') || await generateGroundedAnswer({
      companyName:'Mainio Muuttopalvelu',rows,message,lang:'fi',history:[]
    });
    const answer=mainioCustomerVoice(String(result?.answer||''),'fi');
    const missing=phrases.filter(p=>!answer.toLowerCase().includes(p.toLowerCase()));
    if(result?.handoff || !result?.sourceIds?.length || missing.length)
      fails.push({question:message,missing,sourceIds:result?.sourceIds||[],
        handoff:result?.handoff,answer:answer.slice(0,220)});
  }
  assert.deepEqual(fails,[]);
});
