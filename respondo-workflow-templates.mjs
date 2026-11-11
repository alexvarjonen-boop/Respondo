// Template-based, first-party workflow builder. All actions are existing internal operations.
// Templates NEVER send messages, make payments, approve refunds or confirm bookings.
const entries=[
  {
    id:'moving_quote',
    name:{fi:'Muutto- ja palvelutarjous',sv:'Flytt- och serviceoffert',en:'Moving and service quote'},
    trigger:'action_requested',
    steps:{fi:['Asiakas lähettää tarjouspyynnön','Luo työntekijälle tehtävä','Pyydä hinnan hyväksyntä'],
      sv:['Kunden skickar en offertförfrågan','Skapa en uppgift','Begär godkännande av offerten'],
      en:['Customer submits a quote request','Create an internal task','Ask for quote approval']},
    actions:[{type:'create_task',title:'Review quote request',dueHours:24},
      {type:'request_approval',title:'Approve quote terms',purpose:'quote'}]
  },
  {
    id:'booking_request',
    name:{fi:'Ajanvarauspyynnön käsittely',sv:'Hantera bokningsförfrågan',en:'Booking request review'},
    trigger:'action_requested',
    steps:{fi:['Vastaanota varauspyyntö','Tarkista työaika ja kalenteri','Pyydä työntekijän hyväksyntä'],
      sv:['Ta emot förfrågan','Granska tidsbehov och kalender','Begär personalens godkännande'],
      en:['Receive request','Review duration and actual availability','Request human approval']},
    actions:[{type:'create_task',title:'Check booking capacity',dueHours:8},
      {type:'request_approval',title:'Review booking request',purpose:'booking'}]
  },
  {
    id:'lead_followup',
    name:{fi:'Uuden liidin käsittely',sv:'Följ upp ny lead',en:'New lead follow-up'},
    trigger:'lead_captured',
    steps:{fi:['Asiakas antaa yhteystiedot','Luo yhteydenottotehtävä','Avaa käsittelypyyntö'],
      sv:['Kunden lämnar kontaktuppgifter','Skapa uppföljningsuppgift','Öppna ett ärende'],
      en:['Customer submits contact details','Create follow-up task','Open an internal ticket']},
    actions:[{type:'create_task',title:'Follow up on new lead',dueHours:24},
      {type:'open_ticket',title:'New customer inquiry'}]
  },
  {
    id:'complaint_review',
    name:{fi:'Reklamaation käsittely',sv:'Hantera reklamation',en:'Complaint review'},
    trigger:'action_requested',
    steps:{fi:['Vastaanota asiakkaan pyyntö','Avaa käsittelypyyntö','Pyydä hyvityksen hyväksyntä'],
      sv:['Ta emot förfrågan','Öppna ett ärende','Begär godkännande av eventuell återbetalning'],
      en:['Receive customer request','Open internal ticket','Ask approval before any refund']},
    actions:[{type:'open_ticket',title:'Customer issue for review'},
      {type:'request_approval',title:'Review any proposed refund',purpose:'refund'}]
  }
];
export const workflowTemplateCatalog=()=>{
  return entries.map(item=>({
    id:item.id,name:item.name,trigger:item.trigger,steps:item.steps,
    stages:item.actions.length,
    automaticExternalActions:false,requiresOwnerActivation:true,
    interactiveCustomerIntake:false
  }));
};
export function workflowFromTemplate(input={}){
  if(!input||typeof input!=='object'||Array.isArray(input)||
     input.approved!==true)throw new TypeError('Explicit owner approval is required');
  const template=entries.find(item=>item.id===input.templateId);
  if(!template)throw new TypeError('Unknown workflow template');
  const name=template.name.en;
  return {
    name,trigger:template.trigger,conditions:{},
    actions:template.actions.map(action=>({...action})),
    enabled:false
  };
}
