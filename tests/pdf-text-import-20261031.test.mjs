import test from 'node:test';
import assert from 'node:assert/strict';
import {mediaTextFromBytes,documentAsPage} from '../web-document-import.mjs';
import {extractBusinessDocument,essentialWebsiteCandidates} from '../website-knowledge.mjs';

// A tiny in-memory PDF fixture; no external PDF, credentials or network calls.
function pdfFixture(){
  const line='BT /F1 14 Tf 72 710 Td (Renkaanvaihto 49 EUR) Tj ET';
  const objects=[
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length '+Buffer.byteLength(line)+' >>\nstream\n'+line+'\nendstream',
  ];
  let doc='%PDF-1.4\n';
  const offsets=[0];
  objects.forEach((item,i)=>{
    offsets.push(Buffer.byteLength(doc));
    doc+=(i+1)+' 0 obj\n'+item+'\nendobj\n';
  });
  const offset=Buffer.byteLength(doc);
  doc+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';
  doc+=offsets.slice(1).map(x=>String(x).padStart(10,'0')+' 00000 n \n').join('');
  doc+='trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+offset+'\n%%EOF\n';
  return Buffer.from(doc,'utf8');
}

test('actual PDF bytes are parsed to sourced pricing facts',async()=>{
  const content=await mediaTextFromBytes(pdfFixture(),'pdf');
  assert.match(content,/Renkaanvaihto 49 EUR/,content.slice(0,1200));
  const url='https://shop.example/hinnasto.pdf';
  const asPage=documentAsPage(content+'\nTarkista hinnat verkkosivuiltamme.',url);
  assert.ok(asPage);
  const page=extractBusinessDocument(asPage.html,url);
  const facts=essentialWebsiteCandidates({finalUrl:'https://shop.example/',pageDocuments:[page],products:[]});
  assert.ok(facts.some(x=>x.category==='Hinnat'&&/49 EUR/.test(x.answer)),JSON.stringify(facts));
});
