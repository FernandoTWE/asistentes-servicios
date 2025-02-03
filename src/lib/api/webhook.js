const N8N_WEBHOOK_URL = import.meta.env.N8N_WEBHOOK_URL;
const N8N_AUTH_TOKEN = import.meta.env.N8N_AUTH_TOKEN;

/**
 * Cliente para webhooks de n8n
 */
class WebhookClient {
  async sendQuery(data) {
    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(N8N_AUTH_TOKEN && { 'Authorization': `Bearer ${N8N_AUTH_TOKEN}` })
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`n8n webhook error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Webhook error:', error);
      throw error;
    }
  }
}

export const webhookClient = new WebhookClient();
