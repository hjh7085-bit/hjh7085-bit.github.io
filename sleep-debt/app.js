/* ==========================================================================
   팩트체크 건강연구소 · 수면부채·자율신경 피로도 진단기
   부채 = (필요 − 평일)×5 + (필요 − 주말)×2 + 야근 가산(1회 3시간), 2주 누적 = 주 × 2
   ⚠️ 자기보고 평균 기반 추정치. 수면무호흡·불면증은 별도 진료 영역.
   ========================================================================== */

(function () {
  "use strict";

  var OPTS = [
    { id: "sleepy", emoji: "🥱", name: "낮에 참을 수 없이 졸리다", sub: "회의·식후 졸음", score: 4 },
    { id: "driving", emoji: "🚗", name: "운전 중 졸음이 온 적 있다", sub: "가장 위험한 신호", score: 6 },
    { id: "headache", emoji: "🤕", name: "아침에 두통·입마름이 있다", sub: "수면호흡 문제 의심", score: 3 },
    { id: "snore", emoji: "😴", name: "코골이를 지적받는다", sub: "배우자·가족 지적", score: 3 },
    { id: "rls", emoji: "🦵", name: "밤에 다리가 저리거나 근질근질", sub: "하지불안 의심", score: 4 },
    { id: "brux", emoji: "😬", name: "이갈이·이 악물기가 있다", sub: "수면의 질 저하", score: 2 }
  ];

  var NIGHT_ADD = [0, 1, 3, 7];      // 야근 빈도별 주당 가산 시간
  var LAT = [0, 6, 12];              // 입면 시간 점수
  var WAKEUP = [0, 5, 10];           // 야간 각성 점수
  var FRESH = [0, 5, 10, 15];        // 기상 후 피로감 점수
  var NIGHT = [0, 3, 6, 9];          // 야근 점수
  var CAFF_MAX = 10;

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : null; }
  function fmt(n) { return Math.round(n).toLocaleString("ko-KR"); }
  function fmt1(n) { return (Math.round(n * 10) / 10).toLocaleString("ko-KR"); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function hhmm(mins) {
    var m = ((Math.round(mins) % 1440) + 1440) % 1440;
    var h = Math.floor(m / 60), mm = m % 60;
    return (h < 10 ? "0" : "") + h + ":" + (mm < 10 ? "0" : "") + mm;
  }
  function parseTime(s) {
    if (!s || s.indexOf(":") < 0) return null;
    var p = s.split(":");
    return (+p[0]) * 60 + (+p[1]);
  }

  var state = {
    wd: null, we: null, need: 7.5, wake: "07:00",
    night: 1, lat: 0, wakeN: 0, fresh: 1,
    caffeine: 2, lastCup: "15:00", opts: {}
  };
  var timer = null;
  var last = null;

  function initTheme() {
    var btn = $("#themeToggle");
    var saved = null;
    try { saved = localStorage.getItem("fcl-theme"); } catch (e) {}
    var theme = saved || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    function paint(t) {
      btn.setAttribute("aria-pressed", t === "dark" ? "true" : "false");
      btn.setAttribute("aria-label", t === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환");
    }
    paint(theme);
    btn.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      paint(next);
      try { localStorage.setItem("fcl-theme", next); } catch (e) {}
    });
  }

  function compute() {
    if (state.wd === null) return null;
    var wd = state.wd;
    var we = state.we === null ? wd + 1.5 : state.we;
    var need = state.need;
    var optScore = 0;
    OPTS.forEach(function (o) { if (state.opts[o.id]) optScore += o.score; });

    var wdDef = Math.max(0, need - wd) * 5;
    var weDef = Math.max(0, need - we) * 2;
    var nightAdd = NIGHT_ADD[state.night];
    var weekly = wdDef + weDef + nightAdd;
    var twoWeek = weekly * 2;
    var avgSleep = (wd * 5 + we * 2) / 7;

    var debtScore = Math.min(40, twoWeek / 20 * 40);
    var score = Math.min(100, Math.round(debtScore + LAT[state.lat] + WAKEUP[state.wakeN] + FRESH[state.fresh] +
      Math.min(CAFF_MAX, state.caffeine * 2.5) + NIGHT[state.night] + Math.min(12, optScore)));

    var wakeMin = parseTime(state.wake) || 420;
    var bedtime = wakeMin - (need * 60 + 15);
    var weekendWake = wakeMin + 60;
    var cutoff = bedtime - 8 * 60;

    return {
      wd: wd, we: we, need: need, wdDef: wdDef, weDef: weDef, nightAdd: nightAdd,
      weekly: weekly, twoWeek: twoWeek, avgSleep: avgSleep, score: score,
      wakeMin: wakeMin, bedtime: bedtime, weekendWake: weekendWake, cutoff: cutoff,
      recoverDays: twoWeek <= 0 ? 0 : Math.ceil(twoWeek / 1),
      optScore: optScore
    };
  }

  function bandOf(r) {
    if (r.twoWeek < 3) return { cls: "green", label: "안정", badge: "🟢 수면부채 거의 없음", title: "지금 리듬이 잘 유지되고 있어요" };
    if (r.twoWeek < 8) return { cls: "amber", label: "주의", badge: "🟡 가벼운 수면부채", title: "2주에 " + fmt1(r.twoWeek) + "시간, 주중에 조금씩 밀렸어요" };
    if (r.twoWeek < 14) return { cls: "amber", label: "누적", badge: "🟡 누적된 수면부채", title: "2주에 " + fmt1(r.twoWeek) + "시간 — 밤샘 하루치가 쌓였습니다" };
    return { cls: "red", label: "위험", badge: "🔴 심한 수면부채", title: "2주에 " + fmt1(r.twoWeek) + "시간 — 밤샘 1~2일과 같은 상태" };
  }

  function scoreBand(s) {
    if (s < 30) return { cls: "green", label: "안정" };
    if (s < 60) return { cls: "amber", label: "주의" };
    return { cls: "red", label: "위험" };
  }

  function analyze(scroll) {
    var r = compute();
    if (!r) {
      $("#countText").textContent = "평일 수면시간을 넣으면 자동 계산";
      if (!$("#result").hidden) { $("#result").hidden = true; last = null; }
      return;
    }
    var b = bandOf(r);
    var sb = scoreBand(r.score);

    $("#resultSub").innerHTML = "필요 수면 <b>" + fmt1(r.need) + "시간</b> 기준으로 계산했습니다. 평일 " + fmt1(r.wd) +
      "시간 · 주말 " + fmt1(r.we) + "시간 · 야근 가산 " + fmt1(r.nightAdd) + "시간/주.";

    $("#verdictBox").innerHTML =
      '<div class="verdict verdict--' + b.cls + '">' +
      '<span class="verdict__badge">' + b.badge + "</span>" +
      '<div class="verdict__title">' + b.title + "</div>" +
      '<div class="verdict__desc">자율신경 피로도 <b>' + sb.label + "(" + r.score + "/100)</b> · 갚는 데 최소 <b>" + r.recoverDays +
      "일</b>이 걸립니다. " + (r.optScore >= 6 ? "낮 졸음·운전 졸음 같은 증상은 <b>수면의 질</b> 문제일 수 있어요." : "오늘부터 취침을 30분 앞당겨 보세요.") + "</div></div>";

    $("#summaryBox").innerHTML = [
      { label: "2주 누적 부채", num: fmt1(r.twoWeek), unit: "시간", cls: b.cls },
      { label: "하루 평균 부족", num: fmt(r.twoWeek / 14 * 60), unit: "분", cls: b.cls },
      { label: "갚는 데", num: r.recoverDays === 0 ? "0" : String(r.recoverDays), unit: "일", cls: "amber" },
      { label: "피로도", num: String(r.score), unit: "/100", cls: sb.cls }
    ].map(function (c) {
      return '<div class="summary__card summary__card--' + c.cls + '"><span class="summary__label">' + c.label + "</span>" +
        '<span class="summary__num">' + c.num + "<small>" + c.unit + "</small></span></div>";
    }).join("");

    /* 미터 */
    var SCALE = 28;
    var pct = Math.min(100, r.twoWeek / SCALE * 100);
    $("#debtMeter").innerHTML =
      '<div class="meter">' +
      '<div class="meter__head"><span class="meter__title">2주 누적 수면부채<small>' + b.label + " · 밤샘 1일 ≈ 8시간</small></span>" +
      '<span class="meter__value">' + fmt1(r.twoWeek) + "<small>시간</small></span></div>" +
      '<div class="meter__track"><div class="meter__fill">' +
      '<span class="meter__seg meter__seg--ok" style="width:11%"></span>' +
      '<span class="meter__seg meter__seg--mid" style="width:39%"></span>' +
      '<span class="meter__seg meter__seg--high" style="width:50%"></span>' +
      "</div>" +
      '<span class="meter__mark" style="left:' + pct.toFixed(1) + '%" data-label="' + fmt1(r.twoWeek) + 'h"></span></div>' +
      '<div class="meter__scale"><span>0</span><span>3시간</span><span>14시간</span><span>28시간+</span></div></div>';

    /* 표 */
    $("#debtBody").innerHTML = [
      ["평일 5일", fmt1(r.wd) + "시간", fmt1(r.need) + "시간", (r.wdDef > 0 ? "+" + fmt1(r.wdDef) : "0") + "시간"],
      ["주말 2일", fmt1(r.we) + "시간", fmt1(r.need) + "시간", (r.weDef > 0 ? "+" + fmt1(r.weDef) : "0") + "시간"],
      ["야근·철야 가산", "—", "—", "+" + fmt1(r.nightAdd) + "시간"],
      ["1주 합계", fmt1(r.avgSleep) + "시간(평균)", fmt1(r.need) + "시간", fmt1(r.weekly) + "시간"],
      ["2주 누적", "—", "—", "<b>" + fmt1(r.twoWeek) + "시간</b>"]
    ].map(function (row) {
      return "<tr>" + row.map(function (c, i) { return "<t" + (i === 0 ? "h" : "d") + " scope=\"row\">" + c + "</t" + (i === 0 ? "h" : "d") + ">"; }).join("") + "</tr>";
    }).join("");

    /* 회복 지표 */
    $("#planMetrics").innerHTML = [
      { l: "목표 취침", v: hhmm(r.bedtime), s: "입면 15분 포함", accent: true },
      { l: "기상 유지", v: hhmm(r.wakeMin), s: "평일 그대로" },
      { l: "주말 기상 상한", v: hhmm(r.weekendWake), s: "평일 +1시간" },
      { l: "낮잠", v: "20분", s: "오후 3시 이전" }
    ].map(function (m) {
      return '<div class="metric' + (m.accent ? " metric--accent" : "") + '"><span class="metric__label">' + m.l + "</span>" +
        '<div class="metric__value">' + m.v + "</div><div class=\"metric__sub\">" + m.s + "</div></div>";
    }).join("");

    /* 4주 플랜 */
    var steps = [
      { t: "1주차 · 30분 앞당기기", b: "취침 <b>" + hhmm(r.bedtime - 30) + "</b> → 2주 뒤 취침 <b>" + hhmm(r.bedtime) + "</b>. 한 번에 1시간 이상 당기면 잠이 안 와서 실패합니다.", now: "오늘 밤부터" },
      { t: "2주차 · 취침 고정 + 아침 햇빛", b: "기상 후 <b>30분 안에 햇빛 10분</b>. 아침 빛은 생체시계를 앞당겨 밤에 잠이 오게 만듭니다(저녁 빛·폰은 반대).", now: "매일 아침" },
      { t: "3주차 · 주말 늦잠 줄이기", b: "토·일 기상은 <b>" + hhmm(r.weekendWake) + "까지</b>. 부족하면 낮잠 20분으로 채우세요. 주말 늦잠은 월요일 피로를 키웁니다.", now: "이번 주말" },
      { t: "4주차 · 리듬 고정", b: "주중·주말 기상 시각 차이를 <b>1시간 이내</b>로 유지. 이때 부채의 대부분이 갚힙니다(" + r.recoverDays + "일 계획).", now: "4주간" }
    ];
    $("#planList").innerHTML = steps.map(function (s, i) {
      return '<div class="plan__item"><span class="plan__num">' + (i + 1) + "</span><div>" +
        '<div class="plan__title">' + s.t + "</div>" +
        '<div class="plan__body">' + s.b + ' <span class="plan__now">' + s.now + "</span></div></div></div>";
    }).join("");

    /* 타임라인 */
    var lastCupMin = parseTime(state.lastCup);
    var overCut = lastCupMin !== null && lastCupMin > r.cutoff;
    $("#timeSlots").innerHTML = [
      { label: "카페인 컷오프", clock: hhmm(r.cutoff), items: ["마지막 커피·에너지드링크", "녹차·콜라·초콜릿도 포함"] },
      { label: "저녁 빛 줄이기", clock: hhmm(r.bedtime - 90), items: ["조명 낮추기", "폰·모니터 밝기↓"] },
      { label: "목표 취침", clock: hhmm(r.bedtime), items: ["입면 15분 포함", "침실 18~20℃"] },
      { label: "기상", clock: hhmm(r.wakeMin), items: ["알람 1회만", "일어나서 햇빛 10분"] }
    ].map(function (s) {
      return '<div class="slot"><div class="slot__time"><span class="slot__label">' + s.label + '</span><span class="slot__clock">' + s.clock + "</span></div>" +
        '<div class="slot__items">' + s.items.map(function (i) { return '<span class="pill">' + i + "</span>"; }).join("") + "</div></div>";
    }).join("");

    /* 카페인 */
    var diffH = lastCupMin === null ? null : (r.cutoff - lastCupMin) / 60;
    $("#caffeineMetrics").innerHTML = [
      { l: "권장 컷오프", v: hhmm(r.cutoff), s: "취침 8시간 전", accent: true },
      { l: "마지막 섭취", v: lastCupMin === null ? "—" : hhmm(lastCupMin), s: overCut ? "권장보다 늦음" : "권장 범위" },
      { l: "하루 카페인", v: state.caffeine + "잔", s: "약 " + fmt(state.caffeine * 120) + "mg" }
    ].map(function (m) {
      return '<div class="metric' + (m.accent ? " metric--accent" : "") + '"><span class="metric__label">' + m.l + "</span>" +
        '<div class="metric__value">' + m.v + "</div><div class=\"metric__sub\">" + m.s + "</div></div>";
    }).join("");

    $("#caffeineTip").innerHTML = overCut
      ? "마지막 커피가 권장 컷오프보다 <b>" + fmt1(Math.abs(diffH)) + "시간 늦습니다</b>. 오늘부터 컷오프(" + hhmm(r.cutoff) + ") 이후엔 <b>디카페인·보리차</b>로 바꿔 보세요. 잠들기까지 걸리는 시간이 줄어듭니다."
      : "마지막 커피가 권장 컷오프 안에 있습니다. 카페인은 <b>잠드는 시간</b>보다 <b>깊은 수면</b>을 먼저 줄이니, 양도 하루 2잔 이내로 유지해 보세요.";

    last = { r: r, b: b, sb: sb, overCut: overCut, diffH: diffH };
    if (!$("#result").hidden) return;
    $("#result").hidden = false;
    if (scroll) $("#result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateCount() {
    $("#countText").textContent = state.wd !== null ? "계산할 수 있어요" : "평일 수면시간을 넣으면 자동 계산";
    var n = Object.keys(state.opts).length;
    $("#countHint").textContent = n ? "증상 " + n + "개 반영" : (state.we === null ? "주말 수면시간까지 넣으면 더 정확합니다" : "필요 수면량을 바꿔도 됩니다");
  }

  function schedule_() {
    clearTimeout(timer);
    timer = setTimeout(function () { analyze(false); }, 220);
  }

  function toast(msg) {
    var el = document.createElement("div");
    el.className = "toast"; el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.style.opacity = "1"; el.style.transform = "translate(-50%, 0)"; });
    setTimeout(function () { el.style.opacity = "0"; setTimeout(function () { el.remove(); }, 300); }, 1800);
  }

  function copyResult() {
    if (!last) return;
    var r = last.r, b = last.b;
    var text = "【수면부채 진단】\n" +
      "2주 누적 부채: " + fmt1(r.twoWeek) + "시간 (하루 평균 " + fmt(r.twoWeek / 14 * 60) + "분 부족)\n" +
      "자율신경 피로도: " + r.score + "/100 (" + last.sb.label + ")\n" +
      "목표 취침 " + hhmm(r.bedtime) + " · 기상 " + hhmm(r.wakeMin) + " · 카페인 컷오프 " + hhmm(r.cutoff) + "\n" +
      "갚는 데 최소 " + r.recoverDays + "일 (하루 1시간 기준)";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("결과를 복사했어요"); }, function () { toast("복사에 실패했어요"); });
    } else toast("복사가 지원되지 않는 브라우저예요");
  }

  function init() {
    initTheme();

    $("#optList").innerHTML = OPTS.map(function (o) {
      return '<label class="item"><input type="checkbox" data-opt="' + o.id + '" aria-label="' + esc(o.name) + '">' +
        '<span class="item__box" aria-hidden="true"></span>' +
        '<span class="item__text"><span class="item__name">' + o.emoji + " " + esc(o.name) + "</span>" +
        '<span class="item__sub">' + esc(o.sub) + "</span></span></label>";
    }).join("");

    $("#weekday").addEventListener("input", function (e) { state.wd = num(e.target.value); $$(".preset").forEach(function (b) { b.classList.remove("is-active"); }); updateCount(); schedule_(); });
    $("#weekend").addEventListener("input", function (e) { state.we = num(e.target.value); updateCount(); schedule_(); });
    $("#wake").addEventListener("input", function (e) { state.wake = e.target.value || "07:00"; schedule_(); });
    $("#lastCup").addEventListener("input", function (e) { state.lastCup = e.target.value; schedule_(); });
    $("#caffeine").addEventListener("input", function (e) { state.caffeine = Math.max(0, num(e.target.value) || 0); schedule_(); });

    $$("#optList input").forEach(function (el) {
      el.addEventListener("change", function () {
        if (el.checked) state.opts[el.dataset.opt] = true; else delete state.opts[el.dataset.opt];
        updateCount(); schedule_();
      });
    });

    [["#needSeg", "need"], ["#nightSeg", "night"], ["#latSeg", "lat"], ["#wakeSeg", "wakeN"], ["#freshSeg", "fresh"]].forEach(function (pair) {
      $$(pair[0] + " .seg__btn").forEach(function (b) {
        b.addEventListener("click", function () {
          $$(pair[0] + " .seg__btn").forEach(function (x) { x.classList.remove("is-on"); x.setAttribute("aria-pressed", "false"); });
          b.classList.add("is-on"); b.setAttribute("aria-pressed", "true");
          state[pair[1]] = parseFloat(b.dataset.v);
          updateCount(); schedule_();
        });
      });
    });

    $$(".preset").forEach(function (b) {
      b.addEventListener("click", function () {
        state.wd = parseFloat(b.dataset.wd);
        $("#weekday").value = b.dataset.wd;
        if (state.we === null) { state.we = state.wd + 1.5; $("#weekend").value = String(state.wd + 1.5); }
        $$(".preset").forEach(function (x) { x.classList.remove("is-active"); });
        b.classList.add("is-active");
        updateCount(); analyze(false);
      });
    });

    $("#analyzeBtn").addEventListener("click", function () { analyze(true); });
    $("#resetBtn").addEventListener("click", function () {
      state = { wd: null, we: null, need: 7.5, wake: "07:00", night: 1, lat: 0, wakeN: 0, fresh: 1, caffeine: 2, lastCup: "15:00", opts: {} };
      $("#weekday").value = ""; $("#weekend").value = ""; $("#wake").value = "07:00";
      $("#caffeine").value = "2"; $("#lastCup").value = "15:00";
      $$("#optList input").forEach(function (el) { el.checked = false; });
      [["#needSeg", 1], ["#nightSeg", 1], ["#latSeg", 0], ["#wakeSeg", 0], ["#freshSeg", 1]].forEach(function (p) {
        $$(p[0] + " .seg__btn").forEach(function (x, i) { x.classList.toggle("is-on", i === p[1]); x.setAttribute("aria-pressed", i === p[1] ? "true" : "false"); });
      });
      $$(".preset").forEach(function (x) { x.classList.remove("is-active"); });
      $("#result").hidden = true; last = null;
      updateCount();
      $("#checker").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $("#copyBtn").addEventListener("click", copyResult);
    $("#editBtn").addEventListener("click", function () { $("#checker").scrollIntoView({ behavior: "smooth", block: "start" }); });

    var y = $("#year");
    if (y) y.textContent = String(new Date().getFullYear());
    updateCount();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
