"""
Labor Supply Curve Optimization
================================
Utility Function: U = I * H
where:
  I = 100 + W * t  (Income: base income + wage * work hours)
  H = 16 - t       (Leisure hours)
  t = work hours (variable to optimize, range [0, 16])
  W = wage rate (parameter)

Goal: Find optimal t that maximizes U for different W values
Then plot the labor supply curve (t, W)
"""

import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import minimize_scalar

# Set Chinese font for matplotlib (optional, for better display)
plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'Arial']
plt.rcParams['axes.unicode_minus'] = False

def utility(t, W, base_income=100):
    """
    Calculate utility U = I * H
    
    Parameters:
    -----------
    t : float
        Work hours (0 to 16)
    W : float
        Wage rate
    base_income : float
        Base (unearned) income
        
    Returns:
    --------
    float : Utility value (negative for minimization)
    """
    I = base_income + W * t  # Income
    H = 16 - t                # Leisure hours
    U = I * H
    return -U  # Negative because we minimize (to maximize U)


def find_optimal_t(W, base_income=100):
    """
    Find the optimal work hours t that maximizes utility for given wage W
    
    Parameters:
    -----------
    W : float
        Wage rate
    base_income : float
        Base income
        
    Returns:
    --------
    dict : Contains optimal t, utility value, and optimization result
    """
    # Use scipy's minimize_scalar for bounded optimization
    result = minimize_scalar(
        lambda t: utility(t, W, base_income),
        bounds=(0, 16),
        method='bounded'
    )
    
    optimal_t = result.x
    optimal_U = -result.fun  # Convert back to positive
    
    return {
        't': optimal_t,
        'U': optimal_U,
        'I': base_income + W * optimal_t,
        'H': 16 - optimal_t,
        'success': result.success
    }


def generate_supply_curve(W_min=10, W_max=1000, W_step=5, base_income=100):
    """
    Generate labor supply curve data points
    
    Parameters:
    -----------
    W_min : float
        Minimum wage rate
    W_max : float
        Maximum wage rate
    W_step : float
        Step size for wage rate
    base_income : float
        Base income
        
    Returns:
    --------
    tuple : (wage_values, work_hours, utilities)
    """
    W_values = np.arange(W_min, W_max + W_step, W_step)
    t_values = []
    U_values = []
    
    for W in W_values:
        result = find_optimal_t(W, base_income)
        if result['success']:
            t_values.append(result['t'])
            U_values.append(result['U'])
        else:
            print(f"Warning: Optimization failed for W={W}")
            t_values.append(np.nan)
            U_values.append(np.nan)
    
    return W_values, np.array(t_values), np.array(U_values)


def plot_supply_curve(W_values, t_values, save_path=None):
    """
    Plot the labor supply curve
    
    Parameters:
    -----------
    W_values : array
        Wage rate values
    t_values : array
        Optimal work hours for each wage
    save_path : str, optional
        Path to save the figure
    """
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Plot the supply curve
    ax.plot(t_values, W_values, 'b-', linewidth=2, label='Labor Supply Curve')
    ax.scatter(t_values[::10], W_values[::10], c='red', s=50, zorder=5, alpha=0.6)
    
    ax.set_xlabel('Work Hours (t)', fontsize=12, fontweight='bold')
    ax.set_ylabel('Wage Rate (W)', fontsize=12, fontweight='bold')
    ax.set_title('Labor Supply Curve: Optimal Work Hours vs Wage Rate', 
                 fontsize=14, fontweight='bold', pad=20)
    ax.grid(True, alpha=0.3, linestyle='--')
    ax.legend(fontsize=11)
    
    # Add annotations
    ax.text(0.02, 0.98, f'Utility: U = I × H\nI = 100 + W × t\nH = 16 - t',
            transform=ax.transAxes, fontsize=10, verticalalignment='top',
            bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        print(f"Figure saved to: {save_path}")
    
    plt.show()


def main():
    """
    Main function to run the analysis
    """
    print("=" * 60)
    print("Labor Supply Curve Analysis")
    print("=" * 60)
    print("\nUtility Function: U = I × H")
    print("  I = 100 + W × t  (Income)")
    print("  H = 16 - t       (Leisure)")
    print("  t ∈ [0, 16]      (Work hours)\n")
    
    # Generate supply curve data
    print("Generating supply curve data...")
    W_values, t_values, U_values = generate_supply_curve(
        W_min=10, 
        W_max=1000, 
        W_step=5,
        base_income=100
    )
    
    # Display some sample results
    print("\nSample Results:")
    print("-" * 60)
    print(f"{'Wage (W)':<12} {'Optimal t':<12} {'Income (I)':<12} {'Utility (U)':<12}")
    print("-" * 60)
    
    sample_indices = [0, len(W_values)//4, len(W_values)//2, 3*len(W_values)//4, -1]
    for idx in sample_indices:
        W = W_values[idx]
        t = t_values[idx]
        I = 100 + W * t
        U = U_values[idx]
        print(f"{W:<12.2f} {t:<12.4f} {I:<12.2f} {U:<12.2f}")
    
    print("-" * 60)
    print(f"\nTotal data points: {len(W_values)}")
    print(f"Work hours range: [{t_values.min():.4f}, {t_values.max():.4f}]")
    print(f"Utility range: [{U_values.min():.2f}, {U_values.max():.2f}]")
    
    # Plot the curve
    print("\nPlotting labor supply curve...")
    plot_supply_curve(W_values, t_values, save_path='labor_supply_curve.png')
    
    print("\n✓ Analysis complete!")


if __name__ == "__main__":
    main()
