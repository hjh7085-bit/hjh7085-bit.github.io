/* 체중별 하루 물·카페인 적정 섭취량 계산기 — water-caffeine/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function parseHM(s) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim());
    if (!m) return null;
    var h = +m[1], mi = +m[2];
    if (h > 24 || mi > 59) return null;
    return (h % 24) * 60 + mi;
  }
  function hhmm(min) {
    min = ((min % 1440) + 1440) % 1440;
    var h = Math.floor(min / 60), m = Math.round(min % 60);
    var ap = h < 12 ? '오전' : '오후';
    var h12 = h % 12; if (h12 === 0) h12 = 12;
    return ap + ' ' + h12 + ':' + (m < 10 ? '0' + m : m);
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var w = get('weight');
    var ex = get('exercise') || 0;
    var hot = get('weather') || 0;
    var drunk = get('drunk');

    var baseMl = w * 33;
    var exMl = ex / 30 * 400;
    var totalMl = baseMl + exMl + hot;
    var cups = totalMl / 200;
    var remain = isFinite(drunk) ? totalMl - drunk : null;

    var sens = seg('sensitivity'), preg = seg('pregnant');
    var cap = preg === 'yes' ? 200 : 400;
    if (sens === 'high') cap = Math.min(cap, w * 3);
    else if (sens === 'low') cap = Math.min(cap, 400);
    var mg = (get('coffee') || 0) * (get('mgPer') || 0);
    var ratio = mg / cap * 100;
    var cupsLeft = Math.max(0, Math.floor((cap - mg) / (get('mgPer') || 150)));
    var halfLife = sens === 'high' ? 6 : 5;
    var bed = parseHM(val('bedtime'));
    var cutoff = bed !== null ? bed - 8 * 60 + (sens === 'high' ? -60 : 0) : null;
    var lastSafe = bed !== null ? bed - halfLife * 2 * 60 : null;

    var rows = [
      { k: '기본 물 (체중 × 33ml)', v: fmt(Math.round(baseMl)) + ' ml' },
      { k: '운동 보충 (30분당 400ml)', v: fmt(Math.round(exMl)) + ' ml' },
      { k: '더위·사우나 가산', v: fmt(Math.round(hot)) + ' ml' },
      { k: '하루 물 목표', v: fmt((totalMl / 1000).toFixed(1)) + ' L', total: true, note: '200ml 컵 ' + fmt(Math.round(cups)) + '잔' },
      { k: '카페인 상한', v: fmt(Math.round(cap)) + ' mg', note: preg === 'yes' ? '임신·수유 기준 200mg' : sens === 'high' ? '민감도 반영' : '건강한 성인 400mg' },
      { k: '오늘 섭취', v: fmt(Math.round(mg)) + ' mg', note: '상한의 ' + fmt(ratio, 0) + '%' },
      { k: '남은 카페인 여유', v: fmt(Math.round(Math.max(0, cap - mg))) + ' mg', note: '커피 ' + cupsLeft + '잔 분량' }
    ];
    if (remain !== null) rows.push({ k: '물 남은 양', v: (remain > 0 ? fmt(Math.round(remain)) + ' ml' : '목표 달성'), note: remain > 0 ? '컵 ' + fmt(Math.ceil(remain / 200)) + '잔 더' : '오늘 목표를 채웠습니다' });

    var cls = ratio > 100 ? 'verdict--bad' : ratio > 80 ? 'verdict--warn' : 'verdict--ok';
    return {
      verdict: {
        kicker: '하루 물 목표 · 카페인 상한', icon: '💧',
        title: (totalMl / 1000).toFixed(1) + ' L · ' + fmt(Math.round(cap)) + 'mg',
        desc: '물은 <b>200ml 컵 ' + fmt(Math.round(cups)) + '잔</b>입니다. 카페인은 오늘 ' + fmt(Math.round(mg)) + 'mg으로 상한의 <b>'
              + fmt(ratio, 0) + '%</b>를 채웠습니다. '
              + (cutoff !== null ? '취침 ' + val('bedtime') + ' 기준, 마지막 커피는 <b>' + hhmm(Math.min(cutoff, lastSafe)) + '</b>까지가 좋습니다.' : ''),
        cls: cls
      },
      stats: [
        { l: '하루 물', v: (totalMl / 1000).toFixed(1) + ' L', cls: 'is-accent', s: fmt(Math.round(cups)) + '컵' },
        { l: '카페인 상한', v: fmt(Math.round(cap)) + ' mg' },
        { l: '오늘 섭취', v: fmt(Math.round(mg)) + ' mg', cls: ratio > 100 ? 'is-bad' : '' },
        { l: '커피 컷오프', v: cutoff !== null ? hhmm(Math.min(cutoff, lastSafe)) : '-', s: '이후엔 수면 영향' }
      ],
      rows: rows,
      bars: [
        { l: '물 섭취 (' + (isFinite(drunk) ? fmt(Math.round(drunk)) : '0') + ' / ' + fmt(Math.round(totalMl)) + 'ml)', v: isFinite(drunk) ? drunk : 0, max: totalMl, text: pct(isFinite(drunk) ? drunk / totalMl * 100 : 0, 0), color: 'bar__fill--accent' },
        { l: '카페인 (' + fmt(Math.round(mg)) + ' / ' + fmt(Math.round(cap)) + 'mg)', v: mg, max: cap, text: pct(ratio, 0), color: ratio > 100 ? 'bar__fill--fat' : ratio > 80 ? 'bar__fill--kcal' : 'bar__fill--green' }
      ],
      table: { head: ['음료', '카페인', '잔 수로 환산'], rows: [
          ['아메리카노 (355ml)', '150~200mg', fmt(Math.round(cap / 175)) + '잔'],
          ['믹스커피', '60~70mg', fmt(Math.round(cap / 65)) + '잔'],
          ['에너지드링크 (250ml)', '80mg', fmt(Math.round(cap / 80)) + '캔'],
          ['콜라 (355ml)', '35mg', fmt(Math.round(cap / 35)) + '캔'],
          ['녹차 (200ml)', '30mg', fmt(Math.round(cap / 30)) + '잔']
        ], note: '상한(' + fmt(Math.round(cap)) + 'mg)까지 마실 수 있는 양입니다. 한 번에 몰아 마시지 마세요.' },
      notes: [
        { html: '<b>물은 한 번에 많이 마시면 소변으로 나갑니다.</b> 시간당 200~250ml씩 나눠 마시는 편이 흡수가 좋습니다. 물만으로는 전해질이 희석될 수 있어, 땀을 많이 흘린 날은 소금·칼륨도 보충하세요.' },
        { html: '카페인 반감기는 5~6시간입니다. 오후 3시에 마신 커피의 절반은 밤 9시에도 남아 있어, 잠들기까지 걸리는 시간을 늘리고 깊은 잠을 줄입니다.' }
      ]
    };
  }

  WT.mount({
    fields: ["weight", "exercise", "weather", "drunk", "coffee", "mgPer", "bedtime"],
    segs: ["sensitivity", "pregnant"],
    checks: [],
    required: ["weight"],
    presets: {"82kg · 커피 2잔": {"fields": {"weight": 82, "exercise": 40, "weather": 0, "drunk": 1200, "coffee": 2, "mgPer": 150, "bedtime": "23:30"}, "segs": {"sensitivity": "normal", "pregnant": "no"}}, "58kg · 커피 3잔": {"fields": {"weight": 58, "exercise": 0, "weather": 0, "drunk": 800, "coffee": 3, "mgPer": 120, "bedtime": "24:00"}, "segs": {"sensitivity": "high", "pregnant": "no"}}, "95kg · 에너지드링크 2캔": {"fields": {"weight": 95, "exercise": 90, "weather": 500, "drunk": 2000, "coffee": 2, "mgPer": 80, "bedtime": "01:00"}, "segs": {"sensitivity": "normal", "pregnant": "no"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
