/* ==========================================================================
   팩트체크 건강연구소 · GLP-1 비만약 부작용 대처 플로우차트
   증상별 기전 → 오늘 먹을 것/피할 것 → 진료 적신호
   --------------------------------------------------------------------------
   ⚠️ 허가사항·공개 임상 자료를 정리한 참고 정보입니다. 용량 변경·중단은
   처방 의사의 판단이며, 응급 증상은 즉시 진료가 필요합니다.
   ========================================================================== */

(function () {
  "use strict";

  var BLOG = "https://blog.naver.com/hjh7085/";

  var COLUMNS = [
    { url: BLOG + "224474930562", tag: "성분 해부", title: "마운자로 속쓰림·명치 막힘 뚫는 법: 소화효소 2종 솔직 비교" },
    { url: BLOG + "224477176691", tag: "성분 해부", title: "아침 공복 속쓰림에 양배추즙 vs 매스틱검 vs 카베진 성분 해부" },
    { url: BLOG + "224474970152", tag: "성분 해부", title: "아연만 고용량 먹으면 빈혈 온다? 아연과 구리 15:1 황금비율 팩트" },
    { url: BLOG + "224477169582", tag: "1분 논문 팩트", title: "눈 밑 떨림, 마그네슘 먹어도 안 멈추는 이유 — 산화 vs 글리시네이트" },
    { url: BLOG + "224476159368", tag: "성분 해부", title: "만성 피로·간 수치 잡는 밀크씨슬: 쏜 S.A.T. vs 나우푸드 흡수율 해부" },
    { url: BLOG + "224474981968", tag: "성분 해부", title: "8만 원 노르딕 vs 3만 원 CGN 오메가3 — rTG 성분표 솔직 해부" }
  ];

  var SYMPTOMS = [
    {
      id: "sulfur", label: "유황트림", sub: "계란 썩은 냄새 트림", icon: "💨",
      freq: "위고비 2.4mg 7%(위약 1% 미만) · 젭바운드 5mg 5% · 마운자로 2~3%(위약 0.4%)",
      mech: "GLP-1 계열은 위 배출을 늦춥니다. 음식이 위에 오래 머물면 단백질·황 함유 식품이 분해되며 황화수소 같은 냄새 나는 가스가 생기고, 이것이 트림으로 올라옵니다. 허가사항에는 트림(eructation)이 이상반응으로 기록되어 있지만, '위 배출 지연이 트림의 원인'이라고 직접 명시하지는 않습니다.",
      eat: [
        "물을 한 번에 많이 말고 조금씩 자주",
        "저지방 단백질 — 닭가슴살·두부·흰살생선·그릭요거트",
        "생강차, 페퍼민트차(역류가 있으면 페퍼민트는 피하기)",
        "한 끼 양을 30% 줄이고 4~5끼로 나누기, 20분 이상 천천히"
      ],
      avoid: [
        "계란·양파·마늘·브로콜리·양배추를 한 번에 많이",
        "탄산음료·맥주(가스를 직접 넣습니다)",
        "튀김·삼겹살 같은 고지방 식사",
        "취침 3시간 전 식사, 늦은 야식"
      ],
      flags: [
        "트림이 3일 이상 계속되면서 오른쪽 윗배가 아프고 열이 난다 → 담낭 문제일 수 있음",
        "등으로 뻗치는 심한 복통과 구토가 함께 온다 → 췌장염 의심, 즉시 진료",
        "체중과 무관하게 검은 변·토혈이 있다 → 즉시 진료"
      ],
      tip: "트림 자체보다 '같이 오는 통증'이 신호입니다. 통증이 없으면 식사 구성과 속도만 바꿔도 2주 안에 크게 줄어듭니다."
    },
    {
      id: "constipation", label: "변비", sub: "배변이 멈춤", icon: "🚽",
      freq: "세마글루타이드 임상에서 최대 24% · 티르제파타이드도 흔함",
      mech: "위·장 운동이 느려지고, 식사량 자체가 줄면서 수분·섬유 섭취가 함께 줄어듭니다. 여기에 구역 때문에 물을 덜 마시면 변이 단단해져 악순환이 됩니다.",
      eat: [
        "물 하루 1.5~2L — 소변 색이 연한 노랑이 될 때까지",
        "키위 2개, 자두(푸룬) 3~4알, 무가당 요거트",
        "차전자피 같은 수용성 섬유 — 반드시 물 한 컵과 함께",
        "올리브유 1큰술, 아침 공복 미지근한 물",
        "마그네슘 보충은 신장 기능 확인 후 의사·약사와 상의"
      ],
      avoid: [
        "섬유질만 갑자기 확 늘리기(가스·팽만 악화)",
        "자극성 완하제(센나) 상습 사용",
        "카페인 과다, 이뇨제 남용",
        "구역 때문에 물까지 안 마시는 것"
      ],
      flags: [
        "1주 이상 배변이 없고 배가 단단하게 부풀며 구토·가스 정지 → 장폐색 의심, 응급",
        "혈변, 체중 감소, 야간 복통이 동반 → 다른 질환 검사 필요",
        "복통이 점점 심해지고 위치가 바뀐다 → 즉시 진료"
      ],
      tip: "변비는 '변의 굳기'부터 봅니다. 물과 유분을 먼저 늘리고, 그래도 1주에 2회 미만이면 의사에게 알려 완하제·용량 조정을 상의하세요."
    },
    {
      id: "nausea", label: "메스꺼움 · 속쓰림", sub: "울렁거림·역류", icon: "🤢",
      freq: "세마글루타이드 구역 최대 44% · 대개 증량 직후에 심하고 적응되며 감소",
      mech: "위 배출이 늦어져 음식이 머무는 시간이 길고, 위산이 역류하기 쉽습니다. 여기에 GLP-1이 뇌의 구역 중추에 직접 작용해 울렁거림이 생깁니다. 대부분 용량을 올린 직후 1~2주에 몰립니다.",
      eat: [
        "마른 크래커·토스트·흰밥처럼 자극이 적은 탄수화물을 소량",
        "생강차, 미지근한 물, 얼음 조각",
        "저지방 단백질과 부드러운 채소를 소량씩 4~5끼",
        "식후 2~3시간은 눕지 않고, 잠잘 때 상체를 15도 높이기"
      ],
      avoid: [
        "기름진 음식·튀김·매운 음식·국물 많은 야식",
        "카페인, 술, 탄산",
        "빈 속 오래 두기(다음 끼를 더 폭식하게 됩니다)",
        "취침 직전 식사, 누워서 간식"
      ],
      flags: [
        "24시간 물도 못 넘기고 소변이 줄어든다 → 탈수·신장 손상 위험, 즉시 진료",
        "커피색·혈성 구토 또는 흑색변 → 즉시 응급",
        "6kg 이상 급격히 빠지고 계속 토한다 → 진료",
        "속쓰림이 2주 이상 지속되며 진통제(NASAID)를 계속 먹는다 → 위 점막 손상 확인 필요"
      ],
      tip: "증량 직후 3~4일이 가장 힘듭니다. 그 주에는 끼니 양을 절반으로 줄이고, 증상이 남아 있으면 다음 증량을 미루도록 의사에게 말하세요."
    },
    {
      id: "fatigue", label: "피로 · 어지럼", sub: "힘 빠지고 핑 도는 느낌", icon: "😵",
      freq: "허가사항에 빈도로 정리되지는 않지만, 식사량 급감기에는 흔한 호소",
      mech: "열량·단백질 섭취가 급감하고, 구토·설사로 수분·전해질이 빠지며, 혈압이 낮아지고(체중 감소로), 당뇨약(설포닐우레아·인슐린)을 함께 쓰면 저혈당이 올 수 있습니다. 메트포르민 장기 복용은 비타민B12 결핍과도 관련됩니다.",
      eat: [
        "단백질 체중 1kg당 1.2~1.6g — 아침부터 단백질 넣기",
        "물 + 전해질(소금·칼륨): 국물 한 컵, 스포츠음료 희석",
        "소량씩 자주, 굶은 뒤 폭식 금지",
        "B12·철·비타민D는 검사 후 보충(임의 고용량 지양)"
      ],
      avoid: [
        "장시간 공복과 과도한 단식·운동 중복",
        "술(저혈당·탈수 모두 악화)",
        "사우나·더운 곳 장시간",
        "어지러운데 물도 안 마시고 계속 활동하기"
      ],
      flags: [
        "식은땀·손떨림·심한 허기·가슴 두근거림 → 저혈당 의심, 당 섭취 후 진료",
        "실신하거나 쓰러졌다 → 즉시 진료",
        "소변량이 눈에 띄게 줄고 입이 마른다 → 탈수, 진료",
        "계단 오르기도 힘들 만큼 근력이 떨어졌다 → 단백질·근손실 평가 필요"
      ],
      tip: "피로가 '어지럼'을 동반하면 원인이 혈압·혈당·탈수 중 하나일 가능성이 큽니다. 아침 혈압과 혈당을 3일만 기록해 가면 진료가 훨씬 빨라집니다."
    },
    {
      id: "hair", label: "탈모 걱정", sub: "머리카락이 빠짐", icon: "💇",
      freq: "GLP-1 이상반응으로 등록된 항목은 아님 · 급격한 체중 감소와 영양 결핍이 원인",
      mech: "몸이 '기근' 상태로 판단하면 모낭을 휴지기로 돌립니다(휴지기 탈모). 급격한 체중 감소 2~3개월 뒤 시작되고, 단백질·철·아연·비타민D가 부족하면 심해집니다. 대개 회복되는 가역성 탈모입니다.",
      eat: [
        "단백질을 줄이지 않기 — 머리카락은 케라틴(단백질)입니다",
        "철분: 붉은 고기·달걀·시금치 + 비타민C 함께",
        "아연: 굴·소고기·견과, 필요하면 구리와 균형 맞춰 보충",
        "열량을 너무 낮추지 않기(하루 1,200kcal 이하 장기 유지 지양)"
      ],
      avoid: [
        "단백질 없이 채소·과일만 먹는 극단 식단",
        "무분별한 탈모 영양제 여러 개 동시 복용",
        "비오틴 고용량(혈액검사 수치를 흐립니다)",
        "다이어트-요요 반복"
      ],
      flags: [
        "동전 모양으로 딱 떨어져 빠진다 → 원형 탈모, 피부과",
        "두피가 붉고 각질·진물이 있다 → 피부과",
        "6개월이 지나도 회복되지 않는다 → 철·갑상선·호르몬 검사"
      ],
      tip: "체중 감량 속도가 주 0.5~1%를 넘으면 탈모·근손실이 함께 옵니다. 70kg이면 주 350~700g이 적정선입니다."
    },
    {
      id: "injection", label: "주사부위 반응", sub: "멍·발적·통증", icon: "💉",
      freq: "주사부위 반응(발적·멍·통증)은 흔한 국소 반응 · 대개 1~3일 내 사라짐",
      mech: "피하주사는 피부 아래 미세혈관을 건드려 멍이 들고, 용액·보존제가 국소 자극을 일으킵니다. 같은 부위를 반복하면 결절(단단한 멍울)이 생깁니다.",
      eat: [
        "특별한 음식 제한은 없음 — 수분과 단백질은 평소대로",
        "멍이 잘 드는 편이면 비타민K·철 섭취 확인",
        "(약과 무관) 과음은 멍을 오래가게 합니다"
      ],
      avoid: [
        "같은 부위 반복 주사(최소 2.5cm 이상 거리 두기)",
        "주사 직후 문지르기·마사지",
        "알코올이 덜 마른 상태에서 주사",
        "차가운 약을 바로 주사(실온 30분 두기), 근육주사"
      ],
      flags: [
        "번지는 발진·열감·고름·딱지 → 감염 의심, 진료",
        "호흡곤란·얼굴/입술 부종·두드러기 → 아나필락시스, 즉시 119",
        "1주 이상 단단한 결절이 남는다 → 진료",
        "주사 후 심한 복통·구토가 시작됐다 → 췌장염 감별 필요"
      ],
      tip: "복부(배꼽 5cm 이상 떨어진 곳) → 허벅지 앞 → 상완 순으로 돌리고, 부위를 바꿀 때는 시계 방향으로 기억해 두세요."
    }
  ];

  var selected = [];
  var lastResult = null;

  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function renderSyms() {
    $("#syms").innerHTML = SYMPTOMS.map(function (s) {
      var on = selected.indexOf(s.id) >= 0;
      return '<button class="sym' + (on ? " is-on" : "") + '" type="button" data-sym="' + s.id + '" aria-pressed="' + (on ? "true" : "false") + '">' +
        '<span class="sym__icon" aria-hidden="true">' + s.icon + '</span>' +
        '<span class="sym__body">' +
        '<span class="sym__title">' + s.label + '</span>' +
        '<span class="sym__sub">' + s.sub + '</span>' +
        '</span>' +
        '<span class="sym__check" aria-hidden="true">✓</span>' +
        '</button>';
    }).join("");
  }

  function toggleSym(id) {
    var i = selected.indexOf(id);
    if (i >= 0) selected.splice(i, 1);
    else selected.push(id);
    renderSyms();
    if (selected.length) analyze(false);
    else {
      $("#result").hidden = true;
      lastResult = null;
      $("#countText").textContent = "증상을 고르면 대처가 나옵니다";
      $("#countHint").textContent = "복수 선택 가능";
    }
  }

  function analyze(scroll) {
    if (!selected.length) return;
    var items = selected.map(function (id) {
      return SYMPTOMS.filter(function (s) { return s.id === id; })[0];
    }).filter(Boolean);

    lastResult = items;

    $("#resultSub").textContent = items.map(function (s) { return s.label; }).join(" · ") + " — 증상 " + items.length + "개";

    var hasFlag = items.some(function (s) { return s.flags.length; });
    $("#verdictBox").innerHTML = '<div class="verdict verdict--' + (items.length >= 3 ? "amber" : "green") + '">' +
      '<span class="verdict__badge">🌿 오늘의 대처 ' + items.length + "개</span>" +
      '<p class="verdict__title">' + items.map(function (s) { return s.label; }).join(" + ") + "</p>" +
      '<p class="verdict__desc">아래에서 증상별로 <b>왜 생기는지</b>와 <b>오늘 먹을 것·피할 것</b>을 확인하세요. ' +
      (hasFlag ? "맨 아래 <b>적신호</b>에 해당하는 증상이 있으면 집에서 버티지 말고 진료를 받으세요." : "") +
      "</p></div>";

    $("#flows").innerHTML = items.map(function (s, i) {
      var eat = s.eat.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("");
      var avoid = s.avoid.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("");
      var flags = s.flags.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("");
      return '<article class="flow" id="flow-' + s.id + '">' +
        '<div class="flow__head">' +
        '<span class="flow__icon" aria-hidden="true">' + s.icon + '</span>' +
        '<div class="flow__titles"><h4 class="flow__title">' + s.label + '</h4>' +
        '<p class="flow__freq">' + esc(s.freq) + "</p></div>" +
        '<span class="flow__idx">' + (i + 1) + "</span>" +
        "</div>" +
        '<div class="flow__step">' +
        '<span class="flow__label">① 왜 생기나</span>' +
        '<p class="flow__mech">' + esc(s.mech) + "</p>" +
        "</div>" +
        '<div class="flow__cols">' +
        '<div class="flow__col flow__col--eat"><span class="flow__label">② 오늘 먹을 것</span><ul>' + eat + "</ul></div>" +
        '<div class="flow__col flow__col--avoid"><span class="flow__label">③ 오늘 피할 것</span><ul>' + avoid + "</ul></div>" +
        "</div>" +
        '<div class="flow__flags"><span class="flow__label">④ 이러면 병원</span><ul>' + flags + "</ul></div>" +
        '<p class="flow__tip">💡 ' + esc(s.tip) + "</p>" +
        "</article>";
    }).join("");

    $("#result").hidden = false;
    $("#countText").textContent = "증상 " + items.length + "개 정리";
    $("#countHint").textContent = "증상을 추가로 고르면 함께 보여드려요";

    if (scroll) {
      setTimeout(function () { $("#result").scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
    }
  }

  function copyResult() {
    if (!lastResult) return;
    var lines = ["[팩트체크 건강연구소] GLP-1 부작용 대처"];
    lastResult.forEach(function (s) {
      lines.push("");
      lines.push("■ " + s.label + " (" + s.freq + ")");
      lines.push("왜: " + s.mech);
      lines.push("먹을 것: " + s.eat.join(" / "));
      lines.push("피할 것: " + s.avoid.join(" / "));
      lines.push("진료: " + s.flags.join(" / "));
    });
    lines.push("");
    lines.push("https://hjh7085-bit.github.io/glp1-guide/");
    lines.push("※ 참고용이며, 용량 변경·중단은 처방 의사와 상의하세요.");
    var text = lines.join("\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("대처를 복사했어요"); }, function () { toast("복사가 막혀 있어요"); });
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
    renderSyms();

    $("#syms").addEventListener("click", function (e) {
      var b = e.target.closest("[data-sym]");
      if (!b) return;
      toggleSym(b.getAttribute("data-sym"));
    });

    $("#analyzeBtn").addEventListener("click", function () {
      if (!selected.length) { toast("증상을 먼저 선택해 주세요"); return; }
      analyze(true);
    });
    $("#resetBtn").addEventListener("click", function () {
      selected = [];
      renderSyms();
      $("#result").hidden = true;
      lastResult = null;
      $("#countText").textContent = "증상을 고르면 대처가 나옵니다";
      $("#countHint").textContent = "복수 선택 가능";
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
