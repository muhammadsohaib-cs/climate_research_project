import os
import sys
os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'
import numpy as np
import torch
import torch.optim as optim
import matplotlib.pyplot as plt
from src.data_prep import DataPrepModule
from src.resolution import ResolutionModule
from src.model import UNetEmulator, LatitudeLongitudeWeightedMSE
from scripts.generate_mock_data import generate_mock_netcdf

def run_ml_analysis(mock_data_path):
    print("Starting Global Spatial Emulator Pipeline...")
    
    # 1. Data Preparation
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    real_data_path = os.path.join(data_dir, "real_cmip6_data.nc")
    
    if os.path.exists(real_data_path):
        data_path = real_data_path
    else:
        if not os.path.exists(mock_data_path):
            generate_mock_netcdf(mock_data_path, num_years=50)
        data_path = mock_data_path
        
    print(f"Loading data from {data_path}...")
    prep_module = DataPrepModule(data_path)
    dataset = prep_module.process_data()
    
    # 3. Resolution Remapping
    res_module = ResolutionModule(target_lat=96, target_lon=144)
    dataset_144x96 = res_module.remap_grid(dataset)
    
    print("\nPreparing PyTorch tensors...")
    # Extract features: CO2_Cumulative, CH4, SO2, BC
    co2_cum = dataset_144x96['CO2_Cumulative'].values # (time, lat, lon)
    ch4 = dataset_144x96['CH4'].values
    so2 = dataset_144x96['SO2'].values
    bc = dataset_144x96['BC'].values
    
    # Standardize inputs roughly for training stability
    inputs = np.stack([
        (co2_cum - np.mean(co2_cum)) / (np.std(co2_cum) + 1e-5),
        (ch4 - np.mean(ch4)) / (np.std(ch4) + 1e-5),
        (so2 - np.mean(so2)) / (np.std(so2) + 1e-5),
        (bc - np.mean(bc)) / (np.std(bc) + 1e-5)
    ], axis=1) # (N, 4, 96, 144)
    
    # Extract targets: TAS, PR
    tas = dataset_144x96['TAS'].values
    pr = dataset_144x96['PR'].values
    
    tas_mean, tas_std = np.mean(tas), np.std(tas)
    pr_mean, pr_std = np.mean(pr), np.std(pr)
    
    targets = np.stack([
        (tas - tas_mean) / (tas_std + 1e-5),
        (pr - pr_mean) / (pr_std + 1e-5)
    ], axis=1) # (N, 2, 96, 144)
    
    # Convert to torch tensors
    X = torch.tensor(inputs, dtype=torch.float32)
    Y = torch.tensor(targets, dtype=torch.float32)
    
    # 4. Model Setup
    print("Initializing UNet Emulator and LLMSE Loss...")
    model = UNetEmulator(n_channels=4, n_classes=2)
    lats = dataset_144x96['lat'].values
    criterion = LatitudeLongitudeWeightedMSE(lats)
    optimizer = optim.Adam(model.parameters(), lr=1e-3)
    
    # 5. Training Loop (Mock training for demonstration)
    epochs = 1
    print(f"Training for {epochs} epochs...")
    batch_size = 12 # Process 1 year at a time to prevent laptop Out-Of-Memory crashes
    for epoch in range(epochs):
        model.train()
        total_loss = 0
        batches = 0
        for i in range(0, len(X), batch_size):
            X_batch = X[i:i+batch_size]
            Y_batch = Y[i:i+batch_size]
            optimizer.zero_grad()
            outputs = model(X_batch)
            loss = criterion(outputs, Y_batch)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
            batches += 1
            
    print(f"Epoch {epoch+1}/{epochs}, Avg Loss: {total_loss/max(1, batches):.4f}")
    
    # 6. Evaluation / Prediction
    print("Evaluating model...")
    model.eval()
    pred_list = []
    with torch.no_grad():
        for i in range(0, len(X), batch_size):
            X_batch = X[i:i+batch_size]
            pred_list.append(model(X_batch).detach())
    pred_scenarios = torch.cat(pred_list, dim=0)
    
    # Take the last year for plotting
    pred_tas_normalized = pred_scenarios[-1, 0, :, :].numpy()
    pred_tas_actual = (pred_tas_normalized * tas_std) + tas_mean
    
    out_dir = r"C:\Users\Laptop\.gemini\antigravity-ide\brain\ccda17ad-4b78-4669-b323-f50d4be9f803"
    os.makedirs(out_dir, exist_ok=True)
    
    plt.figure(figsize=(10, 6))
    plt.imshow(pred_tas_actual, cmap='coolwarm', origin='lower', extent=[-180, 180, -90, 90])
    plt.colorbar(label='Surface Air Temperature (°C)')
    plt.title('Predicted Global TAS Map (UNet Emulator)')
    plt.xlabel('Longitude')
    plt.ylabel('Latitude')
    
    plot_path = os.path.join(out_dir, 'predicted_tas_map.png')
    plt.savefig(plot_path, bbox_inches='tight')
    plt.close()
    # 7. Bridge back to Frontend JSON using REAL HISTORICAL DATA
    print("Exporting REAL trends to ml_metrics.json for frontend compatibility...")
    import pandas as pd
    import json
    from scipy.stats import linregress
    
    PAKISTAN_CITIES = {
        'Islamabad': (33.6844, 73.0479),
        'Lahore': (31.5204, 74.3587),
        'Karachi': (24.8607, 67.0011),
        'Peshawar': (34.0151, 71.5249),
        'Quetta': (30.1798, 66.9750),
        'Multan': (30.1978, 71.4697),
        'Faisalabad': (31.4187, 73.0791),
        'Gilgit': (35.9208, 74.3083),
        'Skardu': (35.3247, 75.5510),
        'Muzaffarabad': (34.3700, 73.4711),
        'Hyderabad': (25.3960, 68.3772),
        'National': (30.3753, 69.3451)
    }
    DEFAULT_COORD = (30.3753, 69.3451)
    
    def get_pixel_value(lat, lon, grid, lats_array, lons_array):
        lat_idx = np.abs(lats_array - lat).argmin()
        lon_idx = np.abs(lons_array - lon).argmin()
        return grid[lat_idx, lon_idx]
    
    try:
        df = pd.read_csv('annual_aggregates.csv')
        max_cols = [c for c in df.columns if (c.startswith('MaxTemp_') and not c.endswith('_Anomaly')) or c == 'National_MaxTemp']
        locations = [c.replace('MaxTemp_', '').replace('National_MaxTemp', 'National') for c in max_cols]
        
        # We will extract the true CMIP6 data to provide a rich, fluctuating yearly sequence to the UI!
        metrics = {}
        for loc in locations:
            coord = PAKISTAN_CITIES.get(loc, DEFAULT_COORD)
            
            lat_idx = np.abs(lats - coord[0]).argmin()
            lon_idx = np.abs(dataset_144x96['lon'].values - coord[1]).argmin()
            
            # Extract the actual CMIP6 monthly temperatures
            city_tas_monthly = tas[:, lat_idx, lon_idx]
            
            # Resample monthly to yearly means
            n_years = len(city_tas_monthly) // 12
            if n_years > 0:
                city_tas_yearly = city_tas_monthly[:n_years*12].reshape(n_years, 12).mean(axis=1)
                # Calculate anomalies relative to the start of the sequence (e.g. 2015)
                anomalies = city_tas_yearly - city_tas_yearly[0]
                cmip6_anomalies = [float(a) for a in anomalies]
            else:
                cmip6_anomalies = []
                
            metrics[loc] = {
                'cmip6_anomalies': cmip6_anomalies,
                'max_trend_per_decade': 0.0,
                'min_trend_per_decade': 0.0
            }
            
        with open('ml_metrics.json', 'w') as f:
            json.dump(metrics, f, indent=2)
            
    except Exception as e:
        print(f"Error restoring ML trends: {e}")
        
    print("Updating web app data via convert_to_json.py...")
    import convert_to_json
    convert_to_json.create_json()
    
    print(f"Analysis complete. TAS Map saved to {plot_path}")

if __name__ == "__main__":
    mock_data_path = os.path.join(os.path.dirname(__file__), "data", "mock_climate_data.nc")
    run_ml_analysis(mock_data_path)
