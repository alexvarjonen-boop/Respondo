// First-party service voice for the Mainio tenant only.
// The caller enforces tenant identity and verified knowledge. This module only
// changes grammatical perspective: never availability, price or business facts.
const sentenceCase=(text,index,input)=>{
  const before=input.slice(0,index).trimEnd();
  return !before || /[.!?]$/.test(before)
    ? text[0].toUpperCase()+text.slice(1)
    : text[0].toLowerCase()+text.slice(1);
};
export function mainioCustomerVoice(value,lang='fi'){
  let answer=String(value||'');
  if(lang==='fi'){
    // Approved public source extracts often speak about Mainio in third
    // person. Switch only established ownership phrases; preserve numeric
    // amounts, dates, conditions and the source's affirmative/negative meaning.
    // Coordinate two verbs when first-party voice replaces the subject:
    // “Mainio tarkistaa pyynnön ja vahvistaa” -> “Tarkistamme ... ja vahvistamme”.
    answer=answer.replace(/\bMainio(?: Muuttopalvelu)?\s+tarkistaa\b([^.!?]{0,160}?)\b(ja|sekä)\s+vahvistaa\b/gi,
      (_all,middle,conjunction,index,input)=>
        sentenceCase('tarkistamme'+middle+conjunction+' vahvistamme',index,input));
    answer=answer
      .replace(/Mainion muuttolaatikoiden hinnasto:/gi,'Muuttolaatikoidemme hinnasto:')
      .replace(/Mainion muuttolaatikoiden (?:koko|mitat)/gi,'Muuttolaatikoidemme koko')
      .replace(/Mainion muuttolaatikoiden kuljetus/gi,'Muuttolaatikoidemme kuljetus')
      .replace(/Mainion suomenkielisen pakettiautosivun hinnasto:/gi,'Pakettiautojemme hinnasto:')
      .replace(/Mainion vuokra-autojen /gi,'Vuokra-autojemme ')
      .replace(/Mainion UKK:n mukaan /gi,'Ohjeidemme mukaan ')
      .replace(/Mainion FAQ:n mukaan /gi,'Ohjeidemme mukaan ')
      .replace(/Mainion kierrätyspalvelussa /gi,'Kierrätyspalvelussamme ')
      .replace(/Mainion verkkosivujen /gi,'Verkkosivujemme ')
      .replace(/Mainion verkkosivujen mukaan /gi,'Verkkosivujemme mukaan ');
    const words={tarjoaa:'tarjoamme',tekee:'teemme',palvelee:'palvelemme',
      hoitaa:'hoidamme',vuokraa:'vuokraamme',järjestää:'järjestämme',
      vahvistaa:'vahvistamme',tarkistaa:'tarkistamme',
      asentaa:'asennamme',sijaitsee:'sijaitsemme',
      toimii:'toimimme',voi:'voimme'};
    answer=answer.replace(/\bMainio(?: Muuttopalvelu(?: Oy)?)?\s+(tarjoaa|tekee|palvelee|hoitaa|vuokraa|järjestää|vahvistaa|tarkistaa|asentaa|sijaitsee|toimii|voi)\b/gi,
      (_match,verb,index,input)=>sentenceCase(words[verb.toLowerCase()],index,input));
    answer=answer.replace(/\bMainion palveluihin kuuluvat\b/gi,
      (_match,index,input)=>sentenceCase('palveluihimme kuuluvat',index,input));
    answer=answer.replace(/\bMainion verkkosivuilla\b/gi,
      (_match,index,input)=>sentenceCase('verkkosivuillamme',index,input));
  }else if(lang==='sv'){
    const words={erbjuder:'vi erbjuder',utför:'vi utför',ordnar:'vi ordnar',
      bekräftar:'vi bekräftar',kan:'vi kan'};
    answer=answer.replace(/\bMainio(?: Muuttopalvelu)?\s+(erbjuder|utför|ordnar|bekräftar|kan)\b/gi,
      (_match,verb,index,input)=>sentenceCase(words[verb.toLowerCase()],index,input));
  }else if(lang==='en'){
    const words={offers:'we offer',provides:'we provide',handles:'we handle',
      serves:'we serve',confirms:'we confirm',reviews:'we review',
      can:'we can',must:'we must'};
    answer=answer.replace(/\bMainio(?: Muuttopalvelu)?\s+(offers|provides|handles|serves|confirms|reviews|can|must)\b/gi,
      (_match,verb,index,input)=>sentenceCase(words[verb.toLowerCase()],index,input));
  }
  return answer;
}

// Only use the localized summary when this exact nationwide coverage is
// present in Mainio's approved source. Never extrapolate from a home address.
export function mainioServiceAreaVoice(value,lang='fi'){
  const normalized=String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/\s+/g,' ');
  if(normalized.includes('muualle suomeen') &&
     normalized.includes('varsinais-suomessa')){
    return lang==='en'
      ? 'We serve Turku and Southwest Finland, and we can also discuss moves elsewhere in Finland. We confirm the exact route separately.'
      :lang==='sv'
        ? 'Vi betjänar Åbo och Egentliga Finland, och flyttar kan även ordnas till andra delar av Finland. Vi bekräftar den exakta rutten separat.'
        : 'Palvelemme Turussa ja Varsinais-Suomessa, ja muuttoja voidaan sopia myös muualle Suomeen. Sovimme tarkan reitin erikseen.';
  }
  return mainioCustomerVoice(value,lang);
}
