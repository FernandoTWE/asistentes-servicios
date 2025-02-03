const DIRECTUS_URL = import.meta.env.PUBLIC_DIRECTUS_URL;
const DIRECTUS_TOKEN = import.meta.env.PUBLIC_DIRECTUS_TOKEN;

/**
 * Cliente base para Directus
 */
class DirectusClient {
  constructor() {
    this.baseUrl = DIRECTUS_URL;
    this.token = DIRECTUS_TOKEN;
  }

  async fetch(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        throw new Error(`Directus API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Directus fetch error:', error);
      throw error;
    }
  }
}

/**
 * Cliente específico para servicios
 */
class ServicesAPI extends DirectusClient {
  async getServices() {
    return this.fetch('/items/poc_service?fields=*');
  }

  async getServiceById(id) {
    return this.fetch(`/items/poc_service/${id}?fields=*,poc_docus.*`);
  }
}

/**
 * Cliente específico para FAQs
 */
class FAQsAPI extends DirectusClient {
  async getFAQs(serviceId) {
    return this.fetch(`/items/poc_service/${serviceId}?fields=faqs.*`);
  }
}

export const servicesAPI = new ServicesAPI();
export const faqsAPI = new FAQsAPI();
