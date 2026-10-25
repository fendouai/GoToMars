# 真实发动机目录：资料口径与模型假设

核对日期：2026-10-25。首批 15 型参考配置，不是全球发动机完整数据库，不承诺当前生产/服役状态。版本、工作点与资料时间保留在每条记录的 provenance 中。

## 数据原则

1. 优先使用制造商、NASA、DLR 和研发相关技术论文。
2. 不把不同型号、不同年份和不同推力档位混用为一个“最佳参数”。
3. published 中只写本次资料能够支持的字段。缺失字段在界面写“未逐项核实”，模型估值用 ≈ 标记，不宣称该参数从未公开。
4. 含泵、安装支架、电源等系统的质量口径与发动机本体质量不同，分开说明。
5. 游戏成本、标准安装接口、程序化外形、未核实的控制参数和点火次数均不是真实硬件保证。当前气压插值也不是完整发动机工况图。
6. 部分原始 PDF/社交页面目前无法直接访问，使用可检索的原始资料快照或研发机构作者论文转引，并明确记录访问限制。

## 来源与录入口径

| 发动机 | 采用的公开记录 | 来源与限制 |
|---|---|---|
| Merlin 1D | 海平面 845 kN | [SpaceX Falcon 9](https://www.spacex.com/vehicles/falcon-9/)、[2025 用户手册](https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf)。本次未逐项核实的真空性能、比冲、质量与几何作为模型估计。 |
| Merlin Vacuum | 真空 981 kN | 同一 SpaceX 页面第二级口径；不混入早期 914 kN 等版本。其他未核实字段单独标记。 |
| Raptor 3 | 2024 公告本体 1525 kg；文献转引 280 tf、350 s、含箭上配套 1720 kg | [SpaceX 原帖](https://x.com/SpaceX/status/1819772716339339664)、[DLR 作者研究](https://doi.org/10.1007/s12567-025-00625-8)。原帖当前 403，按研究转引录入；350 s 没有强行标成已核实的海平面或真空比冲。模型安装质量用 1720 kg。 |
| BE-4 | 官网标称 2846 kN、最低 978 kN | [Blue Origin Engines](https://www.blueorigin.com/engines)。官网当前页面没有在推力条目明确环境；模型将标称推力放在海平面，真空值、比冲、质量为估计。 |
| BE-3U | 890 kN / 445 kN 调节工作范围 | 同一 Blue Origin 页面，当前上面级口径；其余未核实值为模型补全。 |
| BE-7 | 44.5 kN / 8.9 kN | 同一 Blue Origin 页面，按月面着陆任务解释环境；不用于推导不存在的厂家比冲或干重。 |
| RS-25 | SLS 109% 档位约 2279 kN 真空推力、约 3.52 t 重量 | [NASA RS-25](https://www.nasa.gov/reference/space-launch-system-rs-25-core-stage-engine/)、[2026 SLS 参考手册](https://www.nasa.gov/wp-content/uploads/2026/01/sls-5558-artemis-ii-sls-reference-guide-final-review-508-012026.pdf)。其他字段在此版中作为未逐项核实的参考估计。 |
| RL10C-1 | 22,890 lbf、449.7 s、420 lb、57 in 喷管 | [L3Harris 2024 规格表](https://www.l3harris.com/sites/default/files/2024-07/l3harris-ar-rl10-spec-sheet.pdf)。按该表已索引快照核对，原链接当前可能 404。SI 换算保留精度。 |
| RL10B-2 | 表格与 RL10C-2-1 合列：24,750 lbf、465.5 s、664 lb、84.5 in | 同一 L3Harris 表的合列口径，不混入别年 466.5 s 等值。 |
| Vinci | 2020 表 180 kN 工作点、457.2 s、喷口 1.84 m | [ArianeGroup 规格表快照](https://arianegroup.preprod.sweetpunk.io/wp-content/uploads/2020/06/VINCI_2020_04_DS_EN_Eng_Web.pdf)、[DLR 试验设施](https://www.dlr.de/en/ra/research-transfer/research-and-test-infrastructure/test-benches-for-space-propulsion/high-altitude-simulation-test-bench-p4/test-position-p4.1)。另一 130 kN 工作点用于模型节流近似，不宣称是硬件节流极限。 |
| Vulcain 2.1 | 2020 表：1371 kN 真空、432 s、喷口 2.1 m | [ArianeGroup 规格表快照](https://arianegroup.preprod.sweetpunk.io/wp-content/uploads/2020/06/VULCAIN2.1_2020_04_PS_EN_Web.pdf)。旧 PDF 访问不稳定，不把后续年份额定值混入此配置。 |
| YF-100 | 120 吨级基础型，双机表项 2400 kN 折算单机 1200 kN，2942 m/s 比冲换算约 300 s | [研制相关论文](https://jdse.bit.edu.cn/sktcxb/cn/article/doi/10.15982/j.issn.2096-9287.2021.20210003?viewType=HTML)、[发动机调节能力表](https://cdn.sciengine.com/doi/pdf/2F912114BA204049BADD47DDB2E98B44)。不是 YF-100K/N。 |
| YF-115 | 选定文献表：180 kN（真空）、3322.9 m/s、83% 调节能力 | 同一调节能力文献。比冲除以 g0 转为秒；不声称是后续 B 型或所有版本的统一规格。 |
| Rutherford SL | 2020 升级公告：5600 lbf、35 kg 本体，文中比冲 311 s | [Rocket Lab 公告](https://rocketlabcorp.com/updates/rocket-lab-increases-electron-payload-capacity-enabling-interplanetary-missions-and-reusability/)。311 s 未在界面作为直接核实的海平面字段；电泵配套质量为每台 80 kg 的游戏假设。 |
| Rutherford Vacuum | 同一公告：5800 lbf、343 s；家族本体质量口径 35 kg | 单独真空型质量差异未核实，保留说明。海平面性能、控制、配套电源与几何为估计。 |

## 单位与场景边界

- 1 lbf = 4.4482216152605 N；1 lb = 0.45359237 kg；1 in = 0.0254 m。
- 以 m/s 表示的有效排气速度，除以 9.80665 m/s² 后转换为秒制比冲。
- 厂商参数用于其明确的型号和资料口径。不同厂家的部件能在游戏内组合，不代表真实安装、电气、推进剂供给或认证兼容。
- 本版三类推进剂采用统一的简化混合密度与混合比；没有逐型号化学平衡和泵工况计算。
- 游戏中的“点火次数、摆角、最低节流”等未被 published 支持时，是明确的游戏约束。即使某字段有公开参考，也没有完整复刻起动序列、部件寿命和环境资格试验。

机器可读数据见 `public/data/engine-catalog.json`。修改代码目录后重新导出，保持这份公开数据与 `engine-catalog.ts` 一致。
