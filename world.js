(() => {
  const canvas = document.querySelector('#research-map');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: W, height: H, places, nodes, findPath, moveOnRoad } = ResearchWorldCore;
  const spawn = nodes[0];
  const player = { ...spawn, facing: 1 };
  const keys = new Set();
  const portals = [...document.querySelectorAll('.world-portal')];
  const hint = document.querySelector('.world-spawn-label');
  let selected = null, path = [], frame = null, lastTime = 0;
  let travelDestination = null, entering = false;
  let travelElapsed = 0, travelDistance = 0, travelProgress = 0;
  let hovered = null;
  const buildingIds = Object.keys(places);
  const effects = Object.fromEntries(buildingIds.map(id => [id, 0]));
  const quietMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const easeTravel = t => t < 0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
  function updateEffects(dt) {
    let moving = false;
    buildingIds.forEach(id => {
      const target = id === hovered || id === selected ? 1 : 0;
      const difference = target-effects[id];
      if (quietMotion.matches || Math.abs(difference)<0.002) effects[id]=target;
      else { effects[id]+=difference*(1-Math.exp(-24*dt)); moving=true; }
    });
    return moving;
  }
  let scaleX = 1, scaleY = 1, pixelRatio = 1;
  function trace(points,color,width=1) {
    ctx.beginPath();
    points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
  }
  function draw() {
    ctx.setTransform(scaleX,0,0,scaleY,0,0);
    ctx.clearRect(0,0,W,H);
    // The architectural illustration sits beneath this transparent interaction layer.
    // Only restrained light and character details are drawn over the scene.
    buildingIds.forEach(id=>{
      const glow=effects[id];if(glow<0.01)return;
      const p=places[id];
      const halo=ctx.createRadialGradient(p.x,p.y-30,0,p.x,p.y-30,60);
      halo.addColorStop(0,`rgba(158,189,239,${0.14*glow})`);
      halo.addColorStop(1,'rgba(158,189,239,0)');
      ctx.fillStyle=halo;ctx.fillRect(p.x-60,p.y-90,120,120);
      ctx.strokeStyle=`rgba(181,222,237,${0.5*glow})`;ctx.lineWidth=1;
      ctx.beginPath();ctx.ellipse(p.x,p.y,11,5,0,0,Math.PI*2);ctx.stroke();
    });
    if(path.length){
      ctx.setLineDash([2,7]);ctx.lineDashOffset=-travelElapsed*30;
      trace([[player.x,player.y],...path.map(p=>[p.x,p.y])],'#a8c8df80',1);
      ctx.setLineDash([]);ctx.lineDashOffset=0;
    }
    const unit=Math.max(1,0.45*pixelRatio/Math.min(scaleX,scaleY));
    ctx.save();ctx.translate(player.x,player.y);ctx.scale(unit,unit);
    ctx.fillStyle='#070b18a0';ctx.beginPath();ctx.ellipse(0,4,8,3,0,0,Math.PI*2);ctx.fill();
    const cloak=ctx.createLinearGradient(-7,-8,7,5);
    cloak.addColorStop(0,'#8986be');cloak.addColorStop(.45,'#4c507f');cloak.addColorStop(1,'#212c48');
    ctx.fillStyle=cloak;ctx.beginPath();ctx.moveTo(-5,-10);ctx.bezierCurveTo(-6,-4,-7,1,-7,5);
    ctx.quadraticCurveTo(0,8,7,5);ctx.bezierCurveTo(7,0,6,-6,5,-10);ctx.closePath();ctx.fill();
    ctx.fillStyle='#444c76';ctx.beginPath();ctx.ellipse(0,-11,5.8,6.5,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#17223a';ctx.beginPath();ctx.ellipse(0,-11,3.6,4.5,0,0,Math.PI*2);ctx.fill();
    ctx.shadowColor='#9bcfdd';ctx.shadowBlur=3;ctx.fillStyle='#b4e3ee';
    for(const x of [-2,0,2])ctx.fillRect(x,-13,.7,4);
    ctx.shadowBlur=0;ctx.restore();
    hint.style.left=`${player.x/W*100}%`;hint.style.top=`${(player.y+14)/H*100}%`;
  }
  function resize() {
    const box=canvas.getBoundingClientRect(), dpr=Math.min(window.devicePixelRatio||1,2);
    pixelRatio=dpr;canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);
    scaleX=canvas.width/W;scaleY=canvas.height/H;draw();
  }
  function selectPlace(id, travel = true) {
    const place=places[id];if(!place)return;
    selected=id;
    portals.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.place===id)));
    if(travel){
      entering=false;travelDestination=id;
      path=findPath(player,place);
      const total=path.reduce((sum,p,i)=>sum+(i?Math.hypot(p.x-path[i-1].x,p.y-path[i-1].y):0),0);
      travelDistance=total;travelElapsed=0;travelProgress=0;
      if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
        player.x=place.x;player.y=place.y;path=[];enterPlace(id);
      }else wake();
    }
    draw();
  }
  function enterPlace(id) {
    if(entering)return;
    entering=true;keys.clear();path=[];travelDestination=null;
    const box=canvas.getBoundingClientRect(), place=places[id];
    const portal={ x:box.left+place.x/W*box.width, y:box.top+place.y/H*box.height };
    if(window.navigatePage)window.navigatePage(place.href,{portal});
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
      const next=moveOnRoad(player,dx,dy,210*dt);
      moving=Math.hypot(next.x-player.x,next.y-player.y)>0.001;
      player.x=next.x;player.y=next.y;
      if(dx)player.facing=Math.sign(dx);
    }else if(path.length){
      let remaining=500*dt;
      if(travelDestination){
        travelElapsed=Math.min(0.30,travelElapsed+dt);
        const eased=easeTravel(travelElapsed/0.30);
        remaining=travelDistance*(eased-travelProgress);
        travelProgress=eased;
        // Consume the exact remaining distance at the end to avoid rounding stalls.
        if(travelElapsed>=0.30)remaining+=0.01;
      }
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
  function tick(time){
    frame=null;
    const dt=lastTime?Math.min((time-lastTime)/1000,.04):.016;
    lastTime=time;update(dt);
    const effectsMoving=updateEffects(dt);draw();
    if(keys.size||path.length||effectsMoving)frame=requestAnimationFrame(tick);
    else lastTime=0;
  }
  function wake(){if(frame===null)frame=requestAnimationFrame(tick);}
  portals.forEach(button=>{
    button.setAttribute('aria-pressed','false');
    const focusBuilding=()=>{hovered=button.dataset.place;wake();};
    const blurBuilding=()=>{if(hovered===button.dataset.place)hovered=null;wake();};
    button.addEventListener('pointerenter',focusBuilding);
    button.addEventListener('pointerleave',blurBuilding);
    button.addEventListener('focus',focusBuilding);
    button.addEventListener('blur',blurBuilding);
    button.addEventListener('click',()=>{selectPlace(button.dataset.place);canvas.focus({preventScroll:true});});
  });
  canvas.addEventListener('click',event=>{
    const r=canvas.getBoundingClientRect(),point={x:(event.clientX-r.left)/r.width*W,y:(event.clientY-r.top)/r.height*H};
    if(entering)return;
    travelDestination=null;
    canvas.focus({preventScroll:true});path=findPath(player,point);wake();
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
    keys.clear();path=[];travelDestination=null;entering=false;hovered=null;buildingIds.forEach(id=>effects[id]=0);player.x=spawn.x;player.y=spawn.y;player.facing=1;selected=null;
    portals.forEach(button=>button.setAttribute('aria-pressed','false'));
    draw();
  });
  new ResizeObserver(resize).observe(canvas);resize();
})();
