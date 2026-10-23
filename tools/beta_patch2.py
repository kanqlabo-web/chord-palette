import sys,re
p=sys.argv[1]; s=open(p).read()
def rep(a,b,n=1):
    global s; assert s.count(a)==n,(a[:80],s.count(a)); s=s.replace(a,b)
def rep_block(start, end_marker, new):
    global s; i=s.index(start); j=s.index(end_marker,i)+len(end_marker); s=s[:i]+new+s[j:]
# ---- bossa guitar (user's PRO sketch) ----
rep_block("  bossa:  {name:'ボサノバ', pro:'ボサノバの指弾き（親指＋3本指、2小節）'", "beat:[[[0,[0],4,.7],[0,[1,2,3],4,.62]]]}},",
"""  bossa:  {name:'ボサノバ', pro:'ボサノバ（バレーコードの形・2小節の王道パターン）', pluck:true, legato:true, bossaV:true, pushBy:2, push2nd:true, pushKeepLH:true,
           // 行：左手根音＝親指のルート、左手5度＝親指の5度、左手8度＝4弦、右手下＝3弦、右手中＝2弦、右手上＝1弦（指で弾く3音は4・3・2弦）
           // 1小節目：1拍目・2拍目・3拍目裏、4拍目裏で2小節目のコードを先取り（タイでのばす）。2小節目：1拍目裏・2拍目裏（3拍目までのばす）・4拍目。親指は毎小節 1拍目ルート・3拍目5度
           sit:{bar:[[[0,[0],8,.5],[0,[5,1,2],4,.42],[4,[5,1,2],4,.44],[8,[4],8,.46],[10,[5,1,2],2,.44]],
                      [[0,[0],8,.5],[2,[5,1,2],2,.44],[6,[5,1,2],6,.46],[8,[4],8,.46],[12,[5,1,2],4,.44]]],
                halfA:[[[0,[0],8,.5],[0,[5,1,2],4,.42],[4,[5,1,2],4,.44]]], halfB:[[[0,[4],8,.46],[2,[5,1,2],2,.44],[6,[5,1,2],2,.44]]],
                beat:[[[0,[0],4,.5],[0,[5,1,2],4,.42]]],
                push:[[[0,[5,1,2],6,.46]]]}},""")
# bossa barre-chord voicing (root on 6th string for E..G#, on 5th string for A..Eb)
rep("""  if(pat&&pat.bossaV){ const r=43+(((bpc-43)%12)+12)%12, t3=[4,3,5,2].find(i=>ivs.includes(i))??4, mid=[10,11,9].find(i=>ivs.includes(i))??7,""",
    """  if(pat&&pat.bossaV){ const r=40+(((bpc-40)%12)+12)%12, t3=[4,3,5,2].find(i=>ivs.includes(i))??4, mid=[10,11,9].find(i=>ivs.includes(i))??(t3===3?10:9),""")
rep("const T=[r,...v,r+fifth,r+12,...v.map(x=>x+12),null,null]; return {up:T, tones:T, R:v, ra:v,",
    """// バレーコードの形：ルートが6弦（E〜G♯）なら 6弦ルート・5弦5度・4弦7度・3弦3度・2弦13度（♭13・5度）。5弦（A〜E♭）なら 5弦ルート・6弦5度・4弦3度・3弦7度・2弦9度
    const s6=r<=44, f5=s6?r+fifth:r+fifth-12, has=i=>ivs.includes(i), dom=has(10)&&t3===4;
    const s4=s6?r+mid:r+t3, s3=s6?r+12+t3:r+mid, s2=s6?r+(has(20)?20:(has(21)||dom)?21:(fifth+12)):r+([13,15,14].find(i=>has(i))??(has(20)?20:(sp.q==='dim'||sp.q==='m-5'?fifth+12:14))), s1=s2+5;
    const T=[r,s3,s2,s1,f5,s4,s3+12,s2+12,s1+12,null,null], vv=[s3,s2,s1]; return {up:T, tones:T, R:vv, ra:vv,""")
# ---- bossa drums: simple and soft (sketch) ----
rep("  bossa:  {name:'ボサノバ', v:{k:'X..xX..xX..xX..x', x:'X..X..X...X..X..', h:'g.g.g.g.g.g.g.g.'}, fill:null,\n           bass:[[0,0,3,1],[3,'5',1,.6],[4,'5',4,.9],[8,0,3,1],[11,'5',1,.6],[12,'5',4,.9]]},",
    "  bossa:  {name:'ボサノバ', pro:'ボサノバ（リムの「ポクポク」＋8分のハイハット、ごく弱く）', v:{k:M16({0:52,8:40}), x:M16({0:50,3:46,6:48,10:50,13:46}), h:M16({0:30,2:24,4:28,6:24,8:30,10:24,12:28,14:24})}, vB:{k:M16({0:52,8:40}), x:M16({2:48,6:46,10:50,13:46}), h:M16({0:30,2:24,4:28,6:24,8:30,10:24,12:28,14:24})}, fill:null,\n           bass:[[0,0,6,1],[6,'5',2,.6],[8,'5',8,.9]]},   // ベースは前の形を半分のテンポで（1小節で1回）")
# ---- bossa chord 2: Ipanema-like sustained piano line with triplet turns ----
rep("  glockline:{name:'上もの：高い音でキラキラ',",
"""  // ボサノバの上もの（ピアノ）：ipanema の MIDI のように、上の2音（3度・6度の重なり）を長くのばしてコードをなぞる（声部はなめらかにつながる）。
  // 4小節に1回だけ、イエス様が〜（ボサノバ）の MIDI のように、小節の後半で4分の3連符で次のコードへ上っていくオブリ
  ipanema:{name:'上もの：のびやかなピアノ', pro:'上もの：上2音でコードをなぞる（裏から入る）＋4小節に1回の3連符のオブリ', legato:true, rhShift:3, avoid:false, dyad36:true, nxYes:true,
           sit:{bar:[[[2,[2,3],6,.42],[10,[2,3],4,.44],[14,[2,3],2,.4]],
                      [[6,[2,3],10,.44]],
                      [[2,[2,3],6,.42],[10,[2,3],2,.4],[12,[2,3],4,.44]],
                      [[0,[3],2.67,.46,null,'nx'],[2.67,[3],2.67,.44,null,'nx'],[5.33,[3],2.67,.45,null,'nx'],[8,[3],2.67,.46,null,'nx'],[10.67,[3],2.67,.48,null,'nx'],[13.33,[3],2.67,.5,null,'nx']]],
                halfA:[[[2,[2,3],6,.42]]], halfB:[[[2,[2,3],6,.42]]], beat:[[[0,[2,3],4,.4]]]}},
  glockline:{name:'上もの：高い音でキラキラ',""")
rep("{id:12, name:'ボサノバ', bpm:112, drum:'bossa', arp:'bossa', inst:'nylon', kit:'brush', bass:true, bassSnd:'ubass'},",
    "{id:12, name:'ボサノバ', bpm:140, drum:'bossa', arp:'bossa', inst:'nylon', kit:'brush', bass:true, bassSnd:'ubass'},")
# ---- ballad: 82bpm, softer ----
rep("{id:4, name:'バラード', bpm:72, drum:'ballad', arp:'pballad', inst:'piano', kit:'brush', bass:true},",
    "{id:4, name:'バラード', bpm:82, drum:'ballad', arp:'pballad', inst:'piano', kit:'brush', bass:true, mix:{arp:.78,drum:.72,bass:.78}},")
# ---- anison: synth brass chords + real lead phrase ----
rep("{id:15, name:'疾走系（アニソン）', bpm:172, drum:'run', arp:'drive', inst:'piano', arp2:'synarp', inst2:'synth',",
    "{id:15, name:'疾走系（アニソン）', bpm:172, drum:'run', arp:'drive', inst:'sbrass', arp2:'anilead', inst2:'synth',")
rep("  synarp: {name:'上もの：シンセのアルペジオ',",
"""  // アニソンの上もの：シンセのリードで、シンコペーションのある2小節のフレーズ。2小節目は最後に次のコードへ駆け上がる
  anilead:{name:'上もの：シンセのリード', pro:'上もの：シンセリードのフレーズ（2小節・シンコペーション）', legato:true,
           sit:{bar:[[[0,[8],3,.62],[3,[7],3,.56],[6,[8],2,.6,null,'su'],[8,[8],4,.62],[12,[7],2,.56],[14,[6],2,.54]],
                      [[0,[7],3,.6],[3,[8],3,.62],[6,[8],2,.64,null,'su'],[8,[8],3,.62],[11,[7],1,.5,null,'nx'],[12,[7],1,.52,null,'nx'],[13,[7],1,.54,null,'nx'],[14,[7],2,.58,null,'nx']]],
                halfA:[[[0,[8],3,.62],[3,[7],3,.56],[6,[8],2,.6,null,'su']]], halfB:[[[0,[8],4,.62],[4,[7],2,.56],[6,[6],2,.54]]], beat:[[[0,[8],4,.6]]]}},
  synarp: {name:'上もの：シンセのアルペジオ',""")
rep("['synarp','シンセのアルペジオ'],","['anilead','シンセのリード'],['synarp','シンセのアルペジオ'],['ipanema','のびやかなピアノ'],")
rep("synarp:'synth',whole:","synarp:'synth',anilead:'synth',ipanema:'piano',whole:")
rep("'brasshit','hornline','skank','synarp'];","'brasshit','hornline','skank','synarp','anilead','ipanema'];")
# ---- epic: loud horn, no 16th repeated phrases ----
rep("[[0,[3],6,.58],[6,[2],4,.56],[12,[2],1,.5,null,'nx'],[13,[2],1,.52,null,'nx'],[14,[2],2,.56,null,'nx']]],",
    "[[0,[3],6,.58],[6,[2],4,.56],[10,[2],2,.54,null,'nx'],[12,[2],2,.56,null,'nx'],[14,[2],2,.58,null,'nx']]],")
rep("pro:'上もの：付点4分×2＋4分で上行（中音域・2小節目は次のコードへつなぐ）', legato:true, rhShift:-9,","pro:'上もの：付点4分×2＋4分で上行（中音域・2小節目は次のコードへつなぐ）', legato:true, rhShift:-9, vol:1.7,")
rep("arp:'epic', inst:'strings3', arp2:'hornline', inst2:'horn',","arp:'epic', inst:'strings3', arp2:'hornline', inst2:'horn', mix:{arp2:1.6},")
# dyad36: the two sustained notes are a 3rd or 6th apart (top note + chord tone a 3rd/6th below)
rep("    const cn=notes.slice(I0).filter(n=>!n.mel && n.st0===st0);",
    "    if(pat&&pat.dyad36 && ns.length===2 && ns.includes(2) && ns.includes(3)){ const nn=notes.slice(I0).filter(n=>!n.mel).sort((a,b)=>a.m-b.m); if(nn.length===2){ const tp=nn[1].m, cps=(bt.ivs||[]).map(i=>(bt.rpc+i)%12); const pick=[3,4,8,9].map(d=>tp-d).find(x=>cps.includes(((x%12)+12)%12)); if(pick!=null){ nn[0].m=pick; nn[0].orig=pick; } } }   // 上2音は3度か6度の重なりに\n    const cn=notes.slice(I0).filter(n=>!n.mel && n.st0===st0);")
# nxYes: 6-note quarter-triplet fill like the bossa MIDI (chord tone, drop, then step up into the next chord's top)
rep("function nxPitch(k,N,bt){ if(NX_V==null||!bt||!bt.tones) return null;",
    "let NX_YES=false;\nfunction nxPitch(k,N,bt){ if(NX_V==null||!bt||!bt.tones) return null;")
rep("  const j=N-k+1;   // 前から何番目か（1〜N）",
    "  const j=N-k+1;   // 前から何番目か（1〜N）\n  // イエス様が〜の形（6音）：目標の1つ下から音階で4音さかのぼった所へ、1音目＝今のコードの音（少し上）、2音目＝そのさらに1つ下、から上っていく\n  if(NX_YES && N>=5){ const steps=[]; let x=T; for(let i=0;i<N-1;i++){ x=scaleDown(x); steps.unshift(x); } if(j>=2) return steps[j-2]; const base=steps[0]; const cps=(bt.ivs||[]).map(i=>(bt.rpc+i)%12); for(let d=3;d<=8;d++) if(cps.includes(((base+d)%12+12)%12)) return base+d; return base+5; }")
rep("  if(bt&&bt.ivs&&bt.rpc!=null) setScaleFor(","  NX_YES=!!(pat&&pat.nxYes);\n  if(bt&&bt.ivs&&bt.rpc!=null) setScaleFor(")
rep("    if(state.bass && n.m<48 && !(pat&&pat.satb)) w*=.55;","    if(state.bass && n.m<48 && !(pat&&(pat.satb||pat.bossaV))) w*=.55;   // ボサノバのギターの親指（ルート・5度）は下げない")
# PRO parity for the bossa barre voicing
rep("pushKeepLH:!!m.pushKeepLH,","pushKeepLH:!!m.pushKeepLH, bossaV:!!m.bossaV, pluck:!!m.pluck,")
rep("loose:!!a.loose, pushKeepLH:!!a.pushKeepLH,","loose:!!a.loose, pushKeepLH:!!a.pushKeepLH, bossaV:!!a.bossaV,")
rep("    optRow('4音以上のコードのルート',","    optRow('ギターの和音の形',[[false,'ふつう'],[true,'ボサノバのバレーコード（親指＝根音・5度、4・3・2弦＝3度・7度・9度）']],!!curMy().bossaV,v=>curMy().bossaV=v);\n    optRow('4音以上のコードのルート',")
open(p,'w').write(s); print('ok2')
