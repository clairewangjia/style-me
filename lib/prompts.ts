// Prompt library for Style Me analysis modes.
// Each prompt is a self-contained instruction for gpt-image-2.
// We bake the uploaded portrait into the request as the source image
// (image edit) so the model preserves the person's identity.

const IDENTITY_PREAMBLE = `Use the provided portrait as the exact reference person.

Hard constraints:
- Preserve facial features, face shape, skin tone, eye shape, ethnicity, age range.
- Do NOT beautify, do NOT slim the face, do NOT change ethnicity, do NOT turn into a fashion model.
- Realistic editorial photography quality, natural lighting.
- Clean magazine-style infographic layout.
- Use Simplified Chinese for all labels and headings.
`;

export type AnalysisMode = "hair" | "color" | "outfit" | "vibe";

export interface ModeConfig {
  id: AnalysisMode;
  label: string;       // Chinese label shown in UI
  emoji: string;
  prompt: string;
  // Some modes benefit from different aspect ratios for the layout.
  size: "1024x1024" | "1024x1536" | "1536x1024";
}

export const MODES: Record<AnalysisMode, ModeConfig> = {
  hair: {
    id: "hair",
    label: "发型分析",
    emoji: "💇",
    size: "1024x1536",
    prompt:
      IDENTITY_PREAMBLE +
      `
Create a premium "个人发型分析图卡" (Personal Hairstyle Analysis Board).

Layout:
- Header: 中文大标题 "个人发型分析图卡" with subtitle "找到最适合你的发型，提升整体魅力力"
- Three vertical sections labeled (in Chinese):
  1. "最适合" ✓  — 3 to 4 best-matching hairstyles
  2. "普通"     — 3 to 4 average / neutral options
  3. "不建议" ✗ — 3 to 4 styles that don't suit
- Each style is a portrait of the SAME person from the reference photo wearing that hairstyle.
- Below each portrait: hairstyle name in Chinese (e.g. 寸头, 中分油头, 锅盖头, 韩式中分, 两段式 Two Block, 自然纹理, 网红烫卷, 夸张烫染, 莫西干).
- Pick hairstyles appropriate to the person's gender presentation.

Style:
- Magazine-grid layout, soft pastel background, thin separator lines.
- Each face must be unmistakably the same person.
- High-end editorial photo quality.`,
  },

  color: {
    id: "color",
    label: "色彩分析",
    emoji: "🎨",
    size: "1024x1536",
    prompt:
      IDENTITY_PREAMBLE +
      `
Create a premium "个人色彩分析图卡" (Personal Color Analysis Board).

Layout:
- Header: 中文大标题 "个人色彩分析图卡" with subtitle "基于你的肤色与气质，找到最显气色的色彩"
- A grid of the SAME person from the reference photo wearing solid-color tops in different colors.
- Group into three labeled rows (in Chinese):
  1. "推荐色" ✓  — colors that brighten the face
  2. "中性色"     — wearable but unremarkable
  3. "避免色" ✗   — colors that wash out or clash
- Each portrait is shoulders-up, plain studio background.
- Under each face show a color swatch + the color name in Chinese (e.g. 雾霾蓝, 砖红, 燕麦, 墨绿, 樱花粉, 芥末黄, 鲜橙, 荧光紫).
- Bottom: a 12-color palette strip showing the recommended palette together.

Style:
- Soft beige background, clean infographic typography.
- Faces clearly the same person.`,
  },

  outfit: {
    id: "outfit",
    label: "穿搭分析",
    emoji: "👗",
    size: "1024x1536",
    prompt:
      IDENTITY_PREAMBLE +
      `
Create a premium "个人穿搭风格分析" (Personal Outfit Style Analysis Board).

Layout:
- Header: 中文大标题 "个人穿搭风格分析" with subtitle "找到最适合你的风格，提升气场与质感"
- A grid of the SAME person in different full-body outfits (street-style photography).
- Label each outfit in Chinese, organized into:
  1. "风格匹配" ✓  — Recommended (e.g. 极简法系, 日系清新, 通勤商务, 美式复古, Smart Casual, 老钱风 Old Money)
  2. "可尝试"     — Worth trying (e.g. 韩系休闲, 学院风, 街头潮流, 雅痞风)
  3. "不推荐" ✗   — Avoid (e.g. 夸张印花, 过于紧身, 荧光色系, 过度配饰)
- Each panel shows the person head-to-toe in that outfit, on a clean street background.
- Bottom: small "推荐穿搭单品" row — five clothing item icons with Chinese labels.

Style:
- Editorial street-style photography, consistent person across all panels.
- Pastel background, clear panel borders, polished magazine grid.`,
  },

  vibe: {
    id: "vibe",
    label: "气质分析",
    emoji: "✨",
    size: "1024x1536",
    prompt:
      IDENTITY_PREAMBLE +
      `
Create a premium "个人气质风格分析图卡" (Personal Vibe / Identity Analysis Board).

Layout:
- Header: 中文大标题 "你的专属气质标签" with subtitle "三种最适合你的气质方向"
- Show the SAME person styled in THREE distinct visual identities, each as a large portrait card.
- Pick the three from this set, choosing what genuinely suits the reference face:
  干净书卷 / 高级冷感 / 慵懒文艺 / 清冷少年 / 复古港风 / 都市精英 /
  邻家暖男 / 前卫先锋 / 元气运动 / 法式优雅 / 温柔治愈 / 性感氛围.
- Under each portrait:
  - 中文气质标签 (large)
  - 关键词 3 个 (e.g. 自信, 干练, 简约)
  - 推荐场景一行
- Bottom strip: "你的气质关键词" — six small Chinese tag chips.

Style:
- Editorial fashion-cover quality, three large vertical cards side by side.
- Cohesive color palette, very magazine-like.
- All three faces must clearly be the same person from the reference photo.`,
  },
};
