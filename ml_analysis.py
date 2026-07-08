import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression
import os
import json

def run_ml_analysis(csv_path):
    print(f"Loading annual data from {csv_path}...")
    df = pd.read_csv(csv_path, parse_dates=['Date'], index_col='Date')
    
    # Extract year for ML features
    df['Year'] = df.index.year
    X = df[['Year']]
    
    # Find all locations, ignoring Anomaly columns
    max_cols = [c for c in df.columns if (c.startswith('MaxTemp_') and not c.endswith('_Anomaly')) or c == 'National_MaxTemp']
    locations = [c.replace('MaxTemp_', '').replace('National_MaxTemp', 'National') for c in max_cols]
    
    metrics = {}
    
    future_years = pd.DataFrame({'Year': np.arange(2018, 2038)})
    
    out_dir = r"C:\Users\Laptop\.gemini\antigravity-ide\brain\ccda17ad-4b78-4669-b323-f50d4be9f803"
    os.makedirs(out_dir, exist_ok=True)
    
    for loc in locations:
        col_max = f"MaxTemp_{loc}" if loc != "National" else "National_MaxTemp"
        col_min = f"MinTemp_{loc}" if loc != "National" else "National_MinTemp"
        
        if col_max not in df.columns or col_min not in df.columns:
            continue
            
        # Drop NaNs for the specific location
        loc_df = df[['Year', col_max, col_min]].dropna()
        if loc_df.empty:
            continue
            
        X_loc = loc_df[['Year']]
        
        lr_max = LinearRegression()
        lr_max.fit(X_loc, loc_df[col_max])
        max_trend_per_decade = lr_max.coef_[0] * 10
        
        lr_min = LinearRegression()
        lr_min.fit(X_loc, loc_df[col_min])
        min_trend_per_decade = lr_min.coef_[0] * 10
        
        forecast_max = lr_max.predict(future_years)
        forecast_min = lr_min.predict(future_years)
        
        metrics[loc] = {
            'max_trend_per_decade': max_trend_per_decade,
            'min_trend_per_decade': min_trend_per_decade,
            'forecast_2037_max': forecast_max[-1],
            'forecast_2037_min': forecast_min[-1]
        }
        
        # Plot only for National to avoid too many files
        if loc == 'National':
            plt.figure(figsize=(12, 6))
            plt.plot(loc_df['Year'], loc_df[col_max], label='Historical Max Temp', color='red', alpha=0.5)
            plt.plot(loc_df['Year'], loc_df[col_min], label='Historical Min Temp', color='blue', alpha=0.5)
            
            plt.plot(loc_df['Year'], lr_max.predict(X_loc), color='darkred', linestyle='--', label='Historical Trend (Max Temp)')
            plt.plot(loc_df['Year'], lr_min.predict(X_loc), color='darkblue', linestyle='--', label='Historical Trend (Min Temp)')
            
            plt.plot(future_years['Year'], forecast_max, label='Forecast Max Temp', color='orange', linewidth=2)
            plt.plot(future_years['Year'], forecast_min, label='Forecast Min Temp', color='cyan', linewidth=2)
            
            plt.title('Climate Change Forecast (2018-2037) via Linear Regression (National)')
            plt.xlabel('Year')
            plt.ylabel('Temperature (°C)')
            plt.legend()
            plt.grid(True, alpha=0.3)
            
            forecast_plot_path = os.path.join(out_dir, 'forecast_trends.png')
            plt.savefig(forecast_plot_path)
            plt.close()
            
    with open('ml_metrics.json', 'w') as f:
        json.dump(metrics, f, indent=2)
        
    return metrics

if __name__ == "__main__":
    csv_path = 'annual_aggregates.csv'
    run_ml_analysis(csv_path)
    print("ML Analysis complete. Metrics saved to ml_metrics.json.")
