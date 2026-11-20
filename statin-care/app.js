/* ==========================================================================
   팩트체크 건강연구소 · 스타틴 복용자 코큐텐·근육통 체크기
   스타틴 종류 × 증상 × 상호작용 → 적신호 · 코큐텐 · 자몽 판정
   --------------------------------------------------------------------------
   ⚠️ 공개 논문·허가사항을 정리한 '참고용' 판정입니다. 약 중단·조정은
   반드시 처방 의사와 상의해야 합니다.
   ========================================================================== */

(function () {
  "use strict";

  var STATINS = {
    atorva: { name: "아토르바스타틴", brand: "리피토", cyp: "CYP3A4", grape: 2, grapeTxt: "AUC 약 2.5배", lipo: "지용성" },
    rosuva: { name: "로수바스타틴", brand: "크레스토", cyp: "CYP2C9·2C19", grape: 0, grapeTxt: "유의한 변화 없음", lipo: "수용성" },
    simva: { name: "심바스타틴", brand: "조코", cyp: "CYP3A4", grape: 3, grapeTxt: "고농도에서 AUC 최대 13.5배", lipo: "지용성" },
    prava: { name: "프라바스타틴", brand: "리바로", cyp: "CYP 비의존", grape: 0, grapeTxt: "유의한 변화 없음", lipo: "수용성" },
    pitava: { name: "피타바스타틴", brand: "리피딜", cyp: "CYP2C9(일부)", grape: 0, grapeTxt: "영향 거의 없음", lipo: "지용성" },
    unknown: { name: "스타틴(종류 모름)", brand: "처방전 확인", cyp: "확인 필요", grape: 1, grapeTxt: "약 종류 확인 필요", lipo: "-" }
  };

  var SYMPTOMS = [
    { id: "thigh", emoji: "🦵", name: "허벅지·종아리 근육통", sub: "양쪽이 비슷하게 아픔", cat: "muscle" },
    { id: "weak", emoji: "🪜", name: "계단·일어나기 힘듦", sub: "힘이 빠지는 느낌", cat: "weak" },
    { id: "cramp", emoji: "🌙", name: "밤에 종아리 쥐", sub: "경련이 자주", cat: "muscle" },
    { id: "shoulder", emoji: "💪", name: "팔 들기 힘듦", sub: "어깨·위팔 통증", cat: "weak" },
    { id: "fatigue", emoji: "😮‍💨", name: "피로가 안 풀림", sub: "온몸이 무거움", cat: "mild" },
    { id: "joint", emoji: "🦴", name: "관절 통증", sub: "무릎·손가락", cat: "mild" },
    { id: "cola", emoji: "🥤", name: "소변이 콜라색", sub: "진한 갈색 소변", cat: "danger" },
    { id: "fever", emoji: "🌡️", name: "발열·오한", sub: "열이 나고 으슬으슬", cat: "danger" },
    { id: "onset", emoji: "📅", name: "약 시작·증량 후 생김", sub: "시점이 맞아떨어짐", cat: "clue" },
    { id: "rechal", emoji: "🔁", name: "끊으면 좋아졌다 재발", sub: "과거 경험", cat: "clue" }
  ];

  var INTERS = [
    { id: "gemfib", emoji: "🧪", name: "피브레이트(젬피브로질)", sub: "고지혈증 복합" },
    { id: "macro", emoji: "💊", name: "마크롤라이드 항생제", sub: "클래리트로마이신 등" },
    { id: "azole", emoji: "🍄", name: "아졸계 항진균제", sub: "이트라코나졸 등" },
    { id: "cyclo", emoji: "🛡️", name: "사이클로스포린", sub: "면역억제제" },
    { id: "dilt", emoji: "❤️", name: "딜티아젬·베라파밀", sub: "혈압·심장약" },
    { id: "amio", emoji: "⚡", name: "아미오다론", sub: "부정맥약" }
  ];

  var INTER_LEVEL = {
    gemfib: { atorva: "red", rosuva: "red", simva: "red", prava: "amber", pitava: "amber", unknown: "amber" },
    macro: { atorva: "red", rosuva: "amber", simva: "red", prava: "amber", pitava: "amber", unknown: "amber" },
    azole: { atorva: "red", rosuva: "amber", simva: "red", prava: "amber", pitava: "amber", unknown: "amber" },
    cyclo: { atorva: "red", rosuva: "red", simva: "red", prava: "red", pitava: "red", unknown: "red" },
    dilt: { atorva: "amber", rosuva: "green", simva: "red", prava: "green", pitava: "green", unknown: "amber" },
    amio: { atorva: "amber", rosuva: "amber", simva: "red", prava: "amber", pitava: "amber", unknown: "amber" }
  };

  var INTER_TEXT = {
    gemfib: "젬피브로질은 스타틴의 근육 부작용 위험을 가장 크게 올리는 약입니다. 함께 처방받았다면 반드시 의사에게 확인하세요.",
    macro: "클래리트로마이신 같은 항생제는 CYP3A4를 강하게 막아 심바·아토르바스타틴 혈중 농도를 끌어올립니다. 처방 전에 스타틴 복용을 알리세요.",
    azole: "이트라코나졸·케토코나졸도 CYP3A4 억제제입니다. 단기 복용이라도 근육통이 생기면 즉시 알리세요.",
    cyclo: "사이클로스포린과의 병용은 스타틴 농도를 크게 올려 횡문근융해 위험이 높습니다. 대부분 병용이 제한됩니다.",
    dilt: "딜티아젬·베라파밀은 심바스타틴 농도를 올립니다. 심바스타틴은 보통 10mg 이하로 제한합니다.",
    amio: "아미오다론은 심바스타틴 용량을 20mg 이하로 제한하는 근거가 있습니다."
  };

  var state = { statin: "atorva", dose: "mid", dur: "mid", grape: "none", coq: "no", sym: {}, inter: {} };
  var lastResult = null;

  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function count(obj) { return Object.keys(obj).filter(function (k) { return obj[k]; }).length; }

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

  /* ---------------------------------------------------------------- render */
  function renderChecklist() {
    $("#symptomList").innerHTML = SYMPTOMS.map(function (s) {
      return '<label class="item">' +
        '<input type="checkbox" data-sym="' + s.id + '">' +
        '<span class="item__box" aria-hidden="true"></span>' +
        '<span class="item__text"><span class="item__name">' + s.emoji + " " + esc(s.name) + "</span>" +
        '<span class="item__sub">' + esc(s.sub) + "</span></span></label>";
    }).join("");
    $("#interList").innerHTML = INTERS.map(function (s) {
      return '<label class="item">' +
        '<input type="checkbox" data-inter="' + s.id + '">' +
        '<span class="item__box" aria-hidden="true"></span>' +
        '<span class="item__text"><span class="item__name">' + s.emoji + " " + esc(s.name) + "</span>" +
        '<span class="item__sub">' + esc(s.sub) + "</span></span></label>";
    }).join("");
  }

  function analyse() {
    var st = STATINS[state.statin];
    var symCount = count(state.sym);
    var has = function (id) { return !!state.sym[id]; };
    var interCount = count(state.inter);
    var redInters = INTERS.filter(function (it) {
      return state.inter[it.id] && INTER_LEVEL[it.id][state.statin] === "red";
    });

    var cola = has("cola");
    var fever = has("fever");
    var weak = has("weak") || has("shoulder");
    var myalgia = has("thigh") || has("cramp") || has("shoulder");

    var grade = "green";
    var level = "low";
    if (cola || (fever && (myalgia || weak))) { grade = "emergency"; level = "emergency"; }
    else if (weak || (myalgia && (has("onset") || has("rechal"))) || (redInters.length && myalgia)) { grade = "high"; level = "high"; }
    else if (symCount > 0 || redInters.length > 0 || (state.grape !== "none" && st.grape >= 2)) { grade = "mid"; level = "mid"; }

    var grapeLevel = 0;
    if (state.grape !== "none") {
      if (st.grape === 3) grapeLevel = 3;
      else if (st.grape === 2) grapeLevel = 2;
      else if (st.grape === 1) grapeLevel = state.grape === "daily" ? 2 : 1;
      else grapeLevel = 0;
    }

    return {
      st: st, statinId: state.statin,
      symCount: symCount, interCount: interCount, redInters: redInters,
      grade: grade, level: level, grapeLevel: grapeLevel,
      cola: cola, fever: fever, weak: weak, myalgia: myalgia,
      clue: has("onset") || has("rechal")
    };
  }

  function verdictHTML(r) {
    var v, badge, title, desc;
    if (r.level === "emergency") {
      v = "red"; badge = "🚨 즉시 진료";
      title = "콜라색 소변·발열이 동반된 근육 증상은 응급입니다";
      desc = "횡문근융해(근육이 녹아 신장을 손상시키는 상태)를 배제해야 합니다. <b>지금 바로 응급실 또는 당일 진료</b>를 받고, 가는 동안 물을 조금씩 마시세요. 스타틴은 의사 확인 후 중단 여부를 정합니다.";
    } else if (r.level === "high") {
      v = "red"; badge = "🔴 오늘 진료";
      title = (r.weak ? "근력이 빠지는 근육 증상" : "복용 후 시작된 근육통") + " — CK 검사가 필요합니다";
      desc = "허벅지·어깨처럼 큰 근육이 아프고 <b>힘이 빠지는 느낌</b>은 단순 근육통과 다릅니다. 약을 임의로 끊지 말고 <b>오늘 의사·약사에게</b> 알리세요. 혈액검사(크레아틴키나제)로 원인을 확인할 수 있습니다.";
    } else if (r.level === "mid") {
      v = "amber"; badge = "🟡 상담 권장";
      title = "지금은 관찰 + 다음 진료 때 상담하세요";
      desc = "증상이 가볍거나, 함께 먹는 약·자몽으로 위험이 올라간 상태입니다. <b>2주간 증상 일지</b>를 쓰고 다음 진료 때 보여주세요. 증상이 심해지면 기다리지 말고 연락하세요.";
    } else {
      v = "green"; badge = "🟢 관찰";
      title = "근육 증상 신호가 없습니다 — 지금처럼 유지하세요";
      desc = "스타틴은 심근경색·뇌졸중 예방 효과가 근육 증상 위험보다 훨씬 큽니다. <b>임의로 끊지 말고</b> 정기 혈액검사만 챙기세요.";
    }
    return '<div class="verdict verdict--' + v + '">' +
      '<span class="verdict__badge">' + badge + "</span>" +
      '<h3 class="verdict__title">' + title + "</h3>" +
      '<p class="verdict__desc">' + desc + "</p>" +
      '<ul class="reasons">' +
      '<li><span class="r__dot"></span><span>복용 중인 약: <b>' + esc(r.st.name) + " (" + esc(r.st.brand) + ")</b> · 자몽 위험 " +
      (r.st.grape >= 3 ? "<b>매우 높음</b>" : r.st.grape === 2 ? "높음" : r.st.grape === 1 ? "확인 필요" : "낮음") + "</span></li>" +
      '<li><span class="r__dot"></span><span>체크한 근육 증상 <b>' + r.symCount + "개</b> · 위험 상호작용 약 <b>" + r.redInters.length + "개</b></span></li>" +
      "</ul></div>";
  }

  function summaryHTML(r) {
    function card(val, unit, label, cls) {
      return '<div class="summary__card' + (cls ? " summary__card--" + cls : "") + '">' +
        '<div class="summary__num">' + val + (unit ? '<small style="font-size:12px;font-weight:700;color:var(--ink-3)"> ' + unit + "</small>" : "") + "</div>" +
        '<div class="summary__label">' + label + "</div></div>";
    }
    var gLabel = r.grapeLevel === 3 ? "매우 높음" : r.grapeLevel === 2 ? "높음" : r.grapeLevel === 1 ? "확인" : "낮음";
    return card(String(r.symCount), "개", "근육 증상") +
      card(String(r.redInters.length), "개", "위험 상호작용", r.redInters.length ? "red" : "green") +
      card(gLabel, "", "자몽 위험도", r.grapeLevel >= 2 ? "amber" : "green");
  }

  function redFlagHTML(r) {
    var rows = [
      { on: r.cola, t: "소변이 콜라색·진한 갈색", d: "근육 단백질(미오글로빈)이 소변으로 나오는 신호입니다. 신장 손상 위험이 있어 즉시 응급 평가가 필요합니다." },
      { on: r.fever, t: "발열·오한 + 근육통", d: "감염이거나 횡문근융해일 수 있습니다. 해열제로 넘기지 말고 진료하세요." },
      { on: r.weak, t: "계단 오르기·팔 들기가 힘들다", d: "근력 저하는 단순 근육통과 구분되는 신호입니다. CK 수치를 확인해야 합니다." },
      { on: r.symCount > 0 && r.clue, t: "약 시작·증량 직후 시작된 양쪽 큰 근육 통증", d: "인과관계가 의심되는 패턴입니다. 복용 시점과 증상 시작일을 적어 가세요." }
    ];
    return rows.map(function (x) {
      return '<div class="card' + (x.on ? " card--danger" : "") + '">' +
        '<h4 class="card__title">' + (x.on ? "⚠️ 체크됨 · " : "· ") + esc(x.t) + "</h4>" +
        '<div class="card__body"><p>' + x.d + "</p></div></div>";
    }).join("") +
      '<div class="insight" style="margin-top:10px">어느 하나도 해당하지 않으면 응급은 아닙니다. 다만 <b>증상이 2주 이상 지속</b>되면 진료 때 반드시 말하세요 — 대부분은 용량 조정이나 다른 스타틴으로 해결됩니다.</div>';
  }

  function coqHTML(r) {
    function metric(label, value, sub, accent) {
      return '<div class="metric' + (accent ? " metric--accent" : "") + '"><div class="metric__label">' + label + "</div>" +
        '<div class="metric__value">' + value + "</div>" +
        '<div class="metric__sub">' + sub + "</div></div>";
    }
    return metric("혈중 코큐텐 감소", "16~54<small>%</small>", "스타틴 복용 후 보고된 범위") +
      metric("연구 용량", "100~600<small>mg</small>", "무작위 시험에서 쓴 하루 용량") +
      metric("근거 수준", "엇갈림", "RCT 7개(389명) vs 대규모 설문") +
      metric("내 복용 상태", state.coq === "yes" ? "복용 중" : "미복용", state.coq === "yes" ? "효과·상호작용 확인 필요" : "증상 있으면 시험 가능", true);
  }

  function coqPickHTML(r) {
    var t, d;
    if (state.coq === "yes" && r.symCount > 0) {
      t = "코큐텐을 먹고 있는데 증상이 있다면 — 약 조정 상담이 먼저입니다";
      d = "코큐텐을 임의로 <b>고용량까지 늘리는 것은 권하지 않습니다.</b> 근거가 약하고, 와파린을 함께 먹으면 항응고 효과가 약해질 수 있습니다. 다음 진료 때 코큐텐 복용 사실과 증상 일지를 함께 이야기하세요.";
    } else if (state.coq === "yes") {
      t = "복용 중 — 계속해도 되지만 기대치는 낮추세요";
      d = "증상이 없다면 코큐텐이 스타틴 근육통을 <b>예방한다는 근거는 약합니다.</b> 비용이 부담되면 중단해도 무방하며, 중단·지속은 취향의 문제입니다. 와파린 복용자는 INR 확인이 필요합니다.";
    } else if (r.symCount > 0) {
      t = "증상이 있으니 4~8주 시험해 볼 수 있습니다";
      d = "<b>유비퀴놀 100~200mg</b>을 식사와 함께, 4~8주만 먹어 보고 증상 점수를 적어 두세요. 좋아지지 않으면 계속 살 이유가 없습니다. 시작 전 의사·약사에게 알리고, 증상이 심하면 코큐텐보다 <b>약 조정 상담</b>이 먼저입니다.";
    } else {
      t = "증상이 없다면 굳이 챙길 이유가 약합니다";
      d = "코큐텐은 스타틴의 콜레스테롤 저하·심혈관 이득을 대체하지 않습니다. 운동 수행능력이나 피로가 신경 쓰인다면 의사와 상의 후 <b>4~8주 시험</b> 정도가 합리적입니다.";
    }
    return '<div class="card"><h4 class="card__title">🧴 내 상황에 맞는 코큐텐 판단</h4><div class="card__body"><p><b>' + t + "</b></p><p>" + d + "</p></div></div>";
  }

  function statinTable(r) {
    var order = ["simva", "atorva", "rosuva", "prava", "pitava"];
    return order.map(function (id) {
      var s = STATINS[id];
      var g = s.grape >= 3 ? "🔴 매우 높음" : s.grape === 2 ? "🟡 높음" : "🟢 낮음";
      return "<tr" + (id === r.statinId ? ' class="is-best"' : "") + "><td><b>" + esc(s.name) + "</b>" +
        (id === r.statinId ? ' <span class="rank">복용 중</span>' : "") + "</td>" +
        "<td>" + esc(s.brand) + "</td><td>" + g + "<em>" + esc(s.grapeTxt) + "</em></td><td>" + esc(s.cyp) + "</td></tr>";
    }).join("");
  }

  function interHTML(r) {
    var reds = [];
    INTERS.forEach(function (it) {
      if (!state.inter[it.id]) return;
      var lvl = INTER_LEVEL[it.id][state.statin] || "amber";
      reds.push({ it: it, lvl: lvl });
    });
    if (state.grape !== "none" && r.grapeLevel >= 1) {
      reds.push({
        it: { name: "자몽주스·자몽", emoji: "🍊" },
        lvl: r.grapeLevel >= 2 ? "red" : "amber",
        text: "현재 복용 중인 " + r.st.name + "은 " + (r.st.grape >= 2 ? "자몽의 영향을 받습니다. " : "자몽 영향은 크지 않지만, ") + "자몽 효과는 마지막 섭취 후 3~7일 남습니다."
      });
    }
    if (!reds.length) {
      return '<div class="rule-empty">체크한 상호작용 약이 없습니다. 새 약을 처방받을 때마다 <b>“스타틴을 먹고 있다”</b>고 말하는 것만으로 대부분의 사고를 막을 수 있습니다.</div>';
    }
    var sorted = reds.slice().sort(function (a, b) {
      var o = { red: 0, amber: 1, green: 2 };
      return o[a.lvl] - o[b.lvl];
    });
    return '<div class="rules"><div class="rule-list">' + sorted.map(function (x) {
      var label = x.lvl === "red" ? "피해야 함" : x.lvl === "amber" ? "주의" : "낮음";
      return '<div class="rule rule--' + x.lvl + '">' +
        '<div class="rule__head"><span class="rule__level">' + label + "</span>" +
        '<span class="rule__title">' + (x.it.emoji || "") + " " + esc(x.it.name) + "</span></div>" +
        '<div class="rule__body">' + (x.text || INTER_TEXT[x.it.id] || "") + "</div></div>";
    }).join("") + "</div></div>";
  }

  function planHTML(r) {
    return '<div class="plan__item"><div class="plan__num">1</div><div>' +
      '<div class="plan__title">2주 증상 일지</div>' +
      '<div class="plan__body">아픈 <b>위치(허벅지·어깨 등), 좌우 대칭, 강도(0~10), 시작일, 약 복용 시각</b>을 매일 적으세요. 이 기록이 용량 조정의 근거가 됩니다. 앱 메모로 충분합니다.</div></div></div>' +
      '<div class="plan__item"><div class="plan__num">2</div><div>' +
      '<div class="plan__title">혈액검사 — CK·갑상선·비타민D</div>' +
      '<div class="plan__body">크레아틴키나제(CK)로 근육 손상 여부를 봅니다. 갑상선 기능 저하와 비타민D 결핍도 근육통을 악화시키므로 함께 확인할 가치가 있습니다.</div></div></div>' +
      '<div class="plan__item plan__item--amber"><div class="plan__num">3</div><div>' +
      '<div class="plan__title">약은 의사와 함께 조정</div>' +
      '<div class="plan__body">선택지는 <b>용량 감량, 다른 스타틴으로 교체, 격일 복용, 에제티미브 병용</b>입니다. ' +
      "스타틴을 완전히 끊는 사람은 3~5%뿐이고, 대부분은 방법을 바꿔 LDL을 관리할 수 있습니다.</div></div></div>";
  }

  function mythHTML() {
    var items = [
      { t: "“근육이 아프면 스타틴을 끊어야 한다”", d: "아닙니다. 끊으면 심근경색·뇌졸중 예방 효과를 잃습니다. <b>용량·종류를 바꾸는 것</b>으로 대부분 해결됩니다." },
      { t: "“코큐텐을 먹으면 콜레스테롤약을 계속 먹어도 안전하다”", d: "코큐텐은 근육 증상을 <b>막아 준다는 근거가 약합니다.</b> 안전을 보장하는 영양제가 아니라 시험해 보는 선택지입니다." },
      { t: "“자몽은 약 먹는 날만 피하면 된다”", d: "아닙니다. 자몽의 효소 억제 효과는 <b>3~7일</b> 지속됩니다. 복용 기간 내내 피하는 편이 안전합니다." }
    ];
    return items.map(function (x) {
      return '<div class="card"><h4 class="card__title">❌ ' + esc(x.t) + '</h4><div class="card__body"><p>' + x.d + "</p></div></div>";
    }).join("");
  }

  function render(r) {
    lastResult = r;
    $("#resultSub").textContent = r.st.name + "(" + r.st.brand + ") 복용 · 근육 증상 " + r.symCount + "개 · 상호작용 약 " +
      (count(state.inter)) + "개 기준 판정입니다.";
    $("#verdictBox").innerHTML = verdictHTML(r);
    $("#summaryBox").innerHTML = summaryHTML(r);
    $("#redFlagArea").innerHTML = redFlagHTML(r);
    $("#redFlagTitle").textContent = r.level === "emergency"
      ? "🚨 지금 바로 응급 — 내가 체크한 적신호"
      : r.level === "high"
        ? "🚨 오늘 진료 — 내가 체크한 적신호"
        : "🚨 이런 증상이 있으면 즉시 진료";
    $("#coqMetrics").innerHTML = coqHTML(r);
    $("#coqPick").innerHTML = coqPickHTML(r);
    $("#statinBody").innerHTML = statinTable(r);
    $("#interArea").innerHTML = interHTML(r);
    $("#planList").innerHTML = planHTML(r);
    $("#mythArea").innerHTML = mythHTML();
    $("#result").hidden = false;

    $("#countText").textContent = "근육 증상 " + r.symCount + "개 · " +
      (r.level === "emergency" ? "즉시 진료" : r.level === "high" ? "오늘 진료" : r.level === "mid" ? "상담 권장" : "관찰");
    $("#countHint").textContent = "위험 상호작용 " + r.redInters.length + "개 · 자몽 " + (r.grapeLevel >= 2 ? "주의" : "낮음");
  }

  function refresh(scroll) {
    var r = analyse();
    render(r);
    if (scroll) {
      var el = $("#result");
      var top = el.getBoundingClientRect().top + window.pageYOffset - 10;
      window.scrollTo({ top: top, behavior: "smooth" });
    }
    return r;
  }

  function copyResult() {
    if (!lastResult) return;
    var r = lastResult;
    var text = "【스타틴 근육통·코큐텐 체크】\n" +
      "· 스타틴: " + r.st.name + " (" + r.st.brand + ") · 자몽 위험: " + (r.st.grape >= 3 ? "매우 높음" : r.st.grape === 2 ? "높음" : "낮음") + "\n" +
      "· 근육 증상: " + r.symCount + "개 · 위험 상호작용: " + r.redInters.length + "개\n" +
      "· 판정: " + (r.level === "emergency" ? "즉시 응급 진료" : r.level === "high" ? "오늘 진료(CK 검사)" : r.level === "mid" ? "2주 일지 후 상담" : "관찰") + "\n" +
      "· 코큐텐: 스타틴 복용 시 혈중 16~54% 감소하나, 근육통 개선 근거는 엇갈림(100~200mg 4~8주 시험 가능)\n" +
      "※ 참고용 정보 (팩트체크 건강연구소) — 약 중단·조정은 처방 의사와 상의";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("결과를 복사했습니다"); },
        function () { toast("복사가 차단되었습니다"); });
    } else {
      toast("이 브라우저에서는 복사가 지원되지 않습니다");
    }
  }

  /* ------------------------------------------------------------------ events */
  function bindSeg(sel, attr, setter) {
    $$(sel + " .seg__btn").forEach(function (b) {
      b.addEventListener("click", function () {
        setter(b.getAttribute(attr));
        $$(sel + " .seg__btn").forEach(function (x) { x.classList.toggle("is-on", x === b); });
        refresh(false);
      });
    });
  }

  function init() {
    initTheme();
    renderChecklist();

    bindSeg("#statinSeg", "data-statin", function (v) { state.statin = v; });
    bindSeg("#doseSeg", "data-dose", function (v) { state.dose = v; });
    bindSeg("#durSeg", "data-dur", function (v) { state.dur = v; });
    bindSeg("#grapeSeg", "data-grape", function (v) { state.grape = v; });
    bindSeg("#coqSeg", "data-coq", function (v) { state.coq = v; });

    $("#symptomList").addEventListener("change", function (e) {
      var id = e.target.getAttribute("data-sym");
      if (!id) return;
      state.sym[id] = e.target.checked;
      refresh(false);
    });
    $("#interList").addEventListener("change", function (e) {
      var id = e.target.getAttribute("data-inter");
      if (!id) return;
      state.inter[id] = e.target.checked;
      refresh(false);
    });

    $("#calcBtn").addEventListener("click", function () { refresh(true); });
    $("#resetBtn").addEventListener("click", function () {
      state.statin = "atorva"; state.dose = "mid"; state.dur = "mid"; state.grape = "none"; state.coq = "no";
      state.sym = {}; state.inter = {};
      $$("#statinSeg .seg__btn").forEach(function (b) { b.classList.toggle("is-on", b.getAttribute("data-statin") === "atorva"); });
      $$("#doseSeg .seg__btn").forEach(function (b) { b.classList.toggle("is-on", b.getAttribute("data-dose") === "mid"); });
      $$("#durSeg .seg__btn").forEach(function (b) { b.classList.toggle("is-on", b.getAttribute("data-dur") === "mid"); });
      $$("#grapeSeg .seg__btn").forEach(function (b) { b.classList.toggle("is-on", b.getAttribute("data-grape") === "none"); });
      $$("#coqSeg .seg__btn").forEach(function (b) { b.classList.toggle("is-on", b.getAttribute("data-coq") === "no"); });
      $$("#symptomList input, #interList input").forEach(function (x) { x.checked = false; });
      refresh(false);
      toast("체크를 초기화했습니다");
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

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
