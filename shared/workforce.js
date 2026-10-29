// Workforce shared integration and validation helpers.
export const MODEL = 'nvidia/nemotron-3-super-120b-a12b';
export const SCENARIO_DATE = '2026-10-28';
export const ENDPOINT = 'https://api.tokenfactory.nebius.com/v1/chat/completions';
export const SOURCES = [
  {id:'easylaw-study-work',title:'After study: employment and stay status',publisher:'Ministry of Government Legislation · Easy Law',url:'https://easylaw.go.kr/CSP/CnpClsMainBtr.laf?ccfNo=4&cciNo=1&cnpClsNo=1&csmSeq=2853&popMenu=ov',reviewed_at:'2026-10-28',kind:'reviewed_summary',summary:'The student guidance distinguishes employment and job-seeking routes after study. It refers to status-specific documents; this is not a complete checklist or an individual eligibility determination.',scope:['WF-001']},
  {id:'hikorea-address',title:'Address-change reporting guide',publisher:'Ministry of Justice · Hi Korea',url:'https://www.hikorea.go.kr/board/BoardNtcDetailR.pt?BBS_GB_CD=BS10&BBS_SEQ=1&NTCCTT_SEQ=1734',reviewed_at:'2026-10-28',kind:'official_link_only',summary:'Official notice links to the address-reporting manual and advises checking current information with 1345. The attached HWP was not parsed; no reporting deadline is inferred.',scope:['WF-003']},
  {id:'immigration-1345',title:'Immigration Contact Center · 1345',publisher:'Ministry of Justice · Korea Immigration Service',url:'https://www.immigration.go.kr/immigration_eng/1862/subview.do',reviewed_at:'2026-10-28',kind:'reviewed_summary',summary:'Official multilingual counseling route for immigration and living-in-Korea questions. Ask about the exact status, procedure and personal circumstances.',scope:['WF-001','WF-002','WF-003']},
];
export function todayKST() { return new Date(Date.now()+9*3600000).toISOString().slice(0,10); }
export function draftIssue(value) {
  if(!value || Object.keys(value).sort().join()!=='en')return 'language_keys';
  if(typeof value.en!=='string'||value.en.trim().length<20||value.en.length>1800)return 'en_length';
  if(/[<>]|https?:\/\/|\b(?:sk-|nvapi-)|\b\d{6}[- ]?\d{7}\b|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/i.test(value.en))return 'en_unsafe_content';
  if(/[\u0e00-\u0e7f\u0400-\u04ff\u4e00-\u9fff\uac00-\ud7af]/.test(value.en))return 'en_mixed_script';
  if(/\b(?:do not|don't|must not|never)\s+(?:initiate|submit|file|start|make|apply)\b|\b(?:wait|hold off|refrain)\b[^.\n]{0,70}\b(?:HR|application|filing|submit|apply)\b|\bHR(?:['’]s)?\s+final\s+(?:determination|decision|approval)\b/i.test(value.en))return 'en_unsupported_instruction';
  if(/\b(?:visa|status|residence|stay|permit)\b[^.\n]{0,60}\b(?:is valid|valid until|authori[sz]ed|eligible|has been approved)\b/i.test(value.en))return 'en_status_claim';
  return null;
}
export function safeDraft(value) { return draftIssue(value)===null; }
export async function digest(value) { const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(typeof value==='string'?value:JSON.stringify(value)));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join(''); }
