export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const signature = req.headers['stripe-signature'];
  const hasWebhookSecret = Boolean(process.env.STRIPE_WEBHOOK_SECRET);

  if (hasWebhookSecret && !signature) {
    return res.status(400).json({ error: 'Missing Stripe signature header.' });
  }

  // Basic acknowledgement endpoint so Stripe can deliver webhooks without 404.
  // Add signature verification and event-specific business logic before going live.
  const eventType = req.body && req.body.type ? req.body.type : 'unknown';
  console.log('stripe_webhook_received', { eventType });

  return res.status(200).json({ received: true });
}
