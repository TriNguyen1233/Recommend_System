"""
Checkpoint Manager: Handles model versioning, rollbacks, and quality gates.
Retains up to max_keep recent checkpoints and evaluates quality metrics before deployment.
"""

import os
import glob
import time
import csv
import torch

from IncrementalPipeline.config import INCREMENTAL_CONFIG


class CheckpointManager:
    """
    Manages model checkpoint lifecycle:
    - Save new checkpoints with auto-incrementing version numbers
    - Keep up to N recent checkpoints
    - Quality gate: compare performance metrics before promoting
    - Rollback: restore a previous model checkpoint
    """
    
    def __init__(self, config=None):
        self.config = config or INCREMENTAL_CONFIG
        self.checkpoint_dir = self.config["checkpoint_dir"]
        self.prefix = self.config["checkpoint_prefix"]
        self.max_keep = self.config["max_checkpoints_to_keep"]
        self.best_model_path = self.config["best_model_path"]
        self.metrics_log = self.config["metrics_log_path"]
        
        os.makedirs(self.checkpoint_dir, exist_ok=True)
    
    def get_existing_versions(self):
        """
        List all existing checkpoint versions.
        
        Returns:
            list[tuple]: [(version_num, filepath), ...] sorted in ascending order
        """
        pattern = os.path.join(self.checkpoint_dir, f"{self.prefix}_v*.pth")
        files = glob.glob(pattern)
        versions = []
        for f in files:
            basename = os.path.basename(f)
            try:
                v_str = basename.replace(f"{self.prefix}_v", "").replace(".pth", "")
                versions.append((int(v_str), f))
            except ValueError:
                continue
        versions.sort(key=lambda x: x[0])
        return versions
    
    def get_next_version(self):
        """Return the next auto-incrementing version number."""
        existing = self.get_existing_versions()
        if not existing:
            return 1
        return existing[-1][0] + 1
    
    def save_checkpoint(self, model, metrics, new_vocab_sizes):
        """
        Save a new model checkpoint and clean up outdated versions.
        
        Args:
            model: Neural_Network instance
            metrics: dict containing val_loss, val_acc, f1, auc
            new_vocab_sizes: dict containing current vocabulary sizes
            
        Returns:
            str: Saved checkpoint file path
        """
        version = self.get_next_version()
        filename = f"{self.prefix}_v{version}.pth"
        filepath = os.path.join(self.checkpoint_dir, filename)
        
        checkpoint = {
            'version': version,
            'timestamp': time.time(),
            'model_state_dict': model.state_dict(),
            'metrics': metrics,
            'num_users': getattr(model.user_embedding, 'num_embeddings', new_vocab_sizes.get('num_users', 0)),
            'num_items': getattr(model.item_embedding, 'num_embeddings', new_vocab_sizes.get('num_items', 0)),
            'num_brands': getattr(model.brand_embedding, 'num_embeddings', new_vocab_sizes.get('num_brands', 0)),
            'num_categories': getattr(model.category_emb, 'num_embeddings', new_vocab_sizes.get('num_categories', 0)),
            'num_main_cats': getattr(model.main_category_emb, 'num_embeddings', new_vocab_sizes.get('num_main_cats', 0)),
            'num_colors': getattr(model.color_embedding, 'num_embeddings', new_vocab_sizes.get('num_colors', 0)),
            'num_stores': getattr(model.store_embedding, 'num_embeddings', new_vocab_sizes.get('num_stores', 0)),
            'num_parent_asins': getattr(model.parent_asin_embedding, 'num_embeddings', new_vocab_sizes.get('num_parent_asins', 0)),
            'num_countries': getattr(model.country_embedding, 'num_embeddings', new_vocab_sizes.get('num_countries', 0)),
        }
        
        torch.save(checkpoint, filepath)
        print(f"  [CHECKPOINT] Saved checkpoint v{version}: {filepath}")
        
        self._log_metrics(version, metrics)
        self._cleanup_old_checkpoints()
        
        return filepath
    
    def promote_to_production(self, checkpoint_path):
        """
        Promote a checkpoint to production model (best_model_v2.pth).
        """
        if os.path.exists(self.best_model_path):
            backup_path = self.best_model_path.replace(".pth", "_backup.pth")
            if os.path.exists(backup_path):
                os.remove(backup_path)
            os.rename(self.best_model_path, backup_path)
            print(f"  [CHECKPOINT] Created backup of old model -> {backup_path}")
        
        checkpoint = torch.load(checkpoint_path, map_location='cpu', weights_only=False)
        torch.save(checkpoint, self.best_model_path)
        print(f"  [CHECKPOINT] Promoted to production -> {self.best_model_path}")
    
    def quality_gate(self, new_metrics, old_checkpoint_path=None):
        """
        Evaluate if new model meets performance criteria to deploy.
        
        Returns:
            (bool, str): (passed/failed, reason message)
        """
        old_path = old_checkpoint_path or self.best_model_path
        
        if not os.path.exists(old_path):
            print("  [QUALITY GATE] No existing baseline model found -- auto-pass")
            return True, "No baseline model to compare"
        
        old_checkpoint = torch.load(old_path, map_location='cpu', weights_only=False)
        
        old_metrics = old_checkpoint.get('metrics', {})
        if not old_metrics:
            old_metrics = {
                'auc': old_checkpoint.get('auc', 0),
                'f1': old_checkpoint.get('f1', 0),
                'val_loss': old_checkpoint.get('test_acc', 0),
            }
        
        old_auc = old_metrics.get('auc', 0)
        old_f1 = old_metrics.get('f1', 0)
        new_auc = new_metrics.get('auc', 0)
        new_f1 = new_metrics.get('f1', 0)
        
        max_auc_drop = self.config["quality_gate_auc_drop"]
        max_f1_drop = self.config["quality_gate_f1_drop"]
        
        print(f"\n  [QUALITY GATE] Metric Comparison:")
        print(f"    AUC: {old_auc:.4f} -> {new_auc:.4f} (max allowed drop: {max_auc_drop})")
        print(f"    F1:  {old_f1:.4f} -> {new_f1:.4f} (max allowed drop: {max_f1_drop})")
        
        if old_auc > 0 and (old_auc - new_auc) > max_auc_drop:
            reason = f"AUC drop exceeded threshold: {old_auc:.4f} -> {new_auc:.4f} (drop: {old_auc - new_auc:.4f} > {max_auc_drop})"
            print(f"  [QUALITY GATE] FAILED: {reason}")
            return False, reason
        
        if old_f1 > 0 and (old_f1 - new_f1) > max_f1_drop:
            reason = f"F1 drop exceeded threshold: {old_f1:.4f} -> {new_f1:.4f} (drop: {old_f1 - new_f1:.4f} > {max_f1_drop})"
            print(f"  [QUALITY GATE] FAILED: {reason}")
            return False, reason
        
        print("  [QUALITY GATE] PASSED -- New model meets deployment quality criteria.")
        return True, "Quality gate passed"
    
    def rollback(self, version=None):
        """
        Rollback production model to a previous checkpoint version.
        """
        existing = self.get_existing_versions()
        
        if not existing:
            print("  [ROLLBACK] No existing checkpoint available for rollback!")
            return None
        
        if version is not None:
            target = [(v, p) for v, p in existing if v == version]
            if not target:
                print(f"  [ROLLBACK] Checkpoint version {version} not found")
                return None
            _, target_path = target[0]
        else:
            _, target_path = existing[-1]
        
        self.promote_to_production(target_path)
        print(f"  [ROLLBACK] Successfully rolled back to: {target_path}")
        return target_path
    
    def _cleanup_old_checkpoints(self):
        """Remove old checkpoints beyond the max_keep limit."""
        existing = self.get_existing_versions()
        if len(existing) > self.max_keep:
            to_remove = existing[:len(existing) - self.max_keep]
            for version, filepath in to_remove:
                os.remove(filepath)
                print(f"  [CHECKPOINT] Removed old checkpoint v{version}: {filepath}")
    
    def _log_metrics(self, version, metrics):
        """Log checkpoint evaluation metrics to CSV file."""
        file_exists = os.path.exists(self.metrics_log)
        
        with open(self.metrics_log, 'a', newline='') as f:
            writer = csv.writer(f)
            if not file_exists:
                writer.writerow(['timestamp', 'version', 'val_loss', 'val_acc', 'f1', 'auc', 'train_loss'])
            writer.writerow([
                time.strftime('%Y-%m-%d %H:%M:%S'),
                version,
                metrics.get('val_loss', ''),
                metrics.get('val_acc', ''),
                metrics.get('f1', ''),
                metrics.get('auc', ''),
                metrics.get('train_loss', ''),
            ])
    
    def print_checkpoint_history(self):
        """Display history of existing checkpoints."""
        existing = self.get_existing_versions()
        print(f"\n  Checkpoint History ({len(existing)} versions):")
        for version, filepath in existing:
            size_mb = os.path.getsize(filepath) / (1024 * 1024)
            mtime = time.strftime('%Y-%m-%d %H:%M', time.localtime(os.path.getmtime(filepath)))
            print(f"    v{version}: {size_mb:.1f}MB | {mtime} | {filepath}")
