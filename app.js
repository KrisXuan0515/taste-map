/* 口味地图 · 应用逻辑
 * 无依赖，纯前端。数据存 localStorage。
 */
(function () {
  'use strict';

  /* ================= 常量 ================= */
  var KEY = 'tasteMap.v2';
  var OLD_KEY = 'tasteMap.v1';
  var CATEGORIES = ['面饭', '火锅', '烧烤', '小吃', '甜品', '咖啡', '家常菜'];
  var SCENES = ['一人食', '聚餐', '宵夜', '带长辈'];
  var PRICE = [['1', '人均 <50'], ['2', '人均 50–100'], ['3', '人均 100–200'], ['4', '人均 200+']];
  var FALLBACK = { lat: 31.2304, lng: 121.4737 };
  var TILE = 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}';

  /* 口味九维。w 是该维在总分里的权重：辣和咸容易「不能吃」，权重最高。 */
  var DIMS = [
    { k: 'spicy', n: '辣', w: 1.6, lo: '怕辣', hi: '无辣不欢' },
    { k: 'numb', n: '麻', w: 1.2, lo: '怕麻', hi: '藤椒上瘾' },
    { k: 'sweet', n: '甜', w: 1.2, lo: '不爱甜', hi: '嗜甜' },
    { k: 'salty', n: '咸', w: 1.5, lo: '清淡', hi: '重咸' },
    { k: 'sour', n: '酸', w: 0.8, lo: '不酸', hi: '嗜酸' },
    { k: 'rich', n: '油', w: 1.3, lo: '清爽', hi: '浓油赤酱' },
    { k: 'fresh', n: '鲜', w: 1.0, lo: '无所谓', hi: '追鲜' },
    { k: 'smoke', n: '锅气', w: 0.9, lo: '少烟', hi: '焦香' },
    { k: 'funky', n: '发酵', w: 0.9, lo: '不碰', hi: '越臭越香' }
  ];

  /* 三种模式的权重。hit 是博主命中率，终于进排序了。 */
  var MODES = {
    local: { label: '吃本地', w: { taste: 0.22, local: 0.46, prox: 0.20, hit: 0.12 }, tip: '先挑本地招牌，口味只做过滤' },
    me: { label: '跟我口味', w: { taste: 0.54, local: 0.14, prox: 0.20, hit: 0.12 }, tip: '先挑口味对得上的，本地特色加分' },
    half: { label: '对半', w: { taste: 0.38, local: 0.28, prox: 0.20, hit: 0.14 }, tip: '口味和本地各占一半' }
  };

  /* 「今儿这顿」：临时状态，过夜自动清空。画像管长期，它管此刻。 */
  var MOOD_DIMS = [
    { k: 'sweet', n: '甜的' }, { k: 'spicy', n: '辣的' }, { k: 'numb', n: '麻的' },
    { k: 'fresh', n: '鲜的 / 想喝汤' }, { k: 'rich', n: '浓的 / 油香' }, { k: 'smoke', n: '焦香 / 烤的' },
    { k: 'sour', n: '酸的' }, { k: 'funky', n: '臭的 / 发酵' }
  ];
  var MOOD_INTENT = [{ k: 'new', n: '想尝鲜' }, { k: 'safe', n: '想吃熟的' }];
  var MOOD_SCENE = [{ k: 'solo', n: '一个人' }, { k: 'two', n: '两个人' }, { k: 'group', n: '一桌人' }];
  var MOOD_HUNGER = [{ k: 'meal', n: '还不太饿' }, { k: 'starving', n: '很饿了' }];
  var MOOD_PRICE = [{ k: 0, n: '不限' }, { k: 1, n: '30 以内' }, { k: 2, n: '30–80' }, { k: 3, n: '80–150' }, { k: 4, n: '150+' }];

  /* 口味测试。直标尺给值，情境题做加减。 */
  var QUIZ = [
    { q: '你能吃多辣？', d: 'spicy', opts: [
      { t: '一点辣都不行，微辣都算辣', v: 0 },
      { t: '微辣可以，中辣就算了', v: 1.5 },
      { t: '中辣常点，加辣也行', v: 3 },
      { t: '无辣不欢，辣度拉满', v: 5 }
    ] },
    { q: '花椒、藤椒那种「麻」呢？', d: 'numb', opts: [
      { t: '不喜欢，麻到舌头没知觉很烦', v: 0.5 },
      { t: '一点点可以，别太冲', v: 2 },
      { t: '喜欢，藤椒鱼、椒麻鸡会点', v: 4 },
      { t: '越麻越好', v: 5 }
    ] },
    { q: '菜里的甜味？', d: 'sweet', opts: [
      { t: '咸的菜里放糖我接受不了', v: 0.5 },
      { t: '微微有点甜可以', v: 2 },
      { t: '喜欢甜口，红烧、糖醋都爱', v: 4 },
      { t: '越甜越开心', v: 5 }
    ] },
    { q: '咸淡偏好？', d: 'salty', opts: [
      { t: '越淡越好，咸了很难受', v: 0.5 },
      { t: '正常家常口味', v: 2 },
      { t: '稍微重一点更下饭', v: 3.5 },
      { t: '不咸吃不下', v: 5 }
    ] },
    { q: '油和浓度（红烧肉那种油亮）？', d: 'rich', opts: [
      { t: '清爽为主，油多会腻', v: 0.5 },
      { t: '正常做法就行', v: 2.5 },
      { t: '喜欢浓油赤酱、收过汁的', v: 4 },
      { t: '越油越香', v: 5 }
    ] },
    { q: '臭豆腐、酸笋、腐乳这类发酵味？', d: 'funky', opts: [
      { t: '闻到就躲', v: 0.5 },
      { t: '能吃，但不主动点', v: 2 },
      { t: '很爱，会专门找着吃', v: 4.5 }
    ] },
    { q: '内脏（毛肚、鸭血、脑花）？', d: 'funky', add: true, opts: [
      { t: '完全不碰', v: -1 },
      { t: '部分吃，毛肚鸭血可以', v: 0.5 },
      { t: '都吃，脑花也来', v: 1.5 }
    ] },
    { q: '烧烤、干锅那种烟火焦香？', d: 'smoke', opts: [
      { t: '不太爱，油烟味受不了', v: 0.5 },
      { t: '偶尔吃', v: 2.5 },
      { t: '很爱，锅气是灵魂', v: 4.5 }
    ] },
    { q: '「鲜」这件事你多在意？', d: 'fresh', opts: [
      { t: '无所谓，重口就行', v: 1 },
      { t: '正常', v: 2.5 },
      { t: '很在意，清蒸、高汤、鲜活', v: 4 },
      { t: '为一口鲜愿意跑远', v: 5 }
    ] },
    { q: '酸？', d: 'sour', opts: [
      { t: '不太喜欢酸', v: 0.5 },
      { t: '正常', v: 2 },
      { t: '喜欢，酸汤、酸辣都行', v: 4 }
    ] },
    { q: '平时多半怎么吃？', multi: 'scenes', opts: [
      { t: '一人食' }, { t: '聚餐' }, { t: '宵夜' }, { t: '带长辈' }
    ] },
    { q: '出门旅游，吃这件事你会？', travel: true, opts: [
      { t: '必吃当地招牌，来都来了', v: 'local' },
      { t: '口味优先，合我口味的才去', v: 'me' },
      { t: '一半一半', v: 'half' }
    ] },
    { q: '一顿饭人均接受多少？', price: true, opts: [
      { t: '< 50', v: 1 }, { t: '50–100', v: 2 }, { t: '100–200', v: 3 }, { t: '200+', v: 4 }
    ] }
  ];

  /* 四轴十六型。类型码只是壳，真正的数据是九维向量。 */
  var TYPES = {
    '浓甜冲猎': '重口猎手', '浓甜冲稳': '甜辣饭桶', '浓甜柔猎': '酱香探险', '浓甜柔稳': '红烧派',
    '浓咸冲猎': '江湖猎手', '浓咸冲稳': '下饭王', '浓咸柔猎': '油渣诗人', '浓咸柔稳': '老派本帮',
    '清甜冲猎': '清爽刺客', '清甜冲稳': '甜辣小白', '清甜柔猎': '蜜汁探索', '清甜柔稳': '白灼派',
    '清咸冲猎': '藤椒猎手', '清咸冲稳': '椒麻党', '清咸柔猎': '鲜咸老饕', '清咸柔稳': '原味派'
  };

  /* ================= 小工具 ================= */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function r1(v) { return String(Math.round(v * 10) / 10); }
  function distText(m) {
    if (m == null || !isFinite(m)) return '位置未知';
    return m < 1000 ? Math.round(m) + 'm' : (m / 1000).toFixed(1) + 'km';
  }
  function priceText(p) {
    for (var i = 0; i < PRICE.length; i++) if (PRICE[i][0] === String(p)) return PRICE[i][1];
    return '';
  }
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(t._tm);
    t._tm = setTimeout(function () { t.classList.remove('on'); }, 2100);
  }

  /* ================= 地理 ================= */
  var PI = Math.PI, AXIS = 6378245.0, EE = 0.00669342162296594323;

  function outOfChina(lat, lng) {
    return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
  }
  function tLat(x, y) {
    var r = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    r += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3;
    r += (20 * Math.sin(y * PI) + 40 * Math.sin(y / 3 * PI)) * 2 / 3;
    r += (160 * Math.sin(y / 12 * PI) + 320 * Math.sin(y * PI / 30)) * 2 / 3;
    return r;
  }
  function tLng(x, y) {
    var r = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    r += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3;
    r += (20 * Math.sin(x * PI) + 40 * Math.sin(x / 3 * PI)) * 2 / 3;
    r += (150 * Math.sin(x / 12 * PI) + 300 * Math.sin(x / 30 * PI)) * 2 / 3;
    return r;
  }
  /* WGS-84 -> GCJ-02，让手机 GPS 坐标能对齐高德瓦片 */
  function wgsToGcj(lat, lng) {
    if (outOfChina(lat, lng)) return { lat: lat, lng: lng };
    var dLat = tLat(lng - 105, lat - 35), dLng = tLng(lng - 105, lat - 35);
    var rad = lat / 180 * PI, magic = 1 - EE * Math.pow(Math.sin(rad), 2);
    var sq = Math.sqrt(magic);
    dLat = (dLat * 180) / ((AXIS * (1 - EE)) / (magic * sq) * PI);
    dLng = (dLng * 180) / (AXIS / sq * Math.cos(rad) * PI);
    return { lat: lat + dLat, lng: lng + dLng };
  }
  function haversine(a, b) {
    var R = 6371000, r = PI / 180;
    var dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  /* ================= 地图 ================= */
  function MiniMap(host, opts) {
    opts = opts || {};
    this.host = host;
    this.z = opts.zoom || 14;
    this.c = { lat: opts.center.lat, lng: opts.center.lng };
    this.onView = opts.onView || function () {};
    this.onMark = opts.onMark || null;
    this.onTap = opts.onTap || null;
    this.tiles = {};
    this.marks = [];
    this.origin = { x: 0, y: 0 };

    this.layer = document.createElement('div');
    this.layer.className = 'mm-layer';
    this.tilesLayer = document.createElement('div');
    this.tilesLayer.className = 'mm-tiles';
    this.marksLayer = document.createElement('div');
    this.marksLayer.className = 'mm-marks';
    this.layer.appendChild(this.tilesLayer);
    this.layer.appendChild(this.marksLayer);
    host.appendChild(this.layer);

    var ctrl = document.createElement('div');
    ctrl.className = 'mm-ctrl';
    ctrl.innerHTML = '<button data-mm="in">+</button><button data-mm="out">-</button>';
    host.appendChild(ctrl);

    var self = this;
    ctrl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-mm]');
      if (!b) return;
      e.stopPropagation();
      self.zoomBy(b.dataset.mm === 'in' ? 1 : -1);
    });

    if (opts.locate) {
      var loc = document.createElement('button');
      loc.className = 'mm-locate';
      loc.textContent = '定位我';
      host.appendChild(loc);
      loc.addEventListener('click', function (e) {
        e.stopPropagation();
        opts.locate();
      });
    }
    this.bindDrag();
  }

  MiniMap.prototype.proj = function (lat, lng) {
    var s = 256 * Math.pow(2, this.z);
    var x = (lng + 180) / 360 * s;
    var r = Math.sin(lat * PI / 180);
    var y = (0.5 - Math.log((1 + r) / (1 - r)) / (4 * PI)) * s;
    return { x: x, y: y };
  };
  MiniMap.prototype.unproj = function (x, y) {
    var s = 256 * Math.pow(2, this.z);
    var lng = x / s * 360 - 180;
    var n = PI - 2 * PI * y / s;
    var lat = 180 / PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
    return { lat: lat, lng: lng };
  };

  MiniMap.prototype.render = function () {
    var w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return false;
    var c = this.proj(this.c.lat, this.c.lng);
    this.origin = { x: c.x - w / 2, y: c.y - h / 2 };
    this.layer.style.transform = 'translate(' + (-this.origin.x) + 'px,' + (-this.origin.y) + 'px)';
    this.tiles_();
    this.marks_();
    return true;
  };

  MiniMap.prototype.tiles_ = function () {
    var self = this, w = this.host.clientWidth, h = this.host.clientHeight;
    var o = this.origin, z = this.z, max = Math.pow(2, z);
    var x0 = Math.floor(o.x / 256), x1 = Math.floor((o.x + w) / 256);
    var y0 = Math.floor(o.y / 256), y1 = Math.floor((o.y + h) / 256);
    var need = {};
    for (var x = x0; x <= x1; x++) {
      for (var y = y0; y <= y1; y++) {
        if (y < 0 || y >= max) continue;
        var wx = ((x % max) + max) % max;
        need[wx + ':' + y] = { wx: wx, x: x, y: y };
      }
    }
    Object.keys(need).forEach(function (k) {
      if (self.tiles[k]) return;
      var a = need[k], img = new Image();
      img.className = 'mm-tile';
      img.style.transform = 'translate(' + (a.x * 256) + 'px,' + (a.y * 256) + 'px)';
      img.src = TILE.replace('{s}', (Math.abs(a.x + a.y) % 4) + 1)
        .replace('{x}', a.wx).replace('{y}', a.y).replace('{z}', z);
      self.tilesLayer.appendChild(img);
      self.tiles[k] = img;
    });
    Object.keys(this.tiles).forEach(function (k) {
      if (!need[k]) { self.tiles[k].remove(); delete self.tiles[k]; }
    });
  };

  MiniMap.prototype.marks_ = function () {
    var self = this;
    this.marksLayer.textContent = '';
    this.marks.forEach(function (m) {
      var p = self.proj(m.lat, m.lng);
      var wrap = document.createElement('div');
      wrap.className = 'mm-mark';
      wrap.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px)';
      var dot = document.createElement('div');
      if (m.me) {
        dot.className = 'mm-me';
      } else if (m.av) {
        /* 地图上的点是「谁推荐的」，不是「哪家店」 */
        dot.className = 'mm-av ' + (m.cls || '');
        dot.style.background = m.av.color || '#2E6B4F';
        var bb = document.createElement('b');
        bb.textContent = m.av.ch || '?';
        dot.appendChild(bb);
        if (m.label) {
          var sp = document.createElement('span');
          sp.textContent = m.label;
          dot.appendChild(sp);
        }
      } else {
        dot.className = 'mm-dot ' + (m.cls || '');
      }
      if (m.label && !m.me) {
        dot.title = m.label;
        dot.addEventListener('click', function (e) {
          e.stopPropagation();
          if (self.onMark) self.onMark(m);
        });
      }
      wrap.appendChild(dot);
      self.marksLayer.appendChild(wrap);
    });
  };

  MiniMap.prototype.setMarks = function (arr) { this.marks = arr || []; };
  MiniMap.prototype.zoomBy = function (d) {
    this.z = clamp(this.z + d, 9, 18);
    this.tiles = {};
    this.tilesLayer.textContent = '';
    this.render();
    this.onView(this.c, this.z);
  };
  MiniMap.prototype.bindDrag = function () {
    var self = this, dragging = false, sx = 0, sy = 0, ox = 0, oy = 0, moved = 0;
    this.host.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.mm-ctrl, .mm-locate, .mm-dot, .mm-av')) return;
      dragging = true; moved = 0;
      sx = e.clientX; sy = e.clientY;
      ox = self.origin.x; oy = self.origin.y;
      try { self.host.setPointerCapture(e.pointerId); } catch (err) {}
    });
    this.host.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
      self.origin = { x: ox - dx, y: oy - dy };
      self.layer.style.transform = 'translate(' + (-self.origin.x) + 'px,' + (-self.origin.y) + 'px)';
      self.tiles_();
    });
    function end(e) {
      if (!dragging) return;
      dragging = false;
      var w = self.host.clientWidth, h = self.host.clientHeight;
      self.c = self.unproj(self.origin.x + w / 2, self.origin.y + h / 2);
      self.onView(self.c, self.z);
      if (moved < 6 && self.onTap) {
        var r = self.host.getBoundingClientRect();
        var pt = self.unproj(self.origin.x + (e.clientX - r.left), self.origin.y + (e.clientY - r.top));
        self.onTap(pt);
      }
    }
    this.host.addEventListener('pointerup', end);
    this.host.addEventListener('pointercancel', function () { dragging = false; });
  };

  /* ================= 数据 ================= */
  var S;
  var state = {
    tab: 'nearby',
    mode: 'me',
    kind: 'all',
    loc: null,
    acc: null,
    locStatus: 'pending',
    locErr: '',
    pickMe: false,
    mapView: null,
    quiz: null
  };

  function freshSeed() {
    var o = JSON.parse(JSON.stringify(window.SEED));
    o.visits = o.visits || [];
    o.want = [];
    o.hidden = [];
    o.deleted = [];
    return o;
  }

  /* 把 9 元数组转成对象 */
  function arrToVec(a) {
    var o = {};
    DIMS.forEach(function (d, i) { o[d.k] = num(a[i], 2.5); });
    return o;
  }

  function migrate(o) {
    if (!o.me) o.me = {};
    if (!o.me.taste) o.me.taste = arrToVec(window.DIMS.map(function (k) {
      return window.SEED.me.taste[k];
    }));
    if (!o.me.scenes) o.me.scenes = [];
    if (!o.me.categories) o.me.categories = [];
    if (!o.visits) o.visits = [];
    if (!o.want) o.want = [];
    if (!o.hidden) o.hidden = [];
    /* 老数据没有城市字段：店沿用原来的单一城市，博主跟着店走 */
    if (!o.city) o.city = (o.places && o.places[0] && o.places[0].city) || (window.SEED && window.SEED.city) || '';
    (o.places || []).forEach(function (p) { if (!p.city) p.city = o.city; });
    (o.bloggers || []).forEach(function (b) { if (!b.city) b.city = o.city; });
    /* 旧数据是 1–5 星，转成「好吃 / 不好吃」 */
    o.visits.forEach(function (v) {
      if (!v.verdict) v.verdict = (num(v.rating, 4) >= 4) ? 'good' : 'bad';
    });
    (o.places || []).forEach(function (p) {
      if (!p.taste && p.kind !== 'spot') {
        var a = (window.TASTE_PLACES || {})[p.id] || (window.TASTE_BY_CUISINE || {})[p.cuisine];
        if (a) p.taste = arrToVec(a);
      }
    });
    syncSeed(o);
    /* 「我自己」以前借博主的壳（b_me）。现在改成正式的来源标记 p.own：
       老存档里挂 b_me 的店改成 own=true，再把那个假博主从列表里摘掉。 */
    (o.places || []).forEach(function (p) {
      if (p.bloggerId === 'b_me') { p.own = true; p.bloggerId = ''; }
      p.own = !!p.own;
    });
    o.bloggers = (o.bloggers || []).filter(function (b) { return b.id !== 'b_me'; });

    /* 广州三家原来是我按「海珠区江南大道」估的坐标，实际都在新港中路（赤岗—客村一带）。
       这次用高德 Web服务 Key 查到了门牌级坐标：一次性改过来，改完打标记，
       以后你手动挪过的不再覆盖。 */
    if (!o.fix_gz2) {
      var gz = {
        p_chengfeng: [23.095249, 113.329860, '新港中路 456 号广发新村'],
        p_laodifang: [23.095466, 113.329684, '新港中路 452 号之 2 毛纺小区'],
        p_shengxiangting: [23.095746, 113.320162, '新港中路 352 号丽影广场 C 区']
      };
      var gzName = {
        p_chengfeng: '诚锋石磨肠粉',
        p_laodifang: '老地方巢皮肠粉（笼仔蒸饭）',
        p_shengxiangting: '盛香亭热卤（丽影广场店）'
      };
      (o.places || []).forEach(function (p) {
        var f = gz[p.id]; if (!f) return;
        p.lat = f[0]; p.lng = f[1]; p.address = f[2]; p.region = '海珠区';
        if (gzName[p.id]) p.name = gzName[p.id];
      });
      /* 你住在广州。示例那 18 家在上海，默认城市改成广州，少按一次。 */
      if (o.city === '上海') o.city = '广州';
      o.fix_gz = 1; o.fix_gz2 = 1;
    }
    return o;
  }

  /* 内置示例数据会随版本增补（比如新加的广州三家）。
     已有存档不会自动带进来，这里按 id 补差集；用户删过的记在 deleted 里，不再补。
     只补内置数据，你自己的录入永远不会被覆盖。 */
  function syncSeed(o) {
    var seed = window.SEED || {};
    if (!o.deleted) o.deleted = [];
    var gone = o.deleted;
    var haveP = {};
    (o.places || []).forEach(function (p) { haveP[p.id] = 1; });
    (seed.places || []).forEach(function (p) {
      if (haveP[p.id] || gone.indexOf(p.id) >= 0) return;
      var c = JSON.parse(JSON.stringify(p));
      if (!c.city) c.city = o.city;
      o.places.push(c);
    });
    var haveB = {};
    (o.bloggers || []).forEach(function (b) { haveB[b.id] = 1; });
    (seed.bloggers || []).forEach(function (b) {
      if (haveB[b.id] || gone.indexOf(b.id) >= 0) return;
      o.bloggers.push(JSON.parse(JSON.stringify(b)));
    });
    var haveV = {};
    (o.visits || []).forEach(function (v) { haveV[v.id] = 1; });
    (seed.visits || []).forEach(function (v) {
      if (haveV[v.id]) return;
      o.visits.push(JSON.parse(JSON.stringify(v)));
    });
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var o = JSON.parse(raw);
        if (o && o.places && o.bloggers) return migrate(o);
      }
      var old = localStorage.getItem(OLD_KEY);
      if (old) {
        var p = JSON.parse(old);
        if (p && p.places && p.bloggers) {
          var m = migrate(p);
          try { localStorage.setItem(KEY, JSON.stringify(m)); localStorage.removeItem(OLD_KEY); } catch (e) {}
          return m;
        }
      }
    } catch (e) {}
    return migrate(freshSeed());
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { toast('保存失败，存储空间可能满了'); }
  }
  function placeById(id) {
    for (var i = 0; i < S.places.length; i++) if (S.places[i].id === id) return S.places[i];
    return null;
  }
  function bloggerById(id) {
    for (var i = 0; i < S.bloggers.length; i++) if (S.bloggers[i].id === id) return S.bloggers[i];
    return null;
  }
  /* 店的来源只有两种：博主推荐的，和自己找的。
     自己找的不进博主列表、不算命中率，只算你自己的清单。 */
  function ownOf(p) { return !!(p && p.own); }
  function authorOf(p) {
    if (ownOf(p)) return { own: true, name: '我自己', color: '#6B6355', ch: '我', platform: '自己找的', blogger: null };
    var b = bloggerById(p && p.bloggerId);
    if (!b) return null;
    return { own: false, name: b.name, color: b.color, ch: String(b.name || '?').slice(0, 1), platform: b.platform || '', blogger: b };
  }
  function visitOf(id) {
    for (var i = 0; i < S.visits.length; i++) if (S.visits[i].placeId === id) return S.visits[i];
    return null;
  }
  function uid(p) { return p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  /* 展示层补充：区、逐菜。外部文件给，不落库。 */
  function extraOf(p) { return ((window.EXTRA || {})[p.id]) || {}; }
  function regionOf(p) { return extraOf(p).region || p.region || ''; }
  function dishesOf(p) {
    var ex = extraOf(p).dishes;
    if (ex && ex.length) return ex;
    if (p.dish) return String(p.dish).split(/\s*[·、,，]\s*/).filter(Boolean).map(function (n) {
      return { n: n, h: 2, note: '' };
    });
    return [];
  }
  function avatarHTML(b, size) {
    var col = (b && b.color) || '#B9AE9D';
    var ch = b ? String(b.name || '?').slice(0, 1) : '?';
    return '<span class="av' + (size ? ' ' + size : '') + '" style="background:' + col + '">' + esc(ch) + '</span>';
  }
  function wantOf(id) { return (S.want || []).indexOf(id) >= 0; }
  function setWant(id, on) {
    S.want = S.want || [];
    var i = S.want.indexOf(id);
    if (on && i < 0) S.want.push(id);
    if (!on && i >= 0) S.want.splice(i, 1);
    save();
  }

  /* ================= 口味打分 ================= */

  /* 一家店的口味向量。没有就按菜系兜底，并缓存回去。 */
  function vecOf(p) {
    if (p.kind === 'spot') return null;
    if (p.taste) return p.taste;
    var a = (window.TASTE_PLACES || {})[p.id] || (window.TASTE_BY_CUISINE || {})[p.cuisine];
    if (!a) return null;
    p.taste = arrToVec(a);
    return p.taste;
  }

  /* 方向性罚分：超出你的期望罚得狠（太辣吃不下），没到位罚得轻（不够甜只是差点意思） */
  function tasteOf(p) {
    var me = (S.me && S.me.taste) || {};
    var v = vecOf(p);
    if (!v) return { sim: 0.5, mult: 1, good: [], bad: [] };

    var sum = 0, wsum = 0, good = [], bad = [];
    DIMS.forEach(function (d) {
      var want = num(me[d.k], 2.5), got = num(v[d.k], 2.5);
      var over = Math.max(0, got - want), under = Math.max(0, want - got);
      var sim = 1 - Math.min(1, (1.5 * over + 0.3 * under) / 5);
      sum += sim * d.w; wsum += d.w;
      if (over <= 0.7 && under <= 0.7) good.push({ n: d.n, w: d.w });
      if (over >= 1.5) bad.push({ n: d.n, got: got, want: want, over: over });
    });
    var sim = wsum ? sum / wsum : 0.5;
    /* 拉开差距：加权平均会把所有店挤在 75–85%，
       做一个对比度拉伸，让「差一点」和「差很多」在排序里真的分开 */
    sim = clamp((sim - 0.5) / 0.45, 0, 1);

    /* 硬门槛：超过承受线，整体降权 */
    var mult = 1;
    var sp = num(me.spicy, 2.5), gp = num(v.spicy, 2.5);
    if (sp <= 1.5 && gp >= 3) mult *= 0.55;
    var sa = num(me.salty, 2.5), ga = num(v.salty, 2.5);
    if (sa <= 1.5 && ga >= 4) mult *= 0.75;
    var fu = num(me.funky, 2.5), gu = num(v.funky, 2.5);
    if (fu <= 1.5 && gu >= 3) mult *= 0.6;

    good.sort(function (a, b) { return b.w - a.w; });
    bad.sort(function (a, b) { return b.over - a.over; });
    return {
      sim: sim, mult: mult,
      good: good.slice(0, 2).map(function (x) { return x.n; }),
      bad: bad.slice(0, 2)
    };
  }

  function relOf(b) {
    var h = (b && b.hits) || { good: 0, total: 0 };
    return (h.good + 1) / (h.total + 2);   /* 贝叶斯先验：没数据时 0.5 */
  }
  function localOf(p) { return clamp(((p.local || 2) - 1) / 2, 0, 1); }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  /* 多久没备份了。-1 = 从来没导过。
     iOS 的 Safari 会把久不打开的网站的本地存储清掉，数据是会真丢的。 */
  function backupDays() {
    if (!S.lastBackup) return -1;
    return Math.floor((Date.now() - S.lastBackup) / 86400000);
  }

  /* 请浏览器把这份数据标成「持久」，降低被自动清理的概率。
     用户记不住手动备份，这一步就替他做掉。 */
  function askPersist() {
    try {
      if (!navigator.storage || !navigator.storage.persist) return;
      navigator.storage.persisted().then(function (done) {
        if (done) { state.persisted = 1; return; }
        return navigator.storage.persist().then(function (granted) {
          state.persisted = granted ? 1 : 0;
          if (!granted) toast('浏览器没给「持久存储」，记得偶尔导一次备份');
        });
      });
    } catch (e) {}
  }
  /* 「今儿这顿」：只对今天有效。人本来就会变，所以它和长期画像分开存。 */
  function moodOf() {
    if (!S.mood || S.mood.at !== today()) return null;
    return S.mood;
  }
  function moodSave(m) {
    if (!m) S.mood = null;
    else { m.at = today(); S.mood = m; }
    save();
  }
  function moodText() {
    var m = moodOf();
    if (!m) return '';
    var bits = (m.dims || []).map(function (k) {
      var d = MOOD_DIMS.filter(function (x) { return x.k === k; })[0];
      return d ? d.n : k;
    });
    var it = MOOD_INTENT.filter(function (x) { return x.k === m.intent; })[0];
    if (it) bits.push(it.n);
    var sc = MOOD_SCENE.filter(function (x) { return x.k === m.scene; })[0];
    if (sc) bits.push(sc.n);
    if (m.hungry) bits.push('很饿');
    var pr = MOOD_PRICE.filter(function (x) { return x.k === m.price; })[0];
    if (pr && pr.k) bits.push(pr.n);
    return bits.join(' · ');
  }

  function scoreOf(p, d, t) {
    var W = (MODES[state.mode] || MODES.me).w;
    var b = bloggerById(p.bloggerId);
    var m = moodOf();
    var prox = Math.exp(-d / 3000);
    var wt = W.taste, wl = W.local, wp = W.prox, add = 0;
    if (m) {
      /* 很饿 → 距离权重放大；想尝鲜 → 本地度放大；想吃熟的 → 口味权重放大 */
      if (m.hungry) wp *= 1.8;
      if (m.intent === 'new') wl *= 1.7;
      if (m.intent === 'safe') wt *= 1.35;
      var v = vecOf(p);
      if (v) {
        var hit = 0;
        (m.dims || []).forEach(function (k) { if (num(v[k], 2.5) >= 3.4) hit++; });
        add = Math.min(0.15, hit * 0.055);
      }
    }
    var wsum = wt + wl + wp + W.hit;
    var s = (wt * t.sim + wl * localOf(p) + wp * prox + W.hit * relOf(b)) / (wsum || 1);
    return s * t.mult * (1 + add);
  }

  /* 城市的归属：店看 p.city，博主看 b.city，都没有就算当前城市 */
  function cityOf(p) { return (p && p.city) || S.city || ''; }
  function citiesOf() {
    var seen = {}, out = [];
    (S.places || []).forEach(function (p) {
      var c = cityOf(p);
      if (c && !seen[c]) { seen[c] = 1; out.push(c); }
    });
    (S.bloggers || []).forEach(function (b) {
      var c = b.city;
      if (c && !seen[c]) { seen[c] = 1; out.push(c); }
    });
    return out;
  }
  function cityCount(c) {
    return (S.places || []).filter(function (p) { return cityOf(p) === c; }).length;
  }
  /* 没定位时，地图和距离以这个城市的店为中心 */
  function cityCenter(c) {
    var ps = (S.places || []).filter(function (p) {
      return cityOf(p) === c && typeof p.lat === 'number' && typeof p.lng === 'number';
    });
    if (!ps.length) return null;
    var lat = 0, lng = 0;
    ps.forEach(function (p) { lat += p.lat; lng += p.lng; });
    return { lat: lat / ps.length, lng: lng / ps.length };
  }

  function ranked(opt) {
    opt = opt || {};
    var base = state.loc || cityCenter(S.city) || FALLBACK;
    return S.places
      .filter(function (p) { return typeof p.lat === 'number' && typeof p.lng === 'number'; })
      /* 只算当前城市的店：否则在成都会看到 1200 公里外的本帮菜 */
      .filter(function (p) { return !S.city || cityOf(p) === S.city; })
      .filter(function (p) { return (S.hidden || []).indexOf(p.id) < 0; })
      .filter(function (p) { return opt.ignoreKind || state.kind === 'all' || p.kind === state.kind; })
      .map(function (p) {
        var d = haversine(base, p);
        var t = tasteOf(p);
        var s = scoreOf(p, d, t);
        if (p.kind === 'spot') s *= 0.8;   /* 景点不跟吃的抢前排 */
        return { p: p, d: d, t: t, s: s };
      })
      .sort(function (a, b) { return b.s - a.s; });
  }

  /* ================= 渲染：附近 ================= */
  function locText() {
    if (state.pickMe) return '在地图上点一下你的位置';
    if (state.locStatus === 'ok') return '已定位 · 精度 ' + Math.round(state.acc || 0) + ' 米';
    if (state.locStatus === 'denied') return '未定位 · 距离按示例点算';
    return '正在定位…';
  }
  function modeBtn(v) {
    return '<button data-act="mode" data-v="' + v + '" class="' + (state.mode === v ? 'on' : '') + '">' +
      MODES[v].label + '</button>';
  }
  function kindChip(v, label) {
    return '<button class="chip ' + (state.kind === v ? 'on' : '') + '" data-act="kind" data-v="' + v + '">' + label + '</button>';
  }

  /* 为什么排在这：对上的维度，或者超线的维度 */
  function whyHTML(t) {
    if (t.bad && t.bad.length) {
      return '<div class="why warn">' + t.bad.map(function (b) {
        return b.n + ' ' + r1(b.got) + ' 超你的 ' + r1(b.want);
      }).join(' · ') + '</div>';
    }
    if (t.good && t.good.length) {
      return '<div class="why ok">' + t.good.join('、') + ' 都对上了</div>';
    }
    return '';
  }

  function priceHTML(p) { return p.price ? priceText(p.price) : '价格未记'; }

  /* 头牌：第一家占满一屏宽，像杂志封面。没有照片，就用店名的第一个字当封面字。 */
  function hero(it, rank) {
    var p = it.p, a = authorOf(p), v = visitOf(p.id), t = it.t;
    var tags = [];
    if (p.local === 3) tags.push('本地招牌');
    if (p.cuisine) tags.push(p.cuisine);
    var ch = String(p.name || '').replace(/^[（(].*?[)）]/, '').slice(0, 1);
    return '<article class="hero" data-act="place" data-id="' + p.id + '">' +
      '<div class="hero-pic" style="background:' + ((a && a.color) || '#2E6B4F') + '">' +
        '<span class="hero-ch">' + esc(ch) + '</span>' +
        '<span class="hero-no">No.' + (rank < 10 ? '0' + rank : rank) + '</span>' +
        '<span class="hero-dist">' + distText(it.d) + '</span>' +
        '<div class="hero-name">' + esc(p.name) + '</div>' +
      '</div>' +
      '<div class="hero-body">' +
        (tags.length ? '<div class="c-tags">' + tags.map(function (x) { return '<i>' + esc(x) + '</i>'; }).join('') + '</div>' : '') +
        (p.quote ? '<p class="hero-quote">' + esc(p.quote) + '</p>' : '') +
        '<div class="hero-rec">' + avatarHTML(a) +
          '<span class="hr-name">' + (a ? esc(a.name) : '未标来源') + '</span>' +
          '<span class="hr-sep"></span><span>' + priceHTML(p) + '</span>' +
          (regionOf(p) ? '<span class="hr-sep"></span><span>' + esc(regionOf(p)) + '</span>' : '') +
        '</div>' +
        '<div class="hero-foot">' +
          '<span class="hf-score">' + Math.round(it.s * 100) + '<i>分</i></span>' +
          (p.kind === 'spot' ? '' : '<span class="tp">口味 ' + Math.round(t.sim * 100) + '%</span>') +
          whyHTML(t) +
          (v ? '<span class="done">' + (v.verdict === 'bad' ? '踩过雷' : '吃过了') + '</span>' : '') +
          (wantOf(p.id) ? '<span class="done want">想去</span>' : '') +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function card(it) {
    var p = it.p, v = visitOf(p.id), t = it.t;
    return '<div class="row" data-act="place" data-id="' + p.id + '">' +
      avatarHTML(authorOf(p)) +
      '<div class="row-main">' +
        '<div class="row-name">' + esc(p.name) + '<span class="rdist">' + distText(it.d) + '</span></div>' +
        '<div class="row-meta">' +
          (p.kind === 'spot' ? '景点' : '吃') +
          (p.cuisine ? ' · ' + esc(p.cuisine) : '') +
          (regionOf(p) ? ' · ' + esc(regionOf(p)) : '') +
          (p.kind === 'spot' ? '' : ' · 口味 ' + Math.round(t.sim * 100) + '%') +
          (v ? ' · ' + (v.verdict === 'bad' ? '踩过雷' : '好吃') : '') +
          (wantOf(p.id) ? ' · 想去' : '') +
        '</div>' +
        (p.quote ? '<div class="row-quote">' + esc(p.quote) + '</div>' : '') +
      '</div>' +
      '<div class="row-score">' + Math.round(it.s * 100) + '</div>' +
    '</div>';
  }

  function viewNearby() {
    var items = ranked();
    var banner = '';
    if (state.locStatus === 'denied') {
      banner = '<div class="banner">' + esc(state.locErr || '没拿到位置。') +
        '<div class="banner-act">' +
          '<button class="mini" data-act="locate">再试一次</button>' +
          '<button class="mini ghost" data-act="pickme">在地图上点我的位置</button>' +
        '</div></div>';
    } else if (state.locStatus === 'pending') {
      banner = '<div class="banner">正在定位… 拿到位置后距离会自动刷新。</div>';
    }
    /* 备份提醒：数据只在你手机的浏览器里，Safari 会清久不用的网站。
       只在「确实有你自己的东西」时提醒，示例数据丢了无所谓。 */
    var bd = backupDays();
    var mine = (S.visits || []).length + (S.places || []).filter(function (p) { return p.own; }).length;
    if (mine > 0 && (bd < 0 || bd >= 7)) {
      banner += '<div class="banner">' +
        (bd < 0 ? '还没备份过。' : '上次备份是 ' + bd + ' 天前。') +
        ' iPhone 的 Safari 会把久不打开的网站的数据清掉，你记的「好吃 / 不好吃」会一起没。' +
        '<div class="banner-act"><button class="mini" data-act="export">导出备份</button></div></div>';
    }
    var promo = (S.me && !S.me.quizAt)
      ? '<div class="promo" data-act="quiz">还没做过口味测试 · 花 1 分钟，之后「跟我口味」才准 <b>开始 →</b></div>' : '';

    var top = items[0], whyline = '';
    if (top) {
      var bits = [];
      if (top.p.local === 3) bits.push('本地招牌');
      else if (top.p.local === 2) bits.push('本地人常去');
      if (top.p.kind !== 'spot' && top.t.sim >= 0.55) bits.push('口味 ' + Math.round(top.t.sim * 100) + '%');
      bits.push(distText(top.d));
      whyline = '<div class="whyline">排第 1 是「' + esc(top.p.name) + '」，因为：' + bits.join(' · ') + '</div>';
    }

    return '' +
      '<div class="hdr">' +
        '<div class="hdr-top"><div><button class="city" data-act="city">' + esc(S.city || '选城市') + '<i>▾</i></button>' +
        '<div class="loc ' + (state.locStatus === 'ok' ? '' : 'warn') + '">' + locText() + '</div></div>' +
        '<div class="seg mode">' + modeBtn('local') + modeBtn('me') + modeBtn('half') + '</div></div>' +
        '<div class="mode-tip">' + MODES[state.mode].tip + '</div>' +
        moodBar() +
        whyline +
      '</div>' +
      banner + promo +
      '<div class="mapwrap"><div class="mm" id="map"></div></div>' +
      '<div class="chips" style="padding:0 16px 8px">' + kindChip('all', '全部') + kindChip('eat', '吃') + kindChip('spot', '逛') + '</div>' +
      '<div class="addbar"><button class="btn ghost" data-act="add">＋ 收录一家（粘一条链接，或手填）</button></div>' +
      '<div class="list">' +
        (items.length
          ? hero(items[0], 1) +
            (items.length > 1
              ? '<div class="sect">附近还有 ' + (items.length - 1) + ' 家</div>' + items.slice(1).map(card).join('')
              : '')
          : '<div class="empty"><b>' + esc(S.city || '这里') + ' 还没有推荐</b>点右下角的 + 把博主说的店收进来。<br>收录之后，到这个城市打开就能按距离看。' +
            (function () {
              var others = citiesOf().filter(function (c) { return c !== S.city; });
              if (!others.length) return '';
              return '<div class="city-pick">' + others.map(function (c) {
                return '<button class="mini" data-act="setcity" data-v="' + esc(c) + '">切到 ' + esc(c) + '（' + cityCount(c) + ' 家）</button>';
              }).join('') + '</div>';
            })() + '</div>') +
      '</div>' +
      '<button class="fab" data-act="add" aria-label="收录一家">+</button>';
  }

  function mountMap() {
    var host = $('#map');
    if (!host) return;
    var items = ranked().slice(0, 40);
    var mv = state.mapView;
    var map = new MiniMap(host, {
      center: mv ? mv.center : (state.loc || cityCenter(S.city) || FALLBACK),
      zoom: mv ? mv.zoom : (state.loc ? 15 : 13),
      locate: locate,
      onView: function (c, z) { state.mapView = { center: c, zoom: z }; },
      onTap: function (pt) {
        if (!state.pickMe) return;
        state.pickMe = false;
        state.loc = { lat: pt.lat, lng: pt.lng };
        state.acc = 0;
        state.locStatus = 'ok';
        state.locErr = '';
        state.mapView = { center: state.loc, zoom: 15 };
        render();
        toast('位置就设在这儿了，距离按它算');
      },
      onMark: function (m) { if (m.id) openPlace(m.id); }
    });
    var marks = items.map(function (it) {
      var sim = it.t.sim;
      var a = authorOf(it.p);
      return {
        id: it.p.id, lat: it.p.lat, lng: it.p.lng, label: it.p.name,
        av: { color: (a && a.color) || '#B9AE9D', ch: a ? a.ch : '·' },
        cls: it.p.kind === 'spot' ? 'spot' : (sim > 0.78 ? 'hot' : sim > 0.6 ? 'warm' : '')
      };
    });
    if (state.loc) marks.push({ me: true, lat: state.loc.lat, lng: state.loc.lng });
    map.setMarks(marks);
    requestAnimationFrame(function () { map.render(); });
  }

  /* ================= 渲染：打卡 ================= */
  function viewCheckin() {
    var want = [], good = [], bad = [], pending = [];
    var items = ranked({ ignoreKind: true }).filter(function (it) { return it.p.kind === 'eat'; });
    items.forEach(function (it) {
      var v = visitOf(it.p.id);
      if (v) (v.verdict === 'bad' ? bad : good).push(it);
      else if (wantOf(it.p.id)) want.push(it);
      else pending.push(it);
    });
    var best = null, bestR = 0;
    S.bloggers.forEach(function (b) {
      var r = relOf(b);
      if ((b.hits && b.hits.total >= 2) && r > bestR && r > 0.6) { bestR = r; best = b; }
    });

    var rowOf = function (it) { return card(it); };

    return '' +
      '<div class="hdr"><div class="hdr-top"><div><div class="city">清单</div>' +
      '<div class="loc">吃完点一下「好吃」，系统才知道哪个博主靠谱</div></div></div></div>' +
      '<div class="stats">' +
        '<div class="stat"><b>' + good.length + '</b><span>好吃</span></div>' +
        '<div class="stat"><b>' + bad.length + '</b><span>踩雷</span></div>' +
        '<div class="stat"><b>' + want.length + '</b><span>想去</span></div>' +
        '<div class="stat"><b>' + (best ? best.name : '—') + '</b><span>最准</span></div>' +
      '</div>' +
      (want.length ? '<div class="sect">稍后去吃</div><div class="list">' + want.map(rowOf).join('') + '</div>' : '') +
      '<div class="sect">还没吃过 · 附近 ' + pending.length + ' 家</div>' +
      '<div class="list">' + (pending.slice(0, 8).map(rowOf).join('') || '<div class="empty">附近都吃过了。</div>') + '</div>' +
      (good.length || bad.length
        ? '<div class="sect">吃过的</div><div class="list">' + good.concat(bad).map(rowOf).join('') + '</div>'
        : '');
  }

  /* ================= 渲染：我的 ================= */
  function chipToggle(act, on, label) {
    return '<button class="chip ' + (on ? 'on' : '') + '" data-act="' + act + '" data-v="' + label + '">' + label + '</button>';
  }

  function typeOf(v) {
    var a = v.rich >= 2.8 ? '浓' : '清';
    var b = v.sweet >= v.salty ? '甜' : '咸';
    var c = (num(v.spicy, 0) + num(v.numb, 0)) / 2 >= 2.5 ? '冲' : '柔';
    var d = num(v.funky, 0) >= 2.2 ? '猎' : '稳';
    var code = a + b + c + d;
    return { code: code, name: TYPES[code] || '混合派' };
  }

  function barsHTML(taste) {
    return '<div class="prof">' + DIMS.map(function (d) {
      return '<div class="prow"><b>' + d.n + '</b>' +
        '<div class="bar"><i style="width:' + (clamp(num(taste[d.k], 2.5), 0, 5) / 5 * 100) + '%"></i></div>' +
        '<em>' + r1(num(taste[d.k], 2.5)) + '</em></div>';
    }).join('') + '</div>';
  }

  function viewMine() {
    var me = S.me || {};
    var taste = me.taste || {};
    var ty = typeOf(taste);
    var unlocated = S.places.filter(function (p) { return typeof p.lat !== 'number'; });
    var owned = S.places.filter(function (p) { return ownOf(p); });
    var bloggerHTML = S.bloggers.map(function (b) {
      return '<div class="b-item" data-act="editblogger" data-id="' + b.id + '">' +
        '<span class="avatar" style="background:' + b.color + '">' + esc(b.name.slice(0, 1)) + '</span>' +
        '<div class="b-info"><div class="b-name">' + esc(b.name) +
          (b.platform ? '<small>' + esc(b.platform) + '</small>' : '') + '</div>' +
          '<div class="b-tags">' + (b.flavors || []).map(function (f) { return '<i>' + esc(f) + '</i>'; }).join('') + '</div></div>' +
        '<div class="relbar"><b>' + Math.round(relOf(b) * 100) + '%</b><span>命中率</span>' +
          '<div class="bar"><i style="width:' + Math.round(relOf(b) * 100) + '%"></i></div></div>' +
      '</div>';
    }).join('');

    return '' +
      '<div class="hdr"><div class="hdr-top"><div><div class="city">我的</div>' +
      '<div class="loc">九维口味向量 · 改完立刻影响「跟我口味」的排序</div></div></div></div>' +

      '<div class="typebox">' +
        '<div class="tname">' + ty.name + '</div>' +
        '<div class="tcode">' + ty.code + ' · 浓淡 / 甜咸 / 冲柔 / 猎稳</div>' +
        '<div class="tsub">类型码只是好记的壳，(code 里的四个字) 具体还是下面这九个数在算。</div>' +
        '<button class="btn ghost" data-act="quiz">' + (me.quizAt ? '重做口味测试' : '做口味测试') + '</button>' +
      '</div>' +

      '<div class="section-title">口味强度（拖一下试试）</div>' +
      '<div class="dims">' + DIMS.map(function (d) {
        var v = clamp(num(taste[d.k], 2.5), 0, 5);
        return '<label class="dim"><span>' + d.n + '</span>' +
          '<input type="range" min="0" max="5" step="0.5" value="' + v + '" data-dim="' + d.k + '">' +
          '<em>' + r1(v) + '</em></label>' +
          '<div class="dhint">' + d.lo + ' ← → ' + d.hi + '</div>';
      }).join('') + '</div>' +

      '<div class="section-title">常去的场景</div>' +
      '<div class="chips wrap" style="padding:0 16px">' +
        SCENES.map(function (f) { return chipToggle('me-scene', (me.scenes || []).indexOf(f) >= 0, f); }).join('') +
      '</div>' +

      '<div class="section-title">我找的店 · ' + owned.length + ' 家</div>' +
      (owned.length
        ? '<div class="list">' + owned.map(function (p) {
            var v = visitOf(p.id);
            return '<div class="b-item" data-act="place" data-id="' + p.id + '">' +
              avatarHTML(authorOf(p)) +
              '<div class="b-info"><div class="b-name">' + esc(p.name) +
                (regionOf(p) ? '<small>' + esc(regionOf(p)) + '</small>' : '') + '</div>' +
                '<div class="b-tags"><i>' + (v ? (v.verdict === 'bad' ? '踩雷' : '好吃') : '还没吃') + '</i>' +
                (p.cuisine ? '<i>' + esc(p.cuisine) + '</i>' : '') + '</div></div>' +
            '</div>';
          }).join('') + '</div>'
        : '<div class="empty" style="padding:0 16px">还没有。收录时「谁推荐的」选「我自己」就行。</div>') +

      '<div class="section-title">博主 · ' + S.bloggers.length + ' 位</div>' +
      '<div class="list">' + (bloggerHTML || '<div class="empty">还没有博主。</div>') + '</div>' +
      '<div style="padding:0 16px"><button class="btn ghost" data-act="addblogger">+ 添加博主</button></div>' +

      (unlocated.length ? '<div class="section-title">还没定位置的 ' + unlocated.length + ' 家</div>' +
        '<div class="list">' + unlocated.map(function (p) {
          return '<div class="b-item" data-act="place" data-id="' + p.id + '">' +
            '<div class="b-info"><div class="b-name">' + esc(p.name) + '</div>' +
            '<div class="b-tags"><i>打开后可用「用当前位置」定住</i></div></div></div>';
        }).join('') + '</div>' : '') +

      '<div class="section-title">设置</div>' +
      '<div style="padding:0 16px 8px">' +
        '<button class="btn ghost" data-act="amapkey">高德 Key：' + (amapKey() ? '已填（点这里改）' : '还没填（点这里申请说明）') + '</button>' +
        '<button class="btn ghost" data-act="hidden-list">不感兴趣的店：' + ((S.hidden || []).length) + ' 家</button>' +
      '</div>' +

      '<div class="section-title">数据</div>' +
      '<div class="hint" style="padding:0 16px 6px">上次备份：' +
        (backupDays() < 0 ? '从没备份过' : backupDays() === 0 ? '今天' : backupDays() + ' 天前') +
        ' · 存储保护：' + (state.persisted ? '已开启' : '浏览器没给（所以要偶尔手动导一次）') +
        '。数据只存在这台手机的浏览器里。</div>' +
      '<div style="padding:0 16px 24px">' +
        '<button class="btn ghost" data-act="export">导出备份</button>' +
        '<button class="btn ghost" data-act="import">导入备份</button>' +
        '<button class="btn danger" data-act="reset">恢复示例数据</button>' +
        '<input type="file" id="importFile" accept="application/json" style="display:none">' +
      '</div>';
  }

  /* ================= 今儿这顿（临时状态） ================= */
  function moodBar() {
    var m = moodOf();
    if (!m) {
      return '<button class="moodbar" data-act="mood"><b>＋</b> 今儿这顿想吃点什么？' +
        '<span>只在今天生效，不动你的长期口味</span></button>';
    }
    return '<div class="moodbar on"><span class="mtext">今儿：' + esc(moodText() || '随便') + '</span>' +
      '<button class="mini" data-act="mood">改</button>' +
      '<button class="mini" data-act="mood-clear">清空</button></div>';
  }

  function moodChip(act, on, label, v) {
    return '<button class="chip ' + (on ? 'on' : '') + '" data-act="' + act + '" data-v="' + v + '">' + label + '</button>';
  }

  function openMood() {
    var m = moodOf() || { dims: [], intent: '', scene: '', hungry: false, price: 0 };
    var h = '<div class="sheet-h">今儿这顿</div>' +
      '<div class="sheet-sub">只影响今天的排序，过夜自动清空。你的长期口味在「我的」里，这里不动它。</div>' +
      '<div class="sheet-k">想吃这一口<span>最多 3 个</span></div>' +
      '<div class="chips wrap">' + MOOD_DIMS.map(function (d) {
        return moodChip('mood-dim', (m.dims || []).indexOf(d.k) >= 0, d.n, d.k);
      }).join('') + '</div>' +
      '<div class="sheet-k">想怎么吃</div>' +
      '<div class="chips wrap">' + MOOD_INTENT.map(function (d) {
        return moodChip('mood-intent', m.intent === d.k, d.n, d.k);
      }).join('') + '</div>' +
      '<div class="sheet-k">几个人</div>' +
      '<div class="chips wrap">' + MOOD_SCENE.map(function (d) {
        return moodChip('mood-scene', m.scene === d.k, d.n, d.k);
      }).join('') + '</div>' +
      '<div class="sheet-k">饿不饿</div>' +
      '<div class="chips wrap">' + MOOD_HUNGER.map(function (d) {
        return moodChip('mood-hunger', (d.k === 'starving') === !!m.hungry, d.n, d.k);
      }).join('') + '</div>' +
      '<div class="sheet-k">人均</div>' +
      '<div class="chips wrap">' + MOOD_PRICE.map(function (d) {
        return moodChip('mood-price', num(m.price, 0) === d.k, d.n, String(d.k));
      }).join('') + '</div>' +
      '<div class="act-row"><button class="btn primary" data-act="mood-done">就看今天的</button></div>';
    openSheet(h);
  }

  function moodEdit(fn) {
    var m = moodOf() || { dims: [], intent: '', scene: '', hungry: false, price: 0 };
    m = JSON.parse(JSON.stringify(m));
    fn(m);
    if (!m.dims.length && !m.intent && !m.scene && !m.hungry && !m.price) moodSave(null);
    else moodSave(m);
    openMood();
  }

  /* ================= 收录入口 ================= */
  function openCity() {
    var cs = citiesOf();
    openSheet('<div class="sheet-h">在哪个城市</div>' +
      '<div class="sheet-sub">换城市只影响「附近」看哪些店，不影响你的口味和打卡记录。</div>' +
      (cs.length ? cs.map(function (c) {
        return '<div class="row city-row" data-act="setcity" data-v="' + esc(c) + '">' +
          '<div class="row-main"><div class="row-name">' + esc(c) +
            (c === S.city ? '<span class="rdist">当前</span>' : '') + '</div>' +
            '<div class="row-meta">' + cityCount(c) + ' 家</div></div></div>';
      }).join('') : '') +
      '<div class="act-row"><button class="btn ghost" data-act="newcity">＋ 加一个城市</button></div>');
  }

  function openHidden() {
    var hs = (S.hidden || []).map(placeById).filter(Boolean);
    openSheet('<div class="sheet-h">不感兴趣的店</div>' +
      '<div class="sheet-sub">这些不会出现在「附近」列表和地图上。</div>' +
      (hs.length ? hs.map(function (p) {
        return '<div class="row"><div class="row-main"><div class="row-name">' + esc(p.name) + '</div>' +
          '<div class="row-meta">' + esc(cityOf(p)) + (p.cuisine ? ' · ' + esc(p.cuisine) : '') + '</div></div>' +
          '<button class="mini" data-act="unhide" data-id="' + p.id + '">恢复</button></div>';
      }).join('') : '<div class="empty">还没隐藏任何店。在店详情里点「不感兴趣」就行。</div>'));
  }

  function openNewCity() {
    openSheet('<div class="sheet-h">加一个城市</div>' +
      '<div class="sheet-sub">只写城市名。之后在这个城市收录的店，默认归到这儿。</div>' +
      '<input id="cityName" class="paste city-input" type="text" placeholder="广州">' +
      '<div class="act-row"><button class="btn primary" data-act="newcity-save">就用这个</button></div>');
  }

  function openAdd() {
    openSheet('<div class="sheet-h">记一家</div>' +
      '<div class="sheet-sub">刷视频看到一家，直接打店名。高德帮你补坐标和地址，点一下就存进来了。</div>' +
      '<div class="act-row"><button class="btn primary" data-act="quick">快速记一家（只打店名）</button></div>' +
      '<div class="act-row"><button class="btn ghost" data-act="import">粘贴一条链接/文案</button></div>' +
      '<div class="act-row"><button class="btn ghost" data-act="batch">批量粘贴（一次十几家）</button></div>' +
      '<div class="act-row"><button class="btn ghost" data-act="manual">空白手填</button></div>' +
      '<div class="act-row"><button class="btn ghost" data-act="addblogger">先加一位博主</button></div>');
  }

  function openImport() {
    openSheet('<div class="sheet-h">粘贴一条推荐</div>' +
      '<div class="sheet-sub">整段笔记文字、带链接的文字都行。</div>' +
      '<textarea id="pasteBox" class="paste" rows="6" placeholder="例：📍阿娘面 思南路36号 人均50 黄鱼面绝了，汤是白的，咸菜现炒 https://xhslink.com/abc"></textarea>' +
      '<div class="act-row two"><button class="btn ghost" data-act="paste-clip">从剪贴板读</button>' +
      '<button class="btn primary" data-act="parse">识别</button></div>' +
      '<div class="hint" id="pasteHint">为什么不能只丢链接：小红书/抖音的页面，浏览器跨域读不了，这个版本没有后台。所以链接会存下来（方便回看），但店名这些得靠文字。</div>');
  }

  function readClip() {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      toast('这个浏览器不给读剪贴板，长按输入框粘贴'); return;
    }
    navigator.clipboard.readText().then(function (t) {
      if (!t) { toast('剪贴板是空的'); return; }
      var box = $('#pasteBox') || $('#batchBox');
      if (box) { box.value = t; box.focus(); }
      toast('已填入，点「识别」');
    })['catch'](function () {
      toast('读不了剪贴板（要 https，或你点了拒绝），长按输入框粘贴');
    });
  }

  /* 从一段笔记文字里抠出店名 / 菜 / 价格 / 地址 / 链接 */
  function parseNote(text) {
    var t = String(text || '').replace(/\r/g, '');
    var out = { name: '', dish: '', address: '', price: 0, url: '', platform: '' };
    var mu = t.match(/https?:\/\/[^\s，。、）)]+/);
    if (mu) {
      out.url = mu[0];
      if (/xhslink|xiaohongshu/.test(out.url)) out.platform = '小红书';
      else if (/douyin|iesdouyin/.test(out.url)) out.platform = '抖音';
      else if (/bilibili|b23\.tv/.test(out.url)) out.platform = 'B站';
      else if (/weibo/.test(out.url)) out.platform = '微博';
      else if (/dianping|meituan/.test(out.url)) out.platform = '点评';
      else out.platform = '链接';
    }
    var body = t.replace(/https?:\/\/[^\s，。、）)]+/g, ' ');

    var mp = body.match(/(?:人均|平均|花了|一个人|大约|差不多)\s*(\d{2,3})/) || body.match(/(\d{2,3})\s*(?:块|元)/);
    if (mp) {
      var n = +mp[1];
      out.price = n <= 40 ? 1 : n <= 90 ? 2 : n <= 180 ? 3 : 4;
    }
    var ma = body.match(/([\u4e00-\u9fa5A-Za-z0-9]{2,12}(?:路|街|弄|道|巷|里)[\dA-Za-z\-]{0,6}[号弄]?)/);
    if (ma) out.address = ma[1];

    var mn = body.match(/(?:店名|餐厅|位置|📍|🏠)\s*[：: ]?\s*([^\n，。,！!?？]{2,20})/);
    if (mn) {
      /* 一行里「📍店名 地址 人均XX」挤在一起时，只取第一段作为店名，
         否则会把地址和价格一起吃进店名（批量粘贴都是这种一行一家的写法） */
      var nm = mn[1].trim();
      if (/[ 　]/.test(nm)) nm = nm.split(/[ 　]+/)[0];
      out.name = nm;
    }
    if (!out.name) {
      var mq = body.match(/[《【]([^》】]{2,16})[》】]/);
      if (mq && /(店|馆|楼|记|面|饭|食|茶|咖啡|厨房)/.test(mq[1])) out.name = mq[1];
    }
    if (!out.name) {
      var SUF = /(店|馆|楼|记|面|粉|坊|居|苑|屋|烧|烤|菜|茶|糖|饺|包|粥|锅|串|饼|饭|堂|舍|灶|厨|栈|庭|院|轩|斋|阁|档|摊|铺|吧|食堂|小馆)/;
      var lines = body.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      for (var i = 0; i < lines.length; i++) {
        var s = lines[i].replace(/^[📍🏠🍜🍲✨·\-\s\d.、]+/, '');
        if (s.length >= 2 && s.length <= 14 && SUF.test(s) && !/[。，！？]/.test(s)) { out.name = s; break; }
      }
    }
    /* 整段话挤成一行时，从中间捞一个「XX店/面/馆」 */
    if (!out.name) {
      var m2 = body.match(/([\u4e00-\u9fa5A-Za-z]{2,8}(?:店|馆|楼|记|粉|坊|居|屋|灶|厨|轩|斋|阁|铺|吧|食堂|小馆|面|饭|菜))/);
      if (m2) {
        var nm = m2[1], PRE = /^(?:有家|这家|那家|一家|一个|上海|北京|广州|深圳|成都|杭州|西安|重庆|南京|武汉|苏州|在|去|吃|的|是)/;
        while (PRE.test(nm) && nm.length > 2) nm = nm.replace(PRE, '');
        out.name = nm;
      }
    }    var md = body.match(/(?:必点|招牌|推荐|点了|吃了|一定要点|必吃)\s*[：: ]?\s*([^\n，。！]{2,16})/);
    if (md) out.dish = md[1].trim();
    return out;
  }

  function doParse() {
    var box = $('#pasteBox');
    var text = box ? box.value : '';
    if (!text.trim()) { toast('先粘点东西进来'); return; }
    var r = parseNote(text);
    closeSheet();
    setTimeout(function () {
      openPlaceForm({
        name: r.name, dish: r.dish, address: r.address,
        price: r.price || undefined, sourceUrl: r.url,
        quote: r.dish ? '' : text.slice(0, 60),
        src: r
      });
      toast(r.name ? '认出来了：' + r.name + '（位置还得点一下）' : '没认出店名，手动填一下');
    }, 140);
  }

  /* ================= 快速记一家：只打店名，点一下就存 ================= */
  function openQuick() {
    openSheet('<div class="sheet-h">快速记一家</div>' +
      '<div class="sheet-sub">刷到店就把店名打进来（或粘进来），点一下高德的结果就存好了。坐标、地址、区自动填，不用填表。</div>' +
      '<input id="quickBox" class="city-input" placeholder="店名，比如 诚锋石磨肠粉" autocomplete="off" enterkeyhint="search">' +
      '<div class="act-row"><button class="btn primary" data-act="quick-go">查高德</button></div>' +
      '<div id="quickList"></div>' +
      '<div class="hint">存完弹层不关，可以直接接着打下一家，连记不用来回点。</div>');
  }

  function quickGo() {
    var b = $('#quickBox');
    var q = b ? String(b.value || '').trim() : '';
    if (!q) { toast('先写个店名'); return; }
    if (!amapKey()) { openAmapKey(); toast('先填高德 Key，就一次'); return; }
    var box = $('#quickList');
    if (box) box.innerHTML = '<div class="hint">查高德…</div>';
    var url = 'https://restapi.amap.com/v3/place/text?key=' + encodeURIComponent(amapKey()) +
      '&keywords=' + encodeURIComponent(q) + '&offset=6&page=1&extensions=base' +
      '&city=' + encodeURIComponent(S.city) + '&citylimit=true';
    jsonp(url, function (d) {
      if (!d || String(d.status) !== '1' || !d.pois || !d.pois.length) {
        var info = (d && d.info) || '';
        var why = info === 'USERKEY_PLAT_NOMATCH'
          ? '高德 Key 的类型不对，要去控制台选「Web服务」'
          : info === 'INVALID_USER_KEY' ? 'Key 无效，或者刚建好还没生效'
          : info === 'CUQPS_HAS_EXCEEDED_THE_LIMIT' ? '查太快了，等两秒再点'
          : info && info !== 'OK' ? info : '没搜到，换个写法';
        if (box) box.innerHTML = '<div class="hint">' + esc(why) + '</div>';
        return;
      }
      state.quick = d.pois;
      if (box) {
        box.innerHTML = d.pois.map(function (p, i) {
          var addr = (typeof p.address === 'string' ? p.address : '');
          return '<div class="poi-row" data-act="quick-pick" data-i="' + i + '">' +
            '<b>' + esc(p.name) + '</b>' +
            '<span>' + esc((p.adname || '') + addr) + '</span>' +
            '</div>';
        }).join('');
      }
    });
  }

  /* 点一条就落库：不再走表单。要补口味/改来源再进详情。 */
  function quickPick(i) {
    var p = (state.quick || [])[i];
    if (!p) return;
    var loc = String(p.location || '').split(',');
    var lng = +loc[0], lat = +loc[1];
    if (!lat || !lng) { toast('这条没有坐标，换个结果'); return; }
    var name = String(p.name || '').trim();
    if (!name) { toast('这条没名字，换个结果'); return; }
    var cat = guessCat(name);
    var taste = (window.TASTE_BY_CUISINE || {})[cat] || [1, 1, 2, 2.5, 1, 2, 2.5, 2, 1];
    S.places.push({
      id: uid('p'), kind: 'eat', name: name, city: S.city,
      lat: lat, lng: lng,
      address: (typeof p.address === 'string' ? p.address : ''), region: p.adname || '',
      flavors: [], category: cat, cuisine: cat, price: 2, scene: '一人食',
      dish: '', quote: '', sourceUrl: '', own: true, taste: arrToVec(taste)
    });
    save(); render();
    toast('记下了：' + name + '（' + PRICE_LBL[2] + '先按这个猜的，能改）');
    var b = $('#quickBox');
    if (b) { b.value = ''; if (b.focus) b.focus(); }
    var box = $('#quickList');
    if (box) box.innerHTML = '<div class="hint">已经存好，接着打下一家。</div>';
    state.quick = [];
  }

  /* ================= 批量粘贴：一次多家 ================= */
  var PRICE_LBL = ['', '¥30 内', '¥30–80', '¥80–150', '¥150+'];

  /* 按店名/菜名猜菜系。猜错不要紧，导入后在详情里能改。 */
  function guessCat(s) {
    var t = String(s || '');
    if (/(肠粉|拉肠|烧鹅|烧腊|煲仔|叉烧|云吞|茶餐厅|早茶|粤)/.test(t)) return '粤菜';
    if (/(潮汕|牛肉丸|粿|砂锅粥)/.test(t)) return '潮汕';
    if (/(川|麻辣|水煮|串串|酸菜鱼)/.test(t)) return '川';
    if (/(本帮|生煎|小笼|浓油|上海)/.test(t)) return '本帮';
    if (/(卤|鸭脖|藕片)/.test(t)) return '热卤';
    return '小吃';
  }

  function openBatch() {
    openSheet('<div class="sheet-h">批量粘贴</div>' +
      '<div class="sheet-sub">一次贴好几家。一家一行，或者一家一段（中间空一行）。能认出店名、菜、人均、地址、链接。</div>' +
      '<textarea id="batchBox" class="paste" rows="8" placeholder="📍诚锋石磨肠粉 新港中路456号 人均15 石磨肠粉薄到透光\n📍老地方巢皮肠粉 新港中路452号 人均12 皮太厚，豉油死咸\n📍盛香亭丽影广场店 人均40 热卤藕片鸭脖"></textarea>' +
      '<div class="act-row two"><button class="btn ghost" data-act="paste-clip">从剪贴板读</button>' +
      '<button class="btn primary" data-act="batch-parse">拆成清单</button></div>' +
      '<div class="hint">拆完能勾掉不要的，再一键查坐标。查不到的留空，回头点地图补。</div>');
  }

  /* 一家一段（空行分隔）优先；整段没空行就按行拆 */
  function splitBatch(text) {
    var t = String(text || '').replace(/\r/g, '').trim();
    if (!t) return [];
    var blocks = t.split(/\n\s*\n+/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (blocks.length < 2) {
      blocks = t.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    }
    return blocks;
  }

  function batchParse() {
    var box = $('#batchBox');
    var blocks = splitBatch(box ? box.value : '');
    if (!blocks.length) { toast('先粘点东西进来'); return; }
    state.batch = {
      items: blocks.map(function (b) {
        var r = parseNote(b);
        var nm = r.name;
        if (!nm && b.length <= 20) nm = b.replace(/^[📍🏠🍜🍲✨·\-\s\d.、]+/, '').trim();
        return {
          text: b, name: nm || '', dish: r.dish || '', address: r.address || '',
          price: r.price || 0, url: r.url || '', platform: r.platform || '',
          lat: 0, lng: 0, region: '', geo: 0, on: !!nm
        };
      })
    };
    openBatchList();
  }

  function openBatchList() {
    var items = (state.batch && state.batch.items) || [];
    var rows = items.map(function (it, i) {
      var tag = it.geo === 1 ? '<b class="bok">已定位</b>'
        : it.geo === 2 ? '<b class="bbad">没查到</b>'
        : it.geo === 3 ? '<b class="bwait">查…</b>' : '';
      var meta = [it.dish, it.price ? PRICE_LBL[it.price] : '', it.address, it.platform]
        .filter(Boolean).map(esc).join(' · ');
      return '<div class="brow' + (it.on ? '' : ' off') + '" data-act="batch-toggle" data-i="' + i + '">' +
        '<span class="chk">' + (it.on ? '✓' : '') + '</span>' +
        '<div class="bmain"><b>' + esc(it.name || '（没认出店名，先取消勾选）') + '</b>' +
        (meta ? '<span>' + meta + '</span>' : '') + tag + '</div></div>';
    }).join('');
    var picked = items.filter(function (it) { return it.on && it.name; });
    openSheet('<div class="sheet-h">拆出 ' + items.length + ' 家，勾了 ' + picked.length + ' 家</div>' +
      '<div class="sheet-sub">点一行可以取消或恢复。名字不准的也可以先导入，再点进去改。</div>' +
      '<div class="blist">' + rows + '</div>' +
      '<div class="act-row two"><button class="btn ghost" data-act="batch-geo">查坐标</button>' +
      '<button class="btn primary" data-act="batch-import">导入 ' + picked.length + ' 家</button></div>' +
      '<div class="act-row"><button class="btn ghost" data-act="batch">返回重粘</button></div>');
  }

  function batchToggle(i) {
    var it = state.batch && state.batch.items[i];
    if (!it) return;
    it.on = !it.on;
    openBatchList();
  }

  /* 逐条查高德。必须节流：高德有 QPS 限制，连发会返回 CUQPS_HAS_EXCEEDED_THE_LIMIT */
  function batchGeo() {
    var items = (state.batch && state.batch.items) || [];
    var todo = items.filter(function (it) { return it.on && it.name && it.geo !== 1; });
    if (!todo.length) { toast('没有要查的了'); return; }
    if (!amapKey()) { openAmapKey(); toast('先填高德 Key'); return; }
    var i = 0;
    (function step() {
      if (i >= todo.length) { openBatchList(); toast('查完了'); return; }
      var it = todo[i++];
      it.geo = 3;
      openBatchList();
      var url = 'https://restapi.amap.com/v3/place/text?key=' + encodeURIComponent(amapKey()) +
        '&keywords=' + encodeURIComponent(it.name) + '&offset=1&page=1&extensions=base' +
        '&city=' + encodeURIComponent(S.city) + '&citylimit=true';
      jsonp(url, function (d) {
        var p = (d && String(d.status) === '1' && d.pois && d.pois[0]) || null;
        if (p && p.location) {
          var loc = String(p.location).split(',');
          it.lng = +loc[0]; it.lat = +loc[1];
          it.region = p.adname || '';
          if (!it.address) it.address = (typeof p.address === 'string' ? p.address : '') ;
          it.geo = 1;
        } else {
          it.geo = 2;
        }
        setTimeout(step, 600);
      });
    })();
  }

  function batchImport() {
    var items = ((state.batch && state.batch.items) || []).filter(function (it) { return it.on && it.name; });
    if (!items.length) { toast('一家都没勾'); return; }
    var base = cityCenter(S.city) || FALLBACK;
    items.forEach(function (it) {
      var cat = guessCat(it.name + ' ' + it.dish);
      var taste = (window.TASTE_BY_CUISINE || {})[cat] || [1, 1, 2, 2.5, 1, 2, 2.5, 2, 1];
      S.places.push({
        id: uid('p'), kind: 'eat', name: it.name, city: S.city,
        lat: it.lat || (state.loc ? state.loc.lat : base.lat),
        lng: it.lng || (state.loc ? state.loc.lng : base.lng),
        address: it.address || '', region: it.region || '',
        flavors: [], category: cat, cuisine: cat, price: it.price || 2, scene: '一人食',
        dish: it.dish || '', quote: it.dish ? '' : String(it.text || '').slice(0, 60),
        sourceUrl: it.url || '', own: true, taste: arrToVec(taste)
      });
    });
    save(); state.batch = null; closeSheet(); render();
    var noGeo = items.filter(function (it) { return !it.geo; }).length;
    toast('导入 ' + items.length + ' 家' + (noGeo ? '，' + noGeo + ' 家没坐标，点地图补' : ''));
  }

  /* ================= 渲染总入口 ================= */
  function render() {
    var v = $('#view');
    var scroll = v.scrollTop;
    if (state.tab === 'nearby') v.innerHTML = viewNearby();
    else if (state.tab === 'checkin') v.innerHTML = viewCheckin();
    else v.innerHTML = viewMine();
    v.scrollTop = scroll;
    $$('#tabs .tab').forEach(function (t) {
      t.classList.toggle('on', t.dataset.tab === state.tab);
    });
    if (state.tab === 'nearby') mountMap();
  }

  /* ================= 弹层 ================= */
  function openSheet(html) {
    var root = $('#sheet-root');
    root.innerHTML = '<div class="mask"></div><div class="sheet"><div class="grip"></div>' + html + '</div>';
    root.classList.add('open');
    $('.mask', root).addEventListener('click', closeSheet);
  }
  function closeSheet() {
    var root = $('#sheet-root');
    root.classList.remove('open');
    setTimeout(function () { if (!root.classList.contains('open')) root.innerHTML = ''; }, 260);
  }

  /* 你 vs 这家的九维对照 */
  function cmpHTML(p) {
    var me = (S.me && S.me.taste) || {};
    var v = vecOf(p);
    if (!v) return '';
    return '<div class="cmp">' + DIMS.map(function (d) {
      var a = clamp(num(me[d.k], 2.5), 0, 5), b = clamp(num(v[d.k], 2.5), 0, 5);
      return '<div class="crow"><b>' + d.n + '</b>' +
        '<div class="cbar"><i class="you" style="width:' + (a / 5 * 100) + '%"></i></div>' +
        '<div class="cbar"><i class="it" style="width:' + (b / 5 * 100) + '%"></i></div></div>';
    }).join('') + '</div>' +
      '<div class="clegend"><span><i class="you"></i>你</span><span><i class="it"></i>这家</span></div>';
  }

  function openPlace(id) {
    var p = placeById(id);
    if (!p) return;
    var a = authorOf(p);
    var d = state.loc ? haversine(state.loc, p) : null;
    var v = visitOf(p.id);
    var t = tasteOf(p);

    var ds = dishesOf(p);
    var dishHTML = ds.length
      ? '<div class="dsec"><div class="dsec-h">' + ds.length + ' 道菜' + (p.kind === 'spot' ? '' : '，按推荐度排') + '</div>' +
        ds.slice().sort(function (a, b) { return (b.h || 2) - (a.h || 2); }).map(function (dh) {
          var hot = Math.max(1, Math.min(3, dh.h || 2));
          return '<div class="dish"><div class="dish-top"><b>' + esc(dh.n) + '</b>' +
            '<span class="heat h' + hot + '">' + (hot === 3 ? '必点' : hot === 2 ? '值得' : '凑数') + '</span></div>' +
            (dh.note ? '<div class="dish-note">' + esc(dh.note) + '</div>' : '') + '</div>';
        }).join('') + '</div>'
      : '';

    var meta = [];
    if (p.kind === 'spot') meta.push('景点');
    if (p.cuisine) meta.push(esc(p.cuisine));
    if (regionOf(p)) meta.push(esc(regionOf(p)));
    if (p.address) meta.push(esc(p.address));
    if (p.price) meta.push(priceHTML(p));
    meta.push(['', '到处都有', '本地人常去', '本地招牌'][p.local || 2]);

    openSheet(
      '<div class="dhero">' +
        '<div class="dh-top"><h2>' + esc(p.name) + '</h2>' +
          '<span class="dh-dist">' + (d != null ? distText(d) : '未定位') + '</span></div>' +
        '<div class="dh-sub">' + meta.join(' · ') + '</div>' +
      '</div>' +
      '<div class="three">' +
        '<button class="tb ' + (v && v.verdict === 'good' ? 'on good' : '') + '" data-act="good" data-id="' + p.id + '">好吃</button>' +
        '<button class="tb ' + (v && v.verdict === 'bad' ? 'on bad' : '') + '" data-act="bad" data-id="' + p.id + '">不好吃</button>' +
        '<button class="tb ' + (wantOf(p.id) ? 'on want' : '') + '" data-act="want" data-id="' + p.id + '">稍后去吃</button>' +
      '</div>' +
      '<button class="btn primary wide" data-act="nav" data-id="' + p.id + '">一键导航</button>' +
      (a ? '<div class="rec">' +
        '<div class="rec-h">' + (a.own ? '来源' : '1 位推荐者') + '</div>' +
        '<div class="rec-top">' + avatarHTML(a) + '<b>' + esc(a.name) + '</b>' +
          '<span class="rec-src">' + esc(a.platform || '') + '</span>' +
          '<span class="rec-hit">' + (a.own
            ? (v ? (v.verdict === 'bad' ? '你记成不好吃' : '你记成好吃') : '还没吃过')
            : (a.blogger.hits && a.blogger.hits.total ? '命中 ' + Math.round(relOf(a.blogger) * 100) + '%' : '还没验证')) + '</span>' +
        '</div>' +
        (p.quote ? '<p class="rec-quote">' + esc(p.quote) + '</p>' : '') +
        ((p.flavors || []).length || p.cuisine
          ? '<div class="c-tags">' + (p.flavors || []).map(function (f) { return '<i>' + esc(f) + '</i>'; }).join('') +
            (p.cuisine ? '<i class="soft">' + esc(p.cuisine) + '</i>' : '') + '</div>'
          : '') +
      '</div>' : '') +
      dishHTML +
      (p.kind === 'spot' ? '' :
        '<div class="cmphead"><b>口味 ' + Math.round(t.sim * 100) + '%</b>' +
        (t.mult < 1 ? '<span class="warnmark">已降权</span>' : '') + '</div>') +
      (p.kind === 'spot' ? '' : cmpHTML(p)) +
      (p.kind === 'spot' ? '' : whyHTML(t)) +
      (p.sourceUrl
        ? '<div class="kv"><b>来源</b><span><a href="' + esc(p.sourceUrl) + '" target="_blank" rel="noopener">' +
          esc((p.src && p.src.platform) || '打开原文') + '</a></span></div>'
        : '') +
      (v && v.note ? '<div class="kv"><b>我的备注</b><span>' + esc(v.note) + '</span></div>' : '') +
      '<div class="act-row">' +
        '<button class="btn ghost" data-act="editplace" data-id="' + p.id + '">编辑</button>' +
        '<button class="btn ghost" data-act="hide" data-id="' + p.id + '">不感兴趣</button>' +
        '<button class="btn danger" data-act="delplace" data-id="' + p.id + '">删除</button>' +
      '</div>'
    );
  }

  /* 两个按钮代替五颗星：少想一步，命中率还算得准 */
  function recordVerdict(id, verdict) {
    var p = placeById(id);
    if (!p) return;
    var v = visitOf(id);
    var prev = v ? v.verdict : null;
    var rating = verdict === 'good' ? 4.5 : 1.5;
    if (v) { v.verdict = verdict; v.rating = rating; v.at = Date.now(); }
    else S.visits.push({ placeId: id, verdict: verdict, rating: rating, note: '', at: Date.now() });

    var b = bloggerById(p.bloggerId);
    if (b) {
      if (!b.hits) b.hits = { good: 0, total: 0 };
      if (prev == null) {
        b.hits.total++;
        if (verdict === 'good') b.hits.good++;
      } else if (prev !== verdict) {
        if (prev === 'good') b.hits.good = Math.max(0, b.hits.good - 1);
        else b.hits.good++;
      }
    }
    save();
    render();
    if ($('.sheet')) openPlace(id);
    var msg = verdict === 'good' ? '记成好吃了' : '记成不好吃了';
    toast(b && b.hits && b.hits.total ? msg + ' ·「' + b.name + '」命中 ' + Math.round(relOf(b) * 100) + '%' : msg);
  }

  function toggleWant(id) {
    var on = !wantOf(id);
    setWant(id, on);
    render();
    if ($('.sheet')) openPlace(id);
    toast(on ? '存进「稍后去吃」了' : '从「稍后去吃」拿出来了');
  }

  function openRate(id) {
    var p = placeById(id);
    if (!p) return;
    openSheet(
      '<h3>吃过 ' + esc(p.name) + ' 了？</h3>' +
      '<div class="three">' +
        '<button class="tb" data-act="good" data-id="' + id + '">好吃</button>' +
        '<button class="tb" data-act="bad" data-id="' + id + '">不好吃</button>' +
      '</div>' +
      '<p class="hint">只记这两档，比打分快，而且能让推荐你的博主命中率更准。</p>'
    );
  }

  /* ================= 口味测试 ================= */
  function quizHTML() {
    var q = state.quiz, i = q.i;
    if (q.done) {
      var ty = typeOf(q.vec);
      return '<h3>你的口味画像</h3>' +
        '<div class="typebox big"><div class="tname">' + ty.name + '</div>' +
        '<div class="tcode">' + ty.code + '</div>' +
        '<div class="tsub">这四个字只是好记的名字，真正在算的是下面九个数。</div></div>' +
        barsHTML(q.vec) +
        '<p class="c-quote" style="margin:14px 0">已经存下了。回「附近」看排序，顶部的模式切换也会跟着你的旅游习惯。</p>' +
        '<button class="btn primary" data-act="quiz-finish">收下这份画像</button>';
    }
    var cur = QUIZ[i], ans = q.ans[i];
    return '<div class="qtop"><span>' + (i + 1) + ' / ' + QUIZ.length + '</span>' +
      '<div class="qbar"><i style="width:' + ((i) / QUIZ.length * 100) + '%"></i></div></div>' +
      '<h2 class="qtitle">' + cur.q + '</h2>' +
      '<div class="qopts">' + cur.opts.map(function (o, j) {
        var on = cur.multi ? (ans || []).indexOf(j) >= 0 : ans === j;
        return '<button class="qopt ' + (on ? 'on' : '') + '" data-act="quiz-opt" data-i="' + j + '">' + o.t + '</button>';
      }).join('') + '</div>' +
      '<div class="qnav">' +
        (i > 0 ? '<button class="btn ghost" data-act="quiz-prev">上一题</button>' : '') +
        (i < QUIZ.length - 1
          ? '<button class="btn ' + (cur.multi ? 'primary' : 'ghost') + '" data-act="quiz-next">下一题</button>'
          : '<button class="btn primary" data-act="quiz-done">看结果</button>') +
      '</div>';
  }

  function paintQuiz() {
    var sh = $('.sheet');
    if (sh) sh.innerHTML = quizHTML();
  }

  function openQuiz() {
    state.quiz = { i: 0, ans: {}, vec: null, done: false, travel: 'me', price: 2, scenes: [] };
    openSheet(quizHTML());
  }

  function quizPick(j) {
    var q = state.quiz, cur = QUIZ[q.i];
    if (cur.multi) {
      var arr = q.ans[q.i] || (q.ans[q.i] = []);
      var k = arr.indexOf(j);
      if (k >= 0) arr.splice(k, 1); else arr.push(j);
      paintQuiz();
      return;
    }
    q.ans[q.i] = j;
    paintQuiz();
    if (q.i < QUIZ.length - 1) setTimeout(function () { state.quiz.i++; paintQuiz(); }, 150);
  }

  function quizNext() {
    if (state.quiz.i < QUIZ.length - 1) { state.quiz.i++; paintQuiz(); }
  }
  function quizPrev() {
    if (state.quiz.i > 0) { state.quiz.i--; paintQuiz(); }
  }

  function quizDone() {
    var q = state.quiz;
    var v = {}, d;
    DIMS.forEach(function (x) { v[x.k] = 2.5; });   /* 中性起点 */
    var travel = 'me', price = 2, scenes = [];
    QUIZ.forEach(function (cur, i) {
      var a = q.ans[i];
      if (cur.multi) {
        (a || []).forEach(function (j) { scenes.push(cur.opts[j].t); });
        return;
      }
      if (a == null) return;
      var o = cur.opts[a];
      if (cur.travel) { travel = o.v; return; }
      if (cur.price) { price = o.v; return; }
      if (!cur.d) return;
      if (cur.add) v[cur.d] = clamp(v[cur.d] + o.v, 0, 5);
      else v[cur.d] = clamp(o.v, 0, 5);
    });
    q.vec = v;
    q.travel = travel;
    q.price = price;
    q.scenes = scenes;
    q.done = true;
    paintQuiz();
  }

  function quizFinish() {
    var q = state.quiz;
    if (!S.me) S.me = {};
    S.me.taste = q.vec;
    S.me.quizAt = Date.now();
    if (q.scenes.length) S.me.scenes = q.scenes;
    if (q.price) S.me.price = q.price;
    state.mode = q.travel || 'me';
    save();
    closeSheet();
    if (state.tab !== 'nearby') state.tab = 'nearby';
    render();
    toast('画像存好了 · 现在是「' + MODES[state.mode].label + '」');
  }

  /* ================= 表单 ================= */
  function tasteRowOpts(cur) {
    var out = '';
    for (var i = 0; i <= 10; i++) {
      var val = i / 2;
      out += '<option value="' + val + '"' + (Math.abs(cur - val) < 0.01 ? ' selected' : '') + '>' + r1(val) + '</option>';
    }
    return out;
  }

  function placeForm(p) {
    p = p || {};
    var isEdit = !!p.id;
    function opt(list, cur) {
      return list.map(function (x) { return '<option value="' + x + '"' + (cur === x ? ' selected' : '') + '>' + x + '</option>'; }).join('');
    }
    var base = p.taste || (p.cuisine && (window.TASTE_BY_CUISINE || {})[p.cuisine]) || null;
    var baseVec = base ? (Array.isArray(base) ? arrToVec(base) : base) : null;
    var tasteCells = DIMS.map(function (d) {
      var v = baseVec ? num(baseVec[d.k], 2.5) : 2.5;
      return '<label class="f tcell"><span>' + d.n + '</span>' +
        '<select name="t_' + d.k + '">' + tasteRowOpts(v) + '</select></label>';
    }).join('');
    /* 谁推荐的：第一项永远是「我自己」。自己找的店最常见，放最前面当默认。 */
    var selfSel = !!p.own || (!isEdit && !p.bloggerId);
    var bopts = ['<option value="self"' + (selfSel ? ' selected' : '') + '>我自己（自己找的）</option>']
      .concat(['<option value=""' + (!selfSel && !p.bloggerId ? ' selected' : '') + '>不标来源</option>'])
      .concat(S.bloggers.map(function (b) {
        return '<option value="' + b.id + '"' + (!p.own && p.bloggerId === b.id ? ' selected' : '') + '>' + esc(b.name) + '</option>';
      })).join('');

    return '<h3>' + (isEdit ? '编辑' : '收录一家') + '</h3>' +
      '<form id="f-place" data-id="' + (p.id || '') + '">' +
        '<label class="f"><span>店名 / 地点名</span><input type="text" name="name" required value="' + esc(p.name || '') + '" placeholder="视频里说的那家"></label>' +
        '<div class="act-row" style="margin:-4px 0 10px"><button type="button" class="mini' + (amapKey() ? '' : ' ghost') + '" data-act="lookup">' +
          (amapKey() ? '按店名查高德，自动填地址和坐标' : '按店名查高德（要先填 Key）') + '</button></div>' +
        '<div id="amapList"></div>' +
        '<div class="row2">' +
          '<label class="f"><span>类型</span><select name="kind"><option value="eat"' + (p.kind !== 'spot' ? ' selected' : '') + '>吃</option><option value="spot"' + (p.kind === 'spot' ? ' selected' : '') + '>逛（景点）</option></select></label>' +
          '<label class="f"><span>城市</span><input type="text" name="city" value="' + esc(p.city || S.city || '') + '"></label>' +
        '</div>' +
        '<div class="row2">' +
          '<label class="f"><span>品类</span><select name="category">' + opt([''].concat(CATEGORIES), p.category || '') + '</select></label>' +
          '<label class="f"><span>人均</span><select name="price">' + opt(['1', '2', '3', '4'], String(p.price || 2)) + '</select></label>' +
        '</div>' +
        '<div class="row2">' +
          '<label class="f"><span>场景</span><select name="scene">' + opt([''].concat(SCENES), p.scene || '') + '</select></label>' +
          '<label class="f"><span>本地度</span><select name="local">' +
            '<option value="3"' + ((p.local || 2) === 3 ? ' selected' : '') + '>本地招牌</option>' +
            '<option value="2"' + ((p.local || 2) === 2 ? ' selected' : '') + '>本地人常去</option>' +
            '<option value="1"' + (p.local === 1 ? ' selected' : '') + '>到处都有</option>' +
          '</select></label>' +
        '</div>' +
        '<label class="f"><span>谁推荐的</span><select name="bloggerId">' + bopts + '</select></label>' +
        '<label class="f"><span>招牌菜</span><input type="text" name="dish" value="' + esc(p.dish || '') + '" placeholder="红烧肉、生煎"></label>' +
        '<div class="field"><span>口味（这家有多辣 / 多甜 / 多咸…）</span><div class="tgrid">' + tasteCells + '</div></div>' +
        '<label class="f"><span>博主原话 / 备注</span><textarea name="quote" placeholder="他原话怎么说的，抄一句最有用的">' + esc(p.quote || '') + '</textarea></label>' +
        '<label class="f"><span>视频 / 笔记链接</span><input type="text" name="sourceUrl" value="' + esc(p.sourceUrl || '') + '" placeholder="抖音、小红书链接，方便回看"></label>' +
        '<label class="f"><span>地址</span><input type="text" name="address" value="' + esc(p.address || '') + '"></label>' +
        '<div class="field"><span>位置（点地图选，或直接用当前定位）</span>' +
          '<div class="mm" id="pickmap" style="height:200px"></div>' +
          '<div class="loc" id="pickinfo" style="margin-top:6px">' + (p.lat ? '已选：' + p.lat.toFixed(5) + ', ' + p.lng.toFixed(5) : '还没选位置') + '</div>' +
        '</div>' +
        '<input type="hidden" name="srcPlatform" value="' + esc((p.src && p.src.platform) || '') + '">' +
        '<input type="hidden" name="srcRaw" value="' + esc(String((p.src && p.src.raw) || '').slice(0, 300)) + '">' +
        '<input type="hidden" name="lat" value="' + (p.lat || '') + '">' +
        '<input type="hidden" name="lng" value="' + (p.lng || '') + '">' +
        '<input type="hidden" name="region" value="' + esc(p.region || '') + '">' +
        '<button type="button" class="btn ghost" data-act="use-loc">用当前位置</button>' +
        '<button class="btn primary" type="submit" style="margin-top:10px">' + (isEdit ? '保存' : '收进来') + '</button>' +
      '</form>';
  }

  /* ================= 高德：按店名补地址和坐标 ================= */
  function amapKey() { return String(S.amapKey || '').trim(); }

  function jsonp(url, cb) {
    var name = '__jp' + Math.floor(Math.random() * 1e6);
    var s = document.createElement('script');
    var done = false;
    window[name] = function (data) {
      if (done) return; done = true;
      try { cb(data); } catch (e) { cb(null); }
      try { delete window[name]; } catch (e) {}
      if (s.parentNode) s.parentNode.removeChild(s);
    };
    s.onerror = function () {
      if (done) return; done = true;
      try { delete window[name]; } catch (e) {}
      if (s.parentNode) s.parentNode.removeChild(s);
      cb(null);
    };
    s.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + name;
    (document.head || document.body).appendChild(s);
  }

  function lookup() {
    var f = $('#f-place'); if (!f) return;
    var el = f.elements;
    var q = el.name.value.trim();
    if (!q) { toast('先写个店名'); return; }
    if (!amapKey()) {
      openAmapKey();
      toast('先填高德 Key，免费申请');
      return;
    }
    var city = (el.city.value || S.city || '').trim();
    var url = 'https://restapi.amap.com/v3/place/text?key=' + encodeURIComponent(amapKey()) +
      '&keywords=' + encodeURIComponent(q) + '&offset=6&page=1&extensions=base' +
      (city ? '&city=' + encodeURIComponent(city) + '&citylimit=true' : '');
    var box = $('#amapList');
    if (box) box.innerHTML = '<div class="hint">查高德…</div>';
    jsonp(url, function (d) {
      if (!d || String(d.status) !== '1' || !d.pois || !d.pois.length) {
        var info = (d && d.info) || '';
        var why = info && info !== 'OK' ? info : '没搜到';
        /* 这两个错上次真踩过：Key 建成了别的类型，或者刚建的 Key 还没生效 */
        if (info === 'USERKEY_PLAT_NOMATCH') {
          why = '这个 Key 的类型不对——要在高德控制台选「Web服务」，不是 JS API 也不是微信小程序。' +
            '去控制台给同一个应用再「添加」一个 Key，服务平台选 Web服务，然后把新的那串换进来';
        } else if (info === 'INVALID_USER_KEY') {
          why = '这串 Key 无效（或者刚建好还没生效，等一分钟）';
        } else if (info === 'INSUFFICIENT_PRIVILEGES') {
          why = '这个 Key 的权限不够，可能要实名认证';
        } else if (info === 'DAILY_QUERY_OVER_LIMIT') {
          why = '今天的免费额度用完了，明天再来';
        }
        if (box) box.innerHTML = '<div class="hint">' + esc(why) + '</div>';
        return;
      }
      state.poi = d.pois;
      if (box) {
        box.innerHTML = '<div class="hint">点一条就填进去：</div>' + d.pois.map(function (p, i) {
          var addr = (typeof p.address === 'string' ? p.address : '');
          return '<div class="poi-row" data-act="pickpoi" data-i="' + i + '">' +
            '<b>' + esc(p.name) + '</b>' +
            '<span>' + esc((p.adname || '') + addr) + '</span>' +
            '</div>';
        }).join('');
      }
    });
  }

  function pickPoi(i) {
    var p = (state.poi || [])[i]; if (!p) return;
    var f = $('#f-place'); if (!f) return;
    var el = f.elements;
    var loc = String(p.location || '').split(',');
    var lng = +loc[0], lat = +loc[1];
    if (lat && lng) {
      el.lat.value = lat; el.lng.value = lng;
      if (el.lat.dispatchEvent) {} /* 保持简单：直接写隐藏域 */
      var info = $('#pickinfo');
      if (info) info.textContent = '已选：' + lat.toFixed(5) + ', ' + lng.toFixed(5);
      if (window._pickMap) {
        window._pickMap.c = { lat: lat, lng: lng };
        window._pickMap.setMarks([{ lat: lat, lng: lng, cls: 'hot' }]);
        window._pickMap.render();
      }
    }
    var addr = (typeof p.address === 'string') ? p.address : '';
    if (addr && !el.address.value) el.address.value = addr;
    if (p.adname && el.region) el.region.value = p.adname;
    if (!el.name.value) el.name.value = p.name;
    var box = $('#amapList');
    if (box) box.innerHTML = '<div class="hint">已填「' + esc(p.name) + '」，位置也选好了，直接保存。</div>';
    toast('填好了');
  }

  function openAmapKey() {
    openSheet('<div class="sheet-h">高德 Key</div>' +
      '<div class="sheet-sub">用来「输入店名 → 自动查地址和坐标」。免费：<br>' +
        '① 打开 lbs.amap.com → 注册/登录 → 控制台 → 应用管理 → 创建新应用<br>' +
        '② 添加 Key，服务平台选「<b>Web服务</b>」（不是 JS API）<br>' +
        '③ 把那一串字母数字粘到这里</div>' +
      '<input id="amapKeyInput" class="paste city-input" type="text" value="' + esc(S.amapKey || '') + '" placeholder="32 位字母数字">' +
      '<div class="act-row"><button class="btn primary" data-act="amapkey-save">保存</button></div>');
  }

  function openPlaceForm(p) {    openSheet(placeForm(p));
    var host = $('#pickmap');
    if (!host) return;
    var pin = (p && typeof p.lat === 'number') ? { lat: p.lat, lng: p.lng } : null;
    var center = pin || state.loc || FALLBACK;
    var map = new MiniMap(host, {
      center: center, zoom: pin ? 16 : (state.loc ? 16 : 12),
      onTap: function (pt) {
        pin = pt;
        map.setMarks([{ lat: pt.lat, lng: pt.lng, cls: 'hot' }]);
        map.render();
        var f = $('#f-place');
        f.elements.lat.value = pt.lat;
        f.elements.lng.value = pt.lng;
        $('#pickinfo').textContent = '已选：' + pt.lat.toFixed(5) + ', ' + pt.lng.toFixed(5);
      }
    });
    map.setMarks(pin ? [{ lat: pin.lat, lng: pin.lng, cls: 'hot' }] : []);
    setTimeout(function () { map.render(); }, 60);
    window._pickMap = map;
  }

  function openBlogger(b) {
    b = b || {};
    var isEdit = !!b.id;
    openSheet('<h3>' + (isEdit ? '编辑博主' : '添加博主') + '</h3>' +
      '<form id="f-blogger" data-id="' + (b.id || '') + '">' +
        '<label class="f"><span>名字</span><input type="text" name="name" required value="' + esc(b.name || '') + '"></label>' +
        '<label class="f"><span>主要在哪座城市</span><input type="text" name="city" value="' + esc(b.city || S.city || '') + '"></label>' +
        '<div class="row2">' +
          '<label class="f"><span>平台</span><select name="platform">' +
            ['抖音', '小红书', 'B站', '视频号', '公众号', '其他'].map(function (x) {
              return '<option' + (b.platform === x ? ' selected' : '') + '>' + x + '</option>';
            }).join('') + '</select></label>' +
          '<label class="f"><span>主页链接</span><input type="text" name="url" value="' + esc(b.url || '') + '"></label>' +
        '</div>' +
        '<label class="f"><span>备注（他怎么找店、口味偏好）</span><textarea name="note">' + esc(b.note || '') + '</textarea></label>' +
        '<button class="btn primary" type="submit">保存</button>' +
      '</form>');
  }

  /* ================= 定位 ================= */
  function locMsg(err) {
    var c = err && err.code;
    if (c === 1) return '定位权限被拒了。iPhone：设置 → Safari 浏览器 → 位置 → 改成「询问」或「允许」；或者长按地址栏左边那个「aA」看站点设置。';
    if (c === 2) return '系统给不出位置：定位服务可能关着（设置 → 隐私与安全性 → 定位服务 → Safari 网站）。';
    if (c === 3) return '等太久没回来。换个位置或换个网络再试。';
    return '没拿到位置：' + ((err && err.message) || '未知原因') + '。';
  }

  function locate() {
    if (!navigator.geolocation) {
      state.locStatus = 'denied';
      state.locErr = '这个浏览器不给定位接口。';
      render(); return;
    }
    state.locStatus = 'pending';
    state.locErr = '';
    state.pickMe = false;
    render();

    var done = false;
    function ok(pos) {
      if (done) return; done = true;
      var g = wgsToGcj(pos.coords.latitude, pos.coords.longitude);
      state.loc = g;
      state.acc = pos.coords.accuracy;
      state.locStatus = 'ok';
      state.locErr = '';
      state.mapView = { center: g, zoom: 15 };
      render();
      toast('定位成功 · 精度 ' + Math.round(pos.coords.accuracy || 0) + ' 米');
    }
    function giveUp(err) {
      if (done) return; done = true;
      state.locStatus = 'denied';
      state.locErr = locMsg(err);
      render();
      toast('没拿到位置：错误码 ' + ((err && err.code) || '?'));
    }
    function fail(err) {
      if (done) return;
      // 高精度在室内/隧道/部分安卓机上经常直接超时，降一档再试一次
      if (err && (err.code === 2 || err.code === 3)) {
        navigator.geolocation.getCurrentPosition(ok, giveUp,
          { enableHighAccuracy: false, timeout: 20000, maximumAge: 600000 });
        return;
      }
      giveUp(err);
    }
    navigator.geolocation.getCurrentPosition(ok, fail,
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  }

  /* ================= 表单处理 ================= */
  function submitPlace(e) {
    e.preventDefault();
    var f = e.target, el = f.elements;
    var name = el.name.value.trim();
    if (!name) return;
    var id = f.dataset.id;
    var p = id ? placeById(id) : null;
    if (!p) { p = { id: uid('p') }; S.places.unshift(p); }
    p.name = name;
    p.kind = el.kind.value;
    p.city = el.city.value.trim() || S.city;
    p.category = el.category.value;
    p.price = +el.price.value;
    p.scene = el.scene.value;
    p.local = +el.local.value;
    p.dish = el.dish.value.trim();
    p.quote = el.quote.value.trim();
    p.sourceUrl = el.sourceUrl.value.trim();
    if (el.srcRaw && el.srcRaw.value) {
      p.src = { platform: el.srcPlatform.value, raw: el.srcRaw.value };
    }
    p.address = el.address.value.trim();
    p.region = el.region ? el.region.value.trim() : '';
    var srcBy = el.bloggerId ? el.bloggerId.value : '';
    p.own = srcBy === 'self';
    p.bloggerId = p.own ? '' : srcBy;
    var tv = {};
    DIMS.forEach(function (d) { tv[d.k] = num(+el['t_' + d.k].value, 2.5); });
    p.taste = tv;
    if (el.lat.value && el.lng.value) {
      p.lat = +el.lat.value; p.lng = +el.lng.value;
    } else {
      delete p.lat; delete p.lng;
    }
    save();
    closeSheet();
    render();
    toast(id ? '已保存' : '收进来了');
  }

  function submitBlogger(e) {
    e.preventDefault();
    var f = e.target, el = f.elements;
    var name = el.name.value.trim();
    if (!name) return;
    var id = f.dataset.id;
    var b = id ? bloggerById(id) : null;
    if (!b) {
      b = { id: uid('b'), color: ['#C1492D', '#2F7D5D', '#B5651D', '#4A5D8F', '#8A5A9E'][S.bloggers.length % 5], hits: { good: 0, total: 0 } };
      S.bloggers.push(b);
    }
    b.name = name;
    b.city = (el.city && el.city.value.trim()) || S.city || '';
    b.platform = el.platform.value;
    b.url = el.url.value.trim();
    b.note = el.note.value.trim();
    save(); closeSheet(); render(); toast('已保存');
  }

  function submitRate(e) {
    e.preventDefault();
    var f = e.target, id = f.dataset.id;
    closeSheet();
    recordVerdict(id, f.dataset.verdict || 'good');
  }

  /* ================= 事件 ================= */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]');
    if (t) {
      var act = t.dataset.act, id = t.dataset.id, v = t.dataset.v;
      if (act === 'tab') {
        var nt = t.dataset.tab, changed = nt !== state.tab;
        state.tab = nt; render();
        if (changed) $('#view').scrollTop = 0;
        return;
      }
      if (act === 'mode') {
        state.mode = t.dataset.v; render();
        toast(MODES[state.mode].label + ' · ' + MODES[state.mode].tip);
        return;
      }
      if (act === 'kind') { state.kind = t.dataset.v; render(); return; }
      if (act === 'city') { openCity(); return; }
      if (act === 'lookup') { lookup(); return; }
      if (act === 'pickpoi') { pickPoi(+t.dataset.i); return; }
      if (act === 'hide') {
        S.hidden = S.hidden || [];
        if (S.hidden.indexOf(id) < 0) S.hidden.push(id);
        save(); closeSheet(); render(); toast('已隐藏，我的页能恢复');
        return;
      }
      if (act === 'unhide') {
        S.hidden = (S.hidden || []).filter(function (x) { return x !== id; });
        save(); render(); openHidden(); toast('恢复了');
        return;
      }
      if (act === 'hidden-list') { openHidden(); return; }
      if (act === 'amapkey') { openAmapKey(); return; }
      if (act === 'amapkey-save') {
        var elK = $('#amapKeyInput');
        S.amapKey = elK ? elK.value.trim() : '';
        save(); closeSheet(); render();
        toast(S.amapKey ? '高德 Key 已保存' : 'Key 已清空');
        return;
      }
      if (act === 'setcity') {
        S.city = v; save(); closeSheet(); state.mapView = null; render();
        toast('换到 ' + v + '（' + cityCount(v) + ' 家）');
        return;
      }
      if (act === 'newcity') { openNewCity(); return; }
      if (act === 'newcity-save') {
        var elN = $('#cityName'), nm = elN ? elN.value.trim() : '';
        if (!nm) { toast('写个城市名'); return; }
        S.city = nm; save(); closeSheet(); render(); toast('换到 ' + nm);
        return;
      }
      if (act === 'place') { openPlace(id); return; }
      if (act === 'rate') { openRate(id); return; }
      if (act === 'add') { openAdd(); return; }
      if (act === 'manual') { closeSheet(); setTimeout(function () { openPlaceForm(null); }, 120); return; }
      if (act === 'import') { openImport(); return; }
      if (act === 'quick') { openQuick(); return; }
      if (act === 'quick-go') { quickGo(); return; }
      if (act === 'quick-pick') { quickPick(+t.dataset.i); return; }
      if (act === 'batch') { openBatch(); return; }
      if (act === 'batch-parse') { batchParse(); return; }
      if (act === 'batch-toggle') { batchToggle(+t.dataset.i); return; }
      if (act === 'batch-geo') { batchGeo(); return; }
      if (act === 'batch-import') { batchImport(); return; }
      if (act === 'paste-clip') { readClip(); return; }
      if (act === 'parse') { doParse(); return; }
      if (act === 'mood') { openMood(); return; }
      if (act === 'mood-done') { closeSheet(); render(); toast('今儿：' + (moodText() || '随便')); return; }
      if (act === 'mood-clear') { moodSave(null); render(); toast('已清空今天的偏好'); return; }
      if (act === 'mood-dim') {
        moodEdit(function (m) {
          var i = m.dims.indexOf(v);
          if (i >= 0) m.dims.splice(i, 1);
          else if (m.dims.length < 3) m.dims.push(v);
          else toast('最多选 3 个');
        });
        return;
      }
      if (act === 'mood-intent') { moodEdit(function (m) { m.intent = m.intent === v ? '' : v; }); return; }
      if (act === 'mood-scene') { moodEdit(function (m) { m.scene = m.scene === v ? '' : v; }); return; }
      if (act === 'mood-hunger') { moodEdit(function (m) { m.hungry = v === 'starving' ? !m.hungry : false; }); return; }
      if (act === 'mood-price') { moodEdit(function (m) { m.price = num(m.price, 0) === +v ? 0 : +v; }); return; }
      if (act === 'addblogger') { openBlogger(null); return; }
      if (act === 'editblogger') { openBlogger(bloggerById(id)); return; }
      if (act === 'quiz') { openQuiz(); return; }
      if (act === 'quiz-opt') { quizPick(+t.dataset.i); return; }
      if (act === 'quiz-next') { quizNext(); return; }
      if (act === 'quiz-prev') { quizPrev(); return; }
      if (act === 'quiz-done') { quizDone(); return; }
      if (act === 'quiz-finish') { quizFinish(); return; }
      if (act === 'editplace') { closeSheet(); setTimeout(function () { openPlaceForm(placeById(id)); }, 120); return; }
      if (act === 'delplace') {
        if (!confirm('删掉「' + (placeById(id) || {}).name + '」？')) return;
        S.places = S.places.filter(function (p) { return p.id !== id; });
        S.deleted = S.deleted || [];
        if (S.deleted.indexOf(id) < 0) S.deleted.push(id);
        save(); closeSheet(); render(); toast('已删除'); return;
      }
      if (act === 'good') { recordVerdict(id, 'good'); return; }
      if (act === 'bad') { recordVerdict(id, 'bad'); return; }
      if (act === 'want') { toggleWant(id); return; }
      if (act === 'nav') {
        var p = placeById(id);
        if (p && typeof p.lat === 'number') {
          window.open('https://uri.amap.com/marker?position=' + p.lng + ',' + p.lat +
            '&name=' + encodeURIComponent(p.name) + '&src=tastemap&coordinate=gaode&callnative=1', '_blank');
        } else { toast('这家还没定位置'); }
        return;
      }
      if (act === 'use-loc') {
        var f = $('#f-place');
        if (!state.loc) { toast('还没定位到'); locate(); return; }
        f.elements.lat.value = state.loc.lat;
        f.elements.lng.value = state.loc.lng;
        $('#pickinfo').textContent = '已选（当前位置）：' + state.loc.lat.toFixed(5) + ', ' + state.loc.lng.toFixed(5);
        if (window._pickMap) {
          window._pickMap.c = state.loc;
          window._pickMap.z = 16;
          window._pickMap.setMarks([{ lat: state.loc.lat, lng: state.loc.lng, cls: 'hot' }]);
          window._pickMap.render();
        }
        return;
      }
      if (act === 'locate') { locate(); return; }
      if (act === 'pickme') {
        state.pickMe = true;
        render();
        toast('在地图上点一下你所在的位置');
        return;
      }
      if (act === 'export') {
        var blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'taste-map-' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
        /* iOS 的 Safari 会把「一阵子不用的网站」的本地存储清掉，
           导出的那一刻记个时间，下次打开超过 7 天就提醒再导一份。 */
        S.lastBackup = Date.now();
        save();
        toast('导出了。存到「文件」里，别只留在下载列表。');
        return;
      }
      if (act === 'import') { $('#importFile').click(); return; }
      if (act === 'reset') {
        if (!confirm('恢复示例数据？现在的数据会被覆盖。')) return;
        S = freshSeed(); save(); render(); toast('已恢复示例数据'); return;
      }
      if (act === 'me-scene') {
        if (!S.me) S.me = {};
        var arr = S.me.scenes || (S.me.scenes = []);
        var i = arr.indexOf(t.dataset.v);
        if (i >= 0) arr.splice(i, 1); else arr.push(t.dataset.v);
        save(); render(); return;
      }
    }
  });

  /* 口味滑杆：拖动时只改数字，松手才落盘，避免边拖边重渲染 */
  document.addEventListener('input', function (e) {
    var r = e.target;
    if (r.dataset && r.dataset.dim) {
      if (!S.me) S.me = {};
      if (!S.me.taste) S.me.taste = {};
      S.me.taste[r.dataset.dim] = +r.value;
      var em = r.parentNode.querySelector('em');
      if (em) em.textContent = r1(+r.value);
    }
  });
  document.addEventListener('change', function (e) {
    var r = e.target;
    if (r.dataset && r.dataset.dim) {
      save();
      toast('已更新口味 · 去「附近」看排序');
      return;
    }
    if (r.id === 'importFile' && r.files && r.files[0]) {
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var o = JSON.parse(fr.result);
          if (!o.places || !o.bloggers) throw new Error('格式不对');
          if (!confirm('导入会覆盖现在的数据，继续？')) return;
          S = migrate(o); save(); render(); toast('导入成功');
        } catch (err) { toast('导入失败：' + err.message); }
      };
      fr.readAsText(r.files[0]);
    }
  });

  document.addEventListener('submit', function (e) {
    if (e.target.id === 'f-place') submitPlace(e);
    else if (e.target.id === 'f-blogger') submitBlogger(e);
    else if (e.target.id === 'f-rate') submitRate(e);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSheet();
    /* 快速记一家：回车就查，手机键盘走「搜索」键 */
    if (e.key === 'Enter' && e.target && e.target.id === 'quickBox') { e.preventDefault(); quickGo(); }
  });

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (state.tab === 'nearby') { var m = $('#map'); if (m) mountMap(); }
    }, 200);
  });

  /* ================= 启动 ================= */
  S = load();
  render();
  locate();
  askPersist();

  /* 暴露给自检脚本 */
  window.__tm = {
    ranked: ranked, tasteOf: tasteOf, state: state, quizDone: quizDone, typeOf: typeOf, render: render, quizHTML: quizHTML, parseNote: parseNote, moodText: moodText, openAdd: openAdd, locate: locate,
    setMode: function (m) { state.mode = m; return ranked(); },
    getS: function () { return S; },
    openPlace: openPlace, recordVerdict: recordVerdict, toggleWant: toggleWant,
    extraOf: extraOf, dishesOf: dishesOf, wantOf: wantOf,
    citiesOf: citiesOf, cityOf: cityOf, cityCount: cityCount, cityCenter: cityCenter,
    setCity: function (c) { S.city = c; save(); state.mapView = null; return ranked(); },
    setTab: function (t) { state.tab = t; },
    openPlaceForm: openPlaceForm, openHidden: openHidden, openAmapKey: openAmapKey,
    lookup: lookup, pickPoi: pickPoi, amapKey: amapKey, jsonp: jsonp, syncSeed: syncSeed,
    submitPlace: submitPlace, authorOf: authorOf, ownOf: ownOf,
    openBatch: openBatch, batchParse: batchParse, batchToggle: batchToggle,
    batchImport: batchImport, splitBatch: splitBatch, guessCat: guessCat,
    openQuick: openQuick, quickGo: quickGo, quickPick: quickPick
  };
})();

