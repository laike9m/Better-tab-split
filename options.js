// Better Tab Split - Options Page

const autoActivateCheckbox = document.getElementById('autoActivate');
const statusEl = document.getElementById('status');

// 加载设置
chrome.storage.sync.get({ autoActivate: true }, (items) => {
  autoActivateCheckbox.checked = items.autoActivate;
});

// 保存设置
autoActivateCheckbox.addEventListener('change', () => {
  const value = autoActivateCheckbox.checked;
  chrome.storage.sync.set({ autoActivate: value }, () => {
    // 显示保存提示
    statusEl.classList.add('visible');
    setTimeout(() => statusEl.classList.remove('visible'), 1500);
  });
});
