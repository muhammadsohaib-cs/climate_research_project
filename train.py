import os
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

import json
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from data_prep import load_gridded_dataset, compute_climatological_zscores, create_5d_sequence_tensors, LAT_GRID
from model import ConvLSTMAutoencoder, TimeDistributedUNet

class LatitudeWeightedMSELoss(nn.Module):
    def __init__(self, lat_grid):
        super().__init__()
        lat_rad = np.radians(lat_grid)
        weights = np.cos(lat_rad)
        weights = weights / np.mean(weights)
        self.register_buffer('weights', torch.tensor(weights, dtype=torch.float32).view(1, 1, 1, -1, 1))

    def forward(self, pred, target):
        squared_diff = (pred - target) ** 2
        weighted_diff = squared_diff * self.weights
        return torch.mean(weighted_diff)


def train_model(model, train_loader, val_loader, criterion, epochs=30, lr=1e-3, model_name="model"):
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-5)

    best_val_loss = float('inf')
    best_weights = None

    for epoch in range(1, epochs + 1):
        model.train()
        train_loss = 0.0

        for x_b, y_b in train_loader:
            optimizer.zero_grad()
            pred = model(x_b)
            loss = criterion(pred, y_b)
            loss.backward()
            optimizer.step()
            train_loss += loss.item() * x_b.size(0)

        train_loss /= len(train_loader.dataset)
        scheduler.step()

        # Validation
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for x_b, y_b in val_loader:
                pred = model(x_b)
                loss = criterion(pred, y_b)
                val_loss += loss.item() * x_b.size(0)

        val_loss /= len(val_loader.dataset)

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_weights = model.state_dict().copy()

        if epoch % 10 == 0 or epoch == epochs:
            print(f"[{model_name}] Epoch {epoch}/{epochs} | Train LLMSE: {train_loss:.4f} | Val LLMSE: {val_loss:.4f} | Best Val: {best_val_loss:.4f}")

    if best_weights is not None:
        model.load_state_dict(best_weights)

    return model, best_val_loss


def evaluate_benchmarks(X_test, Y_test, criterion):
    last_step = X_test[:, -1:, :, :, :]
    persistence_pred = last_step.repeat(1, Y_test.size(1), 1, 1, 1)
    persistence_loss = criterion(persistence_pred, Y_test).item()

    climatology_pred = torch.zeros_like(Y_test)
    climatology_loss = criterion(climatology_pred, Y_test).item()

    return persistence_loss, climatology_loss


def run_pipeline():
    print("=== Deep Learning Climate Prediction & Emulation Pipeline ===")
    grid_tensor, years = load_gridded_dataset()
    norm_tensor, mu_clim, sigma_clim = compute_climatological_zscores(grid_tensor, years)

    seq_len = 5
    pred_len = 5
    X_5d, Y_5d = create_5d_sequence_tensors(norm_tensor, seq_len=seq_len, pred_len=pred_len)

    sample_years = years[seq_len + pred_len - 1 :]
    sample_years = sample_years[: len(X_5d)]

    train_mask = sample_years <= 2000
    val_mask = (sample_years > 2000) & (sample_years <= 2010)
    test_mask = sample_years > 2010

    if not np.any(test_mask):
        train_mask = np.arange(len(X_5d)) < int(0.7 * len(X_5d))
        val_mask = (np.arange(len(X_5d)) >= int(0.7 * len(X_5d))) & (np.arange(len(X_5d)) < int(0.85 * len(X_5d)))
        test_mask = np.arange(len(X_5d)) >= int(0.85 * len(X_5d))

    X_train_t = torch.tensor(X_5d[train_mask], dtype=torch.float32)
    Y_train_t = torch.tensor(Y_5d[train_mask], dtype=torch.float32)

    X_val_t = torch.tensor(X_5d[val_mask], dtype=torch.float32)
    Y_val_t = torch.tensor(Y_5d[val_mask], dtype=torch.float32)

    X_test_t = torch.tensor(X_5d[test_mask], dtype=torch.float32)
    Y_test_t = torch.tensor(Y_5d[test_mask], dtype=torch.float32)

    train_loader = DataLoader(TensorDataset(X_train_t, Y_train_t), batch_size=4, shuffle=True)
    val_loader = DataLoader(TensorDataset(X_val_t, Y_val_t), batch_size=4, shuffle=False)

    criterion = LatitudeWeightedMSELoss(LAT_GRID)

    print("\n--- Training ConvLSTM Autoencoder (Weyn et al., 2019) ---")
    conv_lstm_model = ConvLSTMAutoencoder(in_channels=4, hidden_channels=32, pred_len=pred_len)
    conv_lstm_model, best_val_lstm = train_model(conv_lstm_model, train_loader, val_loader, criterion, epochs=30, model_name="ConvLSTM")
    torch.save(conv_lstm_model.state_dict(), 'conv_lstm_model.pt')

    print("\n--- Training Time-Distributed U-Net (ClimateSet, 2023) ---")
    unet_model = TimeDistributedUNet(in_channels=4, hidden_dim=32, pred_len=pred_len)
    unet_model, best_val_unet = train_model(unet_model, train_loader, val_loader, criterion, epochs=30, model_name="U-Net")
    torch.save(unet_model.state_dict(), 'unet_model.pt')

    conv_lstm_model.eval()
    unet_model.eval()
    with torch.no_grad():
        test_pred_lstm = conv_lstm_model(X_test_t)
        test_pred_unet = unet_model(X_test_t)
        test_loss_lstm = criterion(test_pred_lstm, Y_test_t).item()
        test_loss_unet = criterion(test_pred_unet, Y_test_t).item()

    pers_loss, clim_loss = evaluate_benchmarks(X_test_t, Y_test_t, criterion)

    print("\n=== Test Evaluation Summary (LLMSE) ===")
    print(f"ConvLSTM Autoencoder Test LLMSE : {test_loss_lstm:.4f}")
    print(f"Time-Distributed U-Net Test LLMSE : {test_loss_unet:.4f}")
    print(f"Persistence Benchmark Test LLMSE : {pers_loss:.4f}")
    print(f"Climatology Benchmark Test LLMSE   : {clim_loss:.4f}")

    results = {
        'ConvLSTM': float(test_loss_lstm),
        'UNet': float(test_loss_unet),
        'Persistence': float(pers_loss),
        'Climatology': float(clim_loss),
        'mu_clim': mu_clim.tolist(),
        'sigma_clim': sigma_clim.tolist()
    }

    with open('dl_metrics.json', 'w') as f:
        json.dump(results, f, indent=2)

    print("Saved model checkpoints to conv_lstm_model.pt and unet_model.pt")
    print("Saved evaluation metrics to dl_metrics.json")

if __name__ == '__main__':
    run_pipeline()
