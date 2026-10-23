import sys,struct
src=open('mid.py').read(); exec(src.split('def parse')[0]); exec('def parse'+src.split('def parse')[1].split('for f in sys.argv')[0])
N=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']
tpb,tempo,trs=parse(sys.argv[1]); print('tpb',tpb,'bpm',tempo)
for ti,ev in enumerate(trs):
    on={}; notes=[]
    for e in ev:
        if e[0]=='on': on.setdefault(e[2],[]).append((e[1],e[3]))
        elif on.get(e[2]): st,v=on[e[2]].pop(0); notes.append((st/tpb*4,e[2],(e[1]-st)/tpb*4,v))
    if not notes: continue
    notes.sort(); print('== track',ti,len(notes)); bar=None; line=[]
    for st,n,d,v in notes:
        b=int(st//16)
        if b!=bar:
            if line: print(' bar',bar,' '.join(line))
            bar=b; line=[]
        line.append(f"{st-b*16:g}:{N[n%12]}{n//12-1}({d:.2f},{v})")
    print(' bar',bar,' '.join(line))
