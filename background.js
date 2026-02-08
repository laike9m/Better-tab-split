// Better Tab Split - Background Service Worker
// 管理扩展状态和处理链接拦截

// 存储每个 tab 的启用状态
const enabledTabs = new Map();

// 图标路径
const ICONS = {
  disabled: {
    16: 'icons/icon-disabled-16.png',
    32: 'icons/icon-disabled-32.png',
    48: 'icons/icon-disabled-48.png',
    128: 'icons/icon-disabled-128.png'
  },
  off: {
    16: 'icons/icon-off-16.png',
    32: 'icons/icon-off-32.png',
    48: 'icons/icon-off-48.png',
    128: 'icons/icon-off-128.png'
  },
  on: {
    16: 'icons/icon-on-16.png',
    32: 'icons/icon-on-32.png',
    48: 'icons/icon-on-48.png',
    128: 'icons/icon-on-128.png'
  }
};

// 检查 tab 是否在 Split View 中
async function isInSplitView(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    // splitViewId 存在且不等于 -1 (SPLIT_VIEW_ID_NONE) 表示在 Split View 中
    return tab.splitViewId !== undefined && tab.splitViewId !== chrome.tabs.SPLIT_VIEW_ID_NONE;
  } catch (e) {
    console.error('Error checking split view status:', e);
    return false;
  }
}

// 获取同一 Split View 中的另一个 tab
async function getOtherSplitViewTab(tabId) {
  try {
    const currentTab = await chrome.tabs.get(tabId);
    if (!currentTab.splitViewId || currentTab.splitViewId === chrome.tabs.SPLIT_VIEW_ID_NONE) {
      return null;
    }

    // 查询同一窗口中具有相同 splitViewId 的所有 tabs
    const tabs = await chrome.tabs.query({
      windowId: currentTab.windowId
    });

    // 找到同一 Split View 中的另一个 tab
    const otherTab = tabs.find(t =>
      t.id !== tabId &&
      t.splitViewId === currentTab.splitViewId
    );

    return otherTab || null;
  } catch (e) {
    console.error('Error getting other split view tab:', e);
    return null;
  }
}

// 更新扩展图标和状态
async function updateExtensionState(tabId) {
  const inSplitView = await isInSplitView(tabId);

  if (!inSplitView) {
    // 不在 Split View 中 - 灰色图标
    await chrome.action.setIcon({ tabId, path: ICONS.disabled });
    await chrome.action.setTitle({
      tabId,
      title: 'Better Tab Split (未启用 Split View)'
    });
    await chrome.action.disable(tabId);
    enabledTabs.delete(tabId);
  } else {
    // 在 Split View 中 - 启用扩展
    await chrome.action.enable(tabId);
    const isEnabled = enabledTabs.get(tabId) || false;

    if (isEnabled) {
      await chrome.action.setIcon({ tabId, path: ICONS.on });
      await chrome.action.setTitle({
        tabId,
        title: 'Better Tab Split: 开启 (点击关闭)'
      });
      // 注入 content script
      await injectContentScript(tabId, true);
    } else {
      await chrome.action.setIcon({ tabId, path: ICONS.off });
      await chrome.action.setTitle({
        tabId,
        title: 'Better Tab Split: 关闭 (点击开启)'
      });
      // 禁用 content script
      await injectContentScript(tabId, false);
    }
  }
}

// 检查是否可以在该 URL 注入脚本
function canInjectScript(url) {
  if (!url) return false;
  // 不能在这些特殊页面注入脚本
  const restrictedProtocols = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'about:',
    'devtools://',
    'view-source:',
    'chrome-search://'
  ];
  return !restrictedProtocols.some(protocol => url.startsWith(protocol));
}

// 注入或更新 content script
async function injectContentScript(tabId, enabled) {
  // 先获取 tab 信息检查 URL
  let tab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch (e) {
    return; // tab 不存在，静默返回
  }

  if (!canInjectScript(tab.url)) {
    // 无法在此页面注入脚本，静默跳过
    return;
  }

  // 先尝试发送消息给已存在的 content script
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'UPDATE_STATE',
      enabled: enabled
    });
    return; // 成功发送消息，不需要注入
  } catch (e) {
    // content script 不存在或无法通信，继续尝试注入
  }

  // 尝试注入 content script
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
  } catch (e) {
    // 注入失败（可能是受限页面），静默返回
    return;
  }

  // 发送初始状态
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'UPDATE_STATE',
      enabled: enabled
    });
  } catch (e) {
    // 发送消息失败，静默处理
  }
}

// 处理扩展图标点击
chrome.action.onClicked.addListener(async (tab) => {
  const inSplitView = await isInSplitView(tab.id);

  if (!inSplitView) {
    return; // 不在 Split View 中，不做任何操作
  }

  // 切换启用状态
  const currentState = enabledTabs.get(tab.id) || false;
  const newState = !currentState;
  enabledTabs.set(tab.id, newState);

  // 更新图标和 content script
  await updateExtensionState(tab.id);

  // 同时更新同一 Split View 中的另一个 tab
  const otherTab = await getOtherSplitViewTab(tab.id);
  if (otherTab) {
    enabledTabs.set(otherTab.id, newState);
    await updateExtensionState(otherTab.id);
  }
});

// 监听 tab 激活
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await updateExtensionState(activeInfo.tabId);
});

// 监听 tab 更新
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    await updateExtensionState(tabId);
  }
});

// 监听 tab 关闭，清理状态
chrome.tabs.onRemoved.addListener((tabId) => {
  enabledTabs.delete(tabId);
});

// 处理来自 content script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OPEN_IN_OTHER_SPLIT') {
    handleOpenInOtherSplit(sender.tab.id, message.url);
    sendResponse({ success: true });
  } else if (message.type === 'CHECK_ENABLED') {
    const isEnabled = enabledTabs.get(sender.tab.id) || false;
    sendResponse({ enabled: isEnabled });
  }
  return true; // 保持消息通道开放
});

// 在另一个 Split View 中打开链接
async function handleOpenInOtherSplit(sourceTabId, url) {
  try {
    const otherTab = await getOtherSplitViewTab(sourceTabId);

    if (otherTab) {
      // 在另一个 split view tab 中打开链接
      await chrome.tabs.update(otherTab.id, { url: url });
    } else {
      // 如果找不到另一个 split view tab，在新标签页中打开
      await chrome.tabs.create({ url: url });
    }
  } catch (e) {
    console.error('Error opening in other split:', e);
    // 失败时在新标签页中打开
    await chrome.tabs.create({ url: url });
  }
}
