import {createInitialState,stateSchema,type PrototypeState} from './model';
export const STORAGE_KEY='truckflow.prototype.v1';
export function loadState(raw:string|null):PrototypeState{try{return stateSchema.parse(JSON.parse(raw??''));}catch{return createInitialState();}}
