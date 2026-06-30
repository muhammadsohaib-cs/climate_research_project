# Climate Data Analysis Project Report

## 1. Introduction
This report outlines the methodology, data pipelines, data cleaning methods, exploratory data analysis (EDA), and machine learning results of the Climate Data Analysis Project. The primary goal of the project is to analyze historical climate data, extract meaningful trends, and forecast future temperature changes.

## 2. Data Pipeline and Cleaning Methods
The raw data is sourced from an Excel dataset (`journal.pone.0271626.s001.xlsx`) containing daily climate records across 11 stations (Astore, Bunji, Chilas, Chitral, Darosh, Dir, Gilgit, Gupis, Quetta, Skardu, Zhob).

**Data Cleaning Pipeline (`data_prep.py`):**
- **Data Ingestion:** Loaded the raw Excel file, skipping irrelevant header rows.
- **Column Standardization:** Assigned structured column names for MaxTemp, MinTemp, and Precipitation across all 11 stations.
- **Handling Missing & Invalid Data:** 
  - Dropped redundant aggregate columns and empty columns.
  - Replaced invalid text entries (`***` and `----`) with missing values (`NaN`).
  - Dropped rows with missing Year, Month, or Day values.
- **Date Standardization:** Constructed a proper Datetime index from the numeric Year, Month, and Day columns, effectively filtering out artificially padded invalid dates (e.g., Feb 30).
- **Imputation Strategy:**
  - Imputed missing temperature and precipitation values using **time-based interpolation**.
  - Applied backward fill (`bfill`) and forward fill (`ffill`) to handle any remaining missing values at the extremities of the dataset.
- The finalized, cleaned dataset was exported as `cleaned_climate_data.csv`.

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
- **Maximum Temperature Trend:** Increasing at a rate of **0.292 °C per decade**.
- **Minimum Temperature Trend:** Decreasing slightly at a rate of **-0.041 °C per decade**.

**Forecast Results (Projected to the Year 2037):**
- **Projected Maximum Temperature (2037):** **23.40 °C**
- **Projected Minimum Temperature (2037):** **8.13 °C**

**Conclusions:**
The analysis reveals a significant warming trend in the maximum temperatures over the observed historical period, increasing at a concerning rate of nearly 0.3 °C per decade. While the minimum temperatures show a slight cooling trend, the substantial and consistent rise in maximum temperatures suggests an overall increase in thermal extremes. The linear regression forecast predicts that average national maximum temperatures could reach 23.40 °C by 2037, indicating a continued and pressing trajectory of climate warming. This highlights the necessity for continued environmental monitoring and the development of proactive climate adaptation strategies for the region.
