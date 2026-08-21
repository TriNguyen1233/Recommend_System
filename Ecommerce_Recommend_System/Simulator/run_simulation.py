"""
Run Simulation: Orchestrator script for the Incremental Learning demo.
Execution command: python Simulator/run_simulation.py

Pipeline phases:
  Phase A: Generate synthetic user interaction data from personas
  Phase B: Baseline evaluation (Cold Start prior to incremental learning)
  Phase C: Run Offline Incremental Learning (EWC fine-tuning)
  Phase D: Post-learning evaluation
  Phase E: Before vs After metric comparison report
"""

import os
import sys
import io
import json
import time

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(PROJECT_ROOT)
os.chdir(PROJECT_ROOT)

from Simulator.user_simulator import generate_synthetic_interactions, save_interactions

OUTPUT_DIR = os.path.join(PROJECT_ROOT, "Simulator", "output")
INTERACTIONS_CSV = os.path.join(OUTPUT_DIR, "sim_interactions.csv")
GROUND_TRUTH_CSV = os.path.join(OUTPUT_DIR, "sim_ground_truth.csv")
RESULTS_BEFORE = os.path.join(OUTPUT_DIR, "results_before.json")
RESULTS_AFTER = os.path.join(OUTPUT_DIR, "results_after.json")


def phase_a_generate_data():
    """Generate synthetic interaction dataset."""
    print("\n" + "=" * 70)
    print("PHASE A: Synthetic Interaction Data Generation")
    print("=" * 70)
    
    interactions_df, ground_truth_df = generate_synthetic_interactions(
        products_per_persona=20,
        seed=42,
    )
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    save_interactions(interactions_df, INTERACTIONS_CSV)
    ground_truth_df.to_csv(GROUND_TRUTH_CSV, index=False)
    
    return interactions_df, ground_truth_df


def phase_b_measure_before(ground_truth_df):
    """
    Evaluate baseline predictions (BEFORE Incremental Learning).
    """
    print("\n" + "=" * 70)
    print("PHASE B: Baseline Performance Measurement (Before Learning)")
    print("=" * 70)
    
    from Predict import implement_recommend
    predictor = implement_recommend()
    
    results = []
    sample_df = ground_truth_df.groupby('user_id').head(6).reset_index(drop=True)
    
    print(f"\n  Predicting for {len(sample_df)} (user, product) pairs...\n")
    
    for idx, row in sample_df.iterrows():
        uid = row['user_id']
        asin = row['parent_asin']
        is_positive = row['is_positive']
        
        try:
            prediction = predictor.predict(uid, asin)
        except Exception as e:
            print(f"  [WARN] Prediction error for ({uid}, {asin}): {e}")
            prediction = None
        
        results.append({
            "user_id": uid,
            "parent_asin": asin,
            "ground_truth": bool(is_positive),
            "prediction": prediction,
            "correct": prediction == is_positive if prediction is not None else False,
        })
    
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
        "phase": "BEFORE",
        "total_predictions": len(valid_results),
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "details": results,
    }
    
    with open(RESULTS_BEFORE, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    print(f"\n  Baseline Results (BEFORE learning):")
    print(f"     Accuracy  : {accuracy:.1f}%")
    print(f"     Precision : {precision:.1f}%")
    print(f"     Recall    : {recall:.1f}%")
    print(f"     Saved -> {RESULTS_BEFORE}")
    
    return summary


def phase_c_incremental_learning():
    """Run offline Incremental Learning pipeline."""
    print("\n" + "=" * 70)
    print("PHASE C: Incremental Learning Execution (EWC Fine-Tuning)")
    print("=" * 70)
    
    from Simulator.offline_incremental import run_offline_incremental
    
    result = run_offline_incremental(INTERACTIONS_CSV)
    
    if result is None:
        print("  [ERROR] Incremental Learning failed!")
        return False
    
    print(f"\n  Incremental Learning successfully completed!")
    print(f"     Metrics: {result['metrics']}")
    return True


def phase_d_measure_after(ground_truth_df):
    """
    Reload updated model and evaluate predictions for the same evaluation set.
    """
    print("\n" + "=" * 70)
    print("PHASE D: Post-Learning Performance Measurement (After Learning)")
    print("=" * 70)
    
    if 'Predict' in sys.modules:
        del sys.modules['Predict']
    from Predict import implement_recommend
    predictor = implement_recommend()
    
    results = []
    sample_df = ground_truth_df.groupby('user_id').head(6).reset_index(drop=True)
    
    print(f"\n  Re-evaluating predictions for {len(sample_df)} (user, product) pairs...\n")
    
    for idx, row in sample_df.iterrows():
        uid = row['user_id']
        asin = row['parent_asin']
        is_positive = row['is_positive']
        
        try:
            prediction = predictor.predict(uid, asin)
        except Exception as e:
            print(f"  [WARN] Prediction error for ({uid}, {asin}): {e}")
            prediction = None
        
        results.append({
            "user_id": uid,
            "parent_asin": asin,
            "ground_truth": bool(is_positive),
            "prediction": prediction,
            "correct": prediction == is_positive if prediction is not None else False,
        })
    
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
    
    print(f"\n  Post-Learning Results (AFTER learning):")
    print(f"     Accuracy  : {accuracy:.1f}%")
    print(f"     Precision : {precision:.1f}%")
    print(f"     Recall    : {recall:.1f}%")
    print(f"     Saved -> {RESULTS_AFTER}")
    
    return summary


def phase_e_comparison(before_summary, after_summary):
    """Print metric comparison report for Before vs After."""
    print("\n" + "=" * 70)
    print("PHASE E: Before vs After Performance Comparison")
    print("=" * 70)
    
    print(f"\n  {'Metric':<20} | {'BEFORE (Cold Start)':<22} | {'AFTER (Incremental)':<22} | {'Delta':<15}")
    print("  " + "-" * 85)
    
    metrics = ['accuracy', 'precision', 'recall']
    labels = ['Accuracy', 'Precision', 'Recall']
    
    for metric, label in zip(metrics, labels):
        before_val = before_summary.get(metric, 0)
        after_val = after_summary.get(metric, 0)
        delta = after_val - before_val
        
        if delta > 0:
            delta_str = f"+{delta:.1f}%"
        elif delta < 0:
            delta_str = f"{delta:.1f}%"
        else:
            delta_str = "0.0%"
        
        print(f"  {label:<20} | {before_val:>18.1f}%   | {after_val:>18.1f}%   | {delta_str:<15}")
    
    print("  " + "-" * 85)
    
    print(f"\n  Per-User Detailed Evaluation Breakdown:")
    print(f"  {'User ID':<30} | {'Before (correct/total)':<22} | {'After (correct/total)':<22}")
    print("  " + "-" * 80)
    
    all_users = sorted(set(d['user_id'] for d in before_summary.get('details', [])))
    
    for uid in all_users:
        before_user = [d for d in before_summary.get('details', []) if d['user_id'] == uid]
        after_user = [d for d in after_summary.get('details', []) if d['user_id'] == uid]
        
        b_correct = sum(1 for d in before_user if d.get('correct', False))
        b_total = len(before_user)
        a_correct = sum(1 for d in after_user if d.get('correct', False))
        a_total = len(after_user)
        
        print(f"  {uid:<30} | {b_correct:>6}/{b_total:<6}             | {a_correct:>6}/{a_total:<6}")
    
    print("\n" + "=" * 70)
    
    acc_delta = after_summary.get('accuracy', 0) - before_summary.get('accuracy', 0)
    if acc_delta > 0:
        print("  SUMMARY: Incremental Learning improved recommendation accuracy for new users.")
        print(f"     Accuracy increased by {acc_delta:.1f}% after fine-tuning on new interaction data.")
    elif acc_delta == 0:
        print("  SUMMARY: Accuracy remained unchanged.")
    else:
        print("  SUMMARY: Accuracy decreased -- consider tuning EWC lambda or learning rate.")
    
    print("=" * 70 + "\n")


def main():
    """Run full simulation pipeline from end to end."""
    start_time = time.time()
    
    print("\n" + "=" * 70)
    print("INCREMENTAL LEARNING SIMULATION DEMO")
    print("Demonstrating model adaptability to new user interactions using EWC")
    print("=" * 70)
    
    interactions_df, ground_truth_df = phase_a_generate_data()
    before_summary = phase_b_measure_before(ground_truth_df)
    success = phase_c_incremental_learning()
    
    if not success:
        print("\nDemo execution stopped due to Incremental Learning failure.")
        return
    
    after_summary = phase_d_measure_after(ground_truth_df)
    phase_e_comparison(before_summary, after_summary)
    
    total_time = time.time() - start_time
    print(f"  Total demo execution time: {total_time:.1f}s ({total_time/60:.1f} minutes)")
    print(f"  Results saved to directory: {OUTPUT_DIR}")
    print()


if __name__ == "__main__":
    main()
