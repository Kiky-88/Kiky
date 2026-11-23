/* Walkable pavement areas, including the full plaza, constrain a small foot collider. */
(() => {
  const width = 980, height = 560;
  const places = {
    publications: { x: 235, y: 215, title: 'Publications', href: 'publications.html?v=20261123-mage1' },
    experience: { x: 750, y: 215, title: 'Experience', href: 'experience.html?v=20261123-mage1' },
    education: { x: 235, y: 485, title: 'Education', href: 'education.html?v=20261123-mage1' },
    beyond: { x: 750, y: 485, title: 'Beyond CS', href: 'beyond.html?v=20261123-mage1' }
  };
  const nodes = [
    {x:490,y:255}, {x:235,y:255}, {x:750,y:255},
    {x:235,y:215}, {x:750,y:215}, {x:235,y:485},
    {x:750,y:485}, {x:490,y:485}, {x:490,y:135}
  ];
  // Lower houses are reached by the central promenade and bottom path.
  // There are no vertical routes through the academy or design studio roofs.
  const roads = [[0,1,26],[0,2,26],[1,3,26],[2,4,26],[5,7,26],[7,6,26],[0,7,24],[0,8,24]]
    .map(([a,b,w]) => ({a,b,w}));
  const plaza = { x:490, y:255, r:44 };
  const footRadius = 2.5;
  const pavement = roads.map(road => {
    const a=nodes[road.a], b=nodes[road.b], half=road.w/2;
    return {left:Math.min(a.x,b.x)-half,right:Math.max(a.x,b.x)+half,top:Math.min(a.y,b.y)-half,bottom:Math.max(a.y,b.y)+half};
  });
  const footSamples = Array.from({length:8},(_,i)=>({x:Math.cos(i*Math.PI/4)*footRadius,y:Math.sin(i*Math.PI/4)*footRadius}));
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  function onPavement(x,y) {
    if((x-plaza.x)**2+(y-plaza.y)**2<=plaza.r**2)return true;
    return pavement.some(area=>x>=area.left&&x<=area.right&&y>=area.top&&y<=area.bottom);
  }
  function walkable(x,y) {
    return Number.isFinite(x)&&Number.isFinite(y)&&onPavement(x,y)&&footSamples.every(p=>onPavement(x+p.x,y+p.y));
  }
  function project(point) {
    if(walkable(point.x,point.y))return {x:point.x,y:point.y};
    const candidates=pavement.map(area=>({x:clamp(point.x,area.left+footRadius+.01,area.right-footRadius-.01),y:clamp(point.y,area.top+footRadius+.01,area.bottom-footRadius-.01)}));
    const d=distance(point,plaza), r=plaza.r-footRadius-.01;
    candidates.push(d<=r?{...point}:{x:plaza.x+(point.x-plaza.x)/d*r,y:plaza.y+(point.y-plaza.y)/d*r});
    return candidates.filter(p=>walkable(p.x,p.y)).reduce((best,p)=>!best||distance(point,p)<distance(point,best)?p:best,null);
  }
  // Exact interval coverage prevents tiny corner cuts between sampled points.
  function surfaceSegment(a,b) {
    const insideCircle=p=>(p.x-plaza.x)**2+(p.y-plaza.y)**2<=plaza.r**2;
    if(insideCircle(a)&&insideCircle(b))return true;
    const contains=(r,p)=>p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom;
    if(pavement.some(r=>contains(r,a)&&contains(r,b)))return true;
    const dx=b.x-a.x,dy=b.y-a.y,squared=dx*dx+dy*dy;
    if(squared<1e-16)return onPavement(a.x,a.y);
    const intervals=[];
    for(const r of pavement) {
      let lo=0,hi=1,valid=true;
      for(const [origin,delta,min,max] of [[a.x,dx,r.left,r.right],[a.y,dy,r.top,r.bottom]]) {
        if(Math.abs(delta)<1e-12){if(origin<min||origin>max){valid=false;break;}}
        else{const t1=(min-origin)/delta,t2=(max-origin)/delta;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));}
      }
      if(valid&&lo<=hi)intervals.push([lo,hi]);
    }
    const fx=a.x-plaza.x,fy=a.y-plaza.y;
    const linear=2*(fx*dx+fy*dy),constant=fx*fx+fy*fy-plaza.r**2;
    const discriminant=linear*linear-4*squared*constant;
    if(discriminant>=0){const root=Math.sqrt(discriminant),lo=Math.max(0,(-linear-root)/(2*squared)),hi=Math.min(1,(-linear+root)/(2*squared));if(lo<=hi)intervals.push([lo,hi]);}
    intervals.sort((p,q)=>p[0]-q[0]);
    let covered=0;
    for(const [lo,hi] of intervals){if(lo>covered+1e-10)return false;covered=Math.max(covered,hi);if(covered>=1-1e-10)return true;}
    return false;
  }
  function segmentClear(a,b) {
    return surfaceSegment(a,b)&&footSamples.every(p=>surfaceSegment({x:a.x+p.x,y:a.y+p.y},{x:b.x+p.x,y:b.y+p.y}));
  }
  function moveOnRoad(from,dx,dy,amount) {
    const start=project(from);
    if(!dx&&!dy||amount<=0)return start;
    const length=Math.hypot(dx,dy),steps=Math.max(1,Math.ceil(amount/1.25));
    const sx=dx/length*amount/steps,sy=dy/length*amount/steps;
    let x=start.x,y=start.y;
    for(let i=0;i<steps;i++) {
      if(walkable(x+sx,y+sy)){x+=sx;y+=sy;continue;}
      // Slide along a boundary rather than snapping to the road's center.
      if(walkable(x+sx,y))x+=sx;
      if(walkable(x,y+sy))y+=sy;
    }
    return {x,y};
  }
  // Fine navigation mesh is built once. Click targets retain their exact road position.
  const step=4,cols=Math.ceil(width/step)+1,rows=Math.ceil(height/step)+1;
  const mesh=new Uint8Array(cols*rows);
  const position=id=>({x:(id%cols)*step,y:Math.floor(id/cols)*step});
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)mesh[y*cols+x]=walkable(x*step,y*step)?1:0;
  function gridPoint(point) {
    const cx=Math.round(point.x/step),cy=Math.round(point.y/step);
    let best=-1,bestDistance=Infinity;
    for(let y=cy-3;y<=cy+3;y++)for(let x=cx-3;x<=cx+3;x++) {
      if(x<0||y<0||x>=cols||y>=rows)continue;
      const id=y*cols+x,p=position(id),d=distance(point,p);
      if(mesh[id]&&d<bestDistance&&segmentClear(point,p)){best=id;bestDistance=d;}
    }
    return best;
  }
  function findPath(from,to) {
    const start=project(from),end=project(to);
    if(!start||!end)return [];
    if(segmentClear(start,end))return [start,end];
    const first=gridPoint(start),last=gridPoint(end);
    if(first<0||last<0)return [];
    const cost=new Float64Array(mesh.length).fill(Infinity),previous=new Int32Array(mesh.length).fill(-1),closed=new Uint8Array(mesh.length),heap=[];
    function push(id,score) {
      const value={id,score};let i=heap.length;heap.push(value);
      while(i>0){const parent=(i-1)>>1;if(heap[parent].score<=score)break;heap[i]=heap[parent];i=parent;}
      heap[i]=value;
    }
    function pop() {
      const first=heap[0],tail=heap.pop();if(!heap.length)return first;
      let i=0;heap[0]=tail;
      while(true){let child=i*2+1;if(child>=heap.length)break;if(child+1<heap.length&&heap[child+1].score<heap[child].score)child++;if(heap[child].score>=tail.score)break;heap[i]=heap[child];i=child;}
      heap[i]=tail;return first;
    }
    cost[first]=0;push(first,distance(position(first),end));
    const neighbors=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
    while(heap.length) {
      const current=pop().id;if(closed[current])continue;
      if(current===last) {
        const points=[end];let id=last;
        while(id!==-1){points.unshift(position(id));id=previous[id];}
        points.unshift(start);
        const clean=points.filter((p,i)=>i===0||distance(p,points[i-1])>.001);
        const smooth=[clean[0]];let anchor=0;
        while(anchor<clean.length-1){let next=anchor+1;while(next+1<clean.length&&segmentClear(clean[anchor],clean[next+1]))next++;smooth.push(clean[next]);anchor=next;}
        return smooth;
      }
      closed[current]=1;
      const x=current%cols,y=Math.floor(current/cols);
      for(const [dx,dy] of neighbors) {
        const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=cols||ny>=rows)continue;
        const id=ny*cols+nx;if(!mesh[id]||closed[id])continue;
        if(dx&&dy&&(!mesh[y*cols+nx]||!mesh[ny*cols+x]))continue;
        if(!segmentClear(position(current),position(id)))continue;
        const score=cost[current]+step*(dx&&dy?Math.SQRT2:1);
        if(score>=cost[id])continue;
        cost[id]=score;previous[id]=current;push(id,score+distance(position(id),end));
      }
    }
    return [];
  }
  globalThis.ResearchWorldCore={width,height,places,nodes,roads,plaza,footRadius,walkable,project,moveOnRoad,findPath};
})();
