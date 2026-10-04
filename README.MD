<div align="center">

  # OneClick Translator (易译) 📑⚡

  <p align="center">
    <a href="README.md"><b>简体中文</b></a> | <a href="README_EN.md">English</a>
  </p>

  <br>

  <p align="center">
    <b>网页非侵入式双轨极速伴读扩展</b><br>
    首屏文本毫秒级秒翻 ➔ 页面滚动增量追随 ➔ 生肉漫画图文异步 OCR，打造如原生贴纸般无感的伴读体验。
  </p>

  <!-- 徽章区 -->
  <p align="center">
    <img src="https://img.shields.io/badge/manifest-v3-success.svg" alt="Manifest V3">
    <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version">
    <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
    <img src="https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20Brave-orange.svg" alt="Platform">
    <img src="https://img.shields.io/badge/architecture-Shadow%20DOM%20%2B%20IndexedDB-blueviolet.svg" alt="Architecture">
  </p>

  <p align="center">
    <a href="https://github.com/your-username/one-click-translator/issues"><img src="https://img.shields.io/static/v1?color=1f2328&logo=github&logoColor=fff&label&message=Github%20Issues" alt="Issues"></a>
    <a href="https://github.com/your-username/one-click-translator/discussions"><img src="https://img.shields.io/static/v1?color=1f2328&logo=github&logoColor=fff&label&message=Github%20Discussions" alt="Discussions"></a>
  </p>

</div>

---

## 📸 运行预览

<div align="center">
  <h3>1. 网页文本即时秒翻 (单键按住 / 便签伴读)</h3>
  <video src="https://github.com/user-attachments/assets/4e054b75-d73b-41b7-b36d-813658edfb60" controls width="100%">
    您的浏览器不支持视频播放。
  </video>
  <p><i>▶ 演示：单键按住即时预览 ➔ 松手还原 ➔ 右键切换便签皮肤</i></p>
</div>

<br>

<div align="center">
  <h3>2. 生肉漫画图文识别 (🧪 实验性特性)</h3>
  <video src="https://github.com/user-attachments/assets/191fc69c-ba86-4462-a257-148526287376" controls width="100%">
    您的浏览器不支持视频播放。
  </video>
  <p><i>▶ 演示：视口切片提取 ➔ 气泡定位 ➔ 异步覆盖对白译文</i></p>
</div>
---

## ✨ 核心特性与架构亮点

📌 **双轨极速架构（首屏与生肉漫画双引擎分流）**：
- **常规网页文本（免 Key / 开箱即用）**：智能提取 DOM 物理坐标，直接走极速通道，毫秒级在原文上方生成贴纸，安装后直接可用。
- **生肉漫画 / 图片 OCR（视口智能追随）**：视口内图片切片脱敏并调用 OCR 引擎，自动计算对白坐标气泡，异步覆盖高质量译文。

🏷️ **伴读便签心智（多主题无痕贴纸库）**：
告别生硬的机器替换与格式错位。默认内置经典 **3M 黄色便签**、**冰蓝半透胶带**、**日系和纸**、**Dymo 凸字黑标**、**荧光笔记涂层**与 **AR 科技微标**。右键悬浮球即可毫秒级无缝换肤。

👁️ **非侵入式双模态交互（不破坏原生 DOM）**：
- **按住预览模式（Hold to View）**：长按快捷键（默认 `` ` ``）或按住悬浮球查看译文，松开即刻还原，保持原生页面原汁原味。
- **点击开关模式（Toggle Mode）**：一键常驻翻译图层，适合长篇深度精读。

🤖 **桌面伴读机器人悬浮球（状态可视化）**：
微型机器人常驻网页侧边，实时通过眨眼、点头与气泡吐字反馈识别进度（如：`文字翻译已完成 (18)`、`图片已翻译 (2张)`）。支持一键隐藏与位置自适应。

⚡ **增量滚动与本地智能二级缓存（IndexedDB + Memory）**：
基于 IndexedDB 构建离线持久化字典与内存快照。向下滑动页面时自动按需触发未翻译段落，重复滑入区域 0 请求复用缓存，杜绝重复流量消耗。

🌐 **全能 API 适配与中英国际化控制面板**：
弹窗设置原生支持多语种切换（切换中文/英文时面板自动联动）。图片 OCR 管道解耦，支持用户自备 OCR.space、Gemini Vision、DeepSeek、OpenAI 等主流服务 Key。


- **生肉漫画 / 图片 OCR（视口智能追随 - 🧪 实验阶段）**：视口内图片切片脱敏并调用 OCR 引擎，自动计算对白坐标气泡，异步覆盖高质量译文。目前该特性仍在积极迭代调优中，欢迎提交 Issue 反馈边缘排版案例。

> ⚠️ **关于图片/漫画翻译的实验性说明**：  
> 当前图片与漫画气泡 OCR 仍处于 **Beta 实验阶段**。在面对复杂背景艺术字、竖排拟声词或极端长条截屏时，检测定位与分词效果可能偶有波动。如遇排版错位或识别异常，可随时在 GitHub Issues 中附带截图反馈，我们将持续迭代优化。

---

## 🚀 下载与安装

进入项目的 [Releases 页面](https://github.com/your-username/one-click-translator/releases) 下载最新版本，提供两种极简安装方式：

### 方式 1：通过 `.crx` 离线包安装（推荐）

1. 下载最新发布的 `OneClickTranslator.crx` 文件。
2. 打开基于 Chromium 的浏览器（Chrome / Edge / Brave 等），在地址栏访问：
   chrome://extensions/
3. 打开页面右上角的 “开发者模式” (Developer mode) 开关。
4. 将下载的 OneClickTranslator.crx 文件直接拖入到该扩展页面中放手，在弹窗中点击“添加扩展程序”即可完成安装。

### 方式 2：通过源码 / ZIP 压缩包加载
1. 下载 Releases 中的 OneClickTranslator_v1.0.0.zip 并解压，或直接克隆代码仓库：
```text
Bash
git clone [https://github.com/your-username/one-click-translator.git](https://github.com/your-username/one-click-translator.git)
```

2. 打开浏览器扩展页面（chrome://extensions/），开启右上角 “开发者模式”。
3. 点击左上角的 “加载已解压的扩展程序” (Load unpacked)。
4. 选中解压出来的根目录（确保该目录下直接包含 manifest.json），点击确定即可运行。

### ⌨️ 快捷操作说明
触发方式,默认键位 / 操作,功能描述
单键快捷键,` (反引号 / 飘号),按住呼出翻译贴纸，松手即刻恢复原文（可在设置弹窗中修改）
全局快捷键,Alt + T (Mac: Option + T),全局切换翻译图层的显隐开关
桌面机器人,鼠标左键点击,切换当前页面的翻译层激活状态
桌面机器人,鼠标右键点击,弹出便签风格选择面板（实时切换 3M/胶带/和纸皮肤）

### 📦 项目结构
```text
Plaintext
one-click-translator/
├── manifest.json              # 扩展配置文件 (Manifest V3 生产规范)
├── background.js              # 后台 Service Worker (跨域请求代理与 API 调度)
├── content.js                 # 核心控制器 (生命周期总控、快捷键监听与增量流水线调度)
├── content.css                # 页面注入样式与贴纸主题样式库
├── core/                      # 核心解耦功能模块
│   ├── cache.js               # 缓存引擎 (IndexedDB + 内存二级映射)
│   ├── scanner.js             # 网页正文识别引擎 (提取 DOM 文本与 Range 真实物理坐标)
│   ├── translator.js          # 翻译中枢 (批量请求与错误熔断)
│   ├── overlay.js             # 贴纸蒙版渲染引擎 (自适应排版与类型安全防护)
│   └── manga-sanitizer.js     # 图像预处理与视口切片工具
├── popup/                     # 扩展弹窗控制台
│   ├── popup.html             # 弹窗结构 (支持 i18n 多语言标识)
│   ├── popup.js               # 模式切换、双语国际化与 API Key 本地持久化
│   └── popup.css              # 弹性卡片布局样式
├── lib/                       # 第三方纯 JS 工具库
│   └── idb-keyval.js          # IndexedDB 异步操作极简库
└── icons/                     # 插件全套高清图标 (16 / 32 / 48 / 128 / SVG)
```

### 📄 开源协议
本项目基于 MIT License 开源协议。仅供个人学习与外语阅读交流使用，不存储或传播任何网络内容。
