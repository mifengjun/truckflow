import {it,expect} from 'vitest';
import {loadState} from '../../src/modules/prototype/storage';
import {createInitialState} from '../../src/modules/prototype/model';
it('损坏和不兼容存储恢复默认，合法草稿保留',()=>{for(const raw of ['{broken','{}','{"version":1,"orders":[]}'])expect(loadState(raw).draft.destination.address).toBe('2200 Logistics Way, Dallas, TX 75201');const s=createInitialState();s.draft.destination.address='客户修改地址';expect(loadState(JSON.stringify(s)).draft.destination.address).toBe('客户修改地址');});
