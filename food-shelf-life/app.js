/* 식품 소비기한·보관 가이드 체크기 (냉장·냉동) — food-shelf-life/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

var DAYS = {
    meat: { fridge: 3, freezer: 180, room: 1 },
    chicken: { fridge: 2, freezer: 270, room: 0.5 },
    fish: { fridge: 2, freezer: 90, room: 0.5 },
    egg: { fridge: 21, freezer: 0, room: 7 },
    milk: { fridge: 7, freezer: 30, room: 1 },
    veg: { fridge: 7, freezer: 120, room: 2 },
    cooked: { fridge: 3, freezer: 60, room: 2 },
    bread: { fridge: 5, freezer: 60, room: 3 }
  };
  var NAME = { meat: '육류', chicken: '닭고기', fish: '생선·해산물', egg: '계란', milk: '우유·유제품', veg: '채소·과일', cooked: '조리한 음식', bread: '빵·떡' };
  var STORE = { fridge: '냉장', freezer: '냉동', room: '실온' };
  var TIPS = {
    meat: '핏물을 키친타월로 닦고 밀폐 용기에 담아 가장 찬 칸에 두세요.',
    chicken: '닭고기는 다른 식품과 분리 보관하고, 조리 시 중심 온도 75℃ 이상으로 익히세요.',
    fish: '구입 당일 손질해 냉동하는 것이 가장 안전합니다.',
    egg: '계란은 씻지 말고 뾰족한 쪽을 아래로 두세요. 상온 보관은 2주를 넘기지 마세요.',
    milk: '개봉 후에는 3일 이내에 드세요. 냉장고 문 쪽은 온도 변화가 커서 피하세요.',
    veg: '물기를 제거하고 종이로 감싸 보관하면 더 오래 갑니다.',
    cooked: '조리 음식은 2시간 안에 냉장하세요. 다시 데울 때는 75℃ 이상으로 충분히 가열합니다.',
    bread: '빵은 냉장보다 실온 또는 냉동이 낫습니다. 냉장하면 노화가 빨라집니다.'
  };

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var food = seg('food'), store = seg('store');
    var elapsed = isFinite(get('elapsed')) ? get('elapsed') : 0;
    var buyStr = String(val('buy') || '').trim();
    var limit = (DAYS[food] || DAYS.meat)[store];
    var startDate = null;

    if (buyStr) {
      var m = buyStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) {
        startDate = Date.UTC(+m[1], +m[2] - 1, +m[3]);
        elapsed = Math.max(0, Math.round((Date.now() - startDate) / 86400000));
      }
    }
    var left = limit - elapsed;
    var state = left < 0 ? '경과' : left <= 1 ? '임박' : '여유';
    var cls = left < 0 ? 'verdict--bad' : left <= 1 ? 'verdict--warn' : 'verdict--ok';
    var until = '';
    if (startDate) {
      var d = new Date(startDate + limit * 86400000);
      until = d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1 < 10 ? '0' : '') + (d.getUTCMonth() + 1) + '-' + (d.getUTCDate() < 10 ? '0' : '') + d.getUTCDate();
    }

    var rows = [
      { k: '식품', v: NAME[food] },
      { k: '보관 방법', v: STORE[store] },
      { k: '권장 보관 기간', v: limit > 0 ? fmt(limit, 1) + '일' : '권장하지 않음' },
      { k: '경과 일수', v: fmt(elapsed, 1) + '일' },
      { k: '남은 기간', v: (left >= 0 ? fmt(left, 1) + '일' : '기한 초과 ' + fmt(-left, 1) + '일'), total: true },
      { k: '소비기한 (구입일 기준)', v: until || '-' },
      { k: '판정', v: state }
    ];

    var cmp = [];
    ['fridge', 'freezer', 'room'].forEach(function (s) {
      cmp.push([STORE[s], DAYS[food][s] > 0 ? fmt(DAYS[food][s], 1) + '일' : '-',
                DAYS[food][s] >= elapsed ? fmt(DAYS[food][s] - elapsed, 1) + '일 남음' : '경과']);
    });

    return {
      verdict: {
        kicker: NAME[food] + ' · ' + STORE[store] + ' 보관', icon: '🥩',
        title: left >= 0 ? fmt(left, 1) + '일 남음' : '기한 초과',
        desc: NAME[food] + '을 ' + STORE[store] + ' 보관하면 ' + fmt(limit, 1) + '일까지가 권장입니다. 구입 후 ' + fmt(elapsed, 1) + '일이 지나 ' +
              (left >= 0 ? '<b>' + fmt(left, 1) + '일</b> 남았습니다. ' + (left <= 1 ? '오늘 안에 드시는 것이 좋습니다.' : '') : '<b>' + fmt(-left, 1) + '일</b> 지났습니다. 폐기를 검토하세요.') +
              ' ' + (TIPS[food] || ''),
        cls: cls
      },
      stats: [
        { l: '권장 기간', v: fmt(limit, 1) + '일' },
        { l: '경과', v: fmt(elapsed, 1) + '일' },
        { l: '남은 기간', v: left >= 0 ? fmt(left, 1) + '일' : '초과', cls: left >= 0 ? 'is-good' : 'is-bad' },
        { l: '판정', v: state }
      ],
      rows: rows,
      bars: cmp.map(function (c, i) {
        var d = DAYS[food][['fridge', 'freezer', 'room'][i]];
        return { l: c[0], v: Math.min(elapsed, Math.max(1, d)), max: Math.max(1, d), text: c[1], color: elapsed <= d ? 'bar__fill--green' : 'bar__fill--kcal' };
      }),
      table: { head: ['보관 방법', '권장 기간', '상태'], rows: cmp, note: NAME[food] + '의 보관 방법별 권장 기간입니다.' },
      notes: [{ html: '<b>2시간 규칙</b> — 조리·구입한 식품을 상온에 2시간 넘게 두면 세균이 급증합니다. 여름철에는 1시간으로 보세요. 냉장고는 0~5℃, 냉동고는 -18℃ 이하를 유지해야 권장 기간이 지켜집니다.' }]
    };
  }

  WT.mount({
    fields: ["buy", "elapsed"],
    segs: ["food", "store"],
    checks: [],
    required: [],
    presets: {"삼겹살 냉장 2일째": {"fields": {"buy": "", "elapsed": 2}, "segs": {"food": "meat", "store": "fridge"}}, "닭고기 냉장 0일": {"fields": {"buy": "", "elapsed": 0}, "segs": {"food": "chicken", "store": "fridge"}}, "조리음식 냉장 4일": {"fields": {"buy": "", "elapsed": 4}, "segs": {"food": "cooked", "store": "fridge"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
