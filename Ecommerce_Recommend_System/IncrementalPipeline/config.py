"""
Centralized configuration for Incremental Learning Pipeline.
Optimized for CPU-only execution.
"""

INCREMENTAL_CONFIG = {
    # ------------------------------------------------------------
    # EWC (Elastic Weight Consolidation) - Prevent Catastrophic Forgetting
    # ------------------------------------------------------------
    "ewc_lambda": 5000,                # EWC penalty weight - higher means preserving old knowledge
    "fisher_samples": 2000,            # Number of samples to estimate Fisher Information Matrix
    "fisher_batch_size": 128,          # Batch size for Fisher estimation (optimized for CPU)

    # Fine-tuning Hyperparameters (CPU-optimized)

    "fine_tune_lr": 1e-5,              # Lower learning rate than full training
    "fine_tune_epochs": 3,             # 3 epochs for fast CPU convergence on new data streams
    "fine_tune_batch_size": 256,       # Batch size for CPU memory safety
    "grad_clip": 0.5,                  # Gradient clipping limit
    "weight_decay": 2e-3,              # Weight decay coefficient
    "early_stop_patience": 2,          # Early stopping patience

    # Quality Gate - Control model quality before deployment
    "quality_gate_auc_drop": 0.01,     # Maximum allowed AUC drop (1%) vs previous checkpoint
    "quality_gate_f1_drop": 0.02,      # Maximum allowed F1 drop (2%)
    "validation_split": 0.2,           # 20% validation split for new data
    "trigger_min_interactions": 500,   # Trigger when >= 500 new interaction records arrive
    "trigger_interval_hours": 24,      # Trigger interval in hours      
    "max_checkpoints_to_keep": 5,      # Maximum recent checkpoints to retain for rollback
    "checkpoint_dir": "./content/weights/",
    "checkpoint_prefix": "incremental_model",  # Checkpoint filename pattern: incremental_model_v{N}.pth
    "best_model_path": "./content/weights/best_model_v2.pth",

    # Data Pipeline
    "encoder_dir": "./content/encoder/",
    "old_data_sample_ratio": 0.1,      # Sample 10% of old data to compute Fisher Matrix
    "product_rating_csv": "./content/Electronics_Rating(Encoding).csv",
    "product_data_csv": "./content/Electronics_Product(Encoding).csv",

    # PostgreSQL Data Source
    "db_table_interactions": "interactions",  # Table containing new user interactions
    "db_processed_flag_col": "is_trained",    # Flag column for processed records
    # Logging

    "metrics_log_path": "./content/weights/incremental_metrics_log.csv",
}
