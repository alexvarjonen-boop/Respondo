// Respondo-owned conservative email triage. Never confirms prices, work duration, or bookings.
const normalize = value => String(value ?? '').normalize('NFKC').trim().slice(0,3000);
const match = (text, terms) => terms.some(x => x.test(text));
const booking = [
 /\b(ajanvaraus|ajanvarausta|varaus|varata|aikaa|aika|aikana|vapaata|perjantai(?:na)?|maanantai(?:na)?|tiistai(?:na)?|keskiviikko(?:na)?|torstai(?:na)?|lauantai(?:na)?|sunnuntai(?:na)?)\b/i,
 /\b(boka|bokning|ledig|tid|fredag|måndag|tisdag|onsdag|torsdag|lördag|söndag)\b/i,
 /\b(book|booking|appointment|available|availability|friday|monday|tuesday|wednesday|thursday|saturday|sunday)\b/i
];
const money = [/\b(hinta|hinnasto|maksaa|maksaisi|tarjous|kustannus)\b/i,
 /\b(pris|kostar|offert)\b/i,/\b(price|cost|quote|estimate)\b/i];
const scopes = {
 fi:{booking:'Kiitos viestistä. Voisitko kertoa työn kohteen, määrän tai laajuuden, osoitteen sekä toivomasi päivän ja kellonajan? Tarkistamme työn keston ja vapaan ajan ennen vahvistusta.',pricing:'Kiitos viestistä. Kerrotko työn tai tuotteen tarkemman laajuuden? Tarkistamme hinnan yrityksen vahvistamista tiedoista ennen tarjousta.',general:'Kiitos viestistä. Olemme vastaanottaneet kysymyksesi ja tarkistamme tarvittavat tiedot ennen vastaamista.'},
 sv:{booking:'Tack för ditt meddelande. Kan du ange arbetets omfattning, antal, adress samt önskad dag och tid? Vi kontrollerar tidsåtgången och tillgängligheten innan bokningen bekräftas.',pricing:'Tack för ditt meddelande. Kan du beskriva arbetets eller produktens omfattning? Vi kontrollerar priset mot företagets bekräftade uppgifter innan vi ger ett erbjudande.',general:'Tack för ditt meddelande. Vi har tagit emot din fråga och kontrollerar uppgifterna innan vi svarar.'},
 en:{booking:'Thank you for your message. Could you share the job scope or quantity, address, and preferred date and time? We will check the required duration and availability before confirming a booking.',pricing:'Thank you for your message. Could you clarify the scope of work or product? We will verify pricing against company-approved information before providing a quote.',general:'Thank you for your message. We have received your question and will verify the details before replying.'}
};
export function triageNativeMail(text,language='fi'){
 const value=normalize(text),lang=['fi','sv','en'].includes(language)?language:'fi';
 if(!value)return {intent:'empty',suggestion:null,requiresReview:true,autoSend:false};
 const intent=match(value,booking)?'booking':match(value,money)?'pricing':'general';
 return {intent,suggestion:scopes[lang][intent],language:lang,requiresReview:true,
  autoSend:false,confirmedBooking:false,verifiedPrice:false};
}
