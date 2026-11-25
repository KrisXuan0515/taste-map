/* 鍙ｅ懗鍦板浘 - 绂荤嚎缂撳瓨
   绛栫暐锛氬悓婧愯祫婧?network-first锛堟嬁鍒版柊鐗堝氨鐢ㄦ柊鐗堬紝鏂綉鎵嶅洖缂撳瓨锛夛紝
        閬垮厤寮€鍙戞湡鎵嬫満涓€鐩村悆鍒版棫鐨?app.js / data.js銆?*/
var CACHE = 'taste-map-v5';
var CORE = ['./', './index.html', './styles.css', './app.js', './data.js', './extra.js', './manifest.json', './icon.svg'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(CORE).catch(function () { /* 鍗曚釜澶辫触涓嶉樆濉炲畨瑁?*/ });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  // 楂樺痉鐡︾墖绛夌涓夋柟璧勬簮鐩存帴璧扮綉缁滐紝涓嶈繘缂撳瓨
  if (url.origin !== location.origin) return;

  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.status === 200) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        if (hit) return hit;
        if (req.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
