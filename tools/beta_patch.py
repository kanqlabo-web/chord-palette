import sys
p=sys.argv[1]; s=open(p).read()
def rep(a,b,n=1):
    global s; assert s.count(a)==n,(a[:80],s.count(a)); s=s.replace(a,b)
# --- generic scenes for patterns without them ---
rep("for(const k in ARPS){ const A=ARPS[k]; if(A.ev) prepNx(A.ev);",
"""// 場面（前半2拍・3拍目から・1拍だけ・3拍）がないパターンは、1小節の弾き方から自動で作る（小節の途中でコードが変わっても形が崩れないように）
function autoScenes(A){ if(A.sit||!A.ev) return; const cut=(lo,hi)=>A.ev.filter(e=>e[0]>=lo&&e[0]<hi).map(e=>[e[0]-lo,e[1],Math.min(e[2],hi-e[0]),...e.slice(3)]);
  const hA=cut(0,8), hB=cut(8,16), bt=cut(0,4), b3=cut(0,12);
  A.sit={bar:[A.ev.map(e=>[...e])]}; if(hA.length) A.sit.halfA=[hA]; A.sit.halfB=[(hB.length&&hB.some(e=>e[0]===0))?hB:hA]; if(bt.length) A.sit.beat=[bt]; if(b3.length) A.sit.bar3=[b3]; }
for(const k in ARPS) if(!/^my\\d+$/.test(k) && k!=='whole') autoScenes(ARPS[k]);
for(const k in ARPS){ const A=ARPS[k]; if(A.ev) prepNx(A.ev);""")
# --- nx on accent rows: keep the octave ---
rep("const nxM=tr==='nx'?nxPitch(nxk||1,nxN||1,bt):null;","const nxM0=tr==='nx'?nxPitch(nxk||1,nxN||1,bt):null, nxM=nxM0!=null&&[6,7,8].includes(+nxr)?nxM0+12:nxM0;   // アクセント行（1オクターブ上）でつなぐときは、その高さで")
# --- new / reworked patterns ---
rep("  hornline:{name:'上もの：上がっていくメロディ', pro:'上もの：付点4分×2＋4分で上行', legato:true,\n           sit:{bar:[[[0,[6],6,.56],[6,[7],6,.54],[12,[8],4,.58]]],",
"""  hornline:{name:'上もの：上がっていくメロディ', pro:'上もの：付点4分×2＋4分で上行（中音域・2小節目は次のコードへつなぐ）', legato:true, rhShift:-9,
           // ホルンらしい中音域（いちばん上でも F4 くらい）：右手の 下→中→上 と上がり、2小節目は上→中のあと次のコードへつなぐ
           sit:{bar:[[[0,[1],6,.58],[6,[2],6,.56],[12,[3],4,.6]],[[0,[3],6,.58],[6,[2],4,.56],[12,[2],1,.5,null,'nx'],[13,[2],1,.52,null,'nx'],[14,[2],2,.56,null,'nx']]],""")
# glockline: 2nd bar connects to next chord
rep("  glockline:{name:'上もの：高い音でキラキラ', pro:'上もの：高音の短いフレーズ', legato:true,\n           sit:{bar:[[[0,[6],6,.5],[6,[7],2,.44],[8,[8],8,.48]]],",
    "  glockline:{name:'上もの：高い音でキラキラ', pro:'上もの：高音の短いフレーズ（2小節目は次のコードへつなぐ）', legato:true,\n           sit:{bar:[[[0,[6],6,.5],[6,[7],2,.44],[8,[8],8,.48]],[[0,[6],6,.5],[6,[7],2,.44],[8,[8],4,.48],[12,[8],1,.44,null,'nx'],[13,[8],1,.46,null,'nx'],[14,[8],2,.5,null,'nx']]],")
# ballad: 2nd bar flourish
rep("           sit:{bar:[[[0,[0],16,.66],[0,[5],16,.5],[0,[3],6,.6],[0,[2],4,.56],[2,[1],14,.44],[4,[2],10,.47],[6,[3],6,.5],[8,[6],8,.62],[12,[3],4,.5],[14,[2],2,.42]]],",
    "           sit:{bar:[[[0,[0],16,.66],[0,[5],16,.5],[0,[3],6,.6],[0,[2],4,.56],[2,[1],14,.44],[4,[2],10,.47],[6,[3],6,.5],[8,[6],8,.62],[12,[3],4,.5],[14,[2],2,.42]],\n                      [[0,[0],16,.66],[0,[5],16,.5],[0,[3],6,.6],[0,[2],4,.56],[2,[1],14,.44],[4,[2],10,.47],[6,[3],6,.5],[8,[6],2,.6],[10,[3],2,.48,null,'nx'],[12,[3],2,.5,null,'nx'],[14,[3],2,.53,null,'nx']]],   // 2小節目：3拍目裏から8分で、右手の高さのまま次のコードへ流れる")
# bossa: YukaGuitar tab (thumb = bass on 5th string, 人 = 4th string, 薬中 = 3rd+2nd strings)
rep("  bossa:  {name:'ボサノバ', pluck:true, ev:each([0,3,6,10,13],RH,2,(s,i)=>i===0?.72:.6)},",
    """  // ボサノバの指弾き（2小節）：親指＝5弦のルート、人差し指＝4弦（3度）、中・薬指＝3弦と2弦（7度と9度）。Dm7(9) なら D3・F3・C4・E4
  // 1小節目「ラー・メン・パ・ニー・ニ」、2小節目「パ・ニー・ニ・ラー・メン」
  bossa:  {name:'ボサノバ', pro:'ボサノバの指弾き（親指＋3本指、2小節）', pluck:true, legato:true, bossaV:true,
           sit:{bar:[[[0,[0],4,.7],[0,[1,2,3],4,.62],[4,[2,3],2,.58],[6,[1],2,.55],[8,[0],2,.66],[10,[2,3],4,.6],[14,[1],2,.55]],
                      [[0,[0],2,.68],[2,[2,3],4,.6],[6,[1],2,.55],[8,[0],4,.68],[8,[2,3],4,.6],[12,[2,3],2,.58],[14,[1],2,.55]]],
                halfA:[[[0,[0],4,.7],[0,[1,2,3],4,.62],[4,[2,3],2,.58],[6,[1],2,.55]]], halfB:[[[0,[0],2,.66],[2,[2,3],4,.6],[6,[1],2,.55]]],
                beat:[[[0,[0],4,.7],[0,[1,2,3],4,.62]]]}},""")
rep("  // ギターの音色：実際のギターで押さえる形（ローコード、なければバレーコード）で鳴らす\n",
    """  // ボサノバの指弾きの形（bossaV）：5弦（か6弦）のルート＋3度・7度・9度（なければ6度・5度、3度の1オクターブ上）
  if(pat&&pat.bossaV){ const r=43+(((bpc-43)%12)+12)%12, t3=[4,3,5,2].find(i=>ivs.includes(i))??4, mid=[10,11,9].find(i=>ivs.includes(i))??7,
      top=[14,13,15].find(i=>ivs.includes(i))??(ivs.includes(21)?21:ivs.includes(17)?17:t3+12), v=[r+t3,r+mid,r+top].sort((a,b)=>a-b);
    const T=[r,...v,r+fifth,r+12,...v.map(x=>x+12),null,null]; return {up:T, tones:T, R:v, ra:v, bass, slash, fifth, third, seventh, rpc, bpc, ivs, q:sp.q}; }
  // ギターの音色：実際のギターで押さえる形（ローコード、なければバレーコード）で鳴らす
""")
# anison: 16th synth arpeggio (+ connecting run) as the second instrument
rep("  glockline:{name:'上もの：高い音でキラキラ',",
    """  // アニソン：シンセの16分アルペジオ（上の3音を「下・中・上・中」で回す）。2小節目の最後の拍で次のコードへ駆け上がる
  synarp: {name:'上もの：シンセのアルペジオ', pro:'上もの：16分のシンセアルペジオ（2小節）', legato:false,
           sit:{bar:[each([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],[[6],[7],[8],[7]],.45,(s,i)=>s%4===0?.62:.44),
                     [...each([0,1,2,3,4,5,6,7,8,9,10,11],[[6],[7],[8],[7]],.45,(s,i)=>s%4===0?.62:.44),[12,[8],1,.5,null,'nx'],[13,[8],1,.54,null,'nx'],[14,[8],1,.58,null,'nx'],[15,[8],1,.62,null,'nx']]],
                halfA:[each([0,1,2,3,4,5,6,7],[[6],[7],[8],[7]],.45,(s,i)=>s%4===0?.62:.44)], halfB:[each([0,1,2,3,4,5,6,7],[[6],[7],[8],[7]],.45,(s,i)=>s%4===0?.62:.44)],
                beat:[each([0,1,2,3],[[6],[7],[8],[7]],.45,(s,i)=>s%4===0?.62:.44)]}},
  glockline:{name:'上もの：高い音でキラキラ',""")
rep("{id:15, name:'疾走系（アニソン）', bpm:172, drum:'run', arp:'drive', inst:'piano', arp2:'glockline', inst2:'glock',",
    "{id:15, name:'疾走系（アニソン）', bpm:172, drum:'run', arp:'drive', inst:'piano', arp2:'synarp', inst2:'synth',")
rep("['hornline','上がっていくメロディ'],","['synarp','シンセのアルペジオ'],['hornline','上がっていくメロディ'],")
rep("hornline:'horn',whole:","hornline:'horn',synarp:'synth',whole:")
rep("halfA:[[[0,[6],6,.56],[6,[7],2,.5]]], halfB:[[[0,[7],4,.54],[4,[8],4,.56]]], beat:[[[0,[6],4,.52]]]}},","halfA:[[[0,[1],6,.58],[6,[2],2,.54]]], halfB:[[[0,[2],4,.56],[4,[3],4,.58]]], beat:[[[0,[1],4,.56]]]}},")
# styles
rep("arp:'epic', inst:'strings3', arp2:'alberti', inst2:'piano',","arp:'epic', inst:'strings3', arp2:'hornline', inst2:'horn',")
rep("'brasshit','hornline','skank'];","'brasshit','hornline','skank','synarp'];")
# ARP_ORDER / P2 options
open(p,'w').write(s)
print('ok')
