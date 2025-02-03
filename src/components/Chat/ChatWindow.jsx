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

export function ChatWindow({ initialService }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [service, setService] = useState(initialService);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const unsubscribeRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cargar historial inicial y establecer mensaje de bienvenida
  useEffect(() => {
    const loadInitialState = async () => {
      const { userName } = window.getCurrentState();
      
      // Mensaje de bienvenida
      const welcomeMessage = {
        type: 'assistant',
        message: `<div class="space-y-2">
          <p>Hola, soy Zupi, tu asistente virtual 👋</p>
          <p>Bienvenid@ ${userName}, ¿con qué puedo ayudarte?</p>
        </div>`
      };

      setMessages([welcomeMessage]);

      // Si hay un conversationId guardado, cargar mensajes
      const savedConversationId = localStorage.getItem('currentConversationId');
      if (savedConversationId) {
        try {
          const messages = await directusAPI.getConversationMessages(savedConversationId);
          if (messages.length > 0) {
            setConversationId(savedConversationId);
            const formattedMessages = messages.map(msg => ({
              type: msg.user_type === 'user' ? 'user' : 'assistant',
              message: msg.content
            }));
            setMessages(prev => [...prev, ...formattedMessages]);
          }
        } catch (error) {
          console.error('Error al cargar historial:', error);
        }
      }
    };

    loadInitialState();
  }, []);

  // Escuchar cambios de servicio
  useEffect(() => {
    const handleServiceChange = async (event) => {
      const newService = event.detail;
      setService(newService);
      
      // Limpiar conversación actual
      setMessages([]);
      setConversationId(null);
      localStorage.removeItem('currentConversationId');
      
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

  // Suscribirse a nuevos mensajes cuando hay una conversación activa
  useEffect(() => {
    if (conversationId) {
      // Guardar conversationId actual
      localStorage.setItem('currentConversationId', conversationId);

      // Limpiar suscripción anterior
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }

      // Suscribirse a nuevos mensajes
      unsubscribeRef.current = directusAPI.subscribeToMessages(
        conversationId,
        (newMessage) => {
          if (newMessage.user_type === 'agent') {
            setIsTyping(false);
            setMessages(prev => [...prev, {
              type: 'assistant',
              message: newMessage.content
            }]);
          }
        },
        (error) => {
          console.error('Error en la suscripción:', error);
          setIsTyping(false);
        }
      );
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [conversationId]);

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

      // Enviar mensaje a n8n y crear en Directus
      const response = await fetch('/api/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: message,
          serviceId: currentService?.id,
          language,
          userName,
          conversationId: conversationId,
          userId,
          service: {
            id: currentService?.id,
            title: currentService?.title,
            description: currentService?.description
          }
        })
      });

      if (!response.ok) {
        throw new Error('Error al procesar la consulta');
      }

      // Si no hay conversationId, esperar a que n8n cree uno
      if (!conversationId) {
        const data = await response.json();
        if (data.conversationId) {
          setConversationId(data.conversationId);
        }
      }

      // Esperar la respuesta del agente
      try {
        const agentResponse = await directusAPI.waitForAgentResponse(
          conversationId,
          null,
          60000 // 1 minuto
        );

        setIsTyping(false);
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
      window.open('https://soporte.fractalia.es', '_blank');
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
              {QUICK_ACTIONS.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center space-x-2"
                >
                  <action.icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700">{action.text}</span>
                </button>
              ))}
            </div>
          </>
        )}

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
                  : 'bg-gray-100 text-gray-900'
              )}
              dangerouslySetInnerHTML={{ __html: msg.message }}
            />
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-100 text-gray-900 max-w-[80%] rounded-lg p-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
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
