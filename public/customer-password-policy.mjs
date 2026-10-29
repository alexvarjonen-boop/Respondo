// Shared, first-party customer password policy for API and public forms.
// Do not treat spaces as special characters; avoid accepting ASCII-only
// assumptions about letters in Finnish/Swedish customer passwords.
export const CUSTOMER_PASSWORD_MAX_LENGTH=200;
export function customerPasswordChecks(value){
  const password=String(value||'');
  return {
    length:password.length>=8 && password.length<=CUSTOMER_PASSWORD_MAX_LENGTH,
    upper:/\p{Lu}/u.test(password),
    lower:/\p{Ll}/u.test(password),
    digit:/\p{Nd}/u.test(password),
    special:/[^\p{L}\p{N}\s]/u.test(password),
  };
}
export function customerPasswordValid(value){
  return Object.values(customerPasswordChecks(value)).every(Boolean);
}
export function customerPasswordStrength(value){
  const password=String(value||'');
  if(!password)return 0;
  const passed=Object.values(customerPasswordChecks(password)).filter(Boolean).length;
  if(passed<=2)return 1;
  if(passed<=4)return 2;
  if(password.length<10)return 2;
  if(password.length<14)return 3;
  return 4;
}
