# backward_bending_supply.py
import numpy as np
from scipy.optimize import minimize_scalar
import matplotlib.pyplot as plt

# ---------- 参数 ----------
T = 16.0        # 总可支配时间（小时/日或小时/周，单位一致即可）
M = 10         # 非劳动收入
alpha = 1     # 闲暇偏好强度，越大越偏好闲暇（可调整观察效果）
w_min, w_max = 0.1, 10000.0
n_w = 2000       # 工资网格密度

# ---------- 效用函数 ----------
def U_of_L(L, w, T=T, M=M, alpha=alpha):
    # L 必须在 (0,T)
    L = np.clip(L, 1e-9, T-1e-9)
    R = T - L
    C = M + w * L
    return np.log(C) + alpha * np.log(R)

def best_L_for_w(w):
    res = minimize_scalar(lambda L: -U_of_L(L, w),
                          bounds=(0.0, T),
                          method='bounded',
                          options={'xatol':1e-10,'maxiter':500})
    return float(res.x)

# ---------- 求解最优劳动供给 ----------
w_grid = np.linspace(w_min, w_max, n_w)
L_star = np.array([best_L_for_w(w) for w in w_grid])
R_star = T - L_star

# ---------- 识别后向弯曲区间（L 随 w 下降） ----------
dL_dw = np.gradient(L_star, w_grid)
backward_intervals = []
in_interval = False
start_w = None
for i, deriv in enumerate(dL_dw):
    if deriv < 0 and not in_interval:
        in_interval = True
        start_w = w_grid[i]
    if deriv >= 0 and in_interval:
        in_interval = False
        backward_intervals.append((start_w, w_grid[i]))
        start_w = None
if in_interval:
    backward_intervals.append((start_w, w_grid[-1]))

# ---------- 输出发现 ----------
print("检测到的后向弯曲区间（近似）:", backward_intervals)

# ---------- 可视化 ----------
plt.figure(figsize=(10,5))
plt.plot(w_grid, L_star, label='Optimal labor L*(w)', color='tab:blue')
plt.plot(w_grid, R_star, label='Optimal leisure R*(w)', color='tab:orange', linestyle='--')
plt.axvline(w_grid[np.argmax(L_star)], color='gray', linestyle=':', label='L 最大点对应工资')
for (a,b) in backward_intervals:
    plt.axvspan(a, b, color='red', alpha=0.12)

plt.xlabel('Wage rate w')
plt.ylabel('Hours')
plt.title(f'Backward-bending labor supply (u=lnC, v=alpha lnR), alpha={alpha}')
plt.legend()
plt.grid(True)
plt.xscale('linear')
plt.ylim(0, T)
plt.show()

# ---------- 可选：打印关键点 ----------
# 找到 L 的最大值及对应工资（拐点近似）
imax = np.argmax(L_star)
print(f"L 最大值 ≈ {L_star[imax]:.4f} 小时，对应工资 w ≈ {w_grid[imax]:.4f}")
