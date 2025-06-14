# Backend - Venados Bakery & Coffee

## 🚀 API Backend para Sistema de Reservas

Backend desarrollado en Node.js/Express para manejar reservas de tortas y procesamiento de pagos con MercadoPago.

## 📦 Tecnologías

- **Node.js** + **Express**
- **MercadoPago SDK**
- **Firebase Admin SDK**
- **CORS** para comunicación con frontend

## 🛠️ Instalación

```bash
npm install
```

## 🔧 Variables de Entorno

Crear archivo `.env` con las siguientes variables:

```env
# MercadoPago Credentials - PRODUCTION
MP_ACCESS_TOKEN=your-mercadopago-access-token
MP_PUBLIC_KEY=your-mercadopago-public-key

# URLs de la aplicación
FRONTEND_URL=https://pedidosvenados.cl
SUCCESS_URL=https://pedidosvenados.cl/payment/success
PENDING_URL=https://pedidosvenados.cl/payment/pending
FAILURE_URL=https://pedidosvenados.cl/payment/failure

# Configuración del servidor
PORT=3000
NODE_ENV=production

# Firebase Admin Configuration
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=reservas-venados
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-private-key-here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@reservas-venados.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40reservas-venados.iam.gserviceaccount.com
```

## 🚀 Ejecución

### Desarrollo
```bash
npm start
```

### Producción (Vercel)
Se despliega automáticamente en Vercel

## 📋 API Endpoints

### Salud del servidor
- `GET /health` - Estado del servidor

### MercadoPago
- `POST /api/mercadopago/create-preference` - Crear preferencia de pago
- `POST /api/webhooks/mercadopago` - Webhook para notificaciones
- `GET /api/mercadopago/payment/:paymentId` - Verificar estado de pago
- `POST /api/mercadopago/verify-payment` - Verificación manual de pago

## 🔒 Seguridad

- Variables de entorno para credenciales sensibles
- CORS configurado para dominio específico
- Validación de webhooks de MercadoPago
- Autenticación Firebase Admin

## 🌐 Deploy en Vercel

1. Conectar repositorio a Vercel
2. Configurar variables de entorno en dashboard de Vercel
3. Deploy automático desde main branch

## 📞 Soporte

Sistema desarrollado para Venados Bakery & Coffee
Integración con MercadoPago y Firebase Firestore
#
