"""
Backward-Bending Labor Supply Curve Analysis
=============================================
Demonstrates income and substitution effects in labor supply

For utility U = I × H where I = I₀ + W × t, H = 16 - t

The optimal work hours: t* = 8 - I₀/(2W)

Key insight:
- When I₀ is HIGH relative to W, the income effect dominates
- As W increases, workers can afford more leisure (reduce work hours)
- This creates a BACKWARD-BENDING supply curve
"""

import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import minimize_scalar

# Set Chinese font
plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'Arial']
plt.rcParams['axes.unicode_minus'] = False


def utility(t, W, base_income):
    """Calculate utility U = I * H"""
    I = base_income + W * t  # Income
    H = 16 - t                # Leisure
    U = I * H         # Adding a quadratic term for demonstration
    return -U  # Negative for minimization


def find_optimal_t(W, base_income):
    """Find optimal work hours for given wage"""
    result = minimize_scalar(
        lambda t: utility(t, W, base_income),
        bounds=(0, 16),
        method='bounded'
    )
    return result.x


def analytical_optimal_t(W, base_income):
    """
    Analytical solution: t* = 8 - base_income/(2W)
    This shows the relationship clearly:
    - dt*/dW = base_income/(2W²) > 0 always (but decreasing rate)
    """
    return 8 - base_income / (2 * W)


def generate_supply_curves_comparison():
    """
    Generate multiple supply curves with different base incomes
    to demonstrate forward vs backward-bending behavior
    """
    W_values = np.linspace(10, 1000, 200)
    
    # Different scenarios
    scenarios = [
        {'base_income': 100, 'label': 'Low Base Income (I₀=100)', 'color': 'blue'},
        {'base_income': 500, 'label': 'Medium Base Income (I₀=500)', 'color': 'green'},
        {'base_income': 2000, 'label': 'High Base Income (I₀=2000)', 'color': 'red'},
        {'base_income': 5000, 'label': 'Very High Base Income (I₀=5000)', 'color': 'purple'},
    ]
    
    results = []
    for scenario in scenarios:
        base_income = scenario['base_income']
        t_values = [find_optimal_t(W, base_income) for W in W_values]
        t_analytical = [analytical_optimal_t(W, base_income) for W in W_values]
        
        results.append({
            'W': W_values,
            't_numerical': np.array(t_values),
            't_analytical': np.array(t_analytical),
            'base_income': base_income,
            'label': scenario['label'],
            'color': scenario['color']
        })
    
    return results


def demonstrate_backward_bending():
    """
    Create a scenario that clearly shows backward-bending
    by using HIGH base income in HIGH wage range
    """
    # For backward bending, we need high base income
    # Let's use a piecewise base income that increases with wealth
    
    W_low = np.linspace(10, 200, 50)
    W_high = np.linspace(200, 1000, 100)
    
    # Scenario 1: Constant high base income
    base_income_high = 3000
    t_low = [find_optimal_t(W, 100) for W in W_low]  # Start with low base
    t_high = [find_optimal_t(W, base_income_high) for W in W_high]  # High base for rich
    
    W_combined = np.concatenate([W_low, W_high])
    t_combined = np.concatenate([t_low, t_high])
    
    return W_combined, t_combined


def plot_comparison(results, save_path='supply_curve_comparison.png'):
    """Plot multiple supply curves with different base incomes"""
    
    fig, axes = plt.subplots(1, 2, figsize=(16, 6))
    
    # Left plot: All curves together
    ax1 = axes[0]
    for result in results:
        ax1.plot(result['t_numerical'], result['W'], 
                linewidth=2.5, label=result['label'], color=result['color'])
    
    ax1.set_xlabel('Work Hours (t)', fontsize=13, fontweight='bold')
    ax1.set_ylabel('Wage Rate (W)', fontsize=13, fontweight='bold')
    ax1.set_title('Labor Supply Curves with Different Base Incomes', 
                  fontsize=14, fontweight='bold', pad=15)
    ax1.legend(fontsize=10, loc='lower right')
    ax1.grid(True, alpha=0.3, linestyle='--')
    ax1.set_xlim(0, 12)
    
    # Add annotation explaining the curves
    ax1.text(0.02, 0.98, 
            'Formula: t* = 8 - I₀/(2W)\n\n' +
            'Higher I₀ → Lower t* at high W\n' +
            '(Income effect dominates)',
            transform=ax1.transAxes, fontsize=10, 
            verticalalignment='top',
            bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.7))
    
    # Right plot: Focus on slope (dt/dW)
    ax2 = axes[1]
    for result in results:
        W = result['W']
        t = result['t_numerical']
        # Calculate discrete derivative
        dt_dW = np.gradient(t, W)
        ax2.plot(W, dt_dW, linewidth=2.5, 
                label=result['label'], color=result['color'])
    
    ax2.axhline(y=0, color='black', linestyle='--', linewidth=1, alpha=0.5)
    ax2.set_xlabel('Wage Rate (W)', fontsize=13, fontweight='bold')
    ax2.set_ylabel('∂t/∂W (Slope of Supply Curve)', fontsize=13, fontweight='bold')
    ax2.set_title('Labor Supply Elasticity: Rate of Change', 
                  fontsize=14, fontweight='bold', pad=15)
    ax2.legend(fontsize=10, loc='upper right')
    ax2.grid(True, alpha=0.3, linestyle='--')
    
    # Add annotation
    ax2.text(0.02, 0.02, 
            '∂t/∂W > 0: Forward-bending\n' +
            '∂t/∂W < 0: Backward-bending\n' +
            '∂t/∂W ≈ 0: Vertical (inelastic)',
            transform=ax2.transAxes, fontsize=10, 
            verticalalignment='bottom',
            bbox=dict(boxstyle='round', facecolor='lightblue', alpha=0.7))
    
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    print(f"✓ Comparison figure saved to: {save_path}")
    plt.show()


def analyze_backward_bending_region():
    """
    Mathematical analysis: When does dt*/dW < 0?
    
    From t* = 8 - I₀/(2W), we have:
    dt*/dW = I₀/(2W²) > 0 always!
    
    So with THIS utility function (U = I × H), we CANNOT get 
    true backward-bending in the traditional sense.
    
    However, we can get NEARLY FLAT curves (approaching vertical)
    when base income is very high relative to wage.
    """
    print("\n" + "="*70)
    print("MATHEMATICAL ANALYSIS: Backward-Bending Labor Supply")
    print("="*70)
    print("\nUtility Function: U = I × H = (I₀ + W×t) × (16 - t)")
    print("\nOptimal Solution: t* = 8 - I₀/(2W)")
    print("\nDerivative: dt*/dW = I₀/(2W²)")
    print("\n" + "-"*70)
    print("KEY FINDING: dt*/dW > 0 always (for positive I₀ and W)")
    print("\nThis means:")
    print("  • The supply curve ALWAYS slopes UPWARD")
    print("  • But slope decreases as W increases (convex curve)")
    print("  • With high I₀, curve becomes nearly VERTICAL")
    print("  • This represents very LOW elasticity, but NOT backward-bending")
    print("-"*70)
    
    print("\n" + "="*70)
    print("TO GET TRUE BACKWARD-BENDING, we need different utility:")
    print("="*70)
    print("\nExample: U = I^α × H^β with α < β (prefer leisure over income)")
    print("Or: U = I × H - γ×t² (convex disutility of work)")
    print("\nWith current U = I × H:")
    print("  → Workers ALWAYS increase hours when wage rises")
    print("  → But increase rate SLOWS DOWN at high wages")
    print("="*70 + "\n")
    
    # Show numerical example
    base_incomes = [100, 500, 2000, 5000]
    wages = [50, 100, 500, 1000]
    
    print("\nNumerical Examples:")
    print("-"*70)
    print(f"{'Base Income (I₀)':<20} {'Wage (W)':<12} {'Optimal t*':<15} {'∂t*/∂W':<15}")
    print("-"*70)
    
    for I0 in base_incomes:
        for W in wages:
            t_star = 8 - I0 / (2 * W)
            dt_dW = I0 / (2 * W**2)
            print(f"{I0:<20} {W:<12} {t_star:<15.4f} {dt_dW:<15.6f}")
        print()


def main():
    print("="*70)
    print("BACKWARD-BENDING LABOR SUPPLY CURVE ANALYSIS")
    print("="*70)
    
    # Mathematical analysis
    analyze_backward_bending_region()
    
    # Generate comparison curves
    print("\nGenerating supply curves with different base incomes...")
    results = generate_supply_curves_comparison()
    
    # Show key statistics
    print("\nKey Statistics:")
    print("-"*70)
    for result in results:
        I0 = result['base_income']
        t_values = result['t_numerical']
        W_values = result['W']
        
        print(f"\n{result['label']}:")
        print(f"  Work hours at W=10:   {t_values[0]:.4f}")
        print(f"  Work hours at W=1000: {t_values[-1]:.4f}")
        print(f"  Change in hours:      {t_values[-1] - t_values[0]:.4f}")
        print(f"  Max work hours:       {t_values.max():.4f}")
        print(f"  Min work hours:       {t_values.min():.4f}")
    
    # Plot comparison
    print("\n" + "-"*70)
    print("Creating comparison plots...")
    plot_comparison(results)
    
    print("\n" + "="*70)
    print("CONCLUSION:")
    print("="*70)
    print("With U = I × H, we get UPWARD-SLOPING curves for all base incomes.")
    print("Higher base income makes the curve STEEPER at low wages,")
    print("but FLATTER at high wages (lower elasticity).")
    print("\nTo observe TRUE backward-bending, consider:")
    print("  1. Different utility functions (e.g., U = I^0.3 × H^0.7)")
    print("  2. Non-linear preferences")
    print("  3. Target income models")
    print("="*70)


if __name__ == "__main__":
    main()
