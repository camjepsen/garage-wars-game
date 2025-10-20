
// Garage Wars Web Demo - standalone HTML/JS
(function(){
  const SPACES = [
    {name:'Clock In', x:8, y:8},
    {name:'Start', x:20, y:8},
    {name:'Repair Bay #1', x:36, y:8},
    {name:'Shop Event', x:52, y:8},
    {name:'Repair Bay #2', x:68, y:8},
    {name:'Parts Counter', x:84, y:8},
    {name:'Tool Chest', x:84, y:28},
    {name:'Repair Bay #3', x:68, y:28},
    {name:'Repair Bay #4', x:52, y:28},
    {name:'Shop Event', x:36, y:28},
    {name:'Repair Bay #5', x:20, y:28},
    {name:'Training Room', x:8, y:28},
    {name:'Repair Bay #6', x:8, y:44},
    {name:'Tool Crate', x:20, y:44},
    {name:'Parts Counter', x:36, y:44},
    {name:'Shop Event', x:52, y:44},
    {name:'Road Test', x:68, y:44},
    {name:'Repair Bay Flex', x:84, y:44},
    {name:'Return Loop', x:84, y:64},
    {name:'Clock Out', x:68, y:64},
    {name:'Finish', x:52, y:64},
    {name:'Extra', x:36, y:64},
    {name:'Extra', x:20, y:64},
    {name:'Extra', x:8, y:64}
  ];

  const REPAIRS = [
    {id:'r1',title:'Oil Change & Filter',difficulty:1,tools:['Oil Filter Wrench','Drain Pan'],parts:1,reward:1,note:'Dispose oil safely.'},
    {id:'r2',title:'Tire Mount & Balance',difficulty:2,tools:['Tire Balancer','Tire Iron / Mount Tool'],parts:1,reward:2,note:'Torque lug nuts to spec.'},
    {id:'r3',title:'Brake Pad Replacement (Front)',difficulty:2,tools:['Ratchet Set','Torque Wrench'],parts:1,reward:2,note:'Bleed if necessary.'},
    {id:'r4',title:'Check Engine Light Diagnosis',difficulty:3,tools:['Scan Tool','Multimeter'],parts:1,reward:3,note:'Document findings.'}
  ];
  const TOOLS = ['Scan Tool','Torque Wrench','Impact Gun','Multimeter','Tire Balancer','Tire Iron / Mount Tool','Brake Bleeder Kit','Battery Tester','Alignment Gauge','Coolant Funnel'];
  const EVENTS = [
    {id:'e1',title:'Stripped Bolt',effect:'lose_turn',text:'Lose 1 turn.'},
    {id:'e2',title:'Supervisor Praise',effect:'gain_rp',value:1,text:'Gain 1 RP.'},
    {id:'e3',title:'Tool Malfunction',effect:'discard_tool',text:'Discard a tool.'},
    {id:'e4',title:'Lucky Find',effect:'gain_part',text:'Gain 1 part.'}
  ];

  let state = {players:[],current:0,decks:{rep:[],tool:[],ev:[]},piles:{},phase:'idle'};

  function $(id){return document.getElementById(id)}
  function log(txt){
    const el = $('log');
    const d = document.createElement('div');
    d.textContent = (new Date()).toLocaleTimeString() + ' — ' + txt;
    el.prepend(d);
  }

  function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

  function initDecks(){
    state.decks.rep = shuffle(REPAIRS.slice());
    state.decks.tool = shuffle(TOOLS.slice());
    state.decks.ev = shuffle(EVENTS.slice());
    state.piles = {rep:[],tool:[],ev:[]};
  }

  function createPlayers(n){
    state.players = [];
    for(let i=0;i<n;i++){
      state.players.push({id:i,name:'Player '+(i+1),pos:0,tools:[],parts:1,completed:[],rp:0,skip:false,queued:null});
    }
    state.current = 0;
  }

  function renderTokens(){
    const container = $('tokens'); container.innerHTML='';
    state.players.forEach(p=>{
      const div = document.createElement('div');
      div.className='token';
      div.id='token_'+p.id;
      div.style.left = SPACES[p.pos].x + '%';
      div.style.top = (SPACES[p.pos].y - 3) + '%';
      div.style.transform='translate(-50%,-50%)';
      const img = document.createElement('img'); img.src='assets/tokens/token'+(p.id+1)+'.svg';
      div.appendChild(img);
      container.appendChild(div);
    });
  }

  function updateSidebar(){
    const p = state.players[state.current];
    $('turnInfo').textContent = 'Turn: ' + p.name;
    $('lastRoll').textContent = 'Last Roll: -';
    $('tools').textContent = p.tools.join(', ') || '-';
    $('parts').textContent = 'Parts: ' + p.parts;
  }

  function newGame(){
    const n = parseInt($('playerCount').value,10)||4;
    createPlayers(n);
    initDecks();
    state.players.forEach(p=>{
      p.tools=[];
      p.parts=1;
      for(let i=0;i<2;i++){ drawTool(p); }
      p.completed=[]; p.rp=0; p.pos=0; p.skip=false;
    });
    renderTokens(); updateSidebar(); log('New game started with '+n+' players.');
  }

  function drawTool(player){
    if(state.decks.tool.length===0){ state.decks.tool = shuffle(state.piles.tool); state.piles.tool=[]; }
    if(state.decks.tool.length===0) return;
    const t = state.decks.tool.pop();
    player.tools.push(t);
    log(player.name + ' drew tool: ' + t);
  }

  function drawRepair(){
    if(state.decks.rep.length===0){ state.decks.rep = shuffle(state.piles.rep); state.piles.rep=[]; }
    if(state.decks.rep.length===0) return null;
    return state.decks.rep.pop();
  }

  function drawEvent(){
    if(state.decks.ev.length===0){ state.decks.ev = shuffle(state.piles.ev); state.piles.ev=[]; }
    if(state.decks.ev.length===0) return null;
    return state.decks.ev.pop();
  }

  function rollDice(){
    const p = state.players[state.current];
    if(p.skip){ log(p.name + ' is skipping this turn.'); p.skip=false; nextPlayer(); return; }
    const roll = Math.floor(Math.random()*6)+1;
    $('lastRoll').textContent = 'Last Roll: ' + roll;
    log(p.name + ' rolled ' + roll);
    p.pos = (p.pos + roll) % SPACES.length;
    renderTokens();
    const sp = SPACES[p.pos];
    log(p.name + ' landed on ' + sp.name);
    handleSpace(sp,p);
    updateSidebar();
  }

  function handleSpace(sp,player){
    const name = sp.name.toLowerCase();
    if(name.includes('repair')){
      const card = drawRepair();
      if(card) showRepairModal(card,player);
    } else if (name.includes('tool')){
      drawTool(player); updateSidebar();
    } else if (name.includes('parts')){
      player.parts +=1; log(player.name + ' gained a Part Token (now '+player.parts+')'); updateSidebar();
    } else if (name.includes('shop event')){
      const e = drawEvent(); if(e) resolveEvent(e,player);
    } else if (name.includes('training')){
      state.players.forEach(pl=>drawTool(pl)); log('Training: all players draw a tool.');
      updateSidebar();
    } else if (name.includes('clock out')){
      if(player.completed.length>=5){ showMessage(player.name + ' completed 5 repairs! Return to Clock Out to win.'); }
      else showMessage('Complete 5 repairs before clocking out. Completed: ' + player.completed.length);
    }
  }

  function showRepairModal(card,player){
    const modal = $('modal'); const body = $('modalBody'); body.innerHTML='';
    const h = document.createElement('h3'); h.textContent = card.title; body.appendChild(h);
    const p = document.createElement('p'); p.textContent = 'Req Tools: ' + (card.tools||[]).join(', ') + ' | Parts: ' + card.parts; body.appendChild(p);
    const btnA = document.createElement('button'); btnA.textContent='Attempt Repair'; btnA.onclick=function(){ attemptRepair(card,player); closeModal(); };
    const btnS = document.createElement('button'); btnS.textContent='Store Card'; btnS.onclick=function(){ player.queued = card; state.piles.rep.push(card); log(player.name + ' stored ' + card.title); closeModal(); };
    body.appendChild(btnA); body.appendChild(btnS);
    openModal();
  }

  function attemptRepair(card,player){
    if(player.parts < (card.parts||0)){ log(player.name + ' lacks parts'); player.skip=true; return; }
    const required = card.tools || [];
    const hasAll = required.every(r=> player.tools.some(t=> t.toLowerCase() === r.toLowerCase()));
    if(!hasAll){ log(player.name + ' lacks tools; skip next turn'); player.skip=true; return; }
    player.parts -= card.parts||0;
    player.completed.push(card.id||card.title);
    player.rp += card.reward||1;
    state.piles.rep.push(card);
    log(player.name + ' completed ' + card.title + ' (+'+(card.reward||1)+' RP). Total RP: '+player.rp);
    if((card.title.toLowerCase().includes('brake')||card.title.toLowerCase().includes('wheel')) && player.tools.includes('Torque Wrench')){ player.rp +=1; log(player.name + ' earned +1 bonus RP for torque use.'); }
    if(player.completed.length >= 5){ showMessage(player.name + ' has completed 5 repairs. Return to Clock Out to win.'); }
  }

  function resolveEvent(e,player){
    log('Event: ' + e.title + ' — ' + e.text);
    if(e.effect==='lose_turn') player.skip=true;
    if(e.effect==='gain_rp') player.rp += e.value||1;
    if(e.effect==='discard_tool'){ if(player.tools.length>0){ const d = player.tools.pop(); state.piles.tool.push(d); log(player.name + ' discarded tool: '+d);} else player.skip=true; }
    if(e.effect==='gain_part') player.parts +=1;
  }

  function openModal(){ $('modal').style.display='flex'; $('modal').setAttribute('aria-hidden','false'); }
  function closeModal(){ $('modal').style.display='none'; $('modal').setAttribute('aria-hidden','true'); }
  function showMessage(msg){ const body = $('modalBody'); body.innerHTML = '<p>'+msg+'</p>'; openModal(); }

  function nextPlayer(){ state.current = (state.current+1) % state.players.length; renderTokens(); updateSidebar(); log('Turn: ' + state.players[state.current].name); }

  // UI bindings
  function bind(){
    $('newGame').addEventListener('click', newGame);
    $('rollBtn').addEventListener('click', rollDice);
    $('drawTool').addEventListener('click', ()=>{ drawTool(state.players[state.current]); updateSidebar(); });
    $('attemptRepair').addEventListener('click', ()=>{ const p=state.players[state.current]; if(p.queued){ attemptRepair(p.queued,p); p.queued=null; updateSidebar(); } else log('No stored repair.'); });
    $('closeModal').addEventListener('click', closeModal);
  }

  document.addEventListener('DOMContentLoaded', ()=>{ bind(); newGame(); });
})();
