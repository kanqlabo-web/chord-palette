import sys,struct
NN=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']
def nn(n): return NN[n%12]+str(n//12-1)
def vlq(d,i):
    v=0
    while True:
        b=d[i]; i+=1; v=(v<<7)|(b&127)
        if b<128: return v,i
def parse(f):
    d=open(f,'rb').read(); assert d[:4]==b'MThd'
    fmt,nt,tpb=struct.unpack('>HHH',d[8:14]); i=14; tracks=[]; tempo=None
    for _ in range(nt):
        assert d[i:i+4]==b'MTrk'; L=struct.unpack('>I',d[i+4:i+8])[0]; j=i+8; end=j+L; t=0; run=None; ev=[]
        while j<end:
            dt,j=vlq(d,j); t+=dt; st=d[j]
            if st==0xFF:
                ty=d[j+1]; l,k=vlq(d,j+2)
                if ty==0x51: tempo=60000000/int.from_bytes(d[k:k+3],'big')
                j=k+l; continue
            if st in(0xF0,0xF7): l,k=vlq(d,j+1); j=k+l; continue
            if st&0x80: run=st; j+=1
            hi=run&0xF0; n1=d[j]
            if hi in(0xC0,0xD0): j+=1; continue
            n2=d[j+1]; j+=2
            if hi==0x90 and n2>0: ev.append(('on',t,n1,n2))
            elif hi in(0x80,0x90): ev.append(('off',t,n1,0))
        tracks.append(ev); i=end
    return tpb,tempo,tracks
for f in sys.argv[1:]:
    tpb,tempo,trs=parse(f); print('==',f.split('/')[-1],'tpb',tpb,'bpm',tempo and round(tempo,1))
    for ev in trs:
        on={}; notes=[]
        for k,t,n,v in ev:
            if k=='on': on.setdefault(n,[]).append((t,v))
            elif on.get(n): st,vv=on[n].pop(0); notes.append((st,t-st,n,vv))
        if not notes: continue
        notes.sort(); step=tpb/4; bar=None; line=[]
        for st,dd,n,v in notes:
            b=int(st//(tpb*4)); s=(st%(tpb*4))/step
            if b!=bar:
                if line: print('  '+' '.join(line))
                print(' bar',b+1); bar=b; line=[]
            line.append(f"{s:.1f}:{nn(n)}/{dd/step:.1f}/{v}")
        print('  '+' '.join(line))
