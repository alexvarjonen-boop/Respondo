// Respondo's internal records are intentionally separate from customer workspaces,
// the public bot knowledge base, and Supabase's exposed public schema.
import crypto from 'node:crypto';
import path from 'node:path';
import express from 'express';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 250 * 1024 * 1024;
export const VAULT_CATEGORIES = Object.freeze([
  'Yrityksen tiedot', 'Sopimukset', 'Asiakkaat', 'Talous',
  'Tuote ja kehitys', 'Tietoturva', 'Henkilöstö', 'Markkinointi', 'Muut',
]);
const SAFE_EXTENSIONS = new Set(['pdf','txt','csv','png','jpg','jpeg','docx','xlsx','pptx','odt','ods']);

export function vaultPermission(role, operation, classification = 'team') {
  // Never grant internal records access to customers, staff agents or other users.
  // Only the configured Respondo owner's database-verified identity may proceed.
  return role === 'owner' && ['read','write','admin'].includes(operation);
}

export function normalizeVaultName(value, max = 160) {
  const result = String(value ?? '').trim().replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ');
  if (!result || result.length > max) throw Object.assign(new Error('Tarkista nimi tai otsikko.'), { status:400 });
  return result;
}

export function safeVaultFilename(value) {
  const leaf=String(value || '').replace(/\\/g,'/').split('/').at(-1);
  const name = normalizeVaultName(leaf, 180).replace(/[\\/<>:"|?*]/g, '_').replace(/^\.+/, '');
  const extension = name.split('.').at(-1)?.toLowerCase();
  if (!extension || !SAFE_EXTENSIONS.has(extension)) throw Object.assign(new Error('Tiedostotyyppi ei ole sallittu.'), { status:400 });
  return name;
}

export async function ensureInternalVaultSchema(q) {
  await q('CREATE SCHEMA IF NOT EXISTS respondo_internal');
  await q('REVOKE ALL ON SCHEMA respondo_internal FROM PUBLIC');
  await q('REVOKE ALL ON SCHEMA respondo_internal FROM anon, authenticated, service_role');
  await q(`CREATE TABLE IF NOT EXISTS respondo_internal.vault_documents (
    id UUID PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('note','file')),
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    classification TEXT NOT NULL DEFAULT 'team' CHECK (classification IN ('team','restricted')),
    current_version INTEGER NOT NULL DEFAULT 1 CHECK (current_version >= 1),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_vault_documents_directory ON respondo_internal.vault_documents(category, updated_at DESC)');
  await q(`CREATE TABLE IF NOT EXISTS respondo_internal.vault_versions (
    document_id UUID NOT NULL REFERENCES respondo_internal.vault_documents(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    note_body TEXT,
    file_name TEXT,
    mime_type TEXT,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    sha256 TEXT NOT NULL,
    file_bytes BYTEA,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(document_id,version)
  )`);
  await q(`CREATE TABLE IF NOT EXISTS respondo_internal.vault_audit (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    document_id UUID,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await q('CREATE INDEX IF NOT EXISTS idx_vault_audit_created ON respondo_internal.vault_audit(created_at DESC)');
  for (const table of ['vault_documents','vault_versions','vault_audit']) {
    await q(`ALTER TABLE respondo_internal.${table} ENABLE ROW LEVEL SECURITY`);
    await q(`REVOKE ALL ON respondo_internal.${table} FROM PUBLIC, anon, authenticated, service_role`);
  }
}

export function installInternalVaultRoutes(app, { auth, q, pool, ownerEmail, privateDir }) {
  const email = (s) => String(s || '').trim().toLowerCase();
  const owner = () => email(ownerEmail());
  const wrap = (fn) => async (req,res) => {
    try { await fn(req,res); }
    catch (error) {
      if (!error?.status || error.status >= 500) console.error('Internal vault request failed', error);
      if (!res.headersSent) res.status(error?.status || 500).json({error:error?.status ? error.message : 'Arkiston käsittely epäonnistui.'});
    }
  };
  const fail = (message, status=400) => { throw Object.assign(new Error(message), {status}); };
  const guid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value||''));
  const uuid = (value) => guid(value) ? value : fail('Virheellinen tunniste.');
  const classification = (value) => {
    if (value === undefined || value === null || value === '') return 'team';
    if (value !== 'team' && value !== 'restricted') fail('Virheellinen salassapitotaso.');
    return value;
  };
  const category = (value) => VAULT_CATEGORIES.includes(value) ? value : fail('Valitse sallittu kansio.');
  const description = (value) => String(value || '').trim().slice(0,1000);
  const sha = (data) => crypto.createHash('sha256').update(data).digest('hex');
  const audit = (run, actor, action, docId=null, details={}) => run(
    'INSERT INTO respondo_internal.vault_audit(actor_id,action,document_id,details) VALUES($1,$2,$3,$4::jsonb)',
    [actor,action,docId,JSON.stringify(details)]
  );
  const tx = async (fn) => {
    const client = await pool.connect();
    try { await client.query('BEGIN'); const result = await fn(client.query.bind(client)); await client.query('COMMIT'); return result; }
    catch(error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  };

  const permitted = async(req,res,next) => {
    if (req.user?.role === 'agent' || !req.user?.sub) return res.status(403).json({error:'Pääsy arkistoon on estetty.'});
    try {
      const result=await q('SELECT id,email,status FROM public.users WHERE id=$1',[req.user.sub]);
      const person=result.rows[0];
      if (!person || person.status !== 'active') return res.status(403).json({error:'Pääsy arkistoon on estetty.'});
      if (!owner() || email(person.email) !== owner()) return res.status(403).json({error:'Pääsy arkistoon on estetty.'});
      req.vaultRole='owner';req.vaultUserId=person.id;
      return next();
    } catch(e) { console.error('Vault authorization failed',e); return res.status(503).json({error:'Arkiston käyttöoikeuksia ei voida tarkistaa.'}); }
  };
  const mayWrite = (req) => vaultPermission(req.vaultRole,'write') || fail('Vain muokkaaja voi tehdä tämän.',403);
  const maySee = (req, item) => vaultPermission(req.vaultRole,'read',item.classification) || fail('Ei käyttöoikeutta.',403);
  const mayChange = (req, item) => {
    mayWrite(req);maySee(req,item);
    if (item.classification === 'restricted' && !vaultPermission(req.vaultRole,'admin')) fail('Vain ylläpitäjä voi muuttaa rajattuja asiakirjoja.',403);
  };
  const checkClass = (req,value) => {
    const level=classification(value);
    if (level==='restricted' && !vaultPermission(req.vaultRole,'admin')) fail('Vain ylläpitäjä voi luoda rajattuja asiakirjoja.',403);
    return level;
  };
  const documentById = async (run,id) => {
    const row=await run('SELECT * FROM respondo_internal.vault_documents WHERE id=$1',[uuid(id)]);
    if (!row.rowCount) fail('Asiakirjaa ei löydy.',404);
    return row.rows[0];
  };
  const root = '/api/app/internal-vault';
  app.get('/arkisto',auth,permitted,(req,res)=>{
    res.setHeader('Cache-Control','private, no-store');
    res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
    res.sendFile(path.join(privateDir,'vault.html'));
  });
  app.get(root+'/session',auth,permitted,wrap(async(req,res)=>{
    const summary=await q(`SELECT COUNT(*)::int AS documents, COUNT(*) FILTER (WHERE kind='file')::int AS files,
      COALESCE(SUM(CASE WHEN kind='file' THEN v.size_bytes ELSE 0 END),0)::bigint AS bytes
      FROM respondo_internal.vault_documents d
      JOIN respondo_internal.vault_versions v ON v.document_id=d.id AND v.version=d.current_version
      WHERE d.deleted_at IS NULL AND (d.classification='team' OR $1::boolean)`,[vaultPermission(req.vaultRole,'admin')]);
    res.setHeader('Cache-Control','no-store');
    res.json({role:req.vaultRole,categories:VAULT_CATEGORIES,summary:summary.rows[0]});
  }));
  app.get(root+'/documents',auth,permitted,wrap(async(req,res)=>{
    const term=String(req.query.q||'').trim().slice(0,120);
    const selected=String(req.query.category||'');
    if (selected && !VAULT_CATEGORIES.includes(selected)) fail('Tuntematon kansio.');
    const trash=req.query.trash==='1';
    const rows=await q(`SELECT d.id,d.kind,d.category,d.title,d.description,d.classification,
         d.current_version,d.created_at,d.updated_at,d.deleted_at,u.full_name AS updated_by,
         v.file_name,v.mime_type,v.size_bytes
       FROM respondo_internal.vault_documents d
       LEFT JOIN public.users u ON u.id=d.updated_by
       JOIN respondo_internal.vault_versions v ON v.document_id=d.id AND v.version=d.current_version
       WHERE ${trash?'d.deleted_at IS NOT NULL':'d.deleted_at IS NULL'}
         AND (d.classification='team' OR $1::boolean)
         AND ($2::text='' OR d.category=$2)
         AND ($3::text='' OR d.title ILIKE '%'||$3||'%' OR d.description ILIKE '%'||$3||'%')
       ORDER BY d.updated_at DESC LIMIT 250`,[vaultPermission(req.vaultRole,'admin'),selected,term]);
    res.setHeader('Cache-Control','no-store');
    res.json({documents:rows.rows});
  }));
  app.get(root+'/documents/:id',auth,permitted,wrap(async(req,res)=>{
    const doc=await documentById(q,req.params.id);maySee(req,doc);
    if (doc.deleted_at) fail('Asiakirja on roskakorissa.',404);
    const version=await q(`SELECT version,note_body,file_name,mime_type,size_bytes,sha256,created_at
      FROM respondo_internal.vault_versions WHERE document_id=$1 AND version=$2`,[doc.id,doc.current_version]);
    await audit(q,req.vaultUserId,'view',doc.id);
    res.setHeader('Cache-Control','no-store');
    res.json({document:{...doc, ...version.rows[0]}});
  }));
  app.get(root+'/documents/:id/history',auth,permitted,wrap(async(req,res)=>{
    const doc=await documentById(q,req.params.id);maySee(req,doc);
    if (doc.deleted_at) fail('Asiakirja on roskakorissa.',404);
    const versions=await q(`SELECT v.version,v.file_name,v.mime_type,v.size_bytes,v.sha256,v.created_at,u.full_name AS created_by
      FROM respondo_internal.vault_versions v LEFT JOIN public.users u ON u.id=v.created_by
      WHERE v.document_id=$1 ORDER BY v.version DESC`,[doc.id]);
    res.setHeader('Cache-Control','no-store');res.json({versions:versions.rows});
  }));
  app.get(root+'/documents/:id/versions/:version',auth,permitted,wrap(async(req,res)=>{
    const doc=await documentById(q,req.params.id);maySee(req,doc);
    if(doc.deleted_at || doc.kind!=='note') fail('Asiakirjaa ei löydy.',404);
    const version=Number(req.params.version);
    if(!Number.isSafeInteger(version) || version<1 || version>doc.current_version) fail('Virheellinen versio.');
    const found=await q(`SELECT version,note_body,sha256,created_at FROM respondo_internal.vault_versions
      WHERE document_id=$1 AND version=$2`,[doc.id,version]);
    if(!found.rowCount) fail('Versiota ei löydy.',404);
    await audit(q,req.vaultUserId,'view_version',doc.id,{version});
    res.setHeader('Cache-Control','no-store');res.json({version:found.rows[0]});
  }));
  app.get(root+'/documents/:id/download',auth,permitted,wrap(async(req,res)=>{
    const doc=await documentById(q,req.params.id);maySee(req,doc);
    if(doc.deleted_at || doc.kind!=='file') fail('Tiedostoa ei löydy.',404);
    const n=req.query.version === undefined ? doc.current_version : Number(req.query.version);
    if(!Number.isSafeInteger(n)||n<1||n>doc.current_version) fail('Virheellinen versio.');
    const result=await q(`SELECT file_name,size_bytes,sha256,file_bytes FROM respondo_internal.vault_versions
      WHERE document_id=$1 AND version=$2`,[doc.id,n]);
    if (!result.rowCount || !Buffer.isBuffer(result.rows[0].file_bytes)) fail('Tiedostoa ei löydy.',404);
    const file=result.rows[0];
    await audit(q,req.vaultUserId,'download',doc.id,{version:n});
    res.setHeader('Cache-Control','private, no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Security-Policy','sandbox');
    res.setHeader('Content-Disposition',`attachment; filename="document"; filename*=UTF-8''${encodeURIComponent(file.file_name)}`);
    res.setHeader('Content-Type','application/octet-stream');
    res.setHeader('Content-Length',file.file_bytes.length);
    return res.send(file.file_bytes);
  }));
  app.post(root+'/documents',auth,permitted,wrap(async(req,res)=>{
    mayWrite(req);
    const title=normalizeVaultName(req.body?.title);
    const group=category(req.body?.category);
    const level=checkClass(req,req.body?.classification);
    const body=String(req.body?.body||'').trim();
    if(!body || body.length>100000) fail('Muistiinpanon pituus on 1–100 000 merkkiä.');
    const id=crypto.randomUUID();
    await tx(async(run)=>{
      await run(`INSERT INTO respondo_internal.vault_documents(id,kind,category,title,description,classification,created_by,updated_by)
        VALUES($1,'note',$2,$3,$4,$5,$6,$6)`,[id,group,title,description(req.body?.description),level,req.vaultUserId]);
      await run(`INSERT INTO respondo_internal.vault_versions(document_id,version,note_body,sha256,created_by)
        VALUES($1,1,$2,$3,$4)`,[id,body,sha(body),req.vaultUserId]);
      await audit(run,req.vaultUserId,'create_note',id,{classification:level});
    });
    res.status(201).json({id});
  }));
  app.put(root+'/documents/:id',auth,permitted,wrap(async(req,res)=>{
    mayWrite(req);
    const doc=await documentById(q,req.params.id);mayChange(req,doc);
    if(doc.deleted_at||doc.kind!=='note') fail('Muistiinpanoa ei löydy.',404);
    const version=Number(req.body?.expectedVersion);
    if(!Number.isSafeInteger(version)||version<1) fail('Versio puuttuu.');
    const title=normalizeVaultName(req.body?.title),group=category(req.body?.category);
    const level=checkClass(req,req.body?.classification);
    const body=String(req.body?.body||'').trim();
    if(!body || body.length>100000) fail('Muistiinpanon pituus on 1–100 000 merkkiä.');
    await tx(async(run)=>{
      const result=await run(`UPDATE respondo_internal.vault_documents
        SET title=$1,category=$2,description=$3,classification=$4,current_version=current_version+1,
        updated_by=$5,updated_at=NOW()
        WHERE id=$6 AND current_version=$7 AND deleted_at IS NULL RETURNING current_version`,
        [title,group,description(req.body?.description),level,req.vaultUserId,doc.id,version]);
      if(!result.rowCount) fail('Asiakirjaa on muokattu toisessa istunnossa. Päivitä sivu.',409);
      await run(`INSERT INTO respondo_internal.vault_versions(document_id,version,note_body,sha256,created_by)
        VALUES($1,$2,$3,$4,$5)`,[doc.id,result.rows[0].current_version,body,sha(body),req.vaultUserId]);
      await audit(run,req.vaultUserId,'update_note',doc.id,{version:result.rows[0].current_version});
    });
    res.json({ok:true});
  }));

  const receiveFile = async(req,res,existing=null) => {
    mayWrite(req);
    if(!Buffer.isBuffer(req.body)||!req.body.length) fail('Valitse tiedosto.');
    if(req.body.length>MAX_FILE_BYTES) fail('Tiedoston enimmäiskoko on 5 Mt.',413);
    const fileName=safeVaultFilename(decodeURIComponent(String(req.get('x-vault-filename')||'')));
    const mime=String(req.get('x-vault-mime')||'application/octet-stream').slice(0,100);
    const title=normalizeVaultName(decodeURIComponent(String(req.get('x-vault-title')||fileName)));
    const group=category(decodeURIComponent(String(req.get('x-vault-category')||'')));
    const level=checkClass(req,String(req.get('x-vault-classification')||'team'));
    const id=existing?.id||crypto.randomUUID();
    if(existing) {
      mayChange(req,existing);
      if(existing.deleted_at||existing.kind!=='file') fail('Tiedostoa ei löydy.',404);
      if (String(req.get('x-vault-version')||'') !== String(existing.current_version)) fail('Tiedosto on jo päivitetty. Lataa sivu.',409);
    }
    await tx(async(run)=>{
      await run("SELECT pg_advisory_xact_lock(hashtext('respondo_vault_storage_quota'))");
      const used=await run(`SELECT COALESCE(SUM(size_bytes),0)::bigint AS bytes FROM respondo_internal.vault_versions`);
      if(Number(used.rows[0].bytes)+req.body.length>MAX_TOTAL_BYTES) fail('Arkiston tallennustila on täynnä.',413);
      if(existing) {
        const changed=await run(`UPDATE respondo_internal.vault_documents
          SET title=$1,category=$2,classification=$3,current_version=current_version+1,updated_at=NOW(),updated_by=$4
          WHERE id=$5 AND current_version=$6 AND deleted_at IS NULL RETURNING current_version`,
          [title,group,level,req.vaultUserId,id,existing.current_version]);
        if(!changed.rowCount) fail('Tiedostoa on päivitetty toisessa istunnossa.',409);
      } else {
        await run(`INSERT INTO respondo_internal.vault_documents(id,kind,category,title,classification,created_by,updated_by)
          VALUES($1,'file',$2,$3,$4,$5,$5)`,[id,group,title,level,req.vaultUserId]);
      }
      await run(`INSERT INTO respondo_internal.vault_versions(document_id,version,file_name,mime_type,size_bytes,sha256,file_bytes,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[id,existing?existing.current_version+1:1,fileName,mime,req.body.length,sha(req.body),req.body,req.vaultUserId]);
      await audit(run,req.vaultUserId,existing?'replace_file':'upload_file',id,{size:req.body.length});
    });
    res.status(existing?200:201).json({id});
  };
  const fileParser=express.raw({type:'application/octet-stream',limit:MAX_FILE_BYTES});
  app.post(root+'/files',auth,permitted,fileParser,wrap(async(req,res)=>receiveFile(req,res)));
  app.post(root+'/files/:id/versions',auth,permitted,fileParser,wrap(async(req,res)=>receiveFile(req,res,await documentById(q,req.params.id))));
  app.delete(root+'/documents/:id',auth,permitted,wrap(async(req,res)=>{
    const doc=await documentById(q,req.params.id);mayChange(req,doc);
    if(doc.deleted_at) fail('Asiakirja on jo roskakorissa.',409);
    await tx(async(run)=>{
      await run('UPDATE respondo_internal.vault_documents SET deleted_at=NOW(),updated_at=NOW(),updated_by=$2 WHERE id=$1',[doc.id,req.vaultUserId]);
      await audit(run,req.vaultUserId,'archive',doc.id);
    });
    res.json({ok:true});
  }));
  app.post(root+'/documents/:id/restore',auth,permitted,wrap(async(req,res)=>{
    if(!vaultPermission(req.vaultRole,'admin')) fail('Vain ylläpitäjä voi palauttaa asiakirjan.',403);
    const doc=await documentById(q,req.params.id);maySee(req,doc);
    await tx(async(run)=>{
      await run('UPDATE respondo_internal.vault_documents SET deleted_at=NULL,updated_at=NOW(),updated_by=$2 WHERE id=$1',[doc.id,req.vaultUserId]);
      await audit(run,req.vaultUserId,'restore',doc.id);
    });
    res.json({ok:true});
  }));
  app.get(root+'/audit',auth,permitted,wrap(async(req,res)=>{
    if(!vaultPermission(req.vaultRole,'admin')) fail('Ei käyttöoikeutta.',403);
    const events=await q(`SELECT a.id,a.action,a.document_id,a.details,a.created_at,COALESCE(u.email,'—') AS actor
      FROM respondo_internal.vault_audit a LEFT JOIN public.users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 200`);
    res.setHeader('Cache-Control','no-store');res.json({events:events.rows});
  }));
  app.get(root+'/companies',auth,permitted,wrap(async(req,res)=>{
    if(!vaultPermission(req.vaultRole,'admin')) fail('Ei käyttöoikeutta.',403);
    const result=await q(`SELECT t.id,t.name,t.website,t.subscription_plan,t.subscription_status,
      t.created_at,t.contact_email,u.email AS account_email FROM public.tenants t
      JOIN public.users u ON u.id=t.owner_user_id WHERE t.active=true ORDER BY t.created_at DESC LIMIT 250`);
    res.setHeader('Cache-Control','no-store');res.json({companies:result.rows});
  }));
}
