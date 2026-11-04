/*
 * Cloudflare Worker: GitHub App OAuth + private repository JSON writer.
 * Configure secrets/vars in Cloudflare. Never put secrets in the GitHub Pages frontend.
 */
const GH = "https://api.github.com";
function cookie(request,name){const raw=request.headers.get("Cookie")||"";const m=raw.match(new RegExp("(?:^|; )"+name+"=([^;]*)"));return m?decodeURIComponent(m[1]):"";}
function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store",...headers}});}
function redirect(url,headers={}){return new Response(null,{status:302,headers:{Location:url,...headers}});}
function secureCookie(name,value,maxAge){return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${maxAge}`;}
async function ghFetch(path,token,init={}){return fetch(GH+path,{...init,headers:{"Authorization":`Bearer ${token}`,"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","User-Agent":"LNMU-Network-Admin",...(init.headers||{})}});}
async function session(request,env){const sid=cookie(request,"lnmu_session");if(!sid)return null;const raw=await env.SESSIONS.get("session:"+sid);if(!raw)return null;const s=JSON.parse(raw);if(s.expires<Date.now()) {await env.SESSIONS.delete("session:"+sid);return null;}return s;}
async function contents(env,token,path,body){const url=`/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;const old=await ghFetch(url,token);let sha;if(old.ok){sha=(await old.json()).sha;}else if(old.status!==404)throw new Error("GitHub read failed: "+await old.text());const encoded=btoa(unescape(encodeURIComponent(JSON.stringify(body,null,2)+"\n")));const res=await ghFetch(url,token,{method:"PUT",body:JSON.stringify({message:`Update ${path} via LNMU Network Admin`,content:encoded,...(sha?{sha}:{})})});if(!res.ok)throw new Error("GitHub write failed: "+await res.text());return res.json();}
export default {
 async fetch(request,env){
  const url=new URL(request.url),origin=env.SITE_ORIGIN;
  const cors={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Credentials":"true","Access-Control-Allow-Headers":"Content-Type","Access-Control-Allow-Methods":"GET,PUT,POST,OPTIONS","Vary":"Origin"};
  if(request.method==="OPTIONS")return new Response(null,{headers:cors});
  if(url.pathname==="/auth/login"){
    const state=crypto.randomUUID();
    return redirect(`https://github.com/login/oauth/authorize?client_id=${env.GITHUB_APP_CLIENT_ID}&redirect_uri=${encodeURIComponent(env.OAUTH_CALLBACK_URL)}&state=${state}&scope=repo&allow_signup=false`,{ "Set-Cookie":secureCookie("lnmu_oauth_state",state,600) });
  }
  if(url.pathname==="/auth/callback"){
    const state=cookie(request,"lnmu_oauth_state"),code=url.searchParams.get("code"),got=url.searchParams.get("state");
    if(!state||state!==got)return new Response("Invalid OAuth state", {status:400});
    const tokenRes=await fetch("https://github.com/login/oauth/access_token",{method:"POST",headers:{"Accept":"application/json","Content-Type":"application/json"},body:JSON.stringify({client_id:env.GITHUB_APP_CLIENT_ID,client_secret:env.GITHUB_APP_CLIENT_SECRET,code})});
    const tokenData=await tokenRes.json();if(!tokenData.access_token)return new Response("GitHub authorization failed",{status:401});
    const meRes=await ghFetch("/user",tokenData.access_token);const me=await meRes.json();
    if(!me.login||me.login.toLowerCase()!==env.ADMIN_GITHUB_LOGIN.toLowerCase())return new Response("This GitHub account is not authorized.",{status:403});
    const sid=crypto.randomUUID();await env.SESSIONS.put("session:"+sid,JSON.stringify({token:tokenData.access_token,login:me.login,expires:Date.now()+8*60*60*1000}),{expirationTtl:28800});
    const h=new Headers();h.set("Location",env.ADMIN_RETURN_URL);h.append("Set-Cookie",secureCookie("lnmu_session",sid,28800));h.append("Set-Cookie",secureCookie("lnmu_oauth_state","",0));return new Response(null,{status:302,headers:h});
  }
  if(url.pathname==="/auth/logout"&&request.method==="POST"){const s=await session(request,env);if(s){const sid=cookie(request,"lnmu_session");await env.SESSIONS.delete("session:"+sid);}return new Response(null,{status:204,headers:{...cors,"Set-Cookie":secureCookie("lnmu_session","",0)}});}
  if(url.pathname.startsWith("/api/")){
    const s=await session(request,env);if(!s)return json({error:"Unauthorized"},401,cors);
    if(url.pathname==="/api/me"&&request.method==="GET")return json({login:s.login},200,cors);
    if(url.pathname==="/api/notices"&&request.method==="GET"){
      const r=await ghFetch(`/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/data/notices.json`,s.token);if(!r.ok)return json({error:await r.text()},r.status,cors);const f=await r.json();return json(JSON.parse(decodeURIComponent(escape(atob(f.content.replace(/\n/g,""))))),200,cors);
    }
    if(url.pathname==="/api/notices"&&request.method==="PUT"){
      const data=await request.json();if(!Array.isArray(data)||data.length>1000)return json({error:"Invalid notice data"},400,cors);
      for(const n of data){if(!n.id||!n.title||!["admission","exam","result","scholarship","student","general"].includes(n.category))return json({error:"Invalid notice entry"},400,cors);if(n.url&&!/^https?:\/\//i.test(n.url))return json({error:"Invalid URL"},400,cors);}
      try{await contents(env,s.token,"data/notices.json",data);return json({ok:true},200,cors);}catch(e){return json({error:e.message},502,cors);}
    }
  }
  return new Response("LNMU Network Admin API",{status:200});
 }
};
