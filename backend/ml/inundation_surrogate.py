import torch
import torch.nn as nn

class DoubleConv(nn.Module):
    def __init__(self, in_channels, out_channels):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, 3, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, 3, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True)
        )
    def forward(self, x):
        return self.conv(x)

class InundationSurrogateUNet(nn.Module):
    def __init__(self, in_channels=4, out_channels=1):
        """
        in_channels: 
          1. Predicted Rainfall Intensity (mm/h)
          2. Terrain Elevation / DEM (m)
          3. Terrain Slope / Flow Direction (degrees)
          4. Stormwater Drain Density / Discharge Capacity
        out_channels: 
          1. Predicted Water Accumulation Depth (cm)
        """
        super().__init__()
        self.inc = DoubleConv(in_channels, 32)
        self.down1 = nn.Sequential(nn.MaxPool2d(2), DoubleConv(32, 64))
        self.down2 = nn.Sequential(nn.MaxPool2d(2), DoubleConv(64, 128))
        
        self.up1 = nn.ConvTranspose2d(128, 64, 2, stride=2)
        self.conv_up1 = DoubleConv(128, 64)
        
        self.up2 = nn.ConvTranspose2d(64, 32, 2, stride=2)
        self.conv_up2 = DoubleConv(64, 32)
        
        self.outc = nn.Sequential(
            nn.Conv2d(32, out_channels, 1),
            nn.ReLU() # Flood depth cannot be negative
        )

    def forward(self, x):
        x1 = self.inc(x)
        x2 = self.down1(x1)
        x3 = self.down2(x2)
        
        x = self.up1(x3)
        x = torch.cat([x, x2], dim=1)
        x = self.conv_up1(x)
        
        x = self.up2(x)
        x = torch.cat([x, x1], dim=1)
        x = self.conv_up2(x)
        return self.outc(x)