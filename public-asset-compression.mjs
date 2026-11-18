// Encode only known public scripts/styles. Authenticated HTML/API responses and
// user-controlled data never enter this cache or its compression middleware.
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync,brotliCompressSync,constants as zlibConstants} from 'node:zlib';

const largeAssets=new Set(['/app.js','/styles.css','/native-ai-operations.js','/integration-onboarding.js']);

function acceptableQuality(header,encoding){
  const items=String(header||'').toLowerCase().split(',').map(item=>item.trim()).filter(Boolean);
  let wildcard=null;
  for(const item of items){
    const [name,...attributes]=item.split(';').map(part=>part.trim());
    const quality=attributes.find(part=>part.startsWith('q='));
    const parsed=quality===undefined?1:Number(quality.slice(2));
    const q=Number.isFinite(parsed)&&parsed>=0&&parsed<=1?parsed:0;
    if(name===encoding)return q;
    if(name==='*')wildcard=q;
  }
  return wildcard??0;
}

export function preferredAssetEncoding(header){
  const br=acceptableQuality(header,'br'),gzip=acceptableQuality(header,'gzip');
  return br>0&&br>=gzip?'br':gzip>0?'gzip':null;
}

export function createPublicAssetCompression(publicDir){
  const cache=new Map();
  return async function serveEncodedPublicAsset(req,res,next){
    if(!['GET','HEAD'].includes(req.method)||!largeAssets.has(req.path))return next();
    // The identity response and byte-range requests stay in express.static.
    res.vary('Accept-Encoding');
    const encoding=preferredAssetEncoding(req.headers['accept-encoding']);
    if(!encoding||req.headers.range||req.headers['if-range'])return next();
    try{
      const name=req.path.slice(1),file=path.join(publicDir,name),info=await stat(file);
      let item=cache.get(name);
      if(!item||item.mtimeMs!==info.mtimeMs||item.size!==info.size){
        const input=await readFile(file);
        item={mtimeMs:info.mtimeMs,size:info.size,modified:info.mtime.toUTCString(),
          br:brotliCompressSync(input,{params:{[zlibConstants.BROTLI_PARAM_QUALITY]:4}}),
          gzip:gzipSync(input,{level:6})};
        cache.set(name,item);
      }
      const body=item[encoding];
      const tag='"'+createHash('sha256').update(body).digest('hex').slice(0,32)+'"';
      res.set({
        'Content-Type':name.endsWith('.css')?'text/css; charset=utf-8':'application/javascript; charset=utf-8',
        'Content-Encoding':encoding,
        'Content-Length':String(body.length),
        'Cache-Control':'no-cache, must-revalidate',
        'Last-Modified':item.modified,
        ETag:tag,
      });
      if(req.fresh)return res.status(304).end();
      if(req.method==='HEAD')return res.status(200).end();
      return res.status(200).end(body);
    }catch(error){return next(error);}
  };
}
