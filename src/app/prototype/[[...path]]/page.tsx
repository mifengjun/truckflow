'use client';
import {usePathname} from 'next/navigation';
import {Suspense} from 'react';
import {Orders} from '@/modules/prototype/pages/orders';
import {Detail} from '@/modules/prototype/pages/detail';
import {Inquiry} from '@/modules/prototype/pages/inquiry';
import {Quotes} from '@/modules/prototype/pages/quotes';
import {Confirm} from '@/modules/prototype/pages/confirm';
import {PrototypeProvider} from '@/modules/prototype/provider';
import {AppShell} from '@/components/prototype/AppShell';
function Content(){const path=usePathname();const id=path.match(/\/orders\/(.+)$/)?.[1];const admin=path.includes('/admin');return <AppShell>{path.endsWith('/inquiry')?<Inquiry/>:path.endsWith('/quotes')?<Quotes/>:path.endsWith('/confirm')?<Confirm/>:id?<Detail key={path} id={id} admin={admin}/>:<Orders admin={admin}/>}</AppShell>;}
export default function Prototype(){return <Suspense fallback={<div className="boot">正在加载原型…</div>}><PrototypeProvider><Content/></PrototypeProvider></Suspense>;}
