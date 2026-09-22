const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx=vm.createContext({console,assert,choose:async(t,items)=>items[0]});
vm.runInContext(fs.readFileSync('dist/cards.js','utf8')+'\n'+fs.readFileSync('dist/engine.js','utf8'),ctx);
vm.runInContext(`(async()=>{
const id=n=>CARDS.find(c=>c.name===n).id;
function baseline(){fresh();S.deck.push(...S.setupHands.flat());S.setupHands=[[],[]];S.phase='slide';fillMarket()}
baseline();assert.equal(CARDS.length,52);assert.equal(S.market.length,5);
let original=S.players[0].timer.map(t=>t.sign).concat(S.players[0].outside).sort();for(let i=0;i<6;i++){S.phase='slide';await slide();assert.deepEqual(S.players[0].timer.map(t=>t.sign).concat(S.players[0].outside).sort(),original)}
baseline();let g=instance(id('Goblin'),0);S.players[0].timer[0].cards.push(g);await slide();assert(S.board.includes(g));assert.equal(g.zone,0);assert.equal(S.players[0].outside,'Fast');S.phase='activate';assert(eligible(g));await activate(g,'move');assert.equal(g.zone,1);assert(!eligible(g));
baseline();let a=instance(id('Goblin'),0),b=instance(id('Elf'),0);S.players[0].timer[1].cards.push(a);S.players[0].timer[4].cards.push(b);S.phase='action';await accelerate([a.uid,b.uid]);assert(S.board.includes(a));assert(S.players[0].timer[2].cards.includes(b));assert.equal(S.phase,'activate');
baseline();let ph=instance(id('Phenix'),0);S.board.push(ph);damage(ph,2);assert(!S.board.includes(ph));assert(S.players[0].timer[2].cards.includes(ph));assert.equal(ph.damage,0);
baseline();let dragon=instance(id('Dragon'),0);dragon.zone=2;S.board.push(dragon);S.players[1].hp=5;await attack(dragon);assert.equal(S.winner,0);
baseline();for(let n of ['School of Magic','Protection Wall','Hospital','Tree of life'])S.board.push(instance(id(n),0));victory();assert.equal(stars(0),10);assert.equal(S.winner,0);
baseline();let e=instance(id('Elf'),0),leader=instance(id('Shield leader'),1),target=instance(id('Goblin'),1);e.zone=target.zone=leader.zone=1;S.board.push(e,leader,target);assert(!targets(e).includes(target));assert(targets(e).includes(leader));
baseline();let wall=instance(id('Protection Wall'),1),d=instance(id('Dragon'),0);d.zone=2;S.board.push(d,wall);assert(!canCastle(d));kill(wall);assert(canCastle(d));
baseline();S.board.push(instance(id('Tree of life'),0));assert.equal(cost(id('Elf recruit'),0),1);assert.equal(cost(id('Elf'),0),2);
baseline();S.phase='action';let wind=instance(id('WInd of change'),0);S.players[0].timer[0].cards.push(wind);await accelerate([wind.uid]);assert.equal(S.actions,2);assert.equal(S.phase,'action');
// Every card's special/spell resolves in a populated state without throwing.
for(let card of CARDS){baseline();let c=instance(card.id,0);S.board.push(c);for(let n of ['Goblin','Elf','Guard','Dragon','Protection Wall']){let x=instance(id(n),1);x.zone=1;x.damage=0;S.board.push(x)}let ally=instance(id('Elf'),0);ally.damage=1;S.board.push(ally);S.players[0].timer[3].cards.push(instance(id('Goblin'),0),instance(id('Elf'),0),instance(id('Mason'),0));S.grave[0].push(instance(id('Goblin'),0));S.phase='activate';if(card.type==='Sorcery')await spell(c);if(SPECIAL.includes(card.name))await ability(c)}
console.log('PASS: 52 cards, tile cycle, recruitment timing, acceleration, activation, Phenix, combat protection, discounts, extra actions, both victories and all special effect paths.');
})()`,ctx).catch(e=>{console.error(e);process.exitCode=1});
