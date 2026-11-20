/* 프리랜서 3.3% 원천징수·종합소득세 환급 모의 계산기 — freelance-tax/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function taxOf(base) {
    if (base <= 14000000) return base * 0.06;
    if (base <= 50000000) return base * 0.15 - 1260000;
    if (base <= 88000000) return base * 0.24 - 5760000;
    if (base <= 150000000) return base * 0.35 - 15440000;
    if (base <= 300000000) return base * 0.38 - 19940000;
    if (base <= 500000000) return base * 0.40 - 25940000;
    if (base <= 1000000000) return base * 0.42 - 35940000;
    return base * 0.45 - 65940000;
  }
  function floor10(n) { return Math.floor(n / 10) * 10; }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var income = (get('income') || 0) * 10000;
    var expRate = (isFinite(get('expense')) ? get('expense') : 60) / 100;
    var fam = isFinite(get('family')) ? get('family') : 1;
    var pension = (isFinite(get('pension')) ? get('pension') : 0) * 10000;
    var other = (isFinite(get('other')) ? get('other') : 0) * 10000;

    var expense = income * expRate;
    var business = Math.max(0, income - expense);
    var basic = 1500000 * Math.max(1, fam);
    var ded = basic + pension + other + 70000; // 표준세액공제는 세액에서
    var base = Math.max(0, Math.floor((business - ded) / 1000) * 1000);
    var tax = Math.max(0, taxOf(base) - 70000);
    var local = tax * 0.1;
    var total = tax + local;
    var withheld = floor10(income * 0.033);
    var diff = withheld - total;

    var rows = [
      { k: '연 수입 (총수입)', v: won(income) },
      { k: '필요경비 (' + fmt(expRate * 100, 1) + '%)', v: '-' + won(expense) },
      { k: '사업소득금액', v: won(business) },
      { k: '기본공제 (' + fmt(fam) + '명)', v: '-' + won(basic) }
    ];
    if (pension > 0) rows.push({ k: '연금보험료 공제', v: '-' + won(pension) });
    if (other > 0) rows.push({ k: '기타 소득공제', v: '-' + won(other) });
    rows.push({ k: '과세표준', v: won(base) });
    rows.push({ k: '산출세액 (표준세액공제 7만 차감)', v: won(tax) });
    rows.push({ k: '지방소득세 (10%)', v: won(local) });
    rows.push({ k: '결정세액', v: won(total) });
    rows.push({ k: '기납부 원천징수 (3.3%)', v: won(withheld) });
    rows.push({ k: diff >= 0 ? '예상 환급액' : '추가 납부액', v: won(Math.abs(diff)), total: true });

    var table = [1000, 2000, 3000, 5000, 7000, 10000].map(function (a) {
      var i2 = a * 10000;
      var b2 = Math.max(0, i2 * (1 - expRate));
      var base2 = Math.max(0, Math.floor((b2 - basic - 70000) / 1000) * 1000);
      var t2 = Math.max(0, taxOf(base2) - 70000);
      var tot2 = t2 * 1.1;
      var wh2 = floor10(i2 * 0.033);
      return [fmt(a) + '만', won(wh2), won(tot2), (wh2 - tot2 >= 0 ? '환급 ' : '추납 ') + won(Math.abs(wh2 - tot2))];
    });

    return {
      verdict: {
        kicker: diff >= 0 ? '5월 예상 환급액' : '5월 추가 납부액', icon: diff >= 0 ? '💰' : '🧾',
        title: won(Math.abs(diff)),
        desc: '연 수입 <b>' + won(income) + '</b>에서 경비 ' + pct(expRate * 100, 0) + '를 빼면 사업소득금액 <b>' + won(business) +
              '</b>, 여기에 공제를 적용한 결정세액은 <b>' + won(total) + '</b>입니다. 매월 떼인 원천징수 <b>' + won(withheld) + '</b>과 비교하면 ' +
              (diff >= 0 ? '돌려받을 돈이 <b>' + won(diff) + '</b>' : '더 낼 돈이 <b>' + won(-diff) + '</b>') + '입니다.',
        cls: diff >= 0 ? 'verdict--ok' : 'verdict--warn'
      },
      stats: [
        { l: '연 원천징수 (3.3%)', v: won(withheld) },
        { l: '결정세액', v: won(total), s: '소득세+지방세' },
        { l: diff >= 0 ? '환급 예상' : '추가 납부', v: won(Math.abs(diff)), cls: diff >= 0 ? 'is-good' : 'is-bad' },
        { l: '실효세율', v: pct(income > 0 ? total / income * 100 : 0, 2) }
      ],
      rows: rows,
      table: { head: ['연 수입', '원천징수', '결정세액', '정산'], rows: table,
               note: '같은 경비율·공제 조건에서 수입만 바꾼 값입니다.' },
      notes: [{ html: '<b>환급이 나오는 이유</b> — 3.3%는 소득 수준을 모르고 일괄로 떼는 세금입니다. 실제로는 경비율(60~80%)과 기본공제가 적용되어 과세표준이 크게 줄기 때문에, 수입 3,000만원대 프리랜서는 대부분 환급을 받습니다. 다만 수입이 1억을 넘으면 오히려 추납되는 경우가 많습니다.' }]
    };
  }

  WT.mount({
    fields: ["income", "expense", "family", "pension", "other"],
    segs: [],
    checks: [],
    required: ["income", "expense"],
    presets: {"수입 3,000 · 경비 64%": {"fields": {"income": 3000, "expense": 64, "family": 1, "pension": 0, "other": 0}}, "수입 6,000 · 경비 50%": {"fields": {"income": 6000, "expense": 50, "family": 2, "pension": 300, "other": 100}}, "수입 1,500 · 경비 80%": {"fields": {"income": 1500, "expense": 80, "family": 1, "pension": 0, "other": 0}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
