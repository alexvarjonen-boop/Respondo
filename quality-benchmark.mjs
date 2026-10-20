// Deterministic, dependency-free response quality checks. No customer data or paid API calls.
export function evaluateResponse({question='',answer='',expectedTerms=[],forbiddenTerms=[],maxLength=3000}={}) {
  const text=String(answer).normalize('NFKC').toLocaleLowerCase();
  const required=expectedTerms.map(x=>String(x).toLocaleLowerCase());
  const forbidden=forbiddenTerms.map(x=>String(x).toLocaleLowerCase());
  const missing=required.filter(x=>!text.includes(x));
  const violations=forbidden.filter(x=>text.includes(x));
  const issues=[];
  if(!String(question).trim())issues.push('empty_question');
  if(!text.trim())issues.push('empty_answer');
  if(text.length>maxLength)issues.push('overlong_answer');
  if(missing.length)issues.push('missing_expected_terms');
  if(violations.length)issues.push('forbidden_terms');
  return {passed:issues.length===0,issues,missing,violations};
}
export function summarizeQuality(cases=[]) {
  const results=cases.map(evaluateResponse);
  const passed=results.filter(x=>x.passed).length;
  return {total:results.length,passed,failed:results.length-passed,passRate:results.length?passed/results.length:null,results};
}
