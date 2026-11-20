/* ==========================================================================
   교대·야간근무 식사·수면·빛 차단 시간표 생성기 — shift-rhythm/app.js
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
  var STORE = 'fchl-shift-v1';
  var resultEl = $('result');
  var state = { meal: 'heavy', preset: 'night' };

  /* ---------- 시간 유틸 ---------- */
  function parseHM(str) {
    if (!str || str.indexOf(':') < 0) return null;
    var p = str.split(':');
    var h = Number(p[0]), m = Number(p[1]);
    if (!isFinite(h) || !isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
  }
  function wrap(mins) {
    var m = Math.round(mins) % 1440;
    if (m < 0) m += 1440;
    return m;
  }
  function hm(mins) {
    var m = wrap(mins);
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }
  function pretty(mins) {
    var m = wrap(mins);
    var h = Math.floor(m / 60), mm = m % 60;
    var ap = h < 12 ? '오전' : '오후';
    var h12 = h % 12; if (h12 === 0) h12 = 12;
    return ap + ' ' + h12 + ':' + String(mm).padStart(2, '0');
  }
  function durText(mins) {
    var m = Math.max(0, Math.round(mins));
    var h = Math.floor(m / 60), mm = m % 60;
    if (!h) return mm + '분';
    return h + '시간' + (mm ? ' ' + mm + '분' : '');
  }

  /* ---------- 저장 ---------- */
  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({
        start: $('startTime').value, end: $('endTime').value,
        commute: $('commute').value, sleepLen: $('sleepLen').value, meal: state.meal
      }));
    } catch (e) {}
  }
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(STORE); } catch (e) {}
    if (!raw) return;
    var d;
    try { d = JSON.parse(raw); } catch (e) { return; }
    if (!d) return;
    if (d.start) $('startTime').value = d.start;
    if (d.end) $('endTime').value = d.end;
    if (typeof d.commute !== 'undefined' && d.commute !== '') $('commute').value = d.commute;
    if (d.sleepLen) $('sleepLen').value = d.sleepLen;
    if (d.meal) state.meal = d.meal;
  }

  /* ---------- 핵심 계산 ---------- */
  function compute() {
    var start = parseHM($('startTime').value);
    var end = parseHM($('endTime').value);
    var commute = Math.min(180, Math.max(0, Number($('commute').value) || 0));
    var target = Number($('sleepLen').value) || 450;

    if (start == null || end == null) return { error: 'time' };

    var shiftLen = wrap(end - start);
    if (shiftLen === 0) shiftLen = 1440;
    if (shiftLen < 60 || shiftLen > 1080) {
      return { error: 'range', shiftLen: shiftLen };
    }

    var END = start + shiftLen;
    var off = function (t) { return ((t - start) % 1440 + 1440) % 1440; };
    var afterShiftOff = off(END + commute + 60);       // 귀가·정리 후
    var latestWakeOff = off(start - commute - 45);     // 출근 준비·이동 45분
    var avail = (latestWakeOff - afterShiftOff + 1440) % 1440;

    // 근무가 밤에 끝나면(22:00~09:00) 퇴근 직후 수면, 아니면 근무 전에 맞춰 수면
    var endClock = ((END % 1440) + 1440) % 1440;
    var nightEnd = endClock >= 1320 || endClock <= 540;
    var shiftLater = nightEnd ? 0 : Math.max(0, avail - target - 15);
    var sleepStartOff = afterShiftOff + shiftLater;
    var sleep = Math.min(target, avail - shiftLater);
    var short = sleep < target;
    if (sleep < 240) { sleep = 240; shiftLater = Math.max(0, avail - 240); sleepStartOff = afterShiftOff + shiftLater; }
    sleep = Math.min(sleep, avail - shiftLater);

    var sleepStart = start + sleepStartOff;
    var wake = sleepStart + sleep;

    var caffeine = sleepStart - 360;
    var lastMeal = sleepStart - 180;
    var glasses = END - 30;
    var dimLight = sleepStart - 60;
    var arrive = END + commute;
    var arriveOff = off(arrive);
    var lmOff0 = off(lastMeal);
    if (lmOff0 > shiftLen && lmOff0 < arriveOff) lastMeal = arrive + 15;
    var leaveHome = start - commute;
    var wakeGap = (off(leaveHome) - off(wake) + 1440) % 1440;   // 기상 → 출발까지
    var mealDelay = Math.min(60, Math.max(5, wakeGap - 15));
    var firstMeal = wake + mealDelay;
    var midMeal = start + Math.round(shiftLen * 0.4);

    return {
      start: start, end: wrap(end), shiftLen: shiftLen, commute: commute,
      sleepStart: sleepStart, wake: wake, sleep: sleep, avail: avail,
      target: target, short: short, nightEnd: nightEnd, caffeine: caffeine,
      lastMeal: lastMeal, glasses: glasses, dimLight: dimLight, arrive: arrive, firstMeal: firstMeal,
      leaveHome: leaveHome, wakeGap: wakeGap, mealDelay: mealDelay, midMeal: midMeal, END: END
    };
  }

  /* ---------- 렌더 ---------- */
  function row(cls, icon, t, dayIdx, title, desc) {
    var day = dayIdx > 0 ? '<small>+' + dayIdx + '일</small>' : '<small>&nbsp;</small>';
    return '<div class="tl__row ' + cls + '">' +
      '<p class="tl__time">' + hm(t) + day + '</p>' +
      '<span class="tl__dot" aria-hidden="true">' + icon + '</span>' +
      '<div class="tl__body"><p class="tl__title">' + title + '</p>' +
      '<p class="tl__desc">' + desc + '</p></div>' +
    '</div>';
  }

  function render(scroll) {
    var c = compute();

    if (c.error === 'time') {
      resultEl.innerHTML = '<div class="result__empty"><span class="result__empty-icon" aria-hidden="true">🕒</span><strong>근무 시각을 넣어주세요</strong><span>시작·종료 시각을 고르면 하루 시간표를 바로 만들어 드립니다.</span></div>';
      $('shiftLen').textContent = '—';
      return;
    }
    if (c.error === 'range') {
      resultEl.innerHTML = '<div class="result__empty"><span class="result__empty-icon" aria-hidden="true">⚠️</span><strong>근무 시간을 확인해 주세요</strong><span>계산기는 1시간 이상 18시간 이하 근무를 지원합니다. 시작과 종료가 같으면 24시간으로 처리됩니다.</span></div>';
      $('shiftLen').textContent = '확인 필요';
      return;
    }

    $('shiftLen').textContent = durText(c.shiftLen) + ' 근무';

    var dayOf = function (t) { return Math.floor((c.start + ((t - c.start) % 1440 + 1440) % 1440) / 1440) > Math.floor(c.start / 1440) ? 1 : 0; };
    var events = [];

    events.push({ off: 0, cls: '', icon: '💼', t: c.start, title: '근무 시작', desc: '근무 전 1시간은 밝은 빛을 유지하세요. 밤 근무라도 근무 초반은 조명을 밝게 두는 편이 각성 유지에 유리합니다.' });

    if (state.meal === 'heavy') {
      events.push({ off: Math.round(c.shiftLen * 0.4), cls: 'tl__row--food', icon: '🍱', t: c.midMeal, title: '근무 중 식사 (전반부)', desc: '단백질 25~30g + 채소 + 천천히 타는 탄수화물(잡곡·고구마). 하루 식사의 <b>가장 큰 몫</b>을 여기에 두세요.' });
    } else if (state.meal === 'light') {
      events.push({ off: Math.round(c.shiftLen * 0.4), cls: 'tl__row--food', icon: '🥛', t: c.midMeal, title: '근무 중 간식', desc: '요거트·바나나·삶은 달걀처럼 소화가 빠른 것 200kcal 내외. 공복이 길면 새벽에 폭식이 옵니다.' });
    }

    events.push({ off: 0, cls: 'tl__row--cut', icon: '☕', t: c.caffeine, title: '카페인 컷오프', desc: '이 시각 이후 커피·에너지드링크·홍삼은 잠드는 시간을 늘립니다. 카페인 반감기 5~6시간 기준입니다.' });

    var lmOff = ((c.lastMeal - c.start) % 1440 + 1440) % 1440;
    if (lmOff <= c.shiftLen) {
      events.push({ off: 0, cls: 'tl__row--food', icon: '🍲', t: c.lastMeal, title: '근무 후반 가벼운 식사', desc: '취침 3시간 전입니다. 탄수화물·지방은 줄이고 단백질 위주로 가볍게. 여기서 많이 먹으면 잠은 들어도 깊은 잠이 줄어요.' });
    } else if (lmOff < ((c.sleepStart - c.start) % 1440 + 1440) % 1440) {
      events.push({ off: 0, cls: 'tl__row--food', icon: '🍲', t: c.lastMeal, title: '퇴근 후 가벼운 식사', desc: '취침 3시간 전, 마지막 식사입니다. 자려는데 배가 고프면 우유 한 컵·삶은 달걀 정도만.' });
    } else {
      events.push({ off: 0, cls: 'tl__row--food', icon: '🍲', t: c.lastMeal, title: '근무 전 마지막 식사', desc: '취침 3시간 전, 마지막 식사입니다. 근무 중 배가 고프면 근무 전반부 간식으로 보충하세요.' });
    }

    if (c.nightEnd) {
      events.push({ off: 0, cls: 'tl__row--light', icon: '🕶️', t: c.glasses, title: '선글라스 착용', desc: '퇴근 30분 전부터 짙은 렌즈를 씁니다. 아침 햇빛이 눈에 들어오면 생체시계가 낮으로 재설정돼 잠이 안 옵니다.' });
      events.push({ off: 0, cls: '', icon: '🏁', t: c.END, title: '근무 종료', desc: '퇴근길에도 선글라스 유지. 가능하면 그늘 쪽으로, 차 안에서는 창가 햇빛을 피하세요.' });
      events.push({ off: 0, cls: 'tl__row--light', icon: '🏠', t: c.arrive, title: '귀가', desc: '집에 들어가면 <b>암막 커튼</b>을 치고 조명은 최소로. 이 30분이 수면의 질을 결정합니다.' });
    } else {
      events.push({ off: 0, cls: '', icon: '🏁', t: c.END, title: '근무 종료', desc: '퇴근 후에도 밝은 빛을 유지하세요. 이 시간대 빛은 잠들 시각을 뒤로 미루지 않습니다.' });
      events.push({ off: 0, cls: 'tl__row--light', icon: '🏠', t: c.arrive, title: '귀가', desc: '귀가 후 1~2시간은 밝게 지내도 됩니다. 대신 잠들기 1시간 전부터 조명을 낮춥니다.' });
      events.push({ off: 0, cls: 'tl__row--light', icon: '🌙', t: c.dimLight, title: '조명 낮추기', desc: '잠들기 1시간 전. 큰 조명을 끄고 간접등만, 화면 밝기를 줄이고 가능하면 폰을 내려놓으세요.' });
    }
    events.push({ off: 0, cls: 'tl__row--sleep', icon: '😴', t: c.sleepStart, title: '수면 블록 시작', desc: durText(c.sleep) + ' 수면. 방은 18~20℃, 완전 암막, 폰은 다른 방에. 잠들기 1시간 전부터 화면을 끄세요.' });
    events.push({ off: 0, cls: 'tl__row--light', icon: '🌤️', t: c.wake, title: '기상 → 즉시 밝은 빛', desc: '일어나자마자 커튼 열고 10~15분 밝은 빛. 밤 근무에서 시계를 유지하려면 <b>기상 직후 빛</b>이 가장 강력합니다.' });
    events.push({ off: 0, cls: 'tl__row--food', icon: '🍳', t: c.firstMeal, title: '첫 식사 + 비타민D', desc: (c.wakeGap < 100 ? '출근 전이라 가볍게 — 단백질 25~30g와 함께. ' : '단백질 25~30g로 시작. ') + ' 비타민D는 지용성이라 이 식사와 함께. 1,000~2,000 IU가 일반적이며 혈중 25(OH)D를 확인하세요.' });
    events.push({ off: 0, cls: '', icon: '🚶', t: c.leaveHome, title: '출근 준비 완료', desc: '출근 전 10분 걷기나 스트레칭으로 체온을 올리면 야간 전반 각성이 좋아집니다.' });

    var normalized = events.map(function (e) {
      e.offN = ((e.t - c.start) % 1440 + 1440) % 1440;
      return e;
    }).sort(function (a, b) { return a.offN - b.offN; });

    var rowsHtml = normalized.map(function (e) {
      var abs = c.start + e.offN;
      var dayIdx = Math.floor(abs / 1440) > Math.floor(c.start / 1440) ? 1 : 0;
      return row(e.cls, e.icon, e.t, dayIdx, e.title, e.desc);
    }).join('');

    var verdictCls = c.short ? 'verdict--warn' : 'verdict--info';
    var verdictIcon = c.short ? '⚠️' : '🌙';
    var headline = '수면 ' + hm(c.sleepStart) + ' → ' + hm(c.wake);
    var sub = (c.nightEnd
      ? '퇴근·귀가 후 <b>' + durText(c.sleep) + '</b> 자고 ' + hm(c.wake) + '에 일어나는 일정입니다.'
      : '근무 전에 자는 일정입니다. ' + hm(c.sleepStart) + '에 자고 <b>' + durText(c.sleep) + '</b> 뒤 ' + hm(c.wake) + '에 일어나 출근 준비를 합니다.')
      + ' 카페인은 <b>' + hm(c.caffeine) + '</b>까지만, 마지막 식사는 <b>' + hm(c.lastMeal) + '</b>입니다.';
    if (c.short) {
      sub += ' 가용 시간이 짧아 목표(' + durText(c.target) + ')보다 <b>' + durText(c.target - c.sleep) + '</b> 부족합니다.';
    }

    var html = '';
    html += '<div class="verdict ' + verdictCls + '">' +
      '<span class="verdict__icon" aria-hidden="true">' + verdictIcon + '</span>' +
      '<div class="verdict__body">' +
        '<p class="verdict__kicker">' + hm(c.start) + '–' + hm(c.end) + ' 근무 · 빛·식사 시간표</p>' +
        '<p class="verdict__title">' + headline + '</p>' +
        '<p class="verdict__desc">' + sub + '</p>' +
      '</div>' +
    '</div>';

    html += '<div class="card">' +
      '<div class="card__head"><span class="card__icon" aria-hidden="true">📋</span><span class="card__title">24시간 타임라인</span><span class="card__note">근무 시작 기준</span></div>' +
      '<div class="tl">' + rowsHtml + '</div>' +
      '<button class="btn btn--sm btn--block mt-8" type="button" id="copyBtn">시간표 복사하기</button>' +
    '</div>';

    var rows = [
      ['근무 시간', durText(c.shiftLen)],
      ['수면 가용 창', durText(c.avail)],
      ['실제 수면', durText(c.sleep)],
      ['카페인 컷오프', hm(c.caffeine)],
      ['마지막 식사', hm(c.lastMeal)],
      ['첫 식사', hm(c.firstMeal)]
    ];
    html += '<div class="card">' +
      '<div class="card__head"><span class="card__icon" aria-hidden="true">📐</span><span class="card__title">한눈에 보는 수치</span></div>' +
      '<div class="kv">' + rows.map(function (r) {
        return '<div class="kv__row"><span class="kv__k">' + r[0] + '</span><span class="kv__v">' + r[1] + '</span></div>';
      }).join('') + '</div>' +
      (c.short
        ? '<p class="field__hint mt-8">수면이 <b>6시간 미만</b>입니다. 연속 야간이면 근무 전 <b>90분 낮잠</b>을 넣고, 근무표를 바꿀 수 있다면 연속 야간을 2~3일로 줄이세요.</p>'
        : '<p class="field__hint mt-8">수면 창이 충분합니다. 같은 시각에 자고 일어나는 것이 시간을 늘리는 것보다 중요합니다.</p>') +
    '</div>';

    html += '<div class="card" style="background:var(--accent-soft);border-color:color-mix(in srgb,var(--accent) 30%,var(--line))">' +
      '<div class="card__head"><span class="card__icon" aria-hidden="true">🔆</span><span class="card__title">빛 3단계만 기억하세요</span></div>' +
      '<div class="tips">' +
        '<div class="tip"><span class="tip__n">1</span><span class="tip__text"><b>근무 중엔 밝게.</b> 작업 조명을 충분히, 졸리면 찬물 세수와 스트레칭.</span></div>' +
        (c.nightEnd
          ? '<div class="tip"><span class="tip__n">2</span><span class="tip__text"><b>' + hm(c.glasses) + '부터 어둡게.</b> 선글라스로 아침 빛을 차단하고 귀가 후 암막.</span></div>'
          : '<div class="tip"><span class="tip__n">2</span><span class="tip__text"><b>' + hm(c.dimLight) + '부터 어둡게.</b> 조명을 낮추고 화면을 줄여 잠들 시각을 앞당깁니다.</span></div>') +
        '<div class="tip"><span class="tip__n">3</span><span class="tip__text"><b>' + hm(c.wake) + '엔 밝게.</b> 기상 직후 10~15분 빛이 야간 리듬을 유지시킵니다.</span></div>' +
      '</div>' +
    '</div>';

    html += '<p class="disclaimer"><b>참고용 안내</b> — 이 시간표는 평균적인 카페인 반감기와 빛 노출 원칙으로 계산한 참고값입니다. 복용 중인 약(특히 혈압약·수면제)이나 질환에 따라 달라질 수 있으니, 근무 중 졸림이 심하면 직업환경의학과·수면클리닉과 상의하세요.</p>';

    resultEl.innerHTML = '<div class="result reveal">' + html + '</div>';
    var copyBtn = $('copyBtn');
    if (copyBtn) copyBtn.addEventListener('click', function () { copy(c); });

    if (scroll && window.innerWidth < 980) {
      var top = resultEl.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
  }

  function buildText(c) {
    var L = [];
    L.push('[교대근무 시간표] ' + hm(c.start) + '–' + hm(c.end) + ' 근무');
    L.push('· 수면 블록: ' + hm(c.sleepStart) + ' → ' + hm(c.wake) + ' (' + durText(c.sleep) + ')');
    if (c.nightEnd) L.push('· 퇴근 30분 전(' + hm(c.glasses) + ')부터 선글라스, 귀가 후 암막');
    else L.push('· ' + hm(c.dimLight) + '부터 조명 낮추기(잠들기 1시간 전)');
    L.push('· 기상 직후 밝은 빛 10~15분');
    L.push('· 첫 식사 + 비타민D: ' + hm(c.firstMeal));
    L.push('· 카페인 컷오프: ' + hm(c.caffeine));
    L.push('· 마지막 식사: ' + hm(c.lastMeal) + ' (가볍게)');
    L.push('', '팩트체크 건강연구소 교대근무 시간표 https://hjh7085-bit.github.io/shift-rhythm/');
    return L.join('\n');
  }

  function copy(c) {
    var text = buildText(c);
    function fb() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('시간표를 복사했어요'); } catch (e) { toast('복사가 막혀 있어요'); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('시간표를 복사했어요'); }, fb);
    } else fb();
  }

  /* ---------- 프리셋 ---------- */
  var PRESETS = {
    night: ['22:00', '07:00'],
    evening: ['15:00', '23:00'],
    dawn: ['06:00', '14:00'],
    long: ['07:00', '19:00']
  };
  document.querySelectorAll('#presetSeg [data-preset]').forEach(function (b) {
    b.addEventListener('click', function () {
      var key = b.getAttribute('data-preset');
      state.preset = key;
      $('startTime').value = PRESETS[key][0];
      $('endTime').value = PRESETS[key][1];
      document.querySelectorAll('#presetSeg .seg__btn').forEach(function (x) {
        var on = x === b;
        x.classList.toggle('is-on', on);
        x.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      syncSpan();
      save();
      render(false);
    });
  });

  document.querySelectorAll('#mealChips [data-meal]').forEach(function (b) {
    b.addEventListener('click', function () {
      state.meal = b.getAttribute('data-meal');
      document.querySelectorAll('#mealChips .preset').forEach(function (x) { x.classList.toggle('is-on', x === b); });
      save();
      render(false);
    });
  });

  ['startTime', 'endTime', 'commute', 'sleepLen'].forEach(function (id) {
    var el = $(id);
    if (el) el.addEventListener('input', function () { syncSpan(); save(); render(false); });
    if (el) el.addEventListener('change', function () { syncSpan(); save(); render(false); });
  });

  function syncSpan() {
    var s = parseHM($('startTime').value), e = parseHM($('endTime').value);
    var hint = $('spanHint');
    if (s == null || e == null) { if (hint) hint.textContent = '시작·종료 시각을 넣어주세요.'; return; }
    var len = wrap(e - s) || 1440;
    var cross = e < s;
    if (hint) hint.innerHTML = '총 근무 <b>' + durText(len) + '</b>' + (cross ? ' · 자정을 넘어 다음 날 종료로 계산합니다.' : ' · 같은 날 종료로 계산합니다.');
  }

  var calcBar = $('calcBar');
  if (calcBar) calcBar.addEventListener('click', function () { render(true); });

  /* ---------- 초기화 ---------- */
  load();
  if (!$('startTime').value) $('startTime').value = '22:00';
  if (!$('endTime').value) $('endTime').value = '07:00';
  document.querySelectorAll('#mealChips .preset').forEach(function (x) {
    x.classList.toggle('is-on', x.getAttribute('data-meal') === state.meal);
  });
  syncSpan();
  render(false);
})();
