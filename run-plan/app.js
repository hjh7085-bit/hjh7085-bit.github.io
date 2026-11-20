/* ==========================================================================
   팩트체크 건강연구소 · 체중별 무릎 안 상하는 첫 러닝 4주 플랜기
   플랜: 런-워크 인터벌(주 3회) · 주당 증가 10% 이내 · 워밍업/쿨다운 5분 별도
   ⚠️ 통증이 기준. BMI·무릎 통증에 따라 시작 단계를 자동 하향.
   ========================================================================== */

(function () {
  "use strict";

  var PLANS = [
    {
      name: "걷기 우선 · 관절 적응", short: "걷기 중심", tone: "green",
      desc: "1회 30분은 고정하고 <b>조깅 비율만</b> 올립니다. 무릎에 실리는 하중이 가장 적은 단계예요.",
      weeks: [
        { jog: 0.5, walk: 2, reps: 8, note: "30초 조깅 · 몸을 먼저 데우기" },
        { jog: 1, walk: 2, reps: 7, note: "1분 조깅 · 대화 가능 속도" },
        { jog: 1, walk: 1.5, reps: 8, note: "걷기 구간을 줄여 밀도↑" },
        { jog: 1.5, walk: 1.5, reps: 7, note: "1분 30초 조깅" }
      ]
    },
    {
      name: "런-워크 입문", short: "런-워크", tone: "amber",
      desc: "시간은 그대로 두고 <b>조깅 구간</b>을 늘려갑니다. 걷기 구간이 회복을 만들어 총 부담은 크게 늘지 않아요.",
      weeks: [
        { jog: 1, walk: 1.5, reps: 8, note: "가장 흔한 시작점" },
        { jog: 1.5, walk: 1.5, reps: 7, note: "호흡이 조금씩 편해짐" },
        { jog: 2, walk: 1.5, reps: 6, note: "종아리가 아플 수 있음" },
        { jog: 3, walk: 1.5, reps: 5, note: "3분 연속이면 30분 완주가 보임" }
      ]
    },
    {
      name: "인터벌 확장", short: "인터벌", tone: "amber",
      desc: "걷기 기반이 있는 경우. 조깅 3~7분 구간으로 올려 <b>30분 연속</b>에 가까워집니다.",
      weeks: [
        { jog: 3, walk: 1, reps: 5, note: "걷기 1분으로 회복" },
        { jog: 4, walk: 1, reps: 5, note: "심폐가 먼저 힘들어짐" },
        { jog: 5, walk: 1, reps: 4, note: "속도보다 지속" },
        { jog: 7, walk: 1, reps: 3, note: "30분 연속 직전" }
      ]
    },
    {
      name: "5km 준비", short: "5K", tone: "red",
      desc: "경험자용. 조깅 지속 시간을 늘려 <b>30분 연속</b>과 5km 완주를 목표로 합니다.",
      weeks: [
        { jog: 10, walk: 2, reps: 2, note: "주 3회 유지" },
        { jog: 12, walk: 2, reps: 2, note: "중간 지점 통증 체크" },
        { jog: 15, walk: 1, reps: 2, note: "연속 15분 ×2" },
        { jog: 25, walk: 0, reps: 1, note: "25분 연속 완주" }
      ]
    }
  ];

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : null; }
  function fmt(n) { return Math.round(n).toLocaleString("ko-KR"); }
  function fmt1(n) { return (Math.round(n * 10) / 10).toLocaleString("ko-KR"); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function mins(m) {
    if (m < 1) return Math.round(m * 60) + "초";
    var whole = Math.floor(m), rest = Math.round((m - whole) * 60);
    return rest ? whole + "분 " + rest + "초" : whole + "분";
  }

  var state = { weight: null, height: null, walk: 1, exp: 0, knee: 0, goal: 0 };
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
    if (state.weight === null) return null;
    var w = state.weight;
    var bmi = state.height ? w / Math.pow(state.height / 100, 2) : null;
    var score = state.walk + state.exp * 1.5 - state.knee * 2.5;
    if (bmi !== null) {
      if (bmi >= 35) score -= 3;
      else if (bmi >= 30) score -= 2;
      else if (bmi >= 25) score -= 1;
    }
    var lv = score < 0 ? 0 : score < 2 ? 1 : score < 3.5 ? 2 : 3;
    if (state.knee === 2) lv = 0;
    if (state.goal === 2 && state.exp >= 1 && state.knee === 0) lv = Math.max(lv, 2);
    if (state.goal === 1 && state.knee === 0) lv = Math.max(lv, 1);

    var plan = PLANS[lv];
    var weeks = plan.weeks.map(function (wk) {
      var work = (wk.jog + wk.walk) * wk.reps;
      return {
        jog: wk.jog, walk: wk.walk, reps: wk.reps, note: wk.note,
        work: work,
        total: work + 10,
        weekJog: wk.jog * wk.reps * 3
      };
    });
    var lastJog = weeks[3].weekJog;
    var loadPerStep = w * 2.75;

    return { w: w, bmi: bmi, lv: lv, plan: plan, weeks: weeks, loadPerStep: loadPerStep, lastJog: lastJog, score: score };
  }

  function analyze(scroll) {
    var r = compute();
    if (!r) {
      $("#countText").textContent = "체중을 넣으면 자동 계산";
      if (!$("#result").hidden) { $("#result").hidden = true; last = null; }
      return;
    }

    var tone = state.knee === 2 ? "red" : r.plan.tone;
    var badge = state.knee === 2 ? "🔴 걷기·진료 우선" : "🟢 " + r.plan.short + " 단계";
    var title = state.knee === 2 ? "지금은 뛰기보다 걷기와 진료가 먼저입니다" : r.plan.name + "으로 시작하세요";
    var desc = "";

    if (state.knee === 2) {
      desc = "일상 동작에서도 무릎이 아프다면 <b>달리기는 시작하지 마세요</b>. 아래 4주 플랜은 30초 조깅 수준으로 낮춰 두었지만, 먼저 정형외과에서 원인(연골·반월상연골·힘줄)을 확인하는 게 순서입니다. 수영·실내자전거·물속 걷기로 심폐를 유지하는 동안 무릎 주변 근력을 올리세요.";
    } else if (state.knee === 1) {
      desc = "계단·오래 걸을 때 통증이 있다면 <b>뛰는 시간을 최소로</b> 시작합니다. 첫 2주는 통증이 2점(10점 기준) 이하일 때만 진행하고, 통증이 남으면 같은 주차를 한 번 더 반복하세요.";
    } else if (r.bmi !== null) {
      desc = "BMI <b>" + fmt1(r.bmi) + "</b> 기준으로 시작 단계를 정했습니다. 지금 체중이면 한 발에 무릎에 약 <b>" + fmt(r.loadPerStep) + "kg</b>이 실립니다(체중의 2.75배).";
    } else {
      desc = "체중 <b>" + fmt1(r.w) + "kg</b> 기준으로 시작 단계를 정했습니다. 한 발 착지마다 무릎에 약 <b>" + fmt(r.loadPerStep) + "kg</b>이 실립니다.";
    }
    $("#resultSub").innerHTML = desc;

    $("#verdictBox").innerHTML =
      '<div class="verdict verdict--' + tone + '">' +
      '<span class="verdict__badge">' + badge + "</span>" +
      '<div class="verdict__title">' + title + "</div>" +
      '<div class="verdict__desc">' + r.plan.desc + "</div></div>";

    /* 요약 */
    var w4 = r.weeks[3];
    $("#summaryBox").innerHTML = [
      { label: "4주차 1회", num: String(w4.total), unit: "분", cls: "green" },
      { label: "주 조깅(4주차)", num: String(Math.round(r.lastJog)), unit: "분", cls: "amber" },
      { label: "발당 하중", num: fmt(r.loadPerStep), unit: "kg", cls: "red" }
    ].map(function (c) {
      return '<div class="summary__card summary__card--' + c.cls + '"><span class="summary__label">' + c.label + "</span>" +
        '<span class="summary__num">' + c.num + "<small>" + c.unit + "</small></span></div>";
    }).join("");

    /* 표 */
    $("#planBody").innerHTML = r.weeks.map(function (wk, i) {
      var ratio = wk.walk === 0 ? "연속 " + mins(wk.jog) : mins(wk.jog) + " ↔ " + mins(wk.walk) + " ×" + wk.reps;
      var share = Math.round(wk.jog / (wk.jog + wk.walk) * 100);
      return "<tr><th scope=\"row\">" + (i + 1) + "주차</th><td>" + ratio + "</td><td>" +
        wk.total + "분</td><td>" + Math.round(wk.weekJog) + "분 <span class=\"muted\">(" + share + "%)</span></td></tr>";
    }).join("");

    $("#planHint").innerHTML = "1회 시간은 <b>인터벌 " + r.weeks[0].work + "분 + 워밍업·쿨다운 10분</b> 기준입니다. " +
      "총 시간은 4주 내내 <b>30분 안팎으로 고정</b>하고 조깅 비율만 올리는 방식이라, 관절 부담이 갑자기 늘지 않아요. " +
      "(괄호는 조깅 비중) " + (state.knee > 0 ? "통증이 있으면 <b>같은 주차를 반복</b>하세요." : "한 주를 통째로 건너뛰지 마세요.");

    /* 이번 주 세션 */
    var w1 = r.weeks[0];
    var interval = w1.walk === 0 ? "조깅 " + mins(w1.jog) : "조깅 " + mins(w1.jog) + " → 걷기 " + mins(w1.walk);
    $("#sessionList").innerHTML = [
      { label: "월 · 워밍업", clock: "5분", items: ["빠르게 걷기", "발목·무릎 돌리기", "한 발 균형 30초"] },
      { label: "월 · 본운동", clock: interval + " ×" + w1.reps, items: [interval, "대화 가능한 속도", "케이던스 170"] },
      { label: "월 · 쿨다운", clock: "5분", items: ["천천히 걷기", "종아리·대퇴 스트레칭"] },
      { label: "수 · 금", clock: "같은 세션", items: ["본운동 반복", "사이 날은 걷기 20분"] },
      { label: "화 · 목", clock: "근력 10분", items: ["스쿼트 10×2", "힙 브릿지 12×2", "한 발 계단 오르기"] }
    ].map(function (s) {
      return '<div class="slot"><div class="slot__time"><span class="slot__label">' + s.label + '</span><span class="slot__clock">' + esc(s.clock) + "</span></div>" +
        '<div class="slot__items">' + s.items.map(function (i) { return '<span class="pill">' + esc(i) + "</span>"; }).join("") + "</div></div>";
    }).join("");

    /* 하중 */
    $("#loadMetrics").innerHTML = [
      { l: "달리기 (한 발)", v: fmt(r.w * 2.75) + "<small>kg</small>", s: "체중 × 2.75", accent: true },
      { l: "빠르게 걷기", v: fmt(r.w * 1.4) + "<small>kg</small>", s: "체중 × 1.4" },
      { l: "계단 내려가기", v: fmt(r.w * 5) + "<small>kg</small>", s: "체중 × 5" },
      { l: "1kg 감량 시", v: "−" + fmt(2.75) + "<small>kg</small>", s: "한 발당 부담 감소" }
    ].map(function (m) {
      return '<div class="metric' + (m.accent ? " metric--accent" : "") + '"><span class="metric__label">' + m.l + "</span>" +
        '<div class="metric__value">' + m.v + '</div><div class="metric__sub">' + m.s + "</div></div>";
    }).join("");

    /* 무릎 지키기 */
    var prot = [
      { t: "워밍업 5분은 생략 금지", b: "관절액이 돌고 근육 온도가 올라야 충격을 흡수합니다. <b>빠르게 걷기 5분</b>이면 충분해요.", now: "매 세션" },
      { t: "케이던스 170, 보폭은 짧게", b: "발을 몸 앞으로 뻗으면 무릎에 제동 부하가 걸립니다. <b>분당 165~175걸음</b>으로 종종걸음처럼.", now: "뛰는 동안" },
      { t: "대퇴사두근·둔근 주 2회", b: "무릎을 지지하는 근육이 부족하면 연골이 충격을 다 받습니다. 스쿼트·힙브릿지·한 발 계단 오르기 10분.", now: "화·목" },
      { t: "평지·트랙·흙길부터", b: "내리막은 무릎 하중이 커집니다. 첫 4주는 <b>평지</b>에서, 내리막은 걸어서 내려오세요.", now: "4주간" },
      { t: "신발은 600~800km에서 교체", b: "쿠션이 죽은 신발은 충격을 그대로 전달합니다. 오래된 운동화는 이 플랜의 가장 흔한 실패 원인.", now: "지금 확인" }
    ];
    $("#protectList").innerHTML = prot.map(function (p, i) {
      return '<div class="plan__item"><span class="plan__num">' + (i + 1) + "</span><div>" +
        '<div class="plan__title">' + p.t + "</div>" +
        '<div class="plan__body">' + p.b + ' <span class="plan__now">' + p.now + "</span></div></div></div>";
    }).join("");

    last = { r: r, tone: tone };
    if (!$("#result").hidden) return;
    $("#result").hidden = false;
    if (scroll) $("#result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateCount() {
    $("#countText").textContent = state.weight !== null ? "플랜을 만들 수 있어요" : "체중을 넣으면 자동 계산";
    var names = ["통증 없음", "계단·오래 걸으면 통증", "일상에서도 통증"];
    $("#countHint").textContent = state.knee ? names[state.knee] + " · 단계 자동 조정" : "무릎 통증이 있으면 자동으로 걷기 중심으로 바뀝니다";
  }

  function schedule_() {
    clearTimeout(timer);
    timer = setTimeout(function () { analyze(false); }, 200);
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
    var r = last.r;
    var text = "【4주 러닝 플랜 · " + r.plan.name + "】\n" +
      r.weeks.map(function (w, i) {
        return (i + 1) + "주차: " + (w.walk ? "조깅 " + mins(w.jog) + " / 걷기 " + mins(w.walk) + " × " + w.reps : "조깅 " + mins(w.jog) + " 연속") +
          " (" + w.total + "분, 주 3회)";
      }).join("\n") +
      "\n워밍업·쿨다운 각 5분 별도 · 주 3회 · 통증 3/10 이상이면 중단";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("플랜을 복사했어요"); }, function () { toast("복사에 실패했어요"); });
    } else toast("복사가 지원되지 않는 브라우저예요");
  }

  function init() {
    initTheme();

    $("#weight").addEventListener("input", function (e) { state.weight = num(e.target.value); updateCount(); schedule_(); });
    $("#height").addEventListener("input", function (e) { state.height = num(e.target.value); schedule_(); });

    [["#walkSeg", "walk"], ["#expSeg", "exp"], ["#kneeSeg", "knee"], ["#goalSeg", "goal"]].forEach(function (pair) {
      $$(pair[0] + " .seg__btn").forEach(function (b) {
        b.addEventListener("click", function () {
          $$(pair[0] + " .seg__btn").forEach(function (x) { x.classList.remove("is-on"); x.setAttribute("aria-pressed", "false"); });
          b.classList.add("is-on"); b.setAttribute("aria-pressed", "true");
          state[pair[1]] = parseInt(b.dataset.v, 10);
          updateCount(); schedule_();
        });
      });
    });

    $("#analyzeBtn").addEventListener("click", function () { analyze(true); });
    $("#resetBtn").addEventListener("click", function () {
      state = { weight: null, height: null, walk: 1, exp: 0, knee: 0, goal: 0 };
      $("#weight").value = ""; $("#height").value = "";
      [["#walkSeg", 1], ["#expSeg", 0], ["#kneeSeg", 0], ["#goalSeg", 0]].forEach(function (p) {
        $$(p[0] + " .seg__btn").forEach(function (x, i) { x.classList.toggle("is-on", i === p[1]); x.setAttribute("aria-pressed", i === p[1] ? "true" : "false"); });
      });
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
