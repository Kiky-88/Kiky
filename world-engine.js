/* One road graph drives drawing, pathfinding, and collision-free movement. */
(() => {
  const width = 980, height = 560;
  const buildings = [
    { x: 150, y: 80, w: 180, h: 120, type: 'library' },
    { x: 650, y: 80, w: 170, h: 120, type: 'lab' },
    { x: 150, y: 350, w: 180, h: 110, type: 'academy' },
    { x: 650, y: 350, w: 180, h: 110, type: 'studio' },
    { x: 432, y: 75, w: 116, h: 65, type: 'tower' }
  ];
  const places = {
    publications: { x: 250, y: 250, title: 'Publications', kicker: 'THE ARCHIVE', description: 'Efficient AI, multimodal models, and agent evaluation. Explore 12 publications and manuscripts, including QuantVLA and OS-Omni.', href: 'publications.html' },
    experience: { x: 730, y: 250, title: 'Experience', kicker: 'THE SYSTEMS LAB', description: 'Research at The Ohio State University and an internship at TouchstoneAI. From low-bit inference to coding-agent evaluation.', href: 'experience.html' },
    education: { x: 250, y: 490, title: 'Education', kicker: 'THE ACADEMY', description: 'A path through architecture, digital fabrication, and computer science at HUST, Michigan, and Penn.', href: 'education.html' },
    beyond: { x: 730, y: 490, title: 'Beyond CS', kicker: 'THE DESIGN STUDIO', description: 'Architecture and computational making: Dissolved Skyscraper, 4D-City, and Serpentine Gallery.', href: 'beyond.html' }
  };
  const nodes = [
    {x:490,y:290}, {x:250,y:290}, {x:730,y:290},
    {x:250,y:250}, {x:730,y:250}, {x:250,y:490},
    {x:730,y:490}, {x:490,y:490}, {x:490,y:165}
  ];
  const roads = [[0,1,38],[0,2,38],[1,3,38],[2,4,38],[1,5,32],[2,6,32],[5,7,32],[7,6,32],[0,7,28],[0,8,28]]
    .map(([a,b,w]) => ({a,b,w}));
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  function project(point) {
    let best = null;
    roads.forEach((road, index) => {
      const a=nodes[road.a], b=nodes[road.b], dx=b.x-a.x, dy=b.y-a.y;
      const t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/(dx*dx+dy*dy)));
      const p={x:a.x+dx*t,y:a.y+dy*t};
      const d=distance(point,p);
      if(!best || d<best.distance) best={...p,distance:d,road:index};
    });
    return best;
  }
  const walkable = (x,y) => project({x,y}).distance < 0.01;
  function findPath(from,to) {
    const start=project(from), end=project(to);
    const startRoad=roads[start.road], endRoad=roads[end.road];
    if(start.road===end.road) return [{x:start.x,y:start.y},{x:end.x,y:end.y}];
    const costs=nodes.map(()=>Infinity), previous=nodes.map(()=>null), visited=new Set();
    for(const id of [startRoad.a,startRoad.b]) costs[id]=distance(start,nodes[id]);
    for(let i=0;i<nodes.length;i++) {
      let current=-1;
      nodes.forEach((_,id)=>{if(!visited.has(id)&&(current===-1||costs[id]<costs[current]))current=id;});
      if(current===-1||!Number.isFinite(costs[current]))break;
      visited.add(current);
      for(const road of roads) {
        const next=road.a===current?road.b:road.b===current?road.a:null;
        if(next===null)continue;
        const cost=costs[current]+distance(nodes[current],nodes[next]);
        if(cost<costs[next]){costs[next]=cost;previous[next]=current;}
      }
    }
    const goal=[endRoad.a,endRoad.b].reduce((best,id)=>costs[id]+distance(nodes[id],end)<costs[best]+distance(nodes[best],end)?id:best);
    const ids=[];let current=goal;
    while(current!==null){ids.unshift(current);current=previous[current];}
    return [{x:start.x,y:start.y},...ids.map(id=>({...nodes[id]})),{x:end.x,y:end.y}]
      .filter((point,i,list)=>i===0||distance(point,list[i-1])>0.001);
  }
  function moveAlongRoad(from, dx, dy, amount) {
    let p=project(from), remaining=amount;
    const length=Math.hypot(dx,dy);if(!length)return {x:p.x,y:p.y};
    const direction={x:dx/length,y:dy/length};
    for(let iteration=0;iteration<10 && remaining>0.001;iteration++) {
      const junction=nodes.findIndex(n=>distance(n,p)<0.001);
      let candidates=[];
      if(junction!==-1) {
        roads.forEach(road=>{
          if(road.a===junction)candidates.push(nodes[road.b]);
          else if(road.b===junction)candidates.push(nodes[road.a]);
        });
      }else {
        const road=roads[project(p).road];candidates=[nodes[road.a],nodes[road.b]];
      }
      let target=null,score=0.01;
      candidates.forEach(candidate=>{
        const d=distance(p,candidate);if(d<0.001)return;
        const dot=((candidate.x-p.x)*direction.x+(candidate.y-p.y)*direction.y)/d;
        if(dot>score){score=dot;target=candidate;}
      });
      if(!target)break;
      const d=distance(p,target), step=Math.min(d,remaining);
      p={x:p.x+(target.x-p.x)/d*step,y:p.y+(target.y-p.y)/d*step};
      remaining-=step;
    }
    return {x:p.x,y:p.y};
  }
  globalThis.ResearchWorldCore = { width,height,buildings,places,nodes,roads,walkable,findPath,moveAlongRoad,project };
})();
