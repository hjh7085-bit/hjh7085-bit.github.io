/* ==========================================================================
   팩트체크 건강연구소 · 단식·운동 대사 정체기 정밀 진단기
   입력 수집 + 대사 계산 엔진 + 결과 렌더링
   --------------------------------------------------------------------------
   ⚠️ 계산은 공개된 공식(Mifflin-St Jeor, Katch-McArdle)과 문헌 권고 범위를
   정리한 '참고용 추정치'입니다. 질환 진단·치료가 아니며, 처방약 조정은
   반드시 담당 의사·약사와 상담해야 합니다.
   ========================================================================== */

(function () {
  "use strict";

  var BLOG = "https://blog.naver.com/hjh7085/";

  var COLUMNS = [
    { url: BLOG + "224474847257", tag: "실전 후기", title: "마운자로 2.5mg vs 5mg 솔직 후기 — 용량 늘려도 덜 빠진 이유" },
    { url: BLOG + "224477169582", tag: "1분 논문 팩트", title: "눈 밑 떨림, 마그네슘 먹어도 안 멈추는 이유 — 산화 vs 글리시네이트" },
    { url: BLOG + "224474920957", tag: "1분 논문 팩트", title: "비타민 D3 먹을 때 K2 안 먹으면 혈관이 굳는다? 해외 저널 3줄 팩트체크" },
    { url: BLOG + "224474981968", tag: "성분 해부", title: "8만 원 노르딕 vs 3만 원 CGN 오메가3 — rTG 성분표 솔직 해부" },
    { url: BLOG + "224474970152", tag: "1분 논문 팩트", title: "아연만 고용량 먹으면 빈혈 온다? 아연과 구리 15:1 황금비율 팩트" },
    { url: BLOG + "224476159368", tag: "성분 해부", title: "만성 피로·간 수치 잡는 밀크씨슬: 쏜 S.A.T. vs 나우푸드 흡수율 해부" }
  ];

  /* --------------------------------------------------------------- helpers */
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : null; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function fmt(n) { return Math.round(n).toLocaleString("ko-KR"); }
  function fmt1(n) { return (Math.round(n * 10) / 10).toLocaleString("ko-KR"); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  var SEX_LABEL = { male: "남성", female: "여성" };
  var FAST_LABEL = { none: "안 함", "12": "12시간", "16": "16시간", "18": "18시간+", "20": "20시간+" };
  var PROTEIN_LABEL = { low: "부족", normal: "보통", high: "충분" };
  var MED_LABEL = { none: "복용 안 함", glp1: "GLP-1 계열(마운자로·위고비)", other: "기타 비만약" };

  /* ------------------------------------------------------------- 입력 상태 */
  var state = {
    sex: "male",
    age: 40,
    height: 175,
    weight: 70,
    target: 65,
    bodyfat: null,
    cardio: 30,
    strength: 0,
    sleep: 7,
    fast: "none",
    kcal: null,
    autoKcal: true,
    protein: "normal",
    med: "none",
    plateau: false
  };

  function segValue(id) {
    var box = document.getElementById(id);
    var on = box.querySelector(".seg__btn.is-on");
    return on ? on.dataset.val : null;
  }

  function collect() {
    var s = {};
    s.sex = segValue("sexSeg") || "male";
    s.age = num($("#age").value);
    s.height = num($("#height").value);
    s.weight = num($("#weight").value);
    s.target = num($("#target").value);
    s.bodyfat = num($("#bodyfat").value);
    s.cardio = parseFloat($("#cardio").value);
    s.strength = parseInt(segValue("strengthSeg") || "0", 10);
    s.sleep = parseFloat($("#sleep").value);
    s.fast = segValue("fastSeg") || "none";
    s.autoKcal = $("#autoKcal").checked;
    s.kcal = s.autoKcal ? null : num($("#kcal").value);
    s.protein = segValue("proteinSeg") || "normal";
    s.med = segValue("medSeg") || "none";
    s.plateau = segValue("plateauSeg") === "yes";
    return s;
  }

  function fastHours(f) {
    if (f === "none") return 0;
    return parseInt(f, 10);
  }

  /* ------------------------------------------------------------------ 계산 */
  function compute(s) {
    var r = { s: s };

    /* 기초대사량 */
    if (s.bodyfat && s.bodyfat > 3 && s.bodyfat < 65) {
      var lbm = s.weight * (1 - s.bodyfat / 100);
      r.bmr = 370 + 21.6 * lbm;
      r.bmrFormula = "Katch-McArdle (제지방량 기준)";
      r.lbm = lbm;
    } else {
      var base = 10 * s.weight + 6.25 * s.height - 5 * s.age;
      r.bmr = base + (s.sex === "male" ? 5 : -161);
      r.bmrFormula = "Mifflin-St Jeor";
      r.lbm = null;
    }

    /* 활동·운동 소비 (MET 기반 추정) */
    var comp = s.cardio > 90 ? 0.9 : 1;          // 과운동 시 에너지 보상 보정
    r.walkKcal = 4.3 * 3.5 * s.weight / 200 * s.cardio * comp;
    r.strengthKcal = 5.0 * 3.5 * s.weight / 200 * 45 * s.strength / 7;
    r.neat = r.bmr * 1.2;
    r.tdee = r.neat + r.walkKcal + r.strengthKcal;
    r.compFactor = comp;

    r.bmi = s.weight / Math.pow(s.height / 100, 2);

    /* 체지방률·목표 */
    r.goalGap = s.target ? s.weight - s.target : 0;

    /* 단백질 기준체중 */
    r.refWeight = r.bmi >= 30 && s.target ? (s.weight + s.target) / 2 : s.weight;
    r.proteinLow = Math.round(r.refWeight * 1.2);
    r.proteinHigh = Math.min(Math.round(r.refWeight * 1.6), Math.round(r.refWeight * 2.0));
    r.proteinPerMeal = Math.max(20, Math.round((r.proteinLow + r.proteinHigh) / 2 / 3.5 / 5) * 5);
    r.refWeightNote = r.bmi >= 30 && s.target
      ? "비만(BMI " + fmt1(r.bmi) + ")이라 조정 체중 " + fmt1(r.refWeight) + "kg 기준으로 계산했어요."
      : "현재 체중 " + fmt1(s.weight) + "kg 기준이에요.";

    /* 실제 섭취가 있을 때 적자율 */
    r.intake = s.kcal;
    r.actualDefPct = s.kcal ? ((r.tdee - s.kcal) / r.tdee) * 100 : null;

    /* ---- 점수 산출 ---- */
    var reasons = [];
    var score = 0;

    function add(pt, txt) {
      score += pt;
      if (pt > 0) reasons.push({ pt: pt, txt: txt });
    }

    /* 유산소 */
    if (s.cardio >= 180) add(3.2, "하루 유산소 <b>" + Math.floor(s.cardio / 60) + "시간 " + (s.cardio % 60) + "분</b> — 과운동 구간입니다. 2시간을 넘기면 추가 소비보다 회복 부족·식욕 증가가 커집니다.");
    else if (s.cardio >= 150) add(2.6, "하루 유산소 <b>" + Math.floor(s.cardio / 60) + "시간 " + (s.cardio % 60) + "분</b> — 적자에 이미 큰 운동량이 더해져 있습니다.");
    else if (s.cardio >= 120) add(2.0, "하루 유산소 <b>2시간 이상</b> — 주 5일 이상 지속되면 대사 적응 위험이 올라갑니다.");
    else if (s.cardio >= 90) add(1.2, "하루 유산소 <b>" + s.cardio + "분</b> — 나쁘지 않지만 단식·적자와 겹치면 부담이 됩니다.");
    else if (s.cardio < 20) add(0.4, "하루 유산소 <b>" + s.cardio + "분</b> — 활동량이 적어 총소비가 낮습니다.");

    /* 단식 */
    var fh = fastHours(s.fast);
    if (fh >= 20) add(2.0, "<b>20시간 이상 단식</b> — 코르티솔과 배고픔 호르몬(그렐린)이 크게 올라 폭식·수분 정체로 이어지기 쉽습니다.");
    else if (fh >= 18) add(1.5, "<b>18시간 이상 단식</b> — 적자가 이미 큰 상태에서 단식까지 길면 근손실과 대사 적응이 빨라집니다.");
    else if (fh >= 16) add(0.75, "<b>16시간 단식</b> — 총 섭취·단백질이 충분하면 문제 없지만, 정체가 왔다면 시간을 늘리기보다 줄이는 쪽을 먼저 봅니다.");
    else if (fh >= 12) add(0.25, "<b>12시간 단식</b> — 무리 없는 범위입니다.");

    /* 수면 */
    if (s.sleep <= 5) add(2.4, "수면 <b>" + fmt1(s.sleep) + "시간</b> — 6시간 미만이면 그렐린↑·렙틴↓, 코르티솔↑로 감량이 가장 크게 막히는 조건입니다.");
    else if (s.sleep < 6) add(2.0, "수면 <b>" + fmt1(s.sleep) + "시간</b> — 6시간 미만 수면은 같은 식단에서도 지방 산화를 떨어뜨립니다.");
    else if (s.sleep < 6.5) add(1.2, "수면 <b>" + fmt1(s.sleep) + "시간</b> — 조금만 더 채우면 식욕 조절이 달라집니다.");
    else if (s.sleep < 7) add(0.8, "수면 <b>" + fmt1(s.sleep) + "시간</b> — 권장(7~9시간)보다 짧습니다.");
    else if (s.sleep > 9) add(0.3, "수면 <b>" + fmt1(s.sleep) + "시간</b> — 너무 길면 활동량이 줄어 총소비가 낮아질 수 있습니다.");

    /* 실제 섭취 */
    if (s.kcal) {
      if (s.kcal < r.bmr * 0.85) add(2.4, "섭취 <b>" + fmt(s.kcal) + "kcal</b>가 기초대사량(" + fmt(r.bmr) + "kcal)의 85% 미만 — 근손실·대사 저하가 확실하게 오는 구간입니다.");
      else if (s.kcal < r.bmr) add(1.2, "섭취 <b>" + fmt(s.kcal) + "kcal</b>가 기초대사량(" + fmt(r.bmr) + "kcal)보다 낮습니다.");
      if (r.actualDefPct >= 35) add(2.6, "실제 적자가 총소비의 <b>" + Math.round(r.actualDefPct) + "%</b> — 30%를 넘는 적자는 대사 적응을 부르고 근육을 태웁니다.");
      else if (r.actualDefPct >= 30) add(2.0, "실제 적자가 총소비의 <b>" + Math.round(r.actualDefPct) + "%</b> — 적자가 과합니다.");
      else if (r.actualDefPct >= 25) add(1.4, "실제 적자가 총소비의 <b>" + Math.round(r.actualDefPct) + "%</b> — 적정(10~20%)보다 큽니다.");
    }

    /* 정체 */
    if (s.plateau) {
      add(0.9, "최근 2주 이상 <b>체중 정체</b> — 노력 대비 결과가 멈춘 상태로, 적자·운동·수면 중 하나는 반드시 조정이 필요합니다.");
    }

    /* 단백질·근력 */
    if (s.protein === "low" && s.strength <= 1) add(0.6, "단백질 <b>부족</b> + 근력운동 <b>" + s.strength + "회</b> — 감량 중 근육이 빠지면 기초대사량이 같이 내려갑니다.");
    else if (s.protein === "low") add(0.3, "단백질 <b>부족</b> — 근손실과 포만감 저하로 이어집니다.");

    if (s.strength >= 5 && s.cardio >= 120) add(1.0, "근력 <b>주 " + (s.strength >= 5 ? "5회+" : s.strength + "회") + "</b> + 유산소 <b>" + s.cardio + "분</b> — 회복일이 없으면 과훈련으로 코르티솔이 올라갑니다.");

    /* 비만약 */
    if (s.med === "glp1" && s.protein === "low") add(0.7, "GLP-1 계열 복용 중 <b>단백질 부족</b> — 식사량이 줄어 근손실 위험이 특히 큽니다.");

    /* 조합 가중치 */
    if (s.cardio >= 150 && fh >= 16) add(0.8, "<b>고단식 + 과운동</b> 조합 — 이 조합이 정체기의 가장 흔한 원인입니다.");
    if (s.cardio >= 120 && s.sleep < 6.5) add(0.5, "<b>과운동 + 수면 부족</b> — 회복이 소비를 따라가지 못합니다.");

    r.reasons = reasons.sort(function (a, b) { return b.pt - a.pt; });
    r.score = score;

    /* ---- 판정 ---- */
    var critical = (s.cardio >= 150 && fh >= 16 && s.sleep < 6.5) ||
      (s.kcal && s.kcal < r.bmr * 0.9 && s.plateau);
    if (critical || score >= 6) r.status = "red";
    else if (score >= 2.5) r.status = "amber";
    else r.status = "green";

    /* ---- 대사 적응 보정 ---- */
    r.adaptPct = r.status === "red" ? 0.15 : r.status === "amber" ? 0.08 : 0;
    r.tdeeAdj = r.tdee * (1 - r.adaptPct);

    /* ---- 감량 칼로리 정책 ---- */
    var planPct = r.status === "red" ? 0.10 : r.status === "amber" ? 0.15 : 0.20;
    if (s.plateau && r.status === "green") planPct = 0.15;
    var floor = Math.max(r.bmr * 1.05, s.sex === "male" ? 1500 : 1200);
    r.targetKcal = Math.round(r.tdeeAdj * (1 - planPct));
    r.floorKcal = Math.round(floor);
    r.floored = false;
    if (r.targetKcal < r.floorKcal) { r.targetKcal = r.floorKcal; r.floored = true; }
    r.deficit = r.tdeeAdj - r.targetKcal;
    r.planPct = Math.round((r.deficit / r.tdeeAdj) * 100);

    /* ---- 속도 ---- */
    r.weeklyLoss = (r.deficit * 7) / 7700;
    r.weeklyPct = (r.weeklyLoss / s.weight) * 100;
    r.maxWeekly = s.weight * 0.01;

    if (r.goalGap > 0) {
      r.weeksToGoal = ((r.goalGap * 7700) / r.deficit) / 7;
      r.goalDate = new Date(Date.now() + r.weeksToGoal * 7 * 24 * 3600 * 1000);
    } else {
      r.weeksToGoal = null;
      r.goalDate = null;
    }
    return r;
  }

  /* --------------------------------------------------------------- 렌더링 */
  function verdictContent(r) {
    var s = r.s;
    if (r.status === "red") {
      return {
        cls: "red",
        badge: "🔴 과운동 · 코르티솔 경고",
        title: "지금은 감량을 멈추고 ‘회복 모드’로 바꿔야 합니다",
        desc: "노력이 부족한 게 아니라 <b>노력이 과해서</b> 몸이 소비를 줄이고 수분을 붙잡고 있는 상태입니다. 과운동·고단식·수면 부족이 겹치면 코르티솔이 올라 지방 분해가 막히고 식욕이 커져요. 10~14일은 적자를 줄이고 회복에 쓰는 편이 결과적으로 더 빨리 빠집니다. 지금 구조를 더 세게 밀면 근육과 대사량만 깎입니다."
      };
    }
    if (r.status === "amber") {
      return {
        cls: "amber",
        badge: "🟡 대사 적응 · 적자 과다 주의",
        title: "대사가 적응하기 시작했습니다 — 적자를 줄이고 리셋하세요",
        desc: "총소비가 서서히 내려가고 몸이 적은 칼로리에 익숙해지는 구간입니다. 이때 운동을 더 늘리면 회복만 나빠지고, 적자를 더 줄이면 근손실이 먼저 옵니다. <b>적자를 10~15%로 낮추고</b> 단백질·수면을 채운 뒤 3~5일 유지 칼로리로 리셋하면 다시 움직입니다."
      };
    }
    return {
      cls: "green",
      badge: "🟢 적정 감량 페이스",
      title: "지금 구조는 유지해도 좋습니다",
      desc: "적자·운동량·수면의 균형이 권장 범위 안에 있습니다. 이 상태에서는 <b>주 체중의 0.5~1%</b>씩 빠지는 것이 정상이고, 더 빨리 빼려고 적자를 늘리면 오히려 대사 적응이 먼저 옵니다. 지금 속도를 2주 단위로 점검하면서 유지하세요."
    };
  }

  function renderVerdict(r) {
    var v = verdictContent(r);
    var reasonsHtml = r.reasons.slice(0, 5).map(function (x) {
      return '<li><span class="r__dot"></span><span>' + x.txt + "</span></li>";
    }).join("");
    if (!reasonsHtml) {
      reasonsHtml = '<li><span class="r__dot"></span><span>특별히 위험한 조합이 없습니다. 적자·운동·수면이 모두 권장 범위예요.</span></li>';
    }
    $("#verdictBox").innerHTML =
      '<div class="verdict verdict--' + v.cls + '">' +
        '<span class="verdict__badge">' + v.badge + "</span>" +
        '<h3 class="verdict__title">' + v.title + "</h3>" +
        '<p class="verdict__desc">' + v.desc + "</p>" +
        '<ul class="reasons">' + reasonsHtml + "</ul>" +
      "</div>";
  }

  function renderMetrics(r) {
    var s = r.s;
    var cards = [];

    cards.push(
      '<div class="metric"><div class="metric__label">기초대사량 BMR</div>' +
      '<div class="metric__value">' + fmt(r.bmr) + "<small>kcal</small></div>" +
      '<div class="metric__sub">' + r.bmrFormula + "</div></div>"
    );
    cards.push(
      '<div class="metric"><div class="metric__label">하루 총소비 TDEE</div>' +
      '<div class="metric__value">' + fmt(r.tdee) + "<small>kcal</small></div>" +
      '<div class="metric__sub">기초 ' + fmt(r.neat) + " + 운동 " + fmt(r.walkKcal + r.strengthKcal) + "</div></div>"
    );
    cards.push(
      '<div class="metric metric--accent"><div class="metric__label">적정 하루 섭취</div>' +
      '<div class="metric__value">' + fmt(r.targetKcal) + "<small>kcal</small></div>" +
      '<div class="metric__sub">총소비의 ' + r.planPct + "% 적자" + (r.floored ? " · 하한선 적용" : "") + "</div></div>"
    );
    if (s.kcal) {
      var diff = s.kcal - r.targetKcal;
      cards.push(
        '<div class="metric"><div class="metric__label">지금 실제 섭취</div>' +
        '<div class="metric__value">' + fmt(s.kcal) + "<small>kcal</small></div>" +
        '<div class="metric__sub">적정량보다 ' + (diff >= 0 ? "" : "-") + fmt(Math.abs(diff)) + "kcal</div></div>"
      );
    }
    cards.push(
      '<div class="metric"><div class="metric__label">BMI</div>' +
      '<div class="metric__value">' + fmt1(r.bmi) + "</div>" +
      '<div class="metric__sub">' + bmiLabel(r.bmi) + "</div></div>"
    );
    cards.push(
      '<div class="metric"><div class="metric__label">예상 감량 속도</div>' +
      '<div class="metric__value">' + fmt1(r.weeklyLoss) + "<small>kg/주</small></div>" +
      '<div class="metric__sub">체중의 ' + fmt1(r.weeklyPct) + "% · 권장 0.5~1%" + (r.planPct <= 10 ? " · 회복기라 느린 게 정상" : "") + "</div></div>"
    );
    if (r.weeksToGoal) {
      cards.push(
        '<div class="metric"><div class="metric__label">목표 ' + fmt1(s.target) + "kg까지</div>" +
        '<div class="metric__value">' + Math.round(r.weeksToGoal) + "<small>주</small></div>" +
        '<div class="metric__sub">' + (Math.round(r.weeksToGoal / 4.345)) + "개월 · " + monthLabel(r.goalDate) + " 전후</div></div>"
      );
    }
    $("#metricGrid").innerHTML = cards.join("");

    /* 에너지 밸런스 바 */
    var maxV = Math.max(r.tdee, s.kcal || 0, r.targetKcal, r.bmr) * 1.02;
    function bar(label, v, cls, note) {
      var w = Math.max(2, (v / maxV) * 100);
      return '<div class="ebar__row"><span class="ebar__label">' + label + '</span>' +
        '<span class="ebar__track"><span class="ebar__fill ' + cls + '" style="width:' + w.toFixed(1) + '%"></span></span>' +
        '<span class="ebar__num">' + fmt(v) + note + "</span></div>";
    }
    var eb = '<div class="ebar"><div class="ebar__title">하루 에너지 밸런스</div>' +
      bar("기초대사량", r.bmr, "ebar__fill--bmr", "") +
      bar("총소비", r.tdeeAdj, "ebar__fill--tdee", "") +
      bar("적정 섭취", r.targetKcal, "ebar__fill--target", "") +
      (s.kcal ? bar("실제 섭취", s.kcal, "ebar__fill--intake", "") : "") +
      "</div>";

    var note = "";
    if (r.adaptPct > 0) {
      note = '<div class="note-box note-box--mint"><b>대사 적응 보정 −' + Math.round(r.adaptPct * 100) + "%</b> — 현재 상태(과운동·적자·수면 부족)에서는 실제 하루 소비가 계산값보다 낮을 가능성이 있어 <b>" + fmt(r.tdeeAdj) + "kcal</b>을 기준으로 잡았습니다. 운동을 줄이고 회복하면 이 보정은 사라집니다.</div>";
    } else {
      note = '<div class="note-box">계산 기준: 기초대사량 × 1.2(비운동 활동) + 걷기·유산소 ' + fmt(r.walkKcal) + "kcal + 근력 " + fmt(r.strengthKcal) + "kcal. 과운동 구간(90분 초과)에는 에너지 보상 보정 0.9를 적용했습니다.</div>";
    }
    $("#adaptNote").innerHTML = eb + note;
  }

  function bmiLabel(b) {
    if (b < 18.5) return "저체중";
    if (b < 23) return "정상 (대한비만학회 기준)";
    if (b < 25) return "과체중";
    if (b < 30) return "1단계 비만";
    if (b < 35) return "2단계 비만";
    return "3단계(고도) 비만";
  }

  function monthLabel(d) {
    return d.getFullYear() + "년 " + (d.getMonth() + 1) + "월";
  }

  function renderRx(r) {
    var s = r.s;
    var rows = [];

    rows.push('<div class="rx__row"><span class="rx__name">단백질' +
      '<span>' + r.refWeightNote + " 끼니당 " + r.proteinPerMeal + "g씩 3~4회로 나눠 주세요.</span></span>" +
      '<span class="rx__val">' + r.proteinLow + "–" + r.proteinHigh + "<small>g</small></span></div>");

    var w1 = Math.round(s.weight * 0.030 * 10) / 10;
    var w2 = Math.round(s.weight * 0.035 * 10) / 10;
    rows.push('<div class="rx__row"><span class="rx__name">수분' +
      '<span>체중 1kg당 30~35mL. 단식 중에는 물만 마셔도 됩니다.</span></span>' +
      '<span class="rx__val">' + fmt1(w1) + "–" + fmt1(w2) + "<small>L</small></span></div>");

    var needElectrolyte = (s.cardio >= 120 || fastHours(s.fast) >= 16);
    var naText = needElectrolyte ? "2,000–3,000" : "2,000";
    rows.push('<div class="rx__row"><span class="rx__name">나트륨' +
      '<span>' + (needElectrolyte ? "땀 배출·긴 단식이 있으면 이 범위까지 보충합니다." : "권장 목표는 2,000mg 이하 — 가공식품을 줄이면 대부분 충족됩니다.") + "</span></span>" +
      '<span class="rx__val">' + naText + "<small>mg</small></span></div>");

    rows.push('<div class="rx__row"><span class="rx__name">마그네슘' +
      "<span>식품 포함 권장량. 보충제는 350mg 이하, 글리시네이트 형태가 위장에 편합니다.</span></span>" +
      '<span class="rx__val">' + (s.sex === "male" ? "350" : "270") + "<small>mg</small></span></div>");

    rows.push('<div class="rx__row"><span class="rx__name">칼륨' +
      "<span>채소·콩·감자·바나나. 신장질환이 있으면 의사와 상의하세요.</span></span>" +
      '<span class="rx__val">3,500<small>mg</small></span></div>');

    rows.push('<div class="rx__row"><span class="rx__name">식이섬유' +
      "<span>단식으로 끼니가 줄면 변비가 오기 쉬워요. 수분과 함께 드세요.</span></span>" +
      '<span class="rx__val">25–30<small>g</small></span></div>');

    $("#rxList").innerHTML = rows.join("");
    $("#rxDesc").innerHTML = "체중 " + fmt1(s.weight) + "kg 기준으로 계산했습니다. " +
      (s.med === "glp1" ? "GLP-1 계열은 식사량이 줄어 단백질이 가장 먼저 부족해집니다." : "감량 중에는 단백질부터 채우는 것이 순서입니다.");

    var extra = [];
    if (s.protein === "low") extra.push("지금은 단백질이 부족한 상태로 넣으셨습니다. 하루 " + r.proteinLow + "g을 최소선으로 잡고, 우유·두부·닭가슴살·단백질 쉐이크로 끼니마다 25~30g을 채우면 포만감과 근손실 방지가 동시에 됩니다.");
    if (fastHours(s.fast) >= 18) extra.push("18시간 이상 단식 중에는 나트륨·칼륨·마그네슘이 빠지기 쉬워 두통·근경련이 생길 수 있습니다. 물에 소금 한 꼬집이나 전해질 정을 활용하세요.");
    if (s.med !== "none") extra.push(MED_LABEL[s.med] + " 복용 중이므로 수분·단백질·전해질을 표시된 범위의 상단으로 잡는 편이 안전합니다. 어지럼·식은땀·심한 피로가 있으면 저혈당일 수 있으니 처방 의사와 상담하세요.");
    if (s.bodyfat && r.lbm) extra.push("제지방량 " + fmt1(r.lbm) + "kg 기준 Katch-McArdle로 계산했습니다. 인바디 측정 오차가 크면 Mifflin-St Jeor 값(체지방률을 비우면 계산)과 비교해 보세요.");
    $("#rxNote").innerHTML = extra.length ? "<b>메모</b> — " + extra.join(" ") : "<b>메모</b> — 표시된 범위는 문헌 권고의 일반 범위입니다. 신장질환·간질환·임신 중이라면 단백질·칼륨·수분 목표를 담당 의사와 먼저 정하세요.";

    return rows;
  }

  function renderPlan(r) {
    var s = r.s;
    var items = [];
    var fh = fastHours(s.fast);

    /* 1. 유산소 */
    var cardioTarget, cardioWhy;
    if (r.status === "red") {
      cardioTarget = "하루 30~45분";
      cardioWhy = "지금 " + s.cardio + "분에서 <b>1/3 수준</b>으로 줄이세요. 10~14일은 회복이 목적입니다. 걷기는 식후 10~15분씩 쪼개면 혈당·소화에도 도움이 됩니다.";
    } else if (r.status === "amber") {
      cardioTarget = "하루 45~60분";
      cardioWhy = "지금 " + s.cardio + "분 → 45~60분 중강도로 낮추고, <b>주 1일은 완전 휴식</b>을 넣으세요. 시간을 줄여도 강도를 중강도(대화가 가능한 수준)로 올리면 소비는 크게 떨어지지 않습니다.";
    } else if (s.cardio > 90) {
      cardioTarget = "하루 45~60분";
      cardioWhy = "지금 " + s.cardio + "분은 유지 가능한 양을 넘기기 쉽습니다. 45~60분으로 줄이고 남는 시간을 수면·근력에 쓰는 편이 총소비에 유리합니다.";
    } else {
      cardioTarget = "하루 40~60분";
      cardioWhy = "지금 " + s.cardio + "분에서 조금만 늘리면 적자를 키우지 않고도 소비를 올릴 수 있습니다. 식후 15분 걷기를 하루 2~3회로 쪼개는 방식이 가장 부담이 적어요.";
    }
    items.push({ cls: r.status, title: "유산소 시간 조정 — " + cardioTarget, body: cardioWhy + ' <span class="plan__now"> · 현재 ' + s.cardio + "분</span>" });

    /* 2. 근력 */
    var strTarget = r.status === "red" ? "주 2회 · 20~30분" : s.strength < 2 ? "주 2~3회 · 40분" : "주 2~3회 유지";
    var strWhy = s.strength < 2
      ? "근력운동은 감량 중 <b>기초대사량을 지키는 유일한 수단</b>입니다. 하체·등·가슴 큰 근육 위주로 주 2~3회면 충분해요."
      : "지금 " + s.strength + "회는 좋은 페이스입니다. 회복일을 확보하고, 무게보다 자세와 반복 수를 챙기세요.";
    if (s.strength >= 5 && s.cardio >= 120) strWhy = "지금 주 " + s.strength + "회는 과훈련 구간입니다. <b>주 3회로 줄이고</b> 수면을 늘리세요. 근육은 운동 중이 아니라 회복 중에 자랍니다.";
    items.push({ cls: s.strength < 2 ? "amber" : r.status, title: "근력운동 — " + strTarget, body: strWhy + ' <span class="plan__now"> · 현재 주 ' + (s.strength >= 5 ? "5회+" : s.strength + "회") + "</span>" });

    /* 3. 단식 */
    var fastTitle, fastWhy;
    if (r.status === "red" && fh >= 16) {
      fastTitle = "단식 12~14시간으로 축소";
      fastWhy = "지금 " + FAST_LABEL[s.fast] + " 단식은 과운동·수면 부족과 겹쳐 코르티솔을 밀어올립니다. <b>2주는 12~14시간으로 줄이고</b>, 체중이 다시 움직이면 주 2회만 16시간을 시도하세요.";
    } else if (r.status === "red") {
      fastTitle = "단식은 그대로, 적자만 줄이기";
      fastWhy = "지금은 단식을 늘릴 때가 아닙니다. 총 섭취를 적정 칼로리까지 올리고, 단식은 12~14시간 이내로 유지하세요.";
    } else if (r.status === "amber" && fh >= 18) {
      fastTitle = "단식 14~16시간으로 축소";
      fastWhy = "18시간 이상을 유지하면서 정체가 왔다면 <b>단식 시간을 줄이는 것이 리셋</b>입니다. 14~16시간으로 낮추고 그만큼 단백질을 채우세요.";
    } else if (r.status === "green" && fh === 0) {
      fastTitle = "단식은 선택, 총량이 우선";
      fastWhy = "단식을 안 해도 감량은 됩니다. 끼니 수를 줄이기 어렵다면 <b>12시간 단식(저녁~아침)</b>부터 시작해 보세요.";
    } else {
      fastTitle = "단식 유지 — " + FAST_LABEL[s.fast];
      fastWhy = "지금 단식 시간은 무리 범위가 아닙니다. 단, 단식 중에도 <b>단백질과 수분</b>은 반드시 채우세요.";
    }
    items.push({ cls: fastTitle.indexOf("축소") >= 0 ? "amber" : "green", title: fastTitle, body: fastWhy });

    /* 4. 수면 */
    var sleepTarget = s.sleep < 7 ? "7~8시간" : "7~9시간 유지";
    items.push({
      cls: s.sleep < 6.5 ? "red" : s.sleep < 7 ? "amber" : "green",
      title: "수면 — " + sleepTarget,
      body: (s.sleep < 7
        ? "수면은 <b>가장 싸게 감량을 돕는 도구</b>입니다. 취침 1시간 전 화면을 끄고, 같은 시간에 자고 일어나세요. 6시간 미만이 이어지면 같은 식단에서도 지방 산화가 떨어집니다."
        : "지금 수면은 충분합니다. 주말에 몰아자기보다 평일 리듬을 일정하게 유지하는 편이 좋아요.") + ' <span class="plan__now"> · 현재 ' + fmt1(s.sleep) + "시간</span>"
    });

    /* 5. 측정 루틴 */
    items.push({
      cls: "green",
      title: "체중은 ‘7일 평균’으로만 판단",
      body: "아침 공복·화장실 후 같은 조건에서 재고, 하루 수치는 버리고 <b>7일 평균</b>만 보세요. 2주 동안 평균이 0.3kg 이상 줄면 정체가 아니고, 그보다 적으면 위 처방을 하나씩 바꿉니다. 허리둘레·인바디 근육량을 함께 보면 근손실을 조기에 잡을 수 있어요."
    });

    /* 6. 리셋 */
    if (r.status === "red" || r.status === "amber" || s.plateau) {
      items.push({
        cls: "amber",
        title: r.status === "red" ? "10~14일 유지 칼로리 리셋" : "3~5일 유지 칼로리 리셋",
        body: "적자를 잠시 0으로 두고 <b>총소비(" + fmt(r.tdeeAdj) + "kcal)</b>만큼 먹습니다. 단백질은 그대로 유지하고, 운동은 절반으로 줄이세요. 리셋은 살이 찌는 기간이 아니라 <b>대사 신호를 되돌리는 기간</b>이고, 이후 같은 적자에서 감량이 다시 시작됩니다."
      });
    }

    $("#planList").innerHTML = items.map(function (it, i) {
      return '<div class="plan__item plan__item--' + it.cls + '">' +
        '<span class="plan__num">' + (i + 1) + "</span>" +
        "<div><div class=\"plan__title\">" + it.title + "</div>" +
        '<div class="plan__body">' + it.body + "</div></div></div>";
    }).join("");
  }

  function renderMed(r) {
    var s = r.s;
    if (s.med === "none") { $("#medBlock").hidden = true; return; }
    $("#medBlock").hidden = false;
    var cards = [];
    if (s.med === "glp1") {
      cards.push('<div class="card card--warn"><div class="card__title">💉 마운자로·위고비 등 GLP-1 계열</div><div class="card__body">' +
        "<p>식사량이 줄어 <b>근손실 비율이 커지는 것</b>이 가장 큰 문제입니다. 체중 1kg당 1.2~1.6g, 끼니당 25~40g의 단백질을 <b>먹을 수 있을 때 먼저</b> 드세요.</p>" +
        "<p>구역감·변비가 있으면 기름진 음식과 탄산을 줄이고, 수분을 " + fmt1(s.weight * 0.03) + "L 이상으로 유지하세요. 위 배출이 늦어져 공복 영양제(철분·아연)는 식후로 옮기는 편이 좋습니다.</p>" +
        "<p><b>저혈당 주의</b> — 설포닐루레아·인슐린을 함께 쓰면 어지럼·식은땀·손떨림이 올 수 있습니다. 증상이 있으면 즉시 당을 보충하고 처방 의사와 상담하세요.</p>" +
        "</div></div>");
      cards.push('<div class="card"><div class="card__title">감량 속도 조절</div><div class="card__body">' +
        "<p>GLP-1로 <b>주 1% 이상</b> 빠지면 근육 손실이 커집니다. " + r.planPct + "% 적자(" + fmt(r.targetKcal) + "kcal)와 주 " + fmt1(r.weeklyLoss) + "kg 속도를 기준으로 잡고, 너무 빠르면 섭취를 조금 늘리세요.</p>" +
        "<p>용량 증량·감량은 반드시 처방 의사와 결정하고, 이 계산기는 참고용으로만 쓰세요.</p>" +
        "</div></div>");
    } else {
      cards.push('<div class="card card--warn"><div class="card__title">기타 비만약 병용</div><div class="card__body">' +
        "<p>처방받은 약의 성분에 따라 식욕·수분·전해질 반응이 다릅니다. 약 이름과 용량을 처방 의사·약사에게 확인하고, 어지럼·두근거림·불면이 생기면 감량을 멈추고 상담하세요.</p>" +
        "<p>카페인·에너지드링크와의 병용은 심박수를 올릴 수 있어 감량기에는 피하는 편이 안전합니다.</p>" +
        "</div></div>");
    }
    $("#medCards").innerHTML = cards.join("");
  }

  function renderPlateau(r) {
    var s = r.s;
    if (!s.plateau) { $("#plateauBlock").hidden = true; return; }
    $("#plateauBlock").hidden = false;
    $("#plateauCards").innerHTML =
      '<div class="card"><div class="card__title">2주 리셋 프로토콜 — 순서대로</div><div class="card__body">' +
      "<p><b>1주차 · 회복</b> — 섭취를 " + fmt(r.tdeeAdj) + "kcal까지 올리고(단백질 " + r.proteinLow + "g 이상), 유산소를 절반으로, 수면을 7시간 이상으로. 체중은 0.5~1kg 늘 수 있는데 <b>수분·글리코겐</b>이며 지방이 아닙니다.</p>" +
      "<p><b>2주차 · 재개</b> — 섭취를 " + fmt(r.targetKcal) + "kcal로 되돌리고 주 3회 근력 + 하루 40~50분 중강도를 유지합니다. 7일 평균 체중이 다시 주 " + fmt1(r.weeklyLoss) + "kg 속도로 줄면 성공입니다.</p>" +
      "<p><b>그래도 안 움직이면</b> — 갑상선(TSH·free T4), 공복혈당·인슐린, 빈혈(페리틴) 검사를 받아보세요. 수면무호흡이 있으면 감량이 거의 진행되지 않습니다.</p>" +
      "</div></div>" +
      '<div class="card"><div class="card__title">정체가 아닐 수도 있어요</div><div class="card__body">' +
      "<p>수분·생리 주기·염분·탄수화물량에 따라 하루 1~2kg은 쉽게 움직입니다. <b>7일 평균</b>으로 2주 이상 0.3kg도 줄지 않았을 때만 정체로 판단하세요. 허리둘레가 줄고 있다면 지방은 빠지고 있는 것입니다.</p>" +
      "</div></div>";
  }

  function renderResult(r) {
    var s = r.s;
    var summary = [];
    summary.push(SEX_LABEL[s.sex] + " " + s.age + "세");
    summary.push(s.height + "cm · " + fmt1(s.weight) + "kg");
    if (s.target) summary.push("목표 " + fmt1(s.target) + "kg");
    summary.push("유산소 " + s.cardio + "분");
    summary.push("근력 주 " + (s.strength >= 5 ? "5회+" : s.strength + "회"));
    summary.push("수면 " + fmt1(s.sleep) + "시간");
    if (fastHours(s.fast)) summary.push("단식 " + FAST_LABEL[s.fast]);
    if (s.kcal) summary.push("섭취 " + fmt(s.kcal) + "kcal");
    summary.push("단백질 " + PROTEIN_LABEL[s.protein]);
    if (s.med !== "none") summary.push(MED_LABEL[s.med]);
    if (s.plateau) summary.push("2주+ 정체");
    $("#resultSub").textContent = summary.join(" · ");

    renderVerdict(r);
    renderMetrics(r);
    renderRx(r);
    renderPlan(r);
    renderMed(r);
    renderPlateau(r);
  }

  /* ------------------------------------------------------------- 결과 복사 */
  function copyResult() {
    var r = lastResult;
    if (!r) return;
    var v = verdictContent(r);
    var lines = [
      "[팩트체크 건강연구소] 대사 정체기 정밀 진단",
      $("#resultSub").textContent,
      "",
      v.badge.replace(/[🔴🟡🟢]\s?/g, "") + " — " + v.title,
      "기초대사량 " + fmt(r.bmr) + "kcal / 총소비 " + fmt(r.tdeeAdj) + "kcal",
      "적정 섭취 " + fmt(r.targetKcal) + "kcal (적자 " + r.planPct + "%)",
      "단백질 " + r.proteinLow + "–" + r.proteinHigh + "g · 수분 " + fmt1(r.s.weight * 0.03) + "–" + fmt1(r.s.weight * 0.035) + "L",
      "예상 감량 " + fmt1(r.weeklyLoss) + "kg/주",
      "",
      "https://hjh7085-bit.github.io/metabolic-calc/",
      "※ 참고용 추정치이며 의학적 진단이 아닙니다."
    ];
    var text = lines.join("\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast("결과를 복사했어요");
      }, function () { toast("복사가 막혀 있어요"); });
    } else {
      toast("복사가 지원되지 않는 브라우저예요");
    }
  }

  var toastTimer = null;
  function toast(msg) {
    var el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("is-on"); }, 2200);
  }

  /* --------------------------------------------------------------- 상호작용 */
  function setSeg(id, val) {
    $$("#" + id + " .seg__btn").forEach(function (b) {
      var on = b.dataset.val === String(val);
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function bindSegs() {
    ["sexSeg", "strengthSeg", "fastSeg", "proteinSeg", "medSeg", "plateauSeg"].forEach(function (id) {
      var box = document.getElementById(id);
      box.addEventListener("click", function (e) {
        var btn = e.target.closest(".seg__btn");
        if (!btn) return;
        setSeg(id, btn.dataset.val);
        syncCount();
      });
    });
  }

  function bindRanges() {
    var cardio = $("#cardio"), sleep = $("#sleep");
    function paint() {
      $("#cardioVal").innerHTML = cardioLabel(parseInt(cardio.value, 10));
      $("#sleepVal").innerHTML = fmt1(parseFloat(sleep.value)) + "<em>시간</em>";
      [cardio, sleep].forEach(function (el) {
        var pct = (el.value - el.min) / (el.max - el.min) * 100;
        el.style.background = "linear-gradient(90deg, var(--mint-strong) 0 " + pct + "%, var(--line-strong) " + pct + "% 100%)";
        el.style.backgroundSize = "100% 6px";
        el.style.backgroundRepeat = "no-repeat";
        el.style.backgroundPosition = "center";
        el.style.borderRadius = "999px";
      });
    }
    cardio.addEventListener("input", paint);
    sleep.addEventListener("input", paint);
    paint();
  }

  function cardioLabel(min) {
    if (min === 0) return "0<em>분</em>";
    if (min < 60) return min + "<em>분</em>";
    var h = Math.floor(min / 60), m = min % 60;
    return h + "<em>시간</em>" + (m ? " " + m + "<em>분</em>" : "");
  }

  function bindKcal() {
    var auto = $("#autoKcal"), kcal = $("#kcal");
    function sync() {
      kcal.disabled = auto.checked;
      if (auto.checked) kcal.value = "";
      kcal.placeholder = auto.checked ? "자동 추정" : "예: 1800";
    }
    auto.addEventListener("change", function () { sync(); syncCount(); });
    sync();
  }

  function countFilled() {
    var n = 0;
    ["age", "height", "weight", "target"].forEach(function (id) { if (num($("#" + id).value)) n++; });
    if (!$("#autoKcal").checked && num($("#kcal").value)) n++;
    return n;
  }

  function syncCount() {
    var n = countFilled();
    $("#countText").textContent = n + "/6 필수 항목 입력";
    $("#countHint").textContent = n >= 3 ? "나머지는 기본값으로 계산합니다" : "나이·키·체중을 넣어주세요";
  }

  function validate() {
    var missing = [];
    var checks = [
      { id: "age", min: 14, max: 90, label: "나이" },
      { id: "height", min: 120, max: 220, label: "키" },
      { id: "weight", min: 30, max: 250, label: "체중" }
    ];
    checks.forEach(function (c) {
      var el = $("#" + c.id);
      var v = num(el.value);
      var bad = v === null || v < c.min || v > c.max;
      el.classList.toggle("is-error", bad);
      if (bad) missing.push(c.label);
    });
    var t = num($("#target").value);
    if (t !== null && (t < 30 || t > 250)) {
      $("#target").classList.add("is-error");
      missing.push("목표 체중");
    } else {
      $("#target").classList.remove("is-error");
    }
    return missing;
  }

  /* --------------------------------------------------------------- 초기화 */
  var lastResult = null;

  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem("fcl-theme"); } catch (e) {}
    var theme = saved || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    var btn = $("#themeToggle");
    if (btn) {
      btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
      btn.setAttribute("aria-label", theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환");
      btn.addEventListener("click", function () {
        var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        btn.setAttribute("aria-pressed", next === "dark" ? "true" : "false");
        btn.setAttribute("aria-label", next === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환");
        try { localStorage.setItem("fcl-theme", next); } catch (e) {}
      });
    }
  }

  function renderColumns() {
    var grid = $("#columnGrid");
    if (!grid) return;
    grid.innerHTML = COLUMNS.map(function (c) {
      return '<a class="column-card" href="' + c.url + '" target="_blank" rel="noopener">' +
        '<span class="column-card__tag">' + c.tag + "</span>" +
        '<span class="column-card__title">' + esc(c.title) + "</span>" +
        '<span class="column-card__meta">칼럼 읽기 <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg></span>' +
        "</a>";
    }).join("");
  }

  function runAnalysis(scroll) {
    var missing = validate();
    if (missing.length) {
      $("#countHint").textContent = missing.join("·") + "을 입력해 주세요";
      var first = document.querySelector(".input.is-error");
      if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    var s = collect();
    var r = compute(s);
    lastResult = r;
    renderResult(r);
    $("#countText").textContent = "진단 완료";
    $("#countHint").textContent = "수치를 바꾸고 다시 진단할 수 있어요";
    var box = $("#result");
    box.hidden = false;
    if (scroll) {
      setTimeout(function () {
        box.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    }
  }

  function init() {
    initTheme();
    renderColumns();
    bindSegs();
    bindRanges();
    bindKcal();
    syncCount();

    ["age", "height", "weight", "target", "bodyfat", "kcal"].forEach(function (id) {
      var el = $("#" + id);
      if (!el) return;
      el.addEventListener("input", function () { el.classList.remove("is-error"); syncCount(); });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); runAnalysis(true); }
      });
    });

    $("#analyzeBtn").addEventListener("click", function () { runAnalysis(true); });
    $("#resetBtn").addEventListener("click", function () {
      ["age", "height", "weight", "target", "bodyfat"].forEach(function (id) { $("#" + id).value = ""; });
      $("#autoKcal").checked = true;
      $("#kcal").disabled = true;
      $("#kcal").value = "";
      setSeg("sexSeg", "male");
      setSeg("strengthSeg", "0");
      setSeg("fastSeg", "none");
      setSeg("proteinSeg", "normal");
      setSeg("medSeg", "none");
      setSeg("plateauSeg", "no");
      $("#cardio").value = 30;
      $("#sleep").value = 7;
      $("#cardio").dispatchEvent(new Event("input"));
      $("#sleep").dispatchEvent(new Event("input"));
      $("#result").hidden = true;
      lastResult = null;
      syncCount();
      $("#checker").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $("#copyBtn").addEventListener("click", copyResult);
    $("#editBtn").addEventListener("click", function () {
      $("#checker").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    var yearEl = $("#year");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
