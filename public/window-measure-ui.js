import {measuredWindows} from './window-measure.mjs';

const language = new URLSearchParams(location.search).get('lang');
const labels = {
  fi:['Ikkunat kuvasta','Merkitse jokaisen ikkunan vastakkaiset kulmat. Mittojen arviointiin tarvitaan tunnettu pituus samalta tasolta. Käytä suoraan edestä otettua kuvaa.','Valitse kuva','Merkitse ikkuna','Merkitse tunnettu pituus','Peruuta viimeisin','Tunnetun välin pituus (cm)','Kopioitava arvio','Kopioi arvio','Napauta välin alku- ja loppupistettä.','Napauta ikkunan kahta vastakkaista kulmaa.','Arvioitu ikkunoiden määrä','Ikkuna','Kopioitu.','Kuvaa ei voitu avata. Valitse enintään 12 Mt:n PNG-, JPEG- tai WebP-kuva.','Valitse teksti ja kopioi se.'],
  sv:['Fönster i bilden','Markera två motsatta hörn på varje fönster. För att uppskatta mått behövs en känd längd på samma plan. Använd en bild tagen rakt framifrån.','Välj bild','Markera fönster','Markera känd längd','Ångra senaste','Känd längd (cm)','Uppskattning att kopiera','Kopiera uppskattning','Tryck på längdens start- och slutpunkt.','Tryck på två motsatta hörn av fönstret.','Uppskattat antal fönster','Fönster','Kopierat.','Bilden kunde inte öppnas. Välj PNG, JPEG eller WebP på högst 12 MB.','Markera och kopiera texten.'],
  en:['Windows in a photo','Mark opposite corners of each window. For size estimates, include a known length on the same plane. Use a straight-on photo.','Choose photo','Mark window','Mark known length','Undo last mark','Known length (cm)','Estimate to copy','Copy estimate','Tap both ends of the reference length.','Tap two opposite corners of the window.','Estimated number of windows','Window','Copied.','Could not open the photo. Choose a PNG, JPEG or WebP under 12 MB.','Select and copy the text.']
};
const lang = Object.hasOwn(labels,language) ? language : 'fi';
const copy = labels[lang];
document.documentElement.lang = lang;
document.title = copy[0] + ' | Respondo AI';
['title','intro','photo','window','reference','undo','length','results','copy'].forEach((name,index)=>{
  document.querySelector('[data-label="' + name + '"]').textContent = copy[index];
});

const byId = id => document.getElementById(id);
const canvas = byId('picture');
const context = canvas.getContext('2d');
const output = byId('results');
const marks = [];
let mode = 'window';
let first = null;
let image;
let selection = 0;

function render() {
  context.drawImage(image,0,0,canvas.width,canvas.height);
  context.lineWidth = Math.max(2,canvas.width / 350);
  for (const {kind,points:[a,b]} of marks) {
    context.strokeStyle = kind === 'reference' ? '#ffd166' : '#77f4ae';
    if (kind === 'reference') {
      context.beginPath();
      context.moveTo(a.x,a.y);
      context.lineTo(b.x,b.y);
      context.stroke();
    } else {
      context.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y);
    }
  }
  if (first) {
    context.fillStyle = '#fff';
    context.fillRect(first.x-3,first.y-3,6,6);
  }
  const windows = marks.filter(mark=>mark.kind==='window').map(mark=>mark.points);
  const reference = marks.findLast(mark=>mark.kind==='reference');
  const measures = measuredWindows(windows,reference && {...reference,centimetres:byId('length').valueAsNumber});
  output.value = [copy[11] + ': ' + windows.length,
    ...measures.flatMap((item,index)=>item ? [copy[12]+' '+(index+1)+': ~'+item.width+' × '+item.height+' cm'] : [])
  ].join('\n');
}

function selectMode(next) {
  first = null;
  mode = next;
  byId('hint').textContent = mode==='reference' ? copy[9] : copy[10];
  for (const name of ['window','reference']) byId('mark-'+name).setAttribute('aria-pressed',String(mode===name));
  render();
}

byId('photo').addEventListener('change', async event => {
  const file = event.currentTarget.files?.[0];
  if (!file) return;
  const serial = ++selection;
  byId('workspace').hidden = true;
  byId('image-status').textContent = '';
  if (!/^image\/(?:png|jpeg|webp)$/.test(file.type) || file.size > 12_000_000) {
    byId('image-status').textContent = copy[14];
    return;
  }
  const url = URL.createObjectURL(file);
  try {
    const photo = new Image();
    photo.src = url;
    await photo.decode();
    if (serial !== selection) return;
    const ratio = Math.min(1,1600 / Math.max(photo.naturalWidth,photo.naturalHeight));
    canvas.width = Math.max(1,Math.round(photo.naturalWidth * ratio));
    canvas.height = Math.max(1,Math.round(photo.naturalHeight * ratio));
    image = photo;
    marks.length = 0;
    byId('length').value = '';
    byId('workspace').hidden = false;
    selectMode('window');
  } catch {
    if (serial === selection) byId('image-status').textContent = copy[14];
  } finally {
    URL.revokeObjectURL(url);
  }
});
byId('mark-window').onclick = () => selectMode('window');
byId('mark-reference').onclick = () => selectMode('reference');
byId('length').oninput = render;
byId('undo').onclick = () => {
  if (first) first = null;
  else marks.pop();
  render();
};
canvas.addEventListener('click',event=>{
  const rect = canvas.getBoundingClientRect();
  const point = {x:(event.clientX-rect.left)*canvas.width/rect.width,y:(event.clientY-rect.top)*canvas.height/rect.height};
  if (!first) first = point;
  else {
    const valid = mode === 'reference'
      ? Math.hypot(first.x-point.x,first.y-point.y)>0
      : first.x!==point.x && first.y!==point.y;
    if (valid) marks.push({kind:mode,points:[first,point]});
    first = null;
  }
  render();
});
byId('copy').onclick = async () => {
  try {
    await navigator.clipboard.writeText(output.value);
    byId('copied').textContent = copy[13];
  } catch {
    output.select();
    byId('copied').textContent = copy[15];
  }
};
