/**
 * Convert the booking form selection to whole minutes, without silently changing
 * the user's custom hours/minutes. Returns null for missing or invalid values.
 * Booking slots are generated within one business day, so custom is capped at 23:59.
 */
export function parseBookingDurationMinutes(selection,hours,minutes){
  const selected=String(selection??'');
  if (selected!=='custom'){
    if (!['30','45','60','90','120'].includes(selected)) return null;
    return Number(selected);
  }
  const h=String(hours??'');
  const m=String(minutes??'');
  if (!/^\d{1,2}$/.test(h) || !/^\d{1,2}$/.test(m)) return null;
  const wholeHours=Number(h), wholeMinutes=Number(m);
  if (wholeHours<0 || wholeHours>23 || wholeMinutes<0 || wholeMinutes>59) return null;
  const total=wholeHours*60+wholeMinutes;
  return total>=1 && total<=1439?total:null;
}
