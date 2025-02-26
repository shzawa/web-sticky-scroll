import React from 'react';
import { browser } from 'wxt/browser';
import './globals.css';

export default function App() {
  const openOptions = () => {
    browser.runtime.openOptionsPage();
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Notion Scroll Sticky</h1>

      <div className="mb-6">
        <p className="mb-2">
          VSCodeのStickyScroll機能をNotionで実現するブラウザ拡張です。
        </p>
        <p className="mb-2">
          Notionページの見出し要素（h1~h6）を検出し、スクロール時に常に表示されるようにします。
        </p>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">使い方</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Notionページを開きます</li>
          <li>ページをスクロールすると、見出し要素がページ上部に固定表示されます</li>
          <li>固定表示された見出しをクリックすると、該当箇所にジャンプします</li>
        </ol>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">設定</h2>
        <p className="mb-2">
          拡張機能を有効にするURLパターンを設定できます。
        </p>
        <button
          onClick={openOptions}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
        >
          設定画面を開く
        </button>
      </div>

      <div className="text-sm text-gray-500">
        <p>Version 1.0.0</p>
      </div>
    </div>
  );
}
