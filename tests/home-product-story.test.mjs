import test from 'node:test';
import assert from 'node:assert/strict';
import {appleHomeMarkup} from '../public/apple-home.js';
import {productStoryMarkup} from '../public/home-product-story.js';

for (const [index, language, title] of [
  [0,'fi','Yrityksesi'],
  [1,'sv','Ditt företag'],
  [2,'en','Your company']
]) {
  test('website chatbot example and production journey in '+language, () => {
    const render = (...messages) => messages[index];
    const html = productStoryMarkup(render,language)+'<section id="pricing"></section>';
    const story = html.match(/<section class="rs-product-story"[\s\S]*?<\/section>/)?.[0];
    assert.ok(story);
    assert.ok(html.indexOf(story) < html.indexOf('id="pricing"'));
    assert.match(appleHomeMarkup(render,language,0),/rs-studio-orbit-art/);
    assert.ok(story.includes('<strong>'+title+'</strong>'));
    assert.doesNotMatch(story,/Respondo AI|<iframe\b|<form\b|<button\b/i);
    assert.ok(story.includes('/assistant?lang='+language));
    assert.match(story,/rs-product-source[\s\S]*rs-product-calendar/);
  });

  test('lead, handoff and store scenes use the company name and real links in '+language, () => {
    const render = (...messages) => messages[index];
    const pricing = '<section id="pricing"></section>';
    const html = productStoryMarkup(render,language)+pricing;
    const journeys = html.match(/<section class="rs-product-journeys"[\s\S]*?<\/section>/)?.[0];
    assert.ok(journeys);
    assert.ok(html.indexOf(journeys) < html.indexOf(pricing));
    assert.deepEqual([...journeys.matchAll(/data-rs-journey="([^"]+)"/g)].map(match => match[1]), ['lead','handoff','commerce']);
    const scenes = [...journeys.matchAll(/<article\b[\s\S]*?<\/article>/g)];
    for (const [scene] of scenes) {
      assert.ok(scene.includes('<strong>'+title+'</strong>'));
      assert.match(scene,/<dl class="rs-product-journey-result">/);
    }
    assert.match(scenes[1][0], /rs-product-agent-reply/);
    assert.match(scenes[2][0], /rs-product-example-price/);
    assert.doesNotMatch(journeys, /Respondo AI|<iframe\b|<form\b|<button\b/i);
    const features = ['/ominaisuudet','/funktioner','/features'][index];
    assert.ok(journeys.includes(`href="${features}?lang=${language}"`));
    assert.ok(journeys.includes(`href="/verkkokauppa-chatbot?lang=${language}"`));
  });
}
