// Only explicit business language support may ground a reply. A catalog row
// that happens to mention the business name or a language is insufficient.
const normalize = value => String(value ?? '').normalize('NFD').replace(/\p{M}/gu,'')
  .toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();

const question = /\b(?:milla kielilla|mita kielia|mitka kielet|vilka sprak|vilket sprak|what languages|which languages)\b/;
const unrelated = /\b(?:ohjelmointi\w*|programming|programmerings\w*|keyboard|tangentbord|nappaimisto)\b/;
const support = /\b(?:kielilla|kielituki|tuetut kielet|kolme kielta|asiakaspalvelun kielet|sprakstod|tre sprak|stodda sprak|kundservice pa|three languages|supported languages|language support|palvelemme|betjanar pa|customer service in|in one service)\b/;
const negative = /\b(?:ei tueta|ei tue|ei saatavilla|tukea ei|not supported|does not support|not available|no support for|stods inte|stoder inte|inte tillganglig)\b/;

const languages = [
  {pattern:/\b(?:suomi|suomeksi|suomen|suomea|finska|finnish)\b/, names:{fi:'suomeksi',sv:'finska',en:'Finnish'}},
  {pattern:/\b(?:ruotsi|ruotsiksi|ruotsin|ruotsia|svenska|swedish)\b/, names:{fi:'ruotsiksi',sv:'svenska',en:'Swedish'}},
  {pattern:/\b(?:englanti|englanniksi|englannin|englantia|engelska|english)\b/, names:{fi:'englanniksi',sv:'engelska',en:'English'}},
];

export function groundedSupportedServiceLanguages(rows, message, lang) {
  const normalized = normalize(message);
  if (!question.test(normalized) || unrelated.test(normalized)) return null;

  const positive = new Map();
  const contradicted = new Set();
  for (const row of rows || []) {
    if (row?.approved === false || !row?.answer) continue;
    const answer = normalize(row.answer);
    const label = normalize(row.title);
    const context = label + ' ' + answer;
    if (!support.test(context)) continue;
    for (const language of languages) {
      if (!language.pattern.test(answer)) continue;
      if (negative.test(context)) contradicted.add(language);
      else if (!positive.has(language)) positive.set(language,row);
    }
  }
  const verified = languages.filter(language => positive.has(language) && !contradicted.has(language));
  const evidence = [...new Set(verified.map(language => positive.get(language)))];
  if (!verified.length) {
    return {answer:'',handoff:true,confidence:.2,intent:'Palvelukielet',sourceIds:[],selected:[]};
  }

  const locale = ['fi','sv','en'].includes(lang) ? lang : 'fi';
  const names = verified.map(language => language.names[locale]);
  const separator = {fi:' ja ',sv:' och ',en:' and '}[locale];
  const list = names.length === 1 ? names[0] : names.slice(0,-1).join(', ') + separator + names.at(-1);
  const answer = {
    fi:'Voin vahvistaa, että palvelua saa ' + list + '.',
    sv:'Jag kan bekräfta att tjänsten finns på ' + list + '.',
    en:'I can confirm the service is available in ' + list + '.',
  }[locale];
  return {answer,handoff:false,confidence:.95,intent:'Palvelukielet',
    sourceIds:evidence.map(row=>row.id).filter(Boolean),selected:evidence};
}
