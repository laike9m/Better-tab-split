// Better Tab Split - Content Script
// 拦截链接点击并在另一个 Split View 中打开

(function () {
  'use strict';

  // 防止重复注入
  if (window.__betterTabSplitInjected) {
    return;
  }
  window.__betterTabSplitInjected = true;

  let isEnabled = false;
  // 用于跟踪已处理的 mousedown 事件，避免 click 事件重复处理
  let pendingNavigation = null;

  // 查找链接元素
  function findLinkElement(element) {
    let target = element;
    // 向上遍历 DOM 树查找 <a> 标签
    while (target && target !== document.body) {
      if (target.tagName === 'A' && target.href) {
        return target;
      }
      // 也检查 data-href 或其他常见的链接属性（用于 SPA）
      if (target.dataset && target.dataset.href) {
        return { href: target.dataset.href, isDataAttr: true };
      }
      target = target.parentElement;
    }
    return null;
  }

  // 检查 URL 是否有效
  function isValidUrl(url) {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://');
  }

  // 检查是否应该拦截此事件
  function shouldIntercept(event, linkElement) {
    if (!isEnabled) return false;
    if (!linkElement) return false;

    const url = linkElement.href;
    if (!isValidUrl(url)) return false;

    // 检查是否有特殊的 target 属性（如 _self）
    if (!linkElement.isDataAttr) {
      const targetAttr = linkElement.getAttribute('target');
      if (targetAttr === '_self') {
        return false; // 尊重 _self，在当前页面打开
      }
    }

    // 检查是否按住了修饰键
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      return false; // 让浏览器处理修饰键组合
    }

    // 检查是否是中键点击
    if (event.button !== 0) {
      return false; // 只处理左键点击
    }

    return true;
  }

  // 执行导航到另一个 Split View
  function navigateToOtherSplit(url) {
    chrome.runtime.sendMessage({
      type: 'OPEN_IN_OTHER_SPLIT',
      url: url
    }).catch(err => {
      console.error('Better Tab Split: Error sending message:', err);
      // 如果发送失败，使用默认行为
      window.open(url, '_blank');
    });
  }

  // 处理 mousedown/pointerdown 事件 - 在 click 之前捕获
  // 这对于 React/SPA 网站很重要，因为它们可能在 click 事件中使用 stopPropagation
  function handleMouseDown(event) {
    const linkElement = findLinkElement(event.target);
    if (!shouldIntercept(event, linkElement)) {
      pendingNavigation = null;
      return;
    }

    // 记录待处理的导航
    pendingNavigation = {
      url: linkElement.href,
      timestamp: Date.now(),
      target: event.target
    };

    // 对于 SPA 网站，我们需要在 mousedown 阶段就阻止事件传播
    // 这样可以防止 React 等框架的事件处理器处理这个点击
    // 注意：我们不在这里调用 preventDefault()，因为这会影响焦点等行为
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  // 处理 click 事件
  function handleClick(event) {
    const linkElement = findLinkElement(event.target);

    // 如果有待处理的导航且时间间隔合理（500ms 内）
    if (pendingNavigation && Date.now() - pendingNavigation.timestamp < 500) {
      const url = pendingNavigation.url;
      pendingNavigation = null;

      // 阻止所有其他事件处理器
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      navigateToOtherSplit(url);
      return;
    }

    // 清除过期的待处理导航
    pendingNavigation = null;

    // 作为备份，也直接检查 click 事件
    if (!shouldIntercept(event, linkElement)) {
      return;
    }

    // 阻止所有其他事件处理器
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    navigateToOtherSplit(linkElement.href);
  }

  // 处理 auxclick 事件（中键点击等）- 不拦截，让浏览器处理
  // 这里不需要特殊处理

  // 添加事件监听器
  function enableLinkInterception() {
    // 使用捕获阶段，确保在其他处理器之前执行
    // 同时监听 pointerdown 和 mousedown，因为某些框架可能使用 pointer events
    document.addEventListener('pointerdown', handleMouseDown, true);
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('click', handleClick, true);
  }

  // 移除事件监听器
  function disableLinkInterception() {
    document.removeEventListener('pointerdown', handleMouseDown, true);
    document.removeEventListener('mousedown', handleMouseDown, true);
    document.removeEventListener('click', handleClick, true);
  }

  // === History API 拦截 ===
  // 用于处理 SPA 的客户端导航（如 React Router）
  let historyInterceptionEnabled = false;
  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  // 检查 URL 是否是同源的不同页面
  function isDifferentPage(url) {
    try {
      const newUrl = new URL(url, window.location.origin);
      const currentUrl = new URL(window.location.href);

      // 检查是否是同源
      if (newUrl.origin !== currentUrl.origin) {
        return false; // 跨域，不处理
      }

      // 检查路径是否不同
      return newUrl.pathname !== currentUrl.pathname;
    } catch (e) {
      return false;
    }
  }

  // 拦截 history.pushState
  function interceptedPushState(state, title, url) {
    if (historyInterceptionEnabled && isEnabled && url && isDifferentPage(url)) {
      // 检查这是否是由用户点击触发的（通过检查 pendingNavigation）
      if (pendingNavigation && Date.now() - pendingNavigation.timestamp < 500) {
        const fullUrl = new URL(url, window.location.origin).href;
        pendingNavigation = null;

        // 在另一个 Split View 中打开，不在当前页面导航
        navigateToOtherSplit(fullUrl);
        return; // 不执行原始的 pushState
      }
    }

    // 执行原始的 pushState
    return originalPushState(state, title, url);
  }

  // 拦截 history.replaceState
  function interceptedReplaceState(state, title, url) {
    if (historyInterceptionEnabled && isEnabled && url && isDifferentPage(url)) {
      if (pendingNavigation && Date.now() - pendingNavigation.timestamp < 500) {
        const fullUrl = new URL(url, window.location.origin).href;
        pendingNavigation = null;

        navigateToOtherSplit(fullUrl);
        return;
      }
    }

    return originalReplaceState(state, title, url);
  }

  // 启用 History API 拦截
  function enableHistoryInterception() {
    if (historyInterceptionEnabled) return;
    historyInterceptionEnabled = true;
    history.pushState = interceptedPushState;
    history.replaceState = interceptedReplaceState;
  }

  // 禁用 History API 拦截
  function disableHistoryInterception() {
    if (!historyInterceptionEnabled) return;
    historyInterceptionEnabled = false;
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
  }

  // 更新后的启用/禁用函数
  function enableAllInterception() {
    enableLinkInterception();
    enableHistoryInterception();
  }

  function disableAllInterception() {
    disableLinkInterception();
    disableHistoryInterception();
  }

  // 监听来自 background script 的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'UPDATE_STATE') {
      isEnabled = message.enabled;

      if (isEnabled) {
        enableAllInterception();
      } else {
        disableAllInterception();
      }

      sendResponse({ success: true });
    }
    return true;
  });

  // 初始化时检查状态
  chrome.runtime.sendMessage({ type: 'CHECK_ENABLED' })
    .then(response => {
      if (response && response.enabled) {
        isEnabled = true;
        enableAllInterception();
      }
    })
    .catch(err => {
      console.error('Better Tab Split: Error checking initial state:', err);
    });
})();
