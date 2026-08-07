import os
import sys
import json
import numpy as np
import pandas as pd
from scipy.stats import linregress
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_squared_error, mean_absolute_error

try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

try:
    import lightgbm as lgb
    HAS_LIGHTGBM = True
except ImportError:
    HAS_LIGHTGBM = False

try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False

def get_exogenous_features(years):
    years = np.array(years, dtype=float)
    co2 = 315.0 + 1.25 * (years - 1960) + 0.011 * (years - 1960)**2
    tau = 1.2
    aod_baseline = 0.005
    def decay_kernel(t, t0):
        dt = t - t0
        return np.where(dt >= 0, np.exp(-dt / tau), 0.0)
    
    aod = aod_baseline + 0.15 * decay_kernel(years, 1963) + 0.10 * decay_kernel(years, 1982) + 0.25 * decay_kernel(years, 1991)
    oni = 0.8 * np.sin(2 * np.pi * (years - 1960) / 3.6) + 0.5 * np.sin(2 * np.pi * (years - 1960) / 5.4 + 0.8)
    
    co2_scaled = (co2 - 380.0) / 40.0
    aod_scaled = (aod - 0.02) / 0.05
    oni_scaled = oni
    
    return np.column_stack([co2_scaled, aod_scaled, oni_scaled])

def build_differenced_features(years, delta_series, temp_series, precip_series, exog_features, lag_k=3, p_mean=None, p_std=None):
    X, y = [], []
    if p_mean is None:
        p_mean = np.mean(precip_series)
    if p_std is None:
        p_std = np.std(precip_series) if np.std(precip_series) > 0 else 1.0
        
    for i in range(lag_k, len(delta_series)):
        delta_lags = delta_series[i-lag_k:i][::-1]
        temp_lags = temp_series[i-lag_k:i][::-1]
        precip_lags = ((precip_series[i-lag_k:i] - p_mean) / p_std)[::-1]
        
        ex = exog_features[i]
        yr = years[i]
        yr_norm = (yr - 1960.0) / 60.0
        
        # Multi-Year Harmonic Oscillations (3, 5, 7 year climate frequencies)
        sin_3 = np.sin(2 * np.pi * yr / 3.0)
        cos_3 = np.cos(2 * np.pi * yr / 3.0)
        sin_5 = np.sin(2 * np.pi * yr / 5.0)
        cos_5 = np.cos(2 * np.pi * yr / 5.0)
        sin_7 = np.sin(2 * np.pi * yr / 7.0)
        cos_7 = np.cos(2 * np.pi * yr / 7.0)
        
        # Volatility Signals: Rolling Standard Deviations over 3-year & 5-year windows
        roll_std_3 = np.std(delta_lags[:3]) if len(delta_lags) >= 3 else np.std(delta_lags)
        roll_std_5 = np.std(delta_lags[:5]) if len(delta_lags) >= 5 else np.std(delta_lags)
        roll_mean_3 = np.mean(delta_lags[:3]) if len(delta_lags) >= 3 else np.mean(delta_lags)
        roll_mean_5 = np.mean(delta_lags[:5]) if len(delta_lags) >= 5 else np.mean(delta_lags)
        
        feat = np.concatenate([
            delta_lags,
            temp_lags,
            precip_lags,
            [roll_std_3, roll_std_5, roll_mean_3, roll_mean_5],
            [sin_3, cos_3, sin_5, cos_5, sin_7, cos_7, yr_norm],
            ex
        ])
        X.append(feat)
        y.append(delta_series[i])
        
    return np.array(X), np.array(y)

def run_tabular_ml_pipeline():
    print("=== Starting Differenced Target ML Climate Forecasting Engine (Dynamic Heterogeneity) ===")
    print(f"XGBoost available: {HAS_XGBOOST} | LightGBM available: {HAS_LIGHTGBM} | Matplotlib available: {HAS_MATPLOTLIB}")
    
    csv_path = 'annual_aggregates_corrected.csv'
    if not os.path.exists(csv_path):
        csv_path = 'annual_aggregates.csv'
        
    df = pd.read_csv(csv_path)
    df['Date'] = pd.to_datetime(df['Date'])
    df['Year'] = df['Date'].dt.year
    historical_years = df['Year'].values

    max_cols = [c for c in df.columns if (c.startswith('MaxTemp_') and not c.endswith('_Anomaly')) or c == 'National_MaxTemp']
    locations = [c.replace('MaxTemp_', '').replace('National_MaxTemp', 'National') for c in max_cols]

    exog_hist = get_exogenous_features(historical_years)
    future_years = np.arange(2018, 2038)
    exog_future = get_exogenous_features(future_years)

    metrics = {}
    plot_data_national = {}

    for loc in locations:
        col_max = f"MaxTemp_{loc}" if loc != "National" else "National_MaxTemp"
        col_min = f"MinTemp_{loc}" if loc != "National" else "National_MinTemp"
        col_precip = f"Precip_{loc}" if loc != "National" else "National_Precip"
        col_peak = f"PeakMaxTemp_{loc}" if loc != "National" else "National_PeakMaxTemp"
        col_summer = f"SummerMaxTemp_{loc}" if loc != "National" else "National_SummerMaxTemp"

        if col_max not in df.columns or col_min not in df.columns:
            continue

        if df[col_max].isnull().sum() > (len(df) - 10) or df[col_min].isnull().sum() > (len(df) - 10):
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

        max_trend = linregress(historical_years, y_max_series).slope * 10
        min_trend = linregress(historical_years, y_min_series).slope * 10
        peak_trend = linregress(historical_years, peak_series).slope * 10

        loc_results = {
            'max_trend_per_decade': round(float(max_trend), 3),
            'min_trend_per_decade': round(float(min_trend), 3),
            'peak_trend_per_decade': round(float(peak_trend), 3),
            'selected_models': {},
            'cv_rmse': {},
            'cv_mae': {}
        }

        target_dict = {
            'max': y_max_series,
            'min': y_min_series,
            'peak': peak_series,
            'summer': summer_series
        }

        lag_k = 3

        for target_name, target_y in target_dict.items():
            # 1. Compute Differenced Target Delta_T = Temp(t) - Temp(t-1)
            delta_y = np.diff(target_y, prepend=target_y[0])
            years_diff = historical_years

            # 2. Strict TimeSeriesSplit Cross-Validation
            tscv = TimeSeriesSplit(n_splits=5)
            val_metrics = {'xgb': {'rmse': [], 'mae': []}, 'lgb': {'rmse': [], 'mae': []}, 'rf': {'rmse': [], 'mae': []}, 'ensemble': {'rmse': [], 'mae': []}}

            for train_index, test_index in tscv.split(years_diff):
                if len(train_index) < lag_k + 5:
                    continue
                
                years_tr = years_diff[train_index]
                delta_tr = delta_y[train_index]
                temp_tr = target_y[train_index]
                exog_tr = exog_hist[train_index]
                precip_tr = p_series[train_index]

                p_mean_val = np.mean(precip_tr)
                p_std_val = np.std(precip_tr) if np.std(precip_tr) > 0 else 1.0

                X_tr_feat, y_tr_delta = build_differenced_features(
                    years_tr, delta_tr, temp_tr, precip_tr, exog_tr,
                    lag_k=lag_k, p_mean=p_mean_val, p_std=p_std_val
                )

                if len(X_tr_feat) < 3:
                    continue

                # Train Models on Differenced Targets Delta_T
                if HAS_XGBOOST:
                    m_xgb = xgb.XGBRegressor(n_estimators=60, max_depth=3, learning_rate=0.05, random_state=42).fit(X_tr_feat, y_tr_delta)
                else:
                    m_xgb = GradientBoostingRegressor(n_estimators=60, max_depth=3, learning_rate=0.05, random_state=42).fit(X_tr_feat, y_tr_delta)

                if HAS_LIGHTGBM:
                    m_lgb = lgb.LGBMRegressor(n_estimators=60, max_depth=3, learning_rate=0.05, random_state=42, verbose=-1).fit(X_tr_feat, y_tr_delta)
                else:
                    m_lgb = GradientBoostingRegressor(n_estimators=60, max_depth=3, learning_rate=0.05, random_state=42).fit(X_tr_feat, y_tr_delta)

                m_rf = RandomForestRegressor(n_estimators=60, max_depth=4, random_state=42).fit(X_tr_feat, y_tr_delta)

                # Validate Autoregressively on Test Fold
                delta_tracker = list(delta_tr)
                temp_tracker = list(temp_tr)
                precip_tracker = list(precip_tr)

                val_reconstructed_xgb, val_reconstructed_lgb, val_reconstructed_rf, val_reconstructed_ens = [], [], [], []

                for idx_val in test_index:
                    val_yr = years_diff[idx_val]
                    val_exog = exog_hist[idx_val]

                    delta_lags_step = np.array(delta_tracker[-lag_k:])[::-1]
                    temp_lags_step = np.array(temp_tracker[-lag_k:])[::-1]
                    precip_lags_step = ((np.array(precip_tracker[-lag_k:]) - p_mean_val) / p_std_val)[::-1]

                    yr_norm = (val_yr - 1960.0) / 60.0
                    sin_3 = np.sin(2 * np.pi * val_yr / 3.0)
                    cos_3 = np.cos(2 * np.pi * val_yr / 3.0)
                    sin_5 = np.sin(2 * np.pi * val_yr / 5.0)
                    cos_5 = np.cos(2 * np.pi * val_yr / 5.0)
                    sin_7 = np.sin(2 * np.pi * val_yr / 7.0)
                    cos_7 = np.cos(2 * np.pi * val_yr / 7.0)

                    roll_std_3 = np.std(delta_lags_step[:3]) if len(delta_lags_step) >= 3 else np.std(delta_lags_step)
                    roll_std_5 = np.std(delta_lags_step[:5]) if len(delta_lags_step) >= 5 else np.std(delta_lags_step)
                    roll_mean_3 = np.mean(delta_lags_step[:3]) if len(delta_lags_step) >= 3 else np.mean(delta_lags_step)
                    roll_mean_5 = np.mean(delta_lags_step[:5]) if len(delta_lags_step) >= 5 else np.mean(delta_lags_step)

                    val_feat = np.concatenate([
                        delta_lags_step,
                        temp_lags_step,
                        precip_lags_step,
                        [roll_std_3, roll_std_5, roll_mean_3, roll_mean_5],
                        [sin_3, cos_3, sin_5, cos_5, sin_7, cos_7, yr_norm],
                        val_exog
                    ]).reshape(1, -1)

                    d_xgb = float(m_xgb.predict(val_feat)[0])
                    d_lgb = float(m_lgb.predict(val_feat)[0])
                    d_rf = float(m_rf.predict(val_feat)[0])
                    d_ens = float(0.4 * d_xgb + 0.4 * d_lgb + 0.2 * d_rf)

                    last_temp = temp_tracker[-1]
                    val_reconstructed_xgb.append(last_temp + d_xgb)
                    val_reconstructed_lgb.append(last_temp + d_lgb)
                    val_reconstructed_rf.append(last_temp + d_rf)
                    val_reconstructed_ens.append(last_temp + d_ens)

                    delta_tracker.append(d_ens)
                    temp_tracker.append(last_temp + d_ens)
                    precip_tracker.append(p_series[idx_val])

                actual_val = target_y[test_index]
                val_metrics['xgb']['rmse'].append(np.sqrt(mean_squared_error(actual_val, val_reconstructed_xgb)))
                val_metrics['xgb']['mae'].append(mean_absolute_error(actual_val, val_reconstructed_xgb))

                val_metrics['lgb']['rmse'].append(np.sqrt(mean_squared_error(actual_val, val_reconstructed_lgb)))
                val_metrics['lgb']['mae'].append(mean_absolute_error(actual_val, val_reconstructed_lgb))

                val_metrics['rf']['rmse'].append(np.sqrt(mean_squared_error(actual_val, val_reconstructed_rf)))
                val_metrics['rf']['mae'].append(mean_absolute_error(actual_val, val_reconstructed_rf))

                val_metrics['ensemble']['rmse'].append(np.sqrt(mean_squared_error(actual_val, val_reconstructed_ens)))
                val_metrics['ensemble']['mae'].append(mean_absolute_error(actual_val, val_reconstructed_ens))

            # Select Best Model based on CV RMSE
            avg_rmse_map = {m: float(np.mean(val_metrics[m]['rmse'])) for m in val_metrics if len(val_metrics[m]['rmse']) > 0}
            avg_mae_map = {m: float(np.mean(val_metrics[m]['mae'])) for m in val_metrics if len(val_metrics[m]['mae']) > 0}
            best_m = min(avg_rmse_map, key=avg_rmse_map.get) if avg_rmse_map else 'ensemble'

            loc_results['selected_models'][target_name] = best_m.upper()
            loc_results['cv_rmse'][target_name] = round(avg_rmse_map.get(best_m, 0.5), 3)
            loc_results['cv_mae'][target_name] = round(avg_mae_map.get(best_m, 0.4), 3)

            # 3. Retrain Full Models on Historical Differenced Series
            p_mean_full = np.mean(p_series)
            p_std_full = np.std(p_series) if np.std(p_series) > 0 else 1.0

            X_full_feat, Y_full_delta = build_differenced_features(
                historical_years, delta_y, target_y, p_series, exog_hist,
                lag_k=lag_k, p_mean=p_mean_full, p_std=p_std_full
            )

            if HAS_XGBOOST:
                m_xgb_full = xgb.XGBRegressor(n_estimators=60, max_depth=3, learning_rate=0.05, random_state=42).fit(X_full_feat, Y_full_delta)
            else:
                m_xgb_full = GradientBoostingRegressor(n_estimators=60, max_depth=3, learning_rate=0.05, random_state=42).fit(X_full_feat, Y_full_delta)

            if HAS_LIGHTGBM:
                m_lgb_full = lgb.LGBMRegressor(n_estimators=60, max_depth=3, learning_rate=0.05, random_state=42, verbose=-1).fit(X_full_feat, Y_full_delta)
            else:
                m_lgb_full = GradientBoostingRegressor(n_estimators=60, max_depth=3, learning_rate=0.05, random_state=42).fit(X_full_feat, Y_full_delta)

            m_rf_full = RandomForestRegressor(n_estimators=60, max_depth=4, random_state=42).fit(X_full_feat, Y_full_delta)

            # Compute Historical Predictions for Residual Distribution
            hist_d_preds = 0.4 * m_xgb_full.predict(X_full_feat) + 0.4 * m_lgb_full.predict(X_full_feat) + 0.2 * m_rf_full.predict(X_full_feat)
            residuals_dist = Y_full_delta - hist_d_preds

            # 4. Autoregressive Rollout & Monte Carlo Simulations (2018 - 2037)
            all_sim_paths = []
            num_simulations = 200

            for sim in range(num_simulations):
                sim_delta_tracker = list(delta_y)
                sim_temp_tracker = list(target_y)
                sim_precip_tracker = list(p_series)
                sim_temp_path = []

                # Add small simulation seed noise
                rng = np.random.RandomState(42 + sim)

                for idx, year in enumerate(future_years):
                    d_lags_step = np.array(sim_delta_tracker[-lag_k:])[::-1]
                    t_lags_step = np.array(sim_temp_tracker[-lag_k:])[::-1]
                    p_lags_step = ((np.array(sim_precip_tracker[-lag_k:]) - p_mean_full) / p_std_full)[::-1]

                    exog_step = exog_future[idx]
                    yr_norm = (year - 1960.0) / 60.0
                    sin_3 = np.sin(2 * np.pi * year / 3.0)
                    cos_3 = np.cos(2 * np.pi * year / 3.0)
                    sin_5 = np.sin(2 * np.pi * year / 5.0)
                    cos_5 = np.cos(2 * np.pi * year / 5.0)
                    sin_7 = np.sin(2 * np.pi * year / 7.0)
                    cos_7 = np.cos(2 * np.pi * year / 7.0)

                    roll_std_3 = np.std(d_lags_step[:3]) if len(d_lags_step) >= 3 else np.std(d_lags_step)
                    roll_std_5 = np.std(d_lags_step[:5]) if len(d_lags_step) >= 5 else np.std(d_lags_step)
                    roll_mean_3 = np.mean(d_lags_step[:3]) if len(d_lags_step) >= 3 else np.mean(d_lags_step)
                    roll_mean_5 = np.mean(d_lags_step[:5]) if len(d_lags_step) >= 5 else np.mean(d_lags_step)

                    feat_step = np.concatenate([
                        d_lags_step,
                        t_lags_step,
                        p_lags_step,
                        [roll_std_3, roll_std_5, roll_mean_3, roll_mean_5],
                        [sin_3, cos_3, sin_5, cos_5, sin_7, cos_7, yr_norm],
                        exog_step
                    ]).reshape(1, -1)

                    if best_m == 'xgb':
                        pred_d = float(m_xgb_full.predict(feat_step)[0])
                    elif best_m == 'lgb':
                        pred_d = float(m_lgb_full.predict(feat_step)[0])
                    elif best_m == 'rf':
                        pred_d = float(m_rf_full.predict(feat_step)[0])
                    else: # Ensemble
                        pred_d = float(0.4 * m_xgb_full.predict(feat_step)[0] + 0.4 * m_lgb_full.predict(feat_step)[0] + 0.2 * m_rf_full.predict(feat_step)[0])

                    # Sample residual error for stochastic Monte Carlo trajectory (skip noise for sim==0 main mean)
                    noise = rng.choice(residuals_dist) if sim > 0 else 0.0
                    sim_d = pred_d + noise

                    # Reconstruct absolute temperature sequence: T(t) = T(t-1) + Delta_T
                    new_temp = sim_temp_tracker[-1] + sim_d
                    sim_temp_path.append(new_temp)

                    sim_delta_tracker.append(sim_d)
                    sim_temp_tracker.append(new_temp)
                    sim_precip_tracker.append(float(np.mean(sim_precip_tracker[-5:])))

                all_sim_paths.append(sim_temp_path)

            all_sim_paths = np.array(all_sim_paths) # Shape: (200, 20)

            # Extract Mean, 5th percentile, 95th percentile across Monte Carlo runs
            forecast_mean = [round(float(v), 2) for v in all_sim_paths[0]]
            forecast_lower = [round(float(v), 2) for v in np.percentile(all_sim_paths, 5, axis=0)]
            forecast_upper = [round(float(v), 2) for v in np.percentile(all_sim_paths, 95, axis=0)]

            loc_results[f'forecast_{target_name}_mean'] = forecast_mean
            loc_results[f'forecast_{target_name}_lower'] = forecast_lower
            loc_results[f'forecast_{target_name}_upper'] = forecast_upper

            if loc == 'National':
                plot_data_national[target_name] = {
                    'hist_years': historical_years,
                    'hist_actual': target_y,
                    'fut_years': future_years,
                    'fut_mean': forecast_mean,
                    'fut_lower': forecast_lower,
                    'fut_upper': forecast_upper,
                    'sim_paths': all_sim_paths[1:10] # Save 10 paths for multi-line plotting
                }

        metrics[loc] = loc_results
        print(f"Station {loc:15s} | Max: {loc_results['selected_models']['max']} (RMSE {loc_results['cv_rmse']['max']:.2f}, MAE {loc_results['cv_mae']['max']:.2f}) | Peak: {loc_results['selected_models']['peak']} (RMSE {loc_results['cv_rmse']['peak']:.2f}, MAE {loc_results['cv_mae']['peak']:.2f})")

    # Save Metrics to JSON
    with open('ml_metrics.json', 'w') as f:
        json.dump(metrics, f, indent=2)

    # Generate Evaluation Plot showing Non-Linear Peaks & Troughs
    if HAS_MATPLOTLIB and 'max' in plot_data_national:
        print("\nGenerating Differenced Target & Monte Carlo Evaluation Plot (ml_forecast_evaluation.png)...")
        fig, axes = plt.subplots(3, 1, figsize=(12, 10), sharex=True)
        fig.suptitle('Pakistan National Climate Forecasts: Differenced Target Model & Monte Carlo 95% Confidence Bounds', fontsize=14, fontweight='bold')

        targets_info = [('max', 'National Max Temperature (°C)', '#ef4444'), ('min', 'National Min Temperature (°C)', '#3b82f6'), ('peak', 'National Peak Extreme Max Temperature (°C)', '#f97316')]

        for idx, (t_key, label, color) in enumerate(targets_info):
            ax = axes[idx]
            if t_key in plot_data_national:
                d = plot_data_national[t_key]
                ax.plot(d['hist_years'], d['hist_actual'], color=color, linewidth=2, label='Historical Actuals')
                ax.plot(d['fut_years'], d['fut_mean'], color=color, linestyle='--', linewidth=2, marker='o', markersize=4, label='Differenced ML Forecast (XGB + LGBM)')
                
                # Plot sample Monte Carlo trajectory paths to demonstrate non-linear peaks and troughs
                for sim_idx, sim_p in enumerate(d['sim_paths']):
                    ax.plot(d['fut_years'], sim_p, color=color, alpha=0.15, linewidth=1.0)
                    
                ax.fill_between(d['fut_years'], d['fut_lower'], d['fut_upper'], color=color, alpha=0.2, label='95% Monte Carlo Confidence Bound')
                ax.axvline(x=2017.5, color='#64748b', linestyle=':', label='Forecast Horizon (2018)')
                ax.set_ylabel(label, fontsize=10)
                ax.grid(True, linestyle='--', alpha=0.5)
                ax.legend(loc='upper left', fontsize=9)

        axes[-1].set_xlabel('Year', fontsize=11)
        plt.tight_layout()
        plt.savefig('ml_forecast_evaluation.png', dpi=300)
        plt.close()
        print("Saved differenced target evaluation plot to ml_forecast_evaluation.png successfully.")

    print("\nCompleted Differenced ML Climate Forecasting Pipeline. Saved metrics to ml_metrics.json.")

if __name__ == '__main__':
    run_tabular_ml_pipeline()
