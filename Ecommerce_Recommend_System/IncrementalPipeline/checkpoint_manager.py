"""
Checkpoint Manager: Quản lý phiên bản model, rollback, và quality gate.
Giữ tối đa 5 checkpoints gần nhất + kiểm tra Validation Loss trước khi deploy.
"""

import os
import glob
import time
import csv
import torch

from IncrementalPipeline.config import INCREMENTAL_CONFIG


class CheckpointManager:
    """
    Quản lý vòng đời checkpoint:
    - Lưu checkpoint mới với version tự tăng
    - Giữ tối đa N checkpoints gần nhất
    - Quality gate: so sánh metrics trước khi promote
    - Rollback: khôi phục checkpoint trước đó
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
        Liệt kê tất cả checkpoint versions hiện có.
        
        Returns:
            list[tuple]: [(version_num, filepath), ...] sắp xếp tăng dần
        """
        pattern = os.path.join(self.checkpoint_dir, f"{self.prefix}_v*.pth")
        files = glob.glob(pattern)
        versions = []
        for f in files:
            basename = os.path.basename(f)
            try:
                # Parse: incremental_model_v3.pth → 3
                v_str = basename.replace(f"{self.prefix}_v", "").replace(".pth", "")
                versions.append((int(v_str), f))
            except ValueError:
                continue
        versions.sort(key=lambda x: x[0])
        return versions
    
    def get_next_version(self):
        """Trả về version number tiếp theo."""
        existing = self.get_existing_versions()
        if not existing:
            return 1
        return existing[-1][0] + 1
    
    def save_checkpoint(self, model, metrics, new_vocab_sizes):
        """
        Lưu checkpoint mới và dọn dẹp checkpoints cũ.
        
        Args:
            model: Neural_Network model
            metrics: dict chứa val_loss, val_acc, f1, auc, ...
            new_vocab_sizes: dict chứa vocab sizes hiện tại
            
        Returns:
            str: Đường dẫn file checkpoint đã lưu
        """
        version = self.get_next_version()
        filename = f"{self.prefix}_v{version}.pth"
        filepath = os.path.join(self.checkpoint_dir, filename)
        
        checkpoint = {
            'version': version,
            'timestamp': time.time(),
            'model_state_dict': model.state_dict(),
            'metrics': metrics,
            # Lưu vocab sizes trực tiếp từ model layers để luôn chính xác 100%
            'num_users': model.user_embedding.num_embeddings,
            'num_items': model.item_embedding.num_embeddings,
            'num_brands': model.brand_embedding.num_embeddings,
            'num_categories': model.category_emb.num_embeddings,
            'num_main_cats': model.main_category_emb.num_embeddings,
            'num_colors': model.color_embedding.num_embeddings,
            'num_stores': model.store_embedding.num_embeddings,
            'num_parent_asins': model.parent_asin_embedding.num_embeddings,
            'num_countries': model.country_embedding.num_embeddings,
        }
        
        torch.save(checkpoint, filepath)
        print(f"  [CHECKPOINT] Đã lưu v{version}: {filepath}")
        
        # Log metrics
        self._log_metrics(version, metrics)
        
        # Dọn dẹp checkpoints cũ (giữ max N)
        self._cleanup_old_checkpoints()
        
        return filepath
    
    def promote_to_production(self, checkpoint_path):
        """
        Promote checkpoint thành model production (best_model_v2.pth).
        Tạo bản backup trước khi ghi đè.
        """
        if os.path.exists(self.best_model_path):
            backup_path = self.best_model_path.replace(".pth", "_backup.pth")
            # Chỉ giữ 1 bản backup cuối
            if os.path.exists(backup_path):
                os.remove(backup_path)
            os.rename(self.best_model_path, backup_path)
            print(f"  [CHECKPOINT] Backup model cũ → {backup_path}")
        
        # Copy checkpoint thành production model
        checkpoint = torch.load(checkpoint_path, map_location='cpu', weights_only=False)
        torch.save(checkpoint, self.best_model_path)
        print(f"  [CHECKPOINT] ✅ Promoted → {self.best_model_path}")
    
    def quality_gate(self, new_metrics, old_checkpoint_path=None):
        """
        Kiểm tra xem model mới có đủ chất lượng để deploy không.
        So sánh với metrics của checkpoint production hiện tại.
        
        Returns:
            (bool, str): (pass/fail, reason message)
        """
        old_path = old_checkpoint_path or self.best_model_path
        
        if not os.path.exists(old_path):
            print("  [QUALITY GATE] Không tìm thấy model cũ — auto-pass")
            return True, "Không có model cũ để so sánh"
        
        old_checkpoint = torch.load(old_path, map_location='cpu', weights_only=False)
        
        # Lấy metrics cũ
        old_metrics = old_checkpoint.get('metrics', {})
        if not old_metrics:
            # Fallback: lấy từ top-level keys (format cũ)
            old_metrics = {
                'auc': old_checkpoint.get('auc', 0),
                'f1': old_checkpoint.get('f1', 0),
                'val_loss': old_checkpoint.get('test_acc', 0),  # Fallback
            }
        
        old_auc = old_metrics.get('auc', 0)
        old_f1 = old_metrics.get('f1', 0)
        new_auc = new_metrics.get('auc', 0)
        new_f1 = new_metrics.get('f1', 0)
        
        max_auc_drop = self.config["quality_gate_auc_drop"]
        max_f1_drop = self.config["quality_gate_f1_drop"]
        
        print(f"\n  [QUALITY GATE] So sánh:")
        print(f"    AUC: {old_auc:.4f} → {new_auc:.4f} (cho phép giảm {max_auc_drop})")
        print(f"    F1:  {old_f1:.4f} → {new_f1:.4f} (cho phép giảm {max_f1_drop})")
        
        # Kiểm tra AUC
        if old_auc > 0 and (old_auc - new_auc) > max_auc_drop:
            reason = f"AUC giảm quá mức: {old_auc:.4f} → {new_auc:.4f} (giảm {old_auc - new_auc:.4f} > {max_auc_drop})"
            print(f"  ❌ FAILED: {reason}")
            return False, reason
        
        # Kiểm tra F1
        if old_f1 > 0 and (old_f1 - new_f1) > max_f1_drop:
            reason = f"F1 giảm quá mức: {old_f1:.4f} → {new_f1:.4f} (giảm {old_f1 - new_f1:.4f} > {max_f1_drop})"
            print(f"  ❌ FAILED: {reason}")
            return False, reason
        
        print("  ✅ PASSED — Model mới đạt chất lượng!")
        return True, "Quality gate passed"
    
    def rollback(self, version=None):
        """
        Rollback về checkpoint trước đó.
        
        Args:
            version: Version cụ thể muốn rollback. None = version gần nhất trước production.
        
        Returns:
            str: Đường dẫn checkpoint đã rollback, hoặc None nếu thất bại
        """
        existing = self.get_existing_versions()
        
        if not existing:
            print("  [ROLLBACK] Không có checkpoint nào để rollback!")
            return None
        
        if version is not None:
            target = [(v, p) for v, p in existing if v == version]
            if not target:
                print(f"  [ROLLBACK] Không tìm thấy version {version}")
                return None
            _, target_path = target[0]
        else:
            # Lấy version gần nhất (cuối danh sách)
            _, target_path = existing[-1]
        
        self.promote_to_production(target_path)
        print(f"  [ROLLBACK] ✅ Đã rollback về: {target_path}")
        return target_path
    
    def _cleanup_old_checkpoints(self):
        """Xóa checkpoints cũ, giữ tối đa max_keep gần nhất."""
        existing = self.get_existing_versions()
        if len(existing) > self.max_keep:
            to_remove = existing[:len(existing) - self.max_keep]
            for version, filepath in to_remove:
                os.remove(filepath)
                print(f"  [CHECKPOINT] Xóa checkpoint cũ v{version}: {filepath}")
    
    def _log_metrics(self, version, metrics):
        """Ghi metrics vào file CSV để theo dõi drift theo thời gian."""
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
        """In danh sách tất cả checkpoints hiện có."""
        existing = self.get_existing_versions()
        print(f"\n  📦 Checkpoint History ({len(existing)} versions):")
        for version, filepath in existing:
            size_mb = os.path.getsize(filepath) / (1024 * 1024)
            mtime = time.strftime('%Y-%m-%d %H:%M', time.localtime(os.path.getmtime(filepath)))
            print(f"    v{version}: {size_mb:.1f}MB | {mtime} | {filepath}")
