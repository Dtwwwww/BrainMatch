import type { PaymentProvider, OrderStatus, RefundResult } from './interface';
import type { CreateOrderParams, CallbackResult } from '@/lib/types';
import { generateXunhuSign, verifyXunhuSign } from './xunhupay-sign';

interface XunhuConfig {
  appid: string;
  secret: string;
  apiBase: string;
  notifyUrl: string;
}

interface XunhuApiResponse {
  openid?: string; // ⚠️ 历史遗留命名，实际是订单号
  url_qrcode?: string; // PC 端二维码地址
  url?: string; // 手机端跳转 URL
  errcode?: number; // 0=成功
  errmsg?: string;
  hash?: string;
  status?: string; // 查询接口：OD=已支付
  total_fee?: string;
  trade_order_id?: string;
}

interface XunhuCallbackData {
  trade_order_id?: string;
  total_fee?: string;
  transaction_id?: string;
  open_order_id?: string;
  order_title?: string;
  status?: string; // OD=已支付, CD=已退款
  appid?: string;
  time?: string;
  nonce_str?: string;
  attach?: string;
  hash?: string;
}

/**
 * 虎皮椒 (Xunhupay) 聚合支付 Provider
 *
 * 支持:
 *   - Native 扫码支付（PC 端）
 *   - H5 跳转支付（手机端）
 *
 * 环境变量要求:
 *   XUNHU_APPID  — 应用 ID（微信和支付宝不同）
 *   XUNHU_SECRET — 应用密钥
 *   XUNHU_API_BASE  — API 地址（默认 https://api.xunhupay.com）
 *   XUNHU_NOTIFY_URL — 回调地址
 *
 * 参见: https://www.xunhupay.com/doc/api/pay.html
 */
export class XunhuPaymentProvider implements PaymentProvider {
  private config: XunhuConfig;

  constructor() {
    const appid = process.env.XUNHU_APPID;
    const secret = process.env.XUNHU_SECRET;
    const apiBase = process.env.XUNHU_API_BASE || 'https://api.xunhupay.com';
    const notifyUrl =
      process.env.XUNHU_NOTIFY_URL ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/callback`;

    if (!appid || !secret) {
      throw new Error(
        '虎皮椒配置缺失: XUNHU_APPID 和 XUNHU_SECRET 必须设置'
      );
    }

    this.config = { appid, secret, apiBase, notifyUrl };
  }

  /**
   * 统一下单 — Native 扫码支付
   */
  async createOrder(params: CreateOrderParams): Promise<{
    paymentUrl: string;
    orderId: string;
    extra?: Record<string, any>;
  }> {
    const { credits, amount, description } = params;

    const tradeOrderId = `XH_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const nonceStr = Math.random().toString(36).slice(2, 14);

    const reqParams: Record<string, string | number> = {
      version: '1.1',
      appid: this.config.appid,
      trade_order_id: tradeOrderId,
      total_fee: amount, // 虎皮椒单位是"元"
      title: description.slice(0, 42), // 不超过 42 汉字
      time: timestamp,
      notify_url: this.config.notifyUrl,
      nonce_str: nonceStr,
    };

    const hash = generateXunhuSign(reqParams, this.config.secret);
    reqParams.hash = hash;

    console.log('[XunhuPay] Creating order:', {
      trade_order_id: tradeOrderId,
      total_fee: amount,
    });

    const response = await fetch(
      `${this.config.apiBase}/payment/do.html`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(
          Object.fromEntries(
            Object.entries(reqParams).map(([k, v]) => [k, String(v)])
          )
        ).toString(),
      }
    );

    const result: XunhuApiResponse = await response.json();

    if (result.errcode !== 0) {
      console.error('[XunhuPay] Order creation failed:', result);
      throw new Error(
        `虎皮椒下单失败: ${result.errmsg || '未知错误'} (errcode=${result.errcode})`
      );
    }

    console.log('[XunhuPay] Order created:', {
      trade_order_id: tradeOrderId,
      openid: result.openid,
    });

    return {
      paymentUrl: result.url || result.url_qrcode || '',
      orderId: tradeOrderId,
      extra: {
        qrcode: result.url_qrcode, // PC 端二维码
        code_url: result.url, // 手机端跳转链接
        provider_order_id: result.openid, // 虎皮椒内部订单号（字段名是历史 openid）
      },
    };
  }

  /**
   * 处理支付回调 — 验证签名后返回结果
   *
   * 虎皮椒以 form-urlencoded POST 方式发送回调。
   */
  async handleCallback(rawData: any): Promise<CallbackResult> {
    console.log(
      '[XunhuPay] Callback received:',
      JSON.stringify(rawData).slice(0, 300)
    );

    // 1. 验证签名
    const receivedHash = rawData.hash || '';
    const paramsForVerification: Record<string, string> = {};

    // 只提取已知字段验证签名，排除 hash 本身
    const knownFields = [
      'trade_order_id', 'total_fee', 'transaction_id',
      'open_order_id', 'order_title', 'status', 'appid',
      'time', 'nonce_str', 'attach',
    ];

    for (const field of knownFields) {
      if (rawData[field] !== undefined && rawData[field] !== null && rawData[field] !== '') {
        paramsForVerification[field] = rawData[field];
      }
    }

    const isValid = verifyXunhuSign(
      paramsForVerification,
      this.config.secret,
      receivedHash
    );

    if (!isValid) {
      console.error('[XunhuPay] Signature verification FAILED');
      return {
        orderId: rawData.trade_order_id || 'unknown',
        tradeOrderId: rawData.transaction_id || 'unknown',
        status: 'failed',
        amount: 0,
        rawData,
      };
    }

    // 2. 校验支付状态（OD = 已支付）
    if (rawData.status !== 'OD') {
      console.error('[XunhuPay] Callback status not paid:', rawData.status);
      return {
        orderId: rawData.trade_order_id || 'unknown',
        tradeOrderId: rawData.transaction_id || 'unknown',
        status: 'failed',
        amount: 0,
        rawData,
      };
    }

    // 3. 成功
    return {
      orderId: rawData.trade_order_id, // 我们的订单号
      tradeOrderId: rawData.transaction_id || rawData.open_order_id, // 支付平台交易号
      status: 'paid',
      amount: parseFloat(rawData.total_fee || '0'),
      rawData,
    };
  }

  /**
   * 查询订单状态 — 供前端轮询
   */
  async queryOrder(orderId: string): Promise<OrderStatus> {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonceStr = Math.random().toString(36).slice(2, 14);

    const params: Record<string, string | number> = {
      appid: this.config.appid,
      trade_order_id: orderId,
      time: timestamp,
      nonce_str: nonceStr,
    };

    const hash = generateXunhuSign(params, this.config.secret);
    params.hash = hash;

    const response = await fetch(
      `${this.config.apiBase}/payment/query.html`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(
          Object.fromEntries(
            Object.entries(params).map(([k, v]) => [k, String(v)])
          )
        ).toString(),
      }
    );

    const result: XunhuApiResponse = await response.json();

    if (result.errcode !== 0) {
      return { status: 'pending', amount: 0 };
    }

    const statusMap: Record<string, OrderStatus['status']> = {
      OD: 'paid',
      CD: 'refunded',
    };

    return {
      status: statusMap[result.status || ''] || 'pending',
      amount: parseFloat(result.total_fee || '0'),
    };
  }

  /**
   * 退款 — 暂不支持自动退款
   */
  async refund(userId: string, amount: number): Promise<RefundResult> {
    throw new Error(
      '自动退款暂未实现，请前往虎皮椒商户后台手动处理退款'
    );
  }
}
