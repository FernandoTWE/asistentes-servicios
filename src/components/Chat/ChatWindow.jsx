import { useState, useRef, useEffect } from 'react';
import { ChatBubbleLeftEllipsisIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export function ChatWindow({ service, onSendMessage, messages = [], loading }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">{service.title}</h2>
        <p className="text-sm text-gray-500">{service.description}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={clsx(
              'flex items-start space-x-2',
              msg.type === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {msg.type === 'assistant' && (
              <ChatBubbleLeftEllipsisIcon className="w-6 h-6 text-gray-400" />
            )}
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
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Escribe tu mensaje..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            disabled={loading}
            className={clsx(
              'p-2 rounded-lg',
              loading
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            )}
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
