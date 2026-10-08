import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appleHomeMarkup } from '../public/apple-home.js';
import { publicMenuMarkup } from '../public/apple-nav.js';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const styles=readFileSync(new URL('../public/apple-home.css',import.meta.url),'utf8');

for (const [index,lang,company] of [[0,'fi','Yrityksesi'],[1,'sv','Ditt företag'],[2,'en','Your company']]) {
  const t=(...translations)=>translations[index];
  test('homepage renders exactly three primary cards in '+lang,()=>{
    const html=appleHomeMarkup(t,lang,145);
    assert.equal((html.match(/class="apple-feature-card /g)||[]).length,3);
    assert.equal((html.match(/class="apple-chat-preview"/g)||[]).length,1);
    assert.ok(html.includes('<strong>'+company+'</strong>'));
    assert.ok(html.includes('/assistant?lang='+lang));
    assert.ok(html.includes('/ominaisuudet?lang='+lang));
    assert.ok(html.includes('href="/tilaus"'));
    assert.doesNotMatch(html,/<iframe|<canvas/);
  });
  test('fullscreen menu keeps every secondary route accessible in '+lang,()=>{
    const html=publicMenuMarkup(t,lang);
    assert.equal((html.match(/class="apple-menu-links"/g)||[]).length,1);
    assert.ok(html.includes('/hinnat?lang='+lang));
    assert.ok(html.includes('/yhteystiedot?lang='+lang));
    assert.ok(html.includes('/tietoturva?lang='+lang));
    assert.ok(html.includes('/verkkokauppa-chatbot?lang='+lang));
    assert.ok(html.includes('/kirjaudu?lang='+lang));
    assert.match(html,/aria-hidden="true" inert/);
    assert.ok(!html.includes('↗'), 'fullscreen navigation should display labels without arrow icons');
  });
}

test('homepage remains compact while dedicated routes retain pricing and contact functionality',()=>{
  const start=app.indexOf('async function home()');
  const end=app.indexOf('\n\nfunction signup()',start);
  const home=app.slice(start,end);
  assert.ok(start>=0 && end>start);
  assert.match(home,/appleHomeMarkup\(appText,currentLang\(\),FEATURE_COUNT\)/);
  assert.doesNotMatch(home,/pricingSection\(\)|contactSection\(\)|calculatorSection\(\)/);
  assert.match(app,/path === '\/hinnat'/);
  assert.match(app,/path === '\/yhteystiedot'/);
  assert.ok(server.includes("'/hinnat'"));
  assert.ok(server.includes("'/yhteystiedot'"));
  assert.match(styles,/@media\(max-width:520px\)/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
});
