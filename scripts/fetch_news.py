#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
market-pulse 뉴스 수집기
------------------------------------------------------------
공개 RSS 피드를 모아 data/news.json 으로 저장합니다.
GitHub Actions가 15분마다 이 스크립트를 돌리고 결과를 커밋합니다.
외부 라이브러리 없이 표준 라이브러리만 사용합니다.
"""
import json
import re
import shutil
import subprocess
import sys
import urllib.request
import html as html_lib
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from pathlib import Path

KST = timezone(timedelta(hours=9))
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "news.json"

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
# 일부 언론사(한국경제 등)는 Cloudflare 봇 판정으로 긴 UA를 막고 짧은 UA는 통과시킨다.
UA_CANDIDATES = [UA, "Mozilla/5.0"]

# (시장, 출처, RSS 주소) — 한국어 뉴스 위주
FEEDS = [
    ("kr", "연합뉴스", "https://www.yna.co.kr/rss/economy.xml"),
    ("kr", "연합뉴스 마켓", "https://www.yna.co.kr/rss/market.xml"),
    ("kr", "한국경제", "https://www.hankyung.com/feed/economy"),
    ("kr", "한국경제", "https://www.hankyung.com/feed/finance"),
    ("kr", "아시아경제 증권", "https://www.asiae.co.kr/rss/stock.htm"),
    ("kr", "이데일리 증권", "https://www.edaily.co.kr/rss/stock.xml"),
    ("kr", "헤럴드경제 증권", "https://biz.heraldcorp.com/rss/stock.xml"),
    ("us", "한국경제 국제", "https://www.hankyung.com/feed/international"),
    ("us", "연합뉴스 국제", "https://www.yna.co.kr/rss/international.xml"),
    ("crypto", "토큰포스트", "https://www.tokenpost.kr/rss"),
    ("crypto", "코인데스크코리아", "https://www.coindeskkorea.com/feed/"),
    ("crypto", "블록미디어", "https://www.blockmedia.co.kr/feed/"),
]

MAX_PER_MARKET = 20
TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")


def clean(text: str) -> str:
    if not text:
        return ""
    text = TAG_RE.sub(" ", text)
    text = html_lib.unescape(text).replace("\u00a0", " ")
    return WS_RE.sub(" ", text).strip()


def _looks_like_feed(data: bytes) -> bool:
    if not data or len(data) < 200:
        return False
    head = data[:300].lstrip().lower()
    if head.startswith(b"<!doctype html") or head.startswith(b"<html"):
        return False
    return b"<rss" in data[:1500] or b"<feed" in data[:1500] or b"<?xml" in data[:100]


def fetch(url: str) -> bytes:
    """RSS 본문을 반환한다. 봇 차단(HTML 응답)이면 UA를 바꿔 재시도한다."""
    curl = shutil.which("curl")
    last_err = None
    for ua in UA_CANDIDATES:
        # 1) 표준 라이브러리
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": ua,
                "Accept": "application/rss+xml, application/xml, text/xml, */*",
                "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
            })
            with urllib.request.urlopen(req, timeout=20) as r:
                data = r.read()
            if _looks_like_feed(data):
                return data
        except Exception as e:
            last_err = e

        # 2) curl (TLS 지문 차이로 urllib이 먹하는 경우가 있다)
        if curl:
            try:
                proc = subprocess.run(
                    [curl, "-sSL", "--compressed", "--max-time", "20", "-A", ua, url],
                    capture_output=True, timeout=40,
                )
                if _looks_like_feed(proc.stdout):
                    return proc.stdout
            except Exception as e:
                last_err = e

    raise ValueError(f"피드 본문을 받지 못했습니다 ({last_err})")


def parse_date(raw: str):
    """RFC822 형식 pubDate → aware datetime (실패하면 None)"""
    if not raw:
        return None
    try:
        dt = parsedate_to_datetime(raw.strip())
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(KST)
    except Exception:
        return None


def parse_feed(market: str, source: str, url: str):
    items = []
    try:
        raw = fetch(url)
    except Exception as e:
        print(f"  ! {source} 수집 실패: {e}", file=sys.stderr)
        return items

    try:
        root = ET.fromstring(raw)
    except ET.ParseError as e:
        print(f"  ! {source} XML 파싱 실패: {e}", file=sys.stderr)
        return items

    nodes = root.iter("item")
    for node in nodes:
        title = clean(node.findtext("title") or "")
        link = (node.findtext("link") or "").strip()
        if not title or not link:
            continue
        desc = clean(node.findtext("description") or "")
        dt = parse_date(node.findtext("pubDate") or "")
        items.append({
            "market": market,
            "source": source,
            "title": title[:180],
            "link": link,
            "pubDate": dt.isoformat() if dt else None,
            "summary": desc[:200],
        })
    print(f"  · {source:<12} {len(items):>3}건", file=sys.stderr)
    return items


def main():
    collected = []
    for market, source, url in FEEDS:
        collected.extend(parse_feed(market, source, url))

    # 시장별 최신순 정렬 + 중복 제거
    now = datetime.now(KST)
    result = []
    for market in ("kr", "us", "crypto"):
        bucket = [x for x in collected if x["market"] == market]
        bucket.sort(key=lambda x: x["pubDate"] or "", reverse=True)
        seen, kept = set(), []
        for it in bucket:
            key = re.sub(r"[^0-9a-z가-힣]", "", it["title"].lower())[:40]
            if key in seen:
                continue
            seen.add(key)
            if not it["pubDate"]:
                it["pubDate"] = now.isoformat()
            kept.append(it)
            if len(kept) >= MAX_PER_MARKET:
                break
        result.extend(kept)

    payload = {
        "generatedAt": now.isoformat(timespec="seconds"),
        "counts": {m: len([x for x in result if x["market"] == m]) for m in ("kr", "us", "crypto")},
        "items": result,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    # 날짜만 바뀌었을 때 불필요한 커밋을 만들지 않도록 기존 파일과 비교
    text = json.dumps(payload, ensure_ascii=False, indent=1)
    if OUT.exists():
        try:
            old = json.loads(OUT.read_text(encoding="utf-8"))
            if old.get("items") == payload["items"]:
                old["generatedAt"] = payload["generatedAt"]
                text = json.dumps(old, ensure_ascii=False, indent=1)
        except Exception:
            pass
    OUT.write_text(text + "\n", encoding="utf-8")
    print(f"저장 완료: {OUT} · 총 {len(result)}건 {payload['counts']}")


if __name__ == "__main__":
    main()
