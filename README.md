# Style Me

Upload one portrait → get four AI-generated personal style analysis cards: hairstyles, color palette, outfits, and vibe. Built as a tiny Next.js demo, can be wrapped into an iOS app via Capacitor.

## What it does

Pick a face photo → choose one of the four modes:

| Mode | Output |
|---|---|
| 💇 发型分析 | Magazine-style board of best / neutral / avoid hairstyles, all on the same face |
| 🎨 色彩分析 | Best, neutral, and avoid color swatches modeled on the same face |
| 👗 穿搭分析 | Full-body outfits in different style families |
| ✨ 气质分析 | Three vibe identities (e.g. 清冷少年 / 都市精英 / 法式优雅) |

All generations + uploads persist locally in IndexedDB — they survive refresh, never leave the device.

## Stack

- Next.js 16 (App Router, static export) + React 19 + Tailwind 4
- Azure OpenAI `gpt-image-2` `/images/edits` endpoint (image-to-image, preserves the reference face)
- IndexedDB for the photo + generation library (no server, no account)
- Capacitor 8 for the iOS wrap

## Run locally (web)

```bash
pnpm install
cp .env.example .env.local   # then fill in your Azure OpenAI keys
pnpm dev
```

Open http://localhost:3000.

## Run on iOS

The web build is wrapped with Capacitor. Requires Xcode.

```bash
pnpm ios   # next build && cap sync ios && cap open ios
```

Then in Xcode: select your team in **Signing & Capabilities**, plug in your iPhone, ⌘R.

## Security note

This app is a **personal demo**. Because it's a static SPA (no server), the Azure key has to be exposed via `NEXT_PUBLIC_*` env vars and gets bundled into the JS / iOS app. That's fine if:

- You only run it locally, or
- You only install the iOS build on **your own devices**.

**Do not**:

- Deploy the static build to a public URL (the key is in the bundle)
- Distribute the iOS `.ipa` to others
- Commit your `.env.local`

If you want to share, move the Azure call back to a Next.js API route and host on Vercel — keep the key server-side.

## License

MIT
