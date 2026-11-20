/* ==========================================================================
   팩트체크 건강연구소 · 단백질 보충제 트러블(유당·여드름) 감별기
   조건 × 제형 점수화 + 성분표 판정
   --------------------------------------------------------------------------
   ⚠️ 성분 규격(ADPI)과 공개 관찰연구를 정리한 '참고용' 감별입니다.
   알레르기·유당불내증·여드름의 진단이 아닙니다.
   ========================================================================== */

(function () {
  "use strict";

  var CONDS = [
    { id: "lactose", emoji: "🥛", name: "우유 마시면 배탈", sub: "가스 · 설사 · 복통" },
    { id: "acne", emoji: "😣", name: "턱·등 여드름", sub: "유청 먹으면 트러블" },
    { id: "vegan", emoji: "🌱", name: "비건 · 채식", sub: "동물성 원료 제외" },
    { id: "budget", emoji: "💸", name: "가성비 우선", sub: "단백질 g당 가격" },
    { id: "bloat", emoji: "🎈", name: "먹으면 배가 빵빵", sub: "복부 팽만 · 더부룩" },
    { id: "soy", emoji: "🚫", name: "대두 알레르기", sub: "콩 제품에도 반응" },
    { id: "sweet", emoji: "🍬", name: "감미료에 예민", sub: "인공감미료 피하고 싶음" },
    { id: "fast", emoji: "⚡", name: "운동 후 빠른 흡수", sub: "소화 속도 중요" }
  ];

  var INGS = [
    { id: "wpc", name: "WPC", sub: "농축유청 · 유당 4~8%" },
    { id: "wpi", name: "WPI", sub: "분리유청 · 유당 1% 미만" },
    { id: "wph", name: "WPH", sub: "가수분해유청" },
    { id: "casein", name: "카제인", sub: "우유 단백질 · 느린 소화" },
    { id: "soy", name: "대두단백", sub: "콩 분리단백" },
    { id: "pea", name: "완두콩단백", sub: "식물성" },
    { id: "sucralose", name: "수크랄로스", sub: "인공감미료" },
    { id: "acek", name: "아세설팜K", sub: "인공감미료" },
    { id: "stevia", name: "스테비아", sub: "천연 유래 감미료" },
    { id: "allulose", name: "알룰로스", sub: "저열량 당" }
  ];

  var FORMULAS = [
    { id: "wpi", name: "WPI · 분리유청", protein: "90% 이상", lactose: "1% 미만", price: "중간", digest: "빠름", dairy: true, priceIdx: 2 },
    { id: "wph", name: "WPH · 가수분해유청", protein: "80~90%", lactose: "1% 미만", price: "비쌈", digest: "매우 빠름", dairy: true, priceIdx: 3 },
    { id: "wpc", name: "WPC · 농축유청", protein: "70~80%", lactose: "4~8%", price: "저렴", digest: "보통", dairy: true, priceIdx: 1 },
    { id: "casein", name: "카제인", protein: "70~80%", lactose: "소량", price: "중간", digest: "느림", dairy: true, priceIdx: 2 },
    { id: "soy", name: "대두단백", protein: "90%", lactose: "없음", price: "저렴", digest: "보통", dairy: false, priceIdx: 1 },
    { id: "pea", name: "완두콩·쌀 블렌드", protein: "70~80%", lactose: "없음", price: "중간", digest: "보통", dairy: false, priceIdx: 2 }
  ];

  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  var state = { cond: {}, ing: {} };
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

  function renderList(el, items, key, aria) {
    el.innerHTML = items.map(function (x) {
      return '<label class="item">' +
        '<input type="checkbox" data-' + key + '="' + x.id + '" aria-label="' + esc(x.name) + '">' +
        '<span class="item__box" aria-hidden="true"></span>' +
        '<span class="item__text"><span class="item__name">' + x.emoji + " " + esc(x.name) + "</span>" +
        '<span class="item__sub">' + esc(x.sub) + "</span></span></label>";
    }).join("");
    $$("#" + el.id + " input").forEach(function (input) {
      input.addEventListener("change", function () {
        state[key][input.dataset[key]] = input.checked;
        updateCount();
        schedule();
      });
    });
  }

  function hasCond(id) { return !!state.cond[id]; }
  function hasIng(id) { return !!state.ing[id]; }

  var BASE = { wpi: 1.5, wph: 1.5, wpc: 1, casein: 1, soy: 0.5, pea: 0.5 }; /* 단백질 품질·활용도 기본점 */

  function scoreFormula(f) {
    var s = BASE[f.id] || 0, why = [], bad = [];
    if (hasCond("vegan")) {
      if (f.dairy) { s -= 50; bad.push("동물성 원료(유청·카제인)"); }
      else { s += 2; why.push("식물성이라 비건 가능"); }
    }
    if (hasCond("lactose")) {
      if (f.id === "wpc") { s -= 4; bad.push("유당 4~8%"); }
      else if (f.id === "casein") { s -= 2; bad.push("유당 소량 함유"); }
      else if (f.dairy) { s += 2; why.push("유당 거의 없음"); }
      else { s += 2; why.push("유당 없음"); }
    }
    if (hasCond("acne")) {
      if (f.id === "wpc") { s -= 2; bad.push("유청·유당 부담"); }
      else if (f.dairy) { s -= 1; bad.push("유청 단백질(IGF-1 경로)"); }
      else { s += 2; why.push("식물성 — 여드름 부담 낮음"); }
    }
    if (hasCond("budget")) {
      if (f.id === "wpc") { s += 3; why.push("단백질 g당 가장 저렴"); }
      else if (f.id === "soy") { s += 2; why.push("가격 대비 단백질 우수"); }
      else if (f.id === "wph") { s -= 2; bad.push("가격이 가장 비쌈"); }
    }
    if (hasCond("bloat")) {
      if (f.id === "wpc") { s -= 2; bad.push("유당·팽만 가능"); }
      else if (f.id === "casein") { s -= 1; bad.push("느린 소화로 더부룩"); }
      else if (f.id === "pea") { s -= 1; bad.push("완두콩 섬유로 팽만 가능"); }
      else if (f.id === "wpi" || f.id === "wph") { s += 1; why.push("저유당·소화 빠름"); }
    }
    if (hasCond("soy") && f.id === "soy") { s -= 50; bad.push("대두 알레르기"); }
    if (hasCond("fast")) {
      if (f.id === "wph") { s += 3; why.push("가수분해 — 흡수 가장 빠름"); }
      else if (f.id === "wpi") { s += 1; why.push("흡수 빠른 편"); }
    }
    return { f: f, s: s, why: why, bad: bad };
  }

  function compute() {
    var conds = CONDS.filter(function (c) { return hasCond(c.id); });
    var ings = INGS.filter(function (c) { return hasIng(c.id); });
    var scored = FORMULAS.map(scoreFormula).sort(function (a, b) {
      if (b.s !== a.s) return b.s - a.s;
      return a.f.priceIdx - b.f.priceIdx;
    });
    var viable = scored.filter(function (x) { return x.s > -40; });
    if (!viable.length) viable = scored.slice();
    return { conds: conds, ings: ings, scored: scored, top: viable.slice(0, 3) };
  }

  function avoidList(r) {
    var out = [];
    function add(t, why) { out.push({ t: t, why: why }); }
    if (hasCond("lactose")) {
      add("WPC (농축유청)", "유당이 4~8% 남아 있어 배탈·가스가 나기 쉽습니다.");
      add("카제인", "우유 단백질이라 유당이 소량 들어 있습니다.");
    }
    if (hasCond("acne")) {
      add("WPC 우선 회피", "유청·유당과 여드름의 연관이 관찰 연구에서 반복 보고됩니다. WPI·WPH도 유청이라 완전히 안전하지 않아요.");
    }
    if (hasCond("vegan")) {
      add("WPC · WPI · WPH · 카제인", "모두 우유에서 나온 동물성 원료입니다.");
    }
    if (hasCond("soy")) {
      add("대두단백", "콩 단백질 알레르기가 있으면 반응할 수 있습니다. 완두콩·쌀 블렌드로 대체하세요.");
    }
    if (hasCond("bloat")) {
      add("WPC · 카제인", "유당과 느린 소화가 팽만을 키울 수 있습니다.");
    }
    if (hasCond("sweet")) {
      add("수크랄로스 · 아세설팜K", "인공감미료를 피하고 싶다면 스테비아·알룰로스 표기 제품을 고르세요.");
    }
    return out;
  }

  function verdictHtml(r) {
    if (!r.conds.length && !r.ings.length) return "";
    var t = r.top[0];
    var tone = "green", badge = "🟢 추천", title, desc;
    if (hasCond("vegan")) {
      title = "비건이면 " + t.f.name + " — 우유 원료는 피하세요";
      desc = "동물성(유청·카제인)을 제외하면 <b>대두단백</b>과 <b>완두콩·쌀 블렌드</b>가 남습니다. " + (hasCond("soy") ? "대두 알레르기가 있어 <b>완두콩·쌀 블렌드</b>가 안전합니다." : "가격이 중요하면 대두, 소화 편안함이 중요하면 완두콩 블렌드가 낫습니다.");
    } else if (hasCond("lactose")) {
      tone = "green"; title = "유당불내증엔 " + t.f.name;
      desc = "WPC는 유당이 <b>4~8%</b>라 배탈·가스가 나기 쉽습니다. " + t.f.name + "는 유당이 <b>" + t.f.lactose + "</b>이고 단백질은 <b>" + t.f.protein + "</b>입니다. 그래도 증상이 있으면 1회 양을 줄여 시작하세요.";
    } else if (hasCond("acne")) {
      tone = "amber"; title = "여드름이 신경 쓰이면 " + t.f.name;
      desc = "유청 단백질(특히 WPC)과 여드름의 연관은 <b>관찰 연구 수준</b>입니다. 확실한 원인은 아니지만, 의심된다면 <b>4~8주 끊어보고</b> 비교하는 것이 가장 확실합니다. 식물성으로 바꾸면 변수를 줄일 수 있어요.";
    } else if (hasCond("budget")) {
      tone = "green"; title = "가성비면 " + t.f.name;
      desc = "단백질 g당 가격은 WPC·대두단백이 가장 낮습니다. 다만 <b>유당·알레르기</b>가 있다면 싼 가격보다 몸에 맞는 쪽이 결국 이득입니다.";
    } else {
      title = "내 조건에는 " + t.f.name + "이 가장 무난합니다";
      desc = "단백질 <b>" + t.f.protein + "</b> · 유당 <b>" + t.f.lactose + "</b> · 가격 <b>" + t.f.price + "</b> · 소화 <b>" + t.f.digest + "</b>. " + (t.why.length ? t.why.join(", ") + " 때문입니다." : "");
    }
    var extra = r.ings.length ? " 아래 <b>제품 판정</b>에서 지금 보는 성분표도 확인하세요." : "";
    return '<div class="verdict verdict--' + tone + '">' +
      '<span class="verdict__badge">' + badge + "</span>" +
      '<h3 class="verdict__title">' + title + "</h3>" +
      '<p class="verdict__desc">' + desc + extra + "</p></div>";
  }

  function summaryHtml(r) {
    var t = r.top[0], t2 = r.top[1];
    var avoid = avoidList(r).length;
    return '<div class="summary__card summary__card--green"><span class="summary__num" style="font-size:17px;line-height:1.3">' + (t ? t.f.name.split(" · ")[0] : "—") + '</span><span class="summary__label">1순위 제형</span></div>' +
      '<div class="summary__card"><span class="summary__num" style="font-size:17px;line-height:1.3">' + (t2 ? t2.f.name.split(" · ")[0] : "—") + '</span><span class="summary__label">2순위 제형</span></div>' +
      '<div class="summary__card summary__card--red"><span class="summary__num">' + avoid + '<span style="font-size:13px">개</span></span><span class="summary__label">주의 항목</span></div>';
  }

  function recHtml(r) {
    $("#recList").innerHTML = r.top.map(function (x, i) {
      var f = x.f;
      var tags = [];
      tags.push("단백질 " + f.protein);
      tags.push("유당 " + f.lactose);
      tags.push("가격 " + f.price);
      tags.push("소화 " + f.digest);
      var body = tags.join(" · ");
      if (x.why.length) body += "<br><b>내 조건에 맞는 이유</b> — " + x.why.join(", ");
      if (x.bad.length) body += "<br><b>주의</b> — " + x.bad.join(", ");
      return '<div class="plan__item' + (i === 0 ? "" : " plan__item--amber") + '">' +
        '<span class="plan__num">' + (i + 1) + "</span>" +
        '<div><div class="plan__title">' + esc(f.name) + (i === 0 ? ' <span class="rank">가장 적합</span>' : "") + "</div>" +
        '<div class="plan__body">' + body + "</div></div></div>";
    }).join("");
  }

  function avoidHtml(r) {
    var list = avoidList(r);
    if (!list.length) {
      $("#avoidArea").innerHTML = '<div class="card"><div class="card__body">지금 고른 조건에서는 <b>피해야 할 원료가 없습니다.</b> 위 추천에서 가격·맛 기준으로 고르세요. 조건을 추가하면 더 좁혀 드립니다.</div></div>';
      return;
    }
    $("#avoidArea").innerHTML = '<div class="plan">' + list.map(function (x, i) {
      return '<div class="plan__item plan__item--red"><span class="plan__num">✕</span>' +
        '<div><div class="plan__title">' + esc(x.t) + "</div>" +
        '<div class="plan__body">' + x.why + "</div></div></div>";
    }).join("") + "</div>";
  }

  function ingNotes(id) {
    var n = [];
    function add(tone, txt) { n.push({ tone: tone, txt: txt }); }
    if (id === "wpc") {
      if (hasCond("lactose")) add("red", "유당 4~8% — 배탈·가스가 나기 쉬운 농도입니다.");
      if (hasCond("acne")) add("amber", "유청·유당과 여드름의 연관이 관찰 연구에서 보고됩니다.");
      if (hasCond("vegan")) add("red", "우유에서 나온 동물성 원료입니다.");
      if (hasCond("bloat")) add("amber", "유당이 팽만을 키울 수 있습니다.");
      if (hasCond("budget")) add("green", "단백질 g당 가격이 가장 낮은 원료입니다.");
      if (!n.length) add("green", "특별한 조건이 없으면 무난한 선택입니다. 단백질 70~80%.");
    } else if (id === "wpi") {
      if (hasCond("lactose")) add("green", "유당 1% 미만 — 유당불내증에 가장 무난한 유청입니다.");
      if (hasCond("acne")) add("amber", "유당은 적지만 여전히 유청 단백질입니다.");
      if (hasCond("vegan")) add("red", "우유 유래 동물성 원료입니다.");
      if (hasCond("budget")) add("amber", "WPC보다 g당 가격이 높습니다.");
      if (!n.length) add("green", "단백질 90% 이상, 유당이 거의 없는 표준 제형입니다.");
    } else if (id === "wph") {
      if (hasCond("lactose")) add("green", "유당이 거의 없습니다.");
      if (hasCond("acne")) add("amber", "유청 단백질이라 여드름 변수는 남습니다.");
      if (hasCond("vegan")) add("red", "우유 유래 동물성 원료입니다.");
      if (hasCond("budget")) add("red", "가수분해 공정 때문에 가격이 가장 높습니다.");
      if (hasCond("fast")) add("green", "흡수가 가장 빠른 제형입니다.");
      if (!n.length) add("green", "흡수가 빠르지만 쓴맛·가격이 단점입니다.");
    } else if (id === "casein") {
      if (hasCond("lactose")) add("amber", "유당이 소량 들어 있습니다.");
      if (hasCond("acne")) add("amber", "우유 단백질이라 여드름 변수는 남습니다.");
      if (hasCond("vegan")) add("red", "동물성 원료입니다.");
      if (hasCond("bloat")) add("amber", "소화가 느려 더부룩할 수 있습니다.");
      if (!n.length) add("green", "야간·포만감용으로 쓰는 느린 단백질입니다.");
    } else if (id === "soy") {
      if (hasCond("soy")) add("red", "대두 알레르기가 있으면 반응할 수 있습니다.");
      if (hasCond("vegan")) add("green", "식물성 원료입니다.");
      if (hasCond("lactose")) add("green", "유당이 없습니다.");
      if (hasCond("acne")) add("green", "유청보다 여드름 부담이 낮습니다.");
      if (hasCond("budget")) add("green", "단백질 순도 대비 가격이 좋습니다.");
      if (!n.length) add("green", "단백질 90% 수준의 식물성 원료입니다. 콩 알레르기만 확인하세요.");
    } else if (id === "pea") {
      if (hasCond("vegan")) add("green", "식물성이며 쌀과 블렌드하면 아미노산 조성이 좋아집니다.");
      if (hasCond("lactose")) add("green", "유당이 없습니다.");
      if (hasCond("bloat")) add("amber", "완두콩 섬유·올리고당으로 팽만이 생길 수 있습니다.");
      if (hasCond("acne")) add("green", "유청이 아니라 여드름 변수를 줄일 수 있습니다.");
      if (!n.length) add("green", "식물성 중 소화·아미노산 균형이 무난합니다.");
    } else if (id === "sucralose" || id === "acek") {
      if (hasCond("sweet")) add("amber", "인공감미료를 피하고 싶다면 스테비아·알룰로스 제품이 낫습니다.");
      else add("green", "JECFA ADI 내 사용량은 일반적으로 문제되지 않습니다. 장내미생물 변화는 인체 근거가 제한적입니다.");
    } else if (id === "stevia" || id === "allulose") {
      add("green", "천연 유래·저열량 감미료로, 감미료에 예민한 경우 무난한 선택입니다.");
    }
    return n;
  }

  function ingHtml(r) {
    if (!r.ings.length) {
      $("#ingArea").innerHTML = '<div class="card"><div class="card__body">성분표에 적힌 원료를 체크하면 <b>이 제품이 내 조건에 맞는지</b> 판정해 드립니다. WPC·WPI·WPH·카제인, 대두·완두콩, 수크랄로스·아세설팜K를 찾아보세요.</div></div>';
      return;
    }
    var html = r.ings.map(function (ing) {
      var notes = ingNotes(ing.id);
      var worst = notes.some(function (x) { return x.tone === "red"; }) ? "red" : notes.some(function (x) { return x.tone === "amber"; }) ? "amber" : "green";
      var label = worst === "red" ? "피하세요" : worst === "amber" ? "주의" : "괜찮아요";
      return '<div class="rule rule--' + worst + '" style="margin-bottom:9px">' +
        '<div class="rule__head"><span class="rule__level">' + label + "</span>" +
        '<span class="rule__title">' + esc(ing.name) + " · " + esc(ing.sub) + "</span></div>" +
        '<div class="rule__body">' + notes.map(function (x) { return "· " + x.txt; }).join("<br>") + "</div></div>";
    }).join("");
    $("#ingArea").innerHTML = html;
  }

  function readHtml() {
    var items = [
      { n: "1", t: "단백질 % = 1회 단백질 g ÷ 1회 중량 g", b: "예: 24g ÷ 32g = <b>75%</b>. 앞면의 ‘단백질 24g’만 보지 말고 1회 총량을 같이 보세요." },
      { n: "2", t: "원료명 첫 번째를 확인", b: "‘유청단백분리물(WPI)’인지 ‘유청단백농축물(WPC)’인지. 원료는 <b>함량 많은 순</b>으로 적힙니다." },
      { n: "3", t: "1회 20~30g, 하루 목표 계산", b: "감량·근력운동 중이면 체중 1kg당 <b>1.2~1.6g</b>. 70kg이면 84~112g, 하루 3~4회로 나눠 드세요." },
      { n: "4", t: "감미료·유화제 줄 확인", b: "수크랄로스·아세설팜K·스테비아·알룰로스 중 무엇인지. 예민하면 스테비아·알룰로스를 고르세요." }
    ];
    $("#readList").innerHTML = items.map(function (it) {
      return '<div class="plan__item"><span class="plan__num">' + it.n + "</span>" +
        '<div><div class="plan__title">' + it.t + "</div>" +
        '<div class="plan__body">' + it.b + "</div></div></div>";
    }).join("");
  }

  function analyze(scroll) {
    var r = compute();
    if (!r.conds.length && !r.ings.length) {
      $("#result").hidden = true; last = null; return;
    }
    last = r;
    $("#result").hidden = false;
    $("#verdictBox").innerHTML = verdictHtml(r);
    $("#summaryBox").innerHTML = summaryHtml(r);
    recHtml(r);
    avoidHtml(r);
    ingHtml(r);
    readHtml();
    var names = r.conds.map(function (c) { return c.name; });
    $("#resultSub").textContent = (names.length ? names.join(" · ") : "조건 없음") + (r.ings.length ? " · 성분 " + r.ings.length + "개 판정" : "");
    updateCount();
    if (scroll) $("#result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateCount() {
    var c = CONDS.filter(function (x) { return hasCond(x.id); }).length;
    var i = INGS.filter(function (x) { return hasIng(x.id); }).length;
    if (!c && !i) {
      $("#countText").textContent = "조건을 고르면 자동 추천";
      $("#countHint").textContent = "제품 성분을 체크하면 그 제품 판정까지";
      return;
    }
    $("#countText").textContent = "조건 " + c + "개 · 성분 " + i + "개";
    $("#countHint").textContent = c ? "내 조건에 맞는 제형을 계산했어요" : "성분만으로도 판정됩니다";
  }

  function schedule() {
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
    var r = last;
    var lines = ["내 조건: " + (r.conds.map(function (c) { return c.name; }).join(", ") || "없음")];
    r.top.forEach(function (x, i) { lines.push((i + 1) + "순위 " + x.f.name + " (단백질 " + x.f.protein + ", 유당 " + x.f.lactose + ")"); });
    var av = avoidList(r);
    if (av.length) { lines.push("피할 원료:"); av.forEach(function (x) { lines.push("- " + x.t); }); }
    var text = lines.join("\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("결과를 복사했어요"); }, function () { toast("복사에 실패했어요"); });
    } else toast("복사가 지원되지 않는 브라우저예요");
  }

  function init() {
    initTheme();
    renderList($("#condList"), CONDS, "cond");
    renderList($("#ingList"), INGS, "ing");

    $("#analyzeBtn").addEventListener("click", function () { analyze(true); });
    $("#resetBtn").addEventListener("click", function () {
      state = { cond: {}, ing: {} };
      $$("#condList input, #ingList input").forEach(function (el) { el.checked = false; });
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
