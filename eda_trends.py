import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import os

def run_eda(csv_path):
    print(f"Loading cleaned data from {csv_path}...")
    df = pd.read_csv(csv_path, parse_dates=['Date'], index_col='Date')
    
    # Filter out corrupted trailing data from 2018/2019
    df = df[df.index.year <= 2017]
    
    # Calculate annual aggregates correctly based on data type
    print("Calculating annual aggregates...")
    annual_max = df.resample('YE').max()
    annual_min = df.resample('YE').min()
    annual_sum = df.resample('YE').sum()
    
    annual_agg = pd.DataFrame(index=annual_max.index)
    
    max_temp_cols = [c for c in df.columns if c.startswith('MaxTemp_')]
    min_temp_cols = [c for c in df.columns if c.startswith('MinTemp_')]
    precip_cols = [c for c in df.columns if c.startswith('Precip_')]
    
    for c in max_temp_cols:
        annual_agg[c] = annual_max[c]
    for c in min_temp_cols:
        annual_agg[c] = annual_min[c]
    for c in precip_cols:
        annual_agg[c] = annual_sum[c]
        
    # Aggregate across all stations
    annual_agg['National_MaxTemp'] = annual_agg[max_temp_cols].mean(axis=1)
    annual_agg['National_MinTemp'] = annual_agg[min_temp_cols].mean(axis=1)
    annual_agg['National_Precip'] = annual_agg[precip_cols].mean(axis=1)
    
    annual_mean = annual_agg # For backwards compatibility with plotting code below
    
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
    
    out_dir = r"C:\Users\Laptop\.gemini\antigravity-ide\brain\ccda17ad-4b78-4669-b323-f50d4be9f803"
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
