const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); p.on('pageerror',e=>console.log('ERR',e.message)); await p.goto('http://localhost:8765/'); await p.waitForTimeout(600); await b.close(); })();
