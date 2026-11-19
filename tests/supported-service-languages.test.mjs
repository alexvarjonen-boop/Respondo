import test from 'node:test';
import assert from 'node:assert/strict';
import { groundedSupportedServiceLanguages } from '../supported-service-languages.mjs';

const documented = {
  id:'site-language-section',
  title:'Three languages.',
  answer:'Finnish, Swedish and English in one service.',
  source_type:'website',
};
const catalog = {
  id:'catalog',
  title:'Digital services',
  answer:'Respondo Imports relevant service and product information.',
  source_type:'website',
};

for (const [query,lang,expected] of [
  ['Millä kielillä Respondo toimii?', 'fi', 'suomeksi, ruotsiksi ja englanniksi'],
  ['Vilka språk stöder Respondo?', 'sv', 'finska, svenska och engelska'],
  ['What languages does Respondo support?', 'en', 'Finnish, Swedish and English'],
]) {
  test('answers service languages from verified source in ' + lang, () => {
    const result = groundedSupportedServiceLanguages([catalog, documented], query, lang);
    assert.ok(result.answer.includes(expected));
    assert.equal(result.handoff, false);
    assert.deepEqual(result.sourceIds, ['site-language-section']);
  });
}

test('product, draft or negative facts cannot substantiate language support', () => {
  const result = groundedSupportedServiceLanguages([
    catalog, {...documented,approved:false},
    {title:'Supported languages', answer:'Swedish and English are not supported.'}
  ],'What languages does Respondo support?','en');
  assert.equal(result.handoff,true);
  assert.deepEqual(result.sourceIds,[]);
  assert.equal(groundedSupportedServiceLanguages(
    [documented],'What programming languages does it support?','en'),null);
});

test('conflicting support facts disqualify the contested language', () => {
  const result = groundedSupportedServiceLanguages([
    documented, {title:'Supported languages', answer:'Swedish is not supported.'},
    {title:'Keyboard', answer:'Available in Swedish and English.'}
  ],'What languages does Respondo support?','en');
  assert.match(result.answer,/Finnish and English/);
  assert.doesNotMatch(result.answer,/Swedish/);
});

test('the real grounded answer route uses service language evidence ahead of catalog browsing', async () => {
  const {generateGroundedAnswer} = await import('../server.mjs');
  const result = await generateGroundedAnswer({
    companyName:'Respondo',
    rows:[catalog, documented],
    message:'Millä kielillä Respondo toimii?',
    lang:'fi'
  });
  assert.equal(result.intent,'Palvelukielet');
  assert.match(result.answer,/suomeksi, ruotsiksi ja englanniksi/);
  assert.deepEqual(result.sourceIds,['site-language-section']);
});
