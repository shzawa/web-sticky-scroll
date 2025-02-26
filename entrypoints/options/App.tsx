import React, { useEffect, useState } from "react";
import { browser } from "wxt/browser";

interface UrlPattern {
  id: string;
  pattern: string;
}

export default function App() {
  const [urlPatterns, setUrlPatterns] = useState<UrlPattern[]>([]);
  const [bulkPatterns, setBulkPatterns] = useState("");
  const [maxVisibleLines, setMaxVisibleLines] = useState(5);
  const [status, setStatus] = useState("");

  useEffect(() => {
    // 保存された設定を読み込む
    const loadSettings = async () => {
      const result = await browser.storage.local.get(["urlPatterns", "maxVisibleLines"]);
      const patterns = result.urlPatterns as UrlPattern[] || [];
      const lines = result.maxVisibleLines as number || 5;

      setUrlPatterns(patterns);
      setMaxVisibleLines(lines);

      // 既存のパターンをテキストエリアにセット
      if (patterns.length > 0) {
        setBulkPatterns(patterns.map(p => p.pattern).join('\n'));
      }
    };

    loadSettings();
  }, []);

  const saveSettings = async (settings: { urlPatterns?: UrlPattern[], maxVisibleLines?: number }) => {
    await browser.storage.local.set(settings);
    setStatus("設定を保存しました");
    setTimeout(() => setStatus(""), 2000);
  };

  const savePatterns = async (patterns: UrlPattern[]) => {
    await saveSettings({ urlPatterns: patterns });
  };

  const saveMaxVisibleLines = async (lines: number) => {
    await saveSettings({ maxVisibleLines: lines });
  };

  // 複数のURLパターンを一括で保存
  const saveBulkPatterns = () => {
    if (!bulkPatterns.trim()) {
      setUrlPatterns([]);
      savePatterns([]);
      return;
    }

    // 改行で分割して空行を除外
    const patternLines = bulkPatterns
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // 重複を除外
    const uniquePatterns = [...new Set(patternLines)];

    // パターンオブジェクトに変換
    const newPatterns = uniquePatterns.map(pattern => ({
      id: Date.now() + Math.random().toString(36).substring(2, 9),
      pattern
    }));

    setUrlPatterns(newPatterns);
    savePatterns(newPatterns);
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Notion Scroll Sticky 設定</h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">最大表示行数</h2>
        <p className="text-sm text-gray-600 mb-4">
          スティッキーヘッダーに表示する最大行数を設定してください。
          行数を超える場合はスクロールで表示できます。
        </p>

        <div className="flex items-center gap-4 mb-6">
          <input
            type="number"
            min="1"
            max="20"
            value={maxVisibleLines}
            onChange={(e) => {
              const value = Math.min(20, Math.max(1, parseInt(e.target.value) || 1));
              setMaxVisibleLines(value);
              saveMaxVisibleLines(value);
            }}
            className="w-20 px-3 py-2 border rounded-md text-center"
          />
          <div className="text-sm text-gray-600">
            行（1〜20の範囲で設定可能）
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">URLパターン</h2>
        <p className="text-sm text-gray-600 mb-4">
          拡張機能を有効にするURLパターンを指定してください。
          ワイルドカード（*）を使用できます。例: https://*.notion.so/*
        </p>
        <p className="text-sm text-gray-600 mb-4">
          複数のURLパターンを一度に登録する場合は、1行に1つのパターンを入力してください。
          テキストファイルからコピー＆ペーストも可能です。
        </p>

        <div className="mb-4">
          <textarea
            value={bulkPatterns}
            onChange={(e) => setBulkPatterns(e.target.value)}
            placeholder="https://*.notion.so/*&#10;https://www.notion.so/*"
            className="w-full px-3 py-2 border rounded-md h-32 font-mono text-sm"
          />
        </div>

        <button
          onClick={saveBulkPatterns}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
        >
          URLパターンを保存
        </button>

        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">現在の登録パターン</h3>
          {urlPatterns.length > 0 ? (
            <ul className="space-y-2">
              {urlPatterns.map((pattern) => (
                <li key={pattern.id} className="p-2 bg-secondary rounded-md">
                  <span>{pattern.pattern}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">URLパターンが設定されていません。</p>
          )}
        </div>
      </div>

      {status && (
        <div className="mt-4 p-2 bg-green-100 text-green-800 rounded-md">
          {status}
        </div>
      )}
    </div>
  );
}
