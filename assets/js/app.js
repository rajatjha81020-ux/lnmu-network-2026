const $ = (s) => document.querySelector(s);
$("#year").textContent = new Date().getFullYear();
$("#menuToggle").addEventListener("click",()=>$("#mainNav").classList.toggle("open"));
const categoryLabels = {admission:"ADMISSION",exam:"EXAM",result:"RESULT",general:"GENERAL",student:"STUDENT",scholarship:"SCHOLARSHIP"};
let notices = [], portals = [];
async function loadData(){
  try {
    const [n,p] = await Promise.all([fetch("data/notices.json"),fetch("data/portals.json")]);
    if(!n.ok || !p.ok) throw new Error("Data unavailable");
    notices = await n.json(); portals = await p.json();
  } catch(e) { notices=[]; portals=[]; }
  renderNotices(); renderPortals();
}
function renderNotices(){
  const term = ($("#noticeSearch").value||"").toLowerCase();
  const cat = $("#categoryFilter").value;
  const list = notices.filter(n=>n.published!==false && (!cat||n.category===cat) && (n.title+" "+(n.description||"")).toLowerCase().includes(term));
  $("#noticeList").innerHTML = list.length ? list.map(n=>`<article class="notice-item">
    <span class="tag">${escapeHtml(categoryLabels[n.category]||"NOTICE")}</span>
    <div><h3>${escapeHtml(n.title)}</h3><p>${escapeHtml(n.description||"")} ${n.date? "· "+escapeHtml(n.date):""}</p></div>
    ${n.url?`<a href="${safeUrl(n.url)}" target="_blank" rel="noopener">Open Link ↗</a>`:""}
  </article>`).join("") : '<p class="muted">इस category में अभी कोई notice उपलब्ध नहीं है।</p>';
}
function renderPortals(){
  $("#portalList").innerHTML = portals.map(p=>`<article class="portal-card"><h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.description||"")}</p><a href="${safeUrl(p.url)}" target="_blank" rel="noopener">Open Portal →</a></article>`).join("");
}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function safeUrl(u=""){try{const x=new URL(u);return ["https:","http:"].includes(x.protocol)?x.href:"#";}catch{return "#";}}
$("#noticeSearch").addEventListener("input",renderNotices);
$("#categoryFilter").addEventListener("change",renderNotices);
loadData();
