(function(){'use strict';var names=['火','水','木','光','暗','心','?','叉'],board=[],selected=0,frame=null,boardRect=null,worker=null,route=null,step=0,timer=null,busy=false,corners=null,loadId=0;function el(id){return document.getElementById(id);}function say(s){el('status').textContent=s;}function stop(){clearInterval(timer);timer=null;el('play').textContent='播放';}function invalidate(){stop();route=null;el('result').hidden=true;}function render(target,b,editable,active){var box=el(target);box.innerHTML='';for(var i=0;i<30;i++){var n=document.createElement(editable?'button':'div');n.className='orb t'+b[i]+(i===active?' active':'');n.textContent=names[b[i]];n.setAttribute('aria-label','第'+(Math.floor(i/6)+1)+'行第'+(i%6+1)+'列 '+names[b[i]]);if(editable)(function(index){n.onclick=function(){if(busy)return;board[index]=selected;invalidate();draw();};})(i);box.appendChild(n);}}function draw(){render('board',board,true,-1);el('solve').disabled=busy||board.indexOf(6)!==-1;}
function setBusy(value){busy=value;el('cancel').hidden=!value;el('file').disabled=value;el('pasteImage').disabled=value;el('manual').disabled=value;el('mode').disabled=value;el('cropStart').disabled=value;if(board.length)draw();}
function run(data,done){setBusy(true);if(worker)worker.terminate();try{worker=new Worker('worker.js');worker.onmessage=function(e){worker.terminate();worker=null;setBusy(false);if(e.data.error)say(e.data.error);else done(e.data.result);};worker.onerror=function(){worker.terminate();worker=null;setBusy(false);say('当前浏览器无法运行分析。请用 Safari 打开或更新系统。');};worker.postMessage(data);}catch(e){setBusy(false);say('浏览器不支持后台分析，请用较新版本 Safari。');}}
function photo(rect){if(!frame)return;var c=el('photo'),ctx=c.getContext('2d');c.width=frame.width;c.height=frame.height;ctx.putImageData(frame,0,0);if(rect){ctx.strokeStyle='#29fa9a';ctx.lineWidth=Math.max(2,frame.width/240);ctx.strokeRect(rect.x,rect.y,rect.s*6,rect.s*5);}c.hidden=false;el('crop').hidden=false;}
function accept(r){boardRect=r?r.rect:null;if(!r){board=[];for(var i=0;i<30;i++)board.push(6);say('未能自动定位。请展开下方「手动选择棋盘」，在截图上选择两个角。');el('crop').open=true;}else{board=r.board.map(function(v,i){return r.errors[i]>35?6:v;});photo(r.rect);say(r.fail?'已找到候选棋盘，问号格无法可靠识别，请手动修正或重新选取范围。':'已识别棋盘。请逐格核对，再规划路线。');}el('edit').hidden=false;draw();}
function beginImport(){
var id=++loadId;if(worker){worker.terminate();worker=null;}invalidate();board=[];corners=null;
el('edit').hidden=true;frame=null;boardRect=null;el('photo').hidden=true;el('crop').hidden=true;
say('正在读取截图…');setBusy(true);return id;
}
function loadImage(src,id){
if(id!==loadId)return;
var img=new Image();img.onerror=function(){if(id!==loadId)return;setBusy(false);say('无法读取图片，请重新截图或选择 PNG / JPG 图片。');};
img.onload=function(){if(id!==loadId)return;try{
if(!img.width||!img.height||img.width*img.height>40000000)throw Error('图片尺寸过大');
var scale=Math.min(1,1080/img.width,2600/img.height),c=el('photo');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);
var ctx=c.getContext('2d');ctx.drawImage(img,0,0,c.width,c.height);frame=ctx.getImageData(0,0,c.width,c.height);photo();
say('已收到截图，正在定位和识别棋盘…');run({kind:'recognize',frame:frame},accept);
}catch(e){setBusy(false);say('图片处理失败，请缩小截图后重试。');}};img.src=src;
}
function loadFile(f,id){if(!f)return;if(id===undefined)id=beginImport();if(id!==loadId)return;if(f.size>25*1024*1024){setBusy(false);say('图片过大，请选择小于 25 MB 的截图。');return;}
var reader=new FileReader();reader.onerror=function(){if(id!==loadId)return;setBusy(false);say('图片读取失败，请重新选择。');};reader.onload=function(){loadImage(reader.result,id);};reader.readAsDataURL(f);}
function loadText(text,id){if(id===undefined)id=beginImport();if(id!==loadId)return;try{var src=OrbImport.parse(text);if(!src)throw Error('没有找到截图，请复制图像或快捷指令生成的图片编码');loadImage(src,id);}catch(e){setBusy(false);say(e.message);}}
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
el('manual').onclick=function(){invalidate();boardRect=null;board=[];for(var i=0;i<30;i++)board.push(6);el('edit').hidden=false;draw();say('先选择珠子，再点击格子填写全部 30 格。');};
for(var p=0;p<8;p++){if(p===6)continue;(function(type){var b=document.createElement('button');b.className='orb t'+type;b.textContent=names[type];b.setAttribute('aria-label','选择'+names[type]+'珠');b.setAttribute('aria-pressed',type===selected?'true':'false');b.onclick=function(){selected=type;var all=el('palette').children;for(var j=0;j<all.length;j++)all[j].setAttribute('aria-pressed',all[j]===b?'true':'false');};el('palette').appendChild(b);})(p);}
el('cropStart').onclick=function(){if(busy)return;corners=[];photo();say('请先点击棋盘左上角，再点击棋盘右下角。');};el('photo').onclick=function(e){if(!corners||busy)return;var r=this.getBoundingClientRect(),pt={x:(e.clientX-r.left)*this.width/r.width,y:(e.clientY-r.top)*this.height/r.height};corners.push(pt);if(corners.length===1){say('接着点击棋盘右下角。');return;}var a=corners[0],b=corners[1];corners=null;var w=b.x-a.x,h=b.y-a.y;if(w<60||h<50||Math.abs(w/h-1.2)>.2){say('范围不符合 6×5 棋盘，请重新选取。');return;}invalidate();var rect={x:a.x,y:a.y,s:Math.min(w/6,h/5)};accept(OrbCore.read(frame,rect,ORB_TEMPLATES,false));};
el('cancel').onclick=function(){loadId++;if(worker)worker.terminate();worker=null;setBusy(false);say('已取消，可重新开始。');};el('solve').onclick=function(){if(board.indexOf(6)!==-1||busy)return;invalidate();say('正在分析路线…');run({kind:'solve',board:board,mode:el('mode').value},function(r){if(!r){say('本次搜索未找到消除路线，请核对棋盘或选择更多连击。');return;}route=r;step=0;el('score').textContent='预计 '+r.total+' 连击 · 移动 '+(r.path.length-1)+' 步';el('result').hidden=false;showStep();say('路线已生成，先练习并记住路线，再回到游戏。');el('result').scrollIntoView();});};
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
