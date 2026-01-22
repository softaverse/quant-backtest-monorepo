# 📈 Backtest Portfolio

這是一個專為複雜金融策略設計的美股投資組合回測平台。前端採用 **Next.js** 提供流暢的互動體驗，後端則利用 **FastAPI** 結合 Python 強大的科學計算生態（Pandas, VectorBT），支援機器學習模型整合與大規模矩陣運算。

---

## 🚀 核心回測功能

本系統針對長線投資與資產配置需求，提供以下核心功能：

* **多檔標的支援**：可同時回測 **1 至 50 檔** 美股標的。
* **彈性時間區間**：最小計算單位為 **「月」(Monthly)**，支援 1年、5年、10年、20年等自定義區間。
* **再平衡機制 (Rebalancing)**：
    * 支援**年度再平衡**（每年固定時間點）。
    * 自動將各資產權重恢復至使用者設定的初始比例。
* **投資策略**：採取「一旦買入，永不出場」策略，專注於資產配置與再平衡的長期影響。
* **專業績效指標**：
    * **資產曲線**：每月淨值變化的視覺化呈現。
    * **組合統計**：CAGR（年化複合增長率）、年化波動度、最大回撤 (MDD)。
    * **個股分析**：針對組合內每檔股票提供獨立的績效回報數據。

---

## 🧱 技術棧架構 (Tech Stack)

本專案採用 **pnpm Monorepo** 架構，確保前後端程式碼的高效管理與型別同步。

| 層級 | 技術工具 | 關鍵職責 |
| :--- | :--- | :--- |
| **Monorepo** | `pnpm` | 工作區 (Workspace) 管理、依賴共享與高效安裝。 |
| **前端** | `Next.js` (App Router) | 使用者介面、Recharts 圖表渲染、狀態管理。 |
| **後端** | `FastAPI` (Python) | 高性能 API 服務、機器學習模型推論、矩陣運算調度。 |
| **計算引擎** | `Pandas`, `VectorBT` | 向量化回測運算、金融指標計算。 |
| **資料庫** | `PostgreSQL` | 歷史股價緩存、使用者回測紀錄與設定存取。 |

---

## 📂 專案目錄結構

```text
/quant-backtest-monorepo
├── .pnpm-workspace.yaml      # pnpm Workspace 配置
├── package.json              # 根目錄全域 Script
├── /apps
│   └── /web                  # [Next.js] 前端介面
│       ├── /app              # 頁面路由與 Server Components
│       └── /components       # UI 元件與 Recharts 圖表
├── /services
│   └── /fastapi-api          # [FastAPI] 後端運算中心
│       ├── /core             # 核心回測引擎 (Vectorized Engine)
│       ├── /data             # 數據獲取 (yfinance/DB)
│       └── /routers          # API Endpoint 定義
└── /shared                   # 前後端共享定義 (Types/Schemas)
```

# ⚙️ 快速開始 (Quick Start)

## 1. 環境需求

確保您的環境已安裝：
- Node.js (v18+)
- pnpm (v9+)
- Python (3.10+)

## 2. 一鍵安裝（推薦）

```bash
# 安裝前端依賴 + 建立 Python 虛擬環境 + 安裝後端依賴
pnpm setup:all
```

## 3. 手動安裝

```bash
# 安裝前端與全局依賴
pnpm install

# 建立 Python 虛擬環境並安裝後端依賴
cd services/fastapi-api
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 4. 環境變數設定

複製 `.env.example` 並填入您的設定：

```bash
cp .env.example .env.local
```

需要設定的變數：
- `GOOGLE_CLIENT_ID` - Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth Client Secret
- `JWT_SECRET_KEY` - JWT 加密金鑰（可用 `openssl rand -hex 32` 產生）

## 5. 啟動開發伺服器

在專案根目錄執行一鍵啟動指令：

```bash
pnpm dev:all
```

- 前端介面：http://localhost:3000
- API 交互文件：http://localhost:8000/docs

---

## 🔐 Google OAuth 認證設定

本專案支援 Google 帳號登入。設定步驟：

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立專案或選擇現有專案
3. 啟用 Google+ API
4. 建立 OAuth 2.0 憑證（Web Application 類型）
5. 設定授權重新導向 URI：`http://localhost:8000/api/v1/auth/google/callback`
6. 將 Client ID 和 Client Secret 填入 `.env.local`

### 認證流程

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│   FastAPI API   │────▶│   SQLite DB     │
│   (Frontend)    │◀────│   (Backend)     │◀────│   (Storage)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       ▼
        │               ┌─────────────────┐
        └──────────────▶│  Google OAuth   │
                        └─────────────────┘
```

### 受保護路由

- `/options` - Options Backtest（需登入）
- `/` - 首頁（公開）

---

## 🐳 Docker 部署

### 一鍵啟動（推薦）

確保已安裝 Docker 與 Docker Compose，然後執行：

```bash
# 建構並啟動所有服務
docker compose up --build

# 背景運行
docker compose up --build -d
```

啟動後訪問：http://localhost

### 服務架構

```
┌─────────────────────────────────────────────────────┐
│                    Nginx (:80)                      │
│              (反向代理 & 負載均衡)                    │
└─────────────────────────────────────────────────────┘
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│   Next.js       │         │   FastAPI       │
│   (:3000)       │         │   (:8000)       │
│   前端介面       │         │   回測 API      │
└─────────────────┘         └─────────────────┘
```

### 常用指令

```bash
# 查看日誌
docker compose logs -f

# 停止服務
docker compose down

# 重新建構單一服務
docker compose build api
docker compose build web
```

### 快速腳本 (推薦)

使用 `./scripts/run.sh` 簡化 Docker 操作：

```bash
./scripts/run.sh up        # 啟動服務 (預設)
./scripts/run.sh down      # 停止服務
./scripts/run.sh restart   # 重啟服務
./scripts/run.sh logs      # 查看日誌
./scripts/run.sh status    # 查看狀態
./scripts/run.sh clean     # 清理 Docker 資源
```

啟動後訪問：http://localhost:1111

---

## ☁️ 雲端部署

### 推薦平台

| 平台 | 說明 | 指令 |
|------|------|------|
| **Fly.io** | 全球部署、低延遲 | `fly launch` |
| **Railway** | 一鍵部署、自動 CI/CD | 連結 GitHub |
| **DigitalOcean** | App Platform | 連結 GitHub |
| **AWS ECS** | 企業級擴展 | 使用 docker-compose |

### Fly.io 部署範例

```bash
# 安裝 Fly CLI
brew install flyctl

# 登入 & 部署
fly auth login
fly launch
```

---

# 📊 核心計算公式

專案核心引擎使用以下數學模型確保計算準確性：

年化複合增長率 (CAGR):$$CAGR = \left( \frac{V_{final}}{V_{initial}} \right)^{\frac{1}{t}} - 1$$

最大回撤 (Max Drawdown):$$MDD = \frac{Peak - Trough}{Peak}$$

年度再平衡:$$W_{t+1} = W_{initial} \cdot TotalValue_{t}$$

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
