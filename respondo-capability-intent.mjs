// Recognize broad "what can Respondo do?" requests before knowledge retrieval.
// Bounded to product capabilities: a language-specific or price-specific FAQ
// must not incorrectly replace a requested product overview.
const normalize = text => String(text||'').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-z0-9\s-]/g,' ')
  .replace(/\s+/g,' ').trim();
export function isRespondoCapabilityQuestion(value){
  const q=normalize(value);
  if(!q)return false;
  const subject='(?:respondo(?: ai)?|tama\\s+botti|botti|chatbotti|tekoaly(?:botti)?|se|tama|palvelu|tekoalyasiakaspalvelija)';
  const fi=new RegExp('\\bmita\\s+(?:kaikkea\\s+)?(?:'+subject+'\\s+)?(?:osaa|tekee|voi\\s+tehda|pystyy\\s+tekemaan)\\b');
  const fiWhatFor=new RegExp('\\bmihin\\s+(?:'+subject+')\\s+(?:pystyy|kykenee|soveltuu)\\b');
  const fiHelp=new RegExp('\\bmiten\\s+(?:'+subject+')\\s+(?:voi\\s+auttaa|auttaa\\s+yritysta)\\b');
  const en=/\bwhat\s+(?:(?:all|exactly)\s+)?(?:can|does)\s+(?:respondo(?: ai)?|this\s+bot|the\s+bot|this\s+chatbot|it)\s+(?:do|help\s+with|handle)\b|\bwhat\s+(?:is|are)\s+respondo(?: ai)?\s+(?:capable\s+of|used\s+for)\b/;
  const sv=/\bvad\s+(?:kan|gor|g[o]r)\s+(?:respondo(?: ai)?|botten|den)\b|\bvad\s+klarar\s+(?:respondo(?: ai)?|botten|den)\s+av\b|\bvad\s+(?:ar|är)\s+respondo(?: ai)?\s+kapabel\s+att\s+gora\b/;
  return fi.test(q)||fiWhatFor.test(q)||fiHelp.test(q)||en.test(q)||sv.test(q);
}

/**
 * A business owner asks what their WEBSITE VISITORS can actually achieve.
 * This is distinct from technical import/crawler questions. Only the
 * first-party Respondo FAQ uses this signal; it is not a general tenant rule.
 */
export function isRespondoCustomerValueQuestion(value){
  const q=normalize(value);
  if(!q)return false;
  if(/\b(?:import\w*|crawl\w*|scrap\w*|scan\w*|skann\w*|indeks\w*|tuonti|tietojen\s+tuonti|hae\s+tiedot|hamta\s+information)\b/.test(q))return false;
  const subject=/(?:\b(?:respondo\w*(?: ai)?|chatbot\w*|bot\w*|assistant\w*|botti\w*|chatbotti\w*|tekoaly\w*|assistent\w*|se|it|den|botten)\b)/.test(q);
  const audience=/\b(?:customers?\b|clients?\b|visitors?\b|shoppers?\b|customer\s+service\b|customer\s+support\b|asiakk\w*|kavij\w*|sivukavij\w*|kund\w*|besok\w*|kundtjanst\w*)\b/.test(q);
  if(!subject||!audience)return false;
  const asks=/\b(?:how|what|why|miten|kuinka|mita|mika|mill[a]?|hur|vad|varfor)\b/.test(q);
  const benefits=/\b(?:help\w*|assist\w*|benefit\w*|support\w*|answer\w*|do\b|work\b|improv\w*|achiev\w*|autta\w*|vastaa\w*|palvel\w*|hyoty\w*|hyody\w*|tehd\w*|teke\w*|saa\w*|voi\b|pysty\w*|hjalp\w*|besvar\w*|nytta\w*|gora\b|g[o]r\b|kan\b)\b/.test(q);
  return asks&&benefits;
}
