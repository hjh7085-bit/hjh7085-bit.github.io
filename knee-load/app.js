/* ==========================================================================
   팩트체크 건강연구소 · 체중 감량 시 무릎 하중 감소 시뮬레이터
   체중 대비 배수(보행 3 · 계단 4~5 · 하산 6)로 무릎 하중을 추정한다.
   --------------------------------------------------------------------------
   ⚠️ 문헌 평균 배수를 적용한 '참고용' 추정이며 개인 측정값이 아닙니다.
   ========================================================================== */

(function () {
  "use strict";

  var LOADS = [
    { key: "walk", emoji: "🚶", name: "평지 걷기", sub: "한 걸음", m: 3.0 },
    { key: "up", emoji: "🔼", name: "계단 오르기", sub: "한 계단", m: 4.0 },
    { key: "down", emoji: "🔽", name: "계단 내려가기", sub: "한 계단 · 충격 흡수", m: 5.0 },
    { key: "hike", emoji: "⛰️", name: "등산 하산", sub: "한 걸음 · 경사", m: 6.0 }
  ];

  var BANDS = [
    { max: 18.4, label: "저체중", speed: "4.5~5.0km/h", slope: "평지 위주", time: "20~30분", note: "감량보다 근력·단백질이 먼저", cls: "amber" },
    { max: 22.9, label: "정상", speed: "5.0~5.5km/h", slope: "8~12%", time: "30~50분", note: "지금 속도 유지 + 주 2회 근력", cls: "green" },
    { max: 24.9, label: "과체중", speed: "4.5~5.0km/h", slope: "5~8%", time: "30~40분", note: "경사보다 시간을 늘리기", cls: "amber" },
    { max: 29.9, label: "비만 1단계", speed: "4.0~4.5km/h", slope: "3~5%", time: "20~40분", note: "첫 2주는 평지, 대화 가능한 속도", cls: "red" },
    { max: 34.9, label: "비만 2단계", speed: "3.5~4.0km/h", slope: "0~3%", time: "15~30분 나눠서", note: "하산·계단 최소화, 수영·자전거 병행", cls: "red" },
    { max: 99, label: "고도비만", speed: "3.0~3.5km/h", slope: "평지", time: "10~20분 나눠서", note: "물속 걷기·실내자전거부터, 의료진 상담 권장", cls: "red" }
  ];

  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : null; }
  function fmt(n) { return Math.round(n).toLocaleString("ko-KR"); }
  function fmt1(n) { return (Math.round(n * 10) / 10).toLocaleString("ko-KR"); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  var state = { height: null, weight: null, loss: null, steps: 6000 };
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

  function bandOf(bmi) {
    for (var i = 0; i < BANDS.length; i++) if (bmi <= BANDS[i].max) return BANDS[i];
    return BANDS[BANDS.length - 1];
  }

  function compute() {
    var w = state.weight, loss = state.loss, h = state.height;
    if (w === null || loss === null) return null;
    var maxLoss = Math.max(0, w - 30);
    var clamped = loss > maxLoss;
    loss = Math.min(loss, maxLoss);
    var target = w - loss;
    var bmi = h ? w / Math.pow(h / 100, 2) : null;
    var tBmi = h ? target / Math.pow(h / 100, 2) : null;
    var steps = state.steps || 0;

    var perStep = LOADS.map(function (l) {
      return {
        l: l,
        now: w * l.m,
        after: target * l.m,
        diff: loss * l.m
      };
    });

    var dailyNow = steps * w * 3.0 / 1000;      /* 톤 */
    var dailyAfter = steps * target * 3.0 / 1000;
    var dailySave = steps * loss * 3.0 / 1000;

    var marks = [5, 10, 15, 20].filter(function (x) { return x < loss; });
    if (loss > 0) marks.push(Math.round(loss * 10) / 10);
    marks.sort(function (a, b) { return a - b; });

    return {
      w: w, loss: loss, target: target, bmi: bmi, tBmi: tBmi, band: bmi ? bandOf(bmi) : null,
      clamped: clamped, perStep: perStep, steps: steps,
      dailyNow: dailyNow, dailyAfter: dailyAfter, dailySave: dailySave,
      marks: marks
    };
  }

  function verdictHtml(r) {
    var tone, badge, title, desc;
    var b = r.band;
    if (!b) {
      tone = "amber"; badge = "⚖️ BMI 미입력";
      title = "감량하면 보행 하중이 " + fmt(r.loss * 3) + "kg 줄어요";
      desc = "키를 넣으면 BMI와 그에 맞는 걷기 속도·경사 가이드까지 계산합니다. 한 걸음당 <b>" + fmt(r.loss * 3) + "kg</b>, 하루 " + fmt(r.steps) + "보면 <b>" + fmt(r.dailySave) + "톤</b>이 줄어듭니다.";
    } else if (b.cls === "green") {
      tone = "green"; badge = "🟢 BMI " + fmt1(r.bmi) + " · " + b.label;
      title = "지금 체중은 무릎에 무리 없는 구간이에요";
      desc = "그래도 " + fmt1(r.loss) + "kg을 줄이면 한 걸음마다 <b>" + fmt(r.loss * 3) + "kg</b>, 하루 " + fmt(r.steps) + "보면 <b>" + fmt(r.dailySave) + "톤</b>의 하중이 줄어듭니다. 무릎 통증이 없다면 지금 속도를 유지하면서 근력운동을 더하세요.";
    } else if (b.cls === "amber") {
      tone = "amber"; badge = "🟡 BMI " + fmt1(r.bmi) + " · " + b.label;
      title = fmt1(r.loss) + "kg 감량으로 보행 하중 " + fmt(r.loss * 3) + "kg 감소";
      desc = "BMI " + fmt1(r.bmi) + "는 무릎에 부담이 시작되는 구간입니다. " + fmt1(r.loss) + "kg을 줄이면 한 걸음당 <b>" + fmt(r.loss * 3) + "kg</b>, 하루 <b>" + fmt(r.dailySave) + "톤</b>이 줄어요. 속도보다 <b>시간과 경사</b>를 먼저 조절하세요.";
    } else {
      tone = "red"; badge = "🔴 BMI " + fmt1(r.bmi) + " · " + b.label;
      title = "지금이 무릎에 가장 힘든 구간 — 감량 효과가 가장 큽니다";
      desc = "BMI " + fmt1(r.bmi) + "에서는 한 걸음에 <b>" + fmt(r.w * 3) + "kg</b>이 무릎에 실립니다. " + fmt1(r.loss) + "kg만 줄여도 한 걸음당 <b>" + fmt(r.loss * 3) + "kg</b>, 하루 <b>" + fmt(r.dailySave) + "톤</b>이 사라져요. 단, 시작은 <b>평지 걷기 20분</b>부터.";
    }
    var cls = "verdict--" + tone;
    return '<div class="verdict ' + cls + '">' +
      '<span class="verdict__badge">' + badge + "</span>" +
      '<h3 class="verdict__title">' + title + "</h3>" +
      '<p class="verdict__desc">' + desc + "</p></div>";
  }

  function summaryHtml(r) {
    var tone = r.band ? r.band.cls : "amber";
    var cls = "summary__card--" + tone;
    return '<div class="summary__card ' + cls + '"><span class="summary__num">' + fmt(r.w * 3) + '<span style="font-size:13px">kg</span></span><span class="summary__label">지금 보행 하중</span></div>' +
      '<div class="summary__card summary__card--green"><span class="summary__num">' + fmt(r.target * 3) + '<span style="font-size:13px">kg</span></span><span class="summary__label">감량 후 보행 하중</span></div>' +
      '<div class="summary__card"><span class="summary__num">−' + fmt(r.loss * 3) + '<span style="font-size:13px">kg</span></span><span class="summary__label">한 걸음당 감소</span></div>';
  }

  function loadHtml(r) {
    var maxNow = r.w * 6; /* 등산 하산(6배)을 100%로 두고 절대 하중을 비교 */
    return r.perStep.map(function (p) {
      var keep = Math.max(2, p.after / maxNow * 100);
      var cut = p.diff / maxNow * 100;
      return '<div class="load">' +
        '<div class="load__head">' +
          '<span class="load__name">' + p.l.emoji + " " + p.l.name + "<span>" + p.l.sub + " · 체중 × " + p.l.m + "</span></span>" +
          '<span class="load__num">' + fmt(p.now) + "kg → " + fmt(p.after) + "kg" +
            "<small>−" + fmt(p.diff) + "kg (" + fmt1(p.diff / p.now * 100) + "%)</small></span>" +
        "</div>" +
        '<div class="load__track"><span class="load__keep" style="width:' + keep.toFixed(1) + '%"></span>' +
          '<span class="load__cut" style="width:' + cut.toFixed(1) + '%"></span></div>' +
        "</div>";
    }).join("");
  }

  function mileHtml(r) {
    var rows = r.marks.map(function (kg) {
      var isTarget = Math.abs(kg - r.loss) < 0.01;
      return "<tr" + (isTarget ? ' class="is-best"' : "") + ">" +
        "<td><b>" + (isTarget ? "목표 " : "") + "−" + fmt1(kg) + "kg</b>" + (isTarget ? ' <span class="rank">내 목표</span>' : "") + "</td>" +
        "<td>−" + fmt(kg * 3) + "<em>kg</em></td>" +
        "<td>−" + fmt(kg * 4) + "<em>kg</em></td>" +
        "<td>−" + fmt(kg * 5) + "<em>kg</em></td>" +
        "<td>−" + fmt(kg * 6) + "<em>kg</em></td></tr>";
    });
    $("#mileBody").innerHTML = rows.join("");
  }

  function dailyHtml(r) {
    $("#dailyMetrics").innerHTML =
      '<div class="metric"><span class="metric__label">지금 하루 보행 하중</span><div class="metric__value">' + fmt(r.dailyNow) + "<small>톤</small></div>" +
        '<div class="metric__sub">' + fmt(r.steps) + "보 × " + fmt1(r.w) + "kg × 3</div></div>" +
      '<div class="metric metric--accent"><span class="metric__label">감량 후 하루 하중</span><div class="metric__value">' + fmt(r.dailyAfter) + "<small>톤</small></div>" +
        '<div class="metric__sub">하루 −' + fmt(r.dailySave) + "톤</div></div>" +
      '<div class="metric"><span class="metric__label">한 달 · 1년 누적 감소</span><div class="metric__value">' + fmt(r.dailySave * 30) + "<small>톤/월</small></div>" +
        '<div class="metric__sub">1년이면 ' + fmt(r.dailySave * 365) + "톤</div></div>";
  }

  function guideHtml(r) {
    var b = r.band;
    if (!b) {
      $("#guideNow").innerHTML = '<div class="card__body">키를 입력하면 BMI에 맞는 걷기 속도·경사 가이드가 나옵니다.</div>';
    } else {
      $("#guideNow").innerHTML = '<div class="card__body">' +
        '<p><b>내 구간 · BMI ' + fmt1(r.bmi) + " (" + b.label + ")</b> → 감량 후 BMI <b>" + fmt1(r.tBmi) + "</b></p>" +
        '<p>권장 속도 <b>' + b.speed + "</b> · 경사 <b>" + b.slope + "</b> · 1회 <b>" + b.time + "</b></p>" +
        '<p>' + b.note + (r.clamped ? " <b>· 감량 목표가 체중의 범위를 넘어 조정했습니다.</b>" : "") + "</p></div>";
    }
    $("#guideBody").innerHTML = BANDS.map(function (x) {
      var on = b && x.label === b.label;
      return "<tr" + (on ? ' class="is-best"' : "") + ">" +
        "<td><b>BMI " + (x.max > 35 ? "35+" : "~" + x.max) + "</b><em>" + x.label + "</em></td>" +
        "<td>" + x.speed + "</td><td>" + x.slope + "</td><td>" + x.time + "</td><td style=\"white-space:normal;min-width:150px\">" + x.note + "</td></tr>";
    }).join("");
  }

  function planHtml(r) {
    var items = [
      { cls: "", n: "1", t: "하산엔 스틱 2개", b: "스틱을 쓰면 하산 시 무릎 부하가 <b>20~25%</b> 줄어든다는 연구가 있습니다. 길이는 팔꿈치 90도일 때 손잡이가 잡히는 정도." },
      { cls: "", n: "2", t: "보폭 10% 줄이고 100~110보/분", b: "보폭이 길수록 무릎 굽힘과 충격이 커집니다. 빠르게 걷기보다 <b>짧고 잦은 걸음</b>이 무릎에 덜합니다." },
      { cls: "", n: "3", t: "계단 내려갈 땐 난간 잡고 한 발씩", b: "내려가기는 오르기보다 하중이 큽니다(약 5배). 급하면 엘리베이터를 쓰는 게 낫습니다." },
      { cls: "plan__item--amber", n: "4", t: "대퇴사두근 근력 주 2회", b: "허벅지 앞 근육이 충격을 흡수합니다. 의자 스쿼트 10회 × 3세트, 레그 익스텐션. 근력이 붙으면 같은 체중도 덜 아픕니다." },
      { cls: "plan__item--amber", n: "5", t: "감량은 주 0.5~1kg", b: "급격한 감량은 근육을 깎아 무릎 지지력을 떨어뜨립니다. 단백질은 체중 1kg당 <b>1.2~1.6g</b>을 챙기세요." },
      { cls: "plan__item--red", n: "6", t: "아픈 날은 수영·실내자전거", b: "통증이 있는 날 걷기를 억지로 하지 마세요. 물속 걷기·자전거는 무릎 하중이 1/3 이하로 줄어듭니다." }
    ];
    $("#planList").innerHTML = items.map(function (it) {
      return '<div class="plan__item ' + it.cls + '"><span class="plan__num">' + it.n + "</span>" +
        '<div><div class="plan__title">' + it.t + "</div>" +
        '<div class="plan__body">' + it.b + "</div></div></div>";
    }).join("");
  }

  function analyze(scroll) {
    var r = compute();
    if (!r) {
      $("#result").hidden = true;
      last = null;
      return;
    }
    last = r;
    $("#result").hidden = false;
    $("#verdictBox").innerHTML = verdictHtml(r);
    $("#summaryBox").innerHTML = summaryHtml(r);
    $("#loadList").innerHTML = loadHtml(r);
    mileHtml(r);
    dailyHtml(r);
    guideHtml(r);
    planHtml(r);
    $("#resultSub").textContent = fmt1(r.w) + "kg → " + fmt1(r.target) + "kg (−" + fmt1(r.loss) + "kg)" +
      (r.bmi ? " · BMI " + fmt1(r.bmi) + " → " + fmt1(r.tBmi) : "") + " · 하루 " + fmt(r.steps) + "보 기준";
    if (scroll) $("#result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateCount() {
    if (state.weight === null) {
      $("#countText").textContent = "체중을 넣으면 자동 계산";
      $("#countHint").textContent = "감량 kg만 넣어도 바로 계산됩니다";
      return;
    }
    var loss = state.loss === null ? 0 : state.loss;
    $("#countText").textContent = fmt1(state.weight) + "kg · −" + fmt1(loss) + "kg";
    $("#countHint").textContent = "걷기 한 걸음 −" + fmt(loss * 3) + "kg";
  }

  function schedule() {
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
    var r = last;
    var text = "체중 " + fmt1(r.w) + "kg → " + fmt1(r.target) + "kg (−" + fmt1(r.loss) + "kg)\n" +
      "보행 하중 " + fmt(r.w * 3) + "kg → " + fmt(r.target * 3) + "kg (한 걸음 −" + fmt(r.loss * 3) + "kg)\n" +
      "계단 내려가기 " + fmt(r.w * 5) + "kg → " + fmt(r.target * 5) + "kg\n" +
      "등산 하산 " + fmt(r.w * 6) + "kg → " + fmt(r.target * 6) + "kg\n" +
      "하루 " + fmt(r.steps) + "보 누적 " + fmt(r.dailyNow) + "톤 → " + fmt(r.dailyAfter) + "톤";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("결과를 복사했어요"); }, function () { toast("복사에 실패했어요"); });
    } else toast("복사가 지원되지 않는 브라우저예요");
  }

  function init() {
    initTheme();

    ["height", "weight", "loss", "steps"].forEach(function (id) {
      var el = $("#" + id);
      el.addEventListener("input", function () {
        if (id === "steps") state.steps = Math.max(0, num(el.value) || 0);
        else state[id] = num(el.value);
        $$(".preset").forEach(function (b) { b.classList.remove("is-active"); });
        updateCount();
        schedule();
      });
      el.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); analyze(true); } });
    });

    $$(".preset").forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.dataset.loss) {
          state.loss = parseFloat(b.dataset.loss);
          $("#loss").value = b.dataset.loss;
          $$(".preset[data-loss]").forEach(function (x) { x.classList.remove("is-active"); });
          b.classList.add("is-active");
        } else {
          state.steps = parseInt(b.dataset.steps, 10);
          $("#steps").value = b.dataset.steps;
          $$(".preset[data-steps]").forEach(function (x) { x.classList.remove("is-active"); });
          b.classList.add("is-active");
        }
        updateCount();
        analyze(false);
      });
    });

    $("#analyzeBtn").addEventListener("click", function () { analyze(true); });
    $("#resetBtn").addEventListener("click", function () {
      state = { height: null, weight: null, loss: null, steps: 6000 };
      $("#height").value = ""; $("#weight").value = ""; $("#loss").value = ""; $("#steps").value = "6000";
      $$(".preset").forEach(function (b) { b.classList.remove("is-active"); });
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
