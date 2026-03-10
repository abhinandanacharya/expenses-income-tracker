const CATEGORIES = {
  income: [
    {id:'salary',label:'Salary',icon:'💼'},
    {id:'freelance',label:'Freelance',icon:'💻'},
    {id:'investment',label:'Investment',icon:'📈'},
    {id:'business',label:'Business',icon:'🏢'},
    {id:'gift',label:'Gift / Transfer',icon:'🎁'},
    {id:'other_income',label:'Other Income',icon:'💰'},
  ],
  expense: [
    {id:'food',label:'Food & Dining',icon:'🍽️'},
    {id:'transport',label:'Transport',icon:'🚗'},
    {id:'shopping',label:'Shopping',icon:'🛍️'},
    {id:'housing',label:'Housing & Rent',icon:'🏠'},
    {id:'health',label:'Health & Medical',icon:'💊'},
    {id:'utilities',label:'Utilities & Bills',icon:'⚡'},
    {id:'entertainment',label:'Entertainment',icon:'🎬'},
    {id:'education',label:'Education',icon:'📚'},
    {id:'personal',label:'Personal Care',icon:'🧴'},
    {id:'other_expense',label:'Other Expense',icon:'📦'},
  ]
};

let currentType = 'income';
let filterMonth = null;
let transactions = JSON.parse(localStorage.getItem('flo_tx_v2') || '[]');
let stmtPeriod = 'weekly';
let stmtOffset = 0;

function init() {
  const now = new Date();
  document.getElementById('dateDisplay').textContent =
    now.toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  document.getElementById('txDate').value = now.toISOString().split('T')[0];
  filterMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  updateCategoryOptions();
  renderStatement();
  render();
}

function setType(t) {
  currentType = t;
  document.getElementById('btnIncome').className = 'type-btn'+(t==='income'?' active income':'');
  document.getElementById('btnExpense').className = 'type-btn'+(t==='expense'?' active expense':'');
  updateCategoryOptions();
}

function updateCategoryOptions() {
  const sel = document.getElementById('txCategory');
  sel.innerHTML = '<option value="">Select category</option>';
  CATEGORIES[currentType].forEach(c => sel.innerHTML += `<option value="${c.id}">${c.icon} ${c.label}</option>`);
}

function getCatInfo(id) {
  return [...CATEGORIES.income,...CATEGORIES.expense].find(c=>c.id===id)||{label:id,icon:'📌'};
}

function fmtNum(n) {
  return 'Rs.'+Math.abs(n).toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:2});
}

function addTransaction() {
  const desc = document.getElementById('txDesc').value.trim();
  const amount = parseFloat(document.getElementById('txAmount').value);
  const category = document.getElementById('txCategory').value;
  const date = document.getElementById('txDate').value;
  if (!desc) { showToast('Please enter a description'); return; }
  if (!amount||amount<=0) { showToast('Please enter a valid amount'); return; }
  if (!category) { showToast('Please select a category'); return; }
  if (!date) { showToast('Please select a date'); return; }
  transactions.unshift({id:Date.now(),type:currentType,desc,amount,category,date});
  localStorage.setItem('flo_tx_v2',JSON.stringify(transactions));
  document.getElementById('txDesc').value='';
  document.getElementById('txAmount').value='';
  document.getElementById('txCategory').value='';
  showToast(currentType==='income'?'Added income!':'Added expense!');
  renderStatement(); render();
}

function deleteTransaction(id) {
  transactions = transactions.filter(t=>t.id!==id);
  localStorage.setItem('flo_tx_v2',JSON.stringify(transactions));
  renderStatement(); render();
  showToast('Deleted');
}

function getFilteredTx() {
  if (!filterMonth) return transactions;
  return transactions.filter(t=>t.date&&t.date.startsWith(filterMonth));
}
function getMonths() {
  return [...new Set(transactions.map(t=>t.date?t.date.slice(0,7):null).filter(Boolean))].sort().reverse();
}

/* ---- PERIOD LOGIC ---- */
function getPeriodRange() {
  const now = new Date(); now.setHours(0,0,0,0);
  let start, end, label;
  if (stmtPeriod==='daily') {
    const d=new Date(now); d.setDate(d.getDate()+stmtOffset);
    start=new Date(d); end=new Date(d);
    label=d.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  } else if (stmtPeriod==='weekly') {
    const day=now.getDay(); const diff=(day===0?-6:1-day);
    const mon=new Date(now); mon.setDate(now.getDate()+diff+(stmtOffset*7));
    start=new Date(mon); end=new Date(mon); end.setDate(end.getDate()+6);
    label=`${start.toLocaleDateString('en-IN',{day:'numeric',month:'short'})} - ${end.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}`;
  } else if (stmtPeriod==='monthly') {
    const d=new Date(now.getFullYear(),now.getMonth()+stmtOffset,1);
    start=new Date(d.getFullYear(),d.getMonth(),1);
    end=new Date(d.getFullYear(),d.getMonth()+1,0);
    label=d.toLocaleDateString('en-IN',{month:'long',year:'numeric'});
  } else {
    const y=now.getFullYear()+stmtOffset;
    start=new Date(y,0,1); end=new Date(y,11,31);
    label=String(y);
  }
  return {start,end,label};
}

function txInRange(tx,start,end) {
  if (!tx.date) return false;
  const d=new Date(tx.date+'T00:00:00');
  return d>=start && d<=end;
}

function setPeriod(p) {
  stmtPeriod=p; stmtOffset=0;
  ['daily','weekly','monthly','yearly'].forEach(x=>
    document.getElementById('tab-'+x).className='period-tab'+(p===x?' active':''));
  renderStatement();
}
function shiftPeriod(dir) { stmtOffset+=dir; renderStatement(); }

function renderStatement() {
  const {start,end,label}=getPeriodRange();
  document.getElementById('periodLabel').textContent=label;
  const ptx=transactions.filter(t=>txInRange(t,start,end));
  const inc=ptx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const exp=ptx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const bal=inc-exp;
  document.getElementById('stmtPreview').innerHTML=`
    <div class="stmt-row"><span class="lbl">Period</span><span style="font-size:0.75rem;font-weight:600">${label}</span></div>
    <div class="stmt-row"><span class="lbl">Transactions</span><span>${ptx.length}</span></div>
    <div class="stmt-row"><span class="lbl">Total Income</span><span class="val-g">${fmtNum(inc)}</span></div>
    <div class="stmt-row"><span class="lbl">Total Expenses</span><span class="val-r">${fmtNum(exp)}</span></div>
    <div class="stmt-row divider">
      <span class="lbl" style="font-weight:600">Net Balance</span>
      <span class="val-b" style="color:${bal>=0?'var(--accent-green)':'var(--accent-red)'}">${bal>=0?'+':'\u2212'}${fmtNum(bal)}</span>
    </div>`;
}

/* ---- PRINT-BASED STATEMENT ---- */
function downloadStatement() {
  const {start,end,label}=getPeriodRange();
  const ptx=transactions.filter(t=>txInRange(t,start,end)).sort((a,b)=>a.date.localeCompare(b.date));
  if (!ptx.length) { showToast('No transactions in this period'); return; }

  const inc=ptx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const exp=ptx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const bal=inc-exp;
  const sav=inc>0?Math.round((bal/inc)*100):0;
  const genDate=new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'});
  const periodLabel=stmtPeriod.charAt(0).toUpperCase()+stmtPeriod.slice(1);

  // Category breakdown
  const catMap={};
  ptx.forEach(t=>{
    if(!catMap[t.category]) catMap[t.category]={type:t.type,total:0,count:0};
    catMap[t.category].total+=t.amount; catMap[t.category].count++;
  });
  const totalFlow=inc+exp||1;

  const catRows=Object.entries(catMap).sort((a,b)=>b[1].total-a[1].total).map(([catId,data],i)=>{
    const info=getCatInfo(catId);
    const sign=data.type==='income'?'+':'−';
    const color=data.type==='income'?'#2d6a4f':'#9b2226';
    const pct=Math.round((data.total/totalFlow)*100);
    return `<tr style="background:${i%2===0?'#f8f5ef':'#ffffff'}">
      <td>${info.label}</td>
      <td style="color:${color};font-weight:600">${data.type==='income'?'Income':'Expense'}</td>
      <td style="text-align:center;color:#8a8070">${data.count}</td>
      <td style="text-align:right;color:${color};font-weight:700">${sign}Rs.${data.total.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
      <td style="text-align:right;color:#8a8070">${pct}%</td>
    </tr>`;
  }).join('');

  const txRows=ptx.map((tx,i)=>{
    const info=getCatInfo(tx.category);
    const ds=new Date(tx.date+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
    const color=tx.type==='income'?'#2d6a4f':'#9b2226';
    const sign=tx.type==='income'?'+':'−';
    return `<tr style="background:${i%2===0?'#f8f5ef':'#ffffff'}">
      <td style="color:#555">${ds}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${tx.desc}</td>
      <td style="color:#8a8070">${info.label}</td>
      <td style="color:${color};font-weight:600">${tx.type==='income'?'Income':'Expense'}</td>
      <td style="text-align:right;color:${color};font-weight:700">${sign}Rs.${tx.amount.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
    </tr>`;
  }).join('');

  const balColor=bal>=0?'#2d6a4f':'#9b2226';
  const balStr=(bal>=0?'+':'−')+'Rs.'+Math.abs(bal).toLocaleString('en-IN',{minimumFractionDigits:2});

  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <title>Flo Statement — ${label}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',sans-serif;background:#fff;color:#0d0d0d;font-size:11px;line-height:1.5}
    .header{background:#0d0d0d;color:#fff;padding:28px 36px 22px;display:flex;justify-content:space-between;align-items:flex-start}
    .header-logo{font-family:'Playfair Display',serif;font-size:26px;font-weight:900;letter-spacing:-1px}
    .header-logo span{color:#c9a84c}
    .header-sub{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#c9a84c;margin-top:4px}
    .header-right{text-align:right}
    .header-period{font-family:'Playfair Display',serif;font-size:15px;font-weight:700;color:#fff}
    .header-meta{font-size:9px;color:rgba(255,255,255,0.45);margin-top:4px;line-height:1.8}
    .gold-bar{height:3px;background:#c9a84c}
    .body{padding:28px 36px}
    .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:28px}
    .kpi{border-radius:8px;padding:14px 14px 12px;border-left:3px solid}
    .kpi-label{font-size:7.5px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#8a8070;margin-bottom:6px}
    .kpi-val{font-family:'Playfair Display',serif;font-size:15px;font-weight:700}
    .section-label{font-size:8.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#8a8070;margin-bottom:8px}
    table{width:100%;border-collapse:collapse;margin-bottom:24px;font-size:10.5px}
    thead tr{background:#0d0d0d;color:#fff}
    thead th{padding:7px 10px;text-align:left;font-weight:600;font-size:9px;letter-spacing:0.5px;text-transform:uppercase}
    tbody td{padding:7px 10px;border-bottom:none}
    .totals-row{background:#0d0d0d!important;color:#fff}
    .totals-row td{padding:9px 10px;font-weight:700;font-size:11px}
    .footer{margin-top:auto;border-top:1px solid #ddd8cc;padding:12px 36px;display:flex;justify-content:space-between;font-size:8.5px;color:#aaa;position:fixed;bottom:0;left:0;right:0;background:#fff}
    @media print{
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .footer{position:fixed;bottom:0}
    }
  </style>
  </head><body>
  <div class="header">
    <div>
      <div class="header-logo">Fl<span>o</span></div>
      <div class="header-sub">Account Statement</div>
    </div>
    <div class="header-right">
      <div class="header-period">${label}</div>
      <div class="header-meta">
        Period Type: ${periodLabel}<br>
        Generated: ${genDate}<br>
        Total Transactions: ${ptx.length}
      </div>
    </div>
  </div>
  <div class="gold-bar"></div>
  <div class="body">
    <div class="kpi-grid">
      <div class="kpi" style="background:#edf7f0;border-color:#2d6a4f">
        <div class="kpi-label">Total Income</div>
        <div class="kpi-val" style="color:#2d6a4f">Rs.${inc.toLocaleString('en-IN',{minimumFractionDigits:2})}</div>
      </div>
      <div class="kpi" style="background:#fef0f1;border-color:#9b2226">
        <div class="kpi-label">Total Expenses</div>
        <div class="kpi-val" style="color:#9b2226">Rs.${exp.toLocaleString('en-IN',{minimumFractionDigits:2})}</div>
      </div>
      <div class="kpi" style="background:#fffdf5;border-color:${balColor}">
        <div class="kpi-label">Net Balance</div>
        <div class="kpi-val" style="color:${balColor}">${balStr}</div>
      </div>
      <div class="kpi" style="background:#fffdf0;border-color:#c9a84c">
        <div class="kpi-label">Savings Rate</div>
        <div class="kpi-val" style="color:#c9a84c">${sav}%</div>
      </div>
    </div>

    <div class="section-label">Category Breakdown</div>
    <table>
      <thead><tr>
        <th>Category</th><th>Type</th><th style="text-align:center">Entries</th>
        <th style="text-align:right">Amount</th><th style="text-align:right">Share</th>
      </tr></thead>
      <tbody>${catRows}</tbody>
    </table>

    <div class="section-label">Transaction Details</div>
    <table>
      <thead><tr>
        <th>Date</th><th>Description</th><th>Category</th><th>Type</th><th style="text-align:right">Amount</th>
      </tr></thead>
      <tbody>
        ${txRows}
        <tr class="totals-row">
          <td colspan="2">TOTALS</td>
          <td style="color:#52b788">Income: Rs.${inc.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
          <td style="color:#e63946">Exp: Rs.${exp.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
          <td style="text-align:right;color:${bal>=0?'#52b788':'#e63946'}">${balStr}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="footer">
    <span>Flo Finance &nbsp;&bull;&nbsp; Personal Finance Statement &nbsp;&bull;&nbsp; For personal use only</span>
    <span>${genDate}</span>
  </div>
  <script>window.onload=function(){window.print();}<\/script>
  </body></html>`;

  const win=window.open('','_blank','width=900,height=700');
  if (!win) { showToast('Allow pop-ups to download PDF'); return; }
  win.document.write(html);
  win.document.close();
  showToast('Print dialog opened — Save as PDF!');
}

/* ---- APP RENDER ---- */
function render() {
  const fx=getFilteredTx();
  renderSummary(fx); renderFilters(); renderChart(fx); renderTxList(fx);
}

function renderSummary(txs) {
  const inc=txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const exp=txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const bal=inc-exp;
  const sav=inc>0?Math.round((bal/inc)*100):0;
  document.getElementById('totalIncome').textContent=fmtNum(inc);
  document.getElementById('totalExpense').textContent=fmtNum(exp);
  document.getElementById('netBalance').textContent=fmtNum(bal);
  document.getElementById('netBalance').style.color=bal>=0?'var(--accent-green)':'var(--accent-red)';
  const ic=txs.filter(t=>t.type==='income').length, ec=txs.filter(t=>t.type==='expense').length;
  document.getElementById('incomeCount').textContent=`${ic} entr${ic===1?'y':'ies'}`;
  document.getElementById('expenseCount').textContent=`${ec} entr${ec===1?'y':'ies'}`;
  document.getElementById('savingsRate').textContent=`Savings rate: ${sav}%`;
}

function renderFilters() {
  const months=getMonths();
  const row=document.getElementById('filterRow');
  let html=`<span class="filter-chip${filterMonth===null?' active':''}" onclick="setFilter(null)">All</span>`;
  months.forEach(m=>{
    const [y,mo]=m.split('-');
    const lb=new Date(y,mo-1).toLocaleDateString('en-IN',{month:'short',year:'2-digit'});
    html+=`<span class="filter-chip${filterMonth===m?' active':''}" onclick="setFilter('${m}')">${lb}</span>`;
  });
  row.innerHTML=html;
  const ml=document.getElementById('chartMonthLabel');
  if(filterMonth){const [y,mo]=filterMonth.split('-');ml.textContent=new Date(y,mo-1).toLocaleDateString('en-IN',{month:'long',year:'numeric'});}
  else ml.textContent='All time';
}

function setFilter(m){filterMonth=m;render();}

function renderChart(txs) {
  const c=document.getElementById('barChart');
  if(!txs.length){c.innerHTML='<div class="empty-state" style="padding:16px 0"><div class="empty-state-icon">📊</div><div class="empty-state-text">No data for this period</div></div>';return;}
  const iT={},eT={};
  txs.forEach(t=>{if(t.type==='income')iT[t.category]=(iT[t.category]||0)+t.amount;else eT[t.category]=(eT[t.category]||0)+t.amount;});
  const mI=Math.max(...Object.values(iT),1), mE=Math.max(...Object.values(eT),1);
  let h='';
  Object.entries(iT).sort((a,b)=>b[1]-a[1]).forEach(([cat,val])=>{const i=getCatInfo(cat);const p=Math.round((val/mI)*100);h+=`<div class="bar-row"><div class="bar-label">${i.icon} ${i.label}</div><div class="bar-track"><div class="bar-fill income" style="width:${p}%"></div></div><div class="bar-val income">${fmtNum(val)}</div></div>`;});
  Object.entries(eT).sort((a,b)=>b[1]-a[1]).forEach(([cat,val])=>{const i=getCatInfo(cat);const p=Math.round((val/mE)*100);h+=`<div class="bar-row"><div class="bar-label">${i.icon} ${i.label}</div><div class="bar-track"><div class="bar-fill expense" style="width:${p}%"></div></div><div class="bar-val expense">${fmtNum(val)}</div></div>`;});
  c.innerHTML=h;
}

function renderTxList(txs) {
  const l=document.getElementById('txList');
  if(!txs.length){l.innerHTML='<div class="empty-state"><div class="empty-state-icon">💸</div><div class="empty-state-text">No transactions for this period</div></div>';return;}
  l.innerHTML=txs.map((t,i)=>{
    const info=getCatInfo(t.category);
    const d=new Date(t.date+'T00:00:00');
    const ds=d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
    return `<div class="tx-item" style="animation-delay:${i*0.04}s"><div class="tx-icon ${t.type}">${info.icon}</div><div class="tx-info"><div class="tx-name">${t.desc}</div><div class="tx-meta">${info.label} &middot; ${ds}</div></div><div class="tx-amount ${t.type}">${t.type==='income'?'+':'&minus;'}${fmtNum(t.amount)}</div><button class="tx-delete" onclick="deleteTransaction(${t.id})">&#x2715;</button></div>`;
  }).join('');
}

function showToast(msg) {
  const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2800);
}

init();