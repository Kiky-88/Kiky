(() => {
  const canvas = document.querySelector('#research-map');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: W, height: H, buildings, places, nodes, roads, walkable, findPath, moveAlongRoad, project } = ResearchWorldCore;
  const player = { x: 490, y: 290, facing: 1 };
  const keys = new Set();
  const portals = [...document.querySelectorAll('.world-portal')];
  const hint = document.querySelector('.world-spawn-label');
  let selected = null, path = [], frame = null, lastTime = 0;
  let travelDestination = null, travelSpeed = 0, entering = false;
  let scaleX = 1, scaleY = 1, pixelRatio = 1;
  const polygon = (points, fill, stroke) => {
    ctx.beginPath(); points.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  };
  function line(points, color, size = 1) {
    ctx.beginPath(); points.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
    ctx.strokeStyle = color; ctx.lineWidth = size; ctx.stroke();
  }
  function building(b, i) {
    const {x,y,w,h} = b;
    ctx.fillStyle = '#07141a70'; ctx.fillRect(x+12,y+14,w+9,h+13);
    polygon([[x,y+h],[x+w,y+h],[x+w,y+h+14],[x,y+h+14]], '#1d2340', '#5d638e');
    polygon([[x+w,y],[x+w+10,y+10],[x+w+10,y+h+14],[x+w,y+h]], '#292e50', '#5d638e');
    polygon([[x,y+12],[x+12,y],[x+w,y],[x+w,y+h],[x,y+h]], i===4?'#4a4d7b':'#343b65', '#8587b6');
    ctx.strokeStyle = '#4e5685'; ctx.lineWidth = 2;
    ctx.strokeRect(x+12,y+14,w-24,h-29);
    ctx.fillStyle = i===4 ? '#85b2ac' : '#202846';
    for(let col=0;col<Math.floor((w-30)/30);col++) ctx.fillRect(x+20+col*30,y+24,18,8);
    if (b.type === 'lab') {
      ctx.fillStyle='#787aa8'; ctx.fillRect(x+24,y+50,45,27); ctx.fillRect(x+88,y+50,45,27);
      line([[x+24,y+86],[x+w-24,y+86]],'#9ae5ee',3);
    } else if (b.type === 'library') {
      for(let j=0;j<3;j++){ctx.fillStyle='#5b6292';ctx.fillRect(x+24+j*45,y+50,30,35);line([[x+28+j*45,y+56],[x+48+j*45,y+56]],'#abdfe9',2);}
    } else if (b.type === 'academy') {
      polygon([[x+30,y+69],[x+w/2,y+25],[x+w-30,y+69]],'#4c5486','#8e94bd');
      for(let j=0;j<4;j++){ctx.fillStyle='#b0b3d0';ctx.fillRect(x+44+j*27,y+70,7,19);}
    } else if (b.type === 'studio') {
      polygon([[x+22,y+76],[x+66,y+30],[x+105,y+76]],'#686b9e','#b0b4dc');
      polygon([[x+83,y+76],[x+124,y+35],[x+157,y+76]],'#3e4777','#8c9cc4');
    } else {
      ctx.fillStyle='#a5e9f2';ctx.fillRect(x+w/2-3,y+21,6,28);
      line([[x+w/2-17,y+34],[x+w/2+17,y+34]],'#a5e9f2',3);
    }
    ctx.fillStyle = '#8edce8';ctx.fillRect(x+w/2-13,y+h+2,26,4);
    ctx.fillStyle='#282e50';ctx.fillRect(x+w/2-19,y+h+14,38,6);
  }
  function draw() {
    ctx.setTransform(scaleX,0,0,scaleY,0,0);
    ctx.fillStyle='#0c1224';ctx.fillRect(0,0,W,H);
    for(let y=15;y<H;y+=28) for(let x=15;x<W;x+=30) {ctx.fillStyle='#303654';ctx.fillRect(x,y,1,1);}
    polygon([[45,75],[95,35],[889,35],[938,83],[938,475],[892,524],[92,524],[45,477]],'#19223b','#4c527c');
    polygon([[57,82],[102,49],[881,49],[924,89],[924,467],[885,510],[100,510],[59,469]],null,'#333e63');
    // Rendering uses exactly the same centerlines as keyboard movement and travel.
    roads.forEach(road => {
      const a=nodes[road.a], b=nodes[road.b];
      line([[a.x,a.y],[b.x,b.y]],'#303a56',road.w);
      line([[a.x,a.y],[b.x,b.y]],'#8291bc30',1);
    });
    for(const [x,y] of [[92,118],[90,285],[875,290],[90,420],[875,415],[390,425],[590,425],[385,167],[595,167]]) {
      ctx.fillStyle='#111a30';ctx.fillRect(x-15,y-8,32,24);
      ctx.fillStyle='#343c61';ctx.beginPath();ctx.ellipse(x,y-3,15,12,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#51567a';ctx.beginPath();ctx.ellipse(x-3,y-7,10,8,0,0,Math.PI*2);ctx.fill();
    }
    polygon([[450,265],[470,246],[514,246],[534,266],[534,309],[513,329],[469,329],[450,310]],'#262d52','#7777b0');
    polygon([[466,271],[482,260],[502,260],[518,276],[518,301],[503,316],[480,316],[466,303]],null,'#6268a0');
    line([[477,288],[504,288]],'#8edce8',2);line([[490,275],[490,301]],'#8edce8',2);
    buildings.forEach(building);
    // Location pads are symbolic entries to the independent content pages.
    Object.entries(places).forEach(([id,p])=>{
      const active=selected===id;
      ctx.fillStyle=active?'#8edce8':'#9a91c9';ctx.fillRect(p.x-10,p.y-4,20,4);
      if(active){ctx.strokeStyle='#8edce880';ctx.lineWidth=1;ctx.strokeRect(p.x-17,p.y-13,34,24);}
    });
    if(path.length){
      ctx.setLineDash([4,6]);line([[player.x,player.y],...path.map(p=>[p.x,p.y])],'#d9a49a',1.5);ctx.setLineDash([]);
    }
    // Original explorer marker; no game characters or copyrighted art.
    const unit = Math.max(1, 0.8 * pixelRatio / Math.min(scaleX,scaleY));
    ctx.save();ctx.translate(player.x,player.y);ctx.scale(unit,unit);
    ctx.fillStyle='#07121b80';ctx.beginPath();ctx.ellipse(0,7,11,5,0,0,Math.PI*2);ctx.fill();
    polygon([[-9,-3],[-7,9],[7,9],[9,-3],[0,-8]],'#6a63a8','#b2a8ec');
    polygon([[-7,-13],[0,-18],[7,-13],[6,-4],[-6,-4]],'#44466f','#8c88bf');
    ctx.fillStyle='#10172c';ctx.fillRect(-4,-12,8,7);
    ctx.fillStyle='#8edce8';
    for(const x of [-3,0,3])ctx.fillRect(x,-11,1,5);
    ctx.restore();
    hint.style.left=`${player.x/W*100}%`;hint.style.top=`${(player.y+25)/H*100}%`;
  }
  function resize() {
    const box=canvas.getBoundingClientRect(), dpr=Math.min(window.devicePixelRatio||1,2);
    pixelRatio=dpr;canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);
    scaleX=canvas.width/W;scaleY=canvas.height/H;draw();
  }
  function selectPlace(id, travel = true) {
    const place=places[id];if(!place)return;
    selected=id;
    document.querySelector('#destination-kicker').textContent=place.kicker;
    document.querySelector('#destination-title').textContent=place.title;
    document.querySelector('#destination-description').textContent=place.description;
    const link=document.querySelector('#destination-link');link.href=place.href;link.textContent=`Enter ${place.title}`;
    portals.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.place===id)));
    if(travel){
      entering=false;travelDestination=id;
      path=findPath(player,place);
      const total=path.reduce((sum,p,i)=>sum+(i?Math.hypot(p.x-path[i-1].x,p.y-path[i-1].y):0),0);
      travelSpeed=Math.max(1,total/0.32);
      document.querySelector('#destination-kicker').textContent='ENTERING / '+place.kicker;
      if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
        player.x=place.x;player.y=place.y;path=[];enterPlace(id);
      }else wake();
    }
    draw();
  }
  function enterPlace(id) {
    if(entering)return;
    entering=true;keys.clear();path=[];travelDestination=null;
    if(window.navigatePage)window.navigatePage(places[id].href);
    else window.location.assign(places[id].href);
  }
  function update(dt) {
    let dx=0,dy=0;
    if(keys.has('a')||keys.has('arrowleft'))dx--;
    if(keys.has('d')||keys.has('arrowright'))dx++;
    if(keys.has('w')||keys.has('arrowup'))dy--;
    if(keys.has('s')||keys.has('arrowdown'))dy++;
    let moving=false;
    if(dx||dy){
      path=[];travelDestination=null;
      const next=moveAlongRoad(player,dx,dy,210*dt);
      moving=Math.hypot(next.x-player.x,next.y-player.y)>0.001;
      player.x=next.x;player.y=next.y;
      if(dx)player.facing=Math.sign(dx);
    }else if(path.length){
      let remaining=(travelDestination?travelSpeed:500)*dt;
      while(path.length && remaining>0){
        const target=path[0],d=Math.hypot(target.x-player.x,target.y-player.y);
        if(d<=remaining){player.x=target.x;player.y=target.y;remaining-=d;path.shift();}
        else{player.x+=(target.x-player.x)/d*remaining;player.y+=(target.y-player.y)/d*remaining;remaining=0;}
      }
      moving=true;
      if(!path.length&&travelDestination){enterPlace(travelDestination);return;}
    }
    if(!moving||entering||travelDestination)return;
    const nearby=Object.entries(places).find(([_,p])=>Math.hypot(p.x-player.x,p.y-player.y)<12);
    if(nearby){selectPlace(nearby[0],false);enterPlace(nearby[0]);}
  }
  function tick(time){frame=null;const dt=lastTime?Math.min((time-lastTime)/1000,.04):.016;lastTime=time;update(dt);draw();if(keys.size||path.length)frame=requestAnimationFrame(tick);else lastTime=0;}
  function wake(){if(frame===null)frame=requestAnimationFrame(tick);}
  portals.forEach(button=>{
    button.setAttribute('aria-pressed','false');
    button.addEventListener('click',()=>{selectPlace(button.dataset.place);canvas.focus({preventScroll:true});});
  });
  canvas.addEventListener('click',event=>{
    const r=canvas.getBoundingClientRect(),point={x:(event.clientX-r.left)/r.width*W,y:(event.clientY-r.top)/r.height*H};
    if(entering)return;
    travelDestination=null;
    canvas.focus({preventScroll:true});path=findPath(player,project(point));wake();
  });
  canvas.addEventListener('keydown',event=>{
    const key=event.key.toLowerCase();
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){event.preventDefault();keys.add(key);wake();}
    if((key==='e'||key==='enter')&&selected&&Math.hypot(places[selected].x-player.x,places[selected].y-player.y)<80){event.preventDefault();enterPlace(selected);}
    if(key==='escape'){keys.clear();path=[];travelDestination=null;draw();}
  });
  window.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
  canvas.addEventListener('blur',()=>keys.clear());
  document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();path=[];}});
  document.querySelector('.world-reset').addEventListener('click',()=>{
    keys.clear();path=[];travelDestination=null;entering=false;player.x=490;player.y=290;player.facing=1;selected=null;
    portals.forEach(button=>button.setAttribute('aria-pressed','false'));
    document.querySelector('#destination-kicker').textContent='START EXPLORING';
    document.querySelector('#destination-title').textContent='A few paths. One curious mind.';
    document.querySelector('#destination-description').textContent='Select any building to enter its page. You can also explore the campus along the paths.';
    const link=document.querySelector('#destination-link');link.href='publications.html';link.textContent='View publications';draw();
  });
  new ResizeObserver(resize).observe(canvas);resize();
})();
