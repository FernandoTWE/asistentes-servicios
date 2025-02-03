import { webhookClient } from '../../lib/api/webhook';
import { servicesAPI } from '../../lib/api/directus';

export const prerender = false;

// Webhook para recibir consultas
export async function POST({ request }) {
  try {
    const data = await request.json();
    
    // Validar datos requeridos
    if (!data.query || !data.serviceId || !data.language) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: query, serviceId, language'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Obtener información del servicio
    const service = await servicesAPI.getServiceById(data.serviceId);
    
    // Enviar a n8n
    const response = await webhookClient.sendQuery({
      query: data.query,
      service,
      language: data.language
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Webhook para recibir respuestas
export async function PUT({ request }) {
  try {
    const data = await request.json();
    
    if (!data.response || !data.conversationId) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: response, conversationId'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Response processed successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Response webhook error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
