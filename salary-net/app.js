/* 2026 연봉·월급 실수령액 계산기 (4대보험·소득세 반영) — salary-net/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

var PENSION = 0.0475, HEALTH = 0.03595, CARE = 0.1314, EMPLOY = 0.009;
  var P_MIN = 410000, P_MAX = 6590000;

  function laborDeduction(gross) {          // 근로소득공제
    if (gross <= 5000000) return gross * 0.7;
    if (gross <= 15000000) return 3500000 + (gross - 5000000) * 0.4;
    if (gross <= 45000000) return 7500000 + (gross - 15000000) * 0.15;
    if (gross <= 100000000) return 12000000 + (gross - 45000000) * 0.05;
    return 14750000 + (gross - 100000000) * 0.02;
  }
  function incomeTax(base) {                // 산출세액
    if (base <= 14000000) return base * 0.06;
    if (base <= 50000000) return base * 0.15 - 1260000;
    if (base <= 88000000) return base * 0.24 - 5760000;
    if (base <= 150000000) return base * 0.35 - 15440000;
    if (base <= 300000000) return base * 0.38 - 19940000;
    if (base <= 500000000) return base * 0.40 - 25940000;
    if (base <= 1000000000) return base * 0.42 - 35940000;
    return base * 0.45 - 65940000;
  }
  function taxCredit(tax, gross) {          // 근로소득세액공제
    var c = tax <= 1300000 ? tax * 0.55 : 715000 + (tax - 1300000) * 0.3;
    var cap = gross <= 33000000 ? 740000 : gross <= 70000000 ? 660000
            : gross <= 120000000 ? 500000 : 200000;
    return Math.min(c, cap);
  }
  function floor10(n) { return Math.floor(n / 10) * 10; }

  function detail(annual, fam, nontaxMonthly) {
    var monthly = annual / 12;
    var base = Math.max(0, monthly - nontaxMonthly);
    var pen = floor10(Math.min(Math.max(base, P_MIN), P_MAX) * PENSION);
    var health = floor10(base * HEALTH);
    var care = floor10(health * CARE);
    var emp = floor10(base * EMPLOY);
    var ins = pen + health + care + emp;
    var gross = base * 12;
    var earned = Math.max(0, gross - laborDeduction(gross));
    var ded = 1500000 * Math.max(1, fam) + pen * 12 + 130000;
    var taxBase = Math.max(0, Math.floor((earned - ded) / 1000) * 1000);
    var tax = incomeTax(taxBase);
    var credit = taxCredit(tax, gross);
    var decided = Math.max(0, Math.round(tax - credit));
    var local = Math.round(decided * 0.1);
    var taxMonth = (decided + local) / 12;
    var net = monthly - ins - taxMonth;
    return { monthly: monthly, base: base, pen: pen, health: health, care: care, emp: emp,
             ins: ins, gross: gross, taxBase: taxBase, tax: tax, credit: credit,
             decided: decided, local: local, taxMonth: taxMonth, net: net,
             netYear: net * 12, takeRate: net / monthly * 100 };
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var pay = get('pay'), fam = get('fam') || 1;
    var annual = seg('basis') === 'monthly' ? pay * 12 * 10000 : pay * 10000;
    var nt = (isFinite(get('nontax')) ? get('nontax') : 20) * 10000;
    var d = detail(annual, fam, nt);

    var rows = [
      { k: '월 급여 (세전)', v: won(d.monthly) },
      { k: '월 비과세액', v: won(nt) }
    ];
    if (nt > 0) rows.push({ k: '과세 보수월액', v: won(d.base), note: '4대보험·소득세 기준' });
    rows.push({ k: '국민연금 (4.75%)', v: won(d.pen), note: '기준소득월액 상한 659만원' });
    rows.push({ k: '건강보험 (3.595%)', v: won(d.health) });
    rows.push({ k: '장기요양 (건강보험의 13.14%)', v: won(d.care) });
    rows.push({ k: '고용보험 (0.9%)', v: won(d.emp) });
    rows.push({ k: '4대보험 합계', v: won(d.ins), note: '월 급여의 ' + pct(d.ins / d.monthly * 100) });
    rows.push({ k: '근로소득세', v: won(d.decided / 12), note: '연 ' + won(d.decided) + ' 기준' });
    rows.push({ k: '지방소득세 (10%)', v: won(d.local / 12) });
    rows.push({ k: '월 실수령액', v: won(d.net), total: true });

    var salaries = [2500, 3000, 3500, 4000, 5000, 6000, 8000, 10000];
    var table = salaries.map(function (s) {
      var x = detail(s * 10000, fam, nt);
      return [fmt(s) + '만', won(x.net), won(x.ins), won(x.taxMonth), pct(x.takeRate)];
    });

    return {
      verdict: {
        kicker: '월 실수령액', icon: '💰',
        title: won(d.net) + ' <span class="small muted">/ 월</span>',
        desc: '연봉 ' + fmt(annual / 10000) + '만원 · 부양가족 ' + fam + '명 · 월 비과세 ' + fmt(nt / 10000) + '만원 기준. '
              + '연간으로는 <b>' + won(d.netYear) + '</b>, 회사가 떼는 돈은 연 <b>' + won((d.monthly - d.net) * 12) + '</b>입니다.',
        cls: 'verdict--ok'
      },
      stats: [
        { l: '월 실수령액', v: won(d.net) },
        { l: '4대보험 (월)', v: won(d.ins), s: pct(d.ins / d.monthly * 100) },
        { l: '소득세+지방세 (월)', v: won(d.taxMonth), s: '연 ' + won(d.decided + d.local) },
        { l: '실수령률', v: pct(d.takeRate), cls: 'is-accent' }
      ],
      rows: rows,
      bars: [
        { l: '실수령액', v: d.net, max: d.monthly, text: won(d.net), color: 'bar__fill--green' },
        { l: '4대보험', v: d.ins, max: d.monthly, text: won(d.ins), color: 'bar__fill--accent' },
        { l: '소득세·지방세', v: d.taxMonth, max: d.monthly, text: won(d.taxMonth), color: 'bar__fill--kcal' },
        { l: '비과세(떼지 않음)', v: nt, max: d.monthly, text: won(nt), color: 'bar__fill--prot' }
      ],
      table: { head: ['연봉', '월 실수령', '4대보험', '소득세', '실수령률'], rows: table,
               note: '같은 부양가족·비과세 조건에서 연봉만 바꾼 값입니다.' },
      notes: [{ html: '<b>연말정산을 넣으면 더 줄어듭니다</b> — 위 소득세는 카드·의료비·교육비 공제를 넣지 않은 값이라, 연말정산에서 환급을 받으면 실제 부담은 이보다 낮아집니다. 반대로 상여금이 몰려 나오면 그 달 원천징수세가 커집니다.' }]
    };
  }

  WT.mount({
    fields: ["pay", "fam", "nontax"],
    segs: ["basis"],
    checks: [],
    required: ["pay"],
    presets: {"연봉 3,000만": {"fields": {"pay": 3000, "fam": 1, "nontax": 20}, "segs": {"basis": "annual"}}, "연봉 4,000만": {"fields": {"pay": 4000, "fam": 1, "nontax": 20}, "segs": {"basis": "annual"}}, "연봉 6,000만": {"fields": {"pay": 6000, "fam": 2, "nontax": 20}, "segs": {"basis": "annual"}}},
    validate: null,
    compute: compute
  });
})();
