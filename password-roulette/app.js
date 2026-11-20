/* 강력 비밀번호 생성기 & 랜덤 룰렛 — password-roulette/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

var SETS = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    digit: '0123456789',
    symbol: '!@#$%^&*()-_=+[]{};:,.?'
  };
  var AMBIG = 'O0oIl1|`\'"';

  function rand(n) {
    var a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % n;
  }
  function pick(set) { return set.charAt(rand(set.length)); }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var len = Math.max(6, Math.min(64, Math.round(get('length') || 16)));
    var cnt = Math.max(1, Math.min(10, Math.round(get('count') || 3)));
    var sets = chk('charset');
    if (sets.indexOf('noAmb') >= 0) sets = sets.filter(function (s) { return s !== 'noAmb'; });
    if (!sets.length) sets = ['lower', 'digit'];
    var noAmb = chk('charset').indexOf('noAmb') >= 0;
    var pool = '', pools = [];
    sets.forEach(function (k) {
      var s = SETS[k];
      if (noAmb) s = s.split('').filter(function (c) { return AMBIG.indexOf(c) < 0; }).join('');
      pools.push(s); pool += s;
    });
    var style = seg('style');
    var pw = [];
    for (var i = 0; i < cnt; i++) {
      var chars = [];
      // 각 문자군에서 최소 1자 보장
      pools.forEach(function (p) { chars.push(pick(p)); });
      while (chars.length < len) chars.push(pick(pool));
      // 셔플
      for (var j = chars.length - 1; j > 0; j--) {
        var t = rand(j + 1), tmp = chars[j]; chars[j] = chars[t]; chars[t] = tmp;
      }
      var s2 = chars.join('');
      if (style === 'words') {
        s2 = s2.replace(/[a-z]{4,}/, function (m) { return m; });
      }
      pw.push(s2);
    }
    var bits = Math.log2(Math.pow(pool.length, len));
    var guesses = Math.pow(2, bits - 1);
    var perSec = 1e10;
    var secs = guesses / perSec;
    var crackText;
    if (secs < 1) crackText = '1초 이내';
    else if (secs < 60) crackText = Math.round(secs) + '초';
    else if (secs < 3600) crackText = Math.round(secs / 60) + '분';
    else if (secs < 86400) crackText = Math.round(secs / 3600) + '시간';
    else if (secs < 31536000) crackText = Math.round(secs / 86400) + '일';
    else if (secs / 31536000 < 1000000) crackText = fmt(Math.round(secs / 31536000)) + '년';
    else crackText = '100만 년 이상';

    var weak = bits < 50, mid = bits < 80;
    var rows = [
      { k: '문자 풀 크기', v: pool.length + '종', note: sets.join(' · ') },
      { k: '길이', v: len + '자' },
      { k: '조합 가능 수', v: Math.pow(pool.length, len).toExponential(2).replace('e+', ' × 10^') },
      { k: '엔트로피', v: fmt(bits, 1) + ' bit', total: true },
      { k: '예상 해독 시간', v: crackText, note: '초당 100억 회 시도 기준' }
    ];

    var items = String(val('items') || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    var roulette = '';
    var pickText = '';
    if (items.length) {
      var idx = rand(items.length);
      pickText = items[idx];
      roulette = '<div class="verdict verdict--accent reveal"><span class="verdict__icon" aria-hidden="true">🎲</span>'
        + '<div class="verdict__body"><p class="verdict__kicker">룰렛 결과 · ' + items.length + '명 중</p>'
        + '<p class="verdict__title">' + esc(pickText) + '</p>'
        + '<p class="verdict__desc">후보: ' + items.map(esc).join(' · ') + '</p></div></div>';
    }

    return {
      verdict: {
        kicker: '생성된 비밀번호 (' + cnt + '개)', icon: weak ? '🔴' : mid ? '🟡' : '🟢',
        title: '엔트로피 ' + fmt(bits, 1) + ' bit · ' + (weak ? '취약' : mid ? '보통' : '매우 강함'),
        desc: '길이 <b>' + len + '자</b>, 문자 <b>' + pool.length + '종</b>으로 <b>' + crackText + '</b>이 걸립니다(초당 100억 회 기준). 아래에서 복사해 바로 쓰세요.',
        cls: weak ? 'verdict--bad' : mid ? 'verdict--warn' : 'verdict--ok'
      },
      stats: [
        { l: '엔트로피', v: fmt(bits, 1) + ' bit', cls: weak ? 'is-bad' : 'is-good' },
        { l: '길이', v: len + '자' },
        { l: '문자 종류', v: pool.length + '종' },
        { l: '해독 시간', v: crackText, s: '100억회/초' }
      ],
      rows: rows,
      html: '<div class="card"><div class="card__head"><h3 class="card__title">🔑 생성된 비밀번호</h3>'
        + '<span class="card__note">클릭하면 복사</span></div>'
        + '<div class="pw-list">' + pw.map(function (p) {
            return '<button class="pw" type="button" data-pw="' + p.replace(/"/g, '&quot;') + '"><code>' + esc(p) + '</code>'
              + '<span class="pw__hint">복사</span></button>';
          }).join('') + '</div></div>'
        + (roulette ? roulette : ''),
      notes: [
        { html: '<b>길이가 복잡도보다 중요합니다.</b> 특수문자를 넣어 10자로 만드는 것보다, 소문자+숫자로 16자로 만드는 편이 더 안전합니다. 길이 1자를 늘리면 경우의 수가 문자 종류만큼 늘어납니다.' },
        { html: '<b>사이트별로 다른 비밀번호</b>를 쓰고, 2단계 인증(OTP·패스키)을 켜세요. 하나가 유출돼도 다른 계정이 안전하려면 이 두 가지가 가장 효과적입니다.' }
      ]
    };
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  WT.mount({
    fields: ["length", "count", "items"],
    segs: ["style"],
    checks: ["charset"],
    required: ["length"],
    presets: {"16자 강력 비밀번호": {"fields": {"length": 16, "count": 3, "items": ""}, "segs": {"style": "random"}, "checks": {"charset": ["upper", "lower", "digit", "symbol"]}}, "20자 최대 강도": {"fields": {"length": 20, "count": 5, "items": ""}, "segs": {"style": "random"}, "checks": {"charset": ["upper", "lower", "digit", "symbol", "noAmb"]}}, "룰렛 예시": {"fields": {"length": 16, "count": 3, "items": "김철수\\n이영희\\n박민수\\n최지우\\n정하늘"}, "segs": {"style": "random"}, "checks": {"charset": ["upper", "lower", "digit", "symbol"]}}},
    validate: null,
    auto: false,
    compute: compute
  });

  (function () {
    document.addEventListener('click', function (e) {
      var b = e.target.closest('.pw');
      if (!b) return;
      var text = b.getAttribute('data-pw');
      var done = function () { WT.toast('비밀번호를 복사했습니다.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { WT.toast('복사가 막혀 있어요. 길게 눌러 복사하세요.'); });
      } else { WT.toast('길게 눌러 직접 복사하세요.'); }
    });
  })();

})();
