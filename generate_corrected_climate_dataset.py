import pandas as pd
import numpy as np
import os
from scipy.stats import linregress

REMOVED_STATIONS = {
    'Chitral', 'Mohin Jodaro', 'Badin', 'Ormara', 'Lasbella',
    'Risalpur', 'Lahore', 'Kohat', 'Multan', 'Peshawar',
    'Khuzdar', 'Saidu Sharif', 'Barkhan', 'Jiwani', 'Kalat',
    'Rohri', 'Dir', 'Cherat', 'Passni', 'Pasni', 'Astore', 'Sibbi'
}

def build_corrected_dataset(excel_path='journal.pone.0271626.s001.xlsx'):
    print(f"Loading raw dataset from {excel_path}...")
    xl = pd.ExcelFile(excel_path)
    
    all_station_dfs = []
    
    for sheet in xl.sheet_names:
        print(f"\nProcessing {sheet}...")
        df_raw = pd.read_excel(xl, sheet_name=sheet, header=None, skiprows=2)
        header_row = pd.read_excel(xl, sheet_name=sheet, header=None, nrows=2).iloc[1].tolist()
        
        sheet_cities = []
        for col in header_row[3:]:
            col_str = str(col).strip()
            if pd.isna(col) or col_str.lower() in ['average', 'sum', 'nan']:
                break
            sheet_cities.append(col_str)
            
        col_names = ['Year', 'Month', 'Day']
        for city in sheet_cities:
            col_names.append(f'MaxTemp_{city}')
        col_names.append('MaxTemp_Average')
        col_names.append('Empty_1')
        
        for city in sheet_cities:
            col_names.append(f'MinTemp_{city}')
        col_names.append('MinTemp_Average')
        col_names.append('Empty_2')
        
        for city in sheet_cities:
            col_names.append(f'Precip_{city}')
        col_names.append('Precip_Sum')
        
        expected_cols = len(col_names)
        actual_cols = len(df_raw.columns)
        if actual_cols < expected_cols:
            col_names = col_names[:actual_cols]
        elif actual_cols > expected_cols:
            df_raw = df_raw.iloc[:, :expected_cols]
            
        df_raw.columns = col_names
        
        cols_to_drop = [c for c in ['Empty_1', 'Empty_2', 'MaxTemp_Average', 'MinTemp_Average', 'Precip_Sum'] if c in df_raw.columns]
        df_raw.drop(columns=cols_to_drop, inplace=True)
        
        sentinel_values = ['***', '----', -999, -999.0, 999, 999.0, -99, -99.0, -9999, -9999.0, '-999', '-9999', '-99', '999', '9999']
        df_raw = df_raw.replace(sentinel_values, np.nan)
        
        df_raw.dropna(subset=['Year', 'Month', 'Day'], inplace=True)
        df_raw['Year'] = pd.to_numeric(df_raw['Year'], errors='coerce')
        df_raw['Month'] = pd.to_numeric(df_raw['Month'], errors='coerce')
        df_raw['Day'] = pd.to_numeric(df_raw['Day'], errors='coerce')
        df_raw.dropna(subset=['Year', 'Month', 'Day'], inplace=True)
        
        df_raw['Year'] = df_raw['Year'].astype(int)
        df_raw['Month'] = df_raw['Month'].astype(int)
        df_raw['Day'] = df_raw['Day'].astype(int)
        
        df_raw['Date'] = pd.to_datetime(df_raw[['Year', 'Month', 'Day']], errors='coerce')
        df_raw.dropna(subset=['Date'], inplace=True)
        df_raw.set_index('Date', inplace=True)
        
        for col in df_raw.columns:
            if col not in ['Year', 'Month', 'Day']:
                df_raw[col] = pd.to_numeric(df_raw[col], errors='coerce')
                df_raw[col] = df_raw[col].replace(sentinel_values, np.nan)
                if col.startswith('MaxTemp_'):
                    # Physical meteorology bounds for Max Temp in Pakistan
                    df_raw.loc[(df_raw[col] < -30) | (df_raw[col] > 56), col] = np.nan
                    # Monthly Z-score outlier filtering (|Z| > 3.8 per calendar month)
                    month_grp = df_raw.groupby('Month')[col]
                    m_mean = month_grp.transform('mean')
                    m_std = month_grp.transform('std')
                    z_mask = (m_std > 0) & (((df_raw[col] - m_mean).abs() / m_std) > 3.8)
                    df_raw.loc[z_mask, col] = np.nan

                elif col.startswith('MinTemp_'):
                    # Physical meteorology bounds for Min Temp in Pakistan
                    df_raw.loc[(df_raw[col] < -40) | (df_raw[col] > 45), col] = np.nan
                    month_grp = df_raw.groupby('Month')[col]
                    m_mean = month_grp.transform('mean')
                    m_std = month_grp.transform('std')
                    z_mask = (m_std > 0) & (((df_raw[col] - m_mean).abs() / m_std) > 3.8)
                    df_raw.loc[z_mask, col] = np.nan
                elif col.startswith('Precip_'):
                    # Precipitation bounds checking (e.g. negative values or sentinel codes)
                    df_raw.loc[df_raw[col] < 0, col] = np.nan
                    
        valid_cities = [c for c in sheet_cities if f'MaxTemp_{c}' in df_raw.columns and c not in REMOVED_STATIONS]
        cols_to_keep = ['Year', 'Month', 'Day']
        for c in valid_cities:
            cols_to_keep.extend([f'MaxTemp_{c}', f'MinTemp_{c}', f'Precip_{c}'])
        cols_to_keep = [c for c in cols_to_keep if c in df_raw.columns]
        
        df_filtered = df_raw[cols_to_keep]
        df_filtered = df_filtered[~df_filtered.index.duplicated(keep='first')]
        all_station_dfs.append(df_filtered)
        
    print("\nMerging all weather stations...")
    df_combined = pd.concat(all_station_dfs, axis=1)
    df_combined = df_combined.loc[:, ~df_combined.columns.duplicated()]
    
    # Re-extract Year and Month
    df_combined['Year'] = df_combined.index.year
    df_combined['Month'] = df_combined.index.month
    
    # Limit daily interpolation to 14 days max so missing summer months don't get winter-bled
    for col in df_combined.columns:
        if col not in ['Year', 'Month']:
            df_combined[col] = df_combined[col].interpolate(method='time', limit=14)
            
    # Step 1: Check for incomplete years. Group raw data by year and count months/days present.
    all_years = sorted(df_combined['Year'].unique())
    valid_years = []
    for yr in all_years:
        yr_df = df_combined[df_combined['Year'] == yr]
        months_present = yr_df['Month'].nunique()
        days_present = len(yr_df)
        
        # If the final year in the dataset does not have a complete set of records (e.g. less than 12 full months), drop that entire year
        if yr == all_years[-1] and months_present < 12:
            print(f"Step 1: Dropping incomplete final year {yr} (only {months_present} months present, {days_present} days)")
            continue
        valid_years.append(yr)

    full_years = valid_years
    min_yr = min(full_years)
    max_yr = max(full_years)
    print(f"Calculating annual aggregates for complete years: {min_yr} to {max_yr} ({len(full_years)} years)")
    annual_dates = [pd.Timestamp(f'{y}-12-31') for y in full_years]
    
    annual_df = pd.DataFrame(index=annual_dates)
    annual_df.index.name = 'Date'
    
    max_cols = [c for c in df_combined.columns if c.startswith('MaxTemp_')]
    min_cols = [c for c in df_combined.columns if c.startswith('MinTemp_')]
    precip_cols = [c for c in df_combined.columns if c.startswith('Precip_')]
    
    cities = [c.replace('MaxTemp_', '') for c in max_cols]
    
    for city in cities:
        c_max = f'MaxTemp_{city}'
        c_min = f'MinTemp_{city}'
        c_precip = f'Precip_{city}'
        
        if c_max not in df_combined.columns or c_min not in df_combined.columns:
            continue
            
        # 1. Annual Mean Daily Max Temp
        m_grouped = df_combined.groupby(['Year', 'Month'])[c_max].agg(['mean', 'count']).reset_index()
        m_grouped.loc[m_grouped['count'] < 15, 'mean'] = np.nan
        y_max_mean = m_grouped.groupby('Year')['mean'].agg(['mean', 'count'])
        y_max_mean.loc[y_max_mean['count'] < 10, 'mean'] = np.nan
        s_max_mean = y_max_mean['mean'].reindex(full_years).astype(float)
        annual_df[c_max] = s_max_mean.interpolate(method='linear').ffill().bfill().values
        
        # 2. Annual Peak Extreme Max Temp (Tx_x) - ensure Peak >= Annual Mean Max
        y_peak = df_combined.groupby('Year')[c_max].max().reindex(full_years).astype(float)
        s_peak = np.maximum(y_peak.values, s_max_mean.values)
        s_peak_series = pd.Series(s_peak, index=full_years)
        annual_df[f'PeakMaxTemp_{city}'] = s_peak_series.interpolate(method='linear').ffill().bfill().values
        
        # 3. Summer Season Mean Max Temp (May-July)
        summer_df = df_combined[df_combined['Month'].isin([5, 6, 7])]
        y_summer = summer_df.groupby('Year')[c_max].mean().reindex(full_years).astype(float)
        annual_df[f'SummerMaxTemp_{city}'] = y_summer.interpolate(method='linear').ffill().bfill().values
        
        # 4. Annual Mean Daily Min Temp
        m_min_grouped = df_combined.groupby(['Year', 'Month'])[c_min].agg(['mean', 'count']).reset_index()
        m_min_grouped.loc[m_min_grouped['count'] < 15, 'mean'] = np.nan
        y_min_mean = m_min_grouped.groupby('Year')['mean'].agg(['mean', 'count'])
        y_min_mean.loc[y_min_mean['count'] < 10, 'mean'] = np.nan
        s_min_mean = y_min_mean['mean'].reindex(full_years).astype(float).interpolate(method='linear').ffill().bfill()
        annual_df[c_min] = s_min_mean.values
        
        # 5. Annual Total Precipitation (Strict Null handling - ignore NaNs instead of zero-filling)
        if c_precip in df_combined.columns:
            precip_y = df_combined[c_precip].resample('YE').sum(min_count=1)
            precip_y = precip_y[precip_y.index.year.isin(full_years)]
            annual_df[c_precip] = precip_y.values
            
    # Calculate National Averages (ignoring NaNs explicitly)
    annual_df['National_MaxTemp'] = annual_df[max_cols].mean(axis=1, skipna=True)
    annual_df['National_PeakMaxTemp'] = annual_df[[c for c in annual_df.columns if c.startswith('PeakMaxTemp_')]].mean(axis=1, skipna=True)
    annual_df['National_SummerMaxTemp'] = annual_df[[c for c in annual_df.columns if c.startswith('SummerMaxTemp_')]].mean(axis=1, skipna=True)
    annual_df['National_MinTemp'] = annual_df[min_cols].mean(axis=1, skipna=True)
    if precip_cols:
        annual_df['National_Precip'] = annual_df[[c for c in precip_cols if c in annual_df.columns]].mean(axis=1, skipna=True)
        
    print("\nSanity Check - Station Peak & Mean Temperatures:")
    for check_city in ['Sibbi', 'Nokkundi', 'Islamabad', 'Karachi']:
        if f'MaxTemp_{check_city}' in annual_df.columns:
            mean_v = annual_df[f'MaxTemp_{check_city}'].mean()
            peak_v = annual_df[f'PeakMaxTemp_{check_city}'].mean()
            summer_v = annual_df[f'SummerMaxTemp_{check_city}'].mean()
            slope = linregress(range(len(annual_df)), annual_df[f'MaxTemp_{check_city}']).slope * 10
            print(f"  {check_city:10s} | {len(annual_df)}-yr Mean Max: {mean_v:.2f}°C | Summer Mean: {summer_v:.2f}°C | Peak Extreme: {peak_v:.2f}°C | Decadal Trend: {slope:+.3f}°C/dec")
            
    print("\nSaving corrected annual dataset to annual_aggregates_corrected.csv and annual_aggregates.csv...")
    annual_df.to_csv('annual_aggregates_corrected.csv')
    annual_df.to_csv('annual_aggregates.csv')
    try:
        annual_df.to_csv('annual_aggregates_corrected.csv')
    except PermissionError:
        print("Warning: annual_aggregates_corrected.csv is locked by another application (e.g. Excel). Saved to annual_aggregates.csv successfully.")
    print("Multi-metric dataset generated successfully.")

if __name__ == '__main__':
    build_corrected_dataset()
