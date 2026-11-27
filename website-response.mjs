import { gunzip, inflate, brotliDecompress } from 'node:zlib';
import { promisify } from 'node:util';

const decoders={gzip:promisify(gunzip), 'x-gzip':promisify(gunzip), deflate:promisify(inflate), br:promisify(brotliDecompress)};

// Both compressed and expanded byte counts are bounded. Never execute remote
// content and never send it to an external decoder.
export async function decodeWebsiteResponse(input,{contentType='',contentEncoding='',gzipFile=false,maxBytes=2_000_000}={}){
  let body=Buffer.isBuffer(input)?input:Buffer.from(input);
  if(body.length>maxBytes) throw new Error('Verkkosivu on liian suuri automaattiseen tuontiin.');
  const enc=String(contentEncoding).trim().toLowerCase();
  if(enc&&enc!=='identity'){
    const decode=decoders[enc];
    if(!Object.hasOwn(decoders,enc)||!decode) throw new Error('Verkkosivun sisältöä ei voitu lukea.');
    body=await decode(body,{maxOutputLength:maxBytes});
  }
  if(gzipFile&&body[0]===0x1f&&body[1]===0x8b) body=await decoders.gzip(body,{maxOutputLength:maxBytes});
  if(body.length>maxBytes) throw new Error('Verkkosivu on liian suuri automaattiseen tuontiin.');
  const prefix=body.subarray(0,4096).toString('latin1');
  const declared=String(contentType).match(/charset\s*=\s*["']?([\w-]+)/i)?.[1];
  const embedded=prefix.match(/<meta\b[^>]*\bcharset\s*=\s*["']?([\w-]+)/i)?.[1]||prefix.match(/<\?xml\b[^>]*\bencoding\s*=\s*["']([\w-]+)/i)?.[1];
  const bom=body[0]===0xff&&body[1]===0xfe?'utf-16le':body[0]===0xfe&&body[1]===0xff?'utf-16be':body[0]===0xef&&body[1]===0xbb&&body[2]===0xbf?'utf-8':'';
  const charset=(bom||declared||embedded||'utf-8').toLowerCase();
  if(/^(?:windows-1252|cp1252|iso-8859-1|latin1|latin-1)$/.test(charset)){
    const map='€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008dŽ\u008f\u0090‘’“”•–—˜™š›œ\u009džŸ';
    return body.toString('latin1').replace(/[\x80-\x9f]/g,c=>map[c.charCodeAt(0)-128]);
  }
  try{return new TextDecoder(charset).decode(body);}catch{return new TextDecoder('utf-8').decode(body);}
}
