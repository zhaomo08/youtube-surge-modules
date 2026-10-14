#!/usr/bin/env python3
"""Reproducible, fail-closed patch for pinned DualSubs releases (zm6)."""
import hashlib
import re
import sys
from pathlib import Path

SPECS = {
 'YouTube.request.bundle.js': ('128dd4ff56a718965018cef2ce404bcedf337b473099b529d92bbe4df1c0e6c6', 't', 'a', 'n', 'we'),
 'YouTube.response.bundle.js': ('a6f387776255bc8510efebc4bb9e580e85a171ff8b332bb0d5707c82f0f2ab07', 'a', 't', 'n', 'ye'),
 'Universal.Composite.Subtitles.response.bundle.js': ('c42404fc4bff7dd10cb27ebfcf7d92c89f6584f5067ea37752d36750767c17df', 'a', 't', 's', 'f'),
 'Universal.Translate.response.bundle.js': ('a9d9efc80854641886073985827de269503849c4d6c5f9d02f4e7627097ed8da', 't', 'n', 's', 'et'),
}

def replacements(name, text):
 _, log, settings, cache, url = SPECS[name]
 anchor = f'{log}.logLevel={settings}.LogLevel;'
 # Read the explicit module flag, NOT merged settings which BoxJS can override.
 injection = ('const zmForceSimplifiedChinese=[true,"true"].includes($argument.ForceSimplifiedChinese);'
  f'if(zmForceSimplifiedChinese){{{settings}.Languages[1]="ZH-HANS";{cache}.tlang="zh-Hans";'
  f'if({url}.searchParams.get("tlang")'
  + (f'||({url}.pathname==="/api/timedtext"&&{settings}.AutoCC!==false)' if name.startswith('YouTube.request') else '')
  + f'){url}.searchParams.set("tlang","zh-Hans");}}')
 edits = [(anchor, anchor + injection)]
 target = re.search(r'\([^()]+\.searchParams\??\.get\("tlang"\)\?\?\w+\?\.tlang\)\?\.toUpperCase\?\.\(\)\?\?\w+\.Languages\[1\]', text)
 if not target:
  raise ValueError('target language anchor missing: ' + name)
 edits.append((target.group(), '(zmForceSimplifiedChinese?"ZH-HANS":(' + target.group() + '))'))
 if name == 'YouTube.request.bundle.js':
  old = 'r?.split?.(/[-_]/)?.[0]===we.searchParams.get("tlang")?.split?.(/[-_]/)?.[0]&&(a.ShowOnly=!0)'
  edits.append((old, '!zmForceSimplifiedChinese&&' + old))
 return edits

def patch(path):
 name = path.name
 if name not in SPECS:
  return
 text = path.read_text()
 if 'const zmForceSimplifiedChinese=' in text:
  original = text
  for old, new in reversed(replacements(name, text)):
   if original.count(new) != 1:
    raise ValueError('modified local patch: ' + name)
   original = original.replace(new, old)
  if hashlib.sha256(original.encode()).hexdigest() != SPECS[name][0]:
   raise ValueError('modified patched asset: ' + name)
  print('already patched and verified:', name)
  return
 if hashlib.sha256(path.read_bytes()).hexdigest() != SPECS[name][0]:
  raise ValueError('unreviewed upstream SHA; refusing to overwrite patch: ' + name)
 for old, new in replacements(name, text):
  if text.count(old) != 1:
   raise ValueError('non-unique patch anchor: ' + name)
  text = text.replace(old, new)
 path.write_text(text)
 print('patched:', name)

if __name__ == '__main__':
 paths = [Path(p) for p in sys.argv[1:]] or sorted((Path(__file__).resolve().parents[1] / 'vendor/dualsubs').glob('*.js'))
 for path in paths:
  patch(path)
