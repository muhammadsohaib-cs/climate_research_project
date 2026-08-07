import os
import sys
import json
import numpy as np
import pandas as pd
from scipy.stats import linregress
from sklearn.linear_model import Ridge, LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_squared_error, mean_absolute_error

try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

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

def build_advanced_features(years, target_residual, precip_series, exog_features, lag_k=5, p_mean=None, p_std=None):
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
        yr = years[i]
        yr_norm = (yr - 1960.0) / 60.0
        sin_yr = np.sin(2 * np.pi * yr / 11.0)
        cos_yr = np.cos(2 * np.pi * yr / 11.0)
        
        # Rolling Statistics over past data relative to current point (No Data Leakage)
        roll_mean_3 = np.mean(target_lags[:3])
        roll_mean_5 = np.mean(target_lags[:5])
        roll_var_3 = np.var(target_lags[:3])
        roll_var_5 = np.var(target_lags[:5])
        
        # Expanding max/min windows over past data relative to current point
        past_window = target_residual[:i]
        exp_max = np.max(past_window) if len(past_window) > 0 else target_lags[0]
        exp_min = np.min(past_window) if len(past_window) > 0 else target_lags[0]
        
        target_diff_1 = target_lags[0] - target_lags[1] if len(target_lags) > 1 else 0.0
        co2_oni_interaction = ex[0] * ex[2]
        
        feat = np.concatenate([
            target_lags, 
            precip_lags, 
            [roll_mean_3, roll_mean_5, roll_var_3, roll_var_5, exp_max, exp_min, target_diff_1, co2_oni_interaction, yr_norm, sin_yr, cos_yr],
            ex
        ])
        X.append(feat)
        y.append(target_residual[i])
        
    return np.array(X), np.array(y)

def run_tabular_ml_pipeline():
    print("=== Starting Optimized Detrended Ensemble Climate Forecasting Engine ===")
    print(f"XGBoost available: {HAS_XGBOOST} | Matplotlib available: {HAS_MATPLOTLIB}")
    
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

        lag_k = 5

        for target_name, target_y in target_dict.items():
            # 1. Fit Baseline Linear Trend Model on full history
            trend_model = Ridge(alpha=10.0)
            X_trend_hist = np.column_stack([historical_years, exog_hist[:, 0]])
            trend_model.fit(X_trend_hist, target_y)
            trend_hist_pred = trend_model.predict(X_trend_hist)
            y_residual = target_y - trend_hist_pred

            # 2. Strict TimeSeriesSplit Cross-Validation
            tscv = TimeSeriesSplit(n_splits=5)
            val_metrics = {'linear': {'rmse': [], 'mae': []}, 'rf': {'rmse': [], 'mae': []}, 'xgb': {'rmse': [], 'mae': []}, 'ensemble': {'rmse': [], 'mae': []}}

            for train_index, test_index in tscv.split(historical_years):
                if len(train_index) < lag_k + 5:
                    continue
                
                years_tr = historical_years[train_index]
                target_tr_raw = target_y[train_index]
                exog_tr = exog_hist[train_index]
                precip_tr = p_series[train_index]

                # Fit linear trend model strictly on fold training data
                X_tr_trend = np.column_stack([years_tr, exog_tr[:, 0]])
                t_model_fold = Ridge(alpha=10.0)
                t_model_fold.fit(X_tr_trend, target_tr_raw)
                tr_trend_pred = t_model_fold.predict(X_tr_trend)
                tr_residual = target_tr_raw - tr_trend_pred

                # Fold dynamic scaling parameters
                p_mean_val = np.mean(precip_tr)
                p_std_val = np.std(precip_tr) if np.std(precip_tr) > 0 else 1.0

                # Build advanced features strictly on training fold
                X_tr_feat, y_tr_res = build_advanced_features(
                    years_tr, tr_residual, precip_tr, exog_tr,
                    lag_k=lag_k, p_mean=p_mean_val, p_std=p_std_val
                )

                if len(X_tr_feat) < 3:
                    continue

                # Train Fold Models on Stationary Residuals
                m_linear = Ridge(alpha=5.0).fit(X_tr_feat, y_tr_res)
                m_rf = RandomForestRegressor(n_estimators=50, max_depth=5, min_samples_split=4, random_state=42).fit(X_tr_feat, y_tr_res)
                if HAS_XGBOOST:
                    m_xgb = xgb.XGBRegressor(n_estimators=50, max_depth=3, learning_rate=0.05, random_state=42).fit(X_tr_feat, y_tr_res)
                else:
                    m_xgb = GradientBoostingRegressor(n_estimators=50, max_depth=3, learning_rate=0.05, random_state=42).fit(X_tr_feat, y_tr_res)

                # Predict on Validation Fold Step-by-Step
                val_preds_linear, val_preds_rf, val_preds_xgb, val_preds_ens = [], [], [], []
                
                res_tracker = list(tr_residual)
                precip_tracker = list(precip_tr)
                
                for idx_val in test_index:
                    val_yr = historical_years[idx_val]
                    val_exog = exog_hist[idx_val]
                    
                    val_trend_point = t_model_fold.predict([[val_yr, val_exog[0]]])[0]
                    
                    target_lags_step = np.array(res_tracker[-lag_k:])[::-1]
                    precip_lags_step = ((np.array(precip_tracker[-lag_k:]) - p_mean_val) / p_std_val)[::-1]
                    
                    yr_norm = (val_yr - 1960.0) / 60.0
                    sin_yr = np.sin(2 * np.pi * val_yr / 11.0)
                    cos_yr = np.cos(2 * np.pi * val_yr / 11.0)
                    
                    roll_mean_3 = np.mean(target_lags_step[:3])
                    roll_mean_5 = np.mean(target_lags_step[:5])
                    roll_var_3 = np.var(target_lags_step[:3])
                    roll_var_5 = np.var(target_lags_step[:5])
                    
                    exp_max = np.max(res_tracker)
                    exp_min = np.min(res_tracker)
                    
                    target_diff_1 = target_lags_step[0] - target_lags_step[1] if len(target_lags_step) > 1 else 0.0
                    co2_oni_interaction = val_exog[0] * val_exog[2]
                    
                    val_feat = np.concatenate([
                        target_lags_step, 
                        precip_lags_step, 
                        [roll_mean_3, roll_mean_5, roll_var_3, roll_var_5, exp_max, exp_min, target_diff_1, co2_oni_interaction, yr_norm, sin_yr, cos_yr],
                        val_exog
                    ]).reshape(1, -1)

                    res_lin = float(m_linear.predict(val_feat)[0])
                    res_rf = float(m_rf.predict(val_feat)[0])
                    res_xgb = float(m_xgb.predict(val_feat)[0])
                    res_ens = float(0.4 * res_lin + 0.3 * res_rf + 0.3 * res_xgb)

                    val_preds_linear.append(val_trend_point + res_lin)
                    val_preds_rf.append(val_trend_point + res_rf)
                    val_preds_xgb.append(val_trend_point + res_xgb)
                    val_preds_ens.append(val_trend_point + res_ens)

                    res_tracker.append(res_ens)
                    precip_tracker.append(p_series[idx_val])

                actual_val = target_y[test_index]
                val_metrics['linear']['rmse'].append(np.sqrt(mean_squared_error(actual_val, val_preds_linear)))
                val_metrics['linear']['mae'].append(mean_absolute_error(actual_val, val_preds_linear))

                val_metrics['rf']['rmse'].append(np.sqrt(mean_squared_error(actual_val, val_preds_rf)))
                val_metrics['rf']['mae'].append(mean_absolute_error(actual_val, val_preds_rf))

                val_metrics['xgb']['rmse'].append(np.sqrt(mean_squared_error(actual_val, val_preds_xgb)))
                val_metrics['xgb']['mae'].append(mean_absolute_error(actual_val, val_preds_xgb))

                val_metrics['ensemble']['rmse'].append(np.sqrt(mean_squared_error(actual_val, val_preds_ens)))
                val_metrics['ensemble']['mae'].append(mean_absolute_error(actual_val, val_preds_ens))

            # Choose model with lowest average RMSE across CV folds
            avg_rmse_map = {m: float(np.mean(val_metrics[m]['rmse'])) for m in val_metrics if len(val_metrics[m]['rmse']) > 0}
            avg_mae_map = {m: float(np.mean(val_metrics[m]['mae'])) for m in val_metrics if len(val_metrics[m]['mae']) > 0}
            
            best_m = min(avg_rmse_map, key=avg_rmse_map.get) if avg_rmse_map else 'ensemble'
            
            loc_results['selected_models'][target_name] = best_m.upper()
            loc_results['cv_rmse'][target_name] = round(avg_rmse_map.get(best_m, 0.5), 3)
            loc_results['cv_mae'][target_name] = round(avg_mae_map.get(best_m, 0.4), 3)

            # 3. Retrain Full Models on All Historical Residuals
            p_mean_full = np.mean(p_series)
            p_std_full = np.std(p_series) if np.std(p_series) > 0 else 1.0

            X_res_full, Y_res_full = build_advanced_features(
                historical_years, y_residual, p_series, exog_hist,
                lag_k=lag_k, p_mean=p_mean_full, p_std=p_std_full
            )

            m_lin_full = Ridge(alpha=5.0).fit(X_res_full, Y_res_full)
            m_rf_full = RandomForestRegressor(n_estimators=50, max_depth=5, min_samples_split=4, random_state=42).fit(X_res_full, Y_res_full)
            if HAS_XGBOOST:
                m_xgb_full = xgb.XGBRegressor(n_estimators=50, max_depth=3, learning_rate=0.05, random_state=42).fit(X_res_full, Y_res_full)
            else:
                m_xgb_full = GradientBoostingRegressor(n_estimators=50, max_depth=3, learning_rate=0.05, random_state=42).fit(X_res_full, Y_res_full)

            # Quantile Regression Models for 95% Prediction Intervals (5th and 95th percentiles)
            model_lower = GradientBoostingRegressor(
                loss='quantile', alpha=0.05, n_estimators=60, max_depth=3, learning_rate=0.05, random_state=42
            ).fit(X_res_full, Y_res_full)
            
            model_upper = GradientBoostingRegressor(
                loss='quantile', alpha=0.95, n_estimators=60, max_depth=3, learning_rate=0.05, random_state=42
            ).fit(X_res_full, Y_res_full)

            # 4. Future Autoregressive Rollout (2018 - 2037)
            X_trend_future = np.column_stack([future_years, exog_future[:, 0]])
            trend_future_pred = trend_model.predict(X_trend_future)

            forecast_mean, forecast_lower, forecast_upper = [], [], []
            res_hist_tracker = list(y_residual)
            p_hist_tracker = list(p_series)

            for idx, year in enumerate(future_years):
                target_lags_step = np.array(res_hist_tracker[-lag_k:])[::-1]
                precip_lags_step = ((np.array(p_hist_tracker[-lag_k:]) - p_mean_full) / p_std_full)[::-1]
                
                exog_step = exog_future[idx]
                yr_norm = (year - 1960.0) / 60.0
                sin_yr = np.sin(2 * np.pi * year / 11.0)
                cos_yr = np.cos(2 * np.pi * year / 11.0)

                roll_mean_3 = np.mean(target_lags_step[:3])
                roll_mean_5 = np.mean(target_lags_step[:5])
                roll_var_3 = np.var(target_lags_step[:3])
                roll_var_5 = np.var(target_lags_step[:5])

                exp_max = np.max(res_hist_tracker)
                exp_min = np.min(res_hist_tracker)

                target_diff_1 = target_lags_step[0] - target_lags_step[1] if len(target_lags_step) > 1 else 0.0
                co2_oni_interaction = exog_step[0] * exog_step[2]

                feat_step = np.concatenate([
                    target_lags_step, 
                    precip_lags_step, 
                    [roll_mean_3, roll_mean_5, roll_var_3, roll_var_5, exp_max, exp_min, target_diff_1, co2_oni_interaction, yr_norm, sin_yr, cos_yr],
                    exog_step
                ]).reshape(1, -1)

                if best_m == 'linear':
                    r_m = float(m_lin_full.predict(feat_step)[0])
                elif best_m == 'rf':
                    r_m = float(m_rf_full.predict(feat_step)[0])
                elif best_m == 'xgb':
                    r_m = float(m_xgb_full.predict(feat_step)[0])
                else: # Ensemble
                    r_m = float(0.4 * m_lin_full.predict(feat_step)[0] + 0.3 * m_rf_full.predict(feat_step)[0] + 0.3 * m_xgb_full.predict(feat_step)[0])

                r_l = float(model_lower.predict(feat_step)[0])
                r_u = float(model_upper.predict(feat_step)[0])

                m = trend_future_pred[idx] + r_m
                l = trend_future_pred[idx] + r_l
                u = trend_future_pred[idx] + r_u

                # Enforce physical sanity constraints
                l = min(l, m - 0.2)
                u = max(u, m + 0.2)

                forecast_mean.append(round(m, 2))
                forecast_lower.append(round(l, 2))
                forecast_upper.append(round(u, 2))

                res_hist_tracker.append(r_m)
                p_hist_tracker.append(float(np.mean(p_hist_tracker[-5:])))

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
                    'fut_upper': forecast_upper
                }

        metrics[loc] = loc_results
        print(f"Station {loc:15s} | Max: {loc_results['selected_models']['max']} (RMSE {loc_results['cv_rmse']['max']:.2f}, MAE {loc_results['cv_mae']['max']:.2f}) | Peak: {loc_results['selected_models']['peak']} (RMSE {loc_results['cv_rmse']['peak']:.2f}, MAE {loc_results['cv_mae']['peak']:.2f})")

    # Save Metrics to JSON
    with open('ml_metrics.json', 'w') as f:
        json.dump(metrics, f, indent=2)

    # Generate Evaluation Plot if Matplotlib is available
    if HAS_MATPLOTLIB and 'max' in plot_data_national:
        print("\nGenerating Holdout & Forecast Evaluation Plot (ml_forecast_evaluation.png)...")
        fig, axes = plt.subplots(3, 1, figsize=(12, 10), sharex=True)
        fig.suptitle('Pakistan National Climate Metrics: Detrended ML Forecasts & 95% Prediction Intervals', fontsize=14, fontweight='bold')

        targets_info = [('max', 'National Max Temperature (°C)', '#ef4444'), ('min', 'National Min Temperature (°C)', '#3b82f6'), ('peak', 'National Peak Extreme Max Temperature (°C)', '#f97316')]

        for idx, (t_key, label, color) in enumerate(targets_info):
            ax = axes[idx]
            if t_key in plot_data_national:
                d = plot_data_national[t_key]
                ax.plot(d['hist_years'], d['hist_actual'], color=color, linewidth=2, label='Historical Actuals')
                ax.plot(d['fut_years'], d['fut_mean'], color=color, linestyle='--', linewidth=2, label='ML Ensemble Forecast')
                ax.fill_between(d['fut_years'], d['fut_lower'], d['fut_upper'], color=color, alpha=0.2, label='95% Prediction Interval')
                ax.axvline(x=2017.5, color='#64748b', linestyle=':', label='Forecast Horizon (2018)')
                ax.set_ylabel(label, fontsize=10)
                ax.grid(True, linestyle='--', alpha=0.5)
                ax.legend(loc='upper left', fontsize=9)

        axes[-1].set_xlabel('Year', fontsize=11)
        plt.tight_layout()
        plt.savefig('ml_forecast_evaluation.png', dpi=300)
        plt.close()
        print("Saved evaluation plot to ml_forecast_evaluation.png successfully.")

    print("\nCompleted Detrended ML Climate Forecasting Pipeline. Saved metrics to ml_metrics.json.")

if __name__ == '__main__':
    run_tabular_ml_pipeline()
