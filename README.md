# Webinar MVP — 仿直播研讨会平台

播放预录视频，搭配实时互动功能（自动聊天、CTA 弹窗、观众人数模拟），打造仿真直播体验。面向北美华人市场，界面语言为简体中文。

## 技术栈

- **框架：** Next.js 16 (App Router) + React 19 + TypeScript
- **样式：** Tailwind CSS v4
- **视频：** Video.js + HLS.js（Mux 托管）
- **数据库：** Supabase (Postgres)
- **支付：** Stripe Embedded Checkout
- **邮件：** SendGrid
- **部署：** Zeabur（容器化部署）

## 快速开始

```bash
# 安装依赖
npm install

# 配置环境变量（参考 .env.example 或向管理员索取）
cp .env.example .env.local

# 启动开发服务器
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看。

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 本地开发（端口 3000） |
| `npm run build` | 生产构建 |
| `npm start` | 启动生产服务器 |
| `npm run lint` | ESLint 检查 |

## 用户流程

```
首页 (/) → 注册 (弹窗) → 等候室 (/webinar/[id]/lobby) → 直播间 (/webinar/[id]/live) → 结束页 (/webinar/[id]/end)
```

## 项目文档

- `CLAUDE.md` — AI 协作指南与项目约束
- `docs/architecture.md` — 系统架构（持续更新）
- `docs/decisions.md` — 架构决策记录
- `SPEC.md` — 产品需求规格书
