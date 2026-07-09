import pandas as pd
import numpy as np

def load_and_clean_data(file_path):
    print(f"Loading data from {file_path}...")
    xl = pd.ExcelFile(file_path)
    
    all_dfs = []
    
    for sheet in xl.sheet_names:
        print(f"\nProcessing {sheet}...")
        
        # Read the raw data
        df_raw = pd.read_excel(xl, sheet_name=sheet, header=None, skiprows=2)
        
        # Read the header to get city names
        header_row = pd.read_excel(xl, sheet_name=sheet, header=None, nrows=2).iloc[1].tolist()
        
        cities = []
        for col in header_row[3:]:
            col_str = str(col).strip()
            if pd.isna(col) or col_str == 'Average' or col_str == 'nan':
                break
            cities.append(col_str)
            
        print(f"Found {len(cities)} cities in {sheet}: {cities}")
        
        col_names = ['Year', 'Month', 'Day']
        for city in cities:
            col_names.append(f'MaxTemp_{city}')
        col_names.append('MaxTemp_Average')
        col_names.append('Empty_1')
        
        for city in cities:
            col_names.append(f'MinTemp_{city}')
        col_names.append('MinTemp_Average')
        col_names.append('Empty_2')
        
        for city in cities:
            col_names.append(f'Precip_{city}')
        col_names.append('Precip_Sum')
        
        # Handle cases where the actual columns in df_raw are less than expected
        # (e.g. trailing empty columns omitted by pandas)
        expected_cols = len(col_names)
        actual_cols = len(df_raw.columns)
        if actual_cols < expected_cols:
            col_names = col_names[:actual_cols]
        elif actual_cols > expected_cols:
            df_raw = df_raw.iloc[:, :expected_cols]
            
        df_raw.columns = col_names
        
        cols_to_drop = [c for c in ['Empty_1', 'Empty_2', 'MaxTemp_Average', 'MinTemp_Average', 'Precip_Sum'] if c in df_raw.columns]
        df_raw.drop(columns=cols_to_drop, inplace=True)
        
        df_raw.replace('***', np.nan, inplace=True)
        df_raw.replace('----', np.nan, inplace=True)
        
        # Convert date to numeric
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
        df_raw.drop(columns=['Year', 'Month', 'Day'], inplace=True)
        
        for col in df_raw.columns:
            df_raw[col] = pd.to_numeric(df_raw[col], errors='coerce')
            
        # Include all cities found in the sheet
        valid_cities = cities
        
        cols_to_keep = []
        for city in valid_cities:
            cols_to_keep.extend([f'MaxTemp_{city}', f'MinTemp_{city}', f'Precip_{city}'])
            
        cols_to_keep = [c for c in cols_to_keep if c in df_raw.columns]
        df_filtered = df_raw[cols_to_keep]
        
        # Remove any duplicate indexes (sometimes Excel files have dirty data)
        df_filtered = df_filtered[~df_filtered.index.duplicated(keep='first')]
        all_dfs.append(df_filtered)
        
    print("\nMerging all zones...")
    df_combined = pd.concat(all_dfs, axis=1)
    
    # Drop any duplicate columns if they exist
    df_combined = df_combined.loc[:, ~df_combined.columns.duplicated()]
    
    print(f"Total valid cities kept: {len(df_combined.columns) // 3}")
    
    print("Imputing missing values using interpolation...")
    df_clean = df_combined.interpolate(method='time')
    df_clean.bfill(inplace=True)
    df_clean.ffill(inplace=True)
    
    return df_clean

if __name__ == "__main__":
    file_path = 'journal.pone.0271626.s001.xlsx'
    df_clean = load_and_clean_data(file_path)
    print("Data shape after cleaning:", df_clean.shape)
    
    print("Saving cleaned data to CSV...")
    df_clean.to_csv('cleaned_climate_data.csv')
    print("Data processing complete.")
