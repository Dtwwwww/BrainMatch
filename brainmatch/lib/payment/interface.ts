import type { CreateOrderParams, CallbackResult } from '@/lib/types';

export interface RefundResult {
  success: boolean;
  refundId: string;
  amount: number;
}

export interface OrderStatus {
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  paidAt?: string;
  amount: number;
}

/**
 * 支付 Provider 抽象接口
 */
export interface PaymentProvider {
  createOrder(
    params: CreateOrderParams
  ): Promise<{
    paymentUrl: string;
    orderId: string;
    extra?: Record<string, any>;
  }>;
  handleCallback(rawData: any): Promise<CallbackResult>;
  queryOrder(orderId: string): Promise<OrderStatus>;
  refund(userId: string, amount: number): Promise<RefundResult>;
}
