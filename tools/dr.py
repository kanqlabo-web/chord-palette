import sys,struct
src=open('mid.py').read(); exec(src.split('def parse')[0]); exec('def parse'+src.split('def parse')[1].split('for f in sys.argv')[0])
tpb,tempo,trs=parse(sys.argv[1])
for ti,ev in enumerate(trs):
    on=[(e[1]/tpb*4,e[2],e[3]) for e in ev if e[0]=='on']
    if not on or not all(35<=o[1]<=59 for o in on): continue
    print('track',ti,len(on))
    bars={}
    for st,n,v in on:
        b=int(st//16); bars.setdefault(b,{}).setdefault(n,{})[round(st-b*16,2)]=v
    for b in sorted(bars):
        print('bar',b)
        for n in sorted(bars[b]): print('  ',n,' '.join(f"{k:g}:{v}" for k,v in sorted(bars[b][n].items())))
