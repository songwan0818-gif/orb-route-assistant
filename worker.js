importScripts('templates.js','core.js');
onmessage=function(e){try{var d=e.data;postMessage({result:d.kind==='recognize'?OrbCore.recognize(d.frame,ORB_TEMPLATES):OrbCore.solve(d.board,d.mode)});}catch(err){postMessage({error:err.message||'处理失败'});}};
