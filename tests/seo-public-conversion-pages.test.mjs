import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const client = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const server = readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');

test('pricing and contact pages remain indexable after browser-side SEO hydration', () => {
  const clientIndexable = client.match(/const indexable = new Set\(\[([^\]]+)\]\)/)?.[1] || '';
  const serverIndexable = server.match(/const SEO_INDEXABLE_PATHS = new Set\(\[([\s\S]+?)\]\)/)?.[1] || '';
  for (const page of ['/hinnat', '/yhteystiedot']) {
    assert.ok(clientIndexable.includes("'"+page+"'"), 'client must index ' + page);
    assert.ok(serverIndexable.includes("'"+page+"'"), 'server must index ' + page);
  }
  assert.match(client, /upsertMeta\('name','robots',robots\)/);
});

test('pricing and contact metadata exists in all three languages', () => {
  const clientMeta = client.slice(client.indexOf('  const metaByPath = {'), client.indexOf('  const indexable = new Set('));
  for (const [page, titles] of [
    ['/hinnat', ['Hinnat | Respondo AI', 'Priser | Respondo AI', 'Pricing | Respondo AI']],
    ['/yhteystiedot', ['Yhteystiedot | Respondo AI', 'Kontakt | Respondo AI', 'Contact Respondo AI | Support and Sales']],
  ]) {
    const start = clientMeta.indexOf("    '"+page+"': {");
    assert.ok(start >= 0, 'missing metadata for ' + page);
    const block = clientMeta.slice(start, clientMeta.indexOf('\n    },', start)+7);
    for (const title of titles) assert.ok(block.includes(title), 'missing localized title: ' + title);
    assert.ok(server.includes("'"+page+"'"), 'server must know page ' + page);
  }
});

test('sitemap continues to expose pricing and contact for discovery', () => {
  assert.match(server, /basePaths = \[[^\n]*'\/hinnat'[^\n]*'\/yhteystiedot'/);
});

test('www public pages redirect to apex while OAuth callback APIs keep their host', () => {
  assert.match(server, /inboundHost !== 'www\.respondoai\.fi'/);
  assert.match(server, /req\.path\.startsWith\('\/api\/'\)/);
  assert.match(server, /res\.redirect\(301, SEO_CANONICAL_ORIGIN \+ req\.originalUrl\)/);
});

test('industry landing pages stay discoverable and indexable in both renderers', () => {
  const pagePaths = ['/autokorjaamo-chatbot', '/lvi-chatbot'];
  const clientIndexable = client.match(/const indexable = new Set\(\[([^\]]+)\]\)/)?.[1] || '';
  const serverIndexable = server.match(/const SEO_INDEXABLE_PATHS = new Set\(\[([\s\S]+?)\]\)/)?.[1] || '';
  for (const path of pagePaths) {
    assert.ok(clientIndexable.includes("'"+path+"'"), 'client noindex risk for ' + path);
    assert.ok(serverIndexable.includes("'"+path+"'"), 'server noindex risk for ' + path);
    assert.ok(server.includes("'"+path+"'"), 'no server route '+path);
    assert.ok(client.includes("pages['"+path+"']"), 'missing browser page '+path);
  }
  assert.ok(server.includes("'"+pagePaths[0]+"', '"+pagePaths[1]+"'"), 'industry pages missing from sitemap');
  assert.ok(client.includes("'/autokorjaamo-chatbot','01'"), 'auto repair is reachable from audience hub');
  assert.ok(client.includes("'/lvi-chatbot','02'"), 'HVAC is reachable from audience hub');
  assert.match(client, /Chatbot for Auto Repair Shops/);
  assert.match(client, /Chatbot for Plumbing and HVAC Companies/);
  assert.match(server, /<h1>Chatbot autokorjaamolle<\/h1>/);
  assert.match(server, /<h1>Chatbot LVI-yritykselle<\/h1>/);
});

test('industry hub is a single footer link and has five crawlable destinations', () => {
  const markup = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../public/industry-directory.css', import.meta.url), 'utf8');
  const footer = client.slice(client.indexOf('function footer() {'), client.indexOf('function footer() {')+2500);
  const clientIndexable = client.match(/const indexable = new Set\(\[([^\]]+)\]\)/)?.[1] || '';
  const serverIndexable = server.match(/const SEO_INDEXABLE_PATHS = new Set\(\[([\s\S]+?)\]\)/)?.[1] || '';
  assert.ok(clientIndexable.includes("'/kenelle-sopii'"));
  assert.ok(serverIndexable.includes("'/kenelle-sopii'"));
  assert.match(server, /basePaths = \[[^\n]*'\/kenelle-sopii'/);
  assert.ok(footer.includes('href="/kenelle-sopii?lang='));
  assert.match(client, /path === '\/kenelle-sopii'\) html = audienceHubPage\(\)/);
  for (const path of ['/autokorjaamo-chatbot','/lvi-chatbot','/verkkokauppa-chatbot','/asiakaspalvelubotti','/ajanvaraus-chatbot']) {
    assert.ok(client.includes("'"+path+"'"), 'missing hub link '+path);
    assert.ok(!footer.includes('href="'+path+'?lang='), 'footer still has destination '+path);
  }
  assert.match(server, /rawPath === '\/kenelle-sopii'/);
  assert.match(client, /Who is Respondo AI for\?/);
  assert.match(client, /Vem passar Respondo AI för/);
  assert.match(markup, /industry-directory\.css/);
  assert.match(markup, /app\.js\?v=[^\"]+-audience-hub-route-v3/, 'stale mobile JS bundle can show 404 on newly added paths');
  assert.match(styles, /@media\(max-width:760px\)/);
});

test('global discovery guides share FI SV EN copy with server crawler fallbacks and published routes', async () => {
  const data = await import('../public/global-resources.mjs');
  const markup = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../public/global-resources.css', import.meta.url), 'utf8');
  const paths=['/guides','/guides/ai-customer-service-chatbot','/guides/website-chatbot-knowledge-base'];
  for (const path of paths) {
    assert.ok(data.GLOBAL_GUIDE_PATHS.includes(path));
    assert.ok(server.includes("'"+path+"'"), 'not discoverable in server');
    assert.ok(client.includes("'"+path+"'") || client.includes('GLOBAL_GUIDE_PATHS.includes(path)'), 'not reachable in client');
    for (const lang of ['fi','sv','en']) {
      const html=data.globalResourcesMarkup(path,lang);
      assert.ok(html.includes('<main'), 'missing main for '+path+' '+lang);
      assert.ok(html.includes('<h1>'), 'missing heading for '+path+' '+lang);
      assert.ok(html.length>650, 'thin content for '+path+' '+lang);
      assert.ok(html.includes('/assistant') || html.includes('/guides/'), 'missing next action or related guide');
    }
  }
  assert.match(server, /globalResourcesMarkup\(rawPath,seo.lang\)/);
  assert.match(server, /<meta property="og:image"/);
  assert.match(server, /respondo-approved-arrow-20261012.png/);
  assert.match(server, /'@type':'Article'/);
  assert.match(client, /\/guides\?lang=/);
  assert.match(markup, /global-resources\.css/);
  assert.match(markup, /app\.js\?v=[^"]+-audience-hub-route-v3-world-guides-v1/);
  assert.match(css, /max-width:760px/);
});

test('international guide content is server-rendered without requiring JavaScript', async () => {
  const guides = await import('../public/global-resources.mjs');
  for (const route of guides.GLOBAL_GUIDE_PATHS) {
    const html = guides.globalResourcesMarkup(route, 'en');
    assert.match(html, /<main/);
    assert.match(html, /<h1>/);
    assert.ok(html.length > 650, 'guide must not be thin: '+route);
  }
  assert.match(server, /const initialContent = GLOBAL_GUIDE_PATHS\.includes\(req\.path\)/);
  assert.match(server, /\? globalResourcesMarkup\(req\.path, seo\.lang\)/);
  assert.match(server, /'<div id="app">' \+ initialContent \+ '<\/div>'/);
  assert.match(server, /seo\.lang === 'sv' \? 'sv_SE' : seo\.lang === 'en' \? 'en_GB' : 'fi_FI'/);
});

test('robots.txt leaves browser assets crawlable and workspace itself remains noindex', () => {
  const robotsRoute = server.slice(server.indexOf("app.get('/robots.txt'"), server.indexOf("app.get('/sitemap.xml'"));
  assert.ok(robotsRoute.includes("'Disallow: /app/'"), 'nested private workspace URLs may be excluded');
  assert.ok(!robotsRoute.includes("'Disallow: /app',"), 'broad prefix blocks public app/Apple JavaScript');
  const rules = [...robotsRoute.matchAll(/'Disallow: ([^']+)'/g)].map(match => match[1]);
  for (const asset of ['/app.js','/apple-home.js','/apple-nav.js','/apple-home.css']) {
    assert.ok(!rules.some(rule => asset.startsWith(rule)), asset + ' must remain crawlable');
  }
  assert.ok(server.includes("SEO_APP_PATHS.has(rawPath)"), 'private workspace has noindex at response');
});

test('multilingual support guide is indexed with localized content and internal links', async () => {
  const data=await import('../public/global-resources.mjs');
  const route='/guides/multilingual-customer-support-chatbot';
  assert.ok(data.GLOBAL_GUIDE_PATHS.includes(route));
  const indexable=server.match(/const SEO_INDEXABLE_PATHS = new Set\(\[([\s\S]+?)\]\)/)?.[1]||'';
  assert.ok(indexable.includes("'"+route+"'"));
  for (const lang of ['fi','sv','en']) {
    const article=data.globalGuideData(route,lang);
    assert.ok(article.sections.length>=8);
    const markup=data.globalResourcesMarkup(route,lang);
    assert.ok(markup.length>2000,'thin localized article: '+lang);
    assert.ok(markup.includes('<h1>')&&markup.includes('<section'));
    assert.ok(markup.includes('/guides/'));
  }
  assert.match(server,/\.\.\.GLOBAL_GUIDE_PATHS/);
  assert.match(client,/world-guides-multi-v2/);
});

test('shareable 25-case support chatbot scorecard is linked from all guide languages', async () => {
  const article=await import('../public/global-resources.mjs');
  const csv=readFileSync(new URL('../public/ai-chatbot-evaluation-scorecard.csv', import.meta.url),'utf8');
  const rows=csv.trim().split(/\r?\n/);
  assert.equal(rows.length,26,'25 tests and one header');
  assert.ok(csv.includes('CAT01')&&csv.includes('CAT25'));
  assert.ok(csv.includes('Verified company source'));
  assert.ok(csv.includes('Result (pass/fail/needs review)'));
  for (const lang of ['fi','sv','en']) {
    assert.ok(article.globalResourcesMarkup('/guides',lang).includes('/ai-chatbot-evaluation-scorecard.csv'));
    assert.ok(article.globalResourcesMarkup('/guides/multilingual-customer-support-chatbot',lang).includes('/ai-chatbot-evaluation-scorecard.csv'));
  }
  const css=readFileSync(new URL('../public/global-resources.css', import.meta.url),'utf8');
  assert.match(css,/global-guide-scorecard/);
  assert.match(client,/world-guides-multi-v2-scorecard-v1/);
});

test('English editorial RSS feed includes guide URLs and is discoverable', () => {
  const feed=readFileSync(new URL('../public/guides/feed.xml', import.meta.url),'utf8');
  const shell=readFileSync(new URL('../public/index.html', import.meta.url),'utf8');
  assert.match(feed, /<rss version="2\.0"/);
  assert.match(feed, /<language>en<\/language>/);
  for (const path of ['/guides/ai-customer-service-chatbot','/guides/website-chatbot-knowledge-base','/guides/multilingual-customer-support-chatbot']) {
    assert.ok(feed.includes(path), 'missing editorial RSS entry: '+path);
  }
  assert.match(shell, /href="\/guides\/feed\.xml"/);
});

test('public independent-use chatbot checklist is a real static, SEO-indexable tool linked from all guide languages',async()=>{
 const resource=await import('../public/global-resources.mjs');
 const html=readFileSync(new URL('../public/tools/ai-chatbot-evaluation.html',import.meta.url),'utf8');
 assert.match(html,/<title>Free AI Chatbot Evaluation Scorecard/);
 assert.match(html,/<link rel="canonical" href="https:\/\/respondoai.fi\/tools\/ai-chatbot-evaluation\.html"/);
 assert.match(html,/fetch\('\/ai-chatbot-evaluation-scorecard.csv'/);
 assert.match(html,/data-value/);
 assert.match(html,/localStorage\.setItem/);
 assert.match(html,/Export my results/);
 const {Script}=await import('node:vm');
 const scripts=[...html.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/g)];
 const script=scripts.at(-1)?.[1];
 assert.ok(script && script.includes('parseCSV'), 'interactive scorecard logic missing');
 assert.doesNotThrow(()=>new Script(script),'interactive browser JS must parse');
 assert.match(html,/not an independent certification/);
 assert.match(server,/rows\.push\('  <url>\\n    <loc>' \+ escapeXml\(SEO_CANONICAL_ORIGIN \+ '\/tools\/ai-chatbot-evaluation\.html'\)/);
 for(const lang of ['fi','sv','en']){
  assert.match(resource.globalResourcesMarkup('/guides',lang),/\/tools\/ai-chatbot-evaluation\.html/);
  assert.match(resource.globalResourcesMarkup('/guides/ai-customer-service-chatbot',lang),/\/tools\/ai-chatbot-evaluation\.html/);
 }
 assert.match(client,/scorecard-v1-interactive-v1/);
 const shell=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 assert.match(shell,/scorecard-v1-interactive-v1/);
});

test('new AI chatbot vs live chat guide is fully localised, crawlable and linked',async()=>{
  const m=await import('../public/global-resources.mjs');
  const slug='/guides/ai-chatbot-vs-live-chat';
  assert.ok(m.GLOBAL_GUIDE_PATHS.includes(slug));
  for(const lang of ['fi','sv','en']){
    const guide=m.globalGuideData(slug,lang);
    assert.ok(guide?.sections.length>=6,'missing sections '+lang);
    assert.ok(guide?.faq.length>=4,'missing FAQs '+lang);
    const html=m.globalResourcesMarkup(slug,lang);
    assert.ok(html.length>2800,'article too thin '+lang);
    assert.match(html,/global-guide-next/);
    assert.ok(m.globalResourcesMarkup('/guides',lang).includes(slug),'not in guide directory '+lang);
  }
  assert.ok(server.includes("'"+slug+"'"),'missing server title or indexability');
  assert.ok(client.includes("'"+slug+"'"),'missing client title');
  assert.match(server,/\.\.\.GLOBAL_GUIDE_PATHS/);
  assert.match(client,/\.\.\.GLOBAL_GUIDE_PATHS/);
  assert.match(client,/GLOBAL_GUIDE_PATHS\.includes\(path\)/);
  const rss=readFileSync(new URL('../public/guides/feed.xml',import.meta.url),'utf8');
  assert.ok(rss.includes(slug));
  const shell=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  assert.ok(shell.includes('-interactive-v1-comparison-v1'));
  assert.ok(client.includes('global-resources.mjs?v=20261012-world-guides-multi-v2-scorecard-v1-interactive-v1-comparison-v1'));
});
