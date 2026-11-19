// The UI never decides access: every API request is authorized server-side.
(() => {
  'use strict';
  const API='/api/app/internal-vault';
  const dictionary={
    en:{restrictedSpace:'Authorized personnel only',workspace:'WORKSPACE',allDocs:'All documents',companies:'Customer companies',folders:'FOLDERS',trash:'Trash',activity:'Activity log',access:'Access management',secureAccount:'Protected account',back:'Back to Respondo',archive:'Internal Records',private:'PRIVATE',intro:'Your company’s documents, information and decisions. One secure place.',upload:'Upload file',newNote:'New document',documents:'DOCUMENTS',files:'FILES',storage:'STORAGE',docsHint:'Notes and files',filesHint:'Uploaded files',storageHint:'Current versions',listHint:'Only authorized team members can see this information.',allFolders:'All folders',loading:'Loading records...',search:'Search documents...',securityFooter:'Access is checked on the server for every action. Downloads and changes are logged.',empty:'Nothing here yet',emptyHint:'Create a document or upload a file to get started.',restricted:'Restricted',team:'Team',name:'Name',folder:'Folder',updated:'Updated',visibility:'Access',note:'Document',file:'File',description:'Description',title:'Title',body:'Content',classification:'Confidentiality',teamHint:'All authorized personnel',restrictedHint:'Admins and owner only',save:'Save document',cancel:'Cancel',choose:'Choose a file',sizeHint:'PDF, Office, images or text. Maximum 5 MB per file.',version:'Version',download:'Download file',history:'Version history',delete:'Move to trash',restore:'Restore',edit:'Edit',replace:'Upload a new version',close:'Close',membersHint:'Only the owner can grant or revoke access. The person must already have an active Respondo account.',email:'Email address',role:'Role',add:'Grant access',remove:'Revoke',viewer:'Viewer',editor:'Editor',admin:'Administrator',owner:'Owner',removed:'Access revoked.',granted:'Access updated.',saved:'Saved successfully.',deleted:'Moved to trash.',restored:'Restored successfully.',confirmDelete:'Move this document to the trash?',confirmRevoke:'Revoke access for this person?',activityHint:'Recent views, downloads, modifications and permission changes.',companiesHint:'Live account register. No payment details or access tokens are shown.',noCompanies:'No companies found.',time:'Time',actor:'Person',action:'Action',status:'Status',plan:'Plan',client:'Company',noVersions:'No versions found.',login:'Your session has expired. Please log in again.',error:'Something went wrong. Please try again.',fileRequired:'Choose a file first.',fileTooLarge:'Maximum file size is 5 MB.',roleViewer:'Can view ordinary files',roleEditor:'Can create and edit ordinary files',roleAdmin:'Can access restricted files',readOnly:'Read-only access',allData:'All folders'},
    fi:{restrictedSpace:'Vain valtuutetulle henkilöstölle',workspace:'TYÖTILA',allDocs:'Kaikki asiakirjat',companies:'Asiakasyritykset',folders:'KANSIOT',trash:'Roskakori',activity:'Tapahtumaloki',access:'Käyttöoikeudet',secureAccount:'Suojattu käyttäjätili',back:'Takaisin Respondoon',archive:'Sisäinen arkisto',private:'YKSITYINEN',intro:'Yrityksen asiakirjat, tiedot ja päätökset turvallisesti yhdessä paikassa.',upload:'Lataa tiedosto',newNote:'Uusi asiakirja',documents:'ASIAKIRJAT',files:'TIEDOSTOT',storage:'TALLENNUSTILA',docsHint:'Muistiinpanot ja tiedostot',filesHint:'Ladatut tiedostot',storageHint:'Nykyiset versiot',listHint:'Vain valtuutetut työntekijät näkevät nämä tiedot.',allFolders:'Kaikki kansiot',loading:'Ladataan asiakirjoja...',search:'Etsi asiakirjoja...',securityFooter:'Käyttöoikeus tarkistetaan palvelimella. Lataukset ja muutokset kirjataan lokiin.',empty:'Ei asiakirjoja',emptyHint:'Luo ensimmäinen asiakirja tai lataa tiedosto.',restricted:'Rajattu',team:'Tiimi',name:'Nimi',folder:'Kansio',updated:'Päivitetty',visibility:'Näkyvyys',note:'Asiakirja',file:'Tiedosto',description:'Kuvaus',title:'Otsikko',body:'Sisältö',classification:'Salassapitotaso',teamHint:'Kaikki valtuutetut käyttäjät',restrictedHint:'Vain ylläpitäjät ja omistaja',save:'Tallenna asiakirja',cancel:'Peruuta',choose:'Valitse tiedosto',sizeHint:'PDF, Office, kuvat tai teksti. Enintään 5 Mt / tiedosto.',version:'Versio',download:'Lataa tiedosto',history:'Versiohistoria',delete:'Siirrä roskakoriin',restore:'Palauta',edit:'Muokkaa',replace:'Lataa uusi versio',close:'Sulje',membersHint:'Vain omistaja voi myöntää ja poistaa oikeuksia. Käyttäjällä pitää olla aktiivinen Respondo-tili.',email:'Sähköpostiosoite',role:'Rooli',add:'Anna oikeus',remove:'Poista oikeus',viewer:'Katselija',editor:'Muokkaaja',admin:'Ylläpitäjä',owner:'Omistaja',removed:'Oikeus poistettu.',granted:'Oikeus päivitetty.',saved:'Tallennettu.',deleted:'Siirretty roskakoriin.',restored:'Palautettu.',confirmDelete:'Siirretäänkö asiakirja roskakoriin?',confirmRevoke:'Poistetaanko tämän henkilön oikeus?',activityHint:'Viimeisimmät katselut, lataukset, muutokset ja käyttöoikeusmuutokset.',companiesHint:'Ajantasainen asiakasrekisteri. Maksutietoja tai tunnuksia ei näytetä.',noCompanies:'Asiakasyrityksiä ei löytynyt.',time:'Aika',actor:'Henkilö',action:'Toiminto',status:'Tila',plan:'Paketti',client:'Yritys',noVersions:'Ei versioita.',login:'Istunto vanheni. Kirjaudu uudelleen.',error:'Toiminto epäonnistui. Yritä uudelleen.',fileRequired:'Valitse ensin tiedosto.',fileTooLarge:'Tiedoston enimmäiskoko on 5 Mt.',roleViewer:'Näkee tavalliset tiedostot',roleEditor:'Voi luoda ja muokata tavallisia tiedostoja',roleAdmin:'Näkee myös rajatut tiedostot',readOnly:'Vain lukuoikeus',allData:'Kaikki kansiot'},
    sv:{restrictedSpace:'Endast behörig personal',workspace:'ARBETSOMRÅDE',allDocs:'Alla dokument',companies:'Kundföretag',folders:'MAPPAR',trash:'Papperskorg',activity:'Aktivitetslogg',access:'Behörigheter',secureAccount:'Skyddat konto',back:'Tillbaka till Respondo',archive:'Internt arkiv',private:'PRIVAT',intro:'Företagets dokument, uppgifter och beslut på ett säkert ställe.',upload:'Ladda upp fil',newNote:'Nytt dokument',documents:'DOKUMENT',files:'FILER',storage:'LAGRING',docsHint:'Anteckningar och filer',filesHint:'Uppladdade filer',storageHint:'Aktuella versioner',listHint:'Endast behöriga medarbetare kan se denna information.',allFolders:'Alla mappar',loading:'Laddar dokument...',search:'Sök dokument...',securityFooter:'Behörigheten kontrolleras på servern. Nedladdningar och ändringar loggas.',empty:'Inga dokument ännu',emptyHint:'Skapa ett dokument eller ladda upp en fil.',restricted:'Begränsad',team:'Team',name:'Namn',folder:'Mapp',updated:'Uppdaterad',visibility:'Åtkomst',note:'Dokument',file:'Fil',description:'Beskrivning',title:'Rubrik',body:'Innehåll',classification:'Sekretessnivå',teamHint:'All behörig personal',restrictedHint:'Endast administratörer och ägare',save:'Spara dokument',cancel:'Avbryt',choose:'Välj en fil',sizeHint:'PDF, Office, bilder eller text. Max 5 MB per fil.',version:'Version',download:'Ladda ner fil',history:'Versionshistorik',delete:'Flytta till papperskorg',restore:'Återställ',edit:'Redigera',replace:'Ladda upp ny version',close:'Stäng',membersHint:'Endast ägaren kan ge eller ta bort behörighet. Personen måste redan ha ett aktivt Respondo-konto.',email:'E-postadress',role:'Roll',add:'Ge tillgång',remove:'Ta bort',viewer:'Läsare',editor:'Redigerare',admin:'Administratör',owner:'Ägare',removed:'Behörigheten togs bort.',granted:'Behörigheten uppdaterades.',saved:'Sparat.',deleted:'Flyttat till papperskorgen.',restored:'Återställt.',confirmDelete:'Flytta dokumentet till papperskorgen?',confirmRevoke:'Ta bort personens behörighet?',activityHint:'Senaste visningar, nedladdningar, ändringar och behörighetsändringar.',companiesHint:'Aktuellt kundregister utan betalningsuppgifter eller åtkomstnycklar.',noCompanies:'Inga företag hittades.',time:'Tid',actor:'Person',action:'Åtgärd',status:'Status',plan:'Paket',client:'Företag',noVersions:'Inga versioner hittades.',login:'Sessionen har gått ut. Logga in igen.',error:'Något gick fel. Försök igen.',fileRequired:'Välj först en fil.',fileTooLarge:'Högsta filstorlek är 5 MB.',roleViewer:'Kan läsa vanliga filer',roleEditor:'Kan skapa och redigera vanliga filer',roleAdmin:'Kan öppna begränsade filer',readOnly:'Skrivskyddad',allData:'Alla mappar'}
  };
  // This archive is deliberately owner-only; prior multi-user copy is overridden.
  Object.assign(dictionary.en,{restrictedSpace:'Owner account only',back:'Back to Visitors',listHint:'Visible only when signed in with the Respondo owner account.',team:'Private',restrictedHint:'Your owner account only',activityHint:'Recent document views, downloads and modifications.'});
  Object.assign(dictionary.fi,{restrictedSpace:'Vain omistajan tunnuksilla',back:'Takaisin Visitors-näkymään',listHint:'Näkyy vain Respondon omistajatunnuksilla kirjautuneelle.',team:'Yksityinen',restrictedHint:'Vain sinun omistajatunnuksillasi',activityHint:'Viimeisimmät asiakirjojen katselut, lataukset ja muutokset.'});
  Object.assign(dictionary.sv,{restrictedSpace:'Endast ägarkontot',back:'Tillbaka till Visitors',listHint:'Synligt endast med Respondos ägarkonto.',team:'Privat',restrictedHint:'Endast ditt ägarkonto',activityHint:'Senaste dokumentvisningar, nedladdningar och ändringar.'});
  const labels={
    'Yrityksen tiedot':['Business information','Yrityksen tiedot','Företagsuppgifter'],
    'Sopimukset':['Contracts','Sopimukset','Avtal'],
    'Asiakkaat':['Clients','Asiakkaat','Kunder'],
    'Talous':['Finance','Talous','Ekonomi'],
    'Tuote ja kehitys':['Product & development','Tuote ja kehitys','Produkt & utveckling'],
    'Tietoturva':['Security','Tietoturva','Säkerhet'],
    'Henkilöstö':['People','Henkilöstö','Personal'],
    'Markkinointi':['Marketing','Markkinointi','Marknadsföring'],
    'Muut':['Other','Muut','Övrigt']
  };
  const icons=['▣','◈','♧','€','⌘','◇','♟','↗','▤'];
  const $=id=>document.getElementById(id);
  const state={lang:['fi','sv','en'].includes(localStorage.getItem('respondo_lang'))?localStorage.getItem('respondo_lang'):'en',role:null,categories:[],screen:'all',category:'',documents:[],request:0};
  const t=key=>dictionary[state.lang]?.[key]||dictionary.en[key]||key;
  const catName=value=>labels[value]?.[['en','fi','sv'].indexOf(state.lang)]||value;
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
  const button=(value,cls,handler)=>{const n=el('button',cls,value);n.type='button';n.addEventListener('click',handler);return n;};
  const roleAllows=(right)=>right==='write'?['owner','admin','editor'].includes(state.role):right==='admin'?['owner','admin'].includes(state.role):state.role==='owner';
  const date=value=>{try{return new Intl.DateTimeFormat(state.lang==='fi'?'fi-FI':state.lang==='sv'?'sv-SE':'en-GB',{dateStyle:'medium'}).format(new Date(value));}catch{return '—';}};
  const size=value=>Number(value||0)<1024?'0 KB':(Number(value||0)/1024/1024>=1?(Number(value||0)/1024/1024).toFixed(1)+' MB':Math.round(Number(value||0)/1024)+' KB');
  let toastTimer;
  function notify(message){const n=$('toast');n.textContent=message;n.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.hidden=true,4400);}
  async function request(url,options={}){
    let response;
    try{response=await fetch(API+url,{credentials:'same-origin',cache:'no-store',...options});}
    catch{throw new Error(t('error'));}
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(response.status===401?t('login'):(data.error||t('error')));
    return data;
  }
  async function sendJSON(url,method,data){return request(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});}
  function translate(){document.documentElement.lang=state.lang;$('language').value=state.lang;document.querySelectorAll('[data-i18n]').forEach(node=>{node.textContent=t(node.dataset.i18n);});document.querySelectorAll('[data-placeholder]').forEach(node=>{node.placeholder=t(node.dataset.placeholder);});document.title='Respondo · '+t('archive');$('userRole').textContent=t(state.role||'viewer');}
  function nav(){
    $('categoryNav').replaceChildren(...state.categories.map((value,i)=>{
      const b=button(catName(value),'nav-item'+(state.screen==='category'&&state.category===value?' active':''),()=>activate('category',value));
      b.prepend(el('span','nav-icon',icons[i]||'▣'));
      return b;
    }));
    document.querySelectorAll('[data-screen]').forEach(b=>b.classList.toggle('active',b.dataset.screen===state.screen));
    $('companiesNav').hidden=!roleAllows('admin');$('activityNav').hidden=!roleAllows('admin');
    $('writeActions').hidden=!roleAllows('write')||!['all','category'].includes(state.screen);
    $('filters').hidden=!['all','category','trash'].includes(state.screen);
    $('summary').hidden=!['all','category'].includes(state.screen);
    $('pageTitle').textContent=state.screen==='category'?catName(state.category):t(({all:'archive',trash:'trash',activity:'activity',companies:'companies'})[state.screen]);
    $('listTitle').textContent=state.screen==='category'?catName(state.category):t(({all:'allDocs',trash:'trash',activity:'activity',companies:'companies'})[state.screen]);
    $('listSubtitle').textContent=t(({activity:'activityHint',companies:'companiesHint'})[state.screen]||'listHint');
    $('categoryFilter').value=state.screen==='category'?state.category:'';
    $('pageIntro').textContent=t('intro');
  }
  function activate(screen,category=''){
    state.screen=screen;state.category=category;$('search').value='';nav();load().catch(e=>showError(e.message));
  }
  function empty(message=t('empty'),hint=t('emptyHint')){
    const wrap=el('div','empty');wrap.append(el('div','empty-icon','▤'),el('h3','',message),el('p','',hint));$('panelContent').replaceChildren(wrap);
  }
  function showError(message){empty(message,'');notify(message);}
  function table(headings,rows){const wrapper=el('div','table-scroll');const tbl=el('table','data-table');const thead=el('thead'),header=el('tr');headings.forEach(label=>header.append(el('th','',label)));thead.append(header);const tbody=el('tbody');rows.forEach(row=>{const tr=el('tr');row.forEach(value=>{const td=el('td');if(value instanceof Node)td.append(value);else td.textContent=String(value??'—');tr.append(td);});tbody.append(tr);});tbl.append(thead,tbody);wrapper.append(tbl);$('panelContent').replaceChildren(wrapper);}
  async function loadDocuments(){
    const serial=++state.request,params=new URLSearchParams();
    if(state.screen==='trash')params.set('trash','1');
    if(state.screen==='category')params.set('category',state.category);
    const q=$('search').value.trim();if(q)params.set('q',q);
    const selected=$('categoryFilter').value;if(selected&&state.screen!=='category')params.set('category',selected);
    const result=await request('/documents?'+params.toString());if(serial!==state.request)return;
    state.documents=result.documents;
    if(!result.documents.length)return empty();
    if(state.screen==='trash')return table([t('name'),t('folder'),t('updated'),t('visibility')],result.documents.map(item=>[
      el('strong','',item.title),catName(item.category),date(item.updated_at),
      roleAllows('admin')?button(t('restore'),'button mini secondary',()=>restore(item.id)):t('readOnly')
    ]));
    table([t('name'),t('folder'),t('updated'),t('visibility')],result.documents.map(doc=>{
      const link=button(doc.title,'doc-button',()=>openDetail(doc.id));
      const badge=el('span','doc-icon'+(doc.kind==='file'?' file':''),doc.kind==='file'?'↥':'▤');link.prepend(badge);
      const title=el('div');title.append(link,el('div','cell-sub',doc.kind==='file'?`${doc.file_name} · ${size(doc.size_bytes)}`:doc.description||t('note')));
      const level=el('span','level'+(doc.classification==='restricted'?' restricted':''),t(doc.classification==='restricted'?'restricted':'team'));
      return [title,catName(doc.category),date(doc.updated_at),level];
    }));
  }
  async function loadCompanies(){const {companies}=await request('/companies');if(!companies.length)return empty(t('noCompanies'),'');table([t('client'),t('email'),t('plan'),t('status')],companies.map(c=>{const title=el('div');title.append(el('strong','',c.name),el('div','cell-sub',c.website||''));return[title,c.contact_email||c.account_email||'—',c.subscription_plan||'—',c.subscription_status||'—'];}));}
  async function loadAudit(){const {events}=await request('/audit');if(!events.length)return empty();table([t('time'),t('actor'),t('action'),t('name')],events.map(a=>[date(a.created_at),a.actor,a.action,a.document_id?String(a.document_id).slice(0,8):'—']));}
  async function load(){
    if(state.screen==='activity')return loadAudit();
    if(state.screen==='companies')return loadCompanies();
    return loadDocuments();
  }
  function openModal(title,content){$('modalTitle').textContent=title;$('modalBody').replaceChildren(content);$('modal').hidden=false;document.body.style.overflow='hidden';$('closeModal').focus();}
  function closeModal(){$('modal').hidden=true;$('modalBody').replaceChildren();document.body.style.overflow='';}
  function field(label,input,hint){const wrap=el('div','field');wrap.append(el('label','',label),input);if(hint)wrap.append(el('small','',hint));return wrap;}
  function input(value='',required=false){const control=el('input');control.type='text';control.value=value;control.required=required;control.maxLength=160;return control;}
  function selectCategory(value=state.category||'Yrityksen tiedot'){
    const select=el('select');state.categories.forEach(cat=>{const opt=el('option','',catName(cat));opt.value=cat;select.append(opt);});select.value=value;return select;
  }
  function selectClass(value='team'){
    const select=el('select');['team',...(roleAllows('admin')?['restricted']:[])].forEach(key=>{const opt=el('option','',t(key)+(key==='restricted'?' · '+t('restrictedHint'):''));opt.value=key;select.append(opt);});select.value=value;return select;
  }
  function controls(form,saveLabel){const row=el('div','modal-actions');row.append(button(t('cancel'),'button secondary',closeModal));const submit=el('button','button primary',saveLabel);submit.type='submit';submit.setAttribute('form',form.id);row.append(submit);return row;}
  function openNoteEditor(item=null){
    const form=el('form','form');form.id='noteEditForm';
    const name=input(item?.title||'',true);const group=selectCategory(item?.category);const secret=selectClass(item?.classification);const description=input(item?.description||'');
    const body=el('textarea');body.value=item?.note_body||'';body.required=true;body.maxLength=100000;
    const both=el('div','form-grid');both.append(field(t('folder'),group),field(t('classification'),secret));
    form.append(field(t('title'),name),both,field(t('description'),description),field(t('body'),body));
    const container=el('div');container.append(form,controls(form,t('save')));
    form.addEventListener('submit',async(event)=>{event.preventDefault();const submit=container.querySelector('button[type="submit"]');submit.disabled=true;try{const payload={title:name.value,category:group.value,classification:secret.value,description:description.value,body:body.value};if(item){payload.expectedVersion=item.current_version;await sendJSON('/documents/'+encodeURIComponent(item.id),'PUT',payload);}else await sendJSON('/documents','POST',payload);closeModal();notify(t('saved'));await refresh();}catch(e){notify(e.message);}finally{submit.disabled=false;}});
    openModal(item?t('edit'):t('newNote'),container);name.focus();
  }
  function openUpload(existing=null){
    const form=el('form','form');form.id='uploadVaultForm';
    const name=input(existing?.title||'',true);const group=selectCategory(existing?.category);const secret=selectClass(existing?.classification);
    const file=el('input');file.type='file';file.required=true;file.accept='.pdf,.txt,.csv,.png,.jpg,.jpeg,.docx,.xlsx,.pptx,.odt,.ods';
    const area=el('div','file-drop');area.append(el('strong','',t('choose')),file,el('p','',t('sizeHint')));
    const both=el('div','form-grid');both.append(field(t('folder'),group),field(t('classification'),secret));
    form.append(field(t('title'),name),both,area);
    const container=el('div');container.append(form,controls(form,existing?t('replace'):t('upload')));
    file.addEventListener('change',()=>{if(file.files[0]&&!name.value)name.value=file.files[0].name;});
    form.addEventListener('submit',async(event)=>{event.preventDefault();const selected=file.files?.[0];if(!selected)return notify(t('fileRequired'));if(selected.size>5*1024*1024)return notify(t('fileTooLarge'));const submit=container.querySelector('button[type="submit"]');submit.disabled=true;try{
      const headers={'Content-Type':'application/octet-stream','x-vault-filename':encodeURIComponent(selected.name),'x-vault-title':encodeURIComponent(name.value),'x-vault-category':encodeURIComponent(group.value),'x-vault-classification':secret.value,'x-vault-mime':selected.type||'application/octet-stream'};
      if(existing)headers['x-vault-version']=String(existing.current_version);
      await request(existing?'/files/'+encodeURIComponent(existing.id)+'/versions':'/files',{method:'POST',headers,body:selected});closeModal();notify(t('saved'));await refresh();
    }catch(e){notify(e.message);}finally{submit.disabled=false;}});
    openModal(existing?t('replace'):t('upload'),container);
  }
  async function openDetail(id){
    try{
      const {document:item}=await request('/documents/'+encodeURIComponent(id));
      const wrapper=el('div');const body=el('div','detail-body');
      body.append(el('div','detail-meta',catName(item.category)+' · '+t('version')+' '+item.current_version+' · '+date(item.updated_at)+' · '+t(item.classification==='restricted'?'restricted':'team')));
      if(item.description)body.append(el('p','',item.description));
      if(item.kind==='note')body.append(el('pre','',item.note_body||''));
      else body.append(el('p','',item.file_name+' · '+size(item.size_bytes)));
      wrapper.append(body);
      const history=el('div','versions');const historyButton=button(t('history')+' ⌄','button mini secondary',async()=>{
        historyButton.disabled=true;try{const data=await request('/documents/'+encodeURIComponent(id)+'/history');history.replaceChildren(el('h3','',t('history')));data.versions.forEach(v=>{
          const row=el('div','version-row');row.append(el('span','',t('version')+' '+v.version+' · '+date(v.created_at)+' · '+(v.sha256||'').slice(0,12)));
          if(item.kind==='file'){const link=el('a','',t('download'));link.href=API+'/documents/'+encodeURIComponent(id)+'/download?version='+v.version;link.rel='nofollow';row.append(link);}
          else row.append(button(t('version')+' '+v.version,'button mini secondary',async()=>{try{const saved=await request('/documents/'+encodeURIComponent(id)+'/versions/'+v.version);const old=el('pre','',saved.version.note_body||'');row.after(old);}catch(e){notify(e.message);}}));
          history.append(row);
        });}catch(e){notify(e.message);}finally{historyButton.disabled=false;}
      });
      wrapper.append(el('div','modal-actions'));
      const actions=wrapper.querySelector('.modal-actions');actions.append(historyButton);
      if(item.kind==='file'){const link=el('a','button primary',t('download'));link.href=API+'/documents/'+encodeURIComponent(id)+'/download';link.rel='nofollow';actions.append(link);}
      if(roleAllows('write')&&(item.classification!=='restricted'||roleAllows('admin'))){
        actions.append(button(t('edit'),'button secondary',()=>{if(item.kind==='note')openNoteEditor(item);else openUpload(item);}));
        actions.append(button(t('delete'),'button danger',async()=>{if(!window.confirm(t('confirmDelete')))return;try{await request('/documents/'+encodeURIComponent(id),{method:'DELETE'});closeModal();notify(t('deleted'));await refresh();}catch(e){notify(e.message);}}));
      }
      wrapper.append(history);openModal(item.title,wrapper);
    }catch(e){notify(e.message);}
  }
  async function restore(id){try{await request('/documents/'+encodeURIComponent(id)+'/restore',{method:'POST'});notify(t('restored'));await refresh();}catch(e){notify(e.message);}}
  async function refresh(){
    const session=await request('/session');state.role=session.role;$('countDocs').textContent=session.summary.documents;$('countFiles').textContent=session.summary.files;$('storageCount').textContent=size(session.summary.bytes);$('allCount').textContent=session.summary.documents;translate();nav();
    await load();
  }
  function setup(){
    $('language').addEventListener('change',event=>{state.lang=event.target.value;localStorage.setItem('respondo_lang',state.lang);translate();nav();load().catch(e=>notify(e.message));});
    document.querySelectorAll('[data-screen]').forEach(b=>b.addEventListener('click',()=>activate(b.dataset.screen)));
    let searchDelay;$('search').addEventListener('input',()=>{clearTimeout(searchDelay);searchDelay=setTimeout(()=>loadDocuments().catch(e=>notify(e.message)),250);});
    $('categoryFilter').addEventListener('change',()=>loadDocuments().catch(e=>notify(e.message)));
    $('newButton').addEventListener('click',()=>openNoteEditor());$('uploadButton').addEventListener('click',()=>openUpload());
    $('closeModal').addEventListener('click',closeModal);$('modal').addEventListener('click',event=>{if(event.target===$('modal'))closeModal();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('modal').hidden)closeModal();});
    translate();
    refresh().catch(error=>{showError(error.message);$('writeActions').hidden=true;});
  }
  setup();
})();
