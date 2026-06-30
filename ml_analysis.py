import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
import os

def run_ml_analysis(csv_path):
    print(f"Loading annual data from {csv_path}...")
    df = pd.read_csv(csv_path, parse_dates=['Date'], index_col='Date')
    
    # Drop any NaNs that might have been introduced during aggregation
    df.dropna(subset=['National_MaxTemp', 'National_MinTemp'], inplace=True)
    
    # Extract year for ML features
    df['Year'] = df.index.year
    X = df[['Year']]
    
    # 1. Linear Regression to quantify trend
    print("Fitting Linear Regression for trend quantification...")
    lr_max = LinearRegression()
    lr_max.fit(X, df['National_MaxTemp'])
    max_trend_per_decade = lr_max.coef_[0] * 10
    
    lr_min = LinearRegression()
    lr_min.fit(X, df['National_MinTemp'])
    min_trend_per_decade = lr_min.coef_[0] * 10
    
    print(f"Max Temp Trend: {max_trend_per_decade:.3f} °C per decade")
    print(f"Min Temp Trend: {min_trend_per_decade:.3f} °C per decade")
    
    # 2. Time-series forecasting using RandomForestRegressor
    print("Forecasting next 20 years using RandomForestRegressor...")
    rf_max = RandomForestRegressor(n_estimators=100, random_state=42)
    rf_max.fit(X, df['National_MaxTemp'])
    
    rf_min = RandomForestRegressor(n_estimators=100, random_state=42)
    rf_min.fit(X, df['National_MinTemp'])
    
    # Alternatively, since RF can't extrapolate well, LinearRegression is better for trend extrapolation in pure time series
    # Let's use a combination: Linear Regression + historical residuals, or just LinearRegression for long-term forecasting.
    # Actually, let's use Linear Regression for the forecast to clearly show the trend line.
    
    future_years = pd.DataFrame({'Year': np.arange(2018, 2038)})
    
    # Forecasts
    forecast_max = lr_max.predict(future_years)
    forecast_min = lr_min.predict(future_years)
    
    # Plot Forecasting
    plt.figure(figsize=(12, 6))
    
    # Historical
    plt.plot(df['Year'], df['National_MaxTemp'], label='Historical Max Temp', color='red', alpha=0.5)
    plt.plot(df['Year'], df['National_MinTemp'], label='Historical Min Temp', color='blue', alpha=0.5)
    
    # Historical Trend Line (Linear Regression)
    plt.plot(df['Year'], lr_max.predict(X), color='darkred', linestyle='--', label='Historical Trend (Max Temp)')
    plt.plot(df['Year'], lr_min.predict(X), color='darkblue', linestyle='--', label='Historical Trend (Min Temp)')
    
    # Forecast
    plt.plot(future_years['Year'], forecast_max, label='Forecast Max Temp', color='orange', linewidth=2)
    plt.plot(future_years['Year'], forecast_min, label='Forecast Min Temp', color='cyan', linewidth=2)
    
    plt.title('Climate Change Forecast (2018-2037) via Linear Regression')
    plt.xlabel('Year')
    plt.ylabel('Temperature (°C)')
    plt.legend()
    plt.grid(True, alpha=0.3)
    
    out_dir = r"C:\Users\Laptop\.gemini\antigravity-ide\brain\5f504037-0437-4d54-96e8-5eed5b2bba91"
    os.makedirs(out_dir, exist_ok=True)
    forecast_plot_path = os.path.join(out_dir, 'forecast_trends.png')
    plt.savefig(forecast_plot_path)
    print(f"Saved forecast plot to {forecast_plot_path}")
    plt.close()
    
    # Save metrics for report
    metrics = {
        'max_trend_per_decade': max_trend_per_decade,
        'min_trend_per_decade': min_trend_per_decade,
        'forecast_2037_max': forecast_max[-1],
        'forecast_2037_min': forecast_min[-1]
    }
    
    with open('ml_metrics.txt', 'w') as f:
        for k, v in metrics.items():
            f.write(f"{k}:{v}\n")
    
    return metrics

if __name__ == "__main__":
    csv_path = 'annual_aggregates.csv'
    run_ml_analysis(csv_path)
    print("ML Analysis complete.")
