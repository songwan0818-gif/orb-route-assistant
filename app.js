(function(){'use strict';var names=['火','水','木','光','暗','心','?','叉'],board=[],selected=0,frame=null,sourceFrame=null,boardRect=null,worker=null,route=null,step=0,timer=null,busy=false,corners=null,loadId=0;function el(id){return document.getElementById(id);}function say(s){el('status').textContent=s;}function stop(){clearInterval(timer);timer=null;el('play').textContent='播放';}function invalidate(){stop();route=null;el('result').hidden=true;}function render(target,b,editable,active){var box=el(target);box.innerHTML='';for(var i=0;i<30;i++){var n=document.createElement(editable?'button':'div');n.className='orb t'+b[i]+(i===active?' active':'');n.textContent=names[b[i]];n.setAttribute('aria-label','第'+(Math.floor(i/6)+1)+'行第'+(i%6+1)+'列 '+names[b[i]]);if(editable)(function(index){n.onclick=function(){if(busy)return;board[index]=selected;invalidate();draw();};})(i);box.appendChild(n);}}function draw(){render('board',board,true,-1);el('solve').disabled=busy||board.indexOf(6)!==-1;}
function setBusy(value){busy=value;el('cancel').hidden=!value;el('file').disabled=value;el('pasteImage').disabled=value;el('manual').disabled=value;el('mode').disabled=value;el('cropStart').disabled=value;el('cropUndo').disabled=value;el('cropCancel').disabled=value;if(board.length)draw();}
function run(data,done){setBusy(true);if(worker)worker.terminate();try{worker=new Worker('worker.js?v=031');worker.onmessage=function(e){worker.terminate();worker=null;setBusy(false);if(e.data.error)say(e.data.error);else done(e.data.result);};worker.onerror=function(){worker.terminate();worker=null;setBusy(false);say('当前浏览器无法运行分析。请用系统浏览器打开或更新浏览器。');};worker.postMessage(data);}catch(e){setBusy(false);say('浏览器不支持后台分析，请更新浏览器后重试。');}}
function photo(rect){if(!frame)return;var c=el('photo'),ctx=c.getContext('2d');c.width=frame.width;c.height=frame.height;ctx.putImageData(frame,0,0);if(rect){ctx.strokeStyle='#29fa9a';ctx.lineWidth=Math.max(2,frame.width/240);ctx.strokeRect(rect.x,rect.y,rect.s*6,rect.s*5);}c.hidden=false;el('crop').hidden=false;}
function accept(r){boardRect=r?r.rect:null;if(!r){board=[];for(var i=0;i<30;i++)board.push(6);say('未能自动定位。请使用下方「点四角识别」，依次点棋盘左上、右上、右下、左下四个角。');el('crop').open=true;el('edit').hidden=true;return;}else{board=r.board.map(function(v,i){return r.errors[i]>35?6:v;});photo(r.rect);say(r.fail?'已找到候选棋盘，问号格无法可靠识别，请手动修正或重新选取范围。':'已识别棋盘。请逐格核对，再规划路线。');}el('edit').hidden=false;draw();}
function beginImport(){
var id=++loadId;if(worker){worker.terminate();worker=null;}invalidate();board=[];corners=null;
el('edit').hidden=true;frame=null;sourceFrame=null;boardRect=null;el('photo').classList.remove('selecting');el('cropActions').hidden=true;el('cornerHint').textContent='';el('photo').hidden=true;el('crop').hidden=true;
el('transferStatus').textContent='';say('正在读取截图…');setBusy(true);return id;
}
function loadImage(src,id){
if(id!==loadId)return;
var img=new Image();img.onerror=function(){if(id!==loadId)return;setBusy(false);if(el('transferStatus').textContent)el('transferStatus').textContent+=' 图片解码失败，内容可能损坏。';say('无法读取图片，请重新截图或选择 PNG / JPG 图片。');};
img.onload=function(){if(id!==loadId)return;try{
if(el('transferStatus').textContent)el('transferStatus').textContent=el('transferStatus').textContent.replace('正在验证图片能否读取。','图片已成功读取。');
if(!img.width||!img.height||img.width*img.height>40000000)throw Error('图片尺寸过大');
var scale=Math.min(1,1080/img.width,2600/img.height),c=el('photo');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);
var ctx=c.getContext('2d');ctx.drawImage(img,0,0,c.width,c.height);frame=ctx.getImageData(0,0,c.width,c.height);sourceFrame=frame;photo();
say('已收到截图，正在定位和识别棋盘…');run({kind:'recognize',frame:frame},accept);
}catch(e){setBusy(false);say('图片处理失败，请缩小截图后重试。');}};img.src=src;
}
function loadFile(f,id){if(!f)return;if(id===undefined)id=beginImport();if(id!==loadId)return;if(f.size>25*1024*1024){setBusy(false);say('图片过大，请选择小于 25 MB 的截图。');return;}
var reader=new FileReader();reader.onerror=function(){if(id!==loadId)return;setBusy(false);say('图片读取失败，请重新选择。');};reader.onload=function(){loadImage(reader.result,id);};reader.readAsDataURL(f);}
function loadText(text,id){if(id===undefined)id=beginImport();if(id!==loadId)return;try{var checked=OrbImport.inspect(text);if(!checked)throw Error('没有找到截图，请复制图像或快捷指令生成的图片编码');el('transferStatus').textContent='传图检查：'+checked.type.toUpperCase()+'，收到 '+checked.received+' 个字符；'+(checked.repairs.length?'已规范化：'+checked.repairs.join('、'):'编码格式正常')+'。正在验证图片能否读取。';loadImage(checked.src,id);}catch(e){setBusy(false);el('transferStatus').textContent='传图检查未通过：'+e.message;el('pasteHelp').open=true;say('自动导入未完成，请点击粘贴截图，或在输入框长按粘贴。');}}
function importHash(){if(location.hash.indexOf('#image=')!==0)return;var value=location.hash;
try{history.replaceState(null,'',location.pathname+location.search);}catch(ignore){}
loadText(value);}
el('file').onchange=function(){var f=this.files[0];if(f)loadFile(f);this.value='';};
el('pasteImage').onclick=function(){
if(busy)return;
if(!navigator.clipboard||!navigator.clipboard.read){el('pasteHelp').open=true;el('pasteField').focus();say('请在下方输入框长按并选择「粘贴」，或直接选择截图。');return;}
var id=beginImport();say('请允许粘贴截图；若出现「粘贴」提示，请点击它。');
navigator.clipboard.read().then(function(items){if(id!==loadId)return;for(var i=0;i<items.length;i++){for(var j=0;j<items[i].types.length;j++){var type=items[i].types[j];if(type==='image/png'||type==='image/jpeg'){return items[i].getType(type).then(function(blob){loadFile(blob,id);});}}}
for(i=0;i<items.length;i++)if(items[i].types.indexOf('text/plain')!==-1)return items[i].getType('text/plain').then(function(blob){var r=new FileReader();r.onload=function(){loadText(r.result,id);};r.onerror=function(){if(id!==loadId)return;setBusy(false);say('剪贴板读取失败，请使用选择截图。');};r.readAsText(blob);});
throw Error('剪贴板没有 PNG / JPEG 截图');
}).catch(function(){if(id!==loadId)return;setBusy(false);el('pasteHelp').open=true;say('未能读取剪贴板。请在下方框内长按并粘贴，或选择截图。');});
};
el('pasteField').addEventListener('paste',function(e){if(busy)return;var data=e.clipboardData;if(!data)return;var files=data.files;for(var i=0;i<files.length;i++)if(/^image\//.test(files[i].type)){e.preventDefault();loadFile(files[i]);this.value='';return;}
var text=data.getData('text/plain');if(text){e.preventDefault();this.value='';loadText(text);}});
window.addEventListener('hashchange',importHash);
importHash();
el('manual').onclick=function(){corners=null;el('photo').classList.remove('selecting');el('cropActions').hidden=true;el('cornerHint').textContent='';invalidate();boardRect=null;board=[];for(var i=0;i<30;i++)board.push(6);el('edit').hidden=false;draw();say('先选择珠子，再点击格子填写全部 30 格。');};
for(var p=0;p<8;p++){if(p===6)continue;(function(type){var b=document.createElement('button');b.className='orb t'+type;b.textContent=names[type];b.setAttribute('aria-label','选择'+names[type]+'珠');b.setAttribute('aria-pressed',type===selected?'true':'false');b.onclick=function(){selected=type;var all=el('palette').children;for(var j=0;j<all.length;j++)all[j].setAttribute('aria-pressed',all[j]===b?'true':'false');};el('palette').appendChild(b);})(p);}
var cornerNames=['左上角','右上角','右下角','左下角'];
function drawCorners(){
photo();var c=el('photo'),ctx=c.getContext('2d'),r=Math.max(9,frame.width/45);
ctx.strokeStyle='#29fa9a';ctx.lineWidth=Math.max(3,frame.width/240);ctx.beginPath();
for(var i=0;i<corners.length;i++){var p=corners[i];if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);}ctx.stroke();
for(i=0;i<corners.length;i++){p=corners[i];ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle='#153b70';ctx.fill();ctx.strokeStyle='white';ctx.stroke();ctx.fillStyle='white';ctx.font='bold '+Math.round(r*1.4)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i+1),p.x,p.y);}
el('cornerHint').textContent='第 '+(corners.length+1)+' / 4 步：点棋盘'+cornerNames[corners.length]+'（选整个棋盘边界，不是珠子中心）';el('cropUndo').disabled=!corners.length;
}
el('cropStart').onclick=function(){if(busy||!sourceFrame)return;invalidate();frame=sourceFrame;boardRect=null;board=[];el('edit').hidden=true;corners=[];el('photo').classList.add('selecting');el('cropActions').hidden=false;drawCorners();say('按左上 → 右上 → 右下 → 左下点四角。点错可撤销。');el('cornerHint').scrollIntoView({block:'start'});};
el('cropUndo').onclick=function(){if(!corners||busy)return;corners.pop();drawCorners();};
el('cropCancel').onclick=function(){if(busy)return;corners=null;el('photo').classList.remove('selecting');el('cropActions').hidden=true;el('cornerHint').textContent='';photo();say('已取消选角，可重新选择棋盘或导入图片。');};
el('photo').onclick=function(e){if(!corners||busy)return;var r=this.getBoundingClientRect();corners.push({x:Math.max(0,Math.min(this.width-1,(e.clientX-r.left)*this.width/r.width)),y:Math.max(0,Math.min(this.height-1,(e.clientY-r.top)*this.height/r.height))});if(corners.length<4){drawCorners();return;}
var q=corners.slice();corners=null;el('photo').classList.remove('selecting');el('cropActions').hidden=true;el('cornerHint').textContent='';invalidate();say('正在校正倾斜并识别珠子…');
run({kind:'photo',frame:sourceFrame,corners:q},function(result){var corrected=el('photo').getContext('2d').createImageData(result.frame.width,result.frame.height);corrected.data.set(result.frame.data);frame=corrected;accept(result.recognition);el('crop').open=false;say(result.recognition.fail?'已校正照片。请修正问号格；若较多，请重新选择四角或避免反光重拍。':'照片已校正，30 格已识别。核对后即可规划最多 15 步的路线。');el('edit').scrollIntoView({block:'start'});});};
el('cancel').onclick=function(){loadId++;if(worker)worker.terminate();worker=null;setBusy(false);say('已取消，可重新开始。');};el('solve').onclick=function(){if(board.indexOf(6)!==-1||busy)return;invalidate();say('正在分析路线…');run({kind:'solve',board:board,mode:el('mode').value},function(r){if(!r){say('15 步内未找到消除路线，请核对棋盘或选择更多连击重新分析。');return;}if(r.path.length>16){say('路线超过 15 步，请刷新网页后重试。');return;}route=r;step=0;el('score').textContent='预计 '+r.total+' 连击 · 移动 '+(r.path.length-1)+' 步';el('result').hidden=false;showStep();say('路线已生成，先练习并记住路线，再回到游戏。');el('result').scrollIntoView();});};
function showStep(){
if(!route)return;
var path=route.path,i,at=path[step],canvas=el('routePhoto');
var hasPhoto=!!(frame&&boardRect);
canvas.hidden=!hasPhoto;el('routeBoard').hidden=hasPhoto;
if(hasPhoto){
canvas.width=600;canvas.height=500;
var source=document.createElement('canvas');source.width=frame.width;source.height=frame.height;
source.getContext('2d').putImageData(frame,0,0);
canvas.getContext('2d').drawImage(source,boardRect.x,boardRect.y,boardRect.s*6,boardRect.s*5,0,0,600,500);
}else render('routeBoard',board,false,-1);
el('stepText').textContent=(step===0?'起点':step===path.length-1?'终点，松手':'第 '+step+' 步')+'：第 '+(Math.floor(at/6)+1)+' 行，第 '+(at%6+1)+' 列';
function xy(n){return {x:(n%6+.5)*100,y:(Math.floor(n/6)+.5)*100};}
var points=[],arrows='',start=xy(path[0]),end=xy(path[path.length-1]),current=xy(at);
for(i=0;i<path.length;i++)points.push(xy(path[i]).x+','+xy(path[i]).y);
for(i=1;i<path.length;i++){
var a=xy(path[i-1]),b=xy(path[i]),x=(a.x+b.x)/2,y=(a.y+b.y)/2,angle=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
arrows+='<path d="M -9 -8 L 0 0 L -9 8" transform="translate('+x+' '+y+') rotate('+angle+')" fill="none" stroke="white" stroke-opacity=".7" stroke-width="4" stroke-linecap="round"/>';
}
var svg='<polyline points="'+points.join(' ')+'" fill="none" stroke="#0c1725" stroke-opacity=".58" stroke-width="28" stroke-linejoin="round" stroke-linecap="round"/>'+arrows;
function badge(pt,label,color,dy){return '<g transform="translate('+pt.x+' '+(pt.y+dy)+')"><rect x="-20" y="-16" width="40" height="32" rx="8" fill="'+color+'" stroke="white" stroke-width="2"/><text text-anchor="middle" y="7" fill="white" font-size="21" font-weight="700">'+label+'</text></g>';}
svg+=badge(start,'起','#156744',-24)+badge(end,'终','#9d3528',24);
svg+='<circle cx="'+current.x+'" cy="'+current.y+'" r="19" fill="none" stroke="#fff" stroke-width="5"/><circle cx="'+current.x+'" cy="'+current.y+'" r="22" fill="none" stroke="#172b46" stroke-width="2"/>';
el('routeLine').innerHTML=svg;
var dirs=[];for(i=1;i<path.length;i++){var d=path[i]-path[i-1];dirs.push(i+':'+(d===1?'→':d===-1?'←':d===6?'↓':'↑'));}
el('directions').textContent=dirs.join(' ');el('prev').disabled=step===0;el('next').disabled=step===path.length-1;
}
el('prev').onclick=function(){stop();if(step>0)step--;showStep();};el('next').onclick=function(){stop();if(route&&step<route.path.length-1)step++;showStep();};el('reset').onclick=function(){stop();step=0;showStep();};el('play').onclick=function(){if(timer){stop();return;}if(!route)return;if(step===route.path.length-1)step=0;el('play').textContent='暂停';showStep();timer=setInterval(function(){step++;showStep();if(step===route.path.length-1)stop();},800);};
if(!window.FileReader||!el('photo').getContext){el('file').disabled=true;say('当前浏览器不支持图片处理，请更新 Safari。');}
if(document.modelContext&&document.modelContext.registerTool){try{document.modelContext.registerTool({name:'get_orb_board',description:'读取当前核对棋盘和已规划路线，不包含截图。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:function(input){if(!input||Object.keys(input).length)throw Error('不接受额外参数');return {board:board.slice(),route:route?route.path.slice():null,busy:busy};}});}catch(ignore){}}
})();
