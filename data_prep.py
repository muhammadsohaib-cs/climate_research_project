import os
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

import numpy as np
import pandas as pd
from scipy.interpolate import RBFInterpolator

# 55 Pakistan Meteorological Weather Stations Coordinates (Lat, Lon)
STATION_COORDS = {
    'Astore': (35.36, 74.90),
    'Badin': (24.63, 68.83),
    'Bahawalnagar': (29.99, 73.25),
    'Bahawalpur': (29.39, 71.68),
    'Balakot': (34.54, 73.35),
    'Barkhan': (29.89, 69.52),
    'Bunji': (35.66, 74.63),
    'Cherat': (33.81, 71.88),
    'Chhor': (25.51, 69.78),
    'Chilas': (35.42, 74.10),
    'Chitral': (35.85, 71.78),
    'D.I Khan': (31.83, 70.90),
    'Dalbandin': (28.89, 64.40),
    'Darosh': (35.56, 71.80),
    'Dir': (35.20, 71.87),
    'Faisalabad': (31.45, 73.13),
    'Ghari Dupatta': (34.21, 73.61),
    'Gilgit': (35.92, 74.31),
    'Gupis': (36.23, 73.44),
    'Hyderabad': (25.39, 68.37),
    'Islamabad': (33.72, 73.06),
    'Jaccobabad': (28.28, 68.44),
    'Jhelum': (32.94, 73.72),
    'Jiwani': (25.05, 61.74),
    'Kakul': (34.18, 73.25),
    'Kalat': (29.03, 66.58),
    'Karachi': (24.86, 67.01),
    'Khanpur': (28.65, 70.66),
    'Khuzdar': (27.80, 66.61),
    'Kohat': (33.58, 71.44),
    'Kotli': (33.51, 73.90),
    'Lahore': (31.52, 74.35),
    'Lasbella': (26.22, 66.31),
    'Mianwali': (32.58, 71.53),
    'Mohin Jodaro': (27.33, 68.13),
    'Multan': (30.15, 71.52),
    'Murree': (33.90, 73.39),
    'Muzaffarabad': (34.37, 73.47),
    'Nawabshah': (26.24, 68.41),
    'Nokkundi': (28.82, 61.20),
    'Ormara': (25.20, 64.63),
    'Padidan': (26.86, 68.13),
    'Panjgur': (26.96, 64.10),
    'Parachinar': (33.90, 70.10),
    'Passni': (25.26, 63.48),
    'Peshawar': (34.01, 71.52),
    'Quetta': (30.18, 66.99),
    'Risalpur': (34.07, 71.98),
    'Rohri': (27.69, 68.89),
    'Saidu Sharif': (34.75, 72.35),
    'Sargodha': (32.08, 72.67),
    'Sialkot': (32.49, 74.52),
    'Sibbi': (29.55, 67.88),
    'Skardu': (35.30, 75.63),
    'Zhob': (31.34, 69.45)
}

# Define regular 2D grid mesh over Pakistan
LAT_GRID = np.linspace(24.0, 37.0, 27)
LON_GRID = np.linspace(60.5, 77.0, 34)
LAT_MESH, LON_MESH = np.meshgrid(LAT_GRID, LON_GRID, indexing='ij')

def interpolate_station_to_grid(station_values, coords_dict):
    points = []
    values = []
    
    for city, val in station_values.items():
        if city in coords_dict and pd.notna(val):
            lat, lon = coords_dict[city]
            points.append([lat, lon])
            values.append(val)
            
    if len(points) < 5:
        return np.full(LAT_MESH.shape, np.nanmean(values) if len(values) > 0 else 25.0)
        
    points = np.array(points)
    values = np.array(values)
    
    rbf = RBFInterpolator(points, values, kernel='thin_plate_spline', smoothing=0.1)
    grid_coords = np.column_stack([LAT_MESH.ravel(), LON_MESH.ravel()])
    grid_vals = rbf(grid_coords).reshape(LAT_MESH.shape)
    
    return grid_vals

def load_gridded_dataset(csv_path='annual_aggregates.csv'):
    print(f"Loading annual data from {csv_path}...")
    df = pd.read_csv(csv_path)
    years = df['Date'].apply(lambda x: int(str(x)[:4])).values
    n_years = len(years)
    
    H, W = LAT_MESH.shape
    C = 4 # MaxTemp, MinTemp, Precip, Forcing
    
    grid_tensor = np.zeros((n_years, C, H, W), dtype=np.float32)
    co2_curve = 315.0 + 1.8 * (years - 1961) + 0.01 * (years - 1961)**2
    
    for t_idx, row in df.iterrows():
        max_vals = {c.replace('MaxTemp_', ''): row[c] for c in df.columns if c.startswith('MaxTemp_') and not c.endswith('_Anomaly') and not c.startswith('National')}
        grid_tensor[t_idx, 0] = interpolate_station_to_grid(max_vals, STATION_COORDS)
        
        min_vals = {c.replace('MinTemp_', ''): row[c] for c in df.columns if c.startswith('MinTemp_') and not c.endswith('_Anomaly') and not c.startswith('National')}
        grid_tensor[t_idx, 1] = interpolate_station_to_grid(min_vals, STATION_COORDS)
        
        precip_vals = {c.replace('Precip_', ''): row[c] for c in df.columns if c.startswith('Precip_') and not c.startswith('National')}
        grid_tensor[t_idx, 2] = interpolate_station_to_grid(precip_vals, STATION_COORDS)
        
        grid_tensor[t_idx, 3] = np.full((H, W), co2_curve[t_idx], dtype=np.float32)
        
    return grid_tensor, years

def compute_climatological_zscores(grid_tensor, years, base_start=1961, base_end=1990):
    base_mask = (years >= base_start) & (years <= base_end)
    base_tensor = grid_tensor[base_mask]
    
    mu_clim = np.mean(base_tensor, axis=0, keepdims=True)
    sigma_clim = np.std(base_tensor, axis=0, keepdims=True)
    sigma_clim[sigma_clim < 1e-5] = 1.0
    
    norm_tensor = (grid_tensor - mu_clim) / sigma_clim
    
    return norm_tensor, mu_clim, sigma_clim

def create_5d_sequence_tensors(norm_tensor, seq_len=5, pred_len=5):
    N, C, H, W = norm_tensor.shape
    X_list, Y_list = [], []
    
    for i in range(N - seq_len - pred_len + 1):
        X_list.append(norm_tensor[i : i + seq_len])
        Y_list.append(norm_tensor[i + seq_len : i + seq_len + pred_len])
        
    X_5d = np.array(X_list, dtype=np.float32)
    Y_5d = np.array(Y_list, dtype=np.float32)
    
    return X_5d, Y_5d

if __name__ == '__main__':
    grid_tensor, years = load_gridded_dataset()
    norm_tensor, mu_clim, sigma_clim = compute_climatological_zscores(grid_tensor, years)
    X_5d, Y_5d = create_5d_sequence_tensors(norm_tensor)
    print(f"Z-Score Normalization completed. Shapes: X={X_5d.shape}, Y={Y_5d.shape}")
