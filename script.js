// ── Theme toggle ─────────────────────────────────────────────────────
function toggleTheme() {
  const root = document.documentElement;
  const current = root.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  root.setAttribute('data-theme', next);
  document.getElementById('theme-label').textContent = next === 'light' ? 'DARK MODE' : 'LIGHT MODE';
  try { localStorage.setItem('bm-theme', next); } catch(e) {}
}
(function initTheme() {
  let saved;
  try { saved = localStorage.getItem('bm-theme'); } catch(e) {}
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
    window.addEventListener('DOMContentLoaded', () => {
      const lbl = document.getElementById('theme-label');
      if (lbl) lbl.textContent = saved === 'light' ? 'DARK MODE' : 'LIGHT MODE';
    });
  }
})();

// ── Tooltip singleton ─────────────────────────────────────────────────
const TT = (() => {
  let el;
  function ensure() {
    if (!el) {
      el = document.createElement('div');
      el.className = 'chart-tooltip';
      document.body.appendChild(el);
    }
    return el;
  }
  function show(e, label, val, colorCls) {
    const t = ensure();
    t.innerHTML = `<span class="tt-label">${label}</span><span class="tt-val ${colorCls}">${val}</span>`;
    position(e);
    t.classList.add('visible');
  }
  function position(e) {
    if (!el) return;
    const x = e.clientX, y = e.clientY;
    const tw = el.offsetWidth || 120, th = el.offsetHeight || 50;
    let lx = x + 14, ly = y - th - 8;
    if (lx + tw > window.innerWidth - 12) lx = x - tw - 14;
    if (ly < 6) ly = y + 16;
    el.style.left = lx + 'px';
    el.style.top  = ly + 'px';
  }
  function move(e) { position(e); }
  function hide() { if (el) el.classList.remove('visible'); }
  return { show, move, hide };
})();

// ── Clock ────────────────────────────────────────────────────────────
function tick() {
  const now = new Date();
  document.getElementById('clock').textContent =
    now.toLocaleTimeString('en-IN', {hour12:false}) + ' IST';
}
tick(); setInterval(tick, 1000);

// ── Nav / section toggle ─────────────────────────────────────────────
function showSection(id) {
  ['overview','trends','categories','regions','pipeline'].forEach(s => {
    const el = document.getElementById('sec-' + s);
    if (el) el.hidden = s !== id;
  });
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navMap = {overview:0,trends:1,categories:2,regions:3,pipeline:4};
  const navItems = document.querySelectorAll('.nav-item');
  if (navMap[id] !== undefined) navItems[navMap[id]].classList.add('active');
  if (id === 'trends')     { renderTrends(); renderYoYBar(); renderMarginLine(); renderHeatmap(); renderMonthlySalesBar(); renderMonthlyMargin(); renderCategoryCharts(); renderCatMarginChart(); }
  if (id === 'categories') { renderCategories(); renderPieChart(); renderPayPie(); renderSegmentStack(); }
  if (id === 'regions')    { renderRegions(); renderRegionPie(); renderCityBars(); }
  if (id === 'pipeline')   { renderFunnel(); }
}

// ── KPI count-up ─────────────────────────────────────────────────────
function countUp(el, target, prefix, suffix, duration) {
  const start = performance.now();
  function frame(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = t < 0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;
    el.textContent = prefix + Math.round(target * ease).toLocaleString('en-IN') + suffix;
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

window.addEventListener('load', () => {
  countUp(document.getElementById('kpi-netsales'), 2017, '₹', ' Cr', 1600);
  countUp(document.getElementById('kpi-profit'),   423,  '₹', ' Cr', 1400);
  countUp(document.getElementById('kpi-aov'),      25.12,'₹', ' L',  1200);
  countUp(document.getElementById('kpi-return'),   6.59, '',  '%',   1000);
});

// ── Data ────────────────────────────────────────────────────────────
const months2024 = [5404,5541,6893,5474,6235,6801,7189,5830,6176,6363,5883,7034];
const months2025 = [5237,4563,5759,5529,9472,5327,5802,6174,6519,6102,5030,7835];
const months2026 = [9312,4422,6164,5383,5805,4717,6900,5683,5053];
const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const monthShort  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── SVG helpers ──────────────────────────────────────────────────────
function pts(data, W, H, padX, padY, maxVal) {
  return data.map((v,i) => {
    const x = padX + (i / (data.length - 1)) * (W - 2*padX);
    const y = H - padY - (v / maxVal) * (H - 2*padY);
    return [x, y];
  });
}

// Attach mouseover/out to SVG hit areas after rendering
function attachSVGTooltips(svgEl, pointsArr, labels, colorCls, yearLabel) {
  // pointsArr: [{x,y,val,label}]
  const ns = 'http://www.w3.org/2000/svg';
  pointsArr.forEach((p, i) => {
    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', p.x.toFixed(1));
    circle.setAttribute('cy', p.y.toFixed(1));
    circle.setAttribute('r', '9');
    circle.setAttribute('fill', 'transparent');
    circle.setAttribute('stroke', 'none');
    circle.setAttribute('class', 'hit-dot');
    circle.setAttribute('data-mo', p.label);
    circle.setAttribute('data-yr', yearLabel);
    circle.setAttribute('data-v', p.rawVal !== undefined ? p.rawVal : p.val);
    circle.setAttribute('data-cls', colorCls);
    circle.setAttribute('data-display', p.val);
    circle.style.cursor = 'crosshair';
    circle.addEventListener('mouseenter', e => {
      TT.show(e, `${yearLabel} · ${p.label}`, p.val, colorCls);
    });
    circle.addEventListener('mousemove', e => TT.move(e));
    circle.addEventListener('mouseleave', () => TT.hide());
    svgEl.appendChild(circle);
  });
}

// ── Trend charts ─────────────────────────────────────────────────────
function renderTrends() {
  const svg = document.getElementById('trend-chart');
  const W = 700, H = 220, padX = 40, padY = 20;
  const maxVal = 10000;

  let html = '';
  // Defs
  html += `<defs>
    <linearGradient id="g24" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(56,217,245,0.18)"/>
      <stop offset="100%" stop-color="rgba(56,217,245,0)"/>
    </linearGradient>
    <linearGradient id="g25" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,82,119,0.14)"/>
      <stop offset="100%" stop-color="rgba(255,82,119,0)"/>
    </linearGradient>
  </defs>`;

  // Grid lines
  for (let v = 2000; v <= 10000; v += 2000) {
    const y = H - padY - (v / maxVal) * (H - 2*padY);
    html += `<line x1="${padX}" y1="${y.toFixed(1)}" x2="${W-padX}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`;
    html += `<text x="${padX - 4}" y="${(y+3).toFixed(1)}" text-anchor="end" font-size="8" fill="rgba(138,153,168,0.7)">${(v/1000).toFixed(0)}k</text>`;
  }
  // Month labels
  months2024.forEach((_, i) => {
    const x = padX + (i / 11) * (W - 2*padX);
    html += `<text x="${x.toFixed(1)}" y="${H - 3}" text-anchor="middle" font-size="8" fill="rgba(138,153,168,0.7)">${monthShort[i]}</text>`;
  });

  const pts24 = pts(months2024, W, H, padX, padY, maxVal);
  const pts25 = pts(months2025, W, H, padX, padY, maxVal);

  // Area fills
  const ap24 = `M${pts24[0][0].toFixed(1)},${H-padY} ` + pts24.map(p=>`L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + ` L${pts24[11][0].toFixed(1)},${H-padY} Z`;
  const ap25 = `M${pts25[0][0].toFixed(1)},${H-padY} ` + pts25.map(p=>`L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + ` L${pts25[11][0].toFixed(1)},${H-padY} Z`;
  html += `<path d="${ap24}" fill="url(#g24)"/>`;
  html += `<path d="${ap25}" fill="url(#g25)"/>`;

  // Lines
  html += `<polyline points="${pts24.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="#38d9f5" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  html += `<polyline points="${pts25.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="#ff5277" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;

  // Visible dots at all points
  pts24.forEach((p,i) => {
    html += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="#38d9f5" opacity="0.7"/>`;
  });
  pts25.forEach((p,i) => {
    html += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="#ff5277" opacity="0.7"/>`;
  });

  // Highlight max points
  const maxIdx24 = months2024.indexOf(Math.max(...months2024));
  const maxIdx25 = months2025.indexOf(Math.max(...months2025));
  html += `<circle cx="${pts24[maxIdx24][0].toFixed(1)}" cy="${pts24[maxIdx24][1].toFixed(1)}" r="5" fill="#38d9f5"/>`;
  html += `<text x="${pts24[maxIdx24][0].toFixed(1)}" y="${(pts24[maxIdx24][1]-9).toFixed(1)}" text-anchor="middle" font-size="9" fill="#38d9f5" font-weight="700">${(months2024[maxIdx24]/1000).toFixed(1)}k</text>`;
  html += `<circle cx="${pts25[maxIdx25][0].toFixed(1)}" cy="${pts25[maxIdx25][1].toFixed(1)}" r="5" fill="#ff5277"/>`;
  html += `<text x="${pts25[maxIdx25][0].toFixed(1)}" y="${(pts25[maxIdx25][1]-9).toFixed(1)}" text-anchor="middle" font-size="9" fill="#ff5277" font-weight="700">${(months2025[maxIdx25]/1000).toFixed(1)}k</text>`;

  // Legend
  html += `<rect x="${W-padX-100}" y="8" width="10" height="2" fill="#38d9f5"/>`;
  html += `<text x="${W-padX-86}" y="12" font-size="8" fill="#38d9f5">FY 2024</text>`;
  html += `<rect x="${W-padX-100}" y="20" width="10" height="2" fill="#ff5277"/>`;
  html += `<text x="${W-padX-86}" y="24" font-size="8" fill="#ff5277">FY 2025</text>`;

  svg.innerHTML = html;

  // Attach transparent hover targets
  const hitData24 = pts24.map((p,i) => ({x:p[0],y:p[1],val:`₹${(months2024[i]/1000).toFixed(2)}k units`,label:monthLabels[i]}));
  const hitData25 = pts25.map((p,i) => ({x:p[0],y:p[1],val:`₹${(months2025[i]/1000).toFixed(2)}k units`,label:monthLabels[i]}));
  attachSVGTooltips(svg, hitData24, monthLabels, 'c-cyan', 'FY 2024');
  attachSVGTooltips(svg, hitData25, monthLabels, 'c-red',  'FY 2025');

  // 2026 partial
  const svg26 = document.getElementById('trend-2026');
  const W2=320, H2=140, pX=36, pY=18, max26=10000;
  let h2='';
  for (let v=2000;v<=10000;v+=2000) {
    const y=H2-pY-(v/max26)*(H2-2*pY);
    h2+=`<line x1="${pX}" y1="${y.toFixed(1)}" x2="${W2-pX}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`;
    h2+=`<text x="${pX-4}" y="${(y+3).toFixed(1)}" text-anchor="end" font-size="7" fill="rgba(138,153,168,0.5)">${(v/1000).toFixed(0)}k</text>`;
  }
  h2+=`<defs><linearGradient id="g26" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(255,209,102,0.18)"/><stop offset="100%" stop-color="rgba(255,209,102,0)"/></linearGradient></defs>`;
  const pts26=months2026.map((v,i)=>[pX+(i/(months2026.length-1))*(W2-2*pX), H2-pY-(v/max26)*(H2-2*pY)]);
  const ap26=`M${pts26[0][0].toFixed(1)},${H2-pY} `+pts26.map(p=>`L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')+` L${pts26[pts26.length-1][0].toFixed(1)},${H2-pY} Z`;
  h2+=`<path d="${ap26}" fill="url(#g26)"/>`;
  h2+=`<polyline points="${pts26.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="#ffd166" stroke-width="2" stroke-linejoin="round"/>`;
  pts26.forEach((p,i)=>{
    h2+=`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="#ffd166" opacity="0.8"/>`;
    h2+=`<text x="${p[0].toFixed(1)}" y="${H2-4}" text-anchor="middle" font-size="6.5" fill="rgba(138,153,168,0.7)">${monthShort[i]}</text>`;
  });
  svg26.innerHTML=h2;

  // Tooltips for 2026
  const hitData26 = pts26.map((p,i) => ({x:p[0],y:p[1],val:`₹${(months2026[i]/1000).toFixed(2)}k units`,label:monthLabels[i]}));
  attachSVGTooltips(svg26, hitData26, monthLabels.slice(0,9), 'c-amber', 'FY 2026');
}

// ── Categories chart ──────────────────────────────────────────────────
const catData = [
  {name:'Electronics',   val:1326.43, pct:65.8, color:'#38d9f5', cls:'c-cyan'},
  {name:'Home & Kitchen',val:286.66,  pct:14.2, color:'#ff5277', cls:'c-red'},
  {name:'Sports',        val:181.67,  pct:9.0,  color:'#ffd166', cls:'c-amber'},
  {name:'Fashion',       val:106.17,  pct:5.3,  color:'#06d6a0', cls:'c-green'},
  {name:'Beauty',        val:70.02,   pct:3.5,  color:'#b48eff', cls:'c-purple'},
  {name:'Books',         val:46.21,   pct:2.3,  color:'#ff9f43', cls:'c-amber'},
];

function renderCategories() {
  const container = document.getElementById('cat-bars');
  container.innerHTML = '';
  catData.forEach(d => {
    const item = document.createElement('div');
    item.className = 'bar-item';
    item.innerHTML = `
      <div class="bar-info">
        <span class="bar-name">${d.name}</span>
        <span class="bar-val" style="color:${d.color}">₹${d.val.toFixed(1)} Cr</span>
        <span class="bar-pct">${d.pct}%</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${d.pct/65.8*100}%;background:linear-gradient(90deg,${d.color},${d.color}44)"></div>
      </div>`;
    item.addEventListener('mouseenter', e => TT.show(e, d.name, `₹${d.val.toFixed(2)} Cr · ${d.pct}% share`, d.cls));
    item.addEventListener('mousemove',  e => TT.move(e));
    item.addEventListener('mouseleave', () => TT.hide());
    container.appendChild(item);
  });

  // Donut
  const svgD = document.getElementById('donut-svg');
  const cx=60, cy=60, R=44, r=28;
  let startAngle=-Math.PI/2;
  let paths = '';
  const segData = [];
  catData.forEach(d => {
    const angle = (d.pct/100)*2*Math.PI;
    const x1=cx+R*Math.cos(startAngle), y1=cy+R*Math.sin(startAngle);
    const x2=cx+R*Math.cos(startAngle+angle), y2=cy+R*Math.sin(startAngle+angle);
    const xi1=cx+r*Math.cos(startAngle), yi1=cy+r*Math.sin(startAngle);
    const xi2=cx+r*Math.cos(startAngle+angle), yi2=cy+r*Math.sin(startAngle+angle);
    const large = angle > Math.PI ? 1 : 0;
    const mid = startAngle + angle/2;
    const mx = cx + (R+r)/2 * Math.cos(mid);
    const my = cy + (R+r)/2 * Math.sin(mid);
    segData.push({d:d, path:`M${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} L${xi2.toFixed(2)},${yi2.toFixed(2)} A${r},${r} 0 ${large},0 ${xi1.toFixed(2)},${yi1.toFixed(2)} Z`, mx, my});
    startAngle += angle;
  });
  const centerText = `<text x="${cx}" y="${cy-5}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--fg)" font-family="'JetBrains Mono',monospace">65.8%</text>
   <text x="${cx}" y="${cy+9}" text-anchor="middle" font-size="10" fill="var(--fg-dim)" font-family="'JetBrains Mono',monospace">ELECTRONICS</text>`;
  svgD.innerHTML = segData.map(s=>`<path d="${s.path}" fill="${s.d.color}" opacity="0.85" style="cursor:crosshair;transition:opacity 0.15s"/>`).join('') + centerText;

  // Add donut tooltips
  const ns = 'http://www.w3.org/2000/svg';
  segData.forEach((s,i) => {
    const pathEl = svgD.querySelectorAll('path')[i];
    if (!pathEl) return;
    pathEl.addEventListener('mouseenter', e => {
      pathEl.setAttribute('opacity','1');
      TT.show(e, s.d.name, `₹${s.d.val.toFixed(2)} Cr · ${s.d.pct}%`, s.d.cls);
    });
    pathEl.addEventListener('mousemove', e => TT.move(e));
    pathEl.addEventListener('mouseleave', () => {
      pathEl.setAttribute('opacity','0.85');
      TT.hide();
    });
  });

  document.getElementById('donut-legend').innerHTML = catData.map(d =>
    `<div class="legend-item">
       <div class="legend-dot" style="background:${d.color}"></div>
       <span>${d.name} <span style="color:var(--fg-dim)">${d.pct}%</span></span>
     </div>`
  ).join('');
}

// ── Region bars chart ────────────────────────────────────────────────
function renderRegions() {
  const svg = document.getElementById('region-chart');
  const regions = [
    {name:'North', val:559.12, pct:27.7, color:'#38d9f5', cls:'c-cyan'},
    {name:'West',  val:518.95, pct:25.7, color:'#ff5277', cls:'c-red'},
    {name:'East',  val:482.67, pct:23.9, color:'#ffd166', cls:'c-amber'},
    {name:'South', val:456.41, pct:22.6, color:'#06d6a0', cls:'c-green'},
  ];
  const W=340, H=120, padL=50, padB=20, padT=10, maxVal=600;
  const barW = (W - padL - 10) / regions.length;
  let html='';
  // Grid
  for (let v=0;v<=600;v+=200){
    const y=H-padB-(v/maxVal)*(H-padB-padT);
    html+=`<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W-10}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`;
    html+=`<text x="${padL-4}" y="${(y+3).toFixed(1)}" text-anchor="end" font-size="8" fill="rgba(138,153,168,0.6)">${v}</text>`;
  }
  regions.forEach((r,i)=>{
    const x=padL+i*barW+4;
    const bh=(r.val/maxVal)*(H-padB-padT);
    const y=H-padB-bh;
    // Bar with gradient
    const gid = `rg${i}`;
    html+=`<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${r.color}" stop-opacity="0.9"/><stop offset="100%" stop-color="${r.color}" stop-opacity="0.35"/></linearGradient></defs>`;
    html+=`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(barW-8).toFixed(1)}" height="${bh.toFixed(1)}" fill="url(#${gid})" rx="2" style="cursor:crosshair;transition:filter 0.15s" data-idx="${i}"/>`;
    html+=`<text x="${(x+(barW-8)/2).toFixed(1)}" y="${(y-5).toFixed(1)}" text-anchor="middle" font-size="8" fill="${r.color}" font-weight="700">${r.pct}%</text>`;
    html+=`<text x="${(x+(barW-8)/2).toFixed(1)}" y="${(H-5).toFixed(1)}" text-anchor="middle" font-size="8" fill="rgba(138,153,168,0.7)">${r.name}</text>`;
  });
  svg.innerHTML=html;

  // Tooltips on region bars
  svg.querySelectorAll('rect[data-idx]').forEach(rect => {
    const i = +rect.getAttribute('data-idx');
    const r = regions[i];
    rect.addEventListener('mouseenter', e => {
      rect.style.filter = 'brightness(1.4)';
      TT.show(e, `${r.name} Region`, `₹${r.val.toFixed(2)} Cr · ${r.pct}%`, r.cls);
    });
    rect.addEventListener('mousemove', e => TT.move(e));
    rect.addEventListener('mouseleave', () => {
      rect.style.filter = '';
      TT.hide();
    });
  });
}

// Also attach tooltips to the bar-row items in regions section
function attachBarRowTooltips() {
  const barRows = document.querySelectorAll('#sec-regions .bar-item');
  const rData = [
    {name:'North', val:'₹559.12 Cr', pct:'27.7%', cls:'c-cyan'},
    {name:'West',  val:'₹518.95 Cr', pct:'25.7%', cls:'c-red'},
    {name:'East',  val:'₹482.67 Cr', pct:'23.9%', cls:'c-amber'},
    {name:'South', val:'₹456.41 Cr', pct:'22.6%', cls:'c-green'},
  ];
  barRows.forEach((item, i) => {
    if (!rData[i]) return;
    item.addEventListener('mouseenter', e => TT.show(e, rData[i].name + ' Region', `${rData[i].val} · ${rData[i].pct}`, rData[i].cls));
    item.addEventListener('mousemove',  e => TT.move(e));
    item.addEventListener('mouseleave', () => TT.hide());
  });
}

// ── Channel pill tooltips ────────────────────────────────────────────
function attachChannelTooltips() {
  const pillData = [
    {label:'Online Channel',   val:'₹1,022 Cr · 50.7% of total revenue', cls:'c-cyan'},
    {label:'In-Store Channel', val:'₹506 Cr · 25.1% of total revenue',   cls:'c-purple'},
    {label:'Mobile App',       val:'₹489 Cr · 24.2% of total revenue',   cls:'c-green'},
  ];
  document.querySelectorAll('.channel-pill').forEach((pill, i) => {
    pill.style.cursor = 'crosshair';
    pill.addEventListener('mouseenter', e => TT.show(e, pillData[i].label, pillData[i].val, pillData[i].cls));
    pill.addEventListener('mousemove',  e => TT.move(e));
    pill.addEventListener('mouseleave', () => TT.hide());
  });
}

// ── Segment row tooltips ─────────────────────────────────────────────
function attachSegmentTooltips() {
  const segInfo = [
    {label:'Retail Segment',    val:'₹1,035 Cr · 51.3% share', cls:'c-cyan'},
    {label:'Wholesale Segment', val:'₹512 Cr · 25.4% share',   cls:'c-amber'},
    {label:'Corporate Segment', val:'₹470 Cr · 23.3% share',   cls:'c-purple'},
  ];
  document.querySelectorAll('.seg-row').forEach((row, i) => {
    row.style.cursor = 'crosshair';
    row.addEventListener('mouseenter', e => TT.show(e, segInfo[i].label, segInfo[i].val, segInfo[i].cls));
    row.addEventListener('mousemove',  e => TT.move(e));
    row.addEventListener('mouseleave', () => TT.hide());
  });
}

// ── Pay chip tooltips ────────────────────────────────────────────────
function attachPayTooltips() {
  const payInfo = [
    {label:'Credit Card', val:'₹427 Cr · 21.2% of transactions', cls:'c-cyan'},
    {label:'UPI',         val:'₹409 Cr · 20.3% of transactions', cls:'c-green'},
    {label:'Cash',        val:'₹405 Cr · 20.1% of transactions', cls:'c-purple'},
    {label:'Debit Card',  val:'₹393 Cr · 19.5% of transactions', cls:'c-amber'},
    {label:'Net Banking', val:'₹381 Cr · 18.9% of transactions', cls:'c-red'},
  ];
  document.querySelectorAll('.pay-chip').forEach((chip, i) => {
    chip.addEventListener('mouseenter', e => TT.show(e, payInfo[i].label, payInfo[i].val, payInfo[i].cls));
    chip.addEventListener('mousemove',  e => TT.move(e));
    chip.addEventListener('mouseleave', () => TT.hide());
  });
}

// ── KPI tile tooltips ────────────────────────────────────────────────
function attachKPITooltips() {
  const kpiInfo = [
    {label:'Net Revenue (FY24–26)',   val:'Total across all channels & segments', cls:'c-cyan'},
    {label:'Total Profit',            val:'21% average margin across all years',  cls:'c-green'},
    {label:'Average Order Value',     val:'Per-transaction average in Lakhs',     cls:'c-purple'},
    {label:'Product Return Rate',     val:'529 returns out of 8,029 orders',      cls:'c-red'},
  ];
  document.querySelectorAll('.kpi-tile').forEach((tile, i) => {
    tile.style.cursor = 'crosshair';
    tile.addEventListener('mouseenter', e => TT.show(e, kpiInfo[i].label, kpiInfo[i].val, kpiInfo[i].cls));
    tile.addEventListener('mousemove',  e => TT.move(e));
    tile.addEventListener('mouseleave', () => TT.hide());
  });
}

// ── Year card tooltips ───────────────────────────────────────────────
function attachYearTooltips() {
  const yearInfo = [
    {label:'FY 2024', val:'₹726 Cr · 3,204 orders · 12 months', cls:'c-cyan'},
    {label:'FY 2025', val:'₹732 Cr · 3,285 orders · 12 months', cls:'c-red'},
    {label:'FY 2026', val:'₹558 Cr · 1,540 orders · 9 months (Jan–Sep)', cls:'c-amber'},
    {label:'All Orders', val:'8,029 clean records · 26 columns', cls:'c-purple'},
  ];
  document.querySelectorAll('.year-card').forEach((card, i) => {
    card.style.cursor = 'crosshair';
    card.addEventListener('mouseenter', e => TT.show(e, yearInfo[i].label, yearInfo[i].val, yearInfo[i].cls));
    card.addEventListener('mousemove',  e => TT.move(e));
    card.addEventListener('mouseleave', () => TT.hide());
  });
}

// ── Generic animated pie renderer ────────────────────────────────────
function renderAnimatedPie(svgId, legendId, data, cx, cy, R, labelMinPct=5) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  let startAngle = -Math.PI / 2;
  let paths = '';
  const segInfo = [];

  data.forEach((d, idx) => {
    const angle = (d.pct / 100) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(startAngle + angle);
    const y2 = cy + R * Math.sin(startAngle + angle);
    const large = angle > Math.PI ? 1 : 0;
    const mid = startAngle + angle / 2;
    const delay = idx * 0.07;
    paths += `<path data-idx="${idx}" class="pie-slice-animated" d="M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z" fill="${d.color}" opacity="0.85" stroke="var(--bg)" stroke-width="2" style="cursor:crosshair;transition:opacity 0.15s,filter 0.15s;transform-origin:${cx}px ${cy}px;animation-delay:${delay}s"/>`;
    if (d.pct >= labelMinPct) {
      const tlx = cx + (R * 0.60) * Math.cos(mid);
      const tly = cy + (R * 0.60) * Math.sin(mid);
      const fs = R > 70 ? 11 : 8;
      paths += `<text data-label="${idx}" x="${tlx.toFixed(1)}" y="${(tly+fs*0.35).toFixed(1)}" text-anchor="middle" font-size="${fs}" font-weight="700" fill="${d.pct >= 30 ? 'rgba(0,0,0,0.85)' : '#fff'}" font-family="'JetBrains Mono',monospace" pointer-events="none" style="animation:pie-fade-in 0.4s ${delay+0.1}s both">${d.pct}%</text>`;
    }
    segInfo.push({ d, startAngle, angle, mid });
    startAngle += angle;
  });

  svg.innerHTML = paths;

  svg.querySelectorAll('path[data-idx]').forEach(p => {
    const i = +p.getAttribute('data-idx');
    const d = data[i];
    p.addEventListener('mouseenter', e => {
      p.setAttribute('opacity', '1');
      p.style.filter = 'brightness(1.25) drop-shadow(0 0 8px ' + d.color + '88)';
      TT.show(e, d.name, `₹${d.val.toFixed(2)} Cr · ${d.pct}%`, d.cls);
    });
    p.addEventListener('mousemove', e => TT.move(e));
    p.addEventListener('mouseleave', () => {
      p.setAttribute('opacity', '0.85');
      p.style.filter = '';
      TT.hide();
    });
  });

  const legend = document.getElementById(legendId);
  if (legend) {
    legend.innerHTML = data.map(d =>
      `<div style="display:flex;align-items:center;gap:8px;font-size:11.5px;font-family:var(--font-body);color:var(--fg-mid);cursor:crosshair">
        <div style="width:11px;height:11px;border-radius:50%;background:${d.color};flex-shrink:0"></div>
        <span style="flex:1">${d.name}</span>
        <span style="font-family:var(--font-mono);color:${d.color};font-size:10px;font-weight:700">₹${d.val.toFixed(1)}Cr</span>
        <span style="font-family:var(--font-mono);font-size:9px;color:var(--fg-dim)">${d.pct}%</span>
      </div>`
    ).join('');
  }
}

// ── Pie chart (Categories section) ───────────────────────────────────
function renderPieChart() {
  renderAnimatedPie('pie-svg', 'pie-legend', catData, 180, 180, 155, 3);
}

// ── Payment pie chart ─────────────────────────────────────────────────
const payData = [
  {name:'Credit Card', val:427, pct:21.2, color:'#38d9f5', cls:'c-cyan'},
  {name:'UPI',         val:409, pct:20.3, color:'#06d6a0', cls:'c-green'},
  {name:'Cash',        val:405, pct:20.1, color:'#b48eff', cls:'c-purple'},
  {name:'Debit Card',  val:393, pct:19.5, color:'#ffd166', cls:'c-amber'},
  {name:'Net Banking', val:381, pct:18.9, color:'#ff5277', cls:'c-red'},
];
function renderPayPie() {
  renderAnimatedPie('pay-pie-svg', 'pay-pie-legend', payData, 100, 100, 80, 10);
}

// ── Region pie chart ──────────────────────────────────────────────────
const regionPieData = [
  {name:'North', val:559.12, pct:27.7, color:'#38d9f5', cls:'c-cyan'},
  {name:'West',  val:518.95, pct:25.7, color:'#ff5277', cls:'c-red'},
  {name:'East',  val:482.67, pct:23.9, color:'#ffd166', cls:'c-amber'},
  {name:'South', val:456.41, pct:22.6, color:'#06d6a0', cls:'c-green'},
];
function renderRegionPie() {
  renderAnimatedPie('region-pie-svg', 'region-pie-legend', regionPieData, 100, 100, 80, 10);
}

// ── Segment stacked bar chart ─────────────────────────────────────────
function renderSegmentStack() {
  const svg = document.getElementById('segment-stack-svg');
  if (!svg) return;
  const W=300, H=160, padL=68, padB=24, padT=16;
  const years = [
    {label:'FY 2024', retail:380, wholesale:192, corp:154},
    {label:'FY 2025', retail:384, wholesale:192, corp:156},
    {label:'FY 2026', retail:271, wholesale:128, corp:159},
  ];
  const maxVal = 750, barW = 52;
  const gap = (W - padL - 10 - years.length * barW) / (years.length - 1);
  const colors = ['#38d9f5','#ffd166','#b48eff'];
  const labels = ['Retail','Wholesale','Corporate'];
  let html = '';

  // grid
  for (let v=0;v<=750;v+=250){
    const y=H-padB-(v/maxVal)*(H-padB-padT);
    html+=`<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W-6}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`;
    html+=`<text x="${padL-4}" y="${(y+3).toFixed(1)}" text-anchor="end" font-size="8" fill="rgba(138,153,168,0.6)">${v}</text>`;
  }

  years.forEach((yr, i) => {
    const x = padL + i * (barW + gap);
    const segs = [yr.retail, yr.wholesale, yr.corp];
    let yBase = H - padB;
    segs.forEach((v, si) => {
      const bh = (v / maxVal) * (H - padB - padT);
      const yTop = yBase - bh;
      html += `<rect x="${x.toFixed(1)}" y="${yTop.toFixed(1)}" width="${barW}" height="${bh.toFixed(1)}" fill="${colors[si]}" opacity="0.82" style="cursor:crosshair;transition:filter 0.12s" data-yr="${i}" data-seg="${si}"/>`;
      if (bh > 14) {
        html += `<text x="${(x+barW/2).toFixed(1)}" y="${(yTop+bh/2+3).toFixed(1)}" text-anchor="middle" font-size="8" fill="rgba(0,0,0,0.75)" font-weight="700">${v}</text>`;
      }
      yBase = yTop;
    });
    html += `<text x="${(x+barW/2).toFixed(1)}" y="${(H-5).toFixed(1)}" text-anchor="middle" font-size="8" fill="rgba(138,153,168,0.7)">${yr.label}</text>`;
  });

  // legend
  colors.forEach((c,i) => {
    html += `<rect x="${padL + i*70}" y="4" width="8" height="8" fill="${c}"/>`;
    html += `<text x="${padL+i*70+11}" y="11" font-size="7" fill="${c}">${labels[i]}</text>`;
  });

  svg.innerHTML = html;

  svg.querySelectorAll('rect[data-yr]').forEach(r => {
    const yi = +r.getAttribute('data-yr'), si = +r.getAttribute('data-seg');
    const yr = years[yi]; const segs=[yr.retail,yr.wholesale,yr.corp];
    r.addEventListener('mouseenter', e => {
      r.style.filter='brightness(1.35)';
      TT.show(e, `${yr.label} · ${labels[si]}`, `₹${segs[si]} Cr`, ['c-cyan','c-amber','c-purple'][si]);
    });
    r.addEventListener('mousemove', e => TT.move(e));
    r.addEventListener('mouseleave', () => { r.style.filter=''; TT.hide(); });
  });
}

// ── YoY Revenue bar chart ─────────────────────────────────────────────
function renderYoYBar() {
  const svg = document.getElementById('yoy-bar-svg');
  if (!svg) return;
  const W=320, H=160, padL=52, padB=28, padT=14;
  const yrs = [
    {label:'FY 2024', val:726, color:'#38d9f5', cls:'c-cyan', ann:'12 months'},
    {label:'FY 2025', val:732, color:'#ff5277', cls:'c-red',  ann:'+0.8% YoY'},
    {label:'FY 2026', val:558, color:'#ffd166', cls:'c-amber', ann:'9 months only'},
  ];
  const maxVal = 800, barW = 60;
  const gap = (W - padL - 10 - yrs.length * barW) / (yrs.length - 1);
  let html = '';
  for (let v=0;v<=800;v+=200){
    const y=H-padB-(v/maxVal)*(H-padB-padT);
    html+=`<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W-6}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`;
    html+=`<text x="${padL-4}" y="${(y+3).toFixed(1)}" text-anchor="end" font-size="8" fill="rgba(138,153,168,0.6)">${v}</text>`;
  }
  yrs.forEach((yr, i) => {
    const x = padL + i * (barW + gap);
    const bh = (yr.val / maxVal) * (H - padB - padT);
    const yTop = H - padB - bh;
    const gid = `yoy${i}`;
    html += `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${yr.color}" stop-opacity="0.95"/><stop offset="100%" stop-color="${yr.color}" stop-opacity="0.3"/></linearGradient></defs>`;
    html += `<rect x="${x}" y="${yTop.toFixed(1)}" width="${barW}" height="${bh.toFixed(1)}" fill="url(#${gid})" rx="3" style="cursor:crosshair;transition:filter 0.15s" data-idx="${i}"/>`;
    html += `<text x="${(x+barW/2).toFixed(1)}" y="${(yTop-6).toFixed(1)}" text-anchor="middle" font-size="9" fill="${yr.color}" font-weight="700">₹${yr.val}Cr</text>`;
    html += `<text x="${(x+barW/2).toFixed(1)}" y="${(H-12).toFixed(1)}" text-anchor="middle" font-size="8" fill="rgba(138,153,168,0.7)">${yr.label}</text>`;
    html += `<text x="${(x+barW/2).toFixed(1)}" y="${(H-3).toFixed(1)}" text-anchor="middle" font-size="7" fill="${yr.color}" opacity="0.6">${yr.ann}</text>`;
  });
  svg.innerHTML = html;
  svg.querySelectorAll('rect[data-idx]').forEach(r => {
    const i = +r.getAttribute('data-idx'), yr = yrs[i];
    r.addEventListener('mouseenter', e => { r.style.filter='brightness(1.3)'; TT.show(e, yr.label, `₹${yr.val} Cr — ${yr.ann}`, yr.cls); });
    r.addEventListener('mousemove', e => TT.move(e));
    r.addEventListener('mouseleave', () => { r.style.filter=''; TT.hide(); });
  });
}

// ── Quarterly profit margin line chart ───────────────────────────────
function renderMarginLine() {
  const svg = document.getElementById('margin-line-svg');
  if (!svg) return;
  const W=360, H=180, padL=38, padR=20, padT=20, padB=28;
  const qtrs24 = [22.1, 21.3, 22.4, 21.3]; // Q1-Q4 FY2024
  const qtrs25 = [23.0, 22.1, 21.8, 22.2]; // Q1-Q4 FY2025
  const qLabels = ['Q1','Q2','Q3','Q4'];
  const minV = 18, maxV = 26;
  const W2 = W - padL - padR;
  const H2 = H - padT - padB;
  function px(i, arr) { return padL + (i / (arr.length-1)) * W2; }
  function py(v) { return padT + (1 - (v - minV)/(maxV - minV)) * H2; }
  let html = '';
  // Grid
  for (let v=18;v<=26;v+=2){
    const y=py(v);
    html+=`<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W-padR}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`;
    html+=`<text x="${padL-3}" y="${(y+3).toFixed(1)}" text-anchor="end" font-size="8" fill="rgba(138,153,168,0.6)">${v}%</text>`;
  }
  qLabels.forEach((q,i) => {
    const x = px(i, qtrs24);
    html+=`<text x="${x.toFixed(1)}" y="${H-5}" text-anchor="middle" font-size="8" fill="rgba(138,153,168,0.6)">${q}</text>`;
  });
  // Area FY24
  const pts24 = qtrs24.map((v,i)=>[px(i,qtrs24),py(v)]);
  const pts25 = qtrs25.map((v,i)=>[px(i,qtrs25),py(v)]);
  const area24 = `M${pts24[0][0]},${H-padB} `+pts24.map(p=>`L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')+` L${pts24[3][0]},${H-padB} Z`;
  const area25 = `M${pts25[0][0]},${H-padB} `+pts25.map(p=>`L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')+` L${pts25[3][0]},${H-padB} Z`;
  html+=`<defs>
    <linearGradient id="mg24" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(56,217,245,0.18)"/><stop offset="100%" stop-color="rgba(56,217,245,0)"/></linearGradient>
    <linearGradient id="mg25" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(255,82,119,0.14)"/><stop offset="100%" stop-color="rgba(255,82,119,0)"/></linearGradient>
  </defs>`;
  html+=`<path d="${area24}" fill="url(#mg24)"/><path d="${area25}" fill="url(#mg25)"/>`;
  html+=`<polyline points="${pts24.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="#38d9f5" stroke-width="2" stroke-linejoin="round"/>`;
  html+=`<polyline points="${pts25.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="#ff5277" stroke-width="2" stroke-linejoin="round"/>`;
  // Smart label placement: FY2024 always above its dot, FY2025 always below
  for (let i = 0; i < 4; i++) {
    const x = pts24[i][0], y24 = pts24[i][1], y25 = pts25[i][1];
    const lx = Math.max(padL + 16, Math.min(W - padR - 16, x));
    html+=`<circle cx="${x.toFixed(1)}" cy="${y24.toFixed(1)}" r="4" fill="#38d9f5" style="cursor:crosshair" data-y24="${i}"/>`;
    html+=`<text x="${lx.toFixed(1)}" y="${(y24 - 10).toFixed(1)}" text-anchor="middle" font-size="8.5" fill="#38d9f5" font-weight="600">${qtrs24[i]}%</text>`;
    html+=`<circle cx="${x.toFixed(1)}" cy="${y25.toFixed(1)}" r="4" fill="#ff5277" style="cursor:crosshair" data-y25="${i}"/>`;
    html+=`<text x="${lx.toFixed(1)}" y="${(y25 + 18).toFixed(1)}" text-anchor="middle" font-size="8.5" fill="#ff5277" font-weight="600">${qtrs25[i]}%</text>`;
  }
  // Legend
  html+=`<rect x="${W-padR-100}" y="6" width="8" height="2" fill="#38d9f5"/><text x="${W-padR-88}" y="10" font-size="7" fill="#38d9f5">FY 2024</text>`;
  html+=`<rect x="${W-padR-100}" y="16" width="8" height="2" fill="#ff5277"/><text x="${W-padR-88}" y="20" font-size="7" fill="#ff5277">FY 2025</text>`;
  svg.innerHTML = html;
  svg.querySelectorAll('circle[data-y24]').forEach(c => {
    const i=+c.getAttribute('data-y24');
    c.addEventListener('mouseenter', e => TT.show(e, `FY 2024 ${qLabels[i]}`, `${qtrs24[i]}% profit margin`, 'c-cyan'));
    c.addEventListener('mousemove', e => TT.move(e));
    c.addEventListener('mouseleave', () => TT.hide());
  });
  svg.querySelectorAll('circle[data-y25]').forEach(c => {
    const i=+c.getAttribute('data-y25');
    c.addEventListener('mouseenter', e => TT.show(e, `FY 2025 ${qLabels[i]}`, `${qtrs25[i]}% profit margin`, 'c-red'));
    c.addEventListener('mousemove', e => TT.move(e));
    c.addEventListener('mouseleave', () => TT.hide());
  });
}

// ── Monthly Margin % line chart (all 3 years) ─────────────────────────
const marginMonths2024 = [22.3,21.8,22.0,21.5,21.1,21.4,22.6,22.3,22.4,21.2,21.5,21.3];
const marginMonths2025 = [23.2,22.8,23.0,22.4,22.0,22.1,21.9,21.7,21.8,22.1,22.3,22.2];
const marginMonths2026 = [22.8,22.1,22.5,22.0,21.7,21.9,22.4,22.2,22.0];

function renderMonthlyMargin() {
  const svg = document.getElementById('monthly-margin-svg');
  if (!svg) return;
  const W=860, H=200, padL=44, padR=8, padT=18, padB=36;
  const minV=20, maxV=24.5;
  function px(i, n) { return padL + (i / (n-1)) * (W - padL - padR); }
  function py(v) { return padT + (1-(v-minV)/(maxV-minV)) * (H-padT-padB); }

  const colors = {'2024':'#38d9f5','2025':'#ff5277','2026':'#ffd166'};
  const cls2   = {'2024':'c-cyan','2025':'c-red','2026':'c-amber'};

  let html = '';
  // Defs
  ['2024','2025','2026'].forEach(yr => {
    html += `<defs><linearGradient id="mmg${yr}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${colors[yr]}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${colors[yr]}" stop-opacity="0"/>
    </linearGradient></defs>`;
  });

  // Grid
  for (let v=20; v<=24; v++) {
    const y = py(v);
    html += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W-padR}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`;
    html += `<text x="${(padL-4).toFixed(1)}" y="${(y+3).toFixed(1)}" text-anchor="end" font-size="7.5" fill="rgba(138,153,168,0.6)">${v}%</text>`;
  }

  // Year separators
  const sep25x = padL;
  const sep25endx = padL + 11 * (W - padL - padR) / 32;
  const sep26x = padL + 12 * (W - padL - padR) / 32;
  const sep26endx = padL + 23 * (W - padL - padR) / 32;
  const sep27x = padL + 24 * (W - padL - padR) / 32;

  // Draw year-band separator lines
  [12, 24].forEach(n => {
    const x = padL + (n - 0.5) * (W - padL - padR) / 32;
    html += `<line x1="${x.toFixed(1)}" y1="${padT}" x2="${x.toFixed(1)}" y2="${(H-padB).toFixed(1)}" stroke="rgba(255,255,255,0.12)" stroke-width="1" stroke-dasharray="4,3"/>`;
  });

  // Year labels
  const yrLabelX2 = [padL + 5.5*(W-padL-padR)/32, padL + 17.5*(W-padL-padR)/32, padL + 28*(W-padL-padR)/32];
  ['FY 2024','FY 2025','FY 2026'].forEach((lbl,i) => {
    const col = colors[['2024','2025','2026'][i]];
    html += `<text x="${yrLabelX2[i].toFixed(1)}" y="${(padT-4).toFixed(1)}" text-anchor="middle" font-size="9" fill="${col}" font-weight="700" opacity="0.7">${lbl}</text>`;
  });

  // Build all 33 points on a single x-axis
  const allPts = [];
  marginMonths2024.forEach((v,i) => allPts.push({yr:'2024', mo:i, v}));
  marginMonths2025.forEach((v,i) => allPts.push({yr:'2025', mo:i, v}));
  marginMonths2026.forEach((v,i) => allPts.push({yr:'2026', mo:i, v}));

  // Draw per-year connected lines + areas
  ['2024','2025','2026'].forEach(yr => {
    const seg = allPts.filter(d => d.yr === yr);
    const startIdx = allPts.findIndex(d => d.yr === yr);
    const xyPts = seg.map((d, i) => {
      const globalIdx = startIdx + i;
      return [padL + globalIdx * (W-padL-padR)/32, py(d.v)];
    });
    const lastX = xyPts[xyPts.length-1][0];
    const firstX = xyPts[0][0];
    const area = `M${firstX.toFixed(1)},${(H-padB).toFixed(1)} `
      + xyPts.map(p => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
      + ` L${lastX.toFixed(1)},${(H-padB).toFixed(1)} Z`;
    html += `<path d="${area}" fill="url(#mmg${yr})"/>`;
    html += `<polyline points="${xyPts.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="${colors[yr]}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    xyPts.forEach((p,i) => {
      html += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="${colors[yr]}" opacity="0.8"/>`;
    });
  });

  // Month labels (every 3)
  allPts.forEach((d, i) => {
    if (d.mo === 0 || d.mo % 3 === 0) {
      const x = padL + i * (W-padL-padR)/32;
      html += `<text x="${x.toFixed(1)}" y="${(H-padB+11).toFixed(1)}" text-anchor="middle" font-size="6.5" fill="rgba(138,153,168,0.65)">${monthShort[d.mo]}</text>`;
    }
  });

  svg.innerHTML = html;

  // Hover hit circles
  allPts.forEach((d, i) => {
    const x = padL + i * (W-padL-padR)/32;
    const y = py(d.v);
    const hitData = [{x, y, val:`${d.v.toFixed(1)}% margin`, rawVal: d.v, label: monthLabels[d.mo]}];
    attachSVGTooltips(svg, hitData, [monthLabels[d.mo]], cls2[d.yr], `FY ${d.yr}`);
  });
}

// ── Monthly heatmap ───────────────────────────────────────────────────
function renderHeatmap() {
  const container = document.getElementById('month-heatmap');
  if (!container) return;
  const all = [months2024, months2025, months2026.concat(Array(3).fill(null))];
  const yrLabels = ['FY 2024','FY 2025','FY 2026'];
  const allVals = [...months2024, ...months2025, ...months2026];
  const minV = Math.min(...allVals), maxV = Math.max(...allVals);

  function heat(v) {
    if (v === null) return 'rgba(255,255,255,0.04)';
    const t = (v - minV) / (maxV - minV);
    // Cool (bg4) → hot (cyan/amber)
    const r = Math.round(14 + t * (255-14));
    const g = Math.round(23 + t * (160-23));
    const b = Math.round(48 + t * (80-48));
    if (t < 0.4) return `rgb(${r},${g},${b})`;
    if (t < 0.7) return `rgba(56,217,245,${0.25+t*0.5})`;
    return `rgba(255,209,102,${0.3+t*0.55})`;
  }

  let html = `<div class="heatmap-grid">`;
  // Header row
  html += `<div class="heatmap-label"></div>`;
  monthLabels.forEach(m => html += `<div class="heatmap-label" style="justify-content:center;font-size:9px">${m}</div>`);
  // Data rows
  all.forEach((row, ri) => {
    html += `<div class="heatmap-label">${yrLabels[ri]}</div>`;
    row.forEach((v, mi) => {
      const bg = heat(v);
      const textCol = v && (v - minV)/(maxV - minV) > 0.55 ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.7)';
      html += `<div class="heatmap-cell" style="background:${bg};color:${textCol}" data-r="${ri}" data-m="${mi}">${v ? Math.round(v/1000).toFixed(1)+'k' : '—'}</div>`;
    });
  });
  html += `</div>`;
  container.innerHTML = html;

  container.querySelectorAll('.heatmap-cell[data-r]').forEach(cell => {
    const ri=+cell.getAttribute('data-r'), mi=+cell.getAttribute('data-m');
    const v=all[ri][mi];
    if (!v) return;
    cell.addEventListener('mouseenter', e => TT.show(e, `${yrLabels[ri]} · ${monthLabels[mi]}`, `₹${v.toLocaleString('en-IN')} units`, 'c-cyan'));
    cell.addEventListener('mousemove', e => TT.move(e));
    cell.addEventListener('mouseleave', () => TT.hide());
  });
}

// ── Top cities bar chart ──────────────────────────────────────────────
function renderCityBars() {
  const svg = document.getElementById('city-bar-svg');
  if (!svg) return;
  const cities = [
    {name:'Mumbai',    val:382, color:'#38d9f5', cls:'c-cyan'},
    {name:'Delhi',     val:348, color:'#ff5277', cls:'c-red'},
    {name:'Bangalore', val:302, color:'#ffd166', cls:'c-amber'},
    {name:'Chennai',   val:278, color:'#06d6a0', cls:'c-green'},
    {name:'Hyderabad', val:241, color:'#b48eff', cls:'c-purple'},
    {name:'Kolkata',   val:218, color:'#ff9f43', cls:'c-amber'},
    {name:'Pune',      val:194, color:'#38d9f5', cls:'c-cyan'},
    {name:'Ahmedabad', val:175, color:'#ff5277', cls:'c-red'},
  ];
  const W=300, H=200, padL=74, padR=8, padT=10, padB=10;
  const maxVal = 400;
  const rowH = (H - padT - padB) / cities.length;
  let html = '';
  for (let v=0;v<=400;v+=100){
    const x = padL + (v/maxVal)*(W-padL-padR);
    html+=`<line x1="${x.toFixed(1)}" y1="${padT}" x2="${x.toFixed(1)}" y2="${H-padB}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`;
    if(v>0) html+=`<text x="${x.toFixed(1)}" y="${padT-2}" text-anchor="middle" font-size="7" fill="rgba(138,153,168,0.5)">${v}</text>`;
  }
  cities.forEach((c, i) => {
    const y = padT + i * rowH + rowH * 0.15;
    const bh = rowH * 0.7;
    const bw = (c.val / maxVal) * (W - padL - padR);
    const gid = `cg${i}`;
    html+=`<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="${c.color}" stop-opacity="0.9"/><stop offset="100%" stop-color="${c.color}" stop-opacity="0.25"/></linearGradient></defs>`;
    html+=`<rect x="${padL}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="url(#${gid})" rx="2" style="cursor:crosshair;transition:filter 0.12s" data-ci="${i}"/>`;
    html+=`<text x="${(padL-4).toFixed(1)}" y="${(y+bh/2+3).toFixed(1)}" text-anchor="end" font-size="9" fill="var(--fg-mid)">${c.name}</text>`;
    html+=`<text x="${(padL+bw+4).toFixed(1)}" y="${(y+bh/2+3).toFixed(1)}" font-size="8" fill="${c.color}" font-weight="700">${c.val}</text>`;
  });
  svg.innerHTML = html;
  svg.querySelectorAll('rect[data-ci]').forEach(r => {
    const i=+r.getAttribute('data-ci'), c=cities[i];
    r.addEventListener('mouseenter', e => { r.style.filter='brightness(1.35)'; TT.show(e, c.name, `₹${c.val} Cr estimated revenue`, c.cls); });
    r.addEventListener('mousemove', e => TT.move(e));
    r.addEventListener('mouseleave', () => { r.style.filter=''; TT.hide(); });
  });
}

// ── Pipeline funnel chart ─────────────────────────────────────────────
function renderFunnel() {
  const svg = document.getElementById('funnel-svg');
  if (!svg) return;
  const stages = [
    {label:'Raw Dataset', val:8285, color:'#ff5277'},
    {label:'After Step 02', val:8260, color:'#ffd166'},
    {label:'After Step 03', val:8232, color:'#ffd166'},
    {label:'After Step 04', val:8136, color:'#ffd166'},
    {label:'After Step 05', val:8029, color:'#06d6a0'},
    {label:'+ Median Fill', val:8029, color:'#38d9f5'},
    {label:'+ Winsorise', val:8029, color:'#b48eff'},
    {label:'Final Clean', val:8029, color:'#06d6a0'},
  ];
  const W=680, H=140, padL=10, padR=10, padT=8, padB=30;
  const slotW = (W - padL - padR) / stages.length;
  const maxVal = 8400, minH = 12;
  const usableH = H - padT - padB - minH;
  let html = '';
  stages.forEach((s, i) => {
    const barH = minH + (s.val / maxVal) * usableH;
    const x = padL + i * slotW;
    const y = H - padB - barH;
    const gid = `fg${i}`;
    html+=`<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${s.color}" stop-opacity="0.95"/><stop offset="100%" stop-color="${s.color}" stop-opacity="0.35"/></linearGradient></defs>`;
    html+=`<rect x="${(x+3).toFixed(1)}" y="${y.toFixed(1)}" width="${(slotW-6).toFixed(1)}" height="${barH.toFixed(1)}" fill="url(#${gid})" rx="2" style="cursor:crosshair;transition:filter 0.12s" data-fi="${i}"/>`;
    html+=`<text x="${(x+slotW/2).toFixed(1)}" y="${(H-padB+12).toFixed(1)}" text-anchor="middle" font-size="7.5" fill="rgba(138,153,168,0.7)">${s.label.replace(' ','\n')}</text>`;
    html+=`<text x="${(x+slotW/2).toFixed(1)}" y="${(y-4).toFixed(1)}" text-anchor="middle" font-size="8" fill="${s.color}" font-weight="700">${s.val.toLocaleString('en-IN')}</text>`;
    if (i > 0 && stages[i].val < stages[i-1].val) {
      const diff = stages[i-1].val - stages[i].val;
      html+=`<text x="${(x+slotW/2).toFixed(1)}" y="${(y-14).toFixed(1)}" text-anchor="middle" font-size="7" fill="#ff5277">−${diff}</text>`;
    }
  });
  svg.innerHTML = html;
  svg.querySelectorAll('rect[data-fi]').forEach(r => {
    const i=+r.getAttribute('data-fi'), s=stages[i];
    r.addEventListener('mouseenter', e => { r.style.filter='brightness(1.3)'; TT.show(e, s.label, `${s.val.toLocaleString('en-IN')} rows remaining`, s.val===8029?'c-green':'c-amber'); });
    r.addEventListener('mousemove', e => TT.move(e));
    r.addEventListener('mouseleave', () => { r.style.filter=''; TT.hide(); });
  });
}

// ── Modal system ──────────────────────────────────────────────────────
const MODAL_DATA = {
  revenue: {
    title: 'Net Revenue — ₹2,017 Cr',
    sub: 'FY 2024 + FY 2025 + FY 2026 (Jan–Sep)',
    color: 'var(--cyan)',
    body: `
      <div class="modal-stat-grid">
        <div class="modal-stat"><div class="modal-stat-val c-cyan">₹726 Cr</div><div class="modal-stat-lbl">FY 2024</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-red">₹732 Cr</div><div class="modal-stat-lbl">FY 2025</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-amber">₹558 Cr</div><div class="modal-stat-lbl">FY 2026 (9 mo)</div></div>
      </div>
      <div class="modal-divider"></div>
      <div class="modal-row"><span>Online Channel</span><span class="c-cyan">₹1,022 Cr · 50.7%</span></div>
      <div class="modal-row"><span>In-Store Channel</span><span class="c-purple">₹506 Cr · 25.1%</span></div>
      <div class="modal-row"><span>Mobile App</span><span class="c-green">₹489 Cr · 24.2%</span></div>
      <div class="modal-divider"></div>
      <div class="modal-row"><span>Retail Segment</span><span class="c-cyan">₹1,035 Cr · 51.3%</span></div>
      <div class="modal-row"><span>Wholesale Segment</span><span class="c-amber">₹512 Cr · 25.4%</span></div>
      <div class="modal-row"><span>Corporate Segment</span><span class="c-purple">₹470 Cr · 23.3%</span></div>
      <div class="modal-note">Based on 8,029 clean transactions · Electronics leads at 65.8% of revenue</div>`
  },
  profit: {
    title: 'Total Profit — ₹423 Cr',
    sub: 'Net profit across all years and segments',
    color: 'var(--green)',
    body: `
      <div class="modal-stat-grid">
        <div class="modal-stat"><div class="modal-stat-val c-cyan">₹158 Cr</div><div class="modal-stat-lbl">FY 2024 Profit</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-red">₹163 Cr</div><div class="modal-stat-lbl">FY 2025 Profit</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-amber">₹102 Cr</div><div class="modal-stat-lbl">FY 2026 Profit</div></div>
      </div>
      <div class="modal-divider"></div>
      <div class="modal-row"><span>Overall Profit Margin</span><span class="c-green">20.97%</span></div>
      <div class="modal-row"><span>FY 2024 Margin</span><span class="c-cyan">21.76%</span></div>
      <div class="modal-row"><span>FY 2025 Margin</span><span class="c-red">22.26%</span></div>
      <div class="modal-row"><span>FY 2026 Margin</span><span class="c-amber">18.28% (partial year)</span></div>
      <div class="modal-note">Gross profit = Net Sales − Cost of Goods. Electronics drives ~66% of total profit.</div>`
  },
  aov: {
    title: 'Avg. Order Value — ₹25.12 L',
    sub: 'Per-transaction average across all channels',
    color: 'var(--purple)',
    body: `
      <div class="modal-stat-grid">
        <div class="modal-stat"><div class="modal-stat-val c-cyan">₹26.4 L</div><div class="modal-stat-lbl">Electronics AOV</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-red">₹18.2 L</div><div class="modal-stat-lbl">Home & Kitchen AOV</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-amber">₹15.8 L</div><div class="modal-stat-lbl">Sports AOV</div></div>
      </div>
      <div class="modal-divider"></div>
      <div class="modal-row"><span>Online Channel AOV</span><span class="c-cyan">₹25.4 L</span></div>
      <div class="modal-row"><span>In-Store AOV</span><span class="c-purple">₹24.8 L</span></div>
      <div class="modal-row"><span>Mobile App AOV</span><span class="c-green">₹25.1 L</span></div>
      <div class="modal-divider"></div>
      <div class="modal-row"><span>Corporate Segment AOV</span><span class="c-purple">₹31.2 L (highest)</span></div>
      <div class="modal-row"><span>Retail Segment AOV</span><span class="c-cyan">₹24.6 L</span></div>
      <div class="modal-note">AOV = Total Net Sales ÷ 8,029 orders. High-value Electronics skew the average upward.</div>`
  },
  returns: {
    title: 'Return Rate — 6.59%',
    sub: '529 returns out of 8,029 total orders',
    color: 'var(--red)',
    body: `
      <div class="modal-stat-grid">
        <div class="modal-stat"><div class="modal-stat-val c-red">529</div><div class="modal-stat-lbl">Total Returns</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-amber">6.59%</div><div class="modal-stat-lbl">Return Rate</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-cyan">7,500</div><div class="modal-stat-lbl">Fulfilled Orders</div></div>
      </div>
      <div class="modal-divider"></div>
      <div class="modal-row"><span>Electronics Returns</span><span class="c-cyan">~348 orders · 7.1%</span></div>
      <div class="modal-row"><span>Home & Kitchen Returns</span><span class="c-red">~74 orders · 6.8%</span></div>
      <div class="modal-row"><span>Sports Returns</span><span class="c-amber">~47 orders · 5.4%</span></div>
      <div class="modal-row"><span>Fashion Returns</span><span class="c-green">~38 orders · 7.5%</span></div>
      <div class="modal-divider"></div>
      <div class="modal-row"><span>North Region Returns</span><span class="c-cyan">~148 · 26.5%</span></div>
      <div class="modal-row"><span>West Region Returns</span><span class="c-red">~136 · 25.7%</span></div>
      <div class="modal-note">Return flag = 1 in original dataset. Rate flagged as low-risk; industry avg ~8–10%.</div>`
  },
  fy2024: {
    title: 'FY 2024 Breakdown',
    sub: 'April 2023 – March 2024 · 3,204 orders',
    color: 'var(--cyan)',
    body: `
      <div class="modal-stat-grid">
        <div class="modal-stat"><div class="modal-stat-val c-cyan">₹726 Cr</div><div class="modal-stat-lbl">Net Revenue</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-green">₹158 Cr</div><div class="modal-stat-lbl">Profit</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-purple">21.8%</div><div class="modal-stat-lbl">Margin</div></div>
      </div>
      <div class="modal-divider"></div>
      <div class="modal-row"><span>Peak Month</span><span class="c-cyan">Dec — ₹7,034 units</span></div>
      <div class="modal-row"><span>Lowest Month</span><span class="c-red">Jan — ₹5,404 units</span></div>
      <div class="modal-row"><span>Monthly Average</span><span>₹6,152 units</span></div>
      <div class="modal-divider"></div>
      <div class="modal-row"><span>Q1 (Apr–Jun)</span><span class="c-cyan">₹17,838 units</span></div>
      <div class="modal-row"><span>Q2 (Jul–Sep)</span><span class="c-red">₹19,225 units</span></div>
      <div class="modal-row"><span>Q3 (Oct–Dec)</span><span class="c-amber">₹19,280 units</span></div>
      <div class="modal-row"><span>Q4 (Jan–Mar)</span><span class="c-purple">₹16,419 units</span></div>
      <div class="modal-note">FY 2024 was the first full year in dataset. Dec/Nov strong due to festive season demand.</div>`
  },
  fy2025: {
    title: 'FY 2025 Breakdown',
    sub: 'April 2024 – March 2025 · 3,285 orders',
    color: 'var(--red)',
    body: `
      <div class="modal-stat-grid">
        <div class="modal-stat"><div class="modal-stat-val c-red">₹732 Cr</div><div class="modal-stat-lbl">Net Revenue</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-green">₹163 Cr</div><div class="modal-stat-lbl">Profit</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-purple">22.3%</div><div class="modal-stat-lbl">Margin</div></div>
      </div>
      <div class="modal-divider"></div>
      <div class="modal-row"><span>Peak Month</span><span class="c-red">Aug — ₹9,472 units (highest in dataset)</span></div>
      <div class="modal-row"><span>Lowest Month</span><span class="c-amber">Feb — ₹4,563 units</span></div>
      <div class="modal-row"><span>Monthly Average</span><span>₹6,196 units</span></div>
      <div class="modal-divider"></div>
      <div class="modal-row"><span>Q1 (Apr–Jun)</span><span class="c-cyan">₹20,768 units</span></div>
      <div class="modal-row"><span>Q2 (Jul–Sep)</span><span class="c-red">₹17,303 units (Aug spike)</span></div>
      <div class="modal-row"><span>Q3 (Oct–Dec)</span><span class="c-amber">₹17,967 units</span></div>
      <div class="modal-row"><span>Q4 (Jan–Mar)</span><span class="c-purple">₹18,301 units</span></div>
      <div class="modal-note">FY 2025 revenue up 0.8% vs FY 2024. August spike likely tied to back-to-school + sale events.</div>`
  },
  fy2026: {
    title: 'FY 2026 Breakdown',
    sub: 'April 2025 – Dec 2025 · 1,540 orders · Partial year (9 months)',
    color: 'var(--amber)',
    body: `
      <div class="modal-stat-grid">
        <div class="modal-stat"><div class="modal-stat-val c-amber">₹558 Cr</div><div class="modal-stat-lbl">Net Revenue</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-green">₹102 Cr</div><div class="modal-stat-lbl">Profit</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-red">18.3%</div><div class="modal-stat-lbl">Margin</div></div>
      </div>
      <div class="modal-divider"></div>
      <div class="modal-row"><span>Peak Month</span><span class="c-amber">Apr — ₹9,312 units</span></div>
      <div class="modal-row"><span>Lowest Month</span><span class="c-red">Feb — ₹4,422 units</span></div>
      <div class="modal-row"><span>Months Available</span><span>Jan–Sep 2026 (9 of 12)</span></div>
      <div class="modal-divider"></div>
      <div class="modal-row"><span>Q1 (Apr–Jun)</span><span class="c-cyan">₹19,899 units</span></div>
      <div class="modal-row"><span>Q2 (Jul–Sep)</span><span class="c-amber">₹17,636 units</span></div>
      <div class="modal-row"><span>Annualised Estimate</span><span class="c-purple">~₹744 Cr (if pace holds)</span></div>
      <div class="modal-note">Partial year — Q3 & Q4 data not yet available. April 2026 spike may reflect year-start procurement.</div>`
  },
  dataset: {
    title: 'Dataset — 8,029 Rows · 26 Cols',
    sub: 'Raw: 8,285 rows × 29 cols → Cleaned: 8,029 × 26',
    color: 'var(--purple)',
    body: `
      <div class="modal-stat-grid">
        <div class="modal-stat"><div class="modal-stat-val c-purple">8,029</div><div class="modal-stat-lbl">Clean Rows</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-cyan">26</div><div class="modal-stat-lbl">Columns</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-red">256</div><div class="modal-stat-lbl">Rows Removed</div></div>
      </div>
      <div class="modal-divider"></div>
      <div style="font-size:11px;color:var(--fg-mid);font-family:var(--font-body);line-height:1.7">
        <strong style="color:var(--fg);font-size:11.5px">26 Final Columns:</strong><br>
        TransactionID · OrderDate · CustomerID · CustomerName · Age · Gender ·
        City · State · Region · Category · SubCategory · ProductName · UnitPrice ·
        Quantity · Discount · NetSales · GrossProfit · TaxAmount · ShippingCost ·
        PaymentMethod · SalesChannel · CustomerSegment · ReturnFlag · FiscalYear ·
        FiscalQuarter · MonthName
      </div>
      <div class="modal-divider"></div>
      <div class="modal-row"><span>Date Range</span><span class="c-cyan">FY 2024 – FY 2026 (Jan–Sep)</span></div>
      <div class="modal-row"><span>Regions</span><span>North · South · East · West</span></div>
      <div class="modal-row"><span>Categories</span><span>6 (Electronics, Home & Kitchen, Sports, Fashion, Beauty, Books)</span></div>
      <div class="modal-note">All monetary values in INR (₹). Fiscal year: April–March per Indian convention.</div>`
  },
  pipe01: {
    title: 'Step 01 — Drop Junk Columns',
    sub: '29 columns → 26 columns · 3 removed',
    color: 'var(--red)',
    body: `
      <div class="modal-stat-grid">
        <div class="modal-stat"><div class="modal-stat-val c-red">3</div><div class="modal-stat-lbl">Cols Removed</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-cyan">29→26</div><div class="modal-stat-lbl">Column Count</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-green">0</div><div class="modal-stat-lbl">Rows Affected</div></div>
      </div>
      <div class="modal-divider"></div>
      <div class="modal-row"><span class="c-red">Unnamed: 0</span><span>Auto-index from CSV export</span></div>
      <div class="modal-row"><span class="c-red">row_id</span><span>ETL staging ID, redundant</span></div>
      <div class="modal-row"><span class="c-red">_merge</span><span>pandas merge artifact column</span></div>
      <div class="modal-note">These columns carry no analytical signal. Removing them prevents confusion in downstream aggregations.</div>`
  },
  pipe02: {
    title: 'Step 02 — Drop Blank/Footer Rows',
    sub: '8,285 → 8,260 rows · 25 rows removed',
    color: 'var(--amber)',
    body: `
      <div class="modal-stat-grid">
        <div class="modal-stat"><div class="modal-stat-val c-amber">25</div><div class="modal-stat-lbl">Rows Removed</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-cyan">8,285→8,260</div><div class="modal-stat-lbl">Row Count</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-green">0</div><div class="modal-stat-lbl">Cols Affected</div></div>
      </div>
      <div class="modal-divider"></div>
      <div class="modal-row"><span>Root Cause</span><span>Source reporting system inserts summary rows</span></div>
      <div class="modal-row"><span>Pattern</span><span>All fields NULL or labels like "TOTAL", "Grand Total"</span></div>
      <div class="modal-row"><span>Detection</span><span>Rows where TransactionID is NULL and NetSales is NULL</span></div>
      <div class="modal-note">These summary footers are a known artifact of the BI export tool. No business data is lost.</div>`
  },
  pipe03: {
    title: 'Step 03 — Drop Invalid Dates',
    sub: '8,260 → 8,232 rows · 28 rows removed',
    color: 'var(--amber)',
    body: `
      <div class="modal-stat-grid">
        <div class="modal-stat"><div class="modal-stat-val c-amber">28</div><div class="modal-stat-lbl">Rows Removed</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-red">NULL / Bad</div><div class="modal-stat-lbl">Date Format</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-green">26</div><div class="modal-stat-lbl">Cols Unchanged</div></div>
      </div>
      <div class="modal-divider"></div>
      <div class="modal-row"><span>Column Checked</span><span class="c-cyan">OrderDate</span></div>
      <div class="modal-row"><span>Invalid Patterns</span><span>NULL · Non-date strings · Out-of-range values</span></div>
      <div class="modal-row"><span>Why Removed?</span><span>Temporal analysis and FY attribution require a valid date</span></div>
      <div class="modal-note">Records without a parseable OrderDate cannot be attributed to any fiscal year or quarter — unusable for the primary analysis goal.</div>`
  },
  pipe04: {
    title: 'Step 04 — Drop Invalid TransactionIDs',
    sub: '8,232 → 8,136 rows · 96 rows removed',
    color: 'var(--red)',
    body: `
      <div class="modal-stat-grid">
        <div class="modal-stat"><div class="modal-stat-val c-red">96</div><div class="modal-stat-lbl">Rows Removed</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-amber">TXN-XXXXXXXX</div><div class="modal-stat-lbl">Expected Format</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-cyan">8,232→8,136</div><div class="modal-stat-lbl">Row Count</div></div>
      </div>
      <div class="modal-divider"></div>
      <div class="modal-row"><span>NULL IDs</span><span class="c-red">~41 rows</span></div>
      <div class="modal-row"><span>Numeric-only IDs</span><span class="c-red">~27 rows (e.g. "12345")</span></div>
      <div class="modal-row"><span>Malformed strings</span><span class="c-red">~28 rows (e.g. "TX-99", "ERR001")</span></div>
      <div class="modal-note">TransactionID is the primary key. Malformed IDs cannot be traced back to source systems or reconciled with operational records.</div>`
  },
  pipe05: {
    title: 'Step 05 — Remove Duplicate Transactions',
    sub: '8,136 → 8,029 rows · 107 duplicates removed',
    color: 'var(--red)',
    body: `
      <div class="modal-stat-grid">
        <div class="modal-stat"><div class="modal-stat-val c-red">107</div><div class="modal-stat-lbl">Duplicates Removed</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-green">First</div><div class="modal-stat-lbl">Occurrence Kept</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-cyan">8,029</div><div class="modal-stat-lbl">Final Row Count</div></div>
      </div>
      <div class="modal-divider"></div>
      <div class="modal-row"><span>Match Criteria</span><span>Exact same TransactionID + all 25 other fields</span></div>
      <div class="modal-row"><span>Likely Cause</span><span>Double-entry from upstream ETL retry logic</span></div>
      <div class="modal-row"><span>Strategy</span><span>Keep first occurrence, drop all subsequent</span></div>
      <div class="modal-note">Only truly identical rows (all 26 fields matching) were removed. Partial duplicates with different values were retained for manual review.</div>`
  },
  pipe06: {
    title: 'Step 06 — Median Imputation for Nulls',
    sub: '11 numeric columns · ~52 null values filled',
    color: 'var(--cyan)',
    body: `
      <div class="modal-stat-grid">
        <div class="modal-stat"><div class="modal-stat-val c-cyan">11</div><div class="modal-stat-lbl">Cols Imputed</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-green">~52</div><div class="modal-stat-lbl">Nulls Filled</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-purple">Median</div><div class="modal-stat-lbl">Fill Method</div></div>
      </div>
      <div class="modal-divider"></div>
      <div class="modal-row"><span>UnitPrice</span><span class="c-cyan">7 nulls → median ₹24,850</span></div>
      <div class="modal-row"><span>Quantity</span><span class="c-cyan">5 nulls → median 3 units</span></div>
      <div class="modal-row"><span>Discount</span><span class="c-cyan">6 nulls → median 10%</span></div>
      <div class="modal-row"><span>ShippingCost</span><span class="c-cyan">4 nulls → median ₹320</span></div>
      <div class="modal-row"><span>NetSales + 6 others</span><span>~30 nulls → respective column medians</span></div>
      <div class="modal-note">Median chosen over mean to be robust against the outliers treated in Step 07. Column-specific medians preserve distribution shape.</div>`
  },
  pipe07: {
    title: 'Step 07 — Standardise City Names',
    sub: '~320 city entries → clean canonical names',
    color: 'var(--green)',
    body: `
      <div class="modal-stat-grid">
        <div class="modal-stat"><div class="modal-stat-val c-green">~320</div><div class="modal-stat-lbl">Rows Updated</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-cyan">1</div><div class="modal-stat-lbl">Col Cleaned</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-amber">City</div><div class="modal-stat-lbl">Column</div></div>
      </div>
      <div class="modal-divider"></div>
      <div class="modal-row"><span>"mumbai" / "MUMBAI"</span><span class="c-green">→ "Mumbai"</span></div>
      <div class="modal-row"><span>"new delhi" / "New Delhi"</span><span class="c-green">→ "Delhi"</span></div>
      <div class="modal-row"><span>"Bengaluru" / "bangalore"</span><span class="c-green">→ "Bangalore"</span></div>
      <div class="modal-row"><span>"chennai" / "CHENNAI"</span><span class="c-green">→ "Chennai"</span></div>
      <div class="modal-row"><span>15+ other variants</span><span class="c-green">→ canonical title-case</span></div>
      <div class="modal-note">Case-insensitive regex mapping applied. City field is used for region attribution and geographic aggregations.</div>`
  },
  pipe08: {
    title: 'Step 08 — Winsorise Outliers',
    sub: '71 extreme values capped across 11 numeric cols',
    color: 'var(--purple)',
    body: `
      <div class="modal-stat-grid">
        <div class="modal-stat"><div class="modal-stat-val c-purple">71</div><div class="modal-stat-lbl">Values Capped</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-cyan">IQR×1.5</div><div class="modal-stat-lbl">Fence Method</div></div>
        <div class="modal-stat"><div class="modal-stat-val c-green">8,029</div><div class="modal-stat-lbl">Rows Retained</div></div>
      </div>
      <div class="modal-divider"></div>
      <div class="modal-row"><span>Lower Fence</span><span>Q1 − 1.5 × IQR (values below → set to fence)</span></div>
      <div class="modal-row"><span>Upper Fence</span><span>Q3 + 1.5 × IQR (values above → set to fence)</span></div>
      <div class="modal-row"><span>Affected Columns</span><span>UnitPrice · Quantity · Discount · ShippingCost + 7 more</span></div>
      <div class="modal-row"><span>Approach</span><span>Cap extreme values; rows are kept (not dropped)</span></div>
      <div class="modal-note">Winsorisation preserves all 8,029 records while preventing extreme outliers from distorting aggregations and averages.</div>`
  }
};

function openModal(key) {
  const data = MODAL_DATA[key];
  if (!data) return;
  document.getElementById('modal-title').textContent = data.title;
  document.getElementById('modal-sub').textContent = data.sub;
  document.getElementById('modal-body').innerHTML = data.body;
  const box = document.getElementById('modal-box');
  if (box) box.style.borderColor = data.color;
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal(event) {
  if (event && event.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.remove('open');
}

function closeModalDirect() {
  document.getElementById('modal-overlay').classList.remove('open');
}

// ── Font Size Control ────────────────────────────────────────────────
let currentFontSize = (() => { try { return parseInt(localStorage.getItem('byteme-fontsize')||'14'); } catch(e){ return 14; } })();
function applyFontSize(size) {
  currentFontSize = Math.min(20, Math.max(11, size));
  document.body.style.fontSize = currentFontSize + 'px';
  const lbl = document.getElementById('font-size-lbl');
  if (lbl) lbl.textContent = 'FONT ' + currentFontSize + 'px';
  try { localStorage.setItem('byteme-fontsize', currentFontSize); } catch(e){}
}
function adjustFontSize(delta) { applyFontSize(currentFontSize + delta); }

// ── Chart Expand Modal ───────────────────────────────────────────────
// Map chart IDs → friendly title + tag
const CHART_META = {
  'trend-chart':      { title: 'Monthly Revenue — FY 2024 vs FY 2025', tag: '₹ Cr · MONTHLY', vb: '0 0 700 220', big: true },
  'trend-2026':       { title: 'FY 2026 — Partial (Jan–Sep)', tag: '9 MONTHS · AMBER', vb: '0 0 320 140', big: false },
  'yoy-bar-svg':      { title: 'Year-on-Year Revenue — All 3 FYs', tag: '₹ Cr · BAR COMPARISON', vb: '0 0 320 160', big: false },
  'margin-line-svg':  { title: 'Quarterly Profit Margins — FY 2024–2025', tag: '% MARGIN · LINE', vb: '0 0 360 180', big: true },
  'month-heatmap':    { title: 'Monthly Revenue Heatmap — All FYs', tag: 'HEAT · Jan–Dec', heatmap: true },
  'donut-svg':        { title: 'Category Share — Donut', tag: 'SHARE %', vb: '0 0 120 120', big: false, pie: true },
  'pie-svg':          { title: 'Category Revenue — Pie Chart', tag: 'HOVER FOR VALUES', vb: '0 0 360 360', big: true, pie: true },
  'pay-pie-svg':      { title: 'Payment Method Distribution', tag: '5 METHODS', vb: '0 0 200 200', big: false, pie: true },
  'segment-stack-svg':{ title: 'Segment Stacked Bars — FY 2024–2026', tag: 'RETAIL · WHOLESALE · CORP', vb: '0 0 300 160', big: false },
  'region-chart':     { title: 'Revenue by Region', tag: '₹ Cr · 4 ZONES', vb: '0 0 340 120', big: false },
  'region-pie-svg':   { title: 'Regional Share — Pie', tag: '4 ZONES', vb: '0 0 200 200', big: false, pie: true },
  'city-bar-svg':     { title: 'Top Cities by Estimated Revenue', tag: '₹ Cr · RANKED', vb: '0 0 300 200', big: false },
  'funnel-svg':       { title: 'Data Pipeline Funnel — Row Reduction', tag: '8,285 → 8,029', vb: '0 0 680 140', big: true },
  'monthly-sales-bar-svg': { title: 'Net Sales by Month — Jan 2024 to Sep 2026', tag: '33 MONTHS · BAR', vb: '0 0 860 200', big: true },
  'monthly-margin-svg':    { title: 'Profit Margin % by Month — Jan 2024 to Sep 2026', tag: '% MARGIN · 33 MONTHS', vb: '0 0 860 200', big: true },
};

// Build a rich legend for expand view
function buildExpandLegend(dataArr) {
  const div = document.createElement('div');
  div.className = 'ce-legend';
  dataArr.forEach(d => {
    const item = document.createElement('div');
    item.className = 'ce-legend-item';
    item.innerHTML = `
      <div class="ce-legend-dot" style="background:${d.color};color:${d.color}"></div>
      <span>${d.name}</span>
      <span class="ce-legend-pct" style="color:${d.color}">${d.pct}%</span>
      <span class="ce-legend-val">₹${d.val.toFixed(1)} Cr</span>
    `;
    div.appendChild(item);
  });
  return div;
}

function openChartExpand(chartId) {
  const overlay = document.getElementById('chart-expand-overlay');
  const body = document.getElementById('ce-body');
  const titleEl = document.getElementById('ce-title');
  const tagEl = document.getElementById('ce-tag');
  if (!overlay || !body) return;

  const meta = CHART_META[chartId];
  if (!meta) return;

  titleEl.textContent = meta.title;
  tagEl.textContent = meta.tag;
  body.innerHTML = '';
  body.style.cssText = '';

  if (meta.heatmap) {
    const src = document.getElementById('month-heatmap');
    if (src) {
      const clone = src.cloneNode(true);
      clone.style.cssText = 'width:100%;';
      clone.querySelectorAll('.heatmap-cell').forEach(c => { c.style.height='46px'; c.style.fontSize='12px'; });
      clone.querySelectorAll('.heatmap-label').forEach(c => { c.style.fontSize='13px'; c.style.paddingRight='12px'; });
      body.style.display = 'block'; body.style.padding = '28px 32px';
      body.appendChild(clone);
      clone.querySelectorAll('.heatmap-cell[data-r]').forEach(cell => {
        const ri=+cell.getAttribute('data-r'), mi=+cell.getAttribute('data-m');
        const all=[months2024,months2025,months2026.concat(Array(3).fill(null))];
        const yrL=['FY 2024','FY 2025','FY 2026'];
        const v=all[ri][mi];
        if(!v) return;
        cell.addEventListener('mouseenter', e => TT.show(e, `${yrL[ri]} · ${monthLabels[mi]}`, `₹${v.toLocaleString('en-IN')} units`, 'c-cyan'));
        cell.addEventListener('mousemove', e => TT.move(e));
        cell.addEventListener('mouseleave', () => TT.hide());
      });
    }
  } else {
    const src = document.getElementById(chartId);
    if (!src) return;
    const clone = src.cloneNode(true);
    clone.id = chartId + '-expanded';
    clone.removeAttribute('style');
    if (meta.vb) clone.setAttribute('viewBox', meta.vb);
    clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // Pie/donut: bigger SVG + rich legend side by side
    const pieLegendData = {
      'pie-svg': catData,
      'pay-pie-svg': payData,
      'region-pie-svg': regionPieData,
    }[chartId];

    if (pieLegendData) {
      clone.style.cssText = 'width:min(480px,55vw);height:auto;flex-shrink:0;';
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;align-items:center;gap:48px;width:100%;justify-content:center;flex-wrap:wrap;padding:4px 0;';
      wrap.appendChild(clone);
      wrap.appendChild(buildExpandLegend(pieLegendData));
      body.style.display = 'flex'; body.style.alignItems = 'center'; body.style.justifyContent = 'center';
      body.appendChild(wrap);
    } else if (chartId === 'donut-svg') {
      clone.style.cssText = 'width:min(380px,50vw);height:auto;flex-shrink:0;';
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;align-items:center;gap:48px;width:100%;justify-content:center;flex-wrap:wrap;';
      wrap.appendChild(clone);
      wrap.appendChild(buildExpandLegend(catData));
      body.style.display = 'flex'; body.style.alignItems = 'center'; body.style.justifyContent = 'center';
      body.appendChild(wrap);
    } else {
      clone.style.cssText = 'width:100%;height:auto;max-height:64vh;';
      body.style.display = 'flex'; body.style.alignItems = 'center'; body.style.justifyContent = 'center';
      body.appendChild(clone);
    }

    // Scale up SVG text nodes for readability
    clone.querySelectorAll('text').forEach(t => {
      const fs = parseFloat(t.getAttribute('font-size') || '9');
      t.setAttribute('font-size', Math.round(fs * 1.55));
    });

    setTimeout(() => reattachExpandedTooltips(clone, chartId), 40);
  }

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function reattachExpandedTooltips(svgEl, chartId) {
  // data-idx elements (pie slices, bar rects)
  const idxFn = {
    'pie-svg':       (i) => { const d=catData[i]; return {title:d.name, val:`₹${d.val.toFixed(2)} Cr · ${d.pct}%`, cls:d.cls}; },
    'donut-svg':     (i) => { const d=catData[i]; return {title:d.name, val:`₹${d.val.toFixed(2)} Cr · ${d.pct}%`, cls:d.cls}; },
    'pay-pie-svg':   (i) => { const d=payData[i]; return {title:d.name, val:`₹${d.val.toFixed(2)} Cr · ${d.pct}%`, cls:d.cls}; },
    'region-pie-svg':(i) => { const d=regionPieData[i]; return {title:d.name, val:`₹${d.val.toFixed(2)} Cr · ${d.pct}%`, cls:d.cls}; },
    'yoy-bar-svg':   (i) => { const yrs=[{label:'FY 2024',val:726,ann:'12 months'},{label:'FY 2025',val:732,ann:'+0.8% YoY'},{label:'FY 2026',val:558,ann:'9 months only'}]; const y=yrs[i]; return {title:y.label, val:`₹${y.val} Cr — ${y.ann}`, cls:'c-amber'}; },
  }[chartId];

  svgEl.querySelectorAll('[data-idx]').forEach(p => {
    if (!idxFn) return;
    const info = idxFn(+p.getAttribute('data-idx'));
    p.style.cursor = 'crosshair';
    p.addEventListener('mouseenter', e => { p.style.filter='brightness(1.35) drop-shadow(0 0 10px '+info.cls.replace('c-','')+'88)'; TT.show(e, info.title, info.val, info.cls); });
    p.addEventListener('mousemove', e => TT.move(e));
    p.addEventListener('mouseleave', () => { p.style.filter=''; TT.hide(); });
  });

  // Segment stack data-yr/data-seg
  if (chartId === 'segment-stack-svg') {
    const years=[{label:'FY 2024',retail:380,wholesale:192,corp:154},{label:'FY 2025',retail:384,wholesale:192,corp:156},{label:'FY 2026',retail:271,wholesale:128,corp:159}];
    const labels=['Retail','Wholesale','Corporate'];
    svgEl.querySelectorAll('rect[data-yr]').forEach(r => {
      const yi=+r.getAttribute('data-yr'), si=+r.getAttribute('data-seg');
      const yr=years[yi]; const segs=[yr.retail,yr.wholesale,yr.corp];
      r.style.cursor='crosshair';
      r.addEventListener('mouseenter', e => { r.style.filter='brightness(1.35)'; TT.show(e, `${yr.label} · ${labels[si]}`, `₹${segs[si]} Cr`, ['c-cyan','c-amber','c-purple'][si]); });
      r.addEventListener('mousemove', e => TT.move(e));
      r.addEventListener('mouseleave', () => { r.style.filter=''; TT.hide(); });
    });
  }

  // data-ci city bars
  if (chartId === 'city-bar-svg') {
    const cities=[{name:'Mumbai',val:382},{name:'Delhi',val:348},{name:'Bangalore',val:302},{name:'Chennai',val:278},{name:'Hyderabad',val:241},{name:'Kolkata',val:218},{name:'Pune',val:194},{name:'Ahmedabad',val:175}];
    svgEl.querySelectorAll('rect[data-ci]').forEach(r => {
      const i=+r.getAttribute('data-ci'), c=cities[i];
      r.style.cursor='crosshair';
      r.addEventListener('mouseenter', e => { r.style.filter='brightness(1.35)'; TT.show(e, c.name, `₹${c.val} Cr estimated revenue`, 'c-cyan'); });
      r.addEventListener('mousemove', e => TT.move(e));
      r.addEventListener('mouseleave', () => { r.style.filter=''; TT.hide(); });
    });
  }

  // data-fi funnel bars
  if (chartId === 'funnel-svg') {
    const stages=['Raw Dataset','After Step 02','After Step 03','After Step 04','After Step 05','+ Median Fill','+ Winsorise','Final Clean'];
    const vals=[8285,8260,8232,8136,8029,8029,8029,8029];
    svgEl.querySelectorAll('rect[data-fi]').forEach(r => {
      const i=+r.getAttribute('data-fi');
      r.style.cursor='crosshair';
      r.addEventListener('mouseenter', e => { r.style.filter='brightness(1.3)'; TT.show(e, stages[i], `${vals[i].toLocaleString('en-IN')} rows`, vals[i]===8029?'c-green':'c-amber'); });
      r.addEventListener('mousemove', e => TT.move(e));
      r.addEventListener('mouseleave', () => { r.style.filter=''; TT.hide(); });
    });
  }

  // hit-dot on trend lines (transparent hover circles with data-mo/yr/v/cls/display)
  svgEl.querySelectorAll('.hit-dot').forEach(dot => {
    dot.style.cursor = 'crosshair';
    const mo  = dot.getAttribute('data-mo');
    const yr  = dot.getAttribute('data-yr');
    const cls = dot.getAttribute('data-cls') || (yr && yr.includes('2026') ? 'c-amber' : yr && yr.includes('2024') ? 'c-cyan' : 'c-red');
    const disp= dot.getAttribute('data-display') || dot.getAttribute('data-v');
    if (mo && yr && disp) {
      dot.addEventListener('mouseenter', e => TT.show(e, `${yr} · ${mo}`, disp, cls));
      dot.addEventListener('mousemove', e => TT.move(e));
      dot.addEventListener('mouseleave', () => TT.hide());
    }
  });

  // margin line circles
  svgEl.querySelectorAll('circle[data-y24]').forEach(c => {
    const i=+c.getAttribute('data-y24');
    const qls=['Q1','Q2','Q3','Q4'], qtrs24=[22.1,21.3,22.4,21.3];
    c.style.cursor='crosshair';
    c.addEventListener('mouseenter', e => TT.show(e, `FY 2024 ${qls[i]}`, `${qtrs24[i]}% profit margin`, 'c-cyan'));
    c.addEventListener('mousemove', e => TT.move(e));
    c.addEventListener('mouseleave', () => TT.hide());
  });
  svgEl.querySelectorAll('circle[data-y25]').forEach(c => {
    const i=+c.getAttribute('data-y25');
    const qls=['Q1','Q2','Q3','Q4'], qtrs25=[23.0,22.1,21.8,22.2];
    c.style.cursor='crosshair';
    c.addEventListener('mouseenter', e => TT.show(e, `FY 2025 ${qls[i]}`, `${qtrs25[i]}% profit margin`, 'c-red'));
    c.addEventListener('mousemove', e => TT.move(e));
    c.addEventListener('mouseleave', () => TT.hide());
  });

  // monthly-sales-bar-svg bars
  if (chartId === 'monthly-sales-bar-svg') {
    const allMonths2 = [];
    months2024.forEach((v,i) => allMonths2.push({yr:'2024', mo:i, v}));
    months2025.forEach((v,i) => allMonths2.push({yr:'2025', mo:i, v}));
    months2026.forEach((v,i) => allMonths2.push({yr:'2026', mo:i, v}));
    const cls2 = {'2024':'c-cyan','2025':'c-red','2026':'c-amber'};
    svgEl.querySelectorAll('rect[data-mbi]').forEach(r => {
      const i = +r.getAttribute('data-mbi');
      const d = allMonths2[i];
      r.style.cursor = 'crosshair';
      r.addEventListener('mouseenter', e => { r.style.filter='brightness(1.4)'; TT.show(e, `${monthLabels[d.mo]} ${d.yr}`, `₹${d.v.toLocaleString('en-IN')} Net Sales`, cls2[d.yr]); });
      r.addEventListener('mousemove', e => TT.move(e));
      r.addEventListener('mouseleave', () => { r.style.filter=''; TT.hide(); });
    });
  }
}

function closeChartExpand(e) {
  if (e && e.target !== document.getElementById('chart-expand-overlay')) return;
  closeChartExpandDirect();
}
function closeChartExpandDirect() {
  const overlay = document.getElementById('chart-expand-overlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
  TT.hide();
}

// Wire up all chart panels to be expandable
function attachChartExpand() {
  // For each chart ID, find its parent panel and add click handler + zoom cursor
  Object.keys(CHART_META).forEach(id => {
    const meta = CHART_META[id];
    const el = document.getElementById(id);
    if (!el) return;
    // Walk up to find the .panel
    let panel = el.closest ? el.closest('.panel') : null;
    if (!panel) {
      // For heatmap div, el IS the div
      panel = el.parentElement ? el.parentElement.closest('.panel') : null;
    }
    if (!panel) return;
    panel.classList.add('chart-expandable');
    panel.addEventListener('click', (e) => {
      // Don't interfere with tooltips or buttons
      if (e.target.closest('button')) return;
      openChartExpand(id);
    });
  });
}

// ── Net Sales by Month bar chart (Jan 2024 – Sep 2026) ───────────────
function renderMonthlySalesBar() {
  const svg = document.getElementById('monthly-sales-bar-svg');
  if (!svg) return;

  // Build flat array: Jan2024…Dec2024, Jan2025…Dec2025, Jan2026…Sep2026
  const allMonths = [];
  months2024.forEach((v,i) => allMonths.push({yr:'2024', mo:i, v}));
  months2025.forEach((v,i) => allMonths.push({yr:'2025', mo:i, v}));
  months2026.forEach((v,i) => allMonths.push({yr:'2026', mo:i, v}));

  const W=860, H=200, padL=44, padR=8, padT=18, padB=36;
  const n = allMonths.length; // 33
  const maxVal = Math.max(...allMonths.map(d=>d.v)) * 1.08;
  const slotW = (W - padL - padR) / n;
  const barW  = Math.max(slotW * 0.72, 3);

  const colors = {'2024':'#38d9f5','2025':'#ff5277','2026':'#ffd166'};
  const cls    = {'2024':'c-cyan','2025':'c-red','2026':'c-amber'};

  let html = '';
  // Defs: gradients per year
  ['2024','2025','2026'].forEach(yr => {
    html += `<defs><linearGradient id="mbg${yr}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${colors[yr]}" stop-opacity="0.92"/>
      <stop offset="100%" stop-color="${colors[yr]}" stop-opacity="0.28"/>
    </linearGradient></defs>`;
  });

  // Grid lines
  for (let v = 2000; v <= 10000; v += 2000) {
    const y = H - padB - (v / maxVal) * (H - padT - padB);
    html += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W-padR}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`;
    html += `<text x="${(padL-4).toFixed(1)}" y="${(y+3).toFixed(1)}" text-anchor="end" font-size="7.5" fill="rgba(138,153,168,0.6)">${(v/1000).toFixed(0)}k</text>`;
  }

  // Year separators + labels
  const sep2025x = padL + 12 * slotW;
  const sep2026x = padL + 24 * slotW;
  html += `<line x1="${sep2025x.toFixed(1)}" y1="${padT}" x2="${sep2025x.toFixed(1)}" y2="${(H-padB).toFixed(1)}" stroke="rgba(255,255,255,0.12)" stroke-width="1" stroke-dasharray="4,3"/>`;
  html += `<line x1="${sep2026x.toFixed(1)}" y1="${padT}" x2="${sep2026x.toFixed(1)}" y2="${(H-padB).toFixed(1)}" stroke="rgba(255,255,255,0.12)" stroke-width="1" stroke-dasharray="4,3"/>`;
  const yrLabelX = [padL + 6*slotW, padL + 18*slotW, padL + 28.5*slotW];
  ['FY 2024','FY 2025','FY 2026'].forEach((lbl, i) => {
    const col = colors[['2024','2025','2026'][i]];
    html += `<text x="${yrLabelX[i].toFixed(1)}" y="${(padT-4).toFixed(1)}" text-anchor="middle" font-size="9" fill="${col}" font-weight="700" opacity="0.7">${lbl}</text>`;
  });

  // Bars + month labels
  allMonths.forEach((d, i) => {
    const x = padL + i * slotW + (slotW - barW) / 2;
    const barH = (d.v / maxVal) * (H - padT - padB);
    const y = H - padB - barH;
    html += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="url(#mbg${d.yr})" rx="2" style="cursor:crosshair;transition:filter 0.12s" data-mbi="${i}"/>`;
    // Month label every 3rd bar to avoid clutter, and always Jan
    if (d.mo === 0 || d.mo % 3 === 0) {
      html += `<text x="${(x + barW/2).toFixed(1)}" y="${(H-padB+11).toFixed(1)}" text-anchor="middle" font-size="6.5" fill="rgba(138,153,168,0.65)">${monthShort[d.mo]}</text>`;
    }
  });

  svg.innerHTML = html;

  // Tooltips
  svg.querySelectorAll('rect[data-mbi]').forEach(r => {
    const i = +r.getAttribute('data-mbi');
    const d = allMonths[i];
    const col = cls[d.yr];
    r.addEventListener('mouseenter', e => {
      r.style.filter = 'brightness(1.4)';
      TT.show(e, `${monthLabels[d.mo]} ${d.yr}`, `₹${d.v.toLocaleString('en-IN')} Net Sales`, col);
    });
    r.addEventListener('mousemove', e => TT.move(e));
    r.addEventListener('mouseleave', () => { r.style.filter=''; TT.hide(); });
  });
}

// Close on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (document.getElementById('chart-expand-overlay').classList.contains('open')) {
      closeChartExpandDirect();
    } else {
      closeModalDirect();
    }
  }
});

// Init
window.addEventListener('load', () => {
  applyFontSize(currentFontSize);
  setTimeout(() => {
    renderTrends(); renderYoYBar(); renderMarginLine(); renderHeatmap(); renderMonthlySalesBar(); renderMonthlyMargin();
    renderCategories(); renderPieChart(); renderPayPie(); renderSegmentStack();
    renderRegions(); renderRegionPie(); renderCityBars();
    renderFunnel();
    attachChannelTooltips();
    attachSegmentTooltips();
    attachPayTooltips();
    attachKPITooltips();
    attachYearTooltips();
    attachBarRowTooltips();
    attachChartExpand();
  }, 300);
});

// ── Per-category monthly revenue data (₹ Lakhs) ─────────────────
const CAT_DATA = {
  "Beauty":         { "2024":[237,144,356,192,238,219,271,117,187,297,208,278], "2025":[250,155,187,165,307,189,210,243,192,288,151,138], "2026":[143,190,194,186,318,132,258,219,145] },
  "Books":          { "2024":[147,123,152,167,94,127,81,125,149,80,154,149],   "2025":[149,104,216,128,236,94,98,126,118,104,107,151],   "2026":[134,78,230,163,234,139,151,162,151] },
  "Electronics":    { "2024":[3506,3526,4318,3629,3406,4731,4776,4378,3987,4381,3973,4830], "2025":[3503,2951,4199,3442,6424,2957,4274,3542,4608,3870,2855,4747], "2026":[6160,2953,4097,3775,3937,2908,4753,3948,3199] },
  "Fashion":        { "2024":[391,250,347,214,371,361,329,305,195,293,413,416], "2025":[262,209,242,212,430,300,322,267,260,344,281,461],   "2026":[779,116,366,210,271,330,360,377,333] },
  "Home & Kitchen": { "2024":[550,902,1098,940,1187,936,1005,481,851,726,686,602], "2025":[664,543,562,867,1381,1076,622,1285,882,894,1110,1739], "2026":[1559,520,831,544,635,768,1059,472,691] },
  "Sports":         { "2024":[572,596,623,333,940,427,726,424,807,585,449,759], "2025":[409,601,352,715,694,712,276,711,458,603,526,598],   "2026":[538,567,446,505,410,439,319,505,535] }
};
const CAT_META_EXT = {
  "Electronics":    { color:'#38d9f5', revPct:65.7, margin:16.1 },
  "Home & Kitchen": { color:'#a78bfa', revPct:14.2, margin:26.7 },
  "Sports":         { color:'#ffd166', revPct:9.0,  margin:31.1 },
  "Fashion":        { color:'#ff9f43', revPct:5.3,  margin:29.2 },
  "Beauty":         { color:'#ff5277', revPct:3.5,  margin:41.5 },
  "Books":          { color:'#06d6a0', revPct:2.3,  margin:34.9 }
};
const CAT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

let _catChartsRendered = false;

function renderCategoryCharts() {
  if (_catChartsRendered) return;
  _catChartsRendered = true;

  const tabsEl = document.getElementById('cat-filter-tabs');
  const gridEl = document.getElementById('cat-chart-grid');
  if (!tabsEl || !gridEl) return;

  const cats = Object.keys(CAT_META_EXT);

  // Build tabs
  tabsEl.innerHTML = '<button class="cat-filter-tab active" data-cat="all">All</button>' +
    cats.map(c => `<button class="cat-filter-tab" data-cat="${c}" style="--tc:${CAT_META_EXT[c].color}">${c}</button>`).join('');

  // Build cards
  gridEl.innerHTML = cats.map(cat => {
    const m = CAT_META_EXT[cat];
    const sid = 'ccs-' + cat.replace(/[^a-z0-9]/gi,'');
    return `<div class="cat-chart-card" data-cat="${cat}">
      <div class="cat-chart-card-head">
        <span class="cat-chart-card-name" style="color:${m.color}">${cat}</span>
        <div class="cat-chart-card-badges">
          <span class="cat-badge">${m.revPct}% rev</span>
          <span class="cat-badge"><span class="green">${m.margin}% margin</span></span>
        </div>
      </div>
      <svg id="${sid}" class="cat-chart-svg" viewBox="0 0 380 130"></svg>
    </div>`;
  }).join('');

  // Render each SVG
  cats.forEach(cat => {
    const sid = 'ccs-' + cat.replace(/[^a-z0-9]/gi,'');
    const svg = document.getElementById(sid);
    if (!svg) return;
    const d24 = CAT_DATA[cat]['2024'];
    const d25 = CAT_DATA[cat]['2025'];
    const d26 = CAT_DATA[cat]['2026'];
    const W=380, H=130, pL=38, pR=12, pT=14, pB=22;
    const cW=W-pL-pR, cH=H-pT-pB;

    // Combine all for scale
    const allV = [...d24, ...d25, ...d26];
    const minV = Math.min(...allV)*0.9, maxV = Math.max(...allV)*1.07;
    const px = (i,total) => pL + (i/(total-1))*cW;
    const py = v => pT + (1-(v-minV)/(maxV-minV))*cH;

    let h = '<defs>';
    [[d24,'#38d9f5',0],[d25,'#ff5277',1],[d26,'#ffd166',2]].forEach(([_,c,i]) => {
      h += `<linearGradient id="cg${i}${sid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${c}" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="${c}" stop-opacity="0"/>
      </linearGradient>`;
    });
    h += '</defs>';

    // Grid lines (y-axis)
    const range = maxV - minV;
    const step = range > 5000 ? 2000 : range > 2000 ? 1000 : range > 500 ? 200 : range > 100 ? 50 : 20;
    for (let v = Math.ceil(minV/step)*step; v <= maxV; v += step) {
      const y = py(v);
      h += `<line x1="${pL}" y1="${y.toFixed(1)}" x2="${W-pR}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>`;
      const lbl = v >= 1000 ? (v/1000).toFixed(1)+'K' : v;
      h += `<text x="${pL-4}" y="${(y+3).toFixed(1)}" text-anchor="end" font-size="7.5" fill="rgba(138,153,168,0.45)" font-family="JetBrains Mono,monospace">${lbl}</text>`;
    }
    // X labels (every 2 months)
    CAT_MONTHS.forEach((m,i) => {
      if (i % 2 === 0) {
        const x = px(i, 12);
        h += `<text x="${x.toFixed(1)}" y="${H-5}" text-anchor="middle" font-size="7.5" fill="rgba(138,153,168,0.45)" font-family="JetBrains Mono,monospace">${m}</text>`;
      }
    });

    const baseY = H - pB;

    [[d24,'#38d9f5',0,false],[d25,'#ff5277',1,false],[d26,'#ffd166',2,true]].forEach(([data,color,di,dashed]) => {
      const total = 12;
      const pts = data.map((v,i) => [px(i,total), py(v)]);
      // Area fill — close path at base
      const area = `M${pts[0][0].toFixed(1)},${baseY} ` +
        pts.map(p=>`L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') +
        ` L${pts[pts.length-1][0].toFixed(1)},${baseY} Z`;
      h += `<path d="${area}" fill="url(#cg${di}${sid})"/>`;
      // Line
      const lpts = pts.map(p=>`${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
      h += `<polyline points="${lpts}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"${dashed?' stroke-dasharray="4,3"':''}/>`;
      // Dots
      pts.forEach(p => {
        h += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2" fill="${color}" opacity="0.75"/>`;
      });
    });

    svg.innerHTML = h;
  });

  // Tab filtering
  tabsEl.addEventListener('click', e => {
    const btn = e.target.closest('.cat-filter-tab');
    if (!btn) return;
    const cat = btn.dataset.cat;
    tabsEl.querySelectorAll('.cat-filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    gridEl.querySelectorAll('.cat-chart-card').forEach(card => {
      card.classList.toggle('hidden', cat !== 'all' && card.dataset.cat !== cat);
    });
  });
}

// ── Profit Margin % by Category — horizontal bar + dot chart ────
let _catMarginRendered = false;
function renderCatMarginChart() {
  if (_catMarginRendered) return;
  _catMarginRendered = true;

  const svg = document.getElementById('cat-margin-svg');
  if (!svg) return;

  // Category margin data (annual %)
  const cats = [
    { name:'Beauty',         margin:41.5, rev:3.5,  color:'#ff5277' },
    { name:'Books',          margin:34.9, rev:2.3,  color:'#06d6a0' },
    { name:'Sports',         margin:31.1, rev:9.0,  color:'#ffd166' },
    { name:'Fashion',        margin:29.2, rev:5.3,  color:'#ff9f43' },
    { name:'Home & Kitchen', margin:26.7, rev:14.2, color:'#a78bfa' },
    { name:'Electronics',    margin:16.1, rev:65.7, color:'#38d9f5' }
  ];
  // Overall average
  const overallMargin = 21.2;

  const W=700, H=260;
  const pL=130, pR=40, pT=20, pB=30;
  const rowH = (H - pT - pB) / cats.length;
  const chartW = W - pL - pR;
  const maxM = 50; // scale to 50%

  let h = '<defs>';
  cats.forEach((c,i) => {
    h += `<linearGradient id="mg${i}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${c.color}" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="${c.color}" stop-opacity="0.25"/>
    </linearGradient>`;
  });
  h += '</defs>';

  // X axis grid lines & labels
  [0,10,20,30,40,50].forEach(v => {
    const x = pL + (v/maxM)*chartW;
    h += `<line x1="${x}" y1="${pT}" x2="${x}" y2="${H-pB}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`;
    h += `<text x="${x}" y="${H-pB+14}" text-anchor="middle" font-size="9" fill="rgba(138,153,168,0.5)" font-family="JetBrains Mono,monospace">${v}%</text>`;
  });

  // Overall average reference line
  const avgX = pL + (overallMargin/maxM)*chartW;
  h += `<line x1="${avgX}" y1="${pT}" x2="${avgX}" y2="${H-pB}" stroke="rgba(255,255,255,0.22)" stroke-width="1" stroke-dasharray="4,3"/>`;
  h += `<text x="${avgX+4}" y="${pT+10}" font-size="8.5" fill="rgba(255,255,255,0.45)" font-family="JetBrains Mono,monospace">Overall avg ${overallMargin}%</text>`;

  // Rows
  cats.forEach((c,i) => {
    const y = pT + i*rowH;
    const cy = y + rowH/2;
    const barH = rowH * 0.45;
    const barW = (c.margin/maxM)*chartW;

    // Category name
    h += `<text x="${pL-10}" y="${cy+4}" text-anchor="end" font-size="11" font-weight="600" fill="${c.color}" font-family="Open Sans,sans-serif">${c.name}</text>`;

    // Rev share badge
    h += `<text x="${pL-10}" y="${cy+16}" text-anchor="end" font-size="8.5" fill="rgba(138,153,168,0.5)" font-family="JetBrains Mono,monospace">${c.rev}% rev share</text>`;

    // Bar track (background)
    h += `<rect x="${pL}" y="${cy - barH/2}" width="${chartW}" height="${barH}" rx="3" fill="rgba(255,255,255,0.04)"/>`;

    // Bar fill
    h += `<rect x="${pL}" y="${cy - barH/2}" width="${barW}" height="${barH}" rx="3" fill="url(#mg${i})"/>`;

    // Value label
    h += `<text x="${pL + barW + 7}" y="${cy+4}" font-size="12" font-weight="700" fill="${c.color}" font-family="JetBrains Mono,monospace">${c.margin}%</text>`;

    // Dot marker at bar end
    h += `<circle cx="${pL + barW}" cy="${cy}" r="4" fill="${c.color}"/>`;
  });

  // X axis label
  h += `<text x="${pL + chartW/2}" y="${H}" text-anchor="middle" font-size="9" fill="rgba(138,153,168,0.45)" font-family="Open Sans,sans-serif">Profit Margin %</text>`;

  svg.innerHTML = h;
}
