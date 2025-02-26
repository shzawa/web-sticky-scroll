import React, { useEffect, useState } from "react";
import { browser } from "wxt/browser";

interface UrlPattern {
  id: string;
  pattern: string;
}

export default function App() {
  const [urlPatterns, setUrlPatterns] = useState<UrlPattern[]>([]);
  const [newPattern, setNewPattern] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    // 保存されたURLパターンを読み込む
    const loadPatterns = async () => {
      const result = await browser.storage.local.get("urlPatterns");
      const patterns = result.urlPatterns as UrlPattern[] || [];
      setUrlPatterns(patterns);
    };

    loadPatterns();
  }, []);

  const savePatterns = async (patterns: UrlPattern[]) => {
    await browser.storage.local.set({ urlPatterns: patterns });
    setStatus("設定を保存しました");
    setTimeout(() => setStatus(""), 2000);
  };

  const addPattern = () => {
    if (!newPattern) return;

    const pattern = {
      id: Date.now().toString(),
      pattern: newPattern
    };

    const updatedPatterns = [...urlPatterns, pattern];
    setUrlPatterns(updatedPatterns);
    savePatterns(updatedPatterns);
    setNewPattern("");
  };

  const removePattern = (id: string) => {
    const updatedPatterns = urlPatterns.filter(p => p.id !== id);
    setUrlPatterns(updatedPatterns);
    savePatterns(updatedPatterns);
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Notion Scroll Sticky 設定</h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">URLパターン</h2>
        <p className="text-sm text-gray-600 mb-4">
          拡張機能を有効にするURLパターンを指定してください。
          ワイルドカード（*）を使用できます。例: https://*.notion.so/*
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newPattern}
            onChange={(e) => setNewPattern(e.target.value)}
            placeholder="https://*.notion.so/*"
            className="flex-1 px-3 py-2 border rounded-md"
          />
          <button
            onClick={addPattern}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            追加
          </button>
        </div>

        {urlPatterns.length > 0 ? (
          <ul className="space-y-2">
            {urlPatterns.map((pattern) => (
              <li key={pattern.id} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                <span>{pattern.pattern}</span>
                <button
                  onClick={() => removePattern(pattern.id)}
                  className="text-destructive"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">URLパターンが設定されていません。</p>
        )}
      </div>

      {status && (
        <div className="mt-4 p-2 bg-green-100 text-green-800 rounded-md">
          {status}
        </div>
      )}
    </div>
  );
}
