/* ==========================================================================
   팩트체크 건강연구소 · 마운자로·영양제 중복·궁합 10초 체크기
   데이터 + 규칙 엔진 + 화면 렌더링
   --------------------------------------------------------------------------
   ⚠️ 이 파일의 규칙은 공개된 문헌·허가사항(IOM DRI, 의약품 허가사항,
   성분 흡수 연구, 무작위 대조시험)을 정리한 '참고용'입니다.
   처방약 병용·용량 변경은 반드시 담당 의사·약사와 상담해야 합니다.
   ========================================================================== */

(function () {
  "use strict";

  /* ---------------------------------------------------------------- 상수 */
  var BLOG = "https://blog.naver.com/hjh7085/";

  // 칼럼 (2026-11-15 기준 실제 발행 글 · 제목 확인 완료)
  var COLUMNS = {
    mounjaro: {
      url: BLOG + "224474847257",
      tag: "실전 후기",
      title: "마운자로 2.5mg vs 5mg 솔직 후기 — 용량 늘려도 덜 빠진 이유",
    },
    d3k2: {
      url: BLOG + "224474920957",
      tag: "1분 논문 팩트",
      title: "비타민 D3 먹을 때 K2 안 먹으면 혈관이 굳는다? 해외 저널 3줄 팩트체크",
    },
    zinc: {
      url: BLOG + "224474970152",
      tag: "1분 논문 팩트",
      title: "아연만 고용량 먹으면 빈혈 온다? 아연과 구리 15:1 황금비율 팩트",
    },
    omega3: {
      url: BLOG + "224474981968",
      tag: "성분 해부",
      title: "8만 원 노르딕 vs 3만 원 CGN 오메가3 — rTG 성분표 솔직 해부",
    },
    enzyme: {
      url: BLOG + "224474930562",
      tag: "성분 해부",
      title: "마운자로 속쓰림·명치 막힘 뚫는 법: 소화효소 2종 솔직 비교",
    },
    milkthistle: {
      url: BLOG + "224476159368",
      tag: "성분 해부",
      title: "만성 피로·간 수치 잡는 밀크씨슬: 쏜 S.A.T. vs 나우푸드 흡수율 해부",
    },
    magnesium: {
      url: BLOG + "224477169582",
      tag: "1분 논문 팩트",
      title: "눈 밑 떨림, 마그네슘 먹어도 안 멈추는 이유 — 산화 vs 글리시네이트",
    },
    mastic: {
      url: BLOG + "224477176691",
      tag: "성분 해부",
      title: "아침 공복 속쓰림에 양배추즙 vs 매스틱검 vs 카베진 성분 해부",
    },
  };

  /* --------------------------------------------------------------- 성분 */
  var CATS = [
    { id: "metabolic", name: "비만·혈당", icon: "🩺" },
    { id: "gut", name: "간·위·장", icon: "🫀" },
    { id: "vitamin", name: "비타민·미네랄", icon: "🧪" },
    { id: "etc", name: "혈행·항산화·기타", icon: "💠" },
  ];

  var ITEMS = [
    // 비만·혈당 ------------------------------------------------------------
    {
      id: "mounjaro", cat: "metabolic", name: "마운자로", sub: "터제파타이드 · 주 1회 주사",
      prefer: ["weekly"], why: "주 1회 주사는 요일·시간을 고정해야 혈중 농도가 안정적이에요.",
    },
    {
      id: "wegovy", cat: "metabolic", name: "위고비", sub: "세마글루타이드 · 주 1회 주사",
      prefer: ["weekly"], why: "주 1회 주사는 같은 요일·같은 시간이 원칙이에요.",
    },
    {
      id: "saxenda", cat: "metabolic", name: "삭센다", sub: "리라글루타이드 · 매일 주사",
      prefer: ["morning-empty"], why: "매일 같은 시간이면 식사와 무관하게 놓아도 돼요.",
    },
    {
      id: "metformin", cat: "metabolic", name: "메트포르민", sub: "경구 혈당약 · 서방형 포함",
      prefer: ["morning", "dinner"], why: "식후에 먹어야 속쓰림·설사가 줄어요. 서방형이면 저녁이 편해요.",
    },
    {
      id: "berberine", cat: "metabolic", name: "베르베린", sub: "혈당·AMPK 활성",
      prefer: ["lunch", "morning"], why: "식후에 먹으면 위장 불편이 줄고 흡수가 안정적이에요.",
    },
    {
      id: "ampk", cat: "metabolic", name: "AMPK 활성제", sub: "혈당·대사 보조",
      prefer: ["morning", "lunch"], why: "아침 식후에 두면 하루 대사 리듬과 맞아요.",
    },

    // 간·위·장 -------------------------------------------------------------
    {
      id: "milkthistle", cat: "gut", name: "밀크씨슬", sub: "실리마린 · 간",
      prefer: ["lunch", "dinner"], why: "지용성이라 식사와 함께 먹어야 흡수가 좋아요.",
    },
    {
      id: "udca", cat: "gut", name: "우루사(UDCA)", sub: "우르소데옥시콜산 · 간·담즙",
      prefer: ["dinner", "lunch"], why: "제품 라벨 기준 식후 복용이 기본이에요.",
    },
    {
      id: "enzyme", cat: "gut", name: "소화효소", sub: "식사 직후 · 더부룩함",
      prefer: ["lunch", "dinner", "morning"], why: "음식과 섞여야 일을 해요. 식사 직후가 핵심이에요.",
    },
    {
      id: "probiotic", cat: "gut", name: "유산균", sub: "프로바이오틱스",
      prefer: ["bedtime", "morning-empty"], why: "위산이 옅은 취침 전이나 기상 직후가 생존율에 유리해요.",
    },
    {
      id: "fiber", cat: "gut", name: "차전자피·식이섬유", sub: "수용성 식이섬유",
      prefer: ["bedtime", "dinner", "lunch"], why: "물을 충분히(200ml 이상) 마시고, 다른 약과 2시간 떨어뜨려요.",
    },
    {
      id: "mastic", cat: "gut", name: "양배추즙·매스틱검", sub: "위 점막 보호",
      prefer: ["morning-empty", "bedtime"], why: "공복 속쓰림에는 기상 직후가 가장 효과적이에요.",
    },

    // 비타민·미네랄 ---------------------------------------------------------
    {
      id: "multivitamin", cat: "vitamin", name: "종합비타민", sub: "멀티비타민·미네랄",
      prefer: ["morning", "lunch"], why: "지용성 성분이 들어 있어 식후가 기본이에요.",
    },
    {
      id: "d3", cat: "vitamin", name: "비타민D3", sub: "콜레칼시페롤",
      prefer: ["lunch", "morning"], why: "지방이 있는 식사와 함께 먹어야 흡수가 좋아요.",
    },
    {
      id: "k2", cat: "vitamin", name: "비타민K2", sub: "MK-7 · 칼슘 길잡이",
      prefer: ["lunch", "dinner"], why: "D3와 같은 식사에 두면 역할이 맞물려요.",
    },
    {
      id: "magnesium", cat: "vitamin", name: "마그네슘", sub: "글리시네이트·시트레이트",
      prefer: ["bedtime", "dinner"], why: "취침 전 복용이 근이완·수면에 유리해요. 산화마그네슘은 설사 주의.",
    },
    {
      id: "zinc", cat: "vitamin", name: "아연", sub: "15~30mg",
      prefer: ["morning", "dinner"], why: "공복에 먹으면 메스꺼울 수 있어 식후로 두세요.",
    },
    {
      id: "copper", cat: "vitamin", name: "구리", sub: "1~2mg",
      prefer: ["morning", "dinner"], why: "아연과 같은 시간에 먹어야 15:1 비율이 지켜져요.",
    },
    {
      id: "iron", cat: "vitamin", name: "철분", sub: "비헴철·킬레이트",
      prefer: ["morning-empty", "dinner"], why: "공복 흡수율이 가장 높아요. 비타민C와 함께면 더 좋아요.",
    },
    {
      id: "calcium", cat: "vitamin", name: "칼슘", sub: "구연산·탄산",
      prefer: ["lunch", "dinner"], why: "한 번에 500mg 이하로 나누고, 철분·아연과는 2시간 떨어뜨려요.",
    },
    {
      id: "bcomplex", cat: "vitamin", name: "비타민B군", sub: "B1·B6·B12·엽산",
      prefer: ["morning", "lunch"], why: "늦은 밤에 먹으면 잠이 깰 수 있어 아침이 좋아요.",
    },
    {
      id: "vitc", cat: "vitamin", name: "비타민C", sub: "아스코르브산",
      prefer: ["morning", "lunch"], why: "식후에 먹으면 공복 속쓰림을 피할 수 있어요.",
    },

    // 혈행·항산화·기타 -------------------------------------------------------
    {
      id: "omega3", cat: "etc", name: "오메가3", sub: "EPA·DHA · rTG",
      prefer: ["lunch", "dinner"], why: "지방이 있는 식사와 함께 먹어야 흡수가 올라가요.",
    },
    {
      id: "coq10", cat: "etc", name: "코큐텐(CoQ10)", sub: "유비퀴논·유비퀴놀",
      prefer: ["morning", "lunch"], why: "지용성이라 식후에. 아침에 두면 활동 대사와 맞아요.",
    },
    {
      id: "propolis", cat: "etc", name: "프로폴리스", sub: "스프레이·캡슐",
      prefer: ["morning-empty", "morning"], why: "목이 칼칼할 때는 공복 스프레이가 편해요. 벌 알레르기 주의.",
    },
    {
      id: "lutein", cat: "etc", name: "루테인", sub: "지아잔틴 복합",
      prefer: ["lunch", "dinner"], why: "지용성이라 지방이 있는 식사와 함께 흡수가 올라가요.",
    },
    {
      id: "theanine", cat: "etc", name: "L-테아닌", sub: "이완·수면",
      prefer: ["bedtime"], why: "취침 30~60분 전이 가장 자연스러워요.",
    },
    {
      id: "arginine", cat: "etc", name: "아르기닌", sub: "혈행·운동 전",
      prefer: ["morning-empty", "morning"], why: "운동 30분 전 공복이 흡수에 유리해요.",
    },
    {
      id: "protein", cat: "etc", name: "단백질 보충제", sub: "WPI·WPC",
      prefer: ["morning", "lunch"], why: "한 번에 20~30g이 흡수에 적당해요. 아침 또는 운동 후.",
    },
  ];

  var GLP1 = ["mounjaro", "wegovy", "saxenda"];

  /* --------------------------------------------------------------- 시간대 */
  var SLOTS = [
    { id: "weekly", label: "주 1회", clock: "요일·시간 고정" },
    { id: "morning-empty", label: "아침 공복", clock: "기상 직후 07:00" },
    { id: "morning", label: "아침 식후", clock: "08:00" },
    { id: "lunch", label: "점심 식후", clock: "12:30" },
    { id: "dinner", label: "저녁 식후", clock: "19:00" },
    { id: "bedtime", label: "취침 전", clock: "22:30" },
  ];
  var SLOT_INDEX = {};
  SLOTS.forEach(function (s, i) { SLOT_INDEX[s.id] = i; });

  // 시간대별 기준 시각(분) — 2시간(120분) 이상 떨어져야 하는 조합 판정에 사용
  var SLOT_MIN = {
    "morning-empty": 7 * 60,      // 07:00
    "morning": 8 * 60,            // 08:00
    "lunch": 12 * 60 + 30,        // 12:30
    "dinner": 19 * 60,            // 19:00
    "bedtime": 22 * 60 + 30,      // 22:30
  };
  var MIN_GAP = 120;

  // 2시간 이상 떨어뜨려야 하는 조합 (같은/이웃 시간대면 충돌)
  var SPACING = [
    ["iron", "calcium"],
    ["iron", "zinc"],
    ["calcium", "magnesium"],
    ["fiber", "iron"],
    ["fiber", "calcium"],
    ["fiber", "zinc"],
    ["fiber", "magnesium"],
    ["fiber", "metformin"],
    ["fiber", "udca"],
    ["fiber", "milkthistle"],
    ["fiber", "multivitamin"],
    ["fiber", "berberine"],
    ["fiber", "omega3"],
    ["fiber", "lutein"],
    ["fiber", "coq10"],
    ["fiber", "d3"],
    ["fiber", "k2"],
  ];
  var SPACING_MAP = {};
  SPACING.forEach(function (p) {
    SPACING_MAP[p[0] + "|" + p[1]] = true;
    SPACING_MAP[p[1] + "|" + p[0]] = true;
  });

  // 배치 우선순위 (낮을수록 먼저 자리를 잡음)
  var PRIORITY = { iron: 10, calcium: 12, zinc: 14, copper: 16, magnesium: 18, fiber: 90, theanine: 20 };

  /* ---------------------------------------------------------------- 규칙 */
  function count(set, ids) { return ids.filter(function (id) { return set.has(id); }).length; }
  function hasAll(set, ids) { return ids.every(function (id) { return set.has(id); }); }
  function hasAny(set, ids) { return ids.some(function (id) { return set.has(id); }); }
  function nameOf(set, ids) {
    return ids.filter(function (id) { return set.has(id); })
      .map(function (id) { return itemById(id).name; }).join("·");
  }

  var RULES = [
    /* ------------------------------ 🔴 주의·중복 ------------------------------ */
    {
      id: "glp1-dup", level: "red", badge: "중복",
      title: "GLP-1 계열 주사가 2개 이상 겹쳤어요",
      when: function (s) { return count(s, GLP1) >= 2; },
      body: function (s) {
        return "<p class='rule__body'>" + nameOf(s, GLP1) + "는 모두 인크레틴 계열(터제파타이드·세마글루타이드·리라글루타이드)이에요. 서로 병용한 임상 연구가 없고, 저혈당·구역·담낭 문제 위험만 커집니다. <b>한 가지만 쓰고</b>, 다른 제품을 따로 처방받았다면 두 의사에게 모두 알리세요.</p>";
      },
      source: "의약품 허가사항 · 병용 연구 없음",
      link: "mounjaro",
    },
    {
      id: "glp1-berberine", level: "red", badge: "주의",
      title: "혈당을 낮추는 성분끼리 겹쳤어요 (GLP-1 + 베르베린)",
      when: function (s) { return hasAny(s, GLP1) && s.has("berberine"); },
      body: function () {
        return "<p class='rule__body'>베르베린은 AMPK를 활성화해 혈당을 낮추는 방향으로 작용해요. GLP-1 주사와 겹치면 <b>저혈당(식은땀·손 떨림·어지럼)</b>과 위장 불편이 겹칠 수 있습니다.</p><p class='rule__body'>같이 먹기 전 3일은 공복·식후 혈당을 기록해 두고, 공복이 70mg/dL 아래로 내려가면 베르베린을 먼저 중단한 뒤 처방 의사와 상의하세요.</p>";
      },
      source: "기전 연구 · 소규모 RCT",
      link: "mounjaro",
    },
    {
      id: "glp1-ampk", level: "red", badge: "주의",
      title: "혈당 강하 성분이 3중으로 겹칩니다 (GLP-1 + AMPK 활성제)",
      when: function (s) { return hasAny(s, GLP1) && s.has("ampk"); },
      body: function (s) {
        var extra = s.has("berberine") ? " 베르베린까지 있으니 더 주의하세요." : "";
        return "<p class='rule__body'>AMPK 활성제는 인슐린 감수성을 올려 혈당을 낮추는 쪽으로 작용해요. GLP-1 주사와 함께 쓰면 식사량이 줄어든 상태에서 저혈당이 오기 쉬워요." + extra + " 어지럼·식은땀이 반복되면 용량을 줄이고 처방 의사에게 알리세요.</p>";
      },
      source: "기전 기반 · 허가사항 확인 필요",
      link: "mounjaro",
    },
    {
      id: "berberine-metformin", level: "red", badge: "중복",
      title: "베르베린 + 메트포르민 — 혈당 강하가 겹쳐요",
      when: function (s) { return s.has("berberine") && s.has("metformin"); },
      body: function () {
        return "<p class='rule__body'>둘 다 혈당을 낮추고 위장 장애(설사·복통)를 일으킬 수 있어요. <b>메트포르민 용량을 유지한 채</b> 베르베린을 더하면 저혈당·설사가 겹치기 쉬우니, 추가 전에 혈당 기록을 보여주고 상의하세요.</p>";
      },
      source: "소규모 RCT · 라벨 이상반응",
      link: "mounjaro",
    },
    {
      id: "zinc-no-copper", level: "red", badge: "주의",
      title: "아연만 있고 구리가 없어요 — 구리 결핍 위험",
      when: function (s) { return s.has("zinc") && !s.has("copper"); },
      body: function () {
        return "<p class='rule__body'>아연을 하루 25mg 이상 장기간 먹으면 장에서 구리 흡수가 줄어 <b>빈혈·손발 저림·면역 저하</b>가 올 수 있어요. 미국 IOM의 아연 상한섭취량은 하루 35mg입니다.</p><p class='rule__body'>아연 15mg을 먹는다면 구리 1mg을 같은 시간에 더해 <b>약 15:1</b> 비율을 맞추는 게 일반적이에요.</p>";
      },
      source: "IOM DRI(2001) · 아연 UL 35mg/일",
      link: "zinc",
    },
    {
      id: "multi-overlap", level: "red", badge: "과다",
      title: "종합비타민 + 단일 성분 = 같은 성분을 두 번 먹고 있어요",
      when: function (s) {
        return s.has("multivitamin") && hasAny(s, ["d3", "zinc", "bcomplex", "iron", "vitc", "calcium", "magnesium"]);
      },
      body: function (s) {
        var dup = [];
        if (s.has("d3")) dup.push("비타민D");
        if (s.has("zinc")) dup.push("아연");
        if (s.has("bcomplex")) dup.push("비타민B군");
        if (s.has("iron")) dup.push("철분");
        if (s.has("vitc")) dup.push("비타민C");
        if (s.has("calcium")) dup.push("칼슘");
        if (s.has("magnesium")) dup.push("마그네슘");
        return "<p class='rule__body'>겹치는 성분: <b>" + dup.join("·") + "</b>. 종합비타민 라벨의 함량을 먼저 확인하세요. 비타민D는 하루 4,000IU, 아연은 35mg이 상한선(IOM)이라 고용량 단일 제품을 더하면 쉽게 넘습니다.</p><p class='rule__body'>중복되는 단일 제품은 빼거나 <b>격일</b>로 돌리는 게 안전해요. 수용성(B군·C)은 남는 양이 소변으로 나가지만, 고용량은 위장 장애·신장 부담이 될 수 있어요.</p>";
      },
      source: "IOM DRI 상한섭취량 · 제품 라벨",
      link: "zinc",
    },
    {
      id: "glp1-gi", level: "red", badge: "주의",
      title: "GLP-1 주사 + 위장 자극 성분 — 구역·속쓰림이 겹쳐요",
      when: function (s) {
        return hasAny(s, GLP1) && hasAny(s, ["zinc", "iron", "omega3", "magnesium"]);
      },
      body: function (s) {
        var list = [];
        if (s.has("zinc")) list.push("아연(공복 시 메스꺼움)");
        if (s.has("iron")) list.push("철분(위 점막 자극)");
        if (s.has("omega3")) list.push("오메가3 고용량(역한 맛·설사)");
        if (s.has("magnesium")) list.push("산화마그네슘(묽은 변)");
        return "<p class='rule__body'>GLP-1은 위 배출을 늦춰 구역·속쓰림이 흔한데, 여기에 <b>" + list.join(", ") + "</b>가 더해지면 위장 부담이 커져요.</p><p class='rule__body'>아연·철분은 <b>식후</b>로 옮기고, 오메가3는 기름진 식사와, 마그네슘은 <b>글리시네이트</b> 형태로 바꾸면 훨씬 편해집니다.</p>";
      },
      source: "의약품 허가사항 이상반응",
      link: "enzyme",
    },
    {
      id: "bloodflow", level: "red", badge: "주의",
      title: "혈행·혈압을 같이 건드리는 조합이에요",
      when: function (s) { return s.has("arginine") && (s.has("omega3") || s.has("coq10")); },
      body: function (s) {
        return "<p class='rule__body'>아르기닌은 혈관을 넓혀 혈압을 낮추고, 오메가3를 하루 2g 이상 먹으면 출혈 시간이 길어질 수 있어요" + (s.has("coq10") ? ", 코큐텐은 와파린 같은 항응고제의 작용을 약하게 만들 수 있습니다" : "") + ".</p><p class='rule__body'>어지럼이나 멍이 잦아지면 용량을 줄이고, <b>수술·시술·치과 발치 전 1~2주</b>는 중단 여부를 의사와 상의하세요.</p>";
      },
      source: "출혈 시간 연구 · 제품 라벨",
      link: "omega3",
    },

    /* ------------------------------ 🟡 간격 분리 ------------------------------ */
    {
      id: "iron-calcium", level: "amber", badge: "2시간",
      title: "철분 ↔ 칼슘은 2시간 이상 떨어뜨리세요",
      when: function (s) { return s.has("iron") && s.has("calcium"); },
      body: function () {
        return "<p class='rule__body'>칼슘이 철분 흡수를 경쟁적으로 눌러, 같은 시간에 먹으면 철분 흡수율이 크게 떨어져요. <b>철분은 아침 공복(비타민C와 함께)</b>, 칼슘은 <b>점심이나 저녁 식후</b>로 나누세요.</p>";
      },
      source: "철분 흡수 경쟁 연구",
      link: "zinc",
    },
    {
      id: "iron-zinc", level: "amber", badge: "2시간",
      title: "철분 ↔ 아연도 흡수 자리를 다퉈요",
      when: function (s) { return s.has("iron") && s.has("zinc"); },
      body: function () {
        return "<p class='rule__body'>두 미네랄은 같은 운반체를 두고 경쟁해, 고용량을 함께 먹으면 각각의 흡수가 줄어요. 2시간 이상 간격을 두거나, 아연을 절반으로 줄이는 방법이 있어요.</p>";
      },
      source: "미네랄 상호 흡수 연구",
      link: "zinc",
    },
    {
      id: "calcium-magnesium", level: "amber", badge: "2시간",
      title: "칼슘 ↔ 마그네슘은 고용량일 때 나눠 드세요",
      when: function (s) { return s.has("calcium") && s.has("magnesium"); },
      body: function () {
        return "<p class='rule__body'>칼슘 500mg 이상과 마그네슘을 같은 시간에 먹으면 서로 흡수를 줄이고 묽은 변이 생기기 쉬워요. <b>칼슘은 낮 식후, 마그네슘은 취침 전</b>으로 나누면 흡수와 수면 효과를 둘 다 챙길 수 있어요. 저용량 복합제(칼슘·마그네슘 1:1 등)는 괜찮습니다.</p>";
      },
      source: "미네랄 흡수 연구",
      link: "magnesium",
    },
    {
      id: "fiber-meds", level: "amber", badge: "2시간",
      title: "차전자피·식이섬유는 다른 약과 2시간 간격",
      when: function (s) {
        return s.has("fiber") && hasAny(s, ["metformin", "udca", "milkthistle", "multivitamin", "berberine", "iron", "calcium", "zinc", "magnesium"]);
      },
      body: function () {
        return "<p class='rule__body'>수용성 식이섬유는 물을 흡수해 젤을 만들고, 그 안에 다른 성분을 붙잡아 흡수를 떨어뜨려요. 제품 라벨도 <b>다른 약과 2시간 이상</b> 간격을 권합니다.</p><p class='rule__body'>물 200ml 이상과 함께 먹고, 복용 후 30분은 눕지 마세요(식도 막힘 예방).</p>";
      },
      source: "차전자피 제품 라벨",
      link: "enzyme",
    },
    {
      id: "fiber-fat", level: "amber", badge: "2시간",
      title: "지용성 성분과 식이섬유는 시간을 나누세요",
      when: function (s) {
        return s.has("fiber") && hasAny(s, ["omega3", "lutein", "coq10", "d3", "k2"]);
      },
      body: function () {
        return "<p class='rule__body'>식이섬유가 지방을 붙잡으면 오메가3·루테인·코큐텐·D3 같은 지용성 성분의 흡수가 줄어요. <b>지용성 성분은 지방이 있는 식사와</b>, 식이섬유는 <b>2시간 뒤(취침 전 등)</b>로 나누세요.</p>";
      },
      source: "지질 흡수 연구",
      link: "omega3",
    },

    /* ------------------------------- 🟢 시너지 ------------------------------- */
    {
      id: "d3-k2", level: "green", badge: "시너지",
      title: "D3 + K2 — 칼슘이 혈관이 아니라 뼈로",
      when: function (s) { return s.has("d3") && s.has("k2"); },
      body: function () {
        return "<p class='rule__body'>D3는 장에서 칼슘 흡수를 올리고, K2(MK-7)는 그 칼슘이 혈관벽에 쌓이지 않고 뼈로 가도록 돕는 역할이에요. 기전은 잘 알려져 있고, 임상 결과(혈관 석회화)는 연구가 진행 중인 단계입니다.</p><p class='rule__body'>둘 다 지용성이라 <b>지방이 있는 식사 직후</b>에 같이 드세요.</p>";
      },
      source: "기전 연구 · 임상 근거 제한적",
      link: "d3k2",
    },
    {
      id: "fat-stack", level: "green", badge: "시너지",
      title: "지용성 성분끼리 식후에 모아 드세요",
      when: function (s) {
        return hasAny(s, ["d3", "k2"]) && hasAny(s, ["omega3", "lutein", "coq10"]);
      },
      body: function (s) {
        return "<p class='rule__body'>" + nameOf(s, ["d3", "k2", "omega3", "lutein", "coq10"]) + "는 모두 지용성이라, <b>지방이 있는 식사</b>와 함께 먹으면 흡수가 올라가요. 빈속에 물로만 먹으면 상당량이 그냥 나가버립니다.</p>";
      },
      source: "지용성 비타민 흡수 연구",
      link: "omega3",
    },
    {
      id: "zinc-copper", level: "green", badge: "시너지",
      title: "아연 + 구리 15:1 — 균형이 맞았어요",
      when: function (s) { return s.has("zinc") && s.has("copper"); },
      body: function () {
        return "<p class='rule__body'>아연 15mg에 구리 1mg(약 15:1)은 장기 복용 시 구리 결핍을 막는 표준적인 비율이에요. 같은 시간에 함께 드세요.</p>";
      },
      source: "IOM DRI · 구리 RDA 900µg",
      link: "zinc",
    },
    {
      id: "glp1-protein-fiber", level: "green", badge: "시너지",
      title: "GLP-1 + 단백질 + 식이섬유 — 근손실·변비 케어",
      when: function (s) { return hasAny(s, GLP1) && s.has("protein") && s.has("fiber"); },
      body: function () {
        return "<p class='rule__body'>GLP-1로 식사량이 줄면 근육이 먼저 빠지고 변비가 오기 쉬워요. <b>단백질은 체중 1kg당 1.2~1.6g</b>, <b>식이섬유는 하루 25~30g</b>을 목표로 하고 물 1.5~2L를 함께 드세요. 이 조합은 감량기에서 가장 중요한 기본값입니다.</p>";
      },
      source: "비만 약물 병용 영양 가이드",
      link: "mounjaro",
    },
    {
      id: "glp1-protein", level: "green", badge: "시너지",
      title: "GLP-1 + 단백질 — 근손실을 막는 기본",
      when: function (s) { return hasAny(s, GLP1) && s.has("protein") && !s.has("fiber"); },
      body: function () {
        return "<p class='rule__body'>식사량이 줄어드는 동안 <b>단백질 체중 1kg당 1.2~1.6g</b>을 채우면 근손실을 줄일 수 있어요. 여기에 식이섬유(하루 25~30g)를 더하면 변비까지 함께 잡힙니다.</p>";
      },
      source: "비만 약물 병용 영양 가이드",
      link: "mounjaro",
    },
    {
      id: "iron-vitc", level: "green", badge: "시너지",
      title: "철분 + 비타민C — 흡수 2~3배",
      when: function (s) { return s.has("iron") && s.has("vitc"); },
      body: function () {
        return "<p class='rule__body'>비타민C가 철분을 흡수되기 쉬운 형태로 바꿔줘서, 함께 먹으면 흡수율이 2~3배 올라가요. 철분은 공복, 비타민C와 같이 드세요. (커피·녹차·유제품은 2시간 피하기)</p>";
      },
      source: "철분 흡수 연구",
      link: "zinc",
    },
    {
      id: "mag-theanine", level: "green", badge: "시너지",
      title: "마그네슘 + L-테아닌 — 취침 전 조합",
      when: function (s) { return s.has("magnesium") && s.has("theanine"); },
      body: function () {
        return "<p class='rule__body'>마그네슘은 근이완·신경 안정, 테아닌은 각성 없이 이완을 돕는 쪽이라 취침 전 조합으로 많이 씁니다. 다만 수면제를 대신하는 근거는 약하니 <b>보조</b>로 생각하세요.</p>";
      },
      source: "소규모 연구 · 근거 제한적",
      link: "magnesium",
    },
    {
      id: "probiotic-fiber", level: "green", badge: "시너지",
      title: "유산균 + 식이섬유 — 프리바이오틱스 역할",
      when: function (s) { return s.has("probiotic") && s.has("fiber"); },
      body: function () {
        return "<p class='rule__body'>식이섬유는 유산균의 먹이가 되어 장내 정착을 도와요. 다만 차전자피는 유산균까지 붙잡을 수 있으니 <b>2시간 간격</b>을 두고, 유산균은 미지근한 물로 드세요.</p>";
      },
      source: "프리바이오틱스 연구",
      link: "enzyme",
    },
    {
      id: "calcium-d3", level: "green", badge: "시너지",
      title: "칼슘 + D3 — 흡수를 돕는 기본 조합",
      when: function (s) { return s.has("calcium") && s.has("d3"); },
      body: function () {
        return "<p class='rule__body'>D3가 없으면 칼슘 흡수율이 크게 떨어져요. 칼슘은 한 번에 500mg 이하로 나누고, D3와 같은 끼니에 드세요. (칼슘을 많이 먹어도 D3·K2·마그네슘이 없으면 혈관에 쌓일 수 있어요)</p>";
      },
      source: "칼슘·비타민D 흡수 연구",
      link: "d3k2",
    },
  ];

  /* --------------------------------------------------------------- 상태 */
  var selected = new Set();
  var lastResult = null;
  var barInView = false;

  // 하단 실행 바: 체크리스트가 헤더 아래로 화면에 들어왔을 때만 보인다.
  // (결과 섹션으로 내려가면 체크리스트가 헤더에 가려지며 저절로 숨는다)
  function syncActionBar() {
    var bar = document.querySelector(".actionbar");
    if (bar) bar.classList.toggle("is-on", barInView);
  }

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  function itemById(id) {
    for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i];
    return null;
  }

  /* ------------------------------------------------------------ 체크리스트 */
  function renderChecklist() {
    var wrap = $("#checklist");
    var html = "";
    CATS.forEach(function (cat) {
      var items = ITEMS.filter(function (it) { return it.cat === cat.id; });
      html += "<div class='cat' data-cat='" + cat.id + "'>" +
        "<div class='cat__head'>" +
          "<span class='cat__icon' aria-hidden='true'>" + cat.icon + "</span>" +
          "<h3 class='cat__name'>" + cat.name + "</h3>" +
          "<span class='cat__count' data-count='" + cat.id + "'>0 / " + items.length + "</span>" +
        "</div><div class='items'>";
      items.forEach(function (it) {
        html += "<label class='item' for='it-" + it.id + "'>" +
          "<input type='checkbox' id='it-" + it.id + "' value='" + it.id + "'>" +
          "<span class='item__box' aria-hidden='true'></span>" +
          "<span class='item__text'><span class='item__name'>" + it.name + "</span>" +
          "<span class='item__sub'>" + it.sub + "</span></span>" +
        "</label>";
      });
      html += "</div></div>";
    });
    wrap.innerHTML = html;

    $$("#checklist input[type=checkbox]").forEach(function (input) {
      input.addEventListener("change", function () {
        if (input.checked) selected.add(input.value);
        else selected.delete(input.value);
        syncState();
      });
    });
  }

  function syncState() {
    // 체크 상태 반영 (프리셋으로 바꿨을 때)
    $$("#checklist input[type=checkbox]").forEach(function (input) {
      input.checked = selected.has(input.value);
    });

    // 카테고리 카운트
    CATS.forEach(function (cat) {
      var total = ITEMS.filter(function (it) { return it.cat === cat.id; }).length;
      var on = ITEMS.filter(function (it) { return it.cat === cat.id && selected.has(it.id); }).length;
      var el = $("[data-count='" + cat.id + "']");
      if (el) {
        el.textContent = on + " / " + total;
        el.classList.toggle("is-on", on > 0);
      }
    });

    // 선택 수
    var n = selected.size;
    $("#countText").textContent = "선택 " + n + "개";
    $("#countHint").textContent = n === 0
      ? "카테고리에서 항목을 골라주세요"
      : n < 2 ? "한 개만으로도 분석할 수 있어요" : "분석할 준비가 됐어요";
    $("#analyzeBtn").disabled = n === 0;

    // 하단 바: 체크리스트가 화면에 있을 때만 보이게
    syncActionBar();

    // 프리셋 활성 표시
    $$(".preset").forEach(function (btn) {
      var p = PRESETS[btn.dataset.preset];
      btn.classList.toggle("is-active", !!p && p.ids.length === n && p.ids.every(function (id) { return selected.has(id); }));
    });

    // 해시 공유
    var ids = Array.from(selected);
    var hash = ids.length ? "#i=" + ids.join(",") : "";
    if (location.hash !== hash) {
      history.replaceState(null, "", location.pathname + location.search + hash);
    }

    // 결과가 이미 열려 있으면 실시간 갱신
    if (lastResult && !$("#result").hidden) renderResults();

    // 선택 0개면 결과 접기
    if (n === 0) {
      $("#result").hidden = true;
      lastResult = null;
    }
  }

  /* -------------------------------------------------------------- 프리셋 */
  var PRESETS = {
    diet: { ids: ["mounjaro", "protein", "fiber", "magnesium", "multivitamin", "d3", "omega3"] },
    office: { ids: ["multivitamin", "d3", "omega3", "bcomplex", "vitc", "coq10", "lutein", "probiotic"] },
    gut: { ids: ["milkthistle", "udca", "enzyme", "mastic", "probiotic", "fiber"] },
    mineral: { ids: ["zinc", "iron", "calcium", "magnesium", "d3", "k2", "vitc"] },
  };

  function applyPreset(key) {
    var p = PRESETS[key];
    if (!p) return;
    var same = p.ids.length === selected.size && p.ids.every(function (id) { return selected.has(id); });
    selected = new Set(same ? [] : p.ids);
    syncState();
    if (!same) {
      renderResults(true);
      $("#result").hidden = false;
      scrollToResult();
    }
  }

  /* ------------------------------------------------------------- 시간표 */
  function buildSchedule(set) {
    var chosen = ITEMS.filter(function (it) { return set.has(it.id); });

    // 간격 제약이 많은(자유도가 낮은) 항목부터 자리를 잡아야 충돌이 줄어든다
    function partners(it) {
      return chosen.filter(function (o) {
        return o.id !== it.id && SPACING_MAP[it.id + "|" + o.id];
      }).length;
    }
    chosen.forEach(function (it) { it._partners = partners(it); });
    chosen.sort(function (a, b) {
      return (b._partners - a._partners) || ((PRIORITY[a.id] || 50) - (PRIORITY[b.id] || 50));
    });

    var assign = {};      // id -> slot
    var slotItems = {};   // slot -> [id]
    var forced = [];      // 자리가 없어 충돌을 감수한 항목
    SLOTS.forEach(function (s) { slotItems[s.id] = []; });

    function gapOK(item, slotId) {
      var mins = SLOT_MIN[slotId];
      if (mins === undefined) return true; // 주 1회 슬롯은 시간 충돌 없음
      for (var id in assign) {
        if (!Object.prototype.hasOwnProperty.call(assign, id)) continue;
        if (!SPACING_MAP[item.id + "|" + id]) continue;
        var otherMin = SLOT_MIN[assign[id]];
        if (otherMin === undefined) continue;
        if (Math.abs(mins - otherMin) < MIN_GAP) return false;
      }
      return true;
    }

    function slotConflicts(item, slotId) {
      var n = 0;
      slotItems[slotId].forEach(function (other) {
        if (SPACING_MAP[item.id + "|" + other]) n++;
      });
      return n;
    }

    function canPlace(item, slotId) {
      if (slotItems[slotId].length >= 5) return false;
      if (!gapOK(item, slotId)) return false;
      return slotConflicts(item, slotId) === 0;
    }

    function preferFor(item) {
      // 짝을 맞춰야 하는 항목은 먼저 배치된 짝의 시간대로 따라간다
      if (item.id === "copper" && assign.zinc) return [assign.zinc].concat(item.prefer);
      if (item.id === "k2" && assign.d3) return [assign.d3].concat(item.prefer);
      if (item.id === "vitc" && assign.iron === "morning-empty") {
        return ["morning-empty", "morning"].concat(item.prefer);
      }
      return item.prefer;
    }

    chosen.forEach(function (item) {
      var prefer = preferFor(item);
      for (var i = 0; i < prefer.length; i++) {
        if (canPlace(item, prefer[i])) {
          assign[item.id] = prefer[i];
          slotItems[prefer[i]].push(item.id);
          return;
        }
      }
      // 모든 희망 시간대가 막혔을 때: 충돌이 가장 적은 시간대에 배치하고 표시
      var best = null, bestScore = Infinity;
      prefer.forEach(function (slotId) {
        if (slotItems[slotId].length >= 5) return;
        var score = slotConflicts(item, slotId) * 10 + slotItems[slotId].length;
        if (score < bestScore) { bestScore = score; best = slotId; }
      });
      if (!best) best = prefer[prefer.length - 1];
      assign[item.id] = best;
      slotItems[best].push(item.id);
      if (slotConflicts(item, best) > 0) forced.push({ id: item.id, slot: best });
    });

    slotItems._forced = forced;
    return slotItems;
  }

  function slotTips(slotId, ids) {
    var tips = [];
    var s = new Set(ids);
    if (s.has("iron") && s.has("vitc")) tips.push("철분 + 비타민C — 흡수 2~3배, 같이 드세요.");
    if (s.has("d3") && s.has("k2")) tips.push("D3 + K2 — 지방이 있는 식사와 함께.");
    if (s.has("zinc") && s.has("copper")) tips.push("아연 + 구리 — 15:1 비율 유지.");
    if ((s.has("omega3") || s.has("lutein") || s.has("coq10")) && (s.has("d3") || s.has("k2"))) {
      tips.push("지용성 성분끼리 — 식사에 지방이 있어야 흡수됩니다.");
    }
    if (ids.length >= 4) tips.push(ids.length + "종을 한 번에 — 물 한 컵과 함께, 미네랄은 다음 끼니로 나누는 게 좋아요.");
    if (s.has("mounjaro") || s.has("wegovy")) tips.push("주사는 같은 요일·같은 시간. 식사와 무관합니다.");
    // 같은 시간대에 2시간 간격이 필요한 조합이 남아 있는지
    for (var i = 0; i < ids.length; i++) {
      for (var j = i + 1; j < ids.length; j++) {
        if (SPACING_MAP[ids[i] + "|" + ids[j]]) {
          tips.push("⚠️ 이 시간대에 2시간 간격이 필요한 항목이 함께 있어요 — 하나를 다른 끼니로 옮기세요.");
          i = ids.length;
          break;
        }
      }
    }
    return tips;
  }

  function renderTimeline(set) {
    var slotItems = buildSchedule(set);
    var html = "";
    var used = 0;

    SLOTS.forEach(function (slot) {
      var ids = slotItems[slot.id];
      if (!ids.length) return;
      used++;
      var tips = slotTips(slot.id, ids);
      html += "<div class='slot" + (slot.id === "weekly" ? " slot--weekly" : "") + "'>" +
        "<div class='slot__time'><span class='slot__label'>" + slot.label + "</span>" +
        "<span class='slot__clock'>" + slot.clock + "</span></div>" +
        "<div class='slot__items'>" +
          ids.map(function (id) {
            var it = itemById(id);
            return "<span class='pill'>" + it.name + "</span>";
          }).join("") +
        "</div>" +
        (tips.length ? "<div class='slot__tip'>" + tips.join(" ") + "</div>" : "") +
      "</div>";
    });

    if (!used) html = "<p class='rule-empty'>선택한 항목이 없어 시간표를 만들 수 없어요.</p>";
    $("#timeline").innerHTML = html;
  }

  function renderTips(set) {
    var tips = [];
    if (set.has("bcomplex")) tips.push("<b>B군</b>은 늦은 밤에 먹으면 잠이 깰 수 있어 아침 식후로 배치했어요.");
    if (hasAny(set, GLP1) && set.has("fiber")) tips.push("<b>GLP-1</b>은 변비가 흔해요 — 식이섬유와 물 1.5~2L를 같이 챙기세요.");
    if (set.has("iron")) tips.push("<b>철분</b>은 커피·녹차·유제품과 2시간 간격을 두세요.");
    if (set.has("probiotic")) tips.push("<b>유산균</b>은 뜨거운 물 대신 미지근한 물로 드세요.");
    if (set.has("mounjaro")) tips.push("<b>마운자로</b>는 주 1회, 같은 요일·같은 시간이 원칙이에요.");
    if (set.has("mastic")) tips.push("<b>매스틱검</b>은 공복 속쓰림에 쓰지만, 위가 많이 아플 땐 진료가 먼저예요.");
    if (!tips.length) tips.push("2시간 간격이 필요한 항목은 휴대폰 알람을 따로 맞춰두면 놓치지 않아요.");
    $("#timetableTips").innerHTML = tips.map(function (t) { return "<span class='tip'>" + t + "</span>"; }).join("");
  }

  /* -------------------------------------------------------------- 결과 */
  function renderResults(silent) {
    var set = new Set(selected);
    if (!set.size) return;

    var hits = { red: [], amber: [], green: [] };
    RULES.forEach(function (rule) {
      if (rule.when(set)) hits[rule.level].push(rule);
    });
    lastResult = { hits: hits, set: set };

    // 요약
    var n = set.size;
    var verdictCls = hits.red.length ? "is-red" : hits.amber.length ? "is-amber" : "is-green";
    var verdict = "";
    if (hits.red.length) {
      verdict = "겹치거나 주의할 조합이 <b>" + hits.red.length + "건</b> 있어요. 아래 🔴 항목부터 확인하고, 처방약 관련 경고는 담당 의사·약사에게 그대로 보여주세요.";
    } else if (hits.amber.length) {
      verdict = "겹치는 성분은 없지만, <b>시간을 나눠야 하는 조합이 " + hits.amber.length + "건</b>이에요. 시간표대로만 드셔도 흡수 손실을 크게 줄일 수 있어요.";
    } else {
      verdict = "겹치는 성분도, 시간을 나눌 조합도 없어요. 아래 🟢 시너지 " + hits.green.length + "건을 참고해 드세요.";
    }

    $("#summary").innerHTML =
      "<div class='summary__card summary__card--red'><span class='summary__num'>" + hits.red.length + "</span><span class='summary__label'>🔴 주의·중복</span></div>" +
      "<div class='summary__card summary__card--amber'><span class='summary__num'>" + hits.amber.length + "</span><span class='summary__label'>🟡 간격 분리</span></div>" +
      "<div class='summary__card summary__card--green'><span class='summary__num'>" + hits.green.length + "</span><span class='summary__label'>🟢 시너지</span></div>" +
      "<div class='summary__verdict " + verdictCls + "'><span class='dot-mark' aria-hidden='true'></span><span>" + verdict + "</span></div>";

    $("#resultSub").innerHTML = "선택한 <b>" + n + "개</b> 항목을 문헌·허가사항 기준 <b>" + RULES.length + "개</b> 규칙으로 대조했어요.";

    // 규칙 그룹
    var groups = [
      { level: "red", badge: "주의", label: "겹치는 성분 · 중복 경고", empty: "지금 조합에서 겹치는 성분은 찾지 못했어요." },
      { level: "amber", badge: "간격", label: "복용 간격 분리 권장", empty: "지금 조합은 시간을 나눌 필요가 없어요." },
      { level: "green", badge: "시너지", label: "같이 먹으면 좋은 조합", empty: "같이 먹으면 좋은 조합은 아직 없어요. 항목을 더 골라보세요." },
    ];
    var html = "";
    groups.forEach(function (g) {
      var list = hits[g.level];
      html += "<div class='rule-group rule-group--" + g.level + "'>" +
        "<div class='rule-group__head'>" +
          "<span class='rule-group__badge'>" + g.badge + "</span>" +
          "<h3 class='rule-group__title'>" + g.label + "</h3>" +
          "<span class='rule-group__count'>" + list.length + "건</span>" +
        "</div>";
      if (!list.length) {
        html += "<p class='rule-empty'>" + g.empty + "</p>";
      } else {
        html += "<div class='rule-list'>";
        list.forEach(function (r) {
          var col = COLUMNS[r.link];
          html += "<article class='rule rule--" + r.level + "'>" +
            "<div class='rule__head'>" +
              "<span class='rule__level'>" + r.badge + "</span>" +
              "<h4 class='rule__title'>" + r.title + "</h4>" +
            "</div>" +
            r.body(set) +
            "<div class='rule__foot'>" +
              "<span class='rule__source'>근거 · " + r.source + "</span>" +
              (col ? "<a class='rule__link' href='" + col.url + "' target='_blank' rel='noopener'>관련 칼럼 보기 →</a>" : "") +
            "</div>" +
          "</article>";
        });
        html += "</div>";
      }
      html += "</div>";
    });
    $("#ruleGroups").innerHTML = html;

    renderTimeline(set);
    renderTips(set);

    if (!silent) {
      $("#ruleGroups").classList.remove("is-entering");
      void $("#ruleGroups").offsetWidth;
      $("#ruleGroups").classList.add("is-entering");
    }
  }

  function scrollToResult() {
    var el = $("#result");
    if (!el) return;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var header = document.querySelector(".site-header");
    var offset = (header ? header.getBoundingClientRect().height : 62) + 12;
    var top = el.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" });
  }

  /* --------------------------------------------------------------- 칼럼 */
  function renderColumns() {
    var order = ["mounjaro", "d3k2", "zinc", "omega3", "enzyme", "milkthistle", "magnesium", "mastic"];
    $("#columnGrid").innerHTML = order.map(function (key) {
      var c = COLUMNS[key];
      return "<a class='column-card' href='" + c.url + "' target='_blank' rel='noopener'>" +
        "<span class='column-card__tag'>" + c.tag + "</span>" +
        "<span class='column-card__title'>" + c.title + "</span>" +
        "<span class='column-card__meta'>칼럼 읽기 →</span>" +
      "</a>";
    }).join("");
  }

  /* -------------------------------------------------------------- 결과 복사 */
  function copyResult() {
    if (!lastResult) return;
    var set = lastResult.set;
    var hits = lastResult.hits;
    var lines = [];
    lines.push("[팩트체크 건강연구소] 마운자로·영양제 중복 체크 결과");
    lines.push("선택: " + ITEMS.filter(function (it) { return set.has(it.id); }).map(function (it) { return it.name; }).join(", "));
    lines.push("");
    [["🔴 주의·중복", hits.red], ["🟡 간격 분리", hits.amber], ["🟢 시너지", hits.green]].forEach(function (pair) {
      if (!pair[1].length) return;
      lines.push(pair[0]);
      pair[1].forEach(function (r) {
        lines.push("- " + r.title);
      });
      lines.push("");
    });

    var slotItems = buildSchedule(set);
    lines.push("⏰ 하루 시간표");
    SLOTS.forEach(function (slot) {
      if (!slotItems[slot.id].length) return;
      lines.push("- " + slot.label + " (" + slot.clock + "): " +
        slotItems[slot.id].map(function (id) { return itemById(id).name; }).join(", "));
    });
    lines.push("");
    lines.push("문헌 기반 참고용이며 처방약 병용은 담당 의사·약사와 상담하세요.");
    lines.push("https://blog.naver.com/hjh7085");

    var text = lines.join("\n");
    var done = function () {
      var btn = $("#copyBtn");
      var prev = btn.textContent;
      btn.textContent = "복사됐어요 ✓";
      setTimeout(function () { btn.textContent = prev; }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, cb) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); cb(); } catch (e) { /* noop */ }
    document.body.removeChild(ta);
  }

  /* --------------------------------------------------------------- 테마 */
  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem("fcl-theme"); } catch (e) {}
    var theme = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
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

  /* ---------------------------------------------------------------- 초기화 */
  function init() {
    initTheme();
    renderChecklist();
    renderColumns();

    // 공유 링크 복원
    var m = location.hash.match(/#i=([\w,-]+)/);
    if (m) {
      m[1].split(",").forEach(function (id) {
        if (itemById(id)) selected.add(id);
      });
    }
    syncState();
    if (selected.size) {
      renderResults(true);
      $("#result").hidden = false;
    }

    // 이벤트
    $("#analyzeBtn").addEventListener("click", function () {
      if (!selected.size) return;
      renderResults();
      $("#result").hidden = false;
      scrollToResult();
    });
    $("#resetBtn").addEventListener("click", function () {
      selected.clear();
      syncState();
      $("#result").hidden = true;
      lastResult = null;
    });
    $("#copyBtn").addEventListener("click", copyResult);
    $("#editBtn").addEventListener("click", function () {
      document.getElementById("checker").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $$(".preset").forEach(function (btn) {
      btn.addEventListener("click", function () { applyPreset(btn.dataset.preset); });
    });

    var checklistEl = $("#checklist");
    var barEl = document.querySelector(".actionbar");
    if (checklistEl && barEl && "IntersectionObserver" in window) {
      // 위쪽 -74px: 고정 헤더에 가려진 부분만 남았을 때는 '보이는 것으로 치지 않는다'
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          barInView = e.isIntersecting;
          syncActionBar();
        });
      }, { threshold: 0, rootMargin: "-74px 0px -130px 0px" }).observe(checklistEl);
    } else if (barEl) {
      barEl.classList.add("is-on");
    }

    var yearEl = $("#year");    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    var stat = $("#statRules");
    if (stat) stat.textContent = String(RULES.length);
    var statItems = $("#statItems");
    if (statItems) statItems.textContent = String(ITEMS.length);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
