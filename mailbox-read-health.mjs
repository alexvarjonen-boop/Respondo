// Proof concerns incoming-message reads only. An OAuth credential and a
// successful read never prove that outgoing mail can be sent.
export function mailboxReadHealth({lastSyncedAt,lastSyncError}={},now=Date.now()) {
  const at=lastSyncedAt?new Date(lastSyncedAt).getTime():NaN;
  if(String(lastSyncError||'').trim())return {readCheck:'failed',readVerifiedAt:Number.isFinite(at)?new Date(at).toISOString():null};
  if(!Number.isFinite(at)||at>now+60000)return {readCheck:'not_tested',readVerifiedAt:null};
  if(now-at>30*60*1000)return {readCheck:'stale',readVerifiedAt:new Date(at).toISOString()};
  return {readCheck:'verified_recently',readVerifiedAt:new Date(at).toISOString()};
}
