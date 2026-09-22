(function(){
'use strict';
var target=document.getElementById('shortcutURL');
if(!target)return;
if(location.protocol!=='https:'&&location.protocol!=='http:'){
target.textContent='请先用浏览器打开已部署的网站，再复制这里显示的网址。';
return;
}
target.textContent=new URL('./',location.href).href+'#image=';
})();
