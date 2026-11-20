# 📈 마켓펄스 (Market Pulse)

코스피·나스닥·비트코인을 한 화면에서 보는 **한국어 무료 시세 대시보드**입니다.
로그인·결제 없이 바로 쓰고, 정적 파일(HTML/CSS/JS)만으로 동작해 GitHub Pages에 그대로 올리면 서비스됩니다.

- 서비스 주소: `https://hjh7085-bit.github.io/`
- 저장소: `hjh7085-bit/hjh7085-bit.github.io` (⚠️ 이름이 정확히 `<계정>.github.io` 여야 위 주소로 열립니다)

## 화면 구성 (알파스퀘어형 트레이딩 워크스테이션)

1. **상단 바** — 통합 종목 검색(국내·미국·코인) · 연결 상태 · 시계 · 패널 접기 · 다크/라이트
2. **지수 요약 바** — 코스피·코스닥·나스닥·S&P500·USD/KRW·BTC 실시간 흐름
3. **좌측 세로 분석 툴바** — 십자선 · 추세선 · 수평선(지지·저항) · 수직선 · 피보나치 · 사각형(매물대) · 텍스트 · 되돌리기 · 전체 삭제
4. **중앙 차트** — Lightweight Charts 엔진 + **11개 타임프레임**(1·3·5·10·15·30분 · 1·4시간 · 일·주·월봉), 휠 줌·드래그 이동·핀치, `+확대` `−축소` `맞춤` `넓게 보기`. 코인은 업비트 캔들 API, 국내·미국 주식은 일/주/월봉 지연 데이터
5. **보조지표** — MA5/20/60/120 · 볼린저밴드(20,2) · 거래량 · RSI(14) · MACD(12,26,9) 개별 ON/OFF
6. **매매전략 시그널** — 4개 전략(이평선 골든/데드크로스 · RSI 과매도/과매수 · 볼린저 하단 반등 · 정배열 눌림목) 적용 시 **차트 위 매수(▲)·매도(▼) 마커**, **승률·누적 수익률·거래/신호·최대 낙폭**, **지지·저항·추천 손절·목표가(1:2)**
7. **AI 종목 판단** — **매수(빨강)/매도(파랑)/중립(회색) 사인**(패널 상단·차트 헤더 동시 표시), 0~100점 게이지, 실제 계산 수치 근거 4개, 지지·저항·손절·목표, 리스크 요인, 면책 문구
8. **예상 시나리오** — 지지·저항·ATR(14) 기반 **강세/중립/약세 3줄 요약**과 차트 오른쪽 미래 구간의 **빨간(강세)·회색(중립)·파란(약세) 점선 경로**
9. **우측 사이드 패널** — 관심/국내/미국/코인 시세 리스트, 빠른 추가, 뉴스·공시(DART)·메모 탭
10. **관심종목·메모** — 로그인 없이 localStorage 저장, JSON 내보내기

등락 색상은 **한국식(상승 빨강 ▲ / 하락 파랑 ▼)** 으로 고정했습니다.

## 배포 (GitHub Pages)

1. 저장소 이름이 **`hjh7085-bit.github.io`** 인지 확인 (아니면 Settings → General에서 이름 변경).
2. **Settings → Pages → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**.
3. 1~3분 뒤 `https://hjh7085-bit.github.io/` 접속.

```bash
git remote set-url origin https://github.com/hjh7085-bit/hjh7085-bit.github.io.git
git push -u origin main
```

## 데이터 수집 (자동 갱신)

`scripts/fetch_quotes.py` + `scripts/fetch_news.py` 가 데이터를 만들고,
`.github/workflows/update-news.yml` 이 15분마다 실행해 `data/*.json` 을 커밋합니다.

- 시세: 국내 지수·종목 → 네이버 증권 공개 API / 미국 지수·종목·환율 → Yahoo Finance / 코인 → 업비트 Open API
- 뉴스: 연합뉴스(경제·마켓·국제), 한국경제(경제·금융·국제), 아시아경제(증권), 이데일리(증권), 토큰포스트, 코인데스크코리아, 블록미디어 공개 RSS

**워크플로우를 쓰려면**
1. 저장소 → **Settings → Actions → General → Workflow permissions → Read and write** 저장
2. `.github/workflows/update-news.yml` 파일이 저장소에 있어야 합니다.
   GitHub App(Pickle)에 `Workflows` 권한이 없으면 이 파일은 푸시되지 않으므로, 웹에서 **Add file → Create new file** 로 `.github/workflows/update-news.yml` 을 만들어 아래 내용을 붙여넣으세요.

```yaml
name: 시세·뉴스 자동 수집
on:
  schedule:
    - cron: '*/15 * * * *'
  workflow_dispatch:
permissions:
  contents: write
concurrency:
  group: market-data-update
  cancel-in-progress: false
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: python3 scripts/fetch_quotes.py
      - run: python3 scripts/fetch_news.py
      - run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add data/quotes.json data/news.json
          if git diff --quiet --cached; then echo "변경 없음"; else
            git commit -m "chore: 시세·뉴스 자동 갱신 $(date -u +'%Y-%m-%d %H:%M UTC')"
            git push
          fi
```

워크플로우가 없어도 사이트는 마지막으로 커밋된 `data/*.json` 으로 정상 동작합니다.
로컬에서 직접 갱신하려면: `python3 scripts/fetch_quotes.py && python3 scripts/fetch_news.py`

## 폴더 구조

| 경로 | 내용 |
| --- | --- |
| `index.html` | 대시보드 본화면 (SEO·OG·구조화 데이터·광고 슬롯) |
| `privacy.html` | 개인정보 처리방침 (애드센스 승인 요건) |
| `404.html` | 오류 페이지 |
| `assets/css/style.css` | 터미널 스타일 UI, 다크/라이트, 반응형 |
| `assets/js/app.js` | 테마·시계·장 운영시간·종목 카탈로그·검색 유틸 |
| `assets/js/quotes.js` | 지수 바·종목 1줄 리스트·시장 탭 |
| `assets/js/coin.js` | 업비트 REST + WebSocket 실시간 시세 상태 |
| `assets/js/terminal.js` | 차트 엔진·11타임프레임·보조지표·그리기 도구·매매전략 시그널·AI 종목 판단·예상 시나리오 |
| `assets/js/news.js` | 뉴스 목록·시장 필터 |
| `assets/js/watchlist.js` | 관심종목 저장·메모·삭제·내보내기 |
| `data/quotes.json`, `data/news.json` | 자동 수집 데이터 |
| `data/charts-kr.json` `charts-us.json` `charts-coin.json` | 일봉 OHLCV (차트용, 시장별 분리) |
| `scripts/*.py` | 수집·검증 스크립트 (`check_js.py` JS 문법 스모크 테스트, `test_analytics.py` 분석 엔진 실행 테스트) |

## 애드센스 붙이는 방법

1. `index.html` 의 `<head>` 에 애드센스 계정 스크립트 추가
   ```html
   <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
   ```
2. 광고 슬롯 `#ad-slot-top`, `#ad-slot-mid`, `#ad-slot-side` 안에 광고 단위 코드를 넣고 `aria-hidden="true"` 삭제
3. `ads.txt` 주석을 풀고 `pub-...` ID 입력

## 제약과 주의

- 국내주식은 거래소 정책상 **약 15~20분 지연 시세**, 미국주식은 실시간 또는 15분 지연입니다. 초 단위 호가는 증권사 MTS/HTS를 쓰세요.
- 증권사 개인 API(한국투자증권 등)를 공개 화면에 붙이는 것은 약관 위반 소지가 있어, 공개 화면은 지연 시세·차트 중심으로 구성했습니다.
- 뉴스는 제목·링크만 수집하며 본문은 저장하지 않습니다. 저작권은 각 언론사에 있습니다.

## 다음 확장 후보

1. 한국투자증권 KIS Developers API → 비공개(로그인) 탭에서 실시간 국내 시세
2. 커스텀 도메인(`marketpulse.kr`) 연결
3. PWA 설치·가격 알림
4. 관심종목별 뉴스 자동 매칭 고도화(현재는 제목 키워드 매칭)
