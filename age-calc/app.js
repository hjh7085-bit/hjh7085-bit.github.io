/* 만 나이·연 나이·띠·별자리 계산기 (생일 D-day) — age-calc/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

var ZODIAC = ['원숭이', '닭', '개', '돼지', '쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양'];
  var DAYS = ['일', '월', '화', '수', '목', '금', '토'];
  var SIGN = [[1,20,'염소자리'],[2,19,'물병자리'],[3,21,'물고기자리'],[4,20,'양자리'],[5,21,'황소자리'],[6,22,'쌍둥이자리'],[7,23,'게자리'],[8,23,'사자자리'],[9,23,'처녀자리'],[10,24,'천칭자리'],[11,23,'전갈자리'],[12,22,'사수자리']];

  function parseDate(s) {
    var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    var t = Date.UTC(y, mo - 1, d);
    var chk = new Date(t);
    if (chk.getUTCFullYear() !== y || chk.getUTCMonth() + 1 !== mo || chk.getUTCDate() !== d) return null;
    return { y: y, m: mo, d: d, t: t };
  }
  function signOf(m, d) {
    var starts = [[1, 20, '물병자리'], [2, 19, '물고기자리'], [3, 21, '양자리'], [4, 20, '황소자리'],
                  [5, 21, '쌍둥이자리'], [6, 22, '게자리'], [7, 23, '사자자리'], [8, 23, '처녀자리'],
                  [9, 23, '천칭자리'], [10, 24, '전갈자리'], [11, 23, '사수자리'], [12, 22, '염소자리']];
    var out = '염소자리';
    for (var i = 0; i < starts.length; i++) {
      if (m > starts[i][0] || (m === starts[i][0] && d >= starts[i][1])) out = starts[i][2];
    }
    return out;
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var b = parseDate(val('birth'));
    if (!b) {
      return { verdict: { kicker: '입력 확인', icon: '⚠️', title: '생년월일을 입력하세요', desc: '연도-월-일 형식(예: 1990-03-15)으로 넣어 주세요.', cls: 'verdict--warn' }, stats: [] };
    }
    var baseStr = val('base');
    var today = new Date();
    var bt = parseDate(baseStr) || { y: today.getFullYear(), m: today.getMonth() + 1, d: today.getDate(), t: Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) };
    if (bt.t < b.t) {
      return { verdict: { kicker: '입력 확인', icon: '⚠️', title: '기준일이 생일보다 빠릅니다', desc: '기준일을 생년월일 이후로 바꿔 주세요.', cls: 'verdict--warn' }, stats: [] };
    }

    var man = bt.y - b.y;
    if (bt.m < b.m || (bt.m === b.m && bt.d < b.d)) man--;
    var yeon = bt.y - b.y;
    var days = Math.round((bt.t - b.t) / 86400000);
    var sign = signOf(b.m, b.d);

    var nextB = Date.UTC(bt.y, b.m - 1, b.d);
    if (nextB < bt.t) nextB = Date.UTC(bt.y + 1, b.m - 1, b.d);
    var dday = Math.round((nextB - bt.t) / 86400000);
    var dow = new Date(b.t).getUTCDay();
    var zodiacBase = b.y - 2020; // 2020 = 쥐

    var rows = [
      { k: '만 나이 (법적 기준)', v: man + '세', note: '생일이 지났으면 이 값' },
      { k: '연 나이 (태어난 해 기준)', v: yeon + '세', note: '올해 − 출생연도' },
      { k: '띠', v: ZODIAC[((zodiacBase % 12) + 12) % 12] + '띠', note: '음력 설 기준으로 바뀜' },
      { k: '별자리', v: sign },
      { k: '태어난 요일', v: DAYS[dow] + '요일' },
      { k: '살아온 날', v: fmt(days) + '일', note: '약 ' + fmt(days / 365.25, 1) + '년' },
      { k: '다음 생일까지', v: dday === 0 ? '오늘' : dday + '일', total: true },
      { k: '다음 생일 날짜', v: new Date(nextB).getUTCFullYear() + '-' + (b.m < 10 ? '0' : '') + b.m + '-' + (b.d < 10 ? '0' : '') + b.d }
    ];

    var table = [1, 10, 20, 30, 40, 50, 60].map(function (inc) {
      var y2 = b.y + inc;
      var m2 = bt.y - y2;
      if (bt.m < b.m || (bt.m === b.m && bt.d < b.d)) m2--;
      return [y2 + '년', m2 + '세', fmt(m2 * 365.25, 0) + '일'];
    });

    return {
      verdict: {
        kicker: '만 나이', icon: '🎂',
        title: man + '세',
        desc: b.y + '-' + (b.m < 10 ? '0' : '') + b.m + '-' + (b.d < 10 ? '0' : '') + b.d + ' 출생, 기준일 ' + bt.y + '-' + (bt.m < 10 ? '0' : '') + bt.m + '-' + (bt.d < 10 ? '0' : '') + bt.d +
              ' 기준으로 만 <b>' + man + '세</b>, 연 나이 <b>' + yeon + '세</b>입니다. ' + ZODIAC[((zodiacBase % 12) + 12) % 12] + '띠 ' + sign + '이고, ' +
              (dday === 0 ? '오늘이 생일입니다.' : '다음 생일까지 <b>' + dday + '일</b> 남았습니다.') + ' 지금까지 <b>' + fmt(days) + '일</b>을 살았습니다.',
        cls: 'verdict--ok'
      },
      stats: [
        { l: '만 나이', v: man + '세', cls: 'is-accent' },
        { l: '연 나이', v: yeon + '세' },
        { l: '띠', v: ZODIAC[((zodiacBase % 12) + 12) % 12] + '띠' },
        { l: '생일 D-day', v: dday === 0 ? '오늘' : 'D-' + dday }
      ],
      rows: rows,
      table: { head: ['해당 연도', '만 나이', '살아온 날'], rows: table,
               note: '출생연도 기준 10년 단위로 계산한 값입니다.' },
      notes: [{ html: '<b>만 나이 통일(2023.6.28)</b> — 행정·계약·법령에서 나이는 만 나이로 계산합니다. 다만 초등학교 입학(연 나이), 병역(연 나이), 청소년 보호법 일부는 여전히 연 나이를 쓰니, 용도에 따라 확인하세요.' }]
    };
  }

  WT.mount({
    fields: ["birth", "base"],
    segs: [],
    checks: [],
    required: ["birth"],
    presets: {"1990-03-15 · 오늘 기준": {"fields": {"birth": "1990-03-15", "base": ""}}, "2000-01-01 · 2026-01-01": {"fields": {"birth": "2000-01-01", "base": "2026-01-01"}}, "1985-12-25 · 2026-06-01": {"fields": {"birth": "1985-12-25", "base": "2026-06-01"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
