# Walkthrough: Pakistan Climate Data Processing & ML Regression Correction

This walkthrough outlines the key corrections made to resolve scope mismatch, data cleaning flaws (imputation plateaus), and column filtering bugs across the climate data pipeline.

## 1. Scope Correction (Zone-01 Focus)
Originally, the ingestion script looped through all sheets in `journal.pone.0271626.s001.xlsx`, pulling in 27 stations across 5 climate zones. This included central and southern cities like Nawabshah and Mianwali, which have large negative trends. Computing a "National" average from all 27 cities dragged the trend below zero.

* **Correction**: Modified [data_prep.py](file:///d:/climateDataProject/my-app/data_prep.py) to target only `Zone-01`, which contains the 11 northern stations defined in the analysis scope: Astore, Bunji, Chilas, Chitral, Darosh, Dir, Gilgit, Gupis, Quetta, Skardu, and Zhob.

## 2. Imputation & Imputation Plateau Correction
The pipeline previously used `bfill()` (backward fill) to fill missing values at the beginning of the timeline. For stations starting later (such as Dir in 1968), this copied the initial temperature data backward to 1961, creating a flat artificial plateau for the first 7 years. This plateau skewed the linear regression slope.

* **Correction**: 
  - Removed backward fill (`bfill()`) completely to prevent artificial plateauing.
  - Applied a **15% missing data threshold** to filter out stations that lack a sufficient baseline:
    - **Chitral** (100% missing data) is dropped.
    - **Dir** (17.9% missing data, lacking 1961–1967) is dropped.
  - Kept 9 stations with high-quality baseline coverage (Astore, Bunji, Chilas, Darosh, Gilgit, Gupis, Quetta, Skardu, Zhob). Time-based interpolation handles internal gaps, and forward fill (`ffill()`) handles trailing endpoints.

## 3. Machine Learning & Anomaly Column Bug Fix
The previous ML script had a string-matching bug where any column starting with `MaxTemp_` was treated as a location. Since `MaxTemp_Anomaly` was created by `eda_trends.py`, the script ran a regression on it and outputted "Anomaly" as a geographic location in `ml_metrics.json`.

* **Correction**: 
  - Restored `ml_analysis.py` to the Linear Regression model to correctly compute individual decadal trends.
  - Fixed the column filter in both [ml_analysis.py](file:///d:/climateDataProject/my-app/ml_analysis.py) and [convert_to_json.py](file:///d:/climateDataProject/my-app/convert_to_json.py) to ignore any column ending with `_Anomaly`:
    ```python
    max_cols = [c for c in df.columns if (c.startswith('MaxTemp_') and not c.endswith('_Anomaly')) or c == 'National_MaxTemp']
    ```
  - Redirected plot outputs to the active conversation folder.

## 4. Dynamic Frontend Integration
* **Correction**: Modified [app/page.tsx](file:///d:/climateDataProject/my-app/app/page.tsx) to dynamically read the trend value from `metrics` instead of hardcoding "+0.292°C per decade" in the insights tab.

## Summary of Results

Running the corrected pipeline yields the following National (9-station average) trend values:

* **Maximum Temperature Trend**: Increasing at a rate of **0.191 °C per decade** (compared to the skewed negative trend of -0.123 °C/decade previously saved).
* **Minimum Temperature Trend**: Decreasing at a rate of **-0.110 °C per decade** (compared to -0.293 °C/decade previously saved).
* **2037 National Projected Maximum Temperature**: **22.99 °C**.
* **2037 National Projected Minimum Temperature**: **8.03 °C**.
* **"Anomaly" Location**: Successfully excluded from all locations list and predictions.
