// Resource-bounded document and image-text discovery for website imports.
// Network fetches remain owned by server.mjs's pinned-DNS, SSRF-safe importer.
// OCR is deliberately opt-in; it performs no data upload to an external vision API.
const MAX_PDF_BYTES=8_000_000;
const MAX_IMAGE_BYTES=3_000_000;
const MAX_TEXT=45_000;
const useful=/(?:hinnast|price[-_]?list|prices|pricing|menu|ruokalist|esitte|brochure|palvelut|services|aukiolo|opening[-_]?hours|tarjou|offer|toimitus|delivery|returns|palaut|tuote|product|ohje|guide|manual|pdf)/i;
const imageUseful=/(?:hinnast|price[-_]?list|menu|ruokalist|aukiolo|opening[-_]?hours|timetable|aikataulu|palvelu|service|size[-_]?chart|kokotauluk)/i;
function normalizedURL(value,base){
  try{
    if(typeof value!=='string' || /[<>{}"'\s]/.test(value))return '';
    const url=new URL(value.replace(/&amp;/gi,'&'),base);
    if(!['http:','https:'].includes(url.protocol)||url.username||url.password)return '';
    if(url.hostname.toLowerCase()!==new URL(base).hostname.toLowerCase())return '';
    url.hash='';
    return url.toString();
  }catch{return '';}
}
export function mediaCandidates(html,baseURL,{pdfLimit=12,imageLimit=6}={}){
  const out=[],seen=new Set();
  const add=(raw,label='')=>{
    const url=normalizedURL(raw,baseURL);
    if(!url||seen.has(url))return;
    const pathname=new URL(url).pathname;
    const pdf=/\.pdf$/i.test(pathname);
    const image=/\.(?:png|jpe?g|webp)$/i.test(pathname);
    if(!pdf&&!image)return;
    if(pdf && !useful.test(url+' '+label))return;
    if(image && !imageUseful.test(url+' '+label))return;
    const count=out.filter(x=>x.type===(pdf?'pdf':'image')).length;
    if(count>=(pdf?pdfLimit:imageLimit))return;
    seen.add(url);
    out.push({url,type:pdf?'pdf':'image',label:String(label).slice(0,180)});
  };
  // Files in same-origin links; do not interpret arbitrary resources or embeds
  // as the company's evidence.
  for(const m of String(html||'').matchAll(/<a\b([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*)>([\s\S]{0,240}?)<\/a>/gi)){
    add(m[2],m[4].replace(/<[^>]*>/g,' '));
    if(out.length>=18)break;
  }
  for(const m of String(html||'').matchAll(/<img\b[^>]*>/gi)){
    const tag=m[0];
    const src=tag.match(/\b(?:src|data-src)=["']([^"']+)["']/i)?.[1]||'';
    const alt=tag.match(/\balt=["']([^"']+)["']/i)?.[1]||'';
    add(src,alt);
    if(out.length>=18)break;
  }
  return out;
}
export function documentCandidateLimits(type){
  return type==='pdf'?{maxBytes:MAX_PDF_BYTES,timeoutMs:9000}
    :{maxBytes:MAX_IMAGE_BYTES,timeoutMs:6000};
}
export async function mediaTextFromBytes(bytes,type,{ocrEnabled=false}={}){
  if(!Buffer.isBuffer(bytes) || bytes.length<16)return '';
  if(type==='pdf'){
    if(bytes.length>MAX_PDF_BYTES || !bytes.subarray(0,8).toString('latin1').includes('%PDF-'))return '';
    let parser;
    try{
      const {PDFParse}=await import('pdf-parse');
      parser=new PDFParse({data:new Uint8Array(bytes)});
      const result=await parser.getText({first:1,last:18});
      return String(result?.text||'').replace(/\u0000/g,' ').slice(0,MAX_TEXT);
    }catch{return '';}
    finally{await parser?.destroy?.().catch(()=>{});}
  }
  // OCR is an explicitly enabled, single-image, CPU-bounded optional adapter.
  // The language packs can require a first-time download; never fetch them
  // from untrusted merchant servers or run OCR on arbitrary page images.
  if(type==='image' && ocrEnabled && bytes.length<=MAX_IMAGE_BYTES){
    let worker;
    try{
      const {createWorker}=await import('tesseract.js');
      worker=await createWorker('fin+eng+swe',1,{cacheMethod:'readOnly'});
      const result=await worker.recognize(bytes);
      const confidence=Number(result?.data?.confidence||0);
      if(confidence<55)return '';
      return String(result?.data?.text||'').slice(0,MAX_TEXT);
    }catch{return '';}
    finally{await worker?.terminate?.().catch(()=>{});}
  }
  return '';
}
function escape(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function documentAsPage(text,url,type='pdf'){
  // Reuse the business extraction pathway rather than importing raw OCR noise.
  // Preserve line boundaries so service-price and hours rows remain paired.
  const lines=String(text||'').split(/\r?\n/g).map(x=>x.replace(/\s+/g,' ').trim())
    .filter(x=>x.length>=3&&x.length<=600)
    .filter(x=>!/(?:cookies?|eväste|cookie consent|javascript is required)/i.test(x))
    .slice(0,450);
  if(lines.length<2)return null;
  const path=new URL(url).pathname.toLowerCase();
  const heading=/(?:price|hinna|pricing)/.test(path)?'Hinnasto':
    /(?:menu|ruokalist)/.test(path)?'Ruokalista':
    /(?:opening|aukiolo)/.test(path)?'Aukioloajat':'Yrityksen tiedot';
  const html='<section><h2>'+heading+'</h2>'+lines.map(line=>'<p>'+escape(line)+'</p>').join('')+'</section>';
  return {html,lines,kind:type,sourceUrl:url};
}
export function importCoverage({pages=[],media=[],candidates=[],attempted=0,failed=0,skipped=0}={}){
  const categories=new Set((candidates||[]).map(x=>String(x?.category||'')).filter(Boolean));
  const count=(category)=>[...categories].includes(category);
  const groups={
    services:count('Palvelut'),prices:count('Hinnat'),
    contacts:count('Yhteystiedot'),hours:count('Aukioloajat'),
    locations:count('Sijainti ja myymälät'),products:count('Tuotteet'),
    bookings:count('Ajanvaraus'),serviceAreas:count('Toimialue'),
  };
  return {
    pagesScanned:pages.length,documentFilesRead:media.filter(x=>x.type==='pdf'&&x.ok).length,
    imagesRead:media.filter(x=>x.type==='image'&&x.ok).length,
    documentFailures:failed,documentSkipped:skipped,
    documentsDiscovered:attempted,
    knowledgeFacts:candidates.length,found:groups,
    // Missing means "not found in this scan", not "business does not offer it".
    notVerified:Object.entries(groups).filter(([,found])=>!found).map(([key])=>key),
    partial:failed>0||skipped>0,
  };
}
