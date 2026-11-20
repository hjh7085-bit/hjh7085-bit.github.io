#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
market-pulse 시세 수집기
------------------------------------------------------------
국내 지수·종목: 네이버 증권 공개 API (한국어 종목명)
미국 지수·종목: Yahoo Finance 공개 차트 API
환율: Yahoo Finance
결과를 data/quotes.json 으로 저장합니다. GitHub Actions가 주기적으로 갱신합니다.
(브라우저에서 직접 호출하면 CORS로 막히는 소스라 서버 측에서 모아 정적 JSON으로 배포)
"""
import json
import shutil
import subprocess
import sys
import time
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path

KST = timezone(timedelta(hours=9))
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "quotes.json"

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

# 국내 지수 (네이버 코드, 표시명, TradingView 심볼)
KR_INDEX = [
    ("KOSPI", "코스피", "KRX:KOSPI"),
    ("KOSDAQ", "코스닥", "KRX:KOSDAQ"),
]

# 국내 인기 종목 (코드, 이름, TradingView 심볼)
KR_STOCKS = [
    ("005930", "삼성전자"), ("000660", "SK하이닉스"), ("373220", "LG에너지솔루션"),
    ("207940", "삼성바이오로직스"), ("005380", "현대차"), ("000270", "기아"),
    ("035420", "NAVER"), ("035720", "카카오"), ("068270", "셀트리온"),
    ("012450", "한화에어로스페이스"), ("034020", "두산에너빌리티"), ("196170", "알테오젠"),
    ("247540", "에코프로비엠"), ("042700", "한미반도체"), ("105560", "KB금융"),
]

# 미국 지수 (야후 심볼, 표시명, TradingView 심볼)
US_INDEX = [
    ("^IXIC", "나스닥", "NASDAQ:IXIC"),
    ("^GSPC", "S&P500", "SP:SPX"),
    ("^DJI", "다우존스", "DJ:DJI"),
]

# 미국 인기 종목 (야후 심볼, 표시명, TradingView 심볼)
US_STOCKS = [
    ("NVDA", "엔비디아", "NASDAQ:NVDA"), ("TSLA", "테슬라", "NASDAQ:TSLA"),
    ("AAPL", "애플", "NASDAQ:AAPL"), ("MSFT", "마이크로소프트", "NASDAQ:MSFT"),
    ("GOOGL", "알파벳", "NASDAQ:GOOGL"), ("AMZN", "아마존", "NASDAQ:AMZN"),
    ("META", "메타", "NASDAQ:META"), ("AMD", "AMD", "NASDAQ:AMD"),
    ("PLTR", "팔란티어", "NASDAQ:PLTR"), ("COIN", "코인베이스", "NASDAQ:COIN"),
    ("SPY", "S&P500 ETF", "AMEX:SPY"), ("QQQ", "나스닥100 ETF", "NASDAQ:QQQ"),
]

FX = [("KRW=X", "원/달러", "FX_IDC:USDKRW")]


def http_json(url, headers=None):
    h = {"User-Agent": UA, "Accept": "application/json,text/plain,*/*", "Accept-Language": "ko-KR,ko;q=0.9"}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read().decode("utf-8", "replace"))
    except Exception:
        curl = shutil.which("curl")
        if not curl:
            raise
        out = subprocess.run([curl, "-sSL", "--max-time", "20", "-A", h["User-Agent"], url],
                             capture_output=True, timeout=40).stdout
        return json.loads(out.decode("utf-8", "replace"))


def num(s, default=None):
    if s is None:
        return default
    try:
        return float(str(s).replace(",", "").replace("%", "").strip())
    except Exception:
        return default


def naver_quote(code, name):
    d = http_json(f"https://m.stock.naver.com/api/stock/{code}/basic")
    return {
        "code": code, "name": d.get("stockName") or name,
        "price": num(d.get("closePrice")),
        "change": num(d.get("compareToPreviousClosePrice"), 0.0),
        "ratio": num(d.get("fluctuationsRatio"), 0.0),
        "market": "kr", "symbol": "KRX:" + code,
        "status": d.get("marketStatus"), "tradedAt": d.get("localTradedAt"),
    }


def naver_index(code, name, symbol):
    d = http_json(f"https://m.stock.naver.com/api/index/{code}/basic")
    return {
        "code": code, "name": d.get("stockName") or name,
        "price": num(d.get("closePrice")),
        "change": num(d.get("compareToPreviousClosePrice"), 0.0),
        "ratio": num(d.get("fluctuationsRatio"), 0.0),
        "market": "kr-index", "symbol": symbol,
        "status": d.get("marketStatus"), "tradedAt": d.get("localTradedAt"),
    }


def yahoo_quote(ticker, name, symbol, market):
    d = http_json(f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.request.quote(ticker)}"
                  f"?interval=1d&range=5d")
    meta = d["chart"]["result"][0]["meta"]
    price = meta.get("regularMarketPrice")
    prev = meta.get("chartPreviousClose") or meta.get("previousClose")
    if price is None:
        raise ValueError("no price")
    change = (price - prev) if prev else 0.0
    ratio = (change / prev * 100.0) if prev else 0.0
    return {
        "code": ticker, "name": name,
        "price": round(price, 2), "change": round(change, 2), "ratio": round(ratio, 2),
        "market": market, "symbol": symbol,
        "status": meta.get("marketState"), "tradedAt": None,
        "currency": meta.get("currency"),
    }


def main():
    out = {"generatedAt": datetime.now(KST).isoformat(timespec="seconds"),
           "index": [], "kr": [], "us": [], "fx": [], "errors": []}

    def safe(fn, *args):
        try:
            item = fn(*args)
            if item.get("price") is None:
                raise ValueError("no price")
            return item
        except Exception as e:
            out["errors"].append(f"{args}: {e}")
            print(f"  ! 실패 {args}: {e}", file=sys.stderr)
            return None

    for code, name, symbol in KR_INDEX:
        it = safe(naver_index, code, name, symbol)
        if it:
            out["index"].append(it)
    for code, name in KR_STOCKS:
        it = safe(naver_quote, code, name)
        if it:
            out["kr"].append(it)
    for ticker, name, symbol in US_INDEX:
        it = safe(yahoo_quote, ticker, name, symbol, "us-index")
        if it:
            out["index"].append(it)
    for ticker, name, symbol in US_STOCKS:
        it = safe(yahoo_quote, ticker, name, symbol, "us")
        if it:
            out["us"].append(it)
    for ticker, name, symbol in FX:
        it = safe(yahoo_quote, ticker, name, symbol, "fx")
        if it:
            out["fx"].append(it)

    # 코인은 업비트에서 (지연 폴백용 스냅샷)
    COIN_NAMES = {
        "KRW-BTC": "비트코인", "KRW-ETH": "이더리움", "KRW-XRP": "리플", "KRW-SOL": "솔라나",
        "KRW-DOGE": "도지코인", "KRW-ADA": "에이다", "KRW-AVAX": "아발란체",
        "KRW-LINK": "체인링크", "KRW-TRX": "트론", "KRW-SUI": "수이",
        "KRW-DOT": "폴카닷", "KRW-BCH": "비트코인캐시",
    }
    try:
        url = "https://api.upbit.com/v1/ticker?markets=" + ",".join(COIN_NAMES)
        for t in http_json(url):
            m = t["market"]
            out["index"].append({
                "code": m,
                "name": COIN_NAMES.get(m, m),
                "price": t["trade_price"],
                "change": round(t["trade_price"] - t["prev_closing_price"], 0),
                "ratio": round(t["signed_change_rate"] * 100, 2),
                "market": "coin",
                "symbol": "UPBIT:" + m.split("-")[1] + "KRW",
                "currency": "KRW",
                "status": "OPEN",
                "tradedAt": datetime.now(KST).isoformat(timespec="seconds"),
            })
    except Exception as e:
        out["errors"].append(f"upbit: {e}")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"저장 완료: {OUT} · 지수 {len(out['index'])} · 국내 {len(out['kr'])} · "
          f"미국 {len(out['us'])} · 환율 {len(out['fx'])} · 오류 {len(out['errors'])}")
    if not out["kr"] or not out["us"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
