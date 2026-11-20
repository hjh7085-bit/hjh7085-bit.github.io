/* ==========================================================================
   임신·수유 중 주의 영양제·스킨케어 성분 필터 — preg-filter/app.js
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- 테마 ---------- */
  var THEME_KEY = 'fchl-theme';
  var root = document.documentElement;
  var toggle = document.getElementById('themeToggle');
  function applyTheme(mode) {
    root.setAttribute('data-theme', mode);
    if (toggle) {
      toggle.setAttribute('aria-pressed', mode === 'dark' ? 'true' : 'false');
      toggle.setAttribute('aria-label', mode === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환');
    }
  }
  var savedTheme = null;
  try { savedTheme = localStorage.getItem(THEME_KEY); } catch (e) {}
  applyTheme(savedTheme || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  if (toggle) toggle.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  });

  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2200);
  }

  var $ = function (id) { return document.getElementById(id); };
  var STORE = 'fchl-preg-v1';

  /* ---------- 성분 데이터 ----------
     s: { early, mid, nursing } → green / amber / red
     cat: supp(영양제) · skin(스킨케어) · food(카페인·허브·식품)               */
  var ING = [
    { id: 'folic', name: '엽산 (Folic acid)', sub: '비타민B9 · 400~800µg', cat: 'supp', s: { early: 'green', mid: 'green', nursing: 'green' },
      why: '신경관 결손 예방의 핵심. 임신 1개월 전부터 하루 400~800µg, 고위험군은 더 높게.', act: '임신 전~초기 필수. 400~800µg을 식사와 함께.' },
    { id: 'iron', name: '철분 (Iron)', sub: '원소 철 30~60mg', cat: 'supp', s: { early: 'green', mid: 'green', nursing: 'green' },
      why: '중·후기 혈액량 증가와 빈혈 예방. 변비가 흔하므로 수분·섬유질을 함께.', act: '빈혈이 있으면 처방 용량으로. 비타민C와 함께, 칼슘·커피와는 2시간 간격.' },
    { id: 'omega3', name: '오메가3 (DHA/EPA)', sub: 'DHA 200mg 이상', cat: 'supp', s: { early: 'green', mid: 'green', nursing: 'green' },
      why: '태아 뇌·망막 발달과 산후 우울 관련 연구. 혈전 위험 큰 고용량은 피함.', act: 'EPA+DHA 합계 1,000mg 내외. 출산 전후엔 출혈 위험으로 고용량 중단 상의.' },
    { id: 'vd', name: '비타민D', sub: '1,000~2,000 IU', cat: 'supp', s: { early: 'green', mid: 'green', nursing: 'green' },
      why: '칼슘 흡수와 태아 골격 형성. 실내 생활이 많으면 부족하기 쉬움.', act: '1,000~2,000 IU. 혈중 25(OH)D 확인 후 조정.' },
    { id: 'calcium', name: '칼슘 (Calcium)', sub: '500~1,000mg', cat: 'supp', s: { early: 'green', mid: 'green', nursing: 'green' },
      why: '태아 골격 형성으로 산모 골밀도가 줄어드는 시기.', act: '1회 500mg 이하로 나눠 복용. 철분과 2시간 간격.' },
    { id: 'magnesium', name: '마그네슘', sub: '200~400mg', cat: 'supp', s: { early: 'green', mid: 'green', nursing: 'green' },
      why: '변비·다리 경련 완화에 도움. 신장 질환이 있으면 용량 주의.', act: '권장량 내 사용. 설사가 나면 용량을 줄이세요.' },
    { id: 'zinc', name: '아연 (Zinc)', sub: '15mg 내외', cat: 'supp', s: { early: 'green', mid: 'green', nursing: 'green' },
      why: '세포 분열·면역. 상한은 하루 40mg이라 고용량은 구리 결핍 위험.', act: '15mg 내외. 40mg 이상 장기 복용은 피하세요.' },
    { id: 'probiotics', name: '유산균 (프로바이오틱스)', sub: '10억~100억 CFU', cat: 'supp', s: { early: 'green', mid: 'green', nursing: 'green' },
      why: '변비·질 건강에 도움. 임신 중 사용 근거가 비교적 안전한 편.', act: '권장량 사용. 아기가 설사·발진을 보이면 중단.' },
    { id: 'vitc', name: '비타민C', sub: '100~500mg', cat: 'supp', s: { early: 'green', mid: 'green', nursing: 'green' },
      why: '철분 흡수 도움·항산화. 고용량(2,000mg+)은 설사·신장 결석 위험.', act: '500mg 이하. 철분과 함께 먹으면 흡수↑.' },
    { id: 'niacinamide', name: '나이아신아마이드', sub: '스킨케어 2~10%', cat: 'skin', s: { early: 'green', mid: 'green', nursing: 'green' },
      why: '미백·진정 성분으로 임신 중 대안으로 가장 많이 쓰임. 흡수량 적음.', act: '국소 사용 가능. 레티놀 대체로 추천.' },
    { id: 'ha', name: '히알루론산', sub: '보습 스킨케어', cat: 'skin', s: { early: 'green', mid: 'green', nursing: 'green' },
      why: '피부 보습 성분. 전신 흡수가 거의 없어 안전 범주.', act: '국소 사용 가능.' },
    { id: 'collagen', name: '콜라겐', sub: '경구 2.5~5g', cat: 'supp', s: { early: 'green', mid: 'green', nursing: 'green' },
      why: '단백질 보충의 일종. 특별한 위험 보고는 없으나 효과 근거는 제한적.', act: '식품 수준 사용 가능. 단백질 총량으로 계산.' },
    { id: 'lutein', name: '루테인', sub: '10~20mg', cat: 'supp', s: { early: 'green', mid: 'green', nursing: 'green' },
      why: '눈 건강 성분. 임신 중 위해 보고 없음.', act: '권장량 사용 가능.' },
    { id: 'biotin', name: '비오틴', sub: '비타민B7', cat: 'supp', s: { early: 'green', mid: 'green', nursing: 'green' },
      why: '모발·손톱. 고용량은 혈액검사 수치를 왜곡할 수 있음.', act: '검사 전 3일은 중단하세요(갑상선 검사 오류).' },
    { id: 'iodine', name: '요오드', sub: '해조류·갑상선 보충제', cat: 'supp', s: { early: 'amber', mid: 'amber', nursing: 'green' },
      why: '태아 갑상선 호르몬에 필요하지만, 해조류 고용량은 갑상선 기능 이상을 일으킬 수 있음.', act: '권장량(임신 220µg·수유 290µg) 내에서. 다시마·미역 추출 고용량 제품은 피하세요.' },
    { id: 'retinol_skin', name: '레티놀 스킨케어', sub: '비타민A 유도체 크림', cat: 'skin', s: { early: 'amber', mid: 'amber', nursing: 'amber' },
      why: '국소 흡수는 적지만 근거가 완전하지 않아 임신 중엔 피하는 편이 안전.', act: '임신 중엔 중단 권장. 대안: 나이아신아마이드·아젤라익산·비타민C.' },
    { id: 'caffeine', name: '카페인', sub: '커피·에너지드링크·차', cat: 'food', s: { early: 'amber', mid: 'amber', nursing: 'amber' },
      why: '태반을 통과하고 반감기가 길어짐. 하루 200mg 초과 시 저체중·유산 위험 보고.', act: '하루 200mg 이하(아메리카노 1잔). 수유 중엔 아기 각성·수면 방해 주의.' },
    { id: 'bha', name: '살리실산·BHA', sub: '필링·여드름 제품', cat: 'skin', s: { early: 'amber', mid: 'amber', nursing: 'amber' },
      why: '저농도 국소는 제한적이나 고농도·전신 흡수는 피함. 아스피린 계열과 구분.', act: '2% 이하 국소·국소 부위만. 전신 필링·고농도는 피하세요.' },
    { id: 'aha', name: 'AHA (글리콜산)', sub: '각질 제거', cat: 'skin', s: { early: 'amber', mid: 'amber', nursing: 'amber' },
      why: '저농도 국소는 가능하나 자극·광민감이 늘어남.', act: '저농도·주 1~2회. 자외선 차단 필수.' },
    { id: 'bpo', name: '벤조일퍼옥사이드', sub: '여드름 국소제', cat: 'skin', s: { early: 'amber', mid: 'amber', nursing: 'amber' },
      why: '국소 소량은 흡수가 적으나 피부 자극이 큼.', act: '국소 부위에 소량. 넓은 범위 도포는 피하세요.' },
    { id: 'teatree', name: '티트리오일', sub: '국소 항균', cat: 'skin', s: { early: 'amber', mid: 'amber', nursing: 'amber' },
      why: '소량 국소는 대체로 무난하나 고농도·전신 사용 근거 부족.', act: '희석 소량만. 자극 시 중단.' },
    { id: 'isoflavone', name: '이소플라본', sub: '콩 이소플라본 고농도', cat: 'supp', s: { early: 'amber', mid: 'amber', nursing: 'amber' },
      why: '식물성 에스트로겐 작용. 고용량 보충제의 임신 중 안전성 근거 부족.', act: '고농도 보충제는 상의. 두부·콩 같은 식품은 문제 없음.' },
    { id: 'multivit', name: '종합비타민', sub: '임신부용 여부 확인', cat: 'supp', s: { early: 'amber', mid: 'amber', nursing: 'amber' },
      why: '일반 종합비타민은 비타민A(레티놀) 함량이 높을 수 있음.', act: '임신부용(베타카로틴) 제품으로. 비타민A µg RAE 확인.' },
    { id: 'b6', name: '비타민B6 고용량', sub: '100mg 이상', cat: 'supp', s: { early: 'amber', mid: 'amber', nursing: 'amber' },
      why: '입덧 완화에 쓰이나 고용량 장기 복용은 신경병증 위험.', act: '25mg 이하 단기 사용이 원칙. 고용량은 처방으로.' },
    { id: 'vite', name: '비타민E 고용량', sub: '400 IU 이상', cat: 'supp', s: { early: 'amber', mid: 'amber', nursing: 'amber' },
      why: '고용량 항산화제는 임신 결과 개선 근거가 없고 출혈 경향을 높일 수 있음.', act: '종합비타민 수준(15mg) 이상은 피하세요.' },
    { id: 'coq10', name: '코엔자임Q10', sub: '100~200mg', cat: 'supp', s: { early: 'amber', mid: 'amber', nursing: 'amber' },
      why: '난임 보조로 쓰이나 임신 중 안전성 근거가 충분치 않음.', act: '복용 중이면 산부인과에 알리고 유지 여부 상의.' },
    { id: 'nac', name: 'NAC (아세틸시스테인)', sub: '600mg 내외', cat: 'supp', s: { early: 'amber', mid: 'amber', nursing: 'amber' },
      why: '점액 용해·항산화. 임신 중 데이터 제한적.', act: '임의 복용보다 의사 판단 하에.' },
    { id: 'melatonin', name: '멜라토닌', sub: '수면 보충제', cat: 'food', s: { early: 'amber', mid: 'amber', nursing: 'amber' },
      why: '국내에선 전문의 처방 성분. 임신·수유 중 장기 안전성 자료 부족.', act: '임의 복용 금지. 수면 문제는 위생 교정 먼저.' },
    { id: 'ginger', name: '생강 추출', sub: '입덧 완화', cat: 'food', s: { early: 'amber', mid: 'amber', nursing: 'amber' },
      why: '입덧에 근거가 있는 편이나 고용량은 출혈 경향·속쓰림.', act: '하루 1g 이내. 항응고제 복용 시 상의.' },
    { id: 'cinnamon', name: '계피 고용량', sub: '보충제·추출', cat: 'food', s: { early: 'amber', mid: 'amber', nursing: 'amber' },
      why: '카시아 계피의 쿠마린은 간독성·출혈 위험. 식품 소량은 무관.', act: '보충제 형태 고용량은 피하고, 요리 양은 괜찮습니다.' },
    { id: 'licorice', name: '감초 (고용량)', sub: '차·추출', cat: 'food', s: { early: 'amber', mid: 'amber', nursing: 'amber' },
      why: '글리시리진이 칼륨을 낮춰 혈압을 올리고 부종을 만들 수 있음.', act: '매일 마시는 감초차·고용량 추출은 피하세요.' },
    { id: 'ginseng', name: '홍삼·인삼', sub: '면역·피로', cat: 'food', s: { early: 'amber', mid: 'amber', nursing: 'amber' },
      why: '임신 중 안전성 근거 부족. 혈압·출혈에 영향 가능.', act: '복용 중이면 산부인과에 알리고 상의.' },
    { id: 'retinol', name: '비타민A·레티놀 (경구)', sub: '고함량 3,000µg RAE 초과', cat: 'supp', s: { early: 'red', mid: 'red', nursing: 'red' },
      why: '고용량 비타민A는 태아 기형(두개안면·심장) 위험. 상한 3,000µg RAE/일.', act: '고함량 단일 비타민A 제품은 중단. 임신부용 종합비타민(베타카로틴)으로 교체.' },
    { id: 'isotretinoin', name: '이소트레티노인', sub: '여드름 처방약', cat: 'supp', s: { early: 'red', mid: 'red', nursing: 'red' },
      why: '강력한 기형 유발 물질. 복용 중·중단 후 일정 기간 임신 금기.', act: '복용 중이면 즉시 처방의와 상의. 임신 계획 전 반드시 중단·피임.' },
    { id: 'hydroq', name: '하이드로퀴논', sub: '미백 크림 2~4%', cat: 'skin', s: { early: 'red', mid: 'red', nursing: 'red' },
      why: '전신 흡수율이 높고 임신 중 안전성 자료 부족. 국내 처방 제품.', act: '임신·수유 중 사용하지 마세요. 대안: 나이아신아마이드·비타민C.' },
    { id: 'sjw', name: '세인트존스워트', sub: '우울·수면 허브', cat: 'food', s: { early: 'red', mid: 'red', nursing: 'red' },
      why: '약물 상호작용이 많고 임신·수유 중 안전성 근거 없음. 기형성 보고.', act: '임신 준비 단계부터 중단하고 정신건강의학과와 상의.' },
    { id: 'ashwa', name: '아슈와간다', sub: '스트레스 허브', cat: 'food', s: { early: 'red', mid: 'red', nursing: 'red' },
      why: '자궁 수축 가능성·간 손상 보고. 임신 중 사용 권고되지 않음.', act: '임신·수유 중 회피.' },
    { id: 'dietherb', name: '다이어트 허브 (톱니야자 등)', sub: '체중감량 보충제', cat: 'food', s: { early: 'red', mid: 'red', nursing: 'red' },
      why: '카르니틴·톱니야자·녹차 추출 고용량 등은 안전성 근거 부족, 간손상 보고.', act: '임신 중 체중감량 보충제는 사용하지 마세요.' }
  ];

  var STATUS = {
    green: { icon: '🟢', label: '권장', cls: 'badge--ok', combo: 'combo--ok' },
    amber: { icon: '🟡', label: '용량·상의', cls: 'badge--warn', combo: 'combo--warn' },
    red: { icon: '🔴', label: '회피 권장', cls: 'badge--bad', combo: 'combo--bad' }
  };

  var state = { stage: 'early', cat: 'all', query: '', selected: {} };
  var resultEl = $('result');

  /* ---------- 저장 ---------- */
  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({ stage: state.stage, selected: state.selected }));
    } catch (e) {}
  }
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(STORE); } catch (e) {}
    if (!raw) return;
    var d;
    try { d = JSON.parse(raw); } catch (e) { return; }
    if (!d) return;
    if (d.stage) state.stage = d.stage;
    if (d.selected) state.selected = d.selected;
  }

  function ingById(id) {
    for (var i = 0; i < ING.length; i++) if (ING[i].id === id) return ING[i];
    return null;
  }
  function statusOf(item) { return item.s[state.stage] || 'amber'; }

  /* ---------- 목록 렌더 ---------- */
  function renderList() {
    var q = state.query.trim().toLowerCase();
    var list = ING.filter(function (it) {
      if (state.cat !== 'all' && it.cat !== state.cat) return false;
      if (!q) return true;
      return (it.name + ' ' + it.sub + ' ' + it.why).toLowerCase().indexOf(q) >= 0;
    });

    $('listHint').textContent = list.length === 0
      ? '검색 결과가 없습니다. 다른 이름으로 찾아보세요(예: 비타민, 크림, 허브).'
      : list.length + '개 성분 · 체크하면 오른쪽 결과에 정리됩니다.';

    $('itemList').innerHTML = list.map(function (it) {
      var st = STATUS[statusOf(it)];
      var on = !!state.selected[it.id];
      return '<button class="fitem' + (on ? ' is-on' : '') + '" type="button" data-id="' + it.id + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
        '<span class="fitem__mark" aria-hidden="true">' + st.icon + '</span>' +
        '<span class="fitem__body"><span class="fitem__name">' + it.name + '</span>' +
        '<span class="fitem__sub">' + it.sub + ' · ' + st.label + '</span></span>' +
        '<span class="fitem__mark" aria-hidden="true">' + (on ? '☑' : '☐') + '</span>' +
      '</button>';
    }).join('');

    $('itemList').querySelectorAll('[data-id]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-id');
        state.selected[id] = !state.selected[id];
        save();
        renderList();
        renderResult(false);
      });
    });
  }

  /* ---------- 결과 렌더 ---------- */
  function renderResult(scroll) {
    var ids = Object.keys(state.selected).filter(function (k) { return state.selected[k]; });
    $('selCount').textContent = ids.length + '개 선택';

    if (!ids.length) {
      resultEl.innerHTML = '<div class="result__empty"><span class="result__empty-icon" aria-hidden="true">🤰</span><strong>성분을 체크해 주세요</strong><span>왼쪽 목록에서 지금 먹거나 바르는 성분을 누르면 단계별 분류가 나옵니다.</span></div>';
      return;
    }

    var rows = ids.map(ingById).filter(Boolean).map(function (it) {
      return { it: it, st: statusOf(it) };
    }).sort(function (a, b) {
      var o = { red: 0, amber: 1, green: 2 };
      return o[a.st] - o[b.st];
    });

    var nRed = rows.filter(function (r) { return r.st === 'red'; }).length;
    var nAmber = rows.filter(function (r) { return r.st === 'amber'; }).length;
    var nGreen = rows.filter(function (r) { return r.st === 'green'; }).length;

    var stageName = state.stage === 'early' ? '임신 초기' : state.stage === 'mid' ? '임신 중·후기' : '수유 중';
    var level = nRed ? 'bad' : (nAmber ? 'warn' : 'ok');
    var vmap = {
      ok: { cls: 'verdict--ok', icon: '🟢', title: '지금 단계에서 모두 무난합니다' },
      warn: { cls: 'verdict--warn', icon: '🟡', title: '용량·상담이 필요한 성분이 있습니다' },
      bad: { cls: 'verdict--bad', icon: '🔴', title: '회피해야 할 성분이 있습니다' }
    };
    var v = vmap[level];

    var html = '';
    html += '<div class="verdict ' + v.cls + '">' +
      '<span class="verdict__icon" aria-hidden="true">' + v.icon + '</span>' +
      '<div class="verdict__body">' +
        '<p class="verdict__kicker">' + stageName + ' 기준 · ' + ids.length + '개 성분</p>' +
        '<p class="verdict__title">' + v.title + '</p>' +
        '<p class="verdict__desc">🟢 권장 ' + nGreen + ' · 🟡 상의 ' + nAmber + ' · 🔴 회피 ' + nRed + '</p>' +
      '</div>' +
    '</div>';

    html += '<div class="card">' +
      '<div class="card__head"><span class="card__icon" aria-hidden="true">📋</span><span class="card__title">선택 성분 분류</span><span class="card__note">' + stageName + '</span></div>' +
      rows.map(function (r) {
        var st = STATUS[r.st];
        return '<div class="combo ' + st.combo + '">' +
          '<div class="combo__head"><span class="combo__name">' + r.it.name + '</span>' +
          '<span class="badge ' + st.cls + '">' + st.icon + ' ' + st.label + '</span></div>' +
          '<p class="combo__why">' + r.it.why + '</p>' +
          '<p class="combo__how"><b>이렇게:</b> ' + r.it.act + '</p>' +
        '</div>';
      }).join('') +
      '<button class="btn btn--sm btn--block mt-12" type="button" id="copyBtn">결과 복사하기</button>' +
    '</div>';

    if (nRed) {
      html += '<div class="card" style="background:var(--red-soft);border-color:color-mix(in srgb,var(--red) 32%,var(--line))">' +
        '<div class="card__head"><span class="card__icon" aria-hidden="true">🔴</span><span class="card__title">먼저 중단할 것</span></div>' +
        '<div class="tips">' + rows.filter(function (r) { return r.st === 'red'; }).map(function (r, i) {
          return '<div class="tip"><span class="tip__n">' + (i + 1) + '</span><span class="tip__text"><b>' + r.it.name + '</b> — ' + r.it.act + '</span></div>';
        }).join('') +
        '</div><p class="field__hint mt-8">이미 복용·도포했다면 양과 기간을 산부인과에 알리세요. 한두 번 노출로 큰 문제가 되는 경우는 드물지만, <b>이소트레티노인</b>은 예외이므로 반드시 상의해야 합니다.</p>' +
      '</div>';
    }

    html += '<div class="card">' +
      '<div class="card__head"><span class="card__icon" aria-hidden="true">💡</span><span class="card__title">단계별 참고</span></div>' +
      '<div class="tips">' +
        '<div class="tip"><span class="tip__n">1</span><span class="tip__text">분류는 <b>' + stageName + '</b> 기준입니다. 출산 후 수유 중에는 다시 계산해야 결론이 바뀝니다(예: 요오드).</span></div>' +
        '<div class="tip"><span class="tip__n">2</span><span class="tip__text">🟡은 "위험"이 아니라 <b>용량 확인이 필요하다</b>는 뜻입니다. 제품 라벨의 1일 섭취량을 보고 판단하세요.</span></div>' +
        '<div class="tip"><span class="tip__n">3</span><span class="tip__text">철분·칼슘·아연은 서로 흡수를 방해하므로 <b>2시간 간격</b>으로 나눠 드세요.</span></div>' +
      '</div>' +
    '</div>';

    html += '<p class="disclaimer"><b>참고용 안내</b> — 허가사항·진료지침을 정리한 정보이며 복용·사용을 결정하지 않습니다. 용량·제형·복용 기간, 기저질환과 복용약에 따라 판단이 달라지니 산부인과·약사와 상의하세요.</p>';

    resultEl.innerHTML = '<div class="result reveal">' + html + '</div>';
    var copyBtn = $('copyBtn');
    if (copyBtn) copyBtn.addEventListener('click', function () { copy(rows, stageName); });

    if (scroll && window.innerWidth < 980) {
      var top = resultEl.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
  }

  function copy(rows, stageName) {
    var L = ['[임신·수유 성분 필터] ' + stageName + ' 기준'];
    rows.forEach(function (r) {
      L.push(STATUS[r.st].icon + ' ' + r.it.name + ' — ' + STATUS[r.st].label + ' / ' + r.it.act);
    });
    L.push('', '팩트체크 건강연구소 임신·수유 성분 필터 https://hjh7085-bit.github.io/preg-filter/');
    var text = L.join('\n');
    function fb() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('결과를 복사했어요'); } catch (e) { toast('복사가 막혀 있어요'); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('결과를 복사했어요'); }, fb);
    } else fb();
  }

  /* ---------- 이벤트 ---------- */
  var STAGE_HINT = {
    early: '초기에는 신경관이 만들어지는 시기라 엽산과 비타민A 용량이 가장 중요합니다.',
    mid: '중·후기엔 철분·칼슘 수요가 커집니다. 같은 성분도 초기와 분류가 달라질 수 있어요.',
    nursing: '수유 중엔 먹은 성분이 모유로 넘어갑니다. 허브 보충제는 특히 조심하세요.'
  };
  var STAGE_NOTE = { early: '0~13주', mid: '14~40주', nursing: '수유기' };

  document.querySelectorAll('#stageSeg [data-stage]').forEach(function (b) {
    b.addEventListener('click', function () {
      state.stage = b.getAttribute('data-stage');
      document.querySelectorAll('#stageSeg .seg__btn').forEach(function (x) {
        var on = x === b;
        x.classList.toggle('is-on', on);
        x.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      $('stageHint').textContent = STAGE_HINT[state.stage];
      $('stageNote').textContent = STAGE_NOTE[state.stage];
      save();
      renderList();
      renderResult(false);
    });
  });

  document.querySelectorAll('#catChips [data-cat]').forEach(function (b) {
    b.addEventListener('click', function () {
      state.cat = b.getAttribute('data-cat');
      document.querySelectorAll('#catChips .preset').forEach(function (x) { x.classList.toggle('is-on', x === b); });
      renderList();
    });
  });

  var searchEl = $('search');
  if (searchEl) {
    searchEl.addEventListener('input', function () {
      state.query = searchEl.value || '';
      renderList();
    });
  }

  var calcBar = $('calcBar');
  if (calcBar) calcBar.addEventListener('click', function () { renderResult(true); });

  /* ---------- 초기화 ---------- */
  load();
  document.querySelectorAll('#stageSeg .seg__btn').forEach(function (x) {
    var on = x.getAttribute('data-stage') === state.stage;
    x.classList.toggle('is-on', on);
    x.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  $('stageHint').textContent = STAGE_HINT[state.stage];
  $('stageNote').textContent = STAGE_NOTE[state.stage];
  renderList();
  renderResult(false);
})();
