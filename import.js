(function(root){'use strict';
function inspect(value){
var received=typeof value==='string'?value.length:0,repairs=[];
function fail(message){throw Error(message+'（收到 '+received+' 个字符）');}
if(typeof value!=='string')fail('没有收到截图数据');
if(value.charAt(0)==='#'&&value.indexOf('#image=')!==0)return null;
if(value.length>2000000)fail('截图传输内容过大，请缩小图片或使用粘贴截图');
if(value.indexOf('#image=')===0)value=value.slice(7);
for(var i=0;i<2&&value.indexOf('%')!==-1;i++){try{value=decodeURIComponent(value);repairs.push('网址转义');}catch(e){fail('网址转义不完整，请重新运行快捷指令或粘贴截图');}}
value=value.replace(/^data:image\/(png|jpeg|jpg);base64,/i,'');
if(/\s/.test(value)){value=value.replace(/\s/g,'');repairs.push('空白与换行');}
if(!value)fail('图片编码为空，请检查快捷指令的文本是否带入编码变量');
if(/[-_]/.test(value)){value=value.replace(/-/g,'+').replace(/_/g,'/');repairs.push('URL 安全编码');}
if(!/^[A-Za-z0-9+/]+={0,2}$/.test(value))fail('图片编码含无效字符，请检查传入内容是否为图片 Base64');
var raw=value.replace(/=+$/,''),need=(4-raw.length%4)%4,existing=value.length-raw.length;
if(need===3||existing>need)fail('图片编码长度异常，可能缺失数据，请重新传图');
if(existing<need){value=raw+new Array(need+1).join('=');repairs.push('末尾补位');}
var binary;try{binary=atob(value);}catch(e){fail('图片编码无法解码');}
var type=binary.slice(0,8)==='\x89PNG\r\n\x1a\n'?'png':binary.slice(0,3)==='\xff\xd8\xff'?'jpeg':null;
if(!type)fail('不是 PNG / JPEG 图片，请检查转换图像动作');
if(type==='jpeg'&&binary.slice(-2)!=='\xff\xd9'||type==='png'&&binary.slice(-12)!=='\x00\x00\x00\x00IEND\xae\x42\x60\x82')fail('图片结尾不完整或格式不支持，无法自动补回，请使用粘贴截图');
return {src:'data:image/'+type+';base64,'+value,type:type,received:received,bytes:binary.length,repairs:repairs};
}
function parse(value){var result=inspect(value);return result?result.src:null;}
root.OrbImport={parse:parse,inspect:inspect};
})(typeof self!=='undefined'?self:globalThis);
