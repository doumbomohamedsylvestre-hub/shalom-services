# Shalom Service — PWA / Favicons / Social Assets

The images in `public/` are ready to copy into the `public/` directory of a Next.js website.

## Main files

- `public/favicon.ico`: multiple favicon sizes (16, 24, 32, 48, 64).
- `public/favicon-{16,32,48,64,96}x{size}.png`: favicon fallbacks.
- `public/apple-touch-icon.png`: 180×180 iPhone / iPad home-screen icon.
- `public/android-chrome-192x192.png` and `-512x512.png`: legacy Android names.
- `public/icons/icon-*.png`: standard PWA icons.
- `public/icons/maskable-icon-192x192.png` and `-512x512.png`: Android adaptive/maskable icons (logo held in safe zone).
- `public/icons/monochrome-icon-192x192.png` and `-512x512.png`: optional monochrome / themed marks.
- `public/manifest.webmanifest`: PWA install manifest.
- `public/safari-pinned-tab.svg`: simplified monochrome silhouette for Safari pinned tabs.
- `public/browserconfig.xml` and `public/mstile-*.png`: legacy Windows tile assets.
- `public/opengraph-image.png`, `public/twitter-image.png`: 1200×630 social previews.
- `public/splash-*.png`: OPTIONAL splash artwork, not automatically enabled on iOS.
- `public/branding/`: chosen horizontal and icon-only logo.

## Next.js App Router

1. Copy every file and folder in `public/` into `<your-next-project>/public/`.
2. Add `manifest: '/manifest.webmanifest'` and the favicon links in `app/layout.tsx` metadata. The example is in `nextjs-metadata.example.ts`.
3. Set `themeColor: '#07274d'` via the exported `viewport` constant.
4. For actual offline operation, add your own service worker and cache/network strategy. A manifest and icons alone **do not** make pages work offline.
5. Host over HTTPS (localhost is an allowed development exception), then test installability on actual Android/iOS devices.
6. This manifest uses root `/` routes. If deploying under a path prefix, revise `start_url`, `scope`, `id`, and icon URLs.

## Design caveats

- The master source is the **selected Shalom Service logo** supplied in the conversation. The simplified Safari pinned-tab silhouette is an approximation for one-color use.
- Social preview photos and illustrative materials are AI-generated concepts, not actual photographs of the company's real workshop or staff. Replace them with real photos if making factual representations.
- The manifest does not invent repair-request URLs, app screenshots, prices, or business contact information.
- Splash images are optional brand assets. Apple launch screens require device-specific media queries and should not be assumed to activate just by being present.

## Brand palette

Navy: `#07274d` · Dark navy: `#061b38` · Orange: `#ff7900` · White: `#ffffff`.
