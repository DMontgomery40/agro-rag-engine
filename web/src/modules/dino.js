// Tiny Dino runner for demo mode
(() => {
  const el = document.getElementById('dino-canvas');
  if (!el || !el.getContext) return;
  const ctx = el.getContext('2d');
  const W = el.width, H = el.height;
  let t = 0, alive = true, score = 0;
  const dino = { x: 40, y: H-22, vy: 0, on: true };
  const obs = [];
  function spawn(){ obs.push({ x: W+10, w: 10+Math.random()*12, h: 14+Math.random()*18 }); }
  function jump(){ if (dino.on){ dino.vy = -5.2; dino.on = false; } }
  window.addEventListener('keydown', (e)=>{ if (e.code==='Space'||e.code==='ArrowUp'){ e.preventDefault(); jump(); }});
  function step(){
    if (!alive) return; t++; if (t%80===0) spawn();
    ctx.clearRect(0,0,W,H);
    // ground
    ctx.strokeStyle = '#999'; ctx.beginPath(); ctx.moveTo(0,H-8); ctx.lineTo(W,H-8); ctx.stroke();
    // physics
    dino.vy += 0.25; dino.y += dino.vy; if (dino.y>H-22){ dino.y=H-22; dino.vy=0; dino.on=true; }
    // draw dino
    ctx.fillStyle = '#2d2d2d'; ctx.fillRect(dino.x-8, dino.y-12, 18, 12); ctx.fillRect(dino.x-12, dino.y-4, 24, 8);
    // obstacles
    ctx.fillStyle = '#5b9dff';
    for (let i=obs.length-1;i>=0;i--){ const o=obs[i]; o.x -= 2.8; ctx.fillRect(o.x, H-8-o.h, o.w, o.h); if (o.x+o.w<0) obs.splice(i,1), score++; }
    // collide
    for (const o of obs){
      if (dino.x+10>o.x && dino.x-10<o.x+o.w && dino.y+4>H-8-o.h){ alive=false; break; }
    }
    // score
    ctx.fillStyle = '#16A34A'; ctx.font = '12px monospace'; ctx.fillText('score '+score, W-80, 16);
    requestAnimationFrame(step);
  }
  step();
})();

