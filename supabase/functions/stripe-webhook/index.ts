import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-11-20.acacia',
  httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')
  const body = await req.text()
  
  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured')
    }

    // 验证 webhook 签名
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    )

    console.log('收到 Stripe Webhook 事件:', event.type)

    // 处理 checkout.session.completed 事件
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      console.log('Checkout Session 完成:', session.id)
      console.log('用户ID:', session.client_reference_id)
      console.log('元数据:', session.metadata)

      const userId = session.client_reference_id
      const metadata = session.metadata

      if (!userId) {
        console.error('缺少用户ID')
        return new Response('Missing user ID', { status: 400 })
      }

      // 创建 Supabase 客户端（使用 service role key）
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // 获取订阅信息
      const subscriptionId = session.subscription as string
      let subscription: Stripe.Subscription | null = null
      
      if (subscriptionId) {
        subscription = await stripe.subscriptions.retrieve(subscriptionId)
      }

      // 计算新的VIP过期时间
      const currentPeriodEnd = subscription?.current_period_end
      const newVipExpiresAt = currentPeriodEnd 
        ? new Date(currentPeriodEnd * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 默认30天

      // 获取用户当前VIP状态
      const { data: currentUser } = await supabaseAdmin
        .from('users')
        .select('vip_status, vip_expires_at')
        .eq('id', userId)
        .single()

      // 确定新的VIP等级
      const packageType = metadata?.package_type || 'monthly'
      let newVipStatus = 'monthly'
      
      if (packageType.includes('year')) {
        newVipStatus = 'yearly'
      } else if (packageType.includes('quarter')) {
        newVipStatus = 'quarterly'
      } else if (packageType.includes('month')) {
        newVipStatus = 'monthly'
      }

      // 更新用户VIP状态
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          vip_status: newVipStatus,
          vip_expires_at: newVipExpiresAt,
        })
        .eq('id', userId)

      if (updateError) {
        console.error('更新用户VIP状态失败:', updateError)
        throw updateError
      }

      console.log('✅ 用户VIP状态已更新:', {
        userId,
        newVipStatus,
        newVipExpiresAt,
      })

      // 生成自定义订单号：日期(8位) + 随机数(6位) = 14位
      const now = new Date()
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
      const randomNum = Math.floor(100000 + Math.random() * 900000) // 6位随机数
      const orderNo = `${dateStr}${randomNum}` // 14位订单号

      // 创建购买记录
      const { error: recordError } = await supabaseAdmin
        .from('purchase_records')
        .insert({
          user_id: userId,
          order_no: orderNo,
          package_name: metadata?.package_name || '未知套餐',
          package_type: packageType,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          currency: session.currency?.toUpperCase() || 'USD',
          payment_method: session.payment_method_types?.[0] || 'card',
          payment_id: session.payment_intent as string || null,
          status: 'completed',
          platform: 'web',
          previous_vip_expires_at: currentUser?.vip_expires_at || null,
          new_vip_expires_at: newVipExpiresAt,
          purchased_at: new Date().toISOString(),
        })

      if (recordError) {
        console.error('创建购买记录失败:', recordError)
        // 不抛出错误，因为主要更新已完成
      } else {
        console.log('✅ 购买记录已创建')
      }
    }

    // 处理订阅更新事件
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription
      console.log('订阅更新:', subscription.id)
      
      // 可以在这里处理订阅续费等逻辑
    }

    // 处理订阅取消事件
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      console.log('订阅取消:', subscription.id)
      
      // 可以在这里处理订阅取消逻辑
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Webhook 处理失败:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
