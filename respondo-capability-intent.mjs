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
  const subject='(?:respondo(?: ai)?|botti|chatbotti|tekoaly(?:botti)?|se|tama|palvelu|tekoalyasiakaspalvelija)';
  const fi=new RegExp('\\bmita\\s+(?:kaikkea\\s+)?(?:'+subject+'\\s+)?(?:osaa|tekee|voi\\s+tehda|pystyy\\s+tekemaan)\\b');
  const fiWhatFor=new RegExp('\\bmihin\\s+(?:'+subject+')\\s+(?:pystyy|kykenee|soveltuu)\\b');
  const fiHelp=new RegExp('\\bmiten\\s+(?:'+subject+')\\s+(?:voi\\s+auttaa|auttaa\\s+yritysta)\\b');
  const en=/\bwhat\s+(?:(?:all|exactly)\s+)?(?:can|does)\s+(?:respondo(?: ai)?|this\s+bot|the\s+bot|this\s+chatbot|it)\s+(?:do|help\s+with|handle)\b|\bwhat\s+(?:is|are)\s+respondo(?: ai)?\s+(?:capable\s+of|used\s+for)\b/;
  const sv=/\bvad\s+(?:kan|gor|g[o]r)\s+(?:respondo(?: ai)?|botten|den)\b|\bvad\s+klarar\s+(?:respondo(?: ai)?|botten|den)\s+av\b|\bvad\s+(?:ar|är)\s+respondo(?: ai)?\s+kapabel\s+att\s+gora\b/;
  return fi.test(q)||fiWhatFor.test(q)||fiHelp.test(q)||en.test(q)||sv.test(q);
}
