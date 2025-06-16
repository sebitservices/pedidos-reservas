const express = require('express');
const cors = require('cors');
const mercadopago = require('mercadopago');
const crypto = require('crypto');
// const { db } = require('./firebaseAdmin'); // Temporalmente comentado para debugging
const emailService = require('./emailService'); // Rehabilitando emailService
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
    'https://pedidosvenados.cl',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para logs
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend Venados Bakery API',
    version: '1.0.4',
    timestamp: new Date().toISOString()
  });
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
    
    

    res.json({
      id: response.body.id,
      init_point: response.body.init_point,
      sandbox_init_point: response.body.sandbox_init_point
    });

  } catch (error) {
    
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
    
    

    // Validar que es una notificación de pago
    if (type === 'payment') {
      const paymentId = data.id;
      
      // Obtener información del pago
      const payment = await mercadopago.payment.findById(paymentId);
      
      console.log('Información del pago:', {
        id: payment.body.id,
        status: payment.body.status,
        external_reference: payment.body.external_reference
      });      // Aquí deberías actualizar tu base de datos
      // await updateReservationStatus(payment.body); // Temporalmente comentado
    }

    res.status(200).send('OK');
  } catch (error) {
    
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
    
    res.status(500).json({ 
      error: 'Error al verificar estado del pago',
      details: error.message 
    });
  }
});

// Función para actualizar estado de reserva - TEMPORALMENTE COMENTADA
/*
async function updateReservationStatus(paymentData) {
  // ... código comentado para debugging
}
*/

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
    // await updateReservationStatus(payment.body); // Temporalmente comentado
    
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
  console.error('Error:', err.message);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: err.message 
  });
});

// Endpoint para enviar email de confirmación
app.post('/api/email/send-confirmation', async (req, res) => {
  try {
    const reservationData = req.body;
    const result = await emailService.sendReservationConfirmation(reservationData);
    
    res.json({
      success: true,
      message: 'Email enviado exitosamente',
      messageId: result.messageId
    });
    
  } catch (error) {
    console.error('Error enviando email:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Error enviando email',
      details: error.message,
      code: error.code || 'UNKNOWN'
    });
  }
});

// Endpoint para enviar email de pago pendiente  
app.post('/api/email/send-pending', async (req, res) => {
  try {
    const reservationData = req.body;
    const result = await emailService.sendPaymentPendingNotification(reservationData);
    
    res.json({
      success: true,
      message: 'Email pendiente enviado exitosamente',
      messageId: result.messageId
    });
    
  } catch (error) {
    console.error('Error enviando email pendiente:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Error enviando email pendiente',
      details: error.message
    });
  }
});

// ======================== RUTAS DE CONTACTO ========================

// Ruta para enviar mensaje de contacto general
app.post('/api/contact/message', async (req, res) => {
  try {
    const { nombre, email, telefono, mensaje, fechaEnvio } = req.body;

    // Validar campos requeridos
    if (!nombre || !email || !mensaje) {
      return res.status(400).json({
        error: 'Los campos nombre, email y mensaje son requeridos'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'El formato del email no es válido'
      });
    }

    // Preparar datos para el email
    const contactData = {
      nombre,
      email,
      telefono: telefono || 'No proporcionado',
      mensaje,
      fechaEnvio: fechaEnvio || new Date().toISOString(),
      tipo: 'contacto'
    };

    // Enviar email
    await emailService.sendContactMessage(contactData);

    res.json({
      success: true,
      message: 'Mensaje de contacto enviado correctamente'
    });

  } catch (error) {
    console.error('Error al enviar mensaje de contacto:', error);
    res.status(500).json({
      error: 'Error interno del servidor al enviar el mensaje',
      details: error.message
    });
  }
});

// Ruta para enviar solicitud de cotización
app.post('/api/contact/quote', async (req, res) => {
  try {
    const {
      nombre,
      email,
      telefono,
      fechaEvento,
      tipoProducto,
      numeroPersonas,
      sabor,
      presupuesto,
      mensaje,
      fechaEnvio
    } = req.body;

    // Validar campos requeridos para cotización
    if (!nombre || !email || !fechaEvento || !tipoProducto || !numeroPersonas || !mensaje) {
      return res.status(400).json({
        error: 'Todos los campos marcados con * son requeridos para la cotización'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'El formato del email no es válido'
      });
    }

    // Validar fecha del evento (debe ser futura)
    const fechaEventoDate = new Date(fechaEvento);
    const hoy = new Date();
    if (fechaEventoDate <= hoy) {
      return res.status(400).json({
        error: 'La fecha del evento debe ser posterior a hoy'
      });
    }

    // Validar número de personas
    if (numeroPersonas < 1 || numeroPersonas > 1000) {
      return res.status(400).json({
        error: 'El número de personas debe estar entre 1 y 1000'
      });
    }

    // Preparar datos para el email
    const quoteData = {
      nombre,
      email,
      telefono: telefono || 'No proporcionado',
      fechaEvento,
      tipoProducto,
      numeroPersonas,
      sabor: sabor || 'No especificado',
      presupuesto: presupuesto || 'No especificado',
      mensaje,
      fechaEnvio: fechaEnvio || new Date().toISOString(),
      tipo: 'cotizacion'
    };

    // Enviar email
    await emailService.sendQuoteRequest(quoteData);

    res.json({
      success: true,
      message: 'Solicitud de cotización enviada correctamente'
    });

  } catch (error) {
    console.error('Error al enviar solicitud de cotización:', error);
    res.status(500).json({
      error: 'Error interno del servidor al enviar la cotización',
      details: error.message
    });
  }
});

// Ruta unificada para manejar ambos tipos de formulario
app.post('/api/contact/submit', async (req, res) => {
  try {
    const { tipo } = req.body;

    if (tipo === 'contacto') {
      // Procesar como mensaje de contacto
      const { nombre, email, telefono, mensaje, fechaEnvio } = req.body;

      if (!nombre || !email || !mensaje) {
        return res.status(400).json({
          error: 'Los campos nombre, email y mensaje son requeridos'
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'El formato del email no es válido'
        });
      }

      const contactData = {
        nombre, email, telefono: telefono || 'No proporcionado', mensaje,
        fechaEnvio: fechaEnvio || new Date().toISOString(), tipo: 'contacto'
      };

      await emailService.sendContactMessage(contactData);
      return res.json({ success: true, message: 'Mensaje de contacto enviado correctamente' });

    } else if (tipo === 'cotizacion') {
      // Procesar como cotización
      const { nombre, email, telefono, fechaEvento, tipoProducto, numeroPersonas, sabor, presupuesto, mensaje, fechaEnvio } = req.body;

      if (!nombre || !email || !fechaEvento || !tipoProducto || !numeroPersonas || !mensaje) {
        return res.status(400).json({
          error: 'Todos los campos marcados con * son requeridos para la cotización'
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'El formato del email no es válido'
        });
      }

      const fechaEventoDate = new Date(fechaEvento);
      const hoy = new Date();
      if (fechaEventoDate <= hoy) {
        return res.status(400).json({
          error: 'La fecha del evento debe ser posterior a hoy'
        });
      }

      if (numeroPersonas < 1 || numeroPersonas > 1000) {
        return res.status(400).json({
          error: 'El número de personas debe estar entre 1 y 1000'
        });
      }

      const quoteData = {
        nombre, email, telefono: telefono || 'No proporcionado', fechaEvento, tipoProducto, numeroPersonas,
        sabor: sabor || 'No especificado', presupuesto: presupuesto || 'No especificado', mensaje,
        fechaEnvio: fechaEnvio || new Date().toISOString(), tipo: 'cotizacion'
      };

      await emailService.sendQuoteRequest(quoteData);
      return res.json({ success: true, message: 'Solicitud de cotización enviada correctamente' });

    } else {
      return res.status(400).json({
        error: 'Tipo de formulario no válido. Debe ser "contacto" o "cotizacion"'
      });
    }
  } catch (error) {
    console.error('Error en ruta unificada de contacto:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// ======================== FIN RUTAS DE CONTACTO ========================

// Manejar rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.originalUrl 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📧 Email service: ${emailService ? 'Disponible' : 'No disponible'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
