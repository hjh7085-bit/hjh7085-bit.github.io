#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
market-pulse 차트 데이터 수집기 (일봉 5년치)
------------------------------------------------------------
국내·미국 주식/지수: Yahoo Finance chart API 에서 5년치(약 1,250 거래일) 일봉을 받아
data/charts-kr.json / charts-us.json 으로 저장한다. (주/월봉은 브라우저에서 리샘플)
국내 종목은 네이버 증권 API(최근 110일)를 우선 시도하고, 부족하면 Yahoo(5년)로 채운다.
코인: 업비트 공개 API (일봉 200개).
분봉/시간봉은 fetch_intraday.py 가 data/intra/*.json 으로 따로 만든다.
"""
import json
import shutil
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path

KST = timezone(timedelta(hours=9))
ROOT = Path(__file__).resolve().parent.parent
OUT_KR = ROOT / "data" / "charts-kr.json"
OUT_US = ROOT / "data" / "charts-us.json"
OUT_COIN = ROOT / "data" / "charts-coin.json"

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

MAX_BARS = 1300  # 약 5년치 거래일

# 국내: (TradingView 심볼, 종류, 코드, 한국어 이름, Yahoo 티커)
SERIES = [
    ("KRX:KOSPI", "index", "KOSPI", "코스피", "^KS11"),
    ("KRX:KOSDAQ", "index", "KOSDAQ", "코스닥", "^KQ11"),
    ("KRX:005930", "item", "005930", "삼성전자", "005930.KS"),
    ("KRX:000660", "item", "000660", "SK하이닉스", "000660.KS"),
    ("KRX:373220", "item", "373220", "LG에너지솔루션", "373220.KS"),
    ("KRX:207940", "item", "207940", "삼성바이오로직스", "207940.KS"),
    ("KRX:005380", "item", "005380", "현대차", "005380.KS"),
    ("KRX:000270", "item", "000270", "기아", "000270.KS"),
    ("KRX:035420", "item", "035420", "NAVER", "035420.KS"),
    ("KRX:035720", "item", "035720", "카카오", "035720.KS"),
    ("KRX:068270", "item", "068270", "셀트리온", "068270.KS"),
    ("KRX:012450", "item", "012450", "한화에어로스페이스", "012450.KS"),
    ("KRX:034020", "item", "034020", "두산에너빌리티", "034020.KS"),
    ("KRX:196170", "item", "196170", "알테오젠", "196170.KQ"),
    ("KRX:247540", "item", "247540", "에코프로비엠", "247540.KQ"),
    ("KRX:042700", "item", "042700", "한미반도체", "042700.KS"),
    ("KRX:105560", "item", "105560", "KB금융", "105560.KS"),
    ("KRX:005490", "item", "005490", "POSCO홀딩스", "005490.KS"),
    ("KRX:006400", "item", "006400", "삼성SDI", "006400.KS"),
    ("KRX:051910", "item", "051910", "LG화학", "051910.KS"),
    ("KRX:329180", "item", "329180", "HD현대중공업", "329180.KS"),
    ("KRX:259960", "item", "259960", "크래프톤", "259960.KS"),
]

# 해외: (TradingView 심볼, Yahoo 티커, 한국어 이름, 통화)
YAHOO_SERIES = [
    ("NASDAQ:IXIC", "^IXIC", "나스닥 종합", "USD"),
    ("SP:SPX", "^GSPC", "S&P500", "USD"),
    ("DJ:DJI", "^DJI", "다우존스", "USD"),
    ("NASDAQ:NVDA", "NVDA", "엔비디아", "USD"),
    ("NASDAQ:TSLA", "TSLA", "테슬라", "USD"),
    ("NASDAQ:AAPL", "AAPL", "애플", "USD"),
    ("NASDAQ:MSFT", "MSFT", "마이크로소프트", "USD"),
    ("NASDAQ:GOOGL", "GOOGL", "알파벳", "USD"),
    ("NASDAQ:AMZN", "AMZN", "아마존", "USD"),
    ("NASDAQ:META", "META", "메타", "USD"),
    ("NASDAQ:AMD", "AMD", "AMD", "USD"),
    ("NASDAQ:AVGO", "AVGO", "브로드컴", "USD"),
    ("NASDAQ:PLTR", "PLTR", "팔란티어", "USD"),
    ("NASDAQ:COIN", "COIN", "코인베이스", "USD"),
    ("NASDAQ:MSTR", "MSTR", "스트래티지", "USD"),
    ("NASDAQ:NFLX", "NFLX", "넷플릭스", "USD"),
    ("NYSE:JPM", "JPM", "JP모건", "USD"),
    ("NYSE:XOM", "XOM", "엑슨모빌", "USD"),
    ("AMEX:SPY", "SPY", "S&P500 ETF", "USD"),
    ("NASDAQ:QQQ", "QQQ", "나스닥100 ETF", "USD"),
    ("NYSE:TSM", "TSM", "TSMC", "USD"),
]

COINS = [
    ("KRW-BTC", "비트코인"), ("KRW-ETH", "이더리움"), ("KRW-XRP", "리플"),
    ("KRW-SOL", "솔라나"), ("KRW-DOGE", "도지코인"), ("KRW-ADA", "에이다"),
    ("KRW-AVAX", "아발란체"), ("KRW-LINK", "체인링크"), ("KRW-TRX", "트론"),
    ("KRW-SUI", "수이"), ("KRW-DOT", "폴카닷"), ("KRW-BCH", "비트코인캐시"),
]


def http_json(url):
    h = {"User-Agent": UA, "Accept": "application/json,*/*"}
    req = urllib.request.Request(url, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return json.loads(r.read().decode("utf-8", "replace"))
    except Exception:
        curl = shutil.which("curl")
        if not curl:
            raise
        out = subprocess.run([curl, "-sSL", "--max-time", "30", "-A", UA, url],
                             capture_output=True, timeout=50).stdout
        return json.loads(out.decode("utf-8", "replace"))


def naver_bars(kind, code):
    url = f"https://api.stock.naver.com/chart/domestic/{kind}/{code}?periodType=dayCandle"
    d = http_json(url)
    rows = d.get("priceInfos") or []
    bars = []
    for r in rows:
        date = r.get("localDate")
        c = r.get("closePrice")
        if not date or c is None:
            continue
        try:
            ts = int(datetime.strptime(date, "%Y%m%d").replace(tzinfo=KST).timestamp() * 1000)
        except Exception:
            continue
        bars.append([ts, float(r.get("openPrice") or c), float(r.get("highPrice") or c),
                     float(r.get("lowPrice") or c), float(c),
                     int(r.get("accumulatedTradingVolume") or 0)])
    bars.sort(key=lambda x: x[0])
    return bars


def yahoo_bars(ticker, range_="5y", interval="1d"):
    url = ("https://query1.finance.yahoo.com/v8/finance/chart/"
           + urllib.parse.quote(ticker) + f"?interval={interval}&range={range_}")
    d = http_json(url)
    res = d["chart"]["result"][0]
    ts = res.get("timestamp") or []
    q = res["indicators"]["quote"][0]
    bars = []
    for i, t in enumerate(ts):
        c = q["close"][i] if i < len(q["close"]) else None
        if c is None:
            continue
        o = q["open"][i] or c
        h = q["high"][i] or c
        l = q["low"][i] or c
        v = q["volume"][i] or 0
        bars.append([int(t * 1000), float(o), float(h), float(l), float(c), int(v)])
    bars.sort(key=lambda x: x[0])
    return bars[-MAX_BARS:]


def upbit_daily(market):
    url = f"https://api.upbit.com/v1/candles/days?market={market}&count=200"
    rows = http_json(url)
    bars = []
    for c in rows:
        ts = c.get("candle_date_time_utc")
        if not ts:
            continue
        t = int(datetime.strptime(ts, "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc).timestamp() * 1000)
        bars.append([t, float(c["opening_price"]), float(c["high_price"]),
                     float(c["low_price"]), float(c["trade_price"]),
                     int(c.get("candle_acc_trade_volume") or 0)])
    bars.sort(key=lambda x: x[0])
    return bars


def round_prices(bars, currency):
    out = []
    for b in bars:
        if currency == "KRW" or b[4] >= 1000:
            out.append([b[0], int(round(b[1])), int(round(b[2])), int(round(b[3])), int(round(b[4])), int(b[5])])
        else:
            out.append([b[0], round(b[1], 2), round(b[2], 2), round(b[3], 2), round(b[4], 2), int(b[5])])
    return out


def main():
    now = datetime.now(KST).isoformat(timespec="seconds")
    kr = {"generatedAt": now, "series": {}, "errors": []}
    us = {"generatedAt": now, "series": {}, "errors": []}

    for symbol, kind, code, name, alt in SERIES:
        bars, src = [], "naver"
        try:
            bars = naver_bars(kind, code)
        except Exception as e:
            kr["errors"].append(f"{name} naver: {e}")
        if len(bars) < 200:
            try:
                ybars = yahoo_bars(alt)
                if len(ybars) > len(bars):
                    bars, src = ybars, "yahoo"
            except Exception as e:
                kr["errors"].append(f"{name} yahoo: {e}")
        if len(bars) < 20:
            print(f"  ! {name} 데이터 부족", file=sys.stderr)
            continue
        kr["series"][symbol] = {
            "name": name, "source": src, "currency": "KRW",
            "price": bars[-1][4], "prev": bars[-2][4] if len(bars) > 1 else bars[-1][4],
            "bars": round_prices(bars, "KRW"),
        }
        print(f"  · {name:<16} {len(bars):>4}봉 ({src})")
        time.sleep(0.15)

    for symbol, ticker, name, currency in YAHOO_SERIES:
        try:
            bars = yahoo_bars(ticker)
            if len(bars) < 200:
                raise ValueError(f"봉 {len(bars)}개")
            us["series"][symbol] = {
                "name": name, "currency": currency, "source": "yahoo",
                "price": bars[-1][4], "prev": bars[-2][4] if len(bars) > 1 else bars[-1][4],
                "bars": round_prices(bars, currency),
            }
            print(f"  · {name:<16} {len(bars):>4}봉 (yahoo)")
        except Exception as e:
            us["errors"].append(f"{name}({ticker}): {e}")
        time.sleep(0.15)

    coin = {"generatedAt": now, "series": {}, "errors": []}
    for market, name in COINS:
        try:
            bars = upbit_daily(market)
            if len(bars) < 20:
                raise ValueError(f"봉 {len(bars)}개")
            symbol = "UPBIT:" + market.split("-")[1] + "KRW"
            coin["series"][symbol] = {
                "name": name, "currency": "KRW", "source": "upbit",
                "price": bars[-1][4], "prev": bars[-2][4] if len(bars) > 1 else bars[-1][4],
                "bars": round_prices(bars, "KRW"),
            }
            print(f"  · {name:<16} {len(bars):>4}봉 (upbit)")
        except Exception as e:
            coin["errors"].append(f"{name}: {e}")
        time.sleep(0.1)

    for path, obj in ((OUT_KR, kr), (OUT_US, us), (OUT_COIN, coin)):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        print(f"  → {path.name}: {path.stat().st_size // 1024} KB, {len(obj['series'])}종목")


if __name__ == "__main__":
    main()
