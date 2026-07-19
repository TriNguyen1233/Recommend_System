"""
Centralized configuration for Incremental Learning Pipeline.
Tối ưu cho CPU-only execution (no GPU).
"""

INCREMENTAL_CONFIG = {
    # ════════════════════════════════════════════════════════════
    # EWC (Elastic Weight Consolidation) - Chống Catastrophic Forgetting
    # ════════════════════════════════════════════════════════════
    "ewc_lambda": 5000,                # Hệ số phạt EWC — càng cao càng bảo thủ (giữ kiến thức cũ)
    "fisher_samples": 2000,            # Số mẫu dùng để ước lượng Fisher Information Matrix
    "fisher_batch_size": 128,          # Batch size khi tính Fisher (nhỏ hơn vì chạy CPU)

    # ════════════════════════════════════════════════════════════
    # Fine-tuning Hyperparameters (CPU-optimized)
    # ════════════════════════════════════════════════════════════
    "fine_tune_lr": 1e-5,              # Learning rate thấp hơn 10x so với full train
    "fine_tune_epochs": 3,             # Chỉ 3 epochs cho CPU (đủ để hội tụ trên data stream nhỏ)
    "fine_tune_batch_size": 256,       # Batch size nhỏ hơn cho CPU (tránh OOM)
    "grad_clip": 0.5,                  # Gradient clipping chặt hơn full train (1.0)
    "weight_decay": 2e-3,             # Giữ nguyên weight decay từ full train
    "early_stop_patience": 2,          # Dừng sớm sau 2 epoch không cải thiện

    # ════════════════════════════════════════════════════════════
    # Quality Gate - Kiểm soát chất lượng model trước khi deploy
    # ════════════════════════════════════════════════════════════
    "quality_gate_auc_drop": 0.01,     # Cho phép AUC giảm tối đa 1% so với checkpoint trước
    "quality_gate_f1_drop": 0.02,      # Cho phép F1 giảm tối đa 2%
    "validation_split": 0.2,           # 20% new data dùng làm validation

    # ════════════════════════════════════════════════════════════
    # Trigger Conditions (Hybrid: volume OR time)
    # ════════════════════════════════════════════════════════════
    "trigger_min_interactions": 500,   # Kích hoạt khi có >= 500 bản ghi mới
    "trigger_interval_hours": 24,      # Hoặc kích hoạt mỗi 24 giờ (cái nào đến trước)

    # ════════════════════════════════════════════════════════════
    # Checkpoint & Rollback Management
    # ════════════════════════════════════════════════════════════
    "max_checkpoints_to_keep": 5,      # Giữ tối đa 5 checkpoints gần nhất để rollback
    "checkpoint_dir": "./content/weights/",
    "checkpoint_prefix": "incremental_model",  # Tên file: incremental_model_v{N}.pth
    "best_model_path": "./content/weights/best_model_v2.pth",

    # ════════════════════════════════════════════════════════════
    # Data Pipeline
    # ════════════════════════════════════════════════════════════
    "encoder_dir": "./content/encoder/",
    "old_data_sample_ratio": 0.1,      # Lấy mẫu 10% dữ liệu cũ để tính Fisher
    "product_rating_csv": "./content/Electronics_Rating(Encoding).csv",
    "product_data_csv": "./content/Electronics_Product(Encoding).csv",

    # ════════════════════════════════════════════════════════════
    # PostgreSQL Data Source (đọc bản ghi mới)
    # ════════════════════════════════════════════════════════════
    "db_table_interactions": "interactions",  # Tên bảng chứa tương tác mới
    "db_processed_flag_col": "is_trained",    # Cột đánh dấu đã xử lý
    
    # ════════════════════════════════════════════════════════════
    # Logging
    # ════════════════════════════════════════════════════════════
    "metrics_log_path": "./content/weights/incremental_metrics_log.csv",
}
