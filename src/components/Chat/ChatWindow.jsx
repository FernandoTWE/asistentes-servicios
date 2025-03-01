import { useState, useRef, useEffect } from 'react';
import { ChatBubbleLeftEllipsisIcon, PaperAirplaneIcon, QuestionMarkCircleIcon, ChatBubbleOvalLeftIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { directusAPI } from '../../lib/api/directus';

const QUICK_ACTIONS = [
  {
    icon: QuestionMarkCircleIcon,
    text: 'Mi duda no aparece en la lista'
  },
  {
    icon: ChatBubbleOvalLeftIcon,
    text: 'Prefiero hablar con un técnico'
  }
];

const TYPING_MESSAGES = [
  "Pensando...",
  "Analizando la información...",
  "Buscando la mejor respuesta...",
  "Procesando tu consulta...",
  "Recopilando datos relevantes...",
  "Preparando una respuesta detallada...",
  "Consultando la documentación...",
  "Verificando la información...",
  "Organizando la respuesta...",
  "Un momento, por favor..."
];

export function ChatWindow({ initialService }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [service, setService] = useState(initialService);
  const [isTyping, setIsTyping] = useState(false);
  const [typingMessageIndex, setTypingMessageIndex] = useState(0);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [hasAgentResponse, setHasAgentResponse] = useState(false);
  const messagesEndRef = useRef(null);
  const typingIntervalRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Establecer mensaje de bienvenida inicial
  useEffect(() => {
    const { userName } = window.getCurrentState();
    setMessages([{
      type: 'assistant',
      message: `<div class="space-y-2">
        <p>Hola, soy Zupi, tu asistente virtual 👋</p>
        <p>Bienvenid@ ${userName}, ¿con qué puedo ayudarte?</p>
      </div>`
    }]);
  }, []);

  // Escuchar cambios de servicio
  useEffect(() => {
    const handleServiceChange = async (event) => {
      const newService = event.detail;
      // Obtener el servicio completo
      const fullService = await directusAPI.getServiceById(newService.id);
      setService(fullService.data);
      setMessages([]);
      
      // Restaurar mensaje de bienvenida
      const { userName } = window.getCurrentState();
      setMessages([{
        type: 'assistant',
        message: `<div class="space-y-2">
          <p>Hola, soy Zupi, tu asistente virtual 👋</p>
          <p>Bienvenid@ ${userName}, ¿con qué puedo ayudarte?</p>
        </div>`
      }]);
    };

    document.addEventListener('serviceChange', handleServiceChange);
    return () => document.removeEventListener('serviceChange', handleServiceChange);
  }, []);

  // Efecto para la animación de typing
  useEffect(() => {
    if (isTyping) {
      // Iniciar la rotación de mensajes
      typingIntervalRef.current = setInterval(() => {
        setTypingMessageIndex(prev => (prev + 1) % TYPING_MESSAGES.length);
      }, 2000); // Cambiar mensaje cada 2 segundos
    } else {
      // Limpiar el intervalo cuando no está typing
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
      setTypingMessageIndex(0);
    }

    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, [isTyping]);

  const handleSendMessage = async (message) => {
    if (!message || loading) return;
    
    const userMessage = {
      type: 'user',
      message
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setIsTyping(true);

    try {
      const { service: currentService, language, userName } = window.getCurrentState();
      const { userId } = window.getCurrentState();
      
      if (!userId) {
        throw new Error('No hay un usuario activo');
      }

      let conversationId = currentConversationId;

      // Solo crear una nueva conversación si no existe una
      if (!conversationId) {
        const conversation = await directusAPI.fetch('/items/poc_conversations', {
          method: 'POST',
          body: JSON.stringify({})
        });
        conversationId = conversation.data.id;
        setCurrentConversationId(conversationId);
      }

      // Crear mensaje del usuario
      const userMessageResult = await directusAPI.createMessage(
        message,
        userId,
        conversationId,
        'user'
      );

      // Obtener servicio actualizado con todos sus datos
      const serviceData = await directusAPI.getServiceById(currentService?.id);
      console.log('Service Data from Directus:', JSON.stringify(serviceData, null, 2));
      
      if (!serviceData?.data) {
        throw new Error('No se pudo obtener la información del servicio');
      }

      // Obtener datos del usuario
      const userData = await directusAPI.getUserById(userId);
      console.log('User Data from Directus:', JSON.stringify(userData, null, 2));

      if (!userData?.data) {
        throw new Error('No se pudo obtener la información del usuario');
      }

      const { data: service } = serviceData;
      const { data: user } = userData;
      
      const webhookPayload = {
        query: message,
        serviceId: service.id,
        language,
        userName,
        conversationId,
        userId,
        service: {
          id: service.id,
          title: service.title,
          description: service.description,
          prompt: service.prompt,
          links: service.links,
          documents: service.documents
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        timestamp: new Date().toISOString()
      };
      
      console.log('Webhook Payload:', JSON.stringify(webhookPayload, null, 2));
      
      // Enviar a n8n para procesar
      const response = await fetch('/api/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookPayload)
      });

      if (!response.ok) {
        throw new Error('Error al procesar la consulta');
      }

      // Esperar la respuesta del agente
      try {
        const agentResponse = await directusAPI.waitForAgentResponse(
          conversationId,
          userMessageResult.message.id,
          60000 // 1 minuto
        );

        setIsTyping(false);
        setHasAgentResponse(true);
        setMessages(prev => [...prev, {
          type: 'assistant',
          message: agentResponse.content
        }]);

      } catch (error) {
        if (error.message === 'Tiempo de espera agotado') {
          setMessages(prev => [...prev, {
            type: 'assistant',
            message: 'Lo siento, no he podido obtener una respuesta en este momento. Por favor, intenta de nuevo más tarde.'
          }]);
        }
        throw error;
      }
    } catch (error) {
      console.error('Error:', error);
      setIsTyping(false);
      setMessages(prev => [...prev, {
        type: 'assistant',
        message: 'Lo siento, hubo un error al procesar tu consulta. Por favor, intenta de nuevo.'
      }]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      handleSendMessage(input.trim());
    }
  };

  const handleQuickAction = (action) => {
    if (action.text === 'Prefiero hablar con un técnico') {
      if (typeof window.openChat === 'function') {
        window.openChat();
      }
    } else {
      handleSendMessage(action.text);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-lg">
      {/* Avatar y Bienvenida */}
      <div className="p-4 bg-gray-50 rounded-t-lg">
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-primary-100 flex items-center justify-center">
            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" fill="#6366F1"/>
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-medium text-gray-900">Hola, soy Zupi, tu asistente virtual</h2>
            <p className="text-gray-600">¿Con qué puedo ayudarte?</p>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {messages.length === 1 && (
          <>
            {/* FAQs del servicio */}
            {service?.faqs && service.faqs.length > 0 && (
              <div className="space-y-2 mb-4">
                {service.faqs.map((faq, index) => (
                  <button
                    key={`${service.id}-faq-${index}`}
                    onClick={() => handleSendMessage(faq.question)}
                    className="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors flex items-center space-x-2"
                  >
                    <QuestionMarkCircleIcon className="w-5 h-5 text-primary-600 flex-shrink-0" />
                    <span className="text-gray-700">{faq.question}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Quick Actions */}
            <div className="space-y-2">
              <button
                onClick={() => handleSendMessage('Mi duda no aparece en la lista')}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center space-x-2"
              >
                <QuestionMarkCircleIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <span className="text-gray-700">Mi duda no aparece en la lista</span>
              </button>
            </div>
          </>
        )}

        {/* Mensajes */}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={clsx(
              'mb-4',
              msg.type === 'user' ? 'flex justify-end' : 'flex justify-start'
            )}
          >
            <div
              className={clsx(
                'max-w-[80%] rounded-lg p-3',
                msg.type === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-900',
                'chat-message prose prose-sm max-w-none',
                msg.type === 'user'
                  ? 'prose-invert' // Invertir colores para mensajes del usuario
                  : 'prose-gray'   // Colores normales para mensajes del asistente
              )}
            >
              <div
                className={clsx(
                  'chat-content',
                  // Estilos específicos para elementos HTML
                  '[&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mt-2 [&_ul]:mb-2',
                  '[&_ol]:list-decimal [&_ol]:pl-4 [&_mt-2] [&_mb-2]',
                  '[&_li]:mt-1',
                  '[&_p]:mt-2 [&_p]:mb-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
                  '[&_strong]:font-semibold',
                  '[&_a]:underline [&_a]:text-blue-600 hover:[&_a]:text-blue-800',
                  msg.type === 'user'
                    ? '[&_a]:text-blue-300 hover:[&_a]:text-blue-100' // Links en mensajes del usuario
                    : '[&_a]:text-blue-600 hover:[&_a]:text-blue-800'  // Links en mensajes del asistente
                )}
                dangerouslySetInnerHTML={{ __html: msg.message }}
              />
            </div>
          </div>
        ))}

        {/* Botón de hablar con técnico cuando hay respuesta */}
        {hasAgentResponse && currentConversationId && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => {
                const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:4321' : window.location.origin;
                const url = `${baseUrl}/conversation?conversationId=${currentConversationId}`;
                const message = `Ver histórico de la conversación:\n\n${url}`;
                console.log('URL formada:', url);
                console.log('Mensaje enviado a SigmaChat:', message);
                window.openChat();
                SigmaChat.showChat();
                SigmaChat.sendSilentMessage(message);
              }}
              className="bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 flex items-center space-x-2"
            >
              <ChatBubbleOvalLeftIcon className="w-5 h-5" />
              <span>Hablar con un técnico</span>
            </button>
          </div>
        )}

        {isTyping && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-100 text-gray-900 max-w-[80%] rounded-lg p-3">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
                <span 
                  className="text-sm text-gray-600 transition-opacity duration-300"
                  key={typingMessageIndex} // Para forzar la animación de fade
                >
                  {TYPING_MESSAGES[typingMessageIndex]}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Escribe aquí tu consulta"
            className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            disabled={loading}
            className={clsx(
              'p-3 rounded-lg',
              loading
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-primary-500 text-white hover:bg-primary-600'
            )}
          >
            <PaperAirplaneIcon className="w-6 h-6" />
          </button>
        </form>
      </div>
    </div>
  );
}
