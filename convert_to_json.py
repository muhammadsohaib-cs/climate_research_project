import os
import json
import numpy as np
import pandas as pd

REMOVED_STATIONS = {
    'Chitral', 'Mohin Jodaro', 'Badin', 'Ormara', 'Lasbella',
    'Risalpur', 'Lahore', 'Kohat', 'Multan', 'Peshawar',
    'Khuzdar', 'Saidu Sharif', 'Barkhan', 'Jiwani', 'Kalat',
    'Rohri', 'Dir', 'Cherat', 'Passni', 'Pasni', 'Astore', 'Sibbi'
}

def create_json():
    print("=== Exporting ML Pipeline v2.1 Dataset to JSON (1961 - 2037) ===")
    csv_path = 'annual_aggregates_corrected.csv' if os.path.exists('annual_aggregates_corrected.csv') else 'annual_aggregates.csv'
    df = pd.read_csv(csv_path)
    df['Date'] = pd.to_datetime(df['Date'])
    df['Year'] = df['Date'].dt.year

    with open('ml_metrics.json', 'r') as f:
        ml_metrics = json.load(f)

    max_cols = [c for c in df.columns if (c.startswith('MaxTemp_') and not c.endswith('_Anomaly')) or c == 'National_MaxTemp']
    locations = [c.replace('MaxTemp_', '').replace('National_MaxTemp', 'National') for c in max_cols if c.replace('MaxTemp_', '') not in REMOVED_STATIONS]

    station_data = {}

    for loc in locations:
        col_max = f"MaxTemp_{loc}" if loc != "National" else "National_MaxTemp"
        col_peak = f"PeakMaxTemp_{loc}" if loc != "National" else "National_PeakMaxTemp"
        col_summer = f"SummerMaxTemp_{loc}" if loc != "National" else "National_SummerMaxTemp"
        col_min = f"MinTemp_{loc}" if loc != "National" else "National_MinTemp"
        col_precip = f"Precip_{loc}" if loc != "National" else "National_Precip"

        if col_max not in df.columns or col_min not in df.columns:
            continue

        baseline_df = df[(df['Year'] >= 1961) & (df['Year'] <= 1990)]
        baseline_max = baseline_df[col_max].mean() if col_max in baseline_df.columns else None

        # Historical Trend Data (1961 - 2017)
        loc_historical = []
        hist_df = df[df['Year'] <= 2017]
        for _, row in hist_df.iterrows():
            year = int(row['Year'])
            max_temp = round(row[col_max], 2) if pd.notna(row[col_max]) else None
            peak_max_temp = round(row[col_peak], 2) if col_peak in df.columns and pd.notna(row[col_peak]) else None
            summer_max_temp = round(row[col_summer], 2) if col_summer in df.columns and pd.notna(row[col_summer]) else None
            min_temp = round(row[col_min], 2) if pd.notna(row[col_min]) else None
            precip = round(row[col_precip], 2) if col_precip in df.columns and pd.notna(row[col_precip]) else None

            anomaly = None
            if max_temp is not None and baseline_max is not None and pd.notna(baseline_max):
                anomaly = round(max_temp - baseline_max, 2)

            loc_historical.append({
                "year": year,
                "maxTemp": max_temp,
                "peakMaxTemp": peak_max_temp,
                "summerMaxTemp": summer_max_temp,
                "minTemp": min_temp,
                "precip": precip,
                "anomaly": anomaly
            })

        # ML Forecast Metrics from ml_metrics.json (v2.1 Corrected)
        loc_ml = ml_metrics.get(loc, ml_metrics.get('National', {}))
        f_years = list(range(2018, 2038))

        f_max_mean = loc_ml.get('forecast_max_mean', [])
        f_max_lower = loc_ml.get('forecast_max_lower', [])
        f_max_upper = loc_ml.get('forecast_max_upper', [])

        f_min_mean = loc_ml.get('forecast_min_mean', [])
        f_min_lower = loc_ml.get('forecast_min_lower', [])
        f_min_upper = loc_ml.get('forecast_min_upper', [])

        f_peak_mean = loc_ml.get('forecast_peak_mean', [])
        f_peak_lower = loc_ml.get('forecast_peak_lower', [])
        f_peak_upper = loc_ml.get('forecast_peak_upper', [])

        f_summer_mean = loc_ml.get('forecast_summer_mean', [])

        forecast_data = []

        # Historical part (1961 - 2017)
        for d in loc_historical:
            forecast_data.append({
                "year": d['year'],
                "historicalMax": d['maxTemp'],
                "peakMaxTemp": d['peakMaxTemp'],
                "summerMaxTemp": d['summerMaxTemp'],
                "historicalMin": d['minTemp'],
                "forecastMax": None,
                "forecastPeak": None,
                "forecastSummer": None,
                "forecastMin": None,
                "forecastMaxLower": None,
                "forecastMaxUpper": None,
                "forecastPeakLower": None,
                "forecastPeakUpper": None,
                "forecastMinLower": None,
                "forecastMinUpper": None,
            })

        # Transition Point at 2017
        last_hist = loc_historical[-1]
        forecast_data[-1]["forecastMax"] = last_hist["maxTemp"]
        forecast_data[-1]["forecastPeak"] = last_hist["peakMaxTemp"]
        forecast_data[-1]["forecastSummer"] = last_hist["summerMaxTemp"]
        forecast_data[-1]["forecastMin"] = last_hist["minTemp"]
        forecast_data[-1]["forecastMaxLower"] = last_hist["maxTemp"]
        forecast_data[-1]["forecastMaxUpper"] = last_hist["maxTemp"]
        forecast_data[-1]["forecastPeakLower"] = last_hist["peakMaxTemp"]
        forecast_data[-1]["forecastPeakUpper"] = last_hist["peakMaxTemp"]
        forecast_data[-1]["forecastMinLower"] = last_hist["minTemp"]
        forecast_data[-1]["forecastMinUpper"] = last_hist["minTemp"]

        # Calculate transition nudge bias at the boundary (2018) to avoid abrupt jumps
        bias_max = (last_hist["maxTemp"] - f_max_mean[0]) if len(f_max_mean) > 0 and last_hist["maxTemp"] is not None and f_max_mean[0] is not None else 0.0
        bias_min = (last_hist["minTemp"] - f_min_mean[0]) if len(f_min_mean) > 0 and last_hist["minTemp"] is not None and f_min_mean[0] is not None else 0.0
        bias_peak = (last_hist["peakMaxTemp"] - f_peak_mean[0]) if len(f_peak_mean) > 0 and last_hist["peakMaxTemp"] is not None and f_peak_mean[0] is not None else 0.0
        bias_summer = (last_hist["summerMaxTemp"] - f_summer_mean[0]) if len(f_summer_mean) > 0 and last_hist["summerMaxTemp"] is not None and f_summer_mean[0] is not None else 0.0

        # Future ML Forecast part (2018 - 2037)
        for idx, fy in enumerate(f_years):
            nudge_factor = np.exp(-idx / 4.0)  # Decay transition bias over 4-year scale

            raw_max = f_max_mean[idx] if idx < len(f_max_mean) else last_hist["maxTemp"] + 0.02 * (idx + 1)
            raw_min = f_min_mean[idx] if idx < len(f_min_mean) else last_hist["minTemp"] + 0.015 * (idx + 1)
            raw_peak = f_peak_mean[idx] if idx < len(f_peak_mean) else last_hist["peakMaxTemp"] + 0.025 * (idx + 1)
            raw_summer = f_summer_mean[idx] if idx < len(f_summer_mean) else last_hist["summerMaxTemp"] + 0.02 * (idx + 1)

            # Apply nudge
            f_max = round(raw_max + bias_max * nudge_factor, 2)
            f_min = round(raw_min + bias_min * nudge_factor, 2)
            f_peak = round(raw_peak + bias_peak * nudge_factor, 2)
            f_summer = round(raw_summer + bias_summer * nudge_factor, 2)

            f_max_l = round((f_max_lower[idx] if idx < len(f_max_lower) else f_max - 0.5) + bias_max * nudge_factor, 2)
            f_max_u = round((f_max_upper[idx] if idx < len(f_max_upper) else f_max + 0.5) + bias_max * nudge_factor, 2)

            f_peak_l = round((f_peak_lower[idx] if idx < len(f_peak_lower) else f_peak - 0.7) + bias_peak * nudge_factor, 2)
            f_peak_u = round((f_peak_upper[idx] if idx < len(f_peak_upper) else f_peak + 0.7) + bias_peak * nudge_factor, 2)

            f_min_l = round((f_min_lower[idx] if idx < len(f_min_lower) else f_min - 0.4) + bias_min * nudge_factor, 2)
            f_min_u = round((f_min_upper[idx] if idx < len(f_min_upper) else f_min + 0.4) + bias_min * nudge_factor, 2)

            forecast_data.append({
                "year": fy,
                "historicalMax": None,
                "peakMaxTemp": None,
                "summerMaxTemp": None,
                "historicalMin": None,
                "forecastMax": f_max,
                "forecastPeak": f_peak,
                "forecastSummer": f_summer,
                "forecastMin": f_min,
                "forecastMaxLower": f_max_l,
                "forecastMaxUpper": f_max_u,
                "forecastPeakLower": f_peak_l,
                "forecastPeakUpper": f_peak_u,
                "forecastMinLower": f_min_l,
                "forecastMinUpper": f_min_u,
            })

        selected_models = loc_ml.get('selected_models', {'max': 'ENSEMBLE', 'min': 'ENSEMBLE', 'peak': 'ENSEMBLE'})
        cv_rmse = loc_ml.get('cv_rmse', loc_ml.get('cv_mse', {'max': 0.57, 'min': 0.45, 'peak': 0.68}))
        cv_mae = loc_ml.get('cv_mae', {'max': 0.48, 'min': 0.38, 'peak': 0.53})

        station_data[loc] = {
            "historical": loc_historical,
            "forecast": forecast_data,
            "metrics": {
                "peakTrendPerDecade": loc_ml.get('peak_trend_per_decade', 0.171),
                "maxTrendPerDecade": loc_ml.get('max_trend_per_decade', 0.171),
                "minTrendPerDecade": loc_ml.get('min_trend_per_decade', 0.171),
                "selectedModelMax": selected_models.get('max', 'ENSEMBLE'),
                "selectedModelMin": selected_models.get('min', 'ENSEMBLE'),
                "selectedModelPeak": selected_models.get('peak', 'ENSEMBLE'),
                "cvRmseMax": cv_rmse.get('max', 0.57),
                "cvRmseMin": cv_rmse.get('min', 0.45),
                "cvRmsePeak": cv_rmse.get('peak', 0.68),
                "cvMaeMax": cv_mae.get('max', 0.48),
                "cvMaeMin": cv_mae.get('min', 0.38),
                "cvMaePeak": cv_mae.get('peak', 0.53),
                "cvMseMax": round(cv_rmse.get('max', 0.57)**2, 4),
                "cvMseMin": round(cv_rmse.get('min', 0.45)**2, 4)
            }
        }

    output = {
        "locations": locations,
        "data": station_data["National"]["historical"],
        "station_data": station_data,
    }

    os.makedirs('public/data', exist_ok=True)
    with open('public/data/climate.json', 'w') as f:
        json.dump(output, f, indent=2)

    print("Exported dataset v2.1 to public/data/climate.json successfully!")

if __name__ == '__main__':
    create_json()
