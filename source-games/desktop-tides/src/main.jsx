import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles.css";
import "./portfolio.css";

const language = new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'zh';

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <nav className="portfolio-nav" aria-label={language === 'en' ? 'Game links' : '游戏链接'}>
      <a className="portfolio-return" href={`/?lang=${language}#desktop-tides`}>
        <span aria-hidden="true">←</span>{language === 'en' ? 'Back to portfolio' : '返回作品集'}
      </a>
      <a className="portfolio-download" href="https://github.com/CANDICE666HONG/candice666hong.github.io/releases/download/desktop-tides-v1.0.1/Desktop-Tides-Windows.exe" title={language === 'en' ? 'Windows 10/11 · 64-bit · No installation needed' : 'Windows 10/11 · 64 位 · 双击即玩'}>
        {language === 'en' ? 'Download for Windows' : '下载 Windows 版'}<span aria-hidden="true">↓</span>
      </a>
    </nav>
    <App />
  </React.StrictMode>,
);
