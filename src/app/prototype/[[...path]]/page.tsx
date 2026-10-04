'use client';
import {usePathname} from 'next/navigation';
import {Suspense} from 'react';
import {Inquiry} from '@/modules/prototype/pages/inquiry';
import {Quotes} from '@/modules/prototype/pages/quotes';
import {Confirm} from '@/modules/prototype/pages/confirm';
import {PrototypeProvider} from '@/modules/prototype/provider';
import {AppShell} from '@/components/prototype/AppShell';
function Content(){const path=usePathname();return <AppShell>{path.endsWith('/inquiry')?<Inquiry/>:path.endsWith('/quotes')?<Quotes/>:path.endsWith('/confirm')?<Confirm/>:<h1>订单工作区</h1>}</AppShell>;}
export default function Prototype(){return <Suspense fallback={<div className="boot">正在加载原型…</div>}><PrototypeProvider><Content/></PrototypeProvider></Suspense>;}
