/* 더치페이·회비 정산기 (균등·차등 분담) — dutch-pay/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var total = get('total') || 0;
    var people = Math.max(2, Math.round(get('people') || 2));
    var tip = isFinite(get('tip')) ? get('tip') : 0;
    var paid = isFinite(get('paid')) ? get('paid') : 0;
    var mode = seg('mode');

    var withTip = total * (1 + tip / 100);
    var net = Math.max(0, withTip - paid);
    var per = Math.floor(net / people / 10) * 10;
    var rem = net - per * people;

    var rows = [
      { k: '결제 금액', v: won(total) }
    ];
    if (tip > 0) rows.push({ k: '팁 (' + fmt(tip) + '%)', v: '+' + won(total * tip / 100) });
    rows.push({ k: '정산 대상 금액', v: won(net) });
    rows.push({ k: '인원', v: fmt(people) + '명' });
    rows.push({ k: '1인당 (10원 단위 내림)', v: won(per) });
    rows.push({ k: '나머지', v: won(rem), note: rem > 0 ? '대표가 부담하거나 1원씩 추가' : '없음' });
    rows.push({ k: '1인당 최종 (나머지 포함)', v: won((net) / people), total: true });

    var table = [];
    var diffNote = '';
    if (mode === 'diff') {
      var lines = String(val('list') || '').split('\n');
      var named = [], sum = 0;
      lines.forEach(function (ln) {
        var t = ln.trim();
        if (!t) return;
        var m = t.match(/^(.*?)[\s,:]+([0-9,]+)\s*$/);
        if (!m) return;
        var amt = Number(m[2].replace(/,/g, ''));
        if (!isFinite(amt)) return;
        named.push([m[1].trim() || '이름없음', amt]);
        sum += amt;
      });
      var restCount = Math.max(0, people - named.length);
      var left = Math.max(0, net - sum);
      var restPer = restCount > 0 ? left / restCount : 0;
      named.forEach(function (n) { table.push([n[0], won(n[1]), pct(net > 0 ? n[1] / net * 100 : 0, 1)]); });
      if (restCount > 0) table.push(['나머지 ' + restCount + '명', won(restPer) + '씩', pct(left / Math.max(1, net) * 100, 1)]);
      diffNote = named.length > 0
        ? '지정 금액 합계 ' + won(sum) + ', 남은 ' + won(left) + '을 ' + restCount + '명이 나눠 ' + won(restPer) + '씩 냅니다.' + (left < 0 ? ' 지정 금액이 총액을 ' + won(-left) + ' 초과합니다.' : '')
        : '이름과 금액을 한 줄씩 넣으면 차등 정산이 계산됩니다.';
    } else {
      for (var i = 1; i <= Math.min(people, 8); i++) {
        var mine = per + (i <= Math.round(rem / Math.max(1, per || 1)) && rem > 0 ? 0 : 0);
        table.push([i + '번째', won(per), pct(net > 0 ? per / net * 100 : 0, 1)]);
      }
      diffNote = '10원 단위로 내림해 1인당 ' + won(per) + ', 남은 ' + won(rem) + '은 대표가 부담하는 계산입니다.';
    }

    return {
      verdict: {
        kicker: mode === 'diff' ? '차등 분담 결과' : '1인당 금액', icon: '🧾',
        title: won(net / people),
        desc: mode === 'diff'
          ? diffNote
          : '총 ' + won(withTip) + '을 ' + fmt(people) + '명이 나누면 1인당 <b>' + won(net / people) + '</b>입니다. 10원 단위로 내림하면 ' + won(per) + '씩 내고 ' + won(rem) + '이 남습니다.',
        cls: 'verdict--ok'
      },
      stats: [
        { l: '1인당', v: won(net / people), cls: 'is-accent' },
        { l: '정산 총액', v: won(net) },
        { l: '인원', v: fmt(people) + '명' },
        { l: '나머지', v: won(rem) }
      ],
      rows: rows,
      table: { head: ['참석자', '부담 금액', '비중'], rows: table, note: mode === 'diff' ? '지정한 금액과 나머지 분담 내역입니다.' : '균등 분담 내역(10원 단위)입니다.' },
      notes: [{ html: '<b>나머지 처리 팁</b> — 1원 단위까지 맞추려면 한 명이 10원을 더 내거나, 다음 모임 회비로 넘기면 됩니다. 계좌이체로 받을 때는 이름을 표시해 두면 나중에 확인이 쉽습니다.' }]
    };
  }

  WT.mount({
    fields: ["total", "people", "tip", "paid"],
    segs: ["mode"],
    checks: [],
    required: ["total", "people"],
    presets: {"23만 7천 · 5명 균등": {"fields": {"total": 237000, "people": 5, "tip": 0, "paid": 0, "list": ""}, "segs": {"mode": "equal"}}, "12만 · 3명 · 팁 10%": {"fields": {"total": 120000, "people": 3, "tip": 10, "paid": 0, "list": ""}, "segs": {"mode": "equal"}}, "30만 · 4명 차등": {"fields": {"total": 300000, "people": 4, "tip": 0, "paid": 0, "list": "철수 50000\n영희 80000"}, "segs": {"mode": "diff"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
