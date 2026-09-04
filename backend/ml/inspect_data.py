# backend/ml/inspect_data.py
import os
import glob
import numpy as np

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

print(f"[*] Scanning data directory: {os.path.abspath(DATA_DIR)}")

# Look for common raster / array formats
extensions = ["*.npz", "*.npy", "*.tif", "*.tiff", "*.nc", "*.h5"]
found_files = {}

for ext in extensions:
    matches = glob.glob(os.path.join(DATA_DIR, "**", ext), recursive=True)
    if matches:
        found_files[ext] = matches
        print(f"  -> Found {len(matches)} files with format {ext}")

if not found_files:
    print("[!] No standard array or raster files found in data/. Check where your teammate stored them.")
else:
    sample_file = list(found_files.values())[0][0]
    print(f"\n[*] Inspecting sample file: {sample_file}")

    if sample_file.endswith(".npz"):
        data = np.load(sample_file)
        print("  Keys inside NPZ:", list(data.keys()))
        for k in data.keys():
            arr = data[k]
            print(f"    Key '{k}': shape={arr.shape}, dtype={arr.dtype}, min={arr.min():.2f}, max={arr.max():.2f}")
            
    elif sample_file.endswith(".npy"):
        arr = np.load(sample_file)
        print(f"  Shape: {arr.shape}, dtype: {arr.dtype}, min: {arr.min():.2f}, max: {arr.max():.2f}")

    elif sample_file.endswith((".tif", ".tiff")):
        try:
            import cv2
            img = cv2.imread(sample_file, cv2.IMREAD_UNCHANGED)
            print(f"  TIFF Shape: {img.shape}, dtype: {img.dtype}, min: {img.min():.2f}, max: {img.max():.2f}")
        except Exception as e:
            print("  Could not read TIFF directly via cv2:", e)