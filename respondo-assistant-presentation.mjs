// Safe, first-party-only presentation for verified Respondo answers.
// Never infer a price, feature, or promise from the visitor's question.
const locales=['fi','sv','en'];
const localeOf=value=>locales.includes(String(value||'').toLowerCase())?String(value).toLowerCase():'fi';
const t=(lang,fi,sv,en)=>lang==='sv'?sv:lang==='en'?en:fi;
const normalize=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const priceIds=new Set([
  'respondo-faq-pricing','respondo-faq-cheapest-pricing','respondo-faq-monthly-pricing',
  'respondo-faq-annual-pricing','respondo-faq-basic','respondo-faq-advanced',
  'respondo-faq-business'
]);
const priceTopics=/(?:paljonko|hinta|hinnat|hinnoittel|maksaa|price|pricing|cost|cheapest|monthly|annual|priser|pris|kostar|abonnemang)/;
const setupTopics=/(?:upot|asenn|kayttoon|toimi|website|embed|install|onboard|setup|integrat|webbplats|installera|hur fungerar)/;
const languageTopics=/(?:kiel|suome|ruots|englann|language|swedish|finnish|english|sprak|språk|svenska|finska)/;
const demoTopics=/(?:kokeil|demo|testaa|testa|try|trial|prova)/;
const securityTopics=/(?:tietoturv|gdpr|security|privacy|secure|sakerhet|säkerhet|dataskydd)/;
const questionSets={
  fi:{
    pricing:['Mitä Respondo AI:n tilaukseen sisältyy?','Miten 3 päivän kokeilu toimii?','Miten Respondo otetaan käyttöön?'],
    setup:['Miten saan asennuskoodin?','Voinko kokeilla bottia ensin?','Mitä Respondo maksaa?'],
    language:['Voiko botti vaihtaa kieltä kesken keskustelun?','Miten botti lisätään sivustolle?','Voinko kokeilla bottia?'],
    demo:['Miten saan botin omalle sivustolle?','Mitä Respondo maksaa?','Miten Respondo vastaa kysymyksiin?'],
    security:['Miten Respondo käsittelee asiakastietoja?','Miten botti välttää virheellisiä vastauksia?','Mistä löydän tietosuojaselosteen?'],
    general:['Mitä Respondo maksaa?','Miten botti toimii?','Voinko kokeilla bottia?'],
    uncertain:['Voitko kertoa vaihtoehdoista?','Mistä löydän yhteystiedot?']
  },
  sv:{
    pricing:['Vad ingår i Respondo AI?','Hur fungerar den kostnadsfria provperioden?','Hur kommer jag igång med Respondo?'],
    setup:['Var hittar jag installationskoden?','Kan jag testa botten först?','Vad kostar Respondo?'],
    language:['Kan botten byta språk mitt i samtalet?','Hur lägger jag botten på min webbplats?','Kan jag prova botten?'],
    demo:['Hur installerar jag botten på min webbplats?','Vad kostar Respondo?','Hur svarar Respondo på frågor?'],
    security:['Hur hanterar Respondo kunduppgifter?','Hur undviker botten osäkra svar?','Var finns integritetspolicyn?'],
    general:['Vad kostar Respondo?','Hur fungerar botten?','Kan jag testa botten?'],
    uncertain:['Kan du visa alternativen?','Var hittar jag kontaktuppgifterna?']
  },
  en:{
    pricing:['What is included in Respondo AI?','How does the 3-day trial work?','How do I set up Respondo?'],
    setup:['Where do I find the installation code?','Can I try the bot first?','How much does Respondo cost?'],
    language:['Can the bot switch languages mid-conversation?','How do I embed the bot on my website?','Can I try the bot?'],
    demo:['How do I embed the bot on my website?','How much does Respondo cost?','How does Respondo answer questions?'],
    security:['How does Respondo handle customer information?','How does the bot avoid unreliable answers?','Where is the privacy policy?'],
    general:['How much does Respondo cost?','How does the bot work?','Can I try the bot?'],
    uncertain:['Can you explain the available options?','Where can I find contact details?']
  }
};
function topicFor(message,faqId=''){
  const q=normalize(message+' '+faqId);
  if(priceIds.has(faqId)||priceTopics.test(q))return 'pricing';
  if(setupTopics.test(q))return 'setup';
  if(languageTopics.test(q))return 'language';
  if(securityTopics.test(q))return 'security';
  if(demoTopics.test(q))return 'demo';
  return 'general';
}
export function respondoAssistantPresentation({question='',language='fi',answer='',verified=false,faqId='',handoff=false}={}){
  const lang=localeOf(language);
  const topic=topicFor(question,faqId);
  const suggestions=(handoff||!verified?questionSets[lang].uncertain:questionSets[lang][topic])
    .filter(text=>normalize(text)!==normalize(question)).slice(0,3);
  // A single subscription needs no plan comparison cards.
  const cards=null;
  return {language:lang,topic,cards,suggestions};
}
