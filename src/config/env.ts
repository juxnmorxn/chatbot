import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Turso
  turso: {
    url: process.env.TURSO_DATABASE_URL || '',
    authToken: process.env.TURSO_AUTH_TOKEN || '',
  },

  // Groq
  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
  },

  // Evolution API
  evolution: {
    url: (process.env.EVOLUTION_URL || 'http://localhost:8080').replace(/\/+$/, ''),
    apiKey: process.env.EVOLUTION_API_KEY || '',
    instanceName: process.env.INSTANCE_NAME || 'isp-soporte',
  },

  // WispHub
  wisphub: {
    url: (process.env.WISPHUB_API_URL || 'https://api.wisphub.net/api').replace(/\/+$/, ''),
    apiKey: process.env.WISPHUB_API_KEY || '',
  },

  // SmartOLT
  smartolt: {
    url: (process.env.SMARTOLT_API_URL || 'https://tu-dominio.smartolt.com/api').replace(/\/+$/, ''),
    apiKey: process.env.SMARTOLT_API_KEY || '',
  },

  // Business info
  isp: {
    name: process.env.ISP_NAME || 'JedNet Telecom',
    soporteHumanoPhone: process.env.SOPORTE_HUMANO_PHONE || '',
  },
};
