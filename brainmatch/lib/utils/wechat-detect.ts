/**
 * 微信浏览器 & 移动设备检测
 *
 * 用于前端判断支付流程：
 *  - PC 浏览器 → 显示二维码供扫码
 *  - 微信浏览器 → 尝试跳转支付链接
 */

export function isWeChatBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /micromessenger/i.test(navigator.userAgent);
}

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    navigator.userAgent
  );
}
