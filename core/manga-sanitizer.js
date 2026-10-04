/**
 * OneClickTranslator - Manga Sanitizer
 * 职责：暴力二值化清洗（洗掉敏感画面）、图像降采样（省Token防限流）
 */

class MangaSanitizer {
  /**
   * @param {HTMLImageElement} screenshotImg 整个网页的截屏对象
   * @param {Object} cropRect 需要裁剪的相对坐标 {left, top, width, height}
   * @param {number} dpr 设备像素比 (window.devicePixelRatio)
   * @returns {string} 脱敏并压缩后的 Base64 JPEG
   */
  static process(screenshotImg, cropRect, dpr = 1) {
    const physicalWidth = cropRect.width * dpr;
    const physicalHeight = cropRect.height * dpr;

    // 1. 强力降采样：最长边限制在 1024px，省下 60% 甚至更多的 Token
    const MAX_DIMENSION = 1024;
    let scale = 1;
    if (physicalWidth > MAX_DIMENSION || physicalHeight > MAX_DIMENSION) {
      scale = Math.min(MAX_DIMENSION / physicalWidth, MAX_DIMENSION / physicalHeight);
    }

    const targetWidth = Math.round(physicalWidth * scale);
    const targetHeight = Math.round(physicalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    // willReadFrequently 提升 getImageData 的硬件加速性能
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    // 2. 将截图的漫画区域缩放并画入 canvas
    ctx.drawImage(
      screenshotImg,
      cropRect.left * dpr,
      cropRect.top * dpr,
      physicalWidth,
      physicalHeight,
      0, 0,
      targetWidth,
      targetHeight
    );

    // 3. 核心：暴力清洗脱敏 (洗掉中间灰阶的所有人体/背景画面)
    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // 提取符合人眼视觉的亮度值
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;

      // 如果既不是极黑(气泡文字/框线 <80)，也不是极白(气泡底色 >220) -> 全部强制漂白
      if (brightness >= 80 && brightness <= 220) {
        data[i] = 255;     // R
        data[i + 1] = 255; // G
        data[i + 2] = 255; // B
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // 4. 输出 0.75 质量的 JPEG，进一步压缩 Base64 字符串体积
    return canvas.toDataURL("image/jpeg", 0.75);
  }
}

window.MangaSanitizer = MangaSanitizer;