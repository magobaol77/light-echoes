const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx=vm.createContext({assert,console,choose:async(t,items)=>items[0]});
vm.runInContext(fs.readFileSync('dist/cards.js','utf8')+'\n'+fs.readFileSync('dist/engine.js','utf8'),ctx);
vm.runInContext(`(async()=>{
const id=n=>CARDS.find(c=>c.name===n).id;
function reset(){fresh();S.phase='action';S.market=[id('Elf')];}
function fill(step){placeOnTimer(instance(id('Goblin'),0),step);placeOnTimer(instance(id('Guard'),0),step)}
reset();fill(3);await recruit(id('Elf'));assert.equal(S.players[0].timer[2].cards.length,2);assert.equal(S.players[0].timer[3].cards[0].id,id('Elf'));
reset();fill(3);fill(4);await recruit(id('Elf'));assert.equal(S.players[0].timer[4].cards[0].id,id('Elf'));
reset();fill(3);fill(4);fill(5);const before=JSON.stringify({market:S.market,deck:S.deck,timer:S.players[0].timer,actions:S.actions});await recruit(id('Elf'));assert.equal(JSON.stringify({market:S.market,deck:S.deck,timer:S.players[0].timer,actions:S.actions}),before);assert.equal(S.phase,'action');
reset();fill(1);fill(2);let c=instance(id('Elf'),0);placeOnTimer(c,3);await advance(c,2);assert(S.players[0].timer[2].cards.includes(c));assert(S.players[0].timer.every(t=>t.cards.length<=2));
reset();fill(3);let ph=instance(id('Phenix'),0);S.board.push(ph);kill(ph);assert(S.players[0].timer[3].cards.includes(ph));
reset();fill(3);fill(4);fill(5);ph=instance(id('Phenix'),0);S.board.push(ph);kill(ph);assert(S.grave[0].includes(ph));assert(S.players[0].timer.every(t=>t.cards.length<=2));
reset();fill(5);let druid=instance(id('Druid'),0);S.board.push(druid);let market=JSON.stringify(S.market);await ability(druid);assert.equal(JSON.stringify(S.market),market);
reset();fill(2);let necro=instance(id('Necromancer'),0),dead=instance(id('Elf'),0);S.grave[0].push(dead);await ability(necro);assert.equal(S.players[0].timer[2].cards[0].id,id('Elf'));
reset();fill(2);let merc=instance(id('Mercenary'),1);S.board.push(merc);await steal(merc);assert(S.players[0].timer[2].cards.includes(merc));assert.equal(merc.owner,0);
console.log('PASS: capacity 2, upward overflow, full timer rejection without card/action loss, blocked acceleration, Phenix, Druid, Necromancer and Mercenary.');
})()`,ctx).catch(e=>{console.error(e);process.exitCode=1});
