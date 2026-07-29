import type { PaymentProvider, RefundResult } from './interface';
import type { CreateOrderParams, CallbackResult } from '@/lib/types';
import { XunhuPaymentProvider } from './xunhupay';

/**
 * Mock Payment Provider — 开发模式使用
 * 模拟支付成功，无需真实支付渠道
 */
class MockPaymentProvider implements PaymentProvider {
  private orders = new Map<string, any>();

  async createOrder(
    params: CreateOrderParams
  ): Promise<{ paymentUrl: string; orderId: string; extra?: Record<string, any> }> {
    const orderId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.orders.set(orderId, {
      ...params,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    // 模拟支付页面
    const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/callback?mock_order_id=${orderId}&mock_action=pay`;

    console.log(`[MockPayment] Order created: ${orderId}, amount: ¥${params.amount}`);
    return { paymentUrl, orderId };
  }

  async handleCallback(rawData: any): Promise<CallbackResult> {
    const orderId = rawData?.mock_order_id || rawData?.orderId;
    const order = this.orders.get(orderId);

    if (!order) {
      return {
        orderId: orderId || 'unknown',
        tradeOrderId: `mock_trade_${orderId}`,
        status: 'failed',
        amount: 0,
        rawData,
      };
    }

    order.status = 'paid';
    this.orders.set(orderId, order);

    return {
      orderId,
      tradeOrderId: `mock_trade_${orderId}`,
      status: 'paid',
      amount: order.amount,
      rawData,
    };
  }

  async queryOrder(orderId: string): Promise<{ status: 'paid' | 'pending' | 'failed' | 'refunded'; paidAt?: string; amount: number }> {
    const order = this.orders.get(orderId);
    return {
      status: order?.status || 'pending',
      paidAt: order?.status === 'paid' ? new Date().toISOString() : undefined,
      amount: order?.amount || 0,
    };
  }

  async refund(userId: string, amount: number): Promise<RefundResult> {
    const refundId = `mock_refund_${Date.now()}`;
    console.log(`[MockPayment] Refund: user=${userId}, amount=¥${amount}, refundId=${refundId}`);
    return { success: true, refundId, amount };
  }
}

// =============================================
// Provider 工厂函数
// =============================================

export function getPaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER || 'mock';

  switch (provider) {
    case 'mock':
      return new MockPaymentProvider();
    case 'hupijiao':
      // TODO: 实现虎皮椒支付
      throw new Error('HupiPay not yet implemented');
    case 'payjs':
      // PayJS 已停服，自动降级为虎皮椒
      console.warn('[Payment] PayJS is discontinued, falling back to Xunhupay');
    case 'xunhupay':
      return new XunhuPaymentProvider();
    case 'alipay_ai':
      // TODO: 实现支付宝 AI 收
      throw new Error('Alipay AI not yet implemented');
    default:
      console.warn(`Unknown payment provider: ${provider}, falling back to mock`);
      return new MockPaymentProvider();
  }
}
