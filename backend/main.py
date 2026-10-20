# app.py
import joblib, numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

B = joblib.load("day1_bundle.joblib")
F, tracks, X = B["F_norm"], B["tracks_indexed"], B["X_train"]
als, alpha = B["als_model"], B["alpha"]
app = FastAPI(title="Music RecSys")

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Rec(BaseModel):
    track_id: str; title: str; artist: str; score: float; reason: str

def z(v): return (v - v.mean()) / (v.std() + 1e-8)

@app.get("/recommend/{user_id}", response_model=list[Rec])
def recommend(user_id: str, k: int = 10):
    u = B["u_idx"].get(user_id)
    if u is None:
        raise HTTPException(404, "Unknown user")
    s = alpha * z(als.user_factors[u] @ als.item_factors.T) + (1 - alpha) * z(B["U_profiles"][u] @ F.T)
    s[X[u].indices] = -np.inf
    top = np.argpartition(s, -k)[-k:]; top = top[np.argsort(s[top])[::-1]]
    fav = X[u].indices[np.argsort(X[u].data)[::-1][:20]]          # user's strongest tracks
    out = []
    for t in top:
        anchor = fav[np.argmax(F[fav] @ F[t])]                     # most similar liked track
        out.append(Rec(track_id=tracks.track_id[t], title=tracks.title[t], artist=tracks.artist[t],
                       score=float(s[t]), reason=f"Sounds like '{tracks.title[anchor]}' you played a lot"))
    return out

@app.get("/similar/{track_id}", response_model=list[Rec])
def similar(track_id: str, k: int = 10):
    t = B["t_idx"].get(track_id)
    if t is None:
        raise HTTPException(404, "Unknown track")
    sims = F @ F[t]; sims[t] = -np.inf
    top = np.argpartition(sims, -k)[-k:]; top = top[np.argsort(sims[top])[::-1]]
    return [Rec(track_id=tracks.track_id[i], title=tracks.title[i], artist=tracks.artist[i],
                score=float(sims[i]), reason="Similar audio profile") for i in top]

@app.get("/sample-users")
def sample_users(n: int = 5):
    return list(B["u_idx"].keys())[:n]


@app.get("/history/{user_id}")
def history(user_id: str, k: int = 10):
    u = B["u_idx"].get(user_id)
    if u is None:
        raise HTTPException(404, "Unknown user")
    idx = X[u].indices[np.argsort(X[u].data)[::-1][:k]]
    return tracks.iloc[idx][["track_id", "title", "artist"]].to_dict("records")


@app.get("/search")
def search(q: str, limit: int = 10):
    m = tracks[
        tracks.title.str.contains(q, case=False, na=False)
        | tracks.artist.str.contains(q, case=False, na=False)
    ].head(limit)
    return m[["track_id", "title", "artist"]].to_dict("records")