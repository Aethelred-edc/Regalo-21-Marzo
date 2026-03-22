/* ══════════════════════════════════════════════
   AUDIO
══════════════════════════════════════════════ */
const Audio = (() => {
  let ctx, mGain, sharedRev, sharedRevGain;

  const Hz = {
    C3:130.81,D3:146.83,E3:164.81,F3:174.61,G3:196,A3:220,B3:246.94,
    C4:261.63,D4:293.66,E4:329.63,F4:349.23,G4:392,A4:440,B4:493.88,
    C5:523.25,D5:587.33,E5:659.25,G5:783.99
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

    {n:'G4',d:.9},{n:'A4',d:.9},{n:'B4',d:1.1},
    {n:'A4',d:.55},{n:'G4',d:.55},{n:'F4',d:1.3},
    {n:'E4',d:.9},{n:'F4',d:.9},{n:'G4',d:1.1},
    {n:'F4',d:.55},{n:'D4',d:.55},{n:'C4',d:2.4}
  ];

  const CHORDS = [
    {t:0,   fs:[Hz.C3,Hz.E3,Hz.G3]},
    {t:4.9, fs:[Hz.A3,Hz.C3,Hz.E3]},
    {t:9.8, fs:[Hz.F3,Hz.A3,Hz.C4]},
    {t:14.7,fs:[Hz.G3,Hz.B3,Hz.D4]},
    {t:19.6,fs:[Hz.C3,Hz.E3,Hz.G3]},
    {t:24.5,fs:[Hz.A3,Hz.C3,Hz.E3]},
    {t:29.4,fs:[Hz.F3,Hz.A3,Hz.C4]},
    {t:34.3,fs:[Hz.G3,Hz.B3,Hz.D4]}
  ];

  /* Reverb: buffer generado UNA sola vez y reutilizado en todos los pads */
  function makeReverb(){
    const sr=ctx.sampleRate, len=Math.floor(sr*2.2);
    const buf=ctx.createBuffer(2,len,sr);
    for(let ch=0;ch<2;ch++){
      const d=buf.getChannelData(ch);
      for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.2);
    }
    const c=ctx.createConvolver(); c.buffer=buf; return c;
  }

  function tone(freq,t0,dur,vol,type){
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.type=type||'triangle'; o.frequency.value=freq;
    g.gain.setValueAtTime(0,t0);
    g.gain.linearRampToValueAtTime(vol,t0+.05);
    g.gain.setValueAtTime(vol,t0+dur*.58);
    g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
    o.connect(g); g.connect(mGain);
    o.start(t0); o.stop(t0+dur+.04);
  }

  /* pad: usa el nodo de reverb compartido — sin crear convolvers nuevos por nota */
  function pad(freq,t0,dur){
    [1,2,3].forEach((h,i)=>{
      const o=ctx.createOscillator(),g=ctx.createGain();
      const v=.05/(i+1);
      o.type='sine'; o.frequency.value=freq*h;
      g.gain.setValueAtTime(0,t0);
      g.gain.linearRampToValueAtTime(v,t0+.4);
      g.gain.setValueAtTime(v,t0+dur-.5);
      g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
      o.connect(g);
      g.connect(mGain);
      if(sharedRev) g.connect(sharedRev); /* reverb compartido */
      o.start(t0); o.stop(t0+dur+.08);
    });
  }

  function schedule(from){
    let t=from, total=0;
    MEL.forEach(({n,d})=>{ tone(Hz[n],t,d*.88,.16,'triangle'); t+=d; });
    total=t-from;
    CHORDS.forEach(({t:ct,fs})=>fs.forEach(f=>pad(f,from+ct,5)));
    return total;
  }

  function clic(){
    if(!ctx){ ctx=new(window.AudioContext||window.webkitAudioContext)(); ctx.resume(); }
    const now=ctx.currentTime;
    [Hz.E4,Hz.G4,Hz.C5].forEach((f,i)=>{
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.type='sine'; o.frequency.value=f;
      g.gain.setValueAtTime(0,now+i*.08);
      g.gain.linearRampToValueAtTime(.28,now+i*.08+.04);
      g.gain.exponentialRampToValueAtTime(.0001,now+i*.08+.6);
      o.connect(g); g.connect(ctx.destination);
      o.start(now+i*.08); o.stop(now+i*.08+.65);
    });
  }

  function iniciar(){
    if(!ctx){ ctx=new(window.AudioContext||window.webkitAudioContext)(); }
    ctx.resume();

    /* Crear reverb compartido solo una vez */
    if(!sharedRev){
      sharedRev = makeReverb();
      sharedRevGain = ctx.createGain();
      sharedRevGain.gain.value = 0.20;
      sharedRev.connect(sharedRevGain);
      sharedRevGain.connect(ctx.destination);
    }

    mGain=ctx.createGain();
    mGain.gain.setValueAtTime(0,ctx.currentTime);
    mGain.gain.linearRampToValueAtTime(.9,ctx.currentTime+2.0);
    mGain.connect(ctx.destination);

    (function loop(){
      const dur=schedule(ctx.currentTime+.1);
      setTimeout(loop,(dur-.8)*1000);
    })();
  }

  return {clic,iniciar};
})();

/* ══════════════════════════════════════════════
   PARTÍCULAS (canvas fijo fondo)
══════════════════════════════════════════════ */
const Particulas = (() => {
  let cv,cx,list=[];
  const rsz=()=>{cv.width=innerWidth;cv.height=innerHeight;};
  function spawn(){
    const p=Math.random()<.3;
    list.push({
      x:Math.random()*innerWidth,y:innerHeight*(0.2+Math.random()*.8),
      vx:(Math.random()-.5)*.5,vy:-(Math.random()*.6+.2),
      r:Math.random()*2+.4,
      hue:p?270+Math.random()*38:42+Math.random()*22,
      sat:p?70:92,life:0,max:180+Math.random()*220,
      w:Math.random()*Math.PI*2,ws:(Math.random()-.5)*.04
    });
  }
  function frame(){
    cx.clearRect(0,0,cv.width,cv.height);
    list.forEach((p,i)=>{
      p.life++;p.w+=p.ws;
      p.x+=p.vx+Math.sin(p.w)*.32;p.y+=p.vy;
      const t=p.life/p.max;
      const a=t<.12?t/.12*.5:t>.8?(1-(t-.8)/.2)*.5:.5;
      cx.beginPath();cx.arc(p.x,p.y,p.r,0,Math.PI*2);
      cx.fillStyle=`hsla(${p.hue},${p.sat}%,72%,${a})`;cx.fill();
      if(p.life>=p.max)list.splice(i,1);
    });
    if(Math.random()<.35)spawn();
    requestAnimationFrame(frame);
  }
  function init(){
    cv=document.getElementById('part-cv');cx=cv.getContext('2d');
    rsz();window.addEventListener('resize',rsz);
    for(let i=0;i<55;i++){spawn();list[i].y=Math.random()*innerHeight;list[i].life=Math.random()*120;}
    frame();
  }
  return {init};
})();

/* ══════════════════════════════════════════════
   PÉTALOS OVERLAY (CSS divs)
══════════════════════════════════════════════ */
function initPetalosOverlay(){
  const cont=document.getElementById('ov-petals');
  for(let i=0;i<22;i++){
    const el=document.createElement('div');
    el.className='ov-petal';
    const p=Math.random()<.48;
    el.style.cssText=`
      left:${Math.random()*100}%;
      width:${5+Math.random()*6}px;
      height:${11+Math.random()*9}px;
      background:${p?`rgba(185,95,255,${.3+Math.random()*.38})`:`rgba(255,195,30,${.3+Math.random()*.38})`};
      animation-delay:${Math.random()*10}s;
      animation-duration:${7+Math.random()*9}s;
      transform:rotate(${Math.random()*360}deg);
    `;
    cont.appendChild(el);
  }
}

/* ══════════════════════════════════════════════
   ANIMACIÓN RAMO (GSAP)
══════════════════════════════════════════════ */
const Ramo = (() => {

  function animTallo(id, delay){
    const el=document.getElementById(id);
    if(!el) return;
    const len=parseFloat(el.getAttribute('stroke-dasharray'))||440;
    gsap.to(el,{strokeDashoffset:0,duration:1.8,delay,ease:'power2.inOut'});
  }

  function animHojas(ids, delay){
    ids.forEach((id,i)=>{
      const el=document.getElementById(id);
      if(!el) return;
      gsap.fromTo(el,{opacity:0,scale:0},{
        opacity:1,scale:1,duration:.7,delay:delay+.8+i*.16,
        ease:'back.out(1.6)',transformOrigin:'center'
      });
    });
  }

  function animLazo(delay){
    gsap.fromTo('#lazo',{opacity:0,scale:0,y:20},{
      opacity:1,scale:1,y:0,duration:.8,delay,ease:'back.out(1.8)',transformOrigin:'center'
    });
  }

  function animFlor(id, delay){
    const g=document.querySelector(`#${id}`);
    if(!g) return;
    const halo=g.querySelector('.glow-halo');
    const bloom=g.querySelector('.bloom-g');

    gsap.fromTo(halo,{opacity:0,scale:.5},{
      opacity:1,scale:1,duration:1.0,delay:delay+.05,ease:'power2.out',transformOrigin:'center'
    });

    gsap.fromTo(bloom,{opacity:0,scale:0,rotation:-25},{
      opacity:1,scale:1,rotation:0,
      duration:1.2,delay,ease:'back.out(1.9)',transformOrigin:'center',
      onComplete:()=>idle(bloom,halo)
    });
  }

  function idle(bloom,halo){
    const tepals=bloom.querySelectorAll('.tep,.sep,.pet-o');
    tepals.forEach((t,i)=>{
      gsap.to(t,{
        rotation:`+=${i%2===0?2.5:-2.5}`,
        duration:2.8+i*.2,repeat:-1,yoyo:true,
        ease:'sine.inOut',delay:i*.15,transformOrigin:'center'
      });
    });
    const lab=bloom.querySelector('.lab');
    if(lab) gsap.to(lab,{scaleY:1.05,duration:2.4,repeat:-1,yoyo:true,ease:'sine.inOut',transformOrigin:'top center'});

    gsap.to(halo,{opacity:'+=.25',scale:'+=.1',duration:3.2,repeat:-1,yoyo:true,ease:'sine.inOut',transformOrigin:'center'});
  }

  function balanceoRamo(){
    gsap.to('#ramo',{
      attr:{viewBox:'50 0 1100 720'},
      duration:4.5,repeat:-1,yoyo:true,ease:'sine.inOut'
    });
    document.querySelectorAll('.tallo').forEach((t,i)=>{
      gsap.to(t,{
        attr:{transform:`skewX(${i%2===0?1.5:-1.5})`},
        duration:3.8+i*.18,repeat:-1,yoyo:true,ease:'sine.inOut',delay:i*.12
      });
    });
  }

  function iniciarTodo(){
    const TALLOS=[
      {id:'t1',hs:['h1a','h1b'],delay:.15},
      {id:'t2',hs:['h2a'],    delay:.3},
      {id:'t3',hs:['h3a','h3b'],delay:.45},
      {id:'t4',hs:['h4a','h4b'],delay:.6},
      {id:'t5',hs:['h5a'],    delay:.75},
      {id:'t6',hs:['h6a'],    delay:.9},
      {id:'t7',hs:['h7a','h7b'],delay:1.05}
    ];
    const FLORES=[
      {id:'fl1',delay:1.9},
      {id:'fl2',delay:2.2},
      {id:'fl3',delay:2.05},
      {id:'fl4',delay:1.75},
      {id:'fl5',delay:2.1},
      {id:'fl6',delay:2.3},
      {id:'fl7',delay:2.0}
    ];

    TALLOS.forEach(({id,hs,delay})=>{
      animTallo(id,delay);
      animHojas(hs,delay);
    });
    animLazo(1.4);
    FLORES.forEach(({id,delay})=>animFlor(id,delay));

    setTimeout(balanceoRamo, 3800);
  }

  return {iniciarTodo};
})();

/* ══════════════════════════════════════════════
   MENSAJE
══════════════════════════════════════════════ */
function animarMensaje(){
  ['.v1','.v2','.v3','.v-sep','.v4','.vsig'].forEach((s,i)=>{
    const el=document.querySelector(s);
    if(!el) return;
    setTimeout(()=>{
      el.classList.add('vis');
      gsap.fromTo(el,{y:16,opacity:0},{y:0,opacity:1,duration:1.1,ease:'power2.out'});
    },2800+i*400);
  });
}

/* ══════════════════════════════════════════════
   LANZAR EXPERIENCIA
══════════════════════════════════════════════ */
function lanzar(){
  const ov=document.getElementById('overlay');
  const mn=document.getElementById('main');

  gsap.to(ov,{opacity:0,duration:.5,ease:'power2.inOut',onComplete:()=>ov.style.display='none'});
  gsap.fromTo(mn,{opacity:0},{opacity:1,duration:.65,delay:.15,ease:'power2.out'});

  Audio.iniciar();
  Particulas.init();
  Ramo.iniciarTodo();
  animarMensaje();
}

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded',()=>{
  initPetalosOverlay();
  document.getElementById('main').style.opacity='0';

  document.getElementById('btn-abrir').addEventListener('click',()=>{
    document.getElementById('btn-abrir').style.pointerEvents='none';
    Audio.clic();
    setTimeout(lanzar, 80); /* 80 ms: click sound inicia, overlay abre de inmediato */
  },{once:true});
});