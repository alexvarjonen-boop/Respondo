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

test('service profile drops inflected prose fragments while keeping real service names',()=>{
  const doc=extractBusinessDocument(`
    <section><h2>Palvelut</h2>
      <a href="/haircuts">Hiustenleikkaukset</a>
      <a href="/beard">Partapalvelut</a>
      <p>My M Room -palvelussa saat lisää etuja.</p>
      <p>Lue lisää hiustenleikkauspalveluista.</p>
      <p>Tutustu väripalvelun etuihin.</p>
    </section>
  `,'https://example.fi/');
  const profile=essentialWebsiteProfile({finalUrl:'https://example.fi/',pageDocuments:[doc]});
  assert.match(profile.services,/Hiustenleikkaukset/i);
  assert.match(profile.services,/Partapalvelut/i);
  assert.doesNotMatch(profile.services,/palvelussa|palveluista|väripalvelun/i);
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


test('razor blade wording never becomes a return policy',()=>{
  const doc=extractBusinessDocument(`
    <section><h2>Vaihtoterät</h2>
      <p>Laadukkaat vaihtoterät partahöyliin takaavat tarkan ajon.</p>
      <p>Vaihtoterät (13)</p>
    </section>
    <section><h2>Palautukset</h2>
      <p>Sinulla on 100 päivän palautusoikeus ja saat rahasi takaisin.</p>
    </section>
  `,'https://shop.example/pages/help');
  const profile=essentialWebsiteProfile({finalUrl:'https://shop.example/',pageDocuments:[doc]});
  assert.match(profile.returns,/100 päivän palautusoikeus/i);
  assert.doesNotMatch(profile.returns,/vaihtoter/i);
});

test('warranty marketing words never become warranty facts',()=>{
  const doc=extractBusinessDocument(`
    <section><h2>Lahjaidea</h2>
      <p>Tämä setti on takuuvarma lahja miehelle.</p>
      <p>Takuulla! Saat kehuja uudesta tyylistäsi.</p>
    </section>
    <section><h2>Takuu</h2>
      <p>Tuotteella on 2 vuoden takuu valmistusvirheiden varalta.</p>
    </section>
  `,'https://shop.example/pages/help');
  const profile=essentialWebsiteProfile({finalUrl:'https://shop.example/',pageDocuments:[doc]});
  assert.match(profile.warranty,/2 vuoden takuu/i);
  assert.doesNotMatch(profile.warranty,/takuuvarma|Takuulla/i);
});

test('manufacturer details never override merchant contact details',()=>{
  const product=extractBusinessDocument(`
    <section><h2>Valmistajan tiedot</h2>
      <p>Mühle GmbH, Hauptstrasse 18, 08328 Germany</p>
      <p>+49 (0) 37462 652-0</p>
      <p>service@muehle.example</p>
    </section>
  `,'https://shop.example/products/razor');
  const contact=extractBusinessDocument(`
    <section><h2>Asiakaspalvelu</h2>
      <p>asiakas@shop.example</p>
      <p>+358 40 123 4567</p>
      <p>Osoite: Kauppakatu 4, 33100 Tampere</p>
    </section>
  `,'https://shop.example/contact');
  const profile=essentialWebsiteProfile({finalUrl:'https://shop.example/',pageDocuments:[product,contact]});
  assert.equal(profile.email,'asiakas@shop.example');
  assert.match(profile.phone,/\+358\s*40\s*123\s*4567/);
  assert.match(profile.address,/Kauppakatu 4, 33100 Tampere/);
  assert.doesNotMatch([profile.phone,profile.email,profile.address].join(' '),/\+49|muehle|Hauptstrasse/i);
});

test('profile service summary does not append stray service-word fragments',()=>{
  const doc=extractBusinessDocument(`
    <section><h2>Hinnasto</h2>
      <p>Hiustenleikkaus 31€</p>
      <p>Parran muotoilu 33€</p>
    </section>
    <section><h2>Info</h2>
      <p>My M Room -palvelussa</p>
      <p>hiustenleikkauspalveluista</p>
    </section>
  `,'https://example.fi/');
  const profile=essentialWebsiteProfile({finalUrl:'https://example.fi/',pageDocuments:[doc]});
  assert.match(profile.services,/Hiustenleikkaus/i);
  assert.match(profile.services,/Parran muotoilu/i);
  assert.doesNotMatch(profile.services,/palvelussa|palveluista/i);
});
