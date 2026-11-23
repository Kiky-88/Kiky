(() => {
  const canvas = document.querySelector('#research-map');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: W, height: H, places, nodes, findPath, moveOnRoad } = ResearchWorldCore;
  const spawn = nodes[0];
  const player = { ...spawn, facing: 1 };
  let idleTime=0, stride=0, gait=0, heading=0, lean=0;
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
    drawCharacter();
    hint.style.left=`${player.x/W*100}%`;hint.style.top=`${(player.y+14)/H*100}%`;
  }
  // Articulated little shadow mage: feet stay planted at the navigation position.
  function drawCharacter() {
    const unit=Math.max(1.18,0.55*pixelRatio/Math.min(scaleX,scaleY));
    const t=quietMotion.matches?0:idleTime;
    const breath=Math.sin(t*2.7)*.55*(1-gait);
    const step=Math.sin(stride), lift=Math.abs(Math.cos(stride));
    const bob=breath-gait*(1-lift)*1.1;
    const swing=step*gait, sway=Math.sin(t*2.1)*.7+lean*1.1;
    const side=Math.sin(heading);
    const shape=(points,fill,stroke)=>{
      ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
      ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.65;ctx.stroke();}
    };
    const oval=(x,y,rx,ry,fill)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();};
    ctx.save();ctx.translate(player.x,player.y);ctx.scale(unit,unit);
    oval(0,1,9-gait*.6,2.9,'#05091588');
    // Split ribbon tails follow the body with a delayed, springy silhouette.
    shape([[-6,-15+bob],[-12-sway,-9+bob],[-10-sway,1+bob],[-6,-3+bob],[1,-12+bob]],'#39385f','#7773a8');
    shape([[5,-14+bob],[10-sway,-8+bob],[12-sway,-2+bob],[7,-4+bob],[0,-12+bob]],'#514977','#8b7cb3');
    // Alternating boots and hands make the walking cycle readable even at map scale.
    oval(-3.3,-.8+swing*2,2.3,2.4,'#202b44');
    oval(3.3,-.8-swing*2,2.3,2.4,'#263650');
    oval(-7.2,-8+bob-swing*1.4,2.1,3,'#68749b');
    oval(7.2,-8+bob+swing*1.4,2.1,3,'#657395');
    const cloak=ctx.createLinearGradient(-7,-17,7,0);
    cloak.addColorStop(0,'#a09bc7');cloak.addColorStop(.4,'#68658f');cloak.addColorStop(1,'#2c3653');
    shape([[-5,-17+bob],[4,-17+bob],[7+sway*.25,-2+bob],[3,.5+bob],[0,-1+bob],[-4,1+bob],[-7+sway*.25,-2+bob]],cloak,'#8e8ab5');
    trace([[-3,-13+bob],[-4,-5+bob],[-3,-2+bob]],'#b3afcf70',.8);
    trace([[3,-12+bob],[4,-4+bob]],'#252f4d',1);
    // Oversized hood, soft rim and three cyan face slits recall Omen.
    const hx=side*1.5+lean*.6, hy=-19+bob;
    const hood=ctx.createLinearGradient(hx-7,hy-8,hx+6,hy+7);
    hood.addColorStop(0,'#b1a4d5');hood.addColorStop(.4,'#736b9e');hood.addColorStop(1,'#374663');
    oval(hx,hy,8.1,8.8,hood);
    trace([[hx-6,hy-4],[hx-3,hy-7],[hx+1,hy-7.8]],'#d4c4eb90',.85);
    {
      oval(hx+side*1.3,hy+1,5.5-Math.abs(side)*.8,6.1,'#111e33');
      const blink=Math.sin(t*.7)> .995 ? .4:1;
      ctx.shadowColor='#91efff';ctx.shadowBlur=4;
      for(let i=-1;i<=1;i++){
        const x=hx+side*2+i*2.2;
        trace([[x-.25,hy-1],[x,hy+2.7*blink]],'#b4f4ff',1.1);
      }
      ctx.shadowBlur=0;
    }
    shape([[-5,-12+bob],[0,-9+bob],[5,-12+bob],[3,-7+bob],[-2,-6+bob]],'#7f81ac','#adb2d080');
    oval(1,-8+bob,1.1,1.1,'#a5e5ef');
    // A quiet wisp curls beside the idle character; movement pulls it behind.
    if(!quietMotion.matches){
      const wx=-10-side*3+Math.sin(t*1.8)*1.5, wy=-17+Math.cos(t*2)*2;
      ctx.globalAlpha=.45;
      trace([[wx+2,wy+4],[wx-1,wy],[wx+1,wy-3]],'#a4d6ee',.75);
      oval(wx+1,wy-3,.8,.8,'#c5edfa');ctx.globalAlpha=1;
    }
    ctx.restore();
  }
  // Share the atmosphere's visibility/pause-aware 24fps clock for idle animation.
  window.animateWorldCharacter=time=>{idleTime=time;draw();};
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
    const previousX=player.x, previousY=player.y;
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
    const mx=player.x-previousX,my=player.y-previousY,distance=Math.hypot(mx,my);
    const walking=distance>.01;
    gait+=(Number(walking)-gait)*(1-Math.exp(-22*dt));
    if(walking){stride+=Math.min(distance,10)*.32;heading=Math.atan2(mx,my);}
    lean+=(Math.sin(heading)*gait-lean)*(1-Math.exp(-14*dt));
    if(!moving||entering||travelDestination)return;
    const nearby=Object.entries(places).find(([_,p])=>Math.hypot(p.x-player.x,p.y-player.y)<12);
    if(nearby){selectPlace(nearby[0],false);enterPlace(nearby[0]);}
  }
  function tick(time){
    frame=null;
    const dt=lastTime?Math.min((time-lastTime)/1000,.04):.016;
    lastTime=time;update(dt);
    const effectsMoving=updateEffects(dt);draw();
    if(keys.size||path.length||effectsMoving||gait>.01)frame=requestAnimationFrame(tick);
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
    keys.clear();path=[];travelDestination=null;entering=false;hovered=null;buildingIds.forEach(id=>effects[id]=0);player.x=spawn.x;player.y=spawn.y;player.facing=1;gait=0;stride=0;heading=0;lean=0;selected=null;
    portals.forEach(button=>button.setAttribute('aria-pressed','false'));
    draw();
  });
  new ResizeObserver(resize).observe(canvas);resize();
})();
