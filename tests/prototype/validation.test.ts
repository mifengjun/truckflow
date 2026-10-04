import {it,expect} from 'vitest';
import {inquirySchema} from '../../src/modules/prototype/validation';
import {createInitialState,generateQuotes} from '../../src/modules/prototype/model';
it('拒绝缺失收货地址、零数量、负数及非数值重量',()=>{for(const change of [(d:ReturnType<typeof createInitialState>['draft'])=>{d.destination.address='';},(d:ReturnType<typeof createInitialState>['draft'])=>{d.goods[0].quantity=0;},(d:ReturnType<typeof createInitialState>['draft'])=>{d.goods[0].weight=-1;},(d:ReturnType<typeof createInitialState>['draft'])=>{d.goods[0].weight=NaN;}]){const d=createInitialState().draft;change(d);expect(inquirySchema.safeParse(d).success).toBe(false);}});
it('附加服务计入整数费用，报价总额无浮点误差',()=>{const d=createInitialState().draft;d.services=['appointment','liftgate'];const quote=generateQuotes(d,1801560000000)[0];expect(quote.amountMinor).toBe(42500);expect(quote.fees.map(f=>f.amountMinor)).toEqual([28500,4500,6500,3000]);});
