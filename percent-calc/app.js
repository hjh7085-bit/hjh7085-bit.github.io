/* 퍼센트 계산기 (할인·증감률·부가세 만능) — percent-calc/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

var MODE = {
    of:       { a: '기준 값 (X)', b: '퍼센트 (Y%)' },
    is:       { a: '부분 값 (X)', b: '전체 값 (Y)' },
    change:   { a: '이전 값 (A)', b: '이후 값 (B)' },
    discount: { a: '정가 (원)', b: '할인율 (%)' },
    reverse:  { a: '할인가 (원)', b: '할인율 (%)' },
    vat:      { a: '금액 (원)', b: '부가세율 (%)' }
  };

  function num(n, fmt) {
    if (!isFinite(n)) return '-';
    return Math.abs(n - Math.round(n)) < 0.005 ? fmt(Math.round(n)) : fmt(n, 2);
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var mode = seg('mode') || 'of';
    var a = get('a'), b = get('b');
    var rows = [], result = 0, label = '', note = '';

    if (mode === 'of') {
      result = a * b / 100;
      label = fmt(a) + '의 ' + fmt(b) + '%';
      note = fmt(a) + ' × ' + fmt(b) + ' ÷ 100 = ' + fmt(result);
      rows = [
        { k: '기준 값', v: fmt(a) },
        { k: '퍼센트', v: fmt(b) + '%' },
        { k: '계산 결과', v: fmt(result), total: true },
        { k: '더하면', v: fmt(a + result) },
        { k: '빼면', v: fmt(a - result) }
      ];
    } else if (mode === 'is') {
      result = b !== 0 ? a / b * 100 : NaN;
      label = fmt(a) + '는 ' + fmt(b) + '의 몇 %';
      note = fmt(a) + ' ÷ ' + fmt(b) + ' × 100 = ' + fmt(result, 2) + '%';
      rows = [
        { k: '부분 값', v: fmt(a) },
        { k: '전체 값', v: fmt(b) },
        { k: '비율', v: fmt(result, 2) + '%', total: true },
        { k: '남은 비율', v: fmt(100 - result, 2) + '%' },
        { k: '차이', v: fmt(b - a) }
      ];
    } else if (mode === 'change') {
      result = a !== 0 ? (b - a) / a * 100 : NaN;
      label = fmt(a) + ' → ' + fmt(b) + ' 증감률';
      note = '(' + fmt(b) + ' − ' + fmt(a) + ') ÷ ' + fmt(a) + ' × 100 = ' + (result > 0 ? '+' : '') + fmt(result, 2) + '%';
      rows = [
        { k: '이전 값', v: fmt(a) },
        { k: '이후 값', v: fmt(b) },
        { k: '증감액', v: (b - a > 0 ? '+' : '') + fmt(b - a) },
        { k: '증감률', v: (result > 0 ? '+' : '') + fmt(result, 2) + '%', total: true, cls: result >= 0 ? 'is-good' : 'is-bad' },
        { k: '원래대로 돌리려면', v: result !== -100 ? fmt((a - b) / b * 100 * -1 * -1, 2) + '%' : '-' }
      ];
    } else if (mode === 'discount') {
      var off = a * b / 100;
      result = a - off;
      label = fmt(a) + '원 ' + fmt(b) + '% 할인';
      note = '할인액 ' + fmt(off) + '원 · 판매가 ' + fmt(result) + '원';
      rows = [
        { k: '정가', v: won(a) },
        { k: '할인율', v: fmt(b) + '%' },
        { k: '할인액', v: '-' + won(off), cls: 'is-bad' },
        { k: '판매가', v: won(result), total: true, cls: 'is-good' },
        { k: '10% 더 할인하면', v: won(result * 0.9) }
      ];
    } else if (mode === 'reverse') {
      result = b < 100 ? a / (1 - b / 100) : NaN;
      label = '할인가 ' + fmt(a) + '원의 원가';
      note = fmt(a) + ' ÷ (1 − ' + fmt(b) + '/100) = ' + fmt(result) + '원';
      rows = [
        { k: '할인가', v: won(a) },
        { k: '할인율', v: fmt(b) + '%' },
        { k: '원가 (정가)', v: won(result), total: true },
        { k: '할인액', v: won(result - a) }
      ];
    } else {
      var rate = b / 100;
      result = a * (1 + rate);
      label = fmt(a) + '원의 부가세 포함가';
      note = '공급가 ' + fmt(a) + ' + 부가세 ' + fmt(a * rate) + ' = ' + fmt(result);
      rows = [
        { k: '공급가', v: won(a) },
        { k: '부가세 (' + fmt(b) + '%)', v: won(a * rate) },
        { k: '부가세 포함가', v: won(result), total: true },
        { k: '포함가에서 역산', v: won(a) , note: '아래 값을 포함가로 보면 공급가는 ' + won(result / (1 + rate)) }
      ];
    }

    var table = [
      ['30,000원의 30%', fmt(30000 * 0.3) + '원'],
      ['12,000 → 8,000 증감률', fmt((8000 - 12000) / 12000 * 100, 2) + '%'],
      ['50,000원 20% 할인', fmt(40000) + '원'],
      ['40,000원은 50,000원의', fmt(40000 / 50000 * 100) + '%'],
      ['부가세 포함 110,000원의 공급가', fmt(100000) + '원']
    ];

    return {
      verdict: {
        kicker: label, icon: '％',
        title: mode === 'of' ? num(result, fmt) : mode === 'is' || mode === 'change' ? (result > 0 && mode === 'change' ? '+' : '') + num(result, fmt) + '%' : won(result),
        desc: note + '. 모드를 바꾸면 같은 숫자로 다른 계산을 할 수 있습니다.',
        cls: 'verdict--accent'
      },
      stats: [
        { l: 'A', v: fmt(a) },
        { l: 'B', v: fmt(b) },
        { l: '결과', v: mode === 'of' ? num(result, fmt) : mode === 'is' || mode === 'change' ? num(result, fmt) + '%' : won(result), cls: 'is-accent' },
        { l: '모드', v: { of: 'X의 Y%', is: '몇 %', change: '증감률', discount: '할인가', reverse: '원가', vat: '부가세' }[mode] }
      ],
      rows: rows,
      table: { head: ['자주 쓰는 예', '결과'], rows: table, note: '실제 숫자를 넣어 확인해 보세요.' },
      notes: [
        { html: '<b>증감률의 함정</b> — 100에서 50으로 줄면 −50%지만, 50에서 100으로 늘면 +100%입니다. 같은 폭인데 %가 다릅니다. 항상 <b>이전 값</b>이 분모입니다.' },
        { html: '<b>%와 %p</b> — 금리 3%에서 5%로 오르면 "2%p 상승", "66.7% 상승"입니다. 뉴스에서 헷갈리기 쉬운 부분입니다.' }
      ]
    };
  }

  WT.mount({
    fields: ["a", "b"],
    segs: ["mode"],
    checks: [],
    required: ["a", "b"],
    presets: {"30,000원의 30%": {"fields": {"a": 30000, "b": 30}, "segs": {"mode": "of"}}, "12,000 → 8,000 증감률": {"fields": {"a": 12000, "b": 8000}, "segs": {"mode": "change"}}, "50,000원 20% 할인": {"fields": {"a": 50000, "b": 20}, "segs": {"mode": "discount"}}},
    validate: null,
    auto: false,
    compute: compute
  });

  (function () {
    var M = {
      of: ['기준 값 (X)', '퍼센트 (Y%)'],
      is: ['부분 값 (X)', '전체 값 (Y)'],
      change: ['이전 값 (A)', '이후 값 (B)'],
      discount: ['정가 (원)', '할인율 (%)'],
      reverse: ['할인가 (원)', '할인율 (%)'],
      vat: ['금액 (원)', '부가세율 (%)']
    };
    var g = document.querySelector('[data-seg-group="mode"]');
    if (!g) return;
    function sync() {
      var on = g.querySelector('.seg__btn.is-on');
      var m = on ? on.dataset.val : 'of';
      var la = document.querySelector('label[for="a"] .field__label');
      var lb = document.querySelector('label[for="b"] .field__label');
      if (la) la.textContent = M[m][0];
      if (lb) lb.textContent = M[m][1];
    }
    g.addEventListener('click', function () { setTimeout(sync, 0); });
    sync();
  })();

})();
