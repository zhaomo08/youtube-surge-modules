#!/usr/bin/env node
// Node VM is a Surge-global mock, not Surge/WebView or a real client capture.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const cp=require('node:child_process'),path=require('node:path');
const root=path.join(__dirname,'..');
const current=fs.readFileSync(path.join(root,'modules/YouTube.Combined.optimized.sgmodule'),'utf8');
const before=cp.execFileSync('git',['show','004ab27:modules/YouTube.Combined.optimized.sgmodule'],{cwd:root,encoding:'utf8'});
function rules(text){return text.split('\n').filter(x=>x.includes(' = type=http-')).map(x=>({name:x.split(' = ')[0],type:x.match(/type=([^,]+)/)[1],regex:new RegExp(x.match(/pattern=(.*?), (?:requires-body|engine|script-path)=/)[1]),line:x}));}
const old=rules(before),now=rules(current);
const matches=(rs,type,url)=>rs.filter(r=>r.type===type&&r.regex.test(url));
const winner=(rs,type,url)=>matches(rs,type,url)[0]?.name;
let routes=0;
for(const scheme of ['http','https']) for(const host of ['youtubei.googleapis.com','www.youtube.com','m.youtube.com','tv.youtube.com','music.youtube.com']) for(const endpoint of ['player','get_watch','browse','next','search','reel/reel_watch_sequence','guide','account/get_setting','log_event','config']) for(const query of ['','?key=x','?key=x&subtype=Translate','?subtype=Translate&key=x']) {
 const url=`${scheme}://${host}/youtubei/v1/${endpoint}${query}`;
 for(const type of ['http-request','http-response']){assert.equal(winner(now,type,url),winner(old,type,url),url);routes++;}
}
for(const endpoint of ['player','get_watch','browse?subtype=Translate']){
 const url='https://youtubei.googleapis.com/youtubei/v1/'+endpoint;
 assert.equal(matches(now,'http-response',url).length,1,url);
 assert.equal(winner(now,'http-response',url),'YouTubeAd.Enhance.response');
}
for(const host of ['www','m']) for(const subtype of ['Translate','Official','External']) for(const query of [`subtype=${subtype}`,`v=x&subtype=${subtype}`,`subtype=${subtype}&v=x`,`v=x&subtype=${subtype}&lang=en`]){
 const url=`https://${host}.youtube.com/api/timedtext?${query}`;
 assert.equal(winner(now,'http-response',url),winner(old,'http-response',url));routes++;
}
for(const query of ['xsubtype=Translate','subtype=TranslateExtra','x=subtype=Translate','subtype=OfficialExtra','subtype=ExternalExtra']){
 const url='https://www.youtube.com/api/timedtext?'+query;
 assert.ok(winner(old,'http-response',url));assert.equal(winner(now,'http-response',url),undefined);routes++;
}
const dualArgs='ForceSimplifiedChinese="true"&Type="Translate"&Types="Translate"&Languages[0]="AUTO"&Languages[1]="ZH-HANS"&Storage="PersistentStore"&LogLevel="ERROR"';
for(const r of now.filter(r=>r.name.startsWith('DualSubs'))){assert.ok(r.line.includes('ForceSimplifiedChinese="true"'));for(const key of ['Type','Types','Languages[0]','Languages[1]','Storage','LogLevel'])assert.ok(r.line.includes(`${key}="{{{${key}}}}"`));}
async function run(file,{url,body,request=false,contentType='application/protobuf',argument=dualArgs,network}){
 const logs=[],store={DualSubs:JSON.stringify({YouTube:{Settings:{Languages:['AUTO','ZH-HANT'],Type:'Translate',AutoCC:true},Caches:{tlang:'zh-TW'}}})};
 let calls=0,resolve;
 const done=new Promise(r=>resolve=r);
 const headers={'Content-Type':contentType,'X-Keep':'yes'};
 const input={status:200,headers:{...headers},body};
 const context={URL,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,setTimeout,clearTimeout,
  console:{log:(...xs)=>logs.push(xs.join(' '))},$environment:{'surge-version':'mock'},$script:{startTime:Date.now()/1000},$argument:argument,
  $request:{url,method:request?'POST':'GET',headers:{'User-Agent':'YouTube/Mock',...(request?headers:{})},...(request?{body}:{})},
  $response:input,$persistentStore:{read:k=>store[k]??null,write:(v,k)=>{store[k]=v;return true}},
  $notification:{post:()=>{throw Error('Unexpected notification')}},$httpClient:{get:network??(()=>{throw Error('Unexpected network')})},
  $done:r=>{calls++;resolve(r??{})}};
 vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),context,{timeout:10000});
 let timer;const result=await Promise.race([done,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('missing $done')),1500))]);clearTimeout(timer);
 await new Promise(r=>setTimeout(r,0));assert.equal(calls,1);assert.ok(!logs.some(x=>x.includes('❌')),logs.join('\n'));
 // Official response semantics: absent members retain original, headers replace all.
 const delivered={...input,...result};assert.equal(delivered.headers['X-Keep'],'yes');
 return {result,delivered,logs,store};
}
function fields(bytes){let pos=0,out=new Map();const varint=()=>{let n=0,shift=0,b;do{b=bytes[pos++];n+=(b&127)*2**shift;shift+=7}while(b&128);return n};while(pos<bytes.length){const tag=varint(),no=Math.floor(tag/8),wire=tag%8;let value;if(wire===0)value=varint();else if(wire===2){const len=varint();value=bytes.slice(pos,pos+len);pos+=len}else throw Error('Unexpected fixture wire type '+wire);out.set(no,value)}return out}
(async()=>{
 let bundles=0;
 const unknown=new Uint8Array([0xa0,0x06,0x07]); // field 100 varint, preserve unknown protobuf bytes
 for(const endpoint of ['player','get_watch','browse','next','search','guide','account/get_setting','config','log_event']){
  const url='https://youtubei.googleapis.com/youtubei/v1/'+endpoint;
  const player=[0x12,0,0x3a,0,...unknown]; // empty playabilityStatus + one adPlacement + unknown field
  const body=new Uint8Array(endpoint==='player'?player:endpoint==='get_watch'?[0x0a,player.length+2,0x12,player.length,...player]:unknown);
  const r=await run('vendor/maasea/youtube.response.js',{url,body,argument:'{"captionLang":"off","blockUpload":true,"blockImmersive":true,"blockShorts":false,"debug":false}'});
  assert.ok(!r.logs.some(x=>/Error|异常/.test(x)),r.logs.join('\n'));assert.ok(r.delivered.body instanceof Uint8Array);assert.ok(Buffer.from(r.delivered.body).includes(Buffer.from(unknown)));
  if(['player','get_watch'].includes(endpoint)){let f=fields(r.delivered.body);if(endpoint==='get_watch')f=fields(fields(f.get(1)).get(2));assert.ok(!f.has(7),'adPlacement must be removed');const playback=fields(f.get(2));assert.ok(playback.has(21),'PiP missing');assert.ok(playback.has(11),'background missing')}
  bundles++;
 }
 for(const endpoint of ['player','get_watch']){
  const url='http://youtubei.googleapis.com/youtubei/v1/'+endpoint;
  const r=await run('vendor/dualsubs/YouTube.response.bundle.js',{url,body:unknown});
  assert.deepEqual(Buffer.from(r.delivered.body),Buffer.from(unknown));bundles++;
 }
 const json={captions:{playerCaptionsTracklistRenderer:{captionTracks:[{baseUrl:'https://www.youtube.com/api/timedtext?v=x&lang=en',languageCode:'en',vssId:'.en',name:{simpleText:'English'},isTranslatable:true}],audioTracks:[{captionTrackIndices:[0]}],translationLanguages:[]}},keep:'untouched'};
 const jr=await run('vendor/dualsubs/YouTube.response.bundle.js',{url:'https://www.youtube.com/youtubei/v1/player',body:JSON.stringify(json),contentType:'application/json'});
 const jo=JSON.parse(jr.delivered.body);assert.equal(jo.keep,'untouched');assert.equal(jo.captions.playerCaptionsTracklistRenderer.captionTracks[0].languageCode,'en');assert.ok(jo.captions.playerCaptionsTracklistRenderer.translationLanguages.some(x=>x.languageCode==='zh-Hans'));bundles++;
 for(const endpoint of ['player','browse']){
  const r=await run('vendor/dualsubs/YouTube.request.bundle.js',{url:'https://youtubei.googleapis.com/youtubei/v1/'+endpoint,body:unknown,request:true});
  assert.deepEqual(Buffer.from(r.result.body),Buffer.from(unknown));assert.equal(r.result.headers['X-Keep'],'yes');bundles++;
 }
 let networkCalls=0;
 const network=(options,callback)=>{const u=new URL(options.url);assert.ok(['translate.googleapis.com','clients5.google.com'].includes(u.hostname));assert.equal(u.searchParams.get('tl'),'zh-CN');assert.equal(u.searchParams.get('sl'),'en');assert.equal(u.searchParams.get('q'),'Hello');networkCalls++;setTimeout(()=>callback(null,{status:200,headers:{'Content-Type':'application/json'}},JSON.stringify([[['你好','Hello']],null,'en'])),0)};
 const tr=await run('vendor/dualsubs/Universal.Translate.response.bundle.js',{url:'https://www.youtube.com/api/timedtext?v=x&lang=en&tlang=zh-TW&subtype=Translate',body:JSON.stringify({events:[{tStartMs:0,dDurationMs:1000,segs:[{utf8:'Hello'}]}]}),contentType:'application/json',network});
 assert.equal(JSON.parse(tr.delivered.body).events[0].segs[0].utf8,'Hello\n你好');assert.equal(networkCalls,1);bundles++;
 console.log(`PASS ${routes} routing cases; 5 false-positive subtype cases excluded; HTTPS winners unchanged; ${bundles} actual vendor bundle cases (binary/JSON, headers, one $done, controlled Google callback/no external network). No serial $done chain is assumed or implemented.`);
})().catch(e=>{console.error(e.stack);process.exit(1)});
