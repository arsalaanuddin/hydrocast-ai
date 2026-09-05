# backend/ml/inundation_surrogate.py

import os
import torch
import torch.nn as nn
import numpy as np

class FusionNeuralNetwork(nn.Module):
    def __init__(self, weights_path: str = None):
        super(FusionNeuralNetwork, self).__init__()
        
        # Simple U-Net surrogate architecture mock or actual layers
        self.encoder_conv = nn.Sequential(
            nn.Conv2d(4, 32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.ReLU()
        )
        self.rain_conv = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=3, padding=1),
            nn.ReLU()
        )
        self.decoder_conv = nn.Sequential(
            nn.Conv2d(96, 32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.Conv2d(32, 1, kernel_size=3, padding=1),
            nn.ReLU()
        )

        if weights_path and os.path.exists(weights_path):
            try:
                self.load_state_dict(torch.load(weights_path, map_location=torch.device('cpu')))
                print(f"[✓] Model 2 Inundation weights loaded from {weights_path}")
            except Exception as e:
                print(f"[!] Warning: Failed loading model weights ({e}). Initialized with default weights.")
        else:
            print("[!] Notice: No model2 weights path provided. Running with initialized surrogate network.")

        self.eval()

    def forward(self, terrain_stack: torch.Tensor, rain_tensor: torch.Tensor) -> torch.Tensor:
        feat = self.encoder_conv(terrain_stack)
        rain_feat = self.rain_conv(rain_tensor)
        combined = torch.cat([feat, rain_feat], dim=1)
        out = self.decoder_conv(combined)
        return out

    def predict_depth_grid(self, rain_grid: np.ndarray, feature_stack: np.ndarray) -> np.ndarray:
        """
        Runs lightning-fast PyTorch inference without tracking gradients.
        """
        self.eval()
        with torch.no_nat_grad() if hasattr(torch, 'no_nat_grad') else torch.no_grad():
            inputs = torch.tensor(feature_stack, dtype=torch.float32).unsqueeze(0)
            rain_tensor = torch.tensor(rain_grid, dtype=torch.float32).unsqueeze(0).unsqueeze(0)
            
            output = self.forward(inputs, rain_tensor)
            return output.squeeze().cpu().numpy()