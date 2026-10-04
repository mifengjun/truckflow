import {generateQuotes,type InquiryDraft} from './model';
export type Scenario='default'|'loading'|'empty'|'error'|'denied'|'long'|'partial'|'expired'|'carrier-success'|'carrier-failed'|'carrier-timeout';
export async function fetchMockQuotes(draft:InquiryDraft,scenario:Scenario){await new Promise(r=>setTimeout(r,650));if(scenario==='error')throw new Error('报价服务暂时无法连接，请重试。');if(scenario==='empty')return [];const quotes=generateQuotes(draft,Date.now());if(scenario==='expired')return quotes.map(q=>({...q,expiresAt:Date.now()-1000}));return scenario==='partial'?quotes.slice(0,2):quotes;}
