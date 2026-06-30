import pandas as pd
import numpy as np

def load_and_clean_data(file_path):
    print(f"Loading data from {file_path}...")
    # Load data skipping the first row (the general category row)
    # The actual column names are on row 1 (0-indexed)
    df_raw = pd.read_excel(file_path, header=None, skiprows=2)
    
    # We also need the header names. They are on row 1
    header_row = pd.read_excel(file_path, header=None, nrows=2).iloc[1]
    
    stations = ['Astore', 'Bunji', 'Chilas', 'Chitral', 'Darosh', 'Dir', 'Gilgit', 'Gupis', 'Quetta', 'Skardu', 'Zhob']
    
    # Create descriptive column names
    col_names = ['Year', 'Month', 'Day']
    
    # Max Temp columns
    for station in stations:
        col_names.append(f'MaxTemp_{station}')
    col_names.append('MaxTemp_Average')
    col_names.append('Empty_1')
    
    # Min Temp columns
    for station in stations:
        col_names.append(f'MinTemp_{station}')
    col_names.append('MinTemp_Average')
    col_names.append('Empty_2')
    
    # Precipitation columns
    for station in stations:
        col_names.append(f'Precip_{station}')
    col_names.append('Precip_Sum')
    
    df_raw.columns = col_names
    
    # Drop the empty columns and aggregates, we will compute aggregates if needed
    cols_to_drop = ['Empty_1', 'Empty_2', 'MaxTemp_Average', 'MinTemp_Average', 'Precip_Sum']
    df_raw.drop(columns=cols_to_drop, inplace=True)
    
    # Clean the data: replace '***', '----' with NaN
    df_raw.replace('***', np.nan, inplace=True)
    df_raw.replace('----', np.nan, inplace=True)
    
    # Convert Year, Month, Day to numeric
    # Some rows might have junk if it's the end of file, so we'll drop rows where Year is NaN
    df_raw.dropna(subset=['Year', 'Month', 'Day'], inplace=True)
    
    # Ensure Year, Month, Day are integers
    df_raw['Year'] = pd.to_numeric(df_raw['Year'], errors='coerce')
    df_raw['Month'] = pd.to_numeric(df_raw['Month'], errors='coerce')
    df_raw['Day'] = pd.to_numeric(df_raw['Day'], errors='coerce')
    df_raw.dropna(subset=['Year', 'Month', 'Day'], inplace=True)
    
    df_raw['Year'] = df_raw['Year'].astype(int)
    df_raw['Month'] = df_raw['Month'].astype(int)
    df_raw['Day'] = df_raw['Day'].astype(int)
    
    # Filter out invalid dates (e.g. Feb 30, Feb 31, etc. which might exist in raw data as padding)
    print("Creating DateTime index...")
    # Create a proper date column. If a date is invalid, errors='coerce' will make it NaT
    df_raw['Date'] = pd.to_datetime(df_raw[['Year', 'Month', 'Day']], errors='coerce')
    
    # Drop rows with invalid dates (NaT)
    df_raw.dropna(subset=['Date'], inplace=True)
    df_raw.set_index('Date', inplace=True)
    df_raw.drop(columns=['Year', 'Month', 'Day'], inplace=True)
    
    # Convert all columns to numeric
    for col in df_raw.columns:
        df_raw[col] = pd.to_numeric(df_raw[col], errors='coerce')
        
    print("Imputing missing values using interpolation...")
    # Use time-based interpolation for missing values
    df_clean = df_raw.interpolate(method='time')
    # Backward/Forward fill if any NaNs remain at the edges
    df_clean.bfill(inplace=True)
    df_clean.ffill(inplace=True)
    
    return df_clean

if __name__ == "__main__":
    file_path = 'journal.pone.0271626.s001.xlsx'
    df_clean = load_and_clean_data(file_path)
    print("Data shape after cleaning:", df_clean.shape)
    print(df_clean.head())
    
    print("Saving cleaned data to CSV...")
    df_clean.to_csv('cleaned_climate_data.csv')
    print("Data processing complete.")
