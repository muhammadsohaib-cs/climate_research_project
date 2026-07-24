import torch
import torch.nn as nn
import torch.nn.functional as F

class ConvLSTMCell(nn.Module):
    """
    ConvLSTM Cell processing 2D spatial features over time.
    """
    def __init__(self, in_channels, hidden_channels, kernel_size=3, padding=1):
        super().__init__()
        self.in_channels = in_channels
        self.hidden_channels = hidden_channels
        self.gates = nn.Conv2d(
            in_channels + hidden_channels,
            4 * hidden_channels,
            kernel_size=kernel_size,
            padding=padding
        )

    def forward(self, x, state):
        if state is None:
            batch_size, _, height, width = x.size()
            h = torch.zeros(batch_size, self.hidden_channels, height, width, device=x.device)
            c = torch.zeros(batch_size, self.hidden_channels, height, width, device=x.device)
        else:
            h, c = state

        combined = torch.cat([x, h], dim=1)
        gates = self.gates(combined)
        i, f, o, g = torch.chunk(gates, 4, dim=1)

        i = torch.sigmoid(i)
        f = torch.sigmoid(f)
        o = torch.sigmoid(o)
        g = torch.tanh(g)

        c_next = f * c + i * g
        h_next = o * torch.tanh(c_next)

        return h_next, (h_next, c_next)


class ConvLSTMAutoencoder(nn.Module):
    """
    Spatiotemporal ConvLSTM Autoencoder based on Weyn et al. (2019) & ClimateSet (2023).
    Includes Encoder (Conv2D + MaxPool + Dilated Conv), ConvLSTM Cell, and Decoder (UpSampling2D + Conv2D).
    Input Shape: (Batch, Sequence_Len, Channels, Height, Width)
    Output Shape: (Batch, Pred_Len, Channels, Height, Width)
    """
    def __init__(self, in_channels=4, hidden_channels=32, pred_len=5):
        super().__init__()
        self.pred_len = pred_len

        # Encoder with Dilated Convolutions (Dilation=2)
        self.enc_conv1 = nn.Conv2d(in_channels, 16, kernel_size=3, padding=1)
        self.enc_conv2 = nn.Conv2d(16, 32, kernel_size=3, padding=2, dilation=2)
        self.pool = nn.MaxPool2d(2, 2, ceil_mode=True)

        # Spatiotemporal ConvLSTM Core
        self.conv_lstm = ConvLSTMCell(32, hidden_channels, kernel_size=3, padding=1)

        # Decoder with UpSampling
        self.dec_upsample = nn.Upsample(scale_factor=2, mode='bilinear', align_corners=False)
        self.dec_conv1 = nn.Conv2d(hidden_channels, 16, kernel_size=3, padding=1)
        self.dec_conv2 = nn.Conv2d(16, in_channels, kernel_size=3, padding=1)

    def forward(self, x):
        # x shape: (B, T_in, C, H, W)
        B, T_in, C, H, W = x.size()

        # Process input sequence through Encoder
        lstm_state = None
        for t in range(T_in):
            xt = x[:, t] # (B, C, H, W)
            h1 = F.relu(self.enc_conv1(xt))
            h2 = F.relu(self.enc_conv2(h1))
            h_pooled = self.pool(h2) # Downsampled

            h_lstm, lstm_state = self.conv_lstm(h_pooled, lstm_state)

        # Autoregressive / Multi-step sequence decoding for future steps
        outputs = []
        curr_hidden = h_lstm

        for t in range(self.pred_len):
            # Decode to spatial grid
            dec_up = self.dec_upsample(curr_hidden)
            # Crop/pad if necessary to match input H, W exact size
            if dec_up.size(2) != H or dec_up.size(3) != W:
                dec_up = F.interpolate(dec_up, size=(H, W), mode='bilinear', align_corners=False)

            d1 = F.relu(self.dec_conv1(dec_up))
            out_t = self.dec_conv2(d1) # (B, C, H, W)
            outputs.append(out_t)

            # Re-encode step for next prediction if t < pred_len - 1
            if t < self.pred_len - 1:
                h1 = F.relu(self.enc_conv1(out_t))
                h2 = F.relu(self.enc_conv2(h1))
                h_pooled = self.pool(h2)
                curr_hidden, lstm_state = self.conv_lstm(h_pooled, lstm_state)

        out = torch.stack(outputs, dim=1) # (B, Pred_Len, C, H, W)
        return out


class TimeDistributedUNet(nn.Module):
    """
    Time-Distributed U-Net with Skip Connections based on ClimateSet (Kaltenborn et al., 2023).
    Preserves fine-scale local extreme peaks (TXx / TNn).
    Input Shape: (Batch, Sequence_Len, Channels, Height, Width)
    Output Shape: (Batch, Pred_Len, Channels, Height, Width)
    """
    def __init__(self, in_channels=4, hidden_dim=32, pred_len=5):
        super().__init__()
        self.pred_len = pred_len

        # Encoder Block 1
        self.enc1 = nn.Sequential(
            nn.Conv2d(in_channels, hidden_dim, kernel_size=3, padding=1),
            nn.BatchNorm2d(hidden_dim),
            nn.ReLU(),
            nn.Conv2d(hidden_dim, hidden_dim, kernel_size=3, padding=1),
            nn.BatchNorm2d(hidden_dim),
            nn.ReLU()
        )
        self.pool1 = nn.MaxPool2d(2, 2, ceil_mode=True)

        # Encoder Block 2 (Bottleneck)
        self.enc2 = nn.Sequential(
            nn.Conv2d(hidden_dim, hidden_dim * 2, kernel_size=3, padding=1),
            nn.BatchNorm2d(hidden_dim * 2),
            nn.ReLU()
        )

        # Temporal Sequence Mapping Layer
        self.temporal_fc = nn.Linear(5, pred_len)

        # Decoder Block with Skip Connections
        self.up = nn.Upsample(scale_factor=2, mode='bilinear', align_corners=False)
        self.dec1 = nn.Sequential(
            nn.Conv2d(hidden_dim * 3, hidden_dim, kernel_size=3, padding=1),
            nn.BatchNorm2d(hidden_dim),
            nn.ReLU(),
            nn.Conv2d(hidden_dim, in_channels, kernel_size=3, padding=1)
        )

    def forward(self, x):
        # x shape: (B, T_in, C, H, W)
        B, T_in, C, H, W = x.size()

        # Fold Batch and Time for Time-Distributed spatial convolutions
        x_reshaped = x.view(B * T_in, C, H, W)

        # Encoder
        feat1 = self.enc1(x_reshaped) # (B*T_in, hidden_dim, H, W)
        pooled = self.pool1(feat1)
        feat2 = self.enc2(pooled) # (B*T_in, hidden_dim*2, H_down, W_down)

        # Decoder with Skip Connections
        up_feat = self.up(feat2)
        if up_feat.size(2) != H or up_feat.size(3) != W:
            up_feat = F.interpolate(up_feat, size=(H, W), mode='bilinear', align_corners=False)

        cat_feat = torch.cat([up_feat, feat1], dim=1) # Skip connection
        out_spatial = self.dec1(cat_feat) # (B*T_in, C, H, W)

        # Unfold Time
        out_spatial = out_spatial.view(B, T_in, C, H, W)

        # Temporal Projection (T_in -> Pred_Len)
        out_transposed = out_spatial.permute(0, 2, 3, 4, 1) # (B, C, H, W, T_in)
        out_temp = self.temporal_fc(out_transposed) # (B, C, H, W, Pred_Len)
        out = out_temp.permute(0, 4, 1, 2, 3) # (B, Pred_Len, C, H, W)

        return out

if __name__ == '__main__':
    dummy_input = torch.randn(2, 5, 4, 27, 34)
    model1 = ConvLSTMAutoencoder()
    out1 = model1(dummy_input)
    print(f"ConvLSTMAutoencoder output shape: {out1.shape}")

    model2 = TimeDistributedUNet()
    out2 = model2(dummy_input)
    print(f"TimeDistributedUNet output shape: {out2.shape}")
