/* 만능 단위 변환기 (길이·무게·부피·온도·속도·면적) — unit-convert/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

var UNITS = {
    // 길이 (m 기준)
    'mm': ['length', 0.001, '밀리미터'], 'cm': ['length', 0.01, '센티미터'], 'm': ['length', 1, '미터'],
    'km': ['length', 1000, '킬로미터'], 'in': ['length', 0.0254, '인치'], 'inch': ['length', 0.0254, '인치'],
    'ft': ['length', 0.3048, '피트'], 'feet': ['length', 0.3048, '피트'], 'yd': ['length', 0.9144, '야드'],
    'mile': ['length', 1609.344, '마일'], 'mi': ['length', 1609.344, '마일'], '자': ['length', 0.30303, '자(척)'],
    // 무게 (kg 기준)
    'mg': ['weight', 0.000001, '밀리그램'], 'g': ['weight', 0.001, '그램'], 'kg': ['weight', 1, '킬로그램'],
    't': ['weight', 1000, '톤'], 'ton': ['weight', 1000, '톤'], 'oz': ['weight', 0.0283495, '온스(무게)'],
    'lb': ['weight', 0.453592, '파운드'], 'lbs': ['weight', 0.453592, '파운드'], '근': ['weight', 0.6, '근'],
    // 부피 (L 기준)
    'ml': ['volume', 0.001, '밀리리터'], 'l': ['volume', 1, '리터'], 'liter': ['volume', 1, '리터'],
    'm3': ['volume', 1000, '세제곱미터'], 'gal': ['volume', 3.78541, '갤런(US)'],
    'gal_us': ['volume', 3.78541, '갤런(US)'], 'gal_uk': ['volume', 4.54609, '갤런(UK)'],
    'cup': ['volume', 0.24, '컵(240ml)'], 'oz_fl': ['volume', 0.0295735, '액량온스'],
    // 온도
    'c': ['temp', 1, '섭씨'], '℃': ['temp', 1, '섭씨'], 'celsius': ['temp', 1, '섭씨'],
    'f': ['temp', 1, '화씨'], '℉': ['temp', 1, '화씨'], 'fahrenheit': ['temp', 1, '화씨'],
    'k': ['temp', 1, '켈빈'], 'kelvin': ['temp', 1, '켈빈'],
    // 속도 (m/s 기준)
    'm/s': ['speed', 1, '미터/초'], 'mps': ['speed', 1, '미터/초'], 'km/h': ['speed', 0.277778, '킬로미터/시'],
    'kph': ['speed', 0.277778, '킬로미터/시'], 'mph': ['speed', 0.44704, '마일/시'],
    'knot': ['speed', 0.514444, '노트'], 'kt': ['speed', 0.514444, '노트'],
    // 면적 (㎡ 기준)
    '㎡': ['area', 1, '제곱미터'], 'm2': ['area', 1, '제곱미터'], '평': ['area', 3.305785, '평'],
    'ha': ['area', 10000, '헥타르'], 'acre': ['area', 4046.86, '에이커'], 'ft2': ['area', 0.092903, '제곱피트']
  };
  var FIELD_ORDER = {
    length: ['mm', 'cm', 'm', 'km', 'in', 'ft', 'yd', 'mile', '자'],
    weight: ['mg', 'g', 'kg', 't', 'oz', 'lb', '근'],
    volume: ['ml', 'l', 'm3', 'gal', 'cup'],
    speed: ['m/s', 'km/h', 'mph', 'knot'],
    area: ['m2', '평', 'ha', 'acre'],
    temp: ['c', 'f', 'k']
  };

  function norm(u) { return String(u || '').trim().toLowerCase().replace(/\s/g, ''); }
  function toSI(v, u) {
    if (u === 'c') return v + 273.15;
    if (u === 'f') return (v - 32) * 5 / 9 + 273.15;
    if (u === 'k') return v;
    return v * UNITS[u][1];
  }
  function fromSI(v, u) {
    if (u === 'c') return v - 273.15;
    if (u === 'f') return (v - 273.15) * 9 / 5 + 32;
    if (u === 'k') return v;
    return v / UNITS[u][1];
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var v = get('value');
    var fu = norm(val('from')), tu = norm(val('to'));
    if (fu === 'cm2') fu = 'cm2';
    if (tu === 'cm2') tu = 'cm2';
    var F = UNITS[fu], T = UNITS[tu];
    if (!F || !T) {
      return { verdict: { kicker: '단위 확인', icon: '⚠️', title: (F ? tu : fu) + ' 단위를 모르겠습니다',
        desc: '지원 단위: mm cm m km in ft yd mile 자 / mg g kg t oz lb 근 / ml L m3 gal cup oz_fl / c f k / m/s km/h mph knot / ㎡ m2 평 ha acre ft2', cls: 'verdict--warn' }, stats: [] };
    }
    if (F[0] !== T[0]) {
      return { verdict: { kicker: '분야가 다릅니다', icon: '⚠️', title: F[2] + ' → ' + T[2], desc: '같은 분야의 단위끼리만 변환할 수 있습니다(' + F[0] + ' ≠ ' + T[0] + ').', cls: 'verdict--warn' }, stats: [] };
    }
    var si = toSI(v, fu);
    var out = fromSI(si, tu);

    var list = FIELD_ORDER[F[0]] || [];
    var rows = [{ k: val('from') + ' → ' + val('to'), v: fmt(out, 4), total: true }];
    list.forEach(function (u2) {
      var key = u2 === 'm2' ? '㎡' : u2;
      var x = fromSI(si, u2 === 'm2' ? 'm2' : u2);
      rows.push({ k: UNITS[u2][2] + ' (' + key + ')', v: fmt(x, 4) });
    });

    var table = [];
    [1, 2, 5, 10, 50, 100].forEach(function (mul) {
      var val2 = v * mul;
      var row2 = [fmt(val2, 2)];
      list.slice(0, 5).forEach(function (u3) { row2.push(fmt(fromSI(toSI(val2, fu), u3), 2)); });
      table.push(row2);
    });

    return {
      verdict: {
        kicker: F[2] + ' → ' + T[2], icon: '🔁',
        title: fmt(out, 4) + ' ' + (val('to') || ''),
        desc: fmt(v, 4) + ' ' + val('from') + '은(는) <b>' + fmt(out, 4) + ' ' + val('to') + '</b>입니다. ' +
              (F[0] === 'temp' ? '온도는 0℃=32℉=273.15K를 기준으로 절대온도로 환산해 계산합니다.' : ({ length: 'm', weight: 'kg', volume: 'L', speed: 'm/s', area: '㎡' }[F[0]] || '') + ' 기준 국제표준 환산 계수를 적용했습니다.'),
        cls: 'verdict--ok'
      },
      stats: [
        { l: '변환 결과', v: fmt(out, 4), cls: 'is-accent' },
        { l: '입력값', v: fmt(v, 2) + ' ' + (val('from') || '') },
        { l: '분야', v: { length: '길이', weight: '무게', volume: '부피', temp: '온도', speed: '속도', area: '면적' }[F[0]] || F[0] },
        { l: '단위 수', v: list.length + '개' }
      ],
      rows: rows,
      table: { head: ['값'].concat(list.slice(0, 5)), rows: table,
               note: '같은 분야의 주요 단위로 함께 환산한 표입니다.' }
    };
  }

  WT.mount({
    fields: ["value", "from", "to"],
    segs: [],
    checks: [],
    required: ["value"],
    presets: {"70kg → lb": {"fields": {"value": 70, "from": "kg", "to": "lb"}}, "180cm → ft": {"fields": {"value": 180, "from": "cm", "to": "ft"}}, "30평 → ㎡": {"fields": {"value": 30, "from": "평", "to": "㎡"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
