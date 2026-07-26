const fs = require('fs');
const path = require('path');

function round(val, decimals = 2) {
  if (val === null || val === undefined || isNaN(val)) return null;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

function parseCSV(content) {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length === 0) return { headers: [], rows: [] };
  
  const headers = lines[0].split(',');
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] !== undefined && values[j] !== '' ? values[j] : null;
    }
    rows.push(row);
  }
  return { headers, rows };
}

function convertToJson() {
  console.log("Reading annual_aggregates.csv and ml_metrics.json...");
  const csvContent = fs.readFileSync(path.join(__dirname, 'annual_aggregates.csv'), 'utf8');
  const metricsContent = fs.readFileSync(path.join(__dirname, 'ml_metrics.json'), 'utf8');
  
  const { headers, rows } = parseCSV(csvContent);
  const metrics = JSON.parse(metricsContent);
  
  // Extract years
  const rowsWithYear = rows.map(r => {
    const year = r.Date ? parseInt(r.Date.split('-')[0], 10) : null;
    return { ...r, Year: year };
  }).filter(r => r.Year !== null && !isNaN(r.Year));
  
  // Identify locations
  const maxCols = headers.filter(c => (c.startsWith('MaxTemp_') && !c.endsWith('_Anomaly')) || c === 'National_MaxTemp');
  const locations = maxCols.map(c => c === 'National_MaxTemp' ? 'National' : c.replace('MaxTemp_', ''));
  
  const finalOutput = {
    locations: locations,
    data: {}
  };
  
  for (const loc of locations) {
    const colMax = loc === "National" ? "National_MaxTemp" : `MaxTemp_${loc}`;
    const colPeak = loc === "National" ? "National_PeakMaxTemp" : `PeakMaxTemp_${loc}`;
    const colSummer = loc === "National" ? "National_SummerMaxTemp" : `SummerMaxTemp_${loc}`;
    const colMin = loc === "National" ? "National_MinTemp" : `MinTemp_${loc}`;
    const colPrecip = loc === "National" ? "National_Precip" : `Precip_${loc}`;
    
    if (!headers.includes(colMax) || !headers.includes(colMin)) {
      continue;
    }
    
    // Baseline 1961-1990
    const baselineRows = rowsWithYear.filter(r => r.Year >= 1961 && r.Year <= 1990);
    const validBaselineMaxValues = baselineRows
      .map(r => parseFloat(r[colMax]))
      .filter(v => !isNaN(v));
      
    const baselineMax = validBaselineMaxValues.length > 0
      ? validBaselineMaxValues.reduce((a, b) => a + b, 0) / validBaselineMaxValues.length
      : null;
      
    const locData = [];
    for (const row of rowsWithYear) {
      const year = row.Year;
      const maxTemp = row[colMax] !== null ? round(parseFloat(row[colMax])) : null;
      const peakMaxTemp = row[colPeak] !== null ? round(parseFloat(row[colPeak])) : null;
      const summerMaxTemp = row[colSummer] !== null ? round(parseFloat(row[colSummer])) : null;
      const minTemp = row[colMin] !== null ? round(parseFloat(row[colMin])) : null;
      const precip = row[colPrecip] !== null ? round(parseFloat(row[colPrecip])) : null;
      
      let anomaly = null;
      if (maxTemp !== null && baselineMax !== null) {
        anomaly = round(maxTemp - baselineMax);
      }
      
      locData.push({
        year,
        maxTemp,
        peakMaxTemp,
        summerMaxTemp,
        minTemp,
        precip,
        anomaly
      });
    }
    
    // ML Forecasts
    const locMetrics = metrics[loc] || {};
    const validData = locData.filter(d => d.maxTemp !== null && d.minTemp !== null);
    if (validData.length === 0) continue;
    
    const lastPoint = validData[validData.length - 1];
    const lastYear = lastPoint.year;
    const currentMax = lastPoint.maxTemp;
    const currentMin = lastPoint.minTemp;
    const currentPeak = lastPoint.peakMaxTemp !== null ? lastPoint.peakMaxTemp : round(currentMax + 12.0);
    
    const forecastData = locData.map(d => ({
      year: d.year,
      historicalMax: d.maxTemp,
      peakMaxTemp: d.peakMaxTemp,
      summerMaxTemp: d.summerMaxTemp,
      historicalMin: d.minTemp,
      forecastMax: null,
      forecastPeak: null,
      forecastMin: null,
      forecastMaxLower: null,
      forecastMaxUpper: null,
      forecastPeakLower: null,
      forecastPeakUpper: null,
      forecastMinLower: null,
      forecastMinUpper: null,
      forecastMaxRange: null,
      forecastPeakRange: null,
      forecastMinRange: null
    }));
    
    // Transition point
    if (forecastData.length > 0) {
      const lastIdx = forecastData.length - 1;
      forecastData[lastIdx].forecastMax = currentMax;
      forecastData[lastIdx].forecastPeak = currentPeak;
      forecastData[lastIdx].forecastMin = currentMin;
      forecastData[lastIdx].forecastMaxLower = currentMax;
      forecastData[lastIdx].forecastMaxUpper = currentMax;
      forecastData[lastIdx].forecastPeakLower = currentPeak;
      forecastData[lastIdx].forecastPeakUpper = currentPeak;
      forecastData[lastIdx].forecastMinLower = currentMin;
      forecastData[lastIdx].forecastMinUpper = currentMin;
      forecastData[lastIdx].forecastMaxRange = [currentMax, currentMax];
      forecastData[lastIdx].forecastPeakRange = [currentPeak, currentPeak];
      forecastData[lastIdx].forecastMinRange = [currentMin, currentMin];
    }
    
    const forecastMaxMean = locMetrics.forecast_max_mean || [];
    const forecastMaxLower = locMetrics.forecast_max_lower || [];
    const forecastMaxUpper = locMetrics.forecast_max_upper || [];
    
    const forecastPeakMean = locMetrics.forecast_peak_mean || [];
    const forecastPeakLower = locMetrics.forecast_peak_lower || [];
    const forecastPeakUpper = locMetrics.forecast_peak_upper || [];
    
    const forecastMinMean = locMetrics.forecast_min_mean || [];
    const forecastMinLower = locMetrics.forecast_min_lower || [];
    const forecastMinUpper = locMetrics.forecast_min_upper || [];
    
    for (let i = 0; i < forecastMaxMean.length; i++) {
      const year = lastYear + i + 1;
      const fMax = round(forecastMaxMean[i]);
      const fMaxL = round(forecastMaxLower[i]);
      const fMaxU = round(forecastMaxUpper[i]);
      
      const fPeak = i < forecastPeakMean.length ? round(forecastPeakMean[i]) : round(fMax + 12.0);
      const fPeakL = i < forecastPeakLower.length ? round(forecastPeakLower[i]) : round(fPeak - 1.5);
      const fPeakU = i < forecastPeakUpper.length ? round(forecastPeakUpper[i]) : round(fPeak + 1.5);
      
      const fMin = round(forecastMinMean[i]);
      const fMinL = round(forecastMinLower[i]);
      const fMinU = round(forecastMinUpper[i]);
      
      forecastData.push({
        year,
        historicalMax: null,
        peakMaxTemp: null,
        summerMaxTemp: null,
        historicalMin: null,
        forecastMax: fMax,
        forecastPeak: fPeak,
        forecastMin: fMin,
        forecastMaxLower: fMaxL,
        forecastMaxUpper: fMaxU,
        forecastPeakLower: fPeakL,
        forecastPeakUpper: fPeakU,
        forecastMinLower: fMinL,
        forecastMinUpper: fMinU,
        forecastMaxRange: [fMaxL, fMaxU],
        forecastPeakRange: [fPeakL, fPeakU],
        forecastMinRange: [fMinL, fMinU]
      });
    }
    
    finalOutput.data[loc] = {
      historical: locData,
      forecast: forecastData,
      metrics: {
        maxTrendPerDecade: round(locMetrics.max_trend_per_decade || 0, 3),
        peakTrendPerDecade: round(locMetrics.peak_trend_per_decade || 0, 3),
        minTrendPerDecade: round(locMetrics.min_trend_per_decade || 0, 3)
      }
    };
  }
  
  const publicDataDir = path.join(__dirname, 'public', 'data');
  if (!fs.existsSync(publicDataDir)) {
    fs.mkdirSync(publicDataDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(publicDataDir, 'climate.json'), JSON.stringify(finalOutput, null, 2));
  console.log("Created public/data/climate.json successfully!");
}

convertToJson();
