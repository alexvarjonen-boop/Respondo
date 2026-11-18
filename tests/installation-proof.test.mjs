import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectInstalledWidgetHtml,sameInstalledSiteHost} from '../installation-proof.mjs';
const url='https://yritys.fi/';
test('verifier finds only the correct first-party widget company in published static HTML',()=>{
  const page=`<html><script defer data-lang="fi" src="https://www.respondoai.fi/widget.js?v=1&amp;demo=0" data-company='yritys-a'></script></html>`;
  assert.deepEqual(inspectInstalledWidgetHtml(page,url,'yritys-a'),{status:'snippet_detected',reason:'matching_company'});
  assert.equal(inspectInstalledWidgetHtml(page,url,'toinen').status,'wrong_company');
});
test('spoofed or dynamically inserted tags never count as verified static installs',()=>{
  assert.equal(inspectInstalledWidgetHtml('<script src="https://evil.example/widget.js" data-company="yritys-a"></script>',url,'yritys-a').status,'not_detected');
  assert.equal(inspectInstalledWidgetHtml('<script>document.createElement("script")</script>',url,'yritys-a').status,'not_detected');
  assert.equal(inspectInstalledWidgetHtml('<script src="/widget.js" data-company="yritys-a"></script>',url,'yritys-a').status,'not_detected');
  assert.equal(inspectInstalledWidgetHtml('<!-- <script src="https://respondoai.fi/widget.js" data-company="yritys-a"></script> -->',url,'yritys-a').status,'not_detected');
  assert.equal(inspectInstalledWidgetHtml('<template><script src="https://respondoai.fi/widget.js" data-company="yritys-a"></script></template>',url,'yritys-a').status,'not_detected');
  assert.equal(inspectInstalledWidgetHtml('<noscript><script src="https://respondoai.fi/widget.js" data-company="yritys-a"></script></noscript>',url,'yritys-a').status,'not_detected');
  assert.equal(inspectInstalledWidgetHtml('','invalid url','yritys-a').status,'inconclusive');
});
test('verification refuses cross-host redirects but accepts www/apex canonicalization',()=>{
  assert.equal(sameInstalledSiteHost('https://yritys.fi','https://www.yritys.fi/'),true);
  assert.equal(sameInstalledSiteHost('https://yritys.fi','https://other.example/'),false);
});
test('owner-only installation verification cannot be redirected to an arbitrary submitted URL',()=>{
  const src=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  const body=src.slice(src.indexOf("app.post('/api/app/installation/verify'"),src.indexOf("app.get('/api/app/native/mail/status'"));
  assert.match(body,/auth,ownerOnly,subscribed,nativeWriteLimiter/);
  assert.match(body,/fetchPublicHtml\(tenant\.website,9000,1_200_000\)/);
  assert.doesNotMatch(body,/req\.body\?\.website/);
  assert.match(body,/browserExecutionVerified:false/);
});
