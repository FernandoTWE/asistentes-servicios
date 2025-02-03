import { faqsAPI } from '../../lib/api/directus';
import { useState, useEffect } from 'react';

export function FAQList({ serviceId, onFAQClick }) {
  const [faqs, setFaqs] = useState([]);

  useEffect(() => {
    if (serviceId) {
      faqsAPI.getFAQs(serviceId).then(response => {
        if (response.data) {
          setFaqs(response.data);
        }
      });
    }
  }, [serviceId]);

  return (
    <div className="space-y-2">
      <h3 className="font-medium text-gray-900">Preguntas frecuentes</h3>
      <div className="grid gap-2">
        {faqs.map((faq, index) => (
          <button
            key={index}
            onClick={() => onFAQClick(faq.question)}
            className="text-left px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 rounded-lg transition-colors"
          >
            {faq.question}
          </button>
        ))}
      </div>
    </div>
  );
}
