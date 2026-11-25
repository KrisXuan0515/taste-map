/* temp smoke: own-source model (ASCII only) */
const fs = require('fs'), vm = require('vm'), path = require('path');
const dir = __dirname;

function El(tag) {
  const e = {
    tagName: tag, className: '', innerHTML: '', textContent: '', value: '',
    dataset: {}, style: {}, children: [], scrollTop: 0,
    clientWidth: 380, clientHeight: 240,
    classList: { _s: new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);}, contains(c){return this._s.has(c);}, toggle(c,on){on?this._s.add(c):this._s.delete(c);} },
    appendChild(c){this.children.push(c);return c;}, removeChild(c){this.children=this.children.filter(x=>x!==c);},
    remove(){}, setAttribute(){}, getAttribute(){return null;},
    addEventListener(){}, removeEventListener(){},
    querySelector(){return El('div');}, querySelectorAll(){return [];}, closest(){return null;},
    getBoundingClientRect(){return {left:0,top:0,width:380,height:240};},
    setPointerCapture(){}, releasePointerCapture(){}, focus(){}, blur(){}
  };
  return e;
}
const nodes = {};
['#view', '#sheet-root', '#toast', '#map'].forEach(s => { nodes[s] = El('div'); });
const document = {
  querySelector(s){ return nodes[s] || (s === '.sheet' ? null : El('div')); },
  querySelectorAll(){ return []; },
  createElement(t){ return El(t); },
  addEventListener(){}, body: El('body'), documentElement: El('html')
};
const store = {};
/* pre-seed an OLD archive: b_me blogger + a place pointing at it */
store['tasteMap.v2'] = JSON.stringify({
  city: '\u4e0a\u6d77',
  me: { price: 2, scenes: [], categories: [] },
  bloggers: [{ id: 'b_me', name: 'me-old', color: '#6B6355', hits: { good: 0, total: 0 } },
             { id: 'b_old', name: 'old', color: '#111', hits: { good: 0, total: 0 } }],
  places: [{ id: 'p_old', name: 'oldshop', lat: 31.22, lng: 121.46, bloggerId: 'b_me', kind: 'eat' }],
  visits: [], want: [], hidden: [], deleted: []
});
const localStorage = { getItem(k){ return k in store ? store[k] : null; }, setItem(k,v){ store[k]=String(v); }, removeItem(k){ delete store[k]; } };
const ctx = {
  console, setTimeout, clearTimeout, Math, Date, JSON, RegExp, String, Number, Array, Object, Boolean, isFinite, parseInt, parseFloat, encodeURIComponent,
  document, localStorage,
  location: { protocol: 'https:', hostname: 'x' },
  navigator: { geolocation: { getCurrentPosition(ok){ ok({ coords: { latitude: 31.2215, longitude: 121.4692, accuracy: 20 } }); } }, clipboard: { readText(){ return Promise.resolve(''); } } },
  requestAnimationFrame(f){ f(); }, addEventListener(){}, open(){}, confirm(){ return true; }, alert(){},
  Blob: function(){}, URL: { createObjectURL(){ return 'x'; }, revokeObjectURL(){} },
  Image: function(){ this.style={}; this.className=''; this.src=''; this.addEventListener=function(){}; this.remove=function(){}; this.complete=false; this.naturalWidth=256; }
};
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
['data.js', 'extra.js', 'app.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f }));

const tm = ctx.__tm, S = tm.getS();
const HIT = String.fromCharCode(21629, 20013); /* mingzhong */
let fail = 0;
const ok = (name, cond) => { console.log((cond ? 'PASS ' : 'FAIL ') + name); if (!cond) fail++; };

/* migration: old b_me place becomes own, fake blogger removed */
const pOld = S.places.filter(p => p.id === 'p_old')[0];
ok('old b_me place -> own', pOld && pOld.own === true && pOld.bloggerId === '');
ok('b_me blogger removed', S.bloggers.filter(b => b.id === 'b_me').length === 0);
ok('real blogger kept', S.bloggers.filter(b => b.id === 'b_old').length === 1);

/* seed data: three places are own */
['p_chengfeng', 'p_shengxiangting', 'p_laodifang'].forEach(id => {
  const p = S.places.filter(x => x.id === id)[0];
  ok('seed own ' + id, !!p && p.own === true);
});

/* detail sheet: own place shows source block, no hit-rate */
tm.openPlace('p_chengfeng');
const ownSheet = nodes['#sheet-root'].innerHTML;
ok('own sheet has rec block', /class="rec"/.test(ownSheet));
ok('own sheet has no hit rate', ownSheet.indexOf(HIT) < 0);

tm.openPlace('p_taotaoju');
const bSheet = nodes['#sheet-root'].innerHTML;
ok('blogger sheet mentions hit rate name', /class="rec-hit"/.test(bSheet));

/* form: default selection is self */
tm.openPlaceForm(null);
const form = nodes['#sheet-root'].innerHTML;
ok('form has self option', /<option value="self" selected/.test(form));
tm.openPlaceForm(S.places.filter(p => p.id === 'p_taotaoju')[0]);
const form2 = nodes['#sheet-root'].innerHTML;
ok('edit blogger place not self', !/<option value="self" selected/.test(form2));

/* submit: 'self' -> own true */
const fakeForm = { dataset: { id: '' }, elements: {} };
const els = { name: { value: 'newshop' }, kind: { value: 'eat' }, city: { value: 'shanghai' }, category: { value: '' }, price: { value: '2' }, scene: { value: '' }, local: { value: '2' }, dish: { value: '' }, quote: { value: '' }, sourceUrl: { value: '' }, address: { value: '' }, region: { value: '' }, bloggerId: { value: 'self' }, lat: { value: '31.2' }, lng: { value: '121.4' }, srcPlatform: { value: '' }, srcRaw: { value: '' } };
['spicy','numb','sweet','salty','sour','rich','fresh','smoke','funky'].forEach(k => { els['t_' + k] = { value: '2.5' }; });
fakeForm.elements = els;
tm.submitPlace({ preventDefault(){}, target: fakeForm });
const added = S.places[0];
ok('submit self -> own true', added && added.own === true && added.bloggerId === '');

/* views still render */
['nearby', 'checkin', 'mine'].forEach(tab => {
  tm.state.tab = tab; tm.render();
  const h = nodes['#view'].innerHTML;
  ok('render ' + tab + ' clean', h.length > 500 && !/undefined|NaN/.test(h));
});
const mine = (function(){ tm.state.tab = 'mine'; tm.render(); return nodes['#view'].innerHTML; })();
ok('mine lists own places', mine.indexOf('p_chengfeng') >= 0);

console.log(fail ? '\nFAILED ' + fail : '\nALL PASS');
process.exit(fail ? 1 : 0);
