import os
import sys
os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'
import numpy as np
import pandas as pd
import json
from scipy.stats import linregress
from sklearn.model_selection import TimeSeriesSplit
from sklearn.ensemble import GradientBoostingRegressor
import statsmodels.api as sm
import torch
import torch.nn as nn
import torch.optim as optim

def run_v2_1_ml_pipeline():
    print("=== Starting Pakistan Climate Data Advanced ML Forecasting Pipeline v2.1 (Corrected) ===")
    
    # ---------------------------------------------------------
    # 2.2 Exogenous Global Climate Forcing Drivers (v2.1 Specifications)
    # ---------------------------------------------------------
    def get_exogenous_features(years):
        years = np.array(years, dtype=float)
        
        # 1. CO2: Quadratic Keeling Curve (Baseline 1960: 315.0 ppm, high-emissions SSP3-7.0 scenario)
        co2 = 315.0 + 1.25 * (years - 1960) + 0.011 * (years - 1960)**2
        
        # 2. Stratospheric Aerosol Optical Depth (AOD) with Exponential Decay Kernel (tau = 1.2 years)
        tau = 1.2
        aod_baseline = 0.005
        
        def decay_kernel(t, t0):
            dt = t - t0
            return np.where(dt >= 0, np.exp(-dt / tau), 0.0)
        
        aod = aod_baseline + \
              0.15 * decay_kernel(years, 1963) + \
              0.10 * decay_kernel(years, 1982) + \
              0.25 * decay_kernel(years, 1991)
              
        # 3. Oceanic Niño Index (ONI): Continuous sinusoidal ENSO proxy
        # A_ENSO = 0.8, T_ENSO = 3.6 years
        oni = 0.8 * np.sin(2 * np.pi * (years - 1960) / 3.6) + \
              0.5 * np.sin(2 * np.pi * (years - 1960) / 5.4 + 0.8)
              
        # Standardize features for model training stability
        co2_scaled = (co2 - 380.0) / 40.0
        aod_scaled = (aod - 0.02) / 0.05
        oni_scaled = oni
        
        return np.column_stack([co2_scaled, aod_scaled, oni_scaled])

    # ---------------------------------------------------------
    # 2.1 Autoregressive Lag Features (Eq. 1)
    # X_lag = [Ymax,t-1, Ymax,t-2, Ymin,t-1, Ymin,t-2, Pt-1, Pt-2]
    # ---------------------------------------------------------
    def build_v2_1_features(years, y_max_series, y_min_series, p_series, exog_features, lag_k=2):
        X, y_max, y_min = [], [], []
        for i in range(lag_k, len(years)):
            max_lags = y_max_series[i-lag_k:i] # [t-2, t-1] -> reverse to [t-1, t-2]
            max_lags = max_lags[::-1]
            min_lags = y_min_series[i-lag_k:i][::-1]
            p_lags = p_series[i-lag_k:i][::-1]
            
            ex = exog_features[i]
            
            # X_lag = [Ymax,t-1, Ymax,t-2, Ymin,t-1, Ymin,t-2, Pt-1, Pt-2, CO2, AOD, ONI]
            feat = np.concatenate([max_lags, min_lags, p_lags, ex])
            X.append(feat)
            y_max.append(y_max_series[i])
            y_min.append(y_min_series[i])
            
        return np.array(X), np.array(y_max), np.array(y_min)

    # ---------------------------------------------------------
    # 4.3 Deep Learning: PyTorch LSTM Forecaster with Dropout (p=0.2)
    # ---------------------------------------------------------
    class PyTorchLSTMForecaster(nn.Module):
        def __init__(self, input_dim, hidden_dim=16, dropout=0.2):
            super().__init__()
            self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers=1, batch_first=True)
            self.dropout = nn.Dropout(dropout)
            self.linear = nn.Linear(hidden_dim, 1)

        def forward(self, x):
            lstm_out, _ = self.lstm(x)
            out = self.dropout(lstm_out[:, -1, :])
            return self.linear(out).squeeze(-1)

    def train_lstm(X_train, y_train, input_dim, epochs=40, lr=0.01):
        model = PyTorchLSTMForecaster(input_dim=input_dim, dropout=0.2)
        optimizer = optim.Adam(model.parameters(), lr=lr)
        criterion = nn.MSELoss()

        X_t = torch.tensor(X_train, dtype=torch.float32).unsqueeze(1)
        y_t = torch.tensor(y_train, dtype=torch.float32)

        for epoch in range(epochs):
            model.train()
            optimizer.zero_grad()
            pred = model(X_t)
            loss = criterion(pred, y_t)
            loss.backward()
            optimizer.step()
        return model

    # 6.3 Monte Carlo Dropout (M=50 passes) for 90% Prediction Intervals
    def predict_lstm_mc_dropout(model, x_input, n_samples=50):
        model.train() # Keep dropout active during inference
        x_t = torch.tensor(x_input, dtype=torch.float32).reshape(1, 1, -1)
        preds = []
        with torch.no_grad():
            for _ in range(n_samples):
                preds.append(model(x_t).item())
        preds = np.array(preds)
        m = float(np.mean(preds))
        l = float(np.percentile(preds, 5))
        u = float(np.percentile(preds, 95))
        return m, l, u

    # Load dataset
    df = pd.read_csv('annual_aggregates.csv')
    df['Date'] = pd.to_datetime(df['Date'])
    df['Year'] = df['Date'].dt.year
    historical_years = df['Year'].values

    max_cols = [c for c in df.columns if (c.startswith('MaxTemp_') and not c.endswith('_Anomaly')) or c == 'National_MaxTemp']
    locations = [c.replace('MaxTemp_', '').replace('National_MaxTemp', 'National') for c in max_cols]

    exog_hist = get_exogenous_features(historical_years)
    future_years = np.arange(2018, 2038)
    exog_future = get_exogenous_features(future_years)

    metrics = {}
    
    # ---------------------------------------------------------
    # Model Benchmarking & Walk-Forward Cross-Validation Loop
    # ---------------------------------------------------------
    for loc in locations:
        col_max = f"MaxTemp_{loc}" if loc != "National" else "National_MaxTemp"
        col_min = f"MinTemp_{loc}" if loc != "National" else "National_MinTemp"
        col_precip = f"Precip_{loc}" if loc != "National" else "National_Precip"
        col_peak = f"PeakMaxTemp_{loc}" if loc != "National" else "National_PeakMaxTemp"
        col_summer = f"SummerMaxTemp_{loc}" if loc != "National" else "National_SummerMaxTemp"

        if col_max not in df.columns or col_min not in df.columns:
            continue

        # Data Quality Filtering
        if df[col_max].isnull().sum() > (len(df) - 10) or df[col_min].isnull().sum() > (len(df) - 10):
            print(f"[Quality Filter] Skipping {loc} due to insufficient valid historical depth.")
            continue

        y_max_series = df[col_max].interpolate(method='linear').ffill().bfill().values
        y_min_series = df[col_min].interpolate(method='linear').ffill().bfill().values

        peak_series = df[col_peak].interpolate(method='linear').ffill().bfill().values if col_peak in df.columns else y_max_series + 12.0
        summer_series = df[col_summer].interpolate(method='linear').ffill().bfill().values if col_summer in df.columns else y_max_series + 5.0

        if col_precip in df.columns:
            p_series = df[col_precip].interpolate(method='linear').ffill().bfill().values
        elif 'National_Precip' in df.columns:
            p_series = df['National_Precip'].interpolate(method='linear').ffill().bfill().values
        else:
            p_series = np.zeros_like(y_max_series)

        # Build v2.1 Lag Vectors
        X, Y_max, Y_min = build_v2_1_features(historical_years, y_max_series, y_min_series, p_series, exog_hist, lag_k=2)

        max_trend = linregress(historical_years, y_max_series).slope * 10
        min_trend = linregress(historical_years, y_min_series).slope * 10
        peak_trend = linregress(historical_years, peak_series).slope * 10

        loc_results = {
            'max_trend_per_decade': round(float(max_trend), 3),
            'min_trend_per_decade': round(float(min_trend), 3),
            'peak_trend_per_decade': round(float(peak_trend), 3),
            'selected_models': {},
            'cv_mse': {}
        }

        # Benchmark Target Metrics
        target_dict = {
            'max': y_max_series,
            'min': y_min_series,
            'peak': peak_series,
            'summer': summer_series
        }

        for target_name, target_y in target_dict.items():
            _, y_target, _ = build_v2_1_features(historical_years, target_y, y_min_series, p_series, exog_hist, lag_k=2)

            # 3. 5-Fold Walk-Forward TimeSeriesSplit Cross-Validation
            tscv = TimeSeriesSplit(n_splits=5)
            cv_scores = {'gb': [], 'arimax': [], 'lstm': []}

            for train_idx, val_idx in tscv.split(X):
                X_tr, X_va = X[train_idx], X[val_idx]
                y_tr, y_va = y_target[train_idx], y_target[val_idx]

                # 4.1 Gradient Boosting
                gb = GradientBoostingRegressor(loss='squared_error', n_estimators=40, max_depth=3, learning_rate=0.05, random_state=42)
                gb.fit(X_tr, y_tr)
                p_gb = gb.predict(X_va)
                cv_scores['gb'].append(float(np.mean((p_gb - y_va)**2)))

                # 4.2 ARIMAX(1, 1, 0)
                try:
                    ex_tr = X_tr[:, -3:]
                    ex_va = X_va[:, -3:]
                    arimax_m = sm.tsa.statespace.sarimax.SARIMAX(
                        y_tr, exog=ex_tr, order=(1, 1, 0), enforce_stationarity=False, enforce_invertibility=False
                    )
                    arimax_res = arimax_m.fit(disp=False)
                    p_arimax = arimax_res.forecast(steps=len(y_va), exog=ex_va)
                    cv_scores['arimax'].append(float(np.mean((p_arimax - y_va)**2)))
                except:
                    cv_scores['arimax'].append(999.0)

                # 4.3 PyTorch LSTM
                try:
                    lstm_m = train_lstm(X_tr, y_tr, input_dim=X_tr.shape[1], epochs=30)
                    lstm_m.eval()
                    with torch.no_grad():
                        p_lstm = lstm_m(torch.tensor(X_va, dtype=torch.float32).unsqueeze(1)).numpy()
                    cv_scores['lstm'].append(float(np.mean((p_lstm - y_va)**2)))
                except:
                    cv_scores['lstm'].append(999.0)

            # Average CV MSE across folds
            avg_mse = {m: round(float(np.mean(scores)), 4) for m, scores in cv_scores.items()}
            best_model_name = min(avg_mse, key=avg_mse.get)

            loc_results['selected_models'][target_name] = best_model_name.upper()
            loc_results['cv_mse'][target_name] = avg_mse[best_model_name]

            # ---------------------------------------------------------
            # Retrain selected model on full series & predict 2018-2037
            # ---------------------------------------------------------
            forecast_mean, forecast_lower, forecast_upper = [], [], []
            y_hist_tracker = list(target_y)
            ymin_hist_tracker = list(y_min_series)
            p_hist_tracker = list(p_series)

            if best_model_name == 'gb':
                # 6.1 Quantile Regression (Pinball Loss q=0.05, 0.50, 0.95)
                gb_mean = GradientBoostingRegressor(loss='squared_error', n_estimators=50, max_depth=3, learning_rate=0.05, random_state=42)
                gb_lower = GradientBoostingRegressor(loss='quantile', alpha=0.05, n_estimators=50, max_depth=3, learning_rate=0.05, random_state=42)
                gb_upper = GradientBoostingRegressor(loss='quantile', alpha=0.95, n_estimators=50, max_depth=3, learning_rate=0.05, random_state=42)

                gb_mean.fit(X, y_target)
                gb_lower.fit(X, y_target)
                gb_upper.fit(X, y_target)

                for idx, year in enumerate(future_years):
                    feat_t = np.concatenate([
                        y_hist_tracker[-2:][::-1],
                        ymin_hist_tracker[-2:][::-1],
                        p_hist_tracker[-2:][::-1],
                        exog_future[idx]
                    ])
                    m = float(gb_mean.predict([feat_t])[0])
                    l = float(gb_lower.predict([feat_t])[0])
                    u = float(gb_upper.predict([feat_t])[0])

                    l = min(l, m - 0.2)
                    u = max(u, m + 0.2)

                    forecast_mean.append(round(m, 2))
                    forecast_lower.append(round(l, 2))
                    forecast_upper.append(round(u, 2))

                    y_hist_tracker.append(m)
                    ymin_hist_tracker.append(m - 10.0)
                    p_hist_tracker.append(float(np.mean(p_hist_tracker[-5:])))

            elif best_model_name == 'arimax':
                # 6.2 Parametric Intervals (ARIMAX 90% CI with z = 1.645)
                exog_all = X[:, -3:]
                try:
                    arimax_all = sm.tsa.statespace.sarimax.SARIMAX(
                        y_target, exog=exog_all, order=(1, 1, 0), enforce_stationarity=False, enforce_invertibility=False
                    )
                    arimax_fit = arimax_all.fit(disp=False)
                    pred_frame = arimax_fit.get_forecast(steps=len(future_years), exog=exog_future).summary_frame(alpha=0.10) # 90% CI

                    forecast_mean = [round(float(v), 2) for v in pred_frame['mean'].values]
                    forecast_lower = [round(float(v), 2) for v in pred_frame['mean_ci_lower'].values]
                    forecast_upper = [round(float(v), 2) for v in pred_frame['mean_ci_upper'].values]
                except:
                    # Fallback GB
                    gb_m = GradientBoostingRegressor(loss='squared_error', n_estimators=40, random_state=42).fit(X, y_target)
                    for idx, year in enumerate(future_years):
                        feat_t = np.concatenate([y_hist_tracker[-2:][::-1], ymin_hist_tracker[-2:][::-1], p_hist_tracker[-2:][::-1], exog_future[idx]])
                        m = float(gb_m.predict([feat_t])[0])
                        forecast_mean.append(round(m, 2))
                        forecast_lower.append(round(m - 0.6, 2))
                        forecast_upper.append(round(m + 0.6, 2))
                        y_hist_tracker.append(m)
                        ymin_hist_tracker.append(m - 10.0)
                        p_hist_tracker.append(float(np.mean(p_hist_tracker[-5:])))

            else: # PyTorch LSTM
                # 6.3 Monte Carlo Dropout (M=50 passes)
                lstm_full = train_lstm(X, y_target, input_dim=X.shape[1], epochs=50)

                for idx, year in enumerate(future_years):
                    feat_t = np.concatenate([
                        y_hist_tracker[-2:][::-1],
                        ymin_hist_tracker[-2:][::-1],
                        p_hist_tracker[-2:][::-1],
                        exog_future[idx]
                    ])
                    m, l, u = predict_lstm_mc_dropout(lstm_full, feat_t, n_samples=50)

                    forecast_mean.append(round(m, 2))
                    forecast_lower.append(round(l, 2))
                    forecast_upper.append(round(u, 2))

                    y_hist_tracker.append(m)
                    ymin_hist_tracker.append(m - 10.0)
                    p_hist_tracker.append(float(np.mean(p_hist_tracker[-5:])))

            loc_results[f'forecast_{target_name}_mean'] = forecast_mean
            loc_results[f'forecast_{target_name}_lower'] = forecast_lower
            loc_results[f'forecast_{target_name}_upper'] = forecast_upper

        metrics[loc] = loc_results
        print(f"Station {loc}: Max Model={loc_results['selected_models']['max']} (MSE {loc_results['cv_mse']['max']}), Min Model={loc_results['selected_models']['min']} (MSE {loc_results['cv_mse']['min']})")

    with open('ml_metrics.json', 'w') as f:
        json.dump(metrics, f, indent=2)

    print("Completed pipeline v2.1. Metrics saved to ml_metrics.json.")

if __name__ == '__main__':
    run_v2_1_ml_pipeline()
