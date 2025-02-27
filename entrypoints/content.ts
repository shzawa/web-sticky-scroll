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

      .notion-sticky-toggle-button {
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 1001;
        background-color: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        transition: background-color 0.2s ease;
      }

      .notion-sticky-toggle-button:hover {
        background-color: rgba(240, 240, 240, 0.9);
      }

      .notion-sticky-toggle-button svg {
        width: 20px;
        height: 20px;
        fill: #333;
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

    // 表示・非表示を切り替えるボタンを作成
    const toggleButton = document.createElement("div");
    toggleButton.className = "notion-sticky-toggle-button";
    toggleButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
      </svg>
    `;
    document.body.appendChild(toggleButton);

    // 表示状態を保存する変数
    let isVisible = true;

    // ボタンクリックで表示・非表示を切り替え
    toggleButton.addEventListener("click", () => {
      isVisible = !isVisible;

      if (isVisible) {
        container.classList.add("visible");
        toggleButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
          </svg>
        `;
      } else {
        container.classList.remove("visible");
        toggleButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
          </svg>
        `;
      }
    });

    // 最後に表示された見出し要素を保持する変数
    let lastVisibleHeadings: Element[] = [];
    let lastCurrentHeadingText: string | null = null;
    let hideTimeout: number | null = null;
    let lastUpdateTime = 0;
    const UPDATE_THROTTLE = 30; // 更新間隔（ミリ秒）- 短くして反応性を向上

    // Intersection Observerを使用して実際に表示されている見出しを追跡
    const visibleHeadingsMap = new Map<Element, boolean>();
    const headingObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          visibleHeadingsMap.set(entry.target, entry.isIntersecting);
        });
        // 見出しの可視性が変わったら更新
        requestAnimationFrame(updateStickyScroll);
      },
      {
        root: null, // ビューポートを基準にする
        rootMargin: "100px", // 上下に余裕を持たせる（見出しの前後のコンテンツも見えるように）
        threshold: 0.3 // 30%以上表示されていれば可視と判断（より多く見えてから反応）
      }
    );

    // 全ての見出しを監視する関数
    const observeAllHeadings = () => {
      // 既存の監視をクリア
      headingObserver.disconnect();
      visibleHeadingsMap.clear();

      // 全ての見出しを取得して監視
      const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"));
      headings.forEach(heading => {
        headingObserver.observe(heading);
        visibleHeadingsMap.set(heading, false); // 初期状態は非表示
      });
    };

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

      // 現在ウィンドウ内に表示されている見出しのみを特定（Intersection Observerの情報を使用）
      const visibleHeadings = headings.filter(heading => {
        // Intersection Observerで追跡している可視性情報を使用
        return visibleHeadingsMap.get(heading) === true;
      });

      // 現在のスクロール位置に最も近い見出しを特定
      let closestHeading = null;
      let closestDistance = Infinity;

      headings.forEach(heading => {
        const rect = heading.getBoundingClientRect();
        // 画面上部からの距離（絶対値）を計算
        const distance = Math.abs(rect.top);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestHeading = heading;
        }
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

        // 表示状態が有効な場合のみ表示
        if (isVisible) {
          container.classList.add("visible");
        }
      } else if (lastVisibleHeadings.length > 0 || closestHeading) {
        // 見出しが見つからない場合でも、最後に表示された見出しまたは最も近い見出しを使用
        if (lastVisibleHeadings.length > 0) {
          headingsToShow = lastVisibleHeadings;
        } else if (closestHeading) {
          headingsToShow = [closestHeading];
        }

        // 表示状態が有効な場合のみ表示
        if (isVisible) {
          container.classList.add("visible");
        }
      } else {
        // 表示する見出しがない場合は非表示
        container.classList.remove("visible");
        return;
      }

      // 表示する見出しがない場合は処理を終了
      if (headingsToShow.length === 0) {
        return;
      }

      // 表示する見出しをドキュメント内の順序でソート
      // 現在表示されている見出しと、スクロール位置より上にある見出しを対象とする
      const sortedHeadings = [...headings].filter(heading => {
        const rect = heading.getBoundingClientRect();
        // 画面内に表示されているか、スクロール位置より上にある見出しを対象とする
        return visibleHeadingsMap.get(heading) === true || rect.top <= 0;
      });

      // 現在のスクロール位置に最も近い（上部にある）見出しを特定
      let currentHeading = null;
      let closestAboveDistance = Infinity;

      // 画面上部より上にある見出しの中で、最も近いものを選択
      for (const heading of sortedHeadings) {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= 0) {
          const distance = Math.abs(rect.top);
          if (distance < closestAboveDistance) {
            closestAboveDistance = distance;
            currentHeading = heading;
          }
        }
      }

      // 現在の見出しがない場合は、画面内の最初の見出しを使用
      if (!currentHeading && sortedHeadings.length > 0) {
        currentHeading = sortedHeadings[0];
      }

      // 表示する見出しがない場合は処理を終了
      if (!currentHeading) {
        return;
      }

      // 現在の見出しのレベル
      const currentLevel = parseInt(currentHeading.tagName.substring(1));

      // 現在の見出しが変わったかチェック
      const currentHeadingText = currentHeading.textContent || "";
      if (currentHeadingText !== lastCurrentHeadingText) {
        lastCurrentHeadingText = currentHeadingText;
        forceUpdate = true;
      }

      // スクロール位置が大きく変わった場合も更新を強制
      if (!forceUpdate && Math.random() < 0.1) { // 10%の確率で強制更新
        forceUpdate = true;
      }

      // 表示する見出しを収集
      const relevantHeadings: Element[] = [];
      const addedHeadings = new Set<Element>();

      // 実際に表示されている見出しを収集（Intersection Observerの情報を使用）
      const visibleOnlyHeadings = headings.filter(heading => {
        return visibleHeadingsMap.get(heading) === true;
      });

      // 現在の見出しが表示されていない場合は追加
      if (currentHeading && !visibleOnlyHeadings.includes(currentHeading)) {
        visibleOnlyHeadings.push(currentHeading);
      }

      // 先祖の見出し要素を追加（遡れるようにする）
      if (currentHeading) {
        const index = headings.indexOf(currentHeading);
        const currentLevel = parseInt(currentHeading.tagName.substring(1));

        // 先に現在の見出しの先祖（上位レベル）を特定
        const ancestorLevels = new Map<number, number>(); // レベルごとにインデックスを保存
        for (let i = 0; i < index; i++) {
          const heading = headings[i];
          const level = parseInt(heading.tagName.substring(1));

          // 各レベルごとに最も近い先祖のインデックスを記録
          if (!ancestorLevels.has(level) || i > ancestorLevels.get(level)!) {
            ancestorLevels.set(level, i);
          }
        }

        // 現在の見出しのレベルより上位レベルの先祖を追加（レベル順）
        for (let level = 1; level < currentLevel; level++) {
          if (ancestorLevels.has(level)) {
            const ancestorIndex = ancestorLevels.get(level)!;
            const ancestor = headings[ancestorIndex];
            if (!addedHeadings.has(ancestor)) {
              relevantHeadings.push(ancestor);
              addedHeadings.add(ancestor);
            }
          }
        }
      }

      // 実際に表示されている見出しを追加
      for (const heading of visibleOnlyHeadings) {
        if (!addedHeadings.has(heading)) {
          relevantHeadings.push(heading);
          addedHeadings.add(heading);
        }
      }

      // 最終的に表示する見出しをページ上の順序（DOM順）で並べ直す
      relevantHeadings.sort((a, b) => {
        const indexA = headings.indexOf(a);
        const indexB = headings.indexOf(b);
        return indexA - indexB;
      });


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

      // 常に一番下の見出しが表示される位置までスクロール
      if (relevantHeadings.length > 0) {
        // 少し遅延させてスクロール（DOMの更新を待つ）
        setTimeout(() => {
          const lastItem = container.lastElementChild;
          if (lastItem) {
            lastItem.scrollIntoView({ block: 'nearest' });
          }
        }, 10);
      }
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
    const observer = new MutationObserver((mutations) => {
      // DOMが変更されたら見出しの監視を更新
      const hasStructuralChanges = mutations.some(mutation =>
        mutation.type === 'childList' ||
        (mutation.type === 'attributes' && mutation.target.nodeName.match(/^H[1-6]$/i))
      );

      if (hasStructuralChanges) {
        // 見出し要素が追加/削除された可能性があるため、監視を更新
        observeAllHeadings();
      }

      requestAnimationFrame(updateStickyScroll);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['id', 'class', 'style']
    });

    // 初期化
    observeAllHeadings(); // 最初に全ての見出しを監視
    updateStickyScroll();
  },
});
