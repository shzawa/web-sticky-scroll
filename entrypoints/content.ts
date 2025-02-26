import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/sandbox";

interface UrlPattern {
  id: string;
  pattern: string;
}

// 設定のデフォルト値
const DEFAULT_MAX_VISIBLE_LINES = 5;

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    // 設定を取得
    const result = await browser.storage.local.get(["urlPatterns", "maxVisibleLines"]);
    const urlPatterns = result.urlPatterns as UrlPattern[] || [];
    const maxVisibleLines = result.maxVisibleLines as number || DEFAULT_MAX_VISIBLE_LINES;

    // 現在のURLがパターンに一致するか確認
    const currentUrl = window.location.href;
    const shouldActivate = urlPatterns.length > 0 && urlPatterns.some(pattern => {
      const regex = new RegExp(pattern.pattern.replace(/\*/g, ".*"));
      return regex.test(currentUrl);
    });

    if (!shouldActivate) {
      console.log("Notion Scroll Sticky: URLパターンに一致しないため無効化されています");
      return;
    }

    console.log("Notion Scroll Sticky: 有効化されました");

    // 1行あたりの高さを計算（ピクセル）
    const LINE_HEIGHT = 28; // 見出し項目の高さ（マージン・パディング含む）

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
        max-height: ${maxVisibleLines * LINE_HEIGHT}px;
        overflow-y: auto;
        overflow-x: hidden;
        transition: transform 0.3s ease;
        transform: translateY(-100%);
        scrollbar-width: thin;
        -webkit-overflow-scrolling: touch; /* iOSでのスムーズスクロール */
      }

      .notion-sticky-scroll-container::-webkit-scrollbar {
        width: 6px;
      }

      .notion-sticky-scroll-container::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.05);
        border-radius: 3px;
      }

      .notion-sticky-scroll-container::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 3px;
      }

      .notion-sticky-scroll-container.visible {
        transform: translateY(0);
      }

      .notion-sticky-scroll-item {
        margin: 4px 0;
        padding: 4px 0;
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        cursor: pointer;
      }

      .notion-sticky-scroll-item:hover {
        background-color: rgba(0, 0, 0, 0.03);
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
    let lastCurrentHeadingText: string | null = null;
    let hideTimeout: number | null = null;
    let lastUpdateTime = 0;
    const UPDATE_THROTTLE = 30; // 更新間隔（ミリ秒）- 短くして反応性を向上

    // 見出し要素を監視する関数
    const updateStickyScroll = () => {
      const now = Date.now();

      // 前回の更新から一定時間経過していない場合はスキップ（スクロール中の頻繁な更新を防止）
      if (now - lastUpdateTime < UPDATE_THROTTLE) {
        return;
      }

      lastUpdateTime = now;

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
      let forceUpdate = false;

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

      // 現在の見出しとその上位の見出しを表示
      const currentHeading = headingsToShow[0];
      const currentLevel = parseInt(currentHeading.tagName.substring(1));

      // 現在の見出しが変わったかチェック（テキスト内容で比較）
      const currentHeadingText = currentHeading.textContent || "";
      if (currentHeadingText !== lastCurrentHeadingText) {
        lastCurrentHeadingText = currentHeadingText;
        forceUpdate = true;
      }

      // スクロール位置が大きく変わった場合も更新を強制
      if (!forceUpdate && Math.random() < 0.1) { // 10%の確率で強制更新（長時間スクロールしない場合の対策）
        forceUpdate = true;
      }

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

      // 更新が必要ない場合はスキップ
      if (!forceUpdate && container.childElementCount > 0 && container.childElementCount === relevantHeadings.length) {
        // 既存の要素数が同じ場合は内容を確認（最初の要素と最後の要素のテキストをチェック）
        const firstItemText = container.firstElementChild?.textContent;
        const lastItemText = container.lastElementChild?.textContent;
        const firstHeadingText = relevantHeadings[0]?.textContent;
        const lastHeadingText = relevantHeadings[relevantHeadings.length - 1]?.textContent;

        if (firstItemText === firstHeadingText && lastItemText === lastHeadingText) {
          return; // 内容が同じなら更新しない
        }
      }

      // スティッキースクロールの内容を更新
      container.innerHTML = "";

      // スティッキースクロールに表示
      relevantHeadings.forEach(heading => {
        const level = heading.tagName.toLowerCase();
        const item = document.createElement("div");
        item.className = `notion-sticky-scroll-item notion-sticky-scroll-${level}`;
        item.textContent = heading.textContent;

        // クリックで該当見出しにスクロール
        item.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          // 見出しにIDがあるか確認
          const headingId = heading.id ||
                           (heading.getAttribute('data-block-id')) ||
                           (heading.querySelector('[id]')?.id);

          // スクロール処理の関数
          const scrollToHeading = () => {
            // scrollIntoViewを使用して見出しにスクロール
            heading.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });

            // Notionの特殊なスクロールコンテナを探して、そこにもスクロールイベントを発火
            setTimeout(() => {
              const scrollContainers = document.querySelectorAll('.notion-frame, .notion-scroller');
              scrollContainers.forEach(container => {
                if (container instanceof HTMLElement) {
                  // 見出しの位置を取得
                  const headingRect = heading.getBoundingClientRect();
                  const containerRect = container.getBoundingClientRect();

                  // コンテナ内での相対位置を計算
                  const relativePosition = headingRect.top - containerRect.top + container.scrollTop;

                  // ヘッダーの高さ分を調整
                  const headerHeight = 60; // Notionのヘッダー高さの概算

                  container.scrollTo({
                    top: relativePosition - headerHeight,
                    behavior: "smooth"
                  });
                }
              });
            }, 50); // 少し遅延させて実行
          };

          // IDがある場合はURLフラグメントを使用
          if (headingId) {
            // 現在のURLを取得
            const currentUrl = new URL(window.location.href);
            // フラグメントを設定
            currentUrl.hash = `#${headingId}`;

            // 履歴に追加（ページをリロードせずにURLを更新）
            window.history.pushState({}, '', currentUrl.toString());

            // 少し遅延させてからスクロール（URLハッシュの処理を待つ）
            setTimeout(scrollToHeading, 10);
          } else {
            // IDがない場合は直接スクロール
            scrollToHeading();
          }
        });

        container.appendChild(item);
      });
    };

    // スクロール状態の追跡
    let isScrolling = false;
    let scrollEndTimeout: number | null = null;
    let lastScrollY = window.scrollY;
    let scrollVelocity = 0;
    let animationFrameId: number | null = null;

    // スクロールイベントでスティッキースクロールを更新（アニメーションフレームに同期）
    window.addEventListener("scroll", () => {
      // スクロール速度を計算
      const currentScrollY = window.scrollY;
      scrollVelocity = Math.abs(currentScrollY - lastScrollY);
      lastScrollY = currentScrollY;

      // スクロール中フラグを設定
      isScrolling = true;

      // スクロールが止まったことを検出するタイマーをリセット
      if (scrollEndTimeout !== null) {
        window.clearTimeout(scrollEndTimeout);
      }

      // スクロールが止まったら完全な更新を行う
      scrollEndTimeout = window.setTimeout(() => {
        isScrolling = false;
        // スクロールが止まったら強制的に更新
        requestAnimationFrame(() => {
          // 前回のアニメーションフレームをキャンセル
          if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
          }
          updateStickyScroll();
        });
        scrollEndTimeout = null;
      }, 100); // スクロールが止まったと判断する時間

      // アニメーションフレームが既に予約されていなければ予約
      if (animationFrameId === null) {
        animationFrameId = requestAnimationFrame(function updateOnScroll() {
          // スクロール中は常に更新
          updateStickyScroll();

          // スクロール中は次のフレームも予約
          if (isScrolling) {
            animationFrameId = requestAnimationFrame(updateOnScroll);
          } else {
            animationFrameId = null;
          }
        });
      }
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
