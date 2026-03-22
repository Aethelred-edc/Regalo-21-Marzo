/* ═══════════════════════════════════════════════════
   AUDIO — música suave restaurada
═══════════════════════════════════════════════════ */
const Audio = (() => {
  let ctx, mGain;

  const Hz = {
    C4:261.63,D4:293.66,E4:329.63,F4:349.23,G4:392,A4:440,B4:493.88,
    C5:523.25,D5:587.33,E5:659.25,
    C3:130.81,E3:164.81,G3:196,A3:220
  };

  const MEL = [
    {n:'E4',d:.9},{n:'G4',d:.9},{n:'A4',d:1.1},
    {n:'G4',d:.55},{n:'F4',d:.55},{n:'E4',d:1.3},
    {n:'D4',d:.9},{n:'E4',d:.9},{n:'F4',d:1.1},
    {n:'E4',d:.55},{n:'D4',d:.55},{n:'C4',d:1.9},
    {n:'E4',d:.9},{n:'A4',d:.9},{n:'C5',d:1.1},
    {n:'B4',d:.55},{n:'A4',d:.55},{n:'G4',d:1.3},
    {n:'F4',d:.9},{n:'G4',d:.9},{n:'A4',d:1.1},
    {n:'G4',d:.55},{n:'E4',d:.55},{n:'D4',d:1.9},
  ];

  const CHORDS = [
    {t:0,   fs:[Hz.C3,Hz.E3,Hz.G3]},
    {t:4.9, fs:[Hz.A3,Hz.C3,Hz.E3]},
    {t:9.8, fs:[Hz.F3 || 174.61,Hz.A3,Hz.C4]},
    {t:14.7,fs:[Hz.G3,Hz.B4 || 246.94,Hz.D4]},
    {t:19.6,fs:[Hz.C3,Hz.E3,Hz.G3]},
  ];

  function makeReverb(){
    const sr = ctx.sampleRate, len = Math.floor(sr*2);
    const buf = ctx.createBuffer(2,len,sr);
    for(let ch=0;ch<2;ch++){
      const d = buf.getChannelData(ch);
      for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.2);
    }
    const c = ctx.createConvolver(); c.buffer = buf; return c;
  }

  function tone(freq,t0,dur,vol){
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.type='triangle'; o.frequency.value=freq;
    g.gain.setValueAtTime(0,t0);
    g.gain.linearRampToValueAtTime(vol,t0+.05);
    g.gain.setValueAtTime(vol,t0+dur*.6);
    g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
    o.connect(g); g.connect(mGain);
    o.start(t0); o.stop(t0+dur+.04);
  }

  function pad(freq,t0,dur){
    const rev = makeReverb();
    const rg  = ctx.createGain(); rg.gain.value=.15;
    rev.connect(rg); rg.connect(ctx.destination);
    [1,2].forEach((h,i)=>{
      const o=ctx.createOscillator(), g=ctx.createGain();
      const v=.04/(i+1);
      o.type='sine'; o.frequency.value=freq*h;
      g.gain.setValueAtTime(0,t0);
      g.gain.linearRampToValueAtTime(v,t0+.5);
      g.gain.setValueAtTime(v,t0+dur-.4);
      g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
      o.connect(g); g.connect(mGain); g.connect(rev);
      o.start(t0); o.stop(t0+dur+.06);
    });
  }

  function schedule(from){
    let t = from, total = 0;
    MEL.forEach(({n,d})=>{ tone(Hz[n],t,d*.88,.14); t+=d; });
    total = t - from;
    CHORDS.forEach(({t:ct,fs})=>fs.forEach(f=>pad(f,from+ct,4.8)));
    return total;
  }

  function clic(){
    if(!ctx){ ctx=new(window.AudioContext||window.webkitAudioContext)(); ctx.resume(); }
    const now=ctx.currentTime;
    [329.63,392,523.25].forEach((f,i)=>{
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.type='sine'; o.frequency.value=f;
      g.gain.setValueAtTime(0,now+i*.09);
      g.gain.linearRampToValueAtTime(.22,now+i*.09+.05);
      g.gain.exponentialRampToValueAtTime(.0001,now+i*.09+.65);
      o.connect(g); g.connect(ctx.destination);
      o.start(now+i*.09); o.stop(now+i*.09+.7);
    });
  }

  function iniciar(){
    if(!ctx){ ctx=new(window.AudioContext||window.webkitAudioContext)(); }
    ctx.resume();
    mGain=ctx.createGain();
    mGain.gain.setValueAtTime(0,ctx.currentTime);
    mGain.gain.linearRampToValueAtTime(.85,ctx.currentTime+2.2);
    mGain.connect(ctx.destination);
    (function loop(){
      const dur=schedule(ctx.currentTime+.1);
      setTimeout(loop,(dur-.6)*1000);
    })();
  }
  return {clic,iniciar};
})();

/* ═══════════════════════════════════════════════════
   PARTÍCULAS
═══════════════════════════════════════════════════ */
const Particulas = (() => {
  let cv,cx,list=[];
  const rsz=()=>{cv.width=innerWidth;cv.height=innerHeight;};
  function spawn(){
    const purp=Math.random()<.35;
    list.push({
      x:Math.random()*innerWidth, y:innerHeight*(.1+Math.random()*.9),
      vx:(Math.random()-.5)*.4, vy:-(Math.random()*.5+.15),
      r:Math.random()*1.8+.3,
      hue:purp?270+Math.random()*30:44+Math.random()*16,
      sat:purp?75:95, life:0, max:160+Math.random()*200,
      w:Math.random()*Math.PI*2, ws:(Math.random()-.5)*.03
    });
  }
  function frame(){
    cx.clearRect(0,0,cv.width,cv.height);
    list.forEach((p,i)=>{
      p.life++;p.w+=p.ws;
      p.x+=p.vx+Math.sin(p.w)*.28;p.y+=p.vy;
      const t=p.life/p.max;
      const a=t<.12?t/.12*.45:t>.8?(1-(t-.8)/.2)*.45:.45;
      cx.beginPath();cx.arc(p.x,p.y,p.r,0,Math.PI*2);
      cx.fillStyle=`hsla(${p.hue},${p.sat}%,72%,${a})`;cx.fill();
      if(p.life>=p.max)list.splice(i,1);
    });
    if(Math.random()<.3)spawn();
    requestAnimationFrame(frame);
  }
  function init(){
    cv=document.getElementById('part-cv');cx=cv.getContext('2d');
    rsz();window.addEventListener('resize',rsz);
    for(let i=0;i<45;i++){spawn();list[i].y=Math.random()*innerHeight;list[i].life=Math.random()*100;}
    frame();
  }
  return {init};
})();

/* ═══════════════════════════════════════════════════
   OVERLAY PETALS
═══════════════════════════════════════════════════ */
function initOverlayPetals(){
  const cont=document.getElementById('ov-petals');
  for(let i=0;i<20;i++){
    const el=document.createElement('div');
    el.className='ov-petal';
    const purp=Math.random()<.45;
    el.style.cssText=`
      left:${Math.random()*100}%;
      width:${5+Math.random()*5}px;height:${10+Math.random()*8}px;
      background:${purp?`rgba(180,80,255,${.28+Math.random()*.32})`:`rgba(255,190,0,${.3+Math.random()*.35})`};
      animation-delay:${Math.random()*10}s;animation-duration:${7+Math.random()*9}s;
      transform:rotate(${Math.random()*360}deg);
    `;
    cont.appendChild(el);
  }
}

/* ═══════════════════════════════════════════════════
   RAMO
   REGLA CRÍTICA:
   - Tallos: GSAP strokeDashoffset (attr SVG — seguro)
   - Hojas: GSAP opacity solamente
   - Flores: CSS class .abierta (NO toca transforms SVG)
   - NO se usa GSAP para scale/rotation en flores
═══════════════════════════════════════════════════ */
const Ramo = (() => {

  function animTallo(id,delay){
    const el=document.getElementById(id);
    if(!el)return;
    gsap.to(el,{strokeDashoffset:0,duration:2.0,delay,ease:'power2.inOut'});
  }

  function animHoja(id,delay){
    const el=document.getElementById(id);
    if(!el)return;
    gsap.fromTo(el,{opacity:0},{opacity:1,duration:.65,delay,ease:'power2.out'});
  }

  function animLazo(delay){
    gsap.fromTo('#lazo',{opacity:0},{opacity:1,duration:.9,delay,ease:'power2.out'});
  }

  /* Flores: CSS animation — GSAP nunca toca transform */
  function animFlor(id,delayS){
    const ms=delayS*1000;
    const g=document.getElementById(id);
    if(!g)return;
    const inner=g.querySelector('.bloom-inner');
    const halo=g.querySelector('.glow-halo');
    setTimeout(()=>{
      if(inner) inner.classList.add('abierta');
      if(halo)  halo.classList.add('abierta');
    },ms);
  }

  /* Balanceo suave usando GSAP en el grupo contenedor */
  function balanceo(){
    gsap.to('#tallos-grupo',{
      rotation:.8,transformOrigin:'200px 638px',
      duration:5,repeat:-1,yoyo:true,ease:'sine.inOut'
    });
  }

  function start(){
    const CFG=[
      {id:'t1',hs:['h1a','h1b'],fl:'fl1',td:.15,hd:.95,fd:1.90},
      {id:'t2',hs:['h2a'],      fl:'fl2',td:.30,hd:1.1, fd:2.15},
      {id:'t3',hs:['h3a','h3b'],fl:'fl3',td:.45,hd:1.2, fd:2.00},
      {id:'t4',hs:['h4a','h4b'],fl:'fl4',td:.60,hd:1.4, fd:1.72},
      {id:'t5',hs:['h5a'],      fl:'fl5',td:.75,hd:1.5, fd:2.05},
      {id:'t6',hs:['h6a'],      fl:'fl6',td:.90,hd:1.7, fd:2.25},
      {id:'t7',hs:['h7a','h7b'],fl:'fl7',td:1.05,hd:1.85,fd:1.95},
    ];
    CFG.forEach(c=>{
      animTallo(c.id,c.td);
      c.hs.forEach((h,i)=>animHoja(h,c.hd+i*.15));
      animFlor(c.fl,c.fd);
    });
    animLazo(1.5);
    setTimeout(balanceo,5000);
  }
  return {start};
})();

/* ═══════════════════════════════════════════════════
   MENSAJE
═══════════════════════════════════════════════════ */
function animarMensaje(){
  ['.v1','.v2','.v3','.v-sep','.v4','.vsig'].forEach((sel,i)=>{
    const el=document.querySelector(sel);
    if(!el)return;
    setTimeout(()=>el.classList.add('vis'),3400+i*430);
  });
}

/* ═══════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded',()=>{
  initOverlayPetals();
  document.getElementById('btn-abrir').addEventListener('click',()=>{
    Audio.clic();
    setTimeout(()=>{
      const ov=document.getElementById('overlay');
      const mn=document.getElementById('main');
      ov.classList.add('hide');
      setTimeout(()=>ov.style.display='none',650);
      mn.classList.add('show');
      Audio.iniciar();
      Particulas.init();
      Ramo.start();
      animarMensaje();
    },60);
  },{once:true});
});