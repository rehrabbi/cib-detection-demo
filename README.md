# CIB Detection Tool — DEMONSTRATION BUILD (synthetic model)

> ## This is not the real system.
>
> The detection model in this repository was trained entirely on **synthetic,
> computer-generated comments**. It has never seen real YouTube data. Any score,
> risk value, chart or classification it produces is an illustration of how the
> software behaves, **not a finding about anyone's actual conduct**.
>
> **Do not cite anything from this build.** Nothing here is evidence that any
> account, channel or person engaged in coordinated inauthentic behaviour.
>
> The real system lives at
> [rehrabbi/cib-detection-tool](https://github.com/rehrabbi/cib-detection-tool).

This build exists so the tool can be shown running end to end without depending
on the real trained model or on the 717 MB research corpus. It is a complete,
standalone copy of the application: backend, frontend, worker and database all
run from here.

## What is different from the real system

| | real system | this build |
|---|---|---|
| model trained on | 2,276,419 real comments, 524,787 commenters | 134,750 synthetic comments, 53,990 commenters |
| training source | ten Filipino news channels, 2022 election period | `backend/app/seed/generator.py` |
| comments analysed | real, via YouTube Data API v3 | synthetic by default, real optional |
| outputs suitable for | reported results | demonstration only |

Nothing else differs. The application code is the same, so what you see running
is genuinely how the tool works.

## Running it

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

Frontend on `http://localhost:5173`, API on `http://localhost:8000`.

With the defaults, `USE_SAMPLE_DATA=true`, so **no API key and no network access
are needed**. Submit any two YouTube URLs; only their IDs are read, and the
comments are generated locally. The videos do not need to exist.

### Analysing real videos instead

Set a key and turn sample data off in `backend/.env`:

```
YOUTUBE_API_KEY=<your key>
USE_SAMPLE_DATA=false
```

Real comments are then collected and scored. **The model remains synthetic**, so
the results are still a demonstration. Expect roughly three times as many
commenters flagged as the real model would flag, because this model is more
sensitive.

## The synthetic model

`backend/app/ml/artifacts/` holds the bundle, alongside `PROVENANCE.json`, which
records `"not_for_reporting": true` in machine-readable form.

The synthetic corpus is calibrated so its feature distribution approximates the
real one, so the demonstration behaves comparably rather than producing
arbitrary numbers. Against the real corpus's per-feature mean and standard
deviation the mean relative error is 0.309. Degree centrality, the feature most
sensitive to corpus size, matches at 0.00138 against 0.00140.

Scored side by side with the real model on the same real two-video job of
124,860 comments and 81,130 commenters:

| | real model | this model |
|---|---|---|
| flagged | 1,970 (2.43%) | 5,654 (6.97%) |
| risk score correlation | | 0.9515 |
| overlap of flagged sets (Jaccard) | | 0.326 |
| real model's flags also caught here | | 1,874 of 1,970 (95.1%) |

It finds almost everything the real model finds, and more besides. It errs
toward over-detection, so a demonstration never omits what the real model would
consider notable, but the counts run higher.

Calibration used only aggregate statistics of the real corpus, such as means and
standard deviations, to choose generator settings. **No real comment data was
used to train this model.**

## Regenerating the synthetic model

```bash
pip install -r training/requirements-lock.txt
python training/src/train_simulation.py
```

Deterministic under `random_state=42`. Versions are pinned exactly, because the
serialised model is tied to the scikit-learn and numpy versions that produced
it and loading it under others can fail or, less visibly, alter its behaviour.

## What is not here

The six-step research pipeline that produced the real model is not included. It
requires the real collection corpus and would not run in this repository.
It lives in the application repository under `training/`.
