// Local, deliberately constrained language-to-workflow compiler. Not an LLM:
// a rejected phrase is safer than silently enabling an unknown external action.
import {validateFreeWorkflow,previewFreeWorkflow} from './respondo-free-actions.mjs';
const clean=s=>String(s||'').normalize('NFKC').trim().replace(/\s+/g,' ');
const task=/\b(?:create (?:a )?task|make (?:a )?task|follow.?up task|luo teht[aä]v[aä]|tee teht[aä]v[aä]|skapa (?:en )?uppgift|uppf[oö]ljningsuppgift)\b/i;
const ticket=/\b(?:open (?:a )?ticket|create (?:a )?ticket|open (?:a )?case|avaa (?:tiketti|tukipyynt[oö]|palvelupyynt[oö])|skapa (?:ett )?[aä]rende|[oö]ppna (?:ett )?[aä]rende)\b/i;
const approval=/\b(?:request (?:human |owner )?approval|ask (?:for )?approval|pyyd[aä] (?:hyv[aä]ksynt[aä]|vahvistus)|beg[aä]r (?:godk[aä]nnande|bekr[aä]ftelse))\b/i;
const lead=/\b(?:new lead|lead captured|lead received|uusi liidi|liidi (?:saapuu|tallentuu)|kontaktuppgifter l[aä]mnas|nytt lead)\b/i;
const request=/\b(?:customer request|quote request|booking request|action requested|tarjouspyynt[oö]|ajanvarauspyynt[oö]|asiakaspyynt[oö]|offertf[oö]rfr[aå]gan|bokningsf[oö]rfr[aå]gan|kundf[oö]rfr[aå]gan)\b/i;
const forbidden=/\b(?:send (?:an? )?(?:email|sms|message)|email automatically|charge (?:a|the|customer)|refund automatically|confirm (?:the )?booking|execute (?:javascript|code)|webhook|http request|api call|l[aä]het[aä] (?:s[aä]hk[oö]posti|viesti|tekstiviesti)|veloita|palauta rahat|vahvista varaus automaattisesti|skicka (?:e-?post|sms)|debitera|[aå]terbetala automatiskt)\b/i;
const normalizeTitle=raw=>clean(raw).slice(0,100).replace(/[\x00-\x1f\x7f]/g,'');
const purposeFor=s=>{
 if(/\b(?:booking|bokning|ajanvaraus|varauspyynt)/i.test(s))return 'booking';
 if(/\b(?:refund|return|hyvitys|palautus|[aå]terbetalning)/i.test(s))return 'refund';
 if(/\b(?:payment|maksu|betalning)/i.test(s))return 'payment';
 return 'quote';
};
export function compileWorkflowDescription(input={}){
 const raw=clean(input.description);
 if(raw.length<12||raw.length>600)throw new TypeError('Describe one supported workflow in 12–600 characters');
 // Fold accents so JavaScript ASCII word boundaries also work with FI/SV words.
 const folded=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(forbidden.test(folded))throw new TypeError('External delivery, payments and booking confirmations are not supported');
 const isLead=lead.test(folded),isRequest=request.test(folded);
 if(isLead===isRequest)throw new TypeError('Specify exactly one supported trigger: new lead or customer request');
 const actions=[];
 if(task.test(folded))actions.push({type:'create_task',title:'Review customer request',dueHours:24});
 if(ticket.test(folded))actions.push({type:'open_ticket',title:'Review customer case'});
 if(approval.test(folded))actions.push({type:'request_approval',title:'Owner approval required',purpose:purposeFor(folded)});
 if(!actions.length)throw new TypeError('Specify create task, open ticket or request approval');
 const rule=validateFreeWorkflow({name:normalizeTitle(raw),trigger:isLead?'lead_captured':'action_requested',
  actions,conditions:{},enabled:false});
 return {rule,preview:previewFreeWorkflow(rule,{}),
  supportedActionsOnly:true,requiresExplicitOwnerActivation:true,
  makesExternalCalls:false,automatedLanguageModelUsed:false,
  unsupportedFreeTextNotExecuted:true};
}
