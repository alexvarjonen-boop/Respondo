// First-party, rules-based lead priority. No contact data, model inferences,
// external delivery, or claim that the visitor will buy.
const fold=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().slice(0,1600);
const urgent=[
 /\b(?:urgent(?:ly)?|asap|immediately|today|tomorrow|within\s+24\s+hours|this\s+afternoon)\b/i,
 /\b(?:kiireellinen|kiireesti|heti|tanaan|huomenna|mahdollisimman\s+pian)\b/i,
 /\b(?:bradskande|akut|snarast|omedelbart|idag|imorgon)\b/i
];
const notUrgent=[
 /\b(?:not urgent|no rush|not in a hurry)\b/i,
 /\b(?:ei ole kiire|ei kiiretta|ei mikaan kiire)\b/i,
 /\b(?:inte brattom|ingen bradska|inte akut)\b/i
];
const dated=[
 /\b(?:by|before|on|for)\s+(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i,
 /\b(?:maanan(?:taina|taiksi)|tiis(?:taina|taiksi)|keskiviikkona|torstaina|perjantaina|lauantaina|sunnuntaina)\b/i,
 /\b(?:mandag|tisdag|onsdag|torsdag|fredag|lordag|sondag)\b/i
];
const withAmount=/\b\d[\d\s.,]{0,12}\s*(?:€|eur|euroa|euro|euros|usd|dollars?|kpl|pcs|st|ikkunaa|hours?|tuntia)\b/i;
export function classifyRequestPriority({type='',message='',details=''}={}){
  const kind=String(type||'').trim().toLowerCase();
  if(!['quote','booking','callback'].includes(kind))return null;
  const text=fold(String(message??'')+' '+String(details??''));
  // Exclusion beats urgency terms; use only what the visitor explicitly wrote.
  const urgency=!notUrgent.some(rx=>rx.test(text))&&urgent.some(rx=>rx.test(text));
  const deadline=dated.some(rx=>rx.test(text));
  const quantified=withAmount.test(text);
  const signals=[];
  if(urgency) signals.push('urgent_words');
  if(deadline) signals.push('named_weekday');
  if(quantified) signals.push('explicit_amount');
  return Object.freeze({
    tier:urgency?'urgent':'normal',
    signals,
    manualReviewRequired:true,
    autoConfirmed:false,
    basis:'visitor_supplied_text',
  });
}
