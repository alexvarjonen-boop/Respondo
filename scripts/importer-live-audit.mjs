import assert from 'node:assert/strict';
import {
  fetchWebsiteBundle,
  websiteKnowledgeCandidates,
  extractFreeWebsiteProfile,
  generateGroundedAnswer,
} from '../server.mjs';

const norm=(value)=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const digits=(value)=>String(value||'').replace(/\D/g,'');

function rowsFromCandidates(candidates){
  return candidates.map((item,index)=>({
    id:'live-'+index,
    category:String(item?.category||'Verkkosivulta tuotu').slice(0,80),
    title:String(item?.title||item?.category||'').slice(0,180),
    answer:String(item?.answer||'').slice(0,1600),
    keywords:Array.isArray(item?.keywords)?item.keywords.slice(0,32):[],
    source_type:'website',
    source_url:String(item?.sourceUrl||'')||null,
  })).filter((row)=>row.title&&row.answer);
}

function candidateText(candidates){
  return candidates.map((x)=>[x.category,x.title,x.answer,x.sourceUrl].filter(Boolean).join(' | ')).join('\n');
}

function assertNoJunk(site,candidates){
  const bad=[
    /localstorage|sessionstorage|queryselector|addeventlistener|json\.stringify|webpack/i,
    /write a review|customer reviews|asiakasarvostelut|based on \d+ reviews/i,
    /skip to content|toggle navigation|all rights reserved/i,
    /^(?:regular price|unit price|select option|choose option|add to cart)$/i,
    /more to (?:enjoy|get|unlock|qualify for) free shipping|away from free shipping/i,
  ];
  for(const row of candidates){
    const text=[row.title,row.answer].filter(Boolean).join(' ').trim();
    for(const pattern of bad){
      assert.ok(!pattern.test(text),site.name+' junk leaked: '+text.slice(0,240));
    }
  }
}

function assertContains(site,text,label,pattern){
  assert.match(text,pattern,site.name+' missing '+label);
}

async function ask(site,rows,{lang,message,expect,history=[],label}){
  const result=await generateGroundedAnswer({
    companyName:site.name,
    rows,
    message,
    history,
    lang,
  });
  assert.equal(result.handoff,false,site.name+' '+label+' handed off: '+JSON.stringify(result));
  assert.ok(String(result.answer||'').trim(),site.name+' '+label+' empty answer');
  if(expect) assert.match(String(result.answer||''),expect,site.name+' '+label+' wrong answer: '+result.answer);
  return result;
}

function isTransientLiveAuditFetchError(error){
  const message=String(error?.message||error||'');
  return /Verkkosivua ei saatu luettua|fetch failed|timed? ?out|timeout|ECONNRESET|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|socket hang up|\b(?:429|502|503|504)\b/i.test(message);
}

async function fetchBundleWithRetry(site){
  let lastError=null;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      return await fetchWebsiteBundle(site.url,site.maxPages||55,site.budget||30000,null,{
        storefrontLimit:site.storefrontLimit||200,
        storefrontBudgetMs:site.storefrontBudgetMs||5000,
        sitemapLimit:site.sitemapLimit||1000,
      });
    }catch(error){
      lastError=error;
      console.warn('LIVE_AUDIT_RETRY '+site.name+' attempt '+attempt+': '+(error?.message||error));
      if(attempt<3) await new Promise(resolve=>setTimeout(resolve,1500*attempt));
    }
  }
  if(isTransientLiveAuditFetchError(lastError)){
    console.warn('LIVE_AUDIT_SKIP '+site.name+': third-party site remained temporarily unavailable after retries.');
    return null;
  }
  throw lastError || new Error('Live audit crawl failed.');
}

async function auditServiceSite(site){
  const bundle=await fetchBundleWithRetry(site);
  if(!bundle) return {site,skipped:true,bundle:null,candidates:[],profile:null,rows:[]};
  const candidates=websiteKnowledgeCandidates(bundle);
  const profile=extractFreeWebsiteProfile(bundle);
  const rows=rowsFromCandidates(candidates);
  const text=candidateText(candidates);

  assert.ok(bundle.pages.length>=1,site.name+' scanned no pages');
  assert.ok(candidates.length>=site.minFacts,site.name+' too few facts: '+candidates.length);
  assertNoJunk(site,candidates);
  for(const [label,pattern] of site.mustContain) assertContains(site,text,label,pattern);

  console.log('\n=== '+site.name+' ===');
  console.log('pages='+bundle.pages.length+' facts='+candidates.length+' products='+(bundle.products?.length||0));
  console.log('profile='+JSON.stringify(profile));

  for(const scenario of site.questions){
    const first=await ask(site,rows,scenario);
    console.log('Q ['+scenario.lang+'] '+scenario.message+' -> '+first.answer);
    if(scenario.followups){
      let history=[{question:scenario.message,answer:first.answer}];
      for(const follow of scenario.followups){
        const next=await ask(site,rows,{...follow,history});
        console.log('F ['+follow.lang+'] '+follow.message+' -> '+next.answer);
        history=[...history,{question:follow.message,answer:next.answer}].slice(-6);
      }
    }
  }

  return {site,skipped:false,bundle,candidates,profile,rows};
}

const serviceSites=[
  {
    name:'M Room Maariankatu',
    url:'https://mroom.com/fi/parturit/turku/maariankatu/',
    minFacts:5,
    mustContain:[
      ['address',/Maariankatu\s*3/i],
      ['city',/20100\s+Turku/i],
      ['phone',/050\s*331\s*4579/i],
      ['email',/turku@mroom\.fi/i],
      ['hours',/(?:ma|mon).*11[:.]00\s*[-–]\s*19[:.]00/i],
      ['haircut service',/(?:hiustenleikka|M\s*Cut)/i],
      ['haircut price',/36\s*€/i],
    ],
    questions:[
      {label:'address-fi',lang:'fi',message:'Missä te sijaitsette?',expect:/Maariankatu\s*3|20100\s+Turku/i},
      {label:'address-en',lang:'en',message:'What is your address?',expect:/Maariankatu\s*3|20100\s+Turku/i},
      {label:'address-sv',lang:'sv',message:'Var finns ni?',expect:/Maariankatu\s*3|20100\s+Turku/i},
      {label:'phone-fi',lang:'fi',message:'Mikä teidän puhelinnumero on?',expect:/050\s*331\s*4579/i},
      {label:'phone-en',lang:'en',message:'What phone number can I call?',expect:/050\s*331\s*4579/i},
      {label:'phone-sv',lang:'sv',message:'Vilket telefonnummer kan jag ringa?',expect:/050\s*331\s*4579/i},
      {label:'email-fi',lang:'fi',message:'Mihin sähköpostiin voin laittaa viestiä?',expect:/turku@mroom\.fi/i},
      {label:'email-en',lang:'en',message:'What is your email address?',expect:/turku@mroom\.fi/i},
      {label:'email-sv',lang:'sv',message:'Vad är er e-postadress?',expect:/turku@mroom\.fi/i},
      {label:'hours-fi',lang:'fi',message:'Mihin aikaan olette auki maanantaina?',expect:/11[:.]00|19[:.]00/i},
      {label:'hours-en',lang:'en',message:'What are your opening hours on Monday?',expect:/11[:.]00|19[:.]00/i},
      {label:'hours-sv',lang:'sv',message:'Vilka öppettider har ni på måndag?',expect:/11[:.]00|19[:.]00/i},
      {label:'service-followup-fi',lang:'fi',message:'Leikkaatteko hiuksia?',expect:/hius|leikka|M Cut/i,followups:[
        {label:'price-followup-fi',lang:'fi',message:'Paljonko se maksaa?',expect:/36\s*€/i},
      ]},
      {label:'service-followup-en',lang:'en',message:'Do you cut hair?',expect:/hair|cut|M Cut/i,followups:[
        {label:'price-followup-en',lang:'en',message:'How much does that cost?',expect:/36\s*€/i},
      ]},
      {label:'service-followup-sv',lang:'sv',message:'Klipper ni hår?',expect:/hår|klipp|M Cut/i,followups:[
        {label:'price-followup-sv',lang:'sv',message:'Vad kostar det?',expect:/36\s*€/i},
      ]},
    ],
  },
  {
    name:'Turkish Barber Shop',
    url:'https://www.turkishbarber.fi/',
    minFacts:6,
    mustContain:[
      ['address',/Hallituskatu\s*11/i],
      ['city',/33200\s+Tampere/i],
      ['phone',/\+358\s*50\s*577\s*4490/i],
      ['email',/info@turkishbarber\.fi/i],
      ['hours',/09[:.]00\s*[-–]\s*19[:.]00/i],
      ['haircut',/HIUSTEN\s+LEIKKAUS/i],
      ['haircut price',/(?:€\s*25|25\s*€)/i],
    ],
    questions:[
      {label:'address-fi',lang:'fi',message:'Mikä teidän osoite on?',expect:/Hallituskatu\s*11|33200\s+Tampere/i},
      {label:'address-en',lang:'en',message:'Where exactly are you located?',expect:/Hallituskatu\s*11|33200\s+Tampere/i},
      {label:'address-sv',lang:'sv',message:'Vad har ni för adress?',expect:/Hallituskatu\s*11|33200\s+Tampere/i},
      {label:'contact-fi',lang:'fi',message:'Miten saan teihin yhteyden?',expect:/577\s*4490|info@turkishbarber\.fi/i},
      {label:'contact-en',lang:'en',message:'How can I contact you?',expect:/577\s*4490|info@turkishbarber\.fi/i},
      {label:'contact-sv',lang:'sv',message:'Hur kontaktar jag er?',expect:/577\s*4490|info@turkishbarber\.fi/i},
      {label:'hours-fi',lang:'fi',message:'Oletteko auki lauantaina?',expect:/09[:.]00|17[:.]00/i},
      {label:'hours-en',lang:'en',message:'Are you open on Saturday?',expect:/09[:.]00|17[:.]00/i},
      {label:'hours-sv',lang:'sv',message:'Har ni öppet på lördag?',expect:/09[:.]00|17[:.]00/i},
      {label:'haircut-fi',lang:'fi',message:'Teettekö tavallista hiustenleikkausta?',expect:/hiusten\s+leikkaus|leikka/i,followups:[
        {label:'haircut-price-fi',lang:'fi',message:'Paljonko se maksaa?',expect:/25\s*€|€\s*25/i},
      ]},
      {label:'haircut-en',lang:'en',message:'Do you offer a normal haircut?',expect:/hair|cut/i,followups:[
        {label:'haircut-price-en',lang:'en',message:'And how much is it?',expect:/25\s*€|€\s*25/i},
      ]},
      {label:'haircut-sv',lang:'sv',message:'Har ni vanlig hårklippning?',expect:/hår|klipp/i,followups:[
        {label:'haircut-price-sv',lang:'sv',message:'Och vad kostar den?',expect:/25\s*€|€\s*25/i},
      ]},
    ],
  },
  {
    name:'Miesten Parturi Turku',
    url:'https://www.miestenparturiturku.fi/',
    minFacts:4,
    mustContain:[
      ['phone',/050\s*325\s*4690/i],
      ['email',/miestenparturiturku@gmail\.com/i],
      ['hours',/Ma\s*8[.:]20\s*[-–]\s*16[.:]40/i],
      ['haircut',/Hiustenleikkaus/i],
      ['haircut price',/31\s*€/i],
    ],
    questions:[
      {label:'phone-fi',lang:'fi',message:'Mikä numero teillä on?',expect:/050\s*325\s*4690/i},
      {label:'phone-en',lang:'en',message:'What is your phone number?',expect:/050\s*325\s*4690/i},
      {label:'phone-sv',lang:'sv',message:'Vad är ert telefonnummer?',expect:/050\s*325\s*4690/i},
      {label:'hours-fi',lang:'fi',message:'Milloin olette auki maanantaina?',expect:/8[.:]20|16[.:]40/i},
      {label:'hours-en',lang:'en',message:'When are you open on Monday?',expect:/8[.:]20|16[.:]40/i},
      {label:'hours-sv',lang:'sv',message:'När har ni öppet på måndag?',expect:/8[.:]20|16[.:]40/i},
      {label:'cut-fi',lang:'fi',message:'Paljonko hiustenleikkaus maksaa?',expect:/31\s*€/i},
      {label:'cut-en',lang:'en',message:'How much is a haircut?',expect:/31\s*€/i},
      {label:'cut-sv',lang:'sv',message:'Vad kostar en hårklippning?',expect:/31\s*€/i},
    ],
  },
];

const ecommerceSites=[
  {
    name:'JAG Putters',
    url:'https://jagputters.fi/',
    maxPages:55,
    budget:35000,
    storefrontLimit:500,
    minFacts:12,
    mustContain:[
      ['product',/JAG Satin (?:Black|Bronze|Steel)/i],
      ['product price',/199(?:[.,]00)?\s*(?:EUR|€)/i],
      ['shipping threshold',/free shipping.{0,80}280\s*€/i],
      ['delivery time',/3\s*[-–]\s*5\s+business days|3\s*[-–]\s*6\s+days/i],
      ['returns',/return within\s+45\s+days|45\s+days/i],
      ['location',/Turku,\s*Finland/i],
    ],
    questions:[
      {label:'products-fi',lang:'fi',message:'Mitä puttereita teillä on myynnissä?',expect:/JAG|putter/i},
      {label:'products-en',lang:'en',message:'Which putters do you sell?',expect:/JAG|putter/i},
      {label:'products-sv',lang:'sv',message:'Vilka putters säljer ni?',expect:/JAG|putter/i},
      {label:'black-price-fi',lang:'fi',message:'Paljonko JAG Satin Black maksaa?',expect:/199/},
      {label:'black-price-en',lang:'en',message:'How much is the JAG Satin Black putter?',expect:/199/},
      {label:'black-price-sv',lang:'sv',message:'Vad kostar JAG Satin Black-puttern?',expect:/199/},
      {label:'shipping-cost-fi',lang:'fi',message:'Paljonko toimitus maksaa?',expect:/280|ilmain|free/i},
      {label:'shipping-cost-en',lang:'en',message:'How much does shipping cost?',expect:/280|free/i},
      {label:'shipping-cost-sv',lang:'sv',message:'Vad kostar frakten?',expect:/280|gratis|free/i},
      {label:'delivery-fi',lang:'fi',message:'Kuinka kauan toimituksessa kestää?',expect:/3\s*[-–]\s*(?:5|6)|2\s*[-–]\s*6/i},
      {label:'delivery-en',lang:'en',message:'How long does delivery take?',expect:/3\s*[-–]\s*(?:5|6)|2\s*[-–]\s*6/i},
      {label:'delivery-sv',lang:'sv',message:'Hur lång är leveranstiden?',expect:/3\s*[-–]\s*(?:5|6)|2\s*[-–]\s*6/i},
      {label:'returns-fi',lang:'fi',message:'Voinko palauttaa tuotteen?',expect:/45/},
      {label:'returns-en',lang:'en',message:'Can I return an item?',expect:/45/},
      {label:'returns-sv',lang:'sv',message:'Kan jag returnera en produkt?',expect:/45/},
      {label:'location-fi',lang:'fi',message:'Missä yritys sijaitsee?',expect:/Turku|Finland|Suom/i},
      {label:'location-en',lang:'en',message:'Where are you based?',expect:/Turku|Finland/i},
      {label:'location-sv',lang:'sv',message:'Var finns företaget?',expect:/Turku|Finland|Finland/i},
      {label:'followup-fi',lang:'fi',message:'Paljonko musta putteri maksaa?',expect:/199/,followups:[
        {label:'followup-bronze-fi',lang:'fi',message:'Entä pronssinen?',expect:/199/},
      ]},
      {label:'followup-en',lang:'en',message:'How much is the black putter?',expect:/199/,followups:[
        {label:'followup-bronze-en',lang:'en',message:'What about the bronze one?',expect:/199/},
      ]},
      {label:'followup-sv',lang:'sv',message:'Vad kostar den svarta puttern?',expect:/199/,followups:[
        {label:'followup-bronze-sv',lang:'sv',message:'Och den bronsfärgade?',expect:/199/},
      ]},
    ],
  },
  {
    name:'Dick Johnson',
    url:'https://dickjohnson.fi/',
    maxPages:70,
    budget:40000,
    storefrontLimit:1200,
    storefrontBudgetMs:18000,
    minFacts:20,
    mustContain:[
      ['t-shirt product',/T-paita MIDHEAVY 230g/i],
      ['t-shirt price',/24[.,]90\s*(?:EUR|€)/i],
      ['shipping price',/(?:4[.,]80|4[.,]90)\s*€/i],
      ['delivery time',/2\s*[-–]\s*5\s+arkipäivää|2\s*[-–]\s*5\s+business days/i],
      ['returns',/100\s+päivän\s+palautusoikeus|100\s+days/i],
      ['product color option',/SUTITELINE Plastic[\s\S]{0,900}(?:Black|Ivory|Transparent)/i],
    ],
    questions:[
      {label:'shirt-price-fi',lang:'fi',message:'Paljonko T-paita MIDHEAVY 230g maksaa?',expect:/24[.,]90|24\.9/},
      {label:'shirt-price-en',lang:'en',message:'How much is the MIDHEAVY 230g T-shirt?',expect:/24[.,]90|24\.9/},
      {label:'shirt-price-sv',lang:'sv',message:'Vad kostar MIDHEAVY 230g t-shirten?',expect:/24[.,]90|24\.9/},
      {label:'shirt-sizes-fi',lang:'fi',message:'Mitä kokoja MIDHEAVY 230g paidasta on?',expect:/\bS\b|\bM\b|XL|2XL|3XL/i},
      {label:'shirt-sizes-en',lang:'en',message:'What sizes does the MIDHEAVY 230g T-shirt come in?',expect:/\bS\b|\bM\b|XL|2XL|3XL/i},
      {label:'shirt-sizes-sv',lang:'sv',message:'Vilka storlekar finns MIDHEAVY 230g t-shirten i?',expect:/\bS\b|\bM\b|XL|2XL|3XL/i},
      {label:'color-fi',lang:'fi',message:'Mitä värejä SUTITELINE Plasticista on?',expect:/Black|Ivory|Transparent|musta|läpinäky/i},
      {label:'color-en',lang:'en',message:'What colors are available for SUTITELINE Plastic?',expect:/Black|Ivory|Transparent/i},
      {label:'color-sv',lang:'sv',message:'Vilka färger finns SUTITELINE Plastic i?',expect:/Black|Ivory|Transparent|svart/i},
      {label:'shipping-fi',lang:'fi',message:'Mitä toimitus maksaa?',expect:/4[.,]80|4[.,]90|6[.,]90|9[.,]90/},
      {label:'shipping-en',lang:'en',message:'What are your shipping prices?',expect:/4[.,]80|4[.,]90|6[.,]90|9[.,]90/},
      {label:'shipping-sv',lang:'sv',message:'Vad kostar leveransen?',expect:/4[.,]80|4[.,]90|6[.,]90|9[.,]90/},
      {label:'delivery-fi',lang:'fi',message:'Kauanko toimitus kestää?',expect:/2\s*[-–]\s*5/},
      {label:'delivery-en',lang:'en',message:'How long does shipping take?',expect:/2\s*[-–]\s*5/},
      {label:'delivery-sv',lang:'sv',message:'Hur lång tid tar leveransen?',expect:/2\s*[-–]\s*5/},
      {label:'return-fi',lang:'fi',message:'Millainen palautusoikeus teillä on?',expect:/100/},
      {label:'return-en',lang:'en',message:'What is your return policy?',expect:/100/},
      {label:'return-sv',lang:'sv',message:'Hur fungerar er returpolicy?',expect:/100/},
      {label:'contact-fi',lang:'fi',message:'Mikä asiakaspalvelun sähköposti on?',expect:/asiakas@dick\.fi/i},
      {label:'contact-en',lang:'en',message:'What is the customer service email?',expect:/asiakas@dick\.fi/i},
      {label:'contact-sv',lang:'sv',message:'Vilken e-postadress har kundtjänsten?',expect:/asiakas@dick\.fi/i},
    ],
  },
];

const auditResults=[];
for(const site of serviceSites){
  auditResults.push({...await auditServiceSite(site),kind:'service'});
}
for(const site of ecommerceSites){
  auditResults.push({...await auditServiceSite(site),kind:'ecommerce'});
}

const completed=auditResults.filter((result)=>!result.skipped);
const skipped=auditResults.filter((result)=>result.skipped);
const completedServices=completed.filter((result)=>result.kind==='service').length;
const completedEcommerce=completed.filter((result)=>result.kind==='ecommerce').length;

assert.ok(completed.length>=4,'Live importer audit completed too few companies: '+completed.length);
assert.ok(completedServices>=2,'Live importer audit completed too few service companies: '+completedServices);
assert.ok(completedEcommerce>=1,'Live importer audit completed no ecommerce company');
if(skipped.length){
  console.warn('LIVE_AUDIT_SKIPPED_COMPANIES: '+skipped.map((result)=>result.site.name).join(', '));
}

console.log('\nLIVE IMPORTER AUDIT PASSED: '+completed.length+' companies ('+completedServices+' service, '+completedEcommerce+' ecommerce), FI/SV/EN questions and follow-ups; transient third-party skips='+skipped.length+'.');
