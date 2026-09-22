(function(root){
'use strict';
// Map a unit square onto a clockwise quadrilateral, retaining perspective.
function mapping(q){
 if(!q||q.length!==4)throw Error('请按左上、右上、右下、左下的顺序选择四角');
 for(var i=0;i<4;i++){
  var a=q[i],b=q[(i+1)%4],c=q[(i+2)%4];
  if(!isFinite(a.x)||!isFinite(a.y)||(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x)<20)throw Error('四角范围无效，请顺时针重新选择');
 }
 var x0=q[0].x,y0=q[0].y,x1=q[1].x,y1=q[1].y,x2=q[2].x,y2=q[2].y,x3=q[3].x,y3=q[3].y;
 var dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3;
 var det=dx1*dy2-dx2*dy1,g=(dx3*dy2-dx2*dy3)/det,h=(dx1*dy3-dx3*dy1)/det;
 return function(u,v){var z=g*u+h*v+1;return {x:((x1-x0+g*x1)*u+(x3-x0+h*x3)*v+x0)/z,y:((y1-y0+g*y1)*u+(y3-y0+h*y3)*v+y0)/z};};
}
function rectify(frame,q){
 var map=mapping(q),w=600,h=500,data=new Uint8ClampedArray(w*h*4);
 for(var j=0;j<4;j++)if(q[j].x<0||q[j].y<0||q[j].x>=frame.width||q[j].y>=frame.height)throw Error('请在图片内选择棋盘四角');
 for(var y=0;y<h;y++)for(var x=0;x<w;x++){
  var p=map((x+.5)/w,(y+.5)/h),sx=Math.max(0,Math.min(frame.width-2,p.x)),sy=Math.max(0,Math.min(frame.height-2,p.y));
  var ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy,k=(iy*frame.width+ix)*4,d=(y*w+x)*4;
  for(var c=0;c<3;c++)data[d+c]=(frame.data[k+c]*(1-fx)+frame.data[k+4+c]*fx)*(1-fy)+(frame.data[k+frame.width*4+c]*(1-fx)+frame.data[k+(frame.width+1)*4+c]*fx)*fy;
  data[d+3]=255;
 }
 return {width:w,height:h,data:data};
}
function sample(frame,cx,cy,size){var a=[];for(var y=-4;y<=4;y++)for(var x=-4;x<=4;x++){if(x>1&&y>1)continue;var k=((Math.round(cy+y*size*.08))*frame.width+Math.round(cx+x*size*.08))*4;a.push([frame.data[k],frame.data[k+1],frame.data[k+2]]);}return a;}
function feature(a){var mean=[0,0,0],scale=[0,0,0],out=[];for(var i=0;i<a.length;i++)for(var c=0;c<3;c++)mean[c]+=a[i][c]/a.length;for(i=0;i<a.length;i++)for(c=0;c<3;c++)scale[c]+=Math.pow(a[i][c]-mean[c],2)/a.length;for(c=0;c<3;c++)scale[c]=Math.sqrt(scale[c]);for(i=0;i<a.length;i++)for(c=0;c<3;c++)out.push((a[i][c]-mean[c])/Math.max(18,scale[c]));return {values:out,mean:mean,contrast:Math.max.apply(null,scale)};}
function hue(p){var hi=Math.max.apply(null,p),lo=Math.min.apply(null,p),d=hi-lo;if(hi<55||d/hi<.27)return -1;var h=hi===p[0]?(p[1]-p[2])/d:hi===p[1]?(p[2]-p[0])/d+2:(p[0]-p[1])/d+4;return (h*60+360)%360;}
function read(frame,templates){
 var refs=templates.map(function(t){return {type:t.type,feat:feature(t.pixels.map(function(p){return [p>>16&255,p>>8&255,p&255];}))};}),board=[],errors=[],details=[],fail=0;
 for(var i=0;i<30;i++){
  var a=sample(frame,(i%6+.5)*100,(Math.floor(i/6)+.5)*100,100),f=feature(a),votes=[0,0,0,0,0,0],n=0;
  for(var s=0;s<a.length;s++){var h=hue(a[s]);if(h<0)continue;var type=h<32||h>=348?0:h<72?3:h<169?2:h<246?1:h<293?4:5;votes[type]++;n++;}
  var scores=[9,9,9,9,9,9,9,9];
  for(var t=0;t<refs.length;t++){
   var r=refs[t],sum=0;for(var j=0;j<f.values.length;j++)sum+=Math.pow(f.values[j]-r.feat.values[j],2);
   var score=sum/f.values.length;
   if(r.type!==7)score+=.65*(1-votes[r.type]/Math.max(1,n));
   else score+=.65;
   scores[r.type]=Math.min(scores[r.type],score);
  }
  var order=[0,1,2,3,4,5,7].sort(function(a,b){return scores[a]-scores[b];}),best=order[0],margin=scores[order[1]]-scores[best];
  var ok=f.contrast>=18&&scores[best]<1.05&&margin>.22;
  board.push(ok?best:6);errors.push(ok?scores[best]*30:255);if(!ok)fail++;
  details.push({type:best,score:scores[best],margin:margin,votes:votes});
 }
 return {board:board,errors:errors,fail:fail,rect:{x:0,y:0,s:100},details:details};
}
root.OrbPhoto={rectify:rectify,read:read};
})(typeof self!=='undefined'?self:globalThis);
