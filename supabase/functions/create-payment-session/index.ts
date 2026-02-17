import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 验证用户身份
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('未授权访问')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('用户未登录')
    }

    // 获取请求参数
    const { priceId, packageType, packageName } = await req.json()
    
    if (!priceId) {
      throw new Error('缺少价格ID')
    }

    // 初始化 Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2024-11-20.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // 获取用户信息用于会员状态查询
    const { data: userData, error: profileError } = await supabaseClient
      .from('users')
      .select('vip_status, vip_expires_at, email')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('获取用户信息失败:', profileError)
    }

    // 创建 Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/vip-purchase?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/vip-purchase?canceled=true`,
      customer_email: userData?.email || user.email,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        package_type: packageType || 'unknown',
        package_name: packageName || 'unknown',
        previous_vip_status: userData?.vip_status || 'free',
        previous_vip_expires_at: userData?.vip_expires_at || '',
      },
    })

    return new Response(
      JSON.stringify({ 
        sessionId: session.id,
        url: session.url 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('创建支付会话失败:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
