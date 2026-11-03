import './style.css';

const DB='finora-local', VERSION=1, STORE='records';
let db, user=null, data=null, active='home';
const $=s=>document.querySelector(s), uid=()=>crypto.randomUUID();
const money=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
const today=()=>new Date().toISOString().slice(0,10);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const blank=()=>({wallets:[],transactions:[],budgets:[],goals:[],debts:[],bills:[],settings:{theme:'dark'},profile:{name:''}});
function openDB(){return new Promise((ok,no)=>{let r=indexedDB.open(DB,VERSION);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>{db=r.result;ok()};r.onerror=()=>no(r.error)})}
function get(key){return new Promise((ok,no)=>{let r=db.transaction(STORE).objectStore(STORE).get(key);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
function put(key,val){return new Promise((ok,no)=>{let t=db.transaction(STORE,'readwrite');t.objectStore(STORE).put(val,key);t.oncomplete=ok;t.onerror=()=>no(t.error)})}
async function digest(password,salt){const enc=new TextEncoder();const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:180000,hash:'SHA-256'},key,256);return [...new Uint8Array(bits)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function idKey(id){return 'user:'+id}
async function accounts(){return (await get('accounts'))||[]}
async function saveAccounts(a){await put('accounts',a)}
function setSession(id){sessionStorage.setItem('finora-session',id)}
function clearSession(){sessionStorage.removeItem('finora-session');user=null;data=null}
async function register(name,username,email,password){
 const list=await accounts(), u=username.trim().toLowerCase(), e=email.trim().toLowerCase();
 if(list.some(a=>a.username===u||a.email===e))throw Error('Username atau email sudah digunakan.');
 const salt=uid(), id=uid(), hash=await digest(password,salt);
 const account={id,name:name.trim(),username:u,email:e,salt,hash,createdAt:new Date().toISOString()};
 list.push(account);await saveAccounts(list);
 const initial=blank();initial.profile.name=name.trim();initial.wallets.push({id:uid(),name:'Tunai',kind:'cash',balance:0});
 await put(idKey(id),initial);setSession(id);user=account;data=initial;
}
async function login(identity,password){
 const list=await accounts(), v=identity.trim().toLowerCase();
 const a=list.find(x=>x.username===v||x.email===v);
 if(!a)throw Error('Akun tidak ditemukan.');
 if(await digest(password,a.salt)!==a.hash)throw Error('Kata sandi salah.');
 user=a;data=(await get(idKey(a.id)))||blank();setSession(a.id);
}
async function persist(){await put(idKey(user.id),data)}
function fmtDate(s){return new Date(s+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}
function sum(type){return data.transactions.filter(t=>t.type===type&&t.date.slice(0,7)===today().slice(0,7)).reduce((n,t)=>n+t.amount,0)}
function balance(){return data.wallets.reduce((n,w)=>n+w.balance,0)}
function totals(){return ['cash','digital'].map(k=>({kind:k,total:data.wallets.filter(w=>w.kind===k).reduce((n,w)=>n+w.balance,0)}))}
function renderAuth(mode='login'){
 document.documentElement.dataset.theme='dark';
 $('#app').innerHTML=`<main class="auth"><img class="logo-img" src="/finora-logo.svg" alt="Logo FINORA"><h1>FINORA</h1><p class="muted">Kelola keuangan, kendalikan masa depan.</p>
 <div class="authcard"><div class="switch"><button id="loginTab" class="${mode==='login'?'on':''}">Masuk</button><button id="regTab" class="${mode==='register'?'on':''}">Buat akun</button></div>
 <form id="authForm" class="form">
 ${mode==='register'?'<label>Nama lengkap<input name="name" required autocomplete="name" placeholder="Nama Anda"></label>':''}
 <label>${mode==='login'?'Email atau username':'Username'}<input name="identity" required autocomplete="username" placeholder="${mode==='login'?'Email atau username':'Buat username'}"></label>
 ${mode==='register'?'<label>Email<input name="email" type="email" required autocomplete="email" placeholder="nama@email.com"></label>':''}
 <label>Kata sandi<input name="password" type="password" minlength="8" required autocomplete="${mode==='login'?'current-password':'new-password'}" placeholder="Minimal 8 karakter"></label>
 ${mode==='register'?'<label>Konfirmasi kata sandi<input name="confirm" type="password" minlength="8" required placeholder="Ulangi kata sandi"></label>':''}
 <button class="primary" type="submit">${mode==='login'?'Masuk ke FINORA':'Buat akun'}</button><p id="error" class="error"></p>
 </form></div><small class="muted">Akun dan data disimpan secara lokal di perangkat ini.</small></main>`;
 $('#loginTab').onclick=()=>renderAuth('login');$('#regTab').onclick=()=>renderAuth('register');
 $('#authForm').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));try{
 if(mode==='register'){if(f.password!==f.confirm)throw Error('Konfirmasi kata sandi tidak sama.');if(f.password.length<8)throw Error('Kata sandi minimal 8 karakter.');await register(f.name,f.identity,f.email,f.password)}
 else await login(f.identity,f.password);
 render();
 }catch(err){$('#error').textContent=err.message}};
}
function render(){
 document.documentElement.dataset.theme=data.settings.theme;
 const [cash,digital]=totals();
 $('#app').innerHTML=`<header class="top"><div class="brand"><img class="mark-img" src="/finora-logo.svg" alt="Logo FINORA"><div><b>FINORA</b><small>${esc(user.name)}</small></div></div><button id="theme" class="ghost">${data.settings.theme==='dark'?'☀':'☾'}</button></header>
 <main class="page"><section class="hero"><small>TOTAL SELURUH SALDO</small><h2>${money(balance())}</h2><div class="twobal"><span>💵 Tunai<br><b>${money(cash.total)}</b></span><span>📱 Digital<br><b>${money(digital.total)}</b></span></div></section>
 <div class="stats"><article><small>Pemasukan bulan ini</small><b class="green">${money(sum('income'))}</b></article><article><small>Pengeluaran bulan ini</small><b class="red">${money(sum('expense'))}</b></article></div>
 <div class="actions"><button data-new="income">＋ Pemasukan</button><button data-new="expense">－ Pengeluaran</button><button data-new="transfer">⇄ Transfer</button></div>
 <nav class="nav">${[['home','Ringkasan'],['wallets','Dompet'],['budgets','Anggaran'],['goals','Tabungan'],['other','Lainnya']].map(([k,v])=>`<button data-tab="${k}" class="${active===k?'chosen':''}">${v}</button>`).join('')}</nav>
 <section id="content">${content()}</section>
 <footer><button id="profile">Profil & akun</button><button id="logout">Keluar</button></footer></main><div id="modal"></div>`;
 $('#theme').onclick=async()=>{data.settings.theme=data.settings.theme==='dark'?'light':'dark';await persist();render()};
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{active=b.dataset.tab;render()});
 document.querySelectorAll('[data-new]').forEach(b=>b.onclick=()=>transactionForm(b.dataset.new));
 $('#logout').onclick=()=>{if(confirm('Keluar dari akun FINORA?')){clearSession();renderAuth()}};
 $('#profile').onclick=profileForm;
 bindContent();
}
function content(){
 if(active==='wallets')return `<div class="heading"><h3>Dompet saya</h3><button class="mini" id="addWallet">＋ Tambah</button></div>${data.wallets.map(w=>`<article class="rowcard"><div><b>${esc(w.name)}</b><small>${w.kind==='cash'?'Uang tunai':'Uang digital'}</small></div><strong>${money(w.balance)}</strong></article>`).join('')||'<p class="empty">Belum ada dompet.</p>'}`;
 if(active==='budgets')return `<div class="heading"><h3>Anggaran bulanan</h3><button class="mini" id="addBudget">＋ Atur</button></div>${data.budgets.map(b=>{const used=data.transactions.filter(t=>t.type==='expense'&&t.category===b.category&&t.date.slice(0,7)===today().slice(0,7)).reduce((n,t)=>n+t.amount,0);return `<article class="rowcard stack"><b>${esc(b.category)}</b><small>${money(used)} / ${money(b.limit)}</small><div class="bar"><i style="width:${Math.min(100,used/b.limit*100)}%"></i></div></article>`}).join('')||'<p class="empty">Belum ada anggaran.</p>'}`;
 if(active==='goals')return `<div class="heading"><h3>Target tabungan</h3><button class="mini" id="addGoal">＋ Target</button></div>${data.goals.map(g=>`<article class="rowcard stack"><b>${esc(g.name)}</b><small>${money(g.saved)} / ${money(g.target)}</small><div class="bar"><i style="width:${Math.min(100,g.saved/g.target*100)}%"></i></div></article>`).join('')||'<p class="empty">Belum ada target tabungan.</p>'}`;
 if(active==='other')return `<div class="othergrid">${[['debt','Utang & piutang'],['bills','Tagihan rutin'],['reports','Laporan PDF'],['excel','Ekspor Excel'],['backup','Backup data'],['restore','Restore data']].map(([a,b])=>`<button data-action="${a}">${b} <span>›</span></button>`).join('')}</div>`;
 const recent=[...data.transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10);
 return `<div class="heading"><h3>Transaksi terbaru</h3><small>${data.transactions.length} transaksi</small></div>${recent.map(t=>`<article class="tx"><span class="bubble ${t.type}">${t.type==='income'?'↗':'↘'}</span><div class="txinfo"><b>${esc(t.note||t.category)}</b><small>${esc(t.category)} · ${fmtDate(t.date)}</small></div><strong class="${t.type==='income'?'green':'red'}">${t.type==='income'?'+':'−'}${money(t.amount)}</strong></article>`).join('')||'<p class="empty">Belum ada transaksi. Mulai dengan mencatat pemasukan atau pengeluaran.</p>'}`;
}
function bindContent(){
 $('#addWallet')?.addEventListener('click',walletForm);$('#addBudget')?.addEventListener('click',budgetForm);$('#addGoal')?.addEventListener('click',goalForm);
 document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action));
}
function showModal(title,html){
 $('#modal').innerHTML=`<div class="shade" id="shade"><div class="modal"><div class="heading"><h3>${title}</h3><button id="x">✕</button></div>${html}</div></div>`;
 $('#x').onclick=()=>$('#modal').innerHTML='';$('#shade').onclick=e=>{if(e.target.id==='shade')$('#modal').innerHTML=''};
}
function transactionForm(type){
 const transfer=type==='transfer';
 showModal(transfer?'Transfer antar-dompet':type==='income'?'Pemasukan baru':'Pengeluaran baru',`<form id="txform" class="form">
 <label>Jumlah (Rp)<input name="amount" type="number" min="1" required></label>
 ${transfer?`<label>Dari dompet<select name="from">${data.wallets.map(w=>`<option value="${w.id}">${esc(w.name)}</option>`).join('')}</select></label><label>Ke dompet<select name="to">${data.wallets.map(w=>`<option value="${w.id}">${esc(w.name)}</option>`).join('')}</select></label>`:`<label>Kategori<select name="category">${(type==='income'?['Gaji','Uang saku','Bonus','Hadiah','Lainnya']:['Makanan','Transportasi','Belanja','Tagihan','Pendidikan','Kesehatan','Hiburan','Lainnya']).map(x=>`<option>${x}</option>`).join('')}</select></label><label>Dompet<select name="wallet">${data.wallets.map(w=>`<option value="${w.id}">${esc(w.name)}</option>`).join('')}</select></label>`}
 <label>Tanggal<input name="date" type="date" value="${today()}" required></label><label>Catatan<input name="note"></label><button class="primary">Simpan</button></form>`);
 $('#txform').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target)),amount=+f.amount;if(transfer){if(f.from===f.to) return alert('Pilih dua dompet yang berbeda.');const from=data.wallets.find(w=>w.id===f.from),to=data.wallets.find(w=>w.id===f.to);if(from.balance<amount)return alert('Saldo dompet asal tidak mencukupi.');from.balance-=amount;to.balance+=amount;data.transactions.push({id:uid(),type:'transfer',amount,from:f.from,to:f.to,date:f.date,note:f.note})}
 else{const w=data.wallets.find(x=>x.id===f.wallet);if(type==='expense'&&w.balance<amount)return alert('Saldo dompet tidak mencukupi.');w.balance+=(type==='income'?amount:-amount);data.transactions.push({id:uid(),type,amount,walletId:f.wallet,category:f.category,date:f.date,note:f.note})}
 await persist();$('#modal').innerHTML='';render()};
}
function walletForm(){showModal('Tambah dompet',`<form id="f" class="form"><label>Nama dompet<input name="name" required placeholder="Contoh: BCA, Tunai, DANA"></label><label>Jenis penyimpanan<select name="kind"><option value="cash">Uang tunai</option><option value="digital">Uang digital</option></select></label><label>Saldo awal (Rp)<input name="balance" type="number" min="0" value="0"></label><button class="primary">Simpan dompet</button></form>`);$('#f').onsubmit=async e=>{e.preventDefault();let f=Object.fromEntries(new FormData(e.target));data.wallets.push({id:uid(),name:f.name,kind:f.kind,balance:+f.balance});await persist();render()}}
function budgetForm(){showModal('Buat anggaran',`<form id="f" class="form"><label>Kategori<input name="category" required></label><label>Batas (Rp)<input name="limit" type="number" min="1" required></label><button class="primary">Simpan</button></form>`);$('#f').onsubmit=async e=>{e.preventDefault();let f=Object.fromEntries(new FormData(e.target));data.budgets.push({...f,id:uid(),limit:+f.limit});await persist();render()}}
function goalForm(){showModal('Target tabungan',`<form id="f" class="form"><label>Nama target<input name="name" required></label><label>Target (Rp)<input name="target" type="number" min="1" required></label><label>Terkumpul (Rp)<input name="saved" type="number" min="0" value="0"></label><button class="primary">Simpan</button></form>`);$('#f').onsubmit=async e=>{e.preventDefault();let f=Object.fromEntries(new FormData(e.target));data.goals.push({...f,id:uid(),target:+f.target,saved:+f.saved});await persist();render()}}
function profileForm(){showModal('Profil akun',`<div class="form"><p><b>${esc(user.name)}</b><br><small>${esc(user.email)}</small><br><small>@${esc(user.username)}</small></p><label>Ubah nama<input id="newname" value="${esc(user.name)}"></label><button class="primary" id="saveprofile">Simpan profil</button><button class="danger" id="deleteaccount">Hapus akun dan seluruh data</button></div>`);$('#saveprofile').onclick=async()=>{let n=$('#newname').value.trim();if(!n)return;user.name=n;data.profile.name=n;let a=await accounts();a=a.map(x=>x.id===user.id?{...x,name:n}:x);await saveAccounts(a);await persist();render()};$('#deleteaccount').onclick=async()=>{if(!confirm('Hapus akun dan seluruh data keuangan akun ini secara permanen?'))return;let a=(await accounts()).filter(x=>x.id!==user.id);await saveAccounts(a);await new Promise(ok=>{let t=db.transaction(STORE,'readwrite');t.objectStore(STORE).delete(idKey(user.id));t.oncomplete=ok});clearSession();renderAuth()}}
function action(which){
 if(which==='backup'){const blob=new Blob([JSON.stringify({format:'FINORA_BACKUP_V1',account:{name:user.name,username:user.username,email:user.email},data},null,2)],{type:'application/json'});download(blob,`FINORA-backup-${today()}.json`)}
 if(which==='restore'){showModal('Pulihkan backup',`<div class="form"><p>Restore akan mengganti data keuangan akun yang sedang aktif.</p><input id="restorefile" type="file" accept=".json,application/json"><button class="primary" id="restorego">Pulihkan data</button></div>`);$('#restorego').onclick=async()=>{try{const file=$('#restorefile').files[0];if(!file)throw Error('Pilih file backup terlebih dahulu.');const parsed=JSON.parse(await file.text());if(parsed.format!=='FINORA_BACKUP_V1'||!parsed.data?.wallets)throw Error('Format backup tidak valid.');if(!confirm('Ganti data akun ini dengan isi backup?'))return;data=parsed.data;await persist();render()}catch(e){alert(e.message)}}}
 if(which==='excel'){const rows=[['Tanggal','Jenis','Kategori','Jumlah','Catatan'],...data.transactions.map(t=>[t.date,t.type,t.category||'Transfer',t.amount,t.note||''])];const csv='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');download(new Blob([csv],{type:'text/csv;charset=utf-8'}),`FINORA-${today()}.csv`)}
 if(which==='reports'){const doc=new jsPDF();doc.setFontSize(18);doc.text('FINORA - Laporan Keuangan',14,18);doc.setFontSize(10);doc.text(`Pemilik: ${user.name}`,14,28);doc.text(`Tanggal: ${today()}`,14,35);doc.text(`Total saldo: ${money(balance())}`,14,44);doc.text(`Tunai: ${money(totals()[0].total)} | Digital: ${money(totals()[1].total)}`,14,52);let y=64;data.transactions.forEach(t=>{if(y>280){doc.addPage();y=20}doc.text(`${t.date} | ${t.type} | ${t.category||'Transfer'} | ${money(t.amount)}`.slice(0,100),14,y);y+=7});doc.save(`FINORA-${today()}.pdf`)}
 if(which==='debt')showModal('Utang & piutang',`<form id="f" class="form"><label>Jenis<select name="type"><option>Piutang</option><option>Utang</option></select></label><label>Nama pihak<input name="person" required></label><label>Jumlah (Rp)<input name="amount" type="number" min="1" required></label><label>Jatuh tempo<input name="due" type="date"></label><button class="primary">Simpan</button></form>${data.debts.map(d=>`<p>${esc(d.person)} · ${d.type} · ${money(d.amount)}</p>`).join('')}`),$('#f').onsubmit=async e=>{e.preventDefault();let f=Object.fromEntries(new FormData(e.target));data.debts.push({...f,id:uid(),amount:+f.amount});await persist();render()};
 if(which==='bills')showModal('Tagihan rutin',`<form id="f" class="form"><label>Nama tagihan<input name="name" required></label><label>Jumlah (Rp)<input name="amount" type="number" min="1" required></label><label>Frekuensi<select name="frequency"><option>Bulanan</option><option>Mingguan</option><option>Tahunan</option></select></label><label>Jatuh tempo<input name="due" type="date"></label><button class="primary">Simpan</button></form>${data.bills.map(b=>`<p>${esc(b.name)} · ${money(b.amount)} · ${b.frequency}</p>`).join('')}`),$('#f').onsubmit=async e=>{e.preventDefault();let f=Object.fromEntries(new FormData(e.target));data.bills.push({...f,id:uid(),amount:+f.amount});await persist();render()};
}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function init(){await openDB();const sid=sessionStorage.getItem('finora-session');if(sid){const a=(await accounts()).find(x=>x.id===sid);if(a){user=a;data=(await get(idKey(sid)))||blank();render();return}}renderAuth()}
init().catch(e=>{$('#app').innerHTML=`<p class="empty">FINORA gagal dimulai: ${esc(e.message)}</p>`});
