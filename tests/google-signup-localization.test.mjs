import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const begin=app.indexOf("function socialAuthButtons(flow = 'signup', plan = '')");
const end=app.indexOf('function oauthErrorMessage()',begin);
assert.ok(begin>0 && end>begin);
const socialSource=app.slice(begin,end);

for(const [language,position,signup,login,emailLabel] of [
  ['fi',0,'Jatka Googlella','Kirjaudu Googlella','tai sähköpostilla'],
  ['sv',1,'Fortsätt med Google','Logga in med Google','eller med e-post'],
  ['en',2,'Continue with Google','Sign in with Google','or with email']
]){
  test('Google registration and login labels localized: '+language,()=>{
    const widget=new Function('appText','currentLang',socialSource+';return socialAuthButtons;')(
      (...parts)=>parts[position],()=>language
    );
    const signupHtml=widget('signup','business_yearly');
    assert.ok(signupHtml.includes('aria-label="'+signup+'"'));
    assert.ok(signupHtml.includes('<span>'+signup+'</span>'));
    assert.ok(signupHtml.includes('<span>'+emailLabel+'</span>'));
    assert.ok(signupHtml.includes('/api/auth/oauth/google/start?flow=signup&plan=business_yearly&lang='+language));
    const loginHtml=widget('login');
    assert.ok(loginHtml.includes('aria-label="'+login+'"'));
    assert.ok(loginHtml.includes('/api/auth/oauth/google/start?flow=login'));
    assert.ok(!loginHtml.includes('plan='));
  });
}
