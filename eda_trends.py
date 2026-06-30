import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import os

def run_eda(csv_path):
    print(f"Loading cleaned data from {csv_path}...")
    df = pd.read_csv(csv_path, parse_dates=['Date'], index_col='Date')
    
    # Calculate annual averages
    print("Calculating annual aggregates...")
    annual_mean = df.resample('YE').mean()
    annual_sum = df.resample('YE').sum() # For precipitation it might be better to use sum, but wait, 'YE' is the new alias for 'Y'
    
    # We have MaxTemp, MinTemp, Precip
    max_temp_cols = [c for c in df.columns if c.startswith('MaxTemp_')]
    min_temp_cols = [c for c in df.columns if c.startswith('MinTemp_')]
    precip_cols = [c for c in df.columns if c.startswith('Precip_')]
    
    # Aggregate across all stations
    annual_mean['National_MaxTemp'] = annual_mean[max_temp_cols].mean(axis=1)
    annual_mean['National_MinTemp'] = annual_mean[min_temp_cols].mean(axis=1)
    
    # For precipitation, maybe take the national average of the annual sum
    # First compute annual sum for each station
    annual_precip_sum = df[precip_cols].resample('YE').sum()
    annual_mean['National_Precip'] = annual_precip_sum.mean(axis=1)
    
    # Plot National Temperatures (Trend over time)
    plt.figure(figsize=(12, 6))
    plt.plot(annual_mean.index, annual_mean['National_MaxTemp'], label='Average Max Temp', alpha=0.5)
    plt.plot(annual_mean.index, annual_mean['National_MinTemp'], label='Average Min Temp', alpha=0.5)
    
    # Rolling averages to smooth (5-year rolling)
    plt.plot(annual_mean.index, annual_mean['National_MaxTemp'].rolling(window=5).mean(), label='Max Temp (5yr avg)', color='red', linewidth=2)
    plt.plot(annual_mean.index, annual_mean['National_MinTemp'].rolling(window=5).mean(), label='Min Temp (5yr avg)', color='blue', linewidth=2)
    
    plt.title('Climate Change Trend: Average Annual Temperatures (1961-2017)')
    plt.ylabel('Temperature (°C)')
    plt.xlabel('Year')
    plt.legend()
    plt.grid(True, alpha=0.3)
    
    out_dir = r"C:\Users\Laptop\.gemini\antigravity-ide\brain\5f504037-0437-4d54-96e8-5eed5b2bba91"
    os.makedirs(out_dir, exist_ok=True)
    temp_plot_path = os.path.join(out_dir, 'temperature_trends.png')
    plt.savefig(temp_plot_path)
    print(f"Saved temperature trends plot to {temp_plot_path}")
    plt.close()
    
    # Temperature Anomalies
    # Baseline 1961-1990
    baseline_max = annual_mean.loc['1961-01-01':'1990-12-31', 'National_MaxTemp'].mean()
    baseline_min = annual_mean.loc['1961-01-01':'1990-12-31', 'National_MinTemp'].mean()
    
    annual_mean['MaxTemp_Anomaly'] = annual_mean['National_MaxTemp'] - baseline_max
    annual_mean['MinTemp_Anomaly'] = annual_mean['National_MinTemp'] - baseline_min
    
    plt.figure(figsize=(12, 6))
    plt.bar(annual_mean.index.year, annual_mean['MaxTemp_Anomaly'], 
            color=['red' if x > 0 else 'blue' for x in annual_mean['MaxTemp_Anomaly']], alpha=0.7)
    
    plt.title('Maximum Temperature Anomalies (Baseline: 1961-1990)')
    plt.ylabel('Temperature Anomaly (°C)')
    plt.xlabel('Year')
    plt.axhline(0, color='black', linewidth=1)
    plt.grid(True, alpha=0.3)
    anomaly_plot_path = os.path.join(out_dir, 'temperature_anomalies.png')
    plt.savefig(anomaly_plot_path)
    print(f"Saved anomalies plot to {anomaly_plot_path}")
    plt.close()

    # Precipitation Trends
    plt.figure(figsize=(12, 6))
    plt.bar(annual_mean.index.year, annual_mean['National_Precip'], color='teal', alpha=0.6, label='Annual Precip')
    plt.plot(annual_mean.index.year, annual_mean['National_Precip'].rolling(window=5).mean(), color='navy', linewidth=2, label='5-yr avg Precip')
    plt.title('Average Annual Precipitation (1961-2017)')
    plt.ylabel('Precipitation (mm)')
    plt.xlabel('Year')
    plt.legend()
    plt.grid(True, alpha=0.3)
    precip_plot_path = os.path.join(out_dir, 'precipitation_trends.png')
    plt.savefig(precip_plot_path)
    print(f"Saved precipitation trends plot to {precip_plot_path}")
    plt.close()
    
    return annual_mean

if __name__ == "__main__":
    csv_path = 'cleaned_climate_data.csv'
    annual_data = run_eda(csv_path)
    annual_data.to_csv('annual_aggregates.csv')
    print("EDA complete. Annual aggregates saved.")
