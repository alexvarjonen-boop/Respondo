// First-party, source-bound moving enquiry workflow for the single approved
// Mainio Muuttopalvelu tenant. It creates a request for human review, never a
// confirmed order, calendar booking, price, or availability claim.
export const MAINIO_TENANT_ID='e7d3f365-0761-4d5e-ac20-b13b1748a497';
export const MAINIO_QUOTE_URL='https://tarjous.mainiomuuttopalvelu.fi/';
export const MAINIO_BOX_SOURCES=[
  'https://www.mainiomuuttopalvelu.fi/usein-muutosta-kysyttya',
  'https://www.mainiomuuttopalvelu.fi/muuttolaatikot-ja-tarvikkeet',
];

export const isMainioMovingTenant = (tenant) =>
  String(tenant?.id||'')===MAINIO_TENANT_ID &&
  /^https:\/\/(?:www\.)?mainiomuuttopalvelu\.fi(?:\/|$)/i.test(String(tenant?.website||''));

export function mainioMoveActions(lang='fi') {
  const labels={
    fi:['Kartoita muutto ja pyydä tarjous','Mainion virallinen tarjouslomake'],
    sv:['Beskriv flytten och begär offert','Mainios officiella offertformulär'],
    en:['Plan your move and request a quote','Mainio’s official quote form'],
  };
  const [form,link]=labels[lang]||labels.fi;
  return [
    {type:'quote',mode:'mainio_move_form',label:form},
    {type:'quote',url:MAINIO_QUOTE_URL,label:link},
  ];
}

const allowed={
  serviceType:['home','business','other'],
  originHousing:['apartment','detached','row','business','other','unknown'],
  destinationHousing:['apartment','detached','row','business','other','unknown'],
  originElevator:['yes','no','unknown','na'],
  destinationElevator:['yes','no','unknown','na'],
  originParking:['yes','no','unknown'],
  destinationParking:['yes','no','unknown'],
  ownBoxes:['yes','no','some','unknown'],
  carryingHelp:['yes','no','unknown'],
  packingHelp:['yes','no','unknown'],
  storageNeeded:['yes','no','unknown'],
};
const textFields={
  name:120,contact:220,desiredDate:10,originAddress:220,originCity:100,
  originFloor:24,destinationAddress:220,destinationCity:100,
  destinationFloor:24,areaSqm:10,boxCount:6,peopleCount:4,
  specialItems:650,notes:850,
};
const values={
  serviceType:'Palvelu',desiredDate:'Toivottu muuttopäivä',
  originAddress:'Lähtöosoite',originCity:'Lähtöpaikkakunta',
  originHousing:'Lähtökohteen tyyppi',originFloor:'Lähtökerros',
  originElevator:'Lähtökohteen hissi',originParking:'Muuttoauto oven eteen lähtöpaikassa',
  destinationAddress:'Kohdeosoite',destinationCity:'Kohdepaikkakunta',
  destinationHousing:'Kohteen tyyppi',destinationFloor:'Kohdekerros',
  destinationElevator:'Kohteen hissi',destinationParking:'Muuttoauto oven eteen kohteessa',
  areaSqm:'Asunnon pinta-ala (m²)',peopleCount:'Asukkaat',ownBoxes:'Omat muuttolaatikot',
  boxCount:'Toivotut vuokralaatikot (kpl)',carryingHelp:'Tarvitsee kantoapua',
  packingHelp:'Tarvitsee pakkausapua',storageNeeded:'Tarvitsee varastointia',
  specialItems:'Isot tai erityiset esineet',notes:'Lisätiedot',
};
const safeValue=(v,max)=>String(v??'').trim().replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,max);
const validContact=(s)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)||/^\+?[\d\s().-]{6,30}$/.test(s);

export function validateMainioMove(input,{today}={}) {
  if(!input||typeof input!=='object'||Array.isArray(input))return {error:'Virheellinen muuttopyyntö.'};
  if(input.consent!==true)return {error:'Hyväksy tietojen lähettäminen Mainio Muuttopalvelulle.'};
  const data={};
  for(const [key,max] of Object.entries(textFields))data[key]=safeValue(input[key],max);
  for(const [key,choices] of Object.entries(allowed)){
    const val=safeValue(input[key],32);
    if(val&&!choices.includes(val))return {error:'Tarkista muuton valinnat.'};
    data[key]=val||'unknown';
  }
  if(data.name.length<2)return {error:'Anna nimesi.'};
  if(!validContact(data.contact))return {error:'Anna puhelinnumero tai sähköpostiosoite.'};
  if(!/^\d{4}-\d{2}-\d{2}$/.test(data.desiredDate)||Number.isNaN(Date.parse(data.desiredDate+'T12:00:00Z'))||
    new Date(data.desiredDate+'T12:00:00Z').toISOString().slice(0,10)!==data.desiredDate)
    return {error:'Anna kelvollinen muuttopäivä.'};
  if(today&&data.desiredDate<today)return {error:'Muuttopäivä ei voi olla menneisyydessä.'};
  if(data.originAddress.length<5||data.destinationAddress.length<5||!data.originCity||!data.destinationCity)
    return {error:'Anna lähtö- ja kohdeosoitteet sekä paikkakunnat.'};
  if(data.serviceType==='unknown')return {error:'Valitse muuton tyyppi.'};
  if(!/^(?:[1-9]\d{0,3})(?:[.,]\d)?$/.test(data.areaSqm)||Number(data.areaSqm.replace(',','.'))>1500)
    return {error:'Anna asunnon tai toimitilan pinta-ala (m²).'};
  for(const prefix of ['origin','destination']){
    if(data[prefix+'Housing']==='apartment'&&!data[prefix+'Floor'])
      return {error:'Anna kerrostalokohteen kerros kummassakin osoitteessa.'};
  }
  if(data.boxCount&&!/^\d{1,4}$/.test(data.boxCount))return {error:'Tarkista laatikoiden määrä.'};
  if(data.peopleCount&&!/^\d{1,3}$/.test(data.peopleCount))return {error:'Tarkista asukkaiden määrä.'};
  return {data};
}
export function mainioMoveDetails(data) {
  return [
    'MAINIO MUUTTOPALVELU – TARJOUSPYYNTÖ / IHMISEN HYVÄKSYNTÄÄN',
    ...Object.entries(values).map(([key,label])=>label+': '+(data[key]||'ei ilmoitettu')),
    'Hinta, muuttopäivän saatavuus ja lopullinen tilaus vahvistetaan vain Mainion toimesta.',
    'Virallinen tilauslomake: '+MAINIO_QUOTE_URL,
  ].join('\n');
}
