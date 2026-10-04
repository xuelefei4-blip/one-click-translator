/**
 * OneClickTranslator - Service Worker (Background)
 * 职责：视口截屏、OCR 提取路由、纯文本翻译代理
 */

// 快捷键支持
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-translation") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id && !tab.url?.startsWith("chrome://") && !tab.url?.startsWith("edge://")) {
      chrome.tabs.sendMessage(tab.id, { action: "TOGGLE_TRANSLATION" }).catch(() => {});
    }
  }
});

// 监听前端 Content Script 消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
  // 1. 视口截图
  if (message.action === "CAPTURE_SCREEN") {
    const winId = sender.tab ? sender.tab.windowId : undefined;
    chrome.tabs.captureVisibleTab(winId, { format: "jpeg", quality: 80 }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
        sendResponse({ success: false, error: chrome.runtime.lastError?.message || "截图失败" });
      } else {
        sendResponse({ success: true, dataUrl });
      }
    });
    return true;
  }

  // 2. 纯文本翻译代理（绕过网页端 CSP 跨域拦截）
  if (message.action === "TRANSLATE_TEXT") {
    const textList = message.texts || [];
    const sourceLang = message.sourceLang || "auto";
    const targetLang = message.targetLang || "zh-CN";

    translateBatchGoogle(textList, sourceLang, targetLang)
      .then((resultMap) => sendResponse({ success: true, results: resultMap }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // 3. 调用 OCR 引擎提取文字和坐标
  if (message.action === "TRANSLATE_IMAGE_AI") {
    chrome.storage.local.get(['ocrEngine', 'apiKeys', 'source_lang'], (result) => {
      const engine = result.ocrEngine || 'ocrspace';
      const keys = result.apiKeys || {};
      const sourceLang = result.source_lang || 'en';
      const apiKey = keys[engine];

      if (!apiKey) {
        sendResponse({ success: false, error: `请先点击扩展图标，配置 ${engine} 的 API Key。` });
        return;
      }

      if (engine === 'ocrspace') {
        extractWithOcrSpace(message.dataUrl, apiKey, sourceLang)
          .then(regions => sendResponse({ success: true, regions }))
          .catch(err => sendResponse({ success: false, error: err.message }));
      } else if (engine === 'gemini') {
        extractTextAndBoxesGemini(message.dataUrl, apiKey)
          .then(regions => sendResponse({ success: true, regions }))
          .catch(err => sendResponse({ success: false, error: err.message }));
      } else {
        sendResponse({ success: false, error: `暂未支持 ${engine} 引擎逻辑，请切换至 OCR.space。` });
      }
    });

    return true;
  }

  return false;
});

/**
 * 免费纯文本批量翻译通道 (走 Google 翻译轻量接口)
 */
async function translateBatchGoogle(texts, from = "auto", to = "zh-CN") {
  const resultMap = {};
  const batchSize = 15; // 分批防限流

  for (let i = 0; i < texts.length; i += batchSize) {
    const chunk = texts.slice(i, i + batchSize);
    await Promise.all(
      chunk.map(async (text) => {
        try {
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            const translated = data[0]?.map(item => item[0]).join("") || text;
            resultMap[text] = translated;
          } else {
            resultMap[text] = text;
          }
        } catch {
          resultMap[text] = text;
        }
      })
    );
  }
  return resultMap;
}

/**
 * 引擎 A：OCR.space (支持动态语言映射与精准气泡合并)
 */
async function extractWithOcrSpace(dataUrl, apiKey, sourceLang = "en") {
  const langMap = {
    auto: "eng",
    en: "eng",
    ja: "jpn",
    zh: "chs"
  };
  const ocrLang = langMap[sourceLang] || "eng";

  const formData = new FormData();
  formData.append("base64Image", dataUrl);
  formData.append("language", ocrLang);
  formData.append("isOverlayRequired", "true"); 
  formData.append("OCREngine", "2"); 

  const res = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: { "apikey": apiKey },
    body: formData
  });

  if (!res.ok) throw new Error(`OCR.space 请求失败 HTTP ${res.status}`);
  const data = await res.json();
  if (data.IsErroredOnProcessing) throw new Error(`OCR 提取出错: ${data.ErrorMessage?.[0] || '未知错误'}`);

  const resBlob = await fetch(dataUrl);
  const blob = await resBlob.blob();
  const bitmap = await createImageBitmap(blob);
  const imgWidth = bitmap.width;
  const imgHeight = bitmap.height;

  const rawLines = [];
  const parsedResults = data.ParsedResults || [];

  parsedResults.forEach(result => {
    if (!result.TextOverlay || !result.TextOverlay.Lines) return;
    
    result.TextOverlay.Lines.forEach(line => {
      const text = line.LineText;
      if (!text || text.trim() === "") return;

      let minLeft = Infinity;
      let minTop = Infinity;
      let maxRight = 0;
      let maxBottom = 0;

      if (line.Words && line.Words.length > 0) {
        line.Words.forEach(w => {
          if (w.Left < minLeft) minLeft = w.Left;
          if (w.Top < minTop) minTop = w.Top;
          if (w.Left + w.Width > maxRight) maxRight = w.Left + w.Width;
          if (w.Top + w.Height > maxBottom) maxBottom = w.Top + w.Height;
        });
      } else {
        return;
      }

      // 归一化为 0-1000 相对坐标
      rawLines.push({
        text: text.trim(),
        box: [
          Math.round((minTop / imgHeight) * 1000),
          Math.round((minLeft / imgWidth) * 1000),
          Math.round((maxBottom / imgHeight) * 1000),
          Math.round((maxRight / imgWidth) * 1000)
        ]
      });
    });
  });

  // 气泡聚合判定
  const regions = [];
  let currentBlock = null;

  rawLines.forEach(line => {
    if (!currentBlock) {
      currentBlock = { original_text: line.text, box_2d: [...line.box] };
      return;
    }
    
    const yGap = line.box[0] - currentBlock.box_2d[2]; 
    const xGap = Math.max(0, Math.max(currentBlock.box_2d[1] - line.box[3], line.box[1] - currentBlock.box_2d[3]));

    // 严控合并阈值：上下垂直距离近且横向重叠度高才合并
    if (yGap > -30 && yGap < 60 && xGap < 120) { 
      currentBlock.original_text += " " + line.text;
      currentBlock.box_2d[0] = Math.min(currentBlock.box_2d[0], line.box[0]);
      currentBlock.box_2d[1] = Math.min(currentBlock.box_2d[1], line.box[1]);
      currentBlock.box_2d[2] = Math.max(currentBlock.box_2d[2], line.box[2]);
      currentBlock.box_2d[3] = Math.max(currentBlock.box_2d[3], line.box[3]);
    } else {
      regions.push(currentBlock);
      currentBlock = { original_text: line.text, box_2d: [...line.box] };
    }
  });
  
  if (currentBlock) regions.push(currentBlock);
  return regions;
}

/**
 * 引擎 B：Gemini 3.8 Flash
 */
async function extractTextAndBoxesGemini(dataUrl, apiKeysString) {
  const keys = apiKeysString.split(',').map(k => k.trim()).filter(Boolean);
  const currentKey = keys[Math.floor(Math.random() * keys.length)];
  const base64Data = dataUrl.split(",")[1];
  const model = "gemini-3.8-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`;

  const payload = {
    contents: [{
      parts: [
        { text: `You are an accurate manga OCR engine. Extract all text and their bounding boxes. Do NOT translate. Return ONLY original text and coordinates [ymin, xmin, ymax, xmax] normalized to 0-1000.` },
        { inline_data: { mime_type: "image/jpeg", data: base64Data } }
      ]
    }],
    generationConfig: {
      temperature: 0.1, 
      response_mime_type: "application/json",
      response_schema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            original_text: { type: "STRING" },
            box_2d: { type: "ARRAY", items: { type: "INTEGER" } }
          },
          required: ["original_text", "box_2d"]
        }
      }
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`[Gemini] 响应 ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return rawText ? JSON.parse(rawText) : [];
}