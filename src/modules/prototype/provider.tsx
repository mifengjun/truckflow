'use client';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {createInitialState,type PrototypeState,type InquiryDraft} from './model';
import {loadState,STORAGE_KEY} from './storage';
import type {Scenario} from './mock-adapter';
type Context={state:PrototypeState;setState:(fn:(s:PrototypeState)=>PrototypeState)=>void;updateDraft:(draft:InquiryDraft)=>void;scenario:Scenario;setScenario:(s:Scenario)=>void;reset:()=>void;storageError:boolean};
const PrototypeContext=createContext<Context|null>(null);
export function PrototypeProvider({children}:{children:ReactNode}){const [state,setState]=useState(createInitialState);const [ready,setReady]=useState(false);const [storageError,setStorageError]=useState(false);const [scenario,setScenario]=useState<Scenario>('default');const [client]=useState(()=>new QueryClient());const skipWrite=useRef(true);
 useEffect(()=>{try{setState(loadState(localStorage.getItem(STORAGE_KEY)));}catch{setStorageError(true);}setReady(true);},[]);
 useEffect(()=>{if(!ready)return;if(skipWrite.current){skipWrite.current=false;return;}try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{setStorageError(true);}},[state,ready]);
 function updateDraft(draft:InquiryDraft){setState(s=>({...s,draft:{...draft,revision:s.draft.revision+1}}));}
 function reset(){setState(createInitialState());setScenario('default');}
 if(!ready)return <div className="boot" role="status">正在恢复示例工作区…</div>;
 return <QueryClientProvider client={client}><PrototypeContext value={{state,setState,updateDraft,scenario,setScenario,reset,storageError}}>{children}</PrototypeContext></QueryClientProvider>;
}
export function usePrototype(){const context=useContext(PrototypeContext);if(!context)throw new Error('PrototypeProvider missing');return context;}
