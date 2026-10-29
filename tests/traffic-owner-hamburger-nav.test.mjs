import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../public/traffic.html',import.meta.url),'utf8');

test('owner header has one accessible three-bar menu, language selector and private actions',()=>{
  assert.match(html,/<button type="button" class="traffic-menu-toggle" id="trafficMenuToggle" aria-controls="trafficNavigation" aria-expanded="false"/);
  assert.match(html,/<span><\/span><span><\/span><span><\/span>/);
  assert.match(html,/<nav class="traffic-navigation" id="trafficNavigation"[^>]* hidden>/);
  assert.match(html,/<select id="lang"/);
  assert.match(html,/<a id="dashboardLink" href="\/app"><\/a>/);
  assert.match(html,/<button type="button" id="refresh"><\/button>/);
  assert.match(html,/\.traffic-navigation\[hidden\],\.traffic-view\[hidden\]\{display:none!important\}/);
  assert.match(html,/\.top\{position:relative/);
});

test('three separate menu sections have Finnish, Swedish and English labels',()=>{
  const expected=[
    ['fi',"navVisitors:'Kävijätilastot'","navCompanies:'Käyttöönotot'","navSetup:'Käyttöönottopalvelut'"],
    ['sv',"navVisitors:'Besöksstatistik'","navCompanies:'Aktiverade företag'","navSetup:'Installationstjänster'"],
    ['en',"navVisitors:'Visitor analytics'","navCompanies:'Company activations'","navSetup:'Setup services'"],
  ];
  for(const [lang,...names] of expected){
    for(const term of names)assert.ok(html.includes(term),lang+': '+term);
  }
  for(const target of ['traffic','companies','setup'])
    assert.match(html,new RegExp('data-traffic-view="'+target+'"'));
});

test('visitor, active companies and setup jobs do not render together',()=>{
  const portion=html.slice(html.indexOf('async function load(){'),html.indexOf("document.getElementById('refresh')"));
  assert.match(portion,/id="trafficStatsView"/);
  assert.match(portion,/id="companyView" hidden/);
  assert.match(portion,/id="setupView" hidden/);
  assert.match(portion,/cards\(d\.summary\|\|\{\}\)/);
  assert.match(portion,/companiesShell\(\)/);
  assert.match(portion,/setupShell\(\)/);
  assert.match(portion,/bindCompanyControls\(\)/);
  assert.match(portion,/bindSetupAdmin\(\)/);
  assert.match(portion,/loadSetupOrders\(\)/);
  assert.match(portion,/loadCompanies\(\)/);
  assert.match(portion,/setActiveTrafficView\(viewFromHash\(\)\)/);
});

test('view changes show only selected panel and heading, preserve deep links, and update selected menu item',()=>{
  const start=html.indexOf('const trafficViewHashes=');
  const end=html.indexOf('function bindTrafficNavigation()',start);
  assert.ok(start>=0 && end>start);
  const source=html.slice(start,end);
  const panels=new Map();
  const headings=new Map();
  const buttons=new Map();
  for(const name of ['traffic','companies','setup']){
    panels.set(name,{hidden:false});
    headings.set(name,{hidden:false});
    buttons.set(name,{
      attributes:{},
      setAttribute(key,value){this.attributes[key]=value;},
      removeAttribute(key){delete this.attributes[key];},
    });
  }
  const menu={hidden:true};
  const toggle={attributes:{},setAttribute(key,value){this.attributes[key]=value;}};
  const document={
    getElementById(id){
      if(id==='trafficNavigation')return menu;
      if(id==='trafficMenuToggle')return toggle;
      return {
        trafficStatsView:panels.get('traffic'),companyView:panels.get('companies'),setupView:panels.get('setup'),
        trafficViewHeading:headings.get('traffic'),companiesViewHeading:headings.get('companies'),
        setupViewHeading:headings.get('setup'),
      }[id];
    },
    querySelector(selector){
      const match=selector.match(/data-traffic-view="(.*?)"/);
      return match?buttons.get(match[1]):null;
    },
  };
  const location={hash:'#setup-orders'};
  const tracked=[];
  const history={replaceState(...args){tracked.push(args[2]);}};
  const window={scrollTo(...args){tracked.push(args);}};
  const context={document,location,history,window,t:key=>key};
  vm.createContext(context);
  vm.runInContext(source+";this.expose={viewFromHash,setActiveTrafficView,setTrafficMenuOpen};",context);
  const {viewFromHash,setActiveTrafficView,setTrafficMenuOpen}=context.expose;
  assert.equal(viewFromHash(),'setup');
  setActiveTrafficView(viewFromHash());
  assert.equal(panels.get('setup').hidden,false);
  assert.equal(panels.get('traffic').hidden,true);
  assert.equal(panels.get('companies').hidden,true);
  assert.equal(headings.get('setup').hidden,false);
  assert.equal(headings.get('traffic').hidden,true);
  assert.equal(buttons.get('setup').attributes['aria-current'],'page');
  assert.equal(buttons.get('companies').attributes['aria-current'],undefined);
  setTrafficMenuOpen(true);
  assert.equal(menu.hidden,false);
  assert.equal(toggle.attributes['aria-expanded'],'true');
  setActiveTrafficView('companies',{updateHash:true,scroll:true});
  assert.equal(menu.hidden,true);
  assert.equal(panels.get('companies').hidden,false);
  assert.equal(panels.get('setup').hidden,true);
  assert.equal(buttons.get('companies').attributes['aria-current'],'page');
  assert.ok(tracked.includes('#companiesSection'));
  location.hash='#traffic';
  assert.equal(viewFromHash(),'traffic');
  setActiveTrafficView('traffic');
  assert.equal(panels.get('traffic').hidden,false);
});

test('escaping menu and tapping outside close it, and refresh retains the currently selected deep-linked section',()=>{
  assert.match(html,/if\(event\.key==='Escape' && !menu\.hidden\)/);
  assert.match(html,/!event\.target\.closest\('#trafficNavigation,#trafficMenuToggle'\)/);
  assert.match(html,/window\.addEventListener\('hashchange',\(\)=>setActiveTrafficView\(viewFromHash\(\)\)\)/);
  assert.match(html,/document\.getElementById\('refresh'\)\.addEventListener\('click',load\)/);
  assert.match(html,/location\.hash/);
  assert.match(html,/localStorage\.setItem\('respondo_lang',lang\)/);
});
