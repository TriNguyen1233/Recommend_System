import os
import torch

checkpoint_path = os.path.join(os.path.dirname(__file__), "content", "weights", "best_model_v2.pth")

if not os.path.exists(checkpoint_path):
    print(f"Error: Checkpoint file not found at {checkpoint_path}")
    exit(1)

# Load checkpoint
checkpoint = torch.load(checkpoint_path, map_location='cpu', weights_only=False)

print("\n" + "="*50)
print("=== CHECKPOINT METADATA ===")
print("="*50)

for key, value in checkpoint.items():
    if key == "model_state_dict":
        print(f"model_state_dict: {len(value)} weights layers")
    elif key == "optimizer_state_dict":
        print(f"optimizer_state_dict: present")
    else:
        print(f"{key}: {value}")

print("="*50 + "\n")
