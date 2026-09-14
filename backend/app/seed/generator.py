"""Synthetic Filipino YouTube comment data generator.

Produces a corpus structurally identical to what the YouTube Data API v3 collector
yields, intentionally seeded with:
- A large pool of organic commenters with naturalistic timing and varied content.
- A smaller pool of coordinated inauthentic commenters that:
    * post in tight 10-minute bursts,
    * recycle near-identical scripts (high TF-IDF repetition),
    * co-comment on multiple videos together (dense co-commenter clique),
    * reply-flood specific threads.

This supports the "Use sample data" toggle so the full pipeline can be demoed
without burning YouTube Data API v3 quota.
"""

from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

ORGANIC_TEMPLATES_EN = [
    "Great coverage, thank you for the report.",
    "This is informative. I will share it.",
    "Sad to hear about this situation in our country.",
    "I hope our leaders listen to the people.",
    "Thanks for the update, very helpful.",
    "Please continue this kind of reporting.",
    "Interesting take, I didn't know this.",
    "We need more honest journalism like this.",
    "Mabuhay ang Pilipinas, sana maayos lahat.",
    "Salamat sa pag-report ng totoo.",
    "Maganda ang ginagawa nila para sa bayan.",
    "Sana matuloy ang mga proyekto.",
    "Pray for our country and leaders.",
    "Pagbabago na sana ngayong eleksyon.",
    "Thanks ANC for this segment.",
    "Where can I read the full article?",
    "Walang kupas ang issue na ito.",
    "Bakit ganyan, kawawa naman.",
    "Hopefully the truth comes out soon.",
    "Maraming salamat po sa video.",
]

COORDINATED_TEMPLATES = [
    "BBM SOLID NORTH MAGPAKAILANMAN PADAYON {hashtag}",
    "WALANG IBA KUNG HINDI {candidate} ANG TUNAY NA PAGBABAGO!!",
    "{candidate} {candidate} {candidate} 2025 SUPPORT FROM ABROAD",
    "FAKE NEWS! GISING NA MGA PINOY, {hashtag} {hashtag}",
    "VOTE WISELY GUYS, {candidate} IS THE ONLY CHOICE {hashtag}",
    "TUNAY NA LIDER {candidate} {hashtag}",
    "STOP THE LIES, ONLY {candidate} CAN SAVE THE PHILIPPINES",
    "{candidate} ALL THE WAY {hashtag}",
]

CHANNELS = [
    "ANC 24/7",
    "GMA News",
    "GMA Public Affairs",
    "ABS-CBN News",
    "Rappler",
    "Inquirer.net",
    "The Boy Abunda Talk Channel",
    "UNTV News and Rescue",
]


def _isoformat(dt: datetime) -> str:
    return dt.replace(tzinfo=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _make_comment_record(
    video_id: str,
    channel_name: str,
    user_id: str,
    content: str,
    when: datetime,
    video_post_time: datetime,
    is_reply: bool = False,
    parent_id: str | None = None,
) -> dict:
    return {
        "Video_ID": video_id,
        "Channel_Name": channel_name,
        "User_ID": user_id,
        "Content": content,
        "Comment_Date": _isoformat(when),
        "Is_Reply": is_reply,
        "Parent_ID": parent_id,
        "Video_Post_Time": _isoformat(video_post_time),
    }


def generate_sample_dataset(
    video_id_1: str,
    video_id_2: str,
    *,
    organic_commenters: int = 220,
    coordinated_commenters: int = 28,
    seed: int = 42,
) -> list[dict]:
    """Generate a synthetic corpus for two videos."""
    rng = random.Random(seed)
    base_post_1 = datetime(2022, 5, 9, 8, 0, 0)
    base_post_2 = datetime(2025, 5, 12, 9, 0, 0)

    videos = [
        (video_id_1, rng.choice(CHANNELS), base_post_1),
        (video_id_2, rng.choice(CHANNELS), base_post_2),
    ]

    records: list[dict] = []
    top_level_ids: dict[str, list[str]] = {video_id_1: [], video_id_2: []}

    # Organic commenters: 1-4 comments each, mostly on one video.
    for i in range(organic_commenters):
        uid = f"organic_user_{i:04d}"
        n_comments = rng.choices([1, 2, 3, 4], weights=[55, 25, 15, 5])[0]
        for _ in range(n_comments):
            video_id, channel, post_time = rng.choice(videos)
            offset_minutes = rng.uniform(5, 60 * 24 * 7)  # spread over a week
            when = post_time + timedelta(minutes=offset_minutes)
            content = rng.choice(ORGANIC_TEMPLATES_EN)
            tlid = f"tl_{video_id}_{len(records):07d}"
            top_level_ids[video_id].append(tlid)
            records.append(
                _make_comment_record(
                    video_id=video_id,
                    channel_name=channel,
                    user_id=uid,
                    content=content,
                    when=when,
                    video_post_time=post_time,
                )
            )

    # Coordinated commenters: bursts within ~5-8 minute windows, repeated scripts,
    # they co-comment on BOTH videos, and they reply-flood organic threads.
    candidates = ["BBM", "Marcos", "Sara", "Robin", "Erin", "Bongbong"]
    hashtags = [
        "#UniTeam",
        "#PadayonBBM",
        "#WalangPasok2025",
        "#SaraDuterte2028",
        "#TunayNaPagbabago",
        "#PinoyPride",
    ]
    for i in range(coordinated_commenters):
        uid = f"troll_user_{i:03d}"
        # Each troll comments on BOTH videos to build co-commenter edges.
        for video_id, channel, post_time in videos:
            burst_anchor = post_time + timedelta(
                minutes=rng.uniform(10, 60 * 24 * 2)
            )
            n_in_burst = rng.randint(8, 18)
            for _ in range(n_in_burst):
                # All inside ~5-minute window from burst_anchor.
                when = burst_anchor + timedelta(seconds=rng.randint(0, 300))
                tmpl = rng.choice(COORDINATED_TEMPLATES)
                content = tmpl.format(
                    candidate=rng.choice(candidates),
                    hashtag=rng.choice(hashtags),
                )
                tlid = f"tl_{video_id}_{len(records):07d}"
                top_level_ids[video_id].append(tlid)
                records.append(
                    _make_comment_record(
                        video_id=video_id,
                        channel_name=channel,
                        user_id=uid,
                        content=content,
                        when=when,
                        video_post_time=post_time,
                    )
                )

        # Reply-flood: trolls reply to a handful of organic threads on each video.
        for video_id, channel, post_time in videos:
            if not top_level_ids[video_id]:
                continue
            for _ in range(rng.randint(3, 7)):
                parent = rng.choice(top_level_ids[video_id])
                when = post_time + timedelta(minutes=rng.uniform(15, 60 * 12))
                content = rng.choice(COORDINATED_TEMPLATES).format(
                    candidate=rng.choice(candidates),
                    hashtag=rng.choice(hashtags),
                )
                records.append(
                    _make_comment_record(
                        video_id=video_id,
                        channel_name=channel,
                        user_id=uid,
                        content=content,
                        when=when,
                        video_post_time=post_time,
                        is_reply=True,
                        parent_id=parent,
                    )
                )

    rng.shuffle(records)
    return records
