import sys
p=sys.argv[1]; s=open(p).read()
def rep(a,b,n=1):
    global s; assert s.count(a)==n,(a[:80],s.count(a)); s=s.replace(a,b)
# クラベス（MIDI 75）を打楽器の行に追加
rep("const VOICE={k:36,s:38,x:37,h:42,f:44,o:46,r:51,c:49,t1:50,t2:47,t3:45};","const VOICE={k:36,s:38,x:37,cl:75,h:42,f:44,o:46,r:51,c:49,t1:50,t2:47,t3:45};")
rep("['s','スネア'],['x','リム'],['k','キック']];","['s','スネア'],['x','リム'],['cl','クラベス'],['k','キック']];")
rep("const DRUM_VOL={36:1.15,37:.75,","const DRUM_VOL={36:1.15,37:.75,75:.5,")
rep("const rows=[[[42,51],[46,49],col.muted],[[38,50,47,45],[37],col.ink],[[36],[],col.ink]];","const rows=[[[42,51],[46,49],col.muted],[[38,50,47,45],[37,75],col.ink],[[36],[],col.ink]];")
rep("    50:t=>tom(t,220),47:t=>tom(t,160),45:t=>tom(t,115)}[note]; if(f) f(t);","    50:t=>tom(t,220),47:t=>tom(t,160),45:t=>tom(t,115),75:clave}[note]; if(f) f(t);")
rep("const rim=t=>noise(t,'bandpass',3200,.03,.4,4);","const rim=t=>noise(t,'bandpass',3200,.03,.4,4);\n// クラベス（音源がないとき）：2.5kHz 付近の短い木の響き\nconst clave=t=>{ const g=ctx.createGain(); g.connect(OUT||master); osc('sine',2500,t,t+.12,g); g.gain.setValueAtTime(.35,t); g.gain.exponentialRampToValueAtTime(.0001,t+.1); };")
# ボサノバ：リムをやめてクラベスで「ポクポク」。2小節：1小節目 2拍・3拍裏、2小節目 1拍・2拍裏・4拍
rep("pro:'ボサノバ（リムの「ポクポク」＋8分のハイハット、ごく弱く）', v:{k:M16({0:52,8:40}), x:M16({0:50,3:46,6:48,10:50,13:46}),",
    "pro:'ボサノバ（クラベスの「ポクポク」＋8分のハイハット、ごく弱く）', v:{k:M16({0:52,8:40}), cl:M16({4:58,10:54}),")
rep("vB:{k:M16({0:52,8:40}), x:M16({2:48,6:46,10:50,13:46}),","vB:{k:M16({0:52,8:40}), cl:M16({0:58,6:54,12:56}),")
open(p,'w').write(s); print('patch3 ok')
