/**
 * OneClickTranslator - Content Script (双轨极速架构完整版：首屏文本秒翻 + 页面向下滚动自动补翻 + 图片OCR异步追随)
 */

class ContentController {
  constructor() {
    this.isSiteEnabled = false;
    this.isActive = false;
    this.singleKeyShortcut = "`";
    this.keyMode = "hold";
    this.showFab = true;
    this.isAnalyzing = false;

    this.currentTheme = "3m"; // 默认 3M 便签风格
    this.menuEl = null;

    this.shadowHost = null;
    this.shadowRoot = null;
    this.overlayContainer = null;
    this.fabBtn = null;
    this.fabTip = null;

    this.cache = new window.TranslationCache();
    this.scanner = new window.DOMScanner();
    this.translator = new window.TranslatorEngine(this.cache);
    this.overlay = null;

    this.geminiApiKey = "";

    // 滚动防抖定时器与事件监听句柄
    this.scrollTimer = null;
    this.onWindowScroll = this.handleScroll.bind(this);

    this.init();
  }

  async init() {
    const currentDomain = window.location.hostname;
    const store = await chrome.storage.local.get([
      "enabled_domains",
      "custom_shortcut_key",
      "key_trigger_mode",
      "show_floating_button",
      "gemini_api_key",
      "ocrEngine",
      "apiKeys",
      "oct_sticker_theme"
    ]);

    const enabledDomains = store.enabled_domains || [];
    this.isSiteEnabled = enabledDomains.includes(currentDomain);
    this.singleKeyShortcut = store.custom_shortcut_key || "`";
    this.keyMode = store.key_trigger_mode || "hold";
    this.showFab = store.show_floating_button !== false;
    
    // 初始化贴纸风格（默认 3M 便签）
    this.currentTheme = store.oct_sticker_theme || "3m";
    this.applyTheme(this.currentTheme);

    // 兼容各 OCR 引擎 Key
    const engine = store.ocrEngine || "ocrspace";
    const keys = store.apiKeys || {};
    this.geminiApiKey = keys[engine] || store.gemini_api_key || "";

    this.initShadowDOM();
    this.overlay = new window.OverlayRenderer(this.overlayContainer);
    this.initMessageListener();
    this.initKeyListeners();
    this.updateFabState();

    console.log(`[OneClickTranslator] 站点 [${currentDomain}] 极速就绪 (按键: ${this.singleKeyShortcut} | 模式: ${this.keyMode} | 风格: ${this.currentTheme})`);
  }

  initShadowDOM() {
    if (document.getElementById("oct-shadow-host")) return;

    this.shadowHost = document.createElement("div");
    this.shadowHost.id = "oct-shadow-host";
    this.shadowHost.setAttribute("data-oct-root", "true");

    this.shadowRoot = this.shadowHost.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      .oct-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 2147483647;
      }
      .oct-hidden {
        display: none !important;
      }

      /* 漫画气泡贴纸 */
      .oct-manga-bubble {
        position: absolute;
        background: #ffffff;
        color: #000000;
        border: none;
        box-shadow: 0 0 12px 10px #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        font-family: "Comic Sans MS", "PingFang SC", "Microsoft YaHei", sans-serif;
        font-weight: 800;
        line-height: 1.4;
        padding: 4px 10px;
        border-radius: 12px;
        box-sizing: border-box;
        overflow: hidden;
        word-break: break-word;
        pointer-events: none;
        user-select: none;
        z-index: 2147483647;
      }

      .oct-keycap-wrapper {
        position: fixed;
        right: 22px;
        bottom: 80px;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
        z-index: 2147483647;
        pointer-events: auto;
      }
      .oct-keycap-wrapper.hide-fab {
        display: none !important;
      }

      /* 机器人吐出的状态对话气泡 */
      .oct-keycap-tip {
        background: rgba(15, 23, 42, 0.95);
        color: #38bdf8;
        border: 1px solid rgba(56, 189, 248, 0.4);
        padding: 6px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-weight: 600;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
        backdrop-filter: blur(6px);
        white-space: nowrap;
        opacity: 0;
        transform: translateY(8px) scale(0.95);
        transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: none;
        position: relative;
      }
      .oct-keycap-tip::after {
        content: "";
        position: absolute;
        bottom: -5px;
        right: 18px;
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 5px solid rgba(15, 23, 42, 0.95);
      }
      .oct-keycap-tip.show {
        opacity: 1;
        transform: translateY(0) scale(1);
      }

      /* 桌面圆角机器人按钮 */
      .oct-round-keycap {
        width: 50px;
        height: 48px;
        border-radius: 14px;
        background: linear-gradient(145deg, #1e293b, #0f172a);
        border: 2px solid #334155;
        box-shadow: 
          0 4px 0 #020617,
          0 6px 16px rgba(0, 0, 0, 0.45),
          inset 0 1.5px 0 rgba(255, 255, 255, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        user-select: none;
        transition: transform 0.12s ease, border-color 0.2s, box-shadow 0.2s;
        box-sizing: border-box;
      }
      .oct-round-keycap:hover {
        transform: translateY(-2px);
        border-color: #38bdf8;
        box-shadow: 0 6px 0 #020617, 0 0 16px rgba(56, 189, 248, 0.4);
      }
      .oct-round-keycap:active {
        transform: translateY(2px) !important;
        box-shadow: 0 1px 0 #020617 !important;
      }

      .oct-desk-bot {
        width: 36px;
        height: 36px;
        filter: drop-shadow(0 0 4px rgba(56, 189, 248, 0.3));
        transition: transform 0.2s ease;
      }

      .oct-round-keycap.active {
        border-color: #7dd3fc;
        background: linear-gradient(145deg, #0f172a, #0369a1);
        box-shadow: 0 4px 0 #020617, 0 0 18px rgba(56, 189, 248, 0.55);
      }
      .oct-round-keycap.active .oct-bot-body {
        stroke: #7dd3fc;
      }
      .oct-round-keycap.active .oct-bot-eye {
        fill: #ffffff;
        filter: drop-shadow(0 0 3px #ffffff);
      }

      .oct-round-keycap.loading {
        border-color: #f59e0b;
      }
      .oct-round-keycap.loading .oct-desk-bot {
        animation: oct-bot-nod 0.45s ease-in-out infinite alternate;
      }
      .oct-round-keycap.loading .oct-bot-mouth {
        animation: oct-mouth-talk 0.28s ease-in-out infinite alternate;
        transform-origin: 18px 21.9px;
      }

      @keyframes oct-mouth-talk {
        0% { transform: scaleY(0.8); opacity: 0.6; }
        100% { transform: scaleY(2.2); opacity: 1; }
      }

      @keyframes oct-bot-nod {
        0% { transform: translateY(0); }
        100% { transform: translateY(-1.5px); }
      }

      /* 风格库右键菜单 */
      .oct-style-menu {
        position: absolute;
        bottom: 58px;
        right: 0;
        width: 175px;
        background: rgba(15, 23, 42, 0.96);
        border: 1px solid rgba(56, 189, 248, 0.35);
        border-radius: 10px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(10px);
        padding: 6px;
        display: none;
        flex-direction: column;
        gap: 2px;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", sans-serif;
        user-select: none;
      }
      .oct-style-menu.show {
        display: flex;
        animation: oct-menu-in 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes oct-menu-in {
        from { opacity: 0; transform: translateY(6px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .oct-menu-title {
        font-size: 11px;
        color: #94a3b8;
        padding: 4px 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        margin-bottom: 4px;
        font-weight: 600;
        letter-spacing: 0.5px;
      }
      .oct-menu-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 10px;
        border-radius: 6px;
        color: #f1f5f9;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.12s ease;
      }
      .oct-menu-item:hover {
        background: rgba(56, 189, 248, 0.18);
        color: #38bdf8;
      }
      .oct-menu-item.active {
        color: #38bdf8;
        font-weight: 600;
        background: rgba(56, 189, 248, 0.12);
      }
      .oct-menu-item .oct-check {
        font-size: 12px;
        opacity: 0;
      }
      .oct-menu-item.active .oct-check {
        opacity: 1;
      }
    `;

    this.overlayContainer = document.createElement("div");
    this.overlayContainer.className = "oct-container oct-hidden";

    const fabWrapper = document.createElement("div");
    fabWrapper.className = "oct-keycap-wrapper";
    this.fabWrapper = fabWrapper;

    // 创建右键风格菜单
    this.menuEl = document.createElement("div");
    this.menuEl.className = "oct-style-menu";
    this.renderMenu();

    this.fabTip = document.createElement("div");
    this.fabTip.className = "oct-keycap-tip";

    this.fabBtn = document.createElement("div");
    this.fabBtn.className = "oct-round-keycap";
    this.fabBtn.title = "左键：切换翻译 | 右键：选择贴纸风格";

    this.fabBtn.innerHTML = `
      <svg class="oct-desk-bot" viewBox="0 0 36 28" fill="none">
        <rect class="oct-bot-accent" x="1" y="11" width="2" height="6" rx="1" fill="#38bdf8" />
        <rect class="oct-bot-accent" x="33" y="11" width="2" height="6" rx="1" fill="#38bdf8" />
        <rect class="oct-bot-body" x="3" y="2" width="30" height="24" rx="6" fill="#0f172a" stroke="#38bdf8" stroke-width="2" />
        <rect class="oct-bot-screen" x="6" y="5" width="24" height="13" rx="3.5" fill="#020617" stroke="#1e293b" stroke-width="1.2" />
        <rect class="oct-bot-eye" x="10" y="8" width="3.6" height="7" rx="1.8" fill="#38bdf8" />
        <rect class="oct-bot-eye" x="22.4" y="8" width="3.6" height="7" rx="1.8" fill="#38bdf8" />
        <rect class="oct-bot-mouth" x="13" y="21" width="10" height="1.8" rx="0.9" fill="#38bdf8" />
      </svg>
    `;
    
    // 左键点击切换翻译
    this.fabBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!this.isSiteEnabled) {
        alert("请先点击扩展图标，打开【在此网站启用】开关！");
        return;
      }
      this.closeMenu();
      this.toggle(!this.isActive);
    });

    // 右键点击呼出贴纸风格库菜单
    this.fabBtn.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleMenu();
    });

    // 点击页面任意外部空白区域自动收起菜单
    window.addEventListener("click", () => this.closeMenu());
    window.addEventListener("contextmenu", (e) => {
      if (this.shadowHost && !this.shadowHost.contains(e.target)) {
        this.closeMenu();
      }
    });

    fabWrapper.appendChild(this.menuEl);
    fabWrapper.appendChild(this.fabTip);
    fabWrapper.appendChild(this.fabBtn);

    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(this.overlayContainer);
    this.shadowRoot.appendChild(fabWrapper);
    document.documentElement.appendChild(this.shadowHost);
  }

  /**
   * 渲染右键风格选择项
   */
  renderMenu() {
    const THEMES = [
      { id: "3m", name: "📌 3M 黄色便签 (默认)" },
      { id: "tape", name: "🧊 冰蓝半透胶带" },
      { id: "washi", name: "🌿 日系和纸胶带" },
      { id: "dymo", name: "🏷️ Dymo 凸字黑标" },
      { id: "highlighter", name: "🖍️ 荧光笔记涂层" },
      { id: "hud", name: "💠 AR 科技微标" }
    ];

    this.menuEl.innerHTML = `<div class="oct-menu-title">选择贴纸风格</div>`;

    THEMES.forEach((t) => {
      const item = document.createElement("div");
      item.className = `oct-menu-item ${this.currentTheme === t.id ? "active" : ""}`;
      item.setAttribute("data-theme", t.id);
      item.innerHTML = `<span>${t.name}</span><span class="oct-check">✓</span>`;

      item.addEventListener("click", (e) => {
        e.stopPropagation();
        this.applyTheme(t.id);
        chrome.storage.local.set({ oct_sticker_theme: t.id });
        this.closeMenu();
        const shortName = t.name.split(" ")[1] || t.name;
        this.setFabTip(`✨ 贴纸已换：${shortName}`);
        setTimeout(() => {
          if (!this.isActive) this.setFabTip("");
        }, 2200);
      });

      this.menuEl.appendChild(item);
    });
  }

  /**
   * 切换并应用贴纸风格类名
   */
  applyTheme(themeId) {
    this.currentTheme = themeId;
    const allThemes = ["3m", "tape", "washi", "dymo", "highlighter", "hud"];
    allThemes.forEach((t) => document.documentElement.classList.remove(`oct-theme-${t}`));
    document.documentElement.classList.add(`oct-theme-${themeId}`);

    if (this.menuEl) {
      this.menuEl.querySelectorAll(".oct-menu-item").forEach((el) => {
        el.classList.toggle("active", el.getAttribute("data-theme") === themeId);
      });
    }
  }

  toggleMenu() {
    if (!this.menuEl) return;
    this.menuEl.classList.toggle("show");
  }

  closeMenu() {
    if (this.menuEl) this.menuEl.classList.remove("show");
  }

  getImageContentRect(img) {
    const elRect = img.getBoundingClientRect();
    const elW = elRect.width;
    const elH = elRect.height;
    const natW = img.naturalWidth || elW;
    const natH = img.naturalHeight || elH;
    const objectFit = window.getComputedStyle(img).objectFit;

    if (objectFit === "contain") {
      const scale = Math.min(elW / natW, elH / natH);
      const contentW = natW * scale;
      const contentH = natH * scale;
      return {
        left: elRect.left + (elW - contentW) / 2,
        top: elRect.top + (elH - contentH) / 2,
        width: contentW,
        height: contentH
      };
    }

    if (objectFit === "cover") {
      const scale = Math.max(elW / natW, elH / natH);
      const contentW = natW * scale;
      const contentH = natH * scale;
      return {
        left: elRect.left + (elW - contentW) / 2,
        top: elRect.top + (elH - contentH) / 2,
        width: contentW,
        height: contentH
      };
    }

    return { left: elRect.left, top: elRect.top, width: elW, height: elH };
  }

  updateFabState() {
    if (!this.fabWrapper) return;
    if (this.showFab && this.isSiteEnabled) {
      this.fabWrapper.classList.remove("hide-fab");
    } else {
      this.fabWrapper.classList.add("hide-fab");
    }
  }

  initMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "SET_SITE_ENABLED") {
        this.isSiteEnabled = message.enabled;
        this.updateFabState();
        if (!this.isSiteEnabled && this.isActive) this.toggle(false);
        sendResponse({ ok: true });
      } else if (message.action === "TOGGLE_TRANSLATION") {
        if (this.isSiteEnabled) this.toggle(!this.isActive);
        sendResponse({ isActive: this.isActive });
      } else if (message.action === "UPDATE_CONFIG") {
        this.geminiApiKey = message.apiKey || this.geminiApiKey;
        sendResponse({ ok: true });
      } else if (message.action === "UPDATE_SHORTCUT_KEY") {
        this.singleKeyShortcut = message.key.toLowerCase();
        sendResponse({ ok: true });
      } else if (message.action === "UPDATE_KEY_MODE") {
        this.keyMode = message.mode;
        sendResponse({ ok: true });
      } else if (message.action === "UPDATE_FAB_VISIBLE") {
        this.showFab = message.visible;
        this.updateFabState();
        sendResponse({ ok: true });
      }
      return true;
    });
  }

  initKeyListeners() {
    window.addEventListener("keydown", (e) => {
      if (!this.isSiteEnabled) return;

      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.isContentEditable);
      if (isInput || e.ctrlKey || e.altKey || e.metaKey) return;

      const key = e.key.toLowerCase();
      const isMatch = (key === this.singleKeyShortcut.toLowerCase()) || 
                      (this.singleKeyShortcut === "`" && (key === "·" || key === "`"));

      if (isMatch) {
        if (this.keyMode === "hold") {
          if (!this.isActive && !e.repeat) this.toggle(true);
        } else {
          if (!e.repeat) this.toggle(!this.isActive);
        }
      }
    }, true);

    window.addEventListener("keyup", (e) => {
      if (!this.isSiteEnabled) return;
      const key = e.key.toLowerCase();
      const isMatch = (key === this.singleKeyShortcut.toLowerCase()) || 
                      (this.singleKeyShortcut === "`" && (key === "·" || key === "`"));

      if (this.keyMode === "hold" && isMatch) {
        if (this.isActive) this.toggle(false);
      }
    }, true);
  }

  async toggle(show) {
    this.isActive = show;

    if (this.fabBtn) {
      this.fabBtn.classList.remove("loading", "error");
      this.fabBtn.classList.toggle("active", this.isActive);
      if (!this.isActive) {
        this.setFabTip("");
      }
    }

    if (this.isActive) {
      if (this.overlay) this.overlay.show();
      this.executeFullPipeline();
      window.addEventListener("scroll", this.onWindowScroll, { passive: true });
    } else {
      // 彻底关闭并隐藏外部所有寄生贴纸
      if (this.overlay) this.overlay.hide();
      window.removeEventListener("scroll", this.onWindowScroll);
      if (this.scrollTimer) {
        clearTimeout(this.scrollTimer);
        this.scrollTimer = null;
      }
    }
  }

  handleScroll() {
    if (!this.isActive) return;
    if (this.scrollTimer) clearTimeout(this.scrollTimer);

    this.scrollTimer = setTimeout(() => {
      this.translateNewVisibleText();
    }, 250);
  }

  /**
   * 增量滚动翻译：支持缓存复用渲染 + 未翻译文本请求
   */
  async translateNewVisibleText() {
    if (!this.isActive) return;

    const { textBlocks } = this.scanner.scan();
    if (!textBlocks || textBlocks.length === 0) return;

    const cachedMap = new Map();
    const pendingBlocks = [];

    textBlocks.forEach((block) => {
      const cached = this.cache.get(block.text);
      if (cached) {
        cachedMap.set(block.text, cached);
      } else {
        pendingBlocks.push(block);
      }
    });

    if (cachedMap.size > 0 && this.overlay) {
      this.overlay.render(textBlocks, cachedMap);
    }

    if (pendingBlocks.length > 0) {
      const textList = pendingBlocks.map((b) => b.text);
      this.translator.translateAll(textList).then((resultMap) => {
        if (!this.isActive) return;
        this.overlay.render(pendingBlocks, resultMap);
      }).catch((err) => {
        console.warn("[OneClickTranslator] 增量文本翻译异常:", err);
      });
    }
  }

  async executeFullPipeline() {
    const { textBlocks, imageBlocks } = this.scanner.scan();
    let textDoneCount = 0;
    let imgDoneCount = 0;

    const reportStatus = () => {
      let msg = "";
      if (textDoneCount > 0) {
        msg += `文字翻译已完成 (${textDoneCount})`;
      } else {
        msg += `文字未检测到`;
      }

      if (imgDoneCount > 0) {
        msg += `，图片已翻译 (${imgDoneCount}张)`;
      } else {
        msg += `，图片翻译未成功/0张`;
      }
      this.setFabStatus("active", msg);
    };

    if (textBlocks.length > 0) {
      this.setFabStatus("loading", "🤖 正在极速翻译网页文本...");
      const textList = textBlocks.map((b) => b.text);

      this.translator.translateAll(textList).then((resultMap) => {
        if (!this.isActive) return;
        this.overlay.render(textBlocks, resultMap);
        textDoneCount = textBlocks.length;
        reportStatus();
      }).catch((err) => {
        console.warn("[OneClickTranslator] 文本翻译异常:", err);
        this.setFabStatus("error", "🤖 文本翻译出错");
      });
    }

    if (imageBlocks.length > 0) {
      this.translateMangaPanel(imageBlocks[0], (count) => {
        imgDoneCount = count;
        if (this.isActive) reportStatus();
      });
    } else {
      if (textBlocks.length === 0) {
        this.setFabStatus("active", "🤖 页面无可译内容");
      }
    }
  }

  async translateMangaPanel(imgBlock, onFinished) {
    if (this.isAnalyzing) return;
    this.isAnalyzing = true;

    const imgEl = imgBlock.element;

    chrome.runtime.sendMessage({ action: "CAPTURE_SCREEN" }, (capRes) => {
      if (!capRes || !capRes.success || !capRes.dataUrl) {
        this.isAnalyzing = false;
        if (onFinished) onFinished(0);
        return;
      }

      const screenshot = new Image();
      screenshot.onload = () => {
        const dpr = window.devicePixelRatio || 1;
        const content = this.getImageContentRect(imgEl);

        const cropRect = {
          left: Math.max(0, content.left),
          top: Math.max(0, content.top),
          width: Math.min(content.width, window.innerWidth - Math.max(0, content.left)),
          height: Math.min(content.height, window.innerHeight - Math.max(0, content.top))
        };

        if (cropRect.width <= 30 || cropRect.height <= 30) {
          this.isAnalyzing = false;
          if (onFinished) onFinished(0);
          return;
        }

        const safeDataUrl = window.MangaSanitizer.process(screenshot, cropRect, dpr);

        chrome.runtime.sendMessage(
          {
            action: "TRANSLATE_IMAGE_AI",
            dataUrl: safeDataUrl, 
            targetLang: "zh-CN",
            apiKey: this.geminiApiKey
          },
          async (aiRes) => {
            this.isAnalyzing = false;
            if (!this.isActive) return;

            if (aiRes && aiRes.success && aiRes.regions && aiRes.regions.length > 0) {
              const textsToTranslate = aiRes.regions.map(r => r.original_text);
              const translatedMap = await this.translator.translateAll(textsToTranslate);
              
              const finalRegions = aiRes.regions.map(r => ({
                box_2d: r.box_2d,
                translation: translatedMap.get(r.original_text) || r.original_text
              }));

              this.renderBubblesOnCrop(cropRect, finalRegions);
              if (onFinished) onFinished(finalRegions.length);
            } else {
              if (onFinished) onFinished(0);
            }
          }
        );
      };
      screenshot.src = capRes.dataUrl;
    });
  }

  renderBubblesOnCrop(cropRect, regions) {
    this.overlayContainer.querySelectorAll(".oct-manga-bubble").forEach(b => b.remove());
    const fragment = document.createDocumentFragment();

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    regions.forEach((region) => {
      if (!region.translation || !region.box_2d) return;

      const [ymin, xmin, ymax, xmax] = region.box_2d;

      const bLeft = (cropRect.left + scrollX) + (xmin / 1000) * cropRect.width;
      const bTop = (cropRect.top + scrollY) + (ymin / 1000) * cropRect.height;
      const bWidth = ((xmax - xmin) / 1000) * cropRect.width;
      const bHeight = ((ymax - ymin) / 1000) * cropRect.height;

      const centerX = bLeft + (bWidth / 2);
      const centerY = bTop + (bHeight / 2);

      const bubble = document.createElement("div");
      bubble.className = "oct-manga-bubble";
      bubble.textContent = region.translation;

      bubble.style.left = `${Math.round(centerX)}px`;
      bubble.style.top = `${Math.round(centerY)}px`;
      bubble.style.transform = `translate(-50%, -50%)`;
      
      bubble.style.width = 'fit-content';
      bubble.style.height = 'auto'; 
      bubble.style.maxWidth = `${Math.max(Math.round(bWidth * 1.3), 50)}px`;
      bubble.style.padding = '4px 10px';
      bubble.style.borderRadius = "12px";

      bubble.style.background = "#ffffff";
      bubble.style.border = "none"; 
      bubble.style.boxShadow = "0 0 12px 10px #ffffff"; 

      const fontSize = Math.max(13, Math.min(18, Math.round(bWidth * 0.16)));
      bubble.style.fontSize = `${fontSize}px`;

      fragment.appendChild(bubble);
    });

    this.overlayContainer.appendChild(fragment);
  }

  setFabStatus(state, tipText) {
    if (!this.fabBtn) return;
    this.fabBtn.className = `oct-round-keycap ${state}`;
    this.setFabTip(tipText);

    if (state === "error" || state === "active") {
      setTimeout(() => {
        if (this.fabBtn && !this.isActive) {
          this.fabBtn.className = "oct-round-keycap";
        }
        if (state === "error") {
          this.setFabTip("");
        }
      }, 4500);
    }
  }

  setFabTip(text) {
    if (!this.fabTip) return;
    if (text) {
      this.fabTip.textContent = text;
      this.fabTip.classList.add("show");
    } else {
      this.fabTip.classList.remove("show");
    }
  }
}

window.__OCT_CONTROLLER__ = new ContentController();