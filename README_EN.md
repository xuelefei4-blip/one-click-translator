<div align="center">

  # OneClick Translator 📑⚡

  <p align="center">
    <a href="README.md">简体中文</a> | <a href="README_EN.md"><b>English</b></a>
  </p>

  <br>

  <p align="center">
    <b>Non-Intrusive Dual-Track Instant Web Translation Extension</b><br>
    Sub-second initial text translation ➔ Incremental viewport following ➔ Asynchronous raw manga OCR bubbles, delivering a seamless sticky-note reading companion.
  </p>

  <!-- Badges -->
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

## 📸 Preview

<div align="center">
  <img src="docs/preview.gif" alt="OneClick Translator Demo" width="100%" />
  <p><i>▶ Demo: Hold single key to peek ➔ Auto-fetch on scroll ➔ Manga bubble adaptive overlay</i></p>
</div>

---

## ✨ Key Features & Architecture Highlights

📌 **Dual-Track Instant Architecture (Text & Manga Pipeline)**:
- **Standard Web Text (Zero Setup / Ready to Use)**: Accurately identifies physical DOM text ranges, overlays sticky notes in milliseconds without any required setup or API keys.
- **Raw Manga / Image OCR (Viewport Following)**: Viewport-aware image slicing and OCR engine detection, mapping dialogue bubble coordinates with non-destructive translated overlays.

🏷️ **Sticky-Note Reading Metaphor (Multi-Theme Skins)**:
Say goodbye to rigid DOM replacements and broken layouts. Built-in themes include **Classic 3M Yellow Note**, **Ice Blue Tape**, **Japanese Washi**, **Dymo Embossed Black**, **Highlighter Coating**, and **AR Cyber Badge**. Right-click the widget to switch instantly.

👁️ **Non-Intrusive Dual-Mode Interaction (Preserves Native DOM)**:
- **Hold to View Mode**: Hold the trigger key (default `` ` ``) or hover over the floating widget to peek at translations; release to restore the original page instantly.
- **Toggle Mode**: Pin the translation layer for extended, in-depth reading sessions.

🤖 **Desktop Companion Bot (Real-Time Feedback)**:
A compact widget anchored on the screen edge, showing status animations (blinking, nodding, and status bubbles like `Text Translated (18)`, `Images Translated (2)`). Supports one-click hiding and adaptive snapping.

⚡ **Incremental Scroll & Local Two-Tier Cache (IndexedDB + Memory)**:
Persistent offline dictionary backed by IndexedDB and in-memory caches. Translates on demand as you scroll down, while previously translated sections cost 0 network requests.

🌐 **Universal Provider Support & Bi-Lingual UI**:
The popup interface natively supports Chinese and English. The OCR image pipeline is decoupled, allowing users to optionally plug in their own keys for OCR.space, Gemini Vision, DeepSeek, or OpenAI.

- **Raw Manga / Image OCR (Viewport Following - 🧪 Experimental)**: Viewport-aware image slicing and OCR engine detection, mapping dialogue bubble coordinates with non-destructive translated overlays. *Note: This feature is currently in active beta testing.*

> ⚠️ **Experimental Feature Notice (Image / Manga Translation)**:  
> Manga and image bubble OCR translation is currently in **Beta / Experimental status**. Translation accuracy and bounding box alignments may vary across complex artistic typography, vertical onomatopoeia, or extremely long vertical panels. Feel free to open an Issue with screenshots if you encounter visual or parsing glitches!

---

## 🚀 Download & Installation

Visit the [Releases Page](https://github.com/your-username/one-click-translator/releases) to download the latest build via either of the following methods:

### Method 1: Install via `.crx` Offline Package (Recommended)

1. Download the latest `OneClickTranslator.crx` file from Releases.
2. Open a Chromium-based browser (Chrome, Edge, Brave, etc.) and navigate to:
   chrome://extensions/
3. Enable Developer mode in the top-right corner.   
4. Drag and drop the downloaded OneClickTranslator.crx directly onto the extensions page, then click Add extension when prompted.  
   
### Method 2: Load Unpacked Source / ZIP
1. Download and extract OneClickTranslator_v1.0.0.zip from Releases, or clone the repository:   
```text
git clone [https://github.com/your-username/one-click-translator.git](https://github.com/your-username/one-click-translator.git)
```
2. Navigate to chrome://extensions/ and enable Developer mode.  
3. Click Load unpacked in the top-left corner.   
4. Select the project root folder (ensure manifest.json is located directly in this folder) to run.   

### ⌨️ Shortcuts & Controls
TriggerDefault Key / ActionDescriptionSingle Key Shortcut` (Backtick / Tilde)Hold to reveal translation sticky notes; release to restore original text   Global ShortcutAlt + T (Mac: Option + T)Toggle translation overlay visibility   Floating BotLeft ClickToggle active state of translation layer on current tab   Floating BotRight ClickOpen skin selector menu (switch between 3M Note, Tape, and Washi) 

### 📦 Project Structure
```text
one-click-translator/
├── manifest.json              # Extension manifest (Production Manifest V3)
├── background.js              # Background service worker (CORS proxy & API router)
├── content.js                 # Main controller (Lifecycle, shortcuts, & incremental pipeline)
├── content.css                # Injected styles & sticky-note theme system
├── core/                      # Decoupled core modules
│   ├── cache.js               # Caching engine (IndexedDB + memory cache)
│   ├── scanner.js             # Web text engine (DOM Range physical coordinates)
│   ├── translator.js          # Translation hub (Batching & fallback handling)
│   ├── overlay.js             # Sticky note overlay renderer (Shadow DOM injection)
│   └── manga-sanitizer.js     # Image preprocessing & viewport slicing tools
├── popup/                     # Extension popup window
│   ├── popup.html             # Popup structure (with i18n support)
│   ├── popup.js               # Mode switching, bilingual UI, & API key persistence
│   └── popup.css              # Responsive popup layout styles
├── lib/                       # Third-party dependencies
│   └── idb-keyval.js          # Lightweight IndexedDB key-value helper
└── icons/                     # Extension icon assets (16 / 32 / 48 / 128 / SVG)
```
### 📄 License
This project is licensed under the MIT License. It is intended solely for personal study and language learning; it does not collect, store, or distribute third-party copyrighted content.
