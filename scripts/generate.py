#!/usr/bin/env python3
"""FEED - ソース取得スクリプト（トリガーから呼ばれる）
GitHub/RSS/HNから生データを取得してJSONで標準出力に出す。
要約はトリガー側のClaudeが行う。
"""

import json
import os
import re
import sys
import urllib.request
import ssl
from datetime import datetime, timedelta, timezone
from xml.etree import ElementTree as ET

# --- Sources ---

GITHUB_REPOS = [
    "anthropics/claude-code",
    "anthropics/anthropic-sdk-python",
    "anthropics/anthropic-sdk-typescript",
    "openai/openai-python",
    "vercel/next.js",
    "vitejs/vite",
    "denoland/deno",
    "oven-sh/bun",
    "langchain-ai/langchain",
]

RSS_FEEDS = [
    ("Simon Willison", "https://simonwillison.net/atom/everything/"),
    ("GitHub Blog", "https://github.blog/feed/"),
    ("One Useful Thing", "https://www.oneusefulthing.org/feed"),
    ("MIT Tech Review AI", "https://www.technologyreview.com/topic/artificial-intelligence/feed"),
]

HN_KEYWORDS = ["AI", "LLM", "Claude", "GPT", "dev tool", "IDE", "CLI", "SDK",
               "release", "open source", "Anthropic", "OpenAI", "Cursor", "Copilot",
               "Rust", "Python", "TypeScript", "Deno", "Bun",
               "cognitive", "psychology", "learning", "prompt", "workflow",
               "productivity", "tips", "tutorial"]

ARXIV_FEEDS = [
    ("cs.AI", "https://rss.arxiv.org/rss/cs.AI"),
    ("cs.CL", "https://rss.arxiv.org/rss/cs.CL"),
    ("cs.HC", "https://rss.arxiv.org/rss/cs.HC"),
    ("q-bio.NC", "https://rss.arxiv.org/rss/q-bio.NC"),
]


def fetch_json(url, headers=None):
    ctx = ssl.create_default_context()
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "FEED/1.0")
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"WARN: {url}: {e}", file=sys.stderr)
        return None


def fetch_text(url):
    ctx = ssl.create_default_context()
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "FEED/1.0")
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except Exception as e:
        print(f"WARN: {url}: {e}", file=sys.stderr)
        return None


def fetch_github_releases():
    items = []
    cutoff = datetime.now(timezone.utc) - timedelta(days=2)
    token = os.environ.get("GITHUB_TOKEN", "")
    headers = {"Authorization": f"token {token}"} if token else {}

    for repo in GITHUB_REPOS:
        data = fetch_json(
            f"https://api.github.com/repos/{repo}/releases?per_page=3",
            headers=headers,
        )
        if not data:
            continue
        for rel in data:
            pub = rel.get("published_at", "")
            if not pub:
                continue
            dt = datetime.fromisoformat(pub.replace("Z", "+00:00"))
            if dt < cutoff:
                continue
            body = rel.get("body", "") or ""
            if len(body) > 1500:
                body = body[:1500] + "..."
            items.append({
                "source": "github-release",
                "repo": repo,
                "title": f"{repo} {rel.get('tag_name', '')}",
                "url": rel.get("html_url", ""),
                "body": body,
            })
    return items


def fetch_rss_feeds():
    items = []
    for name, url in RSS_FEEDS:
        text = fetch_text(url)
        if not text:
            continue
        try:
            root = ET.fromstring(text)
        except ET.ParseError:
            continue

        ns = {"atom": "http://www.w3.org/2005/Atom"}
        entries = root.findall(".//item") or root.findall(".//atom:entry", ns)

        for entry in entries[:5]:
            title = (entry.findtext("title") or
                     entry.findtext("atom:title", namespaces=ns) or "")
            link = ""
            link_el = entry.find("link")
            if link_el is not None:
                link = link_el.text or link_el.get("href", "")
            if not link:
                link_el = entry.find("atom:link", ns)
                if link_el is not None:
                    link = link_el.get("href", "")

            desc = (entry.findtext("description") or
                    entry.findtext("atom:summary", namespaces=ns) or
                    entry.findtext("atom:content", namespaces=ns) or "")
            desc = re.sub(r"<[^>]+>", "", desc)
            if len(desc) > 500:
                desc = desc[:500] + "..."

            items.append({
                "source": "rss",
                "feed": name,
                "title": title.strip(),
                "url": link.strip(),
                "body": desc.strip(),
            })
    return items


def fetch_hackernews():
    items = []
    data = fetch_json("https://hacker-news.firebaseio.com/v0/topstories.json")
    if not data:
        return items

    matched = 0
    for story_id in data[:50]:
        if matched >= 8:
            break
        story = fetch_json(f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json")
        if not story or story.get("type") != "story":
            continue
        title = story.get("title", "")
        if not any(kw.lower() in title.lower() for kw in HN_KEYWORDS):
            continue
        items.append({
            "source": "hackernews",
            "title": title,
            "url": story.get("url", f"https://news.ycombinator.com/item?id={story_id}"),
            "body": f"Score: {story.get('score', 0)}, Comments: {story.get('descendants', 0)}",
        })
        matched += 1
    return items


def fetch_arxiv():
    items = []
    for category, url in ARXIV_FEEDS:
        text = fetch_text(url)
        if not text:
            continue
        try:
            root = ET.fromstring(text)
        except ET.ParseError:
            continue

        entries = root.findall(".//item")

        for entry in entries[:10]:
            title = entry.findtext("title") or ""
            link = entry.findtext("link") or ""
            desc = entry.findtext("description") or ""
            desc = re.sub(r"<[^>]+>", "", desc)
            if len(desc) > 800:
                desc = desc[:800] + "..."

            title = re.sub(r"\s+", " ", title).strip()

            items.append({
                "source": "arxiv",
                "category": category,
                "title": title,
                "url": link.strip(),
                "body": desc.strip(),
            })
    return items


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "news"

    if mode == "--papers":
        papers = fetch_arxiv()
        print(json.dumps(papers, ensure_ascii=False, indent=2))
    else:
        raw_items = []
        raw_items.extend(fetch_github_releases())
        raw_items.extend(fetch_rss_feeds())
        raw_items.extend(fetch_hackernews())
        print(json.dumps(raw_items, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
