/* Ambient motion is independent of character movement and pauses offscreen. */
(() => {
  const stage = document.querySelector('.world-stage');
  const canvas = document.querySelector('.atmosphere-canvas');
  const toggle = document.querySelector('.ambience-toggle');
  if (!stage || !canvas || !toggle) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = 980, H = 560;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let saved = null;
  try { saved = sessionStorage.getItem('campus-motion'); } catch (_) {}
  let enabled = !preference.matches && saved !== 'paused';
  let inView = true, pageActive = true, frame = null, lastTime = null, paintedAt = null, elapsed = 0;
  let scaleX = 1, scaleY = 1;
  const particles = Array.from({length:22}, (_, i) => ({
    x: (i * 137.51 + 31) % W,
    y: 44 + (i * 83.27) % (H - 90),
    phase: i * 2.39,
    speed: 13 + (i * 7) % 13,
    size: 0.7 + (i % 4) * 0.28,
    depth: i % 3
  }));
  const windows = [
    {x:231,y:74,rx:47,ry:15,phase:0,period:7.5,color:[157,213,231]},
    {x:785,y:82,rx:22,ry:23,phase:1.7,period:8.2,color:[146,210,227]},
    {x:232,y:319,rx:23,ry:10,phase:3.2,period:9.4,color:[222,194,151]},
    {x:781,y:384,rx:45,ry:21,phase:4.6,period:8.8,color:[157,213,231]},
    {x:491,y:40,rx:9,ry:14,phase:1,period:6.5,color:[150,208,236]}
  ];
  function haze(x,y,rx,ry,alpha,color) {
    ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
    const gradient=ctx.createRadialGradient(0,0,0,0,0,1);
    gradient.addColorStop(0,`rgba(${color},${alpha})`);
    gradient.addColorStop(1,`rgba(${color},0)`);
    ctx.fillStyle=gradient;ctx.fillRect(-1,-1,2,2);ctx.restore();
  }
  function render(time) {
    ctx.setTransform(scaleX,0,0,scaleY,0,0);ctx.clearRect(0,0,W,H);
    const gust=0.75+Math.sin(time*.43)*.25;
    // A slow change in reflected light gives each house an individual rhythm.
    windows.forEach(light=>{
      const breath=.5+.5*Math.sin(time*Math.PI*2/light.period+light.phase);
      haze(light.x,light.y,light.rx,light.ry,.025+breath*.065,light.color.join(','));
    });
    // Low, wide mist stays transparent enough to preserve the paths and labels.
    for(let i=0;i<3;i++) {
      const x=((time*(5+i*1.3)+i*390)%(W+440))-220;
      const y=[95,460,285][i]+Math.sin(time*.12+i)*18;
      haze(x,y,235,37,.027+Math.sin(time*.23+i)*.007,'148,158,203');
    }
    // Wind carries a few tiny motes sideways; there is no falling-leaf effect.
    particles.forEach(p=>{
      const x=(p.x+time*p.speed+Math.sin(time*.6+p.phase)*9)%(W+40)-20;
      const y=p.y+Math.sin(time*.75+p.phase)*8*gust+Math.cos(time*.23+p.phase)*4;
      const edge=Math.max(0,Math.min(1,x/55,(W-x)/55));
      const alpha=edge*(.11+(p.depth/2)*.18)*(.65+.35*Math.sin(time*.9+p.phase)**2);
      ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(time*.7+p.phase)*.6-.25);
      ctx.fillStyle=`rgba(${p.depth===2?'188,177,225':'177,213,229'},${alpha})`;
      ctx.beginPath();ctx.ellipse(0,0,p.size*(p.depth===2?1.7:1),p.size*.6,0,0,Math.PI*2);ctx.fill();
      ctx.restore();
    });
  }
  function active() { return enabled && inView && pageActive && !document.hidden; }
  function tick(time) {
    frame=null;
    if(!active()){lastTime=null;paintedAt=null;return;}
    if(lastTime!==null)elapsed+=Math.min((time-lastTime)/1000,.1);
    lastTime=time;
    // Ambient motion needs only 24fps; character navigation keeps its own loop.
    if(paintedAt===null){render(elapsed);paintedAt=time;}
    else if(time-paintedAt>=1000/24){render(elapsed);paintedAt=time-(time-paintedAt)%(1000/24);}
    frame=requestAnimationFrame(tick);
  }
  function sync() {
    stage.dataset.ambient=active()?'playing':'paused';
    toggle.setAttribute('aria-pressed',String(enabled));
    toggle.textContent=enabled?'Pause motion':'Play motion';
    if(active()){
      if(frame===null)frame=requestAnimationFrame(tick);
    }else{
      if(frame!==null)cancelAnimationFrame(frame);
      frame=null;lastTime=null;paintedAt=null;
      if(!enabled)ctx.clearRect(0,0,canvas.width,canvas.height);
    }
  }
  function resize() {
    const bounds=canvas.getBoundingClientRect();
    const dpr=Math.min(window.devicePixelRatio||1,1.5);
    canvas.width=Math.round(bounds.width*dpr);canvas.height=Math.round(bounds.height*dpr);
    scaleX=canvas.width/W;scaleY=canvas.height/H;
    if(enabled)render(elapsed);
  }
  toggle.addEventListener('click',()=>{
    enabled=!enabled;
    try { sessionStorage.setItem('campus-motion',enabled?'playing':'paused'); } catch (_) {}
    sync();
  });
  preference.addEventListener('change',event=>{enabled=!event.matches;sync();});
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('pagehide',()=>{pageActive=false;sync();});
  window.addEventListener('pageshow',()=>{pageActive=true;sync();});
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync();},{rootMargin:'40px'}).observe(stage);
  new ResizeObserver(resize).observe(canvas);
  resize();sync();
})();
