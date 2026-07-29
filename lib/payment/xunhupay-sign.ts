import crypto from 'crypto';

/**
 * 虎皮椒 (Xunhupay) API 签名工具
 *
 * 签名算法：
 *   1. 过滤空值 + hash 字段
 *   2. 按参数名 ASCII 字典序排序
 *   3. 拼接为 key1=value1&key2=value2 + AppSecret
 *   4. MD5 → 32位小写
 *
 * 参见: https://www.xunhupay.com/doc/api/pay.html
 */

/**
 * 生成虎皮椒 API 请求签名
 */
export function generateXunhuSign(
  params: Record<string, string | number>,
  secret: string
): string {
  const sortedKeys = Object.keys(params)
    .filter(
      (k) =>
        params[k] !== '' &&
        params[k] !== undefined &&
        params[k] !== null &&
        k !== 'hash'
    )
    .sort();

  const rawString = sortedKeys.map((k) => `${k}=${params[k]}`).join('&');

  return crypto
    .createHash('md5')
    .update(rawString + secret, 'utf8')
    .digest('hex'); // 32位小写
}

/**
 * 验证虎皮椒回调签名
 */
export function verifyXunhuSign(
  params: Record<string, string | number>,
  secret: string,
  receivedHash: string
): boolean {
  const computed = generateXunhuSign(params, secret);
  return computed === receivedHash.toLowerCase();
}
