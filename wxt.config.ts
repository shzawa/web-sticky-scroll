import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Notion Scroll Sticky',
    description: 'VSCodeのStickyScroll機能をNotionで実現するブラウザ拡張',
    version: '1.0.0',
    permissions: ['storage'],
    options_ui: {
      page: 'options/index.html',
      open_in_tab: true
    }
  },
});
