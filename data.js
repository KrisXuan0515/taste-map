/* 口味地图 · 示例数据
 * 城市：上海。坐标为 GCJ-02（高德坐标系），仅作演示，误差几十米属正常。
 * 博主原话为示例文案，不是真实引用。
 */
window.SEED = {
  city: '上海',
  me: {
    /* 口味向量：0–5，含义见 app.js 里的 DIMS。
       这里是「按用户自述」写的初始画像：爱吃甜、爱藤椒的麻、不吃辣、嫌咸。 */
    taste: {
      spicy: 0.5, numb: 4, sweet: 4, salty: 1, sour: 1.5,
      rich: 3, fresh: 3.5, smoke: 2.5, funky: 2
    },
    price: 2,
    scenes: ['一人食'],
    categories: ['面饭', '小吃'],
    quizAt: 0
  },
  bloggers: [
    {
      id: 'b_da',
      name: '达哥',
      city: '上海',
      platform: '抖音',
      url: '',
      color: '#C1492D',
      flavors: ['浓油赤酱', '咸鲜'],
      categories: ['家常菜'],
      price: 2,
      note: '只吃浓油赤酱这一类，店都是自己一家家找的，不接探店。',
      hits: { good: 0, total: 0 }
    },
    {
      id: 'b_may',
      name: '阿May',
      city: '上海',
      platform: '小红书',
      url: '',
      color: '#2F7D5D',
      flavors: ['清鲜', '甜口'],
      categories: ['面饭', '火锅'],
      price: 3,
      note: '示例博主：口味偏清淡，爱找老店。',
      hits: { good: 1, total: 2 }
    },
    {
      id: 'b_pang',
      name: '小胖探城',
      city: '上海',
      platform: '抖音',
      url: '',
      color: '#B5651D',
      flavors: ['麻辣', '烟火气'],
      categories: ['火锅', '烧烤'],
      price: 2,
      note: '示例博主：重口，专挑宵夜。',
      hits: { good: 0, total: 1 }
    },
    {
      id: 'b_nav',
      name: 'nav',
      city: '广州',
      platform: '视频',
      url: '',
      color: '#1F6FA8',
      flavors: ['粤菜', '镬气'],
      categories: ['粤菜', '烧腊'],
      price: 2,
      note: '广州。示例占位，等真数据。',
      hits: { good: 0, total: 0 }
    },
    {
      id: 'b_me',
      name: '我自己',
      city: '',
      platform: '自己踩的',
      url: '',
      color: '#6B6355',
      flavors: [],
      categories: [],
      price: 2,
      note: '自己找的、自己吃过的店。这类不该算「博主命中率」，只当作你自己的清单。',
      hits: { good: 0, total: 0 }
    }
  ],
  places: [
    {
      id: 'p_lanxin', kind: 'eat', name: '兰心餐厅', city: '上海',
      lat: 31.2210, lng: 121.4650, address: '进贤路 130 号',
      flavors: ['浓油赤酱'], category: '家常菜', price: 3, scene: '聚餐',
      dish: '红烧肉 · 油爆虾',
      quote: '「红烧肉是老派的甜，油光锃亮，配一碗白饭就够。门口排队一小时，值。」',
      sourceUrl: '', bloggerId: 'b_da'
    },
    {
      id: 'p_haijinzi', kind: 'eat', name: '海金滋', city: '上海',
      lat: 31.2216, lng: 121.4657, address: '进贤路 240 号',
      flavors: ['浓油赤酱'], category: '家常菜', price: 2, scene: '聚餐',
      dish: '酱鸭 · 草头圈子',
      quote: '「家常到不像在开店。老板认熟客，不认得我。」',
      sourceUrl: '', bloggerId: 'b_da'
    },
    {
      id: 'p_laojishi', kind: 'eat', name: '老吉士酒家', city: '上海',
      lat: 31.2032, lng: 121.4431, address: '天平路 41 号',
      flavors: ['浓油赤酱'], category: '家常菜', price: 4, scene: '聚餐',
      dish: '葱烤大排 · 蟹粉豆腐',
      quote: '「贵，但这两道菜就是那个味道，别点别的。」',
      sourceUrl: '', bloggerId: 'b_da'
    },
    {
      id: 'p_paoluo', kind: 'eat', name: '保罗酒楼', city: '上海',
      lat: 31.2183, lng: 121.4528, address: '富民路 271 号',
      flavors: ['浓油赤酱', '咸鲜'], category: '家常菜', price: 3, scene: '聚餐',
      dish: '罗宋汤 · 炸猪排',
      quote: '「老派西餐混着本帮，罗宋汤是小时候的味道。」',
      sourceUrl: '', bloggerId: 'b_da'
    },
    {
      id: 'p_guangmingcun', kind: 'eat', name: '光明邨大酒家', city: '上海',
      lat: 31.2185, lng: 121.4616, address: '淮海中路 588 号',
      flavors: ['咸鲜'], category: '小吃', price: 2, scene: '一人食',
      dish: '酱鸭 · 熏鱼',
      quote: '「熟食窗口的酱鸭比堂食稳，下午三点去不用排。」',
      sourceUrl: '', bloggerId: 'b_da'
    },
    {
      id: 'p_dahuchun', kind: 'eat', name: '大壶春', city: '上海',
      lat: 31.2382, lng: 121.4868, address: '四川中路 136 号',
      flavors: ['咸鲜'], category: '小吃', price: 1, scene: '一人食',
      dish: '生煎',
      quote: '「生煎是厚皮的，底脆，肉紧，不是那种一咬一包汤的路子。」',
      sourceUrl: '', bloggerId: 'b_da'
    },
    {
      id: 'p_xiaoyang', kind: 'eat', name: '小杨生煎', city: '上海',
      lat: 31.2292, lng: 121.4592, address: '吴江路 269 号',
      flavors: ['咸鲜'], category: '小吃', price: 1, scene: '一人食',
      dish: '生煎 · 咖喱牛肉汤',
      quote: '「连锁里最稳的一家，皮薄汤多，赶时间就它。」',
      sourceUrl: '', bloggerId: 'b_may'
    },
    {
      id: 'p_jiajia', kind: 'eat', name: '佳家汤包', city: '上海',
      lat: 31.2351, lng: 121.4702, address: '黄河路 90 号',
      flavors: ['咸鲜'], category: '小吃', price: 2, scene: '一人食',
      dish: '鲜肉汤包 · 蟹粉汤包',
      quote: '「皮薄到能看见汤，先开窗后喝汤，别一口闷。」',
      sourceUrl: '', bloggerId: 'b_da'
    },
    {
      id: 'p_aniang', kind: 'eat', name: '阿娘面', city: '上海',
      lat: 31.2168, lng: 121.4700, address: '思南路 36 号',
      flavors: ['清鲜'], category: '面饭', price: 2, scene: '一人食',
      dish: '黄鱼面 · 咸菜肉丝面',
      quote: '「汤是白的，咸菜现炒，黄鱼给得实在。」',
      sourceUrl: '', bloggerId: 'b_may'
    },
    {
      id: 'p_weixiangzhai', kind: 'eat', name: '味香斋', city: '上海',
      lat: 31.2202, lng: 121.4678, address: '雁荡路 14 号',
      flavors: ['咸鲜', '酱香'], category: '面饭', price: 1, scene: '一人食',
      dish: '麻酱面 · 小牛汤',
      quote: '「麻酱厚到拌不动，配一碗小牛汤刚好。」',
      sourceUrl: '', bloggerId: 'b_da'
    },
    {
      id: 'p_laofandian', kind: 'eat', name: '上海老饭店', city: '上海',
      lat: 31.2276, lng: 121.4900, address: '福佑路 242 号',
      flavors: ['浓油赤酱'], category: '家常菜', price: 3, scene: '带长辈',
      dish: '八宝鸭 · 虾子大乌参',
      quote: '「八宝鸭要提前订，本帮菜的门面，带长辈来不会错。」',
      sourceUrl: '', bloggerId: 'b_da'
    },
    {
      id: 'p_lvbolang', kind: 'eat', name: '绿波廊', city: '上海',
      lat: 31.2273, lng: 121.4924, address: '豫园路 115 号',
      flavors: ['甜口'], category: '小吃', price: 3, scene: '带长辈',
      dish: '桂花拉糕 · 眉毛酥',
      quote: '「点心比菜好，桂花拉糕要趁热。」',
      sourceUrl: '', bloggerId: 'b_may'
    },
    {
      id: 'p_chuanwei', kind: 'eat', name: '川味小馆（示例）', city: '上海',
      lat: 31.2301, lng: 121.4749, address: '示例地址',
      flavors: ['麻辣'], category: '火锅', price: 2, scene: '聚餐',
      dish: '水煮鱼',
      quote: '「红油是清的，不糊嘴，辣得有层次。」',
      sourceUrl: '', bloggerId: 'b_pang'
    },
    {
      id: 'p_chaoshan', kind: 'eat', name: '潮汕牛肉锅（示例）', city: '上海',
      lat: 31.2248, lng: 121.4602, address: '示例地址',
      flavors: ['清鲜'], category: '火锅', price: 3, scene: '聚餐',
      dish: '吊龙 · 沙茶酱',
      quote: '「吊龙八秒，沙茶酱自己调，别让服务员帮你。」',
      sourceUrl: '', bloggerId: 'b_may'
    },
    {
      id: 'p_bund', kind: 'spot', name: '外滩', city: '上海',
      lat: 31.2397, lng: 121.4900, address: '中山东一路',
      flavors: [], category: '', price: 0, scene: '',
      dish: '江景 · 万国建筑',
      quote: '「晚上七点亮灯，从南京东路走过去刚好。」',
      sourceUrl: '', bloggerId: ''
    },
    {
      id: 'p_yuyuan', kind: 'spot', name: '豫园', city: '上海',
      lat: 31.2270, lng: 121.4920, address: '福佑路 168 号',
      flavors: [], category: '', price: 0, scene: '',
      dish: '园林 · 九曲桥',
      quote: '「早上九点前进园，人少一半。」',
      sourceUrl: '', bloggerId: ''
    },
    {
      id: 'p_wukang', kind: 'spot', name: '武康路', city: '上海',
      lat: 31.2050, lng: 121.4380, address: '武康路',
      flavors: [], category: '', price: 0, scene: '',
      dish: '梧桐 · 老洋房',
      quote: '「从武康大楼往北走，一路都是梧桐。」',
      sourceUrl: '', bloggerId: ''
    },
    {
      id: 'p_jingan', kind: 'spot', name: '静安寺', city: '上海',
      lat: 31.2240, lng: 121.4450, address: '南京西路 1686 号',
      flavors: [], category: '', price: 0, scene: '',
      dish: '古刹 · 商圈',
      quote: '「香火旺，隔壁就是商场，逛吃一体。」',
      sourceUrl: '', bloggerId: ''
    },
    {
      id: 'p_taotaoju', kind: 'eat', name: '陶陶居（总店）', city: '广州',
      lat: 23.1189, lng: 113.2472, address: '第十甫路 20 号',
      flavors: [], category: '粤菜', price: 2, scene: '聚餐',
      dish: '烧鹅 · 虾饺',
      quote: '「早茶排队到十点，烧鹅皮还是脆的。」',
      sourceUrl: '', bloggerId: 'b_nav'
    },
    {
      id: 'p_bingsheng', kind: 'eat', name: '炳胜品味', city: '广州',
      lat: 23.1332, lng: 113.3272, address: '天河路 208 号',
      flavors: [], category: '粤菜', price: 3, scene: '聚餐',
      dish: '脆皮叉烧 · 捞起鱼生',
      quote: '「镬气足，叉烧带焦边。」',
      sourceUrl: '', bloggerId: 'b_nav'
    },
    {
      id: 'p_cantontower', kind: 'spot', name: '广州塔', city: '广州',
      lat: 23.1066, lng: 113.3245, address: '阅江西路 222 号',
      flavors: [], category: '', price: 0, scene: '',
      dish: '小蛮腰 · 夜景',
      quote: '「傍晚上塔，下来正好吃饭。」',
      sourceUrl: '', bloggerId: ''
    },
    {
      id: 'p_chengfeng', kind: 'eat', name: '诚峰石磨肠粉', city: '广州',
      lat: 23.0928, lng: 113.2618, address: '海珠区', region: '海珠区',
      flavors: [], category: '粤菜', price: 1, scene: '一人食',
      dish: '石磨肠粉',
      quote: '自己找的：米浆现磨，布拉肠薄到透光，豉油偏甜。',
      sourceUrl: '', bloggerId: 'b_me'
    },
    {
      id: 'p_shengxiangting', kind: 'eat', name: '盛香亭丽影广场店', city: '广州',
      lat: 23.0956, lng: 113.2738, address: '江南大道中丽影广场', region: '海珠区',
      flavors: [], category: '热卤', price: 1, scene: '一人食',
      dish: '热卤 · 藕片 · 鸭脖',
      quote: '自己找的：热卤现捞，辣度能选微辣；当宵夜比当正餐合适。',
      sourceUrl: '', bloggerId: 'b_me'
    },
    {
      id: 'p_laodifang', kind: 'eat', name: '老地方巢皮肠粉', city: '广州',
      lat: 23.0902, lng: 113.2685, address: '海珠区', region: '海珠区',
      flavors: [], category: '粤菜', price: 1, scene: '一人食',
      dish: '巢皮肠粉',
      quote: '踩雷：皮厚、豉油死咸。',
      sourceUrl: '', bloggerId: 'b_me'
    }
  ],
  visits: [
    { id: 'v_laodifang', placeId: 'p_laodifang', rating: 1.5, verdict: 'bad', at: '2026-11-25', note: '皮厚，豉油死咸' }
  ]
};

/* 本地度标注
 * local: 3 = 本地招牌（来这座城该吃这一类）  2 = 本地人常去  1 = 到处都有 / 外来菜系
 * cuisine: 菜系，用于展示和「吃本地」判断
 */
(function () {
  var LT = {
    p_lanxin: [3, '本帮'], p_haijinzi: [3, '本帮'], p_laojishi: [2, '本帮'],
    p_paoluo: [2, '本帮'], p_guangmingcun: [3, '本帮'], p_dahuchun: [3, '本帮'],
    p_xiaoyang: [1, '沪式'], p_jiajia: [3, '本帮'], p_aniang: [3, '本帮'],
    p_weixiangzhai: [3, '本帮'], p_laofandian: [3, '本帮'], p_lvbolang: [3, '本帮'],
    p_chuanwei: [1, '川'], p_chaoshan: [1, '潮汕'],
    p_bund: [3, '地标'], p_yuyuan: [3, '地标'], p_wukang: [3, '地标'], p_jingan: [3, '地标'],
    p_taotaoju: [3, '粤菜'], p_bingsheng: [3, '粤菜'], p_cantontower: [3, '地标'],
    p_chengfeng: [3, '粤菜'], p_shengxiangting: [1, '热卤'], p_laodifang: [2, '粤菜']
  };
  window.SEED.places.forEach(function (p) {
    var x = LT[p.id];
    if (x) { p.local = x[0]; p.cuisine = x[1]; }
  });
})();

/* 口味向量 · 9 维 0–5
 * 顺序固定：辣 麻 甜 咸 酸 油厚 鲜 锅气 发酵
 * 含义是「这家店有多辣 / 多甜」，不是好坏。
 */
window.DIMS = ['spicy', 'numb', 'sweet', 'salty', 'sour', 'rich', 'fresh', 'smoke', 'funky'];

/* 菜系兜底：新收录一家店，先按菜系给个大概，再手动微调 */
window.TASTE_BY_CUISINE = {
  '本帮': [0, 0, 3, 3.5, 0.5, 4, 2, 2, 1],
  '川': [4, 2.5, 1, 3.5, 1.5, 3, 2, 2.5, 1.5],
  '潮汕': [0.5, 0, 0.5, 3, 1, 1, 4.5, 1, 1],
  '沪式': [0, 0, 2, 4, 1, 3.5, 2, 2, 0.5],
  '粤菜': [0, 0, 2.5, 3, 0.5, 2.5, 4, 3, 1],
  '热卤': [1.5, 0.5, 1, 3.5, 1, 2.5, 2.5, 2, 1.5],
  '小吃': [0, 0, 2, 3.5, 1, 3, 2.5, 2, 1]
};

/* 单店覆盖：让 18 家在口味轴上真的分得开 */
window.TASTE_PLACES = {
  p_lanxin:       [0, 0, 4.5, 4, 0.5, 5, 1.5, 2, 1.5],   /* 浓油赤酱、又甜又咸 */
  p_haijinzi:     [0, 0, 3.5, 3, 1, 4, 2, 2, 1],
  p_laojishi:     [0, 0, 2.5, 4.5, 0.5, 4, 2.5, 2, 1.5],  /* 偏咸 */
  p_paoluo:       [0, 0, 2, 2.5, 1, 2.5, 3, 2, 1],        /* 最清淡的本帮 */
  p_guangmingcun: [0.5, 0, 3, 4, 0.5, 4.5, 2, 2.5, 1],
  p_dahuchun:     [0, 0, 3.5, 4, 0.5, 4.5, 2, 2.5, 0.5],
  p_jiajia:       [0, 0, 1.5, 3, 0.5, 2.5, 4.5, 2, 0.5],  /* 汤包，鲜 */
  p_aniang:       [0, 0, 2, 4, 1, 3, 3, 2.5, 1],
  p_weixiangzhai: [0, 0, 1.5, 4, 1.5, 3.5, 2, 2, 1],
  p_laofandian:   [0, 0, 3, 3.5, 0.5, 4, 2, 2, 1.5],
  p_lvbolang:     [0, 0, 4.5, 2.5, 0.5, 2, 2, 1, 0.5],    /* 点心，甜口 */
  p_xiaoyang:     [0, 0, 2, 4.5, 1, 4, 2, 2, 0.5],
  p_chuanwei:     [4.5, 3, 1, 4, 2, 4, 2, 3, 2.5],        /* 辣 */
  p_chaoshan:     [0.5, 0, 0.5, 3, 1, 1, 5, 1, 1.5],       /* 追鲜 */
  p_taotaoju:     [0, 0, 3, 3, 0.5, 2.5, 4, 3, 1],         /* 广州早茶，偏甜鲜 */
  p_bingsheng:    [0, 0, 2, 3.5, 0.5, 3, 4, 3.5, 1],       /* 镬气重 */
  p_chengfeng:    [0.5, 0, 1.5, 2.5, 0.5, 1.5, 3.5, 1.5, 0.5], /* 石磨肠粉，米香淡口 */
  p_shengxiangting:[1.5, 0.5, 1, 3.5, 1, 2.5, 2.5, 2, 1.5],    /* 热卤，咸香油辣 */
  p_laodifang:    [0.5, 0, 1.5, 3, 0.5, 2, 2.5, 1.5, 0.5]  /* 巢皮肠粉，暂按店型估 */
};
