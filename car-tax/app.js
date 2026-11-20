/* 자동차세 계산기 (배기량·차령 경감·전기차·연납 할인) — car-tax/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function ccRate(cc) {
    if (cc <= 1000) return 80;
    if (cc <= 1600) return 140;
    return 200;
  }
  function discount(age) {
    if (age < 3) return 0;
    return Math.min(50, (age - 2) * 5);
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var cc = get('cc') || 0;
    var age = isFinite(get('age')) ? get('age') : 0;
    var ev = seg('kind') === 'ev';
    var prepay = seg('prepay') === 'jan';

    var rate = ccRate(cc);
    var baseTax = ev ? 100000 : Math.floor(cc * rate);
    var disc = discount(age);
    var afterDisc = baseTax * (1 - disc / 100);
    var eduTax = afterDisc * 0.3;
    var yearTax = Math.floor((afterDisc + eduTax) / 10) * 10;
    var prepayRate = prepay ? 3 : 0;
    var prepayCut = Math.floor(yearTax * prepayRate / 100);
    var yearAfterPrepay = yearTax - prepayCut;

    var rows = [
      { k: '차종', v: ev ? '전기·수소차 (정액)' : '승용 (' + fmt(cc) + 'cc)' },
      { k: 'cc당 세율', v: ev ? '정액 과세' : fmt(rate) + '원/cc' },
      { k: '자동차세 본세', v: won(baseTax) }
    ];
    if (disc > 0) rows.push({ k: '차령 경감 (' + fmt(disc) + '%)', v: '-' + won(baseTax * disc / 100), note: '3년째부터 매년 5%p · 최대 50%' });
    rows.push({ k: '경감 후 본세', v: won(afterDisc) });
    rows.push({ k: '지방교육세 (30%)', v: won(eduTax) });
    rows.push({ k: '연간 자동차세', v: won(yearTax), total: true });
    rows.push({ k: '6월 납부', v: won(yearTax / 2) });
    rows.push({ k: '12월 납부', v: won(yearTax / 2) });
    if (prepay > 0) {
      rows.push({ k: '연납 할인 (' + fmt(prepayRate) + '%)', v: '-' + won(prepayCut) });
      rows.push({ k: '연납 시 납부액', v: won(yearAfterPrepay) });
    }

    var table = [1000, 1600, 2000, 2500, 3000].map(function (c) {
      var t = c * ccRate(c);
      t = t * 1.3;
      return [fmt(c) + 'cc', won(t), won(t * (1 - disc / 100)), won(t * (1 - disc / 100) / 2)];
    });

    return {
      verdict: {
        kicker: '연간 자동차세 (지방교육세 포함)', icon: '🚙',
        title: won(yearTax),
        desc: (ev ? '전기차 정액 과세' : fmt(cc) + 'cc × ' + fmt(rate) + '원') + '으로 계산한 본세 ' + won(baseTax) + ', ' +
              (disc > 0 ? '차령 ' + fmt(age) + '년 경감 ' + fmt(disc) + '%를 적용해 ' + won(afterDisc) + ', ' : '') +
              '지방교육세 30%를 더해 <b>' + won(yearTax) + '</b>입니다. 6월·12월에 <b>' + won(yearTax / 2) + '</b>씩 나눠 냅니다.' +
              (prepay ? ' 1월 연납 시 ' + won(prepayCut) + '을 아낍니다.' : ''),
        cls: 'verdict--info'
      },
      stats: [
        { l: '본세', v: won(afterDisc) },
        { l: '지방교육세', v: won(eduTax) },
        { l: '연간 합계', v: won(yearTax), cls: 'is-accent' },
        { l: '분납액', v: won(yearTax / 2), s: '6월·12월' }
      ],
      rows: rows,
      bars: [
        { l: '본세', v: afterDisc, max: yearTax, text: won(afterDisc), color: 'bar__fill--green' },
        { l: '지방교육세', v: eduTax, max: yearTax, text: won(eduTax), color: 'bar__fill--accent' }
      ],
      table: { head: ['배기량', '세금(경감 전)', '경감 후', '분납액'], rows: table,
               note: '같은 차령(' + fmt(age) + '년)에서 배기량만 바꾼 값입니다.' },
      notes: [{ html: '<b>차령 경감</b> — 차령 3년째부터 매년 5%p씩 경감되어 최대 50%까지 줄어듭니다. 5년차는 15%, 10년차는 40%, 12년 이상은 50%입니다. 차를 바꾸지 않고 오래 탈수록 세금이 줄어듭니다.' }]
    };
  }

  WT.mount({
    fields: ["cc", "age"],
    segs: ["kind", "prepay"],
    checks: [],
    required: ["cc", "age"],
    presets: {"2,000cc · 5년": {"fields": {"cc": 2000, "age": 5}, "segs": {"kind": "gas", "prepay": "jan"}}, "1,600cc · 신차": {"fields": {"cc": 1600, "age": 0}, "segs": {"kind": "gas", "prepay": "jan"}}, "전기차 · 3년": {"fields": {"cc": 0, "age": 3}, "segs": {"kind": "ev", "prepay": "none"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
