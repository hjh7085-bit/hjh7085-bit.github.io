/* 평균·중앙값·표준편차 계산기 (사분위·백분위) — stats-desc/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function parseNums(s) {
    var parts = String(s || '').split(/[\s,;\/]+/);
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var t = parts[i].replace(/[^0-9.\-]/g, '');
      if (t === '' || t === '-' || t === '.') continue;
      var n = Number(t);
      if (isFinite(n)) out.push(n);
    }
    return out;
  }
  function percentile(sorted, p) {
    if (!sorted.length) return 0;
    var idx = (sorted.length - 1) * p;
    var lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pctf) {
    var arr = parseNums(val('data'));
    if (arr.length < 2) {
      return { verdict: { kicker: '데이터 부족', icon: '⚠️', title: '숫자를 2개 이상 넣어 주세요', desc: '쉼표·공백·줄바꿈으로 구분하면 됩니다.', cls: 'verdict--warn' }, stats: [] };
    }
    var n = arr.length, sum = 0, i;
    for (i = 0; i < n; i++) sum += arr[i];
    var mean = sum / n;
    var sorted = arr.slice().sort(function (a, b) { return a - b; });
    var median = percentile(sorted, 0.5);
    var vsum = 0;
    for (i = 0; i < n; i++) vsum += (arr[i] - mean) * (arr[i] - mean);
    var varS = vsum / Math.max(1, n - 1), varP = vsum / n;
    var sdS = Math.sqrt(varS), sdP = Math.sqrt(varP);
    var q1 = percentile(sorted, 0.25), q3 = percentile(sorted, 0.75);
    var iqr = q3 - q1;
    var cv = mean !== 0 ? sdS / Math.abs(mean) * 100 : 0;
    var lower = q1 - 1.5 * iqr, upper = q3 + 1.5 * iqr;
    var out = [];
    for (i = 0; i < n; i++) if (arr[i] < lower || arr[i] > upper) out.push(arr[i]);

    var rows = [
      { k: '데이터 개수 (n)', v: n + '개' },
      { k: '합계', v: fmt(sum, 2) },
      { k: '평균', v: fmt(mean, 3) },
      { k: '중앙값', v: fmt(median, 3) },
      { k: '최소 / 최대', v: fmt(sorted[0], 2) + ' / ' + fmt(sorted[n - 1], 2) },
      { k: '표준편차 (표본, n−1)', v: fmt(sdS, 3) },
      { k: '표준편차 (모, n)', v: fmt(sdP, 3) },
      { k: '분산 (표본)', v: fmt(varS, 3) },
      { k: 'Q1 / Q3', v: fmt(q1, 2) + ' / ' + fmt(q3, 2) },
      { k: '사분위범위 (IQR)', v: fmt(iqr, 3) },
      { k: '변동계수 (CV)', v: fmt(cv, 1) + '%' },
      { k: '이상치 (1.5×IQR)', v: out.length ? out.slice(0, 5).map(function (x) { return fmt(x, 2); }).join(', ') + (out.length > 5 ? ' 외 ' + (out.length - 5) + '개' : '') : '없음', total: true }
    ];

    var table = [
      ['최소', fmt(sorted[0], 2), '0%'],
      ['Q1', fmt(q1, 2), '25%'],
      ['중앙값', fmt(median, 2), '50%'],
      ['Q3', fmt(q3, 2), '75%'],
      ['최대', fmt(sorted[n - 1], 2), '100%']
    ];

    var gap = mean - median;
    return {
      verdict: {
        kicker: '평균 · 표준편차', icon: '📊',
        title: '평균 ' + fmt(mean, 2),
        desc: n + '개 값의 평균은 <b>' + fmt(mean, 3) + '</b>, 중앙값은 <b>' + fmt(median, 3) + '</b>, 표본 표준편차는 <b>' + fmt(sdS, 3) +
              '</b>입니다. ' + (out.length > 0 || Math.abs(gap) > iqr * 0.5 ? '평균과 중앙값 차이가 커서 <b>이상치나 치우친 분포</b>가 의심됩니다. 중앙값과 사분위를 함께 보세요.' : '평균과 중앙값이 비슷해 분포가 비교적 대칭입니다.'),
        cls: 'verdict--ok'
      },
      stats: [
        { l: '평균', v: fmt(mean, 2), cls: 'is-accent' },
        { l: '중앙값', v: fmt(median, 2) },
        { l: '표준편차', v: fmt(sdS, 2) },
        { l: '데이터 수', v: n + '개' }
      ],
      rows: rows,
      bars: [
        { l: '최소', v: sorted[0], max: sorted[n - 1], text: fmt(sorted[0], 2), color: 'bar__fill--prot' },
        { l: 'Q1', v: q1, max: sorted[n - 1], text: fmt(q1, 2), color: 'bar__fill--accent' },
        { l: '중앙값', v: median, max: sorted[n - 1], text: fmt(median, 2), color: 'bar__fill--green' },
        { l: 'Q3', v: q3, max: sorted[n - 1], text: fmt(q3, 2), color: 'bar__fill--accent' },
        { l: '최대', v: sorted[n - 1], max: sorted[n - 1], text: fmt(sorted[n - 1], 2), color: 'bar__fill--kcal' }
      ],
      table: { head: ['구간', '값', '누적 비율'], rows: table, note: '5수 요약(최소·Q1·중앙값·Q3·최대)입니다.' }
    };
  }

  WT.mount({
    fields: ["data"],
    segs: [],
    checks: [],
    required: ["data"],
    presets: {"시험 점수 10개": {"fields": {"data": "72 85 91 68 77 88 95 62 79 84"}}, "매출 7일치": {"fields": {"data": "120, 135, 128, 150, 142, 160, 138"}}, "이상치 포함": {"fields": {"data": "10 11 12 13 14 15 16 17 18 19 200"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
