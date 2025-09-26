// src/components/Analytics.jsx

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function Analytics() {
  const location = useLocation();

  useEffect(() => {
    if (window.gtag) {
      const trackingId = process.env.REACT_APP_GA_TRACKING_ID; // 環境変数からトラッキングIDを取得
      window.gtag('config', trackingId, {
        page_path: location.pathname + location.search,
        page_title: document.title,
      });
    }
  }, [location]);

  return null;
}
