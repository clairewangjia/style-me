# LLM Output Contract — `/api/recommend`

Goal: lock the recommendation markdown into a shape the frontend parser can split deterministically, so `parseOutfits()` doesn't need fuzzy heading detection.

## Status (2026-05-14)

Recommend tab v2 shipped on this branch. **Two follow-ups for the home machine.**

### Done (committed)
- 推荐页拆 closet / aspirational 两种模式（`RecModeCards`）
- 后端响应按 `### Outfit / Day / 方案 / 套` 等多种 heading 切成 N 张 `OutfitCard`
- 每张卡独立 "✨ 为这套生成场景图" 按钮
- closet 模式 `/edits` 多图入参：face + 最多 4 张 wardrobe item 图喂给 Azure
- 生成结果自动入 IndexedDB `generations` (`mode: scene-closet|scene-aspirational`)
- 底部 "我的搭配" 横滑条 + lightbox 大图
- 推荐文字里的 `\`item_xxxx\`` 渲染成可点紫色按钮 → 跳衣橱 + 高亮（NavContext）
- ReactMarkdown 渲染（标题 / 列表 / 加粗都正常）

### Known issues / 待回家解决

**1. 衣物图当前从家里 tunnel 拉，不是 Azure Blob 直连**

- 这台工作机 `.env.local` 缺 `NEXT_PUBLIC_WARDROBE_BLOB_BASE` + `NEXT_PUBLIC_WARDROBE_BLOB_SAS`
- `lib/api.ts:itemImageUrl()` 在没设 BLOB_BASE 时退路到 `${API_BASE}/api/items/{id}/image` 走 dev tunnel
- 后果：图片走家里电脑 → 慢；家里离线就完全用不了；遇到下面问题 #2
- 修法：从家里 `.env.local` 拷贝那两个 BLOB env 到工作机 `.env.local`（**只放 SAS，不传到 git**）

**2. dev tunnel CORS 竞态（绕开了，但是 hack）**

- 浏览器并发 `fetch()` 6 张 wardrobe item 图时，dev tunnel session cookie 还没握手好，部分 fetch 报 `Failed to fetch / CORS blocked`（curl 同样请求是 200，所以不是 server CORS 配置错）
- 临时方案：`fetchItemBlob` 改用 `<img>+canvas.toBlob()` 取图（绕开 fetch 路径），fallback 到 fetch
- 解决 #1 后这块就不需要了 —— Azure Blob 直连不会有 cookie 握手问题，应该可以把 `lib/api.ts` 里的 `loadImageAsBlob` 整段删掉，改回直接 `fetch().blob()`

**3. 后端 LLM 输出格式不固定（这个文档主体）**

- 现在 parser 用启发式规则（emoji / bold / 关键字）认 outfit heading，每次 LLM 换说法都可能漏切
- 修法：按下面的 contract 把后端 prompt 锁死

### 回家具体步骤

```bash
# 1. 在家里 style-me 目录
cat .env.local | grep WARDROBE_BLOB
# 复制那两行，发给自己（微信/邮件），到工作机加进 .env.local

# 2. 改后端 prompt
# 找 recommend.py / llm.py 类文件，把 "OUTPUT FORMAT (strict, do not deviate)..." 段拼到 system prompt 里
# 见下方 "后端 prompt 修改建议"

# 3. 后端跑 5-10 次抽样验证 100% 命中 ### Outfit N — ...
```

回工作机后：

```bash
git pull
# 简化 lib/recommend-parse.ts: 删 emoji/bold 兜底, 留严格 ### Outfit N — 匹配
# 简化 lib/api.ts: 删 loadImageAsBlob, fetchItemBlob 直接 fetch
pnpm build
```

---

## Why this matters

Current parser sees these all as outfit headers:

- `### 方案一：xxx` ✅
- `### 🌟 Look 1：xxx` ✅
- `🌿 Day 1-2: xxx`  ⚠️ works only after we added emoji/bold heuristics
- `**Day 3:**` ⚠️ same
- Plain `第一套：xxx` ❌ silently merged into previous block

Every new LLM rephrase is a parser bug. Lock the format.

## Contract (backend prompt MUST enforce)

Each recommendation response is markdown with this exact layout:

```
<optional 1-2 lines preamble — weather note, vibe summary, etc.>

### Outfit 1 — <短标题>
- items: item_xxxx, item_yyyy, item_zzzz
- 场景: <场景描述>
- 理由: <搭配理由 1-3 句>

### Outfit 2 — <短标题>
- items: item_aaaa, item_bbbb
- 场景: <场景描述>
- 理由: <搭配理由>

<optional closing line>
```

### Hard rules

1. **每套搭配必须以 `### Outfit N — <标题>` 开头**。
   - `N` 是阿拉伯数字，从 1 起递增
   - 标题前后用 ` — `（em dash）分隔；标题简短（≤ 20 字符）
2. **`items:` 行必填**，所有引用的衣物 ID 一次列完，逗号分隔，全部 lower-case。
   - aspirational 模式（推荐没有的单品）依然要 `### Outfit N — ...` 开头，但 `items:` 后面写空列表 `[]` 或省略 items 行；改用 `- 推荐单品: <类目 + 描述>` 多行
3. 不要把 item ID 散布在自由文本里（`理由` 字段除外）—— frontend 把 `items:` 行当唯一权威来源
4. **不允许的写法**：`Day 1-2`, `Look 1`, `方案一`, `套二`, `第三套`, `🌟`+任何上述
5. preamble / closing 段不要用 `### ` 开头（避免误判成 outfit）

### 推荐：每套数 2-3 套

太多卡片用户翻不动；太少不像选项。后端在 prompt 里限制 `请给我推荐 2 到 3 套搭配`。

## Example — closet 模式

```
大同三天 28°C，白天暖晚有风、景点石路较多，给你两套灵活搭配 👇

### Outfit 1 — 清爽休闲
- items: item_0033, item_0037, item_0040
- 场景: 云冈石窟 / 古城闲逛
- 理由: 浅蓝 + 米黄是温柔低饱和配色，跟古城灰砖黄土很搭；阔腿裤走台阶舒服，米灰开衫早晚温差时披一层正合适。

### Outfit 2 — 复古工装
- items: item_0029, item_0001, item_0032
- 场景: 悬空寺 / 土林
- 理由: 牛仔衬衫的工装感在粗犷背景里很出片，热了脱掉只剩背心。整体蓝白配色干净利落，走山路不怕脏。

带双小白鞋或厚底凉鞋，再加一顶帽子防晒就完美 ✨
```

## Example — aspirational 模式

```
你的衣柜偏温柔色系，缺少能"提气场"的单品，建议添置 👇

### Outfit 1 — 法式优雅
- 推荐单品: 米色长款风衣 / 奶白丝质衬衫 / 直筒高腰西装裤 / 玛丽珍单鞋
- 场景: 上班、约会、轻商务
- 理由: 米色系延续你的现有色调，但加入丝质和西装裤元素瞬间提升质感。

### Outfit 2 — 通勤气质
- 推荐单品: 深蓝条纹针织背心 / 高腰锥形裤 / 白衬衫 / 乐福鞋
- 场景: 工位日 / 见客户
- 理由: 学院感配色稳重又不老气，跟你已有的浅蓝单品好叠搭。
```

## Frontend parser invariants（已实现，参考）

`lib/recommend-parse.ts:parseOutfits` 在新格式下应满足：

- 严格匹配 `^###\s+Outfit\s+\d+\s+—` → 100% 命中
- `items:` 行用 regex `^\s*[-*]?\s*items?\s*[:：]\s*(.+)$` 抽 ID 列表，比"全文 grep `item_xxxx`" 更准（不会把"理由"段里偶然提到的 ID 也算进去）
- `aspirational` 模式：parser 看到 `推荐单品:` 行就把整段作为 outfit body，itemIds = []

> 等后端切到这个格式后，把 parser 里的 emoji/bold 兜底逻辑 (`OUTFIT_KEYWORD_RE`, `LEADING_DECOR_RE`) 删掉，留严格匹配 + 单 fallback「无 outfit 头时返回单 anonymous 块」。

## 后端 prompt 修改建议

现行 prompt 应该追加一段 **OUTPUT FORMAT** 指令，原话：

```
OUTPUT FORMAT (strict, do not deviate):

You MUST format your reply as markdown matching exactly this template — 2 or 3 outfits:

### Outfit 1 — <短标题，≤ 20 字符>
- items: <comma-separated item_xxxx ids, all lowercase>
- 场景: <一行场景描述>
- 理由: <1-3 句搭配理由>

### Outfit 2 — <短标题>
- items: <ids>
- 场景: ...
- 理由: ...

(optional Outfit 3)

Hard rules:
- The heading line MUST start with "### Outfit N — " using an em dash.
- Do NOT use other heading conventions (Day, Look, 方案, 套, 第N套, etc.).
- The `items:` line is the SINGLE source of truth for which wardrobe items appear in this outfit. Do not mention extra item_xxxx ids elsewhere.
- All item ids must be lowercase exactly as in the wardrobe.
- For aspirational mode (when asked to recommend items the user does not own), replace `items:` with `推荐单品:` and list category + description text instead of ids.

You may write 1-2 short sentences of preamble before the first ### and one sentence of closing after the last outfit, but do not use ### headings outside of outfit titles.
```

## Migration plan

1. **后端**：把上面那段 OUTPUT FORMAT 指令拼进 system prompt
2. **抽样验证**：跑 5-10 次（覆盖 closet + aspirational + 不同 occasion），确认 100% 命中 `### Outfit N — `
3. **前端**：等后端稳定后，简化 `parseOutfits` —— 删 emoji/bold 兜底，只留严格 H3 匹配 + items: 行抽取
4. **回归**：`pnpm build` + 手测一次推荐流程

## Out of scope

- 不强制 outfit 数量（让 LLM 在 2-3 之间自适应，prompt 里建议但不强制）
- 不引入 JSON / YAML 输出 —— LLM 写 markdown 比 JSON 稳，且 parser 简单
- 不做后端 schema validation —— 信任 prompt + 前端 fallback 一份就够了
