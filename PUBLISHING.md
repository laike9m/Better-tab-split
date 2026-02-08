# Chrome Web Store 发布指南

## 准备好的文件

### 扩展包
- `Better-Tab-Split-v1.0.0.zip` - 上传到 Chrome Web Store 的扩展包

### 商店资源 (store_assets/)
- `promo_small_440x280.png` - 小型宣传图片 (必需)
- `promo_large_920x680.png` - 大型宣传图片 (推荐)
- `screenshot_1_1280x800.png` - 截图 (至少需要1张)

## 发布步骤

### 1. 注册开发者账号
1. 访问 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. 使用 Google 账号登录
3. 支付一次性注册费 $5 USD

### 2. 创建新项目
1. 点击 "New Item" 按钮
2. 上传 `Better-Tab-Split-v1.0.0.zip` 文件

### 3. 填写商店信息

#### 基本信息
- **名称**: Better Tab Split
- **简短描述**: Open links in the other side of Split View instead of a new tab.
- **详细描述**:
```
Better Tab Split enhances Chrome's Split View feature by allowing you to open links in the other split panel instead of a new tab.

🔹 Features:
• Automatically detects when Split View is active
• Toggle the feature on/off with a single click
• Click any link to open it in the other split panel
• Respects modifier keys (Ctrl/Cmd/Shift) for default behavior

🔹 How to use:
1. Enable Chrome's Split View feature (chrome://flags → "Split View")
2. Create a split view by right-clicking a tab
3. Click the extension icon to enable link redirection
4. Click any link - it opens in the other panel!

🔹 Icon States:
• Blue: Feature is ON
• Gray: Feature is OFF
• Light Gray: Split View not active

Note: Requires Chrome 142+ with Split View enabled.

---

Better Tab Split 增强了 Chrome 的分屏功能，让你点击链接时在另一侧打开，而不是新标签页。

功能特点：
• 自动检测分屏状态
• 一键开关
• 点击链接在另一侧打开
• 支持修饰键的默认行为
```

#### 分类
- **类别**: Productivity

#### 语言
- 主要语言: English
- 额外语言: Chinese (Simplified)

### 4. 上传图片资源
- **商店图标**: 使用 `icons/icon-128.png`
- **小型宣传图**: 上传 `store_assets/promo_small_440x280.png`
- **大型宣传图**: 上传 `store_assets/promo_large_920x680.png`
- **截图**: 上传 `store_assets/screenshot_1_1280x800.png`

### 5. 隐私政策
由于扩展需要 `<all_urls>` 权限，需要提供隐私政策。

简单的隐私政策模板：
```
Privacy Policy for Better Tab Split

This extension does not collect, store, or transmit any personal data.

Data Usage:
- The extension only reads the current tab's URL to determine if it can inject scripts
- No browsing history is stored or transmitted
- No analytics or tracking is implemented

Permissions Explanation:
- "tabs": Required to detect Split View status and manage tab navigation
- "activeTab": Required to interact with the current tab
- "scripting": Required to inject the link interception script
- "<all_urls>": Required to work on any website

Contact: [your email]
Last updated: February 2026
```

### 6. 提交审核
1. 确认所有信息填写完整
2. 点击 "Submit for Review"
3. 审核通常需要 1-3 个工作日

## 注意事项

1. **Chrome 版本要求**: 此扩展需要 Chrome 142+，因为使用了 `splitViewId` API
2. **Split View 功能**: 用户需要在 `chrome://flags` 中启用 Split View
3. **权限说明**: 审核时可能需要解释为什么需要 `<all_urls>` 权限

## 更新扩展

更新时：
1. 修改 `manifest.json` 中的 `version`
2. 重新打包: `zip -r Better-Tab-Split-vX.X.X.zip manifest.json background.js content.js icons/`
3. 在 Developer Dashboard 上传新版本
