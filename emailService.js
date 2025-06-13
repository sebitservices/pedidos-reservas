const nodemailer = require('nodemailer')

class EmailService {
  constructor() {
    this.transporter = null
    this.initialized = false
  }  async initialize() {
    if (this.initialized) return

    try {
      console.log('🔧 Configurando SMTP con:', {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE,
        user: process.env.EMAIL_USER ? 'configurado' : 'NO CONFIGURADO'
      })      // Configurar el transportador SMTP para Hostinger
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
        },
        debug: true, // Activar debug para ver qué pasa
        logger: true // Activar logging
      })

      // Verificar la conexión SMTP
      console.log('🔍 Verificando conexión SMTP...')
      await this.transporter.verify()
      console.log('✅ Nodemailer configurado correctamente con Hostinger SMTP')
      this.initialized = true
    } catch (error) {
      console.error('❌ Error configurando Nodemailer:', error)
      console.error('📋 Detalles del error:', {
        code: error.code,
        command: error.command,
        response: error.response
      })
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
      console.log('✅ Email enviado exitosamente:', result.messageId)
      return { success: true, messageId: result.messageId }

    } catch (error) {
      console.error('❌ Error enviando email:', error)
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
      console.log('✅ Email pendiente enviado:', result.messageId)
      return { success: true, messageId: result.messageId }

    } catch (error) {
      console.error('❌ Error enviando email pendiente:', error)
      throw error
    }
  }
}

module.exports = new EmailService()
