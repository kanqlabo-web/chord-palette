#!/usr/bin/env python3
"""版ごとのページを組み立てる。
  共通の部品は tools/src/（通常版の中身）。公開するときは core/ に置き、どの版もそこを読み込む。
  ベータ版（beta）・講義版（lecture）は tools/<版>-src/ に「通常版と違うファイルだけ」を置く。
    同じ名前のファイルがあれば、その版ではそちらを使う（<版>/core/ に置く）。新しいファイルは足される。
    中身が通常版と同じになったファイルは、自動で ../core/ を読む。
  版数は tools/VERSION（1行目：版数、2行目：日付）。
使い方: python3 tools/build.py
"""
import hashlib, os, re, shutil, subprocess, sys
T=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(T)
VER,DATE=(open(os.path.join(T,'VERSION')).read().split()+[''])[:2]
VARIANTS=[  # 名前, 置き場所, 上書きの元, 設定
  ('main','',None,{'title':'コード進行パレット','badge':'','conf':{}}),
  ('beta','beta','beta-src',{'title':'コード進行パレット β','badge':'β','conf':{'store':'cpbeta-','snd':'../snd/','kind':'beta','lvMax':12}}),
  ('lecture','lecture','lecture-src',{'title':'コード進行パレット 講義','badge':'講義','conf':{'store':'cplec-','snd':'../snd/','kind':'lecture'}}),
]
rd=lambda p:open(p,encoding='utf-8').read()
def files(base):
  out={}
  if not base or not os.path.isdir(base): return out
  for dp,_,fs in os.walk(base):
    for f in fs:
      if f.startswith('.') or f=='README.md': continue   # 説明のファイルは部品にしない
      out[os.path.relpath(os.path.join(dp,f),base)]=os.path.join(dp,f)
  return out
H=lambda s:hashlib.sha1(s.encode()).hexdigest()[:8]
main=files(os.path.join(T,'src'))
def write(p,s):
  os.makedirs(os.path.dirname(p),exist_ok=True); open(p,'w',encoding='utf-8').write(s)
def build(name,dirn,over,cfg):
  if name=='lecture' and not os.path.isdir(os.path.join(T,over)): return
  ov=files(os.path.join(T,over)) if over else {}
  allf=dict(main); allf.update(ov)
  out=os.path.join(R,dirn); up='../' if dirn else ''
  own=os.path.join(out,'core') if dirn else os.path.join(R,'core')
  if dirn and os.path.isdir(own): shutil.rmtree(own)
  def ref(rel):   # rel: style.css, js/xx.js
    src=allf[rel]; s=rd(src)
    if name=='main' or rel not in ov or (rel in main and rd(main[rel])==s): return f'{up}core/{rel}?v={H(rd(main[rel]))}'
    write(os.path.join(own,rel),s); return f'core/{rel}?v={H(s)}'
  if name=='main':
    if os.path.isdir(os.path.join(R,'core')): shutil.rmtree(os.path.join(R,'core'))
    for rel,p in main.items():
      if rel.endswith(('.css','.js')): write(os.path.join(R,'core',rel),rd(p))
  js=sorted(r for r in allf if r.startswith('js/') and r.endswith('.js'))
  sub=lambda s:s.replace('{{TITLE}}',cfg['title']).replace('{{VER}}',f'ver {VER}（{DATE}）').replace('{{BADGE}}',
        f'<small style="font-size:.55em;margin-left:4px;color:var(--d)">{cfg["badge"]}</small>' if cfg['badge'] else '')
  import json
  html=('<!doctype html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">\n'
    '<style>body{margin:0}[hidden]{display:none!important}</style>\n'+sub(rd(allf['head.html']))+
    f'<link rel="stylesheet" href="{ref("style.css")}">\n</head>\n<body>\n'+sub(rd(allf['body.html']))+
    (f'<script>window.CP_CONF={json.dumps(cfg["conf"],ensure_ascii=False)};</script>\n' if cfg['conf'] else '')+
    ''.join(f'<script src="{ref(r)}"></script>\n' for r in js)+'</body>\n</html>\n')
  write(os.path.join(out,'index.html'),html)
  # 構文チェック（つなげて1つのスクリプトとして）
  big='\n'.join(rd(allf[r]) for r in js); tmp=os.path.join('/tmp',f'cp-{name}.js'); write(tmp,big)
  r=subprocess.run(['node','--check',tmp],capture_output=True,text=True)
  if r.returncode: print(r.stderr); sys.exit(f'syntax error in {name}')
  print('built',name or 'main', f'ver {VER}', f'own files: {sorted(ov)}' if ov else '')
for v in VARIANTS: build(*v)
