#!/usr/bin/env python3
"""Run actual patched language expressions and timedtext branch with Node mocks.
No live Surge/protobuf rendering or translation API assertions are made here.
"""
import importlib.util
import json
import subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('patch', ROOT/'scripts/patch-dualsubs.py')
patch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(patch)
program = ['const assert=require("node:assert/strict"); let count=0;']
for name, (_, log, settings, cache, url) in patch.SPECS.items():
 text = (ROOT/'vendor/dualsubs'/name).read_text()
 start = text.index('const zmForceSimplifiedChinese=')
 end = text.index(';', text.index('.Languages[1]', start + len('const zmForceSimplifiedChinese=')))
 # The target expression is after the injected settings statement; stop at language array.
 import re
 match = re.search(r'const (\w+)='+url+r'\.searchParams\??\.get\("subtype"\).*?;(?=\w+\.info)', text[start:])
 assert match, name
 selection = text[start:start+match.end()]
 array = re.search(r',([a-z]+)=\[', match.group())[1]
 branch = ''
 if name == 'YouTube.request.bundle.js':
  branch = text[text.index('case"/api/timedtext":{')+len('case"/api/timedtext":'):text.index('break}}}}$request.url')] + '}'
 for enabled in (True, False, 'true'):
  for old in ('ZH-HANT','zh-TW','en',None):
   for mode in ('Translate','Official'):
    for source in ('en','ja','zh-TW'):
     cfg = {'Languages':['AUTO','ZH-HANT'],'Type':mode,'AutoCC':True,'ShowOnly':False}
     query = '?v=test&lang='+source + ('&tlang='+old if old else '')
     declarations = f'let {settings}={json.dumps(cfg)}, {cache}={{tlang:"zh-TW",Playlists:{{Subtitle:new Map()}}}}, {url}=new URL("https://www.youtube.com/api/timedtext{query}");'
     declarations += f'const {log}={{info(){{}},log(){{}},debug(){{}}}},$argument={{ForceSimplifiedChinese:{json.dumps(enabled)}}};'
     # Request branch mocks only I/O; executes the real upstream switch logic.
     if branch:
      declarations += 'const writes=[],i={setItem:(...x)=>writes.push(x)},c={setHeader:async()=>{}};const $request={headers:{}};'
     checks = f'assert.equal({array}[0],{json.dumps(source.upper())});assert.equal({array}[1],{json.dumps("ZH-HANS" if enabled else (old or "zh-TW").upper())});'
     if branch:
      checks += branch
      checks += f'assert.equal({url}.searchParams.get("lang"),{json.dumps(source)});'
      if enabled:
       checks += f'assert.equal({url}.searchParams.get("subtype"),{json.dumps(mode)});assert.equal({cache}.tlang,"zh-Hans");assert.ok(writes.some(x=>x[0]==="@DualSubs.YouTube.Caches.tlang"&&x[1]==="zh-Hans"));'
       checks += f'assert.equal({url}.searchParams.get("tlang"),{json.dumps("zh-Hans" if mode=="Official" else None)});assert.equal({settings}.ShowOnly,false);'
     program.append('{'+declarations+selection+checks+'count++;}')
program.insert(1,'(async()=>{')
program.append('console.log(`PASS ${count} actual language/URL/cache/source cases (4 bundles, Translate + Official, flag on/off)`);})().catch(e=>{console.error(e);process.exit(1)});')
subprocess.run(['node'],input='\n'.join(program),text=True,check=True)
for path in sorted((ROOT/'vendor').glob('*/*.js')):
 subprocess.run(['node','--check',str(path)],check=True)
 print('node --check PASS',path.relative_to(ROOT))
