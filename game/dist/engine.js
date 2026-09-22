'use strict';
const NAMES=['Jade','Amber'], COLORS=['Red','Green','Blue','White'], SIGNS={Fast:'ϟ',Medium:'◈',Slow:'◷',Perm:'∞'};
let S, sequence=0;
const def=c=>CARDS[c.id], named=(c,n)=>def(c).name.toLowerCase()===n.toLowerCase(), color=(c,v)=>def(c).color===v||def(c).color==='Multi', creature=c=>def(c).type==='Creature', building=c=>def(c).type==='Building';
const own=(p)=>S.board.filter(c=>c.owner===p), units=p=>own(p).filter(creature), waiting=p=>S.players[p].timer.flatMap(t=>t.cards), controlled=p=>[...own(p),...waiting(p)], active=c=>!c.disabledBy||!S.board.some(x=>x.uid===c.disabledBy), has=(p,n)=>own(p).some(c=>named(c,n)&&active(c)), copies=(p,n)=>own(p).filter(c=>named(c,n)&&active(c)).length;
function speed(c){if(def(c).type==='Sorcery')return 'Instant';let e=def(c).effect;if(named(c,'Catapult'))return 'Fast';return e.includes('Slow')?'Slow':e.includes('Medium')?'Medium':e.includes('Fast')?'Fast':'Perm'}
function log(t){S.log.unshift(t);S.log=S.log.slice(0,50)}
function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function instance(id,owner){return {id,owner,uid:++sequence,damage:0,zone:owner===0?0:2,used:0,bonus:0}}
function fresh(){sequence=0;S={version:1,turn:1,p:0,phase:'setup',setupHands:[],setupPlayed:0,actions:1,board:[],deck:shuffle(CARDS.map(c=>c.id)),market:[],grave:[[],[]],discard:[],players:[0,1].map(()=>({hp:10,timer:['Fast','Medium','Fast','Slow','Medium'].map(sign=>({sign,cards:[]})),outside:'Fast',forced:null})),log:[],winner:null};S.setupHands=[S.deck.splice(-4),S.deck.splice(-4)];log('Setup: Jade chooses 2 of the 4 drawn cards.');return S}
// Timer positions are one-based; overflow always searches toward time 5.
function timerSlot(p,step,ignoreUid=null){for(let i=step-1;i<5;i++)if(S.players[p].timer[i].cards.filter(c=>c.uid!==ignoreUid).length<2)return i+1;return null}
function placeOnTimer(c,step){const actual=timerSlot(c.owner,step);if(actual===null)return null;S.players[c.owner].timer[actual-1].cards.push(c);if(actual!==step)log(def(c).name+' moves to time '+actual+': time '+step+' is full.');return actual}
function canRecruit(id,p=S.p){return timerSlot(p,cost(id,p))!==null}
function setupPlay(id){
 if(S.phase!=='setup'||!S.setupHands[S.p].includes(id))return;
 const hand=S.setupHands[S.p],step=timerSlot(S.p,cost(id,S.p));
 if(step===null){log('No free timer slot at or above this cost.');return;}
 hand.splice(hand.indexOf(id),1);
 placeOnTimer(instance(id,S.p),step);
 S.setupPlayed++;
 log(NAMES[S.p]+' prepares '+CARDS[id].name+' at time '+step+' during setup.');
 if(S.setupPlayed===2){
  S.discard.push(...hand.splice(0));
  log(NAMES[S.p]+' discards the other 2 cards.');
  S.setupPlayed=0;
  if(S.p===0){S.p=1;log('Setup: Amber chooses 2 of the 4 drawn cards.');}
  else {S.p=0;S.phase='slide';fillMarket();log('Setup complete. Jade takes the first turn.');}
 }
}
function fillMarket(){while(S.market.length<5){if(!S.deck.length){if(!S.discard.length)break;S.deck=shuffle(S.discard.splice(0))}S.market.push(S.deck.pop())}}
function cost(id,p){let d=CARDS[id],n=d.cost==='X'?5-controlled(p).filter(c=>creature(c)&&color(c,'Green')).length:Number(d.cost??4);n-=copies(p,'Secret passages');if(d.color==='Green'||d.color==='Multi')n-=copies(p,'Tree of life');return Math.max(1,Math.min(5,n))}
function stars(p){return own(p).reduce((n,c)=>n+((has(0,'Parlement')||has(1,'Parlement'))&&creature(c)?0:def(c).stars),0)}
function victory(){if(S.winner!==null)return;for(let p=0;p<2;p++)if(S.players[1-p].hp<=0||stars(p)>=10){S.winner=p;log(NAMES[p]+' wins!');break}}
function attackValue(c){let a=def(c).attack;return (a==='X'?controlled(c.owner).filter(x=>creature(x)&&color(x,'Red')).length:Number(a))+copies(c.owner,'Armory')}
function kill(c){S.board=S.board.filter(x=>x.uid!==c.uid);log(def(c).name+' is destroyed.');if(named(c,'Phenix')){c.damage=0;c.used=0;c.bonus=0;delete c.disabledBy;const step=placeOnTimer(c,3);if(step!==null)log('Phenix returns at time '+step+'.');else{S.grave[c.owner].push(c);log('Phenix cannot return: times 3–5 are full. It stays in the graveyard.')}}else S.grave[c.owner].push(c)}
function damage(c,n){c.damage+=n;if(c.damage>=def(c).life)kill(c)}
async function pick(title,items,label){if(!items.length){log('No valid target: '+title);return null}return await choose(title,items,label)}
async function heal(p,n,mode='creatures'){for(let i=0;i<n;i++){let list=own(p).filter(c=>(mode==='creatures'?creature(c):building(c))&&c.damage>0);if(mode==='buildings'&&S.players[p].hp<10)list.push({tower:true,owner:p});let c=await pick('Heal: choose where to remove 1 damage',list,x=>x.tower?'Castle · '+S.players[p].hp+'/10':def(x).name+' · '+x.damage+' damage');if(!c)break;if(c.tower)S.players[p].hp++;else c.damage--}}
async function advance(c,steps){let p=c.owner,t=S.players[p].timer;let i=t.findIndex(x=>x.cards.some(y=>y.uid===c.uid));if(i<0)return;t[i].cards=t[i].cards.filter(x=>x.uid!==c.uid);if(i-steps<0)await enter(c);else placeOnTimer(c,i-steps+1)}
async function enter(c){if(S.winner!==null)return;log(def(c).name+' leaves the timer of '+NAMES[c.owner]+'.');if(def(c).type==='Sorcery'){await spell(c);S.discard.push(c.id);return}c.zone=has(c.owner,'Trenches')&&creature(c)?1:c.owner===0?0:2;c.used=0;c.bonus=0;S.board.push(c);victory();if(S.winner!==null)return;if(creature(c)){
 for(let i=0;i<copies(c.owner,'Outpost')&&color(c,'Red');i++){let t=await pick('Outpost: deal 1 damage',own(1-c.owner),x=>def(x).name);if(t)damage(t,1)}
 for(let i=0;i<copies(c.owner,'Dolmen')&&color(c,'Blue');i++){let t=await pick('Dolmen: advance a card by 1',waiting(c.owner),x=>def(x).name);if(t)await advance(t,1)}
 for(let i=0;i<copies(c.owner,'Temple of Benediction')&&color(c,'White');i++)await heal(c.owner,1);
}victory()}
async function slide(){if(S.phase!=='slide')return;let p=S.players[S.p],exit=p.timer.shift();p.timer.push({sign:p.outside,cards:[]});p.outside=exit.sign;S.phase='action';S.actions=1;log(NAMES[S.p]+': slide, symbol '+exit.sign+'.');for(let c of exit.cards)await enter(c);for(let i=0;i<copies(S.p,'Hospital');i++)await heal(S.p,1);victory()}
function spend(){S.actions--;if(S.actions<=0)S.phase='activate';S.players[S.p].forced=null;victory()}
async function recruit(id){if(S.phase!=='action'||S.players[S.p].forced==='accelerate')return;let i=S.market.indexOf(id);if(i<0)return;let step=timerSlot(S.p,cost(id,S.p));if(step===null){log('No free timer slot at or above this cost.');return}S.market.splice(i,1);placeOnTimer(instance(id,S.p),step);fillMarket();log(NAMES[S.p]+' prepares '+CARDS[id].name+' at time '+step+'.');spend()}
async function accelerate(ids){if(S.phase!=='action'||S.players[S.p].forced==='recruit'||ids.length<1||ids.length>2||new Set(ids).size!==ids.length)return;let cards=ids.map(id=>waiting(S.p).find(c=>c.uid===id));if(cards.some(c=>!c))return;for(let c of cards)await advance(c,2);log(NAMES[S.p]+' accelerates '+cards.length+' cards by 2 spaces.');spend()}
function eligible(c){return S.phase==='activate'&&c.owner===S.p&&active(c)&&(c.bonus>0||(!c.used&&speed(c)===S.players[S.p].outside))}
function targets(c){let foe=1-c.owner,range=named(c,'Elf archer')?1:0;return own(foe).filter(t=>{if(Math.abs(t.zone-c.zone)>range)return false;if(creature(t))return !units(foe).some(x=>x.uid!==t.uid&&x.zone===t.zone&&named(x,'Shield leader')&&active(x));return !has(foe,'Decoy')&&(!has(foe,'Protection Wall')||named(t,'Protection Wall'))})}
function canCastle(c){return creature(c)&&c.zone===(c.owner===0?2:0)&&!has(1-c.owner,'Decoy')&&!has(1-c.owner,'Protection Wall')}
async function attack(c){let list=targets(c);if(canCastle(c))list.push({tower:true,owner:1-c.owner});let t=await pick('Choose a target for '+def(c).name,list,x=>x.tower?'Castle '+NAMES[x.owner]:def(x).name+' · '+(def(x).life-x.damage)+' life');if(!t)return false;let n=attackValue(c);if(t.tower){if(has(t.owner,'Magic Shield'))n=Math.min(2,n);S.players[t.owner].hp=Math.max(0,S.players[t.owner].hp-n)}else damage(t,n);log(def(c).name+' deals '+n+' damage to '+(t.tower?'Castle '+NAMES[t.owner]:def(t).name)+'.');victory();return true}
async function move(c){let dest=[c.zone-1,c.zone+1].filter(z=>z>=0&&z<=2);let z=await pick('Move '+def(c).name,dest,x=>['Jade zone','Center','Amber zone'][x]);if(z===null)return false;c.zone=z;log(def(c).name+' moves to '+['Jade zone','center','Amber zone'][z]+'.');return true}
function bonus(list){for(let c of list)c.bonus++;log(list.length+' cards gain an extra activation.')}
async function spell(c){let p=c.owner,n=def(c).name.toLowerCase(),v,t;
 switch(n){
 case 'fireball':v=await pick('Fireball: choose a zone',[0,1,2],z=>['Jade zone','Center','Amber zone'][z]);if(v!==null)for(let x of [...units(1-p)].filter(x=>x.zone===v))damage(x,2);break;
 case 'selective bombing':v=await pick('Selective bombing: choose a color',COLORS,x=>x);if(v)for(let x of [...S.board].filter(x=>creature(x)&&color(x,v)))damage(x,2);break;
 case 'regeneration':await heal(p,3);break;
 case 'rebuilt':await heal(p,3,'buildings');break;
 case 'time spiral':for(let x of [...units(p)].filter(x=>color(x,'Blue')))await move(x);for(let x of [...waiting(p)].filter(x=>creature(x)&&color(x,'Blue')))await advance(x,1);break;
 case 'wind of change':S.actions+=2;break;
 case 'final assault':bonus(units(p).filter(x=>color(x,'Red')));break;
 case 'mystical force':v=await pick('Mystical force: choose a color',COLORS,x=>x);if(v)bonus(units(p).filter(x=>color(x,v)));break;
 case 'harmony':{let used=[];for(let col of COLORS){t=await pick('Harmony: card color '+col,waiting(p).filter(x=>color(x,col)&&!used.includes(x.uid)),x=>def(x).name);if(t){used.push(t.uid);await advance(t,1)}}break;}
 case 'révolution':for(let x of [...units(p)].filter(x=>!def(x).stars)){if(S.winner!==null)break;await attack(x)}break;
 }victory()
}
const SPECIAL=['Apprentice','Druid','Master of time','Mason','Lumberjack','Necromancer','School of Magic','Source of growth','Manipulator','Magnetic force','Catapult','Monolith','Saboteur'];
async function ability(c){let p=c.owner,n=def(c).name,t,v;
 switch(n){
 case 'Apprentice':t=await pick('Activate another blue creature',units(p).filter(x=>x.uid!==c.uid&&color(x,'Blue')&&!named(x,'Apprentice')),x=>def(x).name);if(t)bonus([t]);break;
 case 'Druid':if(timerSlot(p,5)===null){log('Druid: time 5 is full.');break}v=await pick('Druid: green creature from the market',S.market.filter(id=>CARDS[id].type==='Creature'&&['Green','Multi'].includes(CARDS[id].color)),id=>CARDS[id].name);if(v!==null){S.market.splice(S.market.indexOf(v),1);placeOnTimer(instance(v,p),5);fillMarket()}break;
 case 'Master of time':v=await pick('Choose a timer',[0,1],x=>NAMES[x]);if(v!==null){t=await pick('First card to swap',waiting(v),x=>def(x).name);if(t){let b=await pick('Second card to swap',waiting(v).filter(x=>x.uid!==t.uid),x=>def(x).name);if(b){let tr=S.players[v].timer,a=tr.find(x=>x.cards.includes(t)),z=tr.find(x=>x.cards.includes(b));a.cards[a.cards.indexOf(t)]=b;z.cards[z.cards.indexOf(b)]=t}}}break;
 case 'Mason':t=await pick('Advance a building by 1',waiting(p).filter(building),x=>def(x).name);if(t)await advance(t,1);break;
 case 'Lumberjack':await heal(p,1,'buildings');break;
 case 'Necromancer':if(timerSlot(p,2)===null){log('Necromancer: no free slot at times 2–5.');break}t=await pick('Return a creature to time 2',S.grave[p].filter(creature),x=>def(x).name);if(t){S.grave[p]=S.grave[p].filter(x=>x.uid!==t.uid);placeOnTimer(instance(t.id,p),2)}break;
 case 'School of Magic':t=await pick('Disable an enemy building',own(1-p).filter(building),x=>def(x).name);if(t)t.disabledBy=c.uid;break;
 case 'Source of growth':S.actions++;S.phase='action';break;
 case 'Manipulator':v=await pick('Choose the next enemy action',['recruit','accelerate'],x=>x==='recruit'?'Take a card':'Accelerate');S.players[1-p].forced=v;break;
 case 'Magnetic force':t=await pick('Move a creature',S.board.filter(creature),x=>def(x).name+' · '+NAMES[x.owner]);if(t)await move(t);break;
 case 'Catapult':t=await pick('Catapult: deal 1 damage to a creature',units(1-p),x=>def(x).name);if(t)damage(t,1);break;
 case 'Monolith':{let done=[];for(let i=0;i<2;i++){t=await pick('Monolith: move a creature by 1',S.board.filter(x=>creature(x)&&!done.includes(x.uid)),x=>def(x).name+' · '+NAMES[x.owner]);if(t){done.push(t.uid);await move(t)}}break;}
 case 'Saboteur':t=await pick('Sabotage a building in the same zone',own(1-p).filter(x=>building(x)&&x.zone===c.zone),x=>def(x).name);if(t){kill(t);kill(c)}break;
 }log(def(c).name+' uses its ability.');victory()
}
async function activate(c,mode){if(!eligible(c))return;let ok=true;if(mode==='move')ok=await move(c);if(mode==='attack')ok=await attack(c);if(mode==='special')await ability(c);if(mode==='heal')await heal(c.owner,2);if(mode==='elf'){ok=await move(c);if(ok)await attack(c)}if(ok){if(c.bonus)c.bonus--;else c.used=1}victory()}
async function steal(c){if(S.phase!=='action'||!named(c,'Mercenary')||c.owner===S.p||S.players[S.p].forced)return;if(timerSlot(S.p,2)===null){log('Cannot recruit Mercenary: no free slot at times 2–5.');return}S.board=S.board.filter(x=>x.uid!==c.uid);for(let p of S.players)for(let t of p.timer)t.cards=t.cards.filter(x=>x.uid!==c.uid);c.owner=S.p;c.damage=0;c.used=0;c.bonus=0;placeOnTimer(c,2);log(NAMES[S.p]+' recruits the enemy Mercenary.');spend()}
function endTurn(){if(S.phase!=='activate')return;S.p=1-S.p;S.turn++;S.phase='slide';S.actions=1;for(let c of S.board){c.used=0;c.bonus=0}log('Turn '+S.turn+': '+NAMES[S.p]+'.')}
