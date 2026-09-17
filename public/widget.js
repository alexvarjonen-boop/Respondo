(()=>{
 const s=document.currentScript,company=s?.dataset?.company;if(!company)return;
 const origin=new URL(s.src).origin,side=s.dataset.side==='left'?'left':'right',accent=s.dataset.accent||'#3157ff';
 const host=document.createElement('div');Object.assign(host.style,{position:'fixed',zIndex:'2147483646',[side]:'20px',bottom:'20px',fontFamily:'Inter,system-ui,sans-serif'});
 const btn=document.createElement('button');btn.type='button';btn.setAttribute('aria-label','Avaa asiakaspalvelu');btn.innerHTML='Kysy meiltä&nbsp;&nbsp;↗';Object.assign(btn.style,{border:'0',borderRadius:'14px',padding:'13px 16px',background:accent,color:'#fff',fontWeight:'800',cursor:'pointer',boxShadow:'0 18px 45px rgba(0,0,0,.22)'});
 const frame=document.createElement('iframe');frame.src=`${origin}/widget/${encodeURIComponent(company)}`;frame.title='Asiakaspalvelu';Object.assign(frame.style,{width:'min(390px,calc(100vw - 24px))',height:'min(650px,calc(100vh - 96px))',border:'1px solid rgba(0,0,0,.12)',borderRadius:'22px',background:'#fff',boxShadow:'0 28px 80px rgba(0,0,0,.24)',marginBottom:'10px',display:'none'});
 btn.onclick=()=>{const open=frame.style.display==='none';frame.style.display=open?'block':'none';btn.textContent=open?'Sulje':'Kysy meiltä  ↗'};host.append(frame,btn);document.body.append(host);
})();
