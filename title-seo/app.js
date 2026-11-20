/* 블로그·유튜브 제목 길이 & 키워드 밀도 검사기 — title-seo/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var title = val('title'), kw = val('keyword'), body = val('body');
    var tLen = Array.from(title).length;
    var kLen = Array.from(kw).length;
    var bChars = Array.from(body.replace(/\s/g, '')).length;

    function countOcc(hay, needle) {
      if (!needle) return 0;
      var n = 0, i = 0;
      var h = hay.toLowerCase(), d = needle.toLowerCase();
      while ((i = h.indexOf(d, i)) !== -1) { n++; i += d.length; }
      return n;
    }
    var tOcc = countOcc(title, kw), bOcc = countOcc(body, kw);
    var density = bChars > 0 ? (bOcc * kLen) / bChars * 100 : 0;
    var first100 = Array.from(body).slice(0, 150).join('');
    var inFirst = first100.toLowerCase().indexOf(kw.toLowerCase()) >= 0;
    var tPos = title.toLowerCase().indexOf(kw.toLowerCase());
    var front = tPos >= 0 && tPos <= Math.max(0, tLen * 0.4);

    var score = 0, checks = [];
    function add(ok, pts, good, bad) {
      if (ok) score += pts;
      checks.push({ ok: ok, txt: ok ? good : bad, pts: pts });
    }
    add(tLen >= 20 && tLen <= 45, 20, '제목 길이 적정 (' + tLen + '자)', '제목이 ' + (tLen < 20 ? '짧습니다(' + tLen + '자) · 20~45자 권장' : '깁니다(' + tLen + '자) · 20~45자 권장'));
    add(tOcc >= 1, 22, '제목에 키워드 포함', '제목에 키워드가 없습니다');
    add(front, 8, '키워드가 제목 앞부분에 있음', '키워드를 제목 앞쪽으로 옮기세요');
    add(density >= 0.7 && density <= 3.0, 20, '키워드 밀도 적정 (' + fmt(density, 2) + '%)', density < 0.7 ? '키워드 밀도가 낮습니다(' + fmt(density, 2) + '%) · 1% 내외 권장' : '키워드가 과합니다(' + fmt(density, 2) + '%) · 3% 이하 권장');
    add(inFirst, 10, '첫 문단에 키워드 포함', '첫 150자 안에 키워드를 넣으세요');
    add(bChars >= 800, 12, '본문 분량 충분 (' + fmt(bChars) + '자)', '본문이 짧습니다(' + fmt(bChars) + '자) · 1,500자 이상 권장');
    add(bOcc >= 2 && bOcc <= 12, 8, '키워드 반복 ' + bOcc + '회 · 적정', bOcc < 2 ? '본문 키워드가 ' + bOcc + '회뿐입니다' : '키워드 반복이 ' + bOcc + '회로 많습니다');

    var grade = score >= 80 ? { t: '발행해도 좋습니다', c: 'ok', icon: '🟢' }
              : score >= 50 ? { t: '한두 곳만 고치면 됩니다', c: 'warn', icon: '🟡' }
              : { t: '제목과 키워드를 다시 잡으세요', c: 'bad', icon: '🔴' };

    var rows = [
      { k: '제목 글자수', v: fmt(tLen) + ' 자', note: tLen > 45 ? '모바일에서 잘릴 수 있음' : '권장 20~45자' },
      { k: '제목 예상 폭', v: fmt(Math.round(tLen * 15)) + ' px', note: '한글 1자 ≈ 15px · 500px 초과 시 잘림' },
      { k: '키워드 길이', v: fmt(kLen) + ' 자' },
      { k: '제목 내 키워드', v: tOcc + '회', note: tPos >= 0 ? tPos + '번째 글자에서 시작' : '없음' },
      { k: '본문 키워드', v: bOcc + '회', note: '공백 제외 ' + fmt(bChars) + '자' },
      { k: '키워드 밀도', v: fmt(density, 2) + ' %', total: true, cls: density > 3 ? 'is-bad' : density >= 0.7 ? 'is-good' : '' },
      { k: 'SEO 점수', v: score + ' / 100', total: true }
    ];

    return {
      verdict: {
        kicker: 'SEO 진단 점수', icon: grade.icon,
        title: score + '점 · ' + grade.t,
        desc: '제목 <b>' + tLen + '자</b>, 키워드 밀도 <b>' + fmt(density, 2) + '%</b>입니다. '
              + (score >= 80 ? '기본 요건을 갖췄습니다. 발행 후 체류시간과 클릭률을 보며 제목을 다듬으세요.'
                 : '아래 체크리스트에서 빨간 항목부터 고치면 점수가 바로 올라갑니다.'),
        cls: 'verdict--' + grade.c
      },
      stats: [
        { l: 'SEO 점수', v: score + '점', cls: score >= 80 ? 'is-good' : score >= 50 ? '' : 'is-bad' },
        { l: '제목 길이', v: tLen + '자' },
        { l: '키워드 밀도', v: fmt(density, 2) + '%' },
        { l: '키워드 반복', v: bOcc + '회', s: '본문' }
      ],
      rows: rows,
      bars: checks.map(function (c) {
        return { l: (c.ok ? '✅ ' : '⚠️ ') + c.txt, v: c.ok ? c.pts : 0, max: c.pts, text: c.ok ? c.pts + '/' + c.pts : '0/' + c.pts,
                 color: c.ok ? 'bar__fill--green' : 'bar__fill--kcal' };
      }),
      table: { head: ['항목', '상태', '배점'], rows: checks.map(function (c) { return [c.txt, c.ok ? '통과' : '보완', c.pts + '점']; }),
               note: '점수는 제목·키워드·본문 구성만 본 간이 진단입니다.' },
      notes: [
        { html: '<b>제목 공식</b> — ① 핵심 키워드를 앞에 ② 숫자·기간을 넣어 구체적으로 ③ 궁금증을 남기는 말미. 예: "마운자로 정체기 3주 만에 깬 방법 (단백질·수면 조정)". 45자를 넘으면 모바일에서 잘립니다.' },
        { html: '키워드 밀도 2%를 맞추려고 같은 단어를 반복하면 <b>스팸 필터</b>에 걸릴 수 있습니다. 유의어·상위어로 자연스럽게 풀어 쓰는 것이 안전합니다.' }
      ]
    };
  }

  WT.mount({
    fields: ["title", "keyword", "body"],
    segs: [],
    checks: [],
    required: ["title", "keyword"],
    presets: {"좋은 예": {"fields": {"title": "마운자로 정체기 3주 만에 깬 방법 (단백질·수면 조정)", "keyword": "마운자로 정체기", "body": "마운자로 정체기가 오면 대부분 운동량을 늘립니다. 하지만 마운자로 정체기의 원인은 운동 부족이 아닌 경우가 많습니다. 이 글에서는 마운자로 정체기를 겪은 6개월 기록을 정리했습니다. 첫째, 단백질을 체중 1kg당 1.8g으로 올렸습니다. 82kg이면 하루 148g으로, 닭가슴살 300g과 단백질 쉐이크 2잔, 계란 2개를 더한 양입니다. 원래는 하루 60g 남짓이었으니 두 배 이상 늘어난 셈입니다. 둘째, 수면을 7시간으로 맞췄습니다. 새벽 1시에 자고 6시에 일어나던 습관을 11시 30분 취침, 7시 기상으로 바꿨습니다. 수면 부족은 인슐린 저항성을 높이고 식욕 호르몬인 그렐린을 늘린다는 연구가 여러 건 있습니다. 셋째, 걷기 운동을 3시간에서 1시간으로 줄이고 대신 주 3회 근력 운동을 넣었습니다. 과도한 유산소는 근손실을 부르고, 근육이 줄면 기초대사량이 함께 떨어집니다. 마운자로 정체기는 이 세 가지를 바꾼 뒤 3주 만에 풀렸습니다. 체중은 2.4kg 줄었고 허리둘레도 3cm 줄었습니다. 약의 용량을 올리지 않고도 가능했습니다. 같은 고민을 하는 분께 도움이 되길 바랍니다. 중요한 것은 약을 더 쓰는 것이 아니라 먹는 양과 시간, 그리고 잠을 다시 세팅하는 일이었습니다."}}, "개선 필요 예": {"fields": {"title": "제가 다이어트 하면서 느낀 점", "keyword": "마운자로 정체기", "body": "요즘 다이어트가 잘 안 돼서 고민이 많습니다. 운동도 열심히 하고 식단도 하는데 숫자가 안 줄어요. 그래서 여러 가지를 찾아봤습니다. 정말 힘든 시간이었고 앞으로도 계속 노력하려고 합니다."}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
