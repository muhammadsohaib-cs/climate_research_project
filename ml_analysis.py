import os
import sys
os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'
import numpy as np
import torch
import torch.optim as optim
import matplotlib.pyplot as plt
try:
    from src.data_prep import DataPrepModule
    from src.resolution import ResolutionModule
    from src.model import UNetEmulator, LatitudeLongitudeWeightedMSE
    from scripts.generate_mock_data import generate_mock_netcdf
    HAS_SPATIAL_EMULATOR = True
except ImportError:
    HAS_SPATIAL_EMULATOR = False

def run_spatial_emulator(mock_data_path):
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

def run_ml_analysis(mock_data_path):
    if HAS_SPATIAL_EMULATOR:
        try:
            run_spatial_emulator(mock_data_path)
        except Exception as e:
            print(f"Error running spatial emulator: {e}")
    else:
        print("Spatial UNet emulator modules (src/scripts) are not present in this workspace.")
        print("Skipping global spatial emulator training and proceeding directly to station time-series ML forecasting...")

    # 7. Bridge back to Frontend JSON using REAL HISTORICAL DATA & Advanced ML Forecasting
    print("Starting Advanced ML Time-Series Forecasting Pipeline...")
    import pandas as pd
    import json
    from scipy.stats import linregress
    from sklearn.model_selection import TimeSeriesSplit
    from sklearn.ensemble import GradientBoostingRegressor
    import statsmodels.api as sm
    import torch
    import torch.nn as nn
    import torch.optim as optim
    
    # 1. Define Exogenous Climate Forcing Drivers (1961 - 2037)
    def get_exogenous_features(years):
        # CO2: Quadratic Keeling Curve fitting historical NOAA observations & RCP projections
        co2 = 315.0 + 1.25 * (years - 1960) + 0.011 * (years - 1960)**2
        
        # Aerosols: Stratospheric Aerosol Optical Depth incorporating major volcanic spikes
        aerosols = np.full_like(years, 0.005, dtype=float)
        aerosols[years == 1963] = 0.15   # Agung
        aerosols[years == 1982] = 0.10   # El Chichón
        aerosols[years == 1991] = 0.25   # Pinatubo
        
        # ONI: Oceanic Niño Index simulated as a sum of dominant ENSO cycles (3.6yr, 5.4yr)
        oni = 0.8 * np.sin(2 * np.pi * (years - 1960) / 3.6) + \
              0.5 * np.sin(2 * np.pi * (years - 1960) / 5.4 + 0.8)
        
        # Standardize for ML model training stability
        co2_scaled = (co2 - 380.0) / 40.0
        aerosols_scaled = (aerosols - 0.02) / 0.05
        oni_scaled = oni
        
        return np.column_stack([co2_scaled, aerosols_scaled, oni_scaled])

    # 2. PyTorch LSTM Model Setup
    class LSTMForecaster(nn.Module):
        def __init__(self, input_dim, hidden_dim=8, num_layers=1, dropout=0.1):
            super().__init__()
            self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers, batch_first=True)
            self.dropout = nn.Dropout(dropout)
            self.linear = nn.Linear(hidden_dim, 1)
            
        def forward(self, x):
            lstm_out, _ = self.lstm(x)
            out = self.dropout(lstm_out[:, -1, :])
            return self.linear(out).squeeze(-1)

    def train_lstm_model(X_train, y_train, input_dim, epochs=50, lr=0.01):
        model = LSTMForecaster(input_dim=input_dim)
        optimizer = optim.Adam(model.parameters(), lr=lr)
        criterion = nn.MSELoss()
        
        X_t = torch.tensor(X_train, dtype=torch.float32).unsqueeze(1) # sequence length = 1
        y_t = torch.tensor(y_train, dtype=torch.float32)
        
        for epoch in range(epochs):
            model.train()
            optimizer.zero_grad()
            pred = model(X_t)
            loss = criterion(pred, y_t)
            loss.backward()
            optimizer.step()
        return model

    def predict_lstm_with_uncertainty(model, x_input, n_samples=50):
        model.train() # Enable dropout for MC Dropout uncertainty
        x_t = torch.tensor(x_input, dtype=torch.float32).reshape(1, 1, -1)
        preds = []
        with torch.no_grad():
            for _ in range(n_samples):
                preds.append(model(x_t).item())
        preds = np.array(preds)
        return float(np.mean(preds)), float(np.percentile(preds, 5)), float(np.percentile(preds, 95))

    # Helper to generate lags and exogenous features
    def build_features(years, target_series, precip_series, exog_features, lag_k=2):
        X, y = [], []
        for i in range(lag_k, len(years)):
            target_lags = target_series[i-lag_k:i]
            precip_lags = precip_series[i-lag_k:i]
            ex = exog_features[i]
            feat = np.concatenate([target_lags, precip_lags, ex])
            X.append(feat)
            y.append(target_series[i])
        return np.array(X), np.array(y)

    try:
        df = pd.read_csv('annual_aggregates.csv')
        # Filter for locations (excluding _Anomaly columns)
        max_cols = [c for c in df.columns if (c.startswith('MaxTemp_') and not c.endswith('_Anomaly')) or c == 'National_MaxTemp']
        locations = [c.replace('MaxTemp_', '').replace('National_MaxTemp', 'National') for c in max_cols]
        
        df['Date'] = pd.to_datetime(df['Date'])
        df['Year'] = df['Date'].dt.year
        historical_years = df['Year'].values
        n_years = len(historical_years)
        
        # Exogenous features for history (1961 - 2017)
        exog_hist = get_exogenous_features(historical_years)
        
        # Exogenous features for future (2018 - 2037)
        future_years = np.arange(2018, 2038)
        exog_future = get_exogenous_features(future_years)
        
        metrics = {}
        
        for loc in locations:
            print(f"Training models for {loc}...")
            col_max = f"MaxTemp_{loc}" if loc != "National" else "National_MaxTemp"
            col_min = f"MinTemp_{loc}" if loc != "National" else "National_MinTemp"
            col_precip = f"Precip_{loc}" if loc != "National" else "National_Precip"
            col_peak = f"PeakMaxTemp_{loc}" if loc != "National" else "National_PeakMaxTemp"
            
            if col_max not in df.columns or col_min not in df.columns:
                continue
                
            # Skip if columns have entirely NaN or insufficient data (< 10 valid values)
            if df[col_max].isnull().sum() > (len(df) - 10) or df[col_min].isnull().sum() > (len(df) - 10):
                print(f"  Skipping {loc} due to insufficient valid historical data.")
                continue
                
            # Linearly interpolate gaps if any, with fallback for precipitation
            max_series = df[col_max].interpolate(method='linear').ffill().bfill().values
            min_series = df[col_min].interpolate(method='linear').ffill().bfill().values
            if col_peak in df.columns:
                peak_series = df[col_peak].interpolate(method='linear').ffill().bfill().values
            else:
                peak_series = max_series + 12.0
                
            if col_precip in df.columns:
                precip_series = df[col_precip].interpolate(method='linear').ffill().bfill().values
            elif 'National_Precip' in df.columns:
                precip_series = df['National_Precip'].interpolate(method='linear').ffill().bfill().values
            else:
                precip_series = np.zeros_like(max_series)
            
            # Decadal trends using simple linear regression
            max_trend_per_decade = linregress(historical_years, max_series).slope * 10
            min_trend_per_decade = linregress(historical_years, min_series).slope * 10
            peak_trend_per_decade = linregress(historical_years, peak_series).slope * 10
            
            # Dictionary for storing forecasts of max, min, and peak temps
            loc_results = {
                'max_trend_per_decade': float(max_trend_per_decade),
                'min_trend_per_decade': float(min_trend_per_decade),
                'peak_trend_per_decade': float(peak_trend_per_decade)
            }
            
            for target_name, target_series in [('max', max_series), ('min', min_series), ('peak', peak_series)]:
                # Build lag + exogenous features
                X, y = build_features(historical_years, target_series, precip_series, exog_hist, lag_k=2)
                
                # Model selection using TimeSeriesSplit (5-fold)
                tscv = TimeSeriesSplit(n_splits=5)
                cv_scores = {'gb': [], 'sarimax': [], 'lstm': []}
                
                for train_idx, test_idx in tscv.split(X):
                    X_train, X_test = X[train_idx], X[test_idx]
                    y_train, y_test = y[train_idx], y[test_idx]
                    
                    # 1. Gradient Boosting
                    gb = GradientBoostingRegressor(loss='squared_error', n_estimators=30, max_depth=3, random_state=42)
                    gb.fit(X_train, y_train)
                    pred_gb = gb.predict(X_test)
                    cv_scores['gb'].append(np.mean((pred_gb - y_test)**2))
                    
                    # 2. SARIMAX
                    try:
                        exog_train = X_train[:, -3:]
                        exog_test = X_test[:, -3:]
                        sarimax_m = sm.tsa.statespace.sarimax.SARIMAX(
                            y_train,
                            exog=exog_train,
                            order=(1, 1, 0),
                            enforce_stationarity=False,
                            enforce_invertibility=False
                        )
                        sarimax_res = sarimax_m.fit(disp=False)
                        pred_s = sarimax_res.forecast(steps=len(y_test), exog=exog_test)
                        cv_scores['sarimax'].append(np.mean((pred_s - y_test)**2))
                    except:
                        cv_scores['sarimax'].append(float('inf'))
                        
                    # 3. LSTM
                    try:
                        lstm_m = train_lstm_model(X_train, y_train, input_dim=X_train.shape[1], epochs=40)
                        lstm_m.eval()
                        with torch.no_grad():
                            pred_lstm = lstm_m(torch.tensor(X_test, dtype=torch.float32).unsqueeze(1)).numpy()
                        cv_scores['lstm'].append(np.mean((pred_lstm - y_test)**2))
                    except:
                        cv_scores['lstm'].append(float('inf'))
                
                avg_scores = {m: np.mean(scores) for m, scores in cv_scores.items()}
                best_model_name = min(avg_scores, key=avg_scores.get)
                print(f"  {target_name.capitalize()} Temp Best Model: {best_model_name.upper()} (CV MSE: {avg_scores[best_model_name]:.4f})")
                
                # Retrain best model on the entire historical dataset and generate forecast
                forecast_mean, forecast_lower, forecast_upper = [], [], []
                
                # Setup recursive history variables
                target_hist = list(target_series)
                precip_hist = list(precip_series)
                
                if best_model_name == 'gb':
                    gb_mean = GradientBoostingRegressor(loss='squared_error', n_estimators=30, max_depth=3, random_state=42)
                    gb_lower = GradientBoostingRegressor(loss='quantile', alpha=0.05, n_estimators=30, max_depth=3, random_state=42)
                    gb_upper = GradientBoostingRegressor(loss='quantile', alpha=0.95, n_estimators=30, max_depth=3, random_state=42)
                    
                    gb_mean.fit(X, y)
                    gb_lower.fit(X, y)
                    gb_upper.fit(X, y)
                    
                    for idx, year in enumerate(future_years):
                        # Construct feature vector
                        feat_t = np.concatenate([
                            target_hist[-2:],
                            precip_hist[-2:],
                            exog_future[idx]
                        ])
                        
                        m = gb_mean.predict([feat_t])[0]
                        l = gb_lower.predict([feat_t])[0]
                        u = gb_upper.predict([feat_t])[0]
                        
                        # Guard rails to ensure bounds are logically consistent
                        l = min(l, m)
                        u = max(u, m)
                        
                        forecast_mean.append(float(m))
                        forecast_lower.append(float(l))
                        forecast_upper.append(float(u))
                        
                        # Update history recursively
                        target_hist.append(m)
                        # Simulate precipitation (rolling mean + noise)
                        p_sim = float(np.mean(precip_hist[-5:]) + np.random.normal(0, np.std(precip_hist[-5:]) * 0.1))
                        precip_hist.append(max(0.0, p_sim))
                        
                elif best_model_name == 'sarimax':
                    # Exogenous features for historical period
                    exog_train_all = X[:, -3:]
                    
                    try:
                        sarimax_all = sm.tsa.statespace.sarimax.SARIMAX(
                            y,
                            exog=exog_train_all,
                            order=(1, 1, 0),
                            enforce_stationarity=False,
                            enforce_invertibility=False
                        )
                        sarimax_res = sarimax_all.fit(disp=False)
                        # Perform forecasting
                        pred_res = sarimax_res.get_forecast(steps=len(future_years), exog=exog_future)
                        summary = pred_res.summary_frame(alpha=0.10) # 90% prediction intervals
                        
                        forecast_mean = [float(val) for val in summary['mean'].values]
                        forecast_lower = [float(val) for val in summary['mean_ci_lower'].values]
                        forecast_upper = [float(val) for val in summary['mean_ci_upper'].values]
                    except Exception as e:
                        # Fallback to Gradient Boosting if SARIMAX fails
                        print(f"  SARIMAX fitting failed for {loc} {target_name}, falling back to GB")
                        gb_mean = GradientBoostingRegressor(loss='squared_error', n_estimators=30, max_depth=3, random_state=42)
                        gb_mean.fit(X, y)
                        for idx, year in enumerate(future_years):
                            feat_t = np.concatenate([target_hist[-2:], precip_hist[-2:], exog_future[idx]])
                            m = gb_mean.predict([feat_t])[0]
                            forecast_mean.append(float(m))
                            forecast_lower.append(float(m - 1.0))
                            forecast_upper.append(float(m + 1.0))
                            target_hist.append(m)
                            precip_hist.append(float(np.mean(precip_hist[-5:])))
                            
                else: # LSTM
                    lstm_all = train_lstm_model(X, y, input_dim=X.shape[1], epochs=50)
                    
                    for idx, year in enumerate(future_years):
                        feat_t = np.concatenate([
                            target_hist[-2:],
                            precip_hist[-2:],
                            exog_future[idx]
                        ])
                        
                        m, l, u = predict_lstm_with_uncertainty(lstm_all, feat_t)
                        
                        forecast_mean.append(m)
                        forecast_lower.append(l)
                        forecast_upper.append(u)
                        
                        target_hist.append(m)
                        p_sim = float(np.mean(precip_hist[-5:]) + np.random.normal(0, np.std(precip_hist[-5:]) * 0.1))
                        precip_hist.append(max(0.0, p_sim))
                
                loc_results[f'forecast_{target_name}_mean'] = forecast_mean
                loc_results[f'forecast_{target_name}_lower'] = forecast_lower
                loc_results[f'forecast_{target_name}_upper'] = forecast_upper
                
            metrics[loc] = loc_results
            
        with open('ml_metrics.json', 'w') as f:
            json.dump(metrics, f, indent=2)
            
    except Exception as e:
        print(f"Error executing ML time-series forecasting: {e}")
        import traceback
        traceback.print_exc()
        
    print("Updating web app data via convert_to_json.py...")
    import convert_to_json
    convert_to_json.create_json()

    print("Analysis complete.")

if __name__ == "__main__":
    mock_data_path = os.path.join(os.path.dirname(__file__), "data", "mock_climate_data.nc")
    run_ml_analysis(mock_data_path)
