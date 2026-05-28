// ── STATE ─────────────────────────────────────────────────
var userEmail = "", userName = "", userCollege = "";
var attendanceLog = [];
var existingChart = null;

// localStorage helpers
function lsGet(k){try{return JSON.parse(localStorage.getItem(k))||null}catch(e){return null}}
function lsSet(k,v){localStorage.setItem(k,JSON.stringify(v))}

// ── AUTH ──────────────────────────────────────────────────
function switchTab(tab){
  document.getElementById('form-login').style.display = tab==='login'?'block':'none';
  document.getElementById('form-register').style.display = tab==='register'?'block':'none';
  document.getElementById('btn-login').classList.toggle('active',tab==='login');
  document.getElementById('btn-register').classList.toggle('active',tab==='register');
  document.getElementById('auth-msg').innerText='';
}

function register(){
  var name=document.getElementById('reg-name').value.trim();
  var college=document.getElementById('reg-college').value.trim()||'NIT Warangal';
  var email=document.getElementById('reg-email').value.trim();
  var pass=document.getElementById('reg-pass').value;
  var msg=document.getElementById('auth-msg');
  if(!name||!email||!pass){msg.style.color='#f87171';msg.innerText='All fields required.';return;}
  fetch('/register',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:email,password:pass,name:name,college:college})
  }).then(function(r){return r.text();}).then(function(res){
    if(res==='Registered'){
      lsSet('profile_'+email,{name:name,college:college});
      msg.style.color='#34d399';msg.innerText='Registered! Please login.';switchTab('login');
    } else {msg.style.color='#f87171';msg.innerText=res;}
  });
}

function login(){
  var email=document.getElementById('login-email').value.trim();
  var pass=document.getElementById('login-pass').value;
  var msg=document.getElementById('auth-msg');
  fetch('/login',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:email,password:pass})
  }).then(function(r){return r.text();}).then(function(res){
    if(res==='Success'){
      userEmail=email;
      var profile=lsGet('profile_'+email)||{};
      userName=profile.name||email.split('@')[0];
      userCollege=profile.college||'NIT Warangal';
      document.getElementById('auth').classList.add('hidden');
      document.getElementById('dashboard').classList.remove('hidden');
      document.getElementById('user-label').innerText=userName+' · '+userCollege;
      document.getElementById('topbar-right').innerHTML=
        '<div class="topbar-badge">'+userCollege+'</div>';
      loadAll();
    } else {msg.style.color='#f87171';msg.innerText='Invalid email or password';}
  });
}

function logout(){
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('auth').classList.remove('hidden');
  userEmail='';attendanceLog=[];
  document.getElementById('login-email').value='';
  document.getElementById('login-pass').value='';
}

// ── LOAD ALL ──────────────────────────────────────────────
function loadAll(){
  renderHome();
  renderAssignments();
  renderTimetable();
  renderHolidays();
  renderExams();
  renderNotesList();
  loadPomoStats();
  var savedAtt=lsGet('att_'+userEmail)||[];
  savedAtt.forEach(function(e){
    attendanceLog.push(e);
    renderAttRow(e.subject,e.attended,e.total,(e.attended/e.total)*100);
  });
  if(attendanceLog.length>0){
    document.getElementById('att-result-card').style.display='block';
    updateChart();
  }
  var cgpaData=lsGet('cgpa_'+userEmail)||[];
  cgpaData.forEach(function(e){appendCGPARow(e.sem,e.val);});
  updateCGPAAvg();
}

// ── HOME DASHBOARD ────────────────────────────────────────
function renderHome(){
  var grid=document.getElementById('home-grid');
  var assignments=lsGet('assign_'+userEmail)||[];
  var exams=lsGet('exams_'+userEmail)||[];
  var pending=assignments.filter(function(a){return !a.done;}).length;
  var today=new Date();
  var nextExam=exams.filter(function(e){return new Date(e.date)>=today;})
    .sort(function(a,b){return new Date(a.date)-new Date(b.date)})[0];
  var daysToExam=nextExam?Math.ceil((new Date(nextExam.date)-today)/(1000*60*60*24)):null;
  var att=lsGet('att_'+userEmail)||[];
  var avgAtt=att.length?Math.round(att.reduce(function(s,e){return s+(e.attended/e.total)*100;},0)/att.length):null;
  var pomos=lsGet('pomo_stats_'+userEmail)||{count:0};

  grid.innerHTML=
    stat('📝',''+pending,'Pending Tasks','showTab(\'assign\')')+
    stat('⏳',daysToExam!==null?daysToExam+'d':'—','Next Exam','showTab(\'exams\')')+
    stat('📊',avgAtt!==null?avgAtt+'%':'—','Avg Attendance','showTab(\'att\')')+
    stat('🍅',''+pomos.count,'Pomodoros Today','showTab(\'pomodoro\')');

  // upcoming
  var items=[];
  var today2=new Date(); today2.setHours(0,0,0,0);
  var week=new Date(today2); week.setDate(week.getDate()+7);
  assignments.forEach(function(a){
    if(!a.done&&a.due){
      var d=new Date(a.due);
      if(d>=today2&&d<=week) items.push({title:a.title,date:a.due,type:a.type,color:'#38bdf8'});
    }
  });
  exams.forEach(function(e){
    var d=new Date(e.date);
    if(d>=today2&&d<=week) items.push({title:e.subject+' Exam',date:e.date,type:'Exam',color:'#f87171'});
  });
  var hols=lsGet('hols_'+userEmail)||[];
  hols.forEach(function(h){
    var d=new Date(h.date);
    if(d>=today2&&d<=week) items.push({title:h.name,date:h.date,type:h.type,color:'#34d399'});
  });
  items.sort(function(a,b){return new Date(a.date)-new Date(b.date);});
  var ul=document.getElementById('upcoming-list');
  if(items.length===0){ul.innerHTML='<div class="empty-state">Nothing upcoming this week 🎉</div>';return;}
  ul.innerHTML=items.map(function(it){
    return '<div class="upcoming-item">'+
      '<div class="upcoming-dot" style="background:'+it.color+'"></div>'+
      '<div><div class="upcoming-title">'+it.title+'</div>'+
      '<div class="upcoming-date">'+fmtDate(it.date)+'</div></div>'+
      '<span class="upcoming-badge" style="background:'+it.color+'22;color:'+it.color+'">'+it.type+'</span>'+
    '</div>';
  }).join('');
}

function stat(icon,val,label,onclick){
  return '<div class="home-stat" onclick="'+onclick+'">'+
    '<div class="home-stat-icon">'+icon+'</div>'+
    '<div class="home-stat-val">'+val+'</div>'+
    '<div class="home-stat-label">'+label+'</div>'+
  '</div>';
}

// ── TAB SWITCHING ─────────────────────────────────────────
var tabTitles={home:'Home',att:'Attendance',bunk:'Bunk Calculator',gpa:'GPA / CGPA',
  assign:'Assignments & Homework',timetable:'Timetable',holidays:'Holidays & Events',
  exams:'Exam Countdown',notes:'Notes',pomodoro:'Pomodoro Timer',chart:'Analytics'};

function showTab(tab){
  document.querySelectorAll('.tab-content').forEach(function(t){t.classList.add('hidden');});
  document.querySelectorAll('.nav-btn').forEach(function(b){b.classList.remove('active');});
  document.getElementById(tab).classList.remove('hidden');
  document.getElementById('nav-'+tab).classList.add('active');
  document.getElementById('tab-title').innerText=tabTitles[tab];
  if(tab==='home') renderHome();
}

// ── ATTENDANCE ────────────────────────────────────────────
function saveAttendance(){
  var subject=document.getElementById('att-subject').value.trim();
  var a=parseInt(document.getElementById('att-attended').value);
  var t=parseInt(document.getElementById('att-total').value);
  var msg=document.getElementById('att-msg');
  if(!subject){msg.style.color='#f87171';msg.innerText='Enter subject name.';return;}
  if(isNaN(a)||isNaN(t)||t<=0){msg.style.color='#f87171';msg.innerText='Enter valid numbers.';return;}
  if(a>t){msg.style.color='#f87171';msg.innerText='Attended cannot exceed total!';return;}
  if(a<0){msg.style.color='#f87171';msg.innerText='Cannot be negative.';return;}
  var pct=(a/t)*100;
  var entry={subject:subject,attended:a,total:t};
  fetch('/attendance',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:userEmail,subject:subject,attended:a,total:t})});
  attendanceLog.push(entry);
  var saved=lsGet('att_'+userEmail)||[];
  saved.push(entry); lsSet('att_'+userEmail,saved);
  document.getElementById('att-result-card').style.display='block';
  renderAttRow(subject,a,t,pct);
  updateChart();
  msg.style.color='#34d399';msg.innerText='Saved!';
  document.getElementById('att-subject').value='';
  document.getElementById('att-attended').value='';
  document.getElementById('att-total').value='';
}

function renderAttRow(subject,a,t,pct){
  var display=document.getElementById('att-result-display');
  var cc=pct>=75?'pct-green':pct>=60?'pct-yellow':'pct-red';
  var bc=pct>=75?'bar-green':pct>=60?'bar-yellow':'bar-red';
  var row=document.createElement('div');row.className='att-result-row';
  row.innerHTML='<span class="att-subj">'+subject+'</span>'+
    '<div class="att-bar-wrap"><div class="att-bar '+bc+'" style="width:'+Math.min(pct,100).toFixed(1)+'%"></div></div>'+
    '<span style="font-size:12px;color:var(--text3);margin-right:12px">'+a+'/'+t+'</span>'+
    '<span class="att-pct '+cc+'">'+pct.toFixed(1)+'%</span>';
  display.appendChild(row);
}

// ── BUNK ─────────────────────────────────────────────────
var bunkCount=0;
function addBunkRow(){
  bunkCount++;
  var tr=document.createElement('tr'); tr.className='bunk-row'; tr.id='brow-'+bunkCount;
  tr.innerHTML='<td>'+bunkCount+'</td>'+
    '<td><input class="inp-sm bunk-subj" placeholder="Subject"></td>'+
    '<td><input class="inp-sm bunk-attended" type="number" min="0" placeholder="0"></td>'+
    '<td><input class="inp-sm bunk-total" type="number" min="0" placeholder="0"></td>'+
    '<td><input class="inp-sm bunk-remaining" type="number" min="0" placeholder="0"></td>'+
    '<td><span class="bunk-result">—</span></td>'+
    '<td><button class="del-btn" onclick="document.getElementById(\'brow-'+bunkCount+'\').remove()">×</button></td>';
  document.getElementById('bunk-tbody').appendChild(tr);
}
function calcBunk(){
  document.querySelectorAll('.bunk-row').forEach(function(row){
    var a=parseInt(row.querySelector('.bunk-attended').value);
    var t=parseInt(row.querySelector('.bunk-total').value);
    var rem=parseInt(row.querySelector('.bunk-remaining').value);
    var span=row.querySelector('.bunk-result');
    if(isNaN(a)||isNaN(t)||isNaN(rem)||t<=0||rem<0){span.innerText='—';span.style.color='var(--text3)';return;}
    if(a>t){span.innerText='Error';span.style.color='var(--red)';return;}
    var required=Math.ceil(0.75*(t+rem));
    var stillNeed=Math.max(0,required-a);
    var canBunk=rem-stillNeed;
    if(canBunk<=0){
      var deficit=stillNeed-rem;
      span.innerText=deficit>0?'Need +'+deficit:'Attend all';
      span.style.color='var(--red)';
    } else {span.innerText=canBunk;span.style.color='var(--green)';}
  });
}
addBunkRow();addBunkRow();addBunkRow();

// ── GPA / CGPA ────────────────────────────────────────────
function calcGPA(){
  var arr=document.getElementById('grades').value.split(',');
  var sum=0,valid=true;
  for(var i=0;i<arr.length;i++){var g=parseFloat(arr[i].trim());if(isNaN(g)||g<0||g>10){valid=false;break;}sum+=g;}
  var box=document.getElementById('gpa-result');
  if(!valid){box.style.display='block';box.innerHTML='<p style="color:var(--red);font-size:14px">Enter valid grades 0–10.</p>';return;}
  var gpa=sum/arr.length;
  fetch('/gpa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:userEmail,cgpa:gpa})});
  var lbl=gpa>=9?'Outstanding 🏆':gpa>=8?'Excellent ✨':gpa>=7?'Very Good':gpa>=6?'Good':'Keep Going 💪';
  box.style.display='block';
  box.innerHTML='<div class="gpa-big">'+gpa.toFixed(2)+'</div><div class="gpa-label">'+lbl+' · '+arr.length+' subjects</div>';
}

function addCGPA(){
  var sem=document.getElementById('cgpa-sem').value.trim();
  var val=parseFloat(document.getElementById('cgpa-val').value);
  if(!sem||isNaN(val)||val<0||val>10) return;
  var data=lsGet('cgpa_'+userEmail)||[];
  data.push({sem:sem,val:val}); lsSet('cgpa_'+userEmail,data);
  appendCGPARow(sem,val); updateCGPAAvg();
  document.getElementById('cgpa-sem').value='';document.getElementById('cgpa-val').value='';
}
function appendCGPARow(sem,val){
  var c=val>=8?'var(--green)':val>=6?'var(--yellow)':'var(--red)';
  var div=document.createElement('div');div.className='cgpa-row';
  div.innerHTML='<span>'+sem+'</span><span style="font-family:var(--mono);font-weight:600;color:'+c+'">'+val.toFixed(2)+'</span>';
  document.getElementById('cgpa-list').appendChild(div);
}
function updateCGPAAvg(){
  var data=lsGet('cgpa_'+userEmail)||[];
  if(!data.length) return;
  var avg=data.reduce(function(s,e){return s+e.val;},0)/data.length;
  var box=document.getElementById('cgpa-avg');
  box.style.display='block';box.innerHTML='Cumulative GPA: '+avg.toFixed(2);
}

// ── ASSIGNMENTS ───────────────────────────────────────────
function addAssignment(){
  var subj=document.getElementById('as-subj').value.trim();
  var title=document.getElementById('as-title').value.trim();
  var due=document.getElementById('as-due').value;
  var type=document.getElementById('as-type').value;
  var notes=document.getElementById('as-notes').value.trim();
  if(!subj||!title||!due) return;
  var data=lsGet('assign_'+userEmail)||[];
  var id=Date.now();
  data.push({id:id,subj:subj,title:title,due:due,type:type,notes:notes,done:false});
  lsSet('assign_'+userEmail,data);
  renderAssignments();
  document.getElementById('as-subj').value='';document.getElementById('as-title').value='';
  document.getElementById('as-due').value='';document.getElementById('as-notes').value='';
}
function toggleAssign(id){
  var data=lsGet('assign_'+userEmail)||[];
  data.forEach(function(a){if(a.id===id) a.done=!a.done;});
  lsSet('assign_'+userEmail,data); renderAssignments(); renderHome();
}
function deleteAssign(id){
  var data=lsGet('assign_'+userEmail)||[];
  lsSet('assign_'+userEmail,data.filter(function(a){return a.id!==id;}));
  renderAssignments(); renderHome();
}
function renderAssignments(){
  var data=lsGet('assign_'+userEmail)||[];
  var today=new Date(); today.setHours(0,0,0,0);
  var pending=data.filter(function(a){return !a.done;});
  var done=data.filter(function(a){return a.done;});
  document.getElementById('pending-count').innerText=pending.length+' pending';
  document.getElementById('assign-pending').innerHTML=pending.length?
    pending.sort(function(a,b){return new Date(a.due)-new Date(b.due);})
      .map(function(a){return assignHTML(a,today);}).join(''):
    '<div class="empty-state">No pending tasks! 🎉</div>';
  document.getElementById('assign-done').innerHTML=done.length?
    done.map(function(a){return assignHTML(a,today);}).join(''):
    '<div class="empty-state">Nothing completed yet.</div>';
}
function assignHTML(a,today){
  var due=new Date(a.due); due.setHours(0,0,0,0);
  var diff=Math.ceil((due-today)/(1000*60*60*24));
  var urgency,ulabel;
  if(a.done){urgency='';ulabel='';}
  else if(diff<0){urgency='badge-overdue';ulabel='Overdue';}
  else if(diff===0){urgency='badge-today';ulabel='Today';}
  else if(diff<=3){urgency='badge-soon';ulabel='In '+diff+'d';}
  else{urgency='badge-ok';ulabel='In '+diff+'d';}
  var typeBadge={Assignment:'badge-assign',Homework:'badge-hw',Project:'badge-proj','Lab Report':'badge-lab',Quiz:'badge-quiz'};
  return '<div class="assign-item'+(a.done?' done':'')+'">'+
    '<div class="assign-check'+(a.done?' checked':'')+'" onclick="toggleAssign('+a.id+')">'+(a.done?'✓':'')+'</div>'+
    '<div class="assign-info">'+
      '<div class="assign-title">'+a.title+'</div>'+
      '<div class="assign-meta">'+a.subj+' · Due: '+fmtDate(a.due)+(a.notes?' · '+a.notes:'')+'</div>'+
    '</div>'+
    '<span class="assign-badge '+(typeBadge[a.type]||'badge-assign')+'">'+a.type+'</span>'+
    (urgency?'<span class="assign-badge '+urgency+'" style="margin-left:6px">'+ulabel+'</span>':'')+
    '<button class="del-btn" onclick="deleteAssign('+a.id+')" style="margin-left:8px">×</button>'+
  '</div>';
}

// ── TIMETABLE ─────────────────────────────────────────────
var DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function addTimetable(){
  var day=document.getElementById('tt-day').value;
  var subj=document.getElementById('tt-subj').value.trim();
  var start=document.getElementById('tt-start').value;
  var end=document.getElementById('tt-end').value;
  var room=document.getElementById('tt-room').value.trim();
  if(!subj||!start||!end) return;
  var data=lsGet('tt_'+userEmail)||[];
  data.push({id:Date.now(),day:day,subj:subj,start:start,end:end,room:room});
  lsSet('tt_'+userEmail,data); renderTimetable();
  document.getElementById('tt-subj').value='';document.getElementById('tt-room').value='';
}
function deleteTT(id){
  var data=lsGet('tt_'+userEmail)||[];
  lsSet('tt_'+userEmail,data.filter(function(e){return e.id!==id;}));
  renderTimetable();
}
function renderTimetable(){
  var data=lsGet('tt_'+userEmail)||[];
  var todayDay=DAYS[new Date().getDay()-1];
  var html='';
  DAYS.forEach(function(day){
    var classes=data.filter(function(e){return e.day===day;}).sort(function(a,b){return a.start.localeCompare(b.start);});
    if(!classes.length) return;
    var isToday=day===todayDay;
    html+='<div class="tt-day-block">'+
      '<div class="tt-day-label">'+day+(isToday?' <span style="color:var(--accent)">· Today</span>':'')+'</div>'+
      classes.map(function(c){
        return '<div class="tt-class-row">'+
          '<span class="tt-time">'+fmt12(c.start)+' – '+fmt12(c.end)+'</span>'+
          '<span class="tt-subj">'+c.subj+'</span>'+
          (c.room?'<span class="tt-room">'+c.room+'</span>':'')+
          '<button class="del-btn" onclick="deleteTT('+c.id+')">×</button>'+
        '</div>';
      }).join('')+
    '</div>';
  });
  document.getElementById('tt-display').innerHTML=html||'<div class="empty-state">No classes added yet.</div>';
}

// ── HOLIDAYS ──────────────────────────────────────────────
var typeColors={Holiday:'#34d399',Festival:'#a78bfa',Exam:'#f87171',Event:'#38bdf8',Deadline:'#fbbf24'};
function addHoliday(){
  var name=document.getElementById('hol-name').value.trim();
  var date=document.getElementById('hol-date').value;
  var type=document.getElementById('hol-type').value;
  if(!name||!date) return;
  var data=lsGet('hols_'+userEmail)||[];
  data.push({id:Date.now(),name:name,date:date,type:type});
  lsSet('hols_'+userEmail,data); renderHolidays();
  document.getElementById('hol-name').value='';document.getElementById('hol-date').value='';
}
function deleteHol(id){
  var data=lsGet('hols_'+userEmail)||[];
  lsSet('hols_'+userEmail,data.filter(function(e){return e.id!==id;}));
  renderHolidays();
}
function renderHolidays(){
  var data=lsGet('hols_'+userEmail)||[];
  var today=new Date(); today.setHours(0,0,0,0);
  var sorted=data.sort(function(a,b){return new Date(a.date)-new Date(b.date);});
  var html=sorted.map(function(h){
    var d=new Date(h.date); d.setHours(0,0,0,0);
    var diff=Math.ceil((d-today)/(1000*60*60*24));
    var daysLeft=diff<0?'Past':diff===0?'Today':'In '+diff+' day'+(diff>1?'s':'');
    var color=typeColors[h.type]||'#38bdf8';
    var months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return '<div class="hol-item">'+
      '<div class="hol-date-box"><div class="hol-day">'+d.getDate()+'</div><div class="hol-month">'+months[d.getMonth()]+'</div></div>'+
      '<div style="flex:1"><div class="hol-name">'+h.name+'</div>'+
        '<div style="font-size:12px;margin-top:3px"><span style="background:'+color+'22;color:'+color+';padding:2px 8px;border-radius:10px;font-size:11px;font-weight:500">'+h.type+'</span></div>'+
      '</div>'+
      '<div class="hol-days-left">'+daysLeft+'</div>'+
      '<button class="del-btn" onclick="deleteHol('+h.id+')">×</button>'+
    '</div>';
  }).join('');
  document.getElementById('hol-display').innerHTML=html||'<div class="empty-state">No holidays added yet.</div>';
}

// ── EXAM COUNTDOWN ────────────────────────────────────────
function addExam(){
  var subj=document.getElementById('ex-subj').value.trim();
  var date=document.getElementById('ex-date').value;
  var time=document.getElementById('ex-time').value;
  if(!subj||!date) return;
  var data=lsGet('exams_'+userEmail)||[];
  data.push({id:Date.now(),subject:subj,date:date,time:time||'09:00'});
  lsSet('exams_'+userEmail,data); renderExams();
  document.getElementById('ex-subj').value='';document.getElementById('ex-date').value='';
}
function deleteExam(id){
  var data=lsGet('exams_'+userEmail)||[];
  lsSet('exams_'+userEmail,data.filter(function(e){return e.id!==id;}));
  renderExams();
}
function renderExams(){
  var data=lsGet('exams_'+userEmail)||[];
  var now=new Date();
  var sorted=data.filter(function(e){return new Date(e.date+'T'+e.time)>=now;})
    .sort(function(a,b){return new Date(a.date+'T'+a.time)-new Date(b.date+'T'+b.time);});
  var html=sorted.map(function(e){
    var target=new Date(e.date+'T'+e.time);
    var diff=target-now;
    var days=Math.floor(diff/(1000*60*60*24));
    var hrs=Math.floor((diff%(1000*60*60*24))/(1000*60*60));
    var urgency=days<=3?'exam-urgency-high':days<=7?'exam-urgency-med':'exam-urgency-low';
    return '<div class="exam-card">'+
      '<div class="exam-countdown-box">'+
        '<div class="exam-days '+urgency+'">'+days+'</div>'+
        '<div class="exam-days-label">days</div>'+
      '</div>'+
      '<div class="exam-info">'+
        '<div class="exam-subj">'+e.subject+'</div>'+
        '<div class="exam-datetime">'+fmtDate(e.date)+' at '+fmt12(e.time)+' · '+hrs+'h remaining today</div>'+
      '</div>'+
      '<button class="del-btn" onclick="deleteExam('+e.id+')">×</button>'+
    '</div>';
  }).join('');
  document.getElementById('exam-display').innerHTML=html||'<div class="empty-state">No exams added.</div>';
}

// ── NOTES ─────────────────────────────────────────────────
var activeNoteId=null;
function newNote(){
  var data=lsGet('notes_'+userEmail)||[];
  var id=Date.now();
  data.unshift({id:id,title:'Untitled Note',body:'',color:'default'});
  lsSet('notes_'+userEmail,data); renderNotesList(); openNote(id);
}
function openNote(id){
  activeNoteId=id;
  var data=lsGet('notes_'+userEmail)||[];
  var note=data.find(function(n){return n.id===id;});
  if(!note) return;
  document.getElementById('note-title').value=note.title;
  document.getElementById('note-body').value=note.body;
  document.getElementById('note-color').value=note.color||'default';
  renderNotesList();
}
function saveNote(){
  if(!activeNoteId) return;
  var data=lsGet('notes_'+userEmail)||[];
  data.forEach(function(n){
    if(n.id===activeNoteId){
      n.title=document.getElementById('note-title').value||'Untitled';
      n.body=document.getElementById('note-body').value;
      n.color=document.getElementById('note-color').value;
    }
  });
  lsSet('notes_'+userEmail,data); renderNotesList();
}
function deleteNote(){
  if(!activeNoteId) return;
  var data=lsGet('notes_'+userEmail)||[];
  lsSet('notes_'+userEmail,data.filter(function(n){return n.id!==activeNoteId;}));
  activeNoteId=null;
  document.getElementById('note-title').value='';
  document.getElementById('note-body').value='';
  renderNotesList();
}
function renderNotesList(){
  var data=lsGet('notes_'+userEmail)||[];
  var list=document.getElementById('notes-list');
  if(!data.length){list.innerHTML='<div style="font-size:13px;color:var(--text3);text-align:center;padding:20px">No notes yet</div>';return;}
  list.innerHTML=data.map(function(n){
    var colorClass=n.color!=='default'?'note-'+n.color:'';
    return '<div class="note-item '+colorClass+(n.id===activeNoteId?' active':'')+'" onclick="openNote('+n.id+')">'+
      '<div class="note-item-title">'+n.title+'</div>'+
      '<div class="note-item-preview">'+(n.body||'Empty note')+'</div>'+
    '</div>';
  }).join('');
}

// ── POMODORO ──────────────────────────────────────────────
var pomoModes={focus:25*60,short:5*60,long:15*60};
var pomoMode='focus', pomoRemaining=25*60, pomoTotal=25*60;
var pomoRunning=false, pomoTimer=null, pomoSession=1;

function setPomoMode(mode){
  resetPomo();
  pomoMode=mode; pomoRemaining=pomoTotal=pomoModes[mode];
  document.querySelectorAll('.pomo-mode').forEach(function(b){b.classList.remove('active');});
  document.getElementById('pm-'+mode).classList.add('active');
  updatePomoDisplay();
}
function startPomo(){
  if(pomoRunning){
    clearInterval(pomoTimer); pomoRunning=false;
    document.getElementById('pomo-start-btn').innerText='▶ Start';
  } else {
    pomoRunning=true;
    document.getElementById('pomo-start-btn').innerText='⏸ Pause';
    pomoTimer=setInterval(function(){
      pomoRemaining--;
      updatePomoDisplay();
      if(pomoRemaining<=0){
        clearInterval(pomoTimer); pomoRunning=false;
        document.getElementById('pomo-start-btn').innerText='▶ Start';
        if(pomoMode==='focus') recordPomo();
        pomoSession++;
        document.getElementById('pomo-session').innerText='Session '+pomoSession;
      }
    },1000);
  }
}
function resetPomo(){
  clearInterval(pomoTimer); pomoRunning=false;
  pomoRemaining=pomoTotal=pomoModes[pomoMode];
  document.getElementById('pomo-start-btn').innerText='▶ Start';
  updatePomoDisplay();
}
function updatePomoDisplay(){
  var m=Math.floor(pomoRemaining/60), s=pomoRemaining%60;
  document.getElementById('pomo-display').innerText=(m<10?'0':'')+m+':'+(s<10?'0':'')+s;
  var pct=((pomoTotal-pomoRemaining)/pomoTotal)*100;
  document.getElementById('pomo-bar').style.width=pct+'%';
}
function recordPomo(){
  var stats=lsGet('pomo_stats_'+userEmail)||{count:0,focus:0,date:''};
  var today=new Date().toDateString();
  if(stats.date!==today){stats={count:0,focus:0,date:today};}
  stats.count++; stats.focus+=pomoModes.focus/60;
  lsSet('pomo_stats_'+userEmail,stats);
  var task=document.getElementById('pomo-task').value||'Focus session';
  var log=lsGet('pomo_log_'+userEmail)||[];
  log.unshift({task:task,time:new Date().toLocaleTimeString()});
  if(log.length>20) log=log.slice(0,20);
  lsSet('pomo_log_'+userEmail,log);
  loadPomoStats();
}
function loadPomoStats(){
  var stats=lsGet('pomo_stats_'+userEmail)||{count:0,focus:0,date:''};
  var today=new Date().toDateString();
  if(stats.date!==today) stats={count:0,focus:0,date:today};
  document.getElementById('pomo-count').innerText=stats.count;
  document.getElementById('pomo-focus-time').innerText=stats.focus+'m';
  document.getElementById('pomo-streak').innerText=stats.count;
  var log=lsGet('pomo_log_'+userEmail)||[];
  document.getElementById('pomo-log').innerHTML=log.map(function(l){
    return '<div class="pomo-log-item"><span class="pomo-log-icon">🍅</span><span style="flex:1">'+l.task+'</span><span style="color:var(--text3);font-size:12px">'+l.time+'</span></div>';
  }).join('');
}

// ── CHART ─────────────────────────────────────────────────
function updateChart(){
  if(!attendanceLog.length) return;
  document.getElementById('chart-hint').style.display='none';
  if(existingChart) existingChart.destroy();
  existingChart=new Chart(document.getElementById('myChart'),{
    type:'bar',
    data:{
      labels:attendanceLog.map(function(e){return e.subject;}),
      datasets:[{label:'Attendance %',data:attendanceLog.map(function(e){return parseFloat(((e.attended/e.total)*100).toFixed(1));}),
        backgroundColor:attendanceLog.map(function(e){var p=(e.attended/e.total)*100;return p>=75?'#34d399':p>=60?'#fbbf24':'#f87171';}),
        borderRadius:6,borderSkipped:false}]
    },
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return c.parsed.y+'%';}}}},
      scales:{
        y:{min:0,max:100,ticks:{color:'#64748b',callback:function(v){return v+'%';}},grid:{color:'rgba(99,179,237,0.06)'}},
        x:{ticks:{color:'#64748b'},grid:{display:false}}
      }
    }
  });
}

// ── UTILS ─────────────────────────────────────────────────
function fmtDate(d){
  if(!d) return '—';
  var dt=new Date(d+'T00:00:00');
  return dt.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
}
function fmt12(t){
  if(!t) return '';
  var parts=t.split(':'),h=parseInt(parts[0]),m=parts[1];
  var ampm=h>=12?'PM':'AM'; h=h%12||12;
  return h+':'+m+' '+ampm;
}