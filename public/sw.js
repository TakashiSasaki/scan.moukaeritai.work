// 最小限のサービスワーカー。キャッシュ機能はまだ持たせません。
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // PWAとしてインストール可能にするためのフェッチハンドラー（何もしない）
});
