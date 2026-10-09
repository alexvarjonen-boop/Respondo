// Reusable, dark Respondo AI transactional email shell. Keep email-client-safe table markup.
export function brandedEmailHtml({language='fi',eyebrow='',title='',content=''}) {
  const lang=['fi','sv','en'].includes(language)?language:'fi';
  const esc=(v)=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const origin='https://respondoai.fi';
  const footerItems=[
    ['/',lang==='sv'?'Webbplats':lang==='en'?'Website':'Verkkosivut'],
    ['/tietosuoja',lang==='sv'?'Integritet':lang==='en'?'Privacy':'Tietosuoja'],
    ['/kayttoehdot',lang==='sv'?'Villkor':lang==='en'?'Terms':'Käyttöehdot'],
    ['/yhteystiedot',lang==='sv'?'Kontakt':lang==='en'?'Contact':'Yhteystiedot']
  ];
  const footerLinks=footerItems.map(([route,label])=>`<a href="${esc(origin+route)}" style="display:inline-block;color:#c0c5d0;text-decoration:underline;font-size:12px;line-height:26px;margin:0 8px 0 0">${esc(label)}</a>`).join(' ');
  const disclaimer=lang==='sv'?'Detta är ett automatiskt servicemeddelande från Respondo AI.':lang==='en'?'This is an automated service message from Respondo AI.':'Tämä on Respondo AI:n automaattinen palveluviesti.';
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(title)}</title><style>html,body{margin:0!important;padding:0!important;background-color:#242426!important}a{color:#83b6ff} @media only screen and (max-width:600px){.mail-outer{padding:20px 12px!important}.mail-main{padding:26px 23px 28px!important}.mail-header{padding:22px 23px!important}.mail-footer{padding:22px 23px!important}.mail-title{font-size:27px!important;line-height:1.21!important}.mail-logo{width:38px!important;height:38px!important}}</style></head><body bgcolor="#242426" style="margin:0;padding:0;background-color:#242426;color:#f7f8fa;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#242426" style="border-spacing:0;background-color:#242426"><tr><td class="mail-outer" align="center" style="padding:36px 16px 46px;background-color:#242426">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#303032" style="max-width:600px;border-spacing:0;background-color:#303032;border:1px solid #414145;border-radius:16px">
<tr><td class="mail-header" bgcolor="#303032" style="padding:25px 32px;border-bottom:1px solid #48484c;background-color:#303032"><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td style="padding:0;vertical-align:middle"><img class="mail-logo" src="${origin}/respondo-email-logo.png" alt="" width="44" height="44" style="display:block;width:44px;height:44px;border:0;border-radius:11px"></td><td style="padding:0 0 0 13px;vertical-align:middle;font-size:20px;font-weight:700;letter-spacing:-0.5px;color:#ffffff">Respondo AI</td></tr></table></td></tr>
<tr><td class="mail-main" bgcolor="#303032" style="padding:38px 34px 40px;background-color:#303032">
${eyebrow?`<div style="font-size:12px;font-weight:800;letter-spacing:1.9px;text-transform:uppercase;color:#7caaff;margin:0 0 20px">${esc(eyebrow)}</div>`:''}
<h1 class="mail-title" style="font-size:31px;line-height:1.23;letter-spacing:-0.75px;margin:0 0 27px;font-weight:800;color:#ffffff">${esc(title)}</h1>${content}</td></tr>
<tr><td class="mail-footer" bgcolor="#29292b" style="padding:23px 34px 28px;border-top:1px solid #48484c;background-color:#29292b;color:#aeb4c0;font-size:12px;line-height:1.7">
<div style="margin:0 0 9px">${footerLinks}</div>
<div style="color:#afb4bf">${esc(disclaimer)}</div><div style="margin:7px 0 0;color:#afb4bf">© ${new Date().getUTCFullYear()} Respondo AI · <a href="${origin}/" style="color:#b9c1d1;text-decoration:none">respondoai.fi</a></div>
</td></tr></table></td></tr></table></body></html>`;
}
