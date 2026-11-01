import { randomUUID } from 'node:crypto';
import { advanceMovingIntake, isMainioTenant } from './moving-intake.mjs';

// One row lock serializes messages and makes confirmation idempotent. The
// request and state transition commit together, or neither is persisted.
export async function handleMovingIntake({pool,tenant,threadId,message,lang}) {
 if(!threadId||!isMainioTenant(tenant))return null;
 const client=await pool.connect();
 try {
  await client.query('BEGIN');
  const found=await client.query('SELECT moving_intake,mode,visitor_ref FROM chat_threads WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[threadId,tenant.id]);
  const thread=found.rows[0];
  if(!thread||thread.mode==='human'){await client.query('ROLLBACK');return null;}
  const result=advanceMovingIntake({tenant,state:thread.moving_intake,message,lang});
  if(!result){await client.query('ROLLBACK');return null;}
  if(result.submit){
   const a=result.state.answers;
   await client.query(
    `INSERT INTO action_requests(id,tenant_id,visitor_ref,request_type,status,payload,result,source_channel,external_contact_id)
     VALUES($1,$2,$3,'quote','new',$4::jsonb,$5::jsonb,'website',$3)`,
    [randomUUID(),tenant.id,thread.visitor_ref,JSON.stringify({
     question:'Mainio moving request',fields:{name:a.name,email:a.email,phone:a.phone,details:result.summary},
     moving:a,consent:true,consentText:'Customer explicitly confirmed saving the moving request and contact details for Mainio review.',
     consentAt:new Date().toISOString(),requiresHumanApproval:true,
    }),JSON.stringify({bookingConfirmed:false})],
   );
   // Keep only completion marker in transient state; details are in the request.
   result.state={status:'submitted',lang:result.state.lang};
  }
  await client.query('UPDATE chat_threads SET moving_intake=$1::jsonb,updated_at=NOW() WHERE id=$2 AND tenant_id=$3',[JSON.stringify(result.state),threadId,tenant.id]);
  await client.query('COMMIT');
  return result;
 } catch(error){try{await client.query('ROLLBACK');}catch{} throw error;}
 finally{client.release();}
}
