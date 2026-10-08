import { extractBusinessDocument, essentialWebsiteCandidates, essentialWebsiteProfile, usableWebsiteRow, parseProductKnowledgeRow, decodeHtml, isConcreteServiceLabel } from './website-knowledge.mjs';
import { buildRespondoFaqRows } from './respondo-faq.mjs';
import { buildIntentUtteranceSeed, classifyIntentByGrammar, INTENT_UTTERANCE_SEED_VERSION, normalizeIntentPhrase } from './intent-utterances.mjs';
import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import dns from 'dns/promises';
import net from 'net';
import http from 'http';
import https from 'https';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pg from 'pg';
import Stripe from 'stripe';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
const PORT = Number(process.env.PORT || 3000);
const BASE = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const SEO_CANONICAL_ORIGIN = (() => {
  // Production SEO/GEO must always point to the public www domain.
  // Railway remains a valid technical entry host, but never a canonical source.
  const preferred = process.env.NODE_ENV === 'production'
    ? 'https://www.respondoai.fi'
    : (String(process.env.RESPONDO_CANONICAL_URL || '').trim() || BASE);
  try {
    return new URL(preferred).origin.replace(/\/$/, '');
  } catch {
    return process.env.NODE_ENV === 'production' ? 'https://www.respondoai.fi' : BASE;
  }
})();

const SEO_INDEXABLE_PATHS = new Set([
  '/',
  '/ominaisuudet',
  '/features',
  '/funktioner',
  '/asiakaspalvelubotti',
  '/verkkokauppa-chatbot',
  '/ajanvaraus-chatbot',
  '/hinnat',
  '/yhteystiedot',
  '/tietoturva',
  '/kayttoehdot',
  '/tietosuoja',
  '/evasteet',
  '/dpa',
]);

const SEO_APP_PATHS = new Set([
  '/assistant',
  '/tilaus',
  '/kirjaudu',
  '/maksu-valmis',
  '/app',
]);

const SEO_META = {
  fi: {
    '/': ['AI-asiakaspalvelubotti yrityksille | Respondo AI', 'Respondo AI vastaa verkkosivusi asiakkaiden kysymyksiin 24/7 yrityksesi tiedoilla, kerää yhteydenottoja ja tukee ajanvarausta. Kokeile 3 päivää maksutta.'],
    '/ominaisuudet': ['AI-asiakaspalvelubotin ominaisuudet | Respondo AI', 'Tutustu Respondon ominaisuuksiin: verkkosivubotti, yrityksen oma tietopohja, yhteydenotot, ajanvaraus, keskustelut ja asiakaspalvelun hallinta yhdessä paikassa.'],
    '/asiakaspalvelubotti': ['Asiakaspalvelubotti yritykselle | Respondo AI', 'Asiakaspalvelubotti yrityksen verkkosivuille: vastaukset 24/7 omilla yritystiedoillasi, liidit, ajanvaraus ja tarvittaessa siirto ihmiselle.'],
    '/verkkokauppa-chatbot': ['Chatbot verkkokauppaan | Respondo AI', 'Verkkokaupan chatbot auttaa tuote-, hinta-, toimitus- ja palautuskysymyksissä sekä tukee Shopify- ja WooCommerce-asiakaspalvelua.'],
    '/ajanvaraus-chatbot': ['Ajanvaraus-chatbot yritykselle | Respondo AI', 'Ajanvaraus-chatbot vastaa asiakkaiden kysymyksiin, kerää ajanvarauspyyntöjä ja tukee kalenteripohjaisia asiakaspalveluprosesseja 24/7.'],
    '/hinnat': ["Hinnat | Respondo AI", "Vertaile Starter-, Advanced- ja Business-tilauspaketteja. Kolmen päivän maksuton kokeilu kaikissa paketeissa."],
    '/tietoturva': ['Tietoturva ja tietosuoja | Respondo AI', 'Näin Respondo suojaa yrityksen ja asiakkaiden tietoja, kirjautumisia, integraatioita ja palvelun käyttöä.'],
    '/kayttoehdot': ['Käyttöehdot | Respondo AI', 'Respondo AI -palvelun käyttöehdot yritysasiakkaille.'],
    '/tietosuoja': ['Tietosuojaseloste | Respondo AI', 'Tietosuojaseloste kertoo, mitä henkilötietoja Respondo käsittelee, miksi niitä käsitellään ja miten tiedot suojataan.'],
    '/evasteet': ['Evästeet | Respondo AI', 'Tietoa Respondon välttämättömistä evästeistä, valinnaisesta kävijätilastoinnista ja evästevalintojen hallinnasta.'],
    '/dpa': ['Tietojenkäsittely | Respondo AI', 'Tietoa henkilötietojen käsittelystä, kun Respondo toimii yritysasiakkaan henkilötietojen käsittelijänä.'],
  },
  sv: {
    '/': ['AI-kundservicebot för företag | Respondo AI', 'Respondo AI svarar på webbplatsens kundfrågor dygnet runt med företagets egna uppgifter, samlar kontaktförfrågningar och stöder bokningar. Prova gratis i 3 dagar.'],
    '/ominaisuudet': ['Funktioner för AI-kundservicebot | Respondo AI', 'Se Respondos funktioner för kundservice, kunskapsbas, kontaktförfrågningar, bokningar och kunddialoger.'],
    '/asiakaspalvelubotti': ['Kundservicebot för företag | Respondo AI', 'Kundservicebot för företagets webbplats: svar dygnet runt med företagets egna uppgifter, leads, bokning och överlämning till människa.'],
    '/verkkokauppa-chatbot': ['Chatbot för webbutik | Respondo AI', 'En chatbot för webbutik hjälper med produkt-, pris-, leverans- och returfrågor samt stödjer Shopify- och WooCommerce-kundservice.'],
    '/ajanvaraus-chatbot': ['Bokningschatbot för företag | Respondo AI', 'En bokningschatbot svarar på kundfrågor, samlar bokningsförfrågningar och stödjer kalenderbaserade kundserviceflöden dygnet runt.'],
    '/hinnat': ["Priser | Respondo AI", "Jämför abonnemangen Starter, Advanced och Business. Alla paket har tre dagars gratis provperiod."],
    '/tietoturva': ['Datasäkerhet och integritet | Respondo AI', 'Så skyddar Respondo företags- och kunddata, inloggningar, integrationer och användningen av tjänsten.'],
    '/kayttoehdot': ['Användarvillkor | Respondo AI', 'Användarvillkor för Respondo AI:s företagstjänst.'],
    '/tietosuoja': ['Integritetspolicy | Respondo AI', 'Information om vilka personuppgifter Respondo behandlar, varför de behandlas och hur de skyddas.'],
    '/evasteet': ['Cookies | Respondo AI', 'Information om nödvändiga cookies, valfri besöksstatistik och hantering av cookieinställningar.'],
    '/dpa': ['Databehandling | Respondo AI', 'Information om personuppgiftsbehandling när Respondo fungerar som personuppgiftsbiträde för företagskunden.'],
  },
  en: {
    '/': ['AI Customer Service Bot for Businesses | Respondo AI', 'Respondo AI answers website customer questions 24/7 using company-approved information, captures contact requests and supports bookings. Try it free for 3 days.'],
    '/ominaisuudet': ['AI Customer Service Bot Features | Respondo AI', 'Explore Respondo features for customer service, your knowledge base, contact requests, bookings and customer conversations.'],
    '/asiakaspalvelubotti': ['Customer Service Bot for Business | Respondo AI', 'A customer service bot for business websites: 24/7 answers from your approved company information, lead capture, bookings and human handoff.'],
    '/verkkokauppa-chatbot': ['Ecommerce Chatbot for Online Stores | Respondo AI', 'An ecommerce chatbot helps with product, price, delivery and return questions and supports Shopify and WooCommerce customer service.'],
    '/ajanvaraus-chatbot': ['Booking Chatbot for Business | Respondo AI', 'A booking chatbot answers customer questions, captures booking requests and supports calendar-based customer-service workflows around the clock.'],
    '/hinnat': ["Pricing | Respondo AI", "Compare Starter, Advanced and Business plans. Every plan includes a three-day free trial."],
    '/tietoturva': ['Security and Privacy | Respondo AI', 'See how Respondo protects company and customer data, sign-ins, integrations and service usage.'],
    '/kayttoehdot': ['Terms of Service | Respondo AI', 'Terms of service for Respondo AI business customers.'],
    '/tietosuoja': ['Privacy Policy | Respondo AI', 'Learn what personal data Respondo processes, why it is processed and how it is protected.'],
    '/evasteet': ['Cookies | Respondo AI', 'Information about necessary cookies, optional visitor analytics and cookie preference management.'],
    '/dpa': ['Data Processing | Respondo AI', 'Information about personal-data processing when Respondo acts as a processor for a business customer.'],
  },
};

function seoLanguageForRequest(req) {
  if (req.path === '/features') return 'en';
  if (req.path === '/funktioner') return 'sv';
  const value = String(req.query?.lang || '').toLowerCase();
  return ['fi','sv','en'].includes(value) ? value : 'fi';
}

function seoCanonicalPath(pathname, lang='fi') {
  if (['/ominaisuudet','/features','/funktioner'].includes(pathname)) {
    return lang === 'en' ? '/features' : lang === 'sv' ? '/funktioner' : '/ominaisuudet';
  }
  return pathname;
}

function seoMetaPath(pathname) {
  return ['/features','/funktioner'].includes(pathname) ? '/ominaisuudet' : pathname;
}

function seoLanguageUrls(pathname) {
  const metaPath = seoMetaPath(pathname);
  const build = (lang) => {
    const path = metaPath === '/ominaisuudet'
      ? (lang === 'en' ? '/features' : lang === 'sv' ? '/funktioner' : '/ominaisuudet')
      : metaPath;
    const url = new URL(SEO_CANONICAL_ORIGIN + path);
    if (lang !== 'fi' && metaPath !== '/ominaisuudet') url.searchParams.set('lang', lang);
    return url.toString();
  };
  return { fi:build('fi'), sv:build('sv'), en:build('en') };
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function seoMetaForRequest(req) {
  const lang = seoLanguageForRequest(req);
  const rawPath = req.path || '/';
  const canonicalPath = seoCanonicalPath(rawPath, lang);
  const metaPath = seoMetaPath(rawPath);
  const languageMeta = SEO_META[lang] || SEO_META.fi;
  const fallback = languageMeta['/'];
  const pair = languageMeta[metaPath] || fallback;
  const isIndexable = SEO_INDEXABLE_PATHS.has(rawPath);
  const isKnown = isIndexable || SEO_APP_PATHS.has(rawPath);
  const origin = SEO_CANONICAL_ORIGIN;
  const canonicalUrl = new URL(origin + canonicalPath);
  if (lang !== 'fi' && !['/features','/funktioner'].includes(canonicalPath)) {
    canonicalUrl.searchParams.set('lang', lang);
  }
  return {
    lang,
    title: pair[0],
    description: pair[1],
    robots: isIndexable ? 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' : 'noindex,nofollow',
    canonical: canonicalUrl.toString(),
    origin,
    isKnown,
    alternates:seoLanguageUrls(rawPath),
  };
}

function seoStructuredData(seo) {
  const languageNames = { fi:'Finnish', sv:'Swedish', en:'English' };
  const softwareDescription = SEO_META[seo.lang]?.['/']?.[1] || SEO_META.fi['/'][1];
  const graph = [
    {
      '@type':'Organization',
      '@id':SEO_CANONICAL_ORIGIN + '/#organization',
      name:'Respondo AI',
      alternateName:'RESPONDO AI',
      url:SEO_CANONICAL_ORIGIN + '/',
      description:'B2B customer service software for websites with automated answers, knowledge-base management, lead capture, bookings and human takeover.',
      logo:{ '@type':'ImageObject', url:SEO_CANONICAL_ORIGIN + '/favicon.svg' },
      identifier:{ '@type':'PropertyValue', propertyID:'Business ID', value:'3599437-5' },
      contactPoint:{ '@type':'ContactPoint', contactType:'customer support', email:'info@respondoai.fi', availableLanguage:['fi','sv','en'] },
      knowsAbout:['AI customer service','customer service automation','website chatbot','business chatbot','lead capture','booking workflows','ecommerce customer service'],
    },
    {
      '@type':'WebSite',
      '@id':SEO_CANONICAL_ORIGIN + '/#website',
      url:SEO_CANONICAL_ORIGIN + '/',
      name:'Respondo AI',
      publisher:{ '@id':SEO_CANONICAL_ORIGIN + '/#organization' },
      inLanguage:['fi','sv','en'],
    },
    {
      '@type':['SoftwareApplication','WebApplication'],
      '@id':SEO_CANONICAL_ORIGIN + '/#software',
      name:'Respondo AI',
      url:SEO_CANONICAL_ORIGIN + '/',
      applicationCategory:'BusinessApplication',
      operatingSystem:'Web',
      browserRequirements:'Requires a modern web browser',
      description:softwareDescription,
      inLanguage:['fi','sv','en'],
      availableLanguage:['Finnish','Swedish','English'],
      audience:{ '@type':'BusinessAudience', audienceType:'Businesses with a website' },
      featureList:[
        '24/7 website customer service bot',
        'Company-specific knowledge base',
        'Website information import',
        'Lead and contact request capture',
        'Booking requests and calendar workflows',
        'Human takeover and employee accounts',
        'Finnish, Swedish and English customer conversations',
        'Shopify and WooCommerce commerce workflows'
      ],
      offers:[
        { '@type':'Offer', name:'Respondo Starter', price:'29.90', priceCurrency:'EUR', url:SEO_CANONICAL_ORIGIN + '/tilaus' },
        { '@type':'Offer', name:'Respondo Advanced', price:'39.90', priceCurrency:'EUR', url:SEO_CANONICAL_ORIGIN + '/tilaus' },
        { '@type':'Offer', name:'Respondo Business', price:'49.90', priceCurrency:'EUR', url:SEO_CANONICAL_ORIGIN + '/tilaus' }
      ],
      publisher:{ '@id':SEO_CANONICAL_ORIGIN + '/#organization' },
    },
    {
      '@type':'WebPage',
      '@id':seo.canonical + '#webpage',
      url:seo.canonical,
      name:seo.title,
      description:seo.description,
      inLanguage:seo.lang,
      isPartOf:{ '@id':SEO_CANONICAL_ORIGIN + '/#website' },
      about:{ '@id':SEO_CANONICAL_ORIGIN + '/#software' },
      mainEntity:{ '@id':SEO_CANONICAL_ORIGIN + '/#software' },
      keywords: seo.lang === 'fi'
        ? 'asiakaspalvelubotti, AI asiakaspalvelu, chatbot yritykselle, verkkosivubotti, asiakaspalveluautomaatio'
        : seo.lang === 'sv'
          ? 'kundservicebot, AI kundservice, chatbot för företag, webbplatsbot, kundserviceautomatisering'
          : 'customer service bot, AI customer service, business chatbot, website chatbot, customer service automation',
      publisher:{ '@id':SEO_CANONICAL_ORIGIN + '/#organization' },
    }
  ];
  try {
    const pagePath = new URL(seo.canonical).pathname;
    if (pagePath !== '/') {
      graph.push({
        '@type':'BreadcrumbList',
        '@id':seo.canonical + '#breadcrumbs',
        itemListElement:[
          { '@type':'ListItem', position:1, name:'Respondo AI', item:SEO_CANONICAL_ORIGIN + '/' },
          { '@type':'ListItem', position:2, name:seo.title.replace(/\\s*\\|\\s*Respondo AI$/i,''), item:seo.canonical }
        ]
      });
    }
  } catch {}
  return JSON.stringify({ '@context':'https://schema.org', '@graph':graph }).replace(/</g,'\\u003c');
}

function seoNoScriptMarkup(seo, rawPath) {
  if (!SEO_INDEXABLE_PATHS.has(rawPath)) return '';
  const featurePage=['/ominaisuudet','/features','/funktioner'].includes(rawPath);
  if (featurePage) {
    if (seo.lang === 'sv') return '<noscript><main><h1>AI-kundservicebot för företag</h1><p>Respondo AI automatiserar kundservice på företagets webbplats med företagets egna godkända uppgifter.</p><ul><li>Kunskapsbas</li><li>Webbplatsimport</li><li>Kontakt- och offertförfrågningar</li><li>Bokningsstöd</li><li>Mänsklig övertagning</li></ul><p><a href="/tilaus">Prova gratis i 3 dagar</a></p></main></noscript>';
    if (seo.lang === 'en') return '<noscript><main><h1>AI customer service bot for businesses</h1><p>Respondo AI automates customer service on business websites using company-approved information.</p><ul><li>Knowledge base</li><li>Website information import</li><li>Contact and quote requests</li><li>Booking support</li><li>Human takeover</li></ul><p><a href="/tilaus">Try free for 3 days</a></p></main></noscript>';
    return '<noscript><main><h1>AI-asiakaspalvelubotti yrityksille</h1><p>Respondo AI automatisoi verkkosivujen asiakaspalvelua yrityksen omilla hyväksytyillä tiedoilla.</p><ul><li>Tietopohja</li><li>Verkkosivun tietojen tuonti</li><li>Yhteydenotto- ja tarjouspyynnöt</li><li>Ajanvarauksen tuki</li><li>Keskustelun siirto ihmiselle</li></ul><p><a href="/tilaus">Kokeile 3 päivää maksutta</a></p></main></noscript>';
  }
  if (rawPath === '/asiakaspalvelubotti') {
    if (seo.lang === 'sv') return '<noscript><main><h1>Kundservicebot för företag 24/7</h1><p>Respondo AI svarar på återkommande kundfrågor på företagets webbplats med företagets egna godkända uppgifter. Kunden kan fråga med egna ord om till exempel tjänster, priser, öppettider och kontaktvägar.</p><h2>Automatiserad kundservice med mänsklig överlämning</h2><p>När information saknas kan kunden lämna kontaktuppgifter eller konversationen gå vidare till en människa.</p><p><a href="/funktioner">Se alla funktioner</a> · <a href="/tilaus">Prova gratis i 3 dagar</a></p></main></noscript>';
    if (seo.lang === 'en') return '<noscript><main><h1>Customer service bot for businesses 24/7</h1><p>Respondo AI answers recurring customer questions on a business website using company-approved information. Visitors can ask in their own words about services, prices, opening hours and contact options.</p><h2>Automated support with human handoff</h2><p>When information is missing, the customer can leave contact details or the conversation can move to a person.</p><p><a href="/features">See all features</a> · <a href="/tilaus">Try free for 3 days</a></p></main></noscript>';
    return '<noscript><main><h1>Asiakaspalvelubotti yritykselle 24/7</h1><p>Respondo AI vastaa yrityksen verkkosivulla toistuviin asiakaskysymyksiin yrityksen omilla hyväksytyillä tiedoilla. Asiakas voi kysyä omin sanoin esimerkiksi palveluista, hinnoista, aukioloajoista ja yhteydenotosta.</p><h2>Automaattinen asiakaspalvelu ja siirto ihmiselle</h2><p>Jos tieto puuttuu, asiakas voi jättää yhteystietonsa tai keskustelu voidaan siirtää ihmiselle.</p><p><a href="/ominaisuudet">Katso kaikki ominaisuudet</a> · <a href="/tilaus">Kokeile 3 päivää maksutta</a></p></main></noscript>';
  }
  if (rawPath === '/verkkokauppa-chatbot') {
    if (seo.lang === 'sv') return '<noscript><main><h1>Chatbot för webbutik</h1><p>Respondo AI kan använda webbutikens godkända information för att hjälpa kunder med produkter, priser, leveranser, returer och kontaktfrågor.</p><h2>Snabbare svar före köp</h2><p>Relevant produkt- och köpinformation kan visas i samma konversation utan att kunden behöver vänta på manuell kundservice.</p><p><a href="/funktioner">Se funktionerna</a> · <a href="/tilaus">Prova gratis i 3 dagar</a></p></main></noscript>';
    if (seo.lang === 'en') return '<noscript><main><h1>Ecommerce chatbot for online stores</h1><p>Respondo AI can use approved store information to help shoppers with products, prices, shipping, returns and contact questions.</p><h2>Faster answers before purchase</h2><p>Relevant product and purchase information can be surfaced in the same conversation without waiting for manual support.</p><p><a href="/features">See features</a> · <a href="/tilaus">Try free for 3 days</a></p></main></noscript>';
    return '<noscript><main><h1>Chatbot verkkokauppaan</h1><p>Respondo AI voi käyttää verkkokaupan hyväksyttyjä tietoja ja auttaa asiakkaita tuotteisiin, hintoihin, toimituksiin, palautuksiin ja yhteydenottoon liittyvissä kysymyksissä.</p><h2>Nopeammat vastaukset ennen ostoa</h2><p>Olennainen tuote- ja ostotieto voidaan näyttää samassa keskustelussa ilman manuaalisen asiakaspalvelun odottamista.</p><p><a href="/ominaisuudet">Katso ominaisuudet</a> · <a href="/tilaus">Kokeile 3 päivää maksutta</a></p></main></noscript>';
  }
  if (rawPath === '/ajanvaraus-chatbot') {
    if (seo.lang === 'sv') return '<noscript><main><h1>Bokningschatbot för företag</h1><p>Respondo AI kan hjälpa webbplatsbesökaren att gå från en fråga till en bokningsförfrågan och visa tillgängliga tider när företaget har konfigurerat dem.</p><h2>Från kundfråga till bokning</h2><p>Kunden kan först få svar och sedan fortsätta till bokning eller mänsklig kundservice när det behövs.</p><p><a href="/funktioner">Se funktionerna</a> · <a href="/tilaus">Prova gratis i 3 dagar</a></p></main></noscript>';
    if (seo.lang === 'en') return '<noscript><main><h1>Booking chatbot for businesses</h1><p>Respondo AI can help a website visitor move from a question to a booking request and show available times when the business has configured them.</p><h2>From customer question to booking</h2><p>The customer can get an answer first and then continue to booking or human support when needed.</p><p><a href="/features">See features</a> · <a href="/tilaus">Try free for 3 days</a></p></main></noscript>';
    return '<noscript><main><h1>Ajanvaraus-chatbot yritykselle</h1><p>Respondo AI voi auttaa verkkosivuasiakasta siirtymään kysymyksestä ajanvarauspyyntöön ja näyttää vapaita aikoja, kun yritys on määrittänyt ne palveluun.</p><h2>Asiakaskysymyksestä ajanvaraukseen</h2><p>Asiakas voi saada ensin vastauksen ja jatkaa sen jälkeen ajanvaraukseen tai ihmisen asiakaspalveluun tarvittaessa.</p><p><a href="/ominaisuudet">Katso ominaisuudet</a> · <a href="/tilaus">Kokeile 3 päivää maksutta</a></p></main></noscript>';
  }
  if (rawPath === '/') {
    if (seo.lang === 'sv') return '<noscript><main><h1>AI-kundservicebot för företag 24/7</h1><p>Respondo AI svarar på kundfrågor med företagets egna uppgifter, samlar kontaktförfrågningar och stöder bokningar.</p><p>Starter 29,90 €/mån · Advanced 39,90 €/mån · Business 49,90 €/mån.</p><p><a href="/funktioner">Se funktionerna</a></p></main></noscript>';
    if (seo.lang === 'en') return '<noscript><main><h1>AI customer service bot for businesses 24/7</h1><p>Respondo AI answers customer questions with company-approved information, captures contact requests and supports bookings.</p><p>Starter €29.90/month · Advanced €39.90/month · Business €49.90/month.</p><p><a href="/features">See features</a></p></main></noscript>';
    return '<noscript><main><h1>AI-asiakaspalvelubotti yrityksille 24/7</h1><p>Respondo AI vastaa asiakkaiden kysymyksiin yrityksen omilla tiedoilla, kerää yhteydenottoja ja tukee ajanvarausta.</p><p>Starter 29,90 €/kk · Advanced 39,90 €/kk · Business 49,90 €/kk.</p><p><a href="/ominaisuudet">Katso ominaisuudet</a></p></main></noscript>';
  }
  return '<noscript><main><h1>' + escapeHtml(seo.title.replace(/\\s*\\|\\s*Respondo AI$/i,'')) + '</h1><p>' + escapeHtml(seo.description) + '</p><p><a href="' + SEO_CANONICAL_ORIGIN + '/">Respondo AI</a></p></main></noscript>';
}

let cachedIndexHtml = '';
async function renderIndexHtml(req) {
  if (!cachedIndexHtml) {
    cachedIndexHtml = await fs.readFile(path.join(__dirname, 'public', 'index.html'), 'utf8');
  }
  const seo = seoMetaForRequest(req);
  let html = cachedIndexHtml
    .replace(/<html\b[^>]*lang="[^"]*"[^>]*>/i, '<html lang="' + escapeHtml(seo.lang) + '">')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i, '')
    .replace(/<title>[\s\S]*?<\/title>/i, '<title>' + escapeHtml(seo.title) + '</title>')
    .replace(/<meta name="description" content="[^"]*">/i, '<meta name="description" content="' + escapeHtml(seo.description) + '">')
    .replace(/<meta name="robots" content="[^"]*">/i, '<meta name="robots" content="' + escapeHtml(seo.robots) + '">')
    .replace(/<meta property="og:title" content="[^"]*">/i, '<meta property="og:title" content="' + escapeHtml(seo.title) + '">')
    .replace(/<meta property="og:description" content="[^"]*">/i, '<meta property="og:description" content="' + escapeHtml(seo.description) + '">')
    .replace(/<meta name="twitter:title" content="[^"]*">/i, '<meta name="twitter:title" content="' + escapeHtml(seo.title) + '">')
    .replace(/<meta name="twitter:description" content="[^"]*">/i, '<meta name="twitter:description" content="' + escapeHtml(seo.description) + '">');

  const verification = String(process.env.GOOGLE_SITE_VERIFICATION || '').trim();
  const extraHead = [
    '<link rel="canonical" href="' + escapeHtml(seo.canonical) + '">',
    '<link rel="alternate" hreflang="fi" href="' + escapeHtml(seo.alternates.fi) + '" data-respondo-hreflang="1">',
    '<link rel="alternate" hreflang="sv" href="' + escapeHtml(seo.alternates.sv) + '" data-respondo-hreflang="1">',
    '<link rel="alternate" hreflang="en" href="' + escapeHtml(seo.alternates.en) + '" data-respondo-hreflang="1">',
    '<link rel="alternate" hreflang="x-default" href="' + escapeHtml(seo.alternates.fi) + '" data-respondo-hreflang="1">',
    '<meta property="og:url" content="' + escapeHtml(seo.canonical) + '">',
    '<meta property="og:locale:alternate" content="sv_SE">',
    '<meta property="og:locale:alternate" content="en_GB">',
    '<script type="application/ld+json" id="respondo-seo-schema">' + seoStructuredData(seo) + '</script>',
    verification ? '<meta name="google-site-verification" content="' + escapeHtml(verification) + '">' : '',
  ].filter(Boolean).join('\n');

  html = html.replace('</head>', extraHead + '\n</head>');
  html = html.replace('<div id="app"></div>', '<div id="app">' + seoNoScriptMarkup(seo, req.path) + '</div>');


  return { html, seo };
}


const pool = process.env.DATABASE_URL
  ? new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    })
  : null;
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
// Respondo is currently not registered for Finnish VAT due to small-scale business activity.
// This applies to new Finnish domestic subscriptions only; international sales
// and VAT-registration thresholds require separate monitoring.
// Do not silently assume an overseas sale is tax-free: the seller has no foreign
// VAT/GST/sales-tax registrations in Stripe, and Stripe Tax is not enabled.
// Country approval requires confirming local obligations and updating this policy.
const TAX_CHECKOUT_COUNTRIES = new Set(['FI']);
const TAX_COUNTRY_POLICY_VERSION = 'fi-only-20261008';
function checkoutCountryPolicy(input) {
  const country = String(input || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    return { ok:false, country, error:'Valitse yrityksen laskutusmaa ennen tilauksen aloittamista.' };
  }
  if (!TAX_CHECKOUT_COUNTRIES.has(country)) {
    return { ok:false, country, error:'Kansainvälisten tilausten verotus tarkistetaan maakohtaisesti. Tilaus on toistaiseksi saatavilla vain Suomessa. Ota yhteyttä info@respondoai.fi.' };
  }
  return { ok:true, country };
}
function checkoutIsCountryPolicyCompliant(session) {
  if (session?.metadata?.tax_country_policy !== TAX_COUNTRY_POLICY_VERSION) return true; // Pre-existing checkouts.
  const stated = String(session.metadata?.billing_country || '').toUpperCase();
  const actual = String(session.customer_details?.address?.country || '').toUpperCase();
  return stated && actual && actual === stated && TAX_CHECKOUT_COUNTRIES.has(actual);
}
async function enforceCompletedCheckoutCountryPolicy(session) {
  if (checkoutIsCountryPolicyCompliant(session)) return true;
  // Subscriptions can be trialing. Cancel before the first renewal, and fail closed.
  const subscriptionId = typeof session?.subscription === 'string' ? session.subscription : session?.subscription?.id;
  if (subscriptionId && stripe) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (!['canceled','incomplete_expired'].includes(subscription.status)) {
      await stripe.subscriptions.cancel(subscriptionId);
    }
  }
  console.error('Checkout country mismatch; subscription blocked', {
    checkoutSessionId:session?.id,
    declaredCountry:session?.metadata?.billing_country,
    billedCountry:session?.customer_details?.address?.country,
  });
  return false;
}
function checkoutTaxExemptionMessage(lang='fi') {
  const safeLang = ['fi','sv','en'].includes(String(lang || '').toLowerCase())
    ? String(lang).toLowerCase() : 'fi';
  if (safeLang === 'sv') return 'Ingen moms debiteras. Säljaren är inte momsregistrerad på grund av verksamhet i liten skala.';
  if (safeLang === 'en') return 'No VAT is charged. The seller is not VAT-registered due to small-scale business activity.';
  return 'Arvonlisäveroa ei peritä. Myyjä ei ole alv-rekisterissä vähäisen liiketoiminnan vuoksi.';
}
if (process.env.NODE_ENV === 'production') {
  if (!String(process.env.JWT_SECRET || '').trim()) {
    throw new Error('JWT_SECRET is required in production.');
  }
  if (!String(process.env.DATABASE_URL || '').trim()) {
    throw new Error('DATABASE_URL is required in production.');
  }
  if (!String(process.env.STRIPE_SECRET_KEY || '').trim() || !String(process.env.STRIPE_WEBHOOK_SECRET || '').trim()) {
    throw new Error('Stripe billing configuration is required in production.');
  }
  if (!productionStripePricesConfigured()) {
    throw new Error('All six live Stripe price IDs are required in production.');
  }
  let productionBase;
  try { productionBase = new URL(BASE); } catch {}
  if (!productionBase || productionBase.protocol !== 'https:' || !productionBase.hostname) {
    throw new Error('BASE_URL must be a valid HTTPS URL in production.');
  }
}
const JWT = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex');
const COOKIE = 'respondo_session';
const SIGNUP_CHECKOUT_COOKIE = 'respondo_signup_checkout';
const SIGNUP_VERIFY_PENDING_COOKIE = 'respondo_signup_verify_pending';
const SIGNUP_VERIFY_PROOF_COOKIE = 'respondo_signup_verify_proof';
const SIGNUP_VERIFY_TTL_MS = 15 * 60 * 1000;
const SIGNUP_VERIFY_PROOF_TTL_MS = 45 * 60 * 1000;

function signupEmailVerificationReady() {
  return Boolean(
    String(process.env.RESEND_API_KEY || '').trim() &&
    String(process.env.EMAIL_VERIFICATION_FROM || '').trim()
  );
}

function signupVerifyCookieOptions(maxAge) {
  return {
    httpOnly:true,
    secure:process.env.NODE_ENV === 'production',
    sameSite:'lax',
    path:'/',
    maxAge,
  };
}

function validSignupVerificationProof(req, email) {
  try {
    const token = cookies(req)[SIGNUP_VERIFY_PROOF_COOKIE];
    const payload = jwt.verify(token, JWT, { algorithms:['HS256'] });
    return payload.type === 'signup-email-verified' && payload.email === cleanEmail(email);
  } catch {
    return false;
  }
}


const q = (text, params = []) => {
  if (!pool) throw new Error('Tietokantaa ei ole vielä yhdistetty.');
  return pool.query(text, params);
};

const INTENT_VIRTUAL_TARGET_PER_LANGUAGE = 1000000;
const INTENT_VIRTUAL_SEED_VERSION = '2026-10-07-virtual-million-v1';
let intentUtteranceCache = new Map();

const INTENT_VARIANT_WRAPPERS = {
  fi:{
    prefixes:['haluaisin viela kysya','voisitteko kertoa','osaatteko neuvoa','minulla olisi kysymys','haluaisin varmistaa','voitteko selventaa','tarvitsisin tietoa','olen miettinyt','kertoisitteko','voisinko saada tietoa','auttaisitteko tassa','yritan selvittaa','pieni tarkennus','viela yksi asia','ennen kuin etenen','asiakkaana haluaisin tietaa'],
    suffixes:['kiitos paljon','jos vain mahdollista','ennen kuin paatan','ennen tilausta','ennen kuin etenen','ihan varmuuden vuoksi','olisi hyva tietaa','haluaisin varmistaa taman','asiakkaana','ennen ostoa','ennen varausta','mahdollisimman pian','selkeasti','lyhyesti','tarkemmin','kiitos avusta']
  },
  sv:{
    prefixes:['jag skulle vilja fraga','kan ni beratta','kan ni rada mig','jag har en fraga','jag vill forsakra mig','kan ni forklara','jag behover information','jag har funderat pa','skulle ni kunna beratta','kan jag fa information','kan ni hjalpa mig med detta','jag forsoker ta reda pa','en liten precisering','en sak till','innan jag gar vidare','som kund vill jag veta'],
    suffixes:['tack sa mycket','om det ar mojligt','innan jag bestammer mig','fore bestallningen','innan jag gar vidare','for sakerhets skull','det vore bra att veta','jag vill forsakra mig om detta','som kund','fore kopet','fore bokningen','sa snart som mojligt','tydligt','kortfattat','mer detaljerat','tack for hjalpen']
  },
  en:{
    prefixes:['i would like to ask','could you tell me','could you advise me','i have a question','i want to make sure','could you clarify','i need some information','i have been wondering','would you tell me','could i get information','could you help me with this','i am trying to find out','a small clarification','one more thing','before i continue','as a customer i would like to know'],
    suffixes:['thank you very much','if possible','before i decide','before ordering','before i continue','just to make sure','it would be good to know','i want to confirm this','as a customer','before buying','before booking','as soon as possible','clearly','briefly','in more detail','thanks for the help']
  }
};

function intentWrapperCandidates(value, language) {
  const normalized=normalizeIntentPhrase(value);
  if(!normalized) return [];
  const wrappers=INTENT_VARIANT_WRAPPERS[language] || {prefixes:[],suffixes:[]};
  const candidates=new Set([normalized]);

  const expand=(input)=>{
    for(const prefix of wrappers.prefixes){
      const p=normalizeIntentPhrase(prefix);
      if(input.startsWith(p+' ')) candidates.add(input.slice(p.length+1).trim());
    }
    for(const suffix of wrappers.suffixes){
      const s=normalizeIntentPhrase(suffix);
      if(input.endsWith(' '+s)) candidates.add(input.slice(0,-(s.length+1)).trim());
    }
  };

  expand(normalized);
  for(const candidate of [...candidates]) expand(candidate);
  return [...candidates].filter(Boolean);
}

function intentForMessage(value, language = '') {
  const normalized = normalizeIntentPhrase(value);
  if (!normalized) return '';
  const requested = ['fi','sv','en'].includes(String(language || '').toLowerCase())
    ? [String(language).toLowerCase()]
    : ['fi','sv','en'];

  for (const lang of requested) {
    for(const candidate of intentWrapperCandidates(normalized,lang)){
      const hit = intentUtteranceCache.get(lang + '|' + candidate);
      if (hit) return hit;
      const grammar=classifyIntentByGrammar(candidate);
      if(grammar) return grammar;
    }
  }
  return classifyIntentByGrammar(normalized);
}

async function resolveIntentForMessage(value, language = '') {
  return intentForMessage(value,language);
}

async function seedAndLoadIntentUtterances() {
  if (!pool) return;
  const marker = await q("SELECT value FROM app_settings WHERE key='intent_utterance_seed_version'");
  const countResult = await q("SELECT COUNT(*)::int AS count FROM intent_utterances WHERE active=TRUE AND source='generated'");
  const count = Number(countResult.rows[0]?.count || 0);
  const needsSeed = marker.rows[0]?.value !== INTENT_UTTERANCE_SEED_VERSION || count < 240000;

  if (needsSeed) {
    const entries = buildIntentUtteranceSeed();
    if (entries.length < 240000) throw new Error('Intent utterance seed is unexpectedly small.');
    await q("DELETE FROM intent_utterances WHERE source='generated'");

    const batchSize = 4000;
    for (let offset = 0; offset < entries.length; offset += batchSize) {
      const batch = entries.slice(offset, offset + batchSize);
      await q(
        `INSERT INTO intent_utterances(language,intent,phrase,normalized,source,active)
         SELECT x.language,x.intent,x.phrase,x.normalized,'generated',TRUE
           FROM UNNEST($1::text[],$2::text[],$3::text[],$4::text[])
                AS x(language,intent,phrase,normalized)
         ON CONFLICT (language,normalized)
         DO UPDATE SET intent=EXCLUDED.intent,phrase=EXCLUDED.phrase,source='generated',active=TRUE`,
        [
          batch.map((x)=>x.language),
          batch.map((x)=>x.intent),
          batch.map((x)=>x.phrase),
          batch.map((x)=>x.normalized),
        ],
      );
    }
    await q(
      "INSERT INTO app_settings(key,value,updated_at) VALUES('intent_utterance_seed_version',$1,NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()",
      [INTENT_UTTERANCE_SEED_VERSION],
    );
  }

  const rows = await q("SELECT language,intent,normalized FROM intent_utterances WHERE active=TRUE AND source='generated'");
  const next = new Map();
  for (const row of rows.rows) {
    const normalized = normalizeIntentPhrase(row.normalized);
    const language = String(row.language || '').toLowerCase();
    const intent = String(row.intent || '').trim();
    if (normalized && ['fi','sv','en'].includes(language) && intent) {
      next.set(language + '|' + normalized, intent);
    }
  }
  intentUtteranceCache = next;
  console.log(`Intent core loaded: ${intentUtteranceCache.size}`);
}

async function seedIntentPhraseTemplates() {
  if(!pool) return;

  // Millions of literal rows pushed this small database into read-only mode.
  // Store the neutral language wrappers once and combine them with the 250k
  // core phrases at match time. This yields tens of millions of distinct
  // understood phrasings while keeping the database small and writable.
  await q('TRUNCATE TABLE intent_phrase_variants');

  for(const language of ['fi','sv','en']){
    const wrappers=INTENT_VARIANT_WRAPPERS[language];
    await q('DELETE FROM intent_phrase_templates WHERE language=$1',[language]);

    const types=[];
    const phrases=[];
    const normalized=[];
    for(const [type,list] of [['prefix',wrappers.prefixes],['suffix',wrappers.suffixes]]){
      for(const phrase of list){
        types.push(type);
        phrases.push(phrase);
        normalized.push(normalizeIntentPhrase(phrase));
      }
    }

    await q(
      `INSERT INTO intent_phrase_templates(language,template_type,phrase,normalized,active)
       SELECT $1,x.template_type,x.phrase,x.normalized,TRUE
         FROM UNNEST($2::text[],$3::text[],$4::text[])
              AS x(template_type,phrase,normalized)
       ON CONFLICT(language,template_type,normalized)
       DO UPDATE SET phrase=EXCLUDED.phrase,active=TRUE`,
      [language,types,phrases,normalized],
    );

    const coreCount=[...intentUtteranceCache.keys()].filter((key)=>key.startsWith(language+'|')).length;
    const capacity=coreCount*(wrappers.prefixes.length+1)*(wrappers.suffixes.length+1);
    if(capacity<INTENT_VIRTUAL_TARGET_PER_LANGUAGE){
      throw new Error(`Virtual intent coverage for ${language} is only ${capacity}`);
    }

    await q(
      `INSERT INTO intent_lexicon_stats(language,core_count,prefix_count,suffix_count,virtual_capacity,target,updated_at)
       VALUES($1,$2,$3,$4,$5,$6,NOW())
       ON CONFLICT(language) DO UPDATE SET
         core_count=EXCLUDED.core_count,
         prefix_count=EXCLUDED.prefix_count,
         suffix_count=EXCLUDED.suffix_count,
         virtual_capacity=EXCLUDED.virtual_capacity,
         target=EXCLUDED.target,
         updated_at=NOW()`,
      [language,coreCount,wrappers.prefixes.length,wrappers.suffixes.length,capacity,INTENT_VIRTUAL_TARGET_PER_LANGUAGE],
    );
    console.log(`Virtual intent coverage ${language}: ${capacity}`);
  }

  await q(
    "INSERT INTO app_settings(key,value,updated_at) VALUES('intent_variant_seed_version',$1,NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()",
    [INTENT_VIRTUAL_SEED_VERSION],
  );
}

const uid = () => crypto.randomUUID();
const cleanEmail = (value) => String(value || '').trim().toLowerCase();

function escapeEmailHtml(value) {
  return String(value || '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}

function brandedEmailHtml({ language='fi', eyebrow='', title='', content='' }) {
  const lang=['fi','sv','en'].includes(language)?language:'fi';
  const links=[
    [BASE,lang==='sv'?'Webbplats':lang==='en'?'Website':'Verkkosivut'],
    [BASE+'/tietosuoja',lang==='sv'?'Integritetspolicy':lang==='en'?'Privacy policy':'Tietosuoja'],
    [BASE+'/kayttoehdot',lang==='sv'?'Användarvillkor':lang==='en'?'Terms of service':'Käyttöehdot'],
    [BASE+'/yhteystiedot',lang==='sv'?'Kontakt':lang==='en'?'Contact':'Yhteystiedot']
  ];
  const footerLinks=links.map(([url,label])=>'<a href="'+escapeEmailHtml(url)+'" style="color:#64748b;text-decoration:underline;margin:0 9px;display:inline-block;line-height:28px">'+escapeEmailHtml(label)+'</a>').join('');
  const disclaimer=lang==='sv'?'Det här är ett automatiskt servicemeddelande från Respondo AI.':lang==='en'?'This is an automated service email from Respondo AI.':'Tämä on Respondo AI:n automaattinen palveluviesti.';
  return '<!doctype html><html lang="'+lang+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#17243b">'+
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f6fb"><tr><td align="center" style="padding:38px 14px">'+
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px"><tr><td align="center" style="padding:0 0 24px"><a href="'+escapeEmailHtml(BASE)+'" style="text-decoration:none;color:#12223f;font-weight:800;font-size:24px;letter-spacing:-.8px"><img src="'+escapeEmailHtml(BASE)+'/respondo-email-logo.svg" width="44" height="44" alt="" style="display:inline-block;width:44px;height:44px;vertical-align:middle;margin-right:11px;border:0;border-radius:12px">RESPONDO <span style="color:#2563eb">AI</span></a></td></tr>'+ 
    '<tr><td style="background:#fff;border:1px solid #e5ebf3;border-radius:18px;padding:42px 36px">'+
    (eyebrow?'<div style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#2563eb;margin-bottom:14px">'+escapeEmailHtml(eyebrow)+'</div>':'')+
    '<h1 style="font-size:27px;line-height:1.25;letter-spacing:-.6px;margin:0 0 22px;color:#14243d">'+escapeEmailHtml(title)+'</h1>'+content+'</td></tr>'+ 
    '<tr><td align="center" style="padding:28px 14px 4px;color:#64748b;font-size:12px;line-height:1.8"><div style="margin-bottom:10px">'+footerLinks+'</div><div>'+escapeEmailHtml(disclaimer)+'</div><div style="margin-top:8px">© '+new Date().getUTCFullYear()+' Respondo AI · <a href="'+escapeEmailHtml(BASE)+'" style="color:#64748b;text-decoration:none">respondoai.fi</a></div></td></tr></table></td></tr></table></body></html>';
}

async function sendSignupVerificationEmail({ email, code, language = 'fi' }) {
  if (!signupEmailVerificationReady()) {
    return { sent:false, reason:'email_verification_not_configured' };
  }
  const lang = ['fi','sv','en'].includes(String(language).toLowerCase()) ? String(language).toLowerCase() : 'fi';
  const from = String(process.env.EMAIL_VERIFICATION_FROM).trim();
  const subject = lang === 'sv' ? 'Bekräfta din e-postadress – Respondo AI'
    : lang === 'en' ? 'Verify your email address – Respondo AI'
    : 'Vahvista sähköpostiosoitteesi – Respondo AI';
  const intro = lang === 'sv' ? 'Bekräfta din e-postadress för att skapa ditt Respondo-konto.'
    : lang === 'en' ? 'Verify your email address to create your Respondo account.'
    : 'Vahvista sähköpostiosoitteesi luodaksesi Respondo-tilisi.';
  const expiry = lang === 'sv' ? 'Koden gäller i 15 minuter. Ange den i registreringsformuläret.'
    : lang === 'en' ? 'The code is valid for 15 minutes. Enter it on the signup page.'
    : 'Koodi on voimassa 15 minuuttia. Syötä se rekisteröitymissivulle.';
  const ignore = lang === 'sv' ? 'Om du inte försökte skapa ett konto kan du ignorera detta meddelande.'
    : lang === 'en' ? 'If you did not try to create an account, you can ignore this message.'
    : 'Jos et yrittänyt luoda tiliä, voit jättää tämän viestin huomiotta.';
  const securityLabel = lang === 'sv' ? 'Säkerhetstips' : lang === 'en' ? 'Security reminder' : 'Turvallisuusmuistutus';
  const securityNote = lang === 'sv' ? 'Dela aldrig koden med någon. Respondo AI ber dig aldrig om din verifieringskod via telefon, chatt eller e-post.'
    : lang === 'en' ? 'Never share this code. Respondo AI will never ask you for your verification code by phone, chat, or email.'
    : 'Älä koskaan jaa tätä koodia kenellekään. Respondo AI ei koskaan pyydä vahvistuskoodiasi puhelimitse, chatissa tai sähköpostitse.';
  const codeLabel = lang === 'sv' ? 'Din verifieringskod' : lang === 'en' ? 'Your verification code' : 'Vahvistuskoodisi';
  const html = brandedEmailHtml({language:lang,eyebrow:lang==='sv'?'Kontosäkerhet':lang==='en'?'Account security':'Tilin turvallisuus',title:subject,content:
    '<p style="font-size:15px;line-height:1.75;color:#475569">'+escapeEmailHtml(intro)+'</p>'+
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:26px 0"><tr><td align="center" style="background:#eff5ff;border:1px solid #dce8ff;border-radius:14px;padding:22px 8px">'+
    '<div style="font-size:12px;font-weight:700;letter-spacing:1px;color:#475569;margin-bottom:12px">'+escapeEmailHtml(codeLabel)+'</div>'+
    '<div style="font-size:clamp(25px,6vw,34px);font-weight:800;letter-spacing:6px;color:#1d4ed8;font-family:Arial,Helvetica,sans-serif">'+escapeEmailHtml(code)+'</div></td></tr></table>'+
    '<p style="font-size:14px;line-height:1.7;color:#475569">'+escapeEmailHtml(expiry)+'</p>'+
    '<div style="border-top:1px solid #e5ebf3;margin:28px 0 20px"></div>'+
    '<p style="font-size:13px;font-weight:700;color:#17243b;margin-bottom:6px">'+escapeEmailHtml(securityLabel)+'</p>'+
    '<p style="font-size:13px;line-height:1.7;color:#64748b;margin-top:0">'+escapeEmailHtml(securityNote)+'</p>'+
    '<p style="font-size:12px;line-height:1.7;color:#64748b;margin-top:18px">'+escapeEmailHtml(ignore)+'</p>'});
  const response = await fetch('https://api.resend.com/emails', {
    method:'POST',
    headers:{
      'Authorization':'Bearer ' + String(process.env.RESEND_API_KEY).trim(),
      'Content-Type':'application/json',
    },
    body:JSON.stringify({ from, to:[email], subject, html }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Never log the recipient, code, provider response, or API credentials.
    throw new Error('Verification email provider rejected request (status ' + response.status + ')');
  }
  return { sent:true, id:data?.id || null };
}

// Send the onboarding message once per activated account, regardless of whether
// Stripe's webhook or the checkout success redirect completes first.
async function sendWelcomeEmailOnce(userId) {
  if (!pool || !String(process.env.RESEND_API_KEY || '').trim()) return false;
  await q(`CREATE TABLE IF NOT EXISTS signup_welcome_emails (
    user_id TEXT PRIMARY KEY, sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const claimed = await q(`INSERT INTO signup_welcome_emails(user_id)
    SELECT id::text FROM users WHERE id=$1 AND status='active'
    ON CONFLICT (user_id) DO NOTHING RETURNING user_id`, [userId]);
  if (!claimed.rowCount) return false;
  try {
    const found = await q('SELECT email,full_name,preferred_language,referral_code,subscription_plan FROM users WHERE id=$1',[userId]);
    const user=found.rows[0];
    if (!user?.email) throw new Error('Welcome recipient missing');
    const lang=['fi','sv','en'].includes(user.preferred_language) ? user.preferred_language : 'fi';
    const firstName=String(user.full_name||'').trim().split(/\\s+/)[0];
    const greeting=lang==='sv'?'Välkommen till Respondo AI!':lang==='en'?'Welcome to Respondo AI!':'Tervetuloa Respondo AI:hin!';
    const intro=lang==='sv'?'Ditt konto är klart. Du kan nu logga in och börja konfigurera din kundtjänstbot.':lang==='en'?'Your account is ready. You can now sign in and set up your customer service bot.':'Tilisi on nyt valmis. Voit kirjautua sisään ja aloittaa asiakaspalvelubottisi käyttöönoton.';
    const steps=lang==='sv'?'Lägg till företagets uppgifter, anpassa botens utseende och installera den på din webbplats.':lang==='en'?'Add your company details, customize the bot and install it on your website.':'Lisää yrityksesi tiedot, muokkaa botin ulkoasua ja asenna se verkkosivuillesi.';
    const referralEligible=Boolean(user.referral_code && planAllowsReferral(user.subscription_plan));
    const referralText=lang==='sv'?'Dela din personliga rekommendationskod. En ny kund får 20 % rabatt på sin första betalda månad med ett kvalificerat månadsabonnemang. Koden kan användas en gång.':lang==='en'?'Share your personal referral code. A new customer gets 20% off their first paid month on an eligible monthly plan. The code can be redeemed once.':'Jaa henkilökohtainen suosittelukoodisi. Uusi asiakas saa 20 % alennuksen ensimmäisestä maksullisesta kuukaudesta soveltuvassa kuukausitilauksessa. Koodi on kertakäyttöinen.';
    const html=brandedEmailHtml({language:lang,eyebrow:lang==='sv'?'Ditt konto är klart':lang==='en'?'Your account is ready':'Tilisi on valmis',title:greeting,content:
      (firstName?'<p style="font-size:16px;font-weight:600">'+escapeEmailHtml(firstName)+',</p>':'')+
      '<p style="font-size:15px;line-height:1.8;color:#475569">'+escapeEmailHtml(intro)+'</p>'+
      '<p style="font-size:15px;line-height:1.8;color:#475569">'+escapeEmailHtml(steps)+'</p>'+
      '<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0"><tr><td style="background:#2563eb;border-radius:10px"><a href="'+escapeEmailHtml(BASE+'/app')+'" style="display:inline-block;padding:15px 24px;color:#fff;font-size:14px;font-weight:700;text-decoration:none">'+escapeEmailHtml(lang==='sv'?'Öppna instrumentpanelen':lang==='en'?'Open dashboard':'Avaa hallintapaneeli')+' →</a></td></tr></table>'+
      (referralEligible?'<div style="background:#eff5ff;border:1px solid #dce8ff;border-radius:14px;padding:22px;margin:24px 0"><div style="font-size:13px;font-weight:700;color:#1d4ed8">'+escapeEmailHtml(lang==='sv'?'Din rekommendationskod · 20 %':lang==='en'?'Your referral code · 20%':'Suosittelukoodisi · 20 %')+'</div><p style="font-size:22px;font-weight:800;letter-spacing:1px;color:#14243d;overflow-wrap:anywhere">'+escapeEmailHtml(user.referral_code)+'</p><p style="font-size:13px;line-height:1.7;color:#475569;margin-bottom:0">'+escapeEmailHtml(referralText)+'</p></div>':'')+
      '<p style="margin-top:30px;font-size:13px;color:#64748b">'+escapeEmailHtml(lang==='sv'?'Tack för att du valde Respondo AI.':lang==='en'?'Thank you for choosing Respondo AI.':'Kiitos, että valitsit Respondo AI:n.')+'</p>'});
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+String(process.env.RESEND_API_KEY).trim(),'Content-Type':'application/json'},body:JSON.stringify({from:String(process.env.EMAIL_VERIFICATION_FROM||'Respondo AI <noreply@respondoai.fi>').trim(),to:[user.email],subject:greeting,html})});
    if(!response.ok) throw new Error('Welcome email provider returned status '+response.status);
    return true;
  } catch(e) {
    await q('DELETE FROM signup_welcome_emails WHERE user_id=$1',[userId]).catch(()=>{});
    throw e;
  }
}

async function sendHomepageContactEmail({ name, email, message }) {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) return { sent:false, reason:'resend_not_configured' };

  const to = cleanEmail(
    process.env.CONTACT_NOTIFICATION_TO ||
    process.env.SUPPORT_EMAIL ||
    process.env.OWNER_EMAIL
  );
  if (!to) return { sent:false, reason:'recipient_missing' };

  const from = String(
    process.env.CONTACT_NOTIFICATION_FROM ||
    'Respondo <onboarding@resend.dev>'
  ).trim();

  const subject = 'Uusi yhteydenotto Respondon verkkosivulta';
  const html =
    '<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111">' +
      '<h2 style="margin:0 0 20px">Uusi yhteydenotto</h2>' +
      '<p><strong>Nimi:</strong> ' + escapeEmailHtml(name) + '</p>' +
      '<p><strong>Sähköposti:</strong> ' + escapeEmailHtml(email) + '</p>' +
      '<p><strong>Viesti:</strong></p>' +
      '<div style="white-space:pre-wrap;padding:14px 16px;border:1px solid #ddd;border-radius:12px;background:#fafafa">' +
        escapeEmailHtml(message) +
      '</div>' +
      '<p style="margin-top:20px;color:#666;font-size:13px">Lähetetty Respondon etusivun yhteydenottolomakkeesta.</p>' +
    '</div>';

  const response = await fetch('https://api.resend.com/emails', {
    method:'POST',
    headers:{
      'Authorization':'Bearer ' + apiKey,
      'Content-Type':'application/json',
    },
    body:JSON.stringify({
      from,
      to:[to],
      reply_to:email,
      subject,
      html,
    }),
  });

  const data = await response.json().catch(()=>({}));
  if (!response.ok) {
    throw new Error(
      String(data?.message || data?.error || 'Resend email failed').slice(0,500)
    );
  }
  return { sent:true, id:data?.id || null };
}

async function sendPasswordResetEmail({ email, token, language = 'fi' }) {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) return { sent:false, reason:'resend_not_configured' };

  const safeEmail = cleanEmail(email);
  if (!safeEmail || !token) return { sent:false, reason:'invalid_recipient' };

  const lang = ['fi','sv','en'].includes(String(language || '').toLowerCase())
    ? String(language).toLowerCase()
    : 'fi';
  const resetUrl = BASE + '/kirjaudu?reset=' + encodeURIComponent(token);
  const from = String(
    process.env.PASSWORD_RESET_FROM ||
    process.env.CONTACT_NOTIFICATION_FROM ||
    'Respondo <onboarding@resend.dev>'
  ).trim();
  const subject = lang === 'sv'
    ? 'Återställ ditt Respondo-lösenord'
    : lang === 'en'
      ? 'Reset your Respondo password'
      : 'Palauta Respondo-salasanasi';
  const intro = lang === 'sv'
    ? 'Du har begärt att återställa lösenordet för ditt Respondo-konto.'
    : lang === 'en'
      ? 'A password reset was requested for your Respondo account.'
      : 'Respondo-tilillesi pyydettiin salasanan palautusta.';
  const action = lang === 'sv'
    ? 'Återställ lösenord'
    : lang === 'en'
      ? 'Reset password'
      : 'Palauta salasana';
  const expiry = lang === 'sv'
    ? 'Länken gäller i 30 minuter och kan bara användas en gång.'
    : lang === 'en'
      ? 'This link is valid for 30 minutes and can only be used once.'
      : 'Linkki on voimassa 30 minuuttia ja sen voi käyttää vain kerran.';
  const ignore = lang === 'sv'
    ? 'Om du inte begärde detta kan du ignorera meddelandet.'
    : lang === 'en'
      ? 'If you did not request this, you can ignore this message.'
      : 'Jos et pyytänyt palautusta, voit jättää tämän viestin huomiotta.';

  const html =
    '<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:28px;color:#111">' +
      '<h2 style="margin:0 0 18px">Respondo AI</h2>' +
      '<p>' + escapeEmailHtml(intro) + '</p>' +
      '<p style="margin:26px 0"><a href="' + escapeEmailHtml(resetUrl) + '" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:13px 18px;border-radius:10px;font-weight:700">' + escapeEmailHtml(action) + '</a></p>' +
      '<p style="color:#555">' + escapeEmailHtml(expiry) + '</p>' +
      '<p style="color:#777;font-size:13px">' + escapeEmailHtml(ignore) + '</p>' +
    '</div>';

  const response = await fetch('https://api.resend.com/emails', {
    method:'POST',
    headers:{
      'Authorization':'Bearer ' + apiKey,
      'Content-Type':'application/json',
    },
    body:JSON.stringify({
      from,
      to:[safeEmail],
      subject,
      html,
    }),
  });
  const data = await response.json().catch(()=>({}));
  if (!response.ok) {
    throw new Error(String(data?.message || data?.error || 'Password reset email failed').slice(0,500));
  }
  return { sent:true, id:data?.id || null };
}

function cleanBotAccent(value) {
  const raw=String(value||'').trim();
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw.toUpperCase() : null;
}

function cleanBotName(value) {
  return String(value || '').replace(/[<>]/g,'').trim().slice(0,40) || 'RESPONDO AI';
}

function cleanBotAvatar(value) {
  const raw = String(value || '').trim();
  if (/^robot-(?:[1-9]|10)$/.test(raw)) return raw;
  const match = raw.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return 'robot-1';
  if (raw.length > 520000) return 'robot-1';
  try {
    const bytes = Buffer.from(match[2],'base64');
    if (!bytes.length || bytes.length > 360000) return 'robot-1';
    return raw;
  } catch {
    return 'robot-1';
  }
}

const DATA_ENCRYPTION_SECRET = String(process.env.DATA_ENCRYPTION_KEY || '').trim();
if (process.env.NODE_ENV === 'production' && !DATA_ENCRYPTION_SECRET) {
  throw new Error('DATA_ENCRYPTION_KEY is required in production.');
}
const SECRET_KEY = crypto.createHash('sha256').update(DATA_ENCRYPTION_SECRET || JWT).digest();
const LEGACY_SECRET_KEY = crypto.createHash('sha256').update(JWT).digest();

function encryptSecret(value) {
  const text = String(value || '');
  if (!text) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', SECRET_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((x) => x.toString('base64url')).join('.');
}

function decryptSecretWithKey(text, key) {
  const [ivPart, tagPart, dataPart] = String(text || '').split('.');
  if (!ivPart || !tagPart || !dataPart) return '';
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivPart, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function decryptSecret(value) {
  const text = String(value || '');
  if (!text) return '';
  try {
    return decryptSecretWithKey(text, SECRET_KEY);
  } catch {
    if (DATA_ENCRYPTION_SECRET) {
      try {
        return decryptSecretWithKey(text, LEGACY_SECRET_KEY);
      } catch {}
    }
    return '';
  }
}

const slug = (value) =>
  String(value || 'yritys')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || `yritys-${crypto.randomBytes(3).toString('hex')}`;

let referralCouponIdCache = String(process.env.STRIPE_REFERRAL_COUPON_ID || '').trim();

async function ensureReferralCoupon() {
  if (!stripe) return '';
  if (referralCouponIdCache) {
    try {
      const existing = await stripe.coupons.retrieve(referralCouponIdCache);
      if (existing && existing.valid !== false) return referralCouponIdCache;
    } catch {}
    // A stale configured ID must not silently break every referral.
    referralCouponIdCache = '';
  }

  if (pool) {
    try {
      const saved = await q("SELECT value FROM app_settings WHERE key='stripe_referral_coupon_id' LIMIT 1");
      const savedId = String(saved.rows[0]?.value || '').trim();
      if (savedId) {
        try {
          const existing = await stripe.coupons.retrieve(savedId);
          if (existing && existing.valid !== false) {
            referralCouponIdCache = savedId;
            return savedId;
          }
        } catch {}
      }
    } catch {}
  }

  const created = await stripe.coupons.create({
    percent_off: 20,
    duration: 'once',
    name: 'Respondo referral 20% first paid month',
    metadata: { purpose:'customer_referral', version:'1' },
  });
  referralCouponIdCache = created.id;

  if (pool && created.id) {
    await q(
      "INSERT INTO app_settings(key,value,updated_at) VALUES('stripe_referral_coupon_id',$1,NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()",
      [created.id],
    );
  }
  return created.id;
}

const normalizeReferralCode = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 32);

const FREE_REFERRAL_CODE = normalizeReferralCode(process.env.OWNER_FREE_CODE || '');
const isFreeReferralCode = (value) => Boolean(FREE_REFERRAL_CODE) && normalizeReferralCode(value) === FREE_REFERRAL_CODE;

async function consumeOwnerFreeCode(_client, value) {
  // OWNER_FREE_CODE is an owner/admin bypass, not a customer referral.
  // It is intentionally reusable and does not consume a global redemption slot.
  return isFreeReferralCode(value);
}

const PLAN_DEFINITIONS = Object.freeze({
  basic_monthly:{tier:'basic',billing:'monthly',monthlyPrice:29.90,annualTotal:null,agentSeats:2,websiteImport:true,googleCalendar:false},
  basic_yearly:{tier:'basic',billing:'yearly',monthlyPrice:29.90,annualTotal:358.80,agentSeats:2,websiteImport:true,googleCalendar:false},
  advanced_monthly:{tier:'advanced',billing:'monthly',monthlyPrice:39.90,annualTotal:null,agentSeats:10,websiteImport:true,googleCalendar:true},
  advanced_yearly:{tier:'advanced',billing:'yearly',monthlyPrice:39.90,annualTotal:478.80,agentSeats:10,websiteImport:true,googleCalendar:true},
  business_monthly:{tier:'business',billing:'monthly',monthlyPrice:49.90,annualTotal:null,agentSeats:20,websiteImport:true,googleCalendar:true},
  business_yearly:{tier:'business',billing:'yearly',monthlyPrice:49.90,annualTotal:598.80,agentSeats:20,websiteImport:true,googleCalendar:true},
});

function normalizeCheckoutPlan(value) {
  const raw=String(value||'').trim().toLowerCase();
  if(raw==='owner_test') return 'owner_test';
  if(PLAN_DEFINITIONS[raw]) return raw;
  // Legacy plan URLs resolve to the current tier without reviving discounted billing.
  if (raw==='starter_monthly') return 'basic_monthly';
  if (raw==='starter_yearly') return 'basic_yearly';
  if(raw==='yearly') return 'basic_yearly';
  return 'basic_monthly';
}

function planTier(value) {
  const raw=String(value||'').trim().toLowerCase();
  if(PLAN_DEFINITIONS[raw]) return PLAN_DEFINITIONS[raw].tier;
  // Existing subscriptions created before tiers keep every feature they had.
  if(['monthly','yearly','owner_test'].includes(raw)) return 'business';
  return 'basic';
}

function planEntitlements(value) {
  const raw=String(value||'').trim().toLowerCase();
  const def=PLAN_DEFINITIONS[raw];
  if(def) return {
    code:raw,tier:def.tier,billing:def.billing,agentSeats:def.agentSeats,
    websiteImport:def.websiteImport,googleCalendar:def.googleCalendar,
    allCurrentFeatures:def.tier==='business'
  };
  if(['monthly','yearly','owner_test'].includes(raw)) {
    return {code:raw,tier:'business',billing:raw==='yearly'?'yearly':'monthly',agentSeats:20,websiteImport:true,googleCalendar:true,allCurrentFeatures:true};
  }
  return {code:raw||'basic_monthly',tier:'basic',billing:'monthly',agentSeats:2,websiteImport:true,googleCalendar:false,allCurrentFeatures:false};
}

function planAllowsReferral(value) {
  const raw=String(value||'').trim().toLowerCase();
  return raw==='monthly' || raw==='owner_test' || raw.endsWith('_monthly');
}

function productionStripePricesConfigured() {
  return [
    process.env.STRIPE_BASIC_MONTHLY_PRICE_ID,
    process.env.STRIPE_BASIC_YEARLY_PRICE_ID,
    process.env.STRIPE_ADVANCED_MONTHLY_PRICE_ID,
    process.env.STRIPE_ADVANCED_YEARLY_PRICE_ID,
    process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID,
    process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID,
  ].every((value) => /^price_[A-Za-z0-9_]+$/.test(String(value || '').trim()));
}

function stripePriceForPlan(value) {
  const plan=normalizeCheckoutPlan(value);
  const map={
    basic_monthly:process.env.STRIPE_BASIC_MONTHLY_PRICE_ID,
    basic_yearly:process.env.STRIPE_BASIC_YEARLY_PRICE_ID,
    advanced_monthly:process.env.STRIPE_ADVANCED_MONTHLY_PRICE_ID,
    advanced_yearly:process.env.STRIPE_ADVANCED_YEARLY_PRICE_ID,
    business_monthly:process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID,
    business_yearly:process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID,
    owner_test:process.env.STRIPE_OWNER_TEST_PRICE_ID,
  };
  return map[plan] || '';
}

function planFromStripePriceId(priceId) {
  const id=String(priceId||'');
  const pairs=[
    ['basic_monthly',process.env.STRIPE_BASIC_MONTHLY_PRICE_ID],
    ['basic_yearly',process.env.STRIPE_BASIC_YEARLY_PRICE_ID],
    ['advanced_monthly',process.env.STRIPE_ADVANCED_MONTHLY_PRICE_ID],
    ['advanced_yearly',process.env.STRIPE_ADVANCED_YEARLY_PRICE_ID],
    ['business_monthly',process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID],
    ['business_yearly',process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID],
    // Previously offered VAT-inclusive Stripe prices remain valid for existing subscriptions.
    ['basic_monthly','price_1UOLwuV05brJ7mTPUcIxZKE6'],
    ['basic_yearly','price_1UOLx1V05brJ7mTPETqeexmn'],
    ['advanced_monthly','price_1UOLx3V05brJ7mTPODsTKyC5'],
    ['advanced_yearly','price_1UOLx6V05brJ7mTPIgyqDymD'],
    ['business_monthly','price_1UOLx8V05brJ7mTPDq47ha22'],
    ['business_yearly','price_1UOLxBV05brJ7mTPSsDPLXTM'],
    // Retain the historical six price IDs for existing customer subscriptions.
    // New checkout always uses the current environment-configured prices.
    ['basic_monthly','price_1UNGlQV05brJ7mTPOsgm1BPT'],
    ['basic_yearly','price_1UNGlSV05brJ7mTPtQR50utm'],
    ['advanced_monthly','price_1UNGlVV05brJ7mTPOuMPEquL'],
    ['advanced_yearly','price_1UNGlXV05brJ7mTPyxDcmE3Y'],
    ['business_monthly','price_1UNGlaV05brJ7mTP8byQ8XQq'],
    ['business_yearly','price_1UNGlgV05brJ7mTPpC6jkGRD'],
    ['monthly',process.env.STRIPE_MONTHLY_PRICE_ID],
    ['yearly',process.env.STRIPE_YEARLY_PRICE_ID],
    ['owner_test',process.env.STRIPE_OWNER_TEST_PRICE_ID],
  ];
  return pairs.find(([,candidate])=>candidate && candidate===id)?.[0] || '';
}

async function activeTenantPlan(userId) {
  const rr=await q(
    'SELECT id,subscription_plan FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1) LIMIT 1',
    [userId],
  );
  return rr.rowCount ? rr.rows[0] : null;
}

async function requirePlanCapability(req,res,capability) {
  const tenant=await activeTenantPlan(req.user.sub);
  if(!tenant) {
    res.status(404).json({error:'Työtilaa ei löytynyt.'});
    return null;
  }
  const access=planEntitlements(tenant.subscription_plan);
  if(!access[capability]) {
    const need=capability==='allCurrentFeatures' ? 'Business-tilaus' : 'Advanced- tai Business-tilaus';
    res.status(403).json({error:'Tämä ominaisuus vaatii '+need+'.',upgradeRequired:true,currentPlan:access.code});
    return null;
  }
  return {tenant,access};
}

async function ensureReferralCode(userId) {
  const found = await q(
    'SELECT referral_code,subscription_plan,stripe_subscription_id FROM users WHERE id=$1',
    [userId],
  );
  if (!found.rowCount) return '';

  let user = found.rows[0];
  let plan = user.subscription_plan;

  // Backfill the plan for customers created before referral tracking existed.
  if (!plan && stripe && user.stripe_subscription_id) {
    try {
      const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
      const priceId = subscription.items?.data?.[0]?.price?.id || '';
      plan = planFromStripePriceId(priceId) || plan;
      if (plan) {
        await q('UPDATE users SET subscription_plan=$1,updated_at=NOW() WHERE id=$2', [plan, userId]);
      }
    } catch (e) {
      console.warn('Referral plan backfill failed', e?.message || e);
    }
  }

  // Normal monthly customers get a code. The one-use owner test also gets one so the full purchase flow can be tested.
  if (!planAllowsReferral(plan)) return '';
  if (user.referral_code) return user.referral_code;

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = 'RESPONDO-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    try {
      const updated = await q(
        'UPDATE users SET referral_code=$1,updated_at=NOW() WHERE id=$2 AND referral_code IS NULL RETURNING referral_code',
        [code, userId],
      );
      if (updated.rowCount) return updated.rows[0].referral_code;

      const current = await q('SELECT referral_code FROM users WHERE id=$1', [userId]);
      if (current.rows[0]?.referral_code) return current.rows[0].referral_code;
    } catch (e) {
      if (e?.code === '23505') continue;
      throw e;
    }
  }
  throw new Error('Suosittelukoodia ei saatu luotua.');
}

async function applyReferralDiscountIfEligible(userId, subscriptionId, planOverride = '') {
  if (!pool || !stripe || !subscriptionId) return false;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const redemption = await client.query(
      `SELECT rr.id,rr.code,rr.stripe_discount_applied,u.subscription_plan
         FROM referral_redemptions rr
         JOIN users u ON u.id=rr.referred_user_id
        WHERE rr.referred_user_id=$1
        FOR UPDATE`,
      [userId],
    );

    const effectivePlan = String(planOverride || redemption.rows[0]?.subscription_plan || '');
    if (
      !redemption.rowCount ||
      redemption.rows[0].stripe_discount_applied ||
      !planAllowsReferral(effectivePlan)
    ) {
      await client.query('COMMIT');
      return false;
    }

    const row = redemption.rows[0];
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Checkout has already finalized the €0 trial invoice at this point.
    // Applying a duration=once coupon now makes it hit the first paid invoice after the trial.
    if (subscription.metadata?.referral_code !== row.code) {
      const referralCouponId = await ensureReferralCoupon();
      if (!referralCouponId) throw new Error('Referral coupon is unavailable.');
      await stripe.subscriptions.update(subscriptionId, {
        discounts: [{ coupon: referralCouponId }],
        metadata: {
          ...subscription.metadata,
          referral_code: row.code,
          referral_discount: '20_percent_first_paid_month',
        },
      });
    }

    await client.query(
      "UPDATE referral_redemptions SET stripe_discount_applied=TRUE,status='applied' WHERE id=$1",
      [row.id],
    );
    await client.query('COMMIT');
    return true;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}


function ownerTestAccessConfigured() {
  return Boolean(String(process.env.OWNER_TEST_ACCESS_TOKEN || '').trim());
}

function validOwnerTestAccessToken(value) {
  const configured=String(process.env.OWNER_TEST_ACCESS_TOKEN || '').trim();
  return Boolean(configured) && safeEqualText(String(value || '').trim(),configured);
}

async function ownerTestPlanEnabled() {
  if (!pool || !process.env.STRIPE_OWNER_TEST_PRICE_ID || !ownerTestAccessConfigured()) return false;
  const r = await q("SELECT value FROM app_settings WHERE key='owner_test_plan_enabled'");
  return r.rows[0]?.value === 'true';
}

async function closeOwnerTestPlan(subscriptionId) {
  if (!pool) return;
  await q(
    "INSERT INTO app_settings(key,value,updated_at) VALUES('owner_test_plan_enabled','false',NOW()) ON CONFLICT(key) DO UPDATE SET value='false',updated_at=NOW()"
  );

  if (stripe && subscriptionId) {
    try {
      await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
    } catch (e) {
      console.error('Owner test subscription auto-cancel failed', e?.message || e);
    }
  }

  if (stripe && process.env.STRIPE_OWNER_TEST_PRICE_ID) {
    try {
      await stripe.prices.update(process.env.STRIPE_OWNER_TEST_PRICE_ID, { active: false });
    } catch (e) {
      console.error('Owner test price deactivation failed', e?.message || e);
    }
  }
}


async function sendStripeReceiptForInvoice(invoiceId, fallbackEmail = '') {
  if (!stripe || !invoiceId) return false;

  const invoice = await stripe.invoices.retrieve(invoiceId, {
    expand: ['payments.data.payment'],
  });
  const email = cleanEmail(invoice.customer_email || fallbackEmail);
  if (!email || Number(invoice.amount_paid || 0) <= 0) return false;

  const invoicePayment = invoice.payments?.data?.find(
    (x) => x?.status === 'paid' && x?.payment?.type === 'payment_intent' && x?.payment?.payment_intent,
  );
  const paymentIntentId = invoicePayment?.payment?.payment_intent;
  if (!paymentIntentId) return false;

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ['latest_charge'],
  });
  const charge =
    typeof paymentIntent.latest_charge === 'string'
      ? await stripe.charges.retrieve(paymentIntent.latest_charge)
      : paymentIntent.latest_charge;

  if (!charge?.id) return false;
  if (cleanEmail(charge.receipt_email) === email) return true;

  await stripe.charges.update(charge.id, { receipt_email: email });
  return true;
}

async function backfillOwnerTestReceiptOnce() {
  if (!pool || !stripe) return;

  const done = await q("SELECT value FROM app_settings WHERE key='owner_test_receipt_backfill_done'");
  if (done.rows[0]?.value === 'true') return;

  const candidate = await q(
    `SELECT email,stripe_subscription_id
       FROM users
      WHERE subscription_plan='owner_test'
        AND stripe_subscription_id IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 1`,
  );
  if (!candidate.rowCount) return;

  const subscription = await stripe.subscriptions.retrieve(candidate.rows[0].stripe_subscription_id);
  const invoiceId =
    typeof subscription.latest_invoice === 'string'
      ? subscription.latest_invoice
      : subscription.latest_invoice?.id || null;

  if (!invoiceId) return;

  const sent = await sendStripeReceiptForInvoice(invoiceId, candidate.rows[0].email);
  if (sent) {
    await q(
      "INSERT INTO app_settings(key,value,updated_at) VALUES('owner_test_receipt_backfill_done','true',NOW()) ON CONFLICT(key) DO UPDATE SET value='true',updated_at=NOW()"
    );
  }
}


function normalizeWebUrl(value, originOnly = false) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
    const u = new URL(withScheme);
    if (!['http:', 'https:'].includes(u.protocol)) return '';
    return originOnly ? u.origin : u.toString();
  } catch {
    return '';
  }
}

function normalizeHost(value) {
  try {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const u = raw.includes('://') ? new URL(raw) : new URL('https://' + raw);
    return u.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function requestOrigin(req) {
  const value = String(req.headers.origin || '').trim();
  const referer = String(req.headers.referer || '').trim();
  try {
    if (value) return new URL(value);
    // Same-origin GET requests do not always include an Origin header.
    // The browser still sends Referer, which lets the first-party homepage
    // use the exact same widget embed code as an external customer site.
    return referer ? new URL(referer) : null;
  } catch {
    return null;
  }
}

function widgetOriginAllowed(req, tenant) {
  const origin=requestOrigin(req);
  if (!origin) return false;
  const originHost=normalizeHost(origin.hostname);
  const allowedHost=normalizeHost(tenant.website);
  if (allowedHost && originHost === allowedHost) return true;

  // Respondo's own homepage uses the real production assistant even if the
  // first-party workspace profile has no website value saved. Only the
  // canonical Respondo host is accepted; customer tenants still require their
  // exact configured website.
  if (isFirstPartyRespondoTenant(tenant) && respondoFirstPartyWebsiteAllowed(originHost)) {
    return true;
  }
  return false;
}

function safeTenantReturnUrl(value, tenant) {
  const raw=String(value || '').trim();
  const tenantHost=normalizeHost(tenant?.website);
  if (!raw || !tenantHost) return normalizeWebUrl(tenant?.website || '', false) || BASE;
  try {
    const url=new URL(raw);
    if (!['http:','https:'].includes(url.protocol)) throw new Error('invalid protocol');
    if (normalizeHost(url.hostname) !== tenantHost) throw new Error('host mismatch');
    url.username='';
    url.password='';
    return url.toString();
  } catch {
    return normalizeWebUrl(tenant?.website || '', false) || BASE;
  }
}

function setWidgetCors(req, res) {
  const origin = requestOrigin(req);
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin.origin);
    res.setHeader('Vary', 'Origin');
  }
}


const SEARCH_STOPWORDS = new Set([
  'että','tämä','tassa','tässä','tuo','noi','ne','nyt','kun','kuin','jos','mutta','tai','ja','on','oli','ovat',
  'olla','voiko','saako','miten','mika','mikä','mitä','missä','missa','paljon','paljonko','teillä','teilla','te',
  'me','minä','mina','sinä','sina','se','sen','sitä','sita','myös','myos','vielä','viela','entä','enta',
  'the','a','an','and','or','is','are','do','does','you','your','we','our','what','which','where','when','how',
  'och','eller','ar','är','ni','er','ert','vad','vilka','var','nar','när','hur','det','den','som',
  'this','that','these','those'
].map(word => normalizeSearchText(word)));

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9åäö€+\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeUserFacingText(value) {
  const decoded=decodeHtml(String(value || ''))
    // Scraped CMS content can contain literal escape sequences instead of real
    // line breaks. They must never be visible to a chat visitor.
    .replace(/\\(?:r\\n|n|r|t)/gi,' ')
    .replace(/[\u00ad\u200b-\u200d\u2060\ufeff]/g,'');
  return decoded
    .split(/\r?\n/)
    .map((line)=>line.replace(/[ \t]+/g,' ').replace(/\s+([,.;:!?])/g,'$1').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

function cleanKnowledgeText(value) {
  return sanitizeUserFacingText(value).replace(/\s+/g,' ').trim();
}

function searchTokens(value) {
  return normalizeSearchText(value)
    .split(' ')
    .filter((x) => x.length > 2 && !SEARCH_STOPWORDS.has(x));
}

function isFirstPartyRespondoTenant(tenant) {
  const name = normalizeSearchText(tenant?.name || '').replace(/\s+/g, ' ');
  const slug = normalizeSearchText(tenant?.slug || '').replace(/\s+/g, '');
  return name === 'respondo' || name === 'respondo ai' || slug === 'respondo' || slug === 'respondoai';
}

function respondoFirstPartyWebsiteAllowed(value) {
  const host=normalizeHost(value);
  if(!host) return false;
  const allowed=new Set(['respondoai.fi']);
  const baseHost=normalizeHost(BASE);
  if(baseHost) allowed.add(baseHost);
  try {
    const ownerHost=normalizeHost(respondoOwnerSiteUrl());
    if(ownerHost) allowed.add(ownerHost);
  } catch {}
  return allowed.has(host);
}

function tenantWebsiteImportAllowed(tenant,value) {
  return !isFirstPartyRespondoTenant(tenant) || respondoFirstPartyWebsiteAllowed(value);
}

function respondoProductFaqMatch(message, lang = 'fi', history = []) {
  const q = normalizeSearchText(message);
  if (!q) return null;
  const language = ['fi','sv','en'].includes(String(lang || '').toLowerCase()) ? String(lang).toLowerCase() : 'fi';
  const answer = (fi, sv, en) => language === 'sv' ? sv : language === 'en' ? en : fi;

  const previousQuestion = normalizeSearchText(
    Array.isArray(history) && history.length ? history[history.length - 1]?.question : ''
  );
  const previousWasPricing = /(?:hinta|maksaa|hinnoittelu|price|pricing|cost|pris|kostar|kuukaudessa|monthly|per month|manad|månad)/.test(previousQuestion);

  // Buying/subscribing questions are a first-party sales intent. Handle them
  // before generic contact or handoff rules so "Miten tän voi ostaa?" never
  // turns into a request for the visitor's contact details.
  if (
    /(?:miten|mista|mistä|voiko|voinko|haluan|haluaisin).*\b(?:ostaa|tilata|hankkia|aloittaa)\b|\b(?:osta|tilaa|hanki)\b.*(?:respondo|tama|tämä|tan|tän|palvelu|tilaus)?|\bhow\s+(?:do|can)\s+i\s+(?:buy|subscribe|get|start)\b|\bwhere\s+can\s+i\s+(?:buy|subscribe)\b|\b(?:buy|subscribe|get started)\b.*\brespondo\b|\bhur\s+(?:koper|köper|bestaller|beställer)\s+jag\b|\bvar\s+kan\s+jag\s+(?:kopa|köpa|bestalla|beställa)\b/.test(q)
  ) {
    return {
      id:'respondo-faq-buy',
      answer:answer(
        'Voit ottaa Respondon käyttöön suoraan verkkosivulta painamalla “Kokeile ilmaiseksi”. Kaikissa paketeissa on 3 päivän ilmainen kokeilu. Starter maksaa 29,90 €/kk, Advanced 39,90 €/kk ja Business 49,90 €/kk. Vuositilaus maksaa saman verran kuukautta kohden ilman vuosialennusta. Arvonlisäveroa ei peritä vähäisen liiketoiminnan vuoksi.',
        'Du kan börja använda Respondo direkt via webbplatsen genom att välja “Prova gratis”. Alla paket har 3 dagars gratis provperiod. Starter kostar 29,90 €/månad, Advanced 39,90 €/månad och Business 49,90 €/månad. Årsabonnemang har samma månadskostnad utan årsrabatt. Ingen moms debiteras på grund av verksamhet i liten skala.',
        'You can start using Respondo directly from the website by choosing “Try for free”. Every tier has a 3-day free trial. Starter is €29.90/month, Advanced €39.90/month, and Business €49.90/month. Annual billing has the same monthly rate without an annual discount. No VAT is charged due to the small-scale business exemption.'
      )
    };
  }

  if (
    /(?:^|\b)(?:onko|onks|onko tama|onko tämä|tama on|tämä on).*\bb2b\b|\bb2b\b|\bbusiness\s*to\s*business\b|\bforetagskund|företagskund|foretagstjanst|företagstjänst\b/.test(q)
  ) {
    return {
      id:'respondo-faq-b2b',
      answer:answer(
        'Kyllä. Respondo on B2B-palvelu yrityksille. Yritys ottaa Respondon käyttöön omalle verkkosivulleen, ja botti auttaa yrityksen omia asiakkaita vastaamalla kysymyksiin yrityksen hyväksymien tietojen perusteella.',
        'Ja. Respondo är en B2B-tjänst för företag. Företaget installerar Respondo på sin egen webbplats och botten hjälper företagets kunder genom att svara utifrån företagets godkända information.',
        'Yes. Respondo is a B2B service for businesses. A company adds Respondo to its own website, and the bot helps that company’s customers by answering from company-approved information.'
      )
    };
  }

  // Benefit/value questions are a first-party sales intent. Keep these out of
  // generic knowledge matching so phrases like "Listaa jotain hyötyjä" never
  // drift into contact details or an unrelated FAQ row.
  if (
    /(?:^|\b)(?:mita|mitä|mitka|mitkä|listaa|kerro|anna|luettele).*(?:hyoty|hyöty|hyodyt|hyödyt|etu|edut)|(?:hyoty|hyöty|hyodyt|hyödyt|etu|edut).*(?:respondo|tasta|tästä|palvelu|botti)|\b(?:benefit|benefits|advantages|value)\b|\b(?:what|why).*(?:benefit|use respondo|use this|value)|\b(?:fordel|fördel|fordelar|fördelar|nytta)\b/.test(q)
  ) {
    return {
      id:'respondo-faq-benefits',
      answer:answer(
        'Esimerkiksi:\n• Vastaa asiakkaiden kysymyksiin 24/7 yrityksen omien tietojen perusteella.\n• Vähentää toistuvaa asiakaspalvelutyötä.\n• Kerää puuttuvat kysymykset näkyviin, jotta tietopohjaa voi parantaa.\n• Voi kerätä asiakkaan yhteystiedot ja ohjata hänet oikeaan seuraavaan vaiheeseen.\n• Toimii suomeksi, ruotsiksi ja englanniksi.',
        'Till exempel:\n• Svarar på kundfrågor dygnet runt utifrån företagets egna uppgifter.\n• Minskar repetitivt kundservicearbete.\n• Samlar obesvarade frågor så att kunskapsbasen kan förbättras.\n• Kan samla in kundens kontaktuppgifter och guida kunden till nästa steg.\n• Fungerar på finska, svenska och engelska.',
        'For example:\n• Answers customer questions 24/7 from the company’s own information.\n• Reduces repetitive customer-service work.\n• Collects unanswered questions so the knowledge base can be improved.\n• Can collect customer contact details and guide the customer to the next step.\n• Works in Finnish, Swedish and English.'
      )
    };
  }

  // The first-party Respondo website must never inherit ecommerce/product
  // answers from a Try Bot import or any accidental foreign knowledge row.
  if (broadProductQuestion(message)) {
    return {
      id:'respondo-faq-what-we-sell',
      answer:answer(
        'Respondo myy yrityksille AI-asiakaspalvelubottipalvelua. Botti asennetaan yrityksen verkkosivulle, ja se vastaa asiakkaiden kysymyksiin yrityksen omien tietojen perusteella 24/7.',
        'Respondo säljer en AI-kundtjänstbot för företag. Botten installeras på företagets webbplats och svarar på kundernas frågor utifrån företagets egna uppgifter dygnet runt.',
        'Respondo sells an AI customer-service chatbot for businesses. It is installed on a company website and answers customer questions from the company’s own information 24/7.'
      )
    };
  }

  if (
    /(?:enta|ent|entäs|vuodessa|vuosi(?:hinta|tilaus)?|yearly|annual|per year|a year|arspris|årspris|per ar|per år|arsabonnemang|årsabonnemang)/.test(q) &&
    (
      /(?:vuodessa|vuosi|yearly|annual|per year|a year|arspris|årspris|per ar|per år|arsabonnemang|årsabonnemang)/.test(q) ||
      previousWasPricing
    )
  ) {
    return {
      id:'respondo-faq-annual-pricing',
      answer:answer(
        'Vuositilaukset (ei vuosialennusta): Starter 358,80 €/vuosi (29,90 €/kk), Advanced 478,80 €/vuosi (39,90 €/kk) ja Business 598,80 €/vuosi (49,90 €/kk). Arvonlisäveroa ei peritä vähäisen liiketoiminnan vuoksi.',
        'Årsabonnemangen (ingen årsrabatt) kostar: Starter 358,80 €/år (29,90 €/månad), Advanced 478,80 €/år (39,90 €/månad) och Business 598,80 €/år (49,90 €/månad). Ingen moms debiteras på grund av verksamhet i liten skala.',
        'Annual billing (no annual discount) is: Starter €358.80/year (€29.90/month), Advanced €478.80/year (€39.90/month), and Business €598.80/year (€49.90/month). No VAT is charged due to the small-scale business exemption.'
      )
    };
  }

  if (
    /(?:kuukaudessa|kuukausi(?:hinta|tilaus)?|monthly|per month|a month|manad|månad|per manad|per månad)/.test(q)
  ) {
    return {
      id:'respondo-faq-monthly-pricing',
      answer:answer(
        'Kuukausihinnat ovat Starter 29,90 €/kk, Advanced 39,90 €/kk ja Business 49,90 €/kk. Arvonlisäveroa ei peritä vähäisen liiketoiminnan vuoksi.',
        'Månadspriserna är Starter 29,90 €/månad, Advanced 39,90 €/månad och Business 49,90 €/månad. Ingen moms debiteras på grund av verksamhet i liten skala.',
        'Monthly pricing is Starter €29.90/month, Advanced €39.90/month, and Business €49.90/month. No VAT is charged due to the small-scale business exemption.'
      )
    };
  }

  if (/(?:jatt|leave|lamna).*(?:yhteystiet|contact detail|kontaktuppgift)|(?:yhteystiet|contact detail|kontaktuppgift).*(?:jatt|leave|lamna)/.test(q)) {
    return {
      id:'respondo-faq-contact-details',
      answer:answer(
        'Kun botti ei löydä varmaa vastausta, se voi pyytää asiakkaalta nimen sekä puhelinnumeron tai sähköpostin. Yhteydenotto tallentuu hallintapaneeliin, jotta yritys voi palata asiakkaalle.',
        'När botten inte hittar ett säkert svar kan den be kunden lämna namn samt telefonnummer eller e-post. Kontaktförfrågan sparas i kontrollpanelen så att företaget kan återkomma.',
        'When the bot cannot find a reliable answer, it can ask the customer for their name and either a phone number or email address. The contact request is saved in the dashboard so the company can follow up.'
      )
    };
  }

  if (/(?:ottaa yhteytt|saan yhteyden|mika.*sahkoposti|mika.*email|asiakaspalvelu.*yhteys|contact respondo|contact you|reach you|support email|email address|kontakta respondo|kontakta er|kontakt med er|support.*e-post|e-postadress)/.test(q)) {
    const supportEmail = cleanEmail(process.env.SUPPORT_EMAIL || process.env.OWNER_EMAIL) || 'info@respondoai.fi';
    return {
      id:'respondo-faq-company-contact',
      answer:answer(
        'Voit ottaa meihin yhteyttä sähköpostitse osoitteeseen ' + supportEmail + ' tai Respondon verkkosivun Ota yhteyttä -osion kautta.',
        'Du kan kontakta oss via e-post på ' + supportEmail + ' eller via kontaktsektionen på Respondos webbplats.',
        'You can contact us by email at ' + supportEmail + ' or through the Contact section on the Respondo website.'
      )
    };
  }

  if (/(?:ovatko|onko|ovatko.*tietoni|tietoni).*(?:turvassa|turvallis|suojat)|(?:tietoturva|tietosuoja|turvallinen|turvallisuus|privacy|data security|secure|safe|security|integritet|datasakerhet|datasäkerhet|saker|säker|trygg)/.test(q)) {
    return {
      id:'respondo-faq-security',
      answer:answer(
        'Kyllä. Respondo käyttää suojattuja HTTPS-yhteyksiä, salasanoja ei tallenneta selväkielisinä ja maksukortin varsinaiset tiedot käsittelee Stripe. Yrityksen tietoja käytetään palvelun toimittamiseen ja niitä käsitellään Respondon tietosuojakäytäntöjen mukaisesti.',
        'Ja. Respondo använder skyddade HTTPS-anslutningar, lösenord lagras inte i klartext och de faktiska kortuppgifterna hanteras av Stripe. Företagets uppgifter används för att tillhandahålla tjänsten och behandlas enligt Respondos integritetspraxis.',
        'Yes. Respondo uses secure HTTPS connections, passwords are not stored in plain text, and actual card details are handled by Stripe. Company data is used to provide the service and is processed according to Respondo’s privacy practices.'
      )
    };
  }

  if (/(?:mita|mitä|paljonko|paljo|what|how much|vad).*(?:maksaa|hinta|cost|price|kostar|pris)|(?:hinta|hinnoittelu|pricing|price|prices|cost|pris|priser).*(?:respondo|tilaus|subscription|abonnemang)?/.test(q)) {
    return {
      id:'respondo-faq-pricing',
      answer:answer(
        'Respondo Starter maksaa 29,90 €/kk, Advanced 39,90 €/kk ja Business 49,90 €/kk. Vuositilauksissa sama kuukausihinta laskutetaan 12 kuukaudelta kerralla ilman vuosialennusta. Arvonlisäveroa ei peritä vähäisen liiketoiminnan vuoksi.',
        'Respondo Starter kostar 29,90 €/månad, Advanced 39,90 €/månad och Business 49,90 €/månad. Årsabonnemang debiteras för 12 månader i taget utan årsrabatt. Ingen moms debiteras på grund av verksamhet i liten skala.',
        'Respondo Starter is €29.90/month, Advanced €39.90/month, and Business €49.90/month. Annual subscriptions are billed for 12 months at the same monthly rate, with no annual discount. No VAT is charged due to the small-scale business exemption.'
      )
    };
  }

  if (/\b(?:starter|basic)\b/.test(q) && /(?:sisalta|sisältä|ominaisuus|feature|include|innehall|innehåll|vad far|vad får)/.test(q)) {
    return {id:'respondo-faq-basic',answer:answer(
      'Starter sisältää verkkosivun AI-chatin, yrityksen verkkosivun tietojen tuonnin, botin värin, nimen ja kuvan muokkauksen, oman tietopohjan, Respondon ajanvarauksen, liidit, keskusteluhistorian ja 2 asiakaspalvelijapaikkaa.',
      'Starter omfattar webbchatt, import av företagets webbplatsuppgifter, anpassning av färg, namn och bild, egen kunskapsbas, Respondos bokningar, leads, konversationshistorik och 2 kundserviceplatser.',
      'Starter includes website AI chat, website knowledge import, editable bot color, name and image, a business knowledge base, Respondo-native bookings, leads, conversation history and 2 support-agent seats.'
    )};
  }
  if (/\badvanced\b/.test(q) && /(?:sisalta|sisältä|ominaisuus|feature|include|innehall|innehåll|vad far|vad får)/.test(q)) {
    return {id:'respondo-faq-advanced',answer:answer(
      'Advanced sisältää kaikki Starter-ominaisuudet, 10 asiakaspalvelijapaikkaa ja Google Calendar -synkronoinnin ajanvarauksiin.',
      'Advanced innehåller allt i Starter, 10 kundserviceplatser och Google Kalender-synkronisering för bokningar.',
      'Advanced includes everything in Starter, 10 support-agent seats and Google Calendar synchronization for bookings.'
    )};
  }
  if (/\bbusiness\b/.test(q) && /(?:sisalta|sisältä|ominaisuus|feature|include|innehall|innehåll|vad far|vad får)/.test(q)) {
    return {id:'respondo-faq-business',answer:answer(
      'Business sisältää Starter- ja Advanced-toiminnot sekä 20 asiakaspalvelijapaikkaa, automaattisen tarjouslaskennan, Stripe-maksulinkit, verkkokaupan tilaushaut ja saatavilla olevat webhook- ja API-työnkulut. Toiminnot edellyttävät tarvittavia määrityksiä.',
      'Business innehåller Starter och Advanced samt 20 kundserviceplatser, automatisk offertberäkning, Stripe-betalningslänkar, orderuppslag och tillgängliga webhook- och API-flöden. Funktionerna kräver rätt inställningar.',
      'Business includes Starter and Advanced features plus 20 support-agent seats, automated quote calculations, Stripe payment links, ecommerce order lookup and supported webhook/API workflows. These capabilities require proper configuration.'
    )};
  }

  if (/(?:3 paivan|3 päivän|kolmen paivan|free trial|trial|gratis prov|provperiod|kokeilu).*(?:toim|maks|veloitet|peru|cancel|works|cost|charge|funger|kostar)?|(?:kokeilu|trial|provperiod)/.test(q)) {
    return {
      id:'respondo-faq-trial',
      answer:answer(
        'Respondoa voi kokeilla 3 päivää ilmaiseksi. Kokeilun aikana ei veloiteta tilausmaksua. Jos et halua tilauksen jatkuvan maksullisena, peru se ennen kokeilun päättymistä hallintapaneelin Laskutus-kohdan kautta.',
        'Du kan prova Respondo gratis i 3 dagar. Ingen abonnemangsavgift tas ut under provperioden. Om du inte vill fortsätta med ett betalt abonnemang ska du säga upp det före provperiodens slut via Fakturering i kontrollpanelen.',
        'You can try Respondo free for 3 days. No subscription fee is charged during the trial. If you do not want it to continue as a paid subscription, cancel before the trial ends through Billing in the dashboard.'
      )
    };
  }

  if (/(?:miten|how|hur).*(?:maksan|maksaa tilaus|pay|payment|betala)|(?:stripe|maksutapa|payment method|betalningsmetod)/.test(q)) {
    return {
      id:'respondo-faq-payment',
      answer:answer(
        'Respondon tilaus maksetaan Stripen kautta. Maksutiedot syötetään suoraan Stripen turvalliseen maksunäkymään, ja maksutapaa sekä laskuja voi hallita hallintapaneelin Laskutus-kohdasta.',
        'Respondo-abonnemanget betalas via Stripe. Betalningsuppgifterna anges direkt i Stripes säkra betalningsvy, och betalningsmetod samt fakturor kan hanteras från Fakturering i kontrollpanelen.',
        'Respondo subscriptions are paid through Stripe. Payment details are entered directly in Stripe’s secure checkout, and the payment method and invoices can be managed from Billing in the dashboard.'
      )
    };
  }

  if (
    /(?:peru(?:a|n|t|taa|utus|uttaminen)?|lopeta|lopettaa|paattaa|päättää|irtisano|irtisanom|cancel|cancellation|unsubscribe|terminate|end subscription|stop subscription|sag upp|säga upp|avsluta).*(?:tilaus|subscription|abonnemang)/.test(q) ||
    /(?:tilaus|subscription|abonnemang).*(?:peru(?:a|n|t|taa|utus)?|lopeta|lopettaa|paattaa|päättää|irtisano|cancel|unsubscribe|terminate|end|stop|sag upp|säga upp|avsluta)/.test(q) ||
    /(?:perus|peruut|peru).*(?:tilauks|tilausta)/.test(q)
  ) {
    return {
      id:'respondo-faq-cancel-subscription',
      answer:answer(
        'Voit perua tilauksen milloin tahansa. Kirjaudu Respondoon ja avaa Asetukset → Laskutus → Avaa tilauksen hallinta. Peruminen tehdään Stripen asiakasportaalissa. Peruminen estää seuraavan uusiutumisen, ja jo maksettu laskutuskausi jatkuu normaalisti kauden loppuun.',
        'Du kan säga upp abonnemanget när som helst. Logga in i Respondo och öppna Inställningar → Fakturering → Öppna abonnemangshantering. Uppsägningen görs i Stripes kundportal. Uppsägningen stoppar nästa förnyelse och en redan betald period fortsätter till periodens slut.',
        'You can cancel your subscription at any time. Log in to Respondo and open Settings → Billing → Open subscription management. Cancellation is handled in the Stripe customer portal. Cancelling stops the next renewal, and any already-paid billing period continues until its end.'
      )
    };
  }

  if (/(?:bot|botti|botin).*(?:ulkoasu|appearance|utseende).*(?:muokat|custom|change|andra|anpass)|(?:ulkoasu|appearance|utseende).*(?:bot|botti)/.test(q)) {
    return {
      id:'respondo-faq-appearance',
      answer:answer(
        'Kyllä. Hallintapaneelissa voit vaihtaa botin nimen ja kuvan, jotka näkyvät asiakkaalle chatissa.',
        'Ja. I kontrollpanelen kan du ändra bottens namn och bild, som visas för kunden i chatten.',
        'Yes. In the dashboard you can change the bot name and image that customers see in the chat.'
      )
    };
  }

  if (/(?:tietopohja|knowledge base|kunskapsbas).*(?:toim|work|funger)|(?:miten|how|hur).*(?:tietopohja|knowledge base|kunskapsbas)/.test(q)) {
    return {
      id:'respondo-faq-knowledge-base',
      answer:answer(
        'Tietopohjaan tallennetaan yrityksen hyväksymät tiedot ja kysymys–vastausparit. Respondo etsii kysymykseen sopivimman tiedon ja vastaa sen pohjalta. Vastauksia voi lisätä ja muokata hallintapaneelissa.',
        'I kunskapsbasen sparas företagets godkända uppgifter och frågor med svar. Respondo hittar den information som bäst passar frågan och svarar utifrån den. Svar kan läggas till och redigeras i kontrollpanelen.',
        'The knowledge base stores company-approved information and question-and-answer pairs. Respondo finds the information that best matches the question and answers from it. Answers can be added and edited in the dashboard.'
      )
    };
  }

  if (/(?:bot|botti).*(?:ei tied|ei osaa|doesn t know|does not know|cant answer|cannot answer|vet inte|kan inte svara)|(?:jos|if|om).*(?:bot|botti).*(?:ei|doesn t|does not|inte)/.test(q)) {
    return {
      id:'respondo-faq-unknown-answer',
      answer:answer(
        'Respondo ei arvaa. Jos varmaa vastausta ei löydy yrityksen tiedoista, botti kertoo sen ja voi pyytää asiakkaan yhteystiedot. Kysymys näkyy hallintapaneelissa puuttuvana vastauksena, jotta siihen voi lisätä oikean vastauksen.',
        'Respondo gissar inte. Om ett säkert svar inte finns i företagets uppgifter säger botten det och kan be kunden lämna sina kontaktuppgifter. Frågan visas i kontrollpanelen som ett saknat svar så att rätt svar kan läggas till.',
        'Respondo does not guess. If it cannot find a reliable answer in the company information, the bot says so and can ask for the customer’s contact details. The question appears in the dashboard as a missing answer so the correct answer can be added.'
      )
    };
  }

  if (/(?:asennus|asentaa|install|installation).*(?:toim|how|hur)|(?:miten|how|hur).*(?:asennus|asentaa|install|installation)/.test(q)) {
    return {
      id:'respondo-faq-installation',
      answer:answer(
        'Asennus tehdään kopioimalla hallintapaneelin Asennus-kohdan scriptikoodi verkkosivun HTML:ään juuri ennen </body>-tagia. Koodi on sidottu yrityksen määrittämään verkkosivuun.',
        'Installationen görs genom att kopiera skriptkoden från avsnittet Installation i kontrollpanelen till webbplatsens HTML precis före </body>-taggen. Koden är bunden till den webbplats som företaget har angett.',
        'Installation is done by copying the script code from the Installation section of the dashboard into the website HTML just before the </body> tag. The code is tied to the website configured by the company.'
      )
    };
  }

  return null;
}

const exchangeWord=/\b(?:vaihto(?!eht)\w*|vaihd\w*|vaihta\w*)\b/;

function knowledgeTopic(value) {
  const t=normalizeSearchText(value);
  if (/tarjouspyynt|quote|estimate|offert/.test(t)) return 'quote';
  // Explicit ecommerce policy rows must be classified before generic product words.
  if (/^(?:palautukset?|palautus|returns?|refund|retur|vaihto|exchange)\b/.test(t)) return 'returns';
  if (/^(?:takuu|warranty|guarantee|garanti|reklamaatio)\b/.test(t)) return 'warranty';
  if (/^(?:tilausten seuranta|toimitusaika|toimitus|shipping|delivery|shipment|tracking|leverans)\b/.test(t)) return 'delivery';
  if (/^(?:materiaalit?|material(?:s)?|materia)\b/.test(t)) return 'materials';
  if (/^(?:laatu|valmistus|quality|manufactur|made in)\b/.test(t)) return 'quality';
  if (/^(?:hoito-ohje|hoito|care|maintenance|washing|cleaning instruction)\b/.test(t)) return 'care';
  if (/^(?:koot ja mitat|koot?|mitat|size|sizes|sizing|dimensions?|storlek)\b/.test(t)) return 'sizing';
  if (/^(?:sijainti ja myymalat|sijainti|myymala|myymälä|osoite|store location|location|butik)\b/.test(t)) return 'stores';
  // Payment-method knowledge must win over the word "maksaa/pay", while any
  // explicit price marker must still outrank service words such as "pesu".
  if(/maksutapa|maksaminen|maksuvaihtoeh|korttimaks|klarna|paypal|mobilepay|apple pay|google pay|payment method|payment options|pay with|pay by|betalning|betalningsmetod|faktura/.test(t)) return 'payment';
  if (/^hinnat\b|hinta|hinnoittelu|price|pricing|cost|pris|kostnad/.test(t)) return 'pricing';
  // Keep actual services separate from retail products.
  if(/palvelu|service|services|tjanst|tjänst|tarjoa|erbjud|huolto|pesu|pesut|siistim|raivaus|maalaust|leikkaus|poisvienti|puhdist|purku|kartoit|kierrat|kierrät|murske|asbesti|haitta.?aine|saneeraus|linjasaneeraus/.test(t)) return 'services';
  if(/tuote|product|valikoima|selection|sortiment|myy|sell|sku|tuotenumero/.test(t)) return 'products';
  if(/auki|opening|hours|oppet|öppet|oppettid/.test(t)) return 'hours';
  if(/toimitus|toimituk|toimiteta|toimitamme|toimitatte|toimitusaika|shipping|delivery|shipment|nouto|pickup|leverans|seurant|tracking|track order|lahetys|sparning/.test(t)) return 'delivery';
  if(/palaut|return|refund|exchange|retur|aterbetal/.test(t) || exchangeWord.test(t)) return 'returns';
  if(/materiaali|material|made from|made of/.test(t)) return 'materials';
  if(/laatu|quality|valmistus|manufactur|made in|handmade|cnc|precision|sertifio|certif/.test(t)) return 'quality';
  if(/hoito-oh|care instruction|product care|maintenance instruction|washing instruction|pesuoh/.test(t)) return 'care';
  if(/kokotauluk|koko-opas|koot\b|size guide|sizing|mitat|dimension|storlek/.test(t)) return 'sizing';
  if(/myymala|myymälä|store|location|butik|sijainti|osoite|address|adress/.test(t)) return 'stores';
  if(/yhteys|contact|puhelin|phone|email|sahkoposti|sähköposti|kontakt|telefon|e-post/.test(t)) return 'contact';
  if(/takuu|reklamaatio|warranty|guarantee|garanti|reklamation/.test(t)) return 'warranty';
  if(/ajanvaraus|ajanvarauslinkki|booking|appointment|boka|bokning|tidsbokning/.test(t)) return 'booking';
  if(/usein kysytyt|faq/.test(t)) return 'faq';
  return '';
}
function queryTopic(query) {
  const q=normalizeSearchText(query);
  const explicitContact=explicitContactQuestion(q);
  if(explicitContact) return 'contact';
  if(explicitBusinessLocationQuestion(q)) return 'stores';
  // A size question remains about sizes even if the customer also says
  // "available": availability must not override product dimensions.
  if(/\b(?:koko\w*|koissa|koossa|sizes?\b|sizing|storlek\w*)\b/.test(q)) return 'sizing';
  const lexicalIntent=intentForMessage(q);
  const intentTopic={
    pricing:'pricing',
    shipping:'delivery',
    returns:'returns',
    location:'stores',
    hours:'hours',
    contact:'contact',
    booking:'booking',
    payment:'payment',
    warranty:'warranty',
    availability:'products',
    products:'products',
    services:'services',
    quote:'quote',
    care:'care',
    size:'sizing',
    color:'products',
    material:'materials',
  }[lexicalIntent] || '';
  if(intentTopic) return intentTopic;
  if (/tarjou[sk]|quote|estimate|offert/.test(q)) return 'quote';
  if(/yhteys|contact|puhelin|phone|email|sahkoposti|sähköposti|kontakt|telefon|e-post|postadress/.test(q)) return 'contact';
  if (/osoite|address|(?:^|\s)adress(?:\s|$)|sijainti|miss[aä]\s+sijait|where\s+(?:are|is).*located|where\s+is\s+(?:your\s+)?store|myymala|myymälä|store location|butik/.test(q)) return 'stores';
  if (!/hinta|maksaa|price|cost|pris|kostar|auki|hours|open|oppet/.test(q) && /mita teette|mitä teette|mita tarjoatte|mitä tarjoatte|mita palvel|mitä palvel|what do you (?:do|offer)|services|vad gor ni|vad gör ni|vad erbjuder|vilka tjänster|vilka tjanster|tjanster|tjänster|klipper ni|tvattar ni|rengor ni|reparerar ni|installerar ni|malar ni|underhaller ni|har ni .*(?:klipp|service|tjanst)|onnistuuko|onnistuisko|pystytteko|voitteko|voisitteko|onko teilla|loytyyko teilta|löytyykö teiltä|haluaisin tilata|haluan tilata|tarvitsen|tarviin|pesu|puhdist|siivou|oljy|öljy|asenn|maal|korj|huol|raiva|poisvien/.test(q)) return 'services';
  if(/mita myytte|mitä myytte|mita teilta saa|mitä teiltä saa|valikoima|tuotteita|products|what do you sell|what products|vad säljer|vad saljer|sortiment|vari|väri|color|colour|farg|färg|saatavuus|varastossa|in stock/.test(q)) return 'products';
  // Shipping-cost questions are delivery-policy questions, not generic pricing.
  // "How much does shipping cost?" must retrieve shipping rows instead of product/service prices.
  if(/toimit|postikulu|postitus|shipping|delivery|postage|frakt|leverans/.test(q) &&
     /hinta|maksaa|maksu|kulu|veloit|price|cost|fee|charge|pris|kostar|avgift|betalt/.test(q)) return 'delivery';
  // Payment-method questions such as "voiko maksaa Klarnalla?" must not be
  // mistaken for a generic price question just because they contain "maksaa".
  if(/maksutapa|maksaminen|maksuvaihtoeh|kortilla|korttimaks|klarn|paypal|mobilepay|apple pay|google pay|payment method|payment options|pay with|pay by|betalning|betalningsmetod|faktura/.test(q)) return 'payment';
  if(/hinta|maksaa|hinnoittelu|price|pricing|cost|pris|kostar/.test(q)) return 'pricing';
  if(/auki|aukiolo|opening|hours|open|oppet|öppet|oppettid/.test(q)) return 'hours';
  if(/toimitus|toimituk|toimiteta|toimitamme|toimitatte|toimitusaika|tilaus.*(?:saap|perill)|shipping|delivery|shipment|order.*arriv|nouto|pickup|leverans|bestallning.*(?:kommer|komma).*fram|seurant|tracking|track order|where is my order|tilauksen tila|lahetys|sparning/.test(q)) return 'delivery';
  if(/palaut|return|refund|exchange|retur|aterbetal/.test(q) || exchangeWord.test(q)) return 'returns';
  if(/materiaali|materiaalista|mista tehty|mistä tehty|made of|made from|material|materials/.test(q)) return 'materials';
  if(/laatu|laadukas|quality|valmistettu|valmistus|made in|where.*made|manufactur|handmade|käsinteht|kasinteht|cnc|precision/.test(q)) return 'quality';
  if(/hoito-oh|miten.*(?:puhdist|pese|huolla)|care instruction|how.*(?:clean|wash|care)|maintenance instruction|pesuoh/.test(q)) return 'care';
  if(/kokotauluk|koko-opas|mita koko|mitä koko|\b(?:koissa|koossa|kokovaihtoeht\w*)\b|koot\b|size guide|what size|sizes\b|sizing|mitat|dimension|storlek/.test(q)) return 'sizing';
  if(/yhteys|contact|puhelin|phone|email|sahkoposti|sähköposti|kontakt|telefon|e-post/.test(q)) return 'contact';
  if(/takuu|reklamaatio|warranty|guarantee|garanti|reklamation/.test(q)) return 'warranty';
  if(/ajanvaraus|varaa aika|varata ajan|ajan vara|booking|appointment|boka|bokning|tidsbokning/.test(q)) return 'booking';
  return '';
}

function productStem(value) {
  let word=normalizeSearchText(value).replace(/[^a-z0-9]/g,'');
  word=word.replace(/(?:eista|eita|ista|issa|illa|ille|sta|ssa|lla|lle|ksi|ien|jen|ita|iat|ers|er|s)$/,'');
  if(word.length>5 && /i$/.test(word)) word=word.slice(0,-1);
  if(word.length>5 && /a$/.test(word)) word=word.slice(0,-1);
  return word;
}
function productCatalog(rows) {
  const out=[]; const seen=new Set();
  for(const row of rows||[]){
    const product=parseProductKnowledgeRow(row);
    if(!product?.name) continue;
    const key=normalizeSearchText((product.url || '')+'|'+product.name);
    if(seen.has(key)) continue;
    seen.add(key);
    out.push(product);
  }
  return out;
}
function productColorAliases(value) {
  const q=normalizeSearchText(value).replace(/[-_/]+/g,' ');
  const out=new Set();
  const add=(canonical,re)=>{ if(re.test(q)) out.add(canonical); };
  add('black',/\b(?:black|musta\w*|svart\w*)\b/);
  add('bronze',/\b(?:bronze|pronssi\w*|pronss\w*|brons\w*)\b/);
  add('steel',/\b(?:steel|teras\w*|teräs\w*|stal\w*|stål\w*)\b/);
  add('white',/\b(?:white|valko\w*|vit\w*)\b/);
  add('red',/\b(?:red|punai\w*|rod\w*|röd\w*)\b/);
  add('blue',/\b(?:blue|sini\w*|bla\w*|blå\w*)\b/);
  add('green',/\b(?:green|vihre\w*|gron\w*|grön\w*)\b/);
  add('grey',/\b(?:grey|gray|harmaa\w*|gra\w*|grå\w*)\b/);
  add('silver',/\b(?:silver|hopea\w*)\b/);
  add('gold',/\b(?:gold|kulta\w*|guld\w*)\b/);
  add('brown',/\b(?:brown|ruskea\w*|brun\w*)\b/);
  add('pink',/\b(?:pink|vaaleanpunai\w*|rosa\w*)\b/);
  return [...out];
}

function productQueryTokens(message) {
  const ignored=/^(?:koissa|koossa|kokovaihtoeht\w*|mika|mikä|mitka|mitkä|mita|mitä|on|ovat|teidan|teidän|teilla|teillä|meidan|meidän|halvin|edullisin|kallein|paras|suosituin|suosituimmat|myydyin|myydyimmat|popular|popularest|bestseller|bestsellers|best|selling|price|prices|cheapest|cheaper|lowest|most|expensive|what|which|your|you|have|do|cost|how|much|billigast|billigaste|dyrast|dyraste|popularast|populärast|bastsaljare|bästsäljare|vilken|vilka|har|ni|kostar|tuote|tuotteet|product|products|vari|väri|varit|värit|color|colors|colour|colours|farg|färg|koko|koot|size|sizes|storlek|materiaali|materiaalit|material|materials|mitat|dimensions|dimension|paino|weight)$/;
  const normalized=String(message||'').replace(/[-_/]+/g,' ');
  const tokens=searchTokens(normalized).map(productStem).filter((word)=>word.length>=3&&!ignored.test(word));
  for(const alias of productColorAliases(normalized)) tokens.push(alias);
  return [...new Set(tokens)];
}

function productHasColorAlias(product, aliases=[]) {
  if(!aliases.length) return false;
  const values=[
    product?.name,
    ...(product?.colors||[]),
    ...((product?.options||[]).flatMap((option)=>option?.values||[])),
  ].filter(Boolean).map((value)=>normalizeSearchText(value));
  return aliases.some((alias)=>values.some((value)=>value.includes(alias)));
}

function productFamilyFromProduct(product) {
  const text=normalizeSearchText((product?.name||'')+' '+(product?.productType||''));
  if(/\bputter\w*\b/.test(text)) return 'putter';
  if(/\b(?:headcover|head cover|mailansuoja\w*)\b/.test(text)) return 'headcover';
  if(/\bgrip\w*\b/.test(text)) return 'grip';
  if(/\b(?:towel\w*|pyyhe\w*|handduk\w*)\b/.test(text)) return 'towel';
  if(/\b(?:golfball\w*|golf ball\w*|golfpallo\w*)\b/.test(text)) return 'golfball';
  if(/\b(?:golf bag\w*|golfbag\w*)\b/.test(text)) return 'golfbag';
  return '';
}

function latestHistoryQuestionAnswer(history=[]) {
  if(!Array.isArray(history)) return {question:'',answer:''};
  let answer='';
  for(let i=history.length-1;i>=0;i--){
    const item=history[i]||{};
    if(item.question) return {question:String(item.question||''),answer:String(item.answer||answer||'')};
    if(item.role==='assistant' && !answer) answer=String(item.content||'');
    if(item.role==='user') return {question:String(item.content||''),answer};
  }
  return {question:'',answer:''};
}

function directProductVariantFollowup(products,message,history=[],lang='fi') {
  const q=normalizeSearchText(message);
  const aliases=productColorAliases(message);
  if(!aliases.length) return null;
  const continuation=/^(?:enta|entapa|entas|ja enta|no enta|what about|and what about|how about|and how about|och|och da|men den|men det)\b/.test(q);
  if(!continuation && q.split(/\s+/).length>4) return null;

  const previous=latestHistoryQuestionAnswer(history);
  if(!previous.question) return null;
  const previousQ=normalizeSearchText(previous.question);
  const previousPrice=/\b(?:hinta|maksaa|maksavat|price|cost|costs|pris|kostar)\b/.test(previousQ) || /\bhow\s+much\b/.test(previousQ) || /\bhur\s+mycket\b/.test(previousQ);
  const previousStock=/\b(?:varastossa|saatavilla|saatavuus|in stock|available|lager|i lager)\b/.test(previousQ);
  const previousFamily=requestedProductFamily(previous.question);

  let previousProduct=products.find((product)=>normalizeSearchText(previous.answer).includes(normalizeSearchText(product.name)));
  if(!previousProduct){
    const previousTokens=productQueryTokens(previous.question);
    previousProduct=[...products]
      .map((product)=>({...product,_score:productMatchScore(product,previousTokens)}))
      .sort((a,b)=>b._score-a._score)[0] || null;
  }
  const family=previousFamily || productFamilyFromProduct(previousProduct);
  let candidates=products.filter((product)=>productHasColorAlias(product,aliases));
  if(family) candidates=candidates.filter((product)=>productMatchesFamily(product,family));
  if(!candidates.length) return null;

  if(previousProduct){
    const ignoredColor=new Set(['black','bronze','steel','white','red','blue','green','grey','gray','silver','gold','brown','pink']);
    const shared=searchTokens(previousProduct.name).map(productStem)
      .filter((token)=>token.length>=3 && !ignoredColor.has(token) && !/^putter/.test(token));
    candidates=candidates.map((product)=>{
      const nameTokens=searchTokens(product.name).map(productStem);
      const score=shared.reduce((sum,token)=>sum+(nameTokens.includes(token)?10:0),0);
      return {...product,_contextScore:score};
    }).sort((a,b)=>b._contextScore-a._contextScore);
  }

  const best=candidates[0];
  if(!best) return null;
  if(previousPrice && Number.isFinite(best.price)){
    const price=productPriceText(best,lang);
    const answer=lang==='en'?best.name+' costs '+price+'.'
      :lang==='sv'?best.name+' kostar '+price+'.'
      :best.name+' maksaa '+price+'.';
    return {answer,handoff:false,confidence:0.995,intent:'Tuotteet',sourceIds:[best.row?.id].filter(Boolean),selected:[best.row].filter(Boolean)};
  }
  if(previousStock && best.availability){
    const inStock=normalizeSearchText(best.availability)==='varastossa';
    const answer=lang==='en'?(inStock?best.name+' is in stock.':best.name+' is currently not in stock.')
      :lang==='sv'?(inStock?best.name+' finns i lager.':best.name+' finns inte i lager just nu.')
      :(inStock?best.name+' on varastossa.':best.name+' ei ole tällä hetkellä varastossa.');
    return {answer,handoff:false,confidence:0.99,intent:'Tuotteet',sourceIds:[best.row?.id].filter(Boolean),selected:[best.row].filter(Boolean)};
  }
  const price=productPriceText(best,lang);
  const answer=best.name+(price?' – '+price:'')+'.';
  return {answer,handoff:false,confidence:0.96,intent:'Tuotteet',sourceIds:[best.row?.id].filter(Boolean),selected:[best.row].filter(Boolean)};
}
function productMatchScore(product, tokens) {
  if(!tokens.length) return 1;
  const optionText=(product.options||[]).flatMap((option)=>[option?.name,...(option?.values||[])]);
  const specText=(product.specs||[]).flatMap((spec)=>[spec?.name,spec?.value]);
  const primaryTokens=searchTokens([
    product.name,product.productType,product.brand,
    ...(product.colors||[]),...(product.sizes||[]),...(product.materials||[]),
    ...optionText
  ].filter(Boolean).join(' ')).map(productStem);
  const secondaryTokens=searchTokens([...(specText||[]),product.description||''].filter(Boolean).join(' ')).map(productStem);
  let score=0;
  for(const token of tokens){
    if(primaryTokens.includes(token)) score+=12;
    else if(primaryTokens.some((word)=>word.startsWith(token)||token.startsWith(word))) score+=6;
    else if(secondaryTokens.includes(token)) score+=2;
    else if(secondaryTokens.some((word)=>word.startsWith(token)||token.startsWith(word))) score+=1;
  }
  return score;
}

function productNameMatchScore(product,tokens,family='') {
  if(!tokens.length) return 0;
  const familyTerms={
    putter:/^putter/,
    headcover:/^(?:headcover|head|cover|mailansuoja)/,
    grip:/^grip/,
    towel:/^(?:towel|pyyhe|handduk)/,
    golfball:/^(?:golfball|golf|ball|golfpallo)/,
    golfbag:/^(?:golfbag|golf|bag)/,
    giftcard:/^(?:gift|card|lahjakort)/,
  };
  const ignore=familyTerms[family] || /$a/;
  const meaningful=tokens.filter((token)=>!ignore.test(token));
  if(!meaningful.length) return 0;
  const nameTokens=searchTokens(product?.name||'').map(productStem);
  let score=0;
  for(const token of meaningful){
    if(nameTokens.includes(token)) score+=20;
    else if(nameTokens.some((word)=>word.startsWith(token)||token.startsWith(word))) score+=10;
  }
  return score;
}

function requestedProductFamily(value) {
  const q=normalizeSearchText(value);
  if (/\bputter\w*\b/.test(q)) return 'putter';
  if (/\b(?:headcover|head cover|mailansuoja\w*)\b/.test(q)) return 'headcover';
  if (/\bgrip\w*\b/.test(q)) return 'grip';
  if (/\b(?:towel\w*|pyyhe\w*|handduk\w*)\b/.test(q)) return 'towel';
  if (/\b(?:golfball\w*|golf ball\w*|golfpallo\w*)\b/.test(q)) return 'golfball';
  if (/\b(?:golf bag\w*|golfbag\w*|golfb[aä]g\w*)\b/.test(q)) return 'golfbag';
  if (/\b(?:gift card\w*|lahjakort\w*)\b/.test(q)) return 'giftcard';
  return '';
}

function productMatchesFamily(product,family) {
  if(!family) return true;
  const name=normalizeSearchText(product?.name||'');
  const type=normalizeSearchText(product?.productType||'');
  const text=(name+' '+type).trim();
  if(family==='putter'){
    if(/\b(?:gift card|lahjakort|headcover|head cover|mailansuoja|grip|towel|pyyhe|cover)\b/.test(text)) return false;
    return /\bputter\w*\b/.test(type) || /\bputter\b/.test(name);
  }
  if(family==='headcover') return /\b(?:headcover|head cover|mailansuoja\w*)\b/.test(text);
  if(family==='grip') return /\bgrip\w*\b/.test(text);
  if(family==='towel') return /\b(?:towel\w*|pyyhe\w*|handduk\w*)\b/.test(text);
  if(family==='golfball') return /\b(?:golfball\w*|golf ball\w*|golfpallo\w*)\b/.test(text);
  if(family==='golfbag') return /\b(?:golf bag\w*|golfbag\w*|golfb[aä]g\w*)\b/.test(text);
  if(family==='giftcard') return /\b(?:gift card\w*|lahjakort\w*)\b/.test(text);
  return true;
}

function productPopularityEvidence(product) {
  const text=normalizeSearchText([
    product.name,product.productType,product.brand,product.description,
    product.row?.title,product.row?.answer,(product.row?.keywords||[]).join(' ')
  ].filter(Boolean).join(' '));
  return /(?:bestseller|best seller|best-selling|best selling|most popular|most sold|top seller|suosituin|myydyin|myydyimp|bastsaljare|bästsäljare|populärast|mest salda|mest sålda)/.test(text);
}
function productPriceText(product,lang='fi') {
  if(!Number.isFinite(product?.price)) return '';
  const locale=lang==='en'?'en-US':lang==='sv'?'sv-SE':'fi-FI';
  const currency=/^[A-Z]{3}$/.test(product.currency||'')?product.currency:'';
  const format=(value)=>currency
    ? new Intl.NumberFormat(locale,{style:'currency',currency,minimumFractionDigits:0,maximumFractionDigits:2}).format(value)
    : new Intl.NumberFormat(locale,{minimumFractionDigits:0,maximumFractionDigits:2}).format(value);
  if(Number.isFinite(product.maxPrice)&&product.maxPrice>product.price) return format(product.price)+'–'+format(product.maxPrice);
  return format(product.price);
}
function broadProductQuestion(value) {
  const q=normalizeSearchText(value);
  return /(?:^|\b)(?:mita|mitä)\s+(?:te\s+)?myytte\b|\b(?:mita|mitä)\s+tuotteita\s+teilta\s+loytyy\b|\bmillainen\s+tuotevalikoima\b|\bwhat\s+do\s+you\s+sell\b|\bwhat\s+(?:kind|type)s?\s+of\s+products\b|\bwhat\s+products\s+do\s+you\s+sell\b|\bwhat\s+is\s+in\s+your\s+product\s+range\b|\bvad\s+s[aä]ljer\s+ni\b|\bvilka\s+produkter\s+s[aä]ljer\s+ni\b|\bvad\s+har\s+ni\s+(?:for|för)\s+(?:produkter|sortiment)\b|\bvad\s+finns\s+i\s+ert\s+sortiment\b/.test(q);
}

function broadProductCategory(product, lang='fi') {
  const text=normalizeSearchText([product?.productType,product?.name].filter(Boolean).join(' '));
  const labels=[
    [/\bputter/,['Putterit','Putters','Putters']],
    [/\bhead\s*cover|\bheadcover/,['Mailansuojat','Headcovers','Headcovers']],
    [/\btowel|\bpyyhe|\bhandduk/,['Pyyhkeet','Handdukar','Towels']],
    [/\bgrip|\bkahva/,['Gripit','Grepp','Grips']],
    [/\bgolf\s*ball|\bgolfpallo/,['Golfpallot','Golfbollar','Golf balls']],
    [/\bgolf\s*bag|\bstand\s*bag|\bcart\s*bag/,['Golfbägit','Golfbagar','Golf bags']],
    [/\bpolo|\bshirt|\bt[- ]?shirt|\bhoodie|\bapparel|\bvaate|\bklader|\bkläder/,['Vaatteet','Kläder','Apparel']],
    [/\bcap\b|\bhat\b|\bpipo|\blippis|\bmössa|\bmossa/,['Päähineet','Huvudbonader','Headwear']],
    [/\bshoe|\bkenka|\bkenkä|\bsko\b/,['Kengät','Skor','Shoes']],
    [/\bglove|\bhanska/,['Hanskat','Handskar','Gloves']],
  ];
  for(const [re,values] of labels){
    if(re.test(text)) return values[lang==='sv'?1:lang==='en'?2:0];
  }

  const raw=String(product?.productType||'').replace(/\s+/g,' ').trim();
  if(raw && !/^(?:product|products|tuote|tuotteet|other|misc|general)$/i.test(raw) && raw.length<=45) return raw;
  return '';
}

function broadProductStoreType(products, lang='fi') {
  const text=normalizeSearchText(products.map((product)=>[
    product.name,product.productType,product.brand,(product.row?.keywords||[]).join(' ')
  ].filter(Boolean).join(' ')).join(' '));
  const golfHits=(text.match(/\b(?:golf|putter|headcover|grip|golfball|golf bag)\b/g)||[]).length;
  const petHits=(text.match(/\b(?:pet|dog|cat|puppy|kitten|koira|kissa|hund|katt)\b/g)||[]).length;
  const fitnessHits=(text.match(/\b(?:fitness|gym|workout|training|resistance|dumbbell|kettlebell)\b/g)||[]).length;
  const beautyHits=(text.match(/\b(?:beauty|skincare|cosmetic|serum|cream|makeup)\b/g)||[]).length;
  const electronicsHits=(text.match(/\b(?:electronics|electronic|charger|headphone|keyboard|mouse|camera)\b/g)||[]).length;

  if(golfHits>=2) return lang==='en'?'golf equipment':lang==='sv'?'golfutrustning':'golfvarusteita';
  if(petHits>=2) return lang==='en'?'pet products':lang==='sv'?'husdjursprodukter':'lemmikkituotteita';
  if(fitnessHits>=2) return lang==='en'?'fitness equipment':lang==='sv'?'träningsutrustning':'treenivarusteita';
  if(beautyHits>=2) return lang==='en'?'beauty products':lang==='sv'?'skönhetsprodukter':'kauneustuotteita';
  if(electronicsHits>=2) return lang==='en'?'electronics':lang==='sv'?'elektronik':'elektroniikkaa';
  return lang==='en'?'products':lang==='sv'?'produkter':'tuotteita';
}

function productCatalogDestination(rows) {
  const explicit=knowledgeValue(rows,'Tuotekatalogi');
  if(/^https?:\/\//i.test(explicit)) return explicit;

  const products=productCatalog(rows).filter((product)=>product?.url);
  const first=products[0]?.url || '';
  const website=knowledgeValue(rows,'Verkkosivu');
  try {
    const productUrl=new URL(first);
    const baseUrl=/^https?:\/\//i.test(website)?new URL(website):productUrl;
    if(productUrl.hostname.toLowerCase()!==baseUrl.hostname.toLowerCase()) return '';
    if(/^\/products\/[^/]+/i.test(productUrl.pathname)) {
      return new URL('/collections/all',productUrl.origin).href;
    }
  } catch {}
  return '';
}


function ecommerceOrderQuestion(value, lang='') {
  const q=normalizeSearchText(value);
  if(!q) return false;
  if(intentForMessage(q,lang)==='order') return true;
  return /^(?:(?:miten|kuinka)\s+(?:voin\s+)?(?:tilata|ostaa|hankkia)(?:\s+(?:tuotteita?|tuotteen|teilta|taman|sen|niita))?|(?:miten|kuinka)\s+(?:tilaan|ostan)(?:\s+(?:tuotteita?|tuotteen|sen|taman))?|(?:miten|kuinka)\s+(?:sen|taman|tuotteen)\s+(?:voi|voin)\s+(?:tilata|ostaa)|mista\s+(?:voin\s+)?(?:tilata|ostaa|hankkia)(?:\s+(?:tuotteita?|tuotteen))?|(?:voinko|voiko)\s+(?:teilta\s+)?(?:tilata|ostaa)(?:\s+(?:tuotteita?|tuotteen|sen|taman))?|(?:haluan|haluaisin)\s+(?:tilata|ostaa)(?:\s+(?:tuotteita?|tuotteen))?|how\s+(?:do|can)\s+i\s+(?:order|buy|purchase)(?:\s+(?:products?|items?|it|this|one))?|where\s+can\s+i\s+(?:order|buy|purchase)(?:\s+(?:products?|items?))?|can\s+i\s+(?:order|buy|purchase)(?:\s+(?:products?|items?|it|this|one))?|i\s+(?:want|would like)\s+to\s+(?:order|buy|purchase)(?:\s+(?:products?|items?))?|hur\s+(?:kan\s+jag\s+)?(?:bestalla|kopa)(?:\s+(?:produkter|varor|den|det))?|var\s+kan\s+jag\s+(?:bestalla|kopa)(?:\s+(?:produkter|varor))?|kan\s+jag\s+(?:bestalla|kopa)(?:\s+(?:produkter|varor|den|det))?)$/.test(q);
}

function directEcommerceOrderingAnswer(rows,message,lang='fi') {
  if(!ecommerceOrderQuestion(message,lang)) return null;
  const products=productCatalog(rows).filter((product)=>product?.url);
  const catalogUrl=productCatalogDestination(rows);
  if(!catalogUrl && !products.length) return null;

  const catalogRow=rows.find((row)=>
    String(row?.title||'')==='Tuotekatalogi' &&
    /^https?:\/\//i.test(String(row?.answer||''))
  );
  const evidenceRows=products.slice(0,3).map((product)=>product.row).filter(Boolean);
  const sourceIds=[catalogRow?.id,...evidenceRows.map((row)=>row?.id)].filter(Boolean);
  const selected=catalogUrl ? [] : evidenceRows;
  const answer=lang==='en'
    ? 'You can order products directly from the online store. Open the product selection below and choose the product you want.'
    : lang==='sv'
      ? 'Du kan beställa produkter direkt från webbutiken. Öppna produktsortimentet nedan och välj den produkt du vill ha.'
      : 'Voit tilata tuotteet suoraan verkkokaupasta. Avaa tuotevalikoima alta ja valitse haluamasi tuote.';

  return {
    answer,
    handoff:false,
    confidence:0.97,
    intent:'Tuotteet',
    sourceIds,
    selected
  };
}

function directProductAnswer(rows,message,lang='fi',history=[]) {
  const products=productCatalog(rows);
  if(!products.length) return null;
  const followup=directProductVariantFollowup(products,message,history,lang);
  if(followup) return followup;
  const q=normalizeSearchText(message);
  const tokens=productQueryTokens(message);
  const ranked=products.map((product)=>({...product,_match:productMatchScore(product,tokens)}))
    .sort((a,b)=>b._match-a._match || (Number(a.price??Infinity)-Number(b.price??Infinity)));
  // Product-family words such as "putterit" must match the actual product type/name,
  // not a brand name ("JAG Putters") or an accessory description. This prevents
  // gift cards, grips and headcovers from being returned as putters.
  const requestedFamily=requestedProductFamily(message);
  const familyMatches=requestedFamily ? ranked.filter((product)=>productMatchesFamily(product,requestedFamily)) : [];
  const strongMatches=tokens.length ? ranked.filter((product)=>product._match>=6) : ranked;
  const weakMatches=tokens.length ? ranked.filter((product)=>product._match>0) : ranked;
  const candidates=requestedFamily
    ? familyMatches
    : (strongMatches.length?strongMatches:(weakMatches.length?weakMatches:ranked));
  const cheapest=/\b(?:halvin|edullisin|cheapest|lowest price|billigast|billigaste)\b/.test(q);
  const expensive=/\b(?:kallein|most expensive|highest price|dyrast|dyraste)\b/.test(q);
  const popularAsk=/\b(?:suosituin|suosituimmat|myydyin|myydyimmat|myydyimmät|most popular|best seller|bestseller|best-selling|top seller|populärast|bastsaljare|bästsäljare|mest sålda|mest salda)\b/.test(q);
  const priceAsk=/\b(?:hinta\w*|maksaa|maksavat|price\w*|cost\w*|pris\w*|kostar)\b/.test(q) || /\bhow\s+much\b/.test(q) || /\bhur\s+mycket\b/.test(q);
  const stockAsk=/\b(?:varastossa|saatavilla|saatavuus|in stock|available|lager|i lager)\b/.test(q);
  const colorAsk=/\b(?:var\w*|vär\w*|colo\w*|farg\w*|färg\w*)\b/.test(q);
  const sizeAsk=/\b(?:koko\w*|koissa|koossa|size\w*|sizing|storlek\w*)\b/.test(q);
  const materialAsk=/\b(?:materia\w*|material\w*|made of|made from)\b/.test(q);
  const specAsk=/\b(?:mitta\w*|mitat|dimension\w*|paino\w*|weight\w*|pituu\w*|length\w*|levey\w*|width\w*|korkeu\w*|height\w*)\b/.test(q);
  const generalSellAsk=broadProductQuestion(message);
  const listAsk=generalSellAsk || /(?:mita|mitä|mitka|mitkä|what|which|vilka).*(?:tuot|product|putter|maila|sortiment|valikoim)|(?:tuotteita|products|puttereita|putters).*(?:teilla|teillä|have|har)/.test(q);
  const bestCandidate=candidates[0];

  if(popularAsk){
    const categoryMatches=tokens.length
      ? ranked.filter((product)=>product._match>=6)
      : ranked;
    const pool=categoryMatches.length?categoryMatches:candidates;
    const proven=pool.filter(productPopularityEvidence).slice(0,4);
    if(proven.length){
      const names=proven.map((product)=>product.name);
      const answer=lang==='en'
        ? (proven.length===1 ? `${names[0]} is marked as a best seller / popular product in the store information.` : `These products are marked as best sellers / popular products: ${names.join(', ')}.`)
        : lang==='sv'
          ? (proven.length===1 ? `${names[0]} är markerad som en bästsäljare / populär produkt i butikens information.` : `Dessa produkter är markerade som bästsäljare / populära produkter: ${names.join(', ')}.`)
          : (proven.length===1 ? `${names[0]} on merkitty verkkokaupan tiedoissa suosituimmaksi tai bestseller-tuotteeksi.` : `Nämä tuotteet on merkitty verkkokaupan tiedoissa suosituiksi tai bestseller-tuotteiksi: ${names.join(', ')}.`);
      return {answer,handoff:false,confidence:0.97,intent:'Tuotteet',sourceIds:proven.map((product)=>product.row?.id).filter(Boolean),selected:proven.map((product)=>product.row).filter(Boolean)};
    }
    const answer=lang==='en'
      ? 'The store information does not contain a verified popularity or best-seller ranking for these products.'
      : lang==='sv'
        ? 'Butikens information innehåller ingen bekräftad popularitets- eller bästsäljarstatistik för de här produkterna.'
        : 'Verkkokaupan tiedoissa ei ole vahvistettua suosio- tai myyntijärjestystä näille tuotteille.';
    return {answer,handoff:false,confidence:0.92,intent:'Tuotteet',sourceIds:[],selected:[]};
  }

  if(cheapest || expensive){
    const priced=candidates.filter((product)=>Number.isFinite(product.price));
    if(!priced.length) return null;
    priced.sort((a,b)=>Number(a.price)-Number(b.price));
    const extreme=expensive?priced[priced.length-1].price:priced[0].price;
    const tied=priced.filter((product)=>Math.abs(Number(product.price)-Number(extreme))<0.000001).slice(0,4);
    const price=productPriceText(tied[0],lang);
    let answer='';
    if(tied.length===1){
      const product=tied[0];
      answer=lang==='en'
        ? `The ${expensive?'most expensive':'cheapest'} matching product is ${product.name}${price?', '+price:''}.`
        : lang==='sv'
          ? `Den ${expensive?'dyraste':'billigaste'} matchande produkten är ${product.name}${price?', '+price:''}.`
          : `${expensive?'Kallein':'Halvin'} sopiva tuote on ${product.name}${price?', '+price:''}.`;
    } else {
      const names=tied.map((product)=>product.name).join(', ');
      answer=lang==='en'
        ? `The ${expensive?'highest':'lowest'} matching price is ${price}. Products at that price: ${names}.`
        : lang==='sv'
          ? `Det ${expensive?'högsta':'lägsta'} matchande priset är ${price}. Produkter till det priset: ${names}.`
          : `${expensive?'Kallein':'Halvin'} sopiva hinta on ${price}. Tällä hinnalla ovat: ${names}.`;
    }
    return {
      answer,handoff:false,confidence:0.99,intent:'Tuotteet',
      sourceIds:tied.map((product)=>product.row?.id).filter(Boolean),
      selected:tied.map((product)=>product.row).filter(Boolean)
    };
  }

  if(bestCandidate && (colorAsk || sizeAsk || materialAsk || specAsk)){
    const selected=[bestCandidate.row].filter(Boolean);
    const sourceIds=[bestCandidate.row?.id].filter(Boolean);
    if(colorAsk && bestCandidate.colors?.length){
      const values=bestCandidate.colors.join(', ');
      const answer=lang==='en'?bestCandidate.name+' is available in these colors: '+values+'.'
        :lang==='sv'?bestCandidate.name+' finns i följande färger: '+values+'.'
        :bestCandidate.name+' on saatavilla väreissä: '+values+'.';
      return {answer,handoff:false,confidence:0.99,intent:'Tuotteet',sourceIds,selected};
    }
    if(sizeAsk && bestCandidate.sizes?.length){
      const values=bestCandidate.sizes.join(', ');
      const answer=lang==='en'?bestCandidate.name+' is available in these sizes: '+values+'.'
        :lang==='sv'?bestCandidate.name+' finns i följande storlekar: '+values+'.'
        :bestCandidate.name+' on saatavilla koossa/koissa: '+values+'.';
      return {answer,handoff:false,confidence:0.99,intent:'Tuotteet',sourceIds,selected};
    }
    if(materialAsk && bestCandidate.materials?.length){
      const values=bestCandidate.materials.join(', ');
      const answer=lang==='en'?bestCandidate.name+' uses these materials: '+values+'.'
        :lang==='sv'?bestCandidate.name+' har följande material: '+values+'.'
        :bestCandidate.name+' materiaalit: '+values+'.';
      return {answer,handoff:false,confidence:0.99,intent:'Tuotteet',sourceIds,selected};
    }
    if(specAsk && bestCandidate.specs?.length){
      const values=bestCandidate.specs.slice(0,8).map((spec)=>spec.name+': '+spec.value).join(', ');
      const answer=lang==='en'?bestCandidate.name+' specifications: '+values+'.'
        :lang==='sv'?bestCandidate.name+' specifikationer: '+values+'.'
        :bestCandidate.name+' tuotetiedot: '+values+'.';
      return {answer,handoff:false,confidence:0.98,intent:'Tuotteet',sourceIds,selected};
    }
  }

  // If the customer names a concrete variant value (for example "black" or "XL"),
  // confirm only from the imported product options; never infer a variant.
  if(bestCandidate && !priceAsk){
    // A one-character variant such as S must be a separate word; it cannot be
    // inferred from a letter in "missä", "paidasta" or another question word.
    const explicitlyMentioned=(value)=>{
      const term=normalizeSearchText(value).trim();
      if(!term) return false;
      const phraseWords=term.split(/[^a-z0-9]+/).filter(Boolean);
      const queryWords=q.split(/[^a-z0-9]+/).filter(Boolean);
      return phraseWords.length===1
        ? queryWords.includes(phraseWords[0])
        : q.includes(term);
    };
    const color=bestCandidate.colors?.find(explicitlyMentioned);
    const size=bestCandidate.sizes?.find(explicitlyMentioned);
    if(color){
      const answer=lang==='en'?bestCandidate.name+' is listed in '+color+'.'
        :lang==='sv'?bestCandidate.name+' finns listad i färgen '+color+'.'
        :bestCandidate.name+' löytyy värissä '+color+'.';
      return {answer,handoff:false,confidence:0.98,intent:'Tuotteet',sourceIds:[bestCandidate.row?.id].filter(Boolean),selected:[bestCandidate.row].filter(Boolean)};
    }
    if(size){
      const answer=lang==='en'?bestCandidate.name+' is listed in size '+size+'.'
        :lang==='sv'?bestCandidate.name+' finns listad i storlek '+size+'.'
        :bestCandidate.name+' löytyy koossa '+size+'.';
      return {answer,handoff:false,confidence:0.98,intent:'Tuotteet',sourceIds:[bestCandidate.row?.id].filter(Boolean),selected:[bestCandidate.row].filter(Boolean)};
    }
  }

  if(priceAsk && requestedFamily && candidates.length){
    const nameRanked=candidates
      .map((product)=>({...product,_nameMatch:productNameMatchScore(product,tokens,requestedFamily)}))
      .sort((a,b)=>b._nameMatch-a._nameMatch || b._match-a._match);
    const exactNameBest=nameRanked[0];
    const exactNameSecond=nameRanked[1];
    if(Number.isFinite(exactNameBest?.price) && exactNameBest._nameMatch>=20 &&
       (!exactNameSecond || exactNameBest._nameMatch>=exactNameSecond._nameMatch+20)){
      const price=productPriceText(exactNameBest,lang);
      const answer=lang==='en'?exactNameBest.name+' costs '+price+'.'
        :lang==='sv'?exactNameBest.name+' kostar '+price+'.'
        :exactNameBest.name+' maksaa '+price+'.';
      return {answer,handoff:false,confidence:0.998,intent:'Tuotteet',sourceIds:[exactNameBest.row?.id].filter(Boolean),selected:[exactNameBest.row].filter(Boolean)};
    }

    const namedBest=candidates[0];
    const namedSecond=candidates[1];
    if(tokens.length && Number.isFinite(namedBest?.price) && namedBest._match>=12 &&
       (!namedSecond || namedBest._match>=namedSecond._match+6)){
      const price=productPriceText(namedBest,lang);
      const answer=lang==='en'?namedBest.name+' costs '+price+'.'
        :lang==='sv'?namedBest.name+' kostar '+price+'.'
        :namedBest.name+' maksaa '+price+'.';
      return {answer,handoff:false,confidence:0.995,intent:'Tuotteet',sourceIds:[namedBest.row?.id].filter(Boolean),selected:[namedBest.row].filter(Boolean)};
    }
    const priced=candidates.filter((product)=>Number.isFinite(product.price))
      .sort((a,b)=>Number(a.price)-Number(b.price))
      .slice(0,6);
    if(priced.length){
      if(priced.length===1){
        const product=priced[0];
        const price=productPriceText(product,lang);
        const answer=lang==='en'?product.name+' costs '+price+'.'
          :lang==='sv'?product.name+' kostar '+price+'.'
          :product.name+' maksaa '+price+'.';
        return {answer,handoff:false,confidence:0.99,intent:'Tuotteet',sourceIds:[product.row?.id].filter(Boolean),selected:[product.row].filter(Boolean)};
      }
      const lines=priced.map((product)=>'• '+product.name+' – '+productPriceText(product,lang)).join('\n');
      const answer=lang==='en'
        ? 'Matching product prices:\n'+lines
        : lang==='sv'
          ? 'Priser för matchande produkter:\n'+lines
          : 'Sopivien tuotteiden hinnat:\n'+lines;
      return {
        answer,handoff:false,confidence:0.99,intent:'Tuotteet',
        sourceIds:priced.map((product)=>product.row?.id).filter(Boolean),
        selected:priced.slice(0,4).map((product)=>product.row).filter(Boolean)
      };
    }
    return null;
  }

  if(listAsk){
    const list=candidates.slice(0,12);
    if(!list.length) return null;

    if(generalSellAsk){
      const categories=[];
      for(const product of products){
        const label=broadProductCategory(product,lang);
        if(!label) continue;
        if(!categories.some((item)=>normalizeSearchText(item)===normalizeSearchText(label))) categories.push(label);
        if(categories.length>=3) break;
      }

      const storeType=broadProductStoreType(products,lang);
      let answer='';
      if(categories.length){
        const bullets=categories.map((category)=>'• '+category).join('\n');
        answer=lang==='en'
          ? 'We sell '+storeType+', including:\n'+bullets+'\nAmong other products.'
          : lang==='sv'
            ? 'Vi säljer '+storeType+', bland annat:\n'+bullets+'\nOch andra produkter.'
            : 'Myymme '+storeType+', esimerkiksi:\n'+bullets+'\nSekä muita tuotteita.';
      } else {
        const names=[];
        for(const product of list){
          const name=String(product.name||'').replace(/\s+/g,' ').trim();
          if(!name) continue;
          if(!names.some((item)=>normalizeSearchText(item)===normalizeSearchText(name))) names.push(name);
          if(names.length>=3) break;
        }
        if(!names.length) return null;
        const joined=names.join(', ');
        answer=lang==='en'
          ? 'We sell products such as '+joined+', among other products.'
          : lang==='sv'
            ? 'Vi säljer bland annat '+joined+' och andra produkter.'
            : 'Myymme esimerkiksi tuotteita kuten '+joined+' sekä muita tuotteita.';
      }

      return {
        answer,
        handoff:false,
        confidence:0.99,
        intent:'Tuotteet',
        sourceIds:list.map((product)=>product.row?.id).filter(Boolean),
        selected:[]
      };
    }

    const names=[];
    for(const product of list){
      const name=String(product.name||'').replace(/\s+/g,' ').trim();
      if(!name) continue;
      if(!names.some((item)=>normalizeSearchText(item)===normalizeSearchText(name))) names.push(name);
      if(names.length>=5) break;
    }
    if(!names.length) return null;
    const joined=names.length===1
      ? names[0]
      : names.slice(0,-1).join(', ')+(lang==='sv'?' och ':lang==='en'?' and ':' ja ')+names[names.length-1];

    const more=products.length>names.length;
    const answer=lang==='en'
      ? 'Our selection includes, for example, '+joined+(more?', among other products.':'.')
      : lang==='sv'
        ? 'I vårt sortiment finns till exempel '+joined+(more?', bland annat.':'.')
        : 'Valikoimassamme on esimerkiksi '+joined+(more?' sekä muita tuotteita.':'.');

    return {
      answer,
      handoff:false,
      confidence:0.98,
      intent:'Tuotteet',
      sourceIds:list.map((product)=>product.row?.id).filter(Boolean),
      selected:list.slice(0,3).map((product)=>product.row).filter(Boolean)
    };
  }

  const best=candidates[0];
  if(!best || (tokens.length && best._match<3)) return null;
  const exactCue=tokens.length && best._match>=3;
  if(priceAsk && exactCue){
    const price=productPriceText(best,lang);
    if(!price) return null;
    const answer=lang==='en'?best.name+' costs '+price+'.'
      :lang==='sv'?best.name+' kostar '+price+'.'
      :best.name+' maksaa '+price+'.';
    return {answer,handoff:false,confidence:0.99,intent:'Tuotteet',sourceIds:[best.row?.id].filter(Boolean),selected:[best.row].filter(Boolean)};
  }
  if(stockAsk && exactCue && best.availability){
    const inStock=normalizeSearchText(best.availability)==='varastossa';
    const answer=lang==='en'?(inStock?best.name+' is in stock.':best.name+' is currently not in stock.')
      :lang==='sv'?(inStock?best.name+' finns i lager.':best.name+' finns inte i lager just nu.')
      :(inStock?best.name+' on varastossa.':best.name+' ei ole tällä hetkellä varastossa.');
    return {answer,handoff:false,confidence:0.98,intent:'Tuotteet',sourceIds:[best.row?.id].filter(Boolean),selected:[best.row].filter(Boolean)};
  }
  if(exactCue && /(?:kerro|tell|about|mika|mikä|what|onko|have|löytyykö|loytyyko)/.test(q)){
    const price=productPriceText(best,lang);
    const description=String(best.description||'').split(/(?<=[.!?])\s+/)[0].trim();
    let answer=best.name+(price?' – '+price:'')+'.';
    if(description && description.length<240) answer+=' '+description.replace(/[.!?]+$/,'')+'.';
    return {answer,handoff:false,confidence:0.94,intent:'Tuotteet',sourceIds:[best.row?.id].filter(Boolean),selected:[best.row].filter(Boolean)};
  }
  return null;
}
function expandSearchConcepts(value) {
  let text=' '+normalizeSearchText(value)+' ';
  const groups=[
    ['palvelu','palvelut','teette','tarjoatte','tarjoa','service','services','offer','offering','tjanst','tjanster','erbjuder'],
    ['tuote','tuotteet','myytte','myy','valikoima','product','products','sell','selection','range','produkt','produkter','saljer','sortiment'],
    ['hinta','hinnat','maksaa','hinnoittelu','price','prices','pricing','cost','pris','priser','kostar'],
    ['auki','aukiolo','aukioloajat','opening','hours','open','oppet','oppettider'],
    ['osoite','sijainti','missä','missa','address','location','where','adress','var'],
    ['yhteys','puhelin','sahkoposti','sähköposti','contact','phone','email','kontakt','telefon','e-post'],
    ['toimitus','toimitukset','toimitusaika','seuranta','seurantakoodi','lahetys','nouto','shipping','delivery','shipment','tracking','track order','pickup','leverans','sparning','avhamtning'],
    ['palautus','palautukset','vaihto','hyvitys','return','returns','refund','exchange','retur','aterbetalning','byte'],
    ['takuu','reklamaatio','warranty','guarantee','garanti','reklamation'],
    ['maksutapa','maksaminen','kortti','lasku','klarna','paypal','mobilepay','payment','payment method','betalning','betalningsmetod','faktura'],
    ['yritys','meista','meistä','company','business','about','foretag','företag','om oss']
  ];
  for(const group of groups){
    if(group.some((word)=>text.includes(' '+normalizeSearchText(word)+' '))) text+=' '+group.join(' ');
  }
  return text.trim();
}

function genericCompanyQuestion(value) {
  const q=normalizeSearchText(value);
  return /kerro.*(?:yrityks|teist)|mita teette|mita tarjoatte|mita myytte|mita teilta saa|millainen yritys|what do you do|what do you offer|what do you sell|tell me about|what kind of (?:company|business)|vad gor ni|vad erbjuder ni|vad saljer ni|beratta om/.test(q);
}

// Respond with one grounded service description instead of stitching together
// several imported paragraphs, which often repeat marketing copy.
function broadServiceListAnswer(rows) {
  const found=[];
  const seen=new Set();
  const blocked=/^(?:palvelut?|palvelumme|services?|tjänster|tjanster|mitä teemme|mita teemme|what we do)$/i;
  const add=(value)=>{
    const text=cleanKnowledgeText(value).replace(/[»›→]+\s*$/,'').replace(/[.!?;:]+$/,'').trim();
    if(!text || blocked.test(text) || !isConcreteServiceLabel(text)) return;
    const key=normalizeSearchText(text);
    if(!key || seen.has(key)) return;
    seen.add(key);
    found.push(text);
  };

  for(const row of rows||[]){
    if(knowledgeTopic(String(row?.category||'')+' '+String(row?.title||'')+' '+String(row?.keywords||''))!=='services') continue;
    const answer=cleanKnowledgeText(row?.answer);
    const title=cleanKnowledgeText(row?.title);
    const explicit=title.match(/^Palvelut\s*:\s*(.+)$/i);
    // Navigation/service-directory imports are stored as "Palvelut: <label>"
    // with the exact same short label as the answer. Keep only labels that look
    // like concrete offerings; slogans, map links and CTA copy are discarded.
    if(explicit && normalizeSearchText(explicit[1])===normalizeSearchText(answer)) add(answer);
  }

  if(!found.length) return '';
  return 'Palveluihimme kuuluvat: '+found.slice(0,14).join(', ')+'.';
}
function briefServiceAnswer(selected) {
  const candidates = [];
  const seen = new Set();
  for (const row of selected) {
    if (knowledgeTopic(String(row.title||'')+' '+String(row.category||'')+' '+String(row.keywords||'')) !== 'services') continue;
    const raw = cleanKnowledgeText(row.answer)
      .replace(/^(?:palvelumme|palvelut|services|tjänster)\s*[:–—-]\s*/i,'');
    for (const sentence of raw.split(/(?<=[.!?])\s+/)) {
      const text=sentence.trim();
      if (text.length<22 || text.length>260) continue;
      if (!/(?:tarjoamme|teemme|palvelui|palveluj|palvelut|pesu|siivou|raiva|maala|huolto|asennu|korjau|kuljet|muutto|we offer|we provide|our services|vi erbjuder|våra tjänster)/i.test(text)) continue;
      if (/(?:varaa|ota yhteyt|contact us|book now|lue lisää|read more|tutustu)/i.test(text)) continue;
      const key=normalizeSearchText(text);
      if (seen.has(key)) continue;
      seen.add(key);
      const score=(/^(?:tarjoamme|teemme|we offer|we provide|vi erbjuder)\b/i.test(text)?40:0)
        + (/(?:ikkunanpes|siivou|raivau|maala|huolto|asennu|korjau|kuljet|muutto)/i.test(text)?20:0)
        + (text.length<=165?10:0)
        - (/(?:helppo|nopea palvelu|luotettavasti|ammattitaitoisesti)/i.test(text)?8:0);
      candidates.push({text,score});
    }
  }
  candidates.sort((a,b)=>b.score-a.score);
  const best=candidates[0]?.text||'';
  return best ? best.replace(/[.!?]+$/,'')+'.' : '';
}

function composeKnowledgeAnswer(selected, query) {
  const topic=queryTopic(query);
  const pieces=[];
  for(const row of selected){
    const rowTopic=knowledgeTopic(String(row.title||'')+' '+String(row.category||'')+' '+String(row.keywords||''));
    if(topic && rowTopic && rowTopic!==topic) continue;
    const text=conciseKnowledgeAnswer(row,query);
    if(!text) continue;
    const normalized=normalizeSearchText(text);
    if(pieces.some((x)=>normalizeSearchText(x).includes(normalized.slice(0,90))||normalized.includes(normalizeSearchText(x).slice(0,90)))) continue;
    pieces.push(text);
    if(pieces.length>=3) break;
  }
  let answer=pieces.join(' ').replace(/\s+/g,' ').trim();
  if(answer.length>520) answer=answer.slice(0,517).replace(/\s+\S*$/,'')+'…';
  return answer;
}

function scoreKnowledgeRow(row, query) {
  const q=expandSearchConcepts(query), qTokens=searchTokens(q);
  const title=normalizeSearchText(row.title), answer=normalizeSearchText(row.answer);
  const category=normalizeSearchText(row.category||'');
  const keywordText=normalizeSearchText((row.keywords||[]).join(' '));
  let score=0;
  if(title && q.includes(title)) score+=14;
  for(const rawKeyword of row.keywords||[]){
    const kw=normalizeSearchText(rawKeyword);
    if(kw && (q.includes(kw)||kw.includes(q))) score+=9;
  }
  const titleTokens=new Set(searchTokens(title)), answerTokens=new Set(searchTokens(answer)), keywordTokens=new Set(searchTokens(keywordText));
  for(const token of qTokens){
    if(titleTokens.has(token)) score+=5;
    if(keywordTokens.has(token)) score+=5;
    if(answerTokens.has(token)) score+=1.2;
    const stem=token.slice(0,Math.min(6,token.length));
    if(stem.length>=4){
      if([...titleTokens].some(x=>x.startsWith(stem))) score+=2;
      if([...keywordTokens].some(x=>x.startsWith(stem))) score+=2;
    }
  }
  const wanted=queryTopic(query);
  // For store-policy questions, prefer the sentence that actually contains the
  // requested detail. Category-wide keywords alone must not make "delivery time"
  // outrank "tracking code" for a tracking question.
  const normalizedQuery=normalizeSearchText(query);
  if (wanted==='delivery' && /seurant|tracking|track order|sparning|spårning/.test(normalizedQuery)) {
    const evidence=title+' '+answer;
    if (/seurant|tracking|sparning|spårning/.test(evidence)) score+=28;
    else score-=10;
  }
  const rowTopic=knowledgeTopic(title+' '+category+' '+keywordText);
  if(wanted && rowTopic===wanted) score+=30;
  else if(wanted && rowTopic && rowTopic!==wanted) score-=8;
  if(/terms of service|privacy policy|kayttoeh|käyttöeh|tietosuoja|cookie policy/.test(answer)) score-=60;
  return score;
}

function selectRelevantKnowledge(rows, query, limit = 6) {
  const q = normalizeSearchText(query);
  const wantedTopic = queryTopic(query);
  // A service-specific price question must not return the price of an unrelated
  // service just because both price rows share the category/keywords 'Hinnat'.
  const priceSubjects = wantedTopic === 'pricing' ? searchTokens(query).filter(word =>
    word.length >= 4 && !/^(?:hinn|hint|maks|kustann|palvel|service|price|pricing|cost|much$|per$|hour|tunt|euro|eur$|pris|kost|vilken|mycket$|paljon|alka|from$|starting|does$|finns$|teetteko$|pesu|puhdist|siivou|oljy|asenn|maal|korj|huol|raiva|poisvien|kuljet)/.test(word)
  ) : [];
  const legalQuery = /tietosuoja|privacy|käyttöeh|kayttoeh|terms|ehto|cookie|eväste|evaste|gdpr/.test(q);
  return rows
    .filter(usableWebsiteRow)
    .filter((x) => normalizeSearchText(x.title) !== 'vastaustyyli')
    .filter((x) => !importedKnowledgeJunk(String(x.title||'')+' '+String(x.answer||'')))
    .filter((x) => {
      if (legalQuery) return true;
      const hay = normalizeSearchText(String(x.title||'')+' '+String(x.category||'')+' '+String(x.source_url||x.sourceUrl||'')+' '+String(x.answer||'').slice(0,700));
      return !/terms of service|privacy policy|tietosuoja|kayttoeh|käyttöeh|cookie policy|evaste|eväste|legal notice/.test(hay);
    })
    .filter((x) => {
      const wanted=wantedTopic;
      if(!wanted) return true;
      const rowTopic=knowledgeTopic(String(x.title||'')+' '+String(x.category||'')+' '+String(x.keywords||''));
      // For explicit intents, a row classified as another intent must never be used
      // merely because a few generic words overlap.
      if(rowTopic && rowTopic!==wanted) return false;
      if(wanted==='pricing' && priceSubjects.length) {
        const evidence=searchTokens(String(x.title||'')+' '+String(x.answer||''));
        return priceSubjects.some(subject => evidence.some(token => token.slice(0,6)===subject.slice(0,6)));
      }
      return true;
    })
    .map((x) => ({ ...x, _score: scoreKnowledgeRow(x, query) }))
    .filter((x) => x._score >= 2)
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);
}


function knowledgeValue(rows, title) {
  const wanted = normalizeSearchText(title);
  const matches = rows.filter((x) => normalizeSearchText(x.title) === wanted);
  // Prefer explicit profile/demo values over older imported/saved rows. This is
  // especially important in dashboard preview where the form value must win.
  const row = matches.find((x) => String(x.id || '').startsWith('demo-')) || matches[0];
  return String(row?.answer || '').trim();
}

// Contact values are shown only when the profile or approved knowledge
// contains a valid, literal value. Never turn a postal code, heading, or
// scraped marketing paragraph into a telephone number.
function verifiedContactValue(rows, title) {
  const wanted=normalizeSearchText(title);
  // User-maintained profile values are authoritative, even when an older
  // imported web entry was updated more recently.
  const priority=row=>String(row.id||'').startsWith('demo-')?0:
    (row.source_type==='profile'||row.category==='Yrityksen perustiedot')?1:2;
  const candidates=rows.filter(row=>normalizeSearchText(row.title)===wanted)
    .sort((a,b)=>priority(a)-priority(b));
  for(const row of candidates) {
    const value=String(row.answer||'').trim();
    if (wanted===normalizeSearchText('Puhelinnumero')) {
      const digits=value.replace(/\D/g,'');
      if (/^\+?[\d\s().-]+$/.test(value) && digits.length>=6 && digits.length<=15) return {value,row};
    }
    if (wanted===normalizeSearchText('Sähköposti') && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)) return {value,row};
  }
  return null;
}

// Only an imported, approved URL can become a website contact action.
function verifiedContactPage(rows) {
  for(const title of ['Yhteydenottolomake','Yhteydenottosivu']){
    for(const row of rows||[]){
      if(String(row?.title||'')!==title) continue;
      const raw=String(row?.answer||'').trim();
      if(!/^https?:\/\//i.test(raw)) continue;
      const value=normalizeWebUrl(raw,false);
      if(value) return {value,row,form:title==='Yhteydenottolomake'};
    }
  }
  return null;
}

function explicitContactQuestion(message) {
  const q=normalizeSearchText(message);
  // Shipping/postage fee questions must never be mistaken for Swedish e-post
  // contact wording or other contact intent aliases.
  if(/\b(?:toimit|postikulu|postitus|shipping|delivery|postage|frakt|leverans)\w*\b/.test(q)
      && /\b(?:hinta|maksaa|maksu|kulu|veloit|price|cost|fee|fees|charge|pris|kostar|avgift|betalt)\w*\b/.test(q)) return '';
  // Resolve e-mail first. Swedish "e-postadress" contains the word "adress",
  // so location matching must never get a chance to claim it.
  if (
    /(?:^|\s)(?:sahkopost\w*|email\w*|e-mail\w*|meili\w*|e-?post\w*|epost\w*)(?:\s|$)/.test(q) ||
    /(?:^|\s)e-post\w*(?:\s|$)/.test(q) ||
    /(?:^|\s)e\s+post\w*(?:\s|$)/.test(q) ||
    /(?:^|\s)epost\w*(?:\s|$)/.test(q)
  ) return 'email';
  if (/(?:^|\s)(?:puhelin\w*|phone\w*|telefon\w*|soitta\w*|soita|ring\w*|numero|numeronne|numeroanne)(?:\s|$)/.test(q)) return 'phone';
  if(/\b(?:number|numret|nummer)\b/.test(q) && /\b(?:call|dial|ring|ringa|kontakta|contact|reach)\w*\b/.test(q)) return 'phone';
  return '';
}

function generalContactQuestion(message) {
  const q=normalizeSearchText(message);
  return /^(?:mista\s+(?:voin\s+)?ottaa\s+(?:teihin\s+)?yhteytta|miten\s+(?:saan|otan)\s+(?:teihin|teihinpain|yritykseen)\s+yhteyden|miten\s+voin\s+ottaa\s+(?:teihin\s+)?yhteytta|mitka\s+(?:ovat\s+)?(?:teidan\s+)?yhteystieto(?:t|nne)|yhteystieto(?:t|nne)|how\s+(?:can|do)\s+i\s+(?:contact|reach)\s+you|how\s+(?:can|do)\s+i\s+get\s+in\s+touch\s+with\s+you|what\s+are\s+your\s+contact\s+details|contact\s+details|hur\s+kan\s+jag\s+kontakta\s+er|hur\s+kontaktar\s+jag\s+er|hur\s+nar\s+jag\s+er|hur\s+far\s+jag\s+kontakt\s+med\s+er|hur\s+kan\s+jag\s+komma\s+i\s+kontakt\s+med\s+er|vilka\s+ar\s+era\s+kontaktuppgifter|kontaktuppgifter)$/.test(q);
}

function directGeneralContactAnswer(rows, lang='fi') {
  const phone=verifiedContactValue(rows,'Puhelinnumero');
  const emailValue=verifiedContactValue(rows,'Sähköposti');
  if(!phone && !emailValue) return null;

  let answer='';
  if(phone && emailValue) {
    answer=lang==='en'
      ? 'You can contact us by phone at '+phone.value+' or by email at '+emailValue.value+'.'
      : lang==='sv'
        ? 'Du kan kontakta oss per telefon på '+phone.value+' eller via e-post på '+emailValue.value+'.'
        : 'Voit ottaa yhteyttä puhelimitse numeroon '+phone.value+' tai sähköpostitse osoitteeseen '+emailValue.value+'.';
  } else if(phone) {
    answer=lang==='en'
      ? 'You can contact us by phone at '+phone.value+'.'
      : lang==='sv'
        ? 'Du kan kontakta oss per telefon på '+phone.value+'.'
        : 'Voit ottaa yhteyttä puhelimitse numeroon '+phone.value+'.';
  } else {
    answer=lang==='en'
      ? 'You can contact us by email at '+emailValue.value+'.'
      : lang==='sv'
        ? 'Du kan kontakta oss via e-post på '+emailValue.value+'.'
        : 'Voit ottaa yhteyttä sähköpostitse osoitteeseen '+emailValue.value+'.';
  }

  const selected=[phone?.row,emailValue?.row].filter(Boolean);
  return {
    answer,
    handoff:false,
    confidence:1,
    intent:'Yhteystiedot',
    sourceIds:selected.map((row)=>row.id).filter(Boolean),
    selected,
  };
}

function explicitServiceAreaQuestion(message) {
  const q=normalizeSearchText(message);
  return /^(?:missa\s+(?:te\s+)?toimitte|milla\s+alueella\s+(?:te\s+)?toimitte|mille\s+alueelle\s+(?:te\s+)?tulette|mika\s+(?:teidan\s+)?toimialue(?:enne)?|toimialue|palvelualue)$/.test(q)
    || /^(?:where\s+do\s+you\s+(?:operate|work|serve)|what(?:'s| is)\s+your\s+service\s+area|service\s+area)$/.test(q)
    || /^(?:var\s+arbetar\s+ni|vilket\s+omrade\s+(?:arbetar|betjanar)\s+ni\s+i|verksamhetsomrade|serviceomrade)$/.test(q);
}

function cleanServiceAreaValue(value) {
  let text=String(value||'').replace(/\s+/g,' ').trim();
  if(!text) return '';

  // Website imports sometimes store a question + answer + CTA in one field:
  // "Millä alueella toimitte? Toimimme Turussa... Ota yhteyttä..."
  // Remove the duplicated question and keep only the factual area statement.
  text=text.replace(
    /^(?:millä\s+alueella\s+(?:te\s+)?toimitte|missä\s+(?:te\s+)?toimitte|mille\s+alueelle\s+(?:te\s+)?tulette|where\s+do\s+you\s+(?:operate|work|serve)|what(?:'s| is)\s+your\s+service\s+area|var\s+arbetar\s+ni)\s*[?!.:-]*\s*/i,
    ''
  );

  const sentences=(text.match(/[^.!?]+[.!?]?/g)||[])
    .map(part=>part.trim())
    .filter(Boolean)
    .filter(part=>!/(?:^|\b)(?:ota yhteyttä|jätä yhteystiet|soita meille|lähetä viesti|contact us|get in touch|leave your contact|kontakta oss|hör av dig)\b/i.test(part));

  if(!sentences.length) return '';
  const factual=sentences.find(part=>
    /^(?:toimimme|palvelemme|palvelualueemme|toimialueemme|we operate|we serve|our service area|vi arbetar|vi betjänar|vårt serviceområde)\b/i.test(part)
  ) || sentences[0];

  return factual.replace(/[.!?]+$/,'').trim();
}

function verifiedServiceAreaValue(rows) {
  const titleAliases=new Set([
    'toimialue','palvelualue','service area','servicearea',
    'verksamhetsomrade','serviceomrade',
    'missa toimitte','milla alueella toimitte','where do you operate','where do you serve','var arbetar ni'
  ].map(normalizeSearchText));
  const priority=row=>String(row.id||'').startsWith('demo-')?0:
    (row.source_type==='profile'||row.category==='Yrityksen perustiedot')?1:2;
  const candidates=rows.filter(row=>titleAliases.has(normalizeSearchText(row.title)))
    .sort((a,b)=>priority(a)-priority(b));
  for(const row of candidates) {
    const value=cleanServiceAreaValue(row.answer);
    if(!value || value.length>300) continue;
    if(/^(?:https?:\/\/|mailto:|tel:)/i.test(value)) continue;
    return {value,row};
  }
  return null;
}

function serviceAreaAnswer(value, lang='fi') {
  const clean=String(value||'').trim().replace(/[.!?]+$/,'');
  const normalized=normalizeSearchText(clean);
  const sentenceLike=/^(?:toimimme|palvelemme|palvelumme kattaa|we operate|we serve|our service area|vi arbetar|vi betjanar|vart serviceomrade)/.test(normalized);
  if(sentenceLike) return clean+'.';
  if(lang==='en') return 'Our service area is '+clean+'.';
  if(lang==='sv') return 'Vårt serviceområde är '+clean+'.';
  return 'Toimialueemme on '+clean+'.';
}

function explicitBusinessLocationQuestion(message) {
  const q=normalizeSearchText(message);
  return /^(?:missa\s+(?:te|yritys)\s+sijaitsee|missa\s+pain\s+(?:yritys\s+)?(?:sijaitsee|toimii)|missa\s+sijaitsette|missa\s+te\s+sijaitsette|missapain\s+sijaitsette|missa\s+(?:teidan\s+)?toimipiste(?:enne)?\s+on|mika\s+on\s+(?:(?:teidan|yrityksen)\s+)?(?:sijainti|osoite)|mika\s+(?:teidan\s+)?osoite\s+on|voitko\s+antaa\s+(?:minulle\s+)?(?:tarkan\s+)?osoitteen|where\s+(?:are\s+you|is\s+(?:the\s+)?(?:company|business))\s+located|where\s+are\s+you\s+based|what\s+location\s+are\s+you\s+based\s+in|what\s+is\s+your\s+(?:location|address)|where\s+exactly\s+are\s+you\s+located|where\s+is\s+your\s+location|can\s+you\s+give\s+me\s+your\s+(?:exact\s+)?address|var\s+finns\s+(?:ni|foretaget|företaget)|vilken\s+ort\s+finns\s+foretaget\s+pa|var\s+ar\s+ni\s+belagna|var\s+ligger\s+(?:ni|foretaget|företaget)|var\s+ligger\s+ert\s+verksamhetsstalle|vad\s+ar\s+(?:er|eran)\s+(?:adress|postadress)|vad\s+har\s+ni\s+for\s+(?:adress|postadress)|vilken\s+adress\s+har\s+ni|kan\s+jag\s+fa\s+er\s+(?:exakta\s+)?adress)$/.test(q);
}

function extractBusinessLocationText(value) {
  const text=cleanKnowledgeText(value);
  if(!text) return '';
  const direct=text.match(/(?:home\s+base(?:\s+is)?|based|located|headquartered|head\s+office)\s+(?:in|at)\s+([^.!?]+)/i);
  if(direct) {
    return direct[1]
      .replace(/,\s*(?:we|where\s+we|and\s+we|our\s+team)\b[\s\S]*$/i,'')
      .replace(/\s+/g,' ')
      .trim()
      .replace(/[,:;]+$/,'');
  }
  const finnish=text.match(/(?:toimipaikkamme|kotipaikkamme|paakonttorimme|pääkonttorimme|sijaitsemme)\s+(?:on|sijaitsee|ovat)?\s*(?:osoitteessa\s+|kaupungissa\s+|paikkakunnalla\s+)?([^.!?]+)/i);
  if(finnish) return finnish[1].trim().replace(/[,:;]+$/,'');
  const postal=text.match(/([^.!?]{0,80}\b\d{5}\s+[A-ZÅÄÖa-zåäö][^.!?]{0,80})/);
  if(postal) return postal[1].trim().replace(/^[,;:\s]+|[,;:\s]+$/g,'');
  return '';
}

function verifiedBusinessLocationValue(rows) {
  const sourceRows=(rows||[])
    .filter(usableWebsiteRow)
    .filter((row)=>{
      const meta=normalizeSearchText(String(row?.category||'')+' '+String(row?.title||'')+' '+String(row?.keywords||''));
      return knowledgeTopic(meta)==='stores' || /sijainti|location|store|myymala|myymälä|osoite|address|(?:^|\s)adress(?:\s|$)/.test(meta);
    });

  const scored=[];
  const scoreValue=(value,row)=>{
    const text=String(value||'').trim().replace(/[.!?]+$/,'');
    if(!text || text.length>220 || /^https?:\/\//i.test(text) ||
       /verkkolask|laskutusosoite|laskutus\s*osoite|e-?lasku|e-?invoice|invoicing address|invoice address|billing address|ovt\b|operaattori|operator\b/i.test(text)) return;
    let score=0;
    const meta=normalizeSearchText(String(row?.category||'')+' '+String(row?.title||''));
    if(/osoite|address|(?:^|\s)adress(?:\s|$)/.test(meta)) score+=35;
    if(/\b[A-ZÅÄÖa-zåäö][A-ZÅÄÖa-zåäö .'-]{1,55}\s+\d+[A-Za-z]?\b/.test(text)) score+=45;
    if(/\b\d{5}\s+[A-ZÅÄÖa-zåäö][A-ZÅÄÖa-zåäö .'-]{1,55}\b/.test(text)) score+=35;
    if(/\b\d{5}\b/.test(text)) score+=10;
    if(/home base|based in|located|sijait|toimipaik|kotipaik/.test(normalizeSearchText(row?.answer||''))) score+=12;
    if(text.split(/\s+/).length<=8) score+=8;
    scored.push({value:text,row,score});
  };

  for(const row of sourceRows) {
    const extracted=extractBusinessLocationText(row.answer);
    if(extracted) scoreValue(extracted,row);
    const answer=cleanKnowledgeText(row.answer);
    if(answer && answer.length<=180) scoreValue(answer,row);
  }

  const grouped=new Map();
  for(const row of sourceRows){
    const source=String(row?.source_url||row?.sourceUrl||'');
    if(!grouped.has(source)) grouped.set(source,[]);
    grouped.get(source).push(row);
  }
  for(const rowsForSource of grouped.values()){
    const values=rowsForSource.map((row)=>cleanKnowledgeText(row.answer)).filter(Boolean);
    const street=values.find((value)=>/\b[A-ZÅÄÖa-zåäö][A-ZÅÄÖa-zåäö .'-]{1,55}\s+\d+[A-Za-z]?\b/.test(value) && !/\b\d{5}\b/.test(value));
    const postal=values.find((value)=>/\b\d{5}\s+[A-ZÅÄÖa-zåäö][A-ZÅÄÖa-zåäö .'-]{1,55}\b/.test(value));
    if(street && postal && normalizeSearchText(street)!==normalizeSearchText(postal)){
      const streetKey=normalizeSearchText(street);
      const postalKey=normalizeSearchText(postal);
      const combined=postalKey.includes(streetKey) ? postal : street+', '+postal;
      scoreValue(combined,rowsForSource[0]);
      if(scored.length) scored[scored.length-1].score+=25;
    }
  }

  // After branch/location scoping, the street and postal line may come from
  // two different first-party pages for the same location. Combine them so
  // "Maariankatu 3" + "20100 Turku" becomes one useful customer answer.
  const allValues=sourceRows.map((row)=>({row,value:cleanKnowledgeText(row.answer)})).filter((x)=>x.value);
  const globalStreet=allValues.find((x)=>/\b[A-ZÅÄÖa-zåäö][A-ZÅÄÖa-zåäö .'-]{1,55}\s+\d+[A-Za-z]?\b/.test(x.value) && !/\b\d{5}\b/.test(x.value));
  const globalPostal=allValues.find((x)=>/\b\d{5}\s+[A-ZÅÄÖa-zåäö][A-ZÅÄÖa-zåäö .'-]{1,55}\b/.test(x.value));
  if(globalStreet && globalPostal && normalizeSearchText(globalStreet.value)!==normalizeSearchText(globalPostal.value)){
    const streetKey=normalizeSearchText(globalStreet.value);
    const postalKey=normalizeSearchText(globalPostal.value);
    const combined=postalKey.includes(streetKey) ? globalPostal.value : globalStreet.value+', '+globalPostal.value;
    scoreValue(combined,globalStreet.row);
    if(scored.length) scored[scored.length-1].score+=30;
  }

  return scored.sort((a,b)=>b.score-a.score || a.value.length-b.value.length)[0] || null;
}


async function directServicePriceFollowup(rows,message,history=[],lang='fi') {
  const q=normalizeSearchText(message);
  const priceFollowup=
    /^(?:paljonko\s+(?:se|tama|tämä|tuo)\s+maksaa|mita\s+(?:se|tama|tuo)\s+maksaa|mika\s+(?:sen|taman|tuon)\s+hinta|enta\s+hinta|and\s+how\s+much\s+(?:is|does)\s+(?:it|that)|how\s+much\s+(?:is|does)\s+(?:it|that)(?:\s+cost)?|what\s+does\s+(?:it|that)\s+cost|and\s+(?:the\s+)?price|what\s+about\s+(?:the\s+)?price|och\s+vad\s+kostar\s+(?:den|det)|vad\s+kostar\s+(?:den|det)|hur\s+mycket\s+kostar\s+(?:den|det)|och\s+priset|vad\s+ar\s+priset)$/.test(q);
  if(!priceFollowup) return null;

  const previousTurn=meaningfulConversationTurn(history);
  const previous=normalizeSearchText(previousTurn?.question||'');
  if(!previous) return null;
  const looksLikeService=
    queryTopic(previous)==='services' ||
    /leikka|hius|parta|pesu|puhdist|siivou|huol|asenn|korj|maal|raiva|kuljet|muutto|service|hair|cut|barber|clean|repair|install|maintenance|klipp|har\b|hår|skagg|skägg|tjanst|tjänst/.test(previous);
  if(!looksLikeService) return null;

  const aliases=new Set();
  const addAlias=(value)=>{
    const token=normalizeSearchText(value).replace(/[^a-z0-9åäö]/g,'');
    if(token.length>=3) aliases.add(token);
  };
  const ignored=new Set([
    'teetteko','leikkaatteko','onko','teilla','teillä','mita','mitä','palvelua','palvelu',
    'do','you','offer','have','a','an','the','service','services',
    'har','ni','vanlig','tjanst','tjänst'
  ]);
  for(const word of previous.split(/\s+/)){
    if(ignored.has(word)) continue;
    addAlias(word);
    if(/leikka|hius/.test(word)) ['leikka','hius','hair','cut','klipp','mcut'].forEach(addAlias);
    if(/hair|cut|barber/.test(word)) ['leikka','hius','hair','cut','klipp','mcut'].forEach(addAlias);
    if(/klipp|hår|har$/.test(word)) ['leikka','hius','hair','cut','klipp','mcut'].forEach(addAlias);
    if(/parta|beard|skagg|skägg/.test(word)) ['parta','beard','skagg','mbeard'].forEach(addAlias);
  }

  const serviceSources=new Set(
    (rows||[])
      .filter(usableWebsiteRow)
      .filter((row)=>knowledgeTopic(String(row?.category||'')+' '+String(row?.title||'')+' '+String(row?.keywords||''))==='services')
      .filter((row)=>{
        const evidence=normalizeSearchText(String(row?.title||'')+' '+String(row?.answer||''));
        return [...aliases].some((token)=>token.length>=3 && evidence.includes(token));
      })
      .map((row)=>String(row?.source_url||row?.sourceUrl||''))
      .filter(Boolean)
  );

  const candidates=(rows||[])
    .filter(usableWebsiteRow)
    .filter((row)=>knowledgeTopic(String(row?.category||'')+' '+String(row?.title||'')+' '+String(row?.keywords||''))==='pricing')
    .map((row,index)=>{
      const answer=cleanKnowledgeText(row.answer);
      const evidence=normalizeSearchText(String(row?.title||'')+' '+answer);
      if(!/[€$£]|\b\d+(?:[.,]\d+)?\s*(?:eur|usd|sek|nok|dkk|kr)\b/i.test(answer)) return null;
      let score=20;
      let aliasHits=0;
      for(const token of aliases){
        if(token.length>=3 && evidence.includes(token)) aliasHits++;
      }
      score+=Math.min(70,aliasHits*18);
      if(serviceSources.has(String(row?.source_url||row?.sourceUrl||''))) score+=12;
      if(answer.length<=80) score+=22;
      if(/^[^:]{2,65}:\s*(?:alk\.?|alkaen|from)?\s*[€$£]?\s*\d/i.test(answer)) score+=34;
      if(/lisapalvel|lisäpalvel|add[- ]?on|extra\b|upgrade|korotus|supplement|tillagg|tillägg/.test(evidence)) score-=50;
      // Generic "how much is it?" follow-ups must prefer the plain/base service
      // over premium bundles that merely contain the same service name.
      if(/premium|pidennetty|extended|päähier|paahier|head massage|scalp massage|razor|veitsiraj|bundle|paketti|package|with .*massage|med .*massage/.test(evidence)) score-=65;
      if(/jasen|jäsen|member|membership|student|junior|opiskel|daytime/.test(evidence)) score-=14;
      if(/^(?:m\s*cut|hiustenleikkaus|haircut|hårklippning|harklippning)\s*[:–-]?\s*[€$£]?\s*\d/i.test(answer)) score+=24;
      return {row,answer,score,index};
    })
    .filter(Boolean)
    .sort((a,b)=>b.score-a.score || a.index-b.index);

  const best=candidates[0];
  if(!best || best.score<35) return null;

  let answer=best.answer;
  const target=['fi','sv','en'].includes(String(lang||'').toLowerCase())?String(lang).toLowerCase():'fi';
  const sourceLang=detectConversationLanguage(answer,'fi');
  if(sourceLang!==target){
    const translated=await forceAnswerLanguage(answer,target);
    if(translated) answer=cleanKnowledgeText(translated);
  }
  return {
    answer,
    handoff:false,
    confidence:0.95,
    intent:'Hinta',
    sourceIds:[best.row.id].filter(Boolean),
    selected:[best.row],
  };
}




function directMultilingualServicePrice(rows,message,lang='fi') {
  const q=normalizeSearchText(message);
  const isPriceQuestion =
    /(?:paljonko|mita maksaa|mitä maksaa|mika.*hinta|mikä.*hinta|hinta\b|how much|what.*cost|cost\b|price\b|vad kostar|hur mycket|pris\b)/.test(q);
  if(!isPriceQuestion) return null;

  const requested=multilingualServiceConcepts(message);
  if(!requested.size) return null;

  const candidates=(rows||[])
    .filter(usableWebsiteRow)
    .filter((row)=>knowledgeTopic(String(row?.category||'')+' '+String(row?.title||'')+' '+String(row?.keywords||''))==='pricing')
    .map((row,index)=>{
      const answer=cleanKnowledgeText(row.answer);
      const evidence=normalizeSearchText(String(row?.title||'')+' '+answer);
      if(!/[€$£]|\b\d+(?:[.,]\d+)?\s*(?:eur|usd|sek|nok|dkk|kr)\b/i.test(answer)) return null;
      const available=multilingualServiceConcepts(evidence);
      const matched=[...requested].filter((concept)=>available.has(concept)).length;
      if(!matched) return null;
      let score=matched*35;
      if(matched===requested.size) score+=45;
      if(/premium|pidennetty|extended|päähier|paahier|head massage|scalp massage|razor|veitsiraj|bundle|paketti|package|student|junior|jasen|jäsen|member/.test(evidence)) score-=30;
      if(/^(?:m\s*cut|hiustenleikkaus|haircut|hårklippning|harklippning)\b/.test(answer)) score+=20;
      return {row,answer,score,index};
    })
    .filter(Boolean)
    .sort((a,b)=>b.score-a.score || a.index-b.index);

  const best=candidates[0];
  if(!best || best.score<55) return null;

  const amountMatch=best.answer.match(/([€$£]\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s*(?:€|eur|usd|sek|nok|dkk|kr|\$|£))/i);
  const amount=amountMatch?.[1]?.trim() || '';
  let answer=best.answer;

  if(amount){
    if(lang==='en') answer='The price is '+amount+'.';
    else if(lang==='sv') answer='Priset är '+amount+'.';
    else answer='Hinta on '+amount+'.';

    if(requested.has('hair') && requested.has('cut')){
      if(lang==='en') answer='A haircut costs '+amount+'.';
      else if(lang==='sv') answer='En hårklippning kostar '+amount+'.';
      else answer='Hiustenleikkaus maksaa '+amount+'.';
    }
  }

  return {
    answer,
    handoff:false,
    confidence:0.98,
    intent:'Hinta',
    sourceIds:[best.row.id].filter(Boolean),
    selected:[best.row],
  };
}


function multilingualServiceConcepts(value) {
  const q=normalizeSearchText(value);
  const concepts=new Set();
  const checks=[
    // normalizeSearchText turns Swedish "hår" into "har", which is also the
    // common Swedish auxiliary "har". Never treat a standalone "har" as hair.
    // Compound "hårklippning" becomes "harklippning" and is unambiguous.
    ['hair',/(?:^|\b)(?:hiu(?:s|k|st)\w*|hair\w*|harklipp\w*)(?:\b|\w*)/],
    ['beard',/(?:^|\b)(?:parta|beard|skagg|skägg)(?:\b|\w*)/],
    ['cut',/(?:leikka|haircut|cut\b|klipp)/],
    ['clean',/(?:puhdist|pesu|pese|wash|clean|tvatt|tvätt|rengor|rengör)/],
    ['repair',/(?:korj|repair|reparera|reparer)/],
    ['install',/(?:asenn|install)/],
    ['paint',/(?:maala|paint|malning|målning|malar|målar)/],
    ['maintain',/(?:huol|maintain|maintenance|underhall|underhåll)/],
    ['window',/(?:ikkun|window|fonster|fönster)/],
    ['roof',/(?:katto|katon|roof|tak\b)/],
    ['terrace',/(?:terass|terrace|deck|altan)/],
    ['gutter',/(?:ranni|ränni|gutter|hangrann|hängränn)/],
    ['move',/(?:muutto|moving|move\b|flytt)/],
    ['transport',/(?:kuljet|transport|delivery service|leveransservice)/],
  ];
  for(const [name,re] of checks) if(re.test(q)) concepts.add(name);
  // Standalone Swedish "hår" is normalized to "har". Require an explicit
  // hair-service context so phrases such as "Vilket pris har produkten?" do
  // not become haircut questions.
  if(/\bhar\b/.test(q) && /\b(?:klipp\w*|frisyr\w*|tvatt\w*|schampo\w*|barber\w*)\b/.test(q)) concepts.add('hair');
  return concepts;
}

function multilingualDirectServiceRequest(message,lang='fi') {
  const q=normalizeSearchText(String(message||'').trim().replace(/[?!.]+$/,''));
  if(!q) return null;

  if(lang==='fi') {
    let m=q.match(/^(?:teetteko|tarjoatteko|onko teilla|loytyyko teilta|saako teilta|saanko teilta|onnistuuko|onnistuisko)\s+(.+)$/);
    if(m) return {subject:m[1],mode:'offer'};
    m=q.match(/^(leikkaatteko|pesetteko|puhdistatteko|korjaatteko|asennatteko|maalaatteko|huollatteko)\s+(.+)$/);
    if(m) return {subject:m[2],verb:m[1],mode:'verb'};
  }

  if(lang==='sv') {
    let m=q.match(/^(?:har|erbjuder)\s+ni\s+(.+)$/);
    if(m) return {subject:m[1],mode:'offer'};
    m=q.match(/^kan\s+jag\s+fa\s+(.+?)(?:\s+hos\s+er)?$/);
    if(m) return {subject:m[1],mode:'get'};
    m=q.match(/^(?:kan\s+ni\s+)?(klipper|tvattar|rengor|reparerar|installerar|malar|underhaller|flyttar|transporterar)\s+(?:ni\s+)?(.+)$/);
    if(m) return {subject:m[2],verb:m[1],mode:'verb'};
    m=q.match(/^kan\s+ni\s+(.+)$/);
    if(m) return {subject:m[1],mode:'can'};
  }

  if(lang==='en') {
    let m=q.match(/^do\s+you\s+(?:offer|provide|have)\s+(.+)$/);
    if(m) return {subject:m[1],mode:'offer'};
    m=q.match(/^(?:can|could)\s+i\s+(?:get|book|have)\s+(.+?)(?:\s+(?:there|with\s+you|from\s+you))?$/);
    if(m) return {subject:m[1],mode:'get'};
    m=q.match(/^(?:do|can|could)\s+you\s+(cut|wash|clean|repair|install|paint|maintain|move|transport)\s+(.+)$/);
    if(m) return {subject:m[2],verb:m[1],mode:'verb'};
    m=q.match(/^(?:can|could)\s+you\s+(.+)$/);
    if(m) return {subject:m[1],mode:'can'};
  }
  return null;
}

function directMultilingualServiceConfirmation(rows,message,lang='fi') {
  const language=['fi','sv','en'].includes(String(lang||'').toLowerCase())?String(lang).toLowerCase():'';
  if(!language) return null;
  const request=multilingualDirectServiceRequest(message,language);
  if(!request) return null;

  const requested=multilingualServiceConcepts(message);
  // Keep the Finnish direct path narrowly scoped to haircut wording.
  // Other Finnish service requests use the existing subtype-aware service
  // resolver below, which preserves distinctions such as peltikatto vs tiilikatto.
  if(!requested.size) return null;
  if(language==='fi' && !(requested.has('hair') && requested.has('cut'))) return null;
  const candidates=(rows||[])
    .filter(usableWebsiteRow)
    .filter((row)=>{
      const topic=knowledgeTopic(String(row?.category||'')+' '+String(row?.title||'')+' '+String(row?.keywords||''));
      return topic==='services' || topic==='pricing';
    })
    .filter((row)=>{
      const evidence=normalizeSearchText(String(row?.title||'')+' '+String(row?.answer||''));
      if(/\b(?:emme|ei|eivat|not|don't|doesn't|inte|aldrig)\b/.test(evidence)) return false;
      const available=multilingualServiceConcepts(evidence);
      return [...requested].every((concept)=>available.has(concept));
    });

  const found=candidates[0];
  if(!found) return {supported:false,evidence:[]};

  const original=String(message||'').trim().replace(/[?!.]+$/,'');
  let answer='';
  if(language==='fi'){
    if(requested.has('hair') && requested.has('cut')) {
      answer='Kyllä, tarjoamme hiustenleikkauksia.';
    } else {
      const subject=String(request.subject||'').trim();
      answer='Kyllä, tarjoamme '+subject+'.';
    }
  } else if(language==='sv'){
    if(requested.has('hair') && requested.has('cut')){
      answer='Ja, vi erbjuder hårklippning.';
    } else {
      const subject=original
        .replace(/^(?:har|erbjuder)\s+ni\s+/i,'')
        .replace(/^kan\s+ni\s+/i,'');
      answer='Ja, vi erbjuder '+subject+'.';
    }
  } else {
    if(requested.has('hair') && requested.has('cut')) {
      answer='Yes, we offer haircuts.';
    } else {
      let subject=original
        .replace(/^do\s+you\s+(?:offer|provide|have)\s+/i,'')
        .replace(/^(?:do|can|could)\s+you\s+/i,'');
      answer='Yes, we offer '+subject+'.';
    }
  }
  return {supported:true,answer,evidence:[found]};
}


const OPENING_HOUR_DAYS = [
  {key:'mon',aliases:['ma','maanantai','maanantaina','maanantain','maanantaisin','mon','monday','mondays','man','mandag','mandagar'],fi:'Maanantai',sv:'Måndag',en:'Monday'},
  {key:'tue',aliases:['ti','tiistai','tiistaina','tiistain','tiistaisin','tue','tues','tuesday','tuesdays','tis','tisdag','tisdagar'],fi:'Tiistai',sv:'Tisdag',en:'Tuesday'},
  {key:'wed',aliases:['ke','keskiviikko','keskiviikkona','keskiviikon','keskiviikkoisin','wed','wednesday','wednesdays','ons','onsdag','onsdagar'],fi:'Keskiviikko',sv:'Onsdag',en:'Wednesday'},
  {key:'thu',aliases:['to','torstai','torstaina','torstain','torstaisin','thu','thur','thursday','thursdays','tor','torsdag','torsdagar'],fi:'Torstai',sv:'Torsdag',en:'Thursday'},
  {key:'fri',aliases:['pe','perjantai','perjantaina','perjantain','perjantaisin','fri','friday','fridays','fre','fredag','fredagar'],fi:'Perjantai',sv:'Fredag',en:'Friday'},
  {key:'sat',aliases:['la','lauantai','lauantaina','lauantain','lauantaisin','sat','saturday','saturdays','lor','lordag','lordagar'],fi:'Lauantai',sv:'Lördag',en:'Saturday'},
  {key:'sun',aliases:['su','sunnuntai','sunnuntaina','sunnuntain','sunnuntaisin','sun','sunday','sundays','son','sondag','sondagar'],fi:'Sunnuntai',sv:'Söndag',en:'Sunday'},
];

function openingHoursRequestedDay(message) {
  const q=normalizeSearchText(message);
  const tokens=new Set(q.split(/\s+/).filter(Boolean));
  for(const day of OPENING_HOUR_DAYS){
    if(day.aliases.some((alias)=>tokens.has(normalizeSearchText(alias)))) return day;
  }
  return null;
}

function openingHourDayForAlias(value) {
  const key=normalizeSearchText(value);
  return OPENING_HOUR_DAYS.find((day)=>day.aliases.some((alias)=>normalizeSearchText(alias)===key)) || null;
}

function openingHoursSegments(value) {
  const raw=cleanKnowledgeText(value);
  if(!raw) return [];

  // Some sites render schedules without whitespace, e.g.
  // "Ma-Pe : 09:00–19:00La : 09:00-17:00". Parse every day/range segment
  // independently so Saturday can never inherit Friday's hours.
  const normalized=String(raw)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase();
  const dayTokens=[
    'maanantaina','maanantai','monday','mandag','mon','man','ma',
    'tiistaina','tiistai','tuesday','tisdag','tues','tue','tis','ti',
    'keskiviikkona','keskiviikko','wednesday','onsdag','wed','ons','ke',
    'torstaina','torstai','thursday','torsdag','thur','thu','tor','to',
    'perjantaina','perjantai','friday','fredag','fri','fre','pe',
    'lauantaina','lauantai','saturday','lordag','sat','lor','la',
    'sunnuntaina','sunnuntai','sunday','sondag','sun','son','su',
  ].sort((a,b)=>b.length-a.length);
  const token='(?:'+dayTokens.join('|')+')';
  const re=new RegExp(
    '('+token+')(?:\\s*[-–—]\\s*('+token+'))?\\s*:?[ \\t]*'+
    '(closed|suljettu|stangt|\\d{1,2}[:.]\\d{2}\\s*(?:[-–—]|to|till)\\s*\\d{1,2}[:.]\\d{2})',
    'gi',
  );

  const out=[];
  const seen=new Set();
  let match;
  while((match=re.exec(normalized))){
    const first=openingHourDayForAlias(match[1]);
    const last=match[2]?openingHourDayForAlias(match[2]):first;
    if(!first || !last) continue;
    const start=OPENING_HOUR_DAYS.findIndex((day)=>day.key===first.key);
    const end=OPENING_HOUR_DAYS.findIndex((day)=>day.key===last.key);
    if(start<0 || end<0 || end<start) continue;

    let hours=String(match[3]||'').trim();
    if(/^(?:closed|suljettu|stangt)$/.test(hours)) hours='closed';
    else hours=hours.replace(/\./g,':').replace(/\s*(?:-|–|—|to|till)\s*/i,' - ');

    for(let index=start;index<=end;index++){
      const day=OPENING_HOUR_DAYS[index];
      const key=day.key+'|'+hours;
      if(seen.has(key)) continue;
      seen.add(key);
      out.push({day,value:hours});
    }
  }

  if(out.length) return out;

  // Preserve support for simple single-day rows even when their typography is
  // unusual enough not to match the stricter multi-segment parser above.
  const q=normalizeSearchText(raw);
  const first=q.split(/\s+/).filter(Boolean)[0] || '';
  const day=OPENING_HOUR_DAYS.find((candidate)=>
    candidate.aliases.some((alias)=>first===normalizeSearchText(alias))
  );
  if(!day) return [];
  const range=raw.match(/\b\d{1,2}[:.]\d{2}\s*(?:[-–—]|to|till)\s*\d{1,2}[:.]\d{2}\b/i)?.[0];
  const fallbackValue=range
    ? range.replace(/\./g,':').replace(/\s*(?:-|–|—|to|till)\s*/i,' - ')
    : /\b(?:closed|suljettu|stangt|stängt)\b/i.test(raw) ? 'closed' : '';
  return fallbackValue?[{day,value:fallbackValue}]:[];
}

function directOpeningHoursAnswer(rows,message,lang='fi') {
  if(queryTopic(message)!=='hours') return null;
  const hourRows=(rows||[])
    .filter(usableWebsiteRow)
    .filter((row)=>knowledgeTopic(String(row?.category||'')+' '+String(row?.title||'')+' '+String(row?.keywords||''))==='hours');
  if(!hourRows.length) return null;

  const target=['fi','sv','en'].includes(String(lang||'').toLowerCase())?String(lang).toLowerCase():'fi';
  const asked=openingHoursRequestedDay(message);
  const label=(day)=>day?.[target] || '';
  const localizedClosed=target==='en'?'Closed':target==='sv'?'Stängt':'Suljettu';

  const parsed=[];
  for(const row of hourRows){
    for(const segment of openingHoursSegments(row.answer)){
      parsed.push({row,...segment});
    }
  }

  if(asked){
    const match=parsed.find((item)=>item.day?.key===asked.key && item.value);
    if(match){
      const value=match.value==='closed'?localizedClosed:match.value;
      return {
        answer:label(asked)+': '+value+'.',
        handoff:false,
        confidence:1,
        intent:'Aukioloajat',
        sourceIds:[match.row.id].filter(Boolean),
        selected:[match.row],
      };
    }
  }

  const unique=[];
  const seen=new Set();
  for(const item of parsed){
    if(!item.day || !item.value || seen.has(item.day.key)) continue;
    seen.add(item.day.key);
    unique.push(item);
  }
  if(unique.length){
    unique.sort((a,b)=>OPENING_HOUR_DAYS.findIndex((x)=>x.key===a.day.key)-OPENING_HOUR_DAYS.findIndex((x)=>x.key===b.day.key));
    const answer=unique.slice(0,7).map((item)=>label(item.day)+': '+(item.value==='closed'?localizedClosed:item.value)).join(', ')+'.';
    return {
      answer,
      handoff:false,
      confidence:0.99,
      intent:'Aukioloajat',
      sourceIds:[...new Set(unique.map((x)=>x.row.id).filter(Boolean))],
      selected:[...new Map(unique.map((x)=>[x.row.id||String(x.row.source_url||x.row.answer),x.row])).values()],
    };
  }

  const row=hourRows[0];
  return {
    answer:cleanKnowledgeText(row.answer).slice(0,240),
    handoff:false,
    confidence:0.85,
    intent:'Aukioloajat',
    sourceIds:[row.id].filter(Boolean),
    selected:[row],
  };
}

function shippingMoneyValues(value) {
  const matches=String(value||'').match(/(?:[€$£]\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s*(?:€|EUR|USD|SEK|NOK|DKK|kr|\$|£))/gi) || [];
  const out=[];
  for(const raw of matches){
    const cleaned=raw.replace(/\s+/g,' ').trim();
    if(!out.some((item)=>normalizeSearchText(item)===normalizeSearchText(cleaned))) out.push(cleaned);
  }
  return out.slice(0,8);
}

function shippingMoneyKey(value) {
  const raw=String(value||'').replace(/\s+/g,'').replace(',','.').replace(/[^0-9.]/g,'');
  const number=Number(raw);
  return Number.isFinite(number)?number.toFixed(2):normalizeSearchText(value);
}

function freeShippingThreshold(value) {
  const raw=cleanKnowledgeText(value);
  const patterns=[
    /(?:free\s+(?:shipping|delivery)|ilmainen\s+toimitus|maksuton\s+toimitus|fri\s+(?:frakt|leverans))[\s\S]{0,90}?([€$£]?\s*\d+(?:[.,]\d+)?\s*(?:€|EUR|USD|SEK|NOK|DKK|kr|\$|£)?)/i,
    /([€$£]?\s*\d+(?:[.,]\d+)?\s*(?:€|EUR|USD|SEK|NOK|DKK|kr|\$|£)?)[\s\S]{0,55}?(?:free\s+(?:shipping|delivery)|ilmainen\s+toimitus|maksuton\s+toimitus|fri\s+(?:frakt|leverans))/i,
  ];
  for(const re of patterns){
    const match=raw.match(re);
    if(match?.[1] && /\d/.test(match[1])) return match[1].replace(/\s+/g,' ').trim();
  }
  return '';
}

function shippingCostSummary(rows,lang='fi') {
  const target=['fi','sv','en'].includes(String(lang||'').toLowerCase())?String(lang).toLowerCase():'fi';
  const paid=[];
  let threshold='';
  const selected=[];

  for(const row of rows||[]){
    const raw=cleanKnowledgeText(row.answer);
    if(!raw) continue;
    const normalized=normalizeSearchText(raw);
    const isFree=/free shipping|free delivery|ilmainen toimitus|maksuton toimitus|fri frakt|fri leverans/.test(normalized);
    const rowThreshold=isFree?freeShippingThreshold(raw):'';
    if(rowThreshold && !threshold) threshold=rowThreshold;
    const thresholdKey=rowThreshold?shippingMoneyKey(rowThreshold):'';

    for(const amount of shippingMoneyValues(raw)){
      if(thresholdKey && shippingMoneyKey(amount)===thresholdKey) continue;
      const key=shippingMoneyKey(amount);
      if(!paid.some((item)=>item.key===key)) paid.push({value:amount,key});
    }
    if(isFree || shippingMoneyValues(raw).length) selected.push(row);
  }

  const prices=paid.slice(0,6).map((item)=>item.value);
  const joinPrices=(values)=>{
    if(values.length<=1) return values[0]||'';
    if(values.length===2) return values[0]+' '+(target==='en'?'or':target==='sv'?'eller':'tai')+' '+values[1];
    return values.slice(0,-1).join(', ')+' '+(target==='en'?'or':target==='sv'?'eller':'tai')+' '+values.at(-1);
  };

  let answer='';
  if(prices.length && threshold){
    const listed=joinPrices(prices);
    answer=target==='en'
      ? 'Listed shipping options cost '+listed+'. Free shipping is available for orders over '+threshold+'.'
      : target==='sv'
        ? 'De angivna fraktalternativen kostar '+listed+'. Frakten är gratis för beställningar över '+threshold+'.'
        : 'Ilmoitetut toimitusvaihtoehdot maksavat '+listed+'. Toimitus on ilmainen yli '+threshold+' tilauksille.';
  } else if(prices.length){
    const listed=joinPrices(prices);
    answer=target==='en'
      ? 'The listed shipping prices are '+listed+'.'
      : target==='sv'
        ? 'De angivna fraktpriserna är '+listed+'.'
        : 'Ilmoitetut toimitushinnat ovat '+listed+'.';
  } else if(threshold){
    answer=target==='en'
      ? 'Free shipping is available for orders over '+threshold+'.'
      : target==='sv'
        ? 'Frakten är gratis för beställningar över '+threshold+'.'
        : 'Toimitus on ilmainen yli '+threshold+' tilauksille.';
  }
  return answer?{answer,selected}:null;
}

function localizedShippingCostFact(value,lang='fi') {
  const summary=shippingCostSummary([{answer:value}],lang);
  return summary?.answer || '';
}

async function directShippingCostAnswer(rows,message,lang='fi') {
  const q=normalizeSearchText(message);
  const shippingCost=/toimit|postikulu|postitus|shipping|delivery|postage|frakt|leverans/.test(q) &&
    /hinta|maksaa|maksu|kulu|veloit|price|cost|fee|charge|pris|kostar|avgift|betalt/.test(q);
  if(!shippingCost) return null;

  const deliveryRows=(rows||[])
    .filter(usableWebsiteRow)
    .filter((row)=>knowledgeTopic(String(row?.category||'')+' '+String(row?.title||'')+' '+String(row?.keywords||''))==='delivery');

  const candidates=deliveryRows
    .map((row,index)=>{
      const answer=cleanKnowledgeText(row.answer);
      const evidence=normalizeSearchText(String(row.title||'')+' '+answer);
      let score=0;
      if(/free shipping|free delivery|ilmainen toimitus|maksuton toimitus|fri frakt|fri leverans/.test(evidence)) score+=60;
      if(/[€$£]|\b(?:eur|usd|sek|nok|dkk)\b/i.test(answer)) score+=35;
      if(/shipping cost|delivery fee|postage|toimituskulu|toimitusmaksu|fraktkostnad|leveransavgift|pakettiautomaatti|kotiinkuljetus|parcel locker|home delivery|pickup point|noutopiste/.test(evidence)) score+=30;
      if(/\b(?:over|yli|alkaen|from|minimum|minimi|orders? over|tilaukset yli)\b/.test(evidence)) score+=12;
      if(/tracking|seurant/.test(evidence)) score-=25;
      if(/business days|paivaa|päivää|days|viikko|weeks|delivery time|toimitusaika/.test(evidence)) score-=8;
      return {row,answer,score,index};
    })
    .filter((item)=>item.answer && item.score>0)
    .sort((a,b)=>b.score-a.score||a.index-b.index);

  if(!candidates.length) return null;
  const target=['fi','sv','en'].includes(String(lang||'').toLowerCase())?String(lang).toLowerCase():'fi';
  // Summarize every verified delivery-policy row, not only the highest-scoring
  // candidates. This preserves individual paid rates alongside a free-shipping
  // threshold when those facts are split across separate imported rows.
  const summary=shippingCostSummary(deliveryRows,target);
  const best=candidates[0];
  let answer=summary?.answer
    || conciseKnowledgeAnswer(best.row,message)
    || best.answer;
  answer=cleanKnowledgeText(answer);
  const selected=(summary?.selected?.length?summary.selected:[best.row]).slice(0,8);
  return {
    answer,
    handoff:false,
    confidence:0.98,
    intent:'Toimitus',
    sourceIds:selected.map((row)=>row.id).filter(Boolean),
    selected,
  };
}

function deliveryDurationText(value) {
  return String(value||'')
    .replace(/\s+/g,' ')
    .trim()
    .match(/\b\d+(?:[.,]\d+)?\s*(?:[-–—]\s*\d+(?:[.,]\d+)?)?\s*(?:business\s+days?|working\s+days?|arkipaiv[aä][aä]?|arkip[aä]iv[aä][aä]?|days?|paiv[aä][aä]?|päiv[aä][aä]?|weeks?|viikkoa?|veckor?)\b/i)?.[0] || '';
}

function localizeDuration(duration,lang='fi') {
  const raw=String(duration||'').trim();
  if(!raw) return '';
  const range=raw.match(/\d+(?:[.,]\d+)?\s*(?:[-–—]\s*\d+(?:[.,]\d+)?)?/)?.[0]?.replace(/\s*[-–—]\s*/,'–') || '';
  const q=normalizeSearchText(raw);
  if(!range) return raw;
  if(/business day|working day|arkipaiv|arkipäiv/.test(q)){
    return lang==='en'?range+' business days':lang==='sv'?range+' arbetsdagar':range+' arkipäivää';
  }
  if(/week|viikko|veck/.test(q)){
    return lang==='en'?range+' weeks':lang==='sv'?range+' veckor':range+' viikkoa';
  }
  return lang==='en'?range+' days':lang==='sv'?range+' dagar':range+' päivää';
}

function extractDeliveryTimingFacts(value) {
  const raw=cleanKnowledgeText(value);
  const facts={domestic:'',international:'',inStock:'',custom:'',generic:''};

  const patterns=[
    ['domestic',/(?:domestic|kotimaa\w*|kotimai\w*|suomen\s+sis[aä]ll[aä]|inrikes)[\s\S]{0,90}?(\d+(?:[.,]\d+)?\s*(?:[-–—]\s*\d+(?:[.,]\d+)?)?\s*(?:business\s+days?|working\s+days?|days?|arkip[aä]iv[aä][aä]?|päiv[aä][aä]?|veckor?|weeks?))/i],
    ['international',/(?:international|kansainv[aä]l|ulkomaa\w*|utrikes)[\s\S]{0,90}?(\d+(?:[.,]\d+)?\s*(?:[-–—]\s*\d+(?:[.,]\d+)?)?\s*(?:business\s+days?|working\s+days?|days?|arkip[aä]iv[aä][aä]?|päiv[aä][aä]?|veckor?|weeks?))/i],
    ['inStock',/(?:in stock|varastossa|i lager)[\s\S]{0,100}?(\d+(?:[.,]\d+)?\s*(?:[-–—]\s*\d+(?:[.,]\d+)?)?\s*(?:business\s+days?|working\s+days?|days?|arkip[aä]iv[aä][aä]?|päiv[aä][aä]?|veckor?|weeks?))/i],
    ['custom',/(?:custom|customized|customised|larger batch|r[aä][aä]t[aä]l|tilausty[oö]|st[oö]rre parti)[\s\S]{0,120}?(\d+(?:[.,]\d+)?\s*(?:[-–—]\s*\d+(?:[.,]\d+)?)?\s*(?:business\s+days?|working\s+days?|days?|arkip[aä]iv[aä][aä]?|päiv[aä][aä]?|veckor?|weeks?))/i],
  ];
  for(const [key,re] of patterns){
    const m=raw.match(re);
    if(m?.[1]) facts[key]=m[1];
  }

  // Handle label-after-duration formats such as "12-26 days (International), 3-6 days (Domestic)".
  for(const m of raw.matchAll(/(\d+(?:[.,]\d+)?\s*(?:[-–—]\s*\d+(?:[.,]\d+)?)?\s*(?:business\s+days?|working\s+days?|days?|arkip[aä]iv[aä][aä]?|päiv[aä][aä]?|weeks?|viikkoa?|veckor?))\s*\((Domestic|International|Kotimaa|Kansainv[aä]linen|Inrikes|Utrikes)\)/gi)){
    const label=normalizeSearchText(m[2]);
    if(/domestic|kotimaa|inrikes/.test(label)) facts.domestic=m[1];
    if(/international|kansain|utrikes/.test(label)) facts.international=m[1];
  }

  facts.generic=deliveryDurationText(raw);
  return facts;
}

function directDeliveryTimeAnswer(rows,message,lang='fi') {
  const q=normalizeSearchText(message);
  const asksTime=
    /kuinka kauan|kauanko|montako\s+arkipaiv|toimitusaika|milloin.*(?:saap|perill)|how long|how many\s+(?:business|working)\s+days|delivery time|when.*(?:arrive|delivered)|hur lang|hur lång|hur manga\s+arbetsdagar|hur många\s+arbetsdagar|leveranstid|hur snabbt|nar.*(?:kommer|komma).*fram|när.*(?:kommer|komma).*fram/.test(q);
  if(!asksTime || queryTopic(message)!=='delivery') return null;

  const candidates=(rows||[])
    .filter(usableWebsiteRow)
    .filter((row)=>knowledgeTopic(String(row?.category||'')+' '+String(row?.title||'')+' '+String(row?.keywords||''))==='delivery')
    .map((row,index)=>{
      const answer=cleanKnowledgeText(row.answer);
      const evidence=normalizeSearchText(String(row.title||'')+' '+answer);
      let score=0;
      if(/toimitusaika|delivery time|estimate delivery|arrive|saap|leveranstid/.test(evidence)) score+=45;
      if(/business days|working days|arkipaiv|päiv|days|weeks|viikko|veckor/.test(evidence)) score+=35;
      if(/domestic|international|kotimaa|kansain|inrikes|utrikes/.test(evidence)) score+=18;
      if(/tracking|seurant/.test(evidence)) score-=30;
      if(/free shipping|toimituskulu|shipping cost|fraktkostnad/.test(evidence)) score-=25;
      return {row,answer,score,index,facts:extractDeliveryTimingFacts(answer)};
    })
    .filter((item)=>item.answer && item.score>0 && Object.values(item.facts).some(Boolean))
    .sort((a,b)=>b.score-a.score || a.index-b.index);

  const best=candidates[0];
  if(!best) return null;
  const target=['fi','sv','en'].includes(String(lang||'').toLowerCase())?String(lang).toLowerCase():'fi';
  const f=best.facts;
  const sentences=[];

  if(f.domestic){
    const d=localizeDuration(f.domestic,target);
    if(f.international){
      sentences.push(target==='en'?'Domestic delivery usually takes '+d+'.'
        :target==='sv'?'Inrikes leverans tar vanligtvis '+d+'.'
        :'Kotimaan toimitus kestää yleensä '+d+'.');
    } else {
      sentences.push(target==='en'?'Domestic orders arrive in '+d+'.'
        :target==='sv'?'Inrikes beställningar anländer inom '+d+'.'
        :'Kotimaiset tilaukset saapuvat '+d+' kuluessa.');
    }
  }
  if(f.international){
    const d=localizeDuration(f.international,target);
    sentences.push(target==='en'?'International delivery usually takes '+d+'.'
      :target==='sv'?'Internationell leverans tar vanligtvis '+d+'.'
      :'Kansainvälinen toimitus kestää yleensä '+d+'.');
  }
  if(!sentences.length && f.inStock){
    const d=localizeDuration(f.inStock,target);
    sentences.push(target==='en'?'In-stock orders are shipped within '+d+'.'
      :target==='sv'?'Beställningar som finns i lager skickas inom '+d+'.'
      :'Varastossa olevat tilaukset lähetetään '+d+' kuluessa.');
  }
  if(f.custom){
    const d=localizeDuration(f.custom,target);
    sentences.push(target==='en'?'Custom or larger orders can take about '+d+'.'
      :target==='sv'?'Specialanpassade eller större beställningar kan ta cirka '+d+'.'
      :'Räätälöidyissä tai suuremmissa tilauksissa aikaa voi kulua noin '+d+'.');
  }
  if(!sentences.length && f.generic){
    const d=localizeDuration(f.generic,target);
    sentences.push(target==='en'?'The listed delivery time is '+d+'.'
      :target==='sv'?'Den angivna leveranstiden är '+d+'.'
      :'Ilmoitettu toimitusaika on '+d+'.');
  }
  if(!sentences.length) return null;

  return {
    answer:sentences.join(' '),
    handoff:false,
    confidence:0.98,
    intent:'Toimitus',
    sourceIds:[best.row.id].filter(Boolean),
    selected:[best.row],
  };
}


function directWarrantyAnswer(rows,message,lang='fi') {
  const q=normalizeSearchText(message);
  if(!/\b(?:takuu\w*|taku\w*|warrant\w*|guarantee\w*|garanti\w*|reklamaatio\w*|reklamation\w*)\b/i.test(q)) return null;
  const target=['fi','sv','en'].includes(String(lang||'').toLowerCase())?String(lang).toLowerCase():'fi';
  // Use only verified warranty rows, never a nearby product description or
  // another tenant's FAQ. The public demo and paid bot share this route.
  const candidates=(rows||[])
    .filter(usableWebsiteRow)
    .filter((row)=>knowledgeTopic(String(row?.category||'')+' '+String(row?.title||'')+' '+String(row?.keywords||''))==='warranty')
    .map((row,index)=>{
      const answer=cleanKnowledgeText(row.answer);
      if(!/\b(?:takuu\w*|taku\w*|warrant\w*|guarantee\w*|garanti\w*)\b/i.test(normalizeSearchText(answer))) return null;
      if(/\b(?:no warranty|without warranty|not covered by warranty|ei takuuta|ilman takuuta|ingen garanti)\b/i.test(answer)) return null;
      const duration=answer.match(/\b(\d{1,3})\s*[-–]?\s*(months?|mo\.?|kuukau\w*|kk|mån(?:ad|ader)\w*|manad\w*|years?|vuos\w*|vuod\w*|år|ar|days?|päiv\w*|paiv\w*|dagar?)\b/i);
      if(!duration) return null;
      const unit=normalizeSearchText(duration[2]);
      const period=/^(?:month|mo$|kuukau|kk$|manad|manader)/.test(unit)?'months'
        :/^(?:year|vuos|vuod|ar$)/.test(unit)?'years':'days';
      const source=normalizeSearchText(answer);
      const manufacturingDefects=
        /(?:defects?\s+in\s+materials?\s+and\s+workmanship|material\s+and\s+manufacturing\s+defects?|material[-\s]+and[-\s]+workmanship|materiaali[-\s]+ja[-\s]+valmistusvirh|material[-\s]+och[-\s]+tillverkningsfel)/i.test(source);
      return {row,answer,amount:Number(duration[1]),period,manufacturingDefects,index,
        score:(manufacturingDefects?10:0)+(index===0?1:0)};
    })
    .filter(Boolean)
    .sort((a,b)=>b.score-a.score||a.index-b.index);
  const best=candidates[0];
  if(!best || best.amount<=0) return null;
  const n=best.amount;
  const duration=target==='en'
    ? n+' '+(best.period==='months'?'month'+(n===1?'':'s'):best.period==='years'?'year'+(n===1?'':'s'):'day'+(n===1?'':'s'))
    : target==='sv'
      ? n+' '+(best.period==='months'?'månad'+(n===1?'':'er'):best.period==='years'?'år':'dag'+(n===1?'':'ar'))
      : n+' '+(best.period==='months'?'kuukautta':best.period==='years'?'vuotta':'päivää');
  let answer=target==='en'?'Yes. The listed warranty lasts '+duration+'.'
    :target==='sv'?'Ja. Den angivna garantin gäller i '+duration+'.'
    :'Kyllä. Tuotetiedoissa ilmoitettu takuu on '+duration+'.';
  if(best.manufacturingDefects) answer+=' '+(target==='en'
    ? 'It covers defects in materials and workmanship.'
    :target==='sv'
      ? 'Den täcker material- och tillverkningsfel.'
      :'Se kattaa materiaali- ja valmistusvirheet.');
  return {
    answer,handoff:false,confidence:0.98,intent:'Takuu',
    sourceIds:[best.row.id].filter(Boolean),selected:[best.row],
  };
}

function directReturnPolicyAnswer(rows,message,lang='fi') {
  const q=normalizeSearchText(message);
  if(!/palaut|return|refund|retur|aterbetal|återbetal|exchange/.test(q) && !exchangeWord.test(q)) return null;

  const candidates=(rows||[])
    .filter(usableWebsiteRow)
    .filter((row)=>knowledgeTopic(String(row?.category||'')+' '+String(row?.title||'')+' '+String(row?.keywords||''))==='returns')
    .map((row,index)=>{
      const answer=cleanKnowledgeText(row.answer);
      const normalized=normalizeSearchText(answer);
      const days=answer.match(/\b(\d{1,3})\s*(?:days?|day|päiv(?:ä|ää|än)|paiv(?:a|aa|an)|dagar|dag)\b/i)?.[1] || '';
      let score=0;
      if(days) score+=70;
      if(/return|refund|palaut|retur|aterbetal|återbetal/.test(normalized)) score+=25;
      if(/policy|käytäntö|kaytanto|oikeus|right|villkor/.test(normalized)) score+=8;
      return {row,answer,normalized,days,score,index};
    })
    .filter((item)=>item.answer&&item.score>0)
    .sort((a,b)=>b.score-a.score||a.index-b.index);

  const best=candidates[0];
  if(!best) return null;
  const target=['fi','sv','en'].includes(String(lang||'').toLowerCase())?String(lang).toLowerCase():'fi';
  const sourceLanguage=detectConversationLanguage(best.answer,'fi');

  // Preserve a complete same-language policy, but never echo a FAQ question
  // such as "Mitä 100 päivän palautusoikeus tarkoittaa?" as the answer.
  const looksLikeQuestion=/[?？]\s*$/.test(best.answer) || /^(?:mita|mitä|what|how|hur|vad)\b/i.test(best.normalized);
  if(sourceLanguage===target && !looksLikeQuestion){
    return {
      answer:best.answer,
      handoff:false,
      confidence:0.98,
      intent:'Palautukset',
      sourceIds:[best.row.id].filter(Boolean),
      selected:[best.row],
    };
  }

  if(!best.days) return null;
  let answer=target==='en'
    ? 'You can return the product within '+best.days+' days.'
    : target==='sv'
      ? 'Du kan returnera produkten inom '+best.days+' dagar.'
      : 'Tuotteen voi palauttaa '+best.days+' päivän kuluessa.';

  const taxesNonRefundable=
    /(?:duties|taxes).{0,80}(?:non-?refundable|not refunded|not refundable)/i.test(best.answer) ||
    /(?:non-?refundable|not refunded|not refundable).{0,80}(?:duties|taxes)/i.test(best.answer);
  if(taxesNonRefundable){
    answer+=' '+(target==='en'
      ? 'Duties and taxes are non-refundable.'
      : target==='sv'
        ? 'Tullar och skatter återbetalas inte.'
        : 'Tulleja ja veroja ei palauteta.');
  }

  return {
    answer,
    handoff:false,
    confidence:0.98,
    intent:'Palautukset',
    sourceIds:[best.row.id].filter(Boolean),
    selected:[best.row],
  };
}


function answerTone(rows) {
  const value = knowledgeValue(rows, 'Vastaustyyli').toLowerCase();
  if (value.includes('lyhyt')) return 'Pidä vastaus erittäin lyhyenä ja suorana. Tavallisesti 1–2 lausetta.';
  if (value.includes('asial')) return 'Kirjoita asiallisesti, rauhallisesti ja ammattimaisesti. Vältä turhaa myyntikieltä.';
  return 'Kirjoita ystävällisesti, luontevasti ja ihmisen tavoin. Vältä robottimaista tai yliyrittävää sävyä.';
}

function inferIntent(message) {
  const q = normalizeSearchText(message);
  if (/tilausnumero|tilaukseni|tilauksen tila|order status|where is my order|seuranta|tracking|orderstatus|var är min beställning|var ar min bestallning/.test(q)) return 'Tilauksen tila';
  if (/maksutapa|maksaminen|klarn|paypal|mobilepay|apple pay|google pay|payment method|betalningsmetod/.test(q)) return 'Maksaminen';
  if (/palaut|return|refund|exchange|retur/.test(q) || exchangeWord.test(q)) return 'Palautukset';
  if (/takuu|reklamaatio|warranty|guarantee|garanti/.test(q)) return 'Takuu';
  if (/toimitus|toimituk|toimitusaika|shipping|delivery|shipment|nouto|pickup|leverans/.test(q)) return 'Toimitus';
  if (/ajanvaraus|varaa aika|ajan vara|booking|appointment|boka|bokning|tidsbokning/.test(q)) return 'Ajanvaraus';
  if (/tarjou[sk]|arvio|quote|estimate|offert|prisforslag|prisförslag/.test(q)) return 'Tarjouspyyntö';
  if (/hinta|maksaa|hinnoittelu|kustannus|price|cost|pricing|pris|kostar|kostnad/.test(q)) return 'Hinta';
  if (/auki|lauantai|sunnuntai|viikonloppu|kello|opening|open|hours|öppet|oppet|öppettider|oppettider/.test(q)) return 'Aukioloajat';
  if (/puhelin|sahkoposti|sähköposti|yhteys|yhteytta|yhteyttä|yhteystiedot|ottaa yhteytta|ottaa yhteyttä|soittaa|phone|email|contact|contact us|get in touch|telefon|e-post|kontakt|kontakta|ringa/.test(q)) return 'Yhteystiedot';
  if (/missä|missa|osoite|toimialue|alue|where|address|location|adress|område|omrade/.test(q)) return 'Sijainti';
  if (/palvelu|teette|tarjoatte|onnistuuko|onnistuisko|pystytteko|voitteko|voisitteko|onko teilla|loytyyko teilta|haluaisin tilata|haluan tilata|tarvitsen|tarviin|pesu|puhdist|siivou|oljy|asenn|maal|korj|huol|raiva|poisvien|tuote|valikoima|mitä teiltä saa|mita teilta saa|service|services|offer|product|selection|sell|tjänst|tjanst|tjänster|tjanster|erbjuder/.test(q)) return 'Palvelut';
  return 'Asiakaskysymys';
}


function conversationTopic(value) {
  const direct=queryTopic(value);
  if (direct) return direct;
  const intent=inferIntent(value);
  const map={
    'Hinta':'pricing','Aukioloajat':'hours','Yhteystiedot':'contact','Sijainti':'contact',
    'Palvelut':'services','Ajanvaraus':'booking','Tarjouspyyntö':'quote',
    'Tilauksen tila':'delivery','Toimitus':'delivery','Palautukset':'returns','Takuu':'warranty','Maksaminen':'payment'
  };
  if (map[intent]) return map[intent];
  if (finnishServiceActionKind(value)) return 'services';
  return '';
}

const CONVERSATION_PHRASES = Object.freeze({
  greeting:[
    'hei','moi','moikka','moro','morjens','terve','paivaa','hyvaa paivaa','huomenta','hyvaa huomenta','iltaa','hyvaa iltaa',
    'hello','hi','hey','good morning','good afternoon','good evening',
    'hej','halla','god morgon','god dag','god kvall'
  ],
  gratitude:[
    'kiitos','kiitti','kiitoksia','paljon kiitoksia','kiitos paljon','kiitti paljon','suuret kiitokset','tuhannet kiitokset',
    'kiitos avusta','kiitos avustasi','kiitti avusta','iso kiitos','jes kiitos','joo kiitos','okei kiitos','ok kiitos',
    'thanks','thank you','thanks a lot','thank you very much','many thanks','thanks so much','thank you so much',
    'thanks for the help','thanks for your help','thank you for the help','thank you for your help','cheers',
    'tack','tack sa mycket','tusen tack','stort tack','tack for hjalpen','tack for din hjalp','okej tack','japp tack'
  ],
  acknowledgement:[
    'ok','okei','okay','okey','selva','selkee','selkis','selva homma','asia selva','joo','juu','jep','jes','hyva','hyva homma',
    'hyva juttu','aivan','aha','jaa','niinpa','ymmarsin','tajusin','kuulostaa hyvalta','sopii','kay','kay hyvin','sopii hyvin',
    'yes','yeah','yep','yup','sure','alright','all right','got it','understood','i understand','makes sense','that makes sense',
    'sounds good','great','perfect','fine','okay got it','right','exactly',
    'okej','japp','ja','bra','bra da','forstar','jag forstar','det later bra','perfekt','precis'
  ],
  farewell:[
    'moi moi','heippa','hei hei','nakemiin','nahdaan','palaillaan','ei muuta','ei muuta kiitos','kiitos hei','kiitos moi',
    'bye','goodbye','bye bye','see you','see you later','talk to you later','that is all','thats all','thanks bye',
    'hej da','hejda','vi ses','vi hors','tack hej'
  ],
  wellbeing:[
    'mita kuuluu','miten menee','kuinka menee','mitas kuuluu','miten sulla menee','miten sinulla menee',
    'how are you','how is it going','how are things','how are you doing','hows it going',
    'hur mar du','hur ar laget','hur gar det'
  ],
  identity:[
    'kuka olet','mika olet','mikas olet','oletko botti','ootko botti','oletko tekoaly','ootko tekoaly',
    'who are you','what are you','are you a bot','are you ai','are you an ai',
    'vem ar du','vad ar du','ar du en bot','ar du ai'
  ],
  help:[
    'voitko auttaa','voisitko auttaa','autatko','auta minua','tarvitsen apua','tarviin apua','minulla on kysymys','mulla on kysymys',
    'can you help','can you help me','could you help','could you help me','i need help','i have a question','help me',
    'kan du hjalpa','kan du hjalpa mig','jag behover hjalp','jag har en fraga'
  ],
  capabilities:[
    'mita osaat','mita pystyt tekemaan','missa voit auttaa','miten voit auttaa','missa asioissa voit auttaa','mita voin kysya',
    'what can you do','what can i ask','what can you help with','how can you help','what do you know',
    'vad kan du gora','vad kan jag fraga','vad kan du hjalpa med','hur kan du hjalpa'
  ],
  confusion:[
    'en ymmarra','en tajua','en tajunnut','en ymmartanyt','mita tarkoitat','miten niin','selita','selita tarkemmin','avaa tota',
    'i dont understand','i do not understand','what do you mean','how so','explain','explain that','can you explain',
    'jag forstar inte','vad menar du','hur menar du','forklara','kan du forklara'
  ],
  repeat:[
    'toista','toista toi','sano uudestaan','voitko toistaa','voisitko toistaa','uudestaan','mita sanoit',
    'repeat that','say that again','can you repeat','could you repeat','what did you say',
    'upprepa','sag det igen','kan du upprepa','vad sa du'
  ],
  apology:[
    'anteeksi','sori','sori siita','pahoittelut','mun moka','oma moka',
    'sorry','sorry about that','my bad','apologies',
    'forlat','ursakta','mitt fel'
  ],
  compliment:[
    'hyva botti','mahtavaa','hienoa','loistavaa','erinomaista','jes mahtavaa',
    'nice','awesome','great job','good job','excellent','amazing',
    'snyggt','toppen','fantastiskt','bra jobbat'
  ]
});

function normalizeConversationPhrase(value) {
  return normalizeSearchText(value)
    .replace(/\b(don|doesn|didn|isn|aren|wasn|weren|can|couldn|wouldn|shouldn|won)\s+t\b/g,'$1t')
    .replace(/\b(i|you|we|they|he|she|it|that|what|who|how)\s+(m|re|ve|ll|d|s)\b/g,'$1$2');
}

const CONVERSATION_PHRASE_SETS = Object.fromEntries(
  Object.entries(CONVERSATION_PHRASES).map(([kind,phrases])=>[
    kind,new Set(phrases.map((phrase)=>normalizeConversationPhrase(phrase)))
  ])
);

function conversationPhraseType(value) {
  const q=normalizeConversationPhrase(value);
  if (!q) return '';

  // These are intentionally whole-message matches. A greeting/thanks prefix
  // must never swallow a real customer question such as "moi paljonko maksaa?".
  for (const kind of ['wellbeing','identity','help','capabilities','confusion','repeat','farewell','gratitude','apology','compliment','greeting','acknowledgement']) {
    if (CONVERSATION_PHRASE_SETS[kind].has(q)) return kind;
  }

  if (/^(?:no|noh|siis|ihan|vaan|hei|moi|okei|ok|well|so|okay|hey|alltsa|na)\s+(?:kiitos|kiitti|thanks|thank you|tack)(?:\s+(?:paljon|avusta|avustasi|a lot|so much|for (?:the |your )?help|sa mycket|for hjalpen))?$/.test(q)) return 'gratitude';
  if (/^(?:ei|en|no|nope|nej)\s+(?:kiitos|kiitti|thanks|thank you|tack)$/.test(q)) return 'negative_gratitude';
  if (/^(?:no|noh|okei|ok|okay|joo|juu|jep|jes|aivan|selva|selkee|yeah|yep|yup|right|sure|okej|japp|ja)\s+(?:selva|selkee|selkis|hyva|hyva homma|got it|understood|makes sense|sounds good|bra|perfekt|precis)$/.test(q)) return 'acknowledgement';
  if (/^(?:kiitos|kiitti|thanks|thank you|tack).*(?:avusta|help|hjalp)$/.test(q)) return 'gratitude';
  if (/^(?:moi|hei|moikka|moro|terve|hello|hi|hey|hej|halla)\s+(?:taas|sinne|vaan|kaikille|there|again|igen)$/.test(q)) return 'greeting';
  return '';
}

function isConversationalAcknowledgement(value) {
  const kind=conversationPhraseType(value);
  return kind==='acknowledgement' || kind==='gratitude' || kind==='negative_gratitude' || kind==='compliment' || kind==='apology';
}

function lastConversationAnswer(history=[]) {
  for (let i=(Array.isArray(history)?history.length:0)-1;i>=0;i--) {
    const answer=String(history[i]?.answer||history[i]?.assistant||'').trim();
    if (answer) return answer;
  }
  return '';
}

function conversationalResponse(value, lang='fi', history=[]) {
  const kind=conversationPhraseType(value);
  if (!kind) return null;
  const language=['fi','sv','en'].includes(String(lang||'').toLowerCase())?String(lang).toLowerCase():'fi';
  const lastAnswer=lastConversationAnswer(history);

  const answers={
    fi:{
      greeting:'Hei! Miten voin auttaa?',
      gratitude:'Ole hyvä!',
      negative_gratitude:'Selvä!',
      acknowledgement:'Selvä!',
      farewell:'Kiitos yhteydenotosta! Mukavaa päivänjatkoa!',
      wellbeing:'Hyvin, kiitos! Miten voin auttaa?',
      identity:'Olen tämän yrityksen verkkosivujen asiakaspalvelubotti. Vastaan yrityksen omien tietojen perusteella ja pidän keskustelun kontekstin mukana jatkokysymyksissä.',
      help:'Totta kai. Kerro vain omin sanoin, missä asiassa tarvitset apua.',
      capabilities:'Voit kysyä omin sanoin esimerkiksi palveluista, tuotteista, hinnoista, aukioloajoista, toimituksista, palautuksista, ajanvarauksesta tai yhteystiedoista. Jos kysyt jatkokysymyksen, yhdistän sen aiempaan keskusteluun.',
      confusion:'Voin selittää asian toisella tavalla. Kerro, mikä kohta jäi epäselväksi.',
      repeat:lastAnswer||'Totta kai. Kerro, minkä kohdan haluat minun toistavan.',
      apology:'Ei haittaa. Miten voin auttaa?',
      compliment:'Kiitos! Miten voin auttaa?'
    },
    sv:{
      greeting:'Hej! Hur kan jag hjälpa?',
      gratitude:'Varsågod!',
      negative_gratitude:'Okej!',
      acknowledgement:'Okej!',
      farewell:'Tack för att du kontaktade oss! Ha en bra dag!',
      wellbeing:'Bra, tack! Hur kan jag hjälpa?',
      identity:'Jag är kundservicebotten på det här företagets webbplats. Jag svarar utifrån företagets egna uppgifter och behåller sammanhanget i följdfrågor.',
      help:'Självklart. Berätta med egna ord vad du behöver hjälp med.',
      capabilities:'Du kan fråga med egna ord om till exempel tjänster, produkter, priser, öppettider, leveranser, returer, bokning eller kontaktuppgifter. Jag kopplar också följdfrågor till den tidigare diskussionen.',
      confusion:'Jag kan förklara det på ett annat sätt. Berätta vilken del som var oklar.',
      repeat:lastAnswer||'Självklart. Berätta vilken del du vill att jag upprepar.',
      apology:'Ingen fara. Hur kan jag hjälpa?',
      compliment:'Tack! Hur kan jag hjälpa?'
    },
    en:{
      greeting:'Hi! How can I help?',
      gratitude:'You’re welcome!',
      negative_gratitude:'Got it!',
      acknowledgement:'Got it!',
      farewell:'Thanks for getting in touch! Have a great day!',
      wellbeing:'I’m good, thanks! How can I help?',
      identity:'I’m the customer-service bot on this company’s website. I answer from the company’s own information and keep conversational context for follow-up questions.',
      help:'Of course. Tell me in your own words what you need help with.',
      capabilities:'You can ask naturally about things such as services, products, pricing, opening hours, delivery, returns, booking, or contact details. I also connect follow-up questions to the earlier conversation.',
      confusion:'I can explain it another way. Tell me which part was unclear.',
      repeat:lastAnswer||'Of course. Tell me which part you want me to repeat.',
      apology:'No problem. How can I help?',
      compliment:'Thanks! How can I help?'
    }
  };
  return {kind,answer:answers[language][kind]||answers[language].acknowledgement};
}

function conversationalSmallTalkReply(value, lang='fi', history=[]) {
  return conversationalResponse(value,lang,history)?.answer||'';
}

function stripConversationalQueryNoise(value) {
  let q=normalizeSearchText(value);
  if (!q) return '';

  // Greeting/acknowledgement wrappers are noise only when a substantive query
  // remains after them. This makes "moi, paljonko maksaa?" behave like
  // "paljonko maksaa?" without treating plain "moi" as a business query.
  q=q.replace(/^(?:(?:hei|moi|moikka|moro|morjens|terve|hello|hi|hey|hej|halla|ok|okei|okay|joo|juu|jep|jes|selva|aivan)\s+){1,3}(?=\S)/,'');
  q=q.replace(/^(?:voisitko|voisitko ystavallisesti|kertoisitko|kerrotko|osaatko sanoa|haluaisin tietaa|haluan tietaa|saisinko tietaa|tiedatko)\s+(?:kertoa\s+|sanoa\s+|selvittaa\s+)?/,'');
  q=q.replace(/^(?:could you|can you|would you|please|i would like to know|i want to know|do you know)\s+(?:tell me\s+|explain\s+)?/,'');
  q=q.replace(/^(?:kan du|skulle du kunna|jag skulle vilja veta|jag vill veta|vet du)\s+(?:beratta\s+|saga\s+|forklara\s+)?/,'');
  q=q.replace(/\s+(?:kiitos|kiitti|thanks|thank you|please|tack)$/,'').trim();
  return q;
}

function meaningfulConversationTurn(history=[]) {
  for (let i=(Array.isArray(history)?history.length:0)-1;i>=0;i--) {
    const event=history[i]||{};
    const question=String(event.question||event.user||'').trim();
    if (!question) continue;
    const kind=conversationPhraseType(question);
    if (kind) continue;
    return {
      question,
      answer:String(event.answer||event.assistant||'').trim()
    };
  }
  return null;
}

function conversationalClarification(value, lang='fi', history=[]) {
  const q=stripConversationalQueryNoise(value);
  if (!q) return '';
  const words=q.split(/\s+/).filter(Boolean);
  const language=['fi','sv','en'].includes(String(lang||'').toLowerCase())?String(lang).toLowerCase():'fi';

  const say=(fi,sv,en)=>language==='en'?en:language==='sv'?sv:fi;
  if (/^(?:onko\s+(?:tama|tämä|se|tuo)\s+turvallinen|onko\s+(?:tama|tämä|se|tuo)\s+turvallista|is\s+(?:this|it|that)\s+safe|are\s+(?:these|they)\s+safe|ar\s+(?:detta|det|den)\s+saker|är\s+(?:detta|det|den)\s+säker|ar\s+(?:detta|det)\s+säkert|är\s+(?:detta|det)\s+säkert)$/.test(q)) {
    return say(
      'Tarkoitatko tuotteen käyttöturvallisuutta vai tilaamisen ja maksamisen turvallisuutta?',
      'Menar du produktens säkerhet vid användning eller säkerheten vid beställning och betalning?',
      'Do you mean whether the product is safe to use, or whether ordering and payment are secure?'
    );
  }
  if (/^(?:paljonko|hinta|mika hinta|mita maksaa|how much|price|what price|hur mycket|pris|vad kostar)$/.test(q)) {
    return say('Minkä tuotteen tai palvelun hintaa tarkoitat?','Vilken produkt eller tjänst vill du veta priset på?','Which product or service would you like the price for?');
  }
  if (/^(?:milloin|monelta|mihin aikaan|huomenna|tanaan|when|what time|tomorrow|today|nar|vilken tid|imorgon|idag)$/.test(q)) {
    return say('Mitä aikaa, päivää tai palvelua tarkoitat?','Vilken tid, dag eller tjänst menar du?','Which time, day, or service do you mean?');
  }
  if (/^(?:missa|missapain|where|where exactly|var|var nagonstans)$/.test(q)) {
    return say('Mitä sijaintia tai paikkaa tarkoitat?','Vilken plats menar du?','Which location do you mean?');
  }
  if (/^(?:mika koko|mita kokoja|koko|what size|sizes|which size|vilken storlek|storlekar)$/.test(q)) {
    return say('Minkä tuotteen kokoa tarkoitat?','Vilken produkts storlek menar du?','Which product’s size do you mean?');
  }
  if (/^(?:mita vareja|vari|varit|what colors|what colours|color|colour|vilka farger|farg)$/.test(q)) {
    return say('Minkä tuotteen värejä tarkoitat?','Vilken produkts färger menar du?','Which product’s colors do you mean?');
  }

  const vague=/\b(?:se|sen|sita|siita|sille|siihen|tama|taman|tuo|tuota|tota|toi|ne|niita|niiden|sama|it|that|this|those|them|same|det|den|detta|dem|samma)\b/.test(q);
  if (vague && !meaningfulConversationTurn(history)) {
    return say('Mitä asiaa tarkoitat?','Vad syftar du på?','What are you referring to?');
  }
  if (words.length<=3 && /^(?:palvelu|tuote|toimitus|palautus|takuu|maksu|service|product|delivery|return|warranty|payment|tjanst|produkt|leverans|retur|garanti|betalning)$/.test(q)) {
    return say('Mitä haluaisit tietää siitä tarkemmin?','Vad vill du veta mer exakt om det?','What exactly would you like to know about it?');
  }
  return '';
}

function contextualizeConversationQuery(message, history = []) {
  const current=String(message||'').trim();
  let q=stripConversationalQueryNoise(current);
  if (!current || !q) return current;

  const previousTurn=meaningfulConversationTurn(history);
  const previous=previousTurn?.question||'';
  const previousAnswer=previousTurn?.answer||'';

  const correction=q.match(/^(?:ei vaan|eikun|ei kun|tarkoitin|siis tarkoitin|siis ei|actually|no i mean|i mean|i meant|sorry i meant|nej jag menar|jag menade|alltsa jag menar)\s+(.+)$/);
  if (correction) {
    const rest=correction[1].trim();
    const referencesPrevious=/\b(?:se|sen|sita|siita|sama|toi|tuo|it|that|this|same|det|den|detta|samma)\b/.test(rest);
    if (referencesPrevious && previous) return [previous,previousAnswer.slice(0,180),rest].filter(Boolean).join(' ');
    return rest;
  }

  const lead=q.match(/^(?:enta|entapa|entas|mites|miten sitten|ja enta|no enta|mut enta|mutta enta|what about|how about|and what about|and how about|what if|and then|also|och da|men hur|vad galler)\s+(.+)$/);
  const shortContinuation=q.split(/\s+/).length<=7
    ? q.match(/^(?:ja|and|also|then|och|sen)\s+(.+)$/)
    : null;
  const pronoun=/\b(?:se|sen|sita|siita|sille|siihen|tama|taman|tuo|tuota|tota|toi|ne|niita|niiden|sama|saman|it|that|this|those|them|same|det|den|detta|dem|samma)\b/.test(q);
  const terseTopic=/^(?:paljonko|mita maksaa|mika hinta|hinta|minkahintainen|kuinka kauan|kauanko|milloin|monelta|mihin aikaan|onko auki|huomenna|tanaan|lauantaina|sunnuntaina|viikonloppuna|saako sen|saako sita|voiko sen|voiko sita|onnistuuko se|onko sita|onko niita|loytyyko sita|varastossa|mita vareja|mita kokoja|entako toimitus|entako palautus|miksi|miksi niin|how much|what price|how long|when|what time|is it open|tomorrow|today|this weekend|can i get it|can you do it|is it available|in stock|what colors|what colours|what sizes|why|why is that|hur mycket|vad kostar|hur lange|nar|vilken tid|oppet|imorgon|idag|i helgen|finns den|i lager|vilka farger|vilka storlekar|varfor)\b/.test(q);
  const currentTopic=conversationTopic(q);
  const likelyFollowUp=Boolean(lead||shortContinuation||pronoun||terseTopic);

  if (!likelyFollowUp || !previous) return q;

  const rest=(lead?.[1]||shortContinuation?.[1]||q).trim();
  const previousTopic=conversationTopic(previous);
  const restTopic=conversationTopic(rest);

  // An explicit new topic wins over the preceding product/service answer.
  // Otherwise delivery questions inherit catalog keywords and retrieve products.
  if (restTopic && restTopic !== 'services' && restTopic !== previousTopic) return rest;
  const hints={
    pricing:'hinta maksaa price cost pris kostar',
    hours:'aukioloajat opening hours oppettider',
    booking:'ajanvaraus varaa aika booking appointment boka tid',
    quote:'tarjous tarjouspyynto quote estimate offert',
    delivery:'toimitus toimitusaika shipping delivery leverans',
    returns:'palautus vaihto return refund retur',
    warranty:'takuu warranty garanti',
    payment:'maksutapa payment method betalningsmetod',
    stores:'sijainti osoite location address adress',
    contact:'yhteystiedot contact phone email kontakt',
    products:'tuote valikoima product selection produkt sortiment',
    services:'palvelu service tjanst',
    materials:'materiaali material',
    quality:'laatu quality',
    care:'hoito puhdistus care cleaning',
    sizing:'koko mitat size dimensions storlek'
  };

  // "Entä katon pesu?" after a pricing question means the price of the new
  // service. Carry the old intent, not the old service noun.
  if ((lead||shortContinuation) && hints[previousTopic] && restTopic!==previousTopic &&
      !/\b(?:se|sen|sita|siita|sama|it|that|same|det|den|samma)\b/.test(rest)) {
    return rest+' '+hints[previousTopic];
  }

  // For pronouns and terse ellipsis, include the previous customer question and
  // a short slice of the previous grounded answer. That lets "entä viikonloppuna?",
  // "saako sitä punaisena?" and "miksi?" inherit the actual subject.
  return [previous,previousAnswer.slice(0,180),q].filter(Boolean).join(' ');
}

function bookingLinkLooksLikeContactForm(raw) {
  // A generic contact/quote page cannot be represented as a real calendar
  // just because an old imported profile has stored it in the booking field.
  // Do not block dedicated scheduling services or explicitly booking URLs.
  try {
    const parsed=new URL(String(raw||'').trim());
    if(!['https:','http:'].includes(parsed.protocol)) return false;
    if(/(?:booking|appointment|calendar|schedule|ajanvaraus|varaa[-_]?aika|tidsbokning|bokning)/i.test(parsed.search)) return false;
    const path=decodeURIComponent(parsed.pathname).replace(/\/+$/,'').toLowerCase();
    return /\/(?:contact(?:[-_]?us)?|get[-_]?in[-_]?touch|yhteystiedot|ota[-_]?yhteytta|ota[-_]?yhteyttä|kontakt(?:[-_]?oss)?|kontakta[-_]?oss)(?:\.html?)?$/.test(path);
  } catch { return false; }
}

function chatActions(rows, message, handoff = false, lang = 'fi', selected = []) {
  const actionLang = ['fi','sv','en'].includes(String(lang || '').toLowerCase()) ? String(lang).toLowerCase() : 'fi';
  const q = normalizeSearchText(message);
  const quote = knowledgeValue(rows, 'Tarjouspyyntölomake');
  const bookingCandidate = knowledgeValue(rows, 'Ajanvarauslinkki');
  const booking = bookingCandidate && !bookingLinkLooksLikeContactForm(bookingCandidate) &&
    bookingCandidate !== quote ? bookingCandidate : '';
  const phone = verifiedContactValue(rows, 'Puhelinnumero')?.value || '';
  const email = verifiedContactValue(rows, 'Sähköposti')?.value || '';
  const contactPage=verifiedContactPage(rows);
  const requestedContact=explicitContactQuestion(message);
  const catalogUrl=(broadProductQuestion(message)||ecommerceOrderQuestion(message))?productCatalogDestination(rows):'';
  const actions = [];
  const push = (action) => {
    const key = action?.url || (action?.mode ? action.mode + ':' + action.type : '');
    if (!key || actions.some((x) => (x.url || (x.mode ? x.mode + ':' + x.type : '')) === key)) return;
    actions.push(action);
  };

  for (const row of Array.isArray(selected) ? selected : []) {
    const product=parseProductKnowledgeRow(row);
    if(!product?.url) continue;
    push({
      type:'product',
      label:actionLang==='en'?'View '+product.name:actionLang==='sv'?'Visa '+product.name:'Katso '+product.name,
      url:product.url,
    });
  }

  if(catalogUrl){
    push({
      type:'catalog',
      label:actionLang==='en'?'View all products':actionLang==='sv'?'Se alla produkter':'Katso kaikki tuotteet',
      url:catalogUrl,
    });
  }

  if (requestedContact || generalContactQuestion(message) || /yhteys|yhteytta|yhteystiedot|ottaa yhteytta|contact|get in touch|kontakt|kontakta/.test(q)) {
    if (contactPage) push({
      type:'contact',mode:'website_contact',
      label:actionLang==='en'?(contactPage.form?'Open contact form':'Open contact page')
        :actionLang==='sv'?(contactPage.form?'Öppna kontaktformulär':'Öppna kontaktsidan')
        :(contactPage.form?'Avaa yhteydenottolomake':'Avaa yhteydenottosivu'),
      url:contactPage.value,
    });
    if (phone && requestedContact!=='email') push({ type:'contact',mode:'phone',label:actionLang==='en'?'Call us':actionLang==='sv'?'Ring oss':'Soita',url:'tel:'+phone.replace(/[^\d+]/g,'') });
    if (email && requestedContact!=='phone') push({ type:'contact',mode:'email',label:actionLang==='en'?'Send email':actionLang==='sv'?'Skicka e-post':'Lähetä sähköposti',url:'mailto:'+email });
    if (!contactPage && ((requestedContact==='phone'&&!phone) || (requestedContact==='email'&&!email) || (!requestedContact&&!phone&&!email))) {
      push({ type:'contact',mode:'contact_form',label:actionLang==='en'?'Leave your contact details':actionLang==='sv'?'Lämna dina kontaktuppgifter':'Jätä yhteystiedot' });
    }
  }

  if (/tilausnumero|tilaukseni|tilauksen tila|seuranta|order status|where is my order|orderstatus|var är min beställning|var ar min bestallning/.test(q)) {
    push({ type: 'order_status', mode: 'order_form', label: actionLang === 'en' ? 'Check order status' : actionLang === 'sv' ? 'Kontrollera orderstatus' : 'Tarkista tilauksen tila' });
  }

  // "aika" is part of toimitusaika (delivery time) and aukioloaika
  // (opening time). Never show booking actions for ordinary time questions.
  const wantsBooking=/(?:ajanvaraus|ajan\s+varaus|ajan\s+varaam|ajan\s+varaa|varata\s+(?:aika|ajan|aikaa)|varaan\s+(?:aika|ajan)|varaa\s+(?:aika|ajan)|varais\w*\s+(?:aika|ajan)|aika\s+varattua|ajan\s+saa\s+varattua|\b(?:varata|varataanko|varaan|varaa|varaisin|varattua|varaus|varauksen|varauksia)\b|(?:booking|book\s+(?:an?\s+)?(?:appointment|time|slot)|appointment|schedule\s+(?:a|an\s+)?(?:visit|appointment|time)|tidsbokning|bokning|boka\s+(?:en\s+)?tid|boka)\b)/i.test(q);
  if (wantsBooking) {
    push({ type: 'booking', mode: 'booking_form', label: actionLang === 'en' ? 'Book a time' : actionLang === 'sv' ? 'Boka tid' : 'Varaa aika' });
    if (booking) push({ type: 'booking', label: actionLang === 'en' ? 'Open calendar' : actionLang === 'sv' ? 'Öppna bokningen' : 'Avaa ajanvaraus', url: booking });
  }

  if (/tarjou[sk]|hinta-arvio|arvio|kustannusarvio|quote|estimate|offert|prisförslag|prisforslag/.test(q)) {
    if (!quote && contactPage) push({ type:'quote',
      label:actionLang==='en'?'Contact for a quote':actionLang==='sv'?'Kontakta för offert':'Kysy tarjousta',
      url:contactPage.value,
    });
    else if (!quote) push({ type: 'quote', mode: 'quote_form', label: actionLang === 'en' ? 'Request a quote' : actionLang === 'sv' ? 'Begär offert' : 'Pyydä tarjous' });
    if (quote) push({ type: 'quote', label: bookingLinkLooksLikeContactForm(quote)
      ? (actionLang === 'en' ? 'Open contact page' : actionLang === 'sv' ? 'Öppna kontaktsidan' : 'Avaa yhteydenottosivu')
      : (actionLang === 'en' ? 'Open quote form' : actionLang === 'sv' ? 'Öppna offertformuläret' : 'Avaa tarjouslomake'), url: quote });
  }

  if (/soittakaa|ottakaa yhteytta|ottakaa yhteyttä|yhteydenotto|call me|contact me|ring mig|kontakta mig/.test(q)) {
    push({ type: 'callback', mode: 'lead', label: actionLang === 'en' ? 'Request a callback' : actionLang === 'sv' ? 'Be om kontakt' : 'Pyydä yhteydenottoa' });
  }

  if (phone && (handoff || /puhelin|soita|soittaa|yhteys|phone|call|telefon|ringa|kontakt/.test(q))) {
    push({ type: 'phone', label: actionLang === 'en' ? 'Call' : actionLang === 'sv' ? 'Ring' : 'Soita', url: 'tel:' + phone.replace(/\s+/g, '') });
  }
  if (email && (handoff || /sahkoposti|sähköposti|email|e-mail|meili|yhteys|e-post|contact|kontakt/.test(q))) {
    push({ type: 'email', label: actionLang === 'en' ? 'Send email' : actionLang === 'sv' ? 'Skicka e-post' : 'Lähetä sähköposti', url: 'mailto:' + email });
  }

  return actions.slice(0, 4);
}

function parseGroundedModelOutput(raw, selected) {
  const text = String(raw || '').trim();
  if (!text || /^HANDOFF\.?$/i.test(text)) return { answer: '', sourceIds: [] };
  const match = text.match(/^SOURCES:\s*([0-9,\s]+)\s*\n+/i);
  let answer = text;
  let sourceIds = [];
  if (match) {
    answer = text.slice(match[0].length).trim();
    const indexes = match[1].split(',').map((x) => Number(x.trim())).filter((x) => Number.isInteger(x) && x >= 1 && x <= selected.length);
    sourceIds = [...new Set(indexes.map((i) => selected[i - 1]?.id).filter(Boolean))];
  }
  if (!sourceIds.length) sourceIds = selected.slice(0, 2).map((x) => x.id).filter(Boolean);
  return { answer, sourceIds };
}

function isPrivateAddress(ip) {
  const version = net.isIP(ip);
  if (version === 4) {
    const [a,b,c] = ip.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0 && (c === 0 || c === 2)) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }
  if (version === 6) {
    const value = ip.toLowerCase();
    return (
      value === '::1' ||
      value === '::' ||
      value.startsWith('::ffff:') ||
      value.startsWith('fc') ||
      value.startsWith('fd') ||
      value.startsWith('fec') ||
      value.startsWith('fed') ||
      value.startsWith('fee') ||
      value.startsWith('fef') ||
      value.startsWith('fe80:') ||
      value.startsWith('ff')
    );
  }
  return true;
}

function safeWebsiteImportError(error, fallback='Verkkosivun tietojen tuonti epäonnistui.') {
  const message=String(error?.message || '').trim();
  const allowed=new Set([
    'Tarkista verkkosivun osoite ja yritä uudelleen.',
    'Verkkosivua ei voi hakea.',
    'Verkkosivun uudelleenohjaus epäonnistui.',
    'Verkkosivua ei saatu luettua.',
    'Verkkosivun sisältöä ei voitu lukea.',
    'Verkkosivu on liian suuri automaattiseen tuontiin.',
    'Verkkosivulla on liikaa uudelleenohjauksia.',
  ]);
  return allowed.has(message) ? message : fallback;
}

async function assertPublicHttpUrl(value) {
  const normalized = normalizeWebUrl(value, false);
  if (!normalized) throw new Error('Tarkista verkkosivun osoite ja yritä uudelleen.');
  const url = new URL(normalized);
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local')) throw new Error('Verkkosivua ei voi hakea.');
  if (net.isIP(host)) {
    if (isPrivateAddress(host)) throw new Error('Verkkosivua ei voi hakea.');
  } else {
    const addresses = await dns.lookup(host, { all: true });
    if (!addresses.length || addresses.some((x) => isPrivateAddress(x.address))) throw new Error('Verkkosivua ei voi hakea.');
  }
  return url;
}

async function resolvePinnedPublicAddress(url) {
  const host = String(url.hostname || '').toLowerCase();
  if (net.isIP(host)) {
    if (isPrivateAddress(host)) throw new Error('Verkkosivua ei voi hakea.');
    return { address:host, family:net.isIP(host) };
  }
  const addresses = await dns.lookup(host, { all:true, verbatim:true });
  if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new Error('Verkkosivua ei voi hakea.');
  }
  return addresses[0];
}

function pinnedPublicRequest(url, resolved, signal, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http;
    const body = options.body == null ? null : Buffer.from(String(options.body));
    const headers = {
      'Host':url.host,
      'User-Agent':'RESPONDO-AI/2.0',
      ...(options.headers || {}),
    };
    if (body && !Object.keys(headers).some((key) => key.toLowerCase() === 'content-length')) {
      headers['Content-Length'] = String(body.length);
    }
    const request = client.request(url, {
      method:options.method || 'GET',
      signal,
      headers,
      lookup(_hostname, lookupOptions, callback) {
        // Node 24 may request all DNS results when autoSelectFamily is active.
        // In that mode the lookup callback must receive an array of
        // { address, family } objects. Returning the legacy scalar signature
        // makes Node read address.address from a string and fail with
        // ERR_INVALID_IP_ADDRESS / "Invalid IP address: undefined".
        if (lookupOptions && lookupOptions.all) {
          callback(null, [{ address: resolved.address, family: resolved.family }]);
          return;
        }
        callback(null, resolved.address, resolved.family);
      },
      ...(url.protocol === 'https:' ? { servername:url.hostname } : {}),
    }, resolve);
    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
}

async function readPinnedResponse(response, maxBytes = 64_000) {
  const chunks=[]; let total=0;
  for await (const chunk of response) {
    total += chunk.length;
    if (total > maxBytes) {
      response.destroy();
      throw new Error('Ulkoisen palvelun vastaus oli liian suuri.');
    }
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks,total).toString('utf8');
}

async function fetchPublicResource(value, acceptedTypes, maxBytes = 2_000_000) {
  let url = await assertPublicHttpUrl(value);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    for (let redirects = 0; redirects < 4; redirects++) {
      const resolved = await resolvePinnedPublicAddress(url);
      const response = await pinnedPublicRequest(url, resolved, controller.signal, {
        method:'GET',
        headers:{
          'User-Agent':'RESPONDO-Website-Importer/2.0',
          'Accept':'text/html,application/xhtml+xml,application/json,text/plain;q=0.8,*/*;q=0.1',
        },
      });
      const status = Number(response.statusCode || 0);
      if ([301,302,303,307,308].includes(status)) {
        const location = Array.isArray(response.headers.location) ? response.headers.location[0] : response.headers.location;
        response.resume();
        if (!location) throw new Error('Verkkosivun uudelleenohjaus epäonnistui.');
        url = await assertPublicHttpUrl(new URL(location,url).href);
        continue;
      }
      if (status < 200 || status >= 300) {
        response.resume();
        throw new Error('Verkkosivua ei saatu luettua.');
      }
      const type = String(response.headers['content-type'] || '').toLowerCase();
      const declaredLength = Number(response.headers['content-length'] || 0);
      if (!acceptedTypes.some(x=>type.includes(x)) || (declaredLength > 0 && declaredLength > maxBytes)) {
        response.resume();
        throw new Error('Verkkosivun sisältöä ei voitu lukea.');
      }
      const chunks=[]; let total=0;
      for await (const chunk of response) {
        total += chunk.length;
        if (total > maxBytes) {
          response.destroy();
          throw new Error('Verkkosivu on liian suuri automaattiseen tuontiin.');
        }
        chunks.push(Buffer.from(chunk));
      }
      return {text:Buffer.concat(chunks,total).toString('utf8'),finalUrl:url.href};
    }
    throw new Error('Verkkosivulla on liikaa uudelleenohjauksia.');
  } finally { clearTimeout(timer); }
}
async function fetchPublicHtml(value) {
  const result=await fetchPublicResource(value,['text/html','application/xhtml+xml']);
  return {html:result.text,finalUrl:result.finalUrl};
}

function htmlToReadableText(html) {
  return String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|section|article|h1|h2|h3|h4|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}


function extractSameSiteLinks(html, baseUrl) {
  const out = [];
  let base;
  try { base = new URL(baseUrl); } catch { return out; }
  const seen = new Set();
  const re = /href\s*=\s*["']([^"'#]+)["']/gi;
  let match;

  while ((match = re.exec(String(html || '')))) {
    const raw = String(match[1] || '').replace(/&amp;/gi, '&').trim();
    if (!raw || /^(mailto:|tel:|javascript:|data:)/i.test(raw)) continue;

    try {
      const u = new URL(raw, base);
      if (!/^https?:$/.test(u.protocol)) continue;
      if (u.hostname.toLowerCase() !== base.hostname.toLowerCase()) continue;
      u.hash = '';
      if (/\.(pdf|jpg|jpeg|png|gif|svg|webp|zip|docx?|xlsx?)$/i.test(u.pathname)) continue;
      const key = u.origin + u.pathname.replace(/\/$/, '') + u.search;
      if (seen.has(key)) continue;
      seen.add(key);

      const p = normalizeSearchText(u.pathname + ' ' + u.search);
      let score = 0;
      if (/ajanvaraus|booking|book|appointment/.test(p)) score += 12;
      if (/tarjous|quote|request/.test(p)) score += 11;
      if (/hinta|price|pricing/.test(p)) score += 10;
      if (/palvelu|service/.test(p)) score += 9;
      if (/yhteys|contact/.test(p)) score += 8;
      if (/faq|ukk|kysym/.test(p)) score += 7;
      if (/meista|about/.test(p)) score += 4;
      out.push({ url: u.toString(), score });
    } catch {}
  }

  return out
    .sort((a, b) => b.score - a.score)
    .map((x) => x.url);
}

async function fetchPublicText(value, acceptedTypes = ['text/plain']) {
  try { return (await fetchPublicResource(value,acceptedTypes)).text; } catch { return ''; }
}

async function discoverSitemapUrls(baseUrl, limit = 120) {
  const base = new URL(baseUrl);
  const visited = new Set();
  const deadline = Date.now()+12000;
  const candidates = [new URL('/sitemap.xml',base).toString(), new URL('/sitemap_index.xml',base).toString()];
  const robots = await fetchPublicText(new URL('/robots.txt',base).toString(), ['text/plain']);
  for (const match of robots.matchAll(/^\s*Sitemap:\s*(\S+)/gim)) candidates.push(match[1]);
  const found = new Set();
  const sitemapQueue = [...new Set(candidates)].slice(0,8);
  while (sitemapQueue.length && found.size < limit && visited.size < 5 && Date.now()<deadline) {
    const mapUrl = sitemapQueue.shift();
    if (visited.has(mapUrl)) continue;
    visited.add(mapUrl);
    const xml = await fetchPublicText(mapUrl,['xml','text/plain']);
    if (!xml) continue;
    for (const m of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)) {
      const raw = String(m[1]||'').replace(/&amp;/g,'&').trim();
      try {
        const u = new URL(raw,base);
        if (u.hostname.toLowerCase() !== base.hostname.toLowerCase()) continue;
        if (/\.xml(?:$|\?)/i.test(u.pathname)) {
          if (sitemapQueue.length < 20) sitemapQueue.push(u.toString());
          continue;
        }
        if (!/\.(pdf|jpg|jpeg|png|gif|svg|webp|zip|docx?|xlsx?)$/i.test(u.pathname)) found.add(u.toString());
      } catch {}
      if (found.size >= limit) break;
    }
  }
  return [...found];
}

function extractSameSiteScriptUrls(html, baseUrl) {
  const out=[]; const seen=new Set(); let base;
  try { base=new URL(baseUrl); } catch { return out; }
  for(const m of String(html||'').matchAll(/<script[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi)){
    try{
      const u=new URL(String(m[1]||'').replace(/&amp;/gi,'&'),base);
      if(u.hostname.toLowerCase()!==base.hostname.toLowerCase()) continue;
      if(!/\.m?js(?:$|\?)/i.test(u.pathname+u.search)) continue;
      const key=u.toString(); if(seen.has(key)) continue; seen.add(key); out.push(key);
    }catch{}
  }
  return out.slice(0,12);
}

function javascriptToReadableText(source) {
  const values=[]; const seen=new Set();
  // Extract human-facing string literals without executing third-party JavaScript.
  const re=/(["'`])((?:\\.|(?!\1)[\s\S]){3,500}?)\1/g;
  let m;
  while((m=re.exec(String(source||''))) && values.length<2500){
    let value=String(m[2]||'')
      .replace(/\\n/g,' ').replace(/\\t/g,' ').replace(/\\(["'`\\])/g,'$1')
      .replace(/\$\{[^}]{0,180}\}/g,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
    if(value.length<8 || value.length>420) continue;
    if(/^(?:https?:|\/|#|\.|[a-z0-9_-]+\.(?:js|css|png|svg|webp))/.test(value.toLowerCase())) continue;
    if(!/[A-Za-zÀ-ž]/.test(value)) continue;
    // Keep strings likely to be customer-facing copy, especially prices, trial terms and sentences.
    if(!(/[€$£]|\b\d+[,.]?\d*\s*(?:€|eur|%|päiv|day|dag|kk|month|mån|vuosi|year|år)\b/i.test(value) || /[.!?]/.test(value) || value.split(/\s+/).length>=3)) continue;
    const key=normalizeSearchText(value); if(!key||seen.has(key)) continue; seen.add(key); values.push(value);
  }
  return values.join('\n');
}

async function fetchClientRenderedSourceText(html, pageUrl) {
  const docs=[];
  for(const scriptUrl of extractSameSiteScriptUrls(html,pageUrl)){
    const js=await fetchPublicText(scriptUrl,['javascript','text/plain']);
    if(!js) continue;
    const text=javascriptToReadableText(js).slice(0,45000);
    if(text.length>=30) docs.push({url:scriptUrl,text});
  }
  return docs;
}

function detectStoreCurrency(html) {
  const source=String(html||'');
  const code=source.match(/(?:currency|currencyCode|currency_code)[\"']?\s*[:=]\s*[\"']([A-Z]{3})[\"']/i)?.[1];
  if (code) return code.toUpperCase();
  if (/€/.test(source)) return 'EUR';
  if (/£/.test(source)) return 'GBP';
  if (/\$/.test(source)) return 'USD';
  return '';
}
function storeProductDescription(value) {
  return htmlToReadableText(String(value||'')).replace(/\s+/g,' ').trim().slice(0,700);
}
function numericStorePrice(value) {
  const number=Number(String(value??'').replace(',','.').replace(/[^0-9.-]/g,''));
  return Number.isFinite(number) && number>=0 ? number : null;
}
async function fetchPublicJson(value,maxBytes=8_000_000) {
  const result=await fetchPublicResource(value,['application/json','text/json'],maxBytes);
  return JSON.parse(result.text);
}
function cleanCatalogValues(value,limit=30) {
  const out=[];
  const add=(item)=>{
    if(item===null||item===undefined||item==='') return;
    if(Array.isArray(item)){item.forEach(add);return;}
    if(typeof item==='object'){add(item.name??item.value??item.label??item.slug);return;}
    const text=String(item).replace(/\s+/g,' ').trim().slice(0,120);
    if(text && !out.some((x)=>normalizeSearchText(x)===normalizeSearchText(text))) out.push(text);
  };
  add(value);
  return out.slice(0,limit);
}
function normalizeCatalogOptions(value) {
  const out=[];
  for(const option of Array.isArray(value)?value:[]){
    const name=String(option?.name||option?.label||'').replace(/\s+/g,' ').trim().slice(0,80);
    const values=cleanCatalogValues(option?.values??option?.terms??option?.value,30);
    if(!name||!values.length) continue;
    out.push({name,values});
  }
  return out.slice(0,12);
}
function catalogOptionValues(options,matcher) {
  const values=[];
  for(const option of options||[]){
    if(!matcher.test(normalizeSearchText(option?.name||''))) continue;
    for(const item of option.values||[]) if(!values.some((x)=>normalizeSearchText(x)===normalizeSearchText(item))) values.push(item);
  }
  return values.slice(0,30);
}
function normalizeCatalogProduct(product, fallbackUrl='') {
  if (!product?.name) return null;
  const url=normalizeWebUrl(product.url || fallbackUrl,false);
  if (!url) return null;
  const options=normalizeCatalogOptions(product.options);
  const colors=cleanCatalogValues(product.colors?.length?product.colors:catalogOptionValues(options,/vari|color|colour|farg|färg/),30);
  const sizes=cleanCatalogValues(product.sizes?.length?product.sizes:catalogOptionValues(options,/koko|size|storlek|fit/),30);
  const materials=cleanCatalogValues(product.materials?.length?product.materials:catalogOptionValues(options,/materia|material/),20);
  const specs=(Array.isArray(product.specs)?product.specs:[]).map((spec)=>({
    name:String(spec?.name||'').replace(/\s+/g,' ').trim().slice(0,80),
    value:String(spec?.value||'').replace(/\s+/g,' ').trim().slice(0,180),
  })).filter((spec)=>spec.name&&spec.value).slice(0,18);
  return {
    name:String(product.name).replace(/\s+/g,' ').trim().slice(0,180),
    url,
    price:Number.isFinite(product.price)?Number(product.price):null,
    maxPrice:Number.isFinite(product.maxPrice)?Number(product.maxPrice):(Number.isFinite(product.price)?Number(product.price):null),
    currency:String(product.currency||'').trim().toUpperCase().slice(0,8),
    availability:String(product.availability||'').trim().slice(0,60),
    description:String(product.description||'').replace(/\s+/g,' ').trim().slice(0,700),
    category:String(product.category||'').replace(/\s+/g,' ').trim().slice(0,120),
    brand:String(product.brand||'').replace(/\s+/g,' ').trim().slice(0,120),
    sku:String(product.sku||'').replace(/\s+/g,' ').trim().slice(0,120),
    colors,sizes,materials,options,specs,
  };
}
async function fetchShopifyCatalog(firstHtml, baseUrl, limit=10000, deadline=Date.now()+45000) {
  const productLinks=/href\s*=\s*["'][^"']*\/products\//i.test(String(firstHtml||''));
  const shopifyLike=/cdn\.shopify|shopify-section|shopify\.theme|myshopify/i.test(String(firstHtml||'')) || productLinks;
  if (!shopifyLike) return [];
  const base=new URL(baseUrl);
  const currency=detectStoreCurrency(firstHtml);
  const out=[];
  const seen=new Set();

  const addRaw=(raw)=>{
    const variants=Array.isArray(raw?.variants)?raw.variants:[];
    const prices=variants.map((variant)=>numericStorePrice(variant?.price)).filter(Number.isFinite);
    const availability=variants.some((variant)=>variant?.available===true)
      ? 'varastossa'
      : variants.some((variant)=>variant?.available===false) ? 'ei varastossa' : '';
    const optionDefs=(Array.isArray(raw?.options)?raw.options:[]).map((option,index)=>{
      const values=cleanCatalogValues(
        option?.values?.length
          ? option.values
          : variants.map((variant)=>variant?.['option'+(index+1)]).filter(Boolean),
        30,
      );
      return {name:String(option?.name||'').trim(),values};
    }).filter((option)=>option.name&&option.values.length);
    const handle=String(raw?.handle||'').trim();
    const product=normalizeCatalogProduct({
      name:raw?.title,
      url:new URL('/products/'+handle,base).toString(),
      price:prices.length?Math.min(...prices):null,
      maxPrice:prices.length?Math.max(...prices):null,
      currency,
      availability,
      description:storeProductDescription(raw?.body_html),
      category:raw?.product_type,
      brand:raw?.vendor,
      sku:variants.find((variant)=>variant?.sku)?.sku || '',
      options:optionDefs,
      colors:catalogOptionValues(optionDefs,/vari|color|colour|farg|färg/),
      sizes:catalogOptionValues(optionDefs,/koko|size|storlek|fit/),
      materials:catalogOptionValues(optionDefs,/materia|material/),
    });
    if(!product) return;
    const key=normalizeSearchText(handle || product.url || product.name);
    if(!key || seen.has(key)) return;
    seen.add(key);
    out.push(product);
  };

  // Shopify storefronts can expose slightly different product sets/orderings
  // through the root catalog and the public "all" collection. Read both in
  // lockstep and merge by handle so page-based pagination cannot silently omit
  // a published product when the catalog changes between requests.
  const feeds=['/products.json','/collections/all/products.json'];
  const active=new Map(feeds.map((feed)=>[feed,true]));
  for(let page=1;out.length<limit && Date.now()<deadline && [...active.values()].some(Boolean);page++){
    const requests=feeds.map(async(feed)=>{
      if(!active.get(feed)) return {feed,products:null,failed:false};
      try{
        const payload=await fetchPublicJson(
          new URL(feed+'?limit=250&page='+page,base).toString(),
          10_000_000,
        );
        return {feed,products:Array.isArray(payload?.products)?payload.products:[],failed:false};
      }catch{
        return {feed,products:[],failed:true};
      }
    });
    const results=await Promise.all(requests);
    for(const result of results){
      if(!active.get(result.feed)) continue;
      if(result.failed){
        active.set(result.feed,false);
        continue;
      }
      const products=result.products||[];
      for(const raw of products){
        addRaw(raw);
        if(out.length>=limit) break;
      }
      if(products.length<250) active.set(result.feed,false);
    }
  }
  return out.slice(0,limit);
}
async function fetchWooCatalog(firstHtml, baseUrl, limit=10000, deadline=Date.now()+45000) {
  if(!/woocommerce|wc-block|wp-content\/plugins\/woocommerce/i.test(String(firstHtml||''))) return [];
  const base=new URL(baseUrl);
  const out=[];
  for(let page=1;out.length<limit && Date.now()<deadline;page++){
    let products;
    try {
      const payload=await fetchPublicJson(new URL('/wp-json/wc/store/v1/products?per_page=100&page='+page,base).toString(),10_000_000);
      products=Array.isArray(payload)?payload:[];
    } catch {
      if(page===1) return [];
      break;
    }
    if(!products.length) break;
    for(const raw of products){
      const p=raw?.prices||{};
      const minor=Math.pow(10,Number(p.currency_minor_unit||2));
      const low=numericStorePrice(p.price);
      const regular=numericStorePrice(p.regular_price);
      const optionDefs=(Array.isArray(raw?.attributes)?raw.attributes:[]).map((attribute)=>({
        name:String(attribute?.name||attribute?.label||'').trim(),
        values:cleanCatalogValues(attribute?.terms?.length?attribute.terms:attribute?.values,30),
      })).filter((option)=>option.name&&option.values.length);
      const dimensions=raw?.dimensions&&typeof raw.dimensions==='object'?raw.dimensions:{};
      const dimensionUnit=String(dimensions?.unit||'').trim();
      const specs=[];
      const addSpec=(name,value)=>{
        if(value===null||value===undefined||String(value).trim()==='') return;
        specs.push({name,value:String(value).trim()+(dimensionUnit?' '+dimensionUnit:'')});
      };
      addSpec('Pituus',dimensions?.length);
      addSpec('Leveys',dimensions?.width);
      addSpec('Korkeus',dimensions?.height);
      if(raw?.weight) specs.push({name:'Paino',value:String(raw.weight).trim()});
      const product=normalizeCatalogProduct({
        name:raw?.name,
        url:raw?.permalink,
        price:low===null?null:low/minor,
        maxPrice:regular===null?(low===null?null:low/minor):Math.max(low===null?0:low/minor,regular/minor),
        currency:p.currency_code,
        availability:raw?.is_in_stock===true?'varastossa':raw?.is_in_stock===false?'ei varastossa':'',
        description:storeProductDescription(raw?.short_description || raw?.description),
        category:Array.isArray(raw?.categories)?raw.categories.map((item)=>item?.name).filter(Boolean).join(', '):'',
        brand:Array.isArray(raw?.brands)?raw.brands.map((item)=>item?.name).filter(Boolean).join(', '):'',
        sku:raw?.sku,
        options:optionDefs,
        colors:catalogOptionValues(optionDefs,/vari|color|colour|farg|färg/),
        sizes:catalogOptionValues(optionDefs,/koko|size|storlek|fit/),
        materials:catalogOptionValues(optionDefs,/materia|material/),
        specs,
      });
      if(product) out.push(product);
      if(out.length>=limit) break;
    }
    if(products.length<100) break;
  }
  return out;
}
async function fetchStorefrontCatalog(firstHtml, baseUrl, limit=10000, deadline=Date.now()+45000) {
  const shopify=await fetchShopifyCatalog(firstHtml,baseUrl,limit,deadline);
  if(shopify.length) return shopify;
  return fetchWooCatalog(firstHtml,baseUrl,limit,deadline);
}

async function fetchWebsiteBundle(value, maxPages = 10000, timeBudgetMs = 65000, onProgress = null, options = {}) {
  const crawlStartedAt = Date.now();
  const opts = options && typeof options === 'object' ? options : {};
  const storefrontLimit = Number.isFinite(Number(opts.storefrontLimit))
    ? Math.max(0,Math.min(10000,Number(opts.storefrontLimit)))
    : 10000;
  const storefrontBudgetMs = Number.isFinite(Number(opts.storefrontBudgetMs))
    ? Math.max(1000,Math.min(50000,Number(opts.storefrontBudgetMs)))
    : Math.min(50000,Math.max(12000,Math.floor(timeBudgetMs*0.35)));
  const sitemapLimit = Number.isFinite(Number(opts.sitemapLimit))
    ? Math.max(0,Math.min(10000,Number(opts.sitemapLimit)))
    : 10000;
  const first = await fetchPublicHtml(value);
  const base = new URL(first.finalUrl);
  const seedPath=base.pathname.replace(/\/+$/,'') || '/';
  const seedPathNormalized=normalizeSearchText(seedPath);
  const locationFamilyMatch=seedPath.match(/\/(parturit|barbers?|salons?|stores?|locations?|myymalat|myymälät|toimipisteet)\//i);
  const locationFamilySegment=locationFamilyMatch ? String(locationFamilyMatch[1]||'').toLowerCase() : '';
  const locationDetailSeed=Boolean(locationFamilySegment && seedPath.split('/').filter(Boolean).length>=3);
  const pages = [];
  const queued = new Set();
  const queue = [];
  const usefulPath = url => {
    const pathname=new URL(url).pathname;
    const normalized=normalizeSearchText(pathname);
    const normalizedPath=pathname.toLowerCase().replace(/\/+$/,'') || '/';
    // Ignore obvious CMS demo/template/archive routes before they can consume
    // crawl budget or leak sample contacts/products into company knowledge.
    if (/\/(?:home[-_]?\d+|demo(?:[-_][^/]*)?|sample-page|sample|template(?:[-_][^/]*)?|author|feed)(?:\/|$)/i.test(normalizedPath)) return false;
    if (/\/(?:tag|product-tag|product-category|category)\//i.test(normalizedPath)) return false;
    if(locationDetailSeed){
      const candidatePath=pathname.replace(/\/+$/,'') || '/';
      const sameDetail=candidatePath===seedPath || candidatePath.startsWith(seedPath+'/');
      const hasSameFamily=locationFamilySegment && new RegExp('/'+locationFamilySegment+'/','i').test(candidatePath);
      const sharedUseful=/faq|ukk|help|support|hinta|price|pricing|palvel|service|tjanst|yhtey|contact|kontakt|auki|hours|oppet|shipping|delivery|toimit|return|refund|palaut|warranty|takuu|payment|maksu/.test(normalized);
      // A branch/store page may link every sibling branch. Keep the selected
      // location plus shared service/policy pages, but never import sibling
      // location facts into this branch's knowledge.
      if(hasSameFamily && !sameDetail) return false;
      if(!sameDetail && !sharedUseful && normalized!==seedPathNormalized) return false;
    }
    const registryInfo=/rekisteriseloste|privacy-policy|tietosuojaseloste|gdpr/.test(normalized);
    // Root/company imports may use a privacy/registry page only for literal
    // controller contact fields. The knowledge extractor discards the legal
    // prose. A location-specific import must not replace the branch address
    // with the company's registered-office address.
    if (!locationDetailSeed && registryInfo) return true;
    const companyInfo=/about|about-us|meista|meistä|yritys|company|who-we-are|our-story/.test(normalized);
    if (companyInfo) return !/privacy|terms|tietosuoja|kayttoeh|cookie|arvostel|reviews|testimonial|cart|checkout|login|register|wp-admin|\.(?:js|css|mp4|mp3|woff2?)$/i.test(pathname);
    return !/privacy|terms|tietosuoja|kayttoeh|cookie|arvostel|reviews|testimonial|blog|uutis|news|cart|checkout|login|register|wp-admin|\.(?:js|css|mp4|mp3|woff2?)$/i.test(pathname);
  };
  const priority = url => {
    const p=normalizeSearchText(url);
    if (/rekisteriseloste|privacy-policy|tietosuojaseloste|gdpr/.test(p)) return 305;
    // Essentials outrank product detail pages. Product APIs already provide
    // structured catalog data for real ecommerce sites.
    if (/yhtey|contact|kontakt|asiakas(?:palvelu)?|customer[-_ ]?service|kundservice|osoite|address|adress|location|sijainti|myymala|myymälä|auki|hours|oppet/.test(p)) return 300;
    if (/shipping|delivery|toimit|return|refund|palaut|vaihto|warranty|takuu|payment|maksu|faq|ukk|help|support/.test(p)) return 280;
    if (/tarjous|quote|offert|hinta|price|pricing|pris|palvel|service|tjanst|about|meista|yritys|company/.test(p)) return 250;
    if (/\/products?\/|\/tuotteet?\/|product|tuote|shop|kauppa/.test(p)) return 180;
    if (/size-guide|size\b|koko|material|materia|care|hoito|quality|laatu/.test(p)) return 170;
    return 0;
  };

  const enqueue = (html, pageUrl) => {
    for (const link of extractSameSiteLinks(html, pageUrl)) {
      let u;
      try { u = new URL(link); } catch { continue; }
      if (u.hostname.toLowerCase() !== base.hostname.toLowerCase() || !usefulPath(u.href)) continue;
      const key = u.origin + u.pathname.replace(/\/$/, '') + u.search;
      if (queued.has(key) || pages.some((x) => x.key === key)) continue;
      queued.add(key);
      const p = normalizeSearchText(u.pathname + ' ' + u.search);
      let score = priority(u.href);
      if (/faq|ukk|kysym|help|ohje|support|asiakas(?:palvelu)?|customer[-_ ]?service|kundservice/.test(p)) score += 22;
      if (/toimit|delivery|shipping|nouto|pickup|seurant|tracking/.test(p)) score += 20;
      if (/palaut|return|refund|vaihto|exchange/.test(p)) score += 20;
      if (/takuu|warranty|guarantee|reklamaatio/.test(p)) score += 18;
      if (/maksu|payment|checkout-info|klarna|paypal/.test(p)) score += 17;
      if (/kokotauluk|size-guide|sizing|koko|mitat|dimension/.test(p)) score += 17;
      if (/materia|material|laatu|quality|valmist|manufactur|care|hoito|huolto-oh|pesuoh/.test(p)) score += 17;
      if (/myymala|myymälä|store|shop|location|sijainti|showroom|noutopiste/.test(p)) score += 16;
      if (/ajanvaraus|booking|appointment/.test(p)) score += 14;
      if (/tarjous|quote|request/.test(p)) score += 13;
      if (/hinta|price|pricing/.test(p)) score += 12;
      if (/palvelu|service/.test(p)) score += 11;
      if (/yhteys|contact/.test(p)) score += 10;
      if (/meista|about|yritys|company/.test(p)) score += 7;
      queue.push({ url:u.toString(), score });
    }
    queue.sort((a,b) => b.score - a.score);
  };

  queued.add(first.finalUrl);
  pages.push({ url:first.finalUrl, key:first.finalUrl.replace(/\/$/, ''), document:extractBusinessDocument(first.html,first.finalUrl) });
  enqueue(first.html, first.finalUrl);

  // Fetch only a contact page confirmed by an actual link, before a slow
  // product/sitemap crawl can exhaust the page/time budget.
  const contactCandidate=queue.find(item=>
    /\/(?:pages\/)?(?:contact(?:-us)?|contactus|kontakt|kontakta-oss|ota-yhteytta|yhteystiedot|yhteydenotto)(?:\/|[?#]|$)/i.test(item.url)
  );
  const preloadedContact=contactCandidate
    ? fetchPublicHtml(contactCandidate.url).catch(()=>null)
    : Promise.resolve(null);

  let storefrontProducts=[];
  if (storefrontLimit > 0) {
    try {
      storefrontProducts=await fetchStorefrontCatalog(
        first.html,
        first.finalUrl,
        storefrontLimit,
        Date.now()+storefrontBudgetMs,
      );
    } catch (e) {
      console.warn('Storefront catalog discovery skipped',e?.message||e);
    }
  }

  // Sitemaps expose pages that client-rendered navigation may not reveal in raw HTML.
  let sitemapUrls = [];
  if (sitemapLimit > 0) {
    try { sitemapUrls = await discoverSitemapUrls(first.finalUrl, sitemapLimit); } catch (e) { console.warn('Sitemap discovery skipped', e?.message || e); }
  }
  for (const link of sitemapUrls) {
    let u;
    try { u = new URL(link); } catch { continue; }
    if (!usefulPath(u.href)) continue;
    const key = u.origin + u.pathname.replace(/\/$/, '') + u.search;
    if (queued.has(key) || pages.some((x) => x.key === key)) continue;
    queued.add(key);
    const p = normalizeSearchText(u.pathname + ' ' + u.search);
    let score = 4 + priority(u.href);
    if (/faq|ukk|kysym|help|ohje|support|asiakas(?:palvelu)?|customer[-_ ]?service|kundservice/.test(p)) score += 22;
    if (/toimit|delivery|shipping|nouto|pickup|seurant|tracking|palaut|return|refund|vaihto|exchange/.test(p)) score += 20;
    if (/takuu|warranty|maksu|payment|kokotauluk|size-guide|sizing|koko|mitat|dimension|materia|material|laatu|quality|care|hoito/.test(p)) score += 18;
    if (/myymala|myymälä|store|shop|location|sijainti|showroom|noutopiste/.test(p)) score += 16;
    if (/hinta|price|pricing|palvelu|service|yhteys|contact/.test(p)) score += 12;
    queue.push({url:u.toString(),score});
  }
  queue.sort((a,b)=>b.score-a.score);
  if (storefrontProducts.length) {
    const catalogUrls=new Set(storefrontProducts.map((product)=>{
      try { const u=new URL(product.url); return u.origin+u.pathname.replace(/\/$/,'')+u.search; } catch { return ''; }
    }).filter(Boolean));
    // Catalog APIs already give us names, prices and variants, so crawling every
    // product page would waste the crawl budget. Keep a small representative
    // sample, though: many stores put shipping, returns and warranty rules only
    // inside product-page accordions.
    const representativeProductUrls=new Set([...catalogUrls].slice(0,4));
    const kept=queue.filter((item)=>{
      try {
        const u=new URL(item.url);
        const key=u.origin+u.pathname.replace(/\/$/,'')+u.search;
        return !catalogUrls.has(key) || representativeProductUrls.has(key);
      } catch { return true; }
    });
    queue.splice(0,queue.length,...kept);
    queue.sort((a,b)=>b.score-a.score);
  }
  const contactPage=await preloadedContact;
  if(contactPage && pages.length<maxPages) {
    try {
      const parsed=new URL(contactPage.finalUrl);
      const key=parsed.origin+parsed.pathname.replace(/\/$/,'')+parsed.search;
      if(parsed.hostname.toLowerCase()===base.hostname.toLowerCase() && !pages.some(page=>page.key===key)){
        pages.push({url:contactPage.finalUrl,key,document:extractBusinessDocument(contactPage.html,contactPage.finalUrl)});
        enqueue(contactPage.html,contactPage.finalUrl);
      }
    } catch {}
  }

  const totalTarget = Math.max(1, Math.min(maxPages, pages.length + queue.length));
  if (onProgress) onProgress({scanned:pages.length,total:totalTarget});

  while (queue.length && pages.length < maxPages) {
    if (Date.now() - crawlStartedAt > timeBudgetMs) break;
    const next = queue.shift();
    if (!next || pages.some((x) => x.url === next.url)) continue;
    try {
      const page = await fetchPublicHtml(next.url);
      const resolved = new URL(page.finalUrl);
      if (resolved.hostname.toLowerCase() !== base.hostname.toLowerCase()) continue;
      const key = resolved.origin + resolved.pathname.replace(/\/$/, '') + resolved.search;
      if (pages.some((x) => x.key === key)) continue;
      pages.push({ url:page.finalUrl, key, document:extractBusinessDocument(page.html,page.finalUrl) });
      enqueue(page.html, page.finalUrl);
      if (onProgress) onProgress({scanned:pages.length,total:Math.max(totalTarget,Math.min(maxPages,pages.length+queue.length))});
    } catch {}
  }

  const pageDocuments = pages.map((page) => ({
    url:page.url,
    ...page.document,
  })).filter((page) => page.text.length > 0 || page.links.length > 0);

  // SPA/client-rendered sites often keep their visible copy in same-origin JS bundles.
  // Read strings from those bundles without executing them so prices, trial terms and
  // other customer-facing facts are available to the importer.
  // Do not ingest JavaScript bundle literals as business facts. They contain UI copy,
  // translations and source-code fragments and are not trustworthy customer knowledge.

  const text = pageDocuments
    .map((page) => 'SIVU: ' + page.url + '\n' + page.text)
    .join('\n\n---\n\n')
    .slice(0, 900000);

  return {
    finalUrl:first.finalUrl,
    text,
    products:storefrontProducts,
    pageDocuments,
    pages:pageDocuments.map((x) => x.url),
    links:[...new Set(pageDocuments.flatMap(doc => doc.links.map(link => link.url)))].slice(0, 10000),
  };
}

function importedKnowledgeJunk(value) {
  const raw = cleanKnowledgeText(value);
  const text = normalizeSearchText(raw);
  if (!text) return true;
  // Never let navigation, widgets, product-card chrome or source-code fragments
  // become customer knowledge. These strings are common on retailer/CMS pages.
  if (/(cookie|evasteaset|privacy policy|tietosuojaseloste|terms of service|kayttoehdot|copyright|kaikki oikeudet pidatetaan|hyvaksy evaste|all rights reserved|localstorage|sessionstorage|queryselector|addeventlistener|json stringify|json parse|supported includes)/.test(text)) return true;
  if (/(skip to content|toggle nav|toggle navigation|ved[aä] liukus[aä][aä]dint[aä]|n[aä]hd[aä]ksesi muutos|katso video ty[oö]n etenemisest[aä]|arvostelut?\s*\(\s*\)|lis[aä][aä] ostoskoriin|add to cart|tuotenumero\s*[:#]?|product code\s*[:#]?|sku\s*[:#]?|varaa aika\s+ota yhteytt[aä]|helppo ja nopea palvelu\s+varaa aika|more to (?:enjoy|get|unlock|qualify for) free shipping|away from free shipping|unlock free shipping|(?:spend|add).{0,40}more.{0,40}free shipping)/i.test(raw)) return true;
  if (/^(?:regular price|unit price|select option|choose option|product description|product description shipping (?:&|and) return)$/i.test(raw)) return true;
  if (/(?:simple checkout|secure payment options?|save favorites?|track your orders)/i.test(raw)) return true;
  if (/(const |let |var |function |document |window |=>|webpack|sourceMappingURL)/i.test(raw)) return true;
  // A long run of menu/category labels without sentence punctuation is not a fact.
  const words = text.split(' ').filter(Boolean);
  if (words.length >= 12 && !/[.!?]/.test(raw) && /(?:tuotteet|myymalat|myymälät|kampanja|nav|menu|kategori|category)/i.test(raw)) return true;
  return false;
}

function importedKnowledgeQuality(item) {
  const title = String(item?.title || '').trim();
  const answer = String(item?.answer || '').replace(/\s+/g,' ').trim();
  if (!title || !answer || importedKnowledgeJunk(title + ' ' + answer)) return -1000;
  let score = 0;
  const topic = knowledgeTopic(String(item?.category || '') + ' ' + title + ' ' + answer.slice(0,500));
  if (topic) score += 25;
  if (/[€$£]|\b\d+[,.]?\d*\s*(?:eur|%|paiv|day|dag|kk|month|vuosi|year)\b/i.test(answer)) score += 7;
  if (answer.length >= 70 && answer.length <= 700) score += 8;
  if (title.length >= 12 && title.length <= 100) score += 4;
  if (/^(?:respondo ai|etusivu|home|homepage)(?:\s*[-|–—:]|$)/i.test(title)) score -= 35;
  if (/^(?:respondo ai|etusivu|home|homepage)(?:\s*[-|–—:]|$)/i.test(answer)) score -= 25;
  if (/^(?:menu|navigation|skip to|kirjaudu|login|sign in|rekisteroidy|register)\b/i.test(answer)) score -= 25;
  return score;
}

function websiteKnowledgeCandidates(bundle) {
  return essentialWebsiteCandidates(bundle);
}

function buildProfileKnowledge(profile = {}) {
  const rows = [];
  const add = (title, answer, keywords = [], meta = {}) => {
    const value = String(answer || '').trim();
    if (value) rows.push({
      id: 'demo-' + rows.length,
      category: String(meta.category || 'Yrityksen perustiedot').slice(0,80),
      title,
      answer: value,
      keywords: Array.isArray(keywords) ? keywords.slice(0,32) : [],
      source_type: String(meta.sourceType || 'profile').slice(0,40),
      source_url: normalizeWebUrl(meta.sourceUrl,false) || null,
    });
  };
  add('Hinnat', profile.pricing, ['hinta','maksaa','hinnoittelu']);
  add('Aukioloajat', profile.hours, ['auki','aukiolo','lauantai','sunnuntai']);
  add('Puhelinnumero', profile.phone, ['puhelin','numero','soittaa']);
  add('Sähköposti', profile.email, ['sähköposti','email']);
  add('Palvelut', Array.isArray(profile.services) ? profile.services.join(', ') : profile.services, ['palvelut','teette','tarjoatte']);
  add('Toimitus ja seuranta', profile.delivery, ['toimitus','seuranta','seurantakoodi','shipping','delivery','tracking']);
  add('Palautukset ja vaihdot', profile.returns, ['palautus','vaihto','hyvitys','return','refund','exchange']);
  add('Takuu', profile.warranty, ['takuu','reklamaatio','warranty','guarantee']);
  add('Maksaminen', profile.payment, ['maksutapa','maksaminen','klarna','paypal','mobilepay','payment']);
  add('Toimialue', profile.serviceArea, ['toimialue','alue','paikkakunta']);
  add('Osoite', profile.address, ['osoite','sijainti']);
  add('Verkkosivu', profile.website, ['verkkosivu','www']);
  add('Tarjouspyyntölomake', profile.quoteRequestUrl, ['tarjous','tarjouspyyntö']);
  add('Yhteydenottolomake', profile.contactUrl, ['yhteystiedot','yhteydenotto','contact','kontakt']);
  add('Ajanvarauslinkki', profile.bookingUrl, ['ajanvaraus','varaa','aika','booking']);
  add('Lisätiedot', profile.notes, ['lisätieto','päivystys','maksutapa','takuu','ajanvaraus']);
  add('Vastaustyyli', profile.tone, ['tyyli']);
  for (const fact of Array.isArray(profile.customFacts) ? profile.customFacts.slice(0, 2000) : []) {
    const title=String(fact?.key || fact?.title || '').slice(0,180);
    const answer=String(fact?.answer || '').slice(0,1600);
    const factKeywords=Array.isArray(fact?.keywords)
      ? fact.keywords.map((x)=>String(x||'').trim()).filter(Boolean).slice(0,32)
      : searchTokens(title+' '+answer).slice(0,24);
    add(title,answer,factKeywords,{
      category:String(fact?.category || 'Yrityksen perustiedot').slice(0,80),
      sourceType:fact?.sourceType || fact?.source_type || 'demo_import',
      sourceUrl:fact?.sourceUrl || fact?.source_url || '',
    });
  }
  return rows;
}

const freeTranslationCache = new Map();

async function translateTextFree(text, lang, sourceLang = 'auto') {
  const target = ['fi','sv','en'].includes(String(lang || '').toLowerCase()) ? String(lang).toLowerCase() : 'fi';
  const source = ['fi','sv','en','auto'].includes(String(sourceLang || '').toLowerCase()) ? String(sourceLang).toLowerCase() : 'auto';
  const input = String(text || '').trim();
  if (!input) return '';
  if (source === target) return input;

  const key = source + '>' + target + ':' + input;
  if (freeTranslationCache.has(key)) return freeTranslationCache.get(key);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5500);
  try {
    const url = new URL('https://translate.googleapis.com/translate_a/single');
    url.search = new URLSearchParams({
      client: 'gtx',
      sl: source,
      tl: target,
      dt: 't',
      q: input.slice(0, 5000),
    }).toString();

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const payload = await response.json();
    const translated = Array.isArray(payload?.[0])
      ? payload[0].map((part) => Array.isArray(part) ? String(part[0] || '') : '').join('').trim()
      : '';
    if (!translated) throw new Error('Empty translation');

    freeTranslationCache.set(key, translated);
    if (freeTranslationCache.size > 2500) {
      [...freeTranslationCache.keys()].slice(0, 500).forEach((cacheKey) => freeTranslationCache.delete(cacheKey));
    }
    return translated;
  } catch (e) {
    console.warn('Free translation failed', target, e?.message || e);
    return '';
  } finally {
    clearTimeout(timer);
  }
}

async function forceAnswerLanguage(answer, lang) {
  const target = ['fi','sv','en'].includes(String(lang || '').toLowerCase()) ? String(lang).toLowerCase() : 'fi';
  const text = String(answer || '').trim();
  if (!text) return text;
  // Never send URLs through machine translation. Translators can turn URL path
  // segments such as /contact-us into translated prose and break the link.
  const urls = [];
  const protectedText = text.replace(/https?:\/\/[^\s<>"']+/gi, (url) => {
    const token = 'RESPONDOURLTOKEN' + urls.length + 'X';
    urls.push(url);
    return token;
  });
  return translateTextFree(protectedText, target, 'auto').then((translated) => {
    if (!translated) return translated;
    return translated.replace(/RESPONDOURLTOKEN(\d+)X/gi, (_, index) => urls[Number(index)] || '');
  });
}

function specificServiceConfirmation(query, rows) {
  const q = normalizeSearchText(query);
  const m = q.match(/^(teetteko|pesetteko|leikkaatteko|maalaatteko|raivaatteko|puhdistatteko|huollatteko|asennatteko|korjaatteko|vietteko)\s+(.+)$/);
  if (!m) return '';
  const verbs = {teetteko:['teemme',''],pesetteko:['pesemme','pes'],leikkaatteko:['leikkaamme','leikka'],maalaatteko:['maalaamme','maal'],raivaatteko:['raivaamme','raiva'],puhdistatteko:['puhdistamme','puhdist'],huollatteko:['huollamme','huol'],asennatteko:['asennamme','asenn'],korjaatteko:['korjaamme','korja'],vietteko:['viemme','poisvienti|kuljet|viemme']};
  const [verb, action] = verbs[m[1]];
  const tokens = m[2].split(' ').filter(x => !['myos','ja','seka','pois','te','teilla'].includes(x));
  if (!tokens.length || tokens.some(x => /ilmai|tanaan|huomen|heti|tunnissa|viikonlopp|yo|aina|kaikki|koko/.test(x) || /\d/.test(x))) return '';
  const stem = token => token.replace(/(?:uja|yja|oja|eja|ia|ja|jen|ssa|sta|lla|lle|ksi|tta|t|n)$/,'');
  const stems = tokens.map(stem);
  if (stems.some(x => x.length < 4)) return '';
  const support = rows.filter(usableWebsiteRow).find(row => {
    const text = normalizeSearchText(row.answer);
    if (/\b(?:ei|emme|eivat|not|don't|inte|aldrig)\b/.test(text)) return false;
    const topic=knowledgeTopic(row.category+' '+row.title);
    if (!['services','pricing'].includes(topic)) return false;
    // A published service price is affirmative evidence that the service is
    // offered, even when the site exposes no separate service-description row.
    return stems.every(x => text.includes(x)) && (!action || new RegExp(action).test(text));
  });
  if (!support) return '';
  const phrase = String(query).trim().replace(/^\S+\s+/,'').replace(/[?!.]+$/,'').toLowerCase();
  return 'Kyllä, '+verb+' '+phrase+'.';
}


// Short Finnish service follow-ups must be answered from service-specific evidence,
// not by concatenating the previous question with an unrelated imported paragraph.
function finnishServiceStem(word) {
  return normalizeSearchText(word).replace(/[^a-z]/g,'')
    .replace(/(?:oista|eista|uista|yista|oissa|eissa|uissa|yissa|ojen|oita|eita|uita|yita|eja|oja|uja|yja|ien|jen|ita|ista|issa|illa|ille|ssa|sta|lla|lle|ksi|ja|it|n|t)$/,'');
}


function finnishServiceActionKind(value) {
  const t=normalizeSearchText(value);
  if (/oljy/.test(t)) return 'oil';
  if (/puhdist|pesu|pese|pesem|pesta|siivou|ikkunanpes|kattopes/.test(t)) return 'clean';
  if (/asenn/.test(t)) return 'install';
  if (/maala|maalaus|maalat/.test(t)) return 'paint';
  if (/korj/.test(t)) return 'repair';
  if (/huol/.test(t)) return 'maintain';
  if (/raiva|leikka/.test(t)) return 'clear';
  if (/poisvien|kuljet|nout|kierrat/.test(t)) return 'transport';
  if (/muutto|muuttopalvel/.test(t)) return 'move';
  return '';
}

function finnishServiceSubjectRoot(word) {
  const w=normalizeSearchText(word).replace(/[^a-z]/g,'');
  if (!w) return '';
  // Finnish hair inflections vary strongly (hiuksia, hiusten, hiukset).
  // Collapse them to one subject root so "Leikkaatteko hiuksia?" matches
  // imported labels such as "Hiustenleikkaukset".
  if (/^hiu/.test(w)) return 'hius';
  if (/^ikkun/.test(w)) return 'ikkun';
  if (/^peltikat/.test(w)) return 'peltikatt';
  if (/^tiilikat/.test(w)) return 'tiilikatt';
  if (/^huopakat/.test(w)) return 'huopakatt';
  if (/^bitumikat/.test(w)) return 'bitumikatt';
  if (/^(?:katto|katon|kattoj|kato)/.test(w)) return 'katt';
  if (/^rann/.test(w)) return 'rann';
  if (/^terass/.test(w)) return 'terass';
  const compound=w.match(/^(.{4,}?)(?:n)?(?:pesu|pesut|puhdistus|puhdistukset|huolto|huollot|maalaus|maalaukset|asennus|asennukset|korjaus|korjaukset)$/);
  if (compound) return finnishServiceStem(compound[1]);
  return finnishServiceStem(w);
}

function finnishServiceSubjectRoots(value) {
  const ignored=/^(?:te|teilla|teilta|meilta|meilla|myos|myös|palvelu|palvelua|palvelun|palvelut|onnistuuko|onnistuisko|pystytteko|voitteko|voisitteko|olisiko|olisko|mahdollista|onko|loytyyko|saako|saanko|haluaisin|haluan|tilata|tarvitsen|tarviin|tarvitsisin|etta|että|ja|seka|sekä|vai)$/;
  const roots=[];
  for (const token of normalizeSearchText(value).split(/\s+/).filter(Boolean)) {
    if (ignored.test(token)) continue;
    // Preserve the subject embedded in compounds such as "ikkunanpesu".
    if (/^ikkun|^peltikat|^tiilikat|^huopakat|^bitumikat|^katto|^katon|^rann|^terass/.test(token)) {
      const root=finnishServiceSubjectRoot(token);
      if (root && !roots.includes(root)) roots.push(root);
      continue;
    }
    if (finnishServiceActionKind(token)) continue;
    const root=finnishServiceSubjectRoot(token);
    if (root.length>=4 && !roots.includes(root)) roots.push(root);
  }
  return roots;
}

function serviceActionMatches(text, kind) {
  const t=normalizeSearchText(text);
  if (!kind) return true;
  if (kind==='clean') return /puhdist|pesu|pese|pesem|pesta|siivou|ikkunanpes|kattopes/.test(t);
  if (kind==='oil') return /oljy/.test(t);
  if (kind==='install') return /asenn/.test(t);
  if (kind==='paint') return /maala|maalaus|maalat/.test(t);
  if (kind==='repair') return /korj/.test(t);
  if (kind==='maintain') return /huol/.test(t);
  if (kind==='clear') return /raiva|leikka/.test(t);
  if (kind==='transport') return /poisvien|kuljet|nout|kierrat/.test(t);
  if (kind==='move') return /muutto|muuttopalvel/.test(t);
  return false;
}

function serviceRootMatches(root, evidenceRoot) {
  if (!root || !evidenceRoot) return false;
  if (root==='katt') return ['katt','peltikatt','tiilikatt','huopakatt','bitumikatt'].includes(evidenceRoot);
  return root===evidenceRoot || (root.length>=5 && evidenceRoot.startsWith(root)) || (evidenceRoot.length>=5 && root.startsWith(evidenceRoot));
}

function serviceRowSupportsPhrase(row, phrase, actionKind = '') {
  if (!usableWebsiteRow(row)) return false;
  const meta=normalizeSearchText(String(row.category||'')+' '+String(row.title||''));
  if (knowledgeTopic(meta)!=='services' || /arvost|review|testimonial|asiakaskokem/.test(meta)) return false;
  if (importedKnowledgeJunk(String(row.title||'')+' '+String(row.answer||''))) return false;
  const roots=finnishServiceSubjectRoots(phrase);
  if (!roots.length) return false;

  const title=String(row.title||'');
  const titleChrome=/\|/.test(title) && /(?:yhteystiedot|contact|etusivu|home|palvelut|services)/i.test(title);
  const sources=[
    ...(titleChrome?[]:[title]),
    ...String(row.answer||'').split(/[.!?;]+/)
  ].filter(Boolean);

  return sources.some(source=>{
    const t=normalizeSearchText(source);
    if (!t || /\b(?:emme|ei|eivat|not|inte|aldrig)\b/.test(t)) return false;
    if (actionKind && !serviceActionMatches(t,actionKind)) return false;
    const evidence=t.split(/[\s-]+/).map(finnishServiceSubjectRoot).filter(Boolean);
    return roots.every(root=>evidence.some(e=>serviceRootMatches(root,e)));
  });
}

function naturalFinnishServiceQuestion(message, rows) {
  const q=normalizeSearchText(message);
  const cue=/^(?:onnistuuko|onnistuisko|pystytteko|voitteko|voisitteko|olisiko mahdollista|olisko mahdollista|onko teilla|loytyyko teilta|saako teilta|saanko teilta|tarjoatteko|hoidatteko|haluaisin tilata|haluan tilata|tarvitsen|tarviin|tarvitsisin)\b/;
  if (!cue.test(q)) return null;
  // Price, timing and discount claims need their own exact evidence.
  if (/\b(?:hinta|maksaa|paljonko|ilmain|alenn|tanaan|huomenna|ensi viik|viikonlopp|lauantaina|sunnuntaina)\b|\d/.test(q)) return null;

  const phrase=q.replace(cue,'').replace(/^(?:te|teilla|teilta|meilta|meilla)\s+/,'').trim();
  if (!phrase || /\b(?:ja|seka)\b|[,;&]/.test(phrase)) return null;
  const action=finnishServiceActionKind(phrase);
  const approved=(rows||[]).filter(row=>serviceRowSupportsPhrase(row,phrase,action));
  const found=approved[0];
  if (!found) return {supported:false};

  const requestedRoots=finnishServiceSubjectRoots(phrase);
  let answer='Kyllä, se onnistuu.';
  if (requestedRoots.includes('katt')) {
    const title=normalizeSearchText(found.title||'');
    const subtype=/^peltikat/.test(title)?'peltikattojen':
      /^tiilikat/.test(title)?'tiilikattojen':
      /^huopakat/.test(title)?'huopakattojen':
      /^bitumikat/.test(title)?'bitumikattojen':'';
    if (subtype) {
      const actionText=action==='clean'?'pesu':action==='oil'?'öljyäminen':action==='paint'?'maalaus':action==='repair'?'korjaus':action==='maintain'?'huolto':'palvelu';
      answer='Kyllä, '+subtype+' '+actionText+' onnistuu.';
    }
  }
  return {supported:true,answer,evidence:[found]};
}

function groundedFinnishServiceReply(message, history, rows) {
  const q=normalizeSearchText(message);
  const direct=q.match(/^(teetteko|pesetteko|puhdistatteko|huollatteko|asennatteko|maalaatteko|korjaatteko|raivaatteko|vietteko)\s+([a-z-]+)$/);
  const follow=q.match(/^(?:enta|mites|ja)\s+([a-z-]+(?:\s+[a-z-]+){0,3})$/);
  const order=q.match(/^(?:voiko\s+teilta\s+tilata|voinko\s+tilata\s+teilta|voinko\s+teilta\s+tilata|voiko\s+tilata\s+teilta|voiko\s+tilata|voinko\s+tilata|saako\s+teilta|saanko\s+teilta)\s+([a-z]+(?:\s+[a-z]+){0,3})$/);
  // Accept common Finnish inflections and a doubled vowel typo. Check oiling
  // as a standalone service: a before/after marketing sentence is not proof
  // that the business actually offers the oiling work.
  const oil=q.match(/^oljya{1,2}tteko\s+([a-z-]+)$/);
  if (!direct && !follow && !order && !oil) return null;
  // Never interpret pricing, opening-hours, contact or other topic changes
  // as service confirmations. A service-word follow-up is allowed only when
  // the preceding conversation is also about a service.
  const messageTopic=queryTopic(message);
  if (messageTopic && messageTopic!=='services' && !direct && !order) return null;
  if (follow && history.length) {
    const previousQuestion=[...history].reverse()
      .map(event=>String(event?.question||event?.user||'').trim())
      .find(Boolean);
    const previousTopic=previousQuestion ? conversationTopic(previousQuestion) : '';
    if (previousTopic && previousTopic!=='services') return null;
  }

  // A follow-up can already contain the service action itself, e.g.
  // "Entä ikkunoidenpesun?" after another order question. Resolve that phrase
  // as a standalone order instead of requiring the previous message to start
  // with "pesettekö/teettekö". This also covers spaced forms such as
  // "Entä ikkunoiden pesun?".
  if (follow) {
    const explicitService=follow[1].trim();
    if (/(?:puhdist|pesu|pese|pesem|ikkunanpes|ikkunapes|oljy|asenn|maal|korj|huol|raiva|poisvien|kuljet|nout)/.test(explicitService)) {
      const resolved=groundedFinnishServiceReply('voinko tilata '+explicitService, [], rows);
      return resolved?.supported ? resolved : {supported:false};
    }
  }

  const approved=rows.filter(row=>{
    if (!usableWebsiteRow(row)) return false;
    const meta=normalizeSearchText(String(row.category||'')+' '+String(row.title||''));
    if (/arvost|review|testimonial|asiakaskokem/.test(meta)) return false;
    if (importedKnowledgeJunk(String(row.title||'')+' '+String(row.answer||''))) return false;
    return knowledgeTopic(String(row.category||'')+' '+String(row.title||''))==='services';
  });

  if (oil) {
    const requested=oil[1].trim();
    const subjectRoot=finnishServiceStem(requested).slice(0,6);
    if (subjectRoot.length<4 || /^(?:tanaan|huomen|ilmais|aina|kaikk)/.test(requested)) return {supported:false};
    const matchesSubject=text=>normalizeSearchText(text).split(/[\s-]+/)
      .map(word=>finnishServiceStem(word).slice(0,6))
      .includes(subjectRoot);
    const affirmative=/(?:^|[.!?]\s*)(?:oljya?mme|tarjoamme|teemme)\b/;
    const supported=approved.find(row=>{
      const title=normalizeSearchText(row.title||'');
      const answer=normalizeSearchText(row.answer||'');
      // Explicit exclusions override even an otherwise plausible heading.
      if (/\b(?:emme|ei|eivat|not|inte|aldrig)\b/.test(answer)) return false;
      if (matchesSubject(title) && /oljy/.test(title)) return true;
      // The answer itself may explicitly offer the service, even if the
      // owner stored it under the generic heading "Palvelut".
      return String(row.answer||'').split(/[.!?]+/).some(sentence=>{
        const clause=normalizeSearchText(sentence);
        return matchesSubject(clause) && /oljy/.test(clause) &&
          affirmative.test(clause);
      });
    });
    if (!supported) return {supported:false};
    return {
      supported:true,
      answer:'Kyllä, öljyämme '+requested+'.',
      evidence:[supported]
    };
  }

  if (order) {
    const subject=order[1].trim();
    // Multi-service orders are handled by combinedFinnishServiceRequest.
    // Never collapse "A ja B" into one loose single-service match here.
    if (/\b(?:ja|seka)\b|[,;&]/.test(subject)) return null;

    const actionKind=/puhdist/.test(subject)?'clean':
      /(?:pesu|pese|pesem|ikkunanpes|ikkunapes)/.test(subject)?'clean':
      /oljy/.test(subject)?'oil':
      /asenn/.test(subject)?'install':
      /maal/.test(subject)?'paint':
      /korj/.test(subject)?'repair':
      /huol/.test(subject)?'maintain':
      /raiva/.test(subject)?'clear':
      /poisvien|kuljet|nout/.test(subject)?'transport':'';

    const subjectRoots=searchTokens(subject).map(word=>{
      const w=normalizeSearchText(word);
      if (/^ikkun/.test(w)) return 'ikkun';
      if (/^peltikat/.test(w)) return 'peltikatt';
      if (/^tiilikat/.test(w)) return 'tiilikatt';
      if (/^rann/.test(w)) return 'rann';
      if (/^terass/.test(w)) return 'terass';
      if (/^(?:pes|puhdist|oljy|asenn|maal|korj|huol|raiva|poisvien|kuljet|nout)/.test(w)) return '';
      return finnishServiceStem(w);
    }).filter(root=>root.length>=4);

    const actionMatches=text=>{
      const t=normalizeSearchText(text);
      if(!actionKind) return true;
      if(actionKind==='clean') return /puhdist|pesu|pese|pesem|ikkunanpes|ikkunapes/.test(t);
      if(actionKind==='oil') return /oljy/.test(t);
      if(actionKind==='install') return /asenn/.test(t);
      if(actionKind==='paint') return /maal/.test(t);
      if(actionKind==='repair') return /korj/.test(t);
      if(actionKind==='maintain') return /huol/.test(t);
      if(actionKind==='clear') return /raiva/.test(t);
      return /poisvien|kuljet|nout/.test(t);
    };
    const subjectMatches=text=>{
      const words=normalizeSearchText(text).split(/[\s-]+/).filter(Boolean).map(word=>{
        if(/^ikkun/.test(word)) return 'ikkun';
        if(/^peltikat/.test(word)) return 'peltikatt';
        if(/^tiilikat/.test(word)) return 'tiilikatt';
        if(/^rann/.test(word)) return 'rann';
        if(/^terass/.test(word)) return 'terass';
        return finnishServiceStem(word);
      });
      return subjectRoots.length ? subjectRoots.every(root=>words.includes(root)) : false;
    };

    const found=subjectRoots.length && approved.find(row=>{
      const title=String(row.title||'');
      const answer=String(row.answer||'');
      const normalizedAnswer=normalizeSearchText(answer);
      if(/\b(?:emme|ei|eivat|not|inte|aldrig)\b/.test(normalizedAnswer)) return false;

      // A browser/page title such as "Company | Ikkunanpesu | Palvelut |
      // Yhteystiedot" is navigation metadata, not proof that the service
      // can actually be ordered.
      const chromeLike=/\|/.test(title) &&
        /(?:yhteystiedot|contact|etusivu|home|palvelut|services)/i.test(title);
      if(chromeLike) return false;

      if(subjectMatches(title) && actionMatches(title)) return true;
      return answer.split(/[.!?;]+/).some(clause=>
        subjectMatches(clause) && actionMatches(clause) &&
        !importedKnowledgeJunk(clause)
      );
    });
    if (!found) return {supported:false};

    const requested=String(message).trim()
      .replace(/^(?:voiko\s+teilt[aä]\s+tilata|voinko\s+tilata\s+teilt[aä]|voinko\s+teilt[aä]\s+tilata|voiko\s+tilata\s+teilt[aä]|voiko\s+tilata|voinko\s+tilata|saako\s+teilt[aä]|saanko\s+teilt[aä])\s+/i,'')
      .replace(/[?!.]+$/,'').toLowerCase();
    return {supported:true,answer:'Kyllä, voit tilata meiltä '+requested+'.',evidence:[found]};
  }

  let verb=direct?.[1] || '';
  let inheritedActionKind='';
  if (follow) {
    // Carry meaning, not just an exact previous verb. This lets normal chains
    // such as "Voinko tilata katon pesun?" -> "Entä ikkunat?" work.
    for (const event of history.slice(-5).reverse()) {
      const previous=normalizeSearchText(event.question||event.user||'');
      const match=previous.match(/^(teetteko|pesetteko|puhdistatteko|huollatteko|asennatteko|maalaatteko|korjaatteko|raivaatteko|vietteko)\b/);
      if (match) {verb=match[1];break;}
      const action=finnishServiceActionKind(previous);
      const looksLikeService=/^(?:voiko|voinko|saako|saanko|onnistuuko|onnistuisko|pystytteko|voitteko|voisitteko|onko teilla|loytyyko teilta|haluaisin|haluan|tarvitsen|tarviin|enta|entas|mites|ja)\b/.test(previous);
      if (action && looksLikeService) {inheritedActionKind=action;break;}
      if (!/^(?:enta|entas|mites|ja)\s+.+$/.test(previous)) break;
    }
    if (!verb && !inheritedActionKind) return {supported:false};
  }

  const noun=direct?.[2]||follow?.[1];
  const nounRoots=finnishServiceSubjectRoots(noun);
  if (!nounRoots.length || /^(?:hinta|hinnat|ilmainen|huomenna|tanaan|lauantai|sunnuntai)$/.test(normalizeSearchText(noun))) return {supported:false};

  const candidates=[];
  for (const row of approved) {
    // Check the same service clause, not an unrelated action elsewhere in
    // the company's description (e.g. "install gutters and wash roofs").
    const clauses=String(row.answer||'').split(/(?<=[.!?;])\s+|\s+(?:sekä|ja)\s+|[&;]/i);
    for (const clause of clauses) {
      const text=normalizeSearchText(clause);
      if (/\b(?:ei|emme|eivat|not|inte|aldrig)\b/.test(text)) continue;
      const words=text.split(/[\s-]+/).filter(Boolean);
      const evidenceRoots=words.map(finnishServiceSubjectRoot).filter(Boolean);
      let qualifiedNoun='';
      const nounFound=nounRoots.every(root=>evidenceRoots.some(e=>serviceRootMatches(root,e)));
      if (!nounFound) continue;
      if (nounRoots.includes('katt')) {
        const roofWord=words.find(word=>/^(?:pelti|tiili|huopa|bitumi)katto(?:ja|jen)?$/.test(word));
        if (roofWord) qualifiedNoun=roofWord.replace(/kattojen$/,'kattoja');
      }
      const cleaning= serviceActionMatches(text,'clean');
      const transport=serviceActionMatches(text,'transport');
      const type=/puhdist/.test(text)?'puhdistamme':
        /pesu|pese|pesem|pesta/.test(text)?'pesemme':
        /siivou/.test(text)?'siivoamme':
        /oljy/.test(text)?'öljyämme':
        /asenn/.test(text)?'asennamme':
        /maal/.test(text)?'maalaamme':
        /korj/.test(text)?'korjaamme':
        /raiva|leikka/.test(text)?'raivaamme':
        /huol/.test(text)?'huollamme':
        transport?'viemme':
        /muutto/.test(text)?'hoidamme':
        /rakenn/.test(text)?'rakennamme':'';
      if (!type) continue;
      if (['pesetteko','puhdistatteko'].includes(verb) && !cleaning) continue;
      if (verb==='vietteko' && !transport) continue;
      if (verb==='asennatteko' && type!=='asennamme') continue;
      if (verb==='maalaatteko' && type!=='maalaamme') continue;
      if (verb==='korjaatteko' && type!=='korjaamme') continue;
      if (verb==='raivaatteko' && type!=='raivaamme') continue;
      if (verb==='huollatteko' && type!=='huollamme') continue;
      if (inheritedActionKind && !serviceActionMatches(text,inheritedActionKind)) continue;
      candidates.push({row,type,qualifiedNoun});
    }
  }
  const found=candidates[0];
  if (!found) return {supported:false};
  const phrase=String(message).trim()
    .replace(/^(?:teettekö|pesettekö|puhdistatteko|huollatteko|asennatteko|maalaatteko|korjaatteko|raivaatteko|viettekö|entä|mites|ja)\s+/i,'')
    .replace(/[?!.]+$/,'').toLowerCase();
  const answerVerb=verb==='teetteko' && /(?:pesu|puhdist|siivou|asennus|huolto|maalaus|korjaus|raivaus)/.test(noun) ? 'teemme' : found.type;
  return {supported:true,answer:'Kyllä, '+answerVerb+(follow?' myös':'')+' '+(found.qualifiedNoun||phrase)+'.',evidence:[found.row]};
}

// A customer may request two or more different services in one sentence.
// Resolve each service against independent, approved evidence. A generic
// snippet matching just one service must never answer the whole question.
// Multiple-service requests must be evaluated as a set of independently
// proven services. Finnish shared actions ("peltikaton ja rännien pesun"),
// compounds ("ikkunanpesu"), and mixed actions must all be resolved before
// producing a response. Never interpret a single matching snippet as proof
// of the entire request.
function combinedFinnishServiceRequest(message, rows) {
  const raw=String(message||'').toLowerCase().trim().replace(/[?!.]+$/,'');
  const q=normalizeSearchText(raw);
  const order=raw.match(/^(?:voiko\s+teiltä\s+tilata|voiko\s+tilata\s+teiltä|voinko\s+tilata\s+teiltä|voinko\s+teiltä\s+tilata|voiko\s+tilata|voinko\s+tilata|saako\s+teiltä|saanko\s+teiltä|onnistuuko|onnistuisko|pystyttekö|voitteko|voisitteko|olisiko\s+mahdollista|olisko\s+mahdollista|onko\s+teillä|löytyykö\s+teiltä|haluaisin\s+tilata|haluan\s+tilata|tarvitsen|tarviin|teettekö|tarjoatteko)\s+(.+)$/i);
  if (!order) return null;

  const actionTypes=[
    {kind:'clean',rx:/puhdist|pesu|pese|pesem|siivou/},
    {kind:'oil',rx:/öljy|oljy/},
    {kind:'install',rx:/asenn/},
    {kind:'paint',rx:/maala|maalau/},
    {kind:'repair',rx:/korja|korjau/},
    {kind:'maintain',rx:/huol/},
    {kind:'clear',rx:/raiva|raivau/},
    {kind:'transport',rx:/poisvien|poisvient|kuljet|nouto/}
  ];
  const actionOf=text=>{
    const t=normalizeSearchText(text);
    return actionTypes.find(action=>action.rx.test(t))||null;
  };
  const subjectOf=word=>{
    const text=normalizeSearchText(word);
    // Generic "katon/kattojen" questions may match documented roof subtypes,
    // but the reply must disclose the specific subtype actually supported.
    if (/^(?:katon|katto|kattoa|kattoja|kattojen|kattoihin|katolla|katolta|katolle)$/.test(text)) return 'roof';
    if (/^peltikat/.test(text)) return 'peltikatt';
    if (/^tiilikat/.test(text)) return 'tiilikatt';
    if (/^rann/.test(text)) return 'rann';
    if (/^ikkun/.test(text)) return 'ikkun';
    if (/^terass/.test(text)) return 'terass';
    return finnishServiceStem(text);
  };
  const parseSubjects=part=>normalizeSearchText(part).split(/[\s-]+/).filter(Boolean)
    .map(word=>{
      // In "ikkunanpesun", the same word names both the subject and action.
      if (/^ikkun/.test(word)) return 'ikkun';
      if (/^peltikat/.test(word)) return 'peltikatt';
      if (/^tiilikat/.test(word)) return 'tiilikatt';
      if (/^rann/.test(word)) return 'rann';
      if (/^terass/.test(word)) return 'terass';
      if (actionTypes.some(action=>action.rx.test(word))) return '';
      return subjectOf(word);
    }).filter(word=>word.length>=4 && !/^(?:myos|kaikk|kerta|samal)$/.test(word));

  // Commas and "sekä" separate requests. A local "ja" can share an
  // action, e.g. "peltikaton ja rännien pesun", without copying an
  // unrelated action from a different comma-separated service.
  const groups=order[1].split(/\s*,\s*|\s+sekä\s+|\s+seka\s+|\s*&\s*/i).map(x=>x.trim()).filter(Boolean);
  const parts=[];
  for(let groupIndex=0;groupIndex<groups.length;groupIndex++) {
    const group=groups[groupIndex];
    const pieces=group.split(/\s+ja\s+/i).map(x=>x.trim()).filter(Boolean);
    const own=pieces.map(piece=>actionOf(piece));
    const shared=[...new Set(own.filter(Boolean).map(a=>a.kind))];
    const sharedAction=shared.length===1 ? own.find(Boolean) : null;
    const sharedWord=sharedAction && pieces.length>1 ?
      pieces.find(piece=>actionOf(piece))?.split(/\s+/).find(word=>sharedAction.rx.test(normalizeSearchText(word))) : '';
    let previousSubjects=[];
    let previousSubjectPhrase='';
    for(let i=0;i<pieces.length;i++){
      const explicitSubjects=parseSubjects(pieces[i]);
      // "Terassin pesu ja öljyäminen": the bare second action inherits
      // its subject from the preceding, locally coordinated service only.
      const actionOnly=own[i] && explicitSubjects.length===0 &&
        pieces[i].split(/\s+/).length===1 && i>0;
      const subjects=actionOnly ? previousSubjects : explicitSubjects;
      const inheritedLabel=actionOnly && previousSubjectPhrase
        ? previousSubjectPhrase+' '+pieces[i] : '';
      const action=own[i]||sharedAction||
        (/^pesetteko\b/.test(q)?actionTypes[0]:null);
      parts.push({
        subjects,action,groupIndex,
        label:inheritedLabel || (own[i]||!sharedWord?pieces[i]:pieces[i]+' '+sharedWord)
      });
      if (explicitSubjects.length) {
        previousSubjects=explicitSubjects;
        previousSubjectPhrase=pieces[i].split(/\s+/)[0]||'';
      }
    }
  }
  if (parts.length<2 || parts.length>6) return null;
  // Once recognized as a multi-service request, never fall back to
  // generic search even if a phrase is ambiguous.
  if (parts.some(part=>!part.action || !part.subjects.length)) return {supported:false};

  const approved=rows.filter(row=>{
    const meta=normalizeSearchText(String(row.category||'')+' '+String(row.title||''));
    return usableWebsiteRow(row) && knowledgeTopic(meta)==='services' &&
      !/arvost|review|testimonial|asiakaskokem/.test(meta) &&
      !importedKnowledgeJunk(String(row.title||'')+' '+String(row.answer||'')) &&
      !/\b(?:emme|ei|eivat|not|inte|aldrig)\b/.test(normalizeSearchText(String(row.answer||'')));
  });

  const matchesAction=(text,action)=>action.kind==='clean'
    ? /puhdist|pesu|pese|pesem|siivou/.test(normalizeSearchText(text))
    : action.rx.test(normalizeSearchText(text));
  const matchesSubjects=(text,subjects)=>{
    const evidence=normalizeSearchText(text).split(/[\s-]+/).filter(Boolean).map(subjectOf);
    return subjects.every(subject=>subject==='roof'
      ? evidence.some(word=>['roof','peltikatt','tiilikatt','huopakatt','bitumikatt'].includes(word))
      : evidence.includes(subject));
  };
  const isShortActionOnly=text=>{
    const words=normalizeSearchText(text).split(/\s+/).filter(Boolean);
    return words.length===1 && actionOf(words[0])!=null;
  };
  const findings=parts.map(part=>approved.find(row=>[row.title,row.answer].some(source=>{
    const clauses=String(source||'').split(/(?<=[.!?;])\s+|\s+(?:ja|sekä)\s+|[,;&]/i).map(s=>s.trim()).filter(Boolean);
    return clauses.some((clause,index)=>{
      if(!matchesAction(clause,part.action)) return false;
      if(matchesSubjects(clause,part.subjects)) return true;
      // "Terassin pesu ja öljyäminen": carry the terrace subject to
      // the second action-only clause. Do not carry it into another
      // named service such as "rännien asennus ja kattojen pesu".
      return index>0 && isShortActionOnly(clause) &&
        matchesSubjects(clauses[index-1],part.subjects);
    });
  })));

  // If a broad roof question was proved only for metal or another subtype,
  // name that subtype in the response instead of promising all roof materials.
  for(let i=0;i<parts.length;i++) {
    if (!findings[i] || !parts[i].subjects.includes('roof')) continue;
    const evidence=normalizeSearchText(String(findings[i].title||'')+' '+String(findings[i].answer||''));
    const subtype=/\bpeltikat/.test(evidence)?'peltikaton':
      /\btiilikat/.test(evidence)?'tiilikaton':
      /\bhuopakat/.test(evidence)?'huopakaton':
      /\bbitumikat/.test(evidence)?'bitumikaton':'';
    if (subtype) parts[i].qualifiedLabel=parts[i].label.replace(/^katon\b/i,subtype);
  }

  const present=parts.filter((part,i)=>Boolean(findings[i]));
  const missing=parts.filter((part,i)=>!findings[i]);
  const evidence=[...new Map(findings.filter(Boolean).map(row=>[row.id||row.title,row])).values()];
  const list=items=>items.length===1?items[0]:
    items.length===2?items.join(' ja '):
      items.slice(0,-1).join(', ')+' ja '+items.at(-1);
  const serviceName=label=>String(label)
    .replace(/puhdistuksen$/,'puhdistus')
    .replace(/öljyämisen$/,'öljyäminen')
    .replace(/pesun$/,'pesu');
  if (missing.length) {
    // A partial reply is still a handoff: never assert that every service
    // can be performed, booked together, or scheduled on a specific day.
    if (!present.length) return {supported:false};
    return {
      supported:false,partial:true,evidence,
      answer:'Tiedoistamme löytyvät seuraavat palvelut: '+list(present.map(x=>serviceName(x.qualifiedLabel||x.label)))+'. '+
        'Nämä palvelut pitää vielä varmistaa: '+list(missing.map(x=>serviceName(x.label)))+'. '+
        'Jätä yhteystietosi, niin yritys voi varmistaa asian.'
    };
  }
  const labels=parts.map(x=>x.qualifiedLabel||x.label);
  // Preserve natural shared-action groups instead of repeating their
  // noun or losing the shared action in a long customer request.
  const displayGroups=groups.map((group,groupIndex)=>{
    const roofPart=parts.find((part,i)=>part.groupIndex===groupIndex &&
      findings[i] && part.subjects.includes('roof') && part.qualifiedLabel);
    return roofPart ? group.replace(/\bkaton\b/i,roofPart.qualifiedLabel.split(' ')[0]) : group;
  });
  const grouped=displayGroups.length===1 ? displayGroups[0] :
    displayGroups.slice(0,-1).join(', ')+' sekä '+displayGroups.at(-1);
  const display=displayGroups.length===1 && labels.length===2
    ? 'sekä '+labels[0]+' että '+labels[1] : grouped;
  const orderQuestion=/^(?:voiko|voinko|saako|saanko|haluaisin|haluan|tarvitsen|tarviin)/.test(q);
  const naturalAvailability=/^(?:onnistuuko|onnistuisko|pystytteko|voitteko|voisitteko|olisiko|olisko|onko teilla|loytyyko teilta)/.test(q);
  return {
    supported:true,evidence,
    answer:orderQuestion
      ? 'Kyllä, voit tilata meiltä '+display+'.'
      : naturalAvailability
        ? 'Kyllä, kaikki mainitsemasi palvelut onnistuvat.'
        : 'Kyllä, tarjoamme seuraavat palvelut: '+display+'.'
  };
}

// Resolve a short, natural toilet-installation question from an explicit
// service fact. "WC" is a two-letter abbreviation and generic Finnish word
// stemmers deliberately ignore it; don't turn that omission into a handoff
// when the business actually documents WC-istuin installation. Equally, never
// infer installation merely from a bathroom renovation or a plumbing category.
function groundedToiletInstallationQuestion(message, rows, lang) {
  const q=normalizeSearchText(message);
  const subject=/(?:\bwc\b|\bwc[- ]?(?:istui|pont|pytt)|\bvessan(?:pont|pytt)|\btoilet\b|\btoilets\b|\btoalett)/;
  const install=/(?:asenn|asent|install|monter|\bfit\b|\bfitting\b|\breplace\b|\bbyta\b|\bbyter\b)/;
  if(!subject.test(q) || !install.test(q)) return null;
  // These questions require their own verified price or schedule evidence.
  if(/(?:\bhinta\b|\bpaljonko\b|\bmaksaa\b|\bprice\b|\bcost\b|\bpris\b|\bkostar\b|\bmilloin\b|\bwhen\b|\bnar\b|\btanaan\b|\bhuomenna\b)/.test(q)) return null;

  const positiveFixture=/(?:\bwc[- ]?(?:istui|pont|pytt|asenn)|\bvessan(?:pont|pytt)|\btoalett(?:stol|er|en|installation|montering)?\b|\btoilets?\b|\basenn[a-z]*\s+wc\b|\bwc\s+asenn)/;
  const positiveInstall=/(?:asenn|install|monter|\bfit\b|\bfitting\b)/;
  const negation=/\b(?:emme|ei|eivat|not|never|dont|don t|doesn t|do not|cannot|inte|aldrig)\b/;
  const verified=(rows||[]).find(row=>{
    if(!usableWebsiteRow(row)) return false;
    const meta=normalizeSearchText(String(row.category||'')+' '+String(row.title||''));
    if(knowledgeTopic(meta)!=='services' || /arvost|review|testimonial|asiakaskokem/.test(meta)) return false;
    if(importedKnowledgeJunk(String(row.title||'')+' '+String(row.answer||''))) return false;
    if(negation.test(normalizeSearchText(row.answer))) return false;
    const clauses=[String(row.title||''),...String(row.answer||'').split(/(?<=[.!?;])\s+|\s+(?:ja|seka|and|och)\s+|[;&]/i)];
    return clauses.some(clause=>{
      const t=normalizeSearchText(clause);
      // The installation verb and the toilet fixture must describe the same
      // service, not unrelated work elsewhere on the page.
      return !negation.test(t) && positiveFixture.test(t) && positiveInstall.test(t);
    });
  });

  if(!verified) {
    const answer=lang==='en'
      ? "I couldn't confirm toilet installation from the company's information. Leave your contact details and the company can check."
      :lang==='sv'
        ? 'Jag kunde inte bekräfta toalettinstallation utifrån företagets uppgifter. Lämna dina kontaktuppgifter så kan företaget kontrollera detta.'
        : 'Yrityksen tiedoista ei löytynyt vahvistusta WC-istuimen asennukselle. Jätä yhteystietosi, niin yritys voi varmistaa asian.';
    return {answer,handoff:true,confidence:0.2,intent:'Palvelut',sourceIds:[],selected:[]};
  }
  const answer=lang==='en'?'Yes, we install toilets.'
    :lang==='sv'?'Ja, vi installerar toaletter.'
      :'Kyllä, asennamme WC-istuimia.';
  return {
    answer,handoff:false,confidence:0.94,intent:'Palvelut',
    sourceIds:verified.id?[verified.id]:[],selected:[verified],
  };
}

function naturalServiceAnswer(rows) {
  const found = [];
  const add = (value) => {
    let s=String(value||'').replace(/\s+/g,' ').trim()
      .replace(/^(?:palvelut?|services?|tjänster?)\s*[-–—:]?\s*/i,'')
      .replace(/\s*\|.*$/,'').trim();
    if(!s || s.length<4 || s.length>55) return;
    if(/yhteystiedot|varaa aika|pyydä tarjous|tietoa meistä|mitä teemme|palvelumme|varsinais-suomi|turku|skip|toggle|menu|nav/i.test(s)) return;
    const key=normalizeSearchText(s);
    if(!found.some(x=>normalizeSearchText(x)===key)) found.push(s);
  };
  for(const row of rows||[]){
    const raw=String(row?.answer||'').replace(/\s+/g,' ').trim();
    const title=String(row?.title||'').trim();
    // Page headings such as "Palvelut – Ikkunanpesu, Kattopesut, Maalaus & Raivaus | Yritys"
    // are useful, but navigation text after the title is not.
    const heading=(title+' '+raw.slice(0,180)).match(/palvelut?\s*[-–—:]\s*([^|.]{4,140})/i);
    if(heading){
      heading[1].split(/\s*(?:,|&| ja )\s*/i).forEach(add);
    }
    // Pick concrete service phrases from normal prose. Keep this deliberately
    // conservative so CTA/navigation words never become part of the answer.
    const serviceRe=/\b([A-ZÅÄÖa-zåäö][A-ZÅÄÖa-zåäö-]*(?:n|jen)?\s+(?:pesu(?:t|ja)?|siistiminen|raivaus(?:työt|töitä)?|maalaus(?:työt|töitä)?|huolto(?:työt|a)?|puhdistus(?:työt|ta)?|leikkaus|poisvienti))\b/gi;
    let m;
    while((m=serviceRe.exec(raw))!==null) add(m[1]);
  }
  if(!found.length) return '';
  const items=found.slice(0,8);
  if(items.length===1) return 'Teemme '+items[0]+'.';
  return 'Teemme '+items.slice(0,-1).join(', ')+' ja '+items[items.length-1]+'.';
}

function conciseKnowledgeAnswer(row, query) {
  let raw=cleanKnowledgeText(row?.answer);
  if(!raw || importedKnowledgeJunk(raw) || !usableWebsiteRow(row)) return '';
  // Navigation/meta URLs are actions, not conversational answers. Never dump
  // catalog or website URLs into a broad customer reply.
  if (['Tuotekatalogi','Verkkosivu','Ajanvarauslinkki'].includes(String(row?.title||''))) return '';
  if (['Hinnat','Aukioloajat','Puhelinnumero','Sähköposti','Osoite','Tarjouspyyntölomake'].includes(row.title) || ['Hinnat','Aukioloajat','Yhteystiedot'].includes(row.category)) return raw;
  const pageTitleLike = /^(?:respondo ai|etusivu|home|homepage)(?:\s*[-|–—:]|$)/i;
  if(pageTitleLike.test(raw)) {
    const parts=(raw.match(/[^.!?]+[.!?]?/g)||[]).map(x=>x.trim()).filter(Boolean);
    while(parts.length && pageTitleLike.test(parts[0])) parts.shift();
    raw=parts.join(' ').trim();
  }
  if(!raw) return '';
  // Remove common navigation/heading debris left by website extraction.
  raw=raw.replace(/^(?:palvelut?|services?|tjänster?)\s+(?:palvelut?|services?|tjänster?)\s+/i,'')
    .replace(/^(?:mitä teemme|what we do|vad vi gör)\s+/i,'')
    .replace(/\b(?:katso palvelut|view services|lue lisää|read more)\b\.?/gi,'')
    .replace(/\s+/g,' ').trim();
  const qTokens=new Set(searchTokens(query));
  const sentences=(raw.match(/[^.!?]+[.!?]?/g)||[raw])
    .map(x=>x.trim()).filter(x=>x.length>=12)
    .filter(x=>!/^(?:terms of service|privacy policy|käyttöehdot|tietosuojaseloste|cookie)/i.test(x));
  const ranked=sentences.map((sentence,index)=>{
    const tokens=searchTokens(sentence); let score=0;
    for(const token of tokens) if(qTokens.has(token)) score+=5;
    if(/[€$£]|\b\d+[,.]?\d*\s*(?:€|eur|%|päiv|day|dag|kk|month|mån|vuosi|year|år)\b/i.test(sentence)) score+=1;
    return {sentence,index,score};
  }).sort((a,b)=>b.score-a.score||a.index-b.index);
  const best=ranked.filter(x=>x.score>0).slice(0,2);
  const chosen=(best.length?best:ranked.slice(0,2)).sort((a,b)=>a.index-b.index).map(x=>x.sentence);
  let answer=chosen.join(' ').replace(/\b([A-Za-zÀ-ž]{3,})\s+\1\b/gi,'$1').replace(/\s+/g,' ').trim();
  if(answer.length>340) answer=answer.slice(0,337).replace(/\s+\S*$/,'')+'…';
  return answer;
}

async function generateGroundedAnswer({ companyName, rows, message, history = [], lang = 'fi', pageContext = {} }) {
  const responseLang = ['fi','sv','en'].includes(String(lang || '').toLowerCase()) ? String(lang).toLowerCase() : 'fi';
  rows = (rows || []).filter(usableWebsiteRow);
  const cleanMessage = String(message || '').trim();
  if (!cleanMessage) return { answer: '', handoff: true, confidence: 0, intent: responseLang === 'en' ? 'Empty' : responseLang === 'sv' ? 'Tom' : 'Tyhjä', sourceIds: [], selected: [] };

  await resolveIntentForMessage(cleanMessage,responseLang);
  const normalized = normalizeSearchText(cleanMessage);
  const conversational=conversationalResponse(cleanMessage,responseLang,history);
  if (conversational) {
    return {
      answer:conversational.answer,
      handoff:false,
      confidence:1,
      intent:responseLang==='en'?'Conversation':responseLang==='sv'?'Samtal':'Keskustelu',
      sourceIds:[],
      selected:[],
    };
  }

  // Ambiguous safety questions need clarification before generic retrieval.
  // Otherwise a weakly related product row can outrank the clarification and
  // the bot either answers from the wrong fact or falls through to handoff.
  if (/^(?:onko\s+(?:tama|se|tuo)\s+turvallinen|onko\s+(?:tama|se|tuo)\s+turvallista|is\s+(?:this|it|that)\s+safe|are\s+(?:these|they)\s+safe|ar\s+(?:detta|det|den)\s+saker|ar\s+(?:detta|det)\s+sakert)$/.test(normalized)) {
    const clarification=conversationalClarification(cleanMessage,responseLang,history);
    if (clarification) {
      return {
        answer:clarification,
        handoff:false,
        confidence:0.8,
        intent:responseLang==='en'?'Clarification':responseLang==='sv'?'Förtydligande':'Tarkennus',
        sourceIds:[],
        selected:[],
      };
    }
  }

  // "Missä toimitte?" means service area, not shipping/delivery. Resolve it
  // before generic topic matching so the Finnish verb "toimitte" cannot be
  // mistaken for "toimitus".
  if (explicitServiceAreaQuestion(cleanMessage)) {
    const verifiedArea=verifiedServiceAreaValue(rows);
    const answer=verifiedArea
      ? serviceAreaAnswer(verifiedArea.value,responseLang)
      : responseLang==='en'
        ? 'There is no verified service area in the company information. Leave your contact details so the company can confirm whether your location is covered.'
        : responseLang==='sv'
          ? 'Det finns inget bekräftat serviceområde i företagets information. Lämna dina kontaktuppgifter så kan företaget bekräfta om ditt område omfattas.'
          : 'Yrityksen vahvistetuista tiedoista ei löytynyt toimialuetta. Jätä yhteystietosi, niin yritys voi varmistaa kuuluuko alueesi palvelualueeseen.';
    return {
      answer,
      handoff:!verifiedArea,
      confidence:verifiedArea?1:0.2,
      intent:'Sijainti',
      sourceIds:verifiedArea?.row.id?[verifiedArea.row.id]:[],
      selected:verifiedArea?[verifiedArea.row]:[]
    };
  }

  // Direct phone/email requests are factual lookups, not generic FAQ
  // retrieval. Respond with the verified value, or disclose its absence.
  const contactRequested=explicitContactQuestion(cleanMessage);
  if (contactRequested) {
    const title=contactRequested==='phone'?'Puhelinnumero':'Sähköposti';
    const verified=verifiedContactValue(rows,title);
    const isPhone=contactRequested==='phone';
    const fallbackPage=verified?null:verifiedContactPage(rows);
    const answer=verified
      ? (responseLang==='en'?(isPhone?'Our phone number is ':'Our email address is ')
          :responseLang==='sv'?(isPhone?'Vårt telefonnummer är ':'Vår e-postadress är ')
          :(isPhone?'Puhelinnumeromme on ':'Sähköpostiosoitteemme on '))+verified.value+'.'
      : fallbackPage
        ? responseLang==='en'
          ? (isPhone?'No verified phone number is available. You can contact the company through its website using the button below.':'No verified email address is available. You can contact the company through its website using the button below.')
          : responseLang==='sv'
            ? (isPhone?'Inget bekräftat telefonnummer finns. Du kan kontakta företaget via webbplatsen med knappen nedan.':'Ingen bekräftad e-postadress finns. Du kan kontakta företaget via webbplatsen med knappen nedan.')
            : (isPhone?'Yrityksen puhelinnumeroa ei löytynyt. Voit kuitenkin ottaa yhteyttä yrityksen verkkosivujen kautta alla olevasta painikkeesta.':'Yrityksen sähköpostiosoitetta ei löytynyt. Voit kuitenkin ottaa yhteyttä yrityksen verkkosivujen kautta alla olevasta painikkeesta.')
      : responseLang==='en'
        ? (isPhone?'There is no verified phone number in the company information. Leave your contact details so the company can get back to you.':'There is no verified email address in the company information. Leave your contact details so the company can get back to you.')
        : responseLang==='sv'
          ? (isPhone?'Det finns inget bekräftat telefonnummer i företagets information. Lämna dina kontaktuppgifter så kan företaget återkomma.':'Det finns ingen bekräftad e-postadress i företagets information. Lämna dina kontaktuppgifter så kan företaget återkomma.')
          : (isPhone?'Yrityksen vahvistetuista tiedoista ei löytynyt puhelinnumeroa. Jätä yhteystietosi, niin yritys voi palata sinulle.':'Yrityksen vahvistetuista tiedoista ei löytynyt sähköpostiosoitetta. Jätä yhteystietosi, niin yritys voi palata sinulle.');
    return {answer,handoff:!verified&&!fallbackPage,confidence:verified?1:fallbackPage?0.95:0.2,intent:'Yhteystiedot',
      sourceIds:[verified?.row?.id || fallbackPage?.row?.id].filter(Boolean),
      selected:[verified?.row || fallbackPage?.row].filter(Boolean)};
  }

  if (generalContactQuestion(cleanMessage)) {
    const page=verifiedContactPage(rows);
    if(page) return {
      answer:responseLang==='en'
        ? (page.form?'You can contact the company using the contact form on its website. Open it below.':'You can contact the company through its website contact page. Open it below.')
        :responseLang==='sv'
          ? (page.form?'Du kan kontakta företaget via kontaktformuläret på webbplatsen. Öppna det nedan.':'Du kan kontakta företaget via kontaktsidan på webbplatsen. Öppna den nedan.')
          :(page.form?'Voit ottaa yhteyttä yritykseen sen verkkosivujen yhteydenottolomakkeella. Avaa lomake alta.':'Voit ottaa yhteyttä yritykseen sen verkkosivujen yhteydenottosivun kautta. Avaa sivu alta.'),
      handoff:false,confidence:0.98,intent:'Yhteystiedot',sourceIds:[page.row.id].filter(Boolean),selected:[page.row],
    };
    const contactAnswer=directGeneralContactAnswer(rows,responseLang);
    if(contactAnswer) return contactAnswer;
  }

  if (explicitBusinessLocationQuestion(cleanMessage)) {
    const location=verifiedBusinessLocationValue(rows);
    if(location) {
      const answer=responseLang==='en'
        ? 'We are based in '+location.value+'.'
        : responseLang==='sv'
          ? 'Vi finns i '+location.value+'.'
          : 'Toimipaikkamme on '+location.value+'.';
      return {
        answer,
        handoff:false,
        confidence:0.98,
        intent:'Sijainti',
        sourceIds:[location.row.id].filter(Boolean),
        selected:[location.row],
      };
    }
  }

  const openingHoursResult=directOpeningHoursAnswer(rows,cleanMessage,responseLang);
  if(openingHoursResult) return openingHoursResult;

  if (queryTopic(cleanMessage) === 'quote') {
    const quoteRow = rows.find(row => row.title === 'Tarjouspyyntölomake' && normalizeWebUrl(row.answer, false));
    if (quoteRow) return {answer:responseLang === 'en' ? 'You can request a quote using the button below.' : responseLang === 'sv' ? 'Du kan begära offert via knappen nedan.' : 'Voit pyytää tarjouksen alla olevasta painikkeesta.', handoff:false, confidence:1, intent:'Tarjouspyyntö', sourceIds:[quoteRow.id].filter(Boolean), selected:[quoteRow]};
    const page=verifiedContactPage(rows);
    if(page) return {
      answer:responseLang==='en'?'You can ask the company for a quote through its contact page using the button below.'
        :responseLang==='sv'?'Du kan be företaget om en offert via kontaktsidan med knappen nedan.'
        :'Voit pyytää tarjousta yrityksen yhteydenottosivun kautta alla olevasta painikkeesta.',
      handoff:false,confidence:0.9,intent:'Tarjouspyyntö',sourceIds:[page.row.id].filter(Boolean),selected:[page.row],
    };
  }

  // Fulfilment/policy questions must outrank generic price and service logic.
  // Otherwise a shipping-price question can return only one arbitrary money row
  // instead of the complete delivery-price summary.
  const shippingCostResult=await directShippingCostAnswer(rows,cleanMessage,responseLang);
  if(shippingCostResult) return shippingCostResult;

  const deliveryTimeResult=directDeliveryTimeAnswer(rows,cleanMessage,responseLang);
  if(deliveryTimeResult) return deliveryTimeResult;

  const returnPolicyResult=directReturnPolicyAnswer(rows,cleanMessage,responseLang);
  if(returnPolicyResult) return returnPolicyResult;

  const warrantyResult=directWarrantyAnswer(rows,cleanMessage,responseLang);
  if(warrantyResult) return warrantyResult;

  const servicePriceFollowup=await directServicePriceFollowup(rows,cleanMessage,history,responseLang);
  if(servicePriceFollowup) return servicePriceFollowup;

  const standaloneServicePrice=directMultilingualServicePrice(rows,cleanMessage,responseLang);
  if(standaloneServicePrice) return standaloneServicePrice;

  const toiletInstallation = groundedToiletInstallationQuestion(cleanMessage, rows, responseLang);
  if (toiletInstallation) return toiletInstallation;

  const multilingualService=directMultilingualServiceConfirmation(rows,cleanMessage,responseLang);
  if(multilingualService) {
    const evidence=multilingualService.evidence||[];
    return multilingualService.supported
      ? {answer:multilingualService.answer,handoff:false,confidence:0.93,intent:'Palvelut',sourceIds:evidence.map(row=>row.id).filter(Boolean),selected:evidence}
      : {answer:'',handoff:true,confidence:0.2,intent:'Palvelut',sourceIds:[],selected:[]};
  }

  const ecommerceOrderResult=directEcommerceOrderingAnswer(rows,cleanMessage,responseLang);
  if(ecommerceOrderResult) return ecommerceOrderResult;

  const productResult=directProductAnswer(rows,cleanMessage,responseLang,history);
  if(productResult) return productResult;

  // Generic company questions such as "Mitä teette?" are ambiguous. For an
  // ecommerce site whose approved knowledge contains products but no actual
  // service rows, interpret the question as "What do you sell?" instead of
  // forcing the service intent and handing off. This keeps retail demos natural
  // without making a product-only store pretend it offers services.
  const hasImportedProducts=productCatalog(rows).length>0;
  const hasServiceKnowledge=rows.some((row)=>
    knowledgeTopic(String(row?.category||'')+' '+String(row?.title||'')+' '+String(row?.keywords||''))==='services'
  );
  if (hasImportedProducts && !hasServiceKnowledge && genericCompanyQuestion(cleanMessage)) {
    const commerceQuestion=responseLang==='en'?'What do you sell?':responseLang==='sv'?'Vad säljer ni?':'Mitä myytte?';
    const commerceOverview=directProductAnswer(rows,commerceQuestion,responseLang);
    if(commerceOverview) return commerceOverview;
  }

  // If an ecommerce import has a verified catalog link but product rows are
  // temporarily incomplete, still answer naturally instead of echoing raw URLs
  // or the Respondo demo website address.
  if (broadProductQuestion(cleanMessage)) {
    const catalogRow=rows.find((row)=>String(row?.title||'')==='Tuotekatalogi' && /^https?:\/\//i.test(String(row?.answer||'')));
    if (catalogRow) {
      const answer=responseLang==='en'
        ? 'We sell a range of products. You can view all products using the button below.'
        : responseLang==='sv'
          ? 'Vi säljer ett urval av produkter. Du kan se alla produkter via knappen nedan.'
          : 'Myymme erilaisia tuotteita. Katso kaikki tuotteet alla olevasta painikkeesta.';
      return {
        answer,handoff:false,confidence:0.9,intent:'Tuotteet',
        sourceIds:[catalogRow.id].filter(Boolean),
        selected:[]
      };
    }
  }

  const intent = inferIntent(cleanMessage);
  // Resolve natural follow-ups by carrying only the missing context. Standalone
  // questions remain standalone, while "Paljonko se maksaa?", "Entä katon pesu?"
  // and equivalent English/Swedish follow-ups inherit the right subject/intent.
  const retrievalQuery = contextualizeConversationQuery(cleanMessage, history);

  // Translate only the search query into Finnish so Finnish knowledge bases can
  // be searched in Swedish/English without a paid model. If the free translator
  // is unavailable, the multilingual alias expansion below still covers the
  // most common business intents.
  let localQuery = retrievalQuery;
  if (responseLang !== 'fi') {
    const translatedQuery = await translateTextFree(retrievalQuery, 'fi', 'auto');
    if (translatedQuery) localQuery += ' ' + translatedQuery;
  }

  let selected = selectRelevantKnowledge(rows, localQuery, 8);


  // Short, contextual service follow-ups need a direct yes/no answer. If there
  // is no approved proof for the exact action, hand off rather than listing
  // unrelated services or inventing a confirmation.
  // Never pass a combined service request to generic retrieval, which can
  // answer from an unrelated row that merely shares marketing keywords.
  const combinedService = responseLang==='fi' ? combinedFinnishServiceRequest(cleanMessage,rows) : null;
  if (combinedService) {
    const evidence=combinedService.evidence||[];
    return {
      answer:combinedService.answer||'',handoff:!combinedService.supported,
      confidence:combinedService.supported?0.92:0.2,
      intent:'Palvelut',sourceIds:evidence.map(row=>row.id).filter(Boolean),
      selected:evidence
    };
  }

  const contextualService = responseLang==='fi'
    ? groundedFinnishServiceReply(cleanMessage,history,rows) : null;
  if (contextualService) {
    const evidence=contextualService.evidence||[];
    return contextualService.supported
      ? {answer:contextualService.answer,handoff:false,confidence:0.92,intent:'Palvelut',sourceIds:evidence.map(row=>row.id).filter(Boolean),selected:evidence}
      : {answer:'',handoff:true,confidence:0.2,intent:'Palvelut',sourceIds:[],selected:[]};
  }

  const naturalService = responseLang === 'fi' ? naturalFinnishServiceQuestion(cleanMessage, rows) : null;
  if (naturalService) {
    const evidence=naturalService.evidence||[];
    return naturalService.supported
      ? {answer:naturalService.answer,handoff:false,confidence:0.92,intent:'Palvelut',sourceIds:evidence.map(row=>row.id).filter(Boolean),selected:evidence}
      : {answer:'',handoff:true,confidence:0.2,intent:'Palvelut',sourceIds:[],selected:[]};
  }

  // Direct service yes/no questions must be resolved against the whole approved
  // knowledge base before generic retrieval can pick a review or unrelated row.
  // Example: "Viettekö romut pois?" should become "Kyllä, viemme romut pois."
  // even when a review containing "vietiin pois" happens to rank highest.
  const directServiceAnswer = responseLang === 'fi' ? specificServiceConfirmation(cleanMessage, rows) : '';
  if (directServiceAnswer) {
    const evidence = rows.filter(row => specificServiceConfirmation(cleanMessage,[row])).slice(0,3);
    return {
      answer: directServiceAnswer,
      handoff: false,
      confidence: 0.92,
      intent: 'Palvelut',
      sourceIds: evidence.map((row)=>row.id).filter(Boolean),
      selected: evidence
    };
  }

  if (responseLang === 'fi' && /^(?:teetteko|pesetteko|leikkaatteko|maalaatteko|raivaatteko|puhdistatteko|huollatteko|asennatteko|korjaatteko|vietteko)\b/.test(normalized)) {
    return {answer:'',handoff:true,confidence:0.2,intent:'Palvelut',sourceIds:[],selected:[]};
  }

  // Broad questions such as "What do you sell?" or "Tell me about the company"
  // should use the approved knowledge base as factual memory instead of requiring
  // an exact pre-written Q&A pair.
  const broadCompanyQuestion =
    queryTopic(localQuery) === 'services' ||
    genericCompanyQuestion(cleanMessage);

  if (!selected.length && broadCompanyQuestion) {
    selected = rows
      .filter((row) => normalizeSearchText(row.title) !== 'vastaustyyli')
      .filter((row) => !importedKnowledgeJunk(String(row.title||'')+' '+String(row.answer||'')))
      .map((row) => ({...row,_score:scoreKnowledgeRow(row, localQuery),_topic:knowledgeTopic(String(row.title||'')+' '+String(row.category||'')+' '+String(row.keywords||''))}))
      // "Mitä palveluja teette?" may only summarize rows that are actually
      // classified as services. Never fall back to arbitrary products/UI text.
      .filter((row) => row._topic === 'services')
      .sort((a,b) => Number(b._score||0)-Number(a._score||0))
      .slice(0,8);
  }
  if (!selected.length) {
    const clarification=conversationalClarification(cleanMessage,responseLang,history);
    if (clarification) return {answer:clarification,handoff:false,confidence:0.75,intent:responseLang==='en'?'Clarification':responseLang==='sv'?'Förtydligande':'Tarkennus',sourceIds:[],selected:[]};
    return { answer: '', handoff: true, confidence: 0.2, intent, sourceIds: [], selected: [] };
  }

  const top = selected[0];
  const minimumScore = broadCompanyQuestion ? 0 : (intent === 'Asiakaskysymys' ? 5 : 8);
  if (Number(top._score || 0) < minimumScore) {
    return { answer:'', handoff:true, confidence:0.3, intent, sourceIds:[], selected };
  }

  let finalAnswer = '';
  if (broadCompanyQuestion) {
    const usable = selected
      .map((row) => ({row,text:conciseKnowledgeAnswer(row, cleanMessage)}))
      .filter((item) => item.text && !importedKnowledgeJunk(item.text))
      .slice(0,3);
    const unique=[];
    for(const item of usable){
      if(!unique.some((x)=>normalizeSearchText(x).includes(normalizeSearchText(item.text).slice(0,80)))) unique.push(item.text);
    }
    finalAnswer=(queryTopic(localQuery)==='services' ? (broadServiceListAnswer(rows) || briefServiceAnswer(selected)) : '')
      || composeKnowledgeAnswer(selected,cleanMessage) || unique.join(' ').trim();
    if(finalAnswer.length>520) finalAnswer=finalAnswer.slice(0,517).replace(/\s+\S*$/,'')+'…';
  } else {
    finalAnswer = conciseKnowledgeAnswer(top, cleanMessage);
  }
  if (!finalAnswer) {
    return { answer:'', handoff:true, confidence:0.25, intent, sourceIds:[], selected };
  }
  finalAnswer = cleanKnowledgeText(finalAnswer);
  const sourceLanguage = detectConversationLanguage(finalAnswer, 'fi');
  const localizedAnswer = sourceLanguage === responseLang ? finalAnswer : await forceAnswerLanguage(finalAnswer, responseLang);
  if (localizedAnswer) finalAnswer = cleanKnowledgeText(localizedAnswer);
  else if (responseLang !== 'fi') return {answer:'',handoff:true,confidence:0.2,intent,sourceIds:[],selected};
  return {
    answer: finalAnswer,
    handoff: false,
    confidence: Math.min(0.94, 0.62 + Number(top._score || 0) * 0.025),
    intent,
    sourceIds: broadCompanyQuestion ? selected.slice(0,3).map((x)=>x.id).filter(Boolean) : (top.id ? [top.id] : []),
    selected,
  };
}

function cookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || '')
      .split(';')
      .map((x) => x.trim().split('=').map(decodeURIComponent))
      .filter((x) => x.length === 2),
  );
}

function setSession(res, user) {
  res.cookie(
    COOKIE,
    jwt.sign({ sub: user.id, email: user.email, sv:Number(user.session_version || 0) }, JWT, { expiresIn: '14d' }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1209600000,
    },
  );
}

async function auth(req, res, next) {
  try {
    const token = cookies(req)[COOKIE];
    if (!token) return res.status(401).json({ error: 'Kirjaudu sisään.' });
    const payload = jwt.verify(token, JWT);
    if (payload.role === 'agent') {
      const rr = await q(
        `SELECT sa.id,sa.tenant_id,sa.session_version
           FROM support_agents sa
           JOIN tenants t ON t.id=sa.tenant_id
           JOIN users u ON u.id=t.owner_user_id
          WHERE sa.id=$1
            AND u.status='active'
            AND t.active=true
            AND t.subscription_status IN ('active','trialing')
            AND (
              COALESCE(t.subscription_cancel_at_period_end,false)=false
              OR t.current_period_end IS NULL
              OR t.current_period_end > NOW()
            )`,
        [payload.agentId || payload.sub],
      );
      if (!rr.rowCount || rr.rows[0].tenant_id !== payload.tenantId || Number(rr.rows[0].session_version || 0) !== Number(payload.sv || 0)) {
        return res.status(401).json({ error:'Istunto on vanhentunut.' });
      }
    } else {
      const rr = await q('SELECT id,session_version FROM users WHERE id=$1',[payload.sub]);
      if (!rr.rowCount || Number(rr.rows[0].session_version || 0) !== Number(payload.sv || 0)) {
        return res.status(401).json({ error:'Istunto on vanhentunut.' });
      }
    }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Istunto on vanhentunut.' });
  }
}

function ownerOnly(req,res,next) {
  if (req.user?.role === 'agent') return res.status(403).json({ error:'Vain yrityksen pääkäyttäjä voi käyttää tätä toimintoa.' });
  next();
}

function agentOrOwner(req,res,next) {
  if (req.user?.role === 'agent' && !req.user?.tenantId) return res.status(403).json({ error:'Ei käyttöoikeutta.' });
  next();
}

function ownerTrafficOnly(req, res, next) {
  const ownerEmail = cleanEmail(process.env.OWNER_EMAIL || process.env.SUPPORT_EMAIL);
  if (!ownerEmail || cleanEmail(req.user?.email) !== ownerEmail) {
    return res.status(403).json({ error: 'Tämä näkymä on vain Respondo AI:n omistajalle.' });
  }
  next();
}

function trafficVisitorHash(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwarded || String(req.socket?.remoteAddress || '');
  const ua = String(req.headers['user-agent'] || '').slice(0, 400);
  return crypto.createHmac('sha256', SECRET_KEY).update(ip + '\n' + ua).digest('hex').slice(0, 40);
}

function trafficReferrerHost(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, '');
    return host.slice(0, 240);
  } catch {
    return '';
  }
}

function isLikelyBotUserAgent(value) {
  return /bot|crawler|spider|headless|preview|facebookexternalhit|slurp|bingpreview|uptimerobot|statuscake/i.test(String(value || ''));
}

async function subscribed(req, res, next) {
  try {
    const r = await q(
      `SELECT u.status,
              t.id AS tenant_id,
              t.active AS tenant_active,
              t.subscription_status AS subscription_status,
              t.subscription_cancel_at_period_end,
              t.current_period_end
         FROM users u
         LEFT JOIN tenants t
           ON t.id=active_tenant_for_user(u.id)
          AND t.owner_user_id=u.id
        WHERE u.id=$1`,
      [req.user.sub],
    );
    if (!r.rowCount) return res.status(404).json({ error: 'Tiliä ei löytynyt.' });
    const user = r.rows[0];

    if (user.status !== 'active') {
      return res.status(402).json({ error: 'Aktiivinen tili tarvitaan.' });
    }

    const activeTenantAllowed =
      user.tenant_active === true &&
      ['active', 'trialing'].includes(String(user.subscription_status || '')) &&
      (
        user.subscription_cancel_at_period_end !== true ||
        !user.current_period_end ||
        new Date(user.current_period_end).getTime() > Date.now()
      );

    if (!activeTenantAllowed) {
      const fallback = await q(
        `SELECT id
           FROM tenants
          WHERE owner_user_id=$1
            AND active=true
            AND subscription_status IN ('active','trialing')
            AND (
              COALESCE(subscription_cancel_at_period_end,false)=false
              OR current_period_end IS NULL
              OR current_period_end > NOW()
            )
          ORDER BY created_at ASC
          LIMIT 1`,
        [req.user.sub],
      );
      if (!fallback.rowCount) {
        return res.status(402).json({ error: 'Aktiivinen tilaus tarvitaan vähintään yhdelle yritykselle.' });
      }
      await q(
        'UPDATE users SET active_tenant_id=$1,updated_at=NOW() WHERE id=$2',
        [fallback.rows[0].id, req.user.sub],
      );
    }

    next();
  } catch (e) {
    console.error('Subscription access check failed', e);
    return res.status(500).json({ error: 'Tilauksen tarkistus epäonnistui.' });
  }
}


const OAUTH_PROFILE_COOKIE = 'respondo_oauth_profile';
const OAUTH_STATE_COOKIE = 'respondo_oauth_state';

function oauthConfig(provider) {
  if (provider === 'google') {
    return {
      configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Production must use the exact redirect URI registered in Google
      // Cloud even when BASE_URL or the inbound host is a Railway alias.
      redirectUri: process.env.NODE_ENV === 'production'
        ? 'https://www.respondoai.fi/api/auth/oauth/google/callback'
        : BASE + '/api/auth/oauth/google/callback',
    };
  }
  if (provider === 'apple') {
    const privateKey = String(process.env.APPLE_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();
    return {
      configured: Boolean(
        process.env.APPLE_CLIENT_ID &&
        process.env.APPLE_TEAM_ID &&
        process.env.APPLE_KEY_ID &&
        privateKey
      ),
      clientId: String(process.env.APPLE_CLIENT_ID || '').trim(),
      teamId: String(process.env.APPLE_TEAM_ID || '').trim(),
      keyId: String(process.env.APPLE_KEY_ID || '').trim(),
      privateKey,
      redirectUri: BASE + '/api/auth/oauth/apple/callback',
    };
  }
  return { configured: false };
}

let appleJwksCache = { expiresAt: 0, keys: [] };

async function getAppleJwks() {
  if (appleJwksCache.expiresAt > Date.now() && appleJwksCache.keys.length) {
    return appleJwksCache.keys;
  }
  const response = await fetch('https://appleid.apple.com/auth/keys');
  if (!response.ok) throw new Error('Apple signing keys unavailable');
  const data = await response.json();
  const keys = Array.isArray(data.keys) ? data.keys : [];
  if (!keys.length) throw new Error('Apple signing keys missing');
  appleJwksCache = { expiresAt: Date.now() + 6 * 60 * 60 * 1000, keys };
  return keys;
}

function parseJwtPart(value) {
  return JSON.parse(Buffer.from(String(value || ''), 'base64url').toString('utf8'));
}

function appleJwtSegment(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function makeAppleClientSecret(cfg) {
  const now = Math.floor(Date.now() / 1000);
  const header = appleJwtSegment({ alg:'ES256', kid:cfg.keyId, typ:'JWT' });
  const payload = appleJwtSegment({
    iss:cfg.teamId,
    iat:now,
    exp:now + (5 * 60),
    aud:'https://appleid.apple.com',
    sub:cfg.clientId,
  });
  const input = header + '.' + payload;
  const signature = crypto.sign(
    'sha256',
    Buffer.from(input),
    { key:cfg.privateKey, dsaEncoding:'ieee-p1363' },
  ).toString('base64url');
  return input + '.' + signature;
}

async function exchangeAppleCode(code, cfg) {
  const response = await fetch('https://appleid.apple.com/auth/token', {
    method:'POST',
    headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
    body:new URLSearchParams({
      client_id:cfg.clientId,
      client_secret:makeAppleClientSecret(cfg),
      code:String(code || ''),
      grant_type:'authorization_code',
      redirect_uri:cfg.redirectUri,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.id_token) {
    const reason = String(data.error || 'token_exchange_failed');
    throw new Error('Apple token exchange failed: ' + reason);
  }
  return data;
}

async function verifyAppleIdentityToken(idToken, expectedNonce) {
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) throw new Error('Invalid Apple identity token');
  const header = parseJwtPart(parts[0]);
  const payload = parseJwtPart(parts[1]);
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Invalid Apple token header');

  const keys = await getAppleJwks();
  const jwk = keys.find((key) => key.kid === header.kid && key.kty === 'RSA');
  if (!jwk) throw new Error('Apple signing key not found');

  const publicKey = crypto.createPublicKey({ key:jwk, format:'jwk' });
  const valid = crypto.verify(
    'RSA-SHA256',
    Buffer.from(parts[0] + '.' + parts[1]),
    publicKey,
    Buffer.from(parts[2], 'base64url'),
  );
  if (!valid) throw new Error('Apple token signature invalid');

  const now = Math.floor(Date.now() / 1000);
  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (payload.iss !== 'https://appleid.apple.com') throw new Error('Apple token issuer invalid');
  if (!audience.includes(process.env.APPLE_CLIENT_ID)) throw new Error('Apple token audience invalid');
  if (!payload.exp || Number(payload.exp) <= now) throw new Error('Apple token expired');
  if (payload.iat && Number(payload.iat) > now + 120) throw new Error('Apple token issued in the future');
  if (expectedNonce && payload.nonce !== expectedNonce) throw new Error('Apple token nonce invalid');
  if (payload.email_verified === false || payload.email_verified === 'false') {
    throw new Error('Apple email not verified');
  }
  return payload;
}

function setOauthState(res, nonce, provider = 'google') {
  const apple = provider === 'apple';
  res.cookie(OAUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: apple ? true : process.env.NODE_ENV === 'production',
    sameSite: apple ? 'none' : 'lax',
    maxAge: 10 * 60 * 1000,
  });
}

function setOauthProfile(res, profile) {
  res.cookie(
    OAUTH_PROFILE_COOKIE,
    jwt.sign(profile, JWT, { expiresIn: '15m' }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    }
  );
}

function getOauthProfile(req) {
  try {
    const token = cookies(req)[OAUTH_PROFILE_COOKIE];
    if (!token) return null;
    return jwt.verify(token, JWT);
  } catch {
    return null;
  }
}

async function finishOauth(req, res, code, state) {
  const provider = 'google';
  const cfg = oauthConfig(provider);
  if (!cfg.configured) {
    return res.redirect('/kirjaudu?oauth_error=not_configured&provider=google');
  }

  let statePayload;
  try {
    statePayload = jwt.verify(String(state || ''), JWT);
  } catch {
    return res.redirect('/kirjaudu?oauth_error=state&provider=google');
  }

  const stateCookie = cookies(req)[OAUTH_STATE_COOKIE];
  if (!stateCookie || statePayload.nonce !== stateCookie || statePayload.provider !== provider) {
    return res.redirect('/kirjaudu?oauth_error=state&provider=google');
  }
  res.clearCookie(OAUTH_STATE_COOKIE);

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: cfg.redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenResponse.ok) throw new Error('Google token exchange failed');
    const token = await tokenResponse.json();

    const userResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: 'Bearer ' + token.access_token },
    });
    if (!userResponse.ok) throw new Error('Google userinfo failed');
    const user = await userResponse.json();
    if (!user.email || user.email_verified === false) throw new Error('Google email not verified');

    const profile = {
      provider: 'google',
      sub: user.sub,
      email: cleanEmail(user.email),
      name: String(user.name || ''),
    };

    if (statePayload.flow === 'calendar') {
      let sessionUser = null;
      try {
        const sessionToken = cookies(req)[COOKIE];
        sessionUser = sessionToken ? jwt.verify(sessionToken, JWT) : null;
      } catch {}
      if (!sessionUser?.sub || sessionUser.sub !== statePayload.userId) {
        return res.redirect('/app?section=automation&calendar=auth_error');
      }

      const tenantId=String(statePayload.tenantId || '');
      if (!tenantId) return res.redirect('/app?section=automation&calendar=missing_tenant');
      const tr = await q(
        'SELECT * FROM tenants WHERE owner_user_id=$1 AND id=$2 AND active=true AND subscription_status IN (\'active\',\'trialing\')',
        [statePayload.userId,tenantId],
      );
      if (!tr.rowCount) return res.redirect('/app?section=automation&calendar=missing_tenant');
      const tenant = tr.rows[0];

      const accessToken = String(token.access_token || '');
      const refreshToken = String(token.refresh_token || '');
      const expiresAt = new Date(Date.now() + Number(token.expires_in || 3600) * 1000);
      const existingRefresh = tenant.google_calendar_refresh_token || null;

      if (!accessToken || (!refreshToken && !existingRefresh)) {
        return res.redirect('/app?section=automation&calendar=no_refresh_token');
      }

      await q(
        `UPDATE tenants
            SET google_calendar_access_token=$1,
                google_calendar_refresh_token=$2,
                google_calendar_token_expires_at=$3,
                google_calendar_email=$4,
                google_calendar_id=COALESCE(google_calendar_id,'primary'),
                updated_at=NOW()
          WHERE id=$5`,
        [
          encryptSecret(accessToken),
          refreshToken ? encryptSecret(refreshToken) : existingRefresh,
          expiresAt,
          profile.email,
          tenant.id,
        ],
      );
      return res.redirect('/app?section=automation&calendar=connected');
    }

    if (statePayload.flow === 'login') {
      const found = await q('SELECT * FROM users WHERE lower(email)=lower($1)', [profile.email]);
      if (!found.rowCount) return res.redirect('/kirjaudu?oauth_error=no_account&provider=google');
      if (found.rows[0].status === 'pending') return res.redirect('/kirjaudu?oauth_error=pending&provider=google');
      setSession(res, found.rows[0]);
      return res.redirect('/app');
    }

    setOauthProfile(res, profile);
    return res.redirect('/tilaus?oauth=google');
  } catch (e) {
    console.error('Google OAuth failed', e);
    if (statePayload.flow === 'calendar') {
      return res.redirect('/app?section=automation&calendar=failed');
    }
    return res.redirect(
      '/' + (statePayload.flow === 'signup' ? 'tilaus' : 'kirjaudu') +
      '?oauth_error=failed&provider=google'
    );
  }
}

async function resolveSignupCheckoutTarget(session) {
  const metadataUserId = String(session?.metadata?.user_id || '').trim();
  const metadataTenantId = String(session?.metadata?.tenant_id || '').trim();
  let userResult = metadataUserId
    ? await q(
        'SELECT id,email,status,subscription_status,stripe_subscription_id,active_tenant_id FROM users WHERE id=$1',
        [metadataUserId],
      )
    : { rowCount:0, rows:[] };

  if (userResult.rowCount) {
    return {
      userId:userResult.rows[0].id,
      tenantId:metadataTenantId,
      user:userResult.rows[0],
      recovered:false,
    };
  }

  const email = cleanEmail(session?.customer_details?.email || session?.customer_email || '');
  if (!email) return null;

  userResult = await q(
    'SELECT id,email,status,subscription_status,stripe_subscription_id,active_tenant_id FROM users WHERE lower(email)=lower($1) LIMIT 1',
    [email],
  );
  if (!userResult.rowCount) return null;

  const user = userResult.rows[0];
  const pendingTenant = await q(
    "SELECT id FROM tenants WHERE owner_user_id=$1 AND subscription_status='pending' ORDER BY created_at DESC LIMIT 1",
    [user.id],
  );
  return {
    userId:user.id,
    tenantId:pendingTenant.rows[0]?.id || user.active_tenant_id || metadataTenantId,
    user,
    recovered:true,
  };
}

async function syncStripeSubscriptionState(subscription) {
  if (!subscription?.id) return;
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;
  const cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);
  const status = String(subscription.status || '');
  const priceId = String(subscription.items?.data?.[0]?.price?.id || '');
  const plan = planFromStripePriceId(priceId);

  await q(
    `UPDATE tenants
        SET subscription_status=$1,
            current_period_end=$2,
            subscription_cancel_at_period_end=$3,
            subscription_plan=CASE WHEN $4<>'' THEN $4 ELSE subscription_plan END,
            active=CASE WHEN $1 IN ('active','trialing') THEN TRUE ELSE FALSE END,
            updated_at=NOW()
      WHERE stripe_subscription_id=$5`,
    [status, periodEnd, cancelAtPeriodEnd, plan, subscription.id],
  );
  await q(
    `UPDATE users
        SET subscription_status=$1,
            status=CASE WHEN $1 IN ('active','trialing') THEN 'active' ELSE status END,
            current_period_end=$2,
            subscription_cancel_at_period_end=$3,
            subscription_plan=CASE WHEN $4<>'' THEN $4 ELSE subscription_plan END,
            updated_at=NOW()
      WHERE stripe_subscription_id=$5`,
    [status, periodEnd, cancelAtPeriodEnd, plan, subscription.id],
  );
}

function stripeSubscriptionIdFromInvoice(invoice) {
  const direct = invoice?.subscription;
  if (typeof direct === 'string') return direct;
  if (direct?.id) return direct.id;

  const parent = invoice?.parent?.subscription_details?.subscription;
  if (typeof parent === 'string') return parent;
  return parent?.id || '';
}

async function lockStripeWebhookEvent(event) {
  if (!pool || !event?.id) return null;
  const client=await pool.connect();
  const lockKey='stripe-webhook:' + String(event.id);
  try {
    await client.query('SELECT pg_advisory_lock(hashtextextended($1,0))',[lockKey]);
    const existing=await client.query(
      'SELECT status FROM stripe_webhook_events WHERE event_id=$1 LIMIT 1',
      [event.id],
    );
    if (existing.rows[0]?.status === 'processed') {
      await client.query('SELECT pg_advisory_unlock(hashtextextended($1,0))',[lockKey]);
      client.release();
      return { duplicate:true, client:null, lockKey };
    }
    await client.query(
      `INSERT INTO stripe_webhook_events(event_id,event_type,status,attempts,last_error,updated_at)
       VALUES($1,$2,'processing',1,NULL,NOW())
       ON CONFLICT(event_id) DO UPDATE
         SET event_type=EXCLUDED.event_type,
             status='processing',
             attempts=stripe_webhook_events.attempts+1,
             last_error=NULL,
             updated_at=NOW()`,
      [event.id,String(event.type || '')],
    );
    return { duplicate:false, client, lockKey };
  } catch (e) {
    try { await client.query('SELECT pg_advisory_unlock(hashtextextended($1,0))',[lockKey]); } catch {}
    client.release();
    throw e;
  }
}

async function finishStripeWebhookEvent(lock,event,status,error='') {
  if (!lock?.client || !event?.id) return;
  try {
    await lock.client.query(
      `UPDATE stripe_webhook_events
          SET status=$1,
              processed_at=CASE WHEN $1='processed' THEN NOW() ELSE processed_at END,
              last_error=$2,
              updated_at=NOW()
        WHERE event_id=$3`,
      [status,String(error || '').slice(0,500) || null,event.id],
    );
  } finally {
    try { await lock.client.query('SELECT pg_advisory_unlock(hashtextextended($1,0))',[lock.lockKey]); } catch {}
    lock.client.release();
    lock.client=null;
  }
}

app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).send('Stripe not configured');

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return res.status(400).send('Invalid signature');
  }

  let eventLock=null;
  try {
    eventLock=await lockStripeWebhookEvent(event);
    if (eventLock?.duplicate) {
      return res.json({ received:true, duplicate:true });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (!(await enforceCompletedCheckoutCountryPolicy(session))) {
        return res.json({ received:true, taxCountryBlocked:true });
      }
      const target = await resolveSignupCheckoutTarget(session);
      const userId = target?.userId || '';
      let tenantId = target?.tenantId || '';
      if (userId) {
        let subscriptionStatus = 'active';
        let periodEnd = null;
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          subscriptionStatus = subscription.status;
          if (subscription.current_period_end) periodEnd = new Date(subscription.current_period_end * 1000);
        }
        const incomingSubscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id || null;
        if (
          session.metadata?.additional_workspace !== '1' &&
          incomingSubscriptionId &&
          target?.user?.stripe_subscription_id &&
          target.user.stripe_subscription_id !== incomingSubscriptionId &&
          ['active','trialing'].includes(String(target.user.subscription_status || ''))
        ) {
          try {
            await stripe.subscriptions.cancel(incomingSubscriptionId);
          } catch (duplicateCancelError) {
            console.error('Duplicate signup subscription cancellation failed', duplicateCancelError);
          }
          return res.json({ received:true, duplicateCheckout:true });
        }
        if (target?.recovered) {
          console.warn('Recovered checkout for recreated pending account', {
            sessionId:session.id,
            userId,
            tenantId,
          });
        }
        await q(
          `UPDATE users
             SET stripe_customer_id=COALESCE(stripe_customer_id,$1),
                 stripe_subscription_id=CASE WHEN $6='1' THEN stripe_subscription_id ELSE $2 END,
                 status=CASE WHEN $3 IN ('active','trialing') THEN 'active' ELSE status END,
                 subscription_status=CASE WHEN $6='1' THEN subscription_status ELSE $3 END,
                 current_period_end=CASE WHEN $6='1' THEN current_period_end ELSE $4 END,
                 updated_at=NOW()
           WHERE id=$5`,
          [session.customer, session.subscription, subscriptionStatus, periodEnd, userId, session.metadata?.additional_workspace || '0'],
        );
        if(tenantId){
          await q(
            `UPDATE tenants
                SET stripe_subscription_id=$1,
                    subscription_status=$2,
                    subscription_plan=COALESCE(subscription_plan,$3),
                    current_period_end=$4,
                    active=CASE WHEN $2 IN ('active','trialing') THEN TRUE ELSE FALSE END,
                    updated_at=NOW()
              WHERE id=$5 AND owner_user_id=$6`,
            [session.subscription,subscriptionStatus,session.metadata?.plan||null,periodEnd,tenantId,userId],
          );
        }

        try {
          await ensureReferralCode(userId);
          const subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription?.id || null;
          if (subscriptionId) await applyReferralDiscountIfEligible(userId, subscriptionId);
        } catch (e) {
          console.error('Referral activation from webhook failed', e);
        }

        if (session.metadata?.additional_workspace !== '1' && ['active','trialing'].includes(subscriptionStatus)) {
          try { await sendWelcomeEmailOnce(userId); } catch(e) { console.error('Welcome email after checkout webhook failed:',e?.message); }
        }

        if (session.metadata?.plan === 'owner_test') {
          const subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription?.id || null;
          try {
            await closeOwnerTestPlan(subscriptionId);
          } catch (e) {
            console.error('Owner test plan close from webhook failed', e);
          }
        }
      }
    }

    if (event.type === 'invoice.paid') {
      const invoice = event.data.object;
      if (Number(invoice.amount_paid || 0) > 0) {
        try {
          await sendStripeReceiptForInvoice(invoice.id, invoice.customer_email || '');
        } catch (e) {
          console.error('Stripe receipt email failed', e);
        }
      }

      const subscriptionId = stripeSubscriptionIdFromInvoice(invoice);
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await syncStripeSubscriptionState(subscription);
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const subscriptionId = stripeSubscriptionIdFromInvoice(invoice);
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await syncStripeSubscriptionState(subscription);
      }
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      await syncStripeSubscriptionState(event.data.object);
    }

    await finishStripeWebhookEvent(eventLock,event,'processed');
    eventLock=null;
    return res.json({ received: true });
  } catch (e) {
    if (eventLock?.client) {
      try { await finishStripeWebhookEvent(eventLock,event,'failed',e?.message || e); } catch {}
      eventLock=null;
    }
    console.error('Stripe webhook failed', e);
    return res.status(500).json({ error: 'Webhook failed' });
  }
});

app.use(helmet({
  contentSecurityPolicy:{
    directives:{
      defaultSrc:["'self'"],
      baseUri:["'self'"],
      objectSrc:["'none'"],
      frameAncestors:["'none'"],
      formAction:["'self'"],
      scriptSrc:["'self'","'unsafe-inline'"],
      styleSrc:["'self'","'unsafe-inline'"],
      imgSrc:["'self'","data:","blob:"],
      fontSrc:["'self'","data:"],
      connectSrc:["'self'"],
      workerSrc:["'self'","blob:"],
      manifestSrc:["'self'"],
      upgradeInsecureRequests:[],
    },
  },
  crossOriginResourcePolicy:{ policy:'cross-origin' },
}));

function rejectCrossSiteAuthenticatedMutation(req,res,next) {
  if (!/^(?:POST|PUT|PATCH|DELETE)$/i.test(req.method)) return next();
  if (!req.path.startsWith('/api/app/')) return next();

  const fetchSite=String(req.headers['sec-fetch-site'] || '').toLowerCase();
  if (fetchSite === 'cross-site') {
    return res.status(403).json({ error:'Pyyntö estettiin turvallisuussyistä.' });
  }

  const originValue=String(req.headers.origin || '').trim();
  if (originValue) {
    try {
      const requestHost=normalizeHost(new URL(originValue).hostname);
      const canonicalHost=normalizeHost(new URL(BASE).hostname);
      if (requestHost && canonicalHost && requestHost !== canonicalHost) {
        return res.status(403).json({ error:'Pyyntö estettiin turvallisuussyistä.' });
      }
    } catch {
      return res.status(403).json({ error:'Pyyntö estettiin turvallisuussyistä.' });
    }
  }
  return next();
}

app.use(rejectCrossSiteAuthenticatedMutation);

app.use(express.json({
  limit:'1mb',
  verify(req,res,buf) {
    req.rawBody = Buffer.from(buf);
  },
}));
app.use(express.urlencoded({ extended: false }));
app.use(express.text({ type: 'text/plain', limit: '20kb' }));
app.use(rateLimit({ windowMs:60000, limit:600, standardHeaders:true, legacyHeaders:false, keyGenerator:req=>publicRateKey(req,'global') }));
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests:true,
  standardHeaders:true,
  legacyHeaders:false,
  keyGenerator:req=>accountRateKey(req,'login'),
  message:{ error:'Liian monta kirjautumisyritystä. Yritä myöhemmin uudelleen.' },
});
const signupVerificationRequestLimiter = rateLimit({
  windowMs:15 * 60 * 1000,
  limit:5,
  standardHeaders:true,
  legacyHeaders:false,
  keyGenerator:req=>accountRateKey(req,'signup-email-request'),
  message:{ error:'Liian monta vahvistuspyyntöä. Yritä myöhemmin uudelleen.' },
});
const signupVerificationConfirmLimiter = rateLimit({
  windowMs:15 * 60 * 1000,
  limit:12,
  standardHeaders:true,
  legacyHeaders:false,
  keyGenerator:req=>accountRateKey(req,'signup-email-confirm'),
  message:{ error:'Liian monta vahvistusyritystä. Yritä myöhemmin uudelleen.' },
});
const checkoutLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 12,
  standardHeaders:true,
  legacyHeaders:false,
  keyGenerator:req=>accountRateKey(req,'checkout'),
  message:{ error:'Liian monta tilausyritystä. Yritä hetken kuluttua uudelleen.' },
});
app.get('/index.html', (req,res) => res.redirect(301, SEO_CANONICAL_ORIGIN + '/'));

app.get('/robots.txt', (req,res) => {
  const robots = [
    'User-agent: OAI-SearchBot',
    'Allow: /',
    '',
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /app',
    'Disallow: /kirjaudu',
    'Disallow: /tilaus',
    'Disallow: /maksu-valmis',
    'Disallow: /assistant',
    '',
    'Sitemap: ' + SEO_CANONICAL_ORIGIN + '/sitemap.xml',
    'Host: ' + new URL(SEO_CANONICAL_ORIGIN).host,
    ''
  ].join('\n');
  res.setHeader('Cache-Control','public, max-age=3600');
  res.type('text/plain').send(robots);
});

app.get('/sitemap.xml', (req,res) => {
  const lastmod = new Date().toISOString().slice(0,10);
  const basePaths = ['/', '/ominaisuudet', '/asiakaspalvelubotti', '/verkkokauppa-chatbot', '/ajanvaraus-chatbot', '/hinnat', '/yhteystiedot', '/tietoturva', '/kayttoehdot', '/tietosuoja', '/evasteet', '/dpa'];
  const escapeXml = (value) => String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
  const rows = [];
  for (const basePath of basePaths) {
    const urls = seoLanguageUrls(basePath);
    for (const lang of ['fi','sv','en']) {
      const loc = urls[lang];
      rows.push(
        '  <url>\n' +
        '    <loc>' + escapeXml(loc) + '</loc>\n' +
        '    <lastmod>' + lastmod + '</lastmod>\n' +
        '    <changefreq>' + (basePath === '/' ? 'weekly' : 'monthly') + '</changefreq>\n' +
        '    <priority>' + (basePath === '/' ? '1.0' : basePath === '/ominaisuudet' ? '0.9' : ['/asiakaspalvelubotti','/verkkokauppa-chatbot','/ajanvaraus-chatbot'].includes(basePath) ? '0.8' : '0.5') + '</priority>\n' +
        '    <xhtml:link rel="alternate" hreflang="fi" href="' + escapeXml(urls.fi) + '" />\n' +
        '    <xhtml:link rel="alternate" hreflang="sv" href="' + escapeXml(urls.sv) + '" />\n' +
        '    <xhtml:link rel="alternate" hreflang="en" href="' + escapeXml(urls.en) + '" />\n' +
        '    <xhtml:link rel="alternate" hreflang="x-default" href="' + escapeXml(urls.fi) + '" />\n' +
        '  </url>'
      );
    }
  }
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    rows.join('\n') + '\n</urlset>\n';
  res.setHeader('Cache-Control','public, max-age=3600');
  res.type('application/xml').send(xml);
});

app.get('/llms.txt', (req,res) => {
  const text = [
    '# Respondo AI',
    '',
    '> Respondo AI is a Finnish B2B web application for automated website customer service. It answers visitors using company-specific approved information and supports human takeover and customer-service workflows.',
    '',
    'Canonical website: ' + SEO_CANONICAL_ORIGIN + '/',
    'Languages: Finnish, Swedish, English',
    '',
    '## Core capabilities',
    '- Website customer service bot available 24/7',
    '- Company knowledge base and website information import',
    '- Lead and contact-request capture',
    '- Booking requests and calendar workflows',
    '- Human takeover with employee accounts',
    '- Multilingual customer conversations',
    '- Shopify and WooCommerce commerce workflows',
    '',
    '## Public pages',
    '- Homepage: ' + SEO_CANONICAL_ORIGIN + '/',
    '- Features (Finnish): ' + SEO_CANONICAL_ORIGIN + '/ominaisuudet',
    '- Features (Swedish): ' + SEO_CANONICAL_ORIGIN + '/funktioner',
    '- Features (English): ' + SEO_CANONICAL_ORIGIN + '/features',
    '- Customer service bot: ' + SEO_CANONICAL_ORIGIN + '/asiakaspalvelubotti',
    '- Ecommerce chatbot: ' + SEO_CANONICAL_ORIGIN + '/verkkokauppa-chatbot',
    '- Booking chatbot: ' + SEO_CANONICAL_ORIGIN + '/ajanvaraus-chatbot',
    '- Security: ' + SEO_CANONICAL_ORIGIN + '/tietoturva',
    '- Privacy: ' + SEO_CANONICAL_ORIGIN + '/tietosuoja',
    '- Terms: ' + SEO_CANONICAL_ORIGIN + '/kayttoehdot',
    '- Data processing: ' + SEO_CANONICAL_ORIGIN + '/dpa',
    '',
    '## Pricing',
    '- Starter: EUR 29.90/month',
    '- Advanced: EUR 39.90/month',
    '- Business: EUR 49.90/month',
    '- A 3-day free trial is offered on the public website.',
    '',
    'For current product claims, pricing and policies, use the canonical public pages above as the source of truth.',
    ''
  ].join('\\n');
  res.setHeader('Cache-Control','public, max-age=3600');
  res.type('text/plain').send(text);
});

app.use(express.static(path.join(__dirname, 'public'), {
  index:false,
  setHeaders(res, filePath) {
    if (
      filePath.endsWith('widget.js') ||
      filePath.endsWith('app.js') ||
      filePath.endsWith('effects.js') ||
      filePath.endsWith('import-email.mjs') ||
      filePath.endsWith('index.html')
    ) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  },
}));

app.get(['/favicon.ico','/apple-touch-icon.png','/apple-touch-icon-precomposed.png'], (req,res) => {
  res.setHeader('Cache-Control','public, max-age=86400');
  return res.sendFile(path.join(__dirname,'public','favicon.svg'));
});

const i18nCache = new Map();
const i18nLimiter = rateLimit({ windowMs:60*1000, limit:24, standardHeaders:true, legacyHeaders:false, keyGenerator:req=>publicRateKey(req,'i18n') });
app.post('/api/i18n/translate', i18nLimiter, async (req,res) => {
  try {
    const lang = ['sv','en'].includes(String(req.body?.lang || '').toLowerCase()) ? String(req.body.lang).toLowerCase() : 'fi';
    const texts = Array.isArray(req.body?.texts) ? req.body.texts.map((x) => String(x || '').trim().slice(0,5000)).filter(Boolean).slice(0,160) : [];
    if (lang === 'fi' || !texts.length) return res.json({ translations:texts });
    const translations = new Array(texts.length);
    const pending = [];
    const pendingIndexes = [];
    texts.forEach((text,index) => {
      const key = lang + ':' + text;
      if (i18nCache.has(key)) translations[index] = i18nCache.get(key);
      else { pending.push(text); pendingIndexes.push(index); }
    });
    if (pending.length) {
      const translatedBatch = await Promise.all(pending.map((text) => translateTextFree(text, lang, 'auto')));
      // UI translation is an enhancement, not a reason to make the interface
      // fail. If the free translation provider is temporarily unavailable,
      // preserve the original text and return HTTP 200 so language switching
      // and error rendering keep working.
      translatedBatch.forEach((value,i) => {
        const translated = String(value || pending[i] || '').slice(0,8000);
        translations[pendingIndexes[i]] = translated;
        if (value) i18nCache.set(lang + ':' + pending[i], translated);
      });
      if (i18nCache.size > 4000) {
        const keys=[...i18nCache.keys()].slice(0,1000); keys.forEach((key)=>i18nCache.delete(key));
      }
    }
    return res.json({ translations });
  } catch (e) {
    console.error('UI translation failed',e);
    return res.status(500).json({ error:'Translation failed' });
  }
});

function rateLimitBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.length <= 20000) {
    try { return JSON.parse(req.body); } catch {}
  }
  return {};
}

function publicRateKey(req,scope='public') {
  const forwarded=String(
    req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.headers['cf-connecting-ip'] ||
    ''
  ).split(',')[0].trim();
  const expressIp=String(req.ip || req.socket?.remoteAddress || '').trim();
  const clientIp=(expressIp && expressIp !== '0.0.0.0' && expressIp !== '::')
    ? expressIp
    : forwarded;
  const ua=String(req.headers['user-agent'] || '').slice(0,240);
  const host=String(req.headers.host || '').slice(0,200);
  const body=rateLimitBody(req);
  const visitor=String(body.visitorRef || body.demoImportId || req.query?.visitorRef || '').slice(0,200);
  const token=String(body.widgetToken || req.query?.widgetToken || '').slice(-160);
  const slug=String(req.params?.slug || '').slice(0,120);
  return crypto.createHash('sha256')
    .update([scope,clientIp,host,ua,slug,visitor,token].join('|'))
    .digest('hex');
}

function accountRateKey(req,scope='account') {
  const body=rateLimitBody(req);
  const email=cleanEmail(body.email || '');
  return crypto.createHash('sha256')
    .update(publicRateKey(req,scope)+'|'+email)
    .digest('hex');
}

const publicReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  keyGenerator:req => publicRateKey(req,'read'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Liian monta pyyntöä. Yritä hetken kuluttua uudelleen.' },
});
const siteVisitLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  keyGenerator:req => publicRateKey(req,'visit'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Liian monta pyyntöä. Yritä hetken kuluttua uudelleen.' },
});
const paymentVerifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator:req => publicRateKey(req,'payment-verify'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Liian monta maksun vahvistusyritystä. Yritä hetken kuluttua uudelleen.' },
});
const channelApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  keyGenerator:req => publicRateKey(req,'channel'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Liian monta kanavapyyntöä. Yritä hetken kuluttua uudelleen.' },
});
const publicChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 35,
  keyGenerator:req => publicRateKey(req,'chat'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Liian monta viestiä. Yritä hetken kuluttua uudelleen.' },
});
const publicContactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator:req => publicRateKey(req,'contact'),
  message: { error:'Liian monta yhteydenottoa. Yritä myöhemmin uudelleen.' },
});
const demoChatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  keyGenerator:req => publicRateKey(req,'demo-chat'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demon viestiraja tuli täyteen. Yritä myöhemmin uudelleen.' },
});
const demoImportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false,
  // Railway can surface the edge address as 0.0.0.0 for public requests.
  // Include the target website and forwarded client metadata so unrelated
  // visitors do not consume one shared demo-import quota.
  keyGenerator(req) {
    const website=normalizeHost(req.body?.website||'') || String(req.body?.website||'').trim().toLowerCase();
    return crypto.createHash('sha256').update(publicRateKey(req,'demo-import')+'|'+website).digest('hex');
  },
  message: { error: 'Demon verkkosivuhakuja on tehty liian monta. Yritä hetken kuluttua uudelleen.' },
});

app.get('/api/health', async (req, res) => {
  const stripeConfigured =
    Boolean(stripe && process.env.STRIPE_WEBHOOK_SECRET) &&
    productionStripePricesConfigured();
  const health = {
    ok: Boolean(pool) && stripeConfigured,
    service: 'RESPONDO AI',
    database: Boolean(pool),
    stripe: stripeConfigured,
  };
  if (pool) {
    try {
      await pool.query('SELECT 1');
    } catch {
      health.ok = false;
      health.database = false;
    }
  }
  res.status(health.ok ? 200 : 503).json(health);
});



app.post('/api/public/site-visit', siteVisitLimiter, async (req, res) => {
  try {
    if (!pool) return res.status(204).end();

    const ua = String(req.headers['user-agent'] || '');
    if (!ua || isLikelyBotUserAgent(ua)) return res.status(204).end();

    try {
      const token = cookies(req)[COOKIE];
      if (token) {
        const session = jwt.verify(token, JWT);
        const ownerEmail = cleanEmail(process.env.OWNER_EMAIL || process.env.SUPPORT_EMAIL);
        if (ownerEmail && cleanEmail(session?.email) === ownerEmail) {
          return res.status(204).end();
        }
      }
    } catch {}

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const visitPath = String(body.path || '/').trim().slice(0, 500) || '/';
    if (/^\/(?:api|app|kirjaudu|traffic(?:\.html)?)(?:\/|$)/i.test(visitPath)) {
      return res.status(204).end();
    }

    const referrer = String(body.referrer || '').trim().slice(0, 1000);
    const visitorHash = trafficVisitorHash(req);
    if (!visitorHash) return res.status(204).end();

    const rawLanguage = String(body.language || '').trim().toLowerCase().split('-')[0];
    const visitLanguage = ['fi','sv','en'].includes(rawLanguage) ? rawLanguage : null;

    if (body.updateLanguage === true && visitLanguage) {
      await q(
        `UPDATE site_visits
            SET language=$1
          WHERE id=(
            SELECT id
              FROM site_visits
             WHERE visitor_hash=$2
               AND path=$3
               AND created_at >= NOW() - INTERVAL '2 hours'
             ORDER BY created_at DESC
             LIMIT 1
          )`,
        [visitLanguage, visitorHash, visitPath],
      );
      return res.status(204).end();
    }

    await q(
      "INSERT INTO site_visits(id,visitor_hash,path,referrer,referrer_host,utm_source,utm_medium,utm_campaign,language) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [
        uid(),
        visitorHash,
        visitPath,
        referrer || null,
        trafficReferrerHost(referrer) || null,
        String(body.utmSource || '').trim().slice(0, 120) || null,
        String(body.utmMedium || '').trim().slice(0, 120) || null,
        String(body.utmCampaign || '').trim().slice(0, 180) || null,
        visitLanguage,
      ],
    );
    return res.status(204).end();
  } catch (e) {
    console.error('Site visit tracking failed', e?.message || e);
    return res.status(204).end();
  }
});

app.get('/api/owner/traffic', auth, ownerTrafficOnly, async (req, res) => {
  try {
    const summary = await q(
      "SELECT COUNT(*)::int AS total_views, COUNT(DISTINCT visitor_hash)::int AS total_unique, COUNT(*) FILTER (WHERE created_at >= (CURRENT_DATE AT TIME ZONE 'Europe/Helsinki'))::int AS today_views, COUNT(DISTINCT visitor_hash) FILTER (WHERE created_at >= (CURRENT_DATE AT TIME ZONE 'Europe/Helsinki'))::int AS today_unique, COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS week_views, COUNT(DISTINCT visitor_hash) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS week_unique, COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS month_views, COUNT(DISTINCT visitor_hash) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS month_unique FROM site_visits"
    );

    const daily = await q(
      "SELECT TO_CHAR(created_at AT TIME ZONE 'Europe/Helsinki','YYYY-MM-DD') AS day, COUNT(*)::int AS views, COUNT(DISTINCT visitor_hash)::int AS visitors FROM site_visits WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY 1 ORDER BY 1 ASC"
    );

    const pages = await q(
      "SELECT path, COUNT(*)::int AS views, COUNT(DISTINCT visitor_hash)::int AS visitors FROM site_visits WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY path ORDER BY views DESC, path ASC LIMIT 12"
    );

    const sources = await q(
      "SELECT COALESCE(NULLIF(utm_source,''), NULLIF(referrer_host,''), 'Suora') AS source, COUNT(*)::int AS views, COUNT(DISTINCT visitor_hash)::int AS visitors FROM site_visits WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY 1 ORDER BY views DESC, source ASC LIMIT 12"
    );

    const languages = await q(
      "SELECT COALESCE(NULLIF(language,''),'unknown') AS language, COUNT(*)::int AS views, COUNT(DISTINCT visitor_hash)::int AS visitors FROM site_visits WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY 1 ORDER BY views DESC, language ASC"
    );

    return res.json({
      summary: summary.rows[0] || {},
      daily: daily.rows,
      pages: pages.rows,
      sources: sources.rows,
      languages: languages.rows,
      generatedAt: new Date().toISOString(),
      note: 'Kävijä on pseudonyymi selain/IP-yhdistelmä. Raakaa IP-osoitetta ei tallenneta.',
    });
  } catch (e) {
    console.error('Owner traffic stats failed', e);
    return res.status(500).json({ error: 'Kävijätilastojen lataaminen epäonnistui.' });
  }
});

/* Owner-only company registry for the private traffic dashboard.
   List subscribed/onboarded tenants, not unverified pending signups or owner test checkouts.
   Pagination ensures the dashboard stays fast as the customer base grows. */
app.get('/api/owner/companies', auth, ownerTrafficOnly, async (req, res) => {
  res.set('Cache-Control','private, no-store');
  try {
    const pageSize=25;
    const requestedPage=Number.parseInt(String(req.query.page||'1'),10);
    const page=Number.isFinite(requestedPage)?Math.max(1,Math.min(10000,requestedPage)):1;
    const search=String(req.query.search||'').trim().slice(0,100);
    const requestedStatus=String(req.query.status||'all').toLowerCase();
    const status=['all','active','trialing','ended'].includes(requestedStatus)?requestedStatus:'all';

    const baseSql=`
      SELECT t.id,t.name,t.business_id,t.website,t.subscription_plan,
             t.subscription_status,t.created_at,
             CASE
               WHEN t.active=true AND u.status='active'
                 AND t.subscription_status='trialing'
                 AND (COALESCE(t.subscription_cancel_at_period_end,false)=false
                      OR t.current_period_end IS NULL OR t.current_period_end>NOW())
                 THEN 'trialing'
               WHEN t.active=true AND u.status='active'
                 AND t.subscription_status='active'
                 AND (COALESCE(t.subscription_cancel_at_period_end,false)=false
                      OR t.current_period_end IS NULL OR t.current_period_end>NOW())
                 THEN 'active'
               ELSE 'ended'
             END AS usage_status
        FROM tenants t
        JOIN users u ON u.id=t.owner_user_id
       WHERE COALESCE(t.subscription_status,'pending') NOT IN ('pending','incomplete','incomplete_expired')
         AND COALESCE(t.subscription_plan,'')<>'owner_test'
         AND u.status<>'pending'`;
    const filterSql=`($1='' OR name ILIKE '%' || $1 || '%'
                    OR COALESCE(business_id,'') ILIKE '%' || $1 || '%'
                    OR COALESCE(website,'') ILIKE '%' || $1 || '%')
                   AND ($2='all' OR usage_status=$2)`;

    const [overview,matching,items]=await Promise.all([
      q(`SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER(WHERE usage_status='active')::int AS active,
                COUNT(*) FILTER(WHERE usage_status='trialing')::int AS trialing,
                COUNT(*) FILTER(WHERE usage_status='ended')::int AS ended
           FROM (${baseSql}) company_list`),
      q(`SELECT COUNT(*)::int AS total FROM (${baseSql}) company_list WHERE ${filterSql}`,[search,status]),
      q(`SELECT id,name,business_id,website,subscription_plan,usage_status,created_at
           FROM (${baseSql}) company_list
          WHERE ${filterSql}
          ORDER BY created_at DESC,id DESC
          LIMIT $3 OFFSET $4`,[search,status,pageSize,(page-1)*pageSize]),
    ]);
    const total=Number(matching.rows[0]?.total||0);
    return res.json({
      summary:overview.rows[0]||{total:0,active:0,trialing:0,ended:0},
      companies:items.rows,
      pagination:{page,pageSize,total,totalPages:Math.max(1,Math.ceil(total/pageSize))},
    });
  } catch (e) {
    console.error('Owner company listing failed',e?.message||e);
    return res.status(500).json({error:'Yritysluetteloa ei voitu ladata.'});
  }
});


/* Administrative actions are intentionally restricted to the dedicated Respondo
   owner session; editing does not alter billing plans or payment records. */
app.patch('/api/owner/companies/:tenantId', auth, ownerTrafficOnly, loginLimiter, async (req,res) => {
  res.set('Cache-Control','private, no-store');
  const id=String(req.params.tenantId||'');
  const name=String(req.body?.name||'').trim();
  const businessId=String(req.body?.businessId||'').trim();
  const websiteRaw=String(req.body?.website||'').trim();
  const website=websiteRaw ? normalizeWebUrl(websiteRaw,true) : '';
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id)
    || name.length<2 || name.length>120 || /[<>]/.test(name)
    || businessId.length>40 || /[<>]/.test(businessId)
    || websiteRaw.length>260 || (websiteRaw && !website)
    || (website && !/^https:\/\//i.test(website))) {
    return res.status(400).json({error:'Tarkista yrityksen nimi, Y-tunnus ja HTTPS-verkkosivusto.'});
  }
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const existing=await client.query(
      "SELECT id,owner_user_id,subscription_status FROM tenants WHERE id=$1 AND COALESCE(subscription_status,'pending') NOT IN ('pending','incomplete','incomplete_expired') FOR UPDATE",
      [id]
    );
    if(!existing.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'Yritystä ei löytynyt.'});}
    const update=await client.query(
      "UPDATE tenants SET name=$1,business_id=$2,website=$3,updated_at=NOW() WHERE id=$4 RETURNING id,name,business_id,website",
      [name,businessId||null,website||null,id]
    );
    // Preserve the account's current selected-company display information.
    await client.query(
      "UPDATE users SET company_name=$1,business_id=$2,updated_at=NOW() WHERE id=$3 AND active_tenant_id=$4",
      [name,businessId||null,existing.rows[0].owner_user_id,id]
    );
    await client.query('COMMIT');
    return res.json({ok:true,company:update.rows[0]});
  }catch(error){
    try{await client.query('ROLLBACK');}catch{}
    console.error('Owner company edit failed',error?.message||error);
    return res.status(500).json({error:'Yrityksen tietojen muokkaus epäonnistui.'});
  }finally{client.release();}
});

/* Explicit destructive confirmation: matching company name and current owner
   password required. Cancel the exact Stripe subscription before removing
   tenant-dependent data; never alter another workspace's subscription. */
app.delete('/api/owner/companies/:tenantId', auth, ownerTrafficOnly, loginLimiter, async (req,res) => {
  res.set('Cache-Control','private, no-store');
  const id=String(req.params.tenantId||'');
  const confirmation=String(req.body?.confirmName||'').trim();
  const password=String(req.body?.password||'');
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id) || !confirmation || !password || password.length>200)
    return res.status(400).json({error:'Kirjoita yrityksen nimi ja vahvista poistaminen omalla salasanallasi.'});
  if(!pool)return res.status(503).json({error:'Tietokanta ei ole käytettävissä.'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const admin=await client.query('SELECT password_hash FROM users WHERE id=$1 FOR UPDATE',[req.user.sub]);
    if(!admin.rowCount || !admin.rows[0].password_hash || !(await bcrypt.compare(password,admin.rows[0].password_hash))){
      await client.query('ROLLBACK');
      return res.status(403).json({error:'Omistajatilin salasana on väärä tai sitä ei ole asetettu.'});
    }
    const target=await client.query(
      "SELECT t.id,t.name,t.owner_user_id,t.stripe_subscription_id, t.subscription_status,"+
      " u.stripe_customer_id,u.stripe_subscription_id AS user_subscription_id,u.active_tenant_id"+
      " FROM tenants t JOIN users u ON u.id=t.owner_user_id WHERE t.id=$1 FOR UPDATE OF t,u",
      [id]
    );
    if(!target.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'Yritystä ei löytynyt.'});}
    const tenant=target.rows[0];
    if(confirmation!==tenant.name){
      await client.query('ROLLBACK');
      return res.status(400).json({error:'Yrityksen nimi ei täsmää. Poistoa ei tehty.'});
    }
    let subscriptionId=tenant.stripe_subscription_id;
    // Legacy: if the only tenant's Stripe ID is stored on users, use exactly it.
    if(!subscriptionId && tenant.user_subscription_id){
      const linked=await client.query(
        "SELECT COUNT(*)::int AS count FROM tenants WHERE owner_user_id=$1 AND id<>$2",
        [tenant.owner_user_id,id]
      );
      if(Number(linked.rows[0]?.count||0)>0){
        await client.query('ROLLBACK');
        return res.status(409).json({error:'Tilausta ei voitu yhdistää tähän yritykseen varmasti. Poisto estettiin.'});
      }
      subscriptionId=tenant.user_subscription_id;
    }
    if(subscriptionId){
      const other=await client.query('SELECT 1 FROM tenants WHERE stripe_subscription_id=$1 AND id<>$2 LIMIT 1',[subscriptionId,id]);
      if(other.rowCount){
        await client.query('ROLLBACK');
        return res.status(409).json({error:'Stripe-tilaus kuuluu myös toiselle yritykselle. Poisto estettiin.'});
      }
    }
    // A live Stripe subscription must never be orphaned by deleting its company.
    if(!subscriptionId && ['active','trialing'].includes(String(tenant.subscription_status||'')) && tenant.stripe_customer_id){
      await client.query('ROLLBACK');
      return res.status(409).json({error:'Aktiivisen tilauksen Stripe-tunnistetta ei löytynyt. Poisto estettiin turvallisuussyistä.'});
    }
    const canceledSubscriptions=await cancelOwnedSubscriptionsForDeletion([subscriptionId],tenant.stripe_customer_id);
    // Move a user's selected tenant away before the target is deleted,
    // including databases that enforce a foreign-key on active_tenant_id.
    const next=await client.query(
      "SELECT id,name,business_id FROM tenants WHERE owner_user_id=$1 AND id<>$2 AND active=true AND subscription_status IN ('active','trialing') ORDER BY created_at ASC LIMIT 1",
      [tenant.owner_user_id,id]
    );
    await client.query(
      "UPDATE users SET active_tenant_id=CASE WHEN active_tenant_id=$2 THEN $3 ELSE active_tenant_id END,"+
      " company_name=CASE WHEN active_tenant_id=$2 THEN $4 ELSE company_name END,"+
      " business_id=CASE WHEN active_tenant_id=$2 THEN $5 ELSE business_id END,"+
      " stripe_subscription_id=CASE WHEN stripe_subscription_id=$6 THEN NULL ELSE stripe_subscription_id END,"+
      " subscription_status=CASE WHEN stripe_subscription_id=$6 THEN NULL ELSE subscription_status END,"+
      " subscription_plan=CASE WHEN stripe_subscription_id=$6 THEN NULL ELSE subscription_plan END,"+
      " current_period_end=CASE WHEN stripe_subscription_id=$6 THEN NULL ELSE current_period_end END,"+
      " updated_at=NOW() WHERE id=$1",
      [tenant.owner_user_id,id,next.rows[0]?.id||null,next.rows[0]?.name||'Yritys',next.rows[0]?.business_id||null,subscriptionId||'__no_subscription__']
    );
    await client.query('DELETE FROM tenants WHERE id=$1',[id]);
    await client.query('COMMIT');
    return res.json({ok:true,deletedTenantId:id,canceledSubscriptions});
  }catch(error){
    try{await client.query('ROLLBACK');}catch{}
    console.error('Owner company removal failed',error?.message||error);
    return res.status(503).json({error:'Yrityksen poistaminen ei onnistunut. Tarkista tilauksen tila ennen uutta yritystä.'});
  }finally{client.release();}
});

app.get('/robots.txt', (req, res) => {
  res.setHeader('Cache-Control','public, max-age=3600');
  res.type('text/plain').send([
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    '',
    'User-agent: OAI-SearchBot',
    'Allow: /',
    '',
    'User-agent: ChatGPT-User',
    'Allow: /',
    '',
    'User-agent: PerplexityBot',
    'Allow: /',
    '',
    'Sitemap: ' + SEO_CANONICAL_ORIGIN + '/sitemap.xml',
  ].join('\n'));
});

app.get('/sitemap.xml', (req, res) => {
  const lastmod = new Date().toISOString().slice(0,10);
  const groups = [
    { path:'/', changefreq:'weekly', priority:'1.0' },
    { path:'/ominaisuudet', changefreq:'weekly', priority:'0.9', feature:true },
    { path:'/tietoturva', changefreq:'monthly', priority:'0.7' },
    { path:'/tietosuoja', changefreq:'monthly', priority:'0.5' },
    { path:'/kayttoehdot', changefreq:'monthly', priority:'0.5' },
    { path:'/evasteet', changefreq:'monthly', priority:'0.4' },
    { path:'/dpa', changefreq:'monthly', priority:'0.5' },
  ];
  const urls = [];
  for (const group of groups) {
    const alternates = group.feature
      ? [
          ['fi', SEO_CANONICAL_ORIGIN + '/ominaisuudet'],
          ['sv', SEO_CANONICAL_ORIGIN + '/funktioner'],
          ['en', SEO_CANONICAL_ORIGIN + '/features'],
        ]
      : [
          ['fi', SEO_CANONICAL_ORIGIN + group.path],
          ['sv', SEO_CANONICAL_ORIGIN + group.path + '?lang=sv'],
          ['en', SEO_CANONICAL_ORIGIN + group.path + '?lang=en'],
        ];
    for (const [, loc] of alternates) {
      urls.push(
        '  <url>\n' +
        '    <loc>' + escapeHtml(loc) + '</loc>\n' +
        '    <lastmod>' + lastmod + '</lastmod>\n' +
        '    <changefreq>' + group.changefreq + '</changefreq>\n' +
        '    <priority>' + group.priority + '</priority>\n' +
        alternates.map(([lang, href]) =>
          '    <xhtml:link rel="alternate" hreflang="' + lang + '" href="' + escapeHtml(href) + '" />'
        ).join('\n') + '\n' +
        '    <xhtml:link rel="alternate" hreflang="x-default" href="' + escapeHtml(alternates[0][1]) + '" />\n' +
        '  </url>'
      );
    }
  }
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    urls.join('\n') +
    '\n</urlset>';
  res.setHeader('Cache-Control','public, max-age=3600');
  res.type('application/xml').send(xml);
});

app.get('/llms.txt', (req, res) => {
  res.setHeader('Cache-Control','public, max-age=3600');
  res.type('text/plain').send(`# Respondo AI

> Respondo AI is B2B AI customer service software for business websites. The official and canonical website is https://www.respondoai.fi/.

## Product
- Website customer service bot that answers 24/7 using company-approved information.
- Company-managed Q&A knowledge base.
- Website information import on supported plans.
- Contact and quote request capture.
- Booking workflows and human takeover.
- Customer conversations in Finnish, Swedish and English.
- Ecommerce workflows for supported Shopify and WooCommerce setups.

## Pricing
- Starter: 29.90 EUR/month.
- Advanced: 39.90 EUR/month.
- Business: 49.90 EUR/month.
- Free trial: 3 days.

## Official sources
- Homepage: https://www.respondoai.fi/
- Features (Finnish): https://www.respondoai.fi/ominaisuudet
- Features (Swedish): https://www.respondoai.fi/funktioner
- Features (English): https://www.respondoai.fi/features
- Security: https://www.respondoai.fi/tietoturva
- Privacy: https://www.respondoai.fi/tietosuoja
- Terms: https://www.respondoai.fi/kayttoehdot
- Data processing: https://www.respondoai.fi/dpa

## Brand disambiguation
Use https://www.respondoai.fi/ as the canonical source for this Respondo AI product. Railway deployment addresses are technical hosting endpoints and are not canonical product sources.
`);
});

app.get('/llms-full.txt', (req, res) => {
  res.setHeader('Cache-Control','public, max-age=3600');
  res.type('text/plain').send(`# Respondo AI — product reference

Canonical domain: https://www.respondoai.fi/
Category: B2B customer service software / AI website chatbot.
Languages: Finnish, Swedish and English.

Respondo AI is installed on a company's website and answers customer questions using information approved by that company. Businesses can maintain their own knowledge base, collect contact and quote requests, support booking flows and transfer conversations to human customer-service staff.

Plans:
- Starter 29.90 EUR/month: core website bot, customer-managed Q&A knowledge, booking support and 2 customer-service seats.
- Advanced 39.90 EUR/month: Starter features plus website information import and 10 customer-service seats.
- Business 49.90 EUR/month: all current product features and 20 customer-service seats.
A 3-day free trial is available.

Official URLs:
https://www.respondoai.fi/
https://www.respondoai.fi/ominaisuudet
https://www.respondoai.fi/funktioner
https://www.respondoai.fi/features
https://www.respondoai.fi/tietoturva
https://www.respondoai.fi/tietosuoja
https://www.respondoai.fi/kayttoehdot
https://www.respondoai.fi/dpa
`);
});

app.get('/api/app/google-calendar/start', auth, ownerOnly, subscribed, async (req,res) => {
  if (process.env.NODE_ENV === 'production' &&
      String(req.hostname || '').toLowerCase() !== 'www.respondoai.fi') {
    // Sessions and OAuth state cookies cannot cross between Railway and www.
    // Ask to sign in on the canonical domain before authorizing Calendar.
    return res.redirect(302, 'https://www.respondoai.fi/kirjaudu?next=calendar');
  }
  if(!await requirePlanCapability(req,res,'googleCalendar')) return;
  const cfg = oauthConfig('google');
  if (!cfg.configured) return res.redirect('/app?section=automation&calendar=not_configured');

  const activeTenant=await q(
    'SELECT id FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1) LIMIT 1',
    [req.user.sub],
  );
  if (!activeTenant.rowCount) return res.redirect('/app?section=automation&calendar=missing_tenant');

  const nonce = crypto.randomBytes(20).toString('hex');
  const state = jwt.sign({
    provider:'google',
    flow:'calendar',
    nonce,
    userId:req.user.sub,
    tenantId:activeTenant.rows[0].id,
  },JWT,{ expiresIn:'10m' });
  setOauthState(res,nonce,'google');

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id:cfg.clientId,
    redirect_uri:cfg.redirectUri,
    response_type:'code',
    scope:'openid email profile https://www.googleapis.com/auth/calendar.events',
    state,
    prompt:'consent',
    access_type:'offline',
    include_granted_scopes:'true',
  }).toString();
  return res.redirect(url.toString());
});

app.post('/api/app/google-calendar/disconnect', auth, ownerOnly, subscribed, async (req,res) => {
  if(!await requirePlanCapability(req,res,'googleCalendar')) return;
  try {
    const tr = await q('SELECT id FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1)',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    await q(
      `UPDATE tenants
          SET google_calendar_access_token=NULL,
              google_calendar_refresh_token=NULL,
              google_calendar_token_expires_at=NULL,
              google_calendar_email=NULL,
              updated_at=NOW()
        WHERE id=$1`,
      [tr.rows[0].id],
    );
    return res.json({ ok:true });
  } catch {
    return res.status(500).json({ error:'Google Calendar -yhteyttä ei voitu katkaista.' });
  }
});

app.get('/api/auth/oauth/:provider/start', (req, res) => {
  const provider = String(req.params.provider || '').toLowerCase();
  const flow = req.query.flow === 'login' ? 'login' : 'signup';
  if (!['google','apple'].includes(provider)) return res.status(404).end();

  // The public www domain and the legacy Railway URL both serve the website.
  // OAuth, however, must start AND return on the same host because its
  // CSRF-state cookie is host-only. Canonicalize before setting that cookie.
  if (provider === 'google' && process.env.NODE_ENV === 'production' &&
      String(req.hostname || '').toLowerCase() !== 'www.respondoai.fi') {
    return res.redirect(302, 'https://www.respondoai.fi' + req.originalUrl);
  }

  const cfg = oauthConfig(provider);
  if (!cfg.configured) {
    return res.redirect(
      '/' + (flow === 'signup' ? 'tilaus' : 'kirjaudu') +
      '?oauth_error=not_configured&provider=' + encodeURIComponent(provider)
    );
  }

  const nonce = crypto.randomBytes(20).toString('hex');
  const state = jwt.sign({ provider, flow, nonce }, JWT, { expiresIn: '10m' });
  setOauthState(res, nonce, provider);

  if (provider === 'apple') {
    const url = new URL('https://appleid.apple.com/auth/authorize');
    url.search = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
      response_type: 'code',
      response_mode: 'form_post',
      scope: 'name email',
      state,
      nonce,
    }).toString();
    return res.redirect(url.toString());
  }

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
    include_granted_scopes: 'true',
  }).toString();
  return res.redirect(url.toString());
});

app.get('/api/auth/oauth/google/callback', async (req, res) => {
  const code = String(req.query.code || '');
  const state = String(req.query.state || '');
  if (!code) {
    try {
      const statePayload = jwt.verify(state,JWT);
      if (statePayload.flow === 'calendar') {
        return res.redirect('/app?section=automation&calendar=cancelled');
      }
    } catch {}
    return res.redirect('/kirjaudu?oauth_error=failed&provider=google');
  }
  return finishOauth(req, res, code, state);
});

app.post('/api/auth/oauth/apple/callback', async (req, res) => {
  const state = String(req.body?.state || '');
  const code = String(req.body?.code || '');
  let statePayload;
  try {
    statePayload = jwt.verify(state, JWT);
  } catch {
    return res.redirect('/kirjaudu?oauth_error=state&provider=apple');
  }

  const target = statePayload.flow === 'signup' ? '/tilaus' : '/kirjaudu';
  const stateCookie = cookies(req)[OAUTH_STATE_COOKIE];
  if (
    !stateCookie ||
    statePayload.nonce !== stateCookie ||
    statePayload.provider !== 'apple'
  ) {
    return res.redirect(target + '?oauth_error=state&provider=apple');
  }
  res.clearCookie(OAUTH_STATE_COOKIE);

  if (req.body?.error || !code) {
    return res.redirect(target + '?oauth_error=failed&provider=apple');
  }

  try {
    const cfg = oauthConfig('apple');
    if (!cfg.configured) {
      return res.redirect(target + '?oauth_error=not_configured&provider=apple');
    }
    const token = await exchangeAppleCode(code, cfg);
    const claims = await verifyAppleIdentityToken(token.id_token, statePayload.nonce);
    const email = cleanEmail(claims.email);
    if (!email) throw new Error('Apple email missing');

    let name = '';
    try {
      const rawUser = typeof req.body?.user === 'string' ? JSON.parse(req.body.user) : req.body?.user;
      name = [rawUser?.name?.firstName, rawUser?.name?.lastName].filter(Boolean).join(' ').trim();
    } catch {}

    const profile = {
      provider: 'apple',
      sub: String(claims.sub || ''),
      email,
      name,
    };

    if (statePayload.flow === 'login') {
      const found = await q('SELECT * FROM users WHERE lower(email)=lower($1)', [profile.email]);
      if (!found.rowCount) return res.redirect('/kirjaudu?oauth_error=no_account&provider=apple');
      if (found.rows[0].status === 'pending') return res.redirect('/kirjaudu?oauth_error=pending&provider=apple');
      setSession(res, found.rows[0]);
      return res.redirect('/app');
    }

    setOauthProfile(res, profile);
    return res.redirect('/tilaus?oauth=apple');
  } catch (e) {
    console.error('Apple OAuth failed', e);
    return res.redirect(target + '?oauth_error=failed&provider=apple');
  }
});

app.get('/api/auth/oauth-profile', (req, res) => {
  const profile = getOauthProfile(req);
  if (!profile) return res.status(404).json({ error: 'OAuth-profiilia ei löytynyt.' });
  return res.json({
    provider: profile.provider,
    email: profile.email,
    name: profile.name || '',
  });
});

app.get('/api/public/config', publicReadLimiter, async (req, res) => {
  let ownerTestEnabled = false;
  try {
    ownerTestEnabled = await ownerTestPlanEnabled();
  } catch (e) {
    console.warn('Owner test config read failed', e?.message || e);
  }
  return res.json({
    brand: 'RESPONDO AI',
    supportEmail: process.env.SUPPORT_EMAIL || 'info@respondoai.fi',
    trialDays: 3,
    monthlyNet: 29.90,
    yearlyNet: 358.80,
    plans:{
      basic:{monthly:29.90,yearlyMonthly:29.90,yearlyTotal:358.80,agentSeats:2},
      advanced:{monthly:39.90,yearlyMonthly:39.90,yearlyTotal:478.80,agentSeats:10},
      business:{monthly:49.90,yearlyMonthly:49.90,yearlyTotal:598.80,agentSeats:20},
    },
    ownerTestEnabled,
    ownerTestPrice: 0.50,
    passwordResetAvailable: Boolean(String(process.env.RESEND_API_KEY || '').trim()),
    emailVerificationAvailable: signupEmailVerificationReady(),
  });
});


app.post('/api/auth/email-verification/request', signupVerificationRequestLimiter, async (req,res) => {
  if (!signupEmailVerificationReady()) {
    return res.status(503).json({ error:'Sähköpostivahvistus ei ole vielä käytettävissä. Ota yhteyttä Respondo-tukeen.' });
  }
  const email = cleanEmail(req.body?.email);
  if (!email || email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) {
    return res.status(400).json({ error:'Anna kelvollinen sähköpostiosoite.' });
  }
  try {
    const found = await q('SELECT id,status FROM users WHERE lower(email)=lower($1) LIMIT 1',[email]);
    if (found.rowCount && found.rows[0].status !== 'pending') {
      return res.status(409).json({ error:'Tällä sähköpostilla on jo tili.' });
    }
    const code = crypto.randomInt(0,1000000).toString().padStart(6,'0');
    const codeHash = crypto.createHmac('sha256',JWT).update(email + '\n' + code).digest('hex');
    const challenge = jwt.sign(
      { type:'signup-email-pending', email, codeHash, attempts:0 },
      JWT, { expiresIn:'15m', algorithm:'HS256' }
    );
    await sendSignupVerificationEmail({
      email, code,
      language:['fi','sv','en'].includes(req.body?.language) ? req.body.language : 'fi',
    });
    res.clearCookie(SIGNUP_VERIFY_PROOF_COOKIE,{path:'/'});
    res.cookie(SIGNUP_VERIFY_PENDING_COOKIE,challenge,signupVerifyCookieOptions(SIGNUP_VERIFY_TTL_MS));
    return res.json({ ok:true, email, expiresInMinutes:15 });
  } catch (e) {
    console.error('Signup email verification request failed:', e?.message || 'unknown error');
    return res.status(503).json({ error:'Vahvistusviestiä ei voitu lähettää. Yritä uudelleen myöhemmin.' });
  }
});

app.post('/api/auth/email-verification/confirm', signupVerificationConfirmLimiter, (req,res) => {
  if (!signupEmailVerificationReady()) {
    return res.status(503).json({ error:'Sähköpostivahvistus ei ole käytettävissä.' });
  }
  const email = cleanEmail(req.body?.email);
  const code = String(req.body?.code || '').trim();
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error:'Syötä kuusinumeroinen vahvistuskoodi.' });
  }
  let challenge;
  try {
    challenge = jwt.verify(cookies(req)[SIGNUP_VERIFY_PENDING_COOKIE],JWT,{algorithms:['HS256']});
  } catch {
    return res.status(400).json({ error:'Vahvistuskoodi on vanhentunut. Pyydä uusi koodi.' });
  }
  if (challenge.type !== 'signup-email-pending' || challenge.email !== email ||
      !/^[a-f0-9]{64}$/.test(String(challenge.codeHash || '')) ||
      !Number.isInteger(challenge.attempts) || challenge.attempts < 0 || challenge.attempts >= 5) {
    res.clearCookie(SIGNUP_VERIFY_PENDING_COOKIE,{path:'/'});
    return res.status(400).json({ error:'Vahvistus ei onnistunut. Pyydä uusi koodi.' });
  }
  const submittedHash = crypto.createHmac('sha256',JWT).update(email + '\n' + code).digest('hex');
  const correct = crypto.timingSafeEqual(Buffer.from(submittedHash,'hex'),Buffer.from(challenge.codeHash,'hex'));
  if (!correct) {
    if (challenge.attempts >= 4) {
      res.clearCookie(SIGNUP_VERIFY_PENDING_COOKIE,{path:'/'});
      return res.status(400).json({ error:'Liian monta virheellistä koodia. Pyydä uusi koodi.' });
    }
    const retryToken = jwt.sign(
      { type:'signup-email-pending',email,codeHash:challenge.codeHash,attempts:challenge.attempts+1 },
      JWT,{expiresIn:Math.max(1,challenge.exp-Math.floor(Date.now()/1000)),algorithm:'HS256'}
    );
    res.cookie(SIGNUP_VERIFY_PENDING_COOKIE,retryToken,signupVerifyCookieOptions(SIGNUP_VERIFY_TTL_MS));
    return res.status(400).json({ error:'Väärä vahvistuskoodi. Tarkista viesti ja yritä uudelleen.' });
  }
  res.clearCookie(SIGNUP_VERIFY_PENDING_COOKIE,{path:'/'});
  const proof = jwt.sign({type:'signup-email-verified',email},JWT,{expiresIn:'45m',algorithm:'HS256'});
  res.cookie(SIGNUP_VERIFY_PROOF_COOKIE,proof,signupVerifyCookieOptions(SIGNUP_VERIFY_PROOF_TTL_MS));
  return res.json({ ok:true, email });
});

app.post('/api/auth/start-checkout', checkoutLimiter, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Tietokantaa ei ole yhdistetty.' });

  const { fullName, companyName, businessId, password, plan, acceptedTerms } = req.body;
  const email = cleanEmail(req.body.email);
  const normalizedPlan = normalizeCheckoutPlan(plan);
  const referralCode = normalizeReferralCode(req.body.referralCode);
  const freeReferral = isFreeReferralCode(referralCode);
  const checkoutCountry = checkoutCountryPolicy(req.body?.billingCountry);
  if (!checkoutCountry.ok) return res.status(422).json({ error:checkoutCountry.error });
  if (req.body?.businessPurchase !== true) return res.status(422).json({ error:'Vahvista, että tilaat palvelun yrityskäyttöön.' });
  const oauthProfile = getOauthProfile(req);
  const socialSignup = Boolean(
    oauthProfile &&
    cleanEmail(oauthProfile.email) === email &&
    ['google','apple'].includes(oauthProfile.provider)
  );

  if (!acceptedTerms || !email || !companyName || (!socialSignup && (!password || password.length < 10))) {
    return res.status(400).json({
      error: socialSignup
        ? 'Täytä kaikki pakolliset tiedot.'
        : 'Täytä kaikki pakolliset tiedot. Salasanan on oltava vähintään 10 merkkiä.',
    });
  }

  if (!socialSignup && signupEmailVerificationReady() && !validSignupVerificationProof(req,email)) {
    return res.status(403).json({ error:'Vahvista sähköpostiosoitteesi ennen tilauksen aloittamista.' });
  }

  if (referralCode && !freeReferral && !planAllowsReferral(normalizedPlan)) {
    return res.status(400).json({ error: 'Suosittelukoodi toimii vain kuukausitilauksessa.' });
  }

  if (!freeReferral && !stripe) {
    return res.status(503).json({ error: 'Stripe-maksuja ei ole yhdistetty.' });
  }

  try {
    if (normalizedPlan === 'owner_test') {
      if (!(await ownerTestPlanEnabled()) || !validOwnerTestAccessToken(req.body?.ownerTestAccessToken)) {
        return res.status(404).json({ error: 'Tilausvaihtoehtoa ei löytynyt.' });
      }
    }

    const price = freeReferral ? null : stripePriceForPlan(normalizedPlan);

    if (!freeReferral && !price) {
      return res.status(503).json({ error: 'Stripe-hintaa ei ole määritetty.' });
    }

    const existing = await q(
      'SELECT id,status,stripe_customer_id,stripe_subscription_id FROM users WHERE lower(email)=lower($1)',
      [email],
    );
    if (existing.rowCount) {
      const user = existing.rows[0];
      if (user.status === 'pending' && !user.stripe_customer_id && !user.stripe_subscription_id) {
        await q('DELETE FROM users WHERE id=$1', [user.id]);
      } else {
        return res.status(409).json({ error: 'Tällä sähköpostilla on jo tili.' });
      }
    }

    const id = uid();
    const hash = await bcrypt.hash(socialSignup ? crypto.randomBytes(32).toString('hex') : password, 12);
    const client = await pool.connect();
    let session;

    try {
      await client.query('BEGIN');
      if (freeReferral) await consumeOwnerFreeCode(client, referralCode);

      let referrer = null;
      if (referralCode && !freeReferral) {
        const ref = await client.query(
          `SELECT id,email,status,subscription_status,subscription_plan
             FROM users
            WHERE referral_code=$1`,
          [referralCode],
        );
        if (
          !ref.rowCount ||
          ref.rows[0].status !== 'active' ||
          !['active','trialing'].includes(ref.rows[0].subscription_status) ||
          !planAllowsReferral(ref.rows[0].subscription_plan)
        ) {
          throw Object.assign(new Error('Suosittelukoodi ei ole voimassa.'), { publicStatus: 400 });
        }
        if (cleanEmail(ref.rows[0].email) === email) {
          throw Object.assign(new Error('Et voi käyttää omaa suosittelukoodiasi.'), { publicStatus: 400 });
        }
        const alreadyUsed = await client.query(
          'SELECT 1 FROM referral_redemptions WHERE referrer_user_id=$1 AND stripe_discount_applied=TRUE LIMIT 1',
          [ref.rows[0].id],
        );
        if (alreadyUsed.rowCount) {
          throw Object.assign(new Error('Tämä suosittelukoodi on jo käytetty.'), { publicStatus: 400 });
        }
        referrer = ref.rows[0];
      }

      const preferredLanguage = ['fi','sv','en'].includes(String(req.body.language || '').toLowerCase())
        ? String(req.body.language).toLowerCase()
        : 'fi';
      const initialStatus = freeReferral ? 'active' : 'pending';
      const initialSubscriptionStatus = freeReferral ? 'active' : null;

      await client.query(
        `INSERT INTO users(
           id,email,password_hash,full_name,company_name,business_id,status,
           subscription_status,subscription_plan,preferred_language
         ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          id,
          email,
          hash,
          fullName || '',
          companyName,
          businessId || null,
          initialStatus,
          initialSubscriptionStatus,
          normalizedPlan,
          preferredLanguage,
        ],
      );

      const tenantId = uid();
      let tenantSlug = slug(companyName);
      const slugExists = await client.query('SELECT 1 FROM tenants WHERE slug=$1', [tenantSlug]);
      if (slugExists.rowCount) tenantSlug = `${tenantSlug}-${crypto.randomBytes(3).toString('hex')}`;

      await client.query(
        `INSERT INTO tenants(
           id,owner_user_id,slug,name,business_id,contact_email,active,
           subscription_status,subscription_plan
         ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          tenantId,
          id,
          tenantSlug,
          companyName,
          businessId || null,
          email,
          freeReferral,
          freeReferral ? 'active' : 'pending',
          normalizedPlan,
        ],
      );
      await client.query('UPDATE users SET active_tenant_id=$1 WHERE id=$2',[tenantId,id]);

      if (referrer) {
        await client.query(
          `INSERT INTO referral_redemptions(id,referrer_user_id,referred_user_id,code,status)
           VALUES($1,$2,$3,$4,'pending')`,
          [uid(), referrer.id, id, referralCode],
        );
      }

      if (freeReferral) {
        await client.query('COMMIT');
        try { await ensureReferralCode(id); await sendWelcomeEmailOnce(id); } catch(e) { console.error('Welcome email for free signup failed:',e?.message); }
        setSession(res, { id, email });
        res.clearCookie(SIGNUP_VERIFY_PROOF_COOKIE,{path:'/'});
        res.clearCookie(OAUTH_PROFILE_COOKIE);
        return res.json({
          url: '/app?welcome=1&free_code=1',
          free: true,
        });
      }
      const taxExemptionMessage = checkoutTaxExemptionMessage(preferredLanguage);
      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        automatic_tax: { enabled: false },
        customer_email: email,
        line_items: [{ price, quantity: 1 }],
        custom_text: {
          submit: { message: taxExemptionMessage },
        },
        subscription_data: {
          ...(normalizedPlan === 'owner_test' ? {} : { trial_period_days: 3 }),
          metadata: {
            user_id: id,
            tenant_id: tenantId,
            plan: normalizedPlan,
            tax_country_policy: TAX_COUNTRY_POLICY_VERSION,
            billing_country: checkoutCountry.country,
            ...(referralCode ? { referral_code: referralCode } : {}),
          },
        },
        tax_id_collection: { enabled: true },
        billing_address_collection: 'required',
        allow_promotion_codes: false,
        success_url: `${BASE}/api/auth/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:
          normalizedPlan === 'owner_test'
            ? `${BASE}/tilaus?owner-test=1&plan=owner_test&cancelled=1`
            : `${BASE}/tilaus?cancelled=1`,
        metadata: {
          user_id: id,
          tenant_id: tenantId,
          plan: normalizedPlan,
          tax_country_policy: TAX_COUNTRY_POLICY_VERSION,
          billing_country: checkoutCountry.country,
          ...(referralCode ? { referral_code: referralCode } : {}),
        },
      });

      await client.query('COMMIT');
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch {}
      throw e;
    } finally {
      client.release();
    }

    res.clearCookie(SIGNUP_VERIFY_PROOF_COOKIE,{path:'/'});
    res.cookie(
      SIGNUP_CHECKOUT_COOKIE,
      jwt.sign({ sessionId:session.id,userId:id,tenantId },JWT,{ expiresIn:'45m' }),
      {
        httpOnly:true,
        secure:process.env.NODE_ENV==='production',
        sameSite:'lax',
        maxAge:45 * 60 * 1000,
      },
    );
    return res.json({ url: session.url });
  } catch (e) {
    console.error('Checkout start failed', e);
    if (e?.publicStatus === 400) return res.status(400).json({ error: e.message });
    return res.status(500).json({ error: 'Tilauksen aloitus epäonnistui.' });
  }
});

app.get('/api/auth/checkout-success', async (req, res) => {
  if (!pool || !stripe) return res.redirect('/kirjaudu?checkout_error=1');

  const sessionId = String(req.query.session_id || '').trim();
  if (!sessionId || !sessionId.startsWith('cs_')) {
    return res.redirect('/kirjaudu?checkout_error=1');
  }

  try {
    let checkoutState=null;
    try {
      const rawState=cookies(req)[SIGNUP_CHECKOUT_COOKIE];
      checkoutState=rawState ? jwt.verify(rawState,JWT) : null;
    } catch {}
    if (!checkoutState || checkoutState.sessionId !== sessionId) {
      res.clearCookie(SIGNUP_CHECKOUT_COOKIE);
      return res.redirect('/kirjaudu?checkout_error=1');
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!(await enforceCompletedCheckoutCountryPolicy(session))) {
      return res.redirect('/tilaus?country_not_supported=1');
    }
    const target = await resolveSignupCheckoutTarget(session);
    const userId = target?.userId || '';

    if (
      checkoutState.userId !== userId ||
      (checkoutState.tenantId && String(target?.tenantId || session.metadata?.tenant_id || '') !== String(checkoutState.tenantId)) ||
      session.status !== 'complete' ||
      session.mode !== 'subscription' ||
      !userId ||
      session.metadata?.auto_login_used === '1'
    ) {
      return res.redirect('/kirjaudu?checkout_error=1');
    }

    let subscriptionStatus = 'active';
    let periodEnd = null;

    if (session.subscription) {
      const subscriptionId =
        typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      subscriptionStatus = subscription.status;
      if (subscription.current_period_end) {
        periodEnd = new Date(subscription.current_period_end * 1000);
      }
    }

    if (!['active', 'trialing'].includes(subscriptionStatus)) {
      return res.redirect('/kirjaudu?checkout_error=1');
    }

    const customerId =
      typeof session.customer === 'string' ? session.customer : session.customer?.id || null;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id || null;

    if (
      subscriptionId &&
      target?.user?.stripe_subscription_id &&
      target.user.stripe_subscription_id !== subscriptionId &&
      ['active','trialing'].includes(String(target.user.subscription_status || ''))
    ) {
      try {
        await stripe.subscriptions.cancel(subscriptionId);
      } catch (duplicateCancelError) {
        console.error('Duplicate checkout-success subscription cancellation failed', duplicateCancelError);
      }
      res.clearCookie(SIGNUP_CHECKOUT_COOKIE);
      setSession(res, target.user);
      return res.redirect('/app?welcome=1');
    }

    const updated = await q(
      `UPDATE users
          SET stripe_customer_id=$1,
              stripe_subscription_id=$2,
              status='active',
              subscription_status=$3,
              current_period_end=$4,
              updated_at=NOW()
        WHERE id=$5
        RETURNING id,email,status,subscription_status`,
      [customerId, subscriptionId, subscriptionStatus, periodEnd, userId],
    );

    if (!updated.rowCount) return res.redirect('/kirjaudu?checkout_error=1');

    const checkoutTenantId=String(target?.tenantId||session.metadata?.tenant_id||'');
    if(checkoutTenantId){
      await q(
        `UPDATE tenants
            SET stripe_subscription_id=$1,
                subscription_status=$2,
                subscription_plan=COALESCE(subscription_plan,$3),
                current_period_end=$4,
                active=TRUE,
                updated_at=NOW()
          WHERE id=$5 AND owner_user_id=$6`,
        [subscriptionId,subscriptionStatus,session.metadata?.plan||null,periodEnd,checkoutTenantId,userId],
      );
      await q('UPDATE users SET active_tenant_id=$1 WHERE id=$2',[checkoutTenantId,userId]);
    }

    try {
      await ensureReferralCode(userId);
      if (subscriptionId) await applyReferralDiscountIfEligible(userId, subscriptionId);
    } catch (e) {
      console.error('Referral activation after checkout failed', e);
    }

    try { await sendWelcomeEmailOnce(userId); } catch(e) { console.error('Welcome email after checkout redirect failed:',e?.message); }

    if (session.metadata?.plan === 'owner_test') {
      try {
        await closeOwnerTestPlan(subscriptionId);
      } catch (e) {
        console.error('Owner test plan close after checkout failed', e);
      }
    }

    await stripe.checkout.sessions.update(sessionId, {
      metadata: {
        ...session.metadata,
        auto_login_used: '1',
      },
    });

    res.clearCookie(SIGNUP_CHECKOUT_COOKIE);
    setSession(res, updated.rows[0]);
    return res.redirect('/app?welcome=1');
  } catch (e) {
    console.error('Checkout success auto-login failed', e);
    return res.redirect('/kirjaudu?checkout_error=1');
  }
});

app.post('/api/auth/agent-login', loginLimiter, async (req,res) => {
  try {
    const username=String(req.body.username || '').trim().toLowerCase();
    const r=await q(
      `SELECT sa.*,t.name AS company_name
         FROM support_agents sa
         JOIN tenants t ON t.id=sa.tenant_id
         JOIN users u ON u.id=t.owner_user_id
        WHERE lower(sa.username)=lower($1)
          AND u.status='active'
          AND t.active=true
          AND t.subscription_status IN ('active','trialing')
          AND (
            COALESCE(t.subscription_cancel_at_period_end,false)=false
            OR t.current_period_end IS NULL
            OR t.current_period_end > NOW()
          )`,
      [username],
    );
    if (!r.rowCount || !r.rows[0].password_hash || !(await bcrypt.compare(String(req.body.password||''),r.rows[0].password_hash))) {
      return res.status(401).json({ error:'Väärä käyttäjänimi tai salasana.' });
    }
    res.cookie(COOKIE,jwt.sign({ sub:r.rows[0].id,tenantId:r.rows[0].tenant_id,role:'agent',agentId:r.rows[0].id,sv:Number(r.rows[0].session_version || 0) },JWT,{expiresIn:'14d'}),{
      httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:1209600000,
    });
    await q("UPDATE support_agents SET status='online',updated_at=NOW() WHERE id=$1 AND tenant_id=$2",[r.rows[0].id,r.rows[0].tenant_id]);
    return res.json({ ok:true,role:'agent',display_name:r.rows[0].display_name,company_name:r.rows[0].company_name });
  } catch(e) { return res.status(500).json({ error:'Kirjautuminen epäonnistui.' }); }
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const email = cleanEmail(req.body.email);
    const r = await q('SELECT * FROM users WHERE lower(email)=lower($1)', [email]);
    if (!r.rowCount || !(await bcrypt.compare(req.body.password || '', r.rows[0].password_hash))) {
      return res.status(401).json({ error: 'Väärä sähköposti tai salasana.' });
    }
    if (r.rows[0].status === 'pending') {
      return res.status(403).json({ error: 'Viimeistele tilaus ensin.' });
    }
    const preferredLanguage = ['fi','sv','en'].includes(String(req.body.language || '').toLowerCase()) ? String(req.body.language).toLowerCase() : (r.rows[0].preferred_language || 'fi');
    await q('UPDATE users SET preferred_language=$1,updated_at=NOW() WHERE id=$2', [preferredLanguage,r.rows[0].id]);
    setSession(res, r.rows[0]);
    return res.json({ ok: true, preferred_language: preferredLanguage });
  } catch (e) {
    console.error('Owner login failed', e);
    return res.status(500).json({ error: 'Kirjautuminen epäonnistui.' });
  }
});

app.post('/api/auth/password-reset/request', loginLimiter, async (req,res) => {
  const generic = {
    ok:true,
    message:'Jos sähköpostilla löytyy tili, lähetämme salasanan palautuslinkin.'
  };
  try {
    if (!String(process.env.RESEND_API_KEY || '').trim()) {
      return res.status(503).json({ error:'Salasanan palautussähköposti ei ole juuri nyt käytettävissä. Ota yhteys Respondo-tukeen.' });
    }

    const email=cleanEmail(req.body?.email);
    if (!email || email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) {
      return res.json(generic);
    }

    const found=await q('SELECT id,email,preferred_language,status FROM users WHERE lower(email)=lower($1) LIMIT 1',[email]);
    if (!found.rowCount || found.rows[0].status === 'pending') return res.json(generic);

    const user=found.rows[0];
    const rawToken=crypto.randomBytes(32).toString('base64url');
    const tokenHash=crypto.createHash('sha256').update(rawToken).digest('hex');
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL',
        [user.id],
      );
      await client.query(
        `INSERT INTO password_reset_tokens(id,user_id,token_hash,expires_at)
         VALUES($1,$2,$3,NOW() + INTERVAL '30 minutes')`,
        [uid(),user.id,tokenHash],
      );
      await client.query('COMMIT');
    } catch(e) {
      try { await client.query('ROLLBACK'); } catch {}
      throw e;
    } finally {
      client.release();
    }

    try {
      const delivery=await sendPasswordResetEmail({
        email:user.email,
        token:rawToken,
        language:user.preferred_language || 'fi',
      });
      if (!delivery.sent) {
        await q('UPDATE password_reset_tokens SET used_at=NOW() WHERE token_hash=$1',[tokenHash]);
        return res.status(503).json({ error:'Salasanan palautussähköpostia ei voitu lähettää juuri nyt. Ota yhteys Respondo-tukeen.' });
      }
    } catch(mailError) {
      console.error('Password reset email failed',mailError);
      await q('UPDATE password_reset_tokens SET used_at=NOW() WHERE token_hash=$1',[tokenHash]);
      return res.status(503).json({ error:'Salasanan palautussähköpostia ei voitu lähettää juuri nyt. Ota yhteys Respondo-tukeen.' });
    }

    return res.json(generic);
  } catch(e) {
    console.error('Password reset request failed',e);
    return res.status(500).json({ error:'Salasanan palautuspyyntö epäonnistui.' });
  }
});

app.post('/api/auth/password-reset/confirm', loginLimiter, async (req,res) => {
  const rawToken=String(req.body?.token || '').trim();
  const newPassword=String(req.body?.newPassword || '');
  if (rawToken.length < 32 || rawToken.length > 200) {
    return res.status(400).json({ error:'Palautuslinkki ei ole voimassa.' });
  }
  if (newPassword.length < 10) {
    return res.status(400).json({ error:'Uuden salasanan pitää olla vähintään 10 merkkiä.' });
  }
  if (newPassword.length > 200) {
    return res.status(400).json({ error:'Uusi salasana on liian pitkä.' });
  }

  const tokenHash=crypto.createHash('sha256').update(rawToken).digest('hex');
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const tokenResult=await client.query(
      `SELECT prt.id,prt.user_id,u.email
         FROM password_reset_tokens prt
         JOIN users u ON u.id=prt.user_id
        WHERE prt.token_hash=$1
          AND prt.used_at IS NULL
          AND prt.expires_at > NOW()
        FOR UPDATE OF prt`,
      [tokenHash],
    );
    if (!tokenResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error:'Palautuslinkki on vanhentunut tai jo käytetty.' });
    }

    const row=tokenResult.rows[0];
    const passwordHash=await bcrypt.hash(newPassword,12);
    await client.query(
      'UPDATE users SET password_hash=$1,session_version=session_version+1,updated_at=NOW() WHERE id=$2',
      [passwordHash,row.user_id],
    );
    await client.query(
      'UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL',
      [row.user_id],
    );
    await client.query('COMMIT');
    res.clearCookie(COOKIE);
    return res.json({ ok:true });
  } catch(e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Password reset confirmation failed',e);
    return res.status(500).json({ error:'Salasanaa ei voitu palauttaa.' });
  } finally {
    client.release();
  }
});

app.post('/api/auth/language', auth, async (req,res) => {
  try {
    const language = String(req.body?.language || '').toLowerCase();
    if (!['fi','sv','en'].includes(language)) return res.status(400).json({ error:'Unsupported language' });
    await q('UPDATE users SET preferred_language=$1,updated_at=NOW() WHERE id=$2',[language,req.user.sub]);
    return res.json({ ok:true, preferred_language:language });
  } catch (e) {
    console.error('Language preference update failed', e);
    return res.status(500).json({ error:'Kieliasetusta ei voitu tallentaa.' });
  }
});

app.post('/api/app/account/email', auth, ownerOnly, loginLimiter, async (req,res) => {
  try {
    const currentPassword=String(req.body?.currentPassword || '');
    const newEmail=cleanEmail(req.body?.newEmail);
    if (!currentPassword || currentPassword.length > 200) {
      return res.status(400).json({ error:'Anna nykyinen salasana.' });
    }
    if (!newEmail || newEmail.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(newEmail)) {
      return res.status(400).json({ error:'Anna kelvollinen uusi sähköpostiosoite.' });
    }

    const rr=await q(
      'SELECT id,email,password_hash,session_version,stripe_customer_id FROM users WHERE id=$1',
      [req.user.sub],
    );
    if(!rr.rowCount || !rr.rows[0].password_hash || !(await bcrypt.compare(currentPassword,rr.rows[0].password_hash))) {
      return res.status(400).json({ error:'Nykyinen salasana on väärä.' });
    }
    if (cleanEmail(rr.rows[0].email) === newEmail) {
      return res.status(400).json({ error:'Uusi sähköpostiosoite on sama kuin nykyinen.' });
    }

    const duplicate=await q(
      'SELECT 1 FROM users WHERE lower(email)=lower($1) AND id<>$2 LIMIT 1',
      [newEmail,req.user.sub],
    );
    if(duplicate.rowCount) {
      return res.status(409).json({ error:'Tällä sähköpostiosoitteella on jo käyttäjätili.' });
    }

    const updated=await q(
      `UPDATE users
          SET email=$1,session_version=session_version+1,updated_at=NOW()
        WHERE id=$2
        RETURNING id,email,session_version,stripe_customer_id`,
      [newEmail,req.user.sub],
    );

    const stripeCustomerId=updated.rows[0]?.stripe_customer_id;
    if (stripe && stripeCustomerId) {
      try {
        await stripe.customers.update(stripeCustomerId,{ email:newEmail });
      } catch(stripeError) {
        console.error('Stripe customer email sync failed',stripeError);
      }
    }

    setSession(res,updated.rows[0]);
    return res.json({ ok:true,email:newEmail });
  } catch(e) {
    console.error('Owner email change failed',e);
    return res.status(500).json({ error:'Kirjautumissähköpostia ei voitu vaihtaa.' });
  }
});

app.post('/api/app/account/password', auth, ownerOnly, loginLimiter, async (req,res) => {
  try {
    const currentPassword=String(req.body?.currentPassword || '');
    const newPassword=String(req.body?.newPassword || '');
    if (!currentPassword || currentPassword.length > 200) {
      return res.status(400).json({error:'Anna nykyinen salasana.'});
    }
    if (newPassword.length < 10) {
      return res.status(400).json({error:'Uuden salasanan pitää olla vähintään 10 merkkiä.'});
    }
    if (newPassword.length > 200) {
      return res.status(400).json({error:'Uusi salasana on liian pitkä.'});
    }

    const rr=await q('SELECT id,email,password_hash,session_version FROM users WHERE id=$1',[req.user.sub]);
    if(!rr.rowCount || !rr.rows[0].password_hash || !(await bcrypt.compare(currentPassword,rr.rows[0].password_hash))) {
      return res.status(400).json({error:'Nykyinen salasana on väärä.'});
    }

    const passwordHash=await bcrypt.hash(newPassword,12);
    const updated=await q(
      'UPDATE users SET password_hash=$1,session_version=session_version+1,updated_at=NOW() WHERE id=$2 RETURNING id,email,session_version',
      [passwordHash,req.user.sub],
    );
    setSession(res,updated.rows[0]);
    return res.json({ok:true});
  } catch(e) {
    console.error('Owner password change failed',e);
    return res.status(500).json({error:'Salasanaa ei voitu vaihtaa.'});
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    if (req.user.role === 'agent') {
      const ar=await q(`SELECT sa.id,sa.display_name,sa.avatar,sa.username,sa.status,t.name AS company_name
                           FROM support_agents sa JOIN tenants t ON t.id=sa.tenant_id
                          WHERE sa.id=$1 AND sa.tenant_id=$2`,[req.user.agentId,req.user.tenantId]);
      if (!ar.rowCount) return res.status(404).json({ error:'Profiilia ei löytynyt.' });
      return res.json({ ...ar.rows[0],role:'agent',preferred_language:'fi' });
    }
    const r = await q(
      `SELECT u.id,u.email,u.full_name,
              COALESCE(t.name,u.company_name) AS company_name,
              COALESCE(t.business_id,u.business_id) AS business_id,
              u.status,
              t.subscription_status AS subscription_status,
              t.current_period_end AS current_period_end,
              u.preferred_language,
              t.id AS active_tenant_id,
              t.subscription_plan,
              t.subscription_cancel_at_period_end
         FROM users u
         LEFT JOIN tenants t
           ON t.id=active_tenant_for_user(u.id)
          AND t.owner_user_id=u.id
        WHERE u.id=$1`,
      [req.user.sub],
    );
    if (!r.rowCount) return res.status(404).json({ error: 'Tiliä ei löytynyt.' });
    return res.json(r.rows[0]);
  } catch (e) {
    console.error('Authenticated profile read failed', e);
    return res.status(500).json({ error: 'Tilin tietoja ei voitu ladata.' });
  }
});

app.get('/api/app/workspaces', auth, ownerOnly, async (req,res) => {
  try {
    const rr=await q(
      `SELECT t.id,t.name,t.slug,t.business_id,t.website,t.active,
              COALESCE(t.subscription_status,'inactive') AS subscription_status,
              t.subscription_plan,t.current_period_end,t.subscription_cancel_at_period_end,
              (t.id=active_tenant_for_user($1)) AS selected
         FROM tenants t
        WHERE t.owner_user_id=$1
        ORDER BY t.created_at ASC`,
      [req.user.sub],
    );
    return res.json({ workspaces:rr.rows });
  } catch(e) {
    return res.status(500).json({ error:'Yrityksiä ei voitu ladata.' });
  }
});


/* Destructive account actions: confirm the account password and cancel the
   exact owned Stripe subscriptions before deleting tenant/user data. */
async function verifyDeletionPassword(client, userId, email, password, requireEmail) {
  const rr=await client.query('SELECT id,email,password_hash,stripe_customer_id,stripe_subscription_id FROM users WHERE id=$1 FOR UPDATE',[userId]);
  const user=rr.rows[0];
  if(!user || !user.password_hash || !password || password.length>200 ||
     (requireEmail && cleanEmail(email)!==cleanEmail(user.email)) ||
     !(await bcrypt.compare(password,user.password_hash))) return null;
  return user;
}

async function cancelOwnedSubscriptionsForDeletion(ids, customerId) {
  const unique=[...new Set(ids.filter(Boolean))];
  if(!unique.length) return 0;
  if(!stripe) throw new Error('Stripe is unavailable: deletion cannot safely continue');
  for(const subscriptionId of unique){
    const subscription=await stripe.subscriptions.retrieve(subscriptionId);
    const ownerCustomer=typeof subscription.customer==='string' ? subscription.customer : subscription.customer?.id;
    if(!customerId || ownerCustomer!==customerId){
      throw new Error('Subscription customer mismatch: refusing to cancel');
    }
    if(subscription.status!=='canceled'){
      await stripe.subscriptions.cancel(subscriptionId);
    }
  }
  return unique.length;
}

// Stripe may contain an active subscription not yet synchronized into tenants
// (for example, a recently completed checkout). Include those before deleting an account.
async function allStripeSubscriptionIdsForCustomer(customerId) {
  if(!customerId) return [];
  if(!stripe) throw new Error('Stripe is unavailable: subscription inventory cannot be verified');
  const ids=[];
  let cursor='';
  do{
    const page=await stripe.subscriptions.list({
      customer:customerId,status:'all',limit:100,
      ...(cursor ? {starting_after:cursor} : {}),
    });
    ids.push(...page.data.map(item=>item.id));
    if(!page.has_more) break;
    if(!page.data.length) throw new Error('Stripe subscription pagination failed');
    cursor=page.data[page.data.length-1].id;
  }while(true);
  return ids;
}

app.delete('/api/app/workspaces/:tenantId', auth, ownerOnly, loginLimiter, async (req,res) => {
  const tenantId=String(req.params.tenantId||'');
  const password=String(req.body?.password||'');
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(tenantId) || !password || password.length>200) {
    return res.status(400).json({error:'Valitse yritys ja anna nykyinen salasana.'});
  }
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const user=await verifyDeletionPassword(client,req.user.sub,'',password,false);
    if(!user){
      await client.query('ROLLBACK');
      return res.status(403).json({error:'Väärä salasana.'});
    }
    const tr=await client.query('SELECT id,name,stripe_subscription_id FROM tenants WHERE id=$1 AND owner_user_id=$2 FOR UPDATE',[tenantId,req.user.sub]);
    if(!tr.rowCount){
      await client.query('ROLLBACK');
      return res.status(404).json({error:'Yritystä ei löytynyt.'});
    }
    const tenant=tr.rows[0];
    const subscriptionId=tenant.stripe_subscription_id;
    if(subscriptionId){
      const shared=await client.query('SELECT 1 FROM tenants WHERE stripe_subscription_id=$1 AND id<>$2 LIMIT 1',[subscriptionId,tenantId]);
      if(shared.rowCount){
        await client.query('ROLLBACK');
        return res.status(409).json({error:'Tilauksella on toinenkin yritys. Ota yhteys tukeen ennen poistamista.'});
      }
    }
    const canceled=await cancelOwnedSubscriptionsForDeletion([subscriptionId],user.stripe_customer_id);
    await client.query('DELETE FROM tenants WHERE id=$1 AND owner_user_id=$2',[tenantId,req.user.sub]);
    const next=await client.query("SELECT id,name,business_id FROM tenants WHERE owner_user_id=$1 AND active=TRUE AND subscription_status IN ('active','trialing') ORDER BY created_at ASC LIMIT 1",[req.user.sub]);
    await client.query(
      "UPDATE users SET active_tenant_id=$1,company_name=$4,business_id=$5,"+
      "stripe_subscription_id=CASE WHEN stripe_subscription_id=$3 THEN NULL ELSE stripe_subscription_id END,"+
      "subscription_status=CASE WHEN stripe_subscription_id=$3 THEN NULL ELSE subscription_status END,"+
      "subscription_plan=CASE WHEN stripe_subscription_id=$3 THEN NULL ELSE subscription_plan END,"+
      "current_period_end=CASE WHEN stripe_subscription_id=$3 THEN NULL ELSE current_period_end END,"+
      "updated_at=NOW() WHERE id=$2",
      [next.rows[0]?.id||null,req.user.sub,subscriptionId,next.rows[0]?.name||'Yritys',next.rows[0]?.business_id||null],
    );
    await client.query('COMMIT');
    return res.json({ok:true,deletedTenantId:tenantId,canceledSubscriptions:canceled,remainingActiveWorkspaces:Boolean(next.rowCount)});
  }catch(e){
    try{await client.query('ROLLBACK');}catch{}
    console.error('Workspace deletion failed',e?.message||e);
    return res.status(503).json({error:'Yrityksen poistaminen ei onnistunut. Tilausta tai tietoja ei poisteta, jos tilauksen peruutusta ei voida varmistaa. Yritä uudelleen tai ota yhteys tukeen.'});
  }finally{client.release();}
});

app.delete('/api/app/account', auth, ownerOnly, loginLimiter, async (req,res) => {
  const email=String(req.body?.email||'');
  const password=String(req.body?.password||'');
  if(!email || email.length>254 || !password || password.length>200){
    return res.status(400).json({error:'Vahvista poistaminen sähköpostilla ja salasanalla.'});
  }
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const user=await verifyDeletionPassword(client,req.user.sub,email,password,true);
    if(!user){
      await client.query('ROLLBACK');
      return res.status(403).json({error:'Sähköposti tai salasana on väärä.'});
    }
    const rr=await client.query('SELECT id,stripe_subscription_id FROM tenants WHERE owner_user_id=$1 FOR UPDATE',[req.user.sub]);
    const subscriptions=[...new Set([user.stripe_subscription_id,...rr.rows.map(x=>x.stripe_subscription_id)].filter(Boolean))];
    subscriptions.push(...(await allStripeSubscriptionIdsForCustomer(user.stripe_customer_id)).filter(id=>!subscriptions.includes(id)));
    if(subscriptions.length){
      const shared=await client.query('SELECT 1 FROM tenants WHERE stripe_subscription_id=ANY($1::text[]) AND owner_user_id<>$2 LIMIT 1',[subscriptions,req.user.sub]);
      if(shared.rowCount){
        await client.query('ROLLBACK');
        return res.status(409).json({error:'Tilauksia ei voida erottaa turvallisesti. Ota yhteys tukeen.'});
      }
    }
    const canceled=await cancelOwnedSubscriptionsForDeletion(subscriptions,user.stripe_customer_id);
    await client.query('DELETE FROM users WHERE id=$1',[req.user.sub]);
    await client.query('COMMIT');
    res.clearCookie(COOKIE,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax'});
    return res.json({ok:true,canceledSubscriptions:canceled});
  }catch(e){
    try{await client.query('ROLLBACK');}catch{}
    console.error('Account deletion failed',e?.message||e);
    return res.status(503).json({error:'Käyttäjätiliä ei poistettu, koska tilausten peruuttamista tai tietojen poistamista ei voitu vahvistaa. Yritä uudelleen tai ota yhteys tukeen.'});
  }finally{client.release();}
});

app.post('/api/app/workspaces/switch', auth, ownerOnly, async (req,res) => {
  try {
    const tenantId=String(req.body?.tenantId||'').trim();
    const rr=await q(
      `SELECT id,name,subscription_status,active
         FROM tenants
        WHERE id=$1 AND owner_user_id=$2
        LIMIT 1`,
      [tenantId,req.user.sub],
    );
    if(!rr.rowCount || !rr.rows[0].active) {
      return res.status(404).json({ error:'Yritystä ei löytynyt.' });
    }
    if(!['active','trialing'].includes(String(rr.rows[0].subscription_status||''))) {
      return res.status(402).json({ error:'Tällä yrityksellä ei ole aktiivista Respondo-tilausta.' });
    }
    await q('UPDATE users SET active_tenant_id=$1,updated_at=NOW() WHERE id=$2',[tenantId,req.user.sub]);
    return res.json({ ok:true,tenantId,name:rr.rows[0].name });
  } catch(e) {
    return res.status(500).json({ error:'Yrityksen vaihtaminen epäonnistui.' });
  }
});

app.post('/api/app/workspaces/checkout', auth, ownerOnly, async (req,res) => {
  const companyName=String(req.body?.companyName||'').replace(/[<>]/g,'').trim().slice(0,120);
  const businessId=String(req.body?.businessId||'').replace(/[<>]/g,'').trim().slice(0,40);
  const plan=normalizeCheckoutPlan(req.body?.plan);
  const referralCode=normalizeReferralCode(req.body?.referralCode);
  const freeReferral=isFreeReferralCode(referralCode);
  const checkoutCountry=checkoutCountryPolicy(req.body?.billingCountry);
  if(!checkoutCountry.ok) return res.status(422).json({error:checkoutCountry.error});

  if(!companyName) return res.status(400).json({ error:'Anna yrityksen nimi.' });
  if(req.body?.acceptedTerms!==true) return res.status(400).json({ error:'Hyväksy käyttöehdot ja tietosuojaseloste.' });
  if(referralCode && !freeReferral && !planAllowsReferral(plan)) return res.status(400).json({ error:'Suosittelukoodi toimii vain kuukausitilauksessa.' });
  if(!freeReferral && !stripe) return res.status(503).json({ error:'Stripe ei ole käytettävissä.' });

  const price=freeReferral ? null : stripePriceForPlan(plan);
  if(!freeReferral && !price) return res.status(503).json({ error:'Stripe-hintaa ei ole määritetty.' });

  const userResult=await q('SELECT id,email,stripe_customer_id,preferred_language FROM users WHERE id=$1',[req.user.sub]);
  if(!userResult.rowCount) return res.status(404).json({ error:'Tiliä ei löytynyt.' });
  const user=userResult.rows[0];

  const tenantId=uid();
  let tenantSlug=slug(companyName);
  const exists=await q('SELECT 1 FROM tenants WHERE slug=$1',[tenantSlug]);
  if(exists.rowCount) tenantSlug=tenantSlug+'-'+crypto.randomBytes(3).toString('hex');

  if(freeReferral){
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      await consumeOwnerFreeCode(client, referralCode);
      await client.query(
        `INSERT INTO tenants(
           id,owner_user_id,slug,name,business_id,contact_email,active,
           subscription_status,subscription_plan
         ) VALUES($1,$2,$3,$4,$5,$6,TRUE,'active',$7)`,
        [tenantId,req.user.sub,tenantSlug,companyName,businessId||null,user.email,plan],
      );
      await client.query(
        `UPDATE users
            SET active_tenant_id=$1,
                status='active',
                updated_at=NOW()
          WHERE id=$2`,
        [tenantId,req.user.sub],
      );
      await client.query('COMMIT');
      return res.json({
        url:'/app?workspace_added=1&free_code=1',
        free:true,
      });
    }catch(e){
      try{await client.query('ROLLBACK');}catch{}
      if (e?.publicStatus === 400) return res.status(400).json({error:e.message});
      console.error('Free workspace activation failed',e);
      return res.status(500).json({error:'Uuden yrityksen aktivointi epäonnistui.'});
    }finally{
      client.release();
    }
  }

  let referrer=null;
  let existingReferralReservation=false;
  if(referralCode){
    const ref=await q(
      `SELECT id,email,status,subscription_status,subscription_plan
         FROM users
        WHERE referral_code=$1`,
      [referralCode],
    );
    if(
      !ref.rowCount ||
      ref.rows[0].status!=='active' ||
      !['active','trialing'].includes(ref.rows[0].subscription_status) ||
      !planAllowsReferral(ref.rows[0].subscription_plan)
    ){
      return res.status(400).json({error:'Suosittelukoodi ei ole voimassa.'});
    }
    if(ref.rows[0].id===req.user.sub){
      return res.status(400).json({error:'Et voi käyttää omaa suosittelukoodiasi.'});
    }
    const codeUsed=await q(
      'SELECT 1 FROM referral_redemptions WHERE referrer_user_id=$1 AND stripe_discount_applied=TRUE LIMIT 1',
      [ref.rows[0].id],
    );
    if(codeUsed.rowCount){
      return res.status(400).json({error:'Tämä suosittelukoodi on jo käytetty.'});
    }
    const alreadyReferred=await q(
      'SELECT code,status,stripe_discount_applied FROM referral_redemptions WHERE referred_user_id=$1 LIMIT 1',
      [req.user.sub],
    );
    if(alreadyReferred.rowCount){
      const existingReferral=alreadyReferred.rows[0];
      if(existingReferral.stripe_discount_applied){
        return res.status(400).json({error:'Olet jo käyttänyt suosittelukoodin tällä käyttäjätilillä.'});
      }
      if(String(existingReferral.code||'')!==referralCode){
        return res.status(400).json({error:'Tällä käyttäjätilillä on jo toinen keskeneräinen suosittelukoodi.'});
      }
      existingReferralReservation=true;
    }
    referrer=ref.rows[0];
  }

  await q(
    `INSERT INTO tenants(
       id,owner_user_id,slug,name,business_id,contact_email,active,
       subscription_status,subscription_plan
     ) VALUES($1,$2,$3,$4,$5,$6,FALSE,'pending',$7)`,
    [tenantId,req.user.sub,tenantSlug,companyName,businessId||null,user.email,plan],
  );

  try {
    const taxExemptionMessage=checkoutTaxExemptionMessage(user.preferred_language||'fi');
    const session=await stripe.checkout.sessions.create({
      mode:'subscription',
      automatic_tax:{enabled:false},
      ...(user.stripe_customer_id ? {
        customer:user.stripe_customer_id,
        customer_update:{ name:'auto' },
      } : { customer_email:user.email }),
      line_items:[{price,quantity:1}],
      custom_text:{
        submit:{message: taxExemptionMessage},
      },
      subscription_data:{
        trial_period_days:3,
        metadata:{
          user_id:req.user.sub,
          tenant_id:tenantId,
          plan,
          additional_workspace:'1',
          tax_country_policy:TAX_COUNTRY_POLICY_VERSION,
          billing_country:checkoutCountry.country,
          ...(referralCode ? { referral_code:referralCode } : {}),
        },
      },
      tax_id_collection:{enabled:true},
      billing_address_collection:'required',
      allow_promotion_codes:false,
      success_url:`${BASE}/api/app/workspaces/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:`${BASE}/app?section=account&workspace_checkout=cancelled`,
      metadata:{
        user_id:req.user.sub,
        tenant_id:tenantId,
        plan,
        additional_workspace:'1',
        tax_country_policy:TAX_COUNTRY_POLICY_VERSION,
        billing_country:checkoutCountry.country,
        ...(referralCode ? { referral_code:referralCode } : {}),
      },
    });

    if(referrer && !existingReferralReservation){
      await q(
        `INSERT INTO referral_redemptions(id,referrer_user_id,referred_user_id,code,status)
         VALUES($1,$2,$3,$4,'pending')`,
        [uid(),referrer.id,req.user.sub,referralCode],
      );
    }

    return res.json({url:session.url});
  } catch(e) {
    await q("DELETE FROM tenants WHERE id=$1 AND owner_user_id=$2 AND active=FALSE AND subscription_status='pending'",[tenantId,req.user.sub]);
    console.error('Additional workspace checkout failed',e);
    return res.status(500).json({error:'Uuden yrityksen tilauksen aloitus epäonnistui.'});
  }
});

app.get('/api/app/workspaces/checkout-success', auth, ownerOnly, async (req,res) => {
  if(!stripe) return res.redirect('/app?section=account&workspace_checkout=error');
  try {
    const sessionId=String(req.query.session_id||'').trim();
    const session=await stripe.checkout.sessions.retrieve(sessionId);
    if (!(await enforceCompletedCheckoutCountryPolicy(session))) {
      return res.redirect('/app?section=account&workspace_checkout=country_not_supported');
    }
    const tenantId=String(session.metadata?.tenant_id||'');
    const userId=String(session.metadata?.user_id||'');
    if(
      !tenantId ||
      userId!==req.user.sub ||
      session.status!=='complete' ||
      session.mode!=='subscription'
    ) {
      return res.redirect('/app?section=account&workspace_checkout=error');
    }

    const subscriptionId=typeof session.subscription==='string' ? session.subscription : session.subscription?.id || null;
    const customerId=typeof session.customer==='string' ? session.customer : session.customer?.id || null;
    let subscriptionStatus='active';
    let periodEnd=null;
    if(subscriptionId){
      const subscription=await stripe.subscriptions.retrieve(subscriptionId);
      subscriptionStatus=subscription.status;
      periodEnd=subscription.current_period_end ? new Date(subscription.current_period_end*1000) : null;
    }
    if(!['active','trialing'].includes(subscriptionStatus)) {
      return res.redirect('/app?section=account&workspace_checkout=error');
    }

    const updated=await q(
      `UPDATE tenants
          SET stripe_subscription_id=$1,
              subscription_status=$2,
              current_period_end=$3,
              active=TRUE,
              updated_at=NOW()
        WHERE id=$4 AND owner_user_id=$5
        RETURNING id`,
      [subscriptionId,subscriptionStatus,periodEnd,tenantId,req.user.sub],
    );
    if(!updated.rowCount) return res.redirect('/app?section=account&workspace_checkout=error');

    await q(
      `UPDATE users
          SET stripe_customer_id=COALESCE(stripe_customer_id,$1),
              active_tenant_id=$2,
              status='active',
              updated_at=NOW()
        WHERE id=$3`,
      [customerId,tenantId,req.user.sub],
    );

    if(session.metadata?.referral_code && subscriptionId){
      try{
        await applyReferralDiscountIfEligible(req.user.sub,subscriptionId,session.metadata?.plan||'monthly');
      }catch(referralError){
        console.error('Additional workspace referral activation failed',referralError);
      }
    }

    return res.redirect('/app?workspace_added=1');
  } catch(e) {
    console.error('Additional workspace checkout success failed',e);
    return res.redirect('/app?section=account&workspace_checkout=error');
  }
});

app.post('/api/app/agent/profile', auth, async (req,res) => {
  try {
    if (req.user.role !== 'agent') return res.status(403).json({ error:'Ei käyttöoikeutta.' });
    const displayName=String(req.body.displayName||'').replace(/[<>]/g,'').trim().slice(0,60);
    if (!displayName) return res.status(400).json({ error:'Anna nimi.' });
    let avatar;
    if (Object.prototype.hasOwnProperty.call(req.body||{},'avatar')) {
      const raw=String(req.body.avatar||'').trim();
      avatar=raw ? cleanBotAvatar(raw) : null;
      if (raw && avatar==='robot-1' && !/^robot-1$/.test(raw)) return res.status(400).json({ error:'Profiilikuva ei kelpaa.' });
    }
    const rr=await q(`UPDATE support_agents SET display_name=$1,avatar=COALESCE($2,avatar),updated_at=NOW()
      WHERE id=$3 AND tenant_id=$4 RETURNING id,display_name,avatar,username,status`,
      [displayName,avatar,req.user.agentId,req.user.tenantId]);
    if (!rr.rowCount) return res.status(404).json({ error:'Profiilia ei löytynyt.' });
    return res.json(rr.rows[0]);
  } catch(e){ return res.status(500).json({ error:'Profiilia ei voitu päivittää.' }); }
});

app.post('/api/app/agent/status', auth, async (req,res) => {
  try {
    if (req.user.role !== 'agent') return res.status(403).json({ error:'Ei käyttöoikeutta.' });
    const status=req.body.status==='online'?'online':'offline';
    const rr=await q("UPDATE support_agents SET status=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING status",[status,req.user.agentId,req.user.tenantId]);
    if (!rr.rowCount) return res.status(404).json({ error:'Profiilia ei löytynyt.' });
    return res.json(rr.rows[0]);
  } catch(e){ return res.status(500).json({ error:'Tilaa ei voitu päivittää.' }); }
});

app.post('/api/app/support-agents/:id/force-logout', auth, ownerOnly, subscribed, async (req,res) => {
  try {
    const tr=await q('SELECT id FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1)',[req.user.sub]);
    if(!tr.rowCount) return res.status(404).json({error:'Työtilaa ei löytynyt.'});
    const rr=await q("UPDATE support_agents SET status='offline',session_version=session_version+1,updated_at=NOW() WHERE id=$1 AND tenant_id=$2 RETURNING id",[req.params.id,tr.rows[0].id]);
    if(!rr.rowCount) return res.status(404).json({error:'Profiilia ei löytynyt.'});
    return res.json({ok:true});
  }catch(e){return res.status(500).json({error:'Uloskirjaus epäonnistui.'});}
});

app.post('/api/app/support-agents/:id/password', auth, ownerOnly, subscribed, async (req,res) => {
  try {
    const password=String(req.body?.password || '');
    if(password.length < 10) return res.status(400).json({error:'Salasanan pitää olla vähintään 10 merkkiä.'});
    if(password.length > 200) return res.status(400).json({error:'Salasana on liian pitkä.'});
    const tr=await q('SELECT id FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1)',[req.user.sub]);
    if(!tr.rowCount) return res.status(404).json({error:'Työtilaa ei löytynyt.'});
    const hash=await bcrypt.hash(password,12);
    const rr=await q(
      "UPDATE support_agents SET password_hash=$1,status='offline',session_version=session_version+1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING id",
      [hash,req.params.id,tr.rows[0].id],
    );
    if(!rr.rowCount) return res.status(404).json({error:'Profiilia ei löytynyt.'});
    return res.json({ok:true});
  } catch(e) {
    return res.status(500).json({error:'Salasanaa ei voitu vaihtaa.'});
  }
});

app.post('/api/app/agent/claim/:id', auth, async (req,res) => {
  try {
    if(req.user.role!=='agent') return res.status(403).json({error:'Ei käyttöoikeutta.'});
    const rr=await q(`UPDATE chat_threads SET assigned_agent_id=$1,mode='human',status='open',updated_at=NOW()
      WHERE id=$2 AND tenant_id=$3 AND assigned_agent_id IS NULL
        AND language = ANY((SELECT languages FROM support_agents WHERE id=$1 AND tenant_id=$3)) RETURNING id`,
      [req.user.agentId,req.params.id,req.user.tenantId]);
    if(!rr.rowCount) return res.status(409).json({error:'Toinen asiakaspalvelija ehti ottaa keskustelun tai se ei ole enää vapaa.'});
    return res.json({ok:true});
  }catch(e){return res.status(500).json({error:'Keskustelua ei voitu ottaa haltuun.'});}
});

app.get('/api/app/agent-dashboard', auth, agentOrOwner, async (req,res) => {
  try {
    if (req.user.role !== 'agent') return res.status(403).json({ error:'Tämä näkymä on asiakaspalvelijoille.' });
    const tenantId=req.user.tenantId, agentId=req.user.agentId;
    const agent=(await q('SELECT id,display_name,avatar,username,languages,status FROM support_agents WHERE id=$1 AND tenant_id=$2',[agentId,tenantId])).rows[0];
    if (!agent) return res.status(404).json({ error:'Profiilia ei löytynyt.' });
    const threads=await q(`SELECT ct.id,ct.source_channel,ct.external_contact_id,ct.visitor_ref,ct.mode,ct.status,ct.last_activity_at,ct.created_at,
      COALESCE(json_agg(json_build_object('id',cm.id,'role',cm.role,'message',cm.message,'created_at',cm.created_at) ORDER BY cm.created_at ASC) FILTER (WHERE cm.id IS NOT NULL),'[]') AS messages
      FROM chat_threads ct LEFT JOIN chat_messages cm ON cm.thread_id=ct.id
      WHERE ct.tenant_id=$1 AND (ct.assigned_agent_id=$2 OR (ct.assigned_agent_id IS NULL AND ct.language = ANY(COALESCE($3::text[],ARRAY['fi']::text[]))))
      GROUP BY ct.id ORDER BY (ct.assigned_agent_id=$2) DESC,ct.last_activity_at DESC LIMIT 80`,[tenantId,agentId,agent.languages||['fi']]);
    return res.json({agent,liveThreads:threads.rows,stats:{
      conversations:threads.rowCount,
      open:threads.rows.filter(x=>x.status==='open').length,
      human:threads.rows.filter(x=>x.mode==='human').length
    }});
  } catch(e){ return res.status(500).json({ error:'Asiakaspalvelunäkymää ei voitu ladata.' }); }
});

app.get('/api/app/dashboard', auth, ownerOnly, subscribed, async (req, res) => {
  try {
    const t = await q('SELECT * FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1)', [req.user.sub]);
    if (!t.rowCount) return res.status(404).json({ error: 'Työtilaa ei löytynyt.' });
    const tenant = t.rows[0];
    const k = await q('SELECT * FROM knowledge WHERE tenant_id=$1 ORDER BY created_at DESC', [tenant.id]);
    const s = await q(
      `SELECT count(*)::int total,
              count(*) FILTER(WHERE handoff=false)::int answered,
              count(*) FILTER(WHERE handoff=true)::int handoffs,
              count(*) FILTER(WHERE created_at >= NOW() - INTERVAL '7 days')::int last7,
              count(*) FILTER(WHERE created_at >= NOW() - INTERVAL '30 days')::int last30
         FROM conversations WHERE tenant_id=$1`,
      [tenant.id],
    );
    const unanswered = await q(
      `SELECT id, question, answer, intent, confidence, created_at
         FROM conversations
        WHERE tenant_id=$1
          AND handoff=true
          AND COALESCE(intent,'') <> 'Resolved gap'
        ORDER BY created_at DESC
        LIMIT 30`,
      [tenant.id],
    );
    const recent = await q(
      `SELECT id, question, answer, intent, confidence, handoff, visitor_ref, source_ids, page_url, page_title, created_at
         FROM conversations
        WHERE tenant_id=$1
        ORDER BY created_at DESC
        LIMIT 30`,
      [tenant.id],
    );
    const daily = await q(
      `SELECT date_trunc('day', created_at)::date AS day, count(*)::int total
         FROM conversations
        WHERE tenant_id=$1 AND created_at >= NOW() - INTERVAL '13 days'
        GROUP BY 1 ORDER BY 1 ASC`,
      [tenant.id],
    );
    const gaps = await q(
      `SELECT question, count(*)::int asks, max(created_at) AS last_asked
         FROM conversations
        WHERE tenant_id=$1
          AND handoff=true
          AND created_at >= NOW() - INTERVAL '7 days'
          AND COALESCE(intent,'') <> 'Resolved gap'
        GROUP BY question
        ORDER BY asks DESC, last_asked DESC
        LIMIT 8`,
      [tenant.id],
    );
    const leads = await q(
      `SELECT id, visitor_ref, name, email, phone, message, status, created_at
         FROM leads
        WHERE tenant_id=$1
        ORDER BY created_at DESC
        LIMIT 30`,
      [tenant.id],
    );
    const actionStats = await q(
      `SELECT action_type, count(*)::int total
         FROM action_events
        WHERE tenant_id=$1 AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY action_type ORDER BY total DESC`,
      [tenant.id],
    );
    await ensureTenantActionKeys(tenant);
    const actionRequests = await q(
      `SELECT id,request_type,status,payload,result,delivery_status,source_channel,external_contact_id,created_at,updated_at
         FROM action_requests
        WHERE tenant_id=$1
        ORDER BY created_at DESC
        LIMIT 50`,
      [tenant.id],
    );
    const liveThreads = await q(
      `SELECT ct.id,ct.source_channel,ct.external_contact_id,ct.visitor_ref,ct.mode,ct.status,
              ct.assigned_agent_id,sa.display_name AS assigned_agent_name,sa.avatar AS assigned_agent_avatar,
              ct.last_activity_at,ct.created_at,
              COALESCE((
                SELECT json_agg(msg ORDER BY msg.created_at)
                FROM (
                  SELECT id,role,message,metadata,created_at
                    FROM chat_messages
                   WHERE thread_id=ct.id
                   ORDER BY created_at DESC
                   LIMIT 24
                ) msg
              ),'[]'::json) AS messages
         FROM chat_threads ct
         LEFT JOIN support_agents sa ON sa.id=ct.assigned_agent_id
        WHERE ct.tenant_id=$1
        ORDER BY ct.last_activity_at DESC
        LIMIT 30`,
      [tenant.id],
    );
    const bookingSlots = await q(
      `SELECT id,starts_at,ends_at,status
         FROM booking_slots
        WHERE tenant_id=$1 AND starts_at >= NOW()
        ORDER BY starts_at ASC
        LIMIT 80`,
      [tenant.id],
    );
    let stripeConnect = {
      connected:false,
      chargesEnabled:false,
      detailsSubmitted:false,
      payoutsEnabled:false,
    };
    if (stripe && tenant.stripe_connected_account_id) {
      try {
        const connected = await stripe.accounts.retrieve(tenant.stripe_connected_account_id);
        stripeConnect = {
          connected:true,
          chargesEnabled:Boolean(connected.charges_enabled),
          detailsSubmitted:Boolean(connected.details_submitted),
          payoutsEnabled:Boolean(connected.payouts_enabled),
        };
      } catch {}
    }
    const latestSelfTest = await q(
      `SELECT id, score, total_questions, answerable_questions, gaps, created_at
         FROM self_test_runs WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 1`,
      [tenant.id],
    );
    const truthStats = await q(
      `SELECT count(*)::int total,
              count(*) FILTER (WHERE approved=true)::int approved,
              count(*) FILTER (WHERE verified_at >= NOW() - INTERVAL '90 days')::int fresh,
              max(verified_at) AS last_verified
         FROM knowledge WHERE tenant_id=$1`,
      [tenant.id],
    );
    const referralCode = await ensureReferralCode(req.user.sub);
    let referral = null;
    if (referralCode) {
      const referralUses = await q(
        'SELECT count(*)::int uses FROM referral_redemptions WHERE referrer_user_id=$1 AND stripe_discount_applied=TRUE',
        [req.user.sub],
      );
      const uses = referralUses.rows[0]?.uses || 0;
      referral = {
        code: referralCode,
        uses,
        available: uses === 0,
        shareUrl: `${BASE}/tilaus?plan=monthly&ref=${encodeURIComponent(referralCode)}`,
        discountPercent: 20,
      };
    }

    const a = s.rows[0];
    const total = a.total || 0;
    const dashboardUnanswered = isFirstPartyRespondoTenant(tenant)
      ? unanswered.rows.filter((row) => !respondoProductFaqMatch(row.question, 'fi'))
      : unanswered.rows;
    const dashboardGaps = isFirstPartyRespondoTenant(tenant)
      ? gaps.rows.filter((row) => !respondoProductFaqMatch(row.question, 'fi'))
      : gaps.rows;
    const tenantSafe = { ...tenant };
    const planAccess = planEntitlements(tenant.subscription_plan);
    [
      'google_calendar_access_token','google_calendar_refresh_token',
      'shopify_access_token','woo_consumer_key','woo_consumer_secret',
      'action_webhook_secret','channels_api_key'
    ].forEach((key) => delete tenantSafe[key]);

    const workspaces=(await q(
      `SELECT id,name,slug,business_id,active,subscription_status,subscription_plan,current_period_end,subscription_cancel_at_period_end,
              (id=$2) AS selected
         FROM tenants
        WHERE owner_user_id=$1
        ORDER BY created_at ASC`,
      [req.user.sub,tenant.id],
    )).rows;

    return res.json({
      tenant:tenantSafe,
      planAccess,
      workspaces,
      referral,
      knowledge: k.rows,
      unanswered: dashboardUnanswered,
      recentConversations: recent.rows,
      daily: daily.rows,
      gaps: dashboardGaps,
      leads: leads.rows,
      actionStats: actionStats.rows,
      actionRequests: actionRequests.rows,
      liveThreads: liveThreads.rows,
      supportAgents: (await q(
        `SELECT sa.id,sa.display_name,sa.avatar,sa.username,sa.languages,sa.status,sa.created_at,sa.updated_at,
                COUNT(DISTINCT ct.id)::int AS conversation_count,
                COUNT(DISTINCT ct.id) FILTER (WHERE ct.status='open')::int AS open_conversations,
                COUNT(cm.id) FILTER (WHERE cm.role='human')::int AS replies_sent,
                MAX(ct.last_activity_at) AS last_conversation_at
           FROM support_agents sa
           LEFT JOIN chat_threads ct ON ct.assigned_agent_id=sa.id AND ct.tenant_id=sa.tenant_id
           LEFT JOIN chat_messages cm ON cm.thread_id=ct.id AND cm.tenant_id=sa.tenant_id
          WHERE sa.tenant_id=$1
          GROUP BY sa.id
          ORDER BY sa.created_at ASC`,
        [tenant.id]
      )).rows,
      bookingSlots: bookingSlots.rows,
      stripeConnect: planAccess.allCurrentFeatures
        ? stripeConnect
        : { connected:false,chargesEnabled:false,detailsSubmitted:false,payoutsEnabled:false },
      googleCalendar: {
        connected:planAccess.googleCalendar && Boolean(tenant.google_calendar_refresh_token || tenant.google_calendar_access_token),
        email:planAccess.googleCalendar ? (tenant.google_calendar_email || '') : '',
        calendarId:planAccess.googleCalendar ? (tenant.google_calendar_id || 'primary') : 'primary',
      },
      quoteEngine: planAccess.allCurrentFeatures ? {
        serviceName: tenant.quote_service_name || '',
        basePrice: Number(tenant.quote_base_price || 0),
        unitPrice: Number(tenant.quote_unit_price || 0),
        minPrice: Number(tenant.quote_min_price || 0),
        vatPercent: Number(tenant.quote_vat_percent || 0),
        unitLabel: tenant.quote_unit_label || 'kpl',
      } : { serviceName:'',basePrice:0,unitPrice:0,minPrice:0,vatPercent:0,unitLabel:'kpl' },
      integrations: planAccess.allCurrentFeatures ? {
        webhookUrl: tenant.action_webhook_url || '',
        webhookSecret: tenant.action_webhook_secret || '',
        channelsApiKey: tenant.channels_api_key || '',
      } : { webhookUrl:'',webhookSecret:'',channelsApiKey:'' },
      commerce: planAccess.allCurrentFeatures ? {
        provider:tenant.ecommerce_provider || '',
        shopifyShopDomain:tenant.shopify_shop_domain || '',
        shopifyConnected:Boolean(tenant.shopify_access_token),
        wooBaseUrl:tenant.woo_base_url || '',
        wooConnected:Boolean(tenant.woo_consumer_key && tenant.woo_consumer_secret),
      } : { provider:'',shopifyShopDomain:'',shopifyConnected:false,wooBaseUrl:'',wooConnected:false },
      latestSelfTest: latestSelfTest.rows[0] || null,
      truth: (() => {
        const row = truthStats.rows[0] || {};
        const truthTotal = Number(row.total || 0);
        const approved = Number(row.approved || 0);
        const fresh = Number(row.fresh || 0);
        return {
          total: truthTotal,
          approved,
          fresh,
          score: truthTotal ? Math.round(((approved + fresh) / (truthTotal * 2)) * 100) : 0,
          lastVerified: row.last_verified || null,
        };
      })(),
      stats: {
        conversations: total,
        answeredRate: total ? Math.round((a.answered * 100) / total) : 0,
        handoffRate: total ? Math.round((a.handoffs * 100) / total) : 0,
        last7: a.last7 || 0,
        last30: a.last30 || 0,
        leads: leads.rows.length,
        actions30: actionStats.rows.reduce((sum, x) => sum + Number(x.total || 0), 0),
        estimatedLeadValue: Number(tenant.average_lead_value || 0) * leads.rows.length,
      },
    });
  } catch (e) {
    console.error('Dashboard load failed', e);
    return res.status(500).json({ error: 'Hallintapaneelin tietoja ei voitu ladata.' });
  }
});

// Contact edits must supersede obsolete contact details imported from the
// customer's website. Keep manually authored knowledge entries untouched.
function validBusinessEmail(value) {
  return !value || (value.length<=254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value));
}
async function retireOldImportedEmails(client, tenantId, currentEmail) {
  await client.query(
    "UPDATE knowledge SET approved=false,updated_at=NOW() WHERE tenant_id=$1 AND source_type='website' AND lower(title)=lower('Sähköposti') AND lower(trim(answer))<>lower($2)",
    [tenantId,currentEmail]
  );
}

app.post('/api/app/business-profile', auth, ownerOnly, subscribed, async (req, res) => {
  const client = await pool.connect();
  try {
    const t = await client.query('SELECT id,name,slug,website FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1)', [req.user.sub]);
    if (!t.rowCount) return res.status(404).json({ error: 'Työtilaa ei löytynyt.' });
    const tenantId = t.rows[0].id;
    if(req.body.botColor != null && !cleanBotAccent(req.body.botColor)) {
      return res.status(400).json({error:'Botin väri ei ole kelvollinen.'});
    }
    const currentEmail = String(req.body.email || '').trim().toLowerCase();
    if (!validBusinessEmail(currentEmail)) return res.status(400).json({error:'Tarkista yrityksen sähköpostiosoite.'});
    const websiteRaw = String(req.body.website || '').trim();
    const quoteRaw = String(req.body.quoteRequestUrl || '').trim();
    const bookingRaw = String(req.body.bookingUrl || '').trim();
    const website = websiteRaw ? normalizeWebUrl(websiteRaw, true) : '';
    const quoteRequestUrl = quoteRaw ? normalizeWebUrl(quoteRaw, false) : '';
    const bookingUrl = bookingRaw ? normalizeWebUrl(bookingRaw, false) : '';
    if (websiteRaw && !website) {
      return res.status(400).json({ error: 'Tarkista verkkosivun osoite ja yritä uudelleen.' });
    }
    if (quoteRaw && !quoteRequestUrl) {
      return res.status(400).json({ error: 'Tarjouspyyntölomakkeen linkki ei ole kelvollinen.' });
    }
    if (bookingRaw && !bookingUrl) {
      return res.status(400).json({ error: 'Ajanvarauslinkki ei ole kelvollinen.' });
    }
    if (website && !tenantWebsiteImportAllowed(t.rows[0],website)) {
      return res.status(400).json({ error:'Respondo AI:n omaan työtilaan ei voi vaihtaa toisen yrityksen verkkosivua. Testaa ulkopuolisia sivuja Testaa bottia -näkymässä.' });
    }

    const fields = [
      ['Hinnat', req.body.pricing, ['hinta','hinnasto','maksaa','alv']],
      ['Aukioloajat', req.body.hours, ['auki','aukiolo','aukioloajat','milloin']],
      ['Puhelinnumero', req.body.phone, ['puhelin','numero','soittaa','yhteystiedot']],
      ['Sähköposti', currentEmail, ['sähköposti','email','yhteystiedot']],
      ['Palvelut', req.body.services, ['palvelu','palvelut','teette','tarjoatte']],
      ['Toimialue', req.body.serviceArea, ['toimialue','alue','missä','paikkakunta']],
      ['Osoite', req.body.address, ['osoite','sijainti','missä']],
      ['Verkkosivu', website, ['verkkosivu','www','nettisivu']],
      ['Tarjouspyyntölomake', quoteRequestUrl, ['tarjous','tarjouspyyntö','tarjouspyyntölomake','pyydä tarjous','lomake']],
      ['Ajanvarauslinkki', bookingUrl, ['ajanvaraus','varaa','aika','booking']],
      ['Lisätiedot', req.body.notes, ['lisätieto','muuta','huomio']],
      ['Vastaustyyli', req.body.tone, ['tyyli']]
    ];

    await client.query('BEGIN');
    await retireOldImportedEmails(client,tenantId,currentEmail);
    await client.query(
      "DELETE FROM knowledge WHERE tenant_id=$1 AND category='Yrityksen perustiedot'",
      [tenantId]
    );

    for (const [title, value, keywords] of fields) {
      const answer = String(value || '').trim();
      if (!answer) continue;
      await client.query(
        `INSERT INTO knowledge(id,tenant_id,category,title,answer,keywords,source_type,source_url,approved,verified_at)
         VALUES($1,$2,$3,$4,$5,$6,'profile',$7,true,NOW())`,
        [uid(), tenantId, 'Yrityksen perustiedot', title, answer, keywords, website || null]
      );
    }

    await client.query(
      'UPDATE tenants SET contact_phone=$1, contact_email=$2, website=$3, greeting=$4, average_lead_value=$5, bot_name=$6, bot_avatar=$7, accent=COALESCE($8,accent), updated_at=NOW() WHERE id=$9',
      [
        String(req.body.phone || '').trim() || null,
        currentEmail || null,
        website || null,
        String(req.body.greeting || '').trim().slice(0, 220) || 'Hei! Miten voin auttaa?',
        Math.max(0, Number(req.body.averageLeadValue || 0)) || 0,
        cleanBotName(req.body.botName),
        cleanBotAvatar(req.body.botAvatar),
        cleanBotAccent(req.body.botColor),
        tenantId
      ]
    );

    await client.query('COMMIT');
    return res.json({ ok: true });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Business profile save failed', e);
    return res.status(500).json({ error: 'Yrityksen tietojen tallennus ei onnistunut.' });
  } finally {
    client.release();
  }
});



// Save the public-facing email independently. Invalid booking URLs or other
// unsaved profile fields must not prevent a simple contact-email correction.
// This does not change the owner's login address or billing email.
app.post('/api/app/business-email', auth, ownerOnly, subscribed, async (req,res)=>{
  const email=String(req.body?.email||'').trim().toLowerCase();
  if (!validBusinessEmail(email)) return res.status(400).json({error:'Tarkista yrityksen sähköpostiosoite.'});
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const found=await client.query('SELECT id FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1) FOR UPDATE',[req.user.sub]);
    if (!found.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({error:'Työtilaa ei löytynyt.'});
    }
    const tenantId=found.rows[0].id;
    await retireOldImportedEmails(client,tenantId,email);
    await client.query(
      "DELETE FROM knowledge WHERE tenant_id=$1 AND category='Yrityksen perustiedot' AND title='Sähköposti'",
      [tenantId]
    );
    if (email) await client.query(
      "INSERT INTO knowledge(id,tenant_id,category,title,answer,keywords,source_type,approved,verified_at) VALUES($1,$2,'Yrityksen perustiedot','Sähköposti',$3,$4,'profile',true,NOW())",
      [uid(),tenantId,email,['sähköposti','email','yhteystiedot']]
    );
    await client.query('UPDATE tenants SET contact_email=$1,updated_at=NOW() WHERE id=$2',[email||null,tenantId]);
    await client.query('COMMIT');
    return res.json({ok:true,email});
  } catch(err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Business contact email save failed',err);
    return res.status(500).json({error:'Sähköpostiosoitteen tallennus ei onnistunut.'});
  } finally {
    client.release();
  }
});

function extractFreeWebsiteProfile(bundle) {
  return essentialWebsiteProfile(bundle);
}

const websiteImportJobs = new Map();
const demoWebsiteImports = new Map();
function cleanDemoWebsiteImports() {
  const now=Date.now();
  for(const [id,item] of demoWebsiteImports) {
    if(!item || now-Number(item.createdAt||0)>2*60*60*1000) demoWebsiteImports.delete(id);
  }
}
async function persistDemoWebsiteImport(id,website,candidates) {
  if(!pool) return;
  try {
    await q("DELETE FROM demo_website_imports WHERE created_at < NOW() - INTERVAL '2 hours'");
    await q(
      `INSERT INTO demo_website_imports(id,website,candidates,created_at)
       VALUES($1,$2,$3::jsonb,NOW())
       ON CONFLICT(id) DO UPDATE SET website=EXCLUDED.website,candidates=EXCLUDED.candidates,created_at=NOW()`,
      [id,website,JSON.stringify(Array.isArray(candidates)?candidates:[])]
    );
  } catch(e) {
    console.warn('Demo website import persistence failed',e?.message||e);
  }
}
async function loadDemoWebsiteImport(id) {
  if(!pool || !id) return null;
  try {
    const result=await q(
      `SELECT website,candidates,created_at
         FROM demo_website_imports
        WHERE id=$1 AND created_at > NOW() - INTERVAL '2 hours'
        LIMIT 1`,
      [id]
    );
    if(!result.rowCount) return null;
    const row=result.rows[0];
    return {
      createdAt:new Date(row.created_at).getTime(),
      website:String(row.website||''),
      candidates:Array.isArray(row.candidates)?row.candidates:[],
    };
  } catch(e) {
    console.warn('Demo website import restore failed',e?.message||e);
    return null;
  }
}


app.post('/api/app/import-website/start', auth, ownerOnly, subscribed, async (req,res)=>{
  if(!await requirePlanCapability(req,res,'websiteImport')) return;
  const website=normalizeWebUrl(req.body.website,false);
  if(!website) return res.status(400).json({error:'Lisää ensin verkkosivusi osoite.'});
  const tenantResult=await q('SELECT id,name,slug,website FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1)',[req.user.sub]);
  if(!tenantResult.rowCount) return res.status(404).json({error:'Työtilaa ei löytynyt.'});
  if(!tenantWebsiteImportAllowed(tenantResult.rows[0],website)) {
    return res.status(400).json({error:'Respondo AI:n omaan työtilaan ei voi tuoda toisen yrityksen tietoja. Käytä Testaa bottia -näkymää.'});
  }
  const tenantId=tenantResult.rows[0].id;
  // Remove completed jobs and also abandon a running job that has stopped
  // updating. Otherwise one stuck crawl can make the import button appear dead
  // forever for the same account.
  for (const [id, old] of websiteImportJobs) {
    const age = Date.now() - Number(old.updatedAt || 0);
    if ((old.status !== 'running' && age > 10*60*1000) || (old.status === 'running' && age > 5*60*1000)) {
      websiteImportJobs.delete(id);
    }
  }
  const active = [...websiteImportJobs.values()].find(job => job.userId === req.user.sub && job.tenantId === tenantId && job.status === 'running');
  if (active) return res.json({ok:true,jobId:active.id});
  if ([...websiteImportJobs.values()].filter(job=>job.status==='running').length >= 4) return res.status(429).json({error:'Haku on ruuhkautunut. Yritä hetken kuluttua uudelleen.'});
  const jobId=uid();
  const job={id:jobId,userId:req.user.sub,tenantId,website,status:'running',scanned:0,total:1,percent:0,result:null,error:null,updatedAt:Date.now()};
  websiteImportJobs.set(jobId,job);
  res.json({ok:true,jobId});
  (async()=>{
    try{
      // Keep raw HTML memory bounded. 10k URLs may be discovered, but process a safe high-value batch per job.
      const bundle=await fetchWebsiteBundle(website,600,4*60*1000,(p)=>{
        job.scanned=p.scanned; job.total=Math.max(p.total,p.scanned,1);
        job.percent=Math.min(99,Math.round((job.scanned/job.total)*100)); job.updatedAt=Date.now();
      });
      const candidates=websiteKnowledgeCandidates(bundle);
      const detectedProfile=extractFreeWebsiteProfile(bundle);
      job.result={ok:true,jobId,profile:detectedProfile,pagesScanned:bundle.pages.length,factsFound:candidates.length,candidates,extraction:'local'};
      job.scanned=bundle.pages.length; job.total=Math.max(job.total,job.scanned); job.percent=100; job.status='done'; job.updatedAt=Date.now();
    }catch(e){job.status='error';job.error=e?.message||'Verkkosivun tietojen tuonti epäonnistui.';job.updatedAt=Date.now();}
  })();
});

app.get('/api/app/import-website/status/:jobId', auth, ownerOnly, subscribed, async (req,res)=>{
  if(!await requirePlanCapability(req,res,'websiteImport')) return;
  const job=websiteImportJobs.get(req.params.jobId);
  const tenantResult=await q('SELECT id FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1)',[req.user.sub]);
  const tenantId=tenantResult.rows[0]?.id || '';
  if(!job||job.userId!==req.user.sub||job.tenantId!==tenantId) return res.status(404).json({error:'Hakua ei löytynyt.'});
  res.json({status:job.status,scanned:job.scanned,total:job.total,percent:job.percent,error:job.error,result:job.status==='done'?job.result:null});
  if(job.status!=='running' && Date.now()-job.updatedAt>10*60*1000) websiteImportJobs.delete(job.id);
});

app.post('/api/app/import-website', auth, ownerOnly, subscribed, async (req, res) => {
  if(!await requirePlanCapability(req,res,'websiteImport')) return;
  try {
    const website = normalizeWebUrl(req.body.website, false);
    if (!website) return res.status(400).json({ error: 'Lisää ensin verkkosivusi osoite.' });
    const tenantResult=await q('SELECT id,name,slug,website FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1)',[req.user.sub]);
    if(!tenantResult.rowCount) return res.status(404).json({error:'Työtilaa ei löytynyt.'});
    if(!tenantWebsiteImportAllowed(tenantResult.rows[0],website)) {
      return res.status(400).json({error:'Respondo AI:n omaan työtilaan ei voi tuoda toisen yrityksen tietoja. Käytä Testaa bottia -näkymää.'});
    }
    const bundle = await fetchWebsiteBundle(website, 300, 65000);
    const candidates = websiteKnowledgeCandidates(bundle);
    const detectedProfile = extractFreeWebsiteProfile(bundle);
    return res.json({
      ok:true,
      profile:detectedProfile,
      pagesScanned:bundle.pages.length,
      factsFound:candidates.length,
      candidates,
      extraction:'local',
    });
  } catch (e) {
    console.error('Website import failed', e);
    return res.status(400).json({ error: safeWebsiteImportError(e) });
  }
});

app.post('/api/app/import-website/approve', auth, ownerOnly, subscribed, async (req, res) => {
  if(!await requirePlanCapability(req,res,'websiteImport')) return;
  const client = await pool.connect();
  try {
    const tenantResult = await client.query('SELECT id,name,slug,website FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1)', [req.user.sub]);
    if (!tenantResult.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenant = tenantResult.rows[0];
    const tenantId = tenant.id;
    let items=[];
    const jobId=String(req.body?.jobId||'').trim();
    if(jobId){
      const job=websiteImportJobs.get(jobId);
      if(!job || job.userId!==req.user.sub || job.tenantId!==tenantId || job.status!=='done') return res.status(400).json({error:'Verkkosivun hakutulosta ei enää löytynyt. Hae tiedot uudelleen.'});
      const indexes=[...new Set((Array.isArray(req.body?.indexes)?req.body.indexes:[])
        .map((value)=>Number(value)).filter((value)=>Number.isInteger(value)&&value>=0&&value<job.result.candidates.length))].slice(0,10000);
      items=indexes.map((index)=>job.result.candidates[index]).filter(Boolean);
    } else {
      items=Array.isArray(req.body.items)?req.body.items.slice(0,10000):[];
    }
    const tenantWebsite = String(tenant.website || '');
    if (!items.length) return res.status(400).json({ error:'Valitse vähintään yksi tieto.' });

    await client.query('BEGIN');
    let added = 0;
    for (const item of items) {
      const title = String(item?.title || '').trim().slice(0,180);
      const answer = String(item?.answer || '').trim().slice(0,1600);
      const category = String(item?.category || 'Verkkosivulta tuotu').trim().slice(0,80) || 'Verkkosivulta tuotu';
      const sourceUrl = normalizeWebUrl(item?.sourceUrl, false);
      if (!title || !answer || !sourceUrl) continue;
      const safetyText = normalizeSearchText(title+' '+category+' '+answer.slice(0,900)+' '+sourceUrl);
      if (/terms of service|privacy policy|tietosuoja|kayttoeh|käyttöeh|cookie policy|evaste|eväste|legal notice|all rights reserved|localstorage|sessionstorage|const |let |var |function |\.includes\(|\.getitem\(|\.setitem\(|document\.|window\.|queryselector|addeventlistener|json\.stringify|json\.parse/.test(safetyText)) continue;
      if (!usableWebsiteRow({title,answer,category,source_type:'website'}) || title.length < 3) continue;
      const sourceHost = normalizeHost(sourceUrl);
      if (isFirstPartyRespondoTenant(tenant)) {
        if (!respondoFirstPartyWebsiteAllowed(sourceUrl)) continue;
      } else if (tenantWebsite && sourceHost !== normalizeHost(tenantWebsite)) continue;
      const keywords = Array.isArray(item?.keywords)
        ? item.keywords.map((x) => String(x).trim()).filter(Boolean).slice(0,14)
        : searchTokens(title + ' ' + answer).slice(0,14);
      const duplicate = await client.query(
        "SELECT id FROM knowledge WHERE tenant_id=$1 AND source_type='website' AND source_url=$2 AND lower(title)=lower($3) LIMIT 1",
        [tenantId, sourceUrl, title],
      );
      if (duplicate.rowCount) {
        await client.query(
          `UPDATE knowledge SET category=$1,answer=$2,keywords=$3,source_type='website',source_url=$4,approved=true,verified_at=NOW(),updated_at=NOW() WHERE id=$5 AND tenant_id=$6`,
          [category, answer, keywords, sourceUrl, duplicate.rows[0].id, tenantId],
        );
      } else {
        await client.query(
          `INSERT INTO knowledge(id,tenant_id,category,title,answer,keywords,source_type,source_url,approved,verified_at)
           VALUES($1,$2,$3,$4,$5,$6,'website',$7,true,NOW())`,
          [uid(),tenantId,category,title,answer,keywords,sourceUrl],
        );
      }
      added++;
    }
    if (!added) { await client.query('ROLLBACK'); return res.status(400).json({error:'Valituista tiedoista ei löytynyt hyväksyttäviä yritystietoja.'}); }
    await client.query('COMMIT');
    return res.json({ok:true,added});
  } catch(e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Website knowledge approval failed',e);
    return res.status(500).json({error:'Verkkosivulta löydettyjen tietojen tallennus epäonnistui.'});
  } finally {
    client.release();
  }
});

app.post('/api/app/unanswered/:id/answer', auth, ownerOnly, subscribed, async (req, res) => {
  const client = await pool.connect();
  try {
    const answer = String(req.body.answer || '').trim();
    if (!answer) return res.status(400).json({ error: 'Kirjoita vastaus ensin.' });

    const tenantResult = await client.query('SELECT id FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1)', [req.user.sub]);
    if (!tenantResult.rowCount) return res.status(404).json({ error: 'Työtila puuttuu.' });
    const tenantId = tenantResult.rows[0].id;

    const conversation = await client.query(
      'SELECT id, question FROM conversations WHERE id=$1 AND tenant_id=$2 AND handoff=true',
      [req.params.id, tenantId],
    );
    if (!conversation.rowCount) return res.status(404).json({ error: 'Kysymystä ei löytynyt.' });

    const question = String(conversation.rows[0].question || '').trim();
    const keywords = question
      .toLowerCase()
      .split(/[^a-zA-ZåäöÅÄÖ0-9]+/)
      .map((x) => x.trim())
      .filter((x) => x.length > 2)
      .slice(0, 12);

    await client.query('BEGIN');
    const added = await client.query(
      `INSERT INTO knowledge(id,tenant_id,category,title,answer,keywords,source_type,approved,verified_at)
       VALUES($1,$2,$3,$4,$5,$6,'owner_answer',true,NOW()) RETURNING *`,
      [uid(), tenantId, 'Asiakaskysymykset', question, answer, keywords],
    );
    await client.query(
      "UPDATE conversations SET intent='Resolved gap' WHERE id=$1 AND tenant_id=$2",
      [req.params.id, tenantId],
    );
    await client.query('COMMIT');

    return res.json({ ok: true, knowledge: added.rows[0] });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Resolve unanswered failed', e);
    return res.status(500).json({ error: 'Vastauksen tallennus epäonnistui.' });
  } finally {
    client.release();
  }
});

app.post('/api/app/knowledge', auth, ownerOnly, subscribed, async (req, res) => {
  try {
    const t = await q('SELECT id FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1)', [req.user.sub]);
    if (!t.rowCount) return res.status(404).json({ error: 'Työtila puuttuu.' });
    const { category = 'Yleinen', title, answer, keywords = '' } = req.body;
    if (!title || !answer) return res.status(400).json({ error: 'Otsikko ja vastaus tarvitaan.' });
    const ks = Array.isArray(keywords)
      ? keywords
      : String(keywords)
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean);
    const r = await q(
      `INSERT INTO knowledge(id,tenant_id,category,title,answer,keywords,source_type,approved,verified_at)
       VALUES($1,$2,$3,$4,$5,$6,'manual',true,NOW()) RETURNING *`,
      [uid(), t.rows[0].id, category, title, answer, ks],
    );
    return res.json(r.rows[0]);
  } catch (e) {
    console.error('Knowledge create failed', e);
    return res.status(500).json({ error: 'Vastausta ei voitu tallentaa.' });
  }
});


app.put('/api/app/knowledge/:id', auth, ownerOnly, subscribed, async (req, res) => {
  try {
    const t = await q('SELECT id FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1)', [req.user.sub]);
    if (!t.rowCount) return res.status(404).json({ error: 'Työtila puuttuu.' });
    const tenantId = t.rows[0].id;
    const existing = await q('SELECT * FROM knowledge WHERE id=$1 AND tenant_id=$2', [req.params.id, tenantId]);
    if (!existing.rowCount) return res.status(404).json({ error: 'Vastausta ei löytynyt.' });
    if (existing.rows[0].source_type === 'profile') return res.status(400).json({ error: 'Yrityksen perustietoja muokataan Yrityksen tiedot -osiosta.' });

    const category = String(req.body.category ?? existing.rows[0].category ?? 'Yleinen').trim() || 'Yleinen';
    const title = String(req.body.title ?? existing.rows[0].title ?? '').trim();
    const answer = String(req.body.answer ?? existing.rows[0].answer ?? '').trim();
    if (!title || !answer) return res.status(400).json({ error: 'Otsikko ja vastaus tarvitaan.' });
    const rawKeywords = req.body.keywords ?? existing.rows[0].keywords ?? [];
    const keywords = Array.isArray(rawKeywords)
      ? rawKeywords.map((x) => String(x).trim()).filter(Boolean)
      : String(rawKeywords).split(',').map((x) => x.trim()).filter(Boolean);

    const r = await q(
      `UPDATE knowledge
       SET category=$1,title=$2,answer=$3,keywords=$4,approved=true,verified_at=NOW(),updated_at=NOW()
       WHERE id=$5 AND tenant_id=$6 RETURNING *`,
      [category,title,answer,keywords,req.params.id,tenantId],
    );
    return res.json({ ok:true, knowledge:r.rows[0] });
  } catch (e) {
    console.error('Knowledge update failed', e);
    return res.status(500).json({ error: 'Vastauksen muokkaus epäonnistui.' });
  }
});

app.delete('/api/app/knowledge/:id', auth, ownerOnly, subscribed, async (req, res) => {
  try {
    const t = await q('SELECT id FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1)', [req.user.sub]);
    if (!t.rowCount) return res.status(404).json({ error: 'Työtila puuttuu.' });
    const tenantId = t.rows[0].id;
    const existing = await q('SELECT source_type FROM knowledge WHERE id=$1 AND tenant_id=$2', [req.params.id, tenantId]);
    if (!existing.rowCount) return res.status(404).json({ error: 'Vastausta ei löytynyt.' });
    if (existing.rows[0].source_type === 'profile') return res.status(400).json({ error: 'Yrityksen perustietoja ei poisteta tästä osiosta.' });
    await q('DELETE FROM knowledge WHERE id=$1 AND tenant_id=$2', [req.params.id, tenantId]);
    return res.json({ ok:true });
  } catch (e) {
    console.error('Knowledge delete failed', e);
    return res.status(500).json({ error: 'Vastauksen poistaminen epäonnistui.' });
  }
});


app.post('/api/app/knowledge/:id/quick-reply', auth, ownerOnly, subscribed, async (req, res) => {
  const client = await pool.connect();
  try {
    const featured = req.body?.featured === true;
    await client.query('BEGIN');

    const tr = await client.query(
      'SELECT id FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1) FOR UPDATE',
      [req.user.sub],
    );
    if (!tr.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Työtila puuttuu.' });
    }
    const tenantId = tr.rows[0].id;

    const item = await client.query(
      'SELECT id,title,source_type,quick_reply_order FROM knowledge WHERE id=$1 AND tenant_id=$2',
      [req.params.id, tenantId],
    );
    if (!item.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Vastausta ei löytynyt.' });
    }
    if (item.rows[0].source_type === 'profile') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Valitse etusivulle oma kysymys–vastaus tietopohjasta.' });
    }

    let quickReplyOrder = item.rows[0].quick_reply_order;
    if (featured) {
      if (!quickReplyOrder) {
        const used = await client.query(
          'SELECT quick_reply_order FROM knowledge WHERE tenant_id=$1 AND quick_reply_order IS NOT NULL ORDER BY quick_reply_order',
          [tenantId],
        );
        const slots = new Set(used.rows.map((x) => Number(x.quick_reply_order)));
        quickReplyOrder = [1,2,3].find((slot) => !slots.has(slot)) || null;
        if (!quickReplyOrder) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Voit valita enintään 3 kysymystä botin etusivulle.' });
        }
        await client.query(
          'UPDATE knowledge SET quick_reply_order=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3',
          [quickReplyOrder, req.params.id, tenantId],
        );
      }
    } else if (quickReplyOrder) {
      await client.query(
        'UPDATE knowledge SET quick_reply_order=NULL,updated_at=NOW() WHERE id=$1 AND tenant_id=$2',
        [req.params.id, tenantId],
      );
      quickReplyOrder = null;
    }

    const countResult = await client.query(
      'SELECT count(*)::int AS total FROM knowledge WHERE tenant_id=$1 AND quick_reply_order IS NOT NULL',
      [tenantId],
    );
    await client.query('COMMIT');
    return res.json({
      ok:true,
      featured:Boolean(quickReplyOrder),
      quickReplyOrder,
      selected:Number(countResult.rows[0]?.total || 0),
      max:3,
    });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Quick reply update failed', e);
    return res.status(500).json({ error:'Etusivun kysymystä ei voitu päivittää.' });
  } finally {
    client.release();
  }
});




async function getGoogleCalendarAccessToken(tenant) {
  if (!tenant?.google_calendar_refresh_token && !tenant?.google_calendar_access_token) return '';

  const existing = decryptSecret(tenant.google_calendar_access_token);
  const expiresAt = tenant.google_calendar_token_expires_at
    ? new Date(tenant.google_calendar_token_expires_at).getTime()
    : 0;
  if (existing && expiresAt > Date.now() + 60000) return existing;

  const refreshToken = decryptSecret(tenant.google_calendar_refresh_token);
  if (!refreshToken) return existing;

  const cfg = oauthConfig('google');
  if (!cfg.configured) return '';

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method:'POST',
    headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
    body:new URLSearchParams({
      client_id:cfg.clientId,
      client_secret:cfg.clientSecret,
      refresh_token:refreshToken,
      grant_type:'refresh_token',
    }),
  });
  if (!response.ok) throw new Error('Google Calendar token refresh failed');
  const token = await response.json();
  const accessToken = String(token.access_token || '');
  if (!accessToken) throw new Error('Google Calendar access token missing');
  const expires = new Date(Date.now() + Number(token.expires_in || 3600) * 1000);

  await q(
    `UPDATE tenants
        SET google_calendar_access_token=$1,
            google_calendar_token_expires_at=$2,
            updated_at=NOW()
      WHERE id=$3`,
    [encryptSecret(accessToken),expires,tenant.id],
  );
  tenant.google_calendar_access_token = encryptSecret(accessToken);
  tenant.google_calendar_token_expires_at = expires;
  return accessToken;
}

async function googleCalendarEvents(tenant, timeMin, timeMax) {
  if (!tenant?.google_calendar_refresh_token && !tenant?.google_calendar_access_token) return [];
  const token = await getGoogleCalendarAccessToken(tenant);
  if (!token) return [];
  const calendarId = tenant.google_calendar_id || 'primary';
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(calendarId) + '/events');
  url.search = new URLSearchParams({
    timeMin:new Date(timeMin).toISOString(),
    timeMax:new Date(timeMax).toISOString(),
    singleEvents:'true',
    orderBy:'startTime',
    maxResults:'250',
  }).toString();

  const response = await fetch(url, {
    headers:{ Authorization:'Bearer ' + token },
  });
  if (!response.ok) throw new Error('Google Calendar events fetch failed');
  const data = await response.json();
  return (Array.isArray(data.items) ? data.items : [])
    .filter((event) => event.status !== 'cancelled' && event.start?.dateTime && event.end?.dateTime)
    .map((event) => ({
      id:event.id,
      start:new Date(event.start.dateTime),
      end:new Date(event.end.dateTime),
    }))
    .filter((event) => Number.isFinite(event.start.getTime()) && Number.isFinite(event.end.getTime()));
}

async function googleCalendarHasConflict(tenant, start, end) {
  if (!tenant?.google_calendar_refresh_token && !tenant?.google_calendar_access_token) return false;
  const events = await googleCalendarEvents(tenant,start,end);
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  return events.some((event) => event.start.getTime() < b && event.end.getTime() > a);
}

async function createGoogleCalendarBooking(tenant, actionRequest) {
  if (!tenant?.google_calendar_refresh_token && !tenant?.google_calendar_access_token) {
    return { status:'not_configured' };
  }
  const booking = actionRequest?.payload?.booking;
  if (!booking?.startsAt || !booking?.endsAt) return { status:'skipped' };

  const token = await getGoogleCalendarAccessToken(tenant);
  if (!token) return { status:'failed' };
  const calendarId = tenant.google_calendar_id || 'primary';
  const fields = actionRequest.payload?.fields || {};
  const contact = actionContact(fields);
  const attendees = contact.email ? [{ email:contact.email }] : undefined;

  const calendarEventId=('respondo' + String(actionRequest.id || '').replace(/[^a-f0-9]/gi,'').toLowerCase()).slice(0,120);
  const eventBody = {
    ...(calendarEventId ? { id:calendarEventId } : {}),
    summary:(tenant.name || 'RESPONDO') + ' · ' + (fields.name || 'Asiakas'),
    description:[
      'Varaus luotu RESPONDO AI:n kautta.',
      fields.note ? 'Lisätieto: ' + fields.note : '',
      contact.email ? 'Sähköposti: ' + contact.email : '',
      contact.phone ? 'Puhelin: ' + contact.phone : '',
      actionRequest.payload?.question ? 'Keskustelu: ' + actionRequest.payload.question : '',
    ].filter(Boolean).join('\n'),
    start:{ dateTime:new Date(booking.startsAt).toISOString() },
    end:{ dateTime:new Date(booking.endsAt).toISOString() },
    attendees,
    extendedProperties:{
      private:{
        respondo_action_request_id:actionRequest.id,
        respondo_tenant_id:tenant.id,
      },
    },
  };

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(calendarId) + '/events?sendUpdates=all',
    {
      method:'POST',
      headers:{
        Authorization:'Bearer ' + token,
        'Content-Type':'application/json',
      },
      body:JSON.stringify(eventBody),
    },
  );
  if (!response.ok) {
    // The deterministic event id makes retries safe. Google returns 409 when
    // the same action already created the event, which is an idempotent success.
    if (response.status === 409 && calendarEventId) {
      return { status:'synced', eventId:calendarEventId, htmlLink:'', duplicate:true };
    }
    const body = await response.text().catch(() => '');
    throw new Error('Google Calendar event create failed: ' + body.slice(0,200));
  }
  const event = await response.json();
  return {
    status:'synced',
    eventId:event.id || '',
    htmlLink:event.htmlLink || '',
  };
}


function safeEqualText(a,b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && crypto.timingSafeEqual(left,right);
}

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&apos;');
}

function normalizePhone(value) {
  return String(value || '').trim().replace(/[^+\d]/g,'').slice(0,32);
}

async function shopifyGraphql(tenant, query, variables = {}) {
  const shop = String(tenant.shopify_shop_domain || '').trim().toLowerCase()
    .replace(/^https?:\/\//,'')
    .replace(/\/$/,'');
  const token = decryptSecret(tenant.shopify_access_token);
  if (!shop || !token) throw new Error('Shopify-yhteyttä ei ole määritetty.');
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) {
    throw new Error('Shopify-kaupan osoite ei ole kelvollinen.');
  }
  const response = await fetch('https://' + shop + '/admin/api/2026-07/graphql.json', {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'X-Shopify-Access-Token':token,
    },
    body:JSON.stringify({ query, variables }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.errors) {
    const message = data?.errors?.[0]?.message || 'Shopify API -kutsu epäonnistui.';
    throw new Error(message);
  }
  return data.data || {};
}

async function lookupShopifyOrder(tenant, orderNumber, email) {
  const number = String(orderNumber || '').trim().replace(/^#/,'').slice(0,120);
  const customerEmail = cleanEmail(email);
  const search = ['name:#' + number, customerEmail ? 'email:' + customerEmail : ''].filter(Boolean).join(' ');
  const data = await shopifyGraphql(tenant,`
    query RespondoOrderLookup($query:String!) {
      orders(first:10, query:$query, sortKey:CREATED_AT, reverse:true) {
        nodes {
          id
          name
          email
          processedAt
          displayFinancialStatus
          displayFulfillmentStatus
          currentTotalPriceSet { shopMoney { amount currencyCode } }
          fulfillments {
            status
            trackingInfo { company number url }
          }
        }
      }
    }`,{ query:search });
  const nodes = data?.orders?.nodes || [];
  const match = nodes.find((order) => {
    const sameNumber = String(order.name || '').replace(/^#/,'') === number;
    const sameEmail = cleanEmail(order.email) === customerEmail;
    return sameNumber && sameEmail;
  });
  if (!match) return null;
  const money = match.currentTotalPriceSet?.shopMoney || {};
  const tracking = (match.fulfillments || []).flatMap((x) => x.trackingInfo || []).filter(Boolean);
  return {
    provider:'shopify',
    orderNumber:match.name,
    financialStatus:match.displayFinancialStatus || '',
    fulfillmentStatus:match.displayFulfillmentStatus || '',
    processedAt:match.processedAt || null,
    amount:money.amount || '',
    currency:money.currencyCode || '',
    tracking:tracking.slice(0,5),
  };
}

async function wooApi(tenant, pathName, params = {}) {
  const rawBase = String(tenant.woo_base_url || '').trim();
  const key = decryptSecret(tenant.woo_consumer_key);
  const secret = decryptSecret(tenant.woo_consumer_secret);
  if (!rawBase || !key || !secret) throw new Error('WooCommerce-yhteyttä ei ole määritetty.');
  const base = await assertPublicHttpUrl(rawBase);
  if (base.protocol !== 'https:') throw new Error('WooCommerce-kaupan pitää käyttää HTTPS-yhteyttä.');
  const url = new URL('/wp-json/wc/v3/' + String(pathName || '').replace(/^\/+/,''),base.origin);
  Object.entries(params).forEach(([k,v]) => {
    if (v !== undefined && v !== null && String(v) !== '') url.searchParams.set(k,String(v));
  });
  const resolved = await resolvePinnedPublicAddress(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await pinnedPublicRequest(url,resolved,controller.signal,{
      method:'GET',
      headers:{
        Authorization:'Starter ' + Buffer.from(key + ':' + secret).toString('base64'),
        'Accept':'application/json',
      },
    });
    const raw = await readPinnedResponse(response,1_000_000);
    let data={};
    try { data=raw ? JSON.parse(raw) : {}; } catch {}
    const status=Number(response.statusCode || 0);
    if (status < 200 || status >= 300) throw new Error(data?.message || 'WooCommerce API -kutsu epäonnistui.');
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function lookupWooOrder(tenant, orderNumber, email) {
  const number = String(orderNumber || '').trim().replace(/^#/,'').slice(0,120);
  const customerEmail = cleanEmail(email);
  const orders = await wooApi(tenant,'orders',{
    search:number,
    per_page:20,
    orderby:'date',
    order:'desc',
  });
  const match = (Array.isArray(orders) ? orders : []).find((order) => {
    const sameNumber = String(order.number || order.id || '') === number;
    const sameEmail = cleanEmail(order.billing?.email) === customerEmail;
    return sameNumber && sameEmail;
  });
  if (!match) return null;
  return {
    provider:'woocommerce',
    orderNumber:String(match.number || match.id || number),
    financialStatus:String(match.status || ''),
    fulfillmentStatus:String(match.status || ''),
    processedAt:match.date_created_gmt || match.date_created || null,
    amount:String(match.total || ''),
    currency:String(match.currency || ''),
    tracking:[],
  };
}

async function lookupEcommerceOrder(tenant, orderNumber, email) {
  const provider = String(tenant.ecommerce_provider || '').trim();
  if (provider === 'shopify') return lookupShopifyOrder(tenant,orderNumber,email);
  if (provider === 'woocommerce') return lookupWooOrder(tenant,orderNumber,email);
  return null;
}

function orderStatusText(order, lang = 'fi') {
  const l = ['fi','sv','en'].includes(String(lang || '').toLowerCase()) ? String(lang).toLowerCase() : 'fi';
  if (!order) {
    if (l === 'en') return 'I could not find an order matching that order number and email.';
    if (l === 'sv') return 'Jag kunde inte hitta en order med det ordernumret och den e-postadressen.';
    return 'Tilausta ei löytynyt tällä tilausnumerolla ja sähköpostilla.';
  }
  const tracking = Array.isArray(order.tracking) && order.tracking.length
    ? order.tracking.map((x) => x.url || x.number).filter(Boolean).join(', ')
    : '';
  if (l === 'en') return ['Order ' + order.orderNumber + ' was found.',order.fulfillmentStatus ? 'Fulfillment: ' + order.fulfillmentStatus + '.' : '',order.financialStatus ? 'Payment: ' + order.financialStatus + '.' : '',tracking ? 'Tracking: ' + tracking : ''].filter(Boolean).join(' ');
  if (l === 'sv') return ['Order ' + order.orderNumber + ' hittades.',order.fulfillmentStatus ? 'Leveransstatus: ' + order.fulfillmentStatus + '.' : '',order.financialStatus ? 'Betalning: ' + order.financialStatus + '.' : '',tracking ? 'Spårning: ' + tracking : ''].filter(Boolean).join(' ');
  return ['Tilaus ' + order.orderNumber + ' löytyi.',order.fulfillmentStatus ? 'Toimitus: ' + order.fulfillmentStatus + '.' : '',order.financialStatus ? 'Maksu: ' + order.financialStatus + '.' : '',tracking ? 'Seuranta: ' + tracking : ''].filter(Boolean).join(' ');
}

function detectConversationLanguage(text, hinted='') {
  const hint=['fi','sv','en'].includes(String(hinted||'').toLowerCase()) ? String(hinted).toLowerCase() : '';
  const raw=String(text||'').toLowerCase().replace(/[^a-zåäö\s']/g,' ');
  const words=raw.split(/\s+/).filter(Boolean);
  if (!words.length) return hint || 'fi';
  const sets={
    fi:new Set(['ja','on','ei','mitä','mikä','missä','milloin','voiko','voin','haluan','tarvitsen','apua','kiitos','moi','hei','minä','sinä','teillä','hinta','maksaa','ajan','varata','varaus','auki','aukiolo','kuinka','kauan','kauanko','toimitus','toimitusaika','kestää']),
    sv:new Set(['och','är','inte','vad','vilken','var','när','kan','jag','vill','behöver','hjälp','tack','hej','ni','pris','kostar','boka','bokning','öppet','öppettider','hur','länge','leverans','leveranstid']),
    en:new Set(['and','is','are','not','what','which','where','when','can','could','i','you','want','need','help','thanks','thank','hello','hi','price','cost','book','booking','open','hours','how','long','does','do','delivery','shipping','take'])
  };
  const score={fi:0,sv:0,en:0};
  for(const w of words) for(const lang of ['fi','sv','en']) if(sets[lang].has(w)) score[lang]++;
  if(/[å]/.test(raw)) score.sv+=2;
  if(/[äö]/.test(raw)) score.fi+=1;
  const best=Object.entries(score).sort((a,b)=>b[1]-a[1])[0];
  return best[1]>0 ? best[0] : (hint || 'fi');
}

async function getOrCreateThread(tenantId, sourceChannel, externalContactId, visitorRef = null) {
  const channel = String(sourceChannel || 'website').slice(0,40);
  const contact = String(externalContactId || visitorRef || '').slice(0,220);
  if (!contact) return null;
  const existing = await q(
    `SELECT * FROM chat_threads
      WHERE tenant_id=$1 AND source_channel=$2 AND external_contact_id=$3
      LIMIT 1`,
    [tenantId,channel,contact],
  );
  if (existing.rowCount) return existing.rows[0];
  const created = await q(
    `INSERT INTO chat_threads(id,tenant_id,source_channel,external_contact_id,visitor_ref,mode,status,last_activity_at)
     VALUES($1,$2,$3,$4,$5,'ai','open',NOW())
     ON CONFLICT(tenant_id,source_channel,external_contact_id)
     DO UPDATE SET last_activity_at=NOW()
     RETURNING *`,
    [uid(),tenantId,channel,contact,visitorRef || contact],
  );
  return created.rows[0];
}

async function appendChatMessage({
  tenantId, threadId, sourceChannel, externalContactId, visitorRef,
  role, text, metadata = {},
}) {
  const row = await q(
    `INSERT INTO chat_messages(
       id,tenant_id,thread_id,source_channel,external_contact_id,visitor_ref,role,message,metadata
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
     RETURNING *`,
    [
      uid(),tenantId,threadId || null,String(sourceChannel || 'website').slice(0,40),
      String(externalContactId || visitorRef || '').slice(0,220) || null,
      String(visitorRef || '').slice(0,160) || null,
      String(role || 'user').slice(0,30),String(text || '').slice(0,4000),
      JSON.stringify(metadata || {}),
    ],
  );
  if (threadId) {
    await q('UPDATE chat_threads SET last_activity_at=NOW(),updated_at=NOW() WHERE id=$1 AND tenant_id=$2',[threadId,tenantId]);
  }
  return row.rows[0];
}

async function processExternalChannelMessage(tenant, channel, contactId, message, lang = 'fi') {
  const thread = await getOrCreateThread(tenant.id,channel,contactId,contactId);
  await appendChatMessage({
    tenantId:tenant.id,threadId:thread?.id,sourceChannel:channel,
    externalContactId:contactId,visitorRef:contactId,role:'user',text:message,
  });

  if (thread?.mode === 'human') {
    return { humanTakeover:true,answer:'' };
  }

  const kr = await q(
    'SELECT * FROM knowledge WHERE tenant_id=$1 AND approved=true ORDER BY updated_at DESC,created_at DESC',
    [tenant.id],
  );
  const hr = await q(
    `SELECT role,message
       FROM chat_messages
      WHERE tenant_id=$1 AND thread_id=$2
      ORDER BY created_at DESC LIMIT 12`,
    [tenant.id,thread?.id],
  );
  const historyRows = hr.rows.reverse();
  const history = [];
  for (let i=0;i<historyRows.length;i+=2) {
    const user = historyRows[i];
    const assistant = historyRows[i+1];
    if (user?.role === 'user') {
      history.push({ question:user.message,answer:assistant?.message || '',handoff:false });
    }
  }

  const result = await generateGroundedAnswer({
    companyName:tenant.name,rows:kr.rows,message,history,lang,pageContext:{},
  });
  const responseLang = ['fi','sv','en'].includes(String(lang || '').toLowerCase()) ? String(lang).toLowerCase() : 'fi';
  let answer = sanitizeUserFacingText(result.answer);
  let handoff = result.handoff;
  if (handoff) {
    answer = responseLang === 'en'
      ? 'I do not have a verified answer yet. A person from the company needs to handle this.'
      : responseLang === 'sv'
        ? 'Jag har ännu inget verifierat svar. Någon från företaget behöver hantera detta.'
        : 'Tähän ei löytynyt vielä varmennettua vastausta. Yrityksen henkilön pitää käsitellä tämä.';
  }

  await appendChatMessage({
    tenantId:tenant.id,threadId:thread?.id,sourceChannel:channel,
    externalContactId:contactId,visitorRef:contactId,role:'assistant',text:answer,
    metadata:{ handoff,intent:result.intent,sourceIds:result.sourceIds },
  });
  await q(
    `INSERT INTO conversations(id,tenant_id,question,answer,intent,confidence,source_ids,handoff,visitor_ref,source_channel,external_contact_id)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [uid(),tenant.id,message,answer,result.intent,handoff ? Math.min(result.confidence,0.35) : result.confidence,result.sourceIds,handoff,contactId,channel,contactId],
  );
  return {
    answer,handoff,
    verified:!handoff && Array.isArray(result.sourceIds) && result.sourceIds.length>0,
    intent:result.intent,actions:chatActions(kr.rows,message,handoff,responseLang,result.selected),
  };
}

function cleanActionFields(type, input = {}) {
  const src = input && typeof input === 'object' ? input : {};
  const take = (key, max = 600) => String(src[key] || '').trim().slice(0, max);
  if (type === 'quote') {
    return {
      name: take('name',120),
      contact: take('contact',220),
      details: take('details',1800),
      budget: take('budget',120),
    };
  }
  if (type === 'booking') {
    return {
      name: take('name',120),
      contact: take('contact',220),
      date: take('date',40),
      time: take('time',40),
      note: take('note',1000),
    };
  }
  if (type === 'order_status') {
    return {
      orderNumber: take('orderNumber',120),
      email: cleanEmail(src.email).slice(0,220),
    };
  }
  return {
    name: take('name',120),
    contact: take('contact',220),
    note: take('note',1000),
  };
}

function actionContact(fields = {}) {
  const contact = String(fields.contact || '').trim();
  return {
    email: contact.includes('@') ? cleanEmail(contact).slice(0,220) : cleanEmail(fields.email).slice(0,220),
    phone: contact && !contact.includes('@') ? contact.slice(0,80) : '',
  };
}

async function ensureTenantActionKeys(tenant) {
  if (!tenant) return tenant;
  const updates = [];
  const values = [];
  let n = 1;

  if (!tenant.action_webhook_secret) {
    tenant.action_webhook_secret = crypto.randomBytes(24).toString('hex');
    updates.push('action_webhook_secret=$' + n++);
    values.push(tenant.action_webhook_secret);
  }
  if (!tenant.channels_api_key) {
    tenant.channels_api_key = 'rsp_ch_' + crypto.randomBytes(24).toString('hex');
    updates.push('channels_api_key=$' + n++);
    values.push(tenant.channels_api_key);
  }
  if (updates.length) {
    values.push(tenant.id);
    await q(
      'UPDATE tenants SET ' + updates.join(',') + ',updated_at=NOW() WHERE id=$' + n,
      values,
    );
  }
  return tenant;
}

async function dispatchActionWebhook(tenant, actionRequest) {
  if (!tenant?.action_webhook_url) return { status:'not_configured', result:null };
  const url = await assertPublicHttpUrl(tenant.action_webhook_url);
  const payload = JSON.stringify({
    event: 'respondo.action.created',
    tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
    action: actionRequest,
  });
  const signature = crypto
    .createHmac('sha256', tenant.action_webhook_secret || '')
    .update(payload)
    .digest('hex');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const resolved = await resolvePinnedPublicAddress(url);
    const response = await pinnedPublicRequest(url,resolved,controller.signal,{
      method:'POST',
      headers:{
        'content-type':'application/json',
        'user-agent':'RESPONDO-Actions/2.0',
        'x-respondo-signature':'sha256=' + signature,
      },
      body:payload,
    });
    const raw = await readPinnedResponse(response,12000);
    let parsed = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = raw ? { message:raw.slice(0,1000) } : null; }
    const statusCode=Number(response.statusCode || 0);
    return { status: statusCode >= 200 && statusCode < 300 ? 'delivered' : 'failed', result: parsed, httpStatus:statusCode };
  } finally {
    clearTimeout(timer);
  }
}

function validWidgetToken(req, tenant, tokenValue) {
  const origin=requestOrigin(req);
  if (!origin || !widgetOriginAllowed(req,tenant)) return false;
  try {
    const token=jwt.verify(String(tokenValue || ''),JWT);
    return token.kind === 'widget' &&
      token.slug === tenant.slug &&
      token.host === normalizeHost(origin.hostname);
  } catch {
    return false;
  }
}

async function validateWidgetActionRequest(req, tenant, body) {
  return validWidgetToken(req,tenant,body?.widgetToken);
}

async function publicTenant(slugValue) {
  return q(
    `SELECT t.*
       FROM tenants t
       JOIN users u ON u.id=t.owner_user_id
      WHERE t.slug=$1
        AND t.active=true
        AND u.status='active'
        AND t.subscription_status IN ('active','trialing')
        AND (
          COALESCE(t.subscription_cancel_at_period_end,false)=false
          OR t.current_period_end IS NULL
          OR t.current_period_end > NOW()
        )`,
    [slugValue],
  );
}


app.get('/api/public/:slug/widget-token', publicReadLimiter, async (req, res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error: 'Yritystä ei löytynyt.' });
    const tenant = tr.rows[0];

    if (!widgetOriginAllowed(req, tenant)) {
      return res.status(403).json({ error: 'Tämä RESPONDO AI -lisenssi on sidottu toiseen verkkosivuun.' });
    }

    setWidgetCors(req, res);
    const origin = requestOrigin(req);
    const token = jwt.sign(
      {
        kind: 'widget',
        slug: tenant.slug,
        host: normalizeHost(origin.hostname),
      },
      JWT,
      { expiresIn: '12h' }
    );
    const lang = ['fi','sv','en'].includes(String(req.query.lang || '').toLowerCase()) ? String(req.query.lang).toLowerCase() : 'fi';
    const kr = await q(
      `SELECT title
         FROM knowledge
        WHERE tenant_id=$1
          AND approved=true
          AND quick_reply_order IS NOT NULL
        ORDER BY quick_reply_order ASC
        LIMIT 3`,
      [tenant.id],
    );

    const sourceQuickReplies = kr.rows
      .map((x) => String(x.title || '').trim())
      .filter(Boolean)
      .slice(0, 3);
    const quickReplies = lang === 'fi'
      ? sourceQuickReplies
      : (await Promise.all(sourceQuickReplies.map((title) => forceAnswerLanguage(title, lang)))).filter(Boolean);

    const sourceGreeting = String(tenant.greeting || 'Hei! Miten voin auttaa?').trim();
    const translatedGreeting = lang === 'fi' ? sourceGreeting : await forceAnswerLanguage(sourceGreeting, lang);
    const greeting = translatedGreeting || (lang === 'en'
      ? 'Hi! How can I help?'
      : lang === 'sv'
        ? 'Hej! Hur kan jag hjälpa?'
        : 'Hei! Miten voin auttaa?');

    return res.json({
      token,
      name: tenant.bot_name || 'RESPONDO AI',
      avatar: tenant.bot_avatar || 'robot-1',
      greeting,
      accent: tenant.accent,
      quickReplies,
    });
  } catch (e) {
    console.error('Widget token failed', e);
    return res.status(500).json({ error: 'Chatin käynnistäminen ei onnistunut.' });
  }
});


app.get('/api/public/:slug', publicReadLimiter, async (req, res) => {
  try {
    const r = await publicTenant(req.params.slug);
    if (!r.rowCount) return res.status(404).json({ error: 'Yritystä ei löytynyt.' });
    const t = r.rows[0];
    return res.json({
      slug: t.slug,
      name: t.name,
      bot_name: t.bot_name || 'RESPONDO AI',
      bot_avatar: t.bot_avatar || 'robot-1',
      greeting: t.greeting,
      handoff_message: t.handoff_message,
      accent: t.accent,
    });
  } catch (e) {
    console.error('Public tenant profile read failed', e);
    return res.status(500).json({ error: 'Yrityksen tietoja ei voitu ladata.' });
  }
});

app.post('/api/public/demo-import-website', demoImportLimiter, async (req,res)=>{
  const lang=['fi','sv','en'].includes(String(req.body?.lang||'').toLowerCase()) ? String(req.body.lang).toLowerCase() : 'fi';
  const t=(fi,sv,en)=>lang==='sv'?sv:lang==='en'?en:fi;
  try {
    const website=normalizeWebUrl(req.body?.website,false);
    if(!website) return res.status(400).json({error:t(
      'Anna ensin kelvollinen verkkosivun osoite.',
      'Ange först en giltig webbadress.',
      'Enter a valid website address first.'
    )});
    // Same SSRF-safe importer as paid accounts. Demo data is returned only to
    // this browser session and is never persisted to tenant knowledge.
    const bundle=await fetchWebsiteBundle(
      website,
      40,
      12000,
      null,
      { storefrontLimit:300, storefrontBudgetMs:4500, sitemapLimit:800 },
    );
    const allCandidates=websiteKnowledgeCandidates(bundle);
    const candidates=allCandidates.slice(0,2000);
    const profile=extractFreeWebsiteProfile(bundle);
    cleanDemoWebsiteImports();
    const demoImportId=uid();
    demoWebsiteImports.set(demoImportId,{
      createdAt:Date.now(),
      website,
      candidates,
    });
    await persistDemoWebsiteImport(demoImportId,website,candidates);
    return res.json({
      ok:true,
      demoImportId,
      profile,
      pagesScanned:bundle.pages.length,
      factsFound:allCandidates.length,
      candidates,
      truncated:allCandidates.length>candidates.length,
      extraction:'local-demo',
    });
  } catch(e) {
    console.error('Demo website import failed',e?.message||e);
    return res.status(400).json({error:e?.message || t(
      'Verkkosivun tietojen haku epäonnistui.',
      'Det gick inte att hämta webbplatsens uppgifter.',
      'Website import failed.'
    )});
  }
});


app.post('/api/public/demo-chat', demoChatLimiter, async (req, res) => {
  let requestLang = 'fi';
  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};
    const profile = body.profile && typeof body.profile === 'object' ? body.profile : {};
    let refererPath='';
    try { refererPath=new URL(String(req.get('referer')||''),BASE).pathname; } catch {}
    const demoProfileName=normalizeSearchText(profile.companyName||'');
    const isPublicDemo =
      body.publicDemo === true ||
      refererPath === '/assistant' ||
      ['kokeiluyritys','demoforetag','demoföretag','demo company'].includes(demoProfileName);
    const lang = ['fi','sv','en'].includes(String(body.lang || '').toLowerCase()) ? String(body.lang).toLowerCase() : 'fi';
    const message = String(body.message || '').trim().slice(0, 1200);
    if (!message) return res.status(400).json({ error: lang === 'en' ? 'Type a question.' : lang === 'sv' ? 'Skriv en fråga.' : 'Kirjoita kysymys.' });
    const detectedLang=detectConversationLanguage(message,lang);
    requestLang=detectedLang;
    let rows = buildProfileKnowledge(profile).slice(0, 160);
    const demoImportId=String(body.demoImportId||'').trim().slice(0,80);
    if(demoImportId){
      cleanDemoWebsiteImports();
      let imported=demoWebsiteImports.get(demoImportId);
      if(!imported){
        imported=await loadDemoWebsiteImport(demoImportId);
        if(imported) demoWebsiteImports.set(demoImportId,imported);
      }
      if(imported?.candidates?.length){
        const importedRows=imported.candidates.slice(0,2000).map((item,index)=>({
          id:'demo-import-'+index,
          category:String(item?.category||'Verkkosivulta tuotu').slice(0,80),
          title:String(item?.title||item?.category||'').slice(0,180),
          answer:String(item?.answer||'').slice(0,1600),
          keywords:Array.isArray(item?.keywords)?item.keywords.slice(0,32):searchTokens(String(item?.title||'')+' '+String(item?.answer||'')).slice(0,24),
          source_type:'website',
          source_url:normalizeWebUrl(item?.sourceUrl,false)||null,
        })).filter((row)=>row.title&&row.answer);
        rows=[...importedRows,...rows].slice(0,2160);
      }
    }

    // Self-heal an older Try Bot tab after a Railway restart. Older tabs may
    // have restored the JAG website field but lost the in-memory import id.
    // For a broad product question, re-scan that same website instead of ever
    // falling back to the logged-in Respondo owner's knowledge.
    const needsProductRecovery=broadProductQuestion(message);
    const needsContactRecovery=generalContactQuestion(message) &&
      !rows.some(row=>['Yhteydenottolomake','Yhteydenottosivu'].includes(String(row?.title||'')));
    if (isPublicDemo && (needsProductRecovery || needsContactRecovery)) {
      const hasProductFacts=rows.some((row)=>{
        if(String(row?.title||'')==='Verkkosivu') return false;
        return knowledgeTopic(String(row?.category||'')+' '+String(row?.title||''))==='products';
      });
      const website=normalizeWebUrl(profile.website,false);
      if ((needsContactRecovery || (needsProductRecovery && !hasProductFacts)) && website){
        try {
          const bundle=await fetchWebsiteBundle(
            website,
            needsContactRecovery ? 12 : 30,
            needsContactRecovery ? 7000 : 10000,
            null,
            { storefrontLimit:needsContactRecovery?0:250, storefrontBudgetMs:4000, sitemapLimit:needsContactRecovery?0:500 },
          );
          const candidates=websiteKnowledgeCandidates(bundle).slice(0,700);
          const recoveredRows=candidates.map((item,index)=>({
            id:'demo-recovered-'+index,
            category:String(item?.category||'Verkkosivulta tuotu').slice(0,80),
            title:String(item?.title||item?.category||'').slice(0,180),
            answer:String(item?.answer||'').slice(0,1600),
            keywords:Array.isArray(item?.keywords)?item.keywords.slice(0,32):searchTokens(String(item?.title||'')+' '+String(item?.answer||'')).slice(0,24),
            source_type:'website',
            source_url:normalizeWebUrl(item?.sourceUrl,false)||null,
          })).filter((row)=>row.title&&row.answer);
          if(recoveredRows.length) rows=[...recoveredRows,...rows].slice(0,2160);
        } catch(e) {
          console.warn('Public demo self-heal scan failed',e?.message||e);
        }
      }
    }
    // Authenticated dashboard preview must use the tenant's saved knowledge too.
    // Otherwise a normal question such as "Paljonko maksaa?" can accidentally match
    // an unrelated profile field when the pricing field itself is empty.
    // Public Try Bot imports must stay isolated from the logged-in owner's own
    // Respondo knowledge. A deploy/restart must never make a JAG demo answer
    // with Respondo's terms, URLs, or account data.
    if (!isPublicDemo && !demoImportId) {
      try {
        const token = req.cookies?.respondo_session;
        if (token) {
          const session = jwt.verify(token, JWT);
          const tr = await q('SELECT id FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1)',[session.sub]);
          if (tr.rowCount) {
            const kr = await q(
              'SELECT id,category,title,answer,keywords,source_type,source_url FROM knowledge WHERE tenant_id=$1 AND approved=true ORDER BY updated_at DESC,created_at DESC LIMIT 1000',
              [tr.rows[0].id],
            );
            rows = [...kr.rows, ...rows].slice(0, 1100);
          }
        }
      } catch {}
    }
    const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
    const result = await generateGroundedAnswer({
      companyName: String(profile.companyName || 'yrityksen').slice(0, 120),
      rows,
      message,
      history,
      lang:detectedLang,
    });

    const noAnswer = detectedLang === 'en'
      ? 'I cannot find a reliable answer to this in the company information. Leave your name and phone number or email below, and someone from the company can get back to you.'
      : detectedLang === 'sv'
        ? 'Jag hittar inget säkert svar på detta i företagets information. Lämna ditt namn och telefonnummer eller din e-postadress nedan, så kan någon från företaget kontakta dig.'
        : 'Tähän en löydä varmaa vastausta yrityksen tiedoista. Jätä alle nimesi ja puhelinnumerosi tai sähköpostisi, niin yrityksen henkilö voi palata sinulle.';
    const translationUnavailable = detectedLang === 'en'
      ? 'I found the relevant company information, but could not translate the answer reliably right now. Please try again in a moment.'
      : detectedLang === 'sv'
        ? 'Jag hittade relevant företagsinformation men kunde inte översätta svaret tillförlitligt just nu. Försök igen om en stund.'
        : noAnswer;

    let handoff = result.handoff;
    let answer = sanitizeUserFacingText(result.answer);
    const actions = chatActions(rows, message, handoff, detectedLang, result.selected || []);
    // Action URLs are UI data, not conversational answers. If retrieval picked
    // the booking/quote URL itself as the answer, replace it with natural copy
    // and let the client render the URL only as a clickable action.
    const primaryLinkAction = actions.find((action) => action?.url && /^https?:\/\//i.test(action.url));
    // Contact questions are actions, not scraped navigation prose. Do not let
    // headings such as "Yhteystiedot Pyydä tarjous..." become the chat answer.
    if (!handoff && result.intent === 'Yhteystiedot' && !explicitContactQuestion(message)
        && actions.some(action=>action?.url) && !actions.some(action=>action?.mode==='website_contact')) {
      answer = detectedLang === 'en' ? 'You can contact us here:'
        : detectedLang === 'sv' ? 'Du kan kontakta oss här:'
        : 'Voit ottaa yhteyttä tästä:';
    }
    if (!handoff && primaryLinkAction && /^https?:\/\/\S+$/i.test(String(answer || '').trim())) {
      answer = result.intent === 'Ajanvaraus'
        ? (detectedLang === 'en' ? 'You can book an appointment here:' : detectedLang === 'sv' ? 'Du kan boka en tid här:' : 'Voit varata ajan tästä:')
        : result.intent === 'Tarjouspyyntö'
          ? (detectedLang === 'en' ? 'You can request a quote here:' : detectedLang === 'sv' ? 'Du kan be om en offert här:' : 'Voit pyytää tarjouksen tästä:')
          : answer;
    }
    if (handoff && !answer) answer = noAnswer;

    return res.json({
      answer,
      handoff,
      confidence: handoff ? Math.min(result.confidence, 0.35) : result.confidence,
      intent: result.intent,
      actions,
      canLeaveContact: Boolean(handoff),
    });
  } catch (e) {
    console.error('Demo chat failed', e);
    return res.status(500).json({
      error: requestLang === 'en'
        ? 'The response failed. Please try again in a moment.'
        : requestLang === 'sv'
          ? 'Det gick inte att få ett svar just nu. Försök igen om en stund.'
          : 'Vastausta ei saatu juuri nyt. Yritä hetken päästä uudelleen.'
    });
  }
});


app.post('/api/public/demo-lead', publicContactLimiter, async (req,res)=>{
  let lang='fi';
  try {
    let body=req.body;
    if (typeof body === 'string') {
      try { body=JSON.parse(body); } catch { body={}; }
    }
    body=body||{};
    lang=['fi','sv','en'].includes(String(body.lang||'').toLowerCase())
      ? String(body.lang).toLowerCase()
      : 'fi';

    const name=String(body.name||'').trim().slice(0,120);
    const email=cleanEmail(body.email).slice(0,220);
    const phone=String(body.phone||'').trim().slice(0,80);
    const message=String(body.message||'').trim().slice(0,1200);
    const visitorRef=String(body.visitorRef||'preview-contact').trim().slice(0,160) || 'preview-contact';
    const errorText=(fi,sv,en)=>lang==='sv'?sv:lang==='en'?en:fi;

    if (!email && !phone) {
      return res.status(400).json({error:errorText(
        'Anna puhelinnumero tai sähköpostiosoite.',
        'Ange ett telefonnummer eller en e-postadress.',
        'Enter a phone number or email address.'
      )});
    }

    let tenantId='';
    try {
      const token=req.cookies?.respondo_session || cookies(req)[COOKIE];
      if (token) {
        const session=jwt.verify(token,JWT);
        const tr=await q(
          'SELECT id FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1) AND active=true LIMIT 1',
          [session.sub],
        );
        if (tr.rowCount) tenantId=tr.rows[0].id;
      }
    } catch {}

    if (!tenantId) {
      const ownerEmail=cleanEmail(process.env.OWNER_EMAIL||process.env.SUPPORT_EMAIL);
      if (ownerEmail) {
        const tr=await q(
          `SELECT t.id
             FROM tenants t
             JOIN users u ON u.id=t.owner_user_id
            WHERE lower(u.email)=lower($1)
              AND t.active=true
              AND u.status='active'
            ORDER BY u.created_at ASC
            LIMIT 1`,
          [ownerEmail],
        );
        if (tr.rowCount) tenantId=tr.rows[0].id;
      }
    }

    if (!tenantId) return res.status(503).json({error:errorText(
      'Yhteydenotto ei ole juuri nyt käytettävissä.',
      'Kontaktformuläret är inte tillgängligt just nu.',
      'The contact form is not available right now.'
    )});

    await q(
      `INSERT INTO leads(id,tenant_id,visitor_ref,name,email,phone,message,status)
       VALUES($1,$2,$3,$4,$5,$6,$7,'new')`,
      [uid(),tenantId,visitorRef,name||null,email||null,phone||null,message||null],
    );

    return res.json({
      ok:true,
      message:errorText(
        'Kiitos! Yhteystietosi lähetettiin yritykselle.',
        'Tack! Dina kontaktuppgifter skickades till företaget.',
        'Thank you! Your contact details were sent to the company.'
      )
    });
  } catch(e) {
    console.error('Preview lead capture failed',e);
    return res.status(500).json({
      error:lang==='sv'
        ? 'Kontaktuppgifterna kunde inte skickas just nu.'
        : lang==='en'
          ? 'Your contact details could not be sent right now.'
          : 'Yhteystietoja ei voitu lähettää juuri nyt.'
    });
  }
});


app.post('/api/public/respondo-contact', publicContactLimiter, async (req,res)=>{
  let lang='fi';
  try {
    let body=req.body;
    if (typeof body === 'string') {
      try { body=JSON.parse(body); } catch { body={}; }
    }
    body=body||{};
    lang=['fi','sv','en'].includes(String(body.lang||'').toLowerCase())
      ? String(body.lang).toLowerCase()
      : 'fi';

    const name=String(body.name||'').trim().slice(0,120);
    const email=cleanEmail(body.email).slice(0,220);
    const message=String(body.message||'').trim().slice(0,2000);

    const errorText=(fi,sv,en)=>lang==='sv'?sv:lang==='en'?en:fi;
    if (!name) return res.status(400).json({error:errorText('Kirjoita nimesi.','Skriv ditt namn.','Enter your name.')});
    if (!email || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) {
      return res.status(400).json({error:errorText('Kirjoita kelvollinen sähköpostiosoite.','Skriv en giltig e-postadress.','Enter a valid email address.')});
    }
    if (!message) return res.status(400).json({error:errorText('Kirjoita viesti.','Skriv ett meddelande.','Enter a message.')});

    const ownerEmail=cleanEmail(process.env.OWNER_EMAIL||process.env.SUPPORT_EMAIL);
    if (!ownerEmail) return res.status(503).json({error:errorText('Yhteydenotto ei ole juuri nyt käytettävissä.','Kontaktformuläret är inte tillgängligt just nu.','The contact form is not available right now.')});

    const tr=await q(
      `SELECT t.id
         FROM tenants t
         JOIN users u ON u.id=t.owner_user_id
        WHERE lower(u.email)=lower($1)
          AND t.active=true
          AND u.status='active'
        ORDER BY u.created_at ASC
        LIMIT 1`,
      [ownerEmail],
    );
    if (!tr.rowCount) return res.status(503).json({error:errorText('Yhteydenotto ei ole juuri nyt käytettävissä.','Kontaktformuläret är inte tillgängligt just nu.','The contact form is not available right now.')});

    await q(
      `INSERT INTO leads(id,tenant_id,visitor_ref,name,email,phone,message,status)
       VALUES($1,$2,$3,$4,$5,NULL,$6,'new')`,
      [
        uid(),
        tr.rows[0].id,
        String(body.visitorRef||'homepage-contact').slice(0,160),
        name,
        email,
        message,
      ],
    );

    let emailDelivery={sent:false,reason:'not_attempted'};
    try {
      emailDelivery=await sendHomepageContactEmail({name,email,message});
    } catch(mailError) {
      console.error('Homepage contact email delivery failed',mailError);
      emailDelivery={sent:false,reason:'delivery_failed'};
    }

    return res.json({
      ok:true,
      emailSent:Boolean(emailDelivery.sent),
      message:errorText(
        emailDelivery.sent
          ? 'Kiitos! Viestisi lähetettiin sähköpostiimme.'
          : 'Kiitos! Viestisi tallennettiin Respondon yhteydenottoihin.',
        emailDelivery.sent
          ? 'Tack! Ditt meddelande skickades till vår e-post.'
          : 'Tack! Ditt meddelande sparades bland Respondos kontaktförfrågningar.',
        emailDelivery.sent
          ? 'Thank you! Your message was sent to our email.'
          : 'Thank you! Your message was saved in Respondo contact requests.'
      )
    });
  } catch(e) {
    console.error('Respondo homepage contact failed',e);
    return res.status(500).json({
      error:lang==='sv'
        ? 'Meddelandet kunde inte skickas just nu. Försök igen om en stund.'
        : lang==='en'
          ? 'The message could not be sent right now. Please try again shortly.'
          : 'Viestiä ei voitu lähettää juuri nyt. Yritä hetken päästä uudelleen.'
    });
  }
});


app.post('/api/public/:slug/lead', publicChatLimiter, async (req, res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error: 'Yritystä ei löytynyt.' });
    const tenant = tr.rows[0];
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};
    const lang = ['fi','sv','en'].includes(String(body.lang || '').toLowerCase()) ? String(body.lang).toLowerCase() : 'fi';

    if (!validWidgetToken(req,tenant,body.widgetToken)) {
      return res.status(403).json({ error:'Chat ei ole käytössä tällä verkkosivulla.' });
    }
    setWidgetCors(req,res);

    const name = String(body.name || '').trim().slice(0, 120);
    const email = cleanEmail(body.email).slice(0, 220);
    const phone = String(body.phone || '').trim().slice(0, 80);
    const message = String(body.message || '').trim().slice(0, 1200);
    if (!email && !phone) return res.status(400).json({ error: 'Anna sähköposti tai puhelinnumero.' });

    await q(
      'INSERT INTO leads(id,tenant_id,visitor_ref,name,email,phone,message) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [uid(), tenant.id, String(body.visitorRef || '').slice(0, 160) || null, name || null, email || null, phone || null, message || null],
    );
    return res.json({ ok: true });
  } catch (e) {
    console.error('Lead capture failed', e);
    return res.status(500).json({ error: 'Yhteystietojen lähetys epäonnistui.' });
  }
});


app.get('/api/public/:slug/live', publicChatLimiter, async (req,res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error:'Yritystä ei löytynyt.' });
    const tenant = tr.rows[0];
    if (!validWidgetToken(req,tenant,req.query.widgetToken)) {
      return res.status(403).json({ error:'Chat ei ole käytössä tällä verkkosivulla.' });
    }
    setWidgetCors(req,res);

    const visitorRef = String(req.query.visitorRef || '').trim().slice(0,160);
    const after = String(req.query.after || '').trim();
    if (!visitorRef) return res.json({ mode:'ai',messages:[] });

    const threadResult = await q(
      `SELECT * FROM chat_threads
        WHERE tenant_id=$1 AND source_channel='website' AND external_contact_id=$2
        LIMIT 1`,
      [tenant.id,visitorRef],
    );
    if (!threadResult.rowCount) return res.json({ mode:'ai',messages:[] });
    const thread = threadResult.rows[0];

    const params=[tenant.id,thread.id];
    let whereAfter='';
    if (after && !Number.isNaN(new Date(after).getTime())) {
      params.push(new Date(after).toISOString());
      whereAfter=' AND created_at > $3';
    }
    const messages = await q(
      `SELECT cm.id,cm.role,cm.message,cm.created_at,
              sa.display_name AS agent_name,sa.avatar AS agent_avatar
         FROM chat_messages cm
         LEFT JOIN support_agents sa ON sa.id = NULLIF(cm.metadata->>'agentId','')::uuid
        WHERE cm.tenant_id=$1 AND cm.thread_id=$2
          AND cm.role='human'${whereAfter.replaceAll('created_at','cm.created_at')}
        ORDER BY cm.created_at ASC
        LIMIT 50`,
      params,
    );
    const assigned = thread.assigned_agent_id
      ? await q('SELECT display_name,avatar,status FROM support_agents WHERE id=$1 AND tenant_id=$2',[thread.assigned_agent_id,tenant.id])
      : { rowCount:0,rows:[] };
    return res.json({ mode:thread.mode,agent:assigned.rowCount ? assigned.rows[0] : null,messages:messages.rows });
  } catch (e) {
    console.error('Live poll failed',e);
    return res.status(500).json({ error:'Live-keskustelua ei saatu.' });
  }
});

app.post('/api/public/respondo-assistant/chat', demoChatLimiter, async (req,res)=>{
  let requestLang='fi';
  try {
    let body=req.body;
    if (typeof body === 'string') {
      try { body=JSON.parse(body); } catch { body={}; }
    }
    body=body||{};
    const lang=['fi','sv','en'].includes(String(body.lang||'').toLowerCase())
      ? String(body.lang).toLowerCase()
      : 'fi';
    requestLang=lang;
    const message=String(body.message||'').trim().slice(0,1200);
    if (!message) {
      return res.status(400).json({
        error:lang==='en'?'Type a question.':lang==='sv'?'Skriv en fråga.':'Kirjoita kysymys.'
      });
    }

    const ownerEmail=cleanEmail(process.env.OWNER_EMAIL||process.env.SUPPORT_EMAIL);
    if (!ownerEmail) return res.status(503).json({error:'Respondo-tietopohjaa ei ole määritetty.'});

    const tr=await q(
      `SELECT t.*
         FROM tenants t
         JOIN users u ON u.id=t.owner_user_id
        WHERE lower(u.email)=lower($1)
          AND t.active=true
          AND u.status='active'
          AND t.subscription_status IN ('active','trialing')
          AND (
            COALESCE(t.subscription_cancel_at_period_end,false)=false
            OR t.current_period_end IS NULL
            OR t.current_period_end > NOW()
          )
        ORDER BY
          CASE
            WHEN lower(COALESCE(t.slug,'')) IN ('respondo','respondoai') THEN 0
            WHEN lower(COALESCE(t.name,'')) IN ('respondo','respondo ai') THEN 1
            ELSE 2
          END,
          t.created_at ASC
        LIMIT 1`,
      [ownerEmail],
    );
    if (!tr.rowCount) return res.status(404).json({error:'Respondo-tietopohjaa ei löytynyt.'});

    const t=tr.rows[0];
    const detectedLang=detectConversationLanguage(message,lang);
    const kr=await q(
      "SELECT * FROM knowledge WHERE tenant_id=$1 AND approved=true AND source_type='respondo_seed' ORDER BY updated_at DESC,created_at DESC",
      [t.id],
    );
    const history=Array.isArray(body.history) ? body.history.slice(-6) : [];
    const firstPartyFaq=respondoProductFaqMatch(message,detectedLang,history);

    const langTag=' · '+detectedLang.toUpperCase()+' · ';
    const websiteQuestion=/(?:verkkosivu|verkkosivusto|website|webbplats|url|linkki|link|domain|verkkotunnus)/.test(normalizeSearchText(message));
    const safeRows=kr.rows.filter((row)=>{
      const category=String(row?.category||'');
      if(!category.includes(langTag)) return false;
      if(!websiteQuestion && category.endsWith(' · Sivusto')) return false;
      return true;
    });

    let result=firstPartyFaq
      ? {
          answer:firstPartyFaq.answer,
          handoff:false,
          confidence:1,
          intent:'Respondo FAQ',
          sourceIds:[firstPartyFaq.id],
          selected:[],
        }
      : await generateGroundedAnswer({
          companyName:'Respondo AI',
          rows:safeRows,
          message,
          history,
          lang:detectedLang,
          pageContext:body.pageContext&&typeof body.pageContext==='object'?body.pageContext:{},
        });

    const noAnswer=detectedLang==='en'
      ? 'I do not have a reliable answer to that yet. You can ask me about Respondo pricing, the free trial, installation, features, security, or how the bot works.'
      : detectedLang==='sv'
        ? 'Jag har inget säkert svar på det ännu. Du kan fråga om Respondos pris, gratis provperiod, installation, funktioner, säkerhet eller hur botten fungerar.'
        : 'En löydä tähän vielä varmaa vastausta. Voit kysyä esimerkiksi Respondon hinnasta, ilmaisesta kokeilusta, asennuksesta, ominaisuuksista, tietoturvasta tai siitä miten botti toimii.';

    let answer=sanitizeUserFacingText(result.answer);
    const looksLikeWebsiteDump=/^https?:\/\//i.test(answer) || /(?:verkkosivu(?:sto)? on|website is|webbplats (?:är|ar))\s+https?:\/\//i.test(answer);
    if(!websiteQuestion && looksLikeWebsiteDump) {
      result={...result,answer:'',handoff:true,confidence:0,sourceIds:[]};
      answer='';
    }
    answer=answer || noAnswer;
    return res.json({
      answer,
      handoff:Boolean(result.handoff),
      confidence:Number(result.confidence||0),
      intent:result.intent||'',
      verified:!result.handoff && Array.isArray(result.sourceIds) && result.sourceIds.length>0,
    });
  } catch(e) {
    console.error('Respondo public assistant chat failed',e);
    return res.status(500).json({
      error:requestLang==='en'
        ? 'The response failed. Please try again in a moment.'
        : requestLang==='sv'
          ? 'Det gick inte att få ett svar just nu. Försök igen om en stund.'
          : 'Vastausta ei saatu juuri nyt. Yritä hetken päästä uudelleen.'
    });
  }
});


app.post('/api/public/:slug/chat', publicChatLimiter, async (req, res) => {
  let requestLang = 'fi';
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error: 'Yritystä ei löytynyt.' });
    const t = tr.rows[0];
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};
    const lang = ['fi','sv','en'].includes(String(body.lang || '').toLowerCase()) ? String(body.lang).toLowerCase() : 'fi';
    requestLang = lang;

    if (!validWidgetToken(req,t,body.widgetToken)) {
      return res.status(403).json({ error:'Chat ei ole käytössä tällä verkkosivulla.' });
    }
    setWidgetCors(req,res);

    const message = String(body.message || '').trim().slice(0, 1200);
    if (!message) return res.status(400).json({ error: lang === 'en' ? 'Type a question.' : lang === 'sv' ? 'Skriv en fråga.' : 'Kirjoita kysymys.' });
    const visitorRef = String(body.visitorRef || '').trim().slice(0, 160);
    const detectedLang=detectConversationLanguage(message,lang);
    const thread = visitorRef ? await getOrCreateThread(t.id,'website',visitorRef,visitorRef) : null;
    if (thread && thread.language !== detectedLang && !thread.assigned_agent_id) {
      await q('UPDATE chat_threads SET language=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3',[detectedLang,thread.id,t.id]);
      thread.language=detectedLang;
    }
    if (thread) {
      await appendChatMessage({
        tenantId:t.id,threadId:thread.id,sourceChannel:'website',
        externalContactId:visitorRef,visitorRef,role:'user',text:message,
        metadata:{ pageContext:body.pageContext || {} },
      });
      if (thread.mode === 'human') {
        const humanMessage = lang === 'en'
          ? 'Your message was sent to a person from the company.'
          : detectedLang === 'sv'
            ? 'Ditt meddelande skickades till företagets kundtjänst.'
            : 'Viestisi lähetettiin yrityksen asiakaspalvelijalle.';
        await q(
          `INSERT INTO conversations(id,tenant_id,question,answer,intent,confidence,source_ids,handoff,visitor_ref,page_url,page_title,source_channel,external_contact_id)
           VALUES($1,$2,$3,$4,'Live takeover',1,'{}',true,$5,$6,$7,'website',$8)`,
          [
            uid(),t.id,message,humanMessage,visitorRef || null,
            String(body.pageContext?.url || '').slice(0,1000) || null,
            String(body.pageContext?.title || '').slice(0,300) || null,
            visitorRef || null,
          ],
        );
        return res.json({
          answer:humanMessage,handoff:true,humanTakeover:true,verified:false,
          actions:[],canLeaveContact:false,
        });
      }
    }

    const kr = await q('SELECT * FROM knowledge WHERE tenant_id=$1 AND approved=true ORDER BY updated_at DESC, created_at DESC', [t.id]);
    let history = [];
    if (visitorRef) {
      const hr = await q(
        `SELECT question, answer, handoff
           FROM conversations
          WHERE tenant_id=$1 AND visitor_ref=$2
          ORDER BY created_at DESC
          LIMIT 6`,
        [t.id, visitorRef],
      );
      history = hr.rows.reverse();
    }

    let firstPartyHomepageWidget=false;
    try {
      const pageUrl=new URL(String(body.pageContext?.url || req.get('referer') || ''),BASE);
      firstPartyHomepageWidget=
        normalizeHost(pageUrl.hostname)===normalizeHost(BASE) &&
        pageUrl.pathname==='/';
    } catch {}
    const firstPartyRespondo = isFirstPartyRespondoTenant(t) || firstPartyHomepageWidget;
    const safeKnowledgeRows = firstPartyRespondo
      ? kr.rows.filter((row)=>String(row?.source_type||'')==='respondo_seed')
      : kr.rows;
    const firstPartyFaq = firstPartyRespondo
      ? respondoProductFaqMatch(message, detectedLang, history)
      : null;
    const result = firstPartyFaq
      ? {
          answer:firstPartyFaq.answer,
          handoff:false,
          confidence:1,
          intent:'Respondo FAQ',
          sourceIds:[firstPartyFaq.id],
          selected:[],
        }
      : await generateGroundedAnswer({
          companyName: t.name,
          rows: safeKnowledgeRows,
          message,
          history,
          lang: detectedLang,
          pageContext: body.pageContext && typeof body.pageContext === 'object' ? body.pageContext : {},
        });

    const responseLang = detectedLang;
    const noAnswer = responseLang === 'en'
      ? 'I cannot find a reliable answer to this in the company information. Leave your name and phone number or email below, and someone from the company can get back to you.'
      : responseLang === 'sv'
        ? 'Jag hittar inget säkert svar på detta i företagets information. Lämna ditt namn och telefonnummer eller din e-postadress nedan, så kan någon från företaget kontakta dig.'
        : 'Tähän en löydä varmaa vastausta yrityksen tiedoista. Jätä alle nimesi ja puhelinnumerosi tai sähköpostisi, niin yrityksen henkilö voi palata sinulle.';
    const translationUnavailable = responseLang === 'en'
      ? 'I found the relevant company information, but could not translate the answer reliably right now. Leave your contact details below or try again in a moment.'
      : lang === 'sv'
        ? 'Jag hittade relevant företagsinformation men kunde inte översätta svaret tillförlitligt just nu. Lämna dina kontaktuppgifter nedan eller försök igen om en stund.'
        : noAnswer;

    let answer = sanitizeUserFacingText(result.answer);
    let handoff = result.handoff;
    if (handoff) {
      answer = result.intent === 'Palvelut' && answer
        ? answer : noAnswer;
    }

    const actionRows = firstPartyRespondo ? safeKnowledgeRows : kr.rows;
    let actions = chatActions(actionRows, message, handoff, responseLang, result.selected);
    const publicPlanAccess = planEntitlements(t.subscription_plan);
    if (!publicPlanAccess.allCurrentFeatures) {
      actions = actions.filter((action) => action?.type !== 'order_status');
    }
    if (firstPartyFaq?.id === 'respondo-faq-buy') {
      const signupUrl = new URL('/tilaus', BASE).href;
      actions.unshift({
        type:'signup',
        label:responseLang==='en'?'Try for free':responseLang==='sv'?'Prova gratis':'Kokeile ilmaiseksi',
        url:signupUrl,
      });
    }
    if (thread) {
      await appendChatMessage({
        tenantId:t.id,threadId:thread.id,sourceChannel:'website',
        externalContactId:visitorRef,visitorRef,role:'assistant',text:answer,
        metadata:{ handoff,intent:result.intent,verified:!handoff },
      });
    }
    await q(
      `INSERT INTO conversations(id,tenant_id,question,answer,intent,confidence,source_ids,handoff,visitor_ref,page_url,page_title,source_channel,external_contact_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'website',$12)`,
      [
        uid(), t.id, message, answer, result.intent, handoff ? Math.min(result.confidence, 0.35) : result.confidence, result.sourceIds, handoff,
        visitorRef || null,
        String(body.pageContext?.url || '').slice(0, 1000) || null,
        String(body.pageContext?.title || '').slice(0, 300) || null,
        visitorRef || null,
      ],
    );

    return res.json({
      answer,
      handoff,
      confidence: handoff ? Math.min(result.confidence, 0.35) : result.confidence,
      intent: result.intent,
      sourceIds: result.sourceIds,
      verified: !handoff && Array.isArray(result.sourceIds) && result.sourceIds.length > 0,
      actions,
      canLeaveContact: handoff,
    });
  } catch (e) {
    console.error('Chat failed', e);
    return res.status(500).json({
      error: requestLang === 'en'
        ? 'The response failed. Please try again in a moment.'
        : requestLang === 'sv'
          ? 'Det gick inte att få ett svar just nu. Försök igen om en stund.'
          : 'Vastausta ei saatu juuri nyt.'
    });
  }
});




app.get('/api/public/:slug/booking-slots', publicChatLimiter, async (req,res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error:'Yritystä ei löytynyt.' });
    const tenant = tr.rows[0];

    if (!validWidgetToken(req,tenant,req.query.widgetToken)) {
      return res.status(403).json({ error:'Chat ei ole käytössä tällä verkkosivulla.' });
    }
    setWidgetCors(req,res);

    const rows = await q(
      `SELECT id,starts_at,ends_at
         FROM booking_slots
        WHERE tenant_id=$1 AND status='open' AND starts_at >= NOW()
        ORDER BY starts_at ASC
        LIMIT 40`,
      [tenant.id],
    );

    let slots = rows.rows;
    const bookingAccess = planEntitlements(tenant.subscription_plan);
    if (bookingAccess.googleCalendar && slots.length && (tenant.google_calendar_refresh_token || tenant.google_calendar_access_token)) {
      try {
        const events = await googleCalendarEvents(
          tenant,
          slots[0].starts_at,
          slots[slots.length - 1].ends_at,
        );
        slots = slots.filter((slot) => {
          const start = new Date(slot.starts_at).getTime();
          const end = new Date(slot.ends_at).getTime();
          return !events.some((event) => event.start.getTime() < end && event.end.getTime() > start);
        });
      } catch (e) {
        console.error('Google Calendar availability filter failed',e);
      }
    }

    return res.json({ slots });
  } catch {
    return res.status(500).json({ error:'Vapaita aikoja ei saatu.' });
  }
});

app.get('/api/public/payment/verify', paymentVerifyLimiter, async (req,res) => {
  try {
    if (!stripe) return res.status(503).json({ error:'Stripe ei ole käytettävissä.' });
    const actionId = String(req.query.action || '').trim();
    const sessionId = String(req.query.session_id || '').trim();
    if (!actionId || !sessionId) return res.status(400).json({ error:'Maksutiedot puuttuvat.' });

    const rr = await q(
      `SELECT ar.id,ar.tenant_id,ar.request_type,ar.result,t.name,t.stripe_connected_account_id
         FROM action_requests ar
         JOIN tenants t ON t.id=ar.tenant_id
        WHERE ar.id=$1`,
      [actionId],
    );
    if (!rr.rowCount || rr.rows[0].request_type !== 'quote') return res.status(404).json({ error:'Tarjousta ei löytynyt.' });
    const row = rr.rows[0];
    if (!row.stripe_connected_account_id) return res.status(400).json({ error:'Maksutiliä ei löytynyt.' });

    const session = await stripe.checkout.sessions.retrieve(
      sessionId,
      {},
      { stripeAccount:row.stripe_connected_account_id },
    );
    if (session.client_reference_id !== actionId) return res.status(400).json({ error:'Maksu ei vastaa tarjousta.' });

    const paid = session.payment_status === 'paid';
    if (paid) {
      await q(
        `UPDATE action_requests
            SET status='done',
                result=COALESCE(result,'{}'::jsonb) || $1::jsonb,
                updated_at=NOW()
          WHERE id=$2 AND tenant_id=$3`,
        [JSON.stringify({ paid:true,paidAt:new Date().toISOString(),checkoutSessionId:session.id }),actionId,row.tenant_id],
      );
    }
    return res.json({
      paid,
      companyName:row.name,
      amountTotal:Number(session.amount_total || 0),
      currency:String(session.currency || 'eur').toUpperCase(),
    });
  } catch (e) {
    console.error('Payment verification failed',e);
    return res.status(400).json({ error:'Maksua ei voitu vahvistaa.' });
  }
});

app.post('/api/public/:slug/action-request', publicChatLimiter, async (req, res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error:'Yritystä ei löytynyt.' });
    const tenant = await ensureTenantActionKeys(tr.rows[0]);
    const actionAccess = planEntitlements(tenant.subscription_plan);

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};
    const actionLang = ['fi','sv','en'].includes(String(body.lang || '').toLowerCase())
      ? String(body.lang).toLowerCase()
      : 'fi';
    if (!(await validateWidgetActionRequest(req, tenant, body))) {
      return res.status(403).json({ error:'Chat ei ole käytössä tällä verkkosivulla.' });
    }
    setWidgetCors(req,res);

    const type = String(body.type || '').trim();
    if (!['quote','booking','order_status','callback'].includes(type)) {
      return res.status(400).json({ error:'Tuntematon toiminto.' });
    }
    if (type === 'order_status' && !actionAccess.allCurrentFeatures) {
      return res.status(403).json({ error:'Tilaustietojen automaattinen tarkistus vaatii Business-tilauksen.', upgradeRequired:true });
    }

    const fields = cleanActionFields(type, body.fields);
    if (type === 'booking') {
      fields.slotId = String(body.fields?.slotId || '').trim().slice(0,80);
    }
    if (type === 'quote') {
      fields.quantity = Math.max(0, Number(body.fields?.quantity || 0));
    }
    if (type === 'quote' && !fields.contact) return res.status(400).json({ error:'Anna sähköposti tai puhelinnumero.' });
    if (type === 'booking' && (!fields.contact || !fields.slotId)) return res.status(400).json({ error:'Valitse vapaa aika ja anna yhteystieto.' });
    if (type === 'order_status' && (!fields.orderNumber || !fields.email)) return res.status(400).json({ error:'Anna tilausnumero ja tilauksessa käytetty sähköposti.' });

    const id = uid();
    const visitorRef = String(body.visitorRef || '').slice(0,160) || null;
    const sourceChannel = String(body.sourceChannel || 'website').trim().slice(0,40) || 'website';
    const externalContactId = String(body.externalContactId || '').trim().slice(0,220) || null;
    const pageUrl = String(body.pageContext?.url || '').slice(0,1000) || null;
    const payload = {
      fields,
      question: String(body.question || '').trim().slice(0,1200),
      pageUrl,
      pageTitle: String(body.pageContext?.title || '').slice(0,300) || null,
    };
    let computedQuote = null;
    let bookedSlot = null;
    let actionInserted = false;
    let ecommerceOrder = null;
    let ecommerceLookupAttempted = false;

    if (type === 'order_status' && tenant.ecommerce_provider) {
      ecommerceLookupAttempted = true;
      try {
        ecommerceOrder = await lookupEcommerceOrder(tenant,fields.orderNumber,fields.email);
      } catch (e) {
        console.error('Native ecommerce lookup failed',e);
        return res.status(502).json({ error:'Tilaustietoja ei saatu verkkokaupasta juuri nyt. Yritä hetken päästä uudelleen.' });
      }
    }

    if (type === 'quote' && actionAccess.allCurrentFeatures) {
      const base = Number(tenant.quote_base_price || 0);
      const perUnit = Number(tenant.quote_unit_price || 0);
      const minimum = Number(tenant.quote_min_price || 0);
      const vatPercent = Number(tenant.quote_vat_percent || 0);
      const quantity = Number(fields.quantity || 0);
      if (base > 0 || perUnit > 0 || minimum > 0) {
        const net = Math.max(minimum, base + (perUnit * quantity));
        const vat = net * (vatPercent / 100);
        const total = net + vat;
        const sourceServiceName = String(tenant.quote_service_name || 'Tarjous').trim();
        const sourceUnitLabel = String(tenant.quote_unit_label || 'kpl').trim();
        const localizedServiceName = actionLang === 'fi'
          ? sourceServiceName
          : (await forceAnswerLanguage(sourceServiceName, actionLang)) ||
            (actionLang === 'en' ? 'Quote' : 'Offert');
        const localizedUnitLabel = actionLang === 'fi'
          ? sourceUnitLabel
          : (await forceAnswerLanguage(sourceUnitLabel, actionLang)) ||
            (actionLang === 'en' ? 'pcs' : 'st');
        computedQuote = {
          serviceName:localizedServiceName,
          unitLabel:localizedUnitLabel,
          quantity,
          net:Number(net.toFixed(2)),
          vatPercent,
          vat:Number(vat.toFixed(2)),
          total:Number(total.toFixed(2)),
          totalCents:Math.max(50,Math.round(total * 100)),
          currency:'EUR',
        };
      }
    }

    if (type === 'booking') {
      const previewSlot = await q(
        `SELECT id,starts_at,ends_at,status
           FROM booking_slots
          WHERE id=$1 AND tenant_id=$2`,
        [fields.slotId,tenant.id],
      );
      if (!previewSlot.rowCount || previewSlot.rows[0].status !== 'open') {
        return res.status(409).json({ error:'Tämä aika ei ole enää vapaa. Valitse toinen aika.' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const sr = await client.query(
          `SELECT id,starts_at,ends_at,status
             FROM booking_slots
            WHERE id=$1 AND tenant_id=$2
            FOR UPDATE`,
          [fields.slotId,tenant.id],
        );
        if (!sr.rowCount || sr.rows[0].status !== 'open' || new Date(sr.rows[0].starts_at).getTime() < Date.now()) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error:'Tämä aika ei ole enää vapaa. Valitse toinen aika.' });
        }

        // Recheck Google Calendar only after this booking slot is row-locked.
        // This closes the gap where an external calendar event could appear
        // between the initial availability view and the actual reservation.
        if (actionAccess.googleCalendar && (tenant.google_calendar_refresh_token || tenant.google_calendar_access_token)) {
          try {
            const conflict = await googleCalendarHasConflict(
              tenant,
              sr.rows[0].starts_at,
              sr.rows[0].ends_at,
            );
            if (conflict) {
              await client.query('ROLLBACK');
              return res.status(409).json({ error:'Tämä aika on varattu Google Kalenterissa. Valitse toinen aika.' });
            }
          } catch (e) {
            await client.query('ROLLBACK');
            console.error('Google Calendar conflict check failed',e);
            return res.status(503).json({ error:'Kalenterin vapautta ei voitu juuri nyt varmistaa. Yritä hetken päästä uudelleen.' });
          }
        }

        bookedSlot = sr.rows[0];
        payload.booking = {
          slotId:bookedSlot.id,
          startsAt:bookedSlot.starts_at,
          endsAt:bookedSlot.ends_at,
        };
        await client.query(
          `UPDATE booking_slots SET status='booked' WHERE id=$1 AND tenant_id=$2`,
          [fields.slotId,tenant.id],
        );
        await client.query(
          `INSERT INTO action_requests(id,tenant_id,visitor_ref,request_type,status,payload,result,source_channel,external_contact_id)
           VALUES($1,$2,$3,$4,'new',$5::jsonb,$6::jsonb,$7,$8)`,
          [id,tenant.id,visitorRef,type,JSON.stringify(payload),JSON.stringify({}),sourceChannel,externalContactId],
        );
        actionInserted = true;
        await client.query('COMMIT');
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch {}
        throw e;
      } finally {
        client.release();
      }
    }

    if (!actionInserted) {
      await q(
        `INSERT INTO action_requests(id,tenant_id,visitor_ref,request_type,status,payload,result,source_channel,external_contact_id)
         VALUES($1,$2,$3,$4,'new',$5::jsonb,$6::jsonb,$7,$8)`,
        [id,tenant.id,visitorRef,type,JSON.stringify(payload),JSON.stringify({
          ...(computedQuote ? { quote:computedQuote } : {}),
          ...(ecommerceLookupAttempted ? { orderStatus:ecommerceOrder,orderLookupProvider:tenant.ecommerce_provider } : {}),
        }),sourceChannel,externalContactId],
      );
    }

    if (['quote','booking','callback'].includes(type)) {
      const contact = actionContact(fields);
      try {
        await q(
          `INSERT INTO leads(id,tenant_id,visitor_ref,name,email,phone,message,status)
           VALUES($1,$2,$3,$4,$5,$6,$7,'new')`,
          [
            uid(),tenant.id,visitorRef,
            String(fields.name || '').slice(0,120) || null,
            contact.email || null,
            contact.phone || null,
            String(fields.details || fields.note || payload.question || '').slice(0,1200) || null,
          ],
        );
      } catch (leadError) {
        // The canonical request already contains the contact fields. Do not
        // tell the customer submission failed only because the dashboard lead
        // index could not be duplicated at this moment.
        console.error('Action lead index write failed',leadError);
      }
    }

    const actionRequest = {
      id,
      type,
      status:'new',
      sourceChannel,
      externalContactId,
      visitorRef,
      payload,
      createdAt:new Date().toISOString(),
    };

    let calendarSync = { status:'not_configured' };
    if (type === 'booking' && actionAccess.googleCalendar) {
      try {
        calendarSync = await createGoogleCalendarBooking(tenant,actionRequest);
      } catch (e) {
        console.error('Google Calendar booking sync failed',e);
        calendarSync = { status:'failed', error:String(e?.message || 'Calendar sync failed').slice(0,300) };
      }
      try {
        await q(
          `UPDATE action_requests
              SET result=COALESCE(result,'{}'::jsonb) || $1::jsonb,updated_at=NOW()
            WHERE id=$2 AND tenant_id=$3`,
          [JSON.stringify({ calendarSync }),id,tenant.id],
        );
      } catch (calendarResultError) {
        console.error('Calendar sync result persistence failed',calendarResultError);
      }
    }

    let delivery = { status:'not_configured', result:null };
    if (actionAccess.allCurrentFeatures) {
      try {
        delivery = await dispatchActionWebhook(tenant, actionRequest);
      } catch (e) {
        console.error('Action webhook delivery failed', e);
        delivery = { status:'failed', result:{ error:String(e?.message || 'Webhook failed').slice(0,500) } };
      }
    }

    try {
      await q(
        `UPDATE action_requests
            SET delivery_status=$1,
                result=COALESCE(result,'{}'::jsonb) || $2::jsonb,
                updated_at=NOW()
          WHERE id=$3 AND tenant_id=$4`,
        [delivery.status,JSON.stringify({ webhook:delivery.result || {} }),id,tenant.id],
      );
    } catch (deliveryResultError) {
      console.error('Action delivery result persistence failed',deliveryResultError);
    }

    try {
      await q(
        `INSERT INTO action_events(id,tenant_id,visitor_ref,action_type,label,target,page_url)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [uid(),tenant.id,visitorRef,type,'submitted',null,pageUrl],
      );
    } catch (analyticsError) {
      console.error('Action analytics write failed',analyticsError);
    }

    const nativeOrderMessage = ecommerceLookupAttempted
      ? orderStatusText(ecommerceOrder,actionLang)
      : '';
    const rawDeliveryMessage = String(
      delivery.result?.customerMessage ||
      delivery.result?.message ||
      ''
    ).trim().slice(0,1200);
    const translatedDeliveryMessage = rawDeliveryMessage && actionLang !== 'fi'
      ? await forceAnswerLanguage(rawDeliveryMessage, actionLang)
      : rawDeliveryMessage;
    const customerMessage = String(
      nativeOrderMessage ||
      translatedDeliveryMessage ||
      ''
    ).trim().slice(0,1200);

    let checkoutUrl = '';
    let paymentAvailable = false;
    if (actionAccess.allCurrentFeatures && type === 'quote' && computedQuote && stripe && tenant.stripe_connected_account_id) {
      try {
        const connected = await stripe.accounts.retrieve(tenant.stripe_connected_account_id);
        paymentAvailable = Boolean(connected.charges_enabled);
        if (paymentAvailable) {
          const checkout = await stripe.checkout.sessions.create(
            {
              mode:'payment',
              client_reference_id:id,
              customer_email:actionContact(fields).email || undefined,
              line_items:[{
                price_data:{
                  currency:'eur',
                  product_data:{
                    name:computedQuote.serviceName || ((actionLang === 'en' ? 'Quote' : actionLang === 'sv' ? 'Offert' : 'Tarjous') + ' · ' + tenant.name),
                    description:payload.question ? payload.question.slice(0,450) : undefined,
                  },
                  unit_amount:computedQuote.totalCents,
                },
                quantity:1,
              }],
              metadata:{
                respondo_action_request_id:id,
                respondo_tenant_id:tenant.id,
              },
              success_url:BASE + '/maksu-valmis?action=' + encodeURIComponent(id) + '&session_id={CHECKOUT_SESSION_ID}&lang=' + encodeURIComponent(actionLang),
              cancel_url:safeTenantReturnUrl(pageUrl,tenant),
            },
            { stripeAccount:tenant.stripe_connected_account_id },
          );
          checkoutUrl = checkout.url || '';
          await q(
            `UPDATE action_requests
                SET result=COALESCE(result,'{}'::jsonb) || $1::jsonb,updated_at=NOW()
              WHERE id=$2 AND tenant_id=$3`,
            [JSON.stringify({ checkoutSessionId:checkout.id }),id,tenant.id],
          );
        }
      } catch (e) {
        console.error('Connected Stripe Checkout failed',e);
      }
    }

    return res.json({
      ok:true,
      id,
      status:'new',
      deliveryStatus:delivery.status,
      quote:computedQuote,
      orderStatus:ecommerceOrder,
      booking:bookedSlot ? {
        startsAt:bookedSlot.starts_at,
        endsAt:bookedSlot.ends_at,
      } : null,
      calendarSync,
      paymentAvailable,
      checkoutUrl,
      customerMessage: customerMessage || (
        actionLang === 'en'
          ? (type === 'booking' ? 'Your booking request has been received.' :
             type === 'quote' ? 'Your quote request has been received.' :
             type === 'order_status' ? 'Your order-status request has been received.' :
             'Your contact request has been received.')
          : actionLang === 'sv'
            ? (type === 'booking' ? 'Din bokningsförfrågan har tagits emot.' :
               type === 'quote' ? 'Din offertförfrågan har tagits emot.' :
               type === 'order_status' ? 'Din förfrågan om orderstatus har tagits emot.' :
               'Din kontaktförfrågan har tagits emot.')
            : (type === 'booking' ? 'Ajanvarauspyyntösi on vastaanotettu.' :
               type === 'quote' ? 'Tarjouspyyntösi on vastaanotettu.' :
               type === 'order_status' ? 'Tilaustietojen tarkistuspyyntö on vastaanotettu.' :
               'Yhteydenottopyyntösi on vastaanotettu.')
      ),
    });
  } catch (e) {
    console.error('Action request failed', e);
    return res.status(500).json({ error:'Toiminnon lähetys epäonnistui.' });
  }
});


app.post('/api/app/quote-engine', auth, ownerOnly, subscribed, async (req,res) => {
  if(!await requirePlanCapability(req,res,'allCurrentFeatures')) return;
  try {
    const tr = await q('SELECT id FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1)',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const basePrice = Math.max(0, Number(req.body.basePrice || 0));
    const unitPrice = Math.max(0, Number(req.body.unitPrice || 0));
    const minPrice = Math.max(0, Number(req.body.minPrice || 0));
    const vatPercent = Math.min(30, Math.max(0, Number(req.body.vatPercent || 0)));
    const serviceName = String(req.body.serviceName || '').trim().slice(0,120);
    const unitLabel = String(req.body.unitLabel || 'kpl').trim().slice(0,40) || 'kpl';

    await q(
      `UPDATE tenants
          SET quote_service_name=$1,quote_base_price=$2,quote_unit_price=$3,
              quote_min_price=$4,quote_vat_percent=$5,quote_unit_label=$6,updated_at=NOW()
        WHERE id=$7`,
      [serviceName,basePrice,unitPrice,minPrice,vatPercent,unitLabel,tr.rows[0].id],
    );
    return res.json({ ok:true });
  } catch (e) {
    console.error('Quote engine save failed',e); return res.status(400).json({ error:'Hintalaskuria ei voitu tallentaa.' });
  }
});

app.post('/api/app/booking-slots/generate', auth, ownerOnly, subscribed, async (req,res) => {
  const client = await pool.connect();
  try {
    const tr = await client.query('SELECT id FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1)',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenantId = tr.rows[0].id;
    const slots = (Array.isArray(req.body.slots) ? req.body.slots : []).slice(0,300);
    if (!slots.length) return res.status(400).json({ error:'Luo vähintään yksi vapaa aika.' });

    await client.query('BEGIN');
    let saved = 0;
    for (const slot of slots) {
      const start = new Date(slot.start);
      const end = new Date(slot.end);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) continue;
      if (start.getTime() < Date.now() - 60000) continue;
      const inserted = await client.query(
        `INSERT INTO booking_slots(id,tenant_id,starts_at,ends_at,status)
         VALUES($1,$2,$3,$4,'open')
         ON CONFLICT(tenant_id,starts_at) DO NOTHING
         RETURNING id`,
        [uid(),tenantId,start.toISOString(),end.toISOString()],
      );
      saved += inserted.rowCount;
    }
    await client.query('COMMIT');
    return res.json({ ok:true,saved });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Booking slot generation failed',e); return res.status(400).json({ error:'Vapaita aikoja ei voitu luoda.' });
  } finally {
    client.release();
  }
});

app.delete('/api/app/booking-slots/:id', auth, ownerOnly, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT id FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1)',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const removed = await q(
      `DELETE FROM booking_slots
        WHERE id=$1 AND tenant_id=$2 AND status='open'
        RETURNING id`,
      [req.params.id,tr.rows[0].id],
    );
    if (!removed.rowCount) return res.status(400).json({ error:'Aikaa ei voitu poistaa.' });
    return res.json({ ok:true });
  } catch {
    return res.status(500).json({ error:'Aikaa ei voitu poistaa.' });
  }
});

app.post('/api/app/stripe-connect/onboard', auth, ownerOnly, subscribed, async (req,res) => {
  if(!await requirePlanCapability(req,res,'allCurrentFeatures')) return;
  try {
    if (!stripe) return res.status(503).json({ error:'Stripe ei ole käytettävissä.' });
    const tr = await q('SELECT * FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1)',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenant = tr.rows[0];
    let accountId = tenant.stripe_connected_account_id;
    if (!accountId) {
      const country = String(req.body.country || 'FI').trim().toUpperCase().slice(0,2) || 'FI';
      const account = await stripe.accounts.create({
        type:'express',
        country,
        capabilities:{
          card_payments:{ requested:true },
          transfers:{ requested:true },
        },
        business_profile:{
          name:tenant.name,
          url:tenant.website || undefined,
        },
        metadata:{ tenant_id:tenant.id, tenant_slug:tenant.slug },
      });
      accountId = account.id;
      await q(
        'UPDATE tenants SET stripe_connected_account_id=$1,updated_at=NOW() WHERE id=$2',
        [accountId,tenant.id],
      );
    }

    const link = await stripe.accountLinks.create({
      account:accountId,
      refresh_url:BASE + '/app?section=automation&stripe=refresh',
      return_url:BASE + '/app?section=automation&stripe=return',
      type:'account_onboarding',
    });
    return res.json({ url:link.url });
  } catch (e) {
    console.error('Stripe Connect onboarding failed', e);
    return res.status(400).json({ error:'Stripe-yhdistämistä ei voitu aloittaa.' });
  }
});

app.post('/api/app/integrations', auth, ownerOnly, subscribed, async (req,res) => {
  if(!await requirePlanCapability(req,res,'allCurrentFeatures')) return;
  try {
    const tr = await q('SELECT * FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1)',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenant = await ensureTenantActionKeys(tr.rows[0]);
    const raw = String(req.body.webhookUrl || '').trim();
    let url = '';
    if (raw) {
      const parsed = await assertPublicHttpUrl(raw);
      if (parsed.protocol !== 'https:') return res.status(400).json({ error:'Webhookin pitää käyttää HTTPS-yhteyttä.' });
      url = parsed.toString();
    }
    await q('UPDATE tenants SET action_webhook_url=$1,updated_at=NOW() WHERE id=$2',[url || null,tenant.id]);
    return res.json({
      ok:true,
      webhookUrl:url,
      webhookSecret:tenant.action_webhook_secret,
      channelsApiKey:tenant.channels_api_key,
    });
  } catch (e) {
    console.error('Integration settings save failed',e); return res.status(400).json({ error:'Integraation tallennus epäonnistui.' });
  }
});

app.post('/api/app/integrations/test', auth, ownerOnly, subscribed, async (req,res) => {
  if(!await requirePlanCapability(req,res,'allCurrentFeatures')) return;
  try {
    const tr = await q('SELECT * FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1)',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenant = await ensureTenantActionKeys(tr.rows[0]);
    if (!tenant.action_webhook_url) return res.status(400).json({ error:'Lisää webhook-osoite ensin.' });
    const delivery = await dispatchActionWebhook(tenant,{
      id:'test_' + Date.now(),
      type:'test',
      status:'test',
      sourceChannel:'dashboard',
      payload:{ message:'RESPONDO Actions 2.0 test' },
      createdAt:new Date().toISOString(),
    });
    if (delivery.status !== 'delivered') return res.status(400).json({ error:'Webhook ei vastannut onnistuneesti.' });
    return res.json({ ok:true,httpStatus:delivery.httpStatus || 200 });
  } catch (e) {
    console.error('Webhook test failed',e); return res.status(400).json({ error:'Webhook-testi epäonnistui.' });
  }
});

app.post('/api/app/action-requests/:id/status', auth, ownerOnly, subscribed, async (req,res) => {
  try {
    const status = ['new','in_progress','done'].includes(String(req.body.status)) ? String(req.body.status) : 'done';
    const tr = await q('SELECT id FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1)',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const updated = await q(
      'UPDATE action_requests SET status=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING id,status',
      [status,req.params.id,tr.rows[0].id],
    );
    if (!updated.rowCount) return res.status(404).json({ error:'Pyyntöä ei löytynyt.' });
    return res.json(updated.rows[0]);
  } catch (e) {
    return res.status(500).json({ error:'Tilaa ei voitu päivittää.' });
  }
});


app.post('/api/app/commerce', auth, ownerOnly, subscribed, async (req,res) => {
  if(!await requirePlanCapability(req,res,'allCurrentFeatures')) return;
  try {
    const tr = await q('SELECT * FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1)',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenant = tr.rows[0];
    const provider = ['shopify','woocommerce',''].includes(String(req.body.provider || ''))
      ? String(req.body.provider || '')
      : '';

    let shop = String(req.body.shopifyShopDomain || '').trim().toLowerCase()
      .replace(/^https?:\/\//,'').replace(/\/$/,'');
    if (shop && !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) {
      return res.status(400).json({ error:'Shopify-osoitteen pitää olla muodossa kauppa.myshopify.com.' });
    }

    let wooBase = String(req.body.wooBaseUrl || '').trim();
    if (wooBase) {
      const parsed = await assertPublicHttpUrl(wooBase);
      if (parsed.protocol !== 'https:') return res.status(400).json({ error:'WooCommerce-kaupan pitää käyttää HTTPS-yhteyttä.' });
      wooBase = parsed.origin;
    }

    const shopToken = String(req.body.shopifyAccessToken || '').trim();
    const wooKey = String(req.body.wooConsumerKey || '').trim();
    const wooSecret = String(req.body.wooConsumerSecret || '').trim();

    await q(
      `UPDATE tenants SET
         ecommerce_provider=$1,
         shopify_shop_domain=$2,
         shopify_access_token=$3,
         woo_base_url=$4,
         woo_consumer_key=$5,
         woo_consumer_secret=$6,
         updated_at=NOW()
       WHERE id=$7`,
      [
        provider || null,
        shop || null,
        shopToken ? encryptSecret(shopToken) : tenant.shopify_access_token,
        wooBase || null,
        wooKey ? encryptSecret(wooKey) : tenant.woo_consumer_key,
        wooSecret ? encryptSecret(wooSecret) : tenant.woo_consumer_secret,
        tenant.id,
      ],
    );
    return res.json({ ok:true });
  } catch (e) {
    console.error('Commerce settings save failed',e); return res.status(400).json({ error:'Verkkokauppayhteyttä ei voitu tallentaa.' });
  }
});

app.post('/api/app/commerce/test', auth, ownerOnly, subscribed, async (req,res) => {
  if(!await requirePlanCapability(req,res,'allCurrentFeatures')) return;
  try {
    const tr = await q('SELECT * FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1)',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenant = tr.rows[0];
    if (tenant.ecommerce_provider === 'shopify') {
      const data = await shopifyGraphql(tenant,'query RespondoShopTest { shop { name } }');
      return res.json({ ok:true,provider:'shopify',name:data?.shop?.name || tenant.shopify_shop_domain });
    }
    if (tenant.ecommerce_provider === 'woocommerce') {
      const orders = await wooApi(tenant,'orders',{ per_page:1 });
      return res.json({ ok:true,provider:'woocommerce',sampleCount:Array.isArray(orders) ? orders.length : 0 });
    }
    return res.status(400).json({ error:'Valitse Shopify tai WooCommerce ensin.' });
  } catch (e) {
    console.error('Commerce connection test failed',e); return res.status(400).json({ error:'Yhteystesti epäonnistui.' });
  }
});

app.post('/api/app/support-agents', auth, ownerOnly, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT id,subscription_plan FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1)',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const access=planEntitlements(tr.rows[0].subscription_plan);
    const agentCount=await q('SELECT COUNT(*)::int AS count FROM support_agents WHERE tenant_id=$1',[tr.rows[0].id]);
    if(Number(agentCount.rows[0]?.count||0)>=access.agentSeats) {
      return res.status(403).json({
        error:'Tilaus sisältää enintään '+access.agentSeats+' asiakaspalvelijapaikkaa.',
        seatLimit:access.agentSeats,
        upgradeRequired:true,
      });
    }
    const displayName = String(req.body.displayName || '').replace(/[<>]/g,'').trim().slice(0,60);
    const username = String(req.body.username || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g,'').slice(0,50);
    const password = String(req.body.password || '');
    const languages=[...new Set((Array.isArray(req.body.languages)?req.body.languages:[]).map(x=>String(x).toLowerCase()).filter(x=>['fi','sv','en'].includes(x)))];
    if (!displayName) return res.status(400).json({ error:'Anna asiakaspalvelijan nimi.' });
    if (username.length < 3) return res.status(400).json({ error:'Käyttäjänimen pitää olla vähintään 3 merkkiä.' });
    if (password.length < 10) return res.status(400).json({ error:'Salasanan pitää olla vähintään 10 merkkiä.' });
    if (!languages.length) return res.status(400).json({ error:'Valitse vähintään yksi palvelukieli.' });
    const avatar = cleanBotAvatar(req.body.avatar || '') === 'robot-1' && !String(req.body.avatar || '').startsWith('data:image/') ? null : cleanBotAvatar(req.body.avatar || '');
    const passwordHash = await bcrypt.hash(password, 12);
    const row = await q(
      `INSERT INTO support_agents(id,tenant_id,display_name,avatar,username,password_hash,languages,status) VALUES($1,$2,$3,$4,$5,$6,$7,'offline') RETURNING id,display_name,avatar,username,languages,status,created_at`,
      [uid(),tr.rows[0].id,displayName,avatar,username,passwordHash,languages],
    );
    return res.json(row.rows[0]);
  } catch (e) { console.error('Support agent creation failed',e); return res.status(400).json({ error:'Profiilia ei voitu luoda.' }); }
});

app.delete('/api/app/support-agents/:id', auth, ownerOnly, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT id FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1)',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    await q('UPDATE chat_threads SET assigned_agent_id=NULL WHERE tenant_id=$1 AND assigned_agent_id=$2',[tr.rows[0].id,req.params.id]);
    const rr = await q('DELETE FROM support_agents WHERE id=$1 AND tenant_id=$2 RETURNING id',[req.params.id,tr.rows[0].id]);
    if (!rr.rowCount) return res.status(404).json({ error:'Profiilia ei löytynyt.' });
    return res.json({ ok:true });
  } catch { return res.status(500).json({ error:'Profiilia ei voitu poistaa.' }); }
});

app.post('/api/app/support-agents/:id/status', auth, ownerOnly, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT id FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1)',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const status = req.body.status === 'online' ? 'online' : 'offline';
    const rr = await q("UPDATE support_agents SET status=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING id,display_name,avatar,status",[status,req.params.id,tr.rows[0].id]);
    if (!rr.rowCount) return res.status(404).json({ error:'Profiilia ei löytynyt.' });
    return res.json(rr.rows[0]);
  } catch { return res.status(500).json({ error:'Tilaa ei voitu päivittää.' }); }
});

app.post('/api/app/live/:id/assign', auth, ownerOnly, subscribed, async (req,res) => {
  try {
    const tr = await q('SELECT id FROM tenants WHERE owner_user_id=$1 AND id=active_tenant_for_user($1)',[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenantId=tr.rows[0].id;
    const agentId=String(req.body.agentId || '').trim() || null;
    if (agentId) {
      const ar=await q('SELECT id FROM support_agents WHERE id=$1 AND tenant_id=$2',[agentId,tenantId]);
      if (!ar.rowCount) return res.status(404).json({ error:'Profiilia ei löytynyt.' });
    }
    const rr=await q("UPDATE chat_threads SET assigned_agent_id=$1,mode=CASE WHEN $1::uuid IS NULL THEN mode ELSE 'human' END,status='open',updated_at=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING *",[agentId,req.params.id,tenantId]);
    if (!rr.rowCount) return res.status(404).json({ error:'Keskustelua ei löytynyt.' });
    return res.json(rr.rows[0]);
  } catch(e) { console.error('Live assignment failed',e); return res.status(400).json({ error:'Keskustelua ei voitu osoittaa.' }); }
});

app.post('/api/app/live/:id/mode', auth, async (req,res) => {
  if (req.user.role === 'agent') {
    const owned=await q(
      "SELECT ct.id FROM chat_threads ct JOIN tenants t ON t.id=ct.tenant_id JOIN users u ON u.id=t.owner_user_id WHERE ct.id=$1 AND ct.tenant_id=$2 AND ct.assigned_agent_id=$3 AND u.status='active' AND t.active=true AND t.subscription_status IN ('active','trialing') AND (COALESCE(t.subscription_cancel_at_period_end,false)=false OR t.current_period_end IS NULL OR t.current_period_end > NOW())",
      [req.params.id,req.user.tenantId,req.user.agentId],
    );
    if (!owned.rowCount) return res.status(403).json({ error:'Keskustelua ei ole osoitettu sinulle.' });
  }
  try {
    const tr = req.user.role === 'agent'
      ? { rowCount:1,rows:[{id:req.user.tenantId}] }
      : await q("SELECT t.id FROM tenants t JOIN users u ON u.id=t.owner_user_id WHERE t.owner_user_id=$1 AND t.id=active_tenant_for_user($1) AND u.status='active' AND t.active=true AND t.subscription_status IN ('active','trialing') AND (COALESCE(t.subscription_cancel_at_period_end,false)=false OR t.current_period_end IS NULL OR t.current_period_end > NOW())",[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const mode = req.body.mode === 'human' ? 'human' : 'ai';
    const rr = await q(
      `UPDATE chat_threads SET mode=$1,status='open',updated_at=NOW()
        WHERE id=$2 AND tenant_id=$3 RETURNING *`,
      [mode,req.params.id,tr.rows[0].id],
    );
    if (!rr.rowCount) return res.status(404).json({ error:'Keskustelua ei löytynyt.' });
    return res.json(rr.rows[0]);
  } catch {
    return res.status(500).json({ error:'Keskustelua ei voitu päivittää.' });
  }
});

app.post('/api/app/live/:id/reply', auth, async (req,res) => {
  if (req.user.role === 'agent') {
    const owned=await q(
      "SELECT ct.id FROM chat_threads ct JOIN tenants t ON t.id=ct.tenant_id JOIN users u ON u.id=t.owner_user_id WHERE ct.id=$1 AND ct.tenant_id=$2 AND ct.assigned_agent_id=$3 AND u.status='active' AND t.active=true AND t.subscription_status IN ('active','trialing') AND (COALESCE(t.subscription_cancel_at_period_end,false)=false OR t.current_period_end IS NULL OR t.current_period_end > NOW())",
      [req.params.id,req.user.tenantId,req.user.agentId],
    );
    if (!owned.rowCount) return res.status(403).json({ error:'Keskustelua ei ole osoitettu sinulle.' });
  }
  try {
    const text = String(req.body.message || '').trim().slice(0,4000);
    if (!text) return res.status(400).json({ error:'Kirjoita viesti.' });
    const tr = req.user.role === 'agent'
      ? await q("SELECT t.* FROM tenants t JOIN users u ON u.id=t.owner_user_id WHERE t.id=$1 AND u.status='active' AND t.active=true AND t.subscription_status IN ('active','trialing') AND (COALESCE(t.subscription_cancel_at_period_end,false)=false OR t.current_period_end IS NULL OR t.current_period_end > NOW())",[req.user.tenantId])
      : await q("SELECT t.* FROM tenants t JOIN users u ON u.id=t.owner_user_id WHERE t.owner_user_id=$1 AND t.id=active_tenant_for_user($1) AND u.status='active' AND t.active=true AND t.subscription_status IN ('active','trialing') AND (COALESCE(t.subscription_cancel_at_period_end,false)=false OR t.current_period_end IS NULL OR t.current_period_end > NOW())",[req.user.sub]);
    if (!tr.rowCount) return res.status(404).json({ error:'Työtilaa ei löytynyt.' });
    const tenant = tr.rows[0];
    const rr = await q(
      'SELECT * FROM chat_threads WHERE id=$1 AND tenant_id=$2',
      [req.params.id,tenant.id],
    );
    if (!rr.rowCount) return res.status(404).json({ error:'Keskustelua ei löytynyt.' });
    const thread = rr.rows[0];
    if (String(thread.source_channel || 'website') !== 'website') {
      return res.status(410).json({ error:'Tämä aiempi ulkoinen kanavaintegraatio on poistettu. Vastaa asiakkaalle alkuperäisessä kanavassa.' });
    }
    await q("UPDATE chat_threads SET mode='human',status='open',updated_at=NOW() WHERE id=$1 AND tenant_id=$2",[thread.id,tenant.id]);
    const message = await appendChatMessage({
      tenantId:tenant.id,threadId:thread.id,sourceChannel:thread.source_channel,
      externalContactId:thread.external_contact_id,visitorRef:thread.visitor_ref,
      role:'human',text,metadata: thread.assigned_agent_id ? { agentId:thread.assigned_agent_id } : {},
    });
    return res.json({ ok:true,message });
  } catch (e) {
    console.error('Live reply failed',e); return res.status(400).json({ error:'Viestiä ei voitu lähettää.' });
  }
});

app.post('/api/channel/:slug/message', channelApiLimiter, async (req,res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error:'Yritystä ei löytynyt.' });
    const tenant = await ensureTenantActionKeys(tr.rows[0]);
    if (!planEntitlements(tenant.subscription_plan).allCurrentFeatures) {
      return res.status(403).json({ error:'Channels API vaatii Business-tilauksen.', upgradeRequired:true });
    }
    const authHeader = String(req.headers.authorization || '');
    if (authHeader !== 'Bearer ' + tenant.channels_api_key) {
      return res.status(401).json({ error:'Virheellinen Channels API -avain.' });
    }

    const channel = String(req.body.channel || 'api').trim().toLowerCase().slice(0,40);
    if (!['api','email'].includes(channel)) {
      return res.status(400).json({ error:'Tuntematon kanava.' });
    }
    const contactId = String(req.body.contactId || '').trim().slice(0,220);
    const message = String(req.body.message || '').trim().slice(0,1200);
    const lang = ['fi','sv','en'].includes(String(req.body.lang || '').toLowerCase())
      ? String(req.body.lang).toLowerCase()
      : 'fi';
    if (!contactId || !message) return res.status(400).json({ error:'contactId ja message tarvitaan.' });

    const result = await processExternalChannelMessage(tenant,channel,contactId,message,lang);
    return res.json(result);
  } catch (e) {
    console.error('Channels API failed',e);
    return res.status(500).json({ error:'Kanavaviestiä ei voitu käsitellä.' });
  }
});


app.post('/api/public/:slug/action-event', publicChatLimiter, async (req, res) => {
  try {
    const tr = await publicTenant(req.params.slug);
    if (!tr.rowCount) return res.status(404).json({ error: 'Yritystä ei löytynyt.' });
    const tenant = tr.rows[0];
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};

    if (!validWidgetToken(req,tenant,body.widgetToken)) {
      return res.status(403).json({ error:'Chat ei ole käytössä tällä verkkosivulla.' });
    }
    setWidgetCors(req,res);

    const actionType = String(body.actionType || '').trim().slice(0, 40);
    if (!['quote','booking','order_status','phone','email','link','product','callback'].includes(actionType)) {
      return res.status(400).json({ error: 'Tuntematon toiminto.' });
    }

    await q(
      `INSERT INTO action_events(id,tenant_id,visitor_ref,action_type,label,target,page_url)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [
        uid(),
        tenant.id,
        String(body.visitorRef || '').slice(0,160) || null,
        actionType,
        String(body.label || '').slice(0,120) || null,
        String(body.target || '').slice(0,1000) || null,
        String(body.pageContext?.url || '').slice(0,1000) || null,
      ],
    );
    return res.json({ ok:true });
  } catch (e) {
    console.error('Action event failed', e);
    return res.status(500).json({ error:'Toiminnon seuranta epäonnistui.' });
  }
});

app.post('/api/billing/portal', auth, ownerOnly, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe ei ole vielä kytketty.' });
    const r = await q(
      `SELECT u.stripe_customer_id,t.id AS tenant_id,t.stripe_subscription_id
         FROM users u
         LEFT JOIN tenants t
           ON t.id=active_tenant_for_user(u.id)
          AND t.owner_user_id=u.id
        WHERE u.id=$1`,
      [req.user.sub],
    );
    if (!r.rows[0]?.stripe_customer_id) {
      return res.status(400).json({ error: 'Asiakkaan Stripe-tilausta ei löytynyt.' });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: r.rows[0].stripe_customer_id,
      return_url: `${BASE}/app?section=account`,
    });
    return res.json({
      url: session.url,
      tenantId: r.rows[0].tenant_id || null,
      subscriptionId: r.rows[0].stripe_subscription_id || null,
    });
  } catch (e) {
    console.error('Billing portal creation failed', e);
    return res.status(500).json({ error: 'Laskutuksen hallintaa ei voitu avata.' });
  }
});

app.post('/api/billing/cancel', auth, ownerOnly, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe ei ole vielä kytketty.' });
    const r = await q(
      `SELECT t.id AS tenant_id,
              COALESCE(t.stripe_subscription_id,u.stripe_subscription_id) AS stripe_subscription_id
         FROM users u
         LEFT JOIN tenants t ON t.id=active_tenant_for_user(u.id) AND t.owner_user_id=u.id
        WHERE u.id=$1`,
      [req.user.sub],
    );
    const id = r.rows[0]?.stripe_subscription_id;
    if (!id) return res.status(400).json({ error: 'Valitun yrityksen tilausta ei löytynyt.' });

    const subscription = await stripe.subscriptions.update(id, { cancel_at_period_end: true });
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null;

    if(r.rows[0]?.tenant_id){
      await q(
        `UPDATE tenants
            SET subscription_cancel_at_period_end=true,
                current_period_end=COALESCE($1,current_period_end),
                updated_at=NOW()
          WHERE id=$2 AND owner_user_id=$3`,
        [periodEnd,r.rows[0].tenant_id,req.user.sub],
      );
    }

    return res.json({
      ok: true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: periodEnd ? periodEnd.toISOString() : null,
    });
  } catch (e) {
    console.error('Subscription cancellation failed', e);
    return res.status(500).json({ error: 'Tilauksen peruutusta ei voitu tallentaa.' });
  }
});

app.use(async (req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    try {
      const { html, seo } = await renderIndexHtml(req);
      res.status(seo.isKnown ? 200 : 404);
      res.setHeader('Link','<' + seo.canonical + '>; rel="canonical"');
      res.setHeader('Content-Language',seo.lang);
      res.type('html').send(html);
      return;
    } catch (e) {
      console.error('SEO shell render failed', e);
      return res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
  }
  next();
});


function respondoOwnerSiteUrl() {
  const candidates = [
    SEO_CANONICAL_ORIGIN,
    process.env.RESPONDO_CANONICAL_URL,
    process.env.BASE_URL,
    process.env.RAILWAY_SERVICE_RESPONDO_WEB_URL,
    process.env.RAILWAY_STATIC_URL,
    process.env.RAILWAY_PUBLIC_DOMAIN ? 'https://' + process.env.RAILWAY_PUBLIC_DOMAIN : '',
    BASE,
  ];
  for (const candidate of candidates) {
    const normalized = normalizeWebUrl(candidate, true);
    if (normalized && !/localhost|127\.0\.0\.1/i.test(normalized)) return normalized;
  }
  return normalizeWebUrl(BASE, true) || '';
}

async function seedOwnerRespondoKnowledge() {
  if (!pool) return { seeded:false, reason:'no_database' };

  const ownerEmail = cleanEmail(process.env.OWNER_EMAIL || process.env.SUPPORT_EMAIL);
  if (!ownerEmail) return { seeded:false, reason:'owner_email_missing' };

  const owner = await q(
    `SELECT u.id AS user_id,t.id AS tenant_id,t.name,t.slug
       FROM users u
       JOIN tenants t ON t.owner_user_id=u.id
      WHERE lower(u.email)=lower($1)
      ORDER BY
        CASE
          WHEN lower(COALESCE(t.slug,'')) IN ('respondo','respondoai') THEN 0
          WHEN lower(COALESCE(t.name,'')) IN ('respondo','respondo ai') THEN 1
          ELSE 2
        END,
        t.created_at ASC
      LIMIT 1`,
    [ownerEmail],
  );
  if (!owner.rowCount) return { seeded:false, reason:'owner_account_not_found' };

  const tenantId = owner.rows[0].tenant_id;
  const siteUrl = respondoOwnerSiteUrl();
  const supportEmail = cleanEmail(process.env.SUPPORT_EMAIL || ownerEmail) || ownerEmail;
  const rows = buildRespondoFaqRows({ supportEmail, siteUrl });
  const seedHash = crypto.createHash('sha256').update(JSON.stringify(
    rows.map((row) => ({
      category:String(row.category || 'Respondo FAQ').slice(0,80),
      title:String(row.title || '').slice(0,180),
      answer:String(row.answer || '').slice(0,1600),
      keywords:Array.isArray(row.keywords) ? row.keywords.slice(0,40) : [],
      source_url:row.source_url || siteUrl || null,
    }))
  )).digest('hex');

  // The seed runs on every Railway service. Under the cross-service advisory
  // lock, skip the expensive DELETE + INSERT when the exact desired dataset is
  // already present. A count mismatch also self-heals any historical duplicate
  // seed rows created by concurrent deploys.
  const seedState = await q(
    `SELECT
       (SELECT value FROM app_settings WHERE key='respondo_seed_sha256') AS seed_hash,
       (SELECT count(*)::int FROM knowledge WHERE tenant_id=$1 AND source_type='respondo_seed') AS target_count,
       (SELECT count(*)::int
          FROM knowledge k
          JOIN tenants t ON t.id=k.tenant_id
         WHERE t.owner_user_id=$2 AND k.source_type='respondo_seed' AND k.tenant_id<>$1) AS foreign_count,
       (SELECT count(*)::int
          FROM knowledge
         WHERE tenant_id=$1
           AND (
             lower(COALESCE(source_url,'')) LIKE '%jagputters.fi%'
             OR lower(COALESCE(answer,'')) LIKE '%jag putter%'
             OR lower(COALESCE(answer,'')) LIKE '%jagputters%'
           )) AS leaked_count`,
    [tenantId,owner.rows[0].user_id],
  );
  const state=seedState.rows[0] || {};
  if (
    state.seed_hash === seedHash &&
    Number(state.target_count || 0) === rows.length &&
    Number(state.foreign_count || 0) === 0 &&
    Number(state.leaked_count || 0) === 0
  ) {
    console.log(`Respondo FAQ seed already current (${rows.length} rows)`);
    return { seeded:false, reason:'already_current', count:rows.length, tenantId, siteUrl };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE tenants
          SET name='Respondo AI',
              industry='B2B-ohjelmistopalvelu',
              website=COALESCE(NULLIF($1,''),website),
              contact_email=COALESCE(NULLIF($2,''),contact_email),
              updated_at=NOW()
        WHERE id=$3`,
      [siteUrl, supportEmail, tenantId],
    );

    await client.query(
      `DELETE FROM knowledge k
        USING tenants t
        WHERE k.tenant_id=t.id
          AND k.source_type='respondo_seed'
          AND t.owner_user_id=$1
          AND t.id<>$2`,
      [owner.rows[0].user_id, tenantId],
    );

    await client.query(
      "DELETE FROM knowledge WHERE tenant_id=$1 AND source_type='respondo_seed'",
      [tenantId],
    );

    // First-party Respondo knowledge must never inherit an authenticated import
    // from a customer/test website. Keep the rows for forensics, but quarantine
    // them so they can never become answer evidence.
    const importedRows = await client.query(
      `SELECT id,source_url
         FROM knowledge
        WHERE tenant_id=$1
          AND approved=true
          AND source_type IN ('website','profile')
          AND source_url IS NOT NULL`,
      [tenantId],
    );
    const foreignImportedIds=importedRows.rows
      .filter((row)=>!respondoFirstPartyWebsiteAllowed(row.source_url))
      .map((row)=>row.id);
    if (foreignImportedIds.length) {
      await client.query(
        'UPDATE knowledge SET approved=false,updated_at=NOW() WHERE tenant_id=$1 AND id=ANY($2::uuid[])',
        [tenantId,foreignImportedIds],
      );
    }

    // Legacy JAG text that may predate source_url tracking is also quarantined.
    await client.query(
      `UPDATE knowledge
          SET approved=false,updated_at=NOW()
        WHERE tenant_id=$1
          AND approved=true
          AND source_type<>'respondo_seed'
          AND (
            lower(COALESCE(answer,'')) LIKE '%jag putter%'
            OR lower(COALESCE(answer,'')) LIKE '%jagputters%'
          )`,
      [tenantId],
    );

    if (rows.length) {
      const params = [];
      const values = [];
      rows.forEach((row,index) => {
        const offset = index * 8;
        values.push(
          `($${offset+1},$${offset+2},$${offset+3},$${offset+4},$${offset+5},$${offset+6},$${offset+7},$${offset+8},true,NOW())`
        );
        params.push(
          uid(),
          tenantId,
          String(row.category || 'Respondo FAQ').slice(0,80),
          String(row.title || '').slice(0,180),
          String(row.answer || '').slice(0,1600),
          Array.isArray(row.keywords) ? row.keywords.slice(0,40) : [],
          'respondo_seed',
          row.source_url || siteUrl || null,
        );
      });

      await client.query(
        `INSERT INTO knowledge(
           id,tenant_id,category,title,answer,keywords,source_type,source_url,approved,verified_at
         ) VALUES ${values.join(',')}`,
        params,
      );
    }

    await client.query(
      `INSERT INTO app_settings(key,value,updated_at)
       VALUES('respondo_seed_sha256',$1,NOW())
       ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`,
      [seedHash],
    );

    await client.query('COMMIT');
    console.log(`Seeded ${rows.length} trilingual Respondo FAQ rows for owner tenant`);
    return { seeded:true, count:rows.length, tenantId, siteUrl };
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

async function ensureRuntimeSchema() {
  if (!pool) return;

  // Keep new public-schema objects deny-by-default for Supabase Data API roles.
  // These statements are idempotent and match Supabase's documented hardening.
  await q(`ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated, service_role`);
  await q(`ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated, service_role`);
  await q(`ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE USAGE, SELECT ON SEQUENCES FROM anon, authenticated, service_role`);
  await q(`ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE EXECUTE ON FUNCTIONS FROM public`);

  await q('ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT');
  await q("ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'fi'");
  await q('ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT');
  await q("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE");
  await q("ALTER TABLE users ADD COLUMN IF NOT EXISTS active_tenant_id UUID");
  await q("ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_owner_user_id_key");
  await q("CREATE INDEX IF NOT EXISTS idx_tenants_owner_user_id ON tenants(owner_user_id)");
  await q("CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_stripe_subscription ON tenants(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_id TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_plan TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE");
  await q(`UPDATE tenants t
              SET business_id=COALESCE(t.business_id,u.business_id),
                  stripe_subscription_id=COALESCE(t.stripe_subscription_id,u.stripe_subscription_id),
                  subscription_status=COALESCE(t.subscription_status,u.subscription_status),
                  subscription_plan=COALESCE(t.subscription_plan,u.subscription_plan),
                  current_period_end=COALESCE(t.current_period_end,u.current_period_end),
                  subscription_cancel_at_period_end=COALESCE(t.subscription_cancel_at_period_end,u.subscription_cancel_at_period_end)
             FROM users u
            WHERE t.owner_user_id=u.id
              AND t.id=(SELECT t2.id FROM tenants t2 WHERE t2.owner_user_id=u.id ORDER BY t2.created_at ASC LIMIT 1)`);
  await q(`UPDATE users u
              SET active_tenant_id=(
                SELECT t.id FROM tenants t
                 WHERE t.owner_user_id=u.id
                 ORDER BY t.created_at ASC
                 LIMIT 1
              )
            WHERE u.active_tenant_id IS NULL
               OR NOT EXISTS (
                 SELECT 1 FROM tenants t
                  WHERE t.id=u.active_tenant_id
                    AND t.owner_user_id=u.id
               )`);
  await q(`CREATE OR REPLACE FUNCTION active_tenant_for_user(user_uuid UUID)
            RETURNS UUID
            LANGUAGE SQL
            STABLE
            SET search_path = public, pg_temp
            AS 'SELECT COALESCE(
              (SELECT active_tenant_id FROM users WHERE id=user_uuid),
              (SELECT id FROM tenants WHERE owner_user_id=user_uuid ORDER BY created_at ASC LIMIT 1)
            )'`);
  await q(`DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
        REVOKE EXECUTE ON FUNCTION public.active_tenant_for_user(UUID) FROM anon;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
        REVOKE EXECUTE ON FUNCTION public.active_tenant_for_user(UUID) FROM authenticated;
      END IF;
    END
  $$`);
  await q(`CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q(
    "INSERT INTO app_settings(key,value) VALUES('owner_test_plan_enabled','true') ON CONFLICT(key) DO NOTHING"
  );
  await q(`CREATE TABLE IF NOT EXISTS intent_utterances (
    id BIGSERIAL PRIMARY KEY,
    language TEXT NOT NULL,
    intent TEXT NOT NULL,
    phrase TEXT NOT NULL,
    normalized TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'generated',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('ALTER TABLE public.intent_utterances ENABLE ROW LEVEL SECURITY');
  await q('CREATE UNIQUE INDEX IF NOT EXISTS idx_intent_utterances_language_normalized ON intent_utterances(language,normalized)');
  await q('CREATE INDEX IF NOT EXISTS idx_intent_utterances_intent_language ON intent_utterances(intent,language)');
  await q("DO $intent$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL PRIVILEGES ON TABLE public.intent_utterances FROM anon; END IF; IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL PRIVILEGES ON TABLE public.intent_utterances FROM authenticated; END IF; END $intent$");
  await q(`CREATE TABLE IF NOT EXISTS intent_phrase_variants (
    language TEXT NOT NULL,
    intent TEXT NOT NULL,
    normalized TEXT NOT NULL,
    PRIMARY KEY(language,normalized)
  )`);
  await q('ALTER TABLE public.intent_phrase_variants ENABLE ROW LEVEL SECURITY');
  await q("DO $intent_variants$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL PRIVILEGES ON TABLE public.intent_phrase_variants FROM anon; END IF; IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL PRIVILEGES ON TABLE public.intent_phrase_variants FROM authenticated; END IF; END $intent_variants$");
  await q(`CREATE TABLE IF NOT EXISTS intent_phrase_templates (
    language TEXT NOT NULL,
    template_type TEXT NOT NULL,
    phrase TEXT NOT NULL,
    normalized TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY(language,template_type,normalized)
  )`);
  await q('ALTER TABLE public.intent_phrase_templates ENABLE ROW LEVEL SECURITY');
  await q(`CREATE TABLE IF NOT EXISTS intent_lexicon_stats (
    language TEXT PRIMARY KEY,
    core_count BIGINT NOT NULL,
    prefix_count INTEGER NOT NULL,
    suffix_count INTEGER NOT NULL,
    virtual_capacity BIGINT NOT NULL,
    target BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('ALTER TABLE public.intent_lexicon_stats ENABLE ROW LEVEL SECURITY');
  await q("DO $intent_virtual$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL PRIVILEGES ON TABLE public.intent_phrase_templates FROM anon; REVOKE ALL PRIVILEGES ON TABLE public.intent_lexicon_stats FROM anon; END IF; IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL PRIVILEGES ON TABLE public.intent_phrase_templates FROM authenticated; REVOKE ALL PRIVILEGES ON TABLE public.intent_lexicon_stats FROM authenticated; END IF; END $intent_virtual$");
  await q(`CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY');
  await q(`DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
        REVOKE ALL PRIVILEGES ON TABLE public.stripe_webhook_events FROM anon;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
        REVOKE ALL PRIVILEGES ON TABLE public.stripe_webhook_events FROM authenticated;
      END IF;
    END
  $$`);
  await q('CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_updated ON stripe_webhook_events(updated_at DESC)');

  await q(`CREATE TABLE IF NOT EXISTS demo_website_imports (
    id UUID PRIMARY KEY,
    website TEXT NOT NULL,
    candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('ALTER TABLE public.demo_website_imports ENABLE ROW LEVEL SECURITY');
  await q(`DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
        REVOKE ALL PRIVILEGES ON TABLE public.demo_website_imports FROM anon;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
        REVOKE ALL PRIVILEGES ON TABLE public.demo_website_imports FROM authenticated;
      END IF;
    END
  $$`);
  await q('CREATE INDEX IF NOT EXISTS idx_demo_website_imports_created ON demo_website_imports(created_at DESC)');
  await q('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL');
  await q(`CREATE TABLE IF NOT EXISTS referral_redemptions (
    id UUID PRIMARY KEY,
    referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    stripe_discount_applied BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referral_redemptions(referrer_user_id, created_at DESC)');

  await q(`CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    visitor_ref TEXT,
    name TEXT,
    email TEXT,
    phone TEXT,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_leads_tenant_created ON leads(tenant_id, created_at DESC)');
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS average_lead_value NUMERIC(12,2) NOT NULL DEFAULT 0");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bot_name TEXT NOT NULL DEFAULT 'RESPONDO AI'");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bot_avatar TEXT NOT NULL DEFAULT 'robot-1'");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS action_webhook_url TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS action_webhook_secret TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS channels_api_key TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_connected_account_id TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quote_service_name TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quote_base_price NUMERIC(12,2) NOT NULL DEFAULT 0");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quote_unit_price NUMERIC(12,2) NOT NULL DEFAULT 0");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quote_min_price NUMERIC(12,2) NOT NULL DEFAULT 0");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quote_vat_percent NUMERIC(6,2) NOT NULL DEFAULT 0");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quote_unit_label TEXT NOT NULL DEFAULT 'kpl'");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_calendar_access_token TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_calendar_refresh_token TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_calendar_token_expires_at TIMESTAMPTZ");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_calendar_email TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_calendar_id TEXT NOT NULL DEFAULT 'primary'");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ecommerce_provider TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS shopify_shop_domain TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS shopify_access_token TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS woo_base_url TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS woo_consumer_key TEXT");
  await q("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS woo_consumer_secret TEXT");




  await q("ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'manual'");
  await q("ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS source_url TEXT");
  await q("ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT TRUE");
  await q("ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
  await q("ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS quick_reply_order SMALLINT");
  await q("CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_quick_reply_slot ON knowledge(tenant_id, quick_reply_order) WHERE quick_reply_order IS NOT NULL");
  await q("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS page_url TEXT");
  await q("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS page_title TEXT");
  await q("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS source_channel TEXT NOT NULL DEFAULT 'website'");
  await q("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS external_contact_id TEXT");

  await q(`CREATE TABLE IF NOT EXISTS site_visits (
    id UUID PRIMARY KEY,
    visitor_hash TEXT NOT NULL,
    path TEXT NOT NULL,
    referrer TEXT,
    referrer_host TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    language TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q("ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS language TEXT");
  await q('CREATE INDEX IF NOT EXISTS idx_site_visits_created ON site_visits(created_at DESC)');
  await q('CREATE INDEX IF NOT EXISTS idx_site_visits_visitor ON site_visits(visitor_hash, created_at DESC)');

  await q(`CREATE TABLE IF NOT EXISTS action_events (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    visitor_ref TEXT,
    action_type TEXT NOT NULL,
    label TEXT,
    target TEXT,
    page_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_action_events_tenant_created ON action_events(tenant_id, created_at DESC)');
  await q(`CREATE TABLE IF NOT EXISTS self_test_runs (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    answerable_questions INTEGER NOT NULL,
    gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_self_test_tenant_created ON self_test_runs(tenant_id, created_at DESC)');
  await q(`CREATE TABLE IF NOT EXISTS action_requests (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    visitor_ref TEXT,
    request_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB NOT NULL DEFAULT '{}'::jsonb,
    delivery_status TEXT NOT NULL DEFAULT 'not_configured',
    source_channel TEXT NOT NULL DEFAULT 'website',
    external_contact_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_action_requests_tenant_created ON action_requests(tenant_id, created_at DESC)');
  await q(`CREATE TABLE IF NOT EXISTS booking_slots (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id,starts_at)
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_booking_slots_tenant_start ON booking_slots(tenant_id, starts_at)');
  await q(`CREATE TABLE IF NOT EXISTS chat_threads (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source_channel TEXT NOT NULL DEFAULT 'website',
    external_contact_id TEXT NOT NULL,
    visitor_ref TEXT,
    mode TEXT NOT NULL DEFAULT 'ai',
    status TEXT NOT NULL DEFAULT 'open',
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id,source_channel,external_contact_id)
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_chat_threads_tenant_activity ON chat_threads(tenant_id,last_activity_at DESC)');
  await q(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY');
  await q('CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id,created_at DESC)');
  await q('CREATE INDEX IF NOT EXISTS idx_password_reset_expiry ON password_reset_tokens(expires_at)');

  await q(`CREATE TABLE IF NOT EXISTS support_agents (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    avatar TEXT,
    username TEXT,
    password_hash TEXT,
    status TEXT NOT NULL DEFAULT 'offline',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0');
  await q('ALTER TABLE support_agents ADD COLUMN IF NOT EXISTS username TEXT');
  await q('ALTER TABLE support_agents ADD COLUMN IF NOT EXISTS password_hash TEXT');
  await q('ALTER TABLE support_agents ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0');
  await q("ALTER TABLE support_agents ADD COLUMN IF NOT EXISTS languages TEXT[] NOT NULL DEFAULT ARRAY['fi']::TEXT[]");
  await q("ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'fi'");
  await q('CREATE INDEX IF NOT EXISTS idx_support_agents_tenant ON support_agents(tenant_id,created_at ASC)');
  await q('CREATE UNIQUE INDEX IF NOT EXISTS idx_support_agents_username_unique ON support_agents(lower(username)) WHERE username IS NOT NULL');
  await q('ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS assigned_agent_id UUID REFERENCES support_agents(id) ON DELETE SET NULL');
  await q('CREATE INDEX IF NOT EXISTS idx_chat_threads_assigned_agent_id ON chat_threads(assigned_agent_id)');

  await q(`CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    thread_id UUID REFERENCES chat_threads(id) ON DELETE CASCADE,
    source_channel TEXT NOT NULL DEFAULT 'website',
    external_contact_id TEXT,
    visitor_ref TEXT,
    role TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created ON chat_messages(thread_id,created_at ASC)');
  await q('CREATE INDEX IF NOT EXISTS idx_chat_messages_tenant_id ON chat_messages(tenant_id)');


  await q("ALTER TABLE tenants ALTER COLUMN accent SET DEFAULT '#111113'");
}

async function withRuntimeSchemaLock(fn) {
  if (!pool) return fn();
  const client=await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext('respondo_runtime_schema_v1'))");
    return await fn();
  } finally {
    try { await client.query("SELECT pg_advisory_unlock(hashtext('respondo_runtime_schema_v1'))"); } catch {}
    client.release();
  }
}

async function withOwnerSeedLock(fn) {
  if (!pool) return fn();
  const client=await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext('respondo_owner_seed_v1'))");
    return await fn();
  } finally {
    try { await client.query("SELECT pg_advisory_unlock(hashtext('respondo_owner_seed_v1'))"); } catch {}
    client.release();
  }
}

async function start() {
  try {
    await withRuntimeSchemaLock(() => ensureRuntimeSchema());
    await withRuntimeSchemaLock(async () => {
      await seedAndLoadIntentUtterances();
      await seedIntentPhraseTemplates();
    });
    try {
      await withOwnerSeedLock(() => seedOwnerRespondoKnowledge());
    } catch (e) {
      console.error('Owner Respondo knowledge seed failed', e);
    }
    try {
      await backfillOwnerTestReceiptOnce();
    } catch (e) {
      console.error('Owner test receipt backfill failed', e);
    }
  } catch (e) {
    console.error('Runtime schema check failed', e);
    if (process.env.NODE_ENV === 'production') {
      process.exitCode = 1;
      return;
    }
  }
  app.listen(PORT, () => console.log(`RESPONDO AI listening on ${PORT}`));
}

export { app, websiteKnowledgeCandidates, extractFreeWebsiteProfile, selectRelevantKnowledge, conciseKnowledgeAnswer, specificServiceConfirmation, generateGroundedAnswer, chatActions, queryTopic, fetchPublicHtml, fetchWebsiteBundle, buildProfileKnowledge, detectConversationLanguage, respondoProductFaqMatch, intentForMessage, resolveIntentForMessage };
if (process.env.NODE_ENV !== 'test') start();

