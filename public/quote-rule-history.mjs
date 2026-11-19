export function bindQuoteRuleHistory({details,form,t,api,locale,onUse}) {
  if (!details || !form) return;
  const list = details.querySelector('ul');
  const status = details.querySelector('[role="status"]');
  const more = details.querySelector('button');
  const doc = details.ownerDocument;
  const money = new Intl.NumberFormat(locale,{style:'currency',currency:'EUR'});
  const number = new Intl.NumberFormat(locale,{maximumFractionDigits:3});
  const date = new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short'});
  const amount = value => Number.isFinite(value) ? money.format(value) : '—';
  const percent = value => Number.isFinite(value) ? number.format(value) + ' %' : '—';
  const element = (tag,text) => {
    const node = doc.createElement(tag);
    if (text !== undefined) node.textContent = text;
    return node;
  };

  let cursor = null;
  let loaded = false;
  let request = 0;

  function renderVersion({version,pricing,recordedAt}) {
    const name = t('Versio '+version,'Version '+version,'Version '+version);
    const row = element('li');
    const item = element('details');
    const when = recordedAt ? date.format(new Date(recordedAt)) : t(
      'Asetukset ennen versionseurantaa','Inställningar före versionshistoriken','Settings before version history'
    );
    item.append(element('summary',name+' · '+when));
    const fields = element('dl');
    for (const [label,value] of [
      [t('Palvelu','Tjänst','Service'),pricing.serviceName || '—'],
      [t('Perusmaksu','Grundavgift','Base fee'),amount(pricing.basePrice)],
      [t('Yksikköhinta','Enhetspris','Unit price'),amount(pricing.unitPrice)+' / '+pricing.unitLabel],
      [t('Minimihinta','Minimipris','Minimum price'),amount(pricing.minPrice)],
      [t('ALV','Moms','VAT'),percent(pricing.vatPercent)],
      [t('Määräalennus','Mängdrabatt','Quantity discount'),
        pricing.discountPercent > 0 && Number.isFinite(pricing.discountOverQuantity)
          ? percent(pricing.discountPercent)+' · '+t('yli ','över ','above ')+number.format(pricing.discountOverQuantity)
          : '—']
    ]) fields.append(element('dt',label),element('dd',value));
    item.append(fields);

    const use = element('button',t('Täytä kentät tästä versiosta','Fyll i fälten från den här versionen','Fill fields from this version'));
    use.type = 'button';
    use.className = 'btn';
    use.addEventListener('click', () => {
      for (const [key,value] of Object.entries(pricing)) {
        if (form.elements.namedItem(key) && key !== 'expectedVersion') form.elements[key].value = value ?? '';
      }
      onUse(name);
      form.elements.serviceName.focus();
    });
    item.append(use);
    row.append(item);
    return row;
  }

  async function load(append = false) {
    if (!append) loaded = false;
    const thisRequest = ++request;
    if (!details.open || (append && cursor === null)) return;
    status.textContent = t('Ladataan versioita…','Laddar versioner…','Loading versions…');
    more.disabled = true;
    try {
      const query = append ? '?before='+encodeURIComponent(cursor) : '';
      const {versions,nextBefore} = await api('/api/app/quote-engine/versions'+query);
      if (thisRequest !== request || !details.isConnected) return;
      const rows = versions.map(renderVersion);
      if (append) list.append(...rows);
      else list.replaceChildren(...rows);
      loaded = true;
      cursor = nextBefore;
      more.hidden = cursor === null;
      status.textContent = list.children.length ? '' : t(
        'Ensimmäinen hinnaston muutos tallentaa vanhat asetukset ja uuden version.',
        'När prislistan ändras första gången sparas de tidigare inställningarna och den nya versionen.',
        'The first pricing change records the previous settings and the new version.'
      );
    } catch {
      if (thisRequest !== request || !details.isConnected) return;
      status.textContent = t(
        'Versiohistoriaa ei saatu ladattua. Sulje ja avaa historia uudelleen tai yritä uudestaan.',
        'Versionshistoriken kunde inte hämtas. Stäng och öppna historiken igen eller försök igen.',
        'Could not load version history. Reopen it or try again.'
      );
      more.hidden = false;
      more.textContent = t('Yritä uudelleen','Försök igen','Try again');
      return;
    } finally {
      if (thisRequest === request) more.disabled = false;
    }
    more.textContent = t('Näytä vanhemmat versiot','Visa äldre versioner','Show older versions');
  }

  details.addEventListener('toggle', () => { if (details.open && !loaded) void load(); });
  more.addEventListener('click', () => void load(loaded && cursor !== null));
  return () => void load();
}
