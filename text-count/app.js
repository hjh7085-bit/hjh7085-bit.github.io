/* 글자수 세기 계산기 (공백 포함·제외·바이트·읽기시간) — text-count/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function euckrBytes(s) {   // 한글·한자 2바이트 근사
    var n = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      n += c < 128 ? 1 : 2;
    }
    return n;
  }
  function timeText(chars, perMin) {
    var sec = chars / perMin * 60;
    if (sec < 60) return Math.max(1, Math.round(sec)) + '초';
    var m = Math.floor(sec / 60), s = Math.round(sec % 60);
    return m + '분' + (s ? ' ' + s + '초' : '');
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var raw = val('text');
    if (!raw) return null;
    var chars = Array.from ? Array.from(raw).length : raw.length;
    var noSpace = raw.replace(/\s/g, '');
    var charsNoSpace = Array.from ? Array.from(noSpace).length : noSpace.length;
    var words = raw.trim().split(/\s+/).filter(Boolean).length;
    var lines = raw.split('\n').length;
    var sentences = (raw.match(/[.!?。？！]+/g) || []).length || (raw.trim() ? 1 : 0);
    var utf8 = new TextEncoder().encode(raw).length;
    var euckr = euckrBytes(raw);
    var korean = (raw.match(/[가-힣]/g) || []).length;
    var read = timeText(charsNoSpace, 500);
    var speak = timeText(charsNoSpace, 330);

    var rows = [
      { k: '공백 포함 글자수', v: fmt(chars) + ' 자', total: true },
      { k: '공백 제외 글자수', v: fmt(charsNoSpace) + ' 자' },
      { k: '단어 수', v: fmt(words) + ' 개', note: '공백 기준' },
      { k: '줄 수', v: fmt(lines) + ' 줄' },
      { k: '문장 수', v: fmt(sentences) + ' 개', note: '. ! ? 기준' },
      { k: '한글 글자 수', v: fmt(korean) + ' 자' },
      { k: 'UTF-8 바이트', v: fmt(utf8) + ' byte', note: '한글 3byte · 영문 1byte' },
      { k: 'EUC-KR 바이트', v: fmt(euckr) + ' byte', note: '한글 2byte 근사' },
      { k: '읽기 시간', v: read, note: '분당 500자' },
      { k: '발표 시간', v: speak, note: '분당 330자' }
    ];

    var limits = [
      ['네이버 블로그', '제한 없음 (권장 1,500자↑)', '—'],
      ['인스타그램 캡션', '2,200자', chars <= 2200 ? '가능' : fmt(chars - 2200) + '자 초과'],
      ['X (트위터)', '280자', chars <= 280 ? '가능' : fmt(chars - 280) + '자 초과'],
      ['유튜브 제목', '100자', chars <= 100 ? '가능' : '초과'],
      ['유튜브 설명', '5,000자', chars <= 5000 ? '가능' : '초과'],
      ['자기소개서 (1,000자)', '1,000자', chars <= 1000 ? '가능' : fmt(chars - 1000) + '자 초과']
    ].map(function (r) { return [r[0], r[1], r[2]]; });

    return {
      verdict: {
        kicker: '공백 포함 글자수', icon: '🔤',
        title: fmt(chars) + '자',
        desc: '공백을 빼면 <b>' + fmt(charsNoSpace) + '자</b>, 단어 <b>' + fmt(words) + '개</b>입니다. '
              + '읽는 데 <b>' + read + '</b>, 소리 내어 읽으면 <b>' + speak + '</b> 걸립니다. '
              + (chars < 500 ? '블로그 글로는 짧습니다(1,500자 이상 권장).' : chars < 1500 ? '블로그 기준으로 조금 짧습니다(1,500자 이상 권장).' : '블로그 글로 충분한 분량입니다.'),
        cls: 'verdict--ok'
      },
      stats: [
        { l: '공백 포함', v: fmt(chars), s: '자' },
        { l: '공백 제외', v: fmt(charsNoSpace), s: '자', cls: 'is-accent' },
        { l: 'UTF-8', v: fmt(utf8), s: 'byte' },
        { l: '읽기 시간', v: read, cls: 'is-good' }
      ],
      rows: rows,
      bars: [
        { l: '한글', v: korean, max: chars, text: fmt(korean) + '자', color: 'bar__fill--accent' },
        { l: '공백·줄바꿈', v: chars - charsNoSpace, max: chars, text: fmt(chars - charsNoSpace) + '자', color: 'bar__fill--carb' },
        { l: '기타(영문·숫자)', v: Math.max(0, charsNoSpace - korean), max: chars, text: fmt(Math.max(0, charsNoSpace - korean)) + '자', color: 'bar__fill--prot' }
      ],
      table: { head: ['플랫폼', '제한', '내 글'], rows: limits,
               note: '플랫폼 정책은 바뀔 수 있습니다. 공백·줄바꿈 포함 기준입니다.' },
      notes: [
        { html: '<b>바이트가 중요한 곳</b> — 관공서·학교 시스템, 자기소개서, 문자 발송은 글자수가 아니라 바이트로 제한하는 경우가 많습니다. 한글 1자 = 2바이트(EUC-KR) 또는 3바이트(UTF-8)로 계산 방식이 다르니, 두 값을 함께 확인하세요.' }
      ]
    };
  }

  WT.mount({
    fields: ["text"],
    segs: [],
    checks: [],
    required: ["text"],
    presets: {"예시 원고 넣기": {"fields": {"text": "마운자로를 시작한 지 6개월, 체중은 14kg 줄었지만 정체기가 왔습니다. 하루 3시간씩 걸어도 숫자가 움직이지 않아 답답했습니다. 문제는 운동량이 아니라 단백질과 수면이었습니다. 단백질을 체중 1kg당 1.8g으로 올리고, 잠을 7시간으로 맞추자 3주 만에 다시 줄기 시작했습니다. 약보다 먼저 바꿔야 할 것은 생활 습관이었습니다."}}},
    validate: null,
    auto: true,
    compute: compute
  });

  (function () {
    var ta = document.getElementById('text');
    if (!ta) return;
    ta.addEventListener('input', function () {
      var btn = document.getElementById('analyzeBtn');
      if (btn && document.getElementById('result').hidden) btn.click();
    });
  })();

})();
