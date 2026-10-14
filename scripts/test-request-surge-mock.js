#!/usr/bin/env node
// Complete YouTube request bundle execution with Surge argument/store mocks.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../vendor/dualsubs/YouTube.request.bundle.js'),'utf8');
(async()=>{
 let count=0;
 for(const type of ['Translate','Official']) for(const source of ['en','ja','zh-TW']) for(const tlang of ['ZH-HANT','zh-TW','en',null]) {
  const root={YouTube:{Settings:{Languages:['AUTO','ZH-HANT'],Type:type,ShowOnly:false,AutoCC:true},Caches:{tlang:'zh-TW'}}};
  const store={DualSubs:JSON.stringify(root)}, logs=[];
  let done;
  const complete=new Promise(resolve=>done=resolve);
  const context={URL,$script:{startTime:Date.now()/1000},console:{log:(...x)=>logs.push(x.join(' '))},setTimeout,clearTimeout,
   $environment:{'surge-version':'mock'},
   $argument:'ForceSimplifiedChinese="true"&Languages[0]="AUTO"&Languages[1]="ZH-HANS"&Storage="PersistentStore"&LogLevel="ERROR"',
   $request:{method:'GET',url:`https://www.youtube.com/api/timedtext?v=test&lang=${source}${tlang?'&tlang='+tlang:''}`,headers:{Cookie:'mock'}},
   $persistentStore:{read:key=>store[key]??null,write:(value,key)=>{store[key]=value;return true}},
   $done:done,
   $httpClient:{get:()=>{throw Error('Unexpected network I/O')}}};
  vm.runInNewContext(script,context,{timeout:10000});
  const result=await Promise.race([complete,new Promise((_,reject)=>{const t=setTimeout(()=>reject(Error('No $done')),1000);t.unref()})]);
  assert.ok(result?.url,'request not returned');
  const out=new URL(result.url);
  assert.equal(out.searchParams.get('lang'),source);
  assert.equal(out.searchParams.get('subtype'),type);
  assert.equal(out.searchParams.get('tlang'),type==='Official'?'zh-Hans':null);
  assert.equal(JSON.parse(store.DualSubs).YouTube.Caches.tlang,'zh-Hans');
  assert.ok(!logs.some(s=>s.includes('❌')),logs.join('\n'));
  count++;
 }
 console.log(`PASS ${count} complete YouTube request bundle cases with Surge mock, actual argument parsing and PersistentStore merging`);
})().catch(e=>{console.error(e.message);process.exit(1)});
