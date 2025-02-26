var content = function() {
  "use strict";var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  var _a, _b;
  const browser = (
    // @ts-expect-error
    ((_b = (_a = globalThis.browser) == null ? void 0 : _a.runtime) == null ? void 0 : _b.id) == null ? globalThis.chrome : (
      // @ts-expect-error
      globalThis.browser
    )
  );
  function defineContentScript(definition2) {
    return definition2;
  }
  const DEFAULT_MAX_VISIBLE_LINES = 5;
  const definition = defineContentScript({
    matches: ["<all_urls>"],
    async main() {
      const result2 = await browser.storage.local.get(["urlPatterns", "maxVisibleLines"]);
      const urlPatterns = result2.urlPatterns || [];
      const maxVisibleLines = result2.maxVisibleLines || DEFAULT_MAX_VISIBLE_LINES;
      const currentUrl = window.location.href;
      const shouldActivate = urlPatterns.length > 0 && urlPatterns.some((pattern) => {
        const regex = new RegExp(pattern.pattern.replace(/\*/g, ".*"));
        return regex.test(currentUrl);
      });
      if (!shouldActivate) {
        console.log("Notion Scroll Sticky: URLパターンに一致しないため無効化されています");
        return;
      }
      console.log("Notion Scroll Sticky: 有効化されました");
      const LINE_HEIGHT = 28;
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
      const container = document.createElement("div");
      container.className = "notion-sticky-scroll-container";
      document.body.appendChild(container);
      let lastVisibleHeadings = [];
      let lastCurrentHeadingText = null;
      let hideTimeout = null;
      let lastUpdateTime = 0;
      const UPDATE_THROTTLE = 30;
      const updateStickyScroll = () => {
        var _a2, _b2, _c, _d;
        const now = Date.now();
        if (now - lastUpdateTime < UPDATE_THROTTLE) {
          return;
        }
        lastUpdateTime = now;
        const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"));
        if (headings.length === 0) {
          return;
        }
        const visibleHeadings = headings.filter((heading) => {
          const rect = heading.getBoundingClientRect();
          return rect.top <= 300 && rect.bottom > -100;
        });
        let headingsToShow = visibleHeadings;
        let forceUpdate = false;
        if (visibleHeadings.length > 0) {
          lastVisibleHeadings = visibleHeadings;
          if (hideTimeout !== null) {
            window.clearTimeout(hideTimeout);
            hideTimeout = null;
          }
          container.classList.add("visible");
        } else if (lastVisibleHeadings.length > 0) {
          headingsToShow = lastVisibleHeadings;
          if (hideTimeout === null) {
            hideTimeout = window.setTimeout(() => {
              container.classList.remove("visible");
              hideTimeout = null;
            }, 3e3);
          }
        } else {
          container.classList.remove("visible");
          return;
        }
        const currentHeading = headingsToShow[0];
        const currentLevel = parseInt(currentHeading.tagName.substring(1));
        const currentHeadingText = currentHeading.textContent || "";
        if (currentHeadingText !== lastCurrentHeadingText) {
          lastCurrentHeadingText = currentHeadingText;
          forceUpdate = true;
        }
        if (!forceUpdate && Math.random() < 0.1) {
          forceUpdate = true;
        }
        const index = headings.indexOf(currentHeading);
        const relevantHeadings = [];
        relevantHeadings.push(currentHeading);
        for (let i = index - 1; i >= 0; i--) {
          const heading = headings[i];
          const level = parseInt(heading.tagName.substring(1));
          if (level < currentLevel) {
            relevantHeadings.unshift(heading);
          }
        }
        if (!forceUpdate && container.childElementCount > 0 && container.childElementCount === relevantHeadings.length) {
          const firstItemText = (_a2 = container.firstElementChild) == null ? void 0 : _a2.textContent;
          const lastItemText = (_b2 = container.lastElementChild) == null ? void 0 : _b2.textContent;
          const firstHeadingText = (_c = relevantHeadings[0]) == null ? void 0 : _c.textContent;
          const lastHeadingText = (_d = relevantHeadings[relevantHeadings.length - 1]) == null ? void 0 : _d.textContent;
          if (firstItemText === firstHeadingText && lastItemText === lastHeadingText) {
            return;
          }
        }
        container.innerHTML = "";
        relevantHeadings.forEach((heading) => {
          const level = heading.tagName.toLowerCase();
          const item = document.createElement("div");
          item.className = `notion-sticky-scroll-item notion-sticky-scroll-${level}`;
          item.textContent = heading.textContent;
          item.addEventListener("click", (e) => {
            var _a3;
            e.preventDefault();
            e.stopPropagation();
            const headingId = heading.id || heading.getAttribute("data-block-id") || ((_a3 = heading.querySelector("[id]")) == null ? void 0 : _a3.id);
            const scrollToHeading = () => {
              heading.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });
              setTimeout(() => {
                const scrollContainers = document.querySelectorAll(".notion-frame, .notion-scroller");
                scrollContainers.forEach((container2) => {
                  if (container2 instanceof HTMLElement) {
                    const headingRect = heading.getBoundingClientRect();
                    const containerRect = container2.getBoundingClientRect();
                    const relativePosition = headingRect.top - containerRect.top + container2.scrollTop;
                    const headerHeight = 60;
                    container2.scrollTo({
                      top: relativePosition - headerHeight,
                      behavior: "smooth"
                    });
                  }
                });
              }, 50);
            };
            if (headingId) {
              const currentUrl2 = new URL(window.location.href);
              currentUrl2.hash = `#${headingId}`;
              window.history.pushState({}, "", currentUrl2.toString());
              setTimeout(scrollToHeading, 10);
            } else {
              scrollToHeading();
            }
          });
          container.appendChild(item);
        });
      };
      let isScrolling = false;
      let scrollEndTimeout = null;
      let animationFrameId = null;
      window.addEventListener("scroll", () => {
        isScrolling = true;
        if (scrollEndTimeout !== null) {
          window.clearTimeout(scrollEndTimeout);
        }
        scrollEndTimeout = window.setTimeout(() => {
          isScrolling = false;
          requestAnimationFrame(() => {
            if (animationFrameId !== null) {
              cancelAnimationFrame(animationFrameId);
            }
            updateStickyScroll();
          });
          scrollEndTimeout = null;
        }, 100);
        if (animationFrameId === null) {
          animationFrameId = requestAnimationFrame(function updateOnScroll() {
            updateStickyScroll();
            if (isScrolling) {
              animationFrameId = requestAnimationFrame(updateOnScroll);
            } else {
              animationFrameId = null;
            }
          });
        }
      }, { passive: true });
      const observer = new MutationObserver(() => {
        requestAnimationFrame(updateStickyScroll);
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      updateStickyScroll();
    }
  });
  content;
  function print$1(method, ...args) {
    if (typeof args[0] === "string") {
      const message = args.shift();
      method(`[wxt] ${message}`, ...args);
    } else {
      method("[wxt]", ...args);
    }
  }
  const logger$1 = {
    debug: (...args) => print$1(console.debug, ...args),
    log: (...args) => print$1(console.log, ...args),
    warn: (...args) => print$1(console.warn, ...args),
    error: (...args) => print$1(console.error, ...args)
  };
  const _WxtLocationChangeEvent = class _WxtLocationChangeEvent extends Event {
    constructor(newUrl, oldUrl) {
      super(_WxtLocationChangeEvent.EVENT_NAME, {});
      this.newUrl = newUrl;
      this.oldUrl = oldUrl;
    }
  };
  __publicField(_WxtLocationChangeEvent, "EVENT_NAME", getUniqueEventName("wxt:locationchange"));
  let WxtLocationChangeEvent = _WxtLocationChangeEvent;
  function getUniqueEventName(eventName) {
    var _a2;
    return `${(_a2 = browser == null ? void 0 : browser.runtime) == null ? void 0 : _a2.id}:${"content"}:${eventName}`;
  }
  function createLocationWatcher(ctx) {
    let interval;
    let oldUrl;
    return {
      /**
       * Ensure the location watcher is actively looking for URL changes. If it's already watching,
       * this is a noop.
       */
      run() {
        if (interval != null) return;
        oldUrl = new URL(location.href);
        interval = ctx.setInterval(() => {
          let newUrl = new URL(location.href);
          if (newUrl.href !== oldUrl.href) {
            window.dispatchEvent(new WxtLocationChangeEvent(newUrl, oldUrl));
            oldUrl = newUrl;
          }
        }, 1e3);
      }
    };
  }
  const _ContentScriptContext = class _ContentScriptContext {
    constructor(contentScriptName, options) {
      __publicField(this, "isTopFrame", window.self === window.top);
      __publicField(this, "abortController");
      __publicField(this, "locationWatcher", createLocationWatcher(this));
      __publicField(this, "receivedMessageIds", /* @__PURE__ */ new Set());
      this.contentScriptName = contentScriptName;
      this.options = options;
      this.abortController = new AbortController();
      if (this.isTopFrame) {
        this.listenForNewerScripts({ ignoreFirstEvent: true });
        this.stopOldScripts();
      } else {
        this.listenForNewerScripts();
      }
    }
    get signal() {
      return this.abortController.signal;
    }
    abort(reason) {
      return this.abortController.abort(reason);
    }
    get isInvalid() {
      if (browser.runtime.id == null) {
        this.notifyInvalidated();
      }
      return this.signal.aborted;
    }
    get isValid() {
      return !this.isInvalid;
    }
    /**
     * Add a listener that is called when the content script's context is invalidated.
     *
     * @returns A function to remove the listener.
     *
     * @example
     * browser.runtime.onMessage.addListener(cb);
     * const removeInvalidatedListener = ctx.onInvalidated(() => {
     *   browser.runtime.onMessage.removeListener(cb);
     * })
     * // ...
     * removeInvalidatedListener();
     */
    onInvalidated(cb) {
      this.signal.addEventListener("abort", cb);
      return () => this.signal.removeEventListener("abort", cb);
    }
    /**
     * Return a promise that never resolves. Useful if you have an async function that shouldn't run
     * after the context is expired.
     *
     * @example
     * const getValueFromStorage = async () => {
     *   if (ctx.isInvalid) return ctx.block();
     *
     *   // ...
     * }
     */
    block() {
      return new Promise(() => {
      });
    }
    /**
     * Wrapper around `window.setInterval` that automatically clears the interval when invalidated.
     */
    setInterval(handler, timeout) {
      const id = setInterval(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearInterval(id));
      return id;
    }
    /**
     * Wrapper around `window.setTimeout` that automatically clears the interval when invalidated.
     */
    setTimeout(handler, timeout) {
      const id = setTimeout(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearTimeout(id));
      return id;
    }
    /**
     * Wrapper around `window.requestAnimationFrame` that automatically cancels the request when
     * invalidated.
     */
    requestAnimationFrame(callback) {
      const id = requestAnimationFrame((...args) => {
        if (this.isValid) callback(...args);
      });
      this.onInvalidated(() => cancelAnimationFrame(id));
      return id;
    }
    /**
     * Wrapper around `window.requestIdleCallback` that automatically cancels the request when
     * invalidated.
     */
    requestIdleCallback(callback, options) {
      const id = requestIdleCallback((...args) => {
        if (!this.signal.aborted) callback(...args);
      }, options);
      this.onInvalidated(() => cancelIdleCallback(id));
      return id;
    }
    addEventListener(target, type, handler, options) {
      var _a2;
      if (type === "wxt:locationchange") {
        if (this.isValid) this.locationWatcher.run();
      }
      (_a2 = target.addEventListener) == null ? void 0 : _a2.call(
        target,
        type.startsWith("wxt:") ? getUniqueEventName(type) : type,
        handler,
        {
          ...options,
          signal: this.signal
        }
      );
    }
    /**
     * @internal
     * Abort the abort controller and execute all `onInvalidated` listeners.
     */
    notifyInvalidated() {
      this.abort("Content script context invalidated");
      logger$1.debug(
        `Content script "${this.contentScriptName}" context invalidated`
      );
    }
    stopOldScripts() {
      window.postMessage(
        {
          type: _ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE,
          contentScriptName: this.contentScriptName,
          messageId: Math.random().toString(36).slice(2)
        },
        "*"
      );
    }
    verifyScriptStartedEvent(event) {
      var _a2, _b2, _c;
      const isScriptStartedEvent = ((_a2 = event.data) == null ? void 0 : _a2.type) === _ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE;
      const isSameContentScript = ((_b2 = event.data) == null ? void 0 : _b2.contentScriptName) === this.contentScriptName;
      const isNotDuplicate = !this.receivedMessageIds.has((_c = event.data) == null ? void 0 : _c.messageId);
      return isScriptStartedEvent && isSameContentScript && isNotDuplicate;
    }
    listenForNewerScripts(options) {
      let isFirst = true;
      const cb = (event) => {
        if (this.verifyScriptStartedEvent(event)) {
          this.receivedMessageIds.add(event.data.messageId);
          const wasFirst = isFirst;
          isFirst = false;
          if (wasFirst && (options == null ? void 0 : options.ignoreFirstEvent)) return;
          this.notifyInvalidated();
        }
      };
      addEventListener("message", cb);
      this.onInvalidated(() => removeEventListener("message", cb));
    }
  };
  __publicField(_ContentScriptContext, "SCRIPT_STARTED_MESSAGE_TYPE", getUniqueEventName(
    "wxt:content-script-started"
  ));
  let ContentScriptContext = _ContentScriptContext;
  const nullKey = Symbol("null");
  let keyCounter = 0;
  class ManyKeysMap extends Map {
    constructor() {
      super();
      this._objectHashes = /* @__PURE__ */ new WeakMap();
      this._symbolHashes = /* @__PURE__ */ new Map();
      this._publicKeys = /* @__PURE__ */ new Map();
      const [pairs] = arguments;
      if (pairs === null || pairs === void 0) {
        return;
      }
      if (typeof pairs[Symbol.iterator] !== "function") {
        throw new TypeError(typeof pairs + " is not iterable (cannot read property Symbol(Symbol.iterator))");
      }
      for (const [keys, value] of pairs) {
        this.set(keys, value);
      }
    }
    _getPublicKeys(keys, create = false) {
      if (!Array.isArray(keys)) {
        throw new TypeError("The keys parameter must be an array");
      }
      const privateKey = this._getPrivateKey(keys, create);
      let publicKey;
      if (privateKey && this._publicKeys.has(privateKey)) {
        publicKey = this._publicKeys.get(privateKey);
      } else if (create) {
        publicKey = [...keys];
        this._publicKeys.set(privateKey, publicKey);
      }
      return { privateKey, publicKey };
    }
    _getPrivateKey(keys, create = false) {
      const privateKeys = [];
      for (let key of keys) {
        if (key === null) {
          key = nullKey;
        }
        const hashes = typeof key === "object" || typeof key === "function" ? "_objectHashes" : typeof key === "symbol" ? "_symbolHashes" : false;
        if (!hashes) {
          privateKeys.push(key);
        } else if (this[hashes].has(key)) {
          privateKeys.push(this[hashes].get(key));
        } else if (create) {
          const privateKey = `@@mkm-ref-${keyCounter++}@@`;
          this[hashes].set(key, privateKey);
          privateKeys.push(privateKey);
        } else {
          return false;
        }
      }
      return JSON.stringify(privateKeys);
    }
    set(keys, value) {
      const { publicKey } = this._getPublicKeys(keys, true);
      return super.set(publicKey, value);
    }
    get(keys) {
      const { publicKey } = this._getPublicKeys(keys);
      return super.get(publicKey);
    }
    has(keys) {
      const { publicKey } = this._getPublicKeys(keys);
      return super.has(publicKey);
    }
    delete(keys) {
      const { publicKey, privateKey } = this._getPublicKeys(keys);
      return Boolean(publicKey && super.delete(publicKey) && this._publicKeys.delete(privateKey));
    }
    clear() {
      super.clear();
      this._symbolHashes.clear();
      this._publicKeys.clear();
    }
    get [Symbol.toStringTag]() {
      return "ManyKeysMap";
    }
    get size() {
      return super.size;
    }
  }
  new ManyKeysMap();
  function initPlugins() {
  }
  function print(method, ...args) {
    if (typeof args[0] === "string") {
      const message = args.shift();
      method(`[wxt] ${message}`, ...args);
    } else {
      method("[wxt]", ...args);
    }
  }
  const logger = {
    debug: (...args) => print(console.debug, ...args),
    log: (...args) => print(console.log, ...args),
    warn: (...args) => print(console.warn, ...args),
    error: (...args) => print(console.error, ...args)
  };
  const result = (async () => {
    try {
      initPlugins();
      const { main, ...options } = definition;
      const ctx = new ContentScriptContext("content", options);
      return await main(ctx);
    } catch (err) {
      logger.error(
        `The content script "${"content"}" crashed on startup!`,
        err
      );
      throw err;
    }
  })();
  return result;
}();
content;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIvY2hyb21lLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC9zYW5kYm94L2RlZmluZS1jb250ZW50LXNjcmlwdC5tanMiLCIuLi8uLi8uLi9lbnRyeXBvaW50cy9jb250ZW50LnRzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3NhbmRib3gvdXRpbHMvbG9nZ2VyLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC9jbGllbnQvY29udGVudC1zY3JpcHRzL2N1c3RvbS1ldmVudHMubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2NsaWVudC9jb250ZW50LXNjcmlwdHMvbG9jYXRpb24td2F0Y2hlci5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvY2xpZW50L2NvbnRlbnQtc2NyaXB0cy9jb250ZW50LXNjcmlwdC1jb250ZXh0Lm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9tYW55LWtleXMtbWFwL2luZGV4LmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0AxbmF0c3Uvd2FpdC1lbGVtZW50L2Rpc3QvaW5kZXgubWpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjb25zdCBicm93c2VyID0gKFxuICAvLyBAdHMtZXhwZWN0LWVycm9yXG4gIGdsb2JhbFRoaXMuYnJvd3Nlcj8ucnVudGltZT8uaWQgPT0gbnVsbCA/IGdsb2JhbFRoaXMuY2hyb21lIDogKFxuICAgIC8vIEB0cy1leHBlY3QtZXJyb3JcbiAgICBnbG9iYWxUaGlzLmJyb3dzZXJcbiAgKVxuKTtcbiIsImV4cG9ydCBmdW5jdGlvbiBkZWZpbmVDb250ZW50U2NyaXB0KGRlZmluaXRpb24pIHtcbiAgcmV0dXJuIGRlZmluaXRpb247XG59XG4iLCJpbXBvcnQgeyBicm93c2VyIH0gZnJvbSBcInd4dC9icm93c2VyXCI7XG5pbXBvcnQgeyBkZWZpbmVDb250ZW50U2NyaXB0IH0gZnJvbSBcInd4dC9zYW5kYm94XCI7XG5cbmludGVyZmFjZSBVcmxQYXR0ZXJuIHtcbiAgaWQ6IHN0cmluZztcbiAgcGF0dGVybjogc3RyaW5nO1xufVxuXG4vLyDoqK3lrprjga7jg4fjg5Xjgqnjg6vjg4jlgKRcbmNvbnN0IERFRkFVTFRfTUFYX1ZJU0lCTEVfTElORVMgPSA1O1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb250ZW50U2NyaXB0KHtcbiAgbWF0Y2hlczogW1wiPGFsbF91cmxzPlwiXSxcbiAgYXN5bmMgbWFpbigpIHtcbiAgICAvLyDoqK3lrprjgpLlj5blvpdcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBicm93c2VyLnN0b3JhZ2UubG9jYWwuZ2V0KFtcInVybFBhdHRlcm5zXCIsIFwibWF4VmlzaWJsZUxpbmVzXCJdKTtcbiAgICBjb25zdCB1cmxQYXR0ZXJucyA9IHJlc3VsdC51cmxQYXR0ZXJucyBhcyBVcmxQYXR0ZXJuW10gfHwgW107XG4gICAgY29uc3QgbWF4VmlzaWJsZUxpbmVzID0gcmVzdWx0Lm1heFZpc2libGVMaW5lcyBhcyBudW1iZXIgfHwgREVGQVVMVF9NQVhfVklTSUJMRV9MSU5FUztcblxuICAgIC8vIOePvuWcqOOBrlVSTOOBjOODkeOCv+ODvOODs+OBq+S4gOiHtOOBmeOCi+OBi+eiuuiqjVxuICAgIGNvbnN0IGN1cnJlbnRVcmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZjtcbiAgICBjb25zdCBzaG91bGRBY3RpdmF0ZSA9IHVybFBhdHRlcm5zLmxlbmd0aCA+IDAgJiYgdXJsUGF0dGVybnMuc29tZShwYXR0ZXJuID0+IHtcbiAgICAgIGNvbnN0IHJlZ2V4ID0gbmV3IFJlZ0V4cChwYXR0ZXJuLnBhdHRlcm4ucmVwbGFjZSgvXFwqL2csIFwiLipcIikpO1xuICAgICAgcmV0dXJuIHJlZ2V4LnRlc3QoY3VycmVudFVybCk7XG4gICAgfSk7XG5cbiAgICBpZiAoIXNob3VsZEFjdGl2YXRlKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIk5vdGlvbiBTY3JvbGwgU3RpY2t5OiBVUkzjg5Hjgr/jg7zjg7PjgavkuIDoh7TjgZfjgarjgYTjgZ/jgoHnhKHlirnljJbjgZXjgozjgabjgYTjgb7jgZlcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coXCJOb3Rpb24gU2Nyb2xsIFN0aWNreTog5pyJ5Yq55YyW44GV44KM44G+44GX44GfXCIpO1xuXG4gICAgLy8gMeihjOOBguOBn+OCiuOBrumrmOOBleOCkuioiOeul++8iOODlOOCr+OCu+ODq++8iVxuICAgIGNvbnN0IExJTkVfSEVJR0hUID0gMjg7IC8vIOimi+WHuuOBl+mgheebruOBrumrmOOBle+8iOODnuODvOOCuOODs+ODu+ODkeODh+OCo+ODs+OCsOWQq+OCgO+8iVxuXG4gICAgLy8g44K544K/44Kk44Or44KS6L+95YqgXG4gICAgY29uc3Qgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3R5bGVcIik7XG4gICAgc3R5bGUudGV4dENvbnRlbnQgPSBgXG4gICAgICAubm90aW9uLXN0aWNreS1zY3JvbGwtY29udGFpbmVyIHtcbiAgICAgICAgcG9zaXRpb246IGZpeGVkO1xuICAgICAgICB0b3A6IDA7XG4gICAgICAgIGxlZnQ6IDA7XG4gICAgICAgIHJpZ2h0OiAwO1xuICAgICAgICB6LWluZGV4OiAxMDAwO1xuICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuOTUpO1xuICAgICAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgcmdiYSgwLCAwLCAwLCAwLjEpO1xuICAgICAgICBib3gtc2hhZG93OiAwIDJweCA4cHggcmdiYSgwLCAwLCAwLCAwLjEpO1xuICAgICAgICBwYWRkaW5nOiA4cHggMTZweDtcbiAgICAgICAgZm9udC13ZWlnaHQ6IGJvbGQ7XG4gICAgICAgIG1heC1oZWlnaHQ6ICR7bWF4VmlzaWJsZUxpbmVzICogTElORV9IRUlHSFR9cHg7XG4gICAgICAgIG92ZXJmbG93LXk6IGF1dG87XG4gICAgICAgIG92ZXJmbG93LXg6IGhpZGRlbjtcbiAgICAgICAgdHJhbnNpdGlvbjogdHJhbnNmb3JtIDAuM3MgZWFzZTtcbiAgICAgICAgdHJhbnNmb3JtOiB0cmFuc2xhdGVZKC0xMDAlKTtcbiAgICAgICAgc2Nyb2xsYmFyLXdpZHRoOiB0aGluO1xuICAgICAgICAtd2Via2l0LW92ZXJmbG93LXNjcm9sbGluZzogdG91Y2g7IC8qIGlPU+OBp+OBruOCueODoOODvOOCuuOCueOCr+ODreODvOODqyAqL1xuICAgICAgfVxuXG4gICAgICAubm90aW9uLXN0aWNreS1zY3JvbGwtY29udGFpbmVyOjotd2Via2l0LXNjcm9sbGJhciB7XG4gICAgICAgIHdpZHRoOiA2cHg7XG4gICAgICB9XG5cbiAgICAgIC5ub3Rpb24tc3RpY2t5LXNjcm9sbC1jb250YWluZXI6Oi13ZWJraXQtc2Nyb2xsYmFyLXRyYWNrIHtcbiAgICAgICAgYmFja2dyb3VuZDogcmdiYSgwLCAwLCAwLCAwLjA1KTtcbiAgICAgICAgYm9yZGVyLXJhZGl1czogM3B4O1xuICAgICAgfVxuXG4gICAgICAubm90aW9uLXN0aWNreS1zY3JvbGwtY29udGFpbmVyOjotd2Via2l0LXNjcm9sbGJhci10aHVtYiB7XG4gICAgICAgIGJhY2tncm91bmQ6IHJnYmEoMCwgMCwgMCwgMC4yKTtcbiAgICAgICAgYm9yZGVyLXJhZGl1czogM3B4O1xuICAgICAgfVxuXG4gICAgICAubm90aW9uLXN0aWNreS1zY3JvbGwtY29udGFpbmVyLnZpc2libGUge1xuICAgICAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZVkoMCk7XG4gICAgICB9XG5cbiAgICAgIC5ub3Rpb24tc3RpY2t5LXNjcm9sbC1pdGVtIHtcbiAgICAgICAgbWFyZ2luOiA0cHggMDtcbiAgICAgICAgcGFkZGluZzogNHB4IDA7XG4gICAgICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCByZ2JhKDAsIDAsIDAsIDAuMDUpO1xuICAgICAgICBjdXJzb3I6IHBvaW50ZXI7XG4gICAgICB9XG5cbiAgICAgIC5ub3Rpb24tc3RpY2t5LXNjcm9sbC1pdGVtOmhvdmVyIHtcbiAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogcmdiYSgwLCAwLCAwLCAwLjAzKTtcbiAgICAgIH1cblxuICAgICAgLm5vdGlvbi1zdGlja3ktc2Nyb2xsLWl0ZW06bGFzdC1jaGlsZCB7XG4gICAgICAgIGJvcmRlci1ib3R0b206IG5vbmU7XG4gICAgICB9XG5cbiAgICAgIC5ub3Rpb24tc3RpY2t5LXNjcm9sbC1oMSB7IGZvbnQtc2l6ZTogMS4ycmVtOyBwYWRkaW5nLWxlZnQ6IDA7IH1cbiAgICAgIC5ub3Rpb24tc3RpY2t5LXNjcm9sbC1oMiB7IGZvbnQtc2l6ZTogMS4xcmVtOyBwYWRkaW5nLWxlZnQ6IDE2cHg7IH1cbiAgICAgIC5ub3Rpb24tc3RpY2t5LXNjcm9sbC1oMyB7IGZvbnQtc2l6ZTogMXJlbTsgcGFkZGluZy1sZWZ0OiAzMnB4OyB9XG4gICAgICAubm90aW9uLXN0aWNreS1zY3JvbGwtaDQgeyBmb250LXNpemU6IDAuOTVyZW07IHBhZGRpbmctbGVmdDogNDhweDsgfVxuICAgICAgLm5vdGlvbi1zdGlja3ktc2Nyb2xsLWg1IHsgZm9udC1zaXplOiAwLjlyZW07IHBhZGRpbmctbGVmdDogNjRweDsgfVxuICAgICAgLm5vdGlvbi1zdGlja3ktc2Nyb2xsLWg2IHsgZm9udC1zaXplOiAwLjg1cmVtOyBwYWRkaW5nLWxlZnQ6IDgwcHg7IH1cbiAgICBgO1xuICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xuXG4gICAgLy8g44K544OG44Kj44OD44Kt44O844K544Kv44Ot44O844Or44Kz44Oz44OG44OK44KS5L2c5oiQXG4gICAgY29uc3QgY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICBjb250YWluZXIuY2xhc3NOYW1lID0gXCJub3Rpb24tc3RpY2t5LXNjcm9sbC1jb250YWluZXJcIjtcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGNvbnRhaW5lcik7XG5cbiAgICAvLyDmnIDlvozjgavooajnpLrjgZXjgozjgZ/opovlh7rjgZfopoHntKDjgpLkv53mjIHjgZnjgovlpInmlbBcbiAgICBsZXQgbGFzdFZpc2libGVIZWFkaW5nczogRWxlbWVudFtdID0gW107XG4gICAgbGV0IGxhc3RDdXJyZW50SGVhZGluZ1RleHQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgIGxldCBoaWRlVGltZW91dDogbnVtYmVyIHwgbnVsbCA9IG51bGw7XG4gICAgbGV0IGxhc3RVcGRhdGVUaW1lID0gMDtcbiAgICBjb25zdCBVUERBVEVfVEhST1RUTEUgPSAzMDsgLy8g5pu05paw6ZaT6ZqU77yI44Of44Oq56eS77yJLSDnn63jgY/jgZfjgablj43lv5zmgKfjgpLlkJHkuIpcblxuICAgIC8vIOimi+WHuuOBl+imgee0oOOCkuebo+imluOBmeOCi+mWouaVsFxuICAgIGNvbnN0IHVwZGF0ZVN0aWNreVNjcm9sbCA9ICgpID0+IHtcbiAgICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG5cbiAgICAgIC8vIOWJjeWbnuOBruabtOaWsOOBi+OCieS4gOWumuaZgumWk+e1jOmBjuOBl+OBpuOBhOOBquOBhOWgtOWQiOOBr+OCueOCreODg+ODl++8iOOCueOCr+ODreODvOODq+S4reOBrumgu+e5geOBquabtOaWsOOCkumYsuatou+8iVxuICAgICAgaWYgKG5vdyAtIGxhc3RVcGRhdGVUaW1lIDwgVVBEQVRFX1RIUk9UVExFKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgbGFzdFVwZGF0ZVRpbWUgPSBub3c7XG5cbiAgICAgIC8vIOimi+WHuuOBl+imgee0oOOCkuWPluW+l1xuICAgICAgY29uc3QgaGVhZGluZ3MgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCJoMSwgaDIsIGgzLCBoNCwgaDUsIGg2XCIpKTtcblxuICAgICAgaWYgKGhlYWRpbmdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIOePvuWcqOihqOekuuOBleOCjOOBpuOBhOOCi+imi+WHuuOBl+OCkueJueWumu+8iOaknOWHuuevhOWbsuOCkuW6g+OBkuOCi++8iVxuICAgICAgY29uc3QgdmlzaWJsZUhlYWRpbmdzID0gaGVhZGluZ3MuZmlsdGVyKGhlYWRpbmcgPT4ge1xuICAgICAgICBjb25zdCByZWN0ID0gaGVhZGluZy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgLy8g55S76Z2i5LiK6YOo44GL44KJMzAwcHjku6XlhoXjgIHjgb7jgZ/jga/nlLvpnaLlhoXvvIjkuIvpg6jvvInjgavopovlh7rjgZfjgYzlhaXjgaPjgabjgYTjgovloLTlkIjjgavmpJzlh7pcbiAgICAgICAgcmV0dXJuIHJlY3QudG9wIDw9IDMwMCAmJiByZWN0LmJvdHRvbSA+IC0xMDA7XG4gICAgICB9KTtcblxuICAgICAgLy8g6KGo56S644GZ44KL6KaL5Ye644GX6KaB57Sg44KS5rG65a6aXG4gICAgICBsZXQgaGVhZGluZ3NUb1Nob3cgPSB2aXNpYmxlSGVhZGluZ3M7XG4gICAgICBsZXQgZm9yY2VVcGRhdGUgPSBmYWxzZTtcblxuICAgICAgaWYgKHZpc2libGVIZWFkaW5ncy5sZW5ndGggPiAwKSB7XG4gICAgICAgIC8vIOimi+WHuuOBl+OBjOimi+OBpOOBi+OBo+OBn+WgtOWQiOOAgeacgOW+jOOBq+ihqOekuuOBleOCjOOBn+imi+WHuuOBl+OCkuabtOaWsFxuICAgICAgICBsYXN0VmlzaWJsZUhlYWRpbmdzID0gdmlzaWJsZUhlYWRpbmdzO1xuXG4gICAgICAgIC8vIOOCv+OCpOODoOOCouOCpuODiOOBjOOBguOCjOOBsOino+mZpFxuICAgICAgICBpZiAoaGlkZVRpbWVvdXQgIT09IG51bGwpIHtcbiAgICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KGhpZGVUaW1lb3V0KTtcbiAgICAgICAgICBoaWRlVGltZW91dCA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBjb250YWluZXIuY2xhc3NMaXN0LmFkZChcInZpc2libGVcIik7XG4gICAgICB9IGVsc2UgaWYgKGxhc3RWaXNpYmxlSGVhZGluZ3MubGVuZ3RoID4gMCkge1xuICAgICAgICAvLyDopovlh7rjgZfjgYzopovjgaTjgYvjgonjgarjgYTloLTlkIjjgafjgoLjgIHmnIDlvozjgavooajnpLrjgZXjgozjgZ/opovlh7rjgZfjgpLkvb/nlKhcbiAgICAgICAgaGVhZGluZ3NUb1Nob3cgPSBsYXN0VmlzaWJsZUhlYWRpbmdzO1xuXG4gICAgICAgIC8vIOS4gOWumuaZgumWk+W+jOOBq+mdnuihqOekuuOBq+OBmeOCi+OCv+OCpOODnuODvOOCkuOCu+ODg+ODiO+8iOaXouWtmOOBruOCv+OCpOODnuODvOOBjOOBquOBkeOCjOOBsO+8iVxuICAgICAgICBpZiAoaGlkZVRpbWVvdXQgPT09IG51bGwpIHtcbiAgICAgICAgICBoaWRlVGltZW91dCA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIC8vIDPnp5LlvozjgavpnZ7ooajnpLrjgavjgZnjgovvvIjpgJ/jgYTjgrnjgq/jg63jg7zjg6vjgYzmraLjgb7jgaPjgZ/lvozjgoLooajnpLrjgpLntq3mjIHvvIlcbiAgICAgICAgICAgIGNvbnRhaW5lci5jbGFzc0xpc3QucmVtb3ZlKFwidmlzaWJsZVwiKTtcbiAgICAgICAgICAgIGhpZGVUaW1lb3V0ID0gbnVsbDtcbiAgICAgICAgICB9LCAzMDAwKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8g6KGo56S644GZ44KL6KaL5Ye644GX44GM44Gq44GE5aC05ZCI44Gv6Z2e6KGo56S6XG4gICAgICAgIGNvbnRhaW5lci5jbGFzc0xpc3QucmVtb3ZlKFwidmlzaWJsZVwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyDnj77lnKjjga7opovlh7rjgZfjgajjgZ3jga7kuIrkvY3jga7opovlh7rjgZfjgpLooajnpLpcbiAgICAgIGNvbnN0IGN1cnJlbnRIZWFkaW5nID0gaGVhZGluZ3NUb1Nob3dbMF07XG4gICAgICBjb25zdCBjdXJyZW50TGV2ZWwgPSBwYXJzZUludChjdXJyZW50SGVhZGluZy50YWdOYW1lLnN1YnN0cmluZygxKSk7XG5cbiAgICAgIC8vIOePvuWcqOOBruimi+WHuuOBl+OBjOWkieOCj+OBo+OBn+OBi+ODgeOCp+ODg+OCr++8iOODhuOCreOCueODiOWGheWuueOBp+avlOi8g++8iVxuICAgICAgY29uc3QgY3VycmVudEhlYWRpbmdUZXh0ID0gY3VycmVudEhlYWRpbmcudGV4dENvbnRlbnQgfHwgXCJcIjtcbiAgICAgIGlmIChjdXJyZW50SGVhZGluZ1RleHQgIT09IGxhc3RDdXJyZW50SGVhZGluZ1RleHQpIHtcbiAgICAgICAgbGFzdEN1cnJlbnRIZWFkaW5nVGV4dCA9IGN1cnJlbnRIZWFkaW5nVGV4dDtcbiAgICAgICAgZm9yY2VVcGRhdGUgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICAvLyDjgrnjgq/jg63jg7zjg6vkvY3nva7jgYzlpKfjgY3jgY/lpInjgo/jgaPjgZ/loLTlkIjjgoLmm7TmlrDjgpLlvLfliLZcbiAgICAgIGlmICghZm9yY2VVcGRhdGUgJiYgTWF0aC5yYW5kb20oKSA8IDAuMSkgeyAvLyAxMCXjga7norrnjofjgaflvLfliLbmm7TmlrDvvIjplbfmmYLplpPjgrnjgq/jg63jg7zjg6vjgZfjgarjgYTloLTlkIjjga7lr77nrZbvvIlcbiAgICAgICAgZm9yY2VVcGRhdGUgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICAvLyDnj77lnKjjga7opovlh7rjgZfjgojjgorkuIrjgavjgYLjgovopovlh7rjgZfjgpLlj5blvpdcbiAgICAgIGNvbnN0IGluZGV4ID0gaGVhZGluZ3MuaW5kZXhPZihjdXJyZW50SGVhZGluZyk7XG4gICAgICBjb25zdCByZWxldmFudEhlYWRpbmdzID0gW107XG5cbiAgICAgIC8vIOePvuWcqOOBruimi+WHuuOBl+OCkui/veWKoFxuICAgICAgcmVsZXZhbnRIZWFkaW5ncy5wdXNoKGN1cnJlbnRIZWFkaW5nKTtcblxuICAgICAgLy8g54++5Zyo44Gu6KaL5Ye644GX44KI44KK5LiK5L2N44Gu6KaL5Ye644GX44KS6L+95YqgXG4gICAgICBmb3IgKGxldCBpID0gaW5kZXggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICBjb25zdCBoZWFkaW5nID0gaGVhZGluZ3NbaV07XG4gICAgICAgIGNvbnN0IGxldmVsID0gcGFyc2VJbnQoaGVhZGluZy50YWdOYW1lLnN1YnN0cmluZygxKSk7XG5cbiAgICAgICAgaWYgKGxldmVsIDwgY3VycmVudExldmVsKSB7XG4gICAgICAgICAgcmVsZXZhbnRIZWFkaW5ncy51bnNoaWZ0KGhlYWRpbmcpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIOabtOaWsOOBjOW/heimgeOBquOBhOWgtOWQiOOBr+OCueOCreODg+ODl1xuICAgICAgaWYgKCFmb3JjZVVwZGF0ZSAmJiBjb250YWluZXIuY2hpbGRFbGVtZW50Q291bnQgPiAwICYmIGNvbnRhaW5lci5jaGlsZEVsZW1lbnRDb3VudCA9PT0gcmVsZXZhbnRIZWFkaW5ncy5sZW5ndGgpIHtcbiAgICAgICAgLy8g5pei5a2Y44Gu6KaB57Sg5pWw44GM5ZCM44GY5aC05ZCI44Gv5YaF5a6544KS56K66KqN77yI5pyA5Yid44Gu6KaB57Sg44Go5pyA5b6M44Gu6KaB57Sg44Gu44OG44Kt44K544OI44KS44OB44Kn44OD44Kv77yJXG4gICAgICAgIGNvbnN0IGZpcnN0SXRlbVRleHQgPSBjb250YWluZXIuZmlyc3RFbGVtZW50Q2hpbGQ/LnRleHRDb250ZW50O1xuICAgICAgICBjb25zdCBsYXN0SXRlbVRleHQgPSBjb250YWluZXIubGFzdEVsZW1lbnRDaGlsZD8udGV4dENvbnRlbnQ7XG4gICAgICAgIGNvbnN0IGZpcnN0SGVhZGluZ1RleHQgPSByZWxldmFudEhlYWRpbmdzWzBdPy50ZXh0Q29udGVudDtcbiAgICAgICAgY29uc3QgbGFzdEhlYWRpbmdUZXh0ID0gcmVsZXZhbnRIZWFkaW5nc1tyZWxldmFudEhlYWRpbmdzLmxlbmd0aCAtIDFdPy50ZXh0Q29udGVudDtcblxuICAgICAgICBpZiAoZmlyc3RJdGVtVGV4dCA9PT0gZmlyc3RIZWFkaW5nVGV4dCAmJiBsYXN0SXRlbVRleHQgPT09IGxhc3RIZWFkaW5nVGV4dCkge1xuICAgICAgICAgIHJldHVybjsgLy8g5YaF5a6544GM5ZCM44GY44Gq44KJ5pu05paw44GX44Gq44GEXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8g44K544OG44Kj44OD44Kt44O844K544Kv44Ot44O844Or44Gu5YaF5a6544KS5pu05pawXG4gICAgICBjb250YWluZXIuaW5uZXJIVE1MID0gXCJcIjtcblxuICAgICAgLy8g44K544OG44Kj44OD44Kt44O844K544Kv44Ot44O844Or44Gr6KGo56S6XG4gICAgICByZWxldmFudEhlYWRpbmdzLmZvckVhY2goaGVhZGluZyA9PiB7XG4gICAgICAgIGNvbnN0IGxldmVsID0gaGVhZGluZy50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGNvbnN0IGl0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICBpdGVtLmNsYXNzTmFtZSA9IGBub3Rpb24tc3RpY2t5LXNjcm9sbC1pdGVtIG5vdGlvbi1zdGlja3ktc2Nyb2xsLSR7bGV2ZWx9YDtcbiAgICAgICAgaXRlbS50ZXh0Q29udGVudCA9IGhlYWRpbmcudGV4dENvbnRlbnQ7XG5cbiAgICAgICAgLy8g44Kv44Oq44OD44Kv44Gn6Kmy5b2T6KaL5Ye644GX44Gr44K544Kv44Ot44O844OrXG4gICAgICAgIGl0ZW0uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChlKSA9PiB7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cbiAgICAgICAgICAvLyDopovlh7rjgZfjgatJROOBjOOBguOCi+OBi+eiuuiqjVxuICAgICAgICAgIGNvbnN0IGhlYWRpbmdJZCA9IGhlYWRpbmcuaWQgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIChoZWFkaW5nLmdldEF0dHJpYnV0ZSgnZGF0YS1ibG9jay1pZCcpKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgKGhlYWRpbmcucXVlcnlTZWxlY3RvcignW2lkXScpPy5pZCk7XG5cbiAgICAgICAgICAvLyDjgrnjgq/jg63jg7zjg6vlh6bnkIbjga7plqLmlbBcbiAgICAgICAgICBjb25zdCBzY3JvbGxUb0hlYWRpbmcgPSAoKSA9PiB7XG4gICAgICAgICAgICAvLyBzY3JvbGxJbnRvVmlld+OCkuS9v+eUqOOBl+OBpuimi+WHuuOBl+OBq+OCueOCr+ODreODvOODq1xuICAgICAgICAgICAgaGVhZGluZy5zY3JvbGxJbnRvVmlldyh7XG4gICAgICAgICAgICAgIGJlaGF2aW9yOiBcInNtb290aFwiLFxuICAgICAgICAgICAgICBibG9jazogXCJzdGFydFwiXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gTm90aW9u44Gu54m55q6K44Gq44K544Kv44Ot44O844Or44Kz44Oz44OG44OK44KS5o6i44GX44Gm44CB44Gd44GT44Gr44KC44K544Kv44Ot44O844Or44Kk44OZ44Oz44OI44KS55m654GrXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgY29uc3Qgc2Nyb2xsQ29udGFpbmVycyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5ub3Rpb24tZnJhbWUsIC5ub3Rpb24tc2Nyb2xsZXInKTtcbiAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVycy5mb3JFYWNoKGNvbnRhaW5lciA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbnRhaW5lciBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAvLyDopovlh7rjgZfjga7kvY3nva7jgpLlj5blvpdcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRpbmdSZWN0ID0gaGVhZGluZy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRhaW5lclJlY3QgPSBjb250YWluZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICAgICAgICAgICAgICAgIC8vIOOCs+ODs+ODhuODiuWGheOBp+OBruebuOWvvuS9jee9ruOCkuioiOeul1xuICAgICAgICAgICAgICAgICAgY29uc3QgcmVsYXRpdmVQb3NpdGlvbiA9IGhlYWRpbmdSZWN0LnRvcCAtIGNvbnRhaW5lclJlY3QudG9wICsgY29udGFpbmVyLnNjcm9sbFRvcDtcblxuICAgICAgICAgICAgICAgICAgLy8g44OY44OD44OA44O844Gu6auY44GV5YiG44KS6Kq/5pW0XG4gICAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXJIZWlnaHQgPSA2MDsgLy8gTm90aW9u44Gu44OY44OD44OA44O86auY44GV44Gu5qaC566XXG5cbiAgICAgICAgICAgICAgICAgIGNvbnRhaW5lci5zY3JvbGxUbyh7XG4gICAgICAgICAgICAgICAgICAgIHRvcDogcmVsYXRpdmVQb3NpdGlvbiAtIGhlYWRlckhlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgYmVoYXZpb3I6IFwic21vb3RoXCJcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCA1MCk7IC8vIOWwkeOBl+mBheW7tuOBleOBm+OBpuWun+ihjFxuICAgICAgICAgIH07XG5cbiAgICAgICAgICAvLyBJROOBjOOBguOCi+WgtOWQiOOBr1VSTOODleODqeOCsOODoeODs+ODiOOCkuS9v+eUqFxuICAgICAgICAgIGlmIChoZWFkaW5nSWQpIHtcbiAgICAgICAgICAgIC8vIOePvuWcqOOBrlVSTOOCkuWPluW+l1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFVybCA9IG5ldyBVUkwod2luZG93LmxvY2F0aW9uLmhyZWYpO1xuICAgICAgICAgICAgLy8g44OV44Op44Kw44Oh44Oz44OI44KS6Kit5a6aXG4gICAgICAgICAgICBjdXJyZW50VXJsLmhhc2ggPSBgIyR7aGVhZGluZ0lkfWA7XG5cbiAgICAgICAgICAgIC8vIOWxpeattOOBq+i/veWKoO+8iOODmuODvOOCuOOCkuODquODreODvOODieOBm+OBmuOBq1VSTOOCkuabtOaWsO+8iVxuICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKHt9LCAnJywgY3VycmVudFVybC50b1N0cmluZygpKTtcblxuICAgICAgICAgICAgLy8g5bCR44GX6YGF5bu244GV44Gb44Gm44GL44KJ44K544Kv44Ot44O844Or77yIVVJM44OP44OD44K344Ol44Gu5Yem55CG44KS5b6F44Gk77yJXG4gICAgICAgICAgICBzZXRUaW1lb3V0KHNjcm9sbFRvSGVhZGluZywgMTApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBJROOBjOOBquOBhOWgtOWQiOOBr+ebtOaOpeOCueOCr+ODreODvOODq1xuICAgICAgICAgICAgc2Nyb2xsVG9IZWFkaW5nKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoaXRlbSk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgLy8g44K544Kv44Ot44O844Or54q25oWL44Gu6L+96LehXG4gICAgbGV0IGlzU2Nyb2xsaW5nID0gZmFsc2U7XG4gICAgbGV0IHNjcm9sbEVuZFRpbWVvdXQ6IG51bWJlciB8IG51bGwgPSBudWxsO1xuICAgIGxldCBsYXN0U2Nyb2xsWSA9IHdpbmRvdy5zY3JvbGxZO1xuICAgIGxldCBzY3JvbGxWZWxvY2l0eSA9IDA7XG4gICAgbGV0IGFuaW1hdGlvbkZyYW1lSWQ6IG51bWJlciB8IG51bGwgPSBudWxsO1xuXG4gICAgLy8g44K544Kv44Ot44O844Or44Kk44OZ44Oz44OI44Gn44K544OG44Kj44OD44Kt44O844K544Kv44Ot44O844Or44KS5pu05paw77yI44Ki44OL44Oh44O844K344On44Oz44OV44Os44O844Og44Gr5ZCM5pyf77yJXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJzY3JvbGxcIiwgKCkgPT4ge1xuICAgICAgLy8g44K544Kv44Ot44O844Or6YCf5bqm44KS6KiI566XXG4gICAgICBjb25zdCBjdXJyZW50U2Nyb2xsWSA9IHdpbmRvdy5zY3JvbGxZO1xuICAgICAgc2Nyb2xsVmVsb2NpdHkgPSBNYXRoLmFicyhjdXJyZW50U2Nyb2xsWSAtIGxhc3RTY3JvbGxZKTtcbiAgICAgIGxhc3RTY3JvbGxZID0gY3VycmVudFNjcm9sbFk7XG5cbiAgICAgIC8vIOOCueOCr+ODreODvOODq+S4reODleODqeOCsOOCkuioreWumlxuICAgICAgaXNTY3JvbGxpbmcgPSB0cnVlO1xuXG4gICAgICAvLyDjgrnjgq/jg63jg7zjg6vjgYzmraLjgb7jgaPjgZ/jgZPjgajjgpLmpJzlh7rjgZnjgovjgr/jgqTjg57jg7zjgpLjg6rjgrvjg4Pjg4hcbiAgICAgIGlmIChzY3JvbGxFbmRUaW1lb3V0ICE9PSBudWxsKSB7XG4gICAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQoc2Nyb2xsRW5kVGltZW91dCk7XG4gICAgICB9XG5cbiAgICAgIC8vIOOCueOCr+ODreODvOODq+OBjOatouOBvuOBo+OBn+OCieWujOWFqOOBquabtOaWsOOCkuihjOOBhlxuICAgICAgc2Nyb2xsRW5kVGltZW91dCA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgaXNTY3JvbGxpbmcgPSBmYWxzZTtcbiAgICAgICAgLy8g44K544Kv44Ot44O844Or44GM5q2i44G+44Gj44Gf44KJ5by35Yi255qE44Gr5pu05pawXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICAgICAgLy8g5YmN5Zue44Gu44Ki44OL44Oh44O844K344On44Oz44OV44Os44O844Og44KS44Kt44Oj44Oz44K744OrXG4gICAgICAgICAgaWYgKGFuaW1hdGlvbkZyYW1lSWQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lKGFuaW1hdGlvbkZyYW1lSWQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB1cGRhdGVTdGlja3lTY3JvbGwoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHNjcm9sbEVuZFRpbWVvdXQgPSBudWxsO1xuICAgICAgfSwgMTAwKTsgLy8g44K544Kv44Ot44O844Or44GM5q2i44G+44Gj44Gf44Go5Yik5pat44GZ44KL5pmC6ZaTXG5cbiAgICAgIC8vIOOCouODi+ODoeODvOOCt+ODp+ODs+ODleODrOODvOODoOOBjOaXouOBq+S6iOe0hOOBleOCjOOBpuOBhOOBquOBkeOCjOOBsOS6iOe0hFxuICAgICAgaWYgKGFuaW1hdGlvbkZyYW1lSWQgPT09IG51bGwpIHtcbiAgICAgICAgYW5pbWF0aW9uRnJhbWVJZCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbiB1cGRhdGVPblNjcm9sbCgpIHtcbiAgICAgICAgICAvLyDjgrnjgq/jg63jg7zjg6vkuK3jga/luLjjgavmm7TmlrBcbiAgICAgICAgICB1cGRhdGVTdGlja3lTY3JvbGwoKTtcblxuICAgICAgICAgIC8vIOOCueOCr+ODreODvOODq+S4reOBr+asoeOBruODleODrOODvOODoOOCguS6iOe0hFxuICAgICAgICAgIGlmIChpc1Njcm9sbGluZykge1xuICAgICAgICAgICAgYW5pbWF0aW9uRnJhbWVJZCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSh1cGRhdGVPblNjcm9sbCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFuaW1hdGlvbkZyYW1lSWQgPSBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSwgeyBwYXNzaXZlOiB0cnVlIH0pO1xuXG4gICAgLy8g44Oa44O844K45YaF5a6544Gu5aSJ5pu044KS55uj6KaWXG4gICAgY29uc3Qgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcigoKSA9PiB7XG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodXBkYXRlU3RpY2t5U2Nyb2xsKTtcbiAgICB9KTtcblxuICAgIG9ic2VydmVyLm9ic2VydmUoZG9jdW1lbnQuYm9keSwge1xuICAgICAgY2hpbGRMaXN0OiB0cnVlLFxuICAgICAgc3VidHJlZTogdHJ1ZVxuICAgIH0pO1xuXG4gICAgLy8g5Yid5pyf5YyWXG4gICAgdXBkYXRlU3RpY2t5U2Nyb2xsKCk7XG4gIH0sXG59KTtcbiIsImZ1bmN0aW9uIHByaW50KG1ldGhvZCwgLi4uYXJncykge1xuICBpZiAoaW1wb3J0Lm1ldGEuZW52Lk1PREUgPT09IFwicHJvZHVjdGlvblwiKSByZXR1cm47XG4gIGlmICh0eXBlb2YgYXJnc1swXSA9PT0gXCJzdHJpbmdcIikge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBhcmdzLnNoaWZ0KCk7XG4gICAgbWV0aG9kKGBbd3h0XSAke21lc3NhZ2V9YCwgLi4uYXJncyk7XG4gIH0gZWxzZSB7XG4gICAgbWV0aG9kKFwiW3d4dF1cIiwgLi4uYXJncyk7XG4gIH1cbn1cbmV4cG9ydCBjb25zdCBsb2dnZXIgPSB7XG4gIGRlYnVnOiAoLi4uYXJncykgPT4gcHJpbnQoY29uc29sZS5kZWJ1ZywgLi4uYXJncyksXG4gIGxvZzogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUubG9nLCAuLi5hcmdzKSxcbiAgd2FybjogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUud2FybiwgLi4uYXJncyksXG4gIGVycm9yOiAoLi4uYXJncykgPT4gcHJpbnQoY29uc29sZS5lcnJvciwgLi4uYXJncylcbn07XG4iLCJpbXBvcnQgeyBicm93c2VyIH0gZnJvbSBcInd4dC9icm93c2VyXCI7XG5leHBvcnQgY2xhc3MgV3h0TG9jYXRpb25DaGFuZ2VFdmVudCBleHRlbmRzIEV2ZW50IHtcbiAgY29uc3RydWN0b3IobmV3VXJsLCBvbGRVcmwpIHtcbiAgICBzdXBlcihXeHRMb2NhdGlvbkNoYW5nZUV2ZW50LkVWRU5UX05BTUUsIHt9KTtcbiAgICB0aGlzLm5ld1VybCA9IG5ld1VybDtcbiAgICB0aGlzLm9sZFVybCA9IG9sZFVybDtcbiAgfVxuICBzdGF0aWMgRVZFTlRfTkFNRSA9IGdldFVuaXF1ZUV2ZW50TmFtZShcInd4dDpsb2NhdGlvbmNoYW5nZVwiKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBnZXRVbmlxdWVFdmVudE5hbWUoZXZlbnROYW1lKSB7XG4gIHJldHVybiBgJHticm93c2VyPy5ydW50aW1lPy5pZH06JHtpbXBvcnQubWV0YS5lbnYuRU5UUllQT0lOVH06JHtldmVudE5hbWV9YDtcbn1cbiIsImltcG9ydCB7IFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQgfSBmcm9tIFwiLi9jdXN0b20tZXZlbnRzLm1qc1wiO1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUxvY2F0aW9uV2F0Y2hlcihjdHgpIHtcbiAgbGV0IGludGVydmFsO1xuICBsZXQgb2xkVXJsO1xuICByZXR1cm4ge1xuICAgIC8qKlxuICAgICAqIEVuc3VyZSB0aGUgbG9jYXRpb24gd2F0Y2hlciBpcyBhY3RpdmVseSBsb29raW5nIGZvciBVUkwgY2hhbmdlcy4gSWYgaXQncyBhbHJlYWR5IHdhdGNoaW5nLFxuICAgICAqIHRoaXMgaXMgYSBub29wLlxuICAgICAqL1xuICAgIHJ1bigpIHtcbiAgICAgIGlmIChpbnRlcnZhbCAhPSBudWxsKSByZXR1cm47XG4gICAgICBvbGRVcmwgPSBuZXcgVVJMKGxvY2F0aW9uLmhyZWYpO1xuICAgICAgaW50ZXJ2YWwgPSBjdHguc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICBsZXQgbmV3VXJsID0gbmV3IFVSTChsb2NhdGlvbi5ocmVmKTtcbiAgICAgICAgaWYgKG5ld1VybC5ocmVmICE9PSBvbGRVcmwuaHJlZikge1xuICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBXeHRMb2NhdGlvbkNoYW5nZUV2ZW50KG5ld1VybCwgb2xkVXJsKSk7XG4gICAgICAgICAgb2xkVXJsID0gbmV3VXJsO1xuICAgICAgICB9XG4gICAgICB9LCAxZTMpO1xuICAgIH1cbiAgfTtcbn1cbiIsImltcG9ydCB7IGJyb3dzZXIgfSBmcm9tIFwid3h0L2Jyb3dzZXJcIjtcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gXCIuLi8uLi9zYW5kYm94L3V0aWxzL2xvZ2dlci5tanNcIjtcbmltcG9ydCB7IGdldFVuaXF1ZUV2ZW50TmFtZSB9IGZyb20gXCIuL2N1c3RvbS1ldmVudHMubWpzXCI7XG5pbXBvcnQgeyBjcmVhdGVMb2NhdGlvbldhdGNoZXIgfSBmcm9tIFwiLi9sb2NhdGlvbi13YXRjaGVyLm1qc1wiO1xuZXhwb3J0IGNsYXNzIENvbnRlbnRTY3JpcHRDb250ZXh0IHtcbiAgY29uc3RydWN0b3IoY29udGVudFNjcmlwdE5hbWUsIG9wdGlvbnMpIHtcbiAgICB0aGlzLmNvbnRlbnRTY3JpcHROYW1lID0gY29udGVudFNjcmlwdE5hbWU7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLmFib3J0Q29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgICBpZiAodGhpcy5pc1RvcEZyYW1lKSB7XG4gICAgICB0aGlzLmxpc3RlbkZvck5ld2VyU2NyaXB0cyh7IGlnbm9yZUZpcnN0RXZlbnQ6IHRydWUgfSk7XG4gICAgICB0aGlzLnN0b3BPbGRTY3JpcHRzKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubGlzdGVuRm9yTmV3ZXJTY3JpcHRzKCk7XG4gICAgfVxuICB9XG4gIHN0YXRpYyBTQ1JJUFRfU1RBUlRFRF9NRVNTQUdFX1RZUEUgPSBnZXRVbmlxdWVFdmVudE5hbWUoXG4gICAgXCJ3eHQ6Y29udGVudC1zY3JpcHQtc3RhcnRlZFwiXG4gICk7XG4gIGlzVG9wRnJhbWUgPSB3aW5kb3cuc2VsZiA9PT0gd2luZG93LnRvcDtcbiAgYWJvcnRDb250cm9sbGVyO1xuICBsb2NhdGlvbldhdGNoZXIgPSBjcmVhdGVMb2NhdGlvbldhdGNoZXIodGhpcyk7XG4gIHJlY2VpdmVkTWVzc2FnZUlkcyA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgU2V0KCk7XG4gIGdldCBzaWduYWwoKSB7XG4gICAgcmV0dXJuIHRoaXMuYWJvcnRDb250cm9sbGVyLnNpZ25hbDtcbiAgfVxuICBhYm9ydChyZWFzb24pIHtcbiAgICByZXR1cm4gdGhpcy5hYm9ydENvbnRyb2xsZXIuYWJvcnQocmVhc29uKTtcbiAgfVxuICBnZXQgaXNJbnZhbGlkKCkge1xuICAgIGlmIChicm93c2VyLnJ1bnRpbWUuaWQgPT0gbnVsbCkge1xuICAgICAgdGhpcy5ub3RpZnlJbnZhbGlkYXRlZCgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zaWduYWwuYWJvcnRlZDtcbiAgfVxuICBnZXQgaXNWYWxpZCgpIHtcbiAgICByZXR1cm4gIXRoaXMuaXNJbnZhbGlkO1xuICB9XG4gIC8qKlxuICAgKiBBZGQgYSBsaXN0ZW5lciB0aGF0IGlzIGNhbGxlZCB3aGVuIHRoZSBjb250ZW50IHNjcmlwdCdzIGNvbnRleHQgaXMgaW52YWxpZGF0ZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIEEgZnVuY3Rpb24gdG8gcmVtb3ZlIHRoZSBsaXN0ZW5lci5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogYnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihjYik7XG4gICAqIGNvbnN0IHJlbW92ZUludmFsaWRhdGVkTGlzdGVuZXIgPSBjdHgub25JbnZhbGlkYXRlZCgoKSA9PiB7XG4gICAqICAgYnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5yZW1vdmVMaXN0ZW5lcihjYik7XG4gICAqIH0pXG4gICAqIC8vIC4uLlxuICAgKiByZW1vdmVJbnZhbGlkYXRlZExpc3RlbmVyKCk7XG4gICAqL1xuICBvbkludmFsaWRhdGVkKGNiKSB7XG4gICAgdGhpcy5zaWduYWwuYWRkRXZlbnRMaXN0ZW5lcihcImFib3J0XCIsIGNiKTtcbiAgICByZXR1cm4gKCkgPT4gdGhpcy5zaWduYWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImFib3J0XCIsIGNiKTtcbiAgfVxuICAvKipcbiAgICogUmV0dXJuIGEgcHJvbWlzZSB0aGF0IG5ldmVyIHJlc29sdmVzLiBVc2VmdWwgaWYgeW91IGhhdmUgYW4gYXN5bmMgZnVuY3Rpb24gdGhhdCBzaG91bGRuJ3QgcnVuXG4gICAqIGFmdGVyIHRoZSBjb250ZXh0IGlzIGV4cGlyZWQuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIGNvbnN0IGdldFZhbHVlRnJvbVN0b3JhZ2UgPSBhc3luYyAoKSA9PiB7XG4gICAqICAgaWYgKGN0eC5pc0ludmFsaWQpIHJldHVybiBjdHguYmxvY2soKTtcbiAgICpcbiAgICogICAvLyAuLi5cbiAgICogfVxuICAgKi9cbiAgYmxvY2soKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKCgpID0+IHtcbiAgICB9KTtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5zZXRJbnRlcnZhbGAgdGhhdCBhdXRvbWF0aWNhbGx5IGNsZWFycyB0aGUgaW50ZXJ2YWwgd2hlbiBpbnZhbGlkYXRlZC5cbiAgICovXG4gIHNldEludGVydmFsKGhhbmRsZXIsIHRpbWVvdXQpIHtcbiAgICBjb25zdCBpZCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWQpIGhhbmRsZXIoKTtcbiAgICB9LCB0aW1lb3V0KTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2xlYXJJbnRlcnZhbChpZCkpO1xuICAgIHJldHVybiBpZDtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5zZXRUaW1lb3V0YCB0aGF0IGF1dG9tYXRpY2FsbHkgY2xlYXJzIHRoZSBpbnRlcnZhbCB3aGVuIGludmFsaWRhdGVkLlxuICAgKi9cbiAgc2V0VGltZW91dChoYW5kbGVyLCB0aW1lb3V0KSB7XG4gICAgY29uc3QgaWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWQpIGhhbmRsZXIoKTtcbiAgICB9LCB0aW1lb3V0KTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2xlYXJUaW1lb3V0KGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZWAgdGhhdCBhdXRvbWF0aWNhbGx5IGNhbmNlbHMgdGhlIHJlcXVlc3Qgd2hlblxuICAgKiBpbnZhbGlkYXRlZC5cbiAgICovXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZShjYWxsYmFjaykge1xuICAgIGNvbnN0IGlkID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCguLi5hcmdzKSA9PiB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkKSBjYWxsYmFjayguLi5hcmdzKTtcbiAgICB9KTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2FuY2VsQW5pbWF0aW9uRnJhbWUoaWQpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cucmVxdWVzdElkbGVDYWxsYmFja2AgdGhhdCBhdXRvbWF0aWNhbGx5IGNhbmNlbHMgdGhlIHJlcXVlc3Qgd2hlblxuICAgKiBpbnZhbGlkYXRlZC5cbiAgICovXG4gIHJlcXVlc3RJZGxlQ2FsbGJhY2soY2FsbGJhY2ssIG9wdGlvbnMpIHtcbiAgICBjb25zdCBpZCA9IHJlcXVlc3RJZGxlQ2FsbGJhY2soKC4uLmFyZ3MpID0+IHtcbiAgICAgIGlmICghdGhpcy5zaWduYWwuYWJvcnRlZCkgY2FsbGJhY2soLi4uYXJncyk7XG4gICAgfSwgb3B0aW9ucyk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNhbmNlbElkbGVDYWxsYmFjayhpZCkpO1xuICAgIHJldHVybiBpZDtcbiAgfVxuICBhZGRFdmVudExpc3RlbmVyKHRhcmdldCwgdHlwZSwgaGFuZGxlciwgb3B0aW9ucykge1xuICAgIGlmICh0eXBlID09PSBcInd4dDpsb2NhdGlvbmNoYW5nZVwiKSB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkKSB0aGlzLmxvY2F0aW9uV2F0Y2hlci5ydW4oKTtcbiAgICB9XG4gICAgdGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXI/LihcbiAgICAgIHR5cGUuc3RhcnRzV2l0aChcInd4dDpcIikgPyBnZXRVbmlxdWVFdmVudE5hbWUodHlwZSkgOiB0eXBlLFxuICAgICAgaGFuZGxlcixcbiAgICAgIHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgc2lnbmFsOiB0aGlzLnNpZ25hbFxuICAgICAgfVxuICAgICk7XG4gIH1cbiAgLyoqXG4gICAqIEBpbnRlcm5hbFxuICAgKiBBYm9ydCB0aGUgYWJvcnQgY29udHJvbGxlciBhbmQgZXhlY3V0ZSBhbGwgYG9uSW52YWxpZGF0ZWRgIGxpc3RlbmVycy5cbiAgICovXG4gIG5vdGlmeUludmFsaWRhdGVkKCkge1xuICAgIHRoaXMuYWJvcnQoXCJDb250ZW50IHNjcmlwdCBjb250ZXh0IGludmFsaWRhdGVkXCIpO1xuICAgIGxvZ2dlci5kZWJ1ZyhcbiAgICAgIGBDb250ZW50IHNjcmlwdCBcIiR7dGhpcy5jb250ZW50U2NyaXB0TmFtZX1cIiBjb250ZXh0IGludmFsaWRhdGVkYFxuICAgICk7XG4gIH1cbiAgc3RvcE9sZFNjcmlwdHMoKSB7XG4gICAgd2luZG93LnBvc3RNZXNzYWdlKFxuICAgICAge1xuICAgICAgICB0eXBlOiBDb250ZW50U2NyaXB0Q29udGV4dC5TQ1JJUFRfU1RBUlRFRF9NRVNTQUdFX1RZUEUsXG4gICAgICAgIGNvbnRlbnRTY3JpcHROYW1lOiB0aGlzLmNvbnRlbnRTY3JpcHROYW1lLFxuICAgICAgICBtZXNzYWdlSWQ6IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKDIpXG4gICAgICB9LFxuICAgICAgXCIqXCJcbiAgICApO1xuICB9XG4gIHZlcmlmeVNjcmlwdFN0YXJ0ZWRFdmVudChldmVudCkge1xuICAgIGNvbnN0IGlzU2NyaXB0U3RhcnRlZEV2ZW50ID0gZXZlbnQuZGF0YT8udHlwZSA9PT0gQ29udGVudFNjcmlwdENvbnRleHQuU0NSSVBUX1NUQVJURURfTUVTU0FHRV9UWVBFO1xuICAgIGNvbnN0IGlzU2FtZUNvbnRlbnRTY3JpcHQgPSBldmVudC5kYXRhPy5jb250ZW50U2NyaXB0TmFtZSA9PT0gdGhpcy5jb250ZW50U2NyaXB0TmFtZTtcbiAgICBjb25zdCBpc05vdER1cGxpY2F0ZSA9ICF0aGlzLnJlY2VpdmVkTWVzc2FnZUlkcy5oYXMoZXZlbnQuZGF0YT8ubWVzc2FnZUlkKTtcbiAgICByZXR1cm4gaXNTY3JpcHRTdGFydGVkRXZlbnQgJiYgaXNTYW1lQ29udGVudFNjcmlwdCAmJiBpc05vdER1cGxpY2F0ZTtcbiAgfVxuICBsaXN0ZW5Gb3JOZXdlclNjcmlwdHMob3B0aW9ucykge1xuICAgIGxldCBpc0ZpcnN0ID0gdHJ1ZTtcbiAgICBjb25zdCBjYiA9IChldmVudCkgPT4ge1xuICAgICAgaWYgKHRoaXMudmVyaWZ5U2NyaXB0U3RhcnRlZEV2ZW50KGV2ZW50KSkge1xuICAgICAgICB0aGlzLnJlY2VpdmVkTWVzc2FnZUlkcy5hZGQoZXZlbnQuZGF0YS5tZXNzYWdlSWQpO1xuICAgICAgICBjb25zdCB3YXNGaXJzdCA9IGlzRmlyc3Q7XG4gICAgICAgIGlzRmlyc3QgPSBmYWxzZTtcbiAgICAgICAgaWYgKHdhc0ZpcnN0ICYmIG9wdGlvbnM/Lmlnbm9yZUZpcnN0RXZlbnQpIHJldHVybjtcbiAgICAgICAgdGhpcy5ub3RpZnlJbnZhbGlkYXRlZCgpO1xuICAgICAgfVxuICAgIH07XG4gICAgYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgY2IpO1xuICAgIHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiByZW1vdmVFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBjYikpO1xuICB9XG59XG4iLCJjb25zdCBudWxsS2V5ID0gU3ltYm9sKCdudWxsJyk7IC8vIGBvYmplY3RIYXNoZXNgIGtleSBmb3IgbnVsbFxuXG5sZXQga2V5Q291bnRlciA9IDA7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1hbnlLZXlzTWFwIGV4dGVuZHMgTWFwIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKTtcblxuXHRcdHRoaXMuX29iamVjdEhhc2hlcyA9IG5ldyBXZWFrTWFwKCk7XG5cdFx0dGhpcy5fc3ltYm9sSGFzaGVzID0gbmV3IE1hcCgpOyAvLyBodHRwczovL2dpdGh1Yi5jb20vdGMzOS9lY21hMjYyL2lzc3Vlcy8xMTk0XG5cdFx0dGhpcy5fcHVibGljS2V5cyA9IG5ldyBNYXAoKTtcblxuXHRcdGNvbnN0IFtwYWlyc10gPSBhcmd1bWVudHM7IC8vIE1hcCBjb21wYXRcblx0XHRpZiAocGFpcnMgPT09IG51bGwgfHwgcGFpcnMgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGlmICh0eXBlb2YgcGFpcnNbU3ltYm9sLml0ZXJhdG9yXSAhPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcih0eXBlb2YgcGFpcnMgKyAnIGlzIG5vdCBpdGVyYWJsZSAoY2Fubm90IHJlYWQgcHJvcGVydHkgU3ltYm9sKFN5bWJvbC5pdGVyYXRvcikpJyk7XG5cdFx0fVxuXG5cdFx0Zm9yIChjb25zdCBba2V5cywgdmFsdWVdIG9mIHBhaXJzKSB7XG5cdFx0XHR0aGlzLnNldChrZXlzLCB2YWx1ZSk7XG5cdFx0fVxuXHR9XG5cblx0X2dldFB1YmxpY0tleXMoa2V5cywgY3JlYXRlID0gZmFsc2UpIHtcblx0XHRpZiAoIUFycmF5LmlzQXJyYXkoa2V5cykpIHtcblx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBrZXlzIHBhcmFtZXRlciBtdXN0IGJlIGFuIGFycmF5Jyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgcHJpdmF0ZUtleSA9IHRoaXMuX2dldFByaXZhdGVLZXkoa2V5cywgY3JlYXRlKTtcblxuXHRcdGxldCBwdWJsaWNLZXk7XG5cdFx0aWYgKHByaXZhdGVLZXkgJiYgdGhpcy5fcHVibGljS2V5cy5oYXMocHJpdmF0ZUtleSkpIHtcblx0XHRcdHB1YmxpY0tleSA9IHRoaXMuX3B1YmxpY0tleXMuZ2V0KHByaXZhdGVLZXkpO1xuXHRcdH0gZWxzZSBpZiAoY3JlYXRlKSB7XG5cdFx0XHRwdWJsaWNLZXkgPSBbLi4ua2V5c107IC8vIFJlZ2VuZXJhdGUga2V5cyBhcnJheSB0byBhdm9pZCBleHRlcm5hbCBpbnRlcmFjdGlvblxuXHRcdFx0dGhpcy5fcHVibGljS2V5cy5zZXQocHJpdmF0ZUtleSwgcHVibGljS2V5KTtcblx0XHR9XG5cblx0XHRyZXR1cm4ge3ByaXZhdGVLZXksIHB1YmxpY0tleX07XG5cdH1cblxuXHRfZ2V0UHJpdmF0ZUtleShrZXlzLCBjcmVhdGUgPSBmYWxzZSkge1xuXHRcdGNvbnN0IHByaXZhdGVLZXlzID0gW107XG5cdFx0Zm9yIChsZXQga2V5IG9mIGtleXMpIHtcblx0XHRcdGlmIChrZXkgPT09IG51bGwpIHtcblx0XHRcdFx0a2V5ID0gbnVsbEtleTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgaGFzaGVzID0gdHlwZW9mIGtleSA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIGtleSA9PT0gJ2Z1bmN0aW9uJyA/ICdfb2JqZWN0SGFzaGVzJyA6ICh0eXBlb2Yga2V5ID09PSAnc3ltYm9sJyA/ICdfc3ltYm9sSGFzaGVzJyA6IGZhbHNlKTtcblxuXHRcdFx0aWYgKCFoYXNoZXMpIHtcblx0XHRcdFx0cHJpdmF0ZUtleXMucHVzaChrZXkpO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzW2hhc2hlc10uaGFzKGtleSkpIHtcblx0XHRcdFx0cHJpdmF0ZUtleXMucHVzaCh0aGlzW2hhc2hlc10uZ2V0KGtleSkpO1xuXHRcdFx0fSBlbHNlIGlmIChjcmVhdGUpIHtcblx0XHRcdFx0Y29uc3QgcHJpdmF0ZUtleSA9IGBAQG1rbS1yZWYtJHtrZXlDb3VudGVyKyt9QEBgO1xuXHRcdFx0XHR0aGlzW2hhc2hlc10uc2V0KGtleSwgcHJpdmF0ZUtleSk7XG5cdFx0XHRcdHByaXZhdGVLZXlzLnB1c2gocHJpdmF0ZUtleSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIEpTT04uc3RyaW5naWZ5KHByaXZhdGVLZXlzKTtcblx0fVxuXG5cdHNldChrZXlzLCB2YWx1ZSkge1xuXHRcdGNvbnN0IHtwdWJsaWNLZXl9ID0gdGhpcy5fZ2V0UHVibGljS2V5cyhrZXlzLCB0cnVlKTtcblx0XHRyZXR1cm4gc3VwZXIuc2V0KHB1YmxpY0tleSwgdmFsdWUpO1xuXHR9XG5cblx0Z2V0KGtleXMpIHtcblx0XHRjb25zdCB7cHVibGljS2V5fSA9IHRoaXMuX2dldFB1YmxpY0tleXMoa2V5cyk7XG5cdFx0cmV0dXJuIHN1cGVyLmdldChwdWJsaWNLZXkpO1xuXHR9XG5cblx0aGFzKGtleXMpIHtcblx0XHRjb25zdCB7cHVibGljS2V5fSA9IHRoaXMuX2dldFB1YmxpY0tleXMoa2V5cyk7XG5cdFx0cmV0dXJuIHN1cGVyLmhhcyhwdWJsaWNLZXkpO1xuXHR9XG5cblx0ZGVsZXRlKGtleXMpIHtcblx0XHRjb25zdCB7cHVibGljS2V5LCBwcml2YXRlS2V5fSA9IHRoaXMuX2dldFB1YmxpY0tleXMoa2V5cyk7XG5cdFx0cmV0dXJuIEJvb2xlYW4ocHVibGljS2V5ICYmIHN1cGVyLmRlbGV0ZShwdWJsaWNLZXkpICYmIHRoaXMuX3B1YmxpY0tleXMuZGVsZXRlKHByaXZhdGVLZXkpKTtcblx0fVxuXG5cdGNsZWFyKCkge1xuXHRcdHN1cGVyLmNsZWFyKCk7XG5cdFx0dGhpcy5fc3ltYm9sSGFzaGVzLmNsZWFyKCk7XG5cdFx0dGhpcy5fcHVibGljS2V5cy5jbGVhcigpO1xuXHR9XG5cblx0Z2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCkge1xuXHRcdHJldHVybiAnTWFueUtleXNNYXAnO1xuXHR9XG5cblx0Z2V0IHNpemUoKSB7XG5cdFx0cmV0dXJuIHN1cGVyLnNpemU7XG5cdH1cbn1cbiIsImltcG9ydCBNYW55S2V5c01hcCBmcm9tICdtYW55LWtleXMtbWFwJztcbmltcG9ydCB7IGRlZnUgfSBmcm9tICdkZWZ1JztcbmltcG9ydCB7IGlzRXhpc3QgfSBmcm9tICcuL2RldGVjdG9ycy5tanMnO1xuXG5jb25zdCBnZXREZWZhdWx0T3B0aW9ucyA9ICgpID0+ICh7XG4gIHRhcmdldDogZ2xvYmFsVGhpcy5kb2N1bWVudCxcbiAgdW5pZnlQcm9jZXNzOiB0cnVlLFxuICBkZXRlY3RvcjogaXNFeGlzdCxcbiAgb2JzZXJ2ZUNvbmZpZ3M6IHtcbiAgICBjaGlsZExpc3Q6IHRydWUsXG4gICAgc3VidHJlZTogdHJ1ZSxcbiAgICBhdHRyaWJ1dGVzOiB0cnVlXG4gIH0sXG4gIHNpZ25hbDogdm9pZCAwLFxuICBjdXN0b21NYXRjaGVyOiB2b2lkIDBcbn0pO1xuY29uc3QgbWVyZ2VPcHRpb25zID0gKHVzZXJTaWRlT3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpID0+IHtcbiAgcmV0dXJuIGRlZnUodXNlclNpZGVPcHRpb25zLCBkZWZhdWx0T3B0aW9ucyk7XG59O1xuXG5jb25zdCB1bmlmeUNhY2hlID0gbmV3IE1hbnlLZXlzTWFwKCk7XG5mdW5jdGlvbiBjcmVhdGVXYWl0RWxlbWVudChpbnN0YW5jZU9wdGlvbnMpIHtcbiAgY29uc3QgeyBkZWZhdWx0T3B0aW9ucyB9ID0gaW5zdGFuY2VPcHRpb25zO1xuICByZXR1cm4gKHNlbGVjdG9yLCBvcHRpb25zKSA9PiB7XG4gICAgY29uc3Qge1xuICAgICAgdGFyZ2V0LFxuICAgICAgdW5pZnlQcm9jZXNzLFxuICAgICAgb2JzZXJ2ZUNvbmZpZ3MsXG4gICAgICBkZXRlY3RvcixcbiAgICAgIHNpZ25hbCxcbiAgICAgIGN1c3RvbU1hdGNoZXJcbiAgICB9ID0gbWVyZ2VPcHRpb25zKG9wdGlvbnMsIGRlZmF1bHRPcHRpb25zKTtcbiAgICBjb25zdCB1bmlmeVByb21pc2VLZXkgPSBbXG4gICAgICBzZWxlY3RvcixcbiAgICAgIHRhcmdldCxcbiAgICAgIHVuaWZ5UHJvY2VzcyxcbiAgICAgIG9ic2VydmVDb25maWdzLFxuICAgICAgZGV0ZWN0b3IsXG4gICAgICBzaWduYWwsXG4gICAgICBjdXN0b21NYXRjaGVyXG4gICAgXTtcbiAgICBjb25zdCBjYWNoZWRQcm9taXNlID0gdW5pZnlDYWNoZS5nZXQodW5pZnlQcm9taXNlS2V5KTtcbiAgICBpZiAodW5pZnlQcm9jZXNzICYmIGNhY2hlZFByb21pc2UpIHtcbiAgICAgIHJldHVybiBjYWNoZWRQcm9taXNlO1xuICAgIH1cbiAgICBjb25zdCBkZXRlY3RQcm9taXNlID0gbmV3IFByb21pc2UoXG4gICAgICAvLyBiaW9tZS1pZ25vcmUgbGludC9zdXNwaWNpb3VzL25vQXN5bmNQcm9taXNlRXhlY3V0b3I6IGF2b2lkIG5lc3RpbmcgcHJvbWlzZVxuICAgICAgYXN5bmMgKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBpZiAoc2lnbmFsPy5hYm9ydGVkKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdChzaWduYWwucmVhc29uKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKFxuICAgICAgICAgIGFzeW5jIChtdXRhdGlvbnMpID0+IHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgXyBvZiBtdXRhdGlvbnMpIHtcbiAgICAgICAgICAgICAgaWYgKHNpZ25hbD8uYWJvcnRlZCkge1xuICAgICAgICAgICAgICAgIG9ic2VydmVyLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb25zdCBkZXRlY3RSZXN1bHQyID0gYXdhaXQgZGV0ZWN0RWxlbWVudCh7XG4gICAgICAgICAgICAgICAgc2VsZWN0b3IsXG4gICAgICAgICAgICAgICAgdGFyZ2V0LFxuICAgICAgICAgICAgICAgIGRldGVjdG9yLFxuICAgICAgICAgICAgICAgIGN1c3RvbU1hdGNoZXJcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIGlmIChkZXRlY3RSZXN1bHQyLmlzRGV0ZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICBvYnNlcnZlci5kaXNjb25uZWN0KCk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShkZXRlY3RSZXN1bHQyLnJlc3VsdCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIHNpZ25hbD8uYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgICAgICBcImFib3J0XCIsXG4gICAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgb2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgcmV0dXJuIHJlamVjdChzaWduYWwucmVhc29uKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIHsgb25jZTogdHJ1ZSB9XG4gICAgICAgICk7XG4gICAgICAgIGNvbnN0IGRldGVjdFJlc3VsdCA9IGF3YWl0IGRldGVjdEVsZW1lbnQoe1xuICAgICAgICAgIHNlbGVjdG9yLFxuICAgICAgICAgIHRhcmdldCxcbiAgICAgICAgICBkZXRlY3RvcixcbiAgICAgICAgICBjdXN0b21NYXRjaGVyXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoZGV0ZWN0UmVzdWx0LmlzRGV0ZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVzb2x2ZShkZXRlY3RSZXN1bHQucmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgICBvYnNlcnZlci5vYnNlcnZlKHRhcmdldCwgb2JzZXJ2ZUNvbmZpZ3MpO1xuICAgICAgfVxuICAgICkuZmluYWxseSgoKSA9PiB7XG4gICAgICB1bmlmeUNhY2hlLmRlbGV0ZSh1bmlmeVByb21pc2VLZXkpO1xuICAgIH0pO1xuICAgIHVuaWZ5Q2FjaGUuc2V0KHVuaWZ5UHJvbWlzZUtleSwgZGV0ZWN0UHJvbWlzZSk7XG4gICAgcmV0dXJuIGRldGVjdFByb21pc2U7XG4gIH07XG59XG5hc3luYyBmdW5jdGlvbiBkZXRlY3RFbGVtZW50KHtcbiAgdGFyZ2V0LFxuICBzZWxlY3RvcixcbiAgZGV0ZWN0b3IsXG4gIGN1c3RvbU1hdGNoZXJcbn0pIHtcbiAgY29uc3QgZWxlbWVudCA9IGN1c3RvbU1hdGNoZXIgPyBjdXN0b21NYXRjaGVyKHNlbGVjdG9yKSA6IHRhcmdldC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgcmV0dXJuIGF3YWl0IGRldGVjdG9yKGVsZW1lbnQpO1xufVxuY29uc3Qgd2FpdEVsZW1lbnQgPSBjcmVhdGVXYWl0RWxlbWVudCh7XG4gIGRlZmF1bHRPcHRpb25zOiBnZXREZWZhdWx0T3B0aW9ucygpXG59KTtcblxuZXhwb3J0IHsgY3JlYXRlV2FpdEVsZW1lbnQsIGdldERlZmF1bHRPcHRpb25zLCB3YWl0RWxlbWVudCB9O1xuIl0sIm5hbWVzIjpbImRlZmluaXRpb24iLCJyZXN1bHQiLCJfYSIsIl9iIiwiY29udGFpbmVyIiwiY3VycmVudFVybCIsInByaW50IiwibG9nZ2VyIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBTyxRQUFNO0FBQUE7QUFBQSxNQUVYLHNCQUFXLFlBQVgsbUJBQW9CLFlBQXBCLG1CQUE2QixPQUFNLE9BQU8sV0FBVztBQUFBO0FBQUEsTUFFbkQsV0FBVztBQUFBO0FBQUE7QUNKUixXQUFTLG9CQUFvQkEsYUFBWTtBQUM5QyxXQUFPQTtBQUFBLEVBQ1Q7QUNPQSxRQUFNLDRCQUE0QjtBQUVsQyxRQUFBLGFBQWUsb0JBQW9CO0FBQUEsSUFDakMsU0FBUyxDQUFDLFlBQVk7QUFBQSxJQUN0QixNQUFNLE9BQU87QUFFTCxZQUFBQyxVQUFTLE1BQU0sUUFBUSxRQUFRLE1BQU0sSUFBSSxDQUFDLGVBQWUsaUJBQWlCLENBQUM7QUFDM0UsWUFBQSxjQUFjQSxRQUFPLGVBQStCLENBQUM7QUFDckQsWUFBQSxrQkFBa0JBLFFBQU8sbUJBQTZCO0FBR3RELFlBQUEsYUFBYSxPQUFPLFNBQVM7QUFDbkMsWUFBTSxpQkFBaUIsWUFBWSxTQUFT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
