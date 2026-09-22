(function(root){'use strict';
function parse(value){
if(typeof value!=='string')throw Error('没有收到截图数据');
if(value.charAt(0)==='#'&&value.indexOf('#image=')!==0)return null;
if(value.length>2000000)throw Error('截图传输内容过大，请将快捷指令中的图片宽度设为 900，或改用粘贴截图');
if(value.indexOf('#image=')===0)value=value.slice(7);
try{value=decodeURIComponent(value);}catch(e){throw Error('截图链接不完整，请重新运行快捷指令');}
value=value.replace(/^data:image\/(png|jpeg);base64,/i,'').replace(/\s/g,'');
if(!value||value.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(value))throw Error('截图数据不完整，请重新截图或使用粘贴截图');
var header;try{header=atob(value.slice(0,16));}catch(e){throw Error('截图编码无效');}
var type=header.slice(0,8)==='\x89PNG\r\n\x1a\n'?'png':header.charCodeAt(0)===255&&header.charCodeAt(1)===216&&header.charCodeAt(2)===255?'jpeg':null;
if(!type)throw Error('只支持 PNG / JPEG 截图，请检查快捷指令的转换图像动作');
return 'data:image/'+type+';base64,'+value;
}
root.OrbImport={parse:parse};
})(typeof self!=='undefined'?self:globalThis);
