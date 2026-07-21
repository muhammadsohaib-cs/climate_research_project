import pandas as pd
import json
import os

def create_json():
    print("Reading annual aggregates...")
    df = pd.read_csv('annual_aggregates.csv')
    
    with open('ml_metrics.json', 'r') as f:
        metrics = json.load(f)
    
    df['Date'] = pd.to_datetime(df['Date'])
    df['Year'] = df['Date'].dt.year
    
    # Identify locations
    max_cols = [c for c in df.columns if (c.startswith('MaxTemp_') and not c.endswith('_Anomaly')) or c == 'National_MaxTemp']
    locations = [c.replace('MaxTemp_', '').replace('National_MaxTemp', 'National') for c in max_cols]
    
    final_output = {
        "locations": locations,
        "data": {}
    }
    
    for loc in locations:
        loc_data = []
        
        col_max = f"MaxTemp_{loc}" if loc != "National" else "National_MaxTemp"
        col_min = f"MinTemp_{loc}" if loc != "National" else "National_MinTemp"
        col_precip = f"Precip_{loc}" if loc != "National" else "National_Precip"
        
        if col_max not in df.columns or col_min not in df.columns:
            continue
            
        # Baseline for anomalies (1961-1990)
        baseline_df = df[(df['Year'] >= 1961) & (df['Year'] <= 1990)]
        baseline_max = baseline_df[col_max].mean() if col_max in baseline_df.columns else None
        
        for _, row in df.iterrows():
            year = int(row['Year'])
            max_temp = round(row[col_max], 2) if pd.notna(row[col_max]) else None
            min_temp = round(row[col_min], 2) if pd.notna(row[col_min]) else None
            precip = round(row[col_precip], 2) if col_precip in df.columns and pd.notna(row[col_precip]) else None
            
            anomaly = None
            if max_temp is not None and baseline_max is not None and pd.notna(baseline_max):
                anomaly = round(max_temp - baseline_max, 2)
            
            loc_data.append({
                "year": year,
                "maxTemp": max_temp,
                "minTemp": min_temp,
                "precip": precip,
                "anomaly": anomaly
            })
            
        # Generate Forecasts from ML models
        loc_metrics = metrics.get(loc, {})
        
        # get last valid data
        valid_data = [d for d in loc_data if d['maxTemp'] is not None and d['minTemp'] is not None]
        if not valid_data:
            continue
            
        last_point = valid_data[-1]
        last_year = last_point['year']
        current_max = last_point['maxTemp']
        current_min = last_point['minTemp']
        
        forecast_data = []
        # Include historical data for continuous line
        for d in loc_data:
            forecast_data.append({
                "year": d['year'],
                "historicalMax": d['maxTemp'],
                "historicalMin": d['minTemp'],
                "forecastMax": None,
                "forecastMin": None,
                "forecastMaxLower": None,
                "forecastMaxUpper": None,
                "forecastMinLower": None,
                "forecastMinUpper": None,
                "forecastMaxRange": None,
                "forecastMinRange": None
            })
            
        # Link transition point (last year of history)
        forecast_data[-1]["forecastMax"] = current_max
        forecast_data[-1]["forecastMin"] = current_min
        forecast_data[-1]["forecastMaxLower"] = current_max
        forecast_data[-1]["forecastMaxUpper"] = current_max
        forecast_data[-1]["forecastMinLower"] = current_min
        forecast_data[-1]["forecastMinUpper"] = current_min
        forecast_data[-1]["forecastMaxRange"] = [current_max, current_max]
        forecast_data[-1]["forecastMinRange"] = [current_min, current_min]
        
        forecast_max_mean = loc_metrics.get('forecast_max_mean', [])
        forecast_max_lower = loc_metrics.get('forecast_max_lower', [])
        forecast_max_upper = loc_metrics.get('forecast_max_upper', [])
        forecast_min_mean = loc_metrics.get('forecast_min_mean', [])
        forecast_min_lower = loc_metrics.get('forecast_min_lower', [])
        forecast_min_upper = loc_metrics.get('forecast_min_upper', [])
        
        for i in range(len(forecast_max_mean)):
            year = last_year + i + 1
            f_max = round(forecast_max_mean[i], 2)
            f_max_l = round(forecast_max_lower[i], 2)
            f_max_u = round(forecast_max_upper[i], 2)
            f_min = round(forecast_min_mean[i], 2)
            f_min_l = round(forecast_min_lower[i], 2)
            f_min_u = round(forecast_min_upper[i], 2)
            
            forecast_data.append({
                "year": year,
                "historicalMax": None,
                "historicalMin": None,
                "forecastMax": f_max,
                "forecastMin": f_min,
                "forecastMaxLower": f_max_l,
                "forecastMaxUpper": f_max_u,
                "forecastMinLower": f_min_l,
                "forecastMinUpper": f_min_u,
                "forecastMaxRange": [f_max_l, f_max_u],
                "forecastMinRange": [f_min_l, f_min_u]
            })
            
        final_output["data"][loc] = {
            "historical": loc_data,
            "forecast": forecast_data,
            "metrics": {
                "maxTrendPerDecade": round(loc_metrics.get('max_trend_per_decade', 0), 3),
                "minTrendPerDecade": round(loc_metrics.get('min_trend_per_decade', 0), 3)
            }
        }
    
    os.makedirs('app/data', exist_ok=True)
    with open('app/data/climate.json', 'w') as f:
        json.dump(final_output, f, indent=2)
        
    print("Created app/data/climate.json successfully.")

if __name__ == "__main__":
    create_json()
