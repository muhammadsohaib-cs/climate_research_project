# Climate Data Analysis Project Report

## 1. Introduction
This report outlines the methodology, data pipelines, data cleaning methods, exploratory data analysis (EDA), and machine learning results of the Climate Data Analysis Project. The primary goal of the project is to analyze historical climate data, extract meaningful trends, and forecast future temperature changes.

## 2. Data Pipeline and Cleaning Methods
The raw data is sourced from an Excel dataset (`journal.pone.0271626.s001.xlsx`) containing daily climate records across 11 stations (Astore, Bunji, Chilas, Chitral, Darosh, Dir, Gilgit, Gupis, Quetta, Skardu, Zhob).

**Data Cleaning Pipeline (`data_prep.py`):**
- **Data Ingestion:** Loaded the raw Excel file, targeting only `Zone-01` to isolate the 11 northern stations of interest.
- **Column Standardization:** Assigned structured column names for MaxTemp, MinTemp, and Precipitation across all 11 stations.
- **Handling Missing & Invalid Data:** 
  - Dropped redundant aggregate columns and empty columns.
  - Replaced invalid text entries (`***` and `----`) with missing values (`NaN`).
  - Dropped rows with missing Year, Month, or Day values.
- **Station Filtering:** Filtered out stations with >15% missing data to ensure high baseline data quality. This successfully dropped **Chitral** (100% missing data) and **Dir** (17.9% missing data, lacking baseline coverage for 1961–1967).
- **Date Standardization:** Constructed a proper Datetime index from the numeric Year, Month, and Day columns, filtering out padded invalid dates (e.g., Feb 30).
- **Imputation Strategy:**
  - Imputed missing temperature and precipitation values using **time-based interpolation**.
  - Applied forward fill (`ffill`) to handle remaining missing values at the end of the time series. Backward fill (`bfill`) was explicitly **removed** to prevent introducing artificial flat temperature plateaus that distort historical trends.
- The finalized, cleaned dataset containing the 9 stations was exported as `cleaned_climate_data.csv`.

## 3. Exploratory Data Analysis (EDA)
The cleaned daily data was aggregated into annual metrics to better observe macro-trends (`eda_trends.py`):
- **Aggregation:** Calculated annual averages for Max and Min Temperatures, and annual sums for Precipitation.
- **National Metrics:** Computed national averages by taking the mean across all 11 stations to represent the overall climate.
- **Visualizations and Baselines:** 
  - Generated line plots with 5-year rolling averages to smooth out yearly volatility and visualize historical trends.
  - Calculated **Temperature Anomalies** using the standard **1961-1990 baseline** to highlight deviations from historical norms.
- Aggregated time-series data was exported to `annual_aggregates.csv`.

## 4. Machine Learning Models and Forecasting
To quantify historical trends and project future climate scenarios, Machine Learning models were applied (`ml_analysis.py`).

**Models Utilized:**
1. **Linear Regression:** Utilized for quantifying the historical rate of change and for long-term forecasting. Linear Regression is highly effective for extrapolating macro time-series trends over extended periods without overfitting to local noise.
2. **Random Forest Regressor:** Evaluated for non-linear time-series forecasting. While capable of capturing complex patterns, Linear Regression was ultimately favored for the final trend-line extrapolation due to the inherent limitations of tree-based models in extrapolating beyond historical numerical ranges.

## 5. Results and Conclusions

**Trend Quantification (Historical Analysis):**
- **Maximum Temperature Trend:** Increasing at a rate of **0.191 °C per decade**.
- **Minimum Temperature Trend:** Decreasing at a rate of **-0.110 °C per decade**.

**Forecast Results (Projected to the Year 2037):**
- **Projected Maximum Temperature (2037):** **22.99 °C**
- **Projected Minimum Temperature (2037):** **8.03 °C**

**Conclusions:**
The analysis reveals a steady warming trend in the maximum temperatures over the observed historical period across the 9 northern stations (with Chitral and Dir dropped due to insufficient baseline coverage), increasing at a rate of nearly 0.2 °C per decade. Meanwhile, the minimum temperatures show a cooling trend of -0.110 °C per decade, indicating an increase in diurnal temperature ranges. The linear regression forecast predicts that average national maximum temperatures could reach 22.99 °C by 2037, reflecting the persistent trajectory of climate warming in this region. This highlights the necessity for continued environmental monitoring and local climate adaptation strategies.
