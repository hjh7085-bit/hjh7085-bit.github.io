/* ==========================================================================
   팩트체크 건강연구소 · 근육 지켰을 때 vs 빠졌을 때 요요 대사량 비교기
   Katch-McArdle(BMR) + 활동계수(TDEE) · 근손실 8% vs 40% 시나리오
   --------------------------------------------------------------------------
   ⚠️ 공개 연구의 평균 근손실 비율을 대입한 '참고용' 시뮬레이션입니다.
   진단·처방이 아니며, 감량은 담당 의사와 상의하세요.
   ========================================================================== */

(function () {
  "use strict";

  var KCAL_PER_KG_FAT = 7700;
  var LEAN_KEEP = 0.08;   /* 근력운동 + 단백질: 감량 무게의 8%가 제지방 손실 */
  var LEAN_LOSE = 0.40;   /* 무리한 굶기/식이만: 40% (남성 상한 추정치) */

  var DEFAULTS = { sex: "m", act: "1.55", age: "40", height: "175", weight: "88", bodyfat: "", loss: "8" };

  var PRESETS = {
    m40: { sex: "m", age: "42", height: "175", weight: "88", bodyfat: "28", loss: "8" },
    f30: { sex: "f", age: "34", height: "162", weight: "68", bodyfat: "33", loss: "5" },
    m30b: { sex: "m", age: "40", height: "175", weight: "75", bodyfat: "22", loss: "8" }
  };

  var state = { sex: "m", act: 1.55 };
  var lastResult = null;
  var timer = null;

  function $(s) { return document.querySelector(s); }
  function num(v) { var n = parseFloat(String(v).replace(/[^0-9.\-]/g, "")); return isFinite(n) ? n : NaN; }
  function fmt(n, d) {
    if (!isFinite(n)) return "-";
    var fixed = (typeof d === "number") ? n.toFixed(d) : String(Math.round(n));
    var parts = fixed.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  /* ------------------------------------------------------------------ theme */
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

  function toast(msg) {
    var t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("is-on");
    setTimeout(function () { t.classList.remove("is-on"); }, 1800);
  }

  /* ------------------------------------------------------------------ model */
  function readInputs() {
    return {
      sex: state.sex,
      act: state.act,
      age: num($("#age").value),
      height: num($("#height").value),
      weight: num($("#weight").value),
      bodyfatRaw: $("#bodyfat").value.trim(),
      loss: num($("#loss").value)
    };
  }

  function validate(i) {
    if (!isFinite(i.age) || i.age < 15 || i.age > 90) return "나이는 15~90세 사이로 입력하세요.";
    if (!isFinite(i.height) || i.height < 120 || i.height > 220) return "키는 120~220cm 사이로 입력하세요.";
    if (!isFinite(i.weight) || i.weight < 35 || i.weight > 250) return "체중은 35~250kg 사이로 입력하세요.";
    if (!isFinite(i.loss) || i.loss < 1) return "목표 감량은 1kg 이상으로 입력하세요.";
    if (i.loss > i.weight * 0.45) return "목표 감량이 현재 체중의 45%를 넘습니다. 숫자를 확인해 주세요.";
    if (i.bodyfatRaw !== "") {
      var bf = num(i.bodyfatRaw);
      if (!isFinite(bf) || bf < 3 || bf > 65) return "체지방률은 3~65% 사이로 입력하거나 비워 두세요.";
    }
    return null;
  }

  function compute(i) {
    var bmi = i.weight / Math.pow(i.height / 100, 2);
    var bfGiven = i.bodyfatRaw !== "";
    var bf = bfGiven
      ? num(i.bodyfatRaw)
      : clamp(1.20 * bmi + 0.23 * i.age - 10.8 * (i.sex === "m" ? 1 : 0) - 5.4, 3, 60);
    var fat = i.weight * bf / 100;
    var lbm = i.weight - fat;
    var bmr0 = 370 + 21.6 * lbm;
    var tdee0 = bmr0 * i.act;

    function scenario(f) {
      var leanLoss = i.loss * f;
      var fatLoss = i.loss - leanLoss;
      var w = i.weight - i.loss;
      var lbmNew = lbm - leanLoss;
      var fatNew = fat - fatLoss;
      var bmr = 370 + 21.6 * lbmNew;
      return {
        f: f, leanLoss: leanLoss, fatLoss: fatLoss, weight: w,
        lbm: lbmNew, fat: fatNew,
        bf: w > 0 ? fatNew / w * 100 : 0,
        bmr: bmr, tdee: bmr * i.act,
        bmrDrop: bmr0 - bmr, bmrDropPct: (bmr0 - bmr) / bmr0 * 100
      };
    }

    var keep = scenario(LEAN_KEEP);
    var lose = scenario(LEAN_LOSE);
    var diffBMR = keep.bmr - lose.bmr;
    var diffTDEE = keep.tdee - lose.tdee;
    var yearKcal = diffTDEE * 365;

    return {
      bmi: bmi, bf: bf, bfGiven: bfGiven, fat: fat, lbm: lbm,
      bmr0: bmr0, tdee0: tdee0,
      keep: keep, lose: lose,
      diffBMR: diffBMR, diffTDEE: diffTDEE,
      yearKcal: yearKcal, yearKg: yearKcal / KCAL_PER_KG_FAT,
      loss: i.loss, act: i.act,
      target: i.weight - i.loss
    };
  }

  /* ---------------------------------------------------------------- render */
  function verdictHTML(r) {
    var level, badge, title, desc;
    if (r.diffTDEE >= 120) {
      level = "red"; badge = "🔴 요요 리스크 높음";
      title = "굶은 감량은 하루 " + fmt(r.diffTDEE) + "kcal를 덜 태웁니다";
      desc = "감량 후 같은 양을 먹으면 <b>1년에 " + fmt(r.yearKg, 1) + "kg</b>이 다시 쌓이는 계산입니다. 근육을 지킨 쪽과 비교해 기초대사량만 <b>" + fmt(r.diffBMR) + "kcal</b> 차이납니다.";
    } else if (r.diffTDEE >= 60) {
      level = "amber"; badge = "🟡 요요 리스크 중간";
      title = "하루 " + fmt(r.diffTDEE) + "kcal, 1년이면 " + fmt(r.yearKg, 1) + "kg";
      desc = "차이가 작아 보여도 <b>매일</b> 쌓입니다. 근손실을 8% 아래로 줄이면 이 차이의 대부분이 사라집니다.";
    } else {
      level = "green"; badge = "🟢 요요 리스크 낮음";
      title = "두 경로의 차이가 하루 " + fmt(r.diffTDEE) + "kcal";
      desc = "감량 폭이 작아 대사량 타격이 크지 않습니다. 그래도 <b>단백질과 근력운동</b>은 유지하세요 — 감량 후 유지가 훨씬 쉬워집니다.";
    }
    return '<div class="verdict verdict--' + level + '">' +
      '<span class="verdict__badge">' + badge + "</span>" +
      '<h3 class="verdict__title">' + title + "</h3>" +
      '<p class="verdict__desc">' + desc + "</p>" +
      "</div>";
  }

  function summaryHTML(r) {
    function card(val, unit, label, cls) {
      return '<div class="summary__card' + (cls ? " summary__card--" + cls : "") + '">' +
        '<div class="summary__num">' + val + (unit ? "<small style=\"font-size:12px;font-weight:700;color:var(--ink-3)\"> " + unit + "</small>" : "") + "</div>" +
        '<div class="summary__label">' + label + "</div></div>";
    }
    return card(fmt(r.diffBMR), "kcal", "기초대사량 차이") +
      card(fmt(r.diffTDEE), "kcal", "하루 소비 차이", "red") +
      card(fmt(r.yearKg, 1), "kg", "1년 지방 환산", "amber");
  }

  function loadHTML(r) {
    function one(sc, emoji, name) {
      var keepPct = (1 - sc.f) * 100;
      return '<div class="load">' +
        '<div class="load__head">' +
        '<div class="load__name">' + emoji + " " + name +
        "<span>뺀 " + fmt(r.loss, 1) + "kg 중 지방 " + fmt(sc.fatLoss, 1) + "kg · 근육 " + fmt(sc.leanLoss, 1) + "kg</span></div>" +
        '<div class="load__num">BMR ' + fmt(sc.bmr) + "<small>TDEE " + fmt(sc.tdee) + " kcal</small></div>" +
        "</div>" +
        '<div class="load__track">' +
        '<div class="load__keep" style="width:' + keepPct.toFixed(1) + '%"></div>' +
        '<div class="load__cut" style="width:' + (100 - keepPct).toFixed(1) + '%"></div>' +
        "</div>" +
        '<div class="load__legend"><span><i class="keep"></i>지방 ' + Math.round(keepPct) + '%</span>' +
        '<span><i class="cut"></i>근육 ' + Math.round(100 - keepPct) + '%</span>' +
        '<span>감량 후 ' + fmt(sc.weight, 1) + "kg · 체지방률 " + fmt(sc.bf, 1) + "%</span></div>" +
        "</div>";
    }
    return one(r.keep, "🟢", "근육 지킨 감량") + one(r.lose, "🔴", "굶어서 뺀 감량");
  }

  function cmpHTML(r) {
    function row(label, a, b, best) {
      return "<tr" + (best ? ' class="is-best"' : "") + "><td>" + label + "</td><td>" + a + "</td><td>" + b + "</td></tr>";
    }
    var d = r.keep.bmr - r.lose.bmr;
    return row("감량 후 체중", fmt(r.target, 1) + " kg", fmt(r.target, 1) + " kg") +
      row("빠진 근육(제지방)", "<b>" + fmt(r.keep.leanLoss, 1) + " kg</b>", "<b>" + fmt(r.lose.leanLoss, 1) + " kg</b>", true) +
      row("감량 후 지방량", fmt(r.keep.fat, 1) + " kg", fmt(r.lose.fat, 1) + " kg") +
      row("감량 후 제지방량", fmt(r.keep.lbm, 1) + " kg", fmt(r.lose.lbm, 1) + " kg", true) +
      row("감량 후 체지방률", fmt(r.keep.bf, 1) + " %", fmt(r.lose.bf, 1) + " %") +
      row("기초대사량 (BMR)", "<b>" + fmt(r.keep.bmr) + "</b> kcal", fmt(r.lose.bmr) + " kcal", true) +
      row("일일 소비 (TDEE)", "<b>" + fmt(r.keep.tdee) + "</b> kcal", fmt(r.lose.tdee) + " kcal", true) +
      row("감량 전 대비 BMR", "<em>−" + fmt(r.keep.bmrDrop) + " kcal (−" + fmt(r.keep.bmrDropPct, 1) + "%)</em>",
        "<em>−" + fmt(r.lose.bmrDrop) + " kcal (−" + fmt(r.lose.bmrDropPct, 1) + "%)</em>") +
      row("두 경로의 하루 차이", "<b>+" + fmt(d) + " kcal</b>", "0 kcal") +
      row("1년 누적", "<b>+" + fmt(r.yearKcal) + " kcal</b><em>지방 " + fmt(r.yearKg, 1) + "kg</em>", "0");
  }

  function yoHTML(r) {
    function metric(label, value, sub) {
      return '<div class="metric"><div class="metric__label">' + label + '</div>' +
        '<div class="metric__value">' + value + "</div>" +
        '<div class="metric__sub">' + sub + "</div></div>";
    }
    return metric("1년 뒤 남는 열량", fmt(r.yearKcal) + "<small>kcal</small>",
        "감량 후에도 근육 지킨 쪽의 식사량을 그대로 유지했을 때") +
      metric("지방으로 환산", fmt(r.yearKg, 1) + "<small>kg</small>",
        "지방 1kg = 약 7,700kcal 기준", true) +
      metric("1년 뒤 예상 체중", fmt(r.target + r.yearKg, 1) + "<small>kg</small>",
        "감량 후 " + fmt(r.target, 1) + "kg → 다시 증가") +
      metric("굶은 쪽 BMR 하락", "−" + fmt(r.lose.bmrDropPct, 1) + "<small>%</small>",
        "감량 전 " + fmt(r.bmr0) + "kcal → " + fmt(r.lose.bmr) + "kcal");
  }

  function planHTML(r) {
    var protein = r.target * 1.6;
    var weekly = r.target * 0.01;
    return '<div class="plan__item"><div class="plan__num">1</div><div>' +
      '<div class="plan__title">단백질 하루 ' + fmt(protein) + "g</div>" +
      '<div class="plan__body">목표 체중 ' + fmt(r.target, 1) + "kg × 1.6g. 한 끼 30~40g씩 3~4번으로 나누세요. " +
      "닭가슴살 100g은 약 23g, 계란 1개는 6g, 두부 100g은 8g입니다.</div></div></div>" +
      '<div class="plan__item"><div class="plan__num">2</div><div>' +
      '<div class="plan__title">주 2~3회 근력운동</div>' +
      '<div class="plan__body">스쿼트·런지·푸시업·랫풀다운처럼 <b>큰 근육</b>을 쓰는 동작을 부위당 주 6~9세트. ' +
      '걷기·등산만으로는 근육 유지 자극이 부족합니다.</div></div></div>' +
      '<div class="plan__item plan__item--amber"><div class="plan__num">3</div><div>' +
      '<div class="plan__title">감량 속도 주 ' + fmt(weekly, 2) + "kg 이하</div>" +
      '<div class="plan__body">현재 체중의 주 0.5~1%. 이를 넘기면 근손실 비율이 8%에서 20~40%로 뛰고, ' +
      "담석·어지럼·생리 불순 위험도 함께 올라갑니다.</div></div></div>";
  }

  function render(r) {
    lastResult = r;
    $("#lossEcho").textContent = fmt(r.loss, 1).replace(/\.0$/, "") + "kg";
    $("#resultSub").textContent = "체지방률 " + fmt(r.bf, 1) + "%" + (r.bfGiven ? "" : "(BMI 추정)") +
      " 기준 · 현재 BMR " + fmt(r.bmr0) + "kcal · 하루 " + fmt(r.tdee0) + "kcal 소비. 목표 감량 " +
      fmt(r.loss, 1) + "kg을 두 경로로 나눠 계산했습니다.";
    $("#verdictBox").innerHTML = verdictHTML(r);
    $("#summaryBox").innerHTML = summaryHTML(r);
    $("#loads").innerHTML = loadHTML(r);
    $("#cmpBody").innerHTML = cmpHTML(r);
    $("#yoMetrics").innerHTML = yoHTML(r);
    $("#planList").innerHTML = planHTML(r);
    $("#result").hidden = false;

    $("#countText").textContent = "하루 " + fmt(r.diffTDEE) + "kcal 차이";
    $("#countHint").textContent = "1년이면 지방 " + fmt(r.yearKg, 1) + "kg";
  }

  function refresh(scroll) {
    var i = readInputs();
    var err = validate(i);
    if (err) {
      $("#countText").textContent = "입력 확인";
      $("#countHint").textContent = err;
      return null;
    }
    var r = compute(i);
    render(r);
    if (scroll) {
      var el = $("#result");
      var top = el.getBoundingClientRect().top + window.pageYOffset - 10;
      window.scrollTo({ top: top, behavior: "smooth" });
    }
    return r;
  }

  /* ------------------------------------------------------------------ events */
  function setSex(v) {
    state.sex = v;
    Array.prototype.forEach.call(document.querySelectorAll("#sexSeg .seg__btn"), function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-sex") === v);
    });
  }
  function setAct(v) {
    state.act = parseFloat(v);
    Array.prototype.forEach.call(document.querySelectorAll("#actSeg .seg__btn"), function (b) {
      b.classList.toggle("is-on", parseFloat(b.getAttribute("data-act")) === state.act);
    });
  }

  function applyValues(o) {
    if (o.sex) setSex(o.sex);
    if (o.age != null) $("#age").value = o.age;
    if (o.height != null) $("#height").value = o.height;
    if (o.weight != null) $("#weight").value = o.weight;
    if (o.bodyfat != null) $("#bodyfat").value = o.bodyfat;
    if (o.loss != null) $("#loss").value = o.loss;
  }

  function copyResult() {
    if (!lastResult) return;
    var r = lastResult;
    var text = "【근육 지킴 vs 굶은 감량】\n" +
      "현재 " + fmt(r.target + r.loss, 1) + "kg · 체지방률 " + fmt(r.bf, 1) + "% → 목표 " + fmt(r.target, 1) + "kg\n" +
      "· 근육 지킴(근손실 8%): BMR " + fmt(r.keep.bmr) + "kcal · TDEE " + fmt(r.keep.tdee) + "kcal\n" +
      "· 굶은 감량(근손실 40%): BMR " + fmt(r.lose.bmr) + "kcal · TDEE " + fmt(r.lose.tdee) + "kcal\n" +
      "· 차이: 하루 " + fmt(r.diffTDEE) + "kcal → 1년 " + fmt(r.yearKg, 1) + "kg 상당\n" +
      "단백질 하루 " + fmt(r.target * 1.6) + "g · 주 2~3회 근력운동 · 감량 주 " + fmt(r.target * 0.01, 2) + "kg 이하\n" +
      "※ 공개 연구 평균값 기반 참고용 시뮬레이션 (팩트체크 건강연구소)";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("결과를 복사했습니다"); },
        function () { toast("복사가 차단되었습니다"); });
    } else {
      toast("이 브라우저에서는 복사가 지원되지 않습니다");
    }
  }

  function init() {
    initTheme();
    setSex(state.sex);
    setAct(state.act);

    Array.prototype.forEach.call(document.querySelectorAll("#sexSeg .seg__btn"), function (b) {
      b.addEventListener("click", function () { setSex(b.getAttribute("data-sex")); schedule(); });
    });
    Array.prototype.forEach.call(document.querySelectorAll("#actSeg .seg__btn"), function (b) {
      b.addEventListener("click", function () { setAct(b.getAttribute("data-act")); schedule(); });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-preset]"), function (b) {
      b.addEventListener("click", function () {
        var p = PRESETS[b.getAttribute("data-preset")];
        if (!p) return;
        applyValues({ sex: p.sex, age: p.age, height: p.height, weight: p.weight, bodyfat: p.bodyfat, loss: p.loss });
        Array.prototype.forEach.call(document.querySelectorAll("[data-preset]"), function (x) { x.classList.remove("is-active"); });
        b.classList.add("is-active");
        refresh(true);
      });
    });

    ["#age", "#height", "#weight", "#bodyfat", "#loss"].forEach(function (s) {
      var el = $(s);
      el.addEventListener("input", schedule);
      el.addEventListener("blur", function () { refresh(false); });
    });

    $("#calcBtn").addEventListener("click", function () { refresh(true); });
    $("#resetBtn").addEventListener("click", function () {
      applyValues({ sex: "m", age: DEFAULTS.age, height: DEFAULTS.height, weight: DEFAULTS.weight, bodyfat: "", loss: DEFAULTS.loss });
      setAct(DEFAULTS.act);
      Array.prototype.forEach.call(document.querySelectorAll("[data-preset]"), function (x) { x.classList.remove("is-active"); });
      refresh(false);
      toast("입력을 초기화했습니다");
    });
    $("#copyBtn").addEventListener("click", copyResult);
    $("#editBtn").addEventListener("click", function () {
      var top = $("#calc").getBoundingClientRect().top + window.pageYOffset - 70;
      window.scrollTo({ top: top, behavior: "smooth" });
    });

    var y = $("#year");
    if (y) y.textContent = String(new Date().getFullYear());

    refresh(false);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(function () { refresh(false); }, 150);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
