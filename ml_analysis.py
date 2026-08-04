import os
import sys
import json
import numpy as np
import pandas as pd
from scipy.stats import linregress
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor

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

def build_lag_features_single(years, target_residual, precip_series, exog_features, lag_k=5, p_mean=None, p_std=None):
    X, y = [], []
    if p_mean is None:
        p_mean = np.mean(precip_series)
    if p_std is None:
        p_std = np.std(precip_series) if np.std(precip_series) > 0 else 1.0
        
    for i in range(lag_k, len(years)):
        target_lags = target_residual[i-lag_k:i][::-1]
        precip_lags = (precip_series[i-lag_k:i] - p_mean) / p_std
        precip_lags = precip_lags[::-1]
        
        ex = exog_features[i]
        
        # Enhanced Feature Engineering (No Data Leakage)
        target_roll_mean_3 = np.mean(target_lags[:3])
        target_diff_1 = target_lags[0] - target_lags[1]
        co2_oni_interaction = ex[0] * ex[2]
        
        feat = np.concatenate([
            target_lags, 
            precip_lags, 
            [target_roll_mean_3, target_diff_1, co2_oni_interaction],
            ex
        ])
        X.append(feat)
        y.append(target_residual[i])
    return np.array(X), np.array(y)

def run_tabular_ml_pipeline():
    print("=== Starting Production-Grade Ensemble Climate Forecasting Engine (Optimized) ===")
    
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
            'cv_mse': {}
        }

        target_dict = {
            'max': y_max_series,
            'min': y_min_series,
            'peak': peak_series,
            'summer': summer_series
        }

        lag_k = 5

        for target_name, target_y in target_dict.items():
            # 1. Fit Trend Model on full history (for baseline trend prediction)
            trend_model = Ridge(alpha=10.0)
            X_trend_hist = np.column_stack([historical_years, exog_hist[:, 0]])
            trend_model.fit(X_trend_hist, target_y)
            trend_hist_pred = trend_model.predict(X_trend_hist)
            y_residual = target_y - trend_hist_pred

            # 2. Walk-Forward Cross-Validation over the last 5 historical years (2013 to 2017)
            val_years = np.arange(2013, 2018)
            val_metrics = {'ridge': [], 'rf': [], 'gb': [], 'ensemble': []}

            for val_yr in val_years:
                train_idx = historical_years < val_yr
                X_tr_trend = X_trend_hist[train_idx]
                y_tr_raw = target_y[train_idx]
                
                # Fit trend on train set
                t_model = Ridge(alpha=10.0)
                t_model.fit(X_tr_trend, y_tr_raw)
                tr_trend_pred = t_model.predict(X_tr_trend)
                tr_residual = y_tr_raw - tr_trend_pred
                
                # Dynamic scaling parameters strictly from training fold (No Leakage)
                p_mean_val = np.mean(p_series[train_idx])
                p_std_val = np.std(p_series[train_idx]) if np.std(p_series[train_idx]) > 0 else 1.0
                
                # Build lag features for train set
                X_lag_tr, y_lag_tr = build_lag_features_single(
                    historical_years[train_idx], tr_residual, p_series[train_idx], exog_hist[train_idx],
                    lag_k=lag_k, p_mean=p_mean_val, p_std=p_std_val
                )
                
                # Prepare lag features for the validation year
                val_trend_pred = t_model.predict(X_trend_hist[historical_years == val_yr])
                val_actual = target_y[historical_years == val_yr][0]
                
                # Prepare features for val year (using preceding residuals and precip)
                val_idx = np.where(historical_years == val_yr)[0][0]
                val_target_lags = target_y[val_idx-lag_k:val_idx] - t_model.predict(X_trend_hist[val_idx-lag_k:val_idx])
                val_target_lags = val_target_lags[::-1]
                
                val_precip_lags = (p_series[val_idx-lag_k:val_idx] - p_mean_val) / p_std_val
                val_precip_lags = val_precip_lags[::-1]
                
                val_exog = exog_hist[val_idx]
                
                # Engineered validation point features
                val_target_roll_mean_3 = np.mean(val_target_lags[:3])
                val_target_diff_1 = val_target_lags[0] - val_target_lags[1]
                val_co2_oni_interaction = val_exog[0] * val_exog[2]
                
                val_feat = np.concatenate([
                    val_target_lags, 
                    val_precip_lags, 
                    [val_target_roll_mean_3, val_target_diff_1, val_co2_oni_interaction],
                    val_exog
                ]).reshape(1, -1)
                
                # Fit individual models once per fold
                model_ridge = Ridge(alpha=5.0).fit(X_lag_tr, y_lag_tr)
                model_rf = RandomForestRegressor(n_estimators=30, max_depth=5, min_samples_split=4, random_state=42).fit(X_lag_tr, y_lag_tr)
                model_gb = GradientBoostingRegressor(n_estimators=30, max_depth=3, learning_rate=0.05, random_state=42).fit(X_lag_tr, y_lag_tr)
                
                # Predict
                pred_ridge = model_ridge.predict(val_feat)[0]
                pred_rf = model_rf.predict(val_feat)[0]
                pred_gb = model_gb.predict(val_feat)[0]
                pred_ens = 0.5 * (pred_rf + pred_gb)
                
                val_metrics['ridge'].append((val_trend_pred[0] + pred_ridge - val_actual) ** 2)
                val_metrics['rf'].append((val_trend_pred[0] + pred_rf - val_actual) ** 2)
                val_metrics['gb'].append((val_trend_pred[0] + pred_gb - val_actual) ** 2)
                val_metrics['ensemble'].append((val_trend_pred[0] + pred_ens - val_actual) ** 2)

            # Choose the model with lowest MSE over validation window
            avg_mse = {m_name: float(np.mean(errors)) for m_name, errors in val_metrics.items()}
            best_model_name = min(avg_mse, key=avg_mse.get)
            
            loc_results['selected_models'][target_name] = best_model_name.upper()
            loc_results['cv_mse'][target_name] = round(avg_mse[best_model_name], 4)
            
            # 3. Retrain Best Model on full history (with optimized hyperparameters)
            p_mean_full = np.mean(p_series)
            p_std_full = np.std(p_series) if np.std(p_series) > 0 else 1.0
            
            X_res, Y_res = build_lag_features_single(
                historical_years, y_residual, p_series, exog_hist,
                lag_k=lag_k, p_mean=p_mean_full, p_std=p_std_full
            )
            
            if best_model_name == 'ridge':
                model_full = Ridge(alpha=5.0).fit(X_res, Y_res)
            elif best_model_name == 'rf':
                model_full = RandomForestRegressor(n_estimators=50, max_depth=5, min_samples_split=4, random_state=42).fit(X_res, Y_res)
            elif best_model_name == 'gb':
                model_full = GradientBoostingRegressor(n_estimators=50, max_depth=3, learning_rate=0.05, random_state=42).fit(X_res, Y_res)
            else: # Ensemble
                rf = RandomForestRegressor(n_estimators=50, max_depth=5, min_samples_split=4, random_state=42).fit(X_res, Y_res)
                gb = GradientBoostingRegressor(n_estimators=50, max_depth=3, learning_rate=0.05, random_state=42).fit(X_res, Y_res)

            # Fit Quantile Regression Models on full history for intervals (No Gaussian Heuristics)
            model_lower = GradientBoostingRegressor(
                loss='quantile', alpha=0.05, n_estimators=60, max_depth=3, learning_rate=0.05, random_state=42
            ).fit(X_res, Y_res)
            
            model_upper = GradientBoostingRegressor(
                loss='quantile', alpha=0.95, n_estimators=60, max_depth=3, learning_rate=0.05, random_state=42
            ).fit(X_res, Y_res)

            # Autoregressive Rollout (2018 - 2037)
            X_trend_future = np.column_stack([future_years, exog_future[:, 0]])
            trend_future_pred = trend_model.predict(X_trend_future)

            forecast_mean, forecast_lower, forecast_upper = [], [], []
            res_hist_tracker = list(y_residual)
            p_hist_tracker = list(p_series)

            for idx, year in enumerate(future_years):
                target_lags_step = np.array(res_hist_tracker[-lag_k:])[::-1]
                
                precip_lags_step = ((np.array(p_hist_tracker[-lag_k:]) - p_mean_full) / p_std_full)[::-1]
                
                exog_step = exog_future[idx]
                
                # Rollout step engineered features
                target_roll_mean_3 = np.mean(target_lags_step[:3])
                target_diff_1 = target_lags_step[0] - target_lags_step[1]
                co2_oni_interaction = exog_step[0] * exog_step[2]
                
                feat_step = np.concatenate([
                    target_lags_step, 
                    precip_lags_step, 
                    [target_roll_mean_3, target_diff_1, co2_oni_interaction],
                    exog_step
                ]).reshape(1, -1)

                if best_model_name == 'ensemble':
                    r_m = float(0.5 * (rf.predict(feat_step)[0] + gb.predict(feat_step)[0]))
                else:
                    r_m = float(model_full.predict(feat_step)[0])

                r_l = float(model_lower.predict(feat_step)[0])
                r_u = float(model_upper.predict(feat_step)[0])

                m = trend_future_pred[idx] + r_m
                l = trend_future_pred[idx] + r_l
                u = trend_future_pred[idx] + r_u

                # Enforce physical sanity constraints
                l = min(l, m - 0.15)
                u = max(u, m + 0.15)

                forecast_mean.append(round(m, 2))
                forecast_lower.append(round(l, 2))
                forecast_upper.append(round(u, 2))

                res_hist_tracker.append(r_m)
                p_hist_tracker.append(float(np.mean(p_hist_tracker[-5:])))

            loc_results[f'forecast_{target_name}_mean'] = forecast_mean
            loc_results[f'forecast_{target_name}_lower'] = forecast_lower
            loc_results[f'forecast_{target_name}_upper'] = forecast_upper

        metrics[loc] = loc_results
        print(f"Station {loc:15s} | Max: {loc_results['selected_models']['max']} (RMSE {np.sqrt(loc_results['cv_mse']['max']):.3f}) | Min: {loc_results['selected_models']['min']} (RMSE {np.sqrt(loc_results['cv_mse']['min']):.3f})")

    with open('ml_metrics.json', 'w') as f:
        json.dump(metrics, f, indent=2)

    print("\nCompleted Production-Grade Ensemble Climate Forecasting. Saved to ml_metrics.json.")

if __name__ == '__main__':
    run_tabular_ml_pipeline()
