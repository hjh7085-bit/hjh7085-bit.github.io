/* ==========================================================================
   팩트체크 건강연구소 · 유산균 균주(Strain) 목적별 매칭기
   목적별로 RCT·메타분석 근거가 있는 균주 코드를 정리합니다.
   --------------------------------------------------------------------------
   ⚠️ 공개 논문·임상 가이드를 정리한 참고 자료입니다. 제품 추천·처방이
   아니며, 질환의 진단과 치료를 대신하지 않습니다.
   ========================================================================== */

(function () {
  "use strict";

  var BLOG = "https://blog.naver.com/hjh7085/";

  var COLUMNS = [
    { url: BLOG + "224474970152", tag: "성분 해부", title: "아연만 고용량 먹으면 빈혈 온다? 아연과 구리 15:1 황금비율 팩트" },
    { url: BLOG + "224477169582", tag: "1분 논문 팩트", title: "눈 밑 떨림, 마그네슘 먹어도 안 멈추는 이유 — 산화 vs 글리시네이트" },
    { url: BLOG + "224476159368", tag: "성분 해부", title: "만성 피로·간 수치 잡는 밀크씨슬: 쏜 S.A.T. vs 나우푸드 흡수율 해부" },
    { url: BLOG + "224474981968", tag: "성분 해부", title: "8만 원 노르딕 vs 3만 원 CGN 오메가3 — rTG 성분표 솔직 해부" },
    { url: BLOG + "224474930562", tag: "성분 해부", title: "마운자로 속쓰림·명치 막힘 뚫는 법: 소화효소 2종 솔직 비교" },
    { url: BLOG + "224477176691", tag: "성분 해부", title: "아침 공복 속쓰림에 양배추즙 vs 매스틱검 vs 카베진 성분 해부" }
  ];

  /* ------------------------------------------------------------------ 목적 */
  var GOALS = {
    constipation: {
      label: "변비", sub: "배변 횟수 · 굳기", icon: "🚽",
      note: "배변 횟수와 대장 통과시간을 본 RCT가 기준입니다. 먼저 물·식이섬유·운동을 확인하고, 그다음 균주를 고르세요.",
      refs: "Waller 2011(B. lactis HN019, 대장 통과시간), Ibarra 2018(배변 횟수), Koebnick 2003(L. casei Shirota), Dimidi 2014 메타분석"
    },
    ibs: {
      label: "과민성대장", sub: "복통 · 팽만", icon: "🌀",
      note: "복부 증상 '전체 점수'를 본 연구가 많습니다. 같은 균주도 연구에 따라 효과가 갈려서, 2~4주 반응을 보고 판단하는 것이 현실적입니다.",
      refs: "Whorwell 2006 · O'Mahony 2005(B. infantis 35624), Guglielmetti 2011(B. bifidum MIMBb75), Ducrotté 2012(L. plantarum 299v)"
    },
    vaginal: {
      label: "질건강", sub: "재발성 질염", icon: "🌸",
      note: "세균성 질증(BV) 재발 예방 근거가 중심입니다. 질내 L. crispatus 제품의 근거가 가장 강하고, 경구 제품은 결과가 엇갈립니다.",
      refs: "Cohen 2020(LACTIN-V, CTV-05 Phase 2b), Reid 2003(GR-1/RC-14), 2026 우산형 리뷰"
    },
    immunity: {
      label: "면역·아토피", sub: "아토피 · 감기", icon: "🛡️",
      note: "아토피 피부염 '예방'(임신부·영아) 근거가 가장 많습니다. 이미 생긴 아토피의 치료나 성인 감기 예방 근거는 훨씬 약합니다.",
      refs: "Kalliomäki 2001·2003(LGG), Tan-Lim 2020 네트워크 메타분석(Mix3·Mix8), 2025 우산형 메타분석"
    },
    diarrhea: {
      label: "항생제 설사", sub: "항생제 복용 시", icon: "💧",
      note: "프로바이오틱스 근거가 가장 일관된 영역입니다. 항생제와는 2시간 이상 간격을 두고, 면역 억제·중심정맥관이 있으면 의사와 상의하세요.",
      refs: "Fehily 2024 리뷰, Hungin 2013 국제 가이드, Szajewska 메타분석(S. boulardii)"
    }
  };

  /* ------------------------------------------------------------------ 균주 */
  var STRAINS = [
    {
      code: "LGG", latin: "Lacticaseibacillus rhamnosus GG (ATCC 53103)",
      goals: { diarrhea: "B", immunity: "A", ibs: "C", constipation: "C" },
      cfu: "10⁹~10¹⁰ CFU/일",
      effect: "소아 항생제 관련 설사, 영아 아토피 예방에서 가장 많이 연구된 균주",
      detail: "임신부·영아에게 LGG를 보충했을 때 아토피 발생이 줄었다는 RCT가 있고, 네트워크 메타분석에서도 상위에 올랐습니다. 다만 근거의 질은 '낮음~중간'으로 평가됩니다. 성인 과민성대장에서는 결과가 엇갈립니다.",
      caution: "중증 환자·면역 억제 상태에서는 균혈증 사례 보고. 유당 불내성이 있으면 부형제 확인."
    },
    {
      code: "BB-12", latin: "Bifidobacterium animalis subsp. lactis BB-12",
      goals: { constipation: "B", diarrhea: "B", immunity: "C" },
      cfu: "10⁹~10¹⁰ CFU/일",
      effect: "배변 횟수·변 굳기 개선, 항생제 관련 설사 보조",
      detail: "변비와 항생제 설사에서 여러 연구가 있으나, 단독보다 조합(LGG·La-5 등)으로 연구된 경우가 많습니다. 아토피 연구에서는 LGG와 조합(Mix3)으로 위험 감소가 보고됐습니다.",
      caution: "우유·대두 배지 잔류 가능성. 알레르기가 있으면 원재료 확인."
    },
    {
      code: "HN019", latin: "Bifidobacterium animalis subsp. lactis HN019",
      goals: { constipation: "B", immunity: "C" },
      cfu: "1.8×10⁹~1.7×10¹⁰ CFU/일",
      effect: "대장 통과시간 단축, 변비형에서 배변 횟수 증가",
      detail: "변비 성인 100명 RCT에서 2주 만에 대장 통과시간이 줄었고, 228명 연구에서는 주 3회 미만 배변군에서 주당 배변 횟수가 1.7~2회 늘었습니다. 변이 묽은 사람에게는 효과가 작았습니다.",
      caution: "연구마다 결과가 일부 엇갈립니다(4주 연구에서 전체군 유의차 없음)."
    },
    {
      code: "35624", latin: "Bifidobacterium longum subsp. infantis 35624",
      goals: { ibs: "A" },
      cfu: "1×10⁸ CFU/일",
      effect: "과민성대장증후군 복부 증상 전체 점수 개선 — 재현성 있는 데이터",
      detail: "과민성대장에서 개별 비피도박테리움 균주 중 유일하게 반복 재현된 균주로 평가됩니다. 1×10⁸ CFU 용량에서 복통·팽만·배변 곤란이 함께 줄었습니다.",
      caution: "효과는 '전체 증상' 기준이며 설사형·변비형 모두에 똑같이 듣지는 않습니다."
    },
    {
      code: "MIMBb75", latin: "Bifidobacterium bifidum MIMBb75",
      goals: { ibs: "B" },
      cfu: "1×10⁹ CFU/일",
      effect: "복부 통증·팽만·전반적 증상 개선",
      detail: "위약 대조 RCT에서 전반적 과민성대장 증상과 팽만이 개선됐습니다. 다만 대규모 재현 연구는 적습니다.",
      caution: "국내 유통 제품이 드물어 균주 코드 확인이 어려울 수 있습니다."
    },
    {
      code: "299v", latin: "Lactiplantibacillus plantarum 299v (DSM 9843)",
      goals: { ibs: "B", constipation: "C" },
      cfu: "10¹⁰ CFU/일",
      effect: "과민성대장의 복부팽만·통증 개선 보고",
      detail: "복부팽만 개선 RCT가 있으나, 같은 균주가 오히려 증상을 악화시킨 연구도 있어 결과가 일관되지 않습니다.",
      caution: "증상이 심해지면 2주 안에 중단 판단."
    },
    {
      code: "VSL#3", latin: "8균주 복합 제형 (Lactobacillus·Bifidobacterium·Streptococcus)",
      goals: { ibs: "C" },
      cfu: "제품별 4.5×10¹⁰~9×10¹¹ CFU",
      effect: "과민성대장에서는 결과 혼재, 난치성 포낭염에서는 근거 있음",
      detail: "과민성대장 RCT 두 건에서 위약과 차이가 없었습니다. 게다가 제품의 균주 구성이 시기별로 바뀌어 같은 이름이라도 동일 제품이 아니라는 지적이 있습니다.",
      caution: "균주 구성이 바뀐 이력이 있어 라벨의 실제 균주를 확인해야 합니다."
    },
    {
      code: "CTV-05", latin: "Lactobacillus crispatus CTV-05 (LACTIN-V)",
      goals: { vaginal: "B" },
      cfu: "2×10⁹ CFU/도즈 (질내)",
      effect: "세균성 질증 항생제 치료 후 재발 감소",
      detail: "Phase 2b RCT에서 메트로니다졸 후 CTV-05를 12주간 쓰자 재발률이 45%→30%로 낮아졌고 24주까지 유지됐습니다. 질내 염증 지표도 함께 줄었습니다.",
      caution: "먹는 제품이 아니라 질내 제품입니다. 국내에서는 의료기기·의약품으로 관리될 수 있어 처방·상담이 필요합니다."
    },
    {
      code: "GR-1 + RC-14", latin: "Lactobacillus rhamnosus GR-1 + L. reuteri RC-14",
      goals: { vaginal: "C" },
      cfu: "각 10⁹ CFU, 하루 1~2회",
      effect: "질 내 유산균 정착을 돕는다는 주장 — 임상 결과는 엇갈림",
      detail: "경구 섭취 후 질 내로 이동한다는 개념으로 많이 팔리지만, 메타분석에서는 위약과 차이가 없다는 결과와 효과가 있다는 결과가 함께 나옵니다. 근거의 일관성이 낮습니다.",
      caution: "제품에 GR-1·RC-14 코드가 실제로 적혀 있는지 확인. '질 유산균'이라는 문구만으로는 판단 불가."
    },
    {
      code: "CNCM I-745", latin: "Saccharomyces boulardii CNCM I-745 (효모)",
      goals: { diarrhea: "A" },
      cfu: "250~500mg (약 5×10⁹~10¹⁰ CFU)/일",
      effect: "항생제 관련 설사 예방과 재발 감소 — 가장 일관된 근거",
      detail: "항생제 관련 설사에서 일관되게 효과가 확인된 프로바이오틱스입니다. 세균이 아니라 효모라 항생제에 직접 죽지 않아 병용이 쉽고, 클로스트리디움 재발 감소에도 근거가 있습니다.",
      caution: "중심정맥관·면역 억제·중증 입원 환자에서는 진균혈증 위험. 발열·전신 상태 악화 시 중단하고 진료."
    },
    {
      code: "Shirota", latin: "Lacticaseibacillus casei Shirota (Yakult)",
      goals: { constipation: "B", immunity: "C" },
      cfu: "10⁹~10¹⁰ CFU/일 (발효유 1~2병)",
      effect: "만성 변비에서 배변 횟수·변 상태 개선 보고",
      detail: "변비 성인 RCT에서 배변 빈도와 변 굳기가 개선됐습니다. 발효유 형태라 당(당류) 섭취도 함께 계산해야 합니다.",
      caution: "당류·유당 함량 확인. 당뇨·다이어트 중이면 무가당 제품."
    },
    {
      code: "F19", latin: "Lacticaseibacillus paracasei F19",
      goals: { immunity: "B" },
      cfu: "10⁹~10¹⁰ CFU/일",
      effect: "영아 아토피 예방 가능성",
      detail: "네트워크 메타분석에서 아토피 위험 감소 가능성이 보고됐지만 근거의 확실성은 매우 낮음으로 평가됐습니다.",
      caution: "단독 제품보다 혼합 제품에 들어 있는 경우가 많아 함량 확인 필요."
    },
    {
      code: "BL999 + ST11", latin: "Bifidobacterium longum BL999 + L. paracasei ST11 (Mix8)",
      goals: { immunity: "B" },
      cfu: "각 10⁹ CFU/일",
      effect: "아토피 발생 위험 감소 (네트워크 메타분석 1위)",
      detail: "소아 아토피 예방 네트워크 메타분석에서 위험비 0.46으로 가장 높은 순위를 기록했습니다. 다만 포함된 연구 수가 적고 근거 질이 낮습니다.",
      caution: "임신부·영아 사용은 소아과 상의 후."
    },
    {
      code: "DSM 17938", latin: "Limosilactobacillus reuteri DSM 17938",
      goals: { diarrhea: "C", constipation: "C" },
      cfu: "1×10⁸~1×10⁹ CFU/일",
      effect: "소아 기능성 복통·일부 설사에서 연구됨",
      detail: "영아 산통·기능성 복통 연구가 중심이고, 성인 항생제 설사에서는 근거가 제한적입니다.",
      caution: "영아 사용은 반드시 소아과 상의."
    },
    {
      code: "La-5 + Bb-12", latin: "Lactobacillus acidophilus La-5 + B. lactis Bb-12",
      goals: { diarrhea: "B" },
      cfu: "10⁹~10¹⁰ CFU/일",
      effect: "항생제 관련 설사 예방에서 조합 근거",
      detail: "L. acidophilus 계열 조합은 항생제 관련 설사에서 효과적 프로바이오틱스로 자주 인용됩니다. 단, 조합 제품마다 균주 구성이 달라 같은 이름으로 묶기 어렵습니다.",
      caution: "제품별 균주 코드와 CFU를 직접 확인."
    }
  ];

  var GRADE = {
    A: { label: "A 근거 탄탄", cls: "grade--a", desc: "여러 RCT·메타분석에서 일관된 효과" },
    B: { label: "B 제한적 근거", cls: "grade--b", desc: "RCT 1~2건 또는 근거 질 낮음" },
    C: { label: "C 결과 혼재", cls: "grade--c", desc: "연구마다 엇갈리거나 예비적" }
  };
  var ORDER = { A: 0, B: 1, C: 2 };

  var selected = [];
  var lastResult = null;

  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ------------------------------------------------------------------ 목적 UI */
  function renderGoals() {
    var keys = Object.keys(GOALS);
    $("#goals").innerHTML = keys.map(function (k) {
      var g = GOALS[k];
      var on = selected.indexOf(k) >= 0;
      return '<button class="goal' + (on ? " is-on" : "") + '" type="button" data-goal="' + k + '" aria-pressed="' + (on ? "true" : "false") + '">' +
        '<span class="goal__icon" aria-hidden="true">' + g.icon + '</span>' +
        '<span class="goal__body">' +
        '<span class="goal__title">' + g.label + '</span>' +
        '<span class="goal__sub">' + g.sub + '</span>' +
        '</span>' +
        '<span class="goal__check" aria-hidden="true">✓</span>' +
        '</button>';
    }).join("");
  }

  function toggleGoal(k) {
    var i = selected.indexOf(k);
    if (i >= 0) selected.splice(i, 1);
    else selected.push(k);
    renderGoals();
    if (selected.length) analyze(false);
    else resetResult();
  }

  function resetResult() {
    $("#result").hidden = true;
    lastResult = null;
    $("#countText").textContent = "목적을 고르면 균주가 나옵니다";
    $("#countHint").textContent = "복수 선택 가능";
  }

  /* ------------------------------------------------------------------ 결과 */
  function analyze(scroll) {
    if (!selected.length) { resetResult(); return; }

    var groups = selected.map(function (k) {
      var list = STRAINS.filter(function (s) { return s.goals[k]; })
        .sort(function (a, b) { return ORDER[a.goals[k]] - ORDER[b.goals[k]]; });
      return { key: k, goal: GOALS[k], list: list };
    });

    var total = {};
    groups.forEach(function (g) {
      g.list.forEach(function (s) { total[s.code] = true; });
    });
    var count = Object.keys(total).length;
    var topCount = 0;
    groups.forEach(function (g) {
      g.list.forEach(function (s) { if (s.goals[g.key] === "A") topCount++; });
    });

    lastResult = { groups: groups, count: count };

    $("#resultSub").textContent = groups.map(function (g) { return g.goal.label; }).join(" · ") +
      " · 근거 있는 균주 " + count + "종";

    var hasA = topCount > 0;
    $("#verdictBox").innerHTML = '<div class="verdict verdict--' + (hasA ? "green" : "amber") + '">' +
      '<span class="verdict__badge">' + (hasA ? "🟢" : "🟡") + " 균주 " + count + "종 매칭</span>" +
      '<p class="verdict__title">' + groups.map(function (g) { return g.goal.label; }).join(" + ") + " — 근거 순으로 정리했습니다</p>" +
      '<p class="verdict__desc">라벨에서 <b>균주 코드</b>와 <b>CFU 보장량</b>을 확인하고, 2~4주 써보고 판단하세요. ' +
      (hasA
        ? "A 등급은 여러 임상시험에서 효과가 반복 확인된 균주입니다."
        : "선택한 목적은 근거가 혼재한 영역이라, 제품보다 먼저 원인 진단이 중요합니다.") +
      "</p></div>";

    $("#goalSections").innerHTML = groups.map(function (g) {
      var head = '<div class="block">' +
        '<div class="block__head"><h3 class="block__title">' + g.goal.icon + " " + g.goal.label + "에 근거 있는 균주</h3>" +
        '<span class="count-chip">' + g.list.length + "종</span></div>" +
        '<p class="block__desc">' + esc(g.goal.note) + "</p>";

      var cards = g.list.map(function (s) {
        var grade = s.goals[g.key];
        var gd = GRADE[grade];
        return '<article class="strain ' + gd.cls + '">' +
          '<div class="strain__head">' +
          '<span class="strain__code">' + esc(s.code) + "</span>" +
          '<span class="grade ' + gd.cls + '">' + gd.label + "</span>" +
          "</div>" +
          '<p class="strain__latin">' + esc(s.latin) + "</p>" +
          '<p class="strain__effect">' + esc(s.effect) + "</p>" +
          '<p class="strain__body">' + esc(s.detail) + "</p>" +
          '<p class="strain__meta"><span class="cfu">💊 ' + esc(s.cfu) + "</span></p>" +
          '<p class="strain__caution">⚠️ ' + esc(s.caution) + "</p>" +
          "</article>";
      }).join("");

      var ref = '<p class="src-list" style="margin-top:10px"><span>· ' + esc(g.goal.refs) + "</span></p>";
      return head + '<div class="strains">' + cards + "</div>" + ref + "</div>";
    }).join("");

    $("#result").hidden = false;
    $("#countText").textContent = selected.length + "개 목적 · " + count + "종 매칭";
    $("#countHint").textContent = "목적을 추가로 고르면 함께 보여드려요";

    if (scroll) {
      setTimeout(function () { $("#result").scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
    }
  }

  /* ------------------------------------------------------------------ 복사 */
  function copyResult() {
    if (!lastResult) return;
    var lines = ["[팩트체크 건강연구소] 유산균 균주 매칭"];
    lastResult.groups.forEach(function (g) {
      lines.push("");
      lines.push("■ " + g.goal.label);
      g.list.forEach(function (s) {
        lines.push("· " + s.code + " (" + GRADE[s.goals[g.key]].label + ") — " + s.effect);
        lines.push("   " + s.cfu);
      });
    });
    lines.push("");
    lines.push("https://hjh7085-bit.github.io/strain-guide/");
    lines.push("※ 참고용이며 진단·처방이 아닙니다. 2~4주 반응을 보고 중단을 판단하세요.");
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

  /* ------------------------------------------------------------------ 공통 */
  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem("fcl-theme"); } catch (e) {}
    var theme = saved || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    var btn = $("#themeToggle");
    if (!btn) return;
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
    renderGoals();

    $("#goals").addEventListener("click", function (e) {
      var b = e.target.closest("[data-goal]");
      if (!b) return;
      toggleGoal(b.getAttribute("data-goal"));
    });

    $("#analyzeBtn").addEventListener("click", function () {
      if (!selected.length) { toast("목적을 먼저 선택해 주세요"); return; }
      analyze(true);
    });
    $("#resetBtn").addEventListener("click", function () {
      selected = [];
      renderGoals();
      resetResult();
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
