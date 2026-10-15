/* Shared deterministic level geometry: rendering, movement and tests use the same rules. */
(function(root) {
  'use strict';
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const specs = [
    {type:'crossing', duration:300, bounds:[-860,-860,860,860], start:[0,640], stops:[[-640,0],[640,0],[0,-640]], exit:[0,-740], label:'在鼠潮中存活，擊敗勞鼠王！', ending:'08:59，打卡成功。Goo 把今晚的羽球邀約按下「參加」。'},
    {type:'store', duration:360, bounds:[-720,-720,720,720], start:[0,540], stops:[[-620,520],[-620,-530],[270,-540]], exit:[0,625], label:'在店內閃避怪群，擊敗便利商店王八哥！', ending:'飯糰、豆漿和蛋都保住了。今天的早餐，一口也不分給八哥。'},
    {type:'ring', duration:360, bounds:[-780,-780,780,780], start:[0,540], stops:[[540,0],[0,-540],[-540,0]], exit:[0,540], label:'沿環道閃避追擊，擊敗紅燈不等雞王！', ending:'雞王終於不再擋路。Goo 趕緊離開圓環，趁午休結束前吃口飯。'},
    {type:'vertical', duration:360, bounds:[-300,-1000,300,1000], start:[0,800], stops:[[-170,450],[170,-100],[-170,-680]], exit:[0,-850], label:'繞過人行道障礙，擊敗老屁孩！', ending:'咖啡還是熱的。Goo 在杯套上寫下：今天也辛苦了。'},
    {type:'office', duration:360, bounds:[-950,-700,950,700], start:[-780,480], stops:[[-760,-470],[100,-520],[740,430]], exit:[790,-540], label:'穿梭辦公室走道，擊敗加班勞鼠王！', ending:'加班勞鼠王退場了。Goo 關掉工作通知，踏出大門。球友傳來：「就等你了！」'},
    {type:'route', duration:360, bounds:[-700,-1800,700,1800], start:[0,300], stops:[[0,1200],[0,0],[0,-1200]], exit:[0,-1200], endless:true, label:'在河濱道路迎戰，擊敗陽明山豬王！', ending:'球拍握穩，羽球落下。Goo 的週末，現在才真正開始。'},
    {type:'court', duration:420, bounds:[-760,-760,760,760], start:[0,300], stops:[[-470,0],[0,-470],[470,0]], exit:[0,490], label:'避開羽球榴彈，擊敗收假老屁孩！', ending:'終於順利打完球回到家懶在沙發上，又活過了一天，你真棒'}
  ];
  const routeCenter = x => Math.sin(x/430)*130;
  const routeWidth = x => 200 + Math.cos(x/320)*55;
  const rectHit = (x,y,r,o) => Math.hypot(x-clamp(x,o.x,o.x+o.w),y-clamp(y,o.y,o.y+o.h)) < r;
  const routeCache=new Map();
  function localBounds(index,y=0) {return index===5?[-700,y-1800,700,y+1800]:specs[index].bounds;}
  function supplies(index,y=0) {
    if(index!==5)return specs[index].stops.map((p,key)=>({x:p[0],y:p[1],key}));
    const points=[];
    for(let n=Math.floor((y-1200)/600);n<=Math.ceil((y+1200)/600);n++)points.push({x:n%2?60:-60,y:n*600,key:`route:${n}`});
    return points;
  }
  function obstacles(index,time,grace=0,aroundY=0) {
    if(index===0) {
      const list=[{x:-860,y:-860,w:630,h:630},{x:230,y:-860,w:630,h:630},{x:-860,y:230,w:630,h:630},{x:230,y:230,w:630,h:630}];
      if(time>18 && grace<=0) {
        const verticalGreen = Math.floor((time-18)/12)%2===0;
        if(verticalGreen) list.push({x:-275,y:-230,w:22,h:460},{x:253,y:-230,w:22,h:460});
        else list.push({x:-230,y:-275,w:460,h:22},{x:-230,y:253,w:460,h:22});
      }
      return list;
    }
    if(index===3) return [{kind:'stall',x:-300,y:230,w:260,h:110},{kind:'scooter',x:80,y:-340,w:190,h:90},{kind:'cargo',x:-270,y:-560,w:110,h:110},{kind:'scooter',x:120,y:590,w:150,h:85}];
    if(index===4) return [
      ...[-530,-80,370].flatMap(x=>[-170,180].map(y=>({kind:'desk',x,y,w:240,h:130}))),
      {kind:'wall',x:-500,y:-700,w:24,h:230},{kind:'wall',x:-500,y:-300,w:24,h:80},
      {kind:'wall',x:-950,y:-240,w:200,h:24},{kind:'wall',x:-580,y:-240,w:104,h:24},
      {kind:'counter',x:-920,y:-670,w:350,h:80},
      {kind:'wall',x:430,y:-700,w:24,h:230},{kind:'wall',x:430,y:-300,w:24,h:60},
      {kind:'wall',x:430,y:-260,w:130,h:24},{kind:'wall',x:760,y:-260,w:190,h:24},
      {kind:'toilet',x:480,y:-670,w:95,h:110},{kind:'toilet',x:625,y:-670,w:95,h:110}];
    if(index===5) {
      const chunk=Math.floor(aroundY/1800);
      if(!routeCache.has(chunk)){
        const props=[];for(let n=chunk-1;n<=chunk+1;n++)for(const [x,y] of [[-265,430],[160,980],[-210,1510]])props.push({kind:'bike',x,y:n*1800+y,w:105,h:65});
        if(routeCache.size>=6)routeCache.delete(routeCache.keys().next().value);routeCache.set(chunk,props);
      }
      return routeCache.get(chunk);
    }
    return [];
  }
  function inside(index,x,y,r=20,time=0,grace=0,extra=[]) {
    const spec=specs[index],b=spec.bounds;
    if(x<b[0]+r||x>b[2]-r||(index!==5&&(y<b[1]+r||y>b[3]-r)))return false;
    if(index===2) { const d=Math.hypot(x,y);if(d<320+r||d>740-r)return false; }
    if(index===5 && Math.abs(x)>300-r)return false;
    return !obstacles(index,time,grace,y).concat(extra).some(o=>rectHit(x,y,r,o));
  }
  function project(index,x,y,r=20,time=0,grace=0,extra=[]) {
    const b=localBounds(index,y);
    x=clamp(x,b[0]+r,b[2]-r); y=clamp(y,b[1]+r,b[3]-r);
    if(index===2) {
      let d=Math.hypot(x,y),a=d?Math.atan2(y,x):Math.PI/2;
      const nd=index===2?clamp(d,320+r,740-r):Math.min(d,700-r);
      x=Math.cos(a)*nd;y=Math.sin(a)*nd;
    }
    if(index===5)x=clamp(x,-300+r,300-r);
    for(let k=0;k<4;k++)for(const o of obstacles(index,time,grace,y).concat(extra))if(rectHit(x,y,r,o)) {
      const c=[{x:o.x-r-1,y},{x:o.x+o.w+r+1,y},{x,y:o.y-r-1},{x,y:o.y+o.h+r+1}].sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y));
      const chosen=c.find(p=>p.x>=b[0]+r&&p.x<=b[2]-r&&p.y>=b[1]+r&&p.y<=b[3]-r);if(chosen){x=chosen.x;y=chosen.y;}
    }
    if(!inside(index,x,y,r,time,grace,extra)){
      let best=null,distance=Infinity;
      for(let py=b[1]+r;py<=b[3]-r;py+=32)for(let px=b[0]+r;px<=b[2]-r;px+=32){
        const d=(px-x)**2+(py-y)**2;
        if(d<distance&&inside(index,px,py,r,time,grace,extra)){best={x:px,y:py};distance=d;}
      }
      if(best)return best;
    }
    return {x,y};
  }
  function move(index,e,dx,dy,time=0,grace=0,extra=[]) {
    // Substeps prevent fast charges from tunnelling through shelves or closed gates.
    const n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/8));
    for(let i=0;i<n;i++) {
      if(inside(index,e.x+dx/n,e.y,e.radius,time,grace,extra))e.x+=dx/n;
      if(inside(index,e.x,e.y+dy/n,e.radius,time,grace,extra))e.y+=dy/n;
    }
  }
  function navigation(index,target,time=0,grace=0,extra=[]) {
    const b=localBounds(index,target.y),cell=64,cols=Math.ceil((b[2]-b[0])/cell),rows=Math.ceil((b[3]-b[1])/cell);
    const distance=new Int32Array(cols*rows).fill(-1),pass=new Uint8Array(cols*rows),points=[];
    let goal=-1,best=Infinity;
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      const i=y*cols+x,p={x:b[0]+(x+.5)*cell,y:b[1]+(y+.5)*cell};points[i]=p;
      if(inside(index,p.x,p.y,30,time,grace,extra)){pass[i]=1;const d=Math.hypot(p.x-target.x,p.y-target.y);if(d<best){best=d;goal=i;}}
    }
    if(goal<0)return null;
    const q=[goal];distance[goal]=0;
    for(let k=0;k<q.length;k++){const i=q[k],x=i%cols,y=Math.floor(i/cols);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,n=ny*cols+nx;if(nx<0||ny<0||nx>=cols||ny>=rows||!pass[n]||distance[n]>=0)continue;distance[n]=distance[i]+1;q.push(n);}}
    return {points,distance,cols,rows,cell,b};
  }
  function waypoint(field,e,target) {
    if(!field)return target;
    const {b,cols,rows,cell,distance,points}=field;
    const x=clamp(Math.floor((e.x-b[0])/cell),0,cols-1),y=clamp(Math.floor((e.y-b[1])/cell),0,rows-1);
    let best=null,score=Infinity;
    for(const [dx,dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,i=ny*cols+nx;if(nx<0||ny<0||nx>=cols||ny>=rows||distance[i]<0)continue;const s=distance[i]*cell+Math.hypot(e.x-points[i].x,e.y-points[i].y)*.25;if(s<score){score=s;best=points[i];}}
    return best||target;
  }
  function segmentDistance(px,py,ax,ay,bx,by) {
    const dx=bx-ax,dy=by-ay,t=clamp(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1),0,1);
    return Math.hypot(px-ax-t*dx,py-ay-t*dy);
  }
  root.GooWorld={specs,localBounds,supplies,inside,project,move,obstacles,routeCenter,routeWidth,segmentDistance,navigation,waypoint};
  if(typeof module!=='undefined')module.exports=root.GooWorld;
})(typeof window!=='undefined'?window:globalThis);
