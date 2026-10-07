import test from 'node:test';
import assert from 'node:assert/strict';
import { extractBusinessDocument, essentialWebsiteProfile } from '../website-knowledge.mjs';

test('import profile prefers concise concrete services over about-page marketing prose',()=>{
  const doc=extractBusinessDocument(`
    <section><h2>Palvelut</h2>
      <a href="/hiustenleikkaus">Hiustenleikkaus</a>
      <a href="/parran-muotoilu">Parran muotoilu</a>
    </section>
    <section><h2>Meistä</h2>
      <p>Olemme pitkän historian omaava yritys ja tavoitteenamme on, että jokainen asiakkaamme lähtee aina tyytyväisenä. Palvelussamme ei ole kyse vain hiustenleikkuusta vaan kokonaisvaltaisesta elämyksestä.</p>
    </section>
  `,'https://example.fi/');
  const profile=essentialWebsiteProfile({finalUrl:'https://example.fi/',pageDocuments:[doc]});
  assert.match(profile.services,/Hiustenleikkaus/i);
  assert.match(profile.services,/Parran muotoilu/i);
  assert.doesNotMatch(profile.services,/pitkän historian|tavoitteenamme|kokonaisvaltaisesta elämyksestä/i);
});

test('price list can supply concise service names when navigation labels are unavailable',()=>{
  const doc=extractBusinessDocument(`
    <section><h2>Hinnasto</h2>
      <p>🔶Hiustenleikkaus 31€</p>
      <p>🔶Hiusten koneajo 20€</p>
      <p>🔶Parran muotoilu 33€</p>
    </section>
  `,'https://example.fi/');
  const profile=essentialWebsiteProfile({finalUrl:'https://example.fi/',pageDocuments:[doc]});
  assert.match(profile.services,/Hiustenleikkaus/i);
  assert.match(profile.services,/Hiusten koneajo/i);
  assert.match(profile.services,/Parran muotoilu/i);
  assert.doesNotMatch(profile.services,/31€|20€|33€/);
});

test('profile turns a verified home-base sentence into a compact location value',()=>{
  const doc=extractBusinessDocument(`
    <section><h2>About us</h2>
      <p>Our home base is in Turku, Finland, where we design and assemble our products.</p>
    </section>
  `,'https://shop.example/about');
  const profile=essentialWebsiteProfile({finalUrl:'https://shop.example/',pageDocuments:[doc]});
  assert.equal(profile.address,'Turku, Finland');
});

test('profile still keeps a complete physical street and postal locality',()=>{
  const doc=extractBusinessDocument(`
    <footer><h2>Yhteystiedot</h2><p>Osoite: Hallituskatu 11, 33200 Tampere</p></footer>
  `,'https://example.fi/');
  const profile=essentialWebsiteProfile({finalUrl:'https://example.fi/',pageDocuments:[doc]});
  assert.equal(profile.address,'Hallituskatu 11, 33200 Tampere');
});
