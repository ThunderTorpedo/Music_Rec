# Music Recommender

A hybrid music recommendation system built for a Recommender Systems course. It combines collaborative filtering on listening history with content-based filtering on Spotify audio features, re-ranks results for diversity, and serves them through a FastAPI backend and a Next.js frontend.

## Features

- **Hybrid model:** blends ALS matrix factorization (implicit feedback) with a content-based model on audio features (danceability, energy, valence, tempo, etc.)
- **Implicit feedback handling:** play counts converted to confidence weights (`1 + 40·log(1 + plays)`)
- **Cold-start handling:** content-based scoring recommends tracks with no listening history
- **Diversity re-ranking:** MMR (Maximal Marginal Relevance) to balance relevance and variety
- **Explanations:** each recommendation includes a reason, such as "Sounds like *X* you played a lot"
- **Web demo:** pick a user, view listening history and recommendations, explore similar tracks

## Models compared

| Model | Type |
|---|---|
| Popularity | Baseline |
| Item-kNN | Collaborative (neighborhood) |
| ALS | Collaborative (matrix factorization) |
| Content-based | Audio feature similarity |
| Hybrid | ALS + content, weight tuned on a validation split |

## Evaluation

- Per-user leave-5-out split, with a separate validation split for tuning the hybrid weight
- **Accuracy:** Recall@10, NDCG@10
- **Beyond accuracy:** catalog coverage, intra-list diversity, novelty, popularity bias
- **Cold-start experiment:** 15% of tracks held out of training entirely

### Results

| Model | Recall@10 | NDCG@10 |
|---|---|---|
| Popularity | _ | _ |
| Item-kNN | _ | _ |
| ALS | _ | _ |
| Content-based | _ | _ |
| Hybrid | _ | _ |

_(Fill in from your notebook output.)_

## Tech stack

- **ML:** Python, `implicit`, scikit-learn, NumPy, SciPy, pandas
- **Backend:** FastAPI, Pydantic, Uvicorn
- **Frontend:** Next.js, React, Tailwind CSS
- **Training:** Google Colab

## Data

Last.fm listening histories joined with Spotify audio features (Million Song Dataset + Spotify + Last.fm on Kaggle). Only tracks present in both sources are kept; users with fewer than 20 tracks and tracks with fewer than 10 listeners are filtered out.

## Project structure

```
Music_Rec/
├── backend/
│   ├── main.py                # FastAPI app
│   └── day1_bundle.joblib     # trained models and matrices (not committed)
├── frontend/                  # Next.js app
└── notebooks/                 # training and evaluation (Colab)
```

## Running locally

**Backend**
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install fastapi uvicorn joblib implicit scikit-learn pandas numpy
uvicorn main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. API docs are at `http://127.0.0.1:8000/docs`.

> The trained bundle (`day1_bundle.joblib`) is not included in the repo. Run the training notebook to generate it and place it in `backend/`.

## API

| Endpoint | Description |
|---|---|
| `GET /recommend/{user_id}` | Top-K hybrid recommendations with reasons |
| `GET /similar/{track_id}` | Tracks with similar audio profiles |
| `GET /history/{user_id}` | A user's most-played tracks |
| `GET /search?q=` | Search tracks by title or artist |
| `GET /sample-users` | Valid user IDs for testing |

## Limitations

- Random per-user split rather than a temporal split
- Subset of users (top ~3,000 by activity)
- Content features limited to Spotify audio attributes
- Offline evaluation only, with no live user feedback

## Author

Aryan, [GitHub](https://github.com/ThunderTorpedo)
