# ZUPI - Webhook API

## Descripción
API simplificada para procesar consultas de usuarios mediante webhooks y n8n.

## Arquitectura
1. **Webhook de Entrada (`POST /api/webhook`)**
   - Recibe consultas de usuarios
   - Valida la estructura de datos
   - Reenvía a n8n para procesamiento

2. **Webhook de Respuesta (`PUT /api/webhook`)**
   - Recibe respuestas procesadas de n8n
   - Valida la estructura de datos
   - Confirma la recepción

## Estructura de Datos

### Consulta (POST)
```json
{
  "query": "pregunta del usuario",
  "service": {
    "id": "service-id",
    "title": "nombre del servicio",
    "description": "descripción del servicio"
  },
  "language": "es"
}
```

### Respuesta (PUT)
```json
{
  "conversationId": "id-conversación",
  "response": {
    "type": "answer|clarification",
    "message": "respuesta al usuario",
    "suggestions": ["sugerencia1", "sugerencia2"]
  }
}
```

## Configuración
1. Copia `.env.example` a `.env`
2. Configura las variables de entorno:
   - `N8N_WEBHOOK_URL`: URL del webhook de n8n
   - `N8N_AUTH_TOKEN`: Token de autenticación (opcional)

## Desarrollo
```bash
# Instalar dependencias
npm install

# Iniciar en desarrollo
npm run dev

# Construir para producción
npm run build
