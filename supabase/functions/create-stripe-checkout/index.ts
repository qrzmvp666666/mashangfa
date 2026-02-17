import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 创建 Supabase 客户端
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // 获取当前用户
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('用户未登录')
    }

    // 获取请求参数
    const { priceId, packageType, packageName, platform } = await req.json()
    
    if (platform !== 'web') {
      throw new Error('Stripe支付仅支持Web端')
    }
    
    if (!priceId) {
      throw new Error('缺少价格ID')
    }

    // 初始化 Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2024-11-20.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // 获取用户信息
    const { data: userData } = await supabaseClient
      .from('users')
      .select('stripe_customer_id, vip_status, vip_expires_at, email')
      .eq('id', user.id)
      .single()

    let customerId = userData?.stripe_customer_id

    // Helper function to create customer and update DB
    const createNewCustomer = async () => {
      console.log('创建新的 Stripe Customer...')
      const customer = await stripe.customers.create({
        email: userData?.email || user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      
      const newCustomerId = customer.id
      console.log('✅ Stripe Customer 创建成功:', newCustomerId)

      // 保存 Stripe Customer ID 到数据库
      await supabaseClient
        .from('users')
        .update({ stripe_customer_id: newCustomerId })
        .eq('id', user.id)
      
      console.log('✅ stripe_customer_id 已保存到数据库')
      return newCustomerId
    }

    // 如果用户没有 Stripe Customer ID，创建一个
    if (!customerId) {
      customerId = await createNewCustomer()
    } else {
      // 检查 Customer 是否在 Stripe 中真实存在
      try {
        const customer = await stripe.customers.retrieve(customerId)
        if (customer.deleted) {
           console.log('Stripe Customer 已删除，重新创建...')
           customerId = await createNewCustomer()
        } else {
           console.log('使用已存在的 Stripe Customer:', customerId)
        }
      } catch (error) {
        console.log('获取 Stripe Customer 失败 (可能不存在)，重新创建...', error)
        customerId = await createNewCustomer()
      }
    }

    // 创建 Stripe Checkout Session（订阅模式只支持信用卡）
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
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
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        package_type: packageType || 'unknown',
        package_name: packageName || 'unknown',
        previous_vip_status: userData?.vip_status || 'free',
        previous_vip_expires_at: userData?.vip_expires_at || '',
        platform: 'web',
      },
    })

    console.log('✅ Checkout Session 创建成功:', session.id)

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
    console.error('错误:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
