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

    // Generar ID de conversación si no existe
    const conversationId = data.conversationId || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Preparar payload para n8n
    const n8nPayload = {
      conversationId,
      query: data.query,
      language: data.language,
      service: {
        id: data.service.id,
        title: data.service.title,
        description: data.service.description,
        prompt: data.service.prompt,
        links: data.service.links,
        documents: data.service.documents
      },
      user: {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email
      },
      timestamp: new Date().toISOString()
    };

    // Enviar a n8n
    const response = await webhookClient.sendQuery(n8nPayload);

    return new Response(JSON.stringify({
      ...response,
      conversationId
    }), {
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

    // Aquí podrías implementar lógica para almacenar la conversación
    // Por ejemplo, guardarla en Directus o en otra base de datos

    return new Response(JSON.stringify({
      success: true,
      message: 'Response processed successfully',
      conversationId: data.conversationId
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
