import sys
S='/tmp/claude-0/-home-claude/52072b9f-f344-5d3e-b0b9-e04f06b37d29/scratchpad'
src=open(S+'/beta_patch_full.py').read()
i=src.index("  // ファンキー：ブラスのキメ（2小節）"); j=src.index("  hornline:{name:'上もの：上がっていくメロディ', pro:'上もの：付点4分×2＋4分で上行（中音域")
defs=src[i:j]; assert '\\' not in defs
p=sys.argv[1]; s=open(p).read()
def rep(a,b,n=1):
    global s; assert s.count(a)==n,(a[:80],s.count(a)); s=s.replace(a,b)
rep("  hornline:{name:'上もの：上がっていくメロディ',", defs+"  hornline:{name:'上もの：上がっていくメロディ',")
rep("{id:9, name:'ファンキー', bpm:104, drum:'sixteen', arp:'offbeat', inst:'eguitar', kit:'std', bass:true},",
    "{id:9, name:'ファンキー', bpm:104, drum:'sixteen', arp:'clavfunk', inst:'clav', arp2:'brasshit', inst2:'brass3', kit:'std', bass:true},")
rep("{id:13, name:'レゲエ', bpm:80, drum:'reggae', arp:'offbeat', inst:'organ', kit:'std', bass:true},",
    "{id:13, name:'レゲエ', bpm:80, drum:'reggae', arp:'skank', inst:'organ', kit:'std', bass:true},")
rep("'glockline','brassobb','hornline'];","'glockline','brassobb','brasshit','hornline','skank'];")
rep("['brassobb','パッと合いの手'],","['brassobb','パッと合いの手'],['brasshit','ブラスのキメ'],")
rep("const P2DEF={glockline:'glock',brassobb:'brass3',","const P2DEF={glockline:'glock',brassobb:'brass3',brasshit:'brass3',")
open(p,'w').write(s); print('main ok')
