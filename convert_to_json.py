import pandas as pd
import json
import os

def create_json():
    print("Reading annual aggregates...")
    df = pd.read_csv('annual_aggregates.csv')
    
    # We need a clean structure for Recharts
    # Each row is an object with year, max_temp, min_temp, precip, etc.
    
    # Calculate baseline for anomalies (1961-1990)
    df['Date'] = pd.to_datetime(df['Date'])
    df['Year'] = df['Date'].dt.year
    
    baseline_max = df[(df['Year'] >= 1961) & (df['Year'] <= 1990)]['National_MaxTemp'].mean()
    
    data = []
    for _, row in df.iterrows():
        year = int(row['Year'])
        max_temp = round(row['National_MaxTemp'], 2) if pd.notna(row['National_MaxTemp']) else None
        min_temp = round(row['National_MinTemp'], 2) if pd.notna(row['National_MinTemp']) else None
        precip = round(row['National_Precip'], 2) if pd.notna(row['National_Precip']) else None
        anomaly = round(max_temp - baseline_max, 2) if max_temp is not None else None
        
        data.append({
            "year": year,
            "maxTemp": max_temp,
            "minTemp": min_temp,
            "precip": precip,
            "anomaly": anomaly
        })
        
    # ML Forecast - let's append future years (2018-2037)
    # Using the calculated trend: +0.292 per decade for max, -0.041 per decade for min
    # Wait, the intercept for the forecast. Let's just use the last value + trend.
    # From ml_analysis.py, we have the exact values. Let's just create a simplified projection.
    
    last_year = data[-1]['year']
    last_max = data[-1]['maxTemp']
    last_min = data[-1]['minTemp']
    
    max_trend_per_year = 0.292 / 10
    min_trend_per_year = -0.041 / 10
    
    forecast_data = []
    # Include the historical data in the forecast data so it's a seamless line
    for d in data:
        forecast_data.append({
            "year": d['year'],
            "historicalMax": d['maxTemp'],
            "historicalMin": d['minTemp'],
            "forecastMax": None,
            "forecastMin": None
        })
    
    # Generate future
    current_max = last_max
    current_min = last_min
    
    # Link the last historical point to the forecast
    forecast_data[-1]["forecastMax"] = last_max
    forecast_data[-1]["forecastMin"] = last_min
    
    for i in range(1, 21):
        year = last_year + i
        current_max += max_trend_per_year
        current_min += min_trend_per_year
        
        forecast_data.append({
            "year": year,
            "historicalMax": None,
            "historicalMin": None,
            "forecastMax": round(current_max, 2),
            "forecastMin": round(current_min, 2)
        })
        
    final_output = {
        "historical": data,
        "forecast": forecast_data,
        "metrics": {
            "maxTrendPerDecade": 0.292,
            "minTrendPerDecade": -0.041
        }
    }
    
    os.makedirs('app/data', exist_ok=True)
    with open('app/data/climate.json', 'w') as f:
        json.dump(final_output, f, indent=2)
        
    print("Created app/data/climate.json successfully.")

if __name__ == "__main__":
    create_json()
