import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/sandbox";

interface UrlPattern {
  id: string;
  pattern: string;
}

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    // URLパターンを取得
    const result = await browser.storage.local.get("urlPatterns");
    const urlPatterns = result.urlPatterns as UrlPattern[] || [];

    // 現在のURLがパターンに一致するか確認
    const currentUrl = window.location.href;
    const shouldActivate = urlPatterns.length === 0 || urlPatterns.some(pattern => {
      const regex = new RegExp(pattern.pattern.replace(/\*/g, ".*"));
      return regex.test(currentUrl);
    });

    if (!shouldActivate) {
      console.log("Notion Scroll Sticky: URLパターンに一致しないため無効化されています");
      return;
    }

    console.log("Notion Scroll Sticky: 有効化されました");

    // スタイルを追加
    const style = document.createElement("style");
    style.textContent = `
      .notion-sticky-scroll-container {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1000;
        background-color: rgba(255, 255, 255, 0.95);
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        padding: 8px 16px;
        font-weight: bold;
        max-height: 40vh;
        overflow-y: auto;
        transition: transform 0.3s ease;
        transform: translateY(-100%);
      }

      .notion-sticky-scroll-container.visible {
        transform: translateY(0);
      }

      .notion-sticky-scroll-item {
        margin: 4px 0;
        padding: 4px 0;
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      }

      .notion-sticky-scroll-item:last-child {
        border-bottom: none;
      }

      .notion-sticky-scroll-h1 { font-size: 1.2rem; padding-left: 0; }
      .notion-sticky-scroll-h2 { font-size: 1.1rem; padding-left: 16px; }
      .notion-sticky-scroll-h3 { font-size: 1rem; padding-left: 32px; }
      .notion-sticky-scroll-h4 { font-size: 0.95rem; padding-left: 48px; }
      .notion-sticky-scroll-h5 { font-size: 0.9rem; padding-left: 64px; }
      .notion-sticky-scroll-h6 { font-size: 0.85rem; padding-left: 80px; }
    `;
    document.head.appendChild(style);

    // スティッキースクロールコンテナを作成
    const container = document.createElement("div");
    container.className = "notion-sticky-scroll-container";
    document.body.appendChild(container);

    // 最後に表示された見出し要素を保持する変数
    let lastVisibleHeadings: Element[] = [];
    let hideTimeout: number | null = null;

    // 見出し要素を監視する関数
    const updateStickyScroll = () => {
      // 見出し要素を取得
      const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"));

      if (headings.length === 0) {
        return;
      }

      // 現在表示されている見出しを特定（検出範囲を広げる）
      const visibleHeadings = headings.filter(heading => {
        const rect = heading.getBoundingClientRect();
        // 画面上部から300px以内、または画面内（下部）に見出しが入っている場合に検出
        return rect.top <= 300 && rect.bottom > -100;
      });

      // 表示する見出し要素を決定
      let headingsToShow = visibleHeadings;

      if (visibleHeadings.length > 0) {
        // 見出しが見つかった場合、最後に表示された見出しを更新
        lastVisibleHeadings = visibleHeadings;

        // タイムアウトがあれば解除
        if (hideTimeout !== null) {
          window.clearTimeout(hideTimeout);
          hideTimeout = null;
        }

        container.classList.add("visible");
      } else if (lastVisibleHeadings.length > 0) {
        // 見出しが見つからない場合でも、最後に表示された見出しを使用
        headingsToShow = lastVisibleHeadings;

        // 一定時間後に非表示にするタイマーをセット（既存のタイマーがなければ）
        if (hideTimeout === null) {
          hideTimeout = window.setTimeout(() => {
            // 3秒後に非表示にする（速いスクロールが止まった後も表示を維持）
            container.classList.remove("visible");
            hideTimeout = null;
          }, 3000);
        }
      } else {
        // 表示する見出しがない場合は非表示
        container.classList.remove("visible");
        return;
      }

      // スティッキースクロールの内容を更新
      container.innerHTML = "";

      // 現在の見出しとその上位の見出しを表示
      const currentHeading = headingsToShow[0];
      const currentLevel = parseInt(currentHeading.tagName.substring(1));

      // 現在の見出しより上にある見出しを取得
      const index = headings.indexOf(currentHeading);
      const relevantHeadings = [];

      // 現在の見出しを追加
      relevantHeadings.push(currentHeading);

      // 現在の見出しより上位の見出しを追加
      for (let i = index - 1; i >= 0; i--) {
        const heading = headings[i];
        const level = parseInt(heading.tagName.substring(1));

        if (level < currentLevel) {
          relevantHeadings.unshift(heading);
        }
      }

      // スティッキースクロールに表示
      relevantHeadings.forEach(heading => {
        const level = heading.tagName.toLowerCase();
        const item = document.createElement("div");
        item.className = `notion-sticky-scroll-item notion-sticky-scroll-${level}`;
        item.textContent = heading.textContent;

        // クリックで該当見出しにスクロール
        item.addEventListener("click", () => {
          heading.scrollIntoView({ behavior: "smooth" });
        });

        container.appendChild(item);
      });
    };

    // スクロールイベントのデバウンス処理用
    let scrollTimeout: number | null = null;
    let lastScrollTime = 0;
    const scrollDebounceTime = 100; // ミリ秒

    // スクロールイベントでスティッキースクロールを更新（デバウンス処理付き）
    window.addEventListener("scroll", () => {
      const now = Date.now();

      // 前回のスクロールから一定時間経過していない場合はタイムアウトをセット
      if (now - lastScrollTime < scrollDebounceTime) {
        if (scrollTimeout !== null) {
          window.clearTimeout(scrollTimeout);
        }

        scrollTimeout = window.setTimeout(() => {
          requestAnimationFrame(updateStickyScroll);
          scrollTimeout = null;
        }, scrollDebounceTime);
      } else {
        // 一定時間経過している場合は即時実行
        requestAnimationFrame(updateStickyScroll);
      }

      lastScrollTime = now;
    }, { passive: true });

    // ページ内容の変更を監視
    const observer = new MutationObserver(() => {
      requestAnimationFrame(updateStickyScroll);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 初期化
    updateStickyScroll();
  },
});
