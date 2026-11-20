/* ==========================================================================
   팩트체크 건강연구소 · 약물 + 영양제 금지 조합 검색기
   선택한 약·영양제 조합에서 확인된 상호작용을 3단계로 보여줍니다.
   --------------------------------------------------------------------------
   ⚠️ 허가사항·공개 상호작용 자료를 정리한 '참고용' 도구입니다. 전체 상호작용의
   일부이며, 복용 조정은 처방 의사·약사와 상의해야 합니다.
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

  /* ------------------------------------------------------------------ 목록 */
  var DRUGS = [
    { id: "apap", name: "타이레놀 · 아세트아미노펜", sub: "해열진통제" },
    { id: "nsaid", name: "이부프로펜 · NSAID", sub: "소염진통제" },
    { id: "abx", name: "항생제", sub: "테트라사이클린 · 퀴놀론 계열" },
    { id: "acei", name: "혈압약 ACEi/ARB", sub: "라미프릴 · 로사르탄 등" },
    { id: "diuretic", name: "이뇨제", sub: "티아지드 · 루프" },
    { id: "ppi", name: "위장약 PPI", sub: "오메프라졸 · 에소메프라졸" },
    { id: "statin", name: "고지혈증 스타틴", sub: "아토르바 · 로수바 · 심바" },
    { id: "metformin", name: "당뇨약 메트포르민", sub: "메트포르민 단일·복합" },
    { id: "asa", name: "저용량 아스피린", sub: "100mg · 심혈관 예방" },
    { id: "warfarin", name: "와파린", sub: "항응고제 · INR 관리" }
  ];

  var SUPPS = [
    { id: "omega3", name: "오메가3", sub: "EPA+DHA 고용량" },
    { id: "vitk", name: "비타민K", sub: "보충제·K2" },
    { id: "vite", name: "비타민E", sub: "고용량 (400IU+)" },
    { id: "coq10", name: "코엔자임Q10", sub: "유비퀴논·유비퀴놀" },
    { id: "mg", name: "마그네슘", sub: "산화·글리시네이트" },
    { id: "ca", name: "칼슘", sub: "탄산·구연산" },
    { id: "fe", name: "철분", sub: "훼로바 등" },
    { id: "zn", name: "아연", sub: "단일제·트로키" },
    { id: "k", name: "칼륨", sub: "보충제·소금대체" },
    { id: "b12", name: "비타민B12", sub: "메코발라민" },
    { id: "folate", name: "엽산", sub: "합성 엽산 1mg" },
    { id: "vitd", name: "비타민D", sub: "고용량 5,000IU+" },
    { id: "probio", name: "유산균", sub: "프로바이오틱스" },
    { id: "niacin", name: "나이아신", sub: "고용량 (500mg+)" },
    { id: "ginkgo", name: "은행잎", sub: "혈행 개선" },
    { id: "sjw", name: "세인트존스워트", sub: "우울감 허브" }
  ];

  var NAME = {};
  DRUGS.concat(SUPPS).forEach(function (x) { NAME[x.id] = x.name; });

  /* ------------------------------------------------------------------ 규칙 */
  var RULES = [
    /* ---------- 🔴 피해야 할 조합 ---------- */
    { lvl: "red", d: ["warfarin"], s: ["vitk"], t: "와파린 + 비타민K 보충제",
      m: "비타민K는 와파린이 막는 비타민K 순환을 되살려 항응고 효과를 직접 떨어뜨립니다. INR이 낮아져 혈전 위험이 올라갑니다.",
      a: "비타민K 고용량 보충제는 피하세요. 잎채소(시금치·케일·낫토)는 끊지 말고 매일 비슷한 양으로 일정하게 먹는 것이 원칙입니다.",
      src: "와파린 허가사항 · NIH ODS Vitamin K" },
    { lvl: "red", d: ["warfarin"], s: ["sjw"], t: "와파린 + 세인트존스워트",
      m: "세인트존스워트는 간 효소(CYP3A4 등)를 유도해 와파린 농도를 낮춥니다. INR이 떨어져 항응고 효과가 사라질 수 있습니다.",
      a: "와파린 복용 중에는 세인트존스워트를 쓰지 마세요. 이미 먹고 있다면 중단 전에 처방 의사에게 알리세요(중단만으로도 INR이 흔들립니다).",
      src: "NIH NCCIH · 상호작용 자료" },
    { lvl: "red", d: ["asa", "nsaid"], t: "아스피린 + 이부프로펜(NSAID)",
      m: "둘 다 위 점막을 약하게 하고 출혈 위험을 더합니다. 또 이부프로펜이 혈소판 COX-1 자리를 먼저 차지해 아스피린의 항혈소판 효과를 무력화할 수 있습니다.",
      a: "가능하면 다른 진통제(아세트아미노펜)를 쓰세요. 이부프로펜이 꼭 필요하면 아스피린 복용 2시간 전 또는 8시간 후에 먹고, 장기 병용은 피하세요.",
      src: "FDA 아스피린·NSAID 상호작용 안내" },
    { lvl: "red", d: ["asa", "warfarin"], t: "아스피린 + 와파린",
      m: "항혈소판 + 항응고 작용이 겹쳐 위장관·뇌출혈 위험이 크게 올라갑니다.",
      a: "심장·뇌혈관 질환으로 두 약을 함께 처방받는 경우가 있지만, 반드시 의사가 위험을 평가한 조합입니다. 임의로 추가하거나 빼지 말고 출혈 증상(검은 변·멍·잇몸 출혈)을 확인하세요.",
      src: "각 허가사항 · 항혈전 지침" },
    { lvl: "red", d: ["acei"], s: ["k"], t: "혈압약(ACEi/ARB) + 칼륨 보충",
      m: "ACE 억제제·ARB는 신장에서 칼륨 배출을 줄여 혈중 칼륨을 올립니다. 칼륨 보충제나 칼륨 소금까지 더하면 고칼륨혈증으로 부정맥이 올 수 있습니다.",
      a: "칼륨 보충제·칼륨 함유 소금 대체품은 임의로 쓰지 마세요. 혈액검사로 칼륨 수치를 확인하고, 의사가 판단한 경우에만 보충합니다.",
      src: "ACEi/ARB 허가사항" },
    { lvl: "red", d: ["diuretic"], s: ["k"], t: "이뇨제 + 칼륨 보충",
      m: "이뇨제 종류에 따라 위험이 정반대입니다. 티아지드·루프 이뇨제는 칼륨을 빼내지만, 칼륨보존성 이뇨제(스피로노락톤 등)는 칼륨을 남겨 보충 시 치명적 고칼륨혈증이 생길 수 있습니다.",
      a: "내가 먹는 이뇨제가 어느 종류인지 먼저 확인하세요. 칼륨 보충은 반드시 의사 지시와 혈액검사에 따라야 합니다.",
      src: "이뇨제 허가사항" },

    /* ---------- 🟡 시간 간격 · 주의 ---------- */
    { lvl: "amber", d: ["warfarin"], s: ["omega3"], t: "와파린 + 오메가3 고용량",
      m: "고용량 EPA+DHA는 혈소판 기능을 약화시켜 출혈 시간을 늘릴 수 있습니다. 임상적으로 큰 문제는 드물지만 INR과 출혈 증상을 함께 봐야 합니다.",
      a: "하루 1,000mg 이내는 대체로 문제가 적지만, 2,000mg 이상 또는 수술 전에는 의사에게 알리세요. 멍·잇몸 출혈이 늘면 확인이 필요합니다.",
      src: "오메가3·항응고제 상호작용 리뷰" },
    { lvl: "amber", d: ["warfarin"], s: ["ginkgo"], t: "와파린 + 은행잎",
      m: "은행잎은 혈소판 활성화를 억제해 출혈 경향을 더할 수 있습니다.",
      a: "함께 쓰지 않는 것이 안전합니다. 혈행 개선 목적이면 다른 방법을 의사와 상의하세요.",
      src: "NIH NCCIH Ginkgo" },
    { lvl: "amber", d: ["warfarin"], s: ["coq10"], t: "와파린 + 코엔자임Q10",
      m: "코큐텐이 비타민K와 구조가 비슷해 와파린 효과를 감소시킨 사례가 보고되었습니다(INR 하락).",
      a: "복용한다면 시작·중단 시점에 INR을 확인하세요. INR 변동이 있으면 용량 조정이 필요할 수 있습니다.",
      src: "코큐텐-와파린 상호작용 보고" },
    { lvl: "amber", d: ["warfarin", "abx"], t: "와파린 + 항생제",
      m: "항생제가 장내 세균의 비타민K 합성을 줄이고, 일부 항생제는 와파린 대사도 방해해 INR이 오를 수 있습니다.",
      a: "항생제를 시작하면 INR을 더 자주 확인하세요. 검은 변·코피·멍이 늘면 즉시 진료.",
      src: "와파린 허가사항" },
    { lvl: "amber", d: ["apap", "warfarin"], t: "아세트아미노펜(고용량·장기) + 와파린",
      m: "매일 2g 이상을 며칠 이상 먹으면 INR이 올라 출혈 위험이 커진다는 보고가 있습니다.",
      a: "가끔 먹는 정도는 괜찮지만, 매일 먹어야 한다면 INR 확인 일정을 의사에게 알리세요.",
      src: "와파린 허가사항 · 임상 보고" },
    { lvl: "amber", d: ["asa"], s: ["omega3"], t: "아스피린 + 오메가3 고용량",
      m: "둘 다 출혈 경향을 늘립니다. 특히 고용량 오메가3에서 위장 출혈 보고가 있습니다.",
      a: "2,000mg 이상은 피하고, 위장 장애·검은 변이 있으면 확인하세요.",
      src: "오메가3 허가사항(고용량)" },
    { lvl: "amber", d: ["asa"], s: ["vite"], t: "아스피린 + 비타민E 고용량",
      m: "비타민E 400IU 이상은 혈소판 기능을 억제해 출혈 시간을 늘립니다.",
      a: "400IU 이하로 줄이거나 중단을 고려하고, 수술 전에는 2주 전 중단을 상의하세요.",
      src: "NIH ODS Vitamin E" },
    { lvl: "amber", d: ["asa"], s: ["ginkgo"], t: "아스피린 + 은행잎",
      m: "은행잎의 항혈소판 작용이 아스피린과 겹쳐 출혈 위험을 더합니다.",
      a: "수술·시술 전에는 반드시 중단하고 의료진에게 알리세요.",
      src: "NIH NCCIH Ginkgo" },
    { lvl: "amber", d: ["nsaid"], s: ["omega3"], t: "NSAID + 오메가3 고용량",
      m: "위 점막 자극과 출혈 경향이 겹칩니다.",
      a: "같은 날 복용은 식후로 하고, 위장 장애가 있으면 PPI 필요 여부를 의사와 상의하세요.",
      src: "상호작용 자료" },
    { lvl: "amber", d: ["nsaid"], s: ["vite"], t: "NSAID + 비타민E 고용량",
      m: "출혈 시간 연장이 겹칠 수 있습니다.",
      a: "비타민E는 400IU 이하로, 위장 출혈 증상(흑색변·속쓰림)을 확인하세요.",
      src: "NIH ODS Vitamin E" },
    { lvl: "amber", d: ["apap", "nsaid"], t: "아세트아미노펜 + 이부프로펜",
      m: "단기 교차 복용은 흔하지만, 장기 병용은 신장 부담과 위장 출혈 위험을 높입니다.",
      a: "최소 용량·최소 기간으로 쓰고, 3일 이상 이어지면 진료를 받으세요. 음주 중에는 아세트아미노펜을 피하세요.",
      src: "진통제 병용 지침" },
    { lvl: "amber", d: ["abx"], s: ["ca"], t: "항생제(테트라사이클린·퀴놀론) + 칼슘", kind: "time",
      m: "칼슘이 항생제와 결합(킬레이트)해 항생제 흡수를 크게 떨어뜨립니다. 약효가 안 나올 수 있습니다.",
      a: "항생제와 2시간 이상(퀴놀론은 2~4시간) 간격을 두세요. 우유·유제품도 같은 원리입니다.",
      src: "항생제 허가사항" },
    { lvl: "amber", d: ["abx"], s: ["mg"], t: "항생제 + 마그네슘", kind: "time",
      m: "마그네슘도 킬레이트를 형성해 항생제 흡수를 낮춥니다.",
      a: "2시간 이상 간격. 항생제 복용 기간에는 마그네슘을 잠시 미루는 것도 방법입니다.",
      src: "항생제 허가사항" },
    { lvl: "amber", d: ["abx"], s: ["fe"], t: "항생제 + 철분", kind: "time",
      m: "철분이 항생제와 결합해 흡수를 방해합니다. 반대로 항생제가 철분 흡수도 줄입니다.",
      a: "2시간 이상 간격을 두고, 철분은 비타민C와 함께 따로 드세요.",
      src: "항생제 허가사항" },
    { lvl: "amber", d: ["abx"], s: ["zn"], t: "항생제 + 아연", kind: "time",
      m: "아연도 퀴놀론·테트라사이클린과 결합해 약효를 떨어뜨립니다.",
      a: "2시간 이상 간격. 감기 트로키를 항생제와 함께 먹지 마세요.",
      src: "항생제 허가사항" },
    { lvl: "amber", d: ["abx"], s: ["probio"], t: "항생제 + 유산균", kind: "time",
      m: "항생제가 유산균을 죽여 효과가 줄어듭니다. 다만 항생제 관련 설사 예방 목적이라면 간격을 두고 쓰는 것이 권장됩니다.",
      a: "2시간 이상 간격을 두세요. 설사 예방에는 Saccharomyces boulardii의 근거가 가장 일관됩니다(중심정맥관·면역 억제 시 주의).",
      src: "국제 임상 가이드(Hungin 2013 등)" },
    { lvl: "amber", d: ["ppi"], s: ["fe"], t: "PPI + 철분",
      m: "철분 흡수에는 위산이 필요합니다. PPI는 위산을 줄여 철분 흡수를 떨어뜨립니다.",
      a: "비타민C와 함께 먹거나, 흡수가 위산에 덜 의존하는 제형(비스글리시네이트 등)을 약사와 상의하세요.",
      src: "PPI 허가사항 · 철분 흡수 문헌" },
    { lvl: "amber", d: ["ppi"], s: ["ca"], t: "PPI + 칼슘(탄산칼슘)",
      m: "탄산칼슘은 위산이 있어야 잘 녹습니다. PPI 장기 복용 시 흡수가 떨어집니다.",
      a: "구연산칼슘으로 바꾸면 위산 없이도 흡수됩니다.",
      src: "PPI 허가사항" },
    { lvl: "amber", d: ["diuretic"], s: ["vitd"], t: "이뇨제(티아지드) + 비타민D 고용량",
      m: "티아지드는 칼슘 배출을 줄입니다. 고용량 비타민D·칼슘을 더하면 고칼슘혈증이 생길 수 있습니다.",
      a: "비타민D 4,000IU 이상 장기 복용 시 칼슘 수치를 확인하고, 갈증·다뇨·변비가 생기면 진료를 받으세요.",
      src: "티아지드 허가사항" },
    { lvl: "amber", d: ["statin"], s: ["niacin"], t: "스타틴 + 고용량 나이아신",
      m: "고용량 나이아신(500mg 이상)은 근육병증 위험을 높입니다.",
      a: "함께 쓰려면 근육통·CK 확인이 필요합니다. 임의로 고용량 나이아신을 추가하지 마세요.",
      src: "스타틴·나이아신 상호작용" },
    { lvl: "amber", d: ["statin"], s: ["sjw"], t: "스타틴 + 세인트존스워트",
      m: "세인트존스워트가 CYP3A4를 유도해 심바스타틴·아토르바스타틴 농도를 낮춥니다. 약효가 줄어듭니다.",
      a: "스타틴 복용 중에는 피하세요. 특히 심바스타틴에서 상호작용이 큽니다.",
      src: "FDA 스타틴 상호작용 안내" },
    { lvl: "amber", t: "칼슘 + 철분", kind: "time", s: ["ca", "fe"],
      m: "칼슘과 철분은 같은 흡수 통로를 두고 경쟁해 함께 먹으면 흡수가 줄어듭니다.",
      a: "2시간 이상 간격을 두고, 철분은 공복 또는 비타민C와 함께 드세요.",
      src: "미네랄 흡수 경쟁 문헌" },
    { lvl: "amber", t: "아연 + 철분(고용량)", kind: "time", s: ["zn", "fe"],
      m: "고용량 아연과 철분은 서로 흡수를 방해합니다.",
      a: "2시간 이상 간격. 아연을 35mg 이상 장기 복용하면 구리 1~2mg을 함께 고려하세요.",
      src: "미네랄 흡수 경쟁 문헌" },
    { lvl: "amber", t: "고용량 엽산 + 비타민B12", s: ["folate", "b12"],
      m: "엽산 1mg 이상은 비타민B12 결핍으로 생기는 빈혈을 가려 신경 손상이 늦게 발견될 수 있습니다.",
      a: "엽산 고용량을 먹는다면 B12 수치를 함께 확인하세요. 고령·메트포르민 장기 복용자는 특히.",
      src: "NIH ODS Folate" },

    /* ---------- 🟢 보완 추천 ---------- */
    { lvl: "green", d: ["statin"], s: ["coq10"], t: "스타틴 → 코엔자임Q10",
      m: "스타틴은 콜레스테롤 합성 경로에서 코큐텐 합성도 함께 줄입니다. 근육 증상 개선 근거는 엇갈리지만 보충은 안전한 편입니다.",
      a: "근육통이 있다면 코큐텐을 먼저 의지하기보다 스타틴 종류·용량 조정과 CK 검사를 의사와 상의하세요. 보충은 100~200mg이 흔합니다.",
      src: "스타틴 관련 근육 증상 문헌" },
    { lvl: "green", d: ["metformin"], s: ["b12"], t: "메트포르민 → 비타민B12",
      m: "메트포르민 장기 복용은 비타민B12 흡수를 줄여 결핍과 말초신경병증 위험을 높입니다.",
      a: "연 1회 B12 수치 확인을 권합니다. 4년 이상 복용자, 고령, 채식주의자라면 특히.",
      src: "ADA Standards of Care · 메트포르민 허가사항" },
    { lvl: "green", d: ["ppi"], s: ["b12"], t: "PPI 장기복용 → 비타민B12",
      m: "위산이 줄면 음식 속 B12를 분리·흡수하기 어려워집니다.",
      a: "수치를 확인하고 부족하면 보충하세요. 1년 이상 복용자에게 흔합니다.",
      src: "FDA PPI 안전성 정보 · 문헌" },
    { lvl: "green", d: ["ppi"], s: ["mg"], t: "PPI 장기복용 → 마그네슘 확인",
      m: "PPI 장기 복용 시 저마그네슘혈증이 보고되어 FDA가 2011년 안전성 정보를 냈습니다.",
      a: "3개월 이상 복용자에서 경련·근육경련·부정맥이 있으면 마그네슘 수치를 확인하세요.",
      src: "FDA Drug Safety Communication(2011)" },
    { lvl: "green", d: ["diuretic"], s: ["mg"], t: "이뇨제 → 마그네슘·칼륨 확인",
      m: "루프·티아지드 이뇨제는 소변으로 마그네슘과 칼륨을 배출합니다.",
      a: "정기 혈액검사로 확인하고, 보충 여부는 의사와 결정하세요(칼륨 보충은 특히 주의).",
      src: "이뇨제 허가사항" },
    { lvl: "green", d: ["acei"], s: ["zn"], t: "ACE 억제제 → 아연",
      m: "ACE 억제제에서 미각 이상이 보고되며, 아연 상태와 연관될 수 있다는 관찰이 있습니다(인과 근거는 제한적).",
      a: "미각 변화가 있다면 아연 수치를 확인하세요. 35mg 이상 장기 복용은 구리 결핍에 주의.",
      src: "ACEi 부작용 문헌" },
    { lvl: "green", d: ["statin"], s: ["omega3"], t: "스타틴 + 오메가3",
      m: "중성지방을 함께 관리하는 조합으로, 상호작용 위험이 낮습니다.",
      a: "오메가3는 지방이 포함된 식사와 함께. 고용량(2g+)은 출혈 경향을 확인하세요.",
      src: "스타틴·오메가3 병용 문헌" },
    { lvl: "green", s: ["fe", "vite"], t: "철분 + 비타민C",
      m: "비타민C는 비헴철 흡수를 2~3배까지 높입니다.",
      a: "철분제를 비타민C 100~200mg과 함께, 또는 식후 과일과 함께 드세요.",
      src: "철분 흡수 문헌" }
  ];

  var selected = { d: [], s: [] };
  var lastResult = null;

  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ------------------------------------------------------------------ 목록 UI */
  function itemHTML(x, group) {
    var on = selected[group].indexOf(x.id) >= 0;
    return '<label class="item">' +
      '<input type="checkbox" data-group="' + group + '" data-id="' + x.id + '"' + (on ? " checked" : "") + ">" +
      '<span class="item__box" aria-hidden="true"></span>' +
      '<span class="item__text"><span class="item__name">' + esc(x.name) + '</span><span class="item__sub">' + esc(x.sub) + "</span></span>" +
      "</label>";
  }

  function renderLists() {
    $("#drugGrid").innerHTML = DRUGS.map(function (x) { return itemHTML(x, "d"); }).join("");
    $("#suppGrid").innerHTML = SUPPS.map(function (x) { return itemHTML(x, "s"); }).join("");
    updateCounts();
  }

  function updateCounts() {
    $("#drugCount").textContent = selected.d.length + "개 선택";
    $("#suppCount").textContent = selected.s.length + "개 선택";
    if (selected.d.length || selected.s.length) {
      $("#countText").textContent = "약 " + selected.d.length + " · 영양제 " + selected.s.length;
      $("#countHint").textContent = "입력하는 즉시 조합을 확인합니다";
    } else {
      $("#countText").textContent = "조합을 고르면 바로 확인";
      $("#countHint").textContent = "약·영양제 모두 해당되는 것만";
    }
  }

  function onToggle(e) {
    var input = e.target;
    if (!input || input.tagName !== "INPUT") return;
    var group = input.getAttribute("data-group");
    var id = input.getAttribute("data-id");
    if (!group || !id) return;
    var arr = selected[group];
    var i = arr.indexOf(id);
    if (input.checked && i < 0) arr.push(id);
    if (!input.checked && i >= 0) arr.splice(i, 1);
    updateCounts();
    if (selected.d.length || selected.s.length) analyze(false);
    else {
      $("#result").hidden = true;
      lastResult = null;
    }
  }

  /* ------------------------------------------------------------------ 판정 */
  function match(rule) {
    var d = rule.d || [], s = rule.s || [];
    if (!d.length && !s.length) return false;
    for (var i = 0; i < d.length; i++) if (selected.d.indexOf(d[i]) < 0) return false;
    for (var j = 0; j < s.length; j++) if (selected.s.indexOf(s[j]) < 0) return false;
    return true;
  }

  function analyze(scroll) {
    if (!selected.d.length && !selected.s.length) return;

    var hits = RULES.filter(match);
    var red = hits.filter(function (r) { return r.lvl === "red"; });
    var amber = hits.filter(function (r) { return r.lvl === "amber"; });
    var green = hits.filter(function (r) { return r.lvl === "green"; });

    lastResult = { red: red, amber: amber, green: green, hits: hits };

    var names = selected.d.concat(selected.s).map(function (id) { return NAME[id]; });
    $("#resultSub").textContent = "약 " + selected.d.length + "종 · 영양제 " + selected.s.length + "종 · 확인된 조합 " + hits.length + "건";

    $("#selectedBadges").innerHTML = selected.d.map(function (id) {
      return '<span class="tbadge">💊 ' + esc(NAME[id]) + "</span>";
    }).concat(selected.s.map(function (id) {
      return '<span class="tbadge">🧴 ' + esc(NAME[id]) + "</span>";
    })).join("");

    var box;
    if (red.length) {
      box = '<div class="verdict verdict--red">' +
        '<span class="verdict__badge">🔴 피해야 할 조합 ' + red.length + "건</span>" +
        '<p class="verdict__title">' + esc(red[0].t) + (red.length > 1 ? " 외 " + (red.length - 1) + "건" : "") + "</p>" +
        '<p class="verdict__desc">선택한 조합에 <b>함께 먹지 말아야 할 것</b>이 있습니다. 아래 조합을 먼저 확인하고, 복용 순서·간격은 처방 의사·약사에게 확인하세요. 약을 임의로 중단하면 더 위험할 수 있습니다.</p></div>';
    } else if (amber.length) {
      box = '<div class="verdict verdict--amber">' +
        '<span class="verdict__badge">🟡 주의 ' + amber.length + "건</span>" +
        '<p class="verdict__title">' + esc(amber[0].t) + (amber.length > 1 ? " 외 " + (amber.length - 1) + "건" : "") + "</p>" +
        '<p class="verdict__desc">함께 먹어도 되지만 <b>시간 간격이나 용량 조절</b>이 필요합니다. 대부분 2시간 이상 간격으로 해결되며, 아래 항목에서 정확한 방법을 확인하세요.</p></div>';
    } else if (green.length) {
      box = '<div class="verdict verdict--green">' +
        '<span class="verdict__badge">🟢 충돌 없음</span>' +
        '<p class="verdict__title">확인된 금지 조합이 없습니다</p>' +
        '<p class="verdict__desc">선택한 조합에서는 이 목록이 다루는 주요 상호작용이 발견되지 않았습니다. 다만 전체 상호작용의 일부만 담고 있으니, <b>처방약의 개별 상호작용은 약사에게</b> 확인하세요.</p></div>';
    } else {
      box = '<div class="verdict verdict--green">' +
        '<span class="verdict__badge">🟢 해당 없음</span>' +
        '<p class="verdict__title">이 목록에서 확인된 조합이 없습니다</p>' +
        '<p class="verdict__desc">선택한 약·영양제 조합 중 이 검색기가 다루는 규칙에 걸리는 것은 없습니다. 하지만 <b>목록에 없다고 안전을 보장하지 않습니다.</b> 복용 중인 약은 약사에게 한 번에 보여주고 확인하는 것이 가장 확실합니다.</p></div>';
    }
    $("#verdictBox").innerHTML = box;

    $("#metricRow").innerHTML =
      metric("🔴 피할 조합", red.length + "건", red.length ? "함께 먹지 않기" : "없음", red.length ? "red" : "green") +
      metric("🟡 시간 분리", amber.length + "건", amber.length ? "2시간 이상 간격" : "없음", amber.length ? "amber" : "green") +
      metric("🟢 보완 추천", green.length + "건", green.length ? "챙기면 좋음" : "없음", "green");

    $("#ruleArea").innerHTML =
      groupHTML("red", "🔴 피해야 할 조합", red, "함께 먹지 않기") +
      groupHTML("amber", "🟡 시간 간격 · 주의", amber, "2시간 이상 떨어뜨리기") +
      groupHTML("green", "🟢 보완 추천", green, "챙기면 좋음");

    $("#result").hidden = false;
    if (scroll) {
      setTimeout(function () { $("#result").scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
    }
  }

  function groupHTML(lvl, title, list, badge) {
    if (!list.length) return "";
    var cards = list.map(function (r) {
      return '<div class="rule rule--' + lvl + '">' +
        '<div class="rule__head"><span class="rule__level">' +
        (lvl === "red" ? "함께 먹지 않기" : lvl === "green" ? "챙기면 좋음" : (r.kind === "time" ? "2시간 이상 간격" : "용량·종류 주의")) + "</span>" +
        '<h4 class="rule__title">' + esc(r.t) + "</h4></div>" +
        '<p class="rule__body"><b>왜</b> · ' + esc(r.m) + "</p>" +
        '<p class="rule__body"><b>이렇게</b> · ' + esc(r.a) + "</p>" +
        '<div class="rule__foot"><span class="rule__source">근거 · <b>' + esc(r.src) + "</b></span></div>" +
        "</div>";
    }).join("");
    return '<div class="rule-group rule-group--' + lvl + '">' +
      '<div class="rule-group__head"><span class="rule-group__title">' + title + "</span>" +
      '<span class="rule-group__badge">' + list.length + "건</span></div>" +
      '<div class="rule-list">' + cards + "</div></div>";
  }

  function metric(label, value, sub, tone) {
    var color = tone === "red" ? "var(--red)" : tone === "amber" ? "var(--amber)" : "var(--green)";
    return '<div class="metric"><p class="metric__label">' + label + '</p>' +
      '<p class="metric__value" style="color:' + color + '">' + value + "</p>" +
      '<p class="metric__sub">' + sub + "</p></div>";
  }

  /* ------------------------------------------------------------------ 복사 */
  function copyResult() {
    if (!lastResult) return;
    var r = lastResult;
    var lines = ["[팩트체크 건강연구소] 약물·영양제 조합 확인"];
    lines.push("약: " + selected.d.map(function (id) { return NAME[id]; }).join(", "));
    lines.push("영양제: " + selected.s.map(function (id) { return NAME[id]; }).join(", "));
    [["🔴 피해야 할 조합", r.red], ["🟡 시간 간격", r.amber], ["🟢 보완 추천", r.green]].forEach(function (g) {
      if (!g[1].length) return;
      lines.push("");
      lines.push(g[0]);
      g[1].forEach(function (x) { lines.push("· " + x.t + " — " + x.a); });
    });
    lines.push("");
    lines.push("https://hjh7085-bit.github.io/drug-check/");
    lines.push("※ 참고용입니다. 복용 조정은 처방 의사·약사와 상의하세요.");
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

  /* ------------------------------------------------------------------ 프리셋 */
  var PRESETS = {
    statin: { d: ["statin"], s: ["omega3", "coq10", "vite"] },
    warfarin: { d: ["warfarin"], s: ["vitk", "ginkgo", "omega3"] },
    abx: { d: ["abx"], s: ["ca", "fe", "probio"] }
  };

  function applyPreset(key) {
    var p = PRESETS[key];
    if (!p) return;
    selected.d = p.d.slice();
    selected.s = p.s.slice();
    renderLists();
    $$(".preset").forEach(function (b) { b.classList.toggle("is-active", b.dataset.preset === key); });
    analyze(true);
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
    renderLists();

    ["#drugGrid", "#suppGrid"].forEach(function (sel) {
      $(sel).addEventListener("change", function (e) {
        $$(".preset").forEach(function (b) { b.classList.remove("is-active"); });
        onToggle(e);
      });
    });

    $("#analyzeBtn").addEventListener("click", function () {
      if (!selected.d.length && !selected.s.length) { toast("약이나 영양제를 먼저 선택해 주세요"); return; }
      analyze(true);
    });
    $("#resetBtn").addEventListener("click", function () {
      selected.d = [];
      selected.s = [];
      renderLists();
      $("#result").hidden = true;
      lastResult = null;
      $$(".preset").forEach(function (b) { b.classList.remove("is-active"); });
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
