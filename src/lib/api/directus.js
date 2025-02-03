const { PUBLIC_DIRECTUS_URL, PUBLIC_DIRECTUS_TOKEN } = import.meta.env;

/**
 * Cliente base para Directus
 */
class DirectusAPI {
  constructor(url, token) {
    this.url = url;
    this.token = token;
  }

  async fetch(endpoint, options = {}) {
    const response = await fetch(`${this.url}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Error en la petición: ${response.statusText}`);
    }

    return response.json();
  }

  async getServices() {
    try {
      const response = await this.fetch('/items/poc_service?fields=*,faqs.*');
      return response;
    } catch (error) {
      console.error('Error al obtener servicios:', error);
      return { data: [] };
    }
  }

  async getServiceById(id) {
    try {
      const response = await this.fetch(`/items/poc_service/${id}?fields=*,faqs.*`);
      return response;
    } catch (error) {
      console.error('Error al obtener servicio:', error);
      return null;
    }
  }

  async getUsers() {
    try {
      const response = await this.fetch('/items/users?filter[status]=active&fields=*,poc_message.*');
      return response;
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      return { data: [] };
    }
  }

  async createMessage(content, userId, conversationId = null, userType = 'user') {
    try {
      // Si no hay conversationId, crear una nueva conversación
      if (!conversationId) {
        const conversation = await this.fetch('/items/poc_conversations', {
          method: 'POST',
          body: JSON.stringify({}),
        });
        conversationId = conversation.data.id;
      }

      // Crear el mensaje
      const message = await this.fetch('/items/poc_message', {
        method: 'POST',
        body: JSON.stringify({
          content,
          user_id: userId,
          conversation_id: conversationId,
          user_type: userType,
          timestamp: new Date().toISOString(),
        }),
      });

      return {
        message: message.data,
        conversationId,
      };
    } catch (error) {
      console.error('Error al crear mensaje:', error);
      throw error;
    }
  }

  async getConversationMessages(conversationId) {
    try {
      const response = await this.fetch(
        `/items/poc_message?filter[conversation_id][_eq]=${conversationId}&sort=timestamp`
      );
      return response.data;
    } catch (error) {
      console.error('Error al obtener mensajes:', error);
      return [];
    }
  }

  // Esperar respuesta del agente con timeout
  async waitForAgentResponse(conversationId, lastMessageId, maxWaitTime = 60000) {
    const pollInterval = 5000; // 5 segundos
    const startTime = Date.now();
    
    const checkForResponse = async () => {
      try {
        const messages = await this.getConversationMessages(conversationId);
        const latestMessage = messages[messages.length - 1];

        // Si hay un nuevo mensaje del agente
        if (latestMessage && latestMessage.id !== lastMessageId && latestMessage.user_type === 'agent') {
          return latestMessage;
        }

        // Verificar si excedimos el tiempo máximo de espera
        if (Date.now() - startTime >= maxWaitTime) {
          throw new Error('Tiempo de espera agotado');
        }

        // Esperar antes del siguiente intento
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        return await checkForResponse();
      } catch (error) {
        console.error('Error al esperar respuesta:', error);
        throw error;
      }
    };

    return checkForResponse();
  }

  // Suscribirse a nuevos mensajes de una conversación
  async subscribeToMessages(conversationId, onMessage, onError) {
    const pollInterval = 5000; // 5 segundos
    let lastMessageId = null;

    const checkNewMessages = async () => {
      try {
        const messages = await this.getConversationMessages(conversationId);
        const latestMessage = messages[messages.length - 1];

        if (latestMessage && latestMessage.id !== lastMessageId) {
          lastMessageId = latestMessage.id;
          onMessage(latestMessage);
        }
      } catch (error) {
        console.error('Error al verificar mensajes:', error);
        onError?.(error);
      }
    };

    // Hacer el primer check inmediatamente
    await checkNewMessages();

    // Configurar el polling
    const intervalId = setInterval(checkNewMessages, pollInterval);

    // Retornar función para detener la suscripción
    return () => clearInterval(intervalId);
  }
}

// Crear instancia de la API
const directusAPI = new DirectusAPI(
  import.meta.env.PUBLIC_DIRECTUS_URL,
  import.meta.env.PUBLIC_DIRECTUS_TOKEN
);

export { directusAPI };
