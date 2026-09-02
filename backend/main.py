from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
import numpy as np

app = FastAPI(title="HydroCast AI Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ForecastRequest(BaseModel):
    city_code: str
    forecast_hour: int

@app.get("/api/health")
def health_check():
    return {"status": "online", "model_engine": "HydroCast AI - PyTorch U-Net"}

@app.post("/api/forecast/inundation")
def predict_inundation(payload: ForecastRequest):
    # Mocking real-time tensor inference grid (B, C, H, W)
    dummy_input = torch.rand(1, 4, 128, 128)
    
    # Calculate mock flood depth array in centimeters
    depth_grid = (torch.sigmoid(dummy_input[:, 0:1, :, :]) * 60.0).squeeze().tolist()
    
    return {
        "city": payload.city_code,
        "lead_time_hours": payload.forecast_hour,
        "grid_resolution": "250m",
        "max_depth_cm": float(np.max(depth_grid)),
        "inundation_grid": depth_grid
    }