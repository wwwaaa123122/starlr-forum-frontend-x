import { plugin as shadcn } from "@shadcn/lint";
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["dist/**", "dist-f/**"],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { shadcn, "react-hooks": reactHooks },
    settings: {
      shadcn: {
        themeImports: ["./src/index.css"],
        componentImports: ["^\\./components/", "^\\./"],
      },
    },
    rules: {
      "shadcn/no-restyle": [
        "error",
        {
          allow: ["layout"],
          contracts: [
            // Skeleton 占位形状/尺寸由调用处决定
            { pattern: "^Skeleton$", allow: ["shape", "color", "border", "layout"] },
            // Modal 宽度与内边距由场景决定
            { pattern: "^Modal$", allow: ["p-*", "w-*", "layout"] },
            // 输入框/文本域：内嵌图标预留左 padding、尺寸、排版由场景控制
            {
              pattern: "^(Input|Textarea)$",
              allow: ["typography", "p-*", "pl-*", "h-*", "w-*", "text-center", "layout"],
            },
            // Button 允许调用处控制内部间距/排版/颜色/尺寸（图标按钮、紧凑场景）
            {
              pattern: "^Button$",
              allow: ["p-*", "px-*", "pl-*", "py-*", "gap-*", "h-*", "w-*", "max-w-*", "typography", "color", "justify-*", "layout"],
            },
            // IconButton 颜色可覆盖（danger 等）
            { pattern: "^IconButton$", allow: ["color", "layout"] },
            // MenuItem 禁用态等效果覆盖
            { pattern: "^MenuItem$", allow: ["effects", "color", "layout"] },
            // 管理后台表格单元格/标签：排版与颜色由场景控制
            { pattern: "^(Td|Tag)$", allow: ["typography", "color", "layout"] },
          ],
        },
      ],
      "shadcn/no-raw-colors": "error",
      "shadcn/no-arbitrary-values": [
        "error",
        {
            allow: [
              // 精确值：品牌圆角 logo（icon-512 圆角 25%）
              "rounded-[25%]",
              // 品牌径向渐变背景（登录/注册/个人页横幅）
              "bg-[radial-gradient(ellipse_at_top,var(--sl-brand-soft),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(58,210,159,0.14),transparent_55%)]",
              "bg-[radial-gradient(ellipse_at_top,var(--sl-brand-soft),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(255,200,87,0.12),transparent_55%)]",
              "bg-[radial-gradient(ellipse_at_top,var(--sl-brand-soft),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(58,210,159,0.12),transparent_50%)]",
              "bg-[radial-gradient(ellipse_at_top,var(--sl-brand-soft),transparent_60%)]",
              // 非整数间距（视觉精确值，Tailwind 标度上无等价类）
              "w-[78%]", "w-[92vw]", "w-[94vw]",
              "sm:grid-cols-[1fr_auto]",
              "active:scale-[0.97]",
              "accent-[var(--sl-brand)]",
              // 特小字号（徽标/图表刻度，介于 xs 与更小之间）
              "text-[9px]", "text-[10px]", "text-[11px]", "text-[13px]", "text-[15px]", "text-[17px]", "text-[22px]",
            ],
          },
      ],
      "shadcn/no-inline-styles": [
        "error",
        {
          allow: [
            // 动态值必须用内联样式（CSS 自定义属性无法覆盖的场景）
            "fontSize", "background", "width", "height", "minWidth", "transform", "animationDelay",
          ],
        },
      ],
      "shadcn/no-unknown-classes": "error",
      "shadcn/require-static-classes": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error",
    },
  },
]);
