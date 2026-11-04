// Admin UI talks only to the configured Cloudflare Worker. No GitHub token is stored in browser code.
const API = window.LNMU_API_BASE || "https://REPLACE-WITH-YOUR-WORKER.workers.dev";
let items = [], dragged = null;
const $ = s => document.querySelector(s);
async function request(path, options={}) {
  const r = await fetch(API + path, {credentials:"include",headers:{"Content-Type":"application/json",...(options.headers||{})},...options});
  if(!r.ok) { const msg=await r.text(); throw new Error(msg || `Request failed (${r.status})`); }
  return r.status===204?null:r.json();
}
async function boot(){
  try { const me=await request("/api/me"); if(me && me.login){$("#loginBox").hidden=true;$("#app").hidden=false;await refresh();} }
  catch(e){$("#loginMsg").textContent="Login नहीं है। GitHub से login करें।";}
}
$("#loginBtn").onclick=()=>location.href=API+"/auth/login";
$("#logoutBtn").onclick=async()=>{try{await request("/auth/logout",{method:"POST"});}finally{location.reload();}};
async function refresh(){items=await request("/api/notices");render();}
function render(){
  $("#countAll").textContent=items.length;$("#countLive").textContent=items.filter(x=>x.published!==false).length;
  $("#noticeRows").innerHTML=items.map((n,i)=>`<div class="notice-row" draggable="true" data-id="${esc(n.id)}"><span class="drag">☷</span><div><b>${esc(n.title)}</b><small>${esc(n.category)} · ${n.published===false?"Draft":"Published"}${n.pinned?" · Pinned":""}</small></div><div class="row-actions"><button data-edit="${esc(n.id)}">Edit</button><button class="del" data-del="${esc(n.id)}">Delete</button></div></div>`).join("") || '<p class="muted">अभी कोई notice नहीं है।</p>';
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>edit(b.dataset.edit));
  document.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>remove(b.dataset.del));
  document.querySelectorAll(".notice-row").forEach(row=>{
    row.ondragstart=()=>{dragged=row.dataset.id;row.classList.add("dragging");};
    row.ondragend=()=>row.classList.remove("dragging");
    row.ondragover=e=>e.preventDefault();
    row.ondrop=e=>{e.preventDefault();const target=row.dataset.id;if(!dragged||dragged===target)return;const from=items.findIndex(x=>x.id===dragged),to=items.findIndex(x=>x.id===target);const [m]=items.splice(from,1);items.splice(to,0,m);render();};
  });
}
function edit(id){const n=items.find(x=>x.id===id);if(!n)return;$("#editId").value=n.id;$("#title").value=n.title;$("#description").value=n.description||"";$("#category").value=n.category;$("#date").value=n.date||"";$("#url").value=n.url||"";$("#pinned").checked=!!n.pinned;$("#published").checked=n.published!==false;$("#formTitle").textContent="Edit Notice";window.scrollTo({top:0,behavior:"smooth"});}
function reset(){ $("#noticeForm").reset();$("#editId").value="";$("#formTitle").textContent="Add New Notice";$("#published").checked=true;}
$("#resetBtn").onclick=reset;
$("#noticeForm").onsubmit=async e=>{e.preventDefault();const id=$("#editId").value||crypto.randomUUID();const n={id,title:$("#title").value.trim(),description:$("#description").value.trim(),category:$("#category").value,date:$("#date").value,url:$("#url").value.trim(),pinned:$("#pinned").checked,published:$("#published").checked};if(n.url&&!/^https?:\\/\\//i.test(n.url)){alert("URL https:// से शुरू होना चाहिए");return;}const ix=items.findIndex(x=>x.id===id);if(ix>=0)items[ix]=n;else items.unshift(n);try{await save();reset();$("#formMsg").textContent="Notice GitHub repository में save हो गया।";}catch(err){$("#formMsg").textContent="Save error: "+err.message;}};
async function remove(id){if(!confirm("क्या आप यह notice delete करना चाहते हैं?"))return;items=items.filter(x=>x.id!==id);try{await save();}catch(e){alert("Delete नहीं हुआ: "+e.message);await refresh();}}
$("#saveOrder").onclick=async()=>{try{await save();alert("क्रम save हो गया।");}catch(e){alert("Save error: "+e.message);}};
async function save(){await request("/api/notices",{method:"PUT",body:JSON.stringify(items)});await refresh();}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
boot();
