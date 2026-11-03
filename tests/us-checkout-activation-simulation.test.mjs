import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Synthetic payment-flow integration suite. No Stripe network calls, payments,
// live customers, live database writes, or external emails are made.
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
function extract(start,end) {
 const a=server.indexOf(start),b=server.indexOf(end,a);
 assert.ok(a>=0 && b>a,'missing server segment '+start);
 return server.slice(a,b);
}
const policies=extract("const TAX_CHECKOUT_COUNTRIES = new Set(['FI','US']);","// Applies only to newly created, verified Finnish B2B subscriptions.");
const startCheckout=extract("app.post('/api/auth/start-checkout', checkoutLimiter, async (req, res) => {","app.get('/api/auth/checkout-success', async (req, res) => {");
const checkoutSuccess=extract("app.get('/api/auth/checkout-success', async (req, res) => {","app.post('/api/auth/agent-login', loginLimiter, async (req,res) => {");
const source=policies+'\n'+startCheckout+'\n'+checkoutSuccess;

function harness({country='US',state='CA',taxStatus='active',subscriptionStatus='trialing'}={}) {
  const handlers=new Map(),activity={sql:[],createArgs:null,subscriptionCanceled:[],login:[],taxChecks:0,invoiceTemplate:null,checkoutUpdate:null};
  const stored={userId:null,tenantId:null,email:null,company:null};
  let ids=0,finished=null;
  const trialEnd=1794000000;
  const stateValue={status:taxStatus,defaults:{tax_code:'txcd_10103001'}};
  const stripe={
    tax:{settings:{retrieve:async()=>{activity.taxChecks++;return stateValue;}}},
    checkout:{sessions:{
      create:async(args)=>{
        activity.createArgs=args;
        return {id:'cs_test_us_b2b_simulated_001',url:'https://checkout.stripe.com/c/test/simulated'};
      },
      retrieve:async(id)=>{assert.equal(id,'cs_test_us_b2b_simulated_001');return finished;},
      update:async(id,args)=>{activity.checkoutUpdate={id,args};finished.metadata={...finished.metadata,...args.metadata};}
    }},
    subscriptions:{
      retrieve:async(id)=>{
        assert.equal(id,'sub_test_us_b2b_simulated_001');
        return {id,status:subscriptionStatus,current_period_end:trialEnd};
      },
      cancel:async(id)=>{activity.subscriptionCanceled.push(id);}
    }
  };
  async function query(sql,params=[]){
    activity.sql.push({sql,params});
    if(sql.includes('SELECT id,status,stripe_customer_id,stripe_subscription_id FROM users')) return {rowCount:0,rows:[]};
    if(sql.includes('SELECT 1 FROM tenants WHERE slug='))return {rowCount:0,rows:[]};
    if(sql.includes('INSERT INTO users(')){stored.userId=params[0];stored.email=params[1];return {rowCount:1,rows:[]};}
    if(sql.includes('INSERT INTO tenants(')){stored.tenantId=params[0];stored.company=params[3];return {rowCount:1,rows:[]};}
    if(sql.includes('UPDATE users')&&sql.includes('RETURNING id,email,status,subscription_status')) {
      assert.equal(params[4],stored.userId);
      return {rowCount:1,rows:[{id:stored.userId,email:stored.email,status:'active',subscription_status:subscriptionStatus}]};
    }
    if(sql.includes('UPDATE tenants')&&sql.includes('active=TRUE')){
      assert.equal(params[4],stored.tenantId);
      return {rowCount:1,rows:[]};
    }
    if(sql.includes('UPDATE users SET active_tenant_id='))return {rowCount:1,rows:[]};
    if(['BEGIN','COMMIT','ROLLBACK'].includes(sql))return {rowCount:0,rows:[]};
    throw new Error('Unexpected SQL in US subscription simulation: '+sql.slice(0,110));
  }
  const fakeClient={query,release(){}};
  const ctx={
    process:{env:{NODE_ENV:'test'}},
    app:{
      post(path,...args){handlers.set('POST '+path,args.at(-1));},
      get(path,...args){handlers.set('GET '+path,args.at(-1));}
    },
    checkoutLimiter:()=>{},pool:{connect:async()=>fakeClient},
    stripe, console:{error(){},warn(){}},
    q:query,uid:()=>('simulated-id-'+(++ids)),
    slug:x=>x.toLowerCase().replace(/[^a-z0-9]+/g,'-'),
    normalizeCheckoutPlan:x=>x,normalizeReferralCode:()=>'',isFreeReferralCode:()=>false,
    planAllowsReferral:()=>true,
    setupServiceWebsiteUrl:()=>'',setupGreetingInput:()=>'',validateSetupImageToken:async()=>'',bindSetupImageToSession:async()=>{},
    cleanEmail:x=>String(x||'').trim().toLowerCase(),
    getOauthProfile:()=>null,customerPasswordValid:x=>x==='StrongPass1!',
    signupEmailVerificationReady:()=>false,validSignupVerificationProof:()=>true,
    bcrypt:{hash:async()=> 'simulated-hash'},
    crypto:{randomBytes:()=>({toString:()=> '001122'})},
    ownerTestPlanEnabled:async()=>false,validOwnerTestAccessToken:()=>false,
    stripeCheckoutLineItem:async(plan)=>({price:'price_test_'+plan,quantity:1}),
    assistedSetupCheckoutTrial:(setup)=>setup?{trial_period_days:365}:{trial_period_days:3},
    ownerFreeSetupCheckoutLineItem:()=>null,setupServiceCheckoutLineItem:()=>({price_data:{currency:'eur',unit_amount:19900},quantity:1}),
    checkoutTaxExemptionMessage:()=> 'Seller is not VAT-registered',
    assistedSetupCheckoutNotice:()=> 'Setup charge',
    BASE:'https://www.respondoai.fi',
    SIGNUP_VERIFY_PROOF_COOKIE:'verify',SIGNUP_CHECKOUT_COOKIE:'checkout',OAUTH_PROFILE_COOKIE:'oauth',
    JWT:'unit-test-secret',COOKIE:'session',
    jwt:{sign:x=>JSON.stringify(x),verify:x=>JSON.parse(x)},
    cookies:req=>req.testCookies||{},
    setSession:(res,user)=>{activity.login.push(user);},
    resolveSignupCheckoutTarget:async session=>({userId:stored.userId,tenantId:stored.tenantId,user:{}}),
    ensureReferralCode:async()=>{},
    applyReferralDiscountIfEligible:async()=>{},
    sendWelcomeEmailOnce:async()=>{},
    notifySetupServiceAfterCheckout:async()=>({customerSent:true}),
    closeOwnerTestPlan:async()=>{},
    consumeOwnerFreeCode:async()=>{}
  };
  vm.runInNewContext(source,ctx,{timeout:3000});
  function res() {
    return {statusCode:200,body:null,to:null,setCookies:{},cleared:[],
      status(n){this.statusCode=n;return this;},
      json(body){this.body=body;return this;},
      cookie(name,value){this.setCookies[name]=value;return this;},
      clearCookie(name){this.cleared.push(name);return this;},
      redirect(dest){this.to=dest;return this;}
    };
  }
  const buyer={
    email:'us-b2b-simulated@example.invalid',fullName:'Simulation',
    companyName:'Simulation LLC',businessId:'12-3456789',
    password:'StrongPass1!',plan:'basic_monthly',acceptedTerms:true,
    billingCountry:country,billingState:state,businessPurchase:true,
    setupService:false,language:'en'
  };
  async function begin(override={}) {
    const response=res();
    await handlers.get('POST /api/auth/start-checkout')({body:{...buyer,...override}},response);
    return response;
  }
  function complete({actualCountry=country,actualState=state,autoTax,customerId='cus_test_simulated',status='complete'}={}) {
    assert.ok(activity.createArgs,'Must start a simulated checkout before completing it');
    finished={
      id:'cs_test_us_b2b_simulated_001',mode:'subscription',status,
      customer:customerId,subscription:'sub_test_us_b2b_simulated_001',
      customer_details:{address:{country:actualCountry,state:actualState}},
      automatic_tax:{enabled:autoTax===undefined?activity.createArgs.automatic_tax.enabled:autoTax},
      metadata:{...activity.createArgs.metadata}
    };
    return finished;
  }
  async function activate(responseCookies) {
    const response=res();
    const req={query:{session_id:'cs_test_us_b2b_simulated_001'},
      testCookies:{checkout:responseCookies.checkout}};
    await handlers.get('GET /api/auth/checkout-success')(req,response);
    return response;
  }
  return {activity,stored,begin,complete,activate};
}

test('US first signup constructs a 3-day trial with Stripe Tax and both jurisdiction metadata copies',async()=>{
  const h=harness();
  const response=await h.begin();
  assert.equal(response.statusCode,200);
  assert.match(response.body.url,/checkout\.stripe\.com/);
  const p=h.activity.createArgs;
  assert.equal(p.mode,'subscription');
  assert.equal(p.automatic_tax.enabled,true);
  assert.equal(p.subscription_data.trial_period_days,3);
  assert.equal(p.tax_id_collection.enabled,true);
  assert.equal(p.billing_address_collection,'required');
  assert.equal(p.line_items.length,1);
  assert.equal(p.line_items[0].quantity,1);
  assert.equal(p.metadata.tax_country_policy,'us-b2b-tax-20261103');
  assert.equal(p.metadata.billing_country,'US');
  assert.equal(p.metadata.billing_state,'CA');
  assert.equal(p.subscription_data.metadata.billing_state,'CA');
  assert.equal(p.subscription_data.metadata.business_purchase,'1');
  assert.equal(h.activity.taxChecks,1);
  assert.equal(h.activity.sql.some(x=>x.sql.includes('INSERT INTO users(')),true);
  assert.equal(h.activity.sql.some(x=>x.sql.includes('INSERT INTO tenants(')),true);
});

test('correct US Checkout completion activates the pending user and company without a real payment',async()=>{
  const h=harness();
  const started=await h.begin();
  h.complete();
  const result=await h.activate(started.setCookies);
  assert.equal(result.to,'/app?welcome=1');
  assert.equal(h.activity.login.length,1);
  assert.equal(h.activity.login[0].status,'active');
  assert.equal(h.activity.sql.some(x=>x.sql.includes('UPDATE tenants')&&x.sql.includes('active=TRUE')),true);
  assert.equal(h.activity.checkoutUpdate.args.metadata.auto_login_used,'1');
  assert.equal(h.activity.subscriptionCanceled.length,0);
});

test('US state mismatch cancels simulated subscription and never activates account',async()=>{
  const h=harness();
  const started=await h.begin();
  h.complete({actualState:'NY'});
  const result=await h.activate(started.setCookies);
  assert.equal(result.to,'/tilaus?country_not_supported=1');
  assert.deepEqual(h.activity.subscriptionCanceled,['sub_test_us_b2b_simulated_001']);
  assert.equal(h.activity.login.length,0);
  assert.equal(h.activity.sql.some(x=>x.sql.includes('UPDATE tenants')&&x.sql.includes('active=TRUE')),false);
});

test('US unavailable tax engine blocks checkout before any pending account is created',async()=>{
  const h=harness({taxStatus:'pending'});
  const result=await h.begin();
  assert.notEqual(result.statusCode,200);
  assert.equal(h.activity.createArgs,null);
  assert.equal(h.activity.sql.some(x=>x.sql.includes('INSERT INTO users(')),false);
});

test('invalid EIN and state cannot create US sessions',async()=>{
  const h=harness();
  for(const override of [{businessId:'wrong'},{billingState:'XX'},{businessPurchase:false}]) {
    const result=await h.begin(override);
    assert.equal(result.statusCode,422);
  }
  assert.equal(h.activity.createArgs,null);
  assert.equal(h.activity.taxChecks,0);
});

test('Finnish signup retains disabled automatic tax and does not require US state or tax engine',async()=>{
  const h=harness({country:'FI',state:'',taxStatus:'pending'});
  const result=await h.begin({businessId:'3599437-5'});
  assert.equal(result.statusCode,200);
  assert.equal(h.activity.createArgs.automatic_tax.enabled,false);
  assert.equal(h.activity.createArgs.subscription_data.trial_period_days,3);
  assert.equal(h.activity.taxChecks,0);
});

test('US optional assisted setup has two visible checkout items and deferred trial marker',async()=>{
  const h=harness();
  const result=await h.begin({setupService:true});
  assert.equal(result.statusCode,200);
  const p=h.activity.createArgs;
  assert.equal(p.line_items.length,2);
  assert.equal(p.line_items[1].price_data.unit_amount,19900);
  assert.equal(p.subscription_data.metadata.setup_billing_mode,'after_handover');
  assert.equal(p.subscription_data.trial_period_days,365);
});

test('a completed checkout cannot be auto-logged in again using the consumed session metadata',async()=>{
  const h=harness();
  const started=await h.begin();
  h.complete();
  const first=await h.activate(started.setCookies);
  assert.equal(first.to,'/app?welcome=1');
  const second=await h.activate(started.setCookies);
  assert.equal(second.to,'/kirjaudu?checkout_error=1');
});
