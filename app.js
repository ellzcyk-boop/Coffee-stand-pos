const DB_NAME="CoffeeStandPOS", DB_VERSION=1, STORE="state";
const MENU=[
  ["Coffee",4,"Latte, cap, long black, hot chocolate"],
  ["Krispy Kreme",3,""],
  ["Coffee & Donut",6,""],
  ["4 Krispy Kreme’s",10,""],
  ["Caramel Slice",3,""],
  ["Banana Bread",3,""],
  ["Killer Python",1,""],
  ["Zappos",2,""]
];
let state={customers:[],day:"Day 1",created:new Date().toISOString()};
let currentItems=[], currentCustomer="";

const $=id=>document.getElementById(id);
const money=n=>"$"+Number(n||0).toFixed(2).replace(".00","");
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function loadState(){try{const db=await openDB();return await new Promise((res,rej)=>{const t=db.transaction(STORE,"readonly"),q=t.objectStore(STORE).get("state");q.onsuccess=()=>res(q.result||state);q.onerror=()=>rej(q.error)})}catch(e){return state}}
async function saveState(){const db=await openDB();return new Promise((res,rej)=>{const t=db.transaction(STORE,"readwrite");t.objectStore(STORE).put(state,"state");t.oncomplete=res;t.onerror=()=>rej(t.error)})}
function totalItems(items){return items.reduce((s,x)=>s+MENU[x.i][1]*x.q,0)}
function customer(name){return state.customers.find(c=>c.name.toLowerCase()===name.trim().toLowerCase())}
function due(c){return c.purchases.filter(p=>!p.paid).reduce((s,p)=>s+p.total,0)}
function totalCustomer(c){return c.purchases.reduce((s,p)=>s+p.total,0)}
function dayTotal(day){return state.customers.flatMap(c=>c.purchases).filter(p=>p.day===day).reduce((s,p)=>s+p.total,0)}

function renderMenu(){
  const el=$("menu");el.innerHTML="";
  MENU.forEach((m,i)=>{const b=document.createElement("button");b.innerHTML=`<strong>${esc(m[0])}</strong><span class="desc">${esc(m[2])}</span><span class="price">${money(m[1])}</span>`;b.addEventListener("click",()=>{const x=currentItems.find(x=>x.i===i);x?x.q++:currentItems.push({i,q:1});renderOrder()});el.appendChild(b)})
}
function renderOrder(){
  $("purchaseTitle").textContent=currentCustomer?`${currentCustomer}'s Purchase`:"Current Purchase";
  const el=$("orderList");el.innerHTML="";
  if(!currentItems.length)el.innerHTML='<div class="empty">Tap a menu item to add it.</div>';
  currentItems.forEach(x=>{const r=document.createElement("div");r.className="order-row";r.innerHTML=`<div><strong>${esc(MENU[x.i][0])}</strong><div class="muted">${money(MENU[x.i][1])} each</div></div><div class="qty"><button type="button">−</button><b>${x.q}</b><button type="button">+</button><strong>${money(MENU[x.i][1]*x.q)}</strong></div>`;r.querySelectorAll("button")[0].onclick=()=>change(x.i,-1);r.querySelectorAll("button")[1].onclick=()=>change(x.i,1);el.appendChild(r)});
  $("orderTotal").textContent=money(totalItems(currentItems))
}
function change(i,d){const x=currentItems.find(x=>x.i===i);if(!x)return;x.q+=d;if(x.q<=0)currentItems=currentItems.filter(y=>y!==x);renderOrder()}
function renderCustomers(){
  const list=$("customersList"), names=$("customerNames"), quick=$("quickCustomers");list.innerHTML="";names.innerHTML="";quick.innerHTML="";
  [...state.customers].sort((a,b)=>a.name.localeCompare(b.name)).forEach(c=>{
    const opt=document.createElement("option");opt.value=c.name;names.appendChild(opt);
    const qb=document.createElement("button");qb.textContent=c.name;qb.onclick=()=>startFor(c.name);quick.appendChild(qb);
    const card=document.createElement("div");card.className="card";card.style.marginTop="10px";
    card.innerHTML=`<div class="customer-row"><div><strong>${esc(c.name)}</strong><div class="muted">${c.purchases.length} purchase${c.purchases.length===1?"":"s"} · Weekend ${money(totalCustomer(c))}</div></div><div class="right"><span class="badge ${due(c)?"due":""}">${due(c)?`Due ${money(due(c))}`:"Paid"}</span></div></div><div class="toolbar"><button class="primary">+ New Purchase</button><button>View History</button></div><div class="history hidden"></div>`;
    card.querySelector("button").onclick=()=>startFor(c.name);
    card.querySelectorAll("button")[1].onclick=()=>toggleHistory(card,c);
    list.appendChild(card);
  });
  if(!state.customers.length)list.innerHTML='<div class="empty">No customers yet.</div>';
}
function toggleHistory(card,c){
  const h=card.querySelector(".history");h.classList.toggle("hidden");if(h.classList.contains("hidden"))return;h.innerHTML="";
  [...c.purchases].reverse().forEach(p=>{const d=document.createElement("div");d.className="purchase";const names=p.items.map(x=>`${MENU[x.i][0]} ×${x.q}`).join(", ");d.innerHTML=`<div class="customer-row"><div><strong>${esc(names)}</strong><div class="muted">${esc(p.day)} · ${new Date(p.time).toLocaleString()}</div></div><div class="right"><strong>${money(p.total)}</strong><br><span class="badge ${p.paid?"":"due"}">${p.paid?"Paid":"Unpaid"}</span>${p.paid?"":'<br><button type="button" style="margin-top:5px">Mark Paid</button>'}</div></div>`;if(!p.paid)d.querySelector("button").onclick=async()=>{p.paid=true;await saveState();renderAll()};h.appendChild(d)})
}
function startFor(name){currentCustomer=name;currentItems=[];$("customerName").value=name;renderOrder();show("order")}
async function savePurchase(){
  const name=$("customerName").value.trim();if(!name)return alert("Enter a customer name.");if(!currentItems.length)return alert("Add at least one item.");
  let c=customer(name);if(!c){c={name,purchases:[]};state.customers.push(c)}
  c.purchases.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),day:state.day,time:new Date().toISOString(),items:JSON.parse(JSON.stringify(currentItems)),total:totalItems(currentItems),paid:false});
  await saveState();currentItems=[];currentCustomer=name;renderAll();show("customers")
}
function renderSales(){
  const purchases=state.customers.flatMap(c=>c.purchases), counts=MENU.map(()=>0);let items=0,sales=0,out=0;
  purchases.forEach(p=>{sales+=p.total;if(!p.paid)out+=p.total;p.items.forEach(x=>{counts[x.i]+=x.q;items+=x.q})});
  $("statPurchases").textContent=purchases.length;$("statItems").textContent=items;$("statSales").textContent=money(sales);$("statDue").textContent=money(out);
  $("currentDayNotice").textContent=`Current: ${state.day}`;
  const il=$("itemSales");il.innerHTML="";MENU.forEach((m,i)=>{if(counts[i]){const r=document.createElement("div");r.className="order-row";r.innerHTML=`<span>${esc(m[0])}</span><strong>${counts[i]} sold · ${money(counts[i]*m[1])}</strong>`;il.appendChild(r)}});
  const dl=$("dailySales");dl.innerHTML="";[...new Set(purchases.map(p=>p.day))].forEach(day=>{const r=document.createElement("div");r.className="order-row";r.innerHTML=`<strong>${esc(day)}</strong><strong>${money(dayTotal(day))}</strong>`;dl.appendChild(r)});
}
function renderAll(){renderOrder();renderCustomers();renderSales()}
function show(view){document.querySelectorAll("[id^=view-]").forEach(s=>s.classList.toggle("hidden",s.id!==`view-${view}`));document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===view))}
$("customerName").addEventListener("input",e=>{currentCustomer=e.target.value.trim();renderOrder()});
$("savePurchase").onclick=savePurchase;$("clearPurchase").onclick=()=>{currentItems=[];renderOrder()};
$("newDay").onclick=async()=>{const n=prompt("Enter the new day name (e.g. Saturday):", "Day 2");if(n&&n.trim()){state.day=n.trim();await saveState();renderAll()}};
$("exportBtn").onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`coffee-pos-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$("importBtn").onclick=()=>$("fileInput").click();
$("fileInput").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());if(!Array.isArray(data.customers))throw Error();state=data;await saveState();renderAll();alert("Backup restored.")}catch(err){alert("That file does not look like a valid Coffee POS backup.")}e.target.value=""};
$("resetAll").onclick=async()=>{if(confirm("This will permanently clear all customers, purchases and sales on this device. Continue?")){state={customers:[],day:"Day 1",created:new Date().toISOString()};await saveState();currentItems=[];currentCustomer="";renderAll();show("order")}};
document.querySelectorAll(".nav button").forEach(b=>b.onclick=()=>show(b.dataset.view));
(async()=>{state=await loadState();renderMenu();renderAll()})();
