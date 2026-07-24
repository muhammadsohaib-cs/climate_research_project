import os
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

import json
import numpy as np
import torch
import matplotlib.pyplot as plt
from data_prep import load_gridded_dataset, compute_climatological_zscores, create_5d_sequence_tensors, LAT_GRID, LON_GRID
from model import ConvLSTMAutoencoder, TimeDistributedUNet

def generate_evaluation_diagnostics():
    print("=== Generating Deep Learning Diagnostics & Lead-Time RMSE Curves ===")
    grid_tensor, years = load_gridded_dataset()
    norm_tensor, mu_clim, sigma_clim = compute_climatological_zscores(grid_tensor, years)

    seq_len = 5
    pred_len = 5
    X_5d, Y_5d = create_5d_sequence_tensors(norm_tensor, seq_len=seq_len, pred_len=pred_len)

    sample_years = years[seq_len + pred_len - 1 :]
    test_mask = sample_years > 2010
    if not np.any(test_mask):
        test_mask = np.arange(len(X_5d)) >= int(0.85 * len(X_5d))

    X_test_t = torch.tensor(X_5d[test_mask], dtype=torch.float32)
    Y_test_t = torch.tensor(Y_5d[test_mask], dtype=torch.float32)

    # Load Trained Models
    conv_lstm = ConvLSTMAutoencoder(in_channels=4, hidden_channels=32, pred_len=pred_len)
    conv_lstm.load_state_dict(torch.load('conv_lstm_model.pt'))
    conv_lstm.eval()

    unet = TimeDistributedUNet(in_channels=4, hidden_dim=32, pred_len=pred_len)
    unet.load_state_dict(torch.load('unet_model.pt'))
    unet.eval()

    with torch.no_grad():
        pred_lstm = conv_lstm(X_test_t)
        pred_unet = unet(X_test_t)

    # Lead-Time RMSE Curves for lead steps 1..5
    rmse_lstm_lead = []
    rmse_unet_lead = []
    rmse_pers_lead = []
    rmse_clim_lead = []

    last_step = X_test_t[:, -1:, :, :, :]
    pers_pred = last_step.repeat(1, pred_len, 1, 1, 1)
    clim_pred = torch.zeros_like(Y_test_t)

    for step in range(pred_len):
        # Calculate RMSE across test set for step t
        mse_lstm = torch.mean((pred_lstm[:, step] - Y_test_t[:, step])**2).item()
        mse_unet = torch.mean((pred_unet[:, step] - Y_test_t[:, step])**2).item()
        mse_pers = torch.mean((pers_pred[:, step] - Y_test_t[:, step])**2).item()
        mse_clim = torch.mean((clim_pred[:, step] - Y_test_t[:, step])**2).item()

        rmse_lstm_lead.append(round(np.sqrt(mse_lstm), 4))
        rmse_unet_lead.append(round(np.sqrt(mse_unet), 4))
        rmse_pers_lead.append(round(np.sqrt(mse_pers), 4))
        rmse_clim_lead.append(round(np.sqrt(mse_clim), 4))

    # Spatial Error Heatmaps (Pixel-wise RMSE over test set across channels)
    # Channel 0: MaxTemp, Channel 1: MinTemp
    spatial_err_lstm = torch.sqrt(torch.mean((pred_lstm - Y_test_t)**2, dim=(0, 1, 2))).numpy() # (H, W)
    spatial_err_unet = torch.sqrt(torch.mean((pred_unet - Y_test_t)**2, dim=(0, 1, 2))).numpy() # (H, W)

    # Zonal Mean Profiles (Average across longitudes for each latitude band)
    zonal_mean_obs = torch.mean(Y_test_t[:, :, 0], dim=(0, 1, 3)).numpy() # (H,)
    zonal_mean_lstm = torch.mean(pred_lstm[:, :, 0], dim=(0, 1, 3)).numpy() # (H,)
    zonal_mean_unet = torch.mean(pred_unet[:, :, 0], dim=(0, 1, 3)).numpy() # (H,)

    diag_data = {
        'lead_times': list(range(1, pred_len + 1)),
        'rmse_convlstm': rmse_lstm_lead,
        'rmse_unet': rmse_unet_lead,
        'rmse_persistence': rmse_pers_lead,
        'rmse_climatology': rmse_clim_lead,
        'lat_grid': LAT_GRID.tolist(),
        'lon_grid': LON_GRID.tolist(),
        'zonal_mean_obs': zonal_mean_obs.tolist(),
        'zonal_mean_convlstm': zonal_mean_lstm.tolist(),
        'zonal_mean_unet': zonal_mean_unet.tolist(),
        'spatial_err_convlstm': spatial_err_lstm.tolist(),
        'spatial_err_unet': spatial_err_unet.tolist()
    }

    with open('dl_diagnostics.json', 'w') as f:
        json.dump(diag_data, f, indent=2)

    print("Generated dl_diagnostics.json successfully.")

if __name__ == '__main__':
    generate_evaluation_diagnostics()
