/**
 * OneClickTranslator - Popup Script (高度统一 + 全能 API + 实时双语国际化版)
 */

// ==================== 1. 双语国际化文字字典 ====================
const POPUP_I18N = {
  zh: {
    // 静态 HTML 映射
    shortcutLabel: "快捷键",
    saveBtn: "保存",
    savedBtn: "已存",
    enableSiteTitle: "在此网站启用",
    fabTitle: "页面右侧悬浮球",
    fabDesc: "常驻虚拟按键，点击快速翻译",
    langTitle: "🌐 翻译语言",
    optAuto: "自动识别 (Auto)",
    modeHold: "👁 按住预览",
    modeToggle: "🔘 点击开关",
    apiTitle: "🔑 独立 API 模式",
    apiBadge: "仅图片翻译需要",
    getKeyLink: "获取免费 Key ↗",
    defaultKeyTag: "自带 Key",
    apiKeyPlaceholder: "输入对应 API Key...",
    noKeyText: "API 未配置",
    readyText: "就绪",
    feedback: "问题反馈",
    author: "作者: kingcat666",
    disclaimer: "免责声明：本扩展仅供学习交流使用，不存储或传播任何网络内容。",
    
    // JS 动态提示映射
    unknownSite: "未知网页",
    statusHoldMode: "已切换：按住查看，松开还原",
    statusToggleMode: "已切换：点击开关模式",
    statusShortcutSaved: (k) => `快捷键已设为 [${k}]`,
    statusSiteEnabled: "已在此网站启用",
    statusSiteDisabled: "已在此网站停用",
    statusLangSaved: "翻译语言已保存",
    statusKeySaved: (n) => `${n} 密钥已保存！`,
    keyConfigured: (n) => `● 已配置 ${n} 密钥`,
    keyNotConfigured: (n) => `○ 未配置 ${n} 密钥`,
    keyBtnSaved: "✓ 已存",
    keyBtnSave: "💾 保存"
  },
  en: {
    // 静态 HTML 映射
    shortcutLabel: "Shortcut",
    saveBtn: "Save",
    savedBtn: "Saved",
    enableSiteTitle: "Enable on this site",
    fabTitle: "Floating Button",
    fabDesc: "Floating robot button for instant translation",
    langTitle: "🌐 Languages",
    optAuto: "Auto Detect",
    modeHold: "👁 Hold to Preview",
    modeToggle: "🔘 Click to Toggle",
    apiTitle: "🔑 Custom API Mode",
    apiBadge: "Image OCR Only",
    getKeyLink: "Get Free Key ↗",
    defaultKeyTag: "Built-in Key",
    apiKeyPlaceholder: "Enter your API Key...",
    noKeyText: "API Not Configured",
    readyText: "Ready",
    feedback: "Feedback",
    author: "Author: kingcat666",
    disclaimer: "Disclaimer: For study and personal use only. No web content stored.",
    
    // JS 动态提示映射
    unknownSite: "Unknown Page",
    statusHoldMode: "Switched: Hold to preview, release to restore",
    statusToggleMode: "Switched: Click to toggle mode",
    statusShortcutSaved: (k) => `Shortcut set to [${k}]`,
    statusSiteEnabled: "Enabled on this site",
    statusSiteDisabled: "Disabled on this site",
    statusLangSaved: "Languages saved",
    statusKeySaved: (n) => `${n} Key saved!`,
    keyConfigured: (n) => `● ${n} Key Configured`,
    keyNotConfigured: (n) => `○ ${n} Key Not Configured`,
    keyBtnSaved: "✓ Saved",
    keyBtnSave: "💾 Save"
  }
};

async function initPopup() {
  const siteMasterToggle = document.getElementById("site-master-toggle");
  const fabToggle = document.getElementById("fab-toggle");
  const currentDomainEl = document.getElementById("current-domain");
  
  const shortcutKeyInput = document.getElementById("shortcut-key-input");
  const shortcutSaveBtn = document.getElementById("shortcut-save-btn");

  const btnModeHold = document.getElementById("btn-mode-hold");
  const btnModeToggle = document.getElementById("btn-mode-toggle");

  const sourceLangSelect = document.getElementById("source-lang-select");
  const targetLangSelect = document.getElementById("target-lang-select");

  const ocrEngineSelect = document.getElementById("ocr-engine-select");
  const getKeyLink = document.getElementById("get-key-link");
  const apiKeyInput = document.getElementById("api-key-input");
  const apiSaveBtn = document.getElementById("api-save-btn");
  const apiStatusTip = document.getElementById("api-status-tip");
  const statusBar = document.getElementById("status-bar");

  // 主流 AI 模型申请链接与模型展示名称
  const linkMap = {
    ocrspace: "https://ocr.space/OCRApi",
    baidu: "https://console.bce.baidu.com/ai/#/ai/ocr/overview/index",
    gemini: "https://aistudio.google.com/app/apikey",
    deepseek: "https://platform.deepseek.com/api_keys",
    openai: "https://platform.openai.com/api-keys",
    claude: "https://console.anthropic.com/settings/keys",
    kimi: "https://platform.moonshot.cn/console/api-keys",
    qwen: "https://bailian.console.aliyun.com/?apiKey=1#/api-key"
  };
  const nameMap = {
    ocrspace: "OCR.space", baidu: "百度 OCR", gemini: "Gemini",
    deepseek: "DeepSeek", openai: "OpenAI", claude: "Claude",
    kimi: "Kimi", qwen: "通义千问"
  };

  // 获取当前活动标签页
  let tab = null;
  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    tab = tabs && tabs[0];
  } catch (e) {}
  if (!tab) {
    const fallbackTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = fallbackTabs && fallbackTabs[0];
  }

  let currentDomain = "";
  if (tab?.url) {
    try {
      const parsedUrl = new URL(tab.url);
      if (parsedUrl.protocol.startsWith("http")) {
        currentDomain = parsedUrl.hostname;
      } else {
        currentDomain = parsedUrl.protocol.replace(":", "");
      }
    } catch {}
  }

  const store = await chrome.storage.local.get([
    "enabled_domains", "custom_shortcut_key", "key_trigger_mode", 
    "show_floating_button", "ocrEngine", "apiKeys", "source_lang", "target_lang"
  ]);

  let currentEngine = store.ocrEngine || "ocrspace";
  let currentKeys = store.apiKeys || {};

  // ==================== 2. 国际化切换核心函数 ====================
  function getDict() {
    const tgt = targetLangSelect.value || "zh";
    return tgt.startsWith("zh") ? POPUP_I18N.zh : POPUP_I18N.en;
  }

  function applyLanguage(targetLang) {
    const langKey = targetLang.startsWith("zh") ? "zh" : "en";
    const dict = POPUP_I18N[langKey];
    if (!dict) return;

    // 1. 替换 HTML 中所有标记了 data-i18n 的文本
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (dict[key]) el.textContent = dict[key];
    });

    // 2. 替换 input 的属性（如 placeholder）
    document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      const [attr, key] = el.getAttribute("data-i18n-attr").split(":");
      if (dict[key]) el.setAttribute(attr, dict[key]);
    });

    // 3. 更新动态文本（域名、API状态区、底部就绪文本）
    currentDomainEl.textContent = currentDomain || dict.unknownSite;
    refreshApiUI(currentEngine);
    statusBar.textContent = dict.readyText;
  }

  // ==================== 3. 基础与模式设置 ====================
  shortcutKeyInput.value = store.custom_shortcut_key || "`";
  siteMasterToggle.checked = (store.enabled_domains || []).includes(currentDomain);
  fabToggle.checked = store.show_floating_button !== false;

  let currentMode = store.key_trigger_mode || "hold";
  btnModeHold.classList.toggle("active", currentMode === "hold");
  btnModeToggle.classList.toggle("active", currentMode === "toggle");

  btnModeHold.addEventListener("click", async () => {
    btnModeHold.classList.add("active");
    btnModeToggle.classList.remove("active");
    await chrome.storage.local.set({ key_trigger_mode: "hold" });
    notifyContentScript({ action: "UPDATE_KEY_MODE", mode: "hold" });
    showStatus(getDict().statusHoldMode);
  });

  btnModeToggle.addEventListener("click", async () => {
    btnModeToggle.classList.add("active");
    btnModeHold.classList.remove("active");
    await chrome.storage.local.set({ key_trigger_mode: "toggle" });
    notifyContentScript({ action: "UPDATE_KEY_MODE", mode: "toggle" });
    showStatus(getDict().statusToggleMode);
  });

  shortcutSaveBtn.addEventListener("click", async () => {
    let key = shortcutKeyInput.value.trim().toLowerCase();
    if (!key) key = "`"; 
    shortcutKeyInput.value = key;
    await chrome.storage.local.set({ custom_shortcut_key: key });
    notifyContentScript({ action: "UPDATE_SHORTCUT_KEY", key: key });
    
    const d = getDict();
    shortcutSaveBtn.textContent = d.savedBtn;
    showStatus(d.statusShortcutSaved(key));
    setTimeout(() => { shortcutSaveBtn.textContent = d.saveBtn; }, 1500);
  });

  siteMasterToggle.addEventListener("change", async () => {
    const enabled = siteMasterToggle.checked;
    let list = store.enabled_domains || [];
    const d = getDict();
    if (enabled) {
      if (currentDomain && !list.includes(currentDomain)) list.push(currentDomain);
      showStatus(d.statusSiteEnabled);
    } else {
      list = list.filter((item) => item !== currentDomain);
      showStatus(d.statusSiteDisabled);
    }
    await chrome.storage.local.set({ enabled_domains: list });
    notifyContentScript({ action: "SET_SITE_ENABLED", enabled });
  });

  fabToggle.addEventListener("change", async () => {
    const visible = fabToggle.checked;
    await chrome.storage.local.set({ show_floating_button: visible });
    notifyContentScript({ action: "UPDATE_FAB_VISIBLE", visible });
  });

  // ==================== 4. 翻译语言选择与联动 ====================
  sourceLangSelect.value = store.source_lang || "auto";
  targetLangSelect.value = store.target_lang || "zh";

  // 页面初次加载时即时应用界面语言
  applyLanguage(targetLangSelect.value);

  const saveLanguageConfig = async () => {
    const src = sourceLangSelect.value;
    const tgt = targetLangSelect.value;
    await chrome.storage.local.set({ source_lang: src, target_lang: tgt });
    notifyContentScript({ action: "UPDATE_LANG", source: src, target: tgt });
    
    // 切换目标语言的同时切换整个插件的界面语言
    applyLanguage(tgt);
    showStatus(getDict().statusLangSaved);
  };

  sourceLangSelect.addEventListener("change", saveLanguageConfig);
  targetLangSelect.addEventListener("change", saveLanguageConfig);

  // ==================== 5. 独立 API 模块逻辑 ====================
  function refreshApiUI(engine) {
    const d = getDict();
    ocrEngineSelect.value = engine;
    getKeyLink.href = linkMap[engine] || "#";
    apiKeyInput.value = currentKeys[engine] || "";

    if (currentKeys[engine]) {
      apiSaveBtn.textContent = d.keyBtnSaved;
      apiSaveBtn.style.background = '#10b981';
      apiStatusTip.textContent = d.keyConfigured(nameMap[engine]);
      apiStatusTip.style.color = '#10b981'; 
    } else {
      apiSaveBtn.textContent = d.keyBtnSave;
      apiSaveBtn.style.background = '#10b981';
      apiStatusTip.textContent = d.keyNotConfigured(nameMap[engine]);
      apiStatusTip.style.color = '#ef4444'; 
    }
  }

  refreshApiUI(currentEngine);

  ocrEngineSelect.addEventListener("change", async (e) => {
    currentEngine = e.target.value;
    refreshApiUI(currentEngine);
  });

  apiKeyInput.addEventListener("input", (e) => {
    currentKeys[currentEngine] = e.target.value.trim();
  });

  apiSaveBtn.addEventListener("click", async () => {
    currentKeys[currentEngine] = apiKeyInput.value.trim();
    await chrome.storage.local.set({ ocrEngine: currentEngine, apiKeys: currentKeys });
    
    refreshApiUI(currentEngine);
    notifyContentScript({ action: "UPDATE_CONFIG", provider: currentEngine, channel: "api" });
    showStatus(getDict().statusKeySaved(nameMap[currentEngine]));
  });

  // ==================== 辅助通知函数 ====================
  function showStatus(text) {
    statusBar.textContent = text;
    setTimeout(() => { statusBar.textContent = getDict().readyText; }, 2000);
  }

  function notifyContentScript(msg) {
    if (tab?.id) chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPopup);
} else {
  initPopup();
}