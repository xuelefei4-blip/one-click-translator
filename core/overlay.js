/**
 * OneClickTranslator - Overlay Renderer
 * 职责：物理寄生图层贴纸 (天然支持滚动) + 漫画气泡蒙版
 */

class OverlayRenderer {
  constructor(container) {
    this.container = container;
    this.mangaBubbleEntries = [];
    this.renderedNodeSet = new WeakSet();
    this.isVisible = true;
  }

  /**
   * 1. 渲染文字“物理贴纸图层”：直接寄生在原元素上，不改动原文，原生跟随滚动
   */
  /**
   * 1. 渲染文字“物理贴纸图层”：直接寄生在原元素上，不改动原文
   */
  render(textBlocks, translations) {
    // 确保全局激活类名存在
    document.documentElement.classList.add("oct-layers-active");

    textBlocks.forEach((block) => {
      if (this.renderedNodeSet.has(block.node)) return;

      const srcText = block.text;
      let tgtText = translations.get ? translations.get(srcText) : translations[srcText];
      if (!tgtText) return;

      // 防御：如果缓存或接口返回的是对象，自动提取内部的文本字段
      if (typeof tgtText === "object" && tgtText !== null) {
        tgtText = tgtText.translation || tgtText.text || tgtText.translatedText || "";
      }

      // 强制转为字符串，防止数字或布尔值导致 .trim() 报错
      tgtText = String(tgtText);
      if (!tgtText.trim() || tgtText.trim().toLowerCase() === String(srcText).toLowerCase()) return;

      const parent = block.parent;
      if (!parent) return;

      const computed = window.getComputedStyle(parent);
      if (computed.position === "static") {
        parent.style.position = "relative";
      }
      // 若原标签是纯行内 inline（如 <span>），转为 inline-block 才能稳定测量宽高
      if (computed.display === "inline") {
        parent.style.display = "inline-block";
      }

      // 创建寄生贴纸
      const sticker = document.createElement("div");
      sticker.className = "oct-layer-sticker";
      sticker.setAttribute("data-oct-root", "true");
      sticker.textContent = tgtText;

      // 动态微调贴纸字号，匹配原文比例
      const rawSize = parseFloat(block.style.fontSize) || 14;
      const stickerFontSize = Math.max(11, Math.min(13, Math.round(rawSize * 0.85)));
      sticker.style.fontSize = `${stickerFontSize}px`;

      // 直接给内联展示样式，避免类名脱节导致不可见
      sticker.style.display = this.isVisible ? "block" : "none";

      parent.appendChild(sticker);
      this.renderedNodeSet.add(block.node);
    });
  }

  /**
   * 2. 漫画图片气泡蒙版渲染 (保留在 container 内)
   */
  renderMangaBubbles(regions) {
    this.clearMangaBubbles();
    const fragment = document.createDocumentFragment();

    regions.forEach((region) => {
      if (!region.translation || !region.box_2d) return;

      const [ymin, xmin, ymax, xmax] = region.box_2d;

      const topPct = (ymin / 1000) * 100;
      const leftPct = (xmin / 1000) * 100;
      const widthPct = ((xmax - xmin) / 1000) * 100;
      const heightPct = ((ymax - ymin) / 1000) * 100;

      const bubble = document.createElement("div");
      bubble.className = "oct-manga-bubble";
      bubble.textContent = region.translation;

      bubble.style.top = `${topPct}%`;
      bubble.style.left = `${leftPct}%`;
      bubble.style.width = `${Math.max(widthPct, 4)}%`;
      bubble.style.minHeight = `${Math.max(heightPct, 2.5)}%`;

      const vHeight = window.innerHeight;
      const boxPxHeight = (heightPct / 100) * vHeight;
      const fontSize = Math.max(11, Math.min(15, Math.round(boxPxHeight * 0.36)));
      bubble.style.fontSize = `${fontSize}px`;

      fragment.appendChild(bubble);
      this.mangaBubbleEntries.push(bubble);
    });

    this.container.appendChild(fragment);
  }

  clearMangaBubbles() {
    this.mangaBubbleEntries.forEach(b => b.remove());
    this.mangaBubbleEntries = [];
  }

  show() {
    this.isVisible = true;
    this.container.classList.remove("oct-hidden");
    document.documentElement.classList.add("oct-layers-active");
    document.querySelectorAll(".oct-layer-sticker").forEach(el => {
      el.style.display = "block";
    });
  }

  hide() {
    this.isVisible = false;
    this.container.classList.add("oct-hidden");
    document.documentElement.classList.remove("oct-layers-active");
    document.querySelectorAll(".oct-layer-sticker").forEach(el => {
      el.style.display = "none";
    });
  }

  clear() {
    this.container.innerHTML = "";
    this.mangaBubbleEntries = [];
    document.querySelectorAll(".oct-layer-sticker").forEach(el => el.remove());
    this.renderedNodeSet = new WeakSet();
  }
}

window.OverlayRenderer = OverlayRenderer;