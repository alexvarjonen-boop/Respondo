// First-party visitor photo intake. Never treat a photo or its OCR as proof of
// damage, identity, price, product compatibility or an approved business fact.
import crypto from 'node:crypto';

const MAX_BYTES=1_800_000;
const MAX_DIMENSION=3000;
const MAX_PIXELS=6_000_000;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jpegDimensions(bytes){
  if(bytes.length<12||bytes[0]!==0xff||bytes[1]!==0xd8)return null;
  let cursor=2;
  while(cursor+9<bytes.length){
    if(bytes[cursor++]!==0xff)return null;
    while(bytes[cursor]===0xff)cursor++;
    const marker=bytes[cursor++];
    if(marker===0xda||marker===0xd9)break;
    if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
    if(cursor+2>bytes.length)return null;
    const size=bytes.readUInt16BE(cursor);
    if(size<2||cursor+size>bytes.length)return null;
    if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){
      if(size<7)return null;
      return {height:bytes.readUInt16BE(cursor+3),width:bytes.readUInt16BE(cursor+5)};
    }
    cursor+=size;
  }
  return null;
}
function webpDimensions(bytes){
  if(bytes.length<30||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')return null;
  const kind=bytes.toString('ascii',12,16);
  if(kind==='VP8X')return {width:bytes.readUIntLE(24,3)+1,height:bytes.readUIntLE(27,3)+1};
  if(kind==='VP8 '&&bytes[23]===0x9d&&bytes[24]===0x01&&bytes[25]===0x2a)
    return {width:bytes.readUInt16LE(26)&0x3fff,height:bytes.readUInt16LE(28)&0x3fff};
  if(kind==='VP8L'&&bytes[20]===0x2f)return {
    width:1+(((bytes[22]&0x3f)<<8)|bytes[21]),
    height:1+(((bytes[24]&0x0f)<<10)|(bytes[23]<<2)|(bytes[22]>>6))
  };
  return null;
}
export function decodeVisitorPhoto(dataUrl){
  if(typeof dataUrl!=='string'||dataUrl.length>MAX_BYTES*1.38+100)
    throw new RangeError('Image exceeds upload size limit');
  const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if(!match)throw new TypeError('Only PNG, JPEG and WebP images are supported');
  const bytes=Buffer.from(match[2],'base64');
  if(bytes.length<32||bytes.length>MAX_BYTES||bytes.toString('base64')!==match[2])
    throw new RangeError('Invalid image encoding or size');
  let dimensions=null;
  if(match[1]==='png'&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))
    dimensions={width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
  if(match[1]==='jpeg'&&bytes[bytes.length-2]===255&&bytes[bytes.length-1]===217)
    dimensions=jpegDimensions(bytes);
  if(match[1]==='webp')dimensions=webpDimensions(bytes);
  if(!dimensions||!dimensions.width||!dimensions.height||
     dimensions.width>MAX_DIMENSION||dimensions.height>MAX_DIMENSION||
     dimensions.width*dimensions.height>MAX_PIXELS)
    throw new TypeError('Image is malformed or too large to process safely');
  return {bytes,mimeType:'image/'+match[1],width:dimensions.width,
    height:dimensions.height,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
}
export function visitorPhotoMessage(lang,{ocrText='',reviewQueued=false}={}){
  const language=['fi','sv','en'].includes(lang)?lang:'fi';
  const found=String(ocrText||'').replace(/[\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim().slice(0,280);
  const note=language==='sv'
    ? 'Jag kan inte säkert identifiera föremål, fel eller skador i bilden. Företaget behöver granska den.'
    :language==='en'
      ? 'I cannot reliably identify objects, defects or damage in this image. A person at the company needs to review it.'
      : 'En pysty tunnistamaan kuvasta esineitä, vikoja tai vaurioita luotettavasti. Yrityksen henkilön on tarkistettava kuva.';
  const receipt=language==='sv'?'Bilden har tagits emot.':
    language==='en'?'Your photo was received.':'Kuva vastaanotettiin.';
  const text=found?(language==='sv'?'Möjlig text i bilden: ':
    language==='en'?'Possible text in the image: ':'Kuvasta mahdollisesti luettua tekstiä: ')+found+'. ':'';
  const queued=reviewQueued?(language==='sv'?'En granskningsuppgift har skapats.':
    language==='en'?'A review task was created.':'Tarkistustehtävä luotiin.'):'';
  return [receipt,text,note,queued].filter(Boolean).join(' ');
}
export function validPhotoId(id){return UUID.test(String(id||''));}
export async function ensureVisitorPhotoSchema(db){
  await db.query(`CREATE TABLE IF NOT EXISTS public.respondo_visitor_photos(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    visitor_ref TEXT NOT NULL,
    mime_type TEXT NOT NULL CHECK(mime_type IN ('image/png','image/jpeg','image/webp')),
    photo_bytes BYTEA NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    question TEXT NOT NULL DEFAULT '',
    ocr_text TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW()+INTERVAL '7 days')
  )`);
  await db.query('CREATE INDEX IF NOT EXISTS idx_respondo_photos_tenant ON public.respondo_visitor_photos(tenant_id,created_at DESC)');
  await db.query('ALTER TABLE public.respondo_visitor_photos ENABLE ROW LEVEL SECURITY');
  await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_visitor_photos FROM PUBLIC');
  const roles=await db.query("SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])",[['anon','authenticated','service_role']]);
  for(const item of roles.rows||[])if(['anon','authenticated','service_role'].includes(item.rolname))
    await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_visitor_photos FROM '+item.rolname);
}
export async function saveVisitorPhoto(db,{tenantId,visitorRef,photo,question='',ocrText=''}){
  if(!validPhotoId(tenantId)||!photo?.bytes||!visitorRef||visitorRef.length>160)
    throw new TypeError('Invalid tenant or visitor photo');
  // Opportunistic expiry cleanup. Bytes never leave the Respondo database.
  await db.query('DELETE FROM public.respondo_visitor_photos WHERE expires_at<NOW()');
  const recent=await db.query(`SELECT COUNT(*)::int AS n FROM public.respondo_visitor_photos
    WHERE tenant_id=$1 AND visitor_ref=$2 AND created_at>NOW()-INTERVAL '24 hours'`,[tenantId,visitorRef]);
  if(Number(recent.rows[0]?.n||0)>=6)throw new RangeError('Photo limit reached for this conversation');
  const result=await db.query(`INSERT INTO public.respondo_visitor_photos
    (tenant_id,visitor_ref,mime_type,photo_bytes,width,height,question,ocr_text)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [tenantId,visitorRef,photo.mimeType,photo.bytes,photo.width,photo.height,
      String(question).slice(0,600),String(ocrText).slice(0,1200)]);
  return result.rows[0].id;
}
