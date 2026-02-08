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

  // 处理链接点击
  function handleClick(event) {
    if (!isEnabled) {
      return;
    }

    // 查找被点击的链接元素
    let target = event.target;
    while (target && target.tagName !== 'A') {
      target = target.parentElement;
    }

    if (!target || !target.href) {
      return;
    }

    // 检查是否是有效的 HTTP/HTTPS 链接
    const url = target.href;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return;
    }

    // 检查是否有特殊的 target 属性（如 _self）
    const targetAttr = target.getAttribute('target');
    if (targetAttr === '_self') {
      return; // 尊重 _self，在当前页面打开
    }

    // 检查是否按住了修饰键
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      return; // 让浏览器处理修饰键组合
    }

    // 检查是否是中键点击
    if (event.button !== 0) {
      return; // 只处理左键点击
    }

    // 阻止默认行为
    event.preventDefault();
    event.stopPropagation();

    // 发送消息给 background script
    chrome.runtime.sendMessage({
      type: 'OPEN_IN_OTHER_SPLIT',
      url: url
    }).catch(err => {
      console.error('Better Tab Split: Error sending message:', err);
      // 如果发送失败，使用默认行为
      window.open(url, '_blank');
    });
  }

  // 添加事件监听器
  function enableLinkInterception() {
    document.addEventListener('click', handleClick, true);
  }

  // 移除事件监听器
  function disableLinkInterception() {
    document.removeEventListener('click', handleClick, true);
  }

  // 监听来自 background script 的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'UPDATE_STATE') {
      isEnabled = message.enabled;

      if (isEnabled) {
        enableLinkInterception();
      } else {
        disableLinkInterception();
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
        enableLinkInterception();
      }
    })
    .catch(err => {
      console.error('Better Tab Split: Error checking initial state:', err);
    });
})();
