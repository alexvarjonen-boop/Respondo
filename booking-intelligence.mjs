/** Internal deterministic scheduling; no third-party AI. Never confirms reservations. */
const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const time=v=>typeof v==='string'||v instanceof Date?Number.isFinite(new Date(v).getTime())?new Date(v).getTime():null:null;
export function estimateServiceDuration({serviceId,quantity,rules}) {
 const r=Array.isArray(rules)?rules.find(x=>x?.id===serviceId):null;
 if(!r||typeof r.id!=='string'||!integer(r.baseMinutes,0,10080)||!integer(r.minutesPerUnit,0,1440)||
 !integer(r.minUnits??1,1,100000)||!integer(r.maxUnits??10000,r.minUnits??1,100000)||
 !integer(r.roundToMinutes??1,1,1440)||!integer(r.bufferBeforeMinutes??0,0,1440)||
 !integer(r.bufferAfterMinutes??0,0,1440)) return {status:'needs_configuration',reason:'service_duration_rule_missing'};
 if(!integer(quantity,r.minUnits??1,r.maxUnits??10000))
  return {status:'needs_details',reason:'quantity_required',field:'quantity'};
 const workMinutes=Math.ceil((r.baseMinutes+quantity*r.minutesPerUnit)/(r.roundToMinutes??1))*(r.roundToMinutes??1);
 const beforeMinutes=r.bufferBeforeMinutes??0,afterMinutes=r.bufferAfterMinutes??0;
 const totalMinutes=workMinutes+beforeMinutes+afterMinutes;
 if(!integer(totalMinutes,1,10080))return {status:'needs_review',reason:'duration_out_of_range'};
 return {status:'estimated',serviceId,quantity,workMinutes,beforeMinutes,afterMinutes,totalMinutes,requiresApproval:true,ruleVersion:String(r.version??'1')};
}
/** Windows and busy times must be tenant-scoped, verified and absolute timestamps. */
export function findSuitableStarts({estimate,windows,busy=[],requestedStart,stepMinutes=15,now=new Date().toISOString(),availabilityVerified=false,maxResults=20}) {
 if(estimate?.status!=='estimated')return {status:'needs_details',starts:[]};
 if(!availabilityVerified)return {status:'availability_unverified',starts:[]};
 if(!integer(stepMinutes,1,1440)||!integer(maxResults,1,100))return {status:'invalid_configuration',starts:[]};
 const nowMs=time(now);
 if(nowMs===null||!Array.isArray(windows)||!Array.isArray(busy))return {status:'invalid_availability',starts:[]};
 const parse=xs=>xs.map(x=>({start:time(x?.start),end:time(x?.end)}));
 const free=parse(windows),blocked=parse(busy);
 if([...free,...blocked].some(x=>x.start===null||x.end===null||x.end<=x.start))return {status:'invalid_availability',starts:[]};
 const earliest=requestedStart==null?nowMs:time(requestedStart);
 if(earliest===null)return {status:'invalid_request',starts:[]};
 const before=estimate.beforeMinutes*60000,work=estimate.workMinutes*60000,after=estimate.afterMinutes*60000,step=stepMinutes*60000;
 const starts=[];
 for(const w of free.sort((a,b)=>a.start-b.start)){
  let t=Math.ceil(Math.max(w.start+before,earliest,nowMs)/step)*step;
  while(t+work+after<=w.end&&starts.length<maxResults){
   const start=t-before,end=t+work+after,iso=new Date(t).toISOString();
   if(!blocked.some(b=>b.start<end&&b.end>start)&&!starts.includes(iso))starts.push(iso);
   t+=step;
  }
  if(starts.length===maxResults)break;
 }
 return {status:starts.length?'proposals':'no_fit',starts,requiresApproval:true};
}
