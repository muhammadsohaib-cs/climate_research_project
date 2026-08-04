import os
import sys
import pandas as pd
from generate_corrected_climate_dataset import build_corrected_dataset
from data_prep import build_tabular_ml_dataset
from ml_analysis import run_tabular_ml_pipeline
from convert_to_json import create_json

def main():
    print("=========================================================================")
    print("   PAKISTAN CLIMATE TABULAR ML FORECASTING & DATA CORRECTION PIPELINE    ")
    print("=========================================================================")

    # Phase 1: Programmatic Data Correction (Always regenerate for accuracy)
    print("\n--- Phase 1: Programmatic Data Correction (Monthly Z-score & Physical Sanity Cleaning) ---")
    build_corrected_dataset()

    # Phase 2: Restructuring Data for ML (Tabular Format)
    print("\n--- Phase 2: Restructuring Data into 2D Tabular Format ---")
    tab_df = build_tabular_ml_dataset(csv_path='annual_aggregates_corrected.csv')
    print(f"Tabular dataset created with {len(tab_df)} rows and {len(tab_df.columns)} columns.")
    print("Features included: Station, Year, Lat, Lon, Lags (Max/Min/Precip), Exogenous (CO2, AOD, ONI), NextYear Targets.")

    # Phase 3 & 4: Multi-Model Selection, Walk-Forward CV & Prediction Intervals
    print("\n--- Phase 3 & 4: Multi-Model Training, Walk-Forward CV & Prediction Intervals ---")
    run_tabular_ml_pipeline()

    # Export to JSON
    print("\n--- Phase 5: Exporting JSON for Next.js Web Frontend ---")
    create_json()

    print("\n=========================================================================")
    print("   TABULAR ML PIPELINE COMPLETED SUCCESSFULLY!                           ")
    print("=========================================================================")

if __name__ == '__main__':
    main()
