// The host page URL is a hint, never an authority for product facts.
// Resolve a demonstrative question only against this tenant's approved catalog.
// Never fetch the host page, trust client-provided price data or guess stock.
import {approvedProductLinkAnswer,extractCustomerProductUrl} from './product-url-match.mjs';

const PAGE_REFERENCE=/(?:\b(?:tämä|tämän|tästä|tätä|tällä)\s+(?:tuote|tuotteen|tuotetta|tuotteesta|tuotteella)\b|\b(?:den här|det här|denna|detta)\s+(?:produkten|produkt|varan)\b|\b(?:this|the)\s+(?:product|item|one)\b|\b(?:on this page|på den här sidan|tällä sivulla)\b)/i;
const URL_LIMIT=1600;

export function approvedCurrentPageProduct(rows,message,pageContext={},lang='fi',parseProduct){
  if(typeof parseProduct!=='function'||!Array.isArray(rows))return null;
  const question=String(message||'').slice(0,1200);
  if(!PAGE_REFERENCE.test(question)||extractCustomerProductUrl(question))return null;
  const raw=String(pageContext?.url||'').trim().slice(0,URL_LIMIT);
  let page;
  try {
    page=new URL(raw);
    if(!['https:','http:'].includes(page.protocol)||page.username||page.password)return null;
  }catch{return null;}
  // The existing catalog matcher requires a URL exactly matching an approved
  // product. A path/title from pageContext can never create product evidence.
  const result=approvedProductLinkAnswer(rows,question+' '+page.href,lang,parseProduct);
  return result?.sourceIds?.length>0?result:null;
}
