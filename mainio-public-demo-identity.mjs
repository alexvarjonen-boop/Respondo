// Only public, same-site Mainio website-demo imports may use Mainio's
// curated public knowledge rules. Never use an unrelated stored import ID or
// an authenticated tenant's private records.
export function isMainioPublicDemoWebsite({isPublicDemo,enteredDemoHost='',importedDemoHost=''}={}){
  if(isPublicDemo!==true)return false;
  const target='mainiomuuttopalvelu.fi';
  const entered=String(enteredDemoHost||'');
  const imported=String(importedDemoHost||'');
  return (entered===target || (!entered && imported===target)) &&
    (!imported || imported===target);
}
