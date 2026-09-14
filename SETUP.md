# Setup and demo guide

How to get this running and how to drive it in front of an audience.

> **Say this first when demonstrating.** The model in this build is synthetic.
> It was trained on computer-generated comments and has never seen real YouTube
> data. Every number it produces illustrates how the software behaves. None of
> them is a finding about any real account. It also flags roughly three times as
> many commenters as the real model would.

---

## 1. What you need

**Docker Desktop**, installed and running. Nothing else. No Python, no Node, no
database.

Setting up on a machine for the first time needs **internet** and about **five
minutes**, because the images download and install their dependencies. Do this
before you are in the room, not in front of an audience.

Check it is up:

```bash
docker version
```

If that errors, open Docker Desktop and wait for the whale icon to stop
animating.

---

## 2. First time setup

Three commands. From the repository folder:

```bash
cp backend/.env.example backend/.env
```

```bash
docker compose build
```

```bash
docker compose up -d
```

The build takes about five minutes the first time and is instant afterwards.

Wait about twenty seconds, then confirm it is alive:

```bash
curl http://localhost:8000/api/health
```

You want to see:

```json
{"status":"ok","use_sample_data":true,"youtube_api_configured":true}
```

The part that matters is `"status":"ok"`. Ignore
`youtube_api_configured`, it reports `true` even when the key is still the
placeholder from `.env.example`, because it only checks that the field is not
empty.

Then open the tool:

```
http://localhost:5173
```

That is the whole setup. With the default settings you need **no API key and no
internet**, because the comments are generated locally.

---

## 3. The two modes

The difference is where the **comments** come from. The model is synthetic
either way.

### Synthetic comments, the default

`USE_SAMPLE_DATA=true` in `backend/.env`.

- No API key, no quota, no network
- Finishes in about 10 seconds
- Produces 248 commenters, 28 of them planted coordinated accounts
- The two YouTube URLs do not even have to exist, only their IDs are read

Best for a quick demonstration, or if the venue has no reliable internet.

### Real YouTube comments

Edit `backend/.env`:

```
YOUTUBE_API_KEY=your key here
USE_SAMPLE_DATA=false
```

Then restart so the change is picked up:

```bash
docker compose restart api worker
```

- Takes 75 to 90 seconds for a normal pair of videos
- Produces thousands of real commenters
- Costs roughly 1 quota unit per 100 comments, out of 10,000 per day

Getting a key: Google Cloud Console, create a project, enable **YouTube Data API
v3**, then Credentials, Create Credentials, API key. Restrict it to the YouTube
Data API only, and leave application restrictions as None or calls from inside
the container will be blocked. It is free.

---

## 4. Running an analysis

1. Go to **Analyze** in the top navigation
2. Paste a YouTube URL, click **+ Add**
3. Paste a second URL, click **+ Add**
4. The counter at the bottom left should read **2 videos staged**
5. Click **Analyze**

The progress view then walks five stages: collecting, preprocessing, feature
extraction, anomaly detection, SHAP values. When it finishes it moves to the
results page on its own.

### Choose the two videos carefully

Two videos covering the **same event**, from **different channels**.

This matters because a commenter only becomes connected in the graph if they
commented on **both** videos. Two unrelated videos share almost nobody, so the
Network Graph comes back empty. That is correct behaviour, but it looks like a
failure.

A pair that is known to work well:

```
https://www.youtube.com/watch?v=JMayyvnkRIk
https://www.youtube.com/watch?v=Fm4w02wTUiY
```

News5Everywhere and INQUIRER.net, both covering Duterte's campaign remarks on 13
and 14 February 2025. 7,072 commenters, 215 of them connected.

Two limits worth knowing before you improvise on stage:

- Fewer than 30 unique commenters and the job stops with "Insufficient data".
  Very small videos will not work.
- Very large videos take longer. The biggest pair in the research corpus,
  124,860 comments, takes about 12 minutes.

---

## 5. Having a result ready before you present

**Saved jobs do not travel with the repository.** They live in the Docker
database volume on the machine that ran them. A freshly set up machine starts
with an empty database, so there is nothing to open until you run something.

Live collection from YouTube takes 75 to 90 seconds, which is a long silence in
front of a panel. So run one job when you set the machine up, keep the URL, and
open that instantly when you present.

### The fast way, about 10 seconds

With the default `USE_SAMPLE_DATA=true`, no key and no internet needed:

1. Go to **Analyze**
2. Add these two URLs and click **Analyze**

```
https://www.youtube.com/watch?v=JMayyvnkRIk
https://www.youtube.com/watch?v=Fm4w02wTUiY
```

It finishes in about ten seconds and gives 248 commenters, 54 flagged, with 28
planted coordinated accounts among them. Copy the URL from your browser once it
lands on the results page. It looks like:

```
http://localhost:5173/studio?job_id=<32 characters>
```

Keep that URL. Opening it later is instant.

### The impressive way, about 90 seconds

Set a real API key and `USE_SAMPLE_DATA=false` as in section 3, then run the same
two videos. You get 7,072 real commenters, 668 flagged, and a co-commenter graph
with a genuine 215 node structure in it. Do this once while setting up, keep the
URL, and open it when you present.

### Listing what you have

```bash
docker compose exec postgres psql -U cib_user -d cib_detection -c "select id, status, summary->>'total_commenters' as commenters from detection_jobs where status='completed';"
```

Using `docker compose exec postgres` rather than a container name means this
works whatever your containers happen to be called.

### What to point at on the results page

- **Overview**, left: anomaly rate, total commenters, the organic and anomalous
  split, and a written summary
- **Commenter's List**, middle: sorted by risk, with the top contributing
  feature per account. The All, Anomalous and Organic tabs all filter
- **Network Graph**, right: the real co-commenter graph. The legend gives the
  true node and edge counts, and says when the drawing has been capped
- **SHAP XAI Attribution**: why a specific account was flagged
- **Profile Metrics**: the raw feature values behind the classification
- **Export**: CSV or PDF report

One thing worth explaining if it comes up. On a two video job the connected part
of the graph is always a complete circle, where everyone is joined to everyone.
That is not a bug. An edge requires commenting on both videos, so everyone who
did that is connected to everyone else who did.

---

## 6. Stopping and starting

Stop, keeping all data:

```bash
docker compose stop
```

Start again:

```bash
docker compose up -d
```

**After restarting your computer the containers do not come back on their own.**
Run `docker compose up -d` again. Give it twenty seconds before opening the page.

Remove everything including the stored jobs:

```bash
docker compose down -v
```

---

## 7. Demo day checklist

Run through this before you present, not during.

```bash
docker compose up -d
```

```bash
curl http://localhost:8000/api/health
```

- [ ] Health returns `"status":"ok"`
- [ ] `http://localhost:5173` loads
- [ ] You have run one job on THIS machine and kept its
      `studio?job_id=...` URL, and it opens showing real numbers
- [ ] If using real comments, run one test job and confirm it takes 75 seconds
      rather than 10. That is the only reliable way to tell that the key works,
      since `youtube_api_configured` is true even for the placeholder
- [ ] Browser zoom at a level where the three panels all fit
- [ ] You have said the model is synthetic before showing any number

---

## 8. Troubleshooting

**The page loads but the results are empty, or it says the job is still
running.** The job has not finished. The page now waits and updates itself, so
give it time. A real collection takes 75 to 90 seconds.

**"Insufficient data: Minimum 30 unique commenters required".** The videos are
too small. Pick busier ones.

**The Network Graph says no co-commenter edges to display.** The two videos
share no commenters. Pick two covering the same event.

**Port is already in use.** Something else on your machine holds 5432, 6379,
8000 or 5173. Either stop that other service, or create a file called
`docker-compose.override.yml` next to `docker-compose.yml` with different host
ports. Only the number on the left changes:

```yaml
services:
  postgres:
    container_name: cib_demo_postgres
    ports: !override
      - "5434:5432"
  redis:
    container_name: cib_demo_redis
    ports: !override
      - "6381:6379"
  api:
    container_name: cib_demo_api
  worker:
    container_name: cib_demo_worker
  frontend:
    container_name: cib_demo_frontend
```

Docker Compose picks that file up automatically. Do not commit it, it is
specific to your machine.

**Container name is already in use.** An older project left containers behind
with the same names. Either remove them, or rename these with the
`container_name` lines above.

**The worker will not start, and the log says it cannot connect to Redis on
localhost.** Your `backend/.env` has `localhost` where it needs the compose
service names. It should read:

```
DATABASE_URL=postgresql://cib_user:cib_pass@postgres:5432/cib_detection
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1
```

**Changed `backend/.env` and nothing happened.** Settings are read when the
process starts. Run `docker compose restart api worker`.

**A job is taking too long and you want it to stop.** Click **Abort Job**. It
genuinely cancels the work on the server rather than only clearing the screen.

**Watch what is actually happening:**

```bash
docker compose logs -f worker
```

A wall of `InconsistentVersionWarning` lines when the model loads is expected
and harmless.

---

## 9. If you are asked about the numbers

- The model is synthetic. `backend/app/ml/artifacts/PROVENANCE.json` records
  `"not_for_reporting": true` in machine readable form.
- It over-detects by roughly three times. On a real two video job it flagged
  6.97 percent where the real model flagged 2.43 percent, with a risk score
  correlation of 0.9515. It catches 95.1 percent of what the real model catches
  and adds more on top.
- Over-detection is the safe direction for a demonstration. It never omits what
  the real model would have considered notable.
- The synthetic corpus was calibrated using only aggregate statistics of the
  real corpus, such as means and standard deviations. No real comment data was
  used to train it.
- The application code is the same code as the real system. What you see running
  is genuinely how the tool works.
