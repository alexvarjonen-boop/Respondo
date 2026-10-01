// Only unambiguous, exactly extracted contact emails can populate an empty
// business-profile field. A website scan never silently overwrites saved input.
const validEmail=/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const normalize=value=>String(value??'').trim().toLowerCase();

export function importedContactEmails(candidates) {
  const unique=new Map();
  for(const candidate of Array.isArray(candidates)?candidates:[]) {
    const title=normalize(candidate?.title);
    const category=normalize(candidate?.category);
    const email=normalize(candidate?.answer);
    if (!['sähköposti','sahkoposti','email','e-mail','e-post'].includes(title)) continue;
    if (!['yhteystiedot','contact','kontakt','kontaktuppgifter'].includes(category)) continue;
    if(email.length>254 || !validEmail.test(email)) continue;
    if(!unique.has(email)) unique.set(email,{email,sourceUrl:String(candidate.sourceUrl||'')});
  }
  return [...unique.values()];
}

export function chooseImportedContactEmail(candidates,currentEmail) {
  const found=importedContactEmails(candidates);
  const current=normalize(currentEmail);
  // With several distinct addresses, a human must select the correct one.
  const autoFill=!current && found.length===1 ? found[0].email : '';
  return {
    autoFill,
    suggestions:found.filter(item=>item.email!==current && item.email!==autoFill),
    foundCount:found.length
  };
}
