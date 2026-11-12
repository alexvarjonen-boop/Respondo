// Compare only explicitly named, approved products belonging to the active tenant.
// Neither a client URL nor inferred specifications can create catalog evidence.
const intent=/(?:\bcompare\b|\bcomparison\b|\bversus\b|\bvs\.?\b|\bdifference(?:s)? between\b|vertaa|vertail|ero(?:ja|a|t)?\s+(?:näi|kahden|tuot)|jämför|jämförel|skillnad(?:en|er)?\s+mellan|\beller\b.+\beller\b)/i;
const normalize=v=>String(v||'').normalize('NFKC').toLocaleLowerCase('fi')
  .replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
const money=(value,currency)=>Number.isFinite(value)?value.toLocaleString('fi-FI',{maximumFractionDigits:2})+' '+(currency||'€'):'';
const shorten=(value,max=95)=>String(value||'').replace(/[<>\x00-\x1f]/g,' ').trim().slice(0,max);

export function compareApprovedProducts(rows,message,lang='fi',parseProduct){
  const question=String(message||'').slice(0,1200);
  if(!intent.test(question)||typeof parseProduct!=='function'||!Array.isArray(rows))return null;
  const query=normalize(question);
  const matches=[];
  for(const row of rows){
    if(row?.approved!==true||!row.id)continue;
    const product=parseProduct(row);
    if(!product?.name||!product.url)continue;
    const name=normalize(product.name);
    // Require the whole approved catalog name, not a guessed product keyword.
    if(name.length<4||!(' '+query+' ').includes(' '+name+' '))continue;
    if(matches.some(p=>normalize(p.product.name)===name))continue;
    matches.push({row,product,name});
  }
  if(matches.length<2)return null;
  matches.sort((a,b)=>b.name.length-a.name.length);
  // Overlapping names (e.g. "iPhone 15" inside "iPhone 15 Pro")
  // count as separate items only when explicitly present independently.
  const chosen=[];
  let remaining=' '+query+' ';
  for(const item of matches){
    const needle=' '+item.name+' ';
    if(!remaining.includes(needle))continue;
    chosen.push(item);
    remaining=remaining.replace(needle,' ');
    if(chosen.length>=3)break;
  }
  if(chosen.length<2)return null;
  const language=['fi','sv','en'].includes(lang)?lang:'fi';
  const labels=language==='sv'?{price:'Pris',brand:'Märke',size:'Storlekar',color:'Färger',
    material:'Material',spec:'Egenskaper',note:'Kontrollera aktuella priser och tillgänglighet i webbutiken.'}:
    language==='en'?{price:'Price',brand:'Brand',size:'Sizes',color:'Colors',
      material:'Materials',spec:'Specifications',note:'Check current prices and availability in the store.'}:
      {price:'Hinta',brand:'Merkki',size:'Koot',color:'Värit',
        material:'Materiaalit',spec:'Tuotetiedot',note:'Tarkista ajantasaiset hinnat ja saatavuus verkkokaupasta.'};
  const lines=chosen.map(({product},index)=>{
    const fields=[];
    if(Number.isFinite(product.price))fields.push(labels.price+': '+money(product.price,product.currency));
    if(product.brand)fields.push(labels.brand+': '+shorten(product.brand));
    if(product.sizes?.length)fields.push(labels.size+': '+product.sizes.slice(0,5).map(x=>shorten(x,35)).join(', '));
    if(product.colors?.length)fields.push(labels.color+': '+product.colors.slice(0,5).map(x=>shorten(x,35)).join(', '));
    if(product.materials?.length)fields.push(labels.material+': '+product.materials.slice(0,4).map(x=>shorten(x,35)).join(', '));
    if(product.specs?.length)fields.push(labels.spec+': '+product.specs.slice(0,3).map(x=>shorten(x.name,30)+': '+shorten(x.value,45)).join('; '));
    return (index+1)+'. '+shorten(product.name,110)+(fields.length?' — '+fields.join(' · '):'')+'\n'+product.url;
  });
  return {answer:lines.join('\n\n')+'\n\n'+labels.note,handoff:false,
    confidence:0.93,intent:'Verified product comparison',
    sourceIds:chosen.map(item=>item.row.id),selected:chosen.map(item=>item.row),
    compareCount:chosen.length};
}
