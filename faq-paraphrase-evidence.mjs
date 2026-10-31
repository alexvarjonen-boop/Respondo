// High-precision multilingual paraphrase matching for approved FAQ questions.
// This is deliberately NOT a language model and never supplies answer facts.
// Only same-topic FAQ titles can provide evidence. A conservative null match
// is preferable to claiming a policy belonging to a different context.
const normalize = value => String(value||'').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const has=(value,pattern)=>pattern.test(' '+normalize(value)+' ');

// Canonical intents, including common FI/SV/EN visitor paraphrases. A pair
// needs BOTH a distinctive subject and a matching action, not "can / can I".
const families=[
  {
    key:'pets',
    subject:/\b(?:pets?|dogs?|cats?|animals?|koir\w*|kiss\w*|lemmik\w*|elain\w*|husdjur\w*|hund\w*|katt\w*|djur\w*)\b/,
    action:/\b(?:allow\w*|permit\w*|bring|take|enter|admit\w*|welcom\w*|visit\w*|saako|voiko|sall\w*|tuoda|ottaa|paase\w*|tulla|faar|far|ta|med|tillate\w*|tillata\w*|valkom\w*)\b/,
    qualifier:[
      ['inside',/\b(?:inside|indoors?|indoor|sisalle|sisalla|sisatilo\w*|sisaan|inomhus|inne)\b/],
      ['outside',/\b(?:outside|outdoors?|terrace|garden|ulkona|ulkotilo\w*|terass\w*|utomhus|ute|terrass\w*)\b/]
    ]
  },{
    key:'parking',
    subject:/\b(?:parking|parkingplace|carpark|pysakoi\w*|parkk\w*|bilparkering\w*|parkering\w*)\b/,
    action:/\b(?:availab\w*|where|is|there|have|can|do|free|cost|located|miss\w*|onko|loyty\w*|saako|voiko|maks\w*|sijaits\w*|finns|har|kan|gratis|var|kost\w*)\b/,
    qualifier:[
      ['free',/\b(?:free|gratis|ilmain\w*|maksuto\w*|avgiftsfri\w*)\b/],
      ['electric',/\b(?:electric|charging|ev|sahkoauto\w*|lataus\w*|elbil\w*|ladd\w*)\b/]
    ]
  },{
    key:'accessible',
    subject:/\b(?:wheelchair\w*|accessible|accessibility|esteeton\w*|esteettom\w*|pyoratuol\w*|rullstol\w*|tillganglig\w*|tillganglighet)\b/,
    action:/\b(?:accessible|accessibility|access|enter|use|can|is|are|does|onko|paase\w*|voiko|sopi\w*|esteeton\w*|esteettom\w*|tillganglig\w*|kan|ar)\b/,
    qualifier:[]
  },{
    key:'strollers',
    subject:/\b(?:stroller\w*|pushchair\w*|pram\w*|babycarriage\w*|lastenvaun\w*|ratta\w*|barnvagn\w*)\b/,
    action:/\b(?:bring|take|allow\w*|permit\w*|enter|use|can|is|saako|voiko|tuoda|salli\w*|ottaa|faar|far|ta|med|tillate\w*|kan)\b/,
    qualifier:[]
  },{
    key:'photography',
    subject:/\b(?:photo\w*|picture\w*|camera\w*|photograph\w*|valokuv\w*|kuva\w*|kuvi\w*|fotograf\w*|bild\w*)\b/,
    action:/\b(?:take|shoot|allow\w*|permit\w*|can|is|saako|voiko|salli\w*|ottaa|fotografer\w*|far|faar|kan|tillate\w*)\b/,
    qualifier:[]
  }
];
const alternative=/\b(?:instead|rather|only|except|except for|vain|paitsi|ainoastaan|endast|bara|utom)\b/;

export function faqParaphraseEvidence(query, publishedQuestion) {
  const q=normalize(query), title=normalize(publishedQuestion);
  if(!q||!title||q.length>400||title.length>400)return null;
  if(alternative.test(' '+q+' ') || alternative.test(' '+title+' '))return null;
  for(const family of families){
    if(!has(q,family.subject)||!has(title,family.subject)||
       !has(q,family.action)||!has(title,family.action))continue;
    if(family.key==='pets'){
      const species=value=>has(value,/\b(?:dogs?|koir\w*|hund\w*)\b/)?'dog':
        has(value,/\b(?:cats?|kiss\w*|katt\w*)\b/)?'cat':'';
      const requested=species(q),documented=species(title);
      // Specific dog/cat rules are not interchangeable; a documented
      // dog-only rule cannot answer a broad "all pets" question either.
      if(documented && documented!==requested)continue;
    }
    // "Can I take my dog on the terrace?" and "Can I take my dog
    // inside?" are different policies. Do not transfer them.
    const inQuery=family.qualifier.filter(([,rx])=>has(q,rx)).map(([label])=>label);
    const inTitle=family.qualifier.filter(([,rx])=>has(title,rx)).map(([label])=>label);
    if(inQuery.length||inTitle.length){
      if(!inQuery.length||!inTitle.length ||
         inQuery.length!==inTitle.length ||
         inQuery.some(x=>!inTitle.includes(x))) continue;
    }
    // Preserve the named scope when one question names a different physical
    // location. These are not universal answers outside the approved FAQ.
    return {concept:family.key,score:0.82+(inQuery.length?0.08:0)};
  }
  return null;
}
