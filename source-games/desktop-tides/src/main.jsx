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
      <a className="portfolio-download" href="/downloads/desktop-tides-offline.zip" download="desktop-tides-offline.zip">
        {language === 'en' ? 'Download offline' : '下载离线版'}<span aria-hidden="true">↓</span>
      </a>
    </nav>
    <App />
  </React.StrictMode>,
);
