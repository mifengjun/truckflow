import {z} from 'zod';
export const addressSchema=z.object({name:z.string(),contact:z.string(),address:z.string(),type:z.enum(['commercial','residential'])});
export const goodsSchema=z.object({id:z.string(),name:z.string(),sku:z.string(),hs:z.string(),quantity:z.number(),weight:z.number(),value:z.number(),dangerous:z.boolean()});
export const draftShape=z.object({revision:z.number().int(),customer:z.string(),mode:z.enum(['LTL','FTL','PTL']),origin:addressSchema,destination:addressSchema,date:z.string(),reference:z.string(),goods:z.array(goodsSchema),packaging:z.enum(['own','warehouse','carton']),pallets:z.number(),length:z.number(),width:z.number(),height:z.number(),palletWeight:z.number(),services:z.array(z.string()),notes:z.string()});
export type InquiryDraft=z.infer<typeof draftShape>;
export const quoteSchema=z.object({id:z.string(),carrier:z.string(),days:z.string(),draftRevision:z.number(),expiresAt:z.number(),amountMinor:z.number().int(),currency:z.literal('USD'),fees:z.array(z.object({name:z.string(),amountMinor:z.number().int()}))});
export type Quote=z.infer<typeof quoteSchema>;
export const resultSchema=z.enum(['pending','accepted','uncertain','failed']);
export type OrderResult=z.infer<typeof resultSchema>;
export const orderSchema=z.object({id:z.string(),intentId:z.string(),draft:draftShape,quote:quoteSchema,result:resultSchema,fulfillment:z.enum(['unassigned','pickup','transit','delivered']),createdAt:z.string(),tracking:z.string(),events:z.array(z.object({at:z.string(),actor:z.string(),text:z.string()}))});
export type PrototypeOrder=z.infer<typeof orderSchema>;
export const stateSchema=z.object({version:z.literal(1),draft:draftShape,quotes:z.array(quoteSchema),orders:z.array(orderSchema)});
export type PrototypeState=z.infer<typeof stateSchema>;
export const services=[{id:'liftgate',name:'尾板服务',description:'装卸地点无月台时使用',amount:6500},{id:'appointment',name:'预约派送',description:'派送前协调收货时间',amount:3000},{id:'inside',name:'室内搬运',description:'搬运至约定的室内区域',amount:7500},{id:'residential',name:'住宅派送',description:'适用于住宅收货地址',amount:8500}];
export const resultLabels:Record<OrderResult,string>={pending:'待审核',accepted:'已接单',uncertain:'结果待确认',failed:'提交失败'};
export const fulfillmentLabels={unassigned:'未安排',pickup:'待提货',transit:'运输中',delivered:'已签收'};
export function generateQuotes(draft:InquiryDraft,now:number):Quote[]{return [{carrier:'Estes Express',days:'3–4 个工作日',base:28500},{carrier:'Old Dominion',days:'2–3 个工作日',base:33200},{carrier:'XPO Logistics',days:'3–5 个工作日',base:30100}].map((c,i)=>{const fees=[{name:'基础运费',amountMinor:c.base},{name:'燃油附加费',amountMinor:4500},...services.filter(s=>draft.services.includes(s.id)).map(s=>({name:s.name,amountMinor:s.amount}))];return {id:`Q-${draft.revision}-${now}-${i}`,carrier:c.carrier,days:c.days,draftRevision:draft.revision,expiresAt:now+1800000,amountMinor:fees.reduce((sum,f)=>sum+f.amountMinor,0),currency:'USD',fees};});}
export function createInitialState():PrototypeState{
 const draft:InquiryDraft={revision:0,customer:'星航跨境 · 示例客户',mode:'LTL',origin:{name:'洛杉矶一号仓',contact:'Alex · +1 213 555 0100',address:'1850 Warehouse Avenue, Los Angeles, CA 90021',type:'commercial'},destination:{name:'Dallas Distribution Center',contact:'Chris · +1 214 555 0136',address:'2200 Logistics Way, Dallas, TX 75201',type:'commercial'},date:'2026-10-08',reference:'PO-20261004-01',goods:[{id:'g-1',name:'家居收纳用品',sku:'HOME-BOX-01',hs:'392490',quantity:48,weight:680,value:2400,dangerous:false}],packaging:'own',pallets:2,length:48,width:40,height:52,palletWeight:35,services:['appointment'],notes:''};
 const statuses:PrototypeOrder['fulfillment'][]=['unassigned','pickup','transit','delivered','unassigned','pickup','transit'];
 const orders:PrototypeOrder[]=statuses.map((fulfillment,i)=>{const q=generateQuotes(draft,1791072000000)[i%3];const result:OrderResult=i===0?'pending':i===4?'uncertain':'accepted';return {id:`TF-261004-${String(1078-i).padStart(4,'0')}`,intentId:`seed-${i}`,draft:structuredClone(draft),quote:q,result,fulfillment,createdAt:`2026-10-0${4-i%3}T09:30:00-07:00`,tracking:result==='accepted'?`DEMO-${801024+i}`:'',events:[{at:'2026-10-04T09:30:00-07:00',actor:'客户',text:'示例订单已创建'},...(result==='accepted'?[{at:'2026-10-04T10:05:00-07:00',actor:'运营',text:'承运商已接单（示例）'}]:[])]};});
 return {version:1,draft,quotes:[],orders};
}
export function submitOrder(state:PrototypeState,quoteId:string,intentId:string,now:number):PrototypeState{
 if(state.orders.some(o=>o.intentId===intentId))return state;
 const quote=state.quotes.find(q=>q.id===quoteId);
 if(!quote||quote.expiresAt<=now||quote.draftRevision!==state.draft.revision)throw new Error('报价已失效，请重新获取报价。');
 if(state.draft.mode!=='LTL')throw new Error('该运输方式尚未开放演示报价。');
 const order:PrototypeOrder={id:`TF-${now.toString(36).toUpperCase()}`,intentId,draft:structuredClone(state.draft),quote:structuredClone(quote),result:'pending',fulfillment:'unassigned',createdAt:new Date(now).toISOString(),tracking:'',events:[{at:new Date(now).toISOString(),actor:'客户',text:'订单已创建，等待资料审核'}]};
 return {...state,orders:[order,...state.orders]};
}
export function updateOrderResult(state:PrototypeState,orderId:string,result:OrderResult):PrototypeState{
 return {...state,orders:state.orders.map(o=>{if(o.id!==orderId||o.result===result||o.result==='accepted')return o;return {...o,result,fulfillment:result==='accepted'?'pickup':o.fulfillment,tracking:result==='accepted'?`DEMO-${o.id}`:o.tracking,events:[...o.events,{at:new Date().toISOString(),actor:'运营 · 示例',text:result==='accepted'?'确认承运商已接单':result==='uncertain'?'请求超时，等待核实承运商结果':result==='failed'?'承运商拒绝受理，请核对资料后重试':'资料已重新提交审核'}]};})};
}
export function money(minor:number){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(minor/100);}
export function localDate(value:string){return new Intl.DateTimeFormat('zh-CN',{timeZone:'America/Los_Angeles',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));}
