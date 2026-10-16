<h1 align="center">挑番 · Tiaofan</h1>

<p align="center"><strong>更清楚地找到下一部想看的动画。</strong><br>分季发现、来源明确的作品信息，以及随手可用的追番体验。</p>

<p align="center">
  <a href="https://anime.hubeiqiao.com"><strong>体验线上产品 →</strong></a>
  · <a href="#本地运行">本地运行</a>
  · <a href="docs/DEPLOYMENT.md">开发文档</a>
  · <a href="README.md">English</a>
</p>

<p align="center"><a href="https://github.com/hubeiqiao/tiaofan/actions/workflows/ci.yml"><img src="https://github.com/hubeiqiao/tiaofan/actions/workflows/ci.yml/badge.svg?branch=main" alt="源码检查工作流状态"></a></p>

<p align="center">整个网站通过 <strong>GPT Sites</strong> 构建，经历了多轮提示、实现、测试与迭代。<br><a href="docs/BUILT_WITH_GPT_SITES.md">了解构建过程</a></p>

<p align="center">
  <a href="docs/screenshots/desktop-catalog-en.jpg"><img src="docs/screenshots/desktop-catalog-en.jpg" width="62%" alt="线上产品英文桌面目录，包含分季导航和来源筛选"></a>
  &nbsp;
  <a href="docs/screenshots/narrow-catalog-en.jpg"><img src="docs/screenshots/narrow-catalog-en.jpg" width="26%" alt="真实窄浏览器窗口中的响应式双列目录"></a>
</p>

<p align="center"><sub>线上产品实拍 · 2026 年 10 月 · <a href="docs/screenshots/README.md">截图来源与素材权利</a><br>仓库示例使用虚构作品；窄屏图来自实际浏览器窗口，不代表真机测试。</sub></p>

## 发现作品，也了解依据

- **按季选片。** 浏览当季与上一季目录，筛选作品，在卡片与列表视图间切换。
- **看清信息来源。** 作品详情、评分与观看证据保留来源上下文。
- **接着看下一部。** 在线上产品中探索系列关系、发现推荐并管理观看状态。
- **用熟悉的语言阅读。** 中文、英文和日文界面，适配不同屏幕，支持浅色与深色主题。

## 本地运行

使用 **Node.js 24** 与 npm。

```sh
git clone https://github.com/hubeiqiao/tiaofan.git
cd tiaofan
npm ci
npm run dev
```

打开 **http://127.0.0.1:5173**。独立示例包含六部虚构作品与中性占位图，不需要生产凭据。登录、私人片单持久化和 AI 服务默认关闭。[接入自己的服务 →](docs/DEPLOYMENT.md)

## 项目结构

界面基于 **React + TypeScript**，应用运行时使用 **Vinext + Vite**，本地构建与部署集成采用 **Cloudflare Workers** 工具链。目录标准化、来源适配、导航与观看状态逻辑位于可复用的领域层。

| 目录 | 内容 |
| --- | --- |
| `app/`、`components/`、`hooks/` | 页面、HTTP/MCP 路由与交互界面 |
| `lib/`、`data/` | 领域逻辑、来源适配器与合成示例数据 |
| `scripts/`、`tests/` | 数据准备、回归测试与发布检查 |
| `docs/` | 开发部署、来源与维护说明 |

## 开发检查

```sh
npm run typecheck
npm test
npm run build
npm start
```

源码测试包含自动化回归测试和演示边界检查。最新结果见 [GitHub 工作流](https://github.com/hubeiqiao/tiaofan/actions/workflows/ci.yml)。测试范围、既有 lint 待清理项及两个有明确例外范围的开发工具安全公告见 [检查记录](docs/RELEASE_REVIEW.md)。

## 文档与参与

[部署说明](docs/DEPLOYMENT.md) · [数据来源](docs/DATA_SOURCES.md) · [GPT Sites 构建过程](docs/BUILT_WITH_GPT_SITES.md) · [参与贡献](CONTRIBUTING.md) · [安全说明](SECURITY.md)

欢迎反馈问题和提出具体改进。提交前请阅读贡献指南，不要在公开反馈中包含私人数据。

## 许可与内容

**源码公开，代码许可证待确认。** 二次开发、自部署等复用授权以所有者后续选择的许可证为准。第三方组件与截图素材适用各自的权利条件。仓库不包含生产数据集和私人账户数据。[许可状态](LICENSE-STATUS.md) · [第三方说明](THIRD_PARTY_NOTICES.md)

<p align="center">由 <a href="https://github.com/hubeiqiao">hubeiqiao</a> 使用 GPT Sites 创建。</p>
