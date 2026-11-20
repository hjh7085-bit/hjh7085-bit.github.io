/* ==========================================================================
   팩트체크 건강연구소 · 공복혈당·당화혈색소(HbA1c) 환산 & 스파이크 체크기
   입력 수집 + 판정·환산 엔진 + 결과 렌더링
   --------------------------------------------------------------------------
   ⚠️ 판정 기준은 대한당뇨병학회 진료지침과 ADA Standards of Care의 공개
   기준을, 환산은 ADAG 연구식을 인용한 '참고용' 계산입니다. 진단이 아니며,
   약물 조정은 반드시 처방 의사와 상담해야 합니다.
   ========================================================================== */

(function () {
  "use strict";

  var BLOG = "https://blog.naver.com/hjh7085/";

  var COLUMNS = [
    { url: BLOG + "224474981968", tag: "성분 해부", title: "8만 원 노르딕 vs 3만 원 CGN 오메가3 — rTG 성분표 솔직 해부" },
    { url: BLOG + "224476159368", tag: "성분 해부", title: "만성 피로·간 수치 잡는 밀크씨슬: 쏜 S.A.T. vs 나우푸드 흡수율 해부" },
    { url: BLOG + "224474930562", tag: "성분 해부", title: "마운자로 속쓰림·명치 막힘 뚫는 법: 소화효소 2종 솔직 비교" },
    { url: BLOG + "224477176691", tag: "성분 해부", title: "아침 공복 속쓰림에 양배추즙 vs 매스틱검 vs 카베진 성분 해부" },
    { url: BLOG + "224477169582", tag: "1분 논문 팩트", title: "눈 밑 떨림, 마그네슘 먹어도 안 멈추는 이유 — 산화 vs 글리시네이트" },
    { url: BLOG + "224474970152", tag: "1분 논문 팩트", title: "아연만 고용량 먹으면 빈혈 온다? 아연과 구리 15:1 황금비율 팩트" }
  ];

  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : null; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function fmt(n) { return Math.round(n).toLocaleString("ko-KR"); }
  function fmt1(n) { return (Math.round(n * 10) / 10).toLocaleString("ko-KR"); }
  function fmtD(n) { return n.toFixed(1); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ------------------------------------------------------------- 기준 정의 */
  var FPG = { min: 60, max: 200, normal: 100, pre: 126 };
  var A1C = { min: 4.0, max: 9.0, normal: 5.7, pre: 6.5 };
  var PP2 = { min: 60, max: 260, normal: 140, pre: 200 };

  var CLASS = {
    ok: { label: "정상", badge: "tbadge--ok", chip: "🟢" },
    pre: { label: "전당뇨", badge: "tbadge--mid", chip: "🟡" },
    dm: { label: "당뇨 의심", badge: "tbadge--high", chip: "🔴" },
    low: { label: "저혈당 주의", badge: "tbadge--mid", chip: "⚠️" }
  };

  function classOfFpg(v) {
    if (v === null) return null;
    if (v < 70) return "low";
    if (v < FPG.normal) return "ok";
    if (v < FPG.pre) return "pre";
    return "dm";
  }
  function classOfA1c(v) {
    if (v === null) return null;
    if (v < A1C.normal) return "ok";
    if (v < A1C.pre) return "pre";
    return "dm";
  }
  function classOfPp2(v) {
    if (v === null) return null;
    if (v < 70) return "low";
    if (v < PP2.normal) return "ok";
    if (v < PP2.pre) return "pre";
    return "dm";
  }

  function worst(list) {
    var order = { ok: 0, low: 1, pre: 2, dm: 3 };
    var out = null;
    list.forEach(function (c) {
      if (!c) return;
      if (out === null || order[c] > order[out]) out = c;
    });
    return out;
  }

  function eAG(a1c) { return 28.7 * a1c - 46.7; }
  function a1cFrom(mg) { return (mg + 46.7) / 28.7; }
  function mmol(mg) { return mg / 18.0; }

  /* ------------------------------------------------------------------ 입력 */
  function collect() {
    return {
      fpg: num($("#fpg").value),
      pp2: num($("#pp2").value),
      a1c: num($("#a1c").value),
      tg: num($("#tg").value),
      hdl: num($("#hdl").value)
    };
  }

  /* ------------------------------------------------------------------ 계산 */
  function compute(s) {
    var r = { s: s };
    r.cFpg = classOfFpg(s.fpg);
    r.cPp2 = classOfPp2(s.pp2);
    r.cA1c = classOfA1c(s.a1c);
    r.status = worst([r.cFpg, r.cPp2, r.cA1c]);

    r.eagFromA1c = s.a1c ? eAG(s.a1c) : null;
    r.a1cFromFpg = s.fpg ? a1cFrom(s.fpg) : null;
    r.a1cFromEag = s.a1c ? s.a1c : (s.fpg ? a1cFrom(s.fpg) : null);
    r.estimateMode = s.a1c ? "measured" : (s.fpg ? "estimated" : "none");

    /* 어긋남 판정 */
    r.discordant = false;
    r.discordGap = null;
    if (s.a1c && s.fpg) {
      r.discordGap = r.a1cFromFpg - s.a1c;
      if (Math.abs(r.discordGap) >= 0.5) r.discordant = true;
    }

    /* 식후 상승폭 */
    r.excursion = (s.pp2 && s.fpg) ? s.pp2 - s.fpg : null;

    /* TG/HDL */
    if (s.tg && s.hdl) {
      r.ratio = s.tg / s.hdl;
      if (r.ratio < 2.0) r.ratioTier = { key: "ok", label: "낮음 · 인슐린 저항성 가능성 낮음" };
      else if (r.ratio < 3.0) r.ratioTier = { key: "pre", label: "중간 · 참고 관찰 구간" };
      else if (r.ratio < 4.0) r.ratioTier = { key: "dm", label: "높음 · 인슐린 저항성 의심" };
      else r.ratioTier = { key: "dm", label: "매우 높음 · 정밀 확인 권장" };
    }
    return r;
  }

  /* --------------------------------------------------------------- 렌더링 */
  function verdictHTML(r) {
    var s = r.s;
    if (r.status === "dm") {
      return card("red", "🔴 당뇨 의심 구간", "기준을 넘었습니다 — 병원 확진이 필요합니다",
        "공개된 진단 기준(공복 ≥126mg/dL · 식후 2시간 ≥200mg/dL · HbA1c ≥6.5%) 중 <b>하나 이상</b>에 해당합니다. 당뇨병 진단은 같은 검사를 반복하거나 다른 기준을 함께 확인해 확진하므로, 이 결과만으로 단정할 수는 없습니다. 가까운 내과에서 <b>공복혈당·HbA1c 재검</b>과 함께 합병증 확인(안과·신장·신경)을 상담하세요. 당뇨는 초기에 잡을수록 합병증 위험이 크게 줄어듭니다.");
    }
    if (r.status === "pre") {
      return card("amber", "🟡 당뇨병전단계(전당뇨)", "지금이 되돌릴 수 있는 구간입니다",
        "공복혈당 100~125mg/dL 또는 HbA1c 5.7~6.4%에 해당합니다. 아직 병은 아니지만 <b>방치하면 연 5~10%가 당뇨로 진행</b>합니다. 반대로 <b>체중의 5~7%를 줄이고 주 150분 중강도 운동</b>을 하면 진행 위험이 절반 가까이 줄어든다는 대규모 연구(DPP)가 있습니다. 3~6개월 뒤 재검을 잡아두세요.");
    }
    if (r.status === "low") {
      return card("amber", "⚠️ 저혈당 주의", "70mg/dL 미만은 저혈당 범위입니다",
        "공복혈당이 70mg/dL 미만입니다. <b>당뇨약(특히 인슐린·설포닐루레아)을 복용 중이라면 즉시 처방 의사와 상담</b>하세요. 식은땀·손떨림·심한 공복감·어지럼이 있으면 당을 15g 정도 보충하고 15분 뒤 다시 재세요. 반복되는 저혈당은 그 자체로 위험합니다.");
    }
    if (r.status === "ok") {
      return card("green", "🟢 정상 구간", "지금 수치는 정상 범위입니다",
        "공복혈당 100mg/dL 미만, HbA1c 5.7% 미만으로 정상 범위입니다. 다만 <b>정상이어도 식후 급상승(스파이크)이 반복되면</b> 인슐린 저항성이 먼저 진행될 수 있어요. 가족력·복부비만·중성지방 상승이 있다면 아래 TG/HDL 지수와 식사 순서 루틴을 함께 챙기세요.");
    }
    return "";
  }

  function card(tone, badge, title, desc) {
    return '<div class="verdict verdict--' + tone + '">' +
      '<span class="verdict__badge">' + badge + "</span>" +
      '<h3 class="verdict__title">' + title + "</h3>" +
      '<p class="verdict__desc">' + desc + "</p></div>";
  }

  function gaugeRow(title, value, unit, dom, cls, note, labels) {
    if (value === null) return "";
    var pos = clamp((value - dom.min) / (dom.max - dom.min) * 100, 0, 100);
    var w1 = (dom.normal - dom.min) / (dom.max - dom.min) * 100;
    var w2 = (dom.pre - dom.normal) / (dom.max - dom.min) * 100;
    var w3 = 100 - w1 - w2;
    var c = CLASS[cls];
    return '<div class="gauge" style="margin-bottom:18px">' +
      '<div class="slider__top" style="margin-bottom:2px">' +
        '<span class="field__label">' + title + "</span>" +
        '<span class="slider__val">' + fmt1(value) + "<em>" + unit + "</em> " +
          '<span class="tbadge ' + c.badge + '" style="margin-left:6px">' + c.chip + " " + c.label + "</span></span>" +
      "</div>" +
      '<div class="gauge__wrap">' +
        '<div class="gauge__track">' +
          '<span class="gauge__seg gauge__seg--ok" style="width:' + w1.toFixed(1) + '%"></span>' +
          '<span class="gauge__seg gauge__seg--mid" style="width:' + w2.toFixed(1) + '%"></span>' +
          '<span class="gauge__seg gauge__seg--high" style="width:' + w3.toFixed(1) + '%"></span>' +
        "</div>" +
        '<span class="gauge__mark" style="left:' + pos.toFixed(1) + '%"></span>' +
      "</div>" +
      '<div class="gauge__legend">' +
        '<div class="is-ok"><b>정상</b>' + labels[0] + "</div>" +
        '<div class="is-mid"><b>전당뇨</b>' + labels[1] + "</div>" +
        '<div class="is-high"><b>당뇨 의심</b>' + labels[2] + "</div>" +
      "</div>" +
      (note ? '<div class="note-box">' + note + "</div>" : "") +
    "</div>";
  }

  function renderGauges(r) {
    var s = r.s;
    var html = "";
    html += gaugeRow("공복혈당", s.fpg, "mg/dL", FPG, r.cFpg, "8시간 이상 금식 후 정맥혈 기준입니다. 손가락 혈당계는 혈장혈당보다 10~15% 낮게 나올 수 있어요.", ["60–99", "100–125", "126+"]);
    if (s.pp2 !== null) {
      html += gaugeRow("식후 2시간 혈당", s.pp2, "mg/dL", PP2, r.cPp2,
        r.excursion !== null
          ? "공복 대비 상승폭 <b>" + fmt(r.excursion) + "mg/dL</b>" + (r.excursion >= 80 ? " — 상승폭이 큰 편이라 식사 순서·식후 걷기를 함께 보세요." : " — 상승폭은 크지 않습니다.")
          : "식사 시작 후 2시간 기준. 당뇨가 있어도 2시간 목표는 180mg/dL 미만입니다.",
        ["60–139", "140–199", "200+"]);
    }
    var a1cVal = s.a1c ? s.a1c : (r.a1cFromFpg ? r.a1cFromFpg : null);
    if (a1cVal !== null) {
      var cls = classOfA1c(a1cVal);
      if (!s.a1c) cls = r.cFpg || cls; /* 공복혈당으로 추정한 경우 공복 판정과 맞춤 */
      html += gaugeRow("당화혈색소 HbA1c" + (s.a1c ? "" : " (공복혈당으로 추정)"), a1cVal, "%", A1C, cls, null, ["4.0–5.6", "5.7–6.4", "6.5+"]);
    }
    $("#gaugeArea").innerHTML = html;
  }

  function renderVerdict(r) {
    var html = verdictHTML(r);
    var s = r.s;
    var reasons = [];

    if (s.fpg !== null) {
      reasons.push("공복혈당 <b>" + fmt(s.fpg) + "mg/dL</b> → " + CLASS[r.cFpg].label +
        " (정상 &lt;100 · 전당뇨 100–125 · 당뇨 ≥126)");
    }
    if (s.pp2 !== null) {
      reasons.push("식후 2시간 <b>" + fmt(s.pp2) + "mg/dL</b> → " + CLASS[r.cPp2].label +
        " (정상 &lt;140 · 내당능장애 140–199 · 당뇨 ≥200)");
    }
    if (s.a1c !== null) {
      reasons.push("HbA1c <b>" + fmt1(s.a1c) + "%</b> → " + CLASS[r.cA1c].label +
        " (정상 &lt;5.7 · 전단계 5.7–6.4 · 당뇨 ≥6.5)");
    }
    if (!s.a1c && r.a1cFromFpg !== null) {
      reasons.push("공복혈당으로 추정한 HbA1c는 <b>" + fmt1(r.a1cFromFpg) + "%</b>입니다. 참고용 추정치이고, 정확한 값은 혈액검사로 확인하세요.");
    }
    if (r.discordant) {
      reasons.push("공복혈당으로 추정한 HbA1c(" + fmt1(r.a1cFromFpg) + "%)와 실제 HbA1c(" + fmt1(s.a1c) + "%)가 <b>" + fmt1(Math.abs(r.discordGap)) + "%p</b> 차이납니다. 빈혈·혈색소 이상·최근 급격한 혈당 변화가 있으면 두 수치가 어긋날 수 있어 정밀검사가 권장됩니다.");
    }
    if (reasons.length) {
      html = html.replace("</div>", '<ul class="reasons">' + reasons.map(function (t) {
        return '<li><span class="r__dot"></span><span>' + t + "</span></li>";
      }).join("") + "</ul></div>");
    }
    $("#verdictBox").innerHTML = html;
  }

  /* --------------------------------------------------------- eAG 환산 카드 */
  var syncLock = false;

  function paintEag(a1c) {
    a1c = clamp(a1c, 3.5, 18);
    var mg = eAG(a1c);
    $("#a1cSliderNum").value = (Math.round(a1c * 10) / 10).toFixed(1);
    $("#eagNum").value = Math.round(mg);
    $("#eagSub").textContent = fmt1(mmol(mg)) + " mmol/L · 두 칸은 서로 환산됩니다";
    $("#a1cRange").value = clamp(a1c, 3.5, 14);
    var rng = $("#a1cRange");
    var pct = (rng.value - rng.min) / (rng.max - rng.min) * 100;
    rng.style.background = "linear-gradient(90deg, var(--mint-strong) 0 " + pct + "%, var(--line-strong) " + pct + "% 100%)";
    rng.style.backgroundSize = "100% 6px";
    rng.style.backgroundRepeat = "no-repeat";
    rng.style.backgroundPosition = "center";
    rng.style.borderRadius = "999px";
    var cls = classOfA1c(a1c);
    var c = CLASS[cls];
    $("#eagBadges").innerHTML =
      '<span class="tbadge ' + c.badge + '">' + c.chip + " HbA1c " + c.label + "</span>" +
      '<span class="tbadge">추정 평균혈당 ' + fmt(mg) + "mg/dL</span>" +
      '<span class="tbadge">' + fmt1(mmol(mg)) + " mmol/L</span>";
    $("#eagNote").innerHTML = "<b>읽는 법</b> — HbA1c " + fmt1(a1c) + "%는 최근 2~3개월 평균혈당이 약 " + fmt(mg) +
      "mg/dL였다는 뜻입니다. 평균이 같아도 <b>기복이 큰 사람</b>과 <b>고른 사람</b>은 실제 혈관 부담이 다르므로, 공복·식후 혈당을 함께 보세요." +
      (cls === "dm" ? " 현재 슬라이더 값은 <b>당뇨병 진단 기준(6.5% 이상)</b> 구간입니다." : cls === "pre" ? " 현재 값은 <b>당뇨병전단계</b> 구간입니다." : "");
  }

  function bindEag() {
    $("#a1cRange").addEventListener("input", function () {
      if (syncLock) return;
      syncLock = true;
      paintEag(parseFloat(this.value));
      syncLock = false;
    });
    $("#a1cSliderNum").addEventListener("input", function () {
      if (syncLock) return;
      var v = num(this.value);
      if (v === null) return;
      if (v < 3.5 || v > 18) return;
      syncLock = true;
      paintEag(v);
      syncLock = false;
    });
    $("#eagNum").addEventListener("input", function () {
      if (syncLock) return;
      var mg = num(this.value);
      if (mg === null || mg < 40) return;
      syncLock = true;
      paintEag(a1cFrom(clamp(mg, 40, 500)));
      syncLock = false;
    });
  }

  /* ---------------------------------------------------------------- 지질 */
  function renderLipid(r) {
    if (!r.ratio) { $("#lipidBlock").hidden = true; return; }
    $("#lipidBlock").hidden = false;
    var s = r.s;
    var tier = r.ratioTier;
    var tgClass = s.tg >= 200 ? "dm" : s.tg >= 150 ? "pre" : "ok";
    var hdlClass = s.hdl < 40 ? "dm" : s.hdl < 50 ? "pre" : "ok";
    var TG_LABEL = { ok: "정상", pre: "경계", dm: "높음" };
    var HDL_LABEL = { ok: "양호", pre: "경계", dm: "낮음" };
    var tierBg = tier.key === "dm"
      ? "background:linear-gradient(160deg,var(--red-soft),var(--surface) 78%);border-color:color-mix(in srgb,var(--red) 40%,var(--line))"
      : tier.key === "pre"
        ? "background:linear-gradient(160deg,var(--amber-soft),var(--surface) 78%);border-color:color-mix(in srgb,var(--amber) 40%,var(--line))"
        : "";

    $("#lipidArea").innerHTML =
      '<div class="metrics">' +
        '<div class="metric" style="' + tierBg + '"><div class="metric__label">TG / HDL 비율</div>' +
          '<div class="metric__value">' + fmtD(r.ratio) + "</div>" +
          '<div class="metric__sub">' + s.tg + " ÷ " + s.hdl + "</div></div>" +
        '<div class="metric"><div class="metric__label">중성지방 TG</div>' +
          '<div class="metric__value">' + fmt(s.tg) + "<small>mg/dL</small></div>" +
          '<div class="metric__sub">' + TG_LABEL[tgClass] + " (150 미만 정상 · 200 이상 높음)</div></div>" +
        '<div class="metric"><div class="metric__label">HDL 콜레스테롤</div>' +
          '<div class="metric__value">' + fmt(s.hdl) + "<small>mg/dL</small></div>" +
          '<div class="metric__sub">' + HDL_LABEL[hdlClass] + " (50 이상 양호 · 40 미만 낮음)</div></div>" +
      "</div>" +
      '<div class="card" style="margin-top:10px"><div class="card__title"><span class="tbadge ' + CLASS[tier.key].badge + '">' + CLASS[tier.key].chip + " " + tier.label + "</span></div>" +
        '<div class="card__body"><p>' + ratioAdvice(r) + "</p>" +
        "<p>중성지방 150 이상이거나 HDL이 남 40·여 50mg/dL 미만이면 <b>대사증후군 구성요소</b>에 해당합니다. 비율 하나로 진단하지 않고, 공복 인슐린·HOMA-IR·허리둘레·혈압을 함께 봐야 정확합니다.</p></div></div>" +
      '<div class="badge-row">' +
        '<span class="tbadge ' + CLASS[tgClass].badge + '">중성지방 ' + TG_LABEL[tgClass] + "</span>" +
        '<span class="tbadge ' + CLASS[hdlClass].badge + '">HDL ' + HDL_LABEL[hdlClass] + "</span>" +
        '<span class="tbadge">컷오프는 연구마다 2.0~4.0</span>' +
      "</div>" +
      '<div class="note-box"><b>참고</b> — TG/HDL 비율은 인슐린 저항성의 <b>대체 지표</b>입니다. 연구마다 컷오프가 다르고(2.0~4.0), 여성은 2.5·남성은 2.8~3.0 이상을 높음으로 보는 보고가 많습니다. 이 계산은 성별을 받지 않으므로 <b>3.0 이상</b>을 높음으로 표시했습니다.</div>';
  }

  function ratioAdvice(r) {
    var ratio = r.ratio;
    if (ratio < 2.0) {
      return "2.0 미만은 인슐린 저항성 가능성이 낮은 범위입니다. 다만 공복혈당이 100 이상이거나 복부비만이 있으면 비율이 좋아도 안심하지 말고 HbA1c를 함께 확인하세요.";
    }
    if (ratio < 3.0) {
      return "2.0~3.0은 참고 관찰 구간입니다. 중성지방이 150 이상이라면 <b>정제 탄수화물·음주·야식</b>을 4주만 줄여도 수치가 눈에 띄게 내려갑니다. 3~6개월 뒤 재검을 권합니다.";
    }
    return "비율이 3.0 이상으로, <b>인슐린 저항성이 의심되는 범위</b>입니다. 중성지방이 높고 HDL이 낮은 조합은 지방간·고혈압·당뇨 위험과 함께 갑니다. 공복 인슐린·HOMA-IR, 간초음파(지방간), HbA1c를 함께 확인하고 내과 상담을 권합니다.";
  }

  /* ---------------------------------------------------------------- 루틴 */
  function renderRoutine(r) {
    var s = r.s;
    var items = [
      {
        cls: "green", title: "식사 순서 — 채소·단백질 먼저, 탄수화물은 마지막",
        body: "같은 밥 한 공기도 <b>먼저 먹는 것</b>에 따라 식후 혈당 피크가 달라집니다. 채소·나물 → 고기·생선·두부·계란 → 밥·면 순서로 드세요. 탄수화물을 마지막에 먹으면 식후 혈당 상승폭이 완만해진다는 연구가 여러 건 있습니다."
      },
      {
        cls: "green", title: "식후 10~20분 걷기 — 하루 2~3번 쪼개서",
        body: "식후 근육이 포도당을 가져다 쓰기 때문에 <b>식사 후 15~30분 이내</b> 걷기가 식전 걷기보다 식후 혈당 상승폭을 줄이는 데 효과적입니다. 15분씩 하루 3번이면 총 45분, 부담 없이 실천할 수 있어요." + (s.pp2 && r.excursion >= 80 ? " 지금 식후 상승폭이 큰 편이라 특히 중요합니다." : "")
      },
      {
        cls: "amber", title: "한 끼 탄수화물 양과 속도 조절",
        body: "밥은 반 공기부터, 잡곡·현미로 바꾸고 <b>한 끼 20분 이상</b> 천천히 드세요. 액체과당(음료·주스)은 혈당을 가장 빠르게 올립니다. 야식과 음주는 다음 날 아침 공복혈당을 직접 올립니다." + (s.fpg !== null && s.fpg >= 100 ? " 공복혈당이 이미 100을 넘었으니 저녁 탄수화물부터 줄여보세요." : "")
      },
      {
        cls: "green", title: "근력운동 주 2~3회 — 포도당 저장고 늘리기",
        body: "근육은 혈당을 저장하는 가장 큰 창고입니다. 근력운동으로 근육량을 지키면 같은 식사에도 식후 혈당이 덜 올라갑니다. 하체·등 큰 근육 위주로 주 2~3회면 충분해요."
      },
      {
        cls: "amber", title: "수면 7시간 · 스트레스 관리",
        body: "수면 6시간 미만이 이어지면 코르티솔이 올라 <b>아침 공복혈당이 5~10mg/dL 높게</b> 나오는 일이 흔합니다. 취침 1시간 전 화면을 끄고, 같은 시간에 자고 일어나세요."
      }
    ];
    if (s.pp2 && r.excursion >= 80) { /* inline note above */ }

    $("#routineList").innerHTML = items.map(function (it, i) {
      return '<div class="plan__item plan__item--' + it.cls + '">' +
        '<span class="plan__num">' + (i + 1) + "</span>" +
        '<div><div class="plan__title">' + it.title + "</div>" +
        '<div class="plan__body">' + it.body + "</div></div></div>";
    }).join("");
  }

  /* -------------------------------------------------------------- 다음 단계 */
  function renderAdvice(r) {
    var s = r.s;
    var html = "";
    if (r.status === "dm") {
      html += '<div class="card card--danger"><div class="card__title">지금 해야 할 일</div><div class="card__body">' +
        "<p><b>1. 내과 진료 예약</b> — 공복혈당·HbA1c 재검, 필요하면 경구당부하검사(OGTT). 같은 날 두 가지 기준을 만족하면 바로 확진되기도 합니다.</p>" +
        "<p><b>2. 합병증 확인</b> — 당뇨는 진단 시점에 이미 합병증이 있을 수 있어 안과(망막), 신장(소변 알부민), 발·신경 검사를 함께 받습니다.</p>" +
        "<p><b>3. 약은 임의로 시작·중단하지 마세요.</b> 처방은 의사가 정합니다.</p></div></div>";
    } else if (r.status === "pre") {
      html += '<div class="card card--warn"><div class="card__title">전당뇨에서 되돌리는 법</div><div class="card__body">' +
        "<p><b>체중 5~7% 감량</b>이 핵심입니다. " + (s.fpg ? "지금 체중을 모르니" : "") + " 체중을 알고 있다면 그만큼을 3~6개월 목표로 잡으세요. 주 150분 중강도 운동(하루 20~30분)을 함께 하면 진행 위험이 크게 줄어듭니다.</p>" +
        "<p>3~6개월 뒤 <b>공복혈당 + HbA1c</b>를 다시 확인하세요. 두 수치가 계속 오르면 약물 치료 상담이 필요합니다.</p></div></div>";
    } else if (r.status === "low") {
      html += '<div class="card card--warn"><div class="card__title">저혈당이 반복된다면</div><div class="card__body">' +
        "<p>당뇨약(인슐린·설포닐루레아) 복용 중이라면 <b>용량 조정 상담이 먼저</b>입니다. 공복 70 미만이 반복되면 야간 저혈당일 수 있어 새벽 3시 혈당도 확인해 보세요.</p></div></div>";
    } else {
      html += '<div class="card"><div class="card__title">정상이라면</div><div class="card__body">' +
        "<p>1년에 한 번 건강검진을 유지하세요. 가족력(부모·형제 당뇨), BMI 25 이상, 복부비만, 임신성 당뇨 병력이 있으면 <b>HbA1c를 포함</b>해 확인하는 편이 좋습니다.</p>" +
        "<p>공복혈당은 정상인데 식후 혈당이 높은 경우도 있어, 식곤증·갑작스러운 피로가 반복되면 식후 2시간 혈당을 한 번 재보세요.</p></div></div>";
    }
    $("#adviceBlock").hidden = false;
    $("#adviceArea").innerHTML = html;
  }

  /* --------------------------------------------------------------- 분석 실행 */
  var lastResult = null;
  var debounceTimer = null;

  function analyze(scroll) {
    var s = collect();
    var hasAny = s.fpg !== null || s.a1c !== null || s.pp2 !== null || (s.tg !== null && s.hdl !== null);
    if (!hasAny) {
      $("#result").hidden = true;
      $("#countText").textContent = "숫자를 넣으면 자동 계산";
      $("#countHint").textContent = "공복혈당 또는 HbA1c 하나만 있어도 됩니다";
      return;
    }
    if ((s.fpg !== null && (s.fpg < 40 || s.fpg > 600)) || (s.a1c !== null && (s.a1c < 3.5 || s.a1c > 18))) {
      $("#countHint").textContent = "수치 범위를 확인해 주세요";
      return;
    }
    var r = compute(s);
    lastResult = r;

    var summary = [];
    if (s.fpg !== null) summary.push("공복혈당 " + fmt(s.fpg) + "mg/dL");
    if (s.pp2 !== null) summary.push("식후 2시간 " + fmt(s.pp2) + "mg/dL");
    if (s.a1c !== null) summary.push("HbA1c " + fmt1(s.a1c) + "%");
    if (s.a1c === null && r.a1cFromFpg !== null) summary.push("추정 HbA1c " + fmt1(r.a1cFromFpg) + "%");
    if (r.eagFromA1c !== null) summary.push("3개월 평균 약 " + fmt(r.eagFromA1c) + "mg/dL");
    if (r.ratio) summary.push("TG/HDL " + fmtD(r.ratio));
    $("#resultSub").textContent = summary.join(" · ");

    renderVerdict(r);
    renderGauges(r);
    renderLipid(r);
    renderRoutine(r);
    if (r.status) {
      renderAdvice(r);
    } else {
      $("#adviceBlock").hidden = true;
      $("#verdictBox").innerHTML = card("green", "🧬 지질 지수만 계산됨", "혈당 수치는 아직 비어 있습니다",
        "TG/HDL 비율만 계산했습니다. 공복혈당이나 HbA1c를 함께 넣으면 정상·전당뇨·당뇨 의심 구간까지 판정해 드려요.");
    }

    $("#result").hidden = false;
    $("#countText").textContent = "입력 완료";
    $("#countHint").textContent = "수치를 바꾸면 바로 다시 계산합니다";

    /* 슬라이더를 내 수치에 맞춤 */
    if (s.a1c !== null) paintEag(clamp(s.a1c, 3.5, 14));

    if (scroll) {
      setTimeout(function () {
        $("#result").scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    }
  }

  function copyResult() {
    if (!lastResult) return;
    var r = lastResult;
    var s = r.s;
    var lines = ["[팩트체크 건강연구소] 혈당 체크"];
    lines.push($("#resultSub").textContent);
    lines.push("");
    var v = r.status === "dm" ? "당뇨 의심 구간 — 병원 확진 필요" :
      r.status === "pre" ? "당뇨병전단계(전당뇨)" : r.status === "low" ? "저혈당 주의" : "정상 구간";
    lines.push("판정: " + v);
    if (s.a1c !== null) lines.push("HbA1c " + fmt1(s.a1c) + "% → 3개월 평균 약 " + fmt(r.eagFromA1c) + "mg/dL");
    else if (r.a1cFromFpg !== null) lines.push("추정 HbA1c " + fmt1(r.a1cFromFpg) + "% (공복혈당 기준)");
    if (r.ratio) lines.push("TG/HDL 비율 " + fmtD(r.ratio) + " — " + r.ratioTier.label);
    lines.push("");
    lines.push("https://hjh7085-bit.github.io/glucose-lab/");
    lines.push("※ 참고용이며 진단이 아닙니다. 이상 수치는 내과 진료가 필요합니다.");
    var text = lines.join("\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("결과를 복사했어요"); }, function () { toast("복사가 막혀 있어요"); });
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

  /* ---------------------------------------------------------------- 프리셋 */
  var PRESETS = {
    normal: { fpg: 88, pp2: 118, a1c: 5.4, tg: 110, hdl: 58 },
    pre: { fpg: 108, pp2: 152, a1c: 5.9, tg: 168, hdl: 42 },
    dm: { fpg: 132, pp2: 210, a1c: 7.1, tg: 236, hdl: 36 }
  };

  function applyPreset(key) {
    var p = PRESETS[key];
    if (!p) return;
    ["fpg", "pp2", "a1c", "tg", "hdl"].forEach(function (id) {
      $("#" + id).value = p[id] !== undefined ? p[id] : "";
    });
    $$(".preset").forEach(function (b) { b.classList.toggle("is-active", b.dataset.preset === key); });
    analyze(true);
  }

  /* ---------------------------------------------------------------- 초기화 */
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

  function init() {
    initTheme();
    renderColumns();
    bindEag();
    paintEag(5.9);

    ["fpg", "pp2", "a1c", "tg", "hdl"].forEach(function (id) {
      var el = $("#" + id);
      el.addEventListener("input", function () {
        $$(".preset").forEach(function (b) { b.classList.remove("is-active"); });
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () { analyze(false); }, 280);
      });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); analyze(true); }
      });
    });

    $("#analyzeBtn").addEventListener("click", function () { analyze(true); });
    $("#resetBtn").addEventListener("click", function () {
      ["fpg", "pp2", "a1c", "tg", "hdl"].forEach(function (id) { $("#" + id).value = ""; });
      $$(".preset").forEach(function (b) { b.classList.remove("is-active"); });
      $("#result").hidden = true;
      lastResult = null;
      paintEag(5.9);
      $("#countText").textContent = "숫자를 넣으면 자동 계산";
      $("#countHint").textContent = "공복혈당 또는 HbA1c 하나만 있어도 됩니다";
      $("#checker").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $$(".preset").forEach(function (b) {
      b.addEventListener("click", function () { applyPreset(b.dataset.preset); });
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
