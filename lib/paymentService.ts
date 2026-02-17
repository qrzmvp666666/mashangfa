import { supabase } from './supabase';

// 创建支付订单
export const createPaymentOrder = async ({
  amount,
  productId,
  userPhone,
}: {
  amount: number; // 单位：分
  productId: string;
  userPhone: string;
}) => {
  try {
    // 调用后端API创建订单
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/payment/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        productId,
        userPhone,
      }),
    });

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// 查询支付结果
export const queryPaymentResult = async (orderId: string) => {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/payment/query/${orderId}`);
    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// 支付成功后自动登录
export const autoLoginAfterPayment = async ({
  tempToken,
}: {
  tempToken: string;
}) => {
  try {
    // 使用临时token换取session
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/exchange-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tempToken }),
    });

    const { session } = await response.json();

    // 设置session到supabase
    if (session) {
      await supabase.auth.setSession(session);
      return { success: true, error: null };
    }

    return { success: false, error: new Error('Invalid session') };
  } catch (error) {
    return { success: false, error };
  }
};
