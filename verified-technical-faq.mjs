// Verified expert-FAQ retrieval. This is not a general technical oracle:
// require matching approved business-authored question AND its answer.
const norm=value=>String(value||'').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s-]/g,' ')
  .replace(/\s+/g,' ').trim();
const technicalTerms=/\b(?:agm|efb|tpms|obd|p\d{4}|bms|ecu|can\s+bus|jarru\w*|brake\w*|broms\w*|raidetank\w*|tie\s+rod|styrstag|jakohih\w*|timing\s+belt|kamrem|moment\w*|torque\w*|kirist\w*|kood\w*|program\w*|rekister\w*|register\w*|kalibro\w*|calibrat\w*|cod\w*|diagnos\w*|vikakood\w*|fault\s+code|felsok\w*|turvallisuus\w*|safety\b|safe\b|varmuus\w*|paine\w*|pressure\w*|venttiil\w*|valve\w*|varmepump\w*|lampopump\w*|heat\s+pump|pistorasi\w*|electrical\s+outlet|arvonlisaver\w*|tilinpaat\w*|bokslut|vat\b|moms\b)/;
const questionStart=/^(?:mika|mitka|mita|miten|miksi|pitaako|tarvitseeko|tarviiko|vaatiiko|voiko|onko\s+pakko|milla|millais|kuinka|what|how|why|does|is\s+it|do\s+i\s+need|should|must|can\s+i|vad|hur|varfor|behover|maste|kraver|kan\s+man|ar\s+det)\b/;
const routine=/\b(?:hinta|maksaa|paljonko|hintaa|price|cost|pris|kostar|aukiolo|opening\s+hours|oppettid|toimitus|shipping|frakt|palautus|returns|refund|puhelin|phone|telefon|email|sahkoposti|address|osoite|tietosuoja|privacy|asiakaspalvelu)\b/;
const stop=new Set([
  'mita','mika','mitka','miten','miksi','kuinka','milla','milloin','tarvitseeko','pitaako','vaatiiko','voiko',
  'tarviiko','onko','pakko','tama','taman','tuo','teilla','teidan','kanssa','jalkeen','ennen','aikana',
  'pitaisi','tarvitaan','tarvitaanko','voi','olisi','ovat','siis','sen','sita','siina','auto','auton',
  'what','which','does','do','should','must','require','need','requires','after','before','does',
  'that','this','the','for','with','car','your','have','has','is','can','could','are','why','how',
  'vad','hur','varfor','behover','maste','kraver','kan','man','efter','fore','det','den','ett','med',
  'som','ni','ar','har','vilken','vilka','ska','skall'
]);
function canonWord(value){
  const word=norm(value);
  if(/^(?:akku\w*|aku(?:n|t|ja|jen)|battery|batteries|batteri\w*)$/.test(word)) return 'battery';
  if(/^(?:kood\w*|ohjelm\w*|rekister\w*|program\w*|register\w*|coding|coded|cod\w*|registr\w*|anpass\w*|adapt\w*)$/.test(word)) return 'registration';
  if(/^(?:vaih\w*|vaiht\w*|replac\w*|swapp?\w*|byta|byte\w*|byter)$/.test(word))return 'replacement';
  if(/^(?:vikakood\w*|faultcode\w*|fault\s+code|felkod\w*|errorcode\w*)$/.test(word))return 'faultcode';
  if(/^(?:tarkoitt\w*|merkits\w*|mean\w*|betyder\w*)$/.test(word))return 'meaning';
  if(/^(?:kirist\w*|moment\w*|torque\w*|atdragningsmoment\w*)$/.test(word))return 'torque';
  if(/^(?:reng\w*|renka\w*|renk\w*|tire\w*|tyre\w*|dack\w*)$/.test(word))return 'tire';
  if(/^(?:paine\w*|pressure\w*|tryck\w*)$/.test(word))return 'pressure';
  if(/^(?:tuulilas\w*|windshield\w*|windscreen\w*|vindrut\w*)$/.test(word))return 'windshield';
  if(/^(?:turvallis\w*|safe\w*|saker\w*)$/.test(word))return 'safety';
  if(/^(?:arvonlisaver\w*|vat|moms)$/.test(word))return 'vat';
  if(/^(?:pistorasi\w*|socket\w*|outlet\w*|eluttag\w*)$/.test(word))return 'socket';
  if(word.length>6)return word.replace(/(?:eista|oista|oiden|eiden|ssa|sta|lla|lle|ksi|en|jen|na|ta|ia|ja|aan|iin|aa|an|on|n)$/,'');
  return word;
}
function terms(value){
  const raw=norm(value).split(/\s+/).filter(Boolean).map(canonWord);
  return [...new Set(raw.filter(word=>word.length>=3&&!stop.has(word)))];
}
function identifiers(value){
  return [...new Set(norm(value).match(/\b(?:p\d{4}|c\d{4}|b\d{4}|u\d{4}|agm|efb|tpms|obd|ecu|bms|\d{3,6})\b/g)||[])];
}
function isTechnicalQuestion(message){
  const q=norm(message);
  return q.length>=13 && q.length<=450 && questionStart.test(q) &&
    !routine.test(q) && technicalTerms.test(q);
}
function isExpertRow(row){
  const heading=String(row?.question||row?.title||'').trim();
  const meta=norm(String(row?.category||'')+' '+heading);
  const answer=String(row?.answer||'').trim();
  if(!heading || answer.length<8 || answer.length>2800) return false;
  if(/(?:review|arvostel|testimonial|privacy|tietosuoja|cookie|evaste)/.test(meta)) return false;
  return /[?？]/.test(heading) ||
    /\b(?:usein\s+kysyty|faq|technical\s+faq|asiantuntijan\s+vastaukset|tekninen\s+kysymys|tekniset\s+kysymykset)\b/.test(meta);
}
function evidenceRank(query,heading) {
  const q=terms(query),h=terms(heading),qh=new Set(q),hh=new Set(h);
  if(!q.length || !h.length) return 0;
  const matched=q.filter(word=>hh.has(word)).length;
  const anchors=identifiers(query);
  const target=identifiers(heading);
  if(anchors.some(value=>!target.includes(value))) return 0;
  if(target.some(value=>!anchors.includes(value))) return 0;
  if(matched<2 && !anchors.length) return 0;
  const recall=matched/q.length,precision=matched/h.length;
  // A single generic subject can never prove a detailed technical rule.
  if(recall<0.70 || precision<0.60)return 0;
  return 0.7*recall+0.3*precision+(anchors.length?0.15:0);
}
export function verifiedTechnicalFaqAnswer(rows,message){
  if(!isTechnicalQuestion(message))return null;
  const matches=(rows||[]).filter(isExpertRow)
    .map(row=>({row,score:evidenceRank(message,String(row.question||row.title))}))
    .filter(x=>x.score>=0.68)
    .sort((a,b)=>b.score-a.score);
  const best=matches[0];
  // Two near-identical matches with different factual answers should be
  // reviewed by a person instead of silently choosing a random one.
  if(best && matches[1] && matches[1].score>=best.score-0.015 &&
     norm(matches[1].row.answer)!==norm(best.row.answer)) {
    return {answer:'',handoff:true,confidence:0.2,intent:'Tekninen kysymys',sourceIds:[],selected:[]};
  }
  if(!best) return {answer:'',handoff:true,confidence:0.2,intent:'Tekninen kysymys',sourceIds:[],selected:[]};
  return {answer:String(best.row.answer).trim(),handoff:false,confidence:0.94,
    intent:'Tekninen kysymys',sourceIds:best.row.id?[best.row.id]:[],selected:[best.row]};
}
