/**
 * OneClickTranslator - DOM Scanner
 */

class DOMScanner {
  constructor() {
    this.ignoreTags = new Set([
      "SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT",
      "SELECT", "OPTION", "SVG", "CANVAS", "VIDEO", "AUDIO", "IFRAME"
    ]);
  }

  scan(root = document.body) {
    if (!root) return { textBlocks: [], imageBlocks: [] };

    const textBlocks = [];
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => this.filterTextNode(node)
      }
    );

    let currentNode = walker.nextNode();
    while (currentNode) {
      const block = this.extractBlockData(currentNode);
      if (block) textBlocks.push(block);
      currentNode = walker.nextNode();
    }

    const imageBlocks = this.scanVisibleImagesOnly(root);
    return { textBlocks, imageBlocks };
  }

  filterTextNode(node) {
    const text = node.textContent?.trim();
    if (!text || text.length < 2) return NodeFilter.FILTER_REJECT;

    // 过滤纯标点符号
    if (/^[\d\s.,\/#!$%\^&\*;:{}=\-_`~()@+\\\[\]<>?|"'–—]+$/.test(text)) {
      return NodeFilter.FILTER_REJECT;
    }

    // 过滤 URL 链接
    if (/^https?:\/\/[^\s]+$/.test(text)) return NodeFilter.FILTER_REJECT;

    const parent = node.parentElement;
    if (!parent) return NodeFilter.FILTER_REJECT;

    if (this.ignoreTags.has(parent.tagName) || parent.closest("[data-oct-root]")) {
      return NodeFilter.FILTER_REJECT;
    }

    // 排除已翻译过的贴纸图层
    if (parent.classList.contains("oct-layer-sticker") || parent.closest(".oct-layer-sticker")) {
      return NodeFilter.FILTER_REJECT;
    }

    // 核心代码区拦截
    if (parent.closest("pre, code, .monaco-editor, .view-lines, .CodeMirror, .ace_editor, .highlight, .blob-code")) {
      return NodeFilter.FILTER_REJECT;
    }

    // 隐藏辅助标签拦截
    if (parent.closest(".sr-only, .visually-hidden, [aria-hidden='true'], .skip-to-content")) {
      return NodeFilter.FILTER_REJECT;
    }

    const style = window.getComputedStyle(parent);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      parseFloat(style.opacity) === 0
    ) {
      return NodeFilter.FILTER_REJECT;
    }

    return NodeFilter.FILTER_ACCEPT;
  }

  extractBlockData(textNode) {
    try {
      const parent = textNode.parentElement;
      const rect = parent.getBoundingClientRect();

      // 仅扫描视口及其上下轻度缓冲区域（支持滚动）
      const vHeight = window.innerHeight || document.documentElement.clientHeight;
      if (rect.bottom < -200 || rect.top > vHeight + 400) return null;
      if (rect.width === 0 && rect.height === 0) return null;

      const computedStyle = window.getComputedStyle(parent);

      return {
        id: `oct_text_${Math.random().toString(36).substring(2, 9)}`,
        node: textNode,
        parent: parent, // 宿主 DOM 节点，供图层直接吸附
        text: textNode.textContent.trim(),
        style: {
          fontSize: computedStyle.fontSize,
          lineHeight: computedStyle.lineHeight
        }
      };
    } catch (e) {
      return null;
    }
  }

  scanVisibleImagesOnly(root = document.body) {
    const images = root.querySelectorAll("img");
    const validImages = [];
    const vHeight = window.innerHeight || document.documentElement.clientHeight;

    images.forEach((img) => {
      if (img.closest("[data-oct-root]")) return;

      const rect = img.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > vHeight) return;

      const naturalW = img.naturalWidth || rect.width;
      const naturalH = img.naturalHeight || rect.height;

      // 严格限制：只有大尺寸真实图片才视为漫画切片，排除新闻小图标/头像
      if (naturalW < 260 || naturalH < 260 || rect.width < 180 || rect.height < 180) return;

      const src = img.currentSrc || img.src;
      if (!src) return;

      validImages.push({
        id: `oct_img_${Math.random().toString(36).substring(2, 9)}`,
        element: img,
        src: src,
        naturalWidth: naturalW,
        naturalHeight: naturalH,
        rect: {
          left: rect.left + window.scrollX,
          top: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height
        }
      });
    });

    return validImages;
  }
}

window.DOMScanner = DOMScanner;