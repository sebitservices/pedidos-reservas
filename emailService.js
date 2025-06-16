const nodemailer = require('nodemailer')

class EmailService {
  constructor() {
    this.transporter = null
    this.initialized = false
  }  async initialize() {
    if (this.initialized) return

    try {
      // Configurar el transportador SMTP para Hostinger
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      })

      // Verificar la conexión SMTP
      await this.transporter.verify()
      this.initialized = true
    } catch (error) {
      throw error
    }
  }

  async sendReservationConfirmation(reservationData) {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      // Formatear productos para el email
      const productosHTML = reservationData.productos
        .map(p => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${p.cantidad}x</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${p.nombre}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${(p.precio * p.cantidad).toLocaleString('es-CL')}</td>
          </tr>
        `).join('')

      const emailHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Confirmación de Reserva - Venados Bakery</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #8B4513, #D2691E); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">¡Reserva Confirmada!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Venados Bakery</p>
          </div>

          <!-- Content -->
          <div style="background: white; padding: 30px; border: 1px solid #ddd; border-top: none;">
            
            <p style="font-size: 18px; margin-bottom: 20px;">
              Hola <strong>${reservationData.cliente.nombre}</strong>,
            </p>

            <p style="margin-bottom: 25px;">
              ¡Excelente noticia! Tu pago ha sido procesado exitosamente y tu reserva está confirmada.
            </p>

            <!-- Reservation Details -->
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h2 style="color: #8B4513; margin-top: 0;">📋 Detalles de tu Reserva</h2>
              
              <table style="width: 100%; margin-bottom: 15px;">
                <tr>
                  <td style="padding: 5px 0;"><strong>Número de Reserva:</strong></td>
                  <td style="padding: 5px 0; text-align: right; color: #8B4513; font-weight: bold;">#${reservationData.numeroReserva}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0;"><strong>Fecha de Retiro:</strong></td>
                  <td style="padding: 5px 0; text-align: right;">${reservationData.cliente.fechaRetiro}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0;"><strong>Hora de Retiro:</strong></td>
                  <td style="padding: 5px 0; text-align: right;">${reservationData.cliente.horaRetiro}</td>
                </tr>
              </table>

              ${reservationData.cliente.mensaje ? `
                <div style="margin-top: 15px; padding: 10px; background: #e9f7ef; border-left: 4px solid #27ae60; border-radius: 4px;">
                  <strong>Mensaje especial:</strong><br>
                  "${reservationData.cliente.mensaje}"
                </div>
              ` : ''}
            </div>

            <!-- Products -->
            <div style="margin: 25px 0;">
              <h3 style="color: #8B4513;">🧁 Productos Reservados</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <thead>
                  <tr style="background: #f8f9fa;">
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Cant.</th>
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Producto</th>
                    <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${productosHTML}
                </tbody>
              </table>
            </div>

            <!-- Payment Summary -->
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #ffeaa7;">
              <h3 style="color: #8B4513; margin-top: 0;">💰 Resumen de Pago</h3>
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 5px 0;"><strong>Total:</strong></td>
                  <td style="padding: 5px 0; text-align: right; font-size: 18px;">$${reservationData.total.toLocaleString('es-CL')}</td>
                </tr>
                <tr style="color: #27ae60;">
                  <td style="padding: 5px 0;"><strong>Abono realizado (50%):</strong></td>
                  <td style="padding: 5px 0; text-align: right; font-weight: bold;">$${reservationData.abono.toLocaleString('es-CL')}</td>
                </tr>
                <tr style="color: #e74c3c;">
                  <td style="padding: 5px 0;"><strong>Pendiente (pagar en local):</strong></td>
                  <td style="padding: 5px 0; text-align: right; font-weight: bold;">$${reservationData.pendiente.toLocaleString('es-CL')}</td>
                </tr>
              </table>
            </div>

            <!-- Important Instructions -->
            <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #b3d9ff;">
              <h3 style="color: #2c5aa0; margin-top: 0;">📌 Instrucciones Importantes</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Presenta este comprobante el día de retiro</li>
                <li style="margin-bottom: 8px;">El saldo restante se paga directamente en el local</li>
                <li style="margin-bottom: 8px;">Llega puntual a la hora acordada</li>
                <li style="margin-bottom: 8px;">Si necesitas cambios, contáctanos con anticipación</li>
              </ul>
            </div>

            <!-- Contact Info -->
            <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px;">
              <h3 style="color: #8B4513; margin-top: 0;">📞 Información de Contacto</h3>
              <p style="margin: 5px 0;"><strong>Email:</strong> venados@pedidosvenados.cl</p>
              <p style="margin: 5px 0;"><strong>Teléfono:</strong> [Tu número de teléfono]</p>
              <p style="margin: 5px 0;"><strong>Dirección:</strong> [Tu dirección]</p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #666; font-size: 14px;">
                ¡Gracias por elegir Venados Bakery!<br>
                Esperamos verte pronto 🧁
              </p>
            </div>

          </div>

          <!-- Footer -->
          <div style="background: #8B4513; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
            <p style="margin: 0; font-size: 14px;">
              © 2024 Venados Bakery - Todos los derechos reservados
            </p>
          </div>

        </body>
        </html>
      `

      const mailOptions = {
        from: {
          name: 'Venados Bakery',
          address: process.env.EMAIL_USER
        },
        to: reservationData.cliente.email,
        subject: `✅ Reserva Confirmada #${reservationData.numeroReserva} - Venados Bakery`,
        html: emailHTML,
        text: `
Hola ${reservationData.cliente.nombre},

¡Tu reserva ha sido confirmada!

Número de Reserva: #${reservationData.numeroReserva}
Fecha de Retiro: ${reservationData.cliente.fechaRetiro}
Hora: ${reservationData.cliente.horaRetiro}
Total: $${reservationData.total.toLocaleString('es-CL')}
Abono realizado: $${reservationData.abono.toLocaleString('es-CL')}
Pendiente: $${reservationData.pendiente.toLocaleString('es-CL')}

Instrucciones:
- Presenta este comprobante el día de retiro
- El saldo restante se paga en el local
- Llega puntual a la hora acordada

¡Gracias por elegir Venados Bakery!

Contacto: venados@pedidosvenados.cl
        `
      }

      const result = await this.transporter.sendMail(mailOptions)
      
      return { success: true, messageId: result.messageId }

          return { success: true, messageId: result.messageId }

    } catch (error) {
      throw error
    }
  }

  async sendPaymentPendingNotification(reservationData) {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      const mailOptions = {
        from: {
          name: 'Venados Bakery',
          address: process.env.EMAIL_USER
        },
        to: reservationData.cliente.email,
        subject: `⏳ Pago Pendiente - Reserva #${reservationData.numeroReserva}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #8B4513;">Pago en Proceso</h2>
            <p>Hola <strong>${reservationData.cliente.nombre}</strong>,</p>
            <p>Tu pago está siendo procesado. Te notificaremos cuando se confirme.</p>
            <p><strong>Reserva:</strong> #${reservationData.numeroReserva}</p>
            <p>Gracias por tu paciencia.</p>
            <p><em>Venados Bakery</em></p>
          </div>
        `
      }

      const result = await this.transporter.sendMail(mailOptions)
      return { success: true, messageId: result.messageId }    } catch (error) {
      throw error
    }
  }

  // Método para enviar mensaje de contacto general
  async sendContactMessage(contactData) {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      const emailHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Nuevo Mensaje de Contacto - Venados Bakery</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #D97706, #F59E0B); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">💌 Nuevo Mensaje de Contacto</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Venados Bakery & Coffee</p>
          </div>

          <!-- Content -->
          <div style="background: white; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
            
            <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #D97706; margin-top: 0; margin-bottom: 15px;">👤 Información del Cliente</h2>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; width: 120px;">Nombre:</td>
                  <td style="padding: 8px 0;">${contactData.nombre}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Email:</td>
                  <td style="padding: 8px 0;"><a href="mailto:${contactData.email}" style="color: #D97706;">${contactData.email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Teléfono:</td>
                  <td style="padding: 8px 0;">${contactData.telefono}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Fecha:</td>
                  <td style="padding: 8px 0;">${new Date(contactData.fechaEnvio).toLocaleString('es-CL')}</td>
                </tr>
              </table>
            </div>

            <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; border-left: 4px solid #F59E0B;">
              <h3 style="color: #92400E; margin-top: 0; margin-bottom: 15px;">📝 Mensaje del Cliente</h3>
              <div style="background: white; padding: 15px; border-radius: 6px; font-style: italic; line-height: 1.6;">
                "${contactData.mensaje}"
              </div>
            </div>

            <div style="text-align: center; margin-top: 30px; padding: 20px; background: #F9FAFB; border-radius: 8px;">
              <p style="margin: 0; color: #6B7280; font-size: 14px;">
                📧 Responde directamente a <strong>${contactData.email}</strong> para contactar al cliente.
              </p>
            </div>

          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: `"Venados Bakery Sistema" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER, // Email de la empresa
        subject: `💌 Nuevo mensaje de contacto de ${contactData.nombre}`,
        html: emailHTML,
        replyTo: contactData.email
      };

      const result = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      throw error;
    }
  }

  // Método para enviar solicitud de cotización
  async sendQuoteRequest(quoteData) {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      const emailHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Nueva Solicitud de Cotización - Venados Bakery</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #059669, #10B981); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🎂 Nueva Solicitud de Cotización</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Venados Bakery & Coffee</p>
          </div>

          <!-- Content -->
          <div style="background: white; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
            
            <!-- Información del Cliente -->
            <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #059669; margin-top: 0; margin-bottom: 15px;">👤 Información del Cliente</h2>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; width: 120px;">Nombre:</td>
                  <td style="padding: 8px 0;">${quoteData.nombre}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Email:</td>
                  <td style="padding: 8px 0;"><a href="mailto:${quoteData.email}" style="color: #059669;">${quoteData.email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Teléfono:</td>
                  <td style="padding: 8px 0;">${quoteData.telefono}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Fecha Solicitud:</td>
                  <td style="padding: 8px 0;">${new Date(quoteData.fechaEnvio).toLocaleString('es-CL')}</td>
                </tr>
              </table>
            </div>

            <!-- Detalles del Producto -->
            <div style="background: #ECFDF5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
              <h2 style="color: #047857; margin-top: 0; margin-bottom: 15px;">🎂 Detalles del Producto Solicitado</h2>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; width: 150px;">Fecha del Evento:</td>
                  <td style="padding: 8px 0; color: #DC2626; font-weight: bold;">${new Date(quoteData.fechaEvento).toLocaleDateString('es-CL', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Tipo de Producto:</td>
                  <td style="padding: 8px 0; text-transform: capitalize;">${quoteData.tipoProducto}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Número de Personas:</td>
                  <td style="padding: 8px 0;">${quoteData.numeroPersonas} personas</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Sabor Preferido:</td>
                  <td style="padding: 8px 0;">${quoteData.sabor}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Presupuesto:</td>
                  <td style="padding: 8px 0;">${quoteData.presupuesto}</td>
                </tr>
              </table>
            </div>

            <!-- Descripción Detallada -->
            <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; border-left: 4px solid #F59E0B;">
              <h3 style="color: #92400E; margin-top: 0; margin-bottom: 15px;">📝 Descripción Detallada del Cliente</h3>
              <div style="background: white; padding: 15px; border-radius: 6px; font-style: italic; line-height: 1.6;">
                "${quoteData.mensaje}"
              </div>
            </div>

            <!-- Datos de Tiempo -->
            <div style="background: #EFF6FF; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #1D4ED8; margin: 0 0 10px 0;">⏰ Información de Tiempo</h4>
              <p style="margin: 5px 0; color: #374151;">
                <strong>Días hasta el evento:</strong> 
                ${Math.ceil((new Date(quoteData.fechaEvento) - new Date()) / (1000 * 60 * 60 * 24))} días
              </p>
              <p style="margin: 5px 0; color: #374151; font-size: 14px;">
                <em>Considera el tiempo de preparación necesario para este tipo de producto.</em>
              </p>
            </div>

            <div style="text-align: center; margin-top: 30px; padding: 20px; background: #F9FAFB; border-radius: 8px;">
              <p style="margin: 0 0 10px 0; color: #6B7280; font-size: 14px;">
                📧 Responde directamente a <strong>${quoteData.email}</strong> para enviar la cotización.
              </p>
              <p style="margin: 0; color: #059669; font-weight: bold; font-size: 16px;">
                💡 ¡Recuerda enviar la cotización lo antes posible!
              </p>
            </div>

          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: `"Venados Bakery Sistema" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER, // Email de la empresa
        subject: `🎂 Nueva cotización: ${quoteData.tipoProducto} para ${quoteData.numeroPersonas} personas - ${quoteData.nombre}`,
        html: emailHTML,
        replyTo: quoteData.email
      };

      const result = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      throw error;
    }
  }
}

module.exports = new EmailService()
