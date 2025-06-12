const express = require('express');
const cors = require('cors');
const mercadopago = require('mercadopago');
const crypto = require('crypto');
const { db } = require('./firebaseAdmin');
const emailService = require('./emailService');
require('dotenv').config();

// Configurar Mercado Pago
mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN,
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5173',
    'https://pedidosvenados.cl'
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para logs
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Backend Venados funcionando correctamente'
  });
});

// Crear preferencia de pago
app.post('/api/mercadopago/create-preference', async (req, res) => {
  try {
    const { items, payer, external_reference, metadata } = req.body;

    console.log('Creando preferencia para:', external_reference);

    const preference = {
      items: items.map(item => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        picture_url: item.picture_url,
        category_id: item.category_id || 'food'
      })),      payer: {
        name: payer.name,
        email: payer.email,
        phone: {
          number: parseInt(payer.phone.number) || parseInt(payer.phone) || 0
        }
      },
      back_urls: {
        success: process.env.SUCCESS_URL,
        pending: process.env.PENDING_URL,
        failure: process.env.FAILURE_URL
      },
      auto_return: 'approved',
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 12
      },      notification_url: `https://pedidos-reservas.vercel.app/api/webhooks/mercadopago`,
      external_reference: external_reference,
      metadata: metadata || {}
    };

    const response = await mercadopago.preferences.create(preference);
    
    console.log('Preferencia creada:', response.body.id);

    res.json({
      id: response.body.id,
      init_point: response.body.init_point,
      sandbox_init_point: response.body.sandbox_init_point
    });

  } catch (error) {
    console.error('Error al crear preferencia:', error);
    res.status(500).json({ 
      error: 'Error al crear preferencia de pago',
      details: error.message 
    });
  }
});

// Webhook de Mercado Pago
app.post('/api/webhooks/mercadopago', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    console.log('Webhook recibido:', { type, data });

    // Validar que es una notificación de pago
    if (type === 'payment') {
      const paymentId = data.id;
      
      // Obtener información del pago
      const payment = await mercadopago.payment.findById(paymentId);
      
      console.log('Información del pago:', {
        id: payment.body.id,
        status: payment.body.status,
        external_reference: payment.body.external_reference
      });

      // Aquí deberías actualizar tu base de datos
      await updateReservationStatus(payment.body);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error en webhook:', error);
    res.status(500).send('Error');
  }
});

// Verificar estado de pago
app.get('/api/mercadopago/payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await mercadopago.payment.findById(paymentId);
    
    res.json({
      id: payment.body.id,
      status: payment.body.status,
      status_detail: payment.body.status_detail,
      external_reference: payment.body.external_reference,
      transaction_amount: payment.body.transaction_amount,
      date_created: payment.body.date_created
    });

  } catch (error) {
    console.error('Error al verificar pago:', error);
    res.status(500).json({ 
      error: 'Error al verificar estado del pago',
      details: error.message 
    });
  }
});

// Función para actualizar estado de reserva
async function updateReservationStatus(paymentData) {
  try {
    const { status, external_reference, id: paymentId, transaction_amount } = paymentData;
    
    console.log(`Webhook recibido para reserva ${external_reference} con estado: ${status}`);
    console.log('Datos del pago:', {
      paymentId,
      status,
      amount: transaction_amount,
      external_reference
    });
    
    if (!db) {
      console.warn('Firebase Admin no configurado. No se puede verificar la base de datos.');
      return;
    }
    
    const reservationStatus = mapPaymentStatusToReservation(status);
    console.log('Estado de pago mapeado:', reservationStatus);
    
    // Solo procesar si el pago fue exitoso
    if (reservationStatus === 'success') {
      console.log(`✅ Pago exitoso confirmado para reserva ${external_reference}`);
      // La reserva ya debe haber sido creada por el frontend
      // Aquí podríamos hacer validaciones adicionales si es necesario
    } else {
      console.log(`⚠️ Pago no exitoso para reserva ${external_reference}: ${status}`);
    }
      } catch (error) {
    console.error('Error al procesar webhook de pago:', error);
  }
}

// Nueva ruta para verificar y actualizar pago manualmente
app.post('/api/mercadopago/verify-payment', async (req, res) => {
  try {
    const { paymentId, reservationId } = req.body;
    
    if (!paymentId || !reservationId) {
      return res.status(400).json({ 
        error: 'Se requieren paymentId y reservationId' 
      });
    }
    
    // Obtener información del pago desde MercadoPago
    const payment = await mercadopago.payment.findById(paymentId);
    
    // Verificar que el pago corresponde a la reserva
    if (payment.body.external_reference !== reservationId) {
      return res.status(400).json({ 
        error: 'El pago no corresponde a la reserva especificada' 
      });
    }
    
    // Actualizar la reserva
    await updateReservationStatus(payment.body);
    
    res.json({
      success: true,
      payment: {
        id: payment.body.id,
        status: payment.body.status,
        amount: payment.body.transaction_amount,
        external_reference: payment.body.external_reference
      }
    });
    
  } catch (error) {
    console.error('Error al verificar pago:', error);
    res.status(500).json({ 
      error: 'Error al verificar pago',
      details: error.message 
    });
  }
});

// Mapear estados de MP a estados de reserva
function mapPaymentStatusToReservation(mpStatus) {
  const statusMap = {
    'approved': 'success',
    'pending': 'pending',
    'in_process': 'pending',
    'rejected': 'failure',
    'cancelled': 'failure',
    'refunded': 'refunded',
    'charged_back': 'charged_back'
  };
  
  return statusMap[mpStatus] || 'unknown';
}

// Función para calcular fecha de expiración FROM (formato MercadoPago)
function getExpirationDateFrom() {
  const now = new Date();
  return now.toISOString().replace('Z', '-03:00'); // Formato requerido por MP
}

// Función para calcular fecha de expiración TO (formato MercadoPago)
function getExpirationDateTo() {
  const now = new Date();
  now.setHours(now.getHours() + 24); // Expira en 24 horas
  return now.toISOString().replace('Z', '-03:00'); // Formato requerido por MP
}

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: err.message 
  });
});

// Manejar rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.originalUrl 
  });
});

// Endpoint para enviar email de confirmación
app.post('/api/email/send-confirmation', async (req, res) => {
  try {
    const reservationData = req.body;
    
    console.log('📧 Enviando email de confirmación para reserva:', reservationData.numeroReserva);
    
    const result = await emailService.sendReservationConfirmation(reservationData);
    
    res.json({
      success: true,
      message: 'Email enviado exitosamente',
      messageId: result.messageId
    });
    
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    res.status(500).json({
      success: false,
      error: 'Error enviando email',
      details: error.message
    });
  }
});

// Endpoint para enviar email de pago pendiente
app.post('/api/email/send-pending', async (req, res) => {
  try {
    const reservationData = req.body;
    
    console.log('📧 Enviando email de pago pendiente para reserva:', reservationData.numeroReserva);
    
    const result = await emailService.sendPaymentPendingNotification(reservationData);
    
    res.json({
      success: true,
      message: 'Email pendiente enviado exitosamente',
      messageId: result.messageId
    });
    
  } catch (error) {
    console.error('❌ Error enviando email pendiente:', error);
    res.status(500).json({
      success: false,
      error: 'Error enviando email pendiente',
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend ejecutándose en puerto ${PORT}`);
  console.log(`🌍 Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`💳 Mercado Pago configurado`);
});
