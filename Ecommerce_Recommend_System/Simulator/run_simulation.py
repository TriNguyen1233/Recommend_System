"""
Run Simulation: Script điều phối toàn bộ demo Incremental Learning.
Chạy 1 lệnh duy nhất:  python Simulator/run_simulation.py

Luồng:
  Phase A: Sinh dữ liệu tương tác giả lập từ persona
  Phase B: Kiểm tra Cold Start (trước khi học) — đo baseline
  Phase C: Chạy Incremental Learning Offline
  Phase D: Kiểm tra lại (sau khi học) — đo cải thiện
  Phase E: So sánh Before vs After + Báo cáo
"""

import os
import sys
import io
import json
import time
import importlib

# Fix Windows console encoding — force UTF-8 output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Thêm project root vào path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(PROJECT_ROOT)
os.chdir(PROJECT_ROOT)

from Simulator.user_simulator import generate_synthetic_interactions, save_interactions


# ════════════════════════════════════════════════════════════
# CONFIGURATION
# ════════════════════════════════════════════════════════════

OUTPUT_DIR = os.path.join(PROJECT_ROOT, "Simulator", "output")
INTERACTIONS_CSV = os.path.join(OUTPUT_DIR, "sim_interactions.csv")
GROUND_TRUTH_CSV = os.path.join(OUTPUT_DIR, "sim_ground_truth.csv")
RESULTS_BEFORE = os.path.join(OUTPUT_DIR, "results_before.json")
RESULTS_AFTER = os.path.join(OUTPUT_DIR, "results_after.json")


# ════════════════════════════════════════════════════════════
# PHASE A: Sinh dữ liệu
# ════════════════════════════════════════════════════════════

def phase_a_generate_data():
    """Sinh dữ liệu tương tác giả lập."""
    print("\n" + "█" * 70)
    print("█  PHASE A: SINH DỮ LIỆU TƯƠNG TÁC GIẢ LẬP")
    print("█" * 70)
    
    interactions_df, ground_truth_df = generate_synthetic_interactions(
        products_per_persona=20,
        seed=42,
    )
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    save_interactions(interactions_df, INTERACTIONS_CSV)
    ground_truth_df.to_csv(GROUND_TRUTH_CSV, index=False)
    
    return interactions_df, ground_truth_df


# ════════════════════════════════════════════════════════════
# PHASE B: Đo baseline (Before Incremental Learning)
# ════════════════════════════════════════════════════════════

def phase_b_measure_before(ground_truth_df):
    """
    Gọi Predict cho mỗi cặp (user_mới, sản_phẩm) TRƯỚC khi Incremental Learning.
    Thu thập kết quả để so sánh sau.
    """
    print("\n" + "█" * 70)
    print("█  PHASE B: ĐO BASELINE (TRƯỚC KHI HỌC)")
    print("█" * 70)
    
    from Predict import implement_recommend
    predictor = implement_recommend()
    
    results = []
    total = len(ground_truth_df)
    
    # Lấy mẫu representative để tránh chạy quá lâu (tối đa 30 cặp)
    sample_df = ground_truth_df.groupby('user_id').head(6).reset_index(drop=True)
    
    print(f"\n  Đang dự đoán cho {len(sample_df)} cặp (user, product)...\n")
    
    for idx, row in sample_df.iterrows():
        uid = row['user_id']
        asin = row['parent_asin']
        is_positive = row['is_positive']
        
        try:
            prediction = predictor.predict(uid, asin)
        except Exception as e:
            print(f"  [WARN] Lỗi predict({uid}, {asin}): {e}")
            prediction = None
        
        results.append({
            "user_id": uid,
            "parent_asin": asin,
            "ground_truth": bool(is_positive),
            "prediction": prediction,
            "correct": prediction == is_positive if prediction is not None else False,
        })
    
    # Tính metrics
    valid_results = [r for r in results if r['prediction'] is not None]
    if valid_results:
        correct = sum(1 for r in valid_results if r['correct'])
        accuracy = correct / len(valid_results) * 100
        
        # Precision & Recall cho positive class
        tp = sum(1 for r in valid_results if r['prediction'] == True and r['ground_truth'] == True)
        fp = sum(1 for r in valid_results if r['prediction'] == True and r['ground_truth'] == False)
        fn = sum(1 for r in valid_results if r['prediction'] == False and r['ground_truth'] == True)
        
        precision = tp / (tp + fp) * 100 if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) * 100 if (tp + fn) > 0 else 0
    else:
        accuracy = precision = recall = 0
    
    summary = {
        "phase": "BEFORE",
        "total_predictions": len(valid_results),
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "details": results,
    }
    
    with open(RESULTS_BEFORE, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    print(f"\n  📊 Baseline Results (TRƯỚC khi học):")
    print(f"     Accuracy  : {accuracy:.1f}%")
    print(f"     Precision : {precision:.1f}%")
    print(f"     Recall    : {recall:.1f}%")
    print(f"     Saved → {RESULTS_BEFORE}")
    
    return summary


# ════════════════════════════════════════════════════════════
# PHASE C: Chạy Incremental Learning
# ════════════════════════════════════════════════════════════

def phase_c_incremental_learning():
    """Chạy pipeline Incremental Learning offline từ CSV."""
    print("\n" + "█" * 70)
    print("█  PHASE C: INCREMENTAL LEARNING (EWC Fine-Tuning)")
    print("█" * 70)
    
    from Simulator.offline_incremental import run_offline_incremental
    
    result = run_offline_incremental(INTERACTIONS_CSV)
    
    if result is None:
        print("  ❌ Incremental Learning thất bại!")
        return False
    
    print(f"\n  ✅ Incremental Learning hoàn tất!")
    print(f"     Metrics: {result['metrics']}")
    return True


# ════════════════════════════════════════════════════════════
# PHASE D: Đo kết quả sau khi học
# ════════════════════════════════════════════════════════════

def phase_d_measure_after(ground_truth_df):
    """
    Reload model mới và đo lại kết quả cho cùng tập test.
    """
    print("\n" + "█" * 70)
    print("█  PHASE D: ĐO KẾT QUẢ (SAU KHI HỌC)")
    print("█" * 70)
    
    # Force reload module Predict để load model mới
    if 'Predict' in sys.modules:
        del sys.modules['Predict']
    from Predict import implement_recommend
    predictor = implement_recommend()
    
    results = []
    
    # Dùng cùng sample như Phase B
    sample_df = ground_truth_df.groupby('user_id').head(6).reset_index(drop=True)
    
    print(f"\n  Đang dự đoán lại cho {len(sample_df)} cặp (user, product)...\n")
    
    for idx, row in sample_df.iterrows():
        uid = row['user_id']
        asin = row['parent_asin']
        is_positive = row['is_positive']
        
        try:
            prediction = predictor.predict(uid, asin)
        except Exception as e:
            print(f"  [WARN] Lỗi predict({uid}, {asin}): {e}")
            prediction = None
        
        results.append({
            "user_id": uid,
            "parent_asin": asin,
            "ground_truth": bool(is_positive),
            "prediction": prediction,
            "correct": prediction == is_positive if prediction is not None else False,
        })
    
    # Tính metrics
    valid_results = [r for r in results if r['prediction'] is not None]
    if valid_results:
        correct = sum(1 for r in valid_results if r['correct'])
        accuracy = correct / len(valid_results) * 100
        
        tp = sum(1 for r in valid_results if r['prediction'] == True and r['ground_truth'] == True)
        fp = sum(1 for r in valid_results if r['prediction'] == True and r['ground_truth'] == False)
        fn = sum(1 for r in valid_results if r['prediction'] == False and r['ground_truth'] == True)
        
        precision = tp / (tp + fp) * 100 if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) * 100 if (tp + fn) > 0 else 0
    else:
        accuracy = precision = recall = 0
    
    summary = {
        "phase": "AFTER",
        "total_predictions": len(valid_results),
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "details": results,
    }
    
    with open(RESULTS_AFTER, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    print(f"\n  📊 Results (SAU khi học):")
    print(f"     Accuracy  : {accuracy:.1f}%")
    print(f"     Precision : {precision:.1f}%")
    print(f"     Recall    : {recall:.1f}%")
    print(f"     Saved → {RESULTS_AFTER}")
    
    return summary


# ════════════════════════════════════════════════════════════
# PHASE E: So sánh Before vs After
# ════════════════════════════════════════════════════════════

def phase_e_comparison(before_summary, after_summary):
    """In bảng so sánh kết quả Before vs After."""
    print("\n" + "█" * 70)
    print("█  PHASE E: SO SÁNH KẾT QUẢ BEFORE vs AFTER")
    print("█" * 70)
    
    print(f"\n  {'Metric':<20} | {'BEFORE (Cold Start)':<22} | {'AFTER (Incremental)':<22} | {'Δ Thay đổi':<15}")
    print("  " + "─" * 85)
    
    metrics = ['accuracy', 'precision', 'recall']
    labels = ['Accuracy', 'Precision', 'Recall']
    
    for metric, label in zip(metrics, labels):
        before_val = before_summary.get(metric, 0)
        after_val = after_summary.get(metric, 0)
        delta = after_val - before_val
        
        if delta > 0:
            delta_str = f"+{delta:.1f}% ▲"
        elif delta < 0:
            delta_str = f"{delta:.1f}% ▼"
        else:
            delta_str = "0.0% ─"
        
        print(f"  {label:<20} | {before_val:>18.1f}%   | {after_val:>18.1f}%   | {delta_str:<15}")
    
    print("  " + "─" * 85)
    
    # Chi tiết per-user
    print(f"\n  📋 Chi tiết theo từng User:")
    print(f"  {'User ID':<30} | {'Before (đúng/tổng)':<22} | {'After (đúng/tổng)':<22}")
    print("  " + "─" * 80)
    
    before_details = {(d['user_id'], d['parent_asin']): d for d in before_summary.get('details', [])}
    after_details = {(d['user_id'], d['parent_asin']): d for d in after_summary.get('details', [])}
    
    all_users = sorted(set(d['user_id'] for d in before_summary.get('details', [])))
    
    for uid in all_users:
        before_user = [d for d in before_summary.get('details', []) if d['user_id'] == uid]
        after_user = [d for d in after_summary.get('details', []) if d['user_id'] == uid]
        
        b_correct = sum(1 for d in before_user if d.get('correct', False))
        b_total = len(before_user)
        a_correct = sum(1 for d in after_user if d.get('correct', False))
        a_total = len(after_user)
        
        print(f"  {uid:<30} | {b_correct:>6}/{b_total:<6}             | {a_correct:>6}/{a_total:<6}")
    
    print("\n" + "═" * 70)
    
    # Kết luận
    acc_delta = after_summary.get('accuracy', 0) - before_summary.get('accuracy', 0)
    if acc_delta > 0:
        print("  🎉 KẾT LUẬN: Incremental Learning đã CẢI THIỆN khả năng gợi ý cho người dùng mới!")
        print(f"     Accuracy tăng {acc_delta:.1f}% sau khi mô hình học từ dữ liệu tương tác mới.")
    elif acc_delta == 0:
        print("  📊 KẾT LUẬN: Accuracy không thay đổi — mô hình cần thêm dữ liệu hoặc điều chỉnh.")
    else:
        print("  ⚠️  KẾT LUẬN: Accuracy giảm — cần điều chỉnh EWC lambda hoặc learning rate.")
    
    print("═" * 70 + "\n")


# ════════════════════════════════════════════════════════════
# MAIN ORCHESTRATOR
# ════════════════════════════════════════════════════════════

def main():
    """Chạy toàn bộ demo từ đầu đến cuối."""
    start_time = time.time()
    
    print("\n" + "█" * 70)
    print("█" + " " * 68 + "█")
    print("█   INCREMENTAL LEARNING DEMO — Giả lập Người Dùng Mới              █")
    print("█   Chứng minh hệ thống học được từ dữ liệu người dùng mới          █")
    print("█   mà không cần huấn luyện lại toàn bộ từ đầu (EWC)                █")
    print("█" + " " * 68 + "█")
    print("█" * 70)
    
    # Phase A: Sinh dữ liệu
    interactions_df, ground_truth_df = phase_a_generate_data()
    
    # Phase B: Đo baseline
    before_summary = phase_b_measure_before(ground_truth_df)
    
    # Phase C: Incremental Learning
    success = phase_c_incremental_learning()
    
    if not success:
        print("\n❌ Demo dừng do Incremental Learning thất bại.")
        return
    
    # Phase D: Đo kết quả sau
    after_summary = phase_d_measure_after(ground_truth_df)
    
    # Phase E: So sánh
    phase_e_comparison(before_summary, after_summary)
    
    total_time = time.time() - start_time
    print(f"  ⏱️  Tổng thời gian demo: {total_time:.1f}s ({total_time/60:.1f} phút)")
    print(f"  📁 Kết quả lưu tại: {OUTPUT_DIR}")
    print()


if __name__ == "__main__":
    main()
