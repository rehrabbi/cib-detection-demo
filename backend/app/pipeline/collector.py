"""Step 2: Automated Comment Collection via YouTube Data API v3.

Uses the official google-api-python-client. Calls commentThreads().list() per video
and iterates all pages. For threads where totalReplyCount exceeds the replies returned
in the initial response, an additional comments().list() with parentId is made.
"""

from __future__ import annotations

import logging
import random
import re
import time
from typing import Iterator
from urllib.parse import parse_qs, urlparse

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)

YT_API_SERVICE_NAME = "youtube"
YT_API_VERSION = "v3"


_VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")


def extract_video_id(url: str) -> str:
    """Extract the 11-character YouTube video ID from any standard YouTube URL."""
    url = url.strip()
    if _VIDEO_ID_RE.match(url):
        return url
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()

    if host in {"youtu.be"}:
        candidate = parsed.path.lstrip("/")
        if _VIDEO_ID_RE.match(candidate):
            return candidate

    if host.endswith("youtube.com") or host.endswith("youtube-nocookie.com"):
        qs = parse_qs(parsed.query)
        if "v" in qs and _VIDEO_ID_RE.match(qs["v"][0]):
            return qs["v"][0]
        parts = [p for p in parsed.path.split("/") if p]
        for i, part in enumerate(parts):
            if part in {"shorts", "embed", "live", "v"} and i + 1 < len(parts):
                if _VIDEO_ID_RE.match(parts[i + 1]):
                    return parts[i + 1]
        if len(parts) == 1 and _VIDEO_ID_RE.match(parts[0]):
            return parts[0]

    raise ValueError(f"Could not extract a YouTube video ID from URL: {url!r}")


class YouTubeCommentCollector:
    """Wraps the YouTube Data API v3 for comment retrieval."""

    def __init__(self, api_key: str):
        if not api_key:
            raise ValueError("YOUTUBE_API_KEY is not configured.")
        self._client = build(
            YT_API_SERVICE_NAME, YT_API_VERSION, developerKey=api_key, cache_discovery=False
        )

    def fetch_video_metadata(self, video_id: str) -> dict:
        """Use videos().list() to retrieve channel name and posting timestamp."""
        resp = (
            self._client.videos()
            .list(part="snippet,statistics", id=video_id, maxResults=1)
            .execute()
        )
        items = resp.get("items", [])
        if not items:
            raise ValueError(f"Video {video_id} not found or inaccessible.")
        snippet = items[0]["snippet"]
        return {
            "video_id": video_id,
            "channel_name": snippet.get("channelTitle", ""),
            "video_post_time": snippet.get("publishedAt", ""),
            "title": snippet.get("title", ""),
            "comment_count": int(items[0].get("statistics", {}).get("commentCount", 0)),
        }

    def iter_comments(self, video_id: str, channel_name: str, video_post_time: str) -> Iterator[dict]:
        """Iterate every top-level comment and reply for a given video.

        Yields raw records with the eight fields specified in the thesis:
            Video_ID, Channel_Name, User_ID, Content, Comment_Date,
            Is_Reply, Parent_ID, Video_Post_Time.
        """
        page_token: str | None = None
        while True:
            try:
                resp = (
                    self._client.commentThreads()
                    .list(
                        part="snippet,replies",
                        videoId=video_id,
                        maxResults=100,
                        textFormat="plainText",
                        pageToken=page_token,
                    )
                    .execute()
                )
            except HttpError as e:
                logger.warning("commentThreads error on %s: %s", video_id, e)
                break

            for thread in resp.get("items", []):
                top = thread["snippet"]["topLevelComment"]["snippet"]
                top_id = thread["snippet"]["topLevelComment"]["id"]
                yield {
                    "Video_ID": video_id,
                    "Channel_Name": channel_name,
                    "User_ID": top.get("authorChannelId", {}).get("value", ""),
                    "Content": top.get("textOriginal") or top.get("textDisplay", ""),
                    "Comment_Date": top.get("publishedAt", ""),
                    "Is_Reply": False,
                    "Parent_ID": None,
                    "Video_Post_Time": video_post_time,
                }

                total_replies = thread["snippet"].get("totalReplyCount", 0)
                returned = thread.get("replies", {}).get("comments", [])
                if total_replies <= len(returned):
                    for r in returned:
                        s = r["snippet"]
                        yield {
                            "Video_ID": video_id,
                            "Channel_Name": channel_name,
                            "User_ID": s.get("authorChannelId", {}).get("value", ""),
                            "Content": s.get("textOriginal") or s.get("textDisplay", ""),
                            "Comment_Date": s.get("publishedAt", ""),
                            "Is_Reply": True,
                            "Parent_ID": s.get("parentId", top_id),
                            "Video_Post_Time": video_post_time,
                        }
                else:
                    yield from self._iter_replies(
                        video_id=video_id,
                        channel_name=channel_name,
                        video_post_time=video_post_time,
                        parent_id=top_id,
                    )

            page_token = resp.get("nextPageToken")
            if not page_token:
                break
            # Randomized delay to respect API rate limits (per thesis Step 2).
            time.sleep(random.uniform(0.2, 0.6))

    def _iter_replies(
        self, video_id: str, channel_name: str, video_post_time: str, parent_id: str
    ) -> Iterator[dict]:
        page_token: str | None = None
        while True:
            try:
                resp = (
                    self._client.comments()
                    .list(
                        part="snippet",
                        parentId=parent_id,
                        maxResults=100,
                        textFormat="plainText",
                        pageToken=page_token,
                    )
                    .execute()
                )
            except HttpError as e:
                logger.warning("comments().list error on %s: %s", parent_id, e)
                return

            for r in resp.get("items", []):
                s = r["snippet"]
                yield {
                    "Video_ID": video_id,
                    "Channel_Name": channel_name,
                    "User_ID": s.get("authorChannelId", {}).get("value", ""),
                    "Content": s.get("textOriginal") or s.get("textDisplay", ""),
                    "Comment_Date": s.get("publishedAt", ""),
                    "Is_Reply": True,
                    "Parent_ID": s.get("parentId", parent_id),
                    "Video_Post_Time": video_post_time,
                }

            page_token = resp.get("nextPageToken")
            if not page_token:
                break
            time.sleep(random.uniform(0.2, 0.6))
