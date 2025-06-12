const admin = require('firebase-admin');

// Configuración de Firebase Admin usando variables de entorno
const initializeFirebaseAdmin = () => {
  try {
    // Verificar si ya está inicializado
    if (admin.apps.length > 0) {
      return admin.app();
    }

    // Configuración usando variables de entorno
    const firebaseConfig = {
      type: process.env.FIREBASE_TYPE || "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID || "reservas-venados",
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY ? 
        process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
      token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
    };

    // Verificar que las credenciales esenciales estén presentes
    if (!firebaseConfig.private_key || !firebaseConfig.client_email) {
      console.warn('Firebase Admin: Credenciales incompletas. Funcionando en modo limitado.');
      return null;
    }

    // Inicializar Firebase Admin
    const app = admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
      databaseURL: `https://${firebaseConfig.project_id}-default-rtdb.firebaseio.com`
    });

    console.log('Firebase Admin inicializado correctamente');
    return app;
    
  } catch (error) {
    console.error('Error al inicializar Firebase Admin:', error.message);
    return null;
  }
};

// Inicializar Firebase Admin
const firebaseApp = initializeFirebaseAdmin();

// Exportar instancias
const db = firebaseApp ? admin.firestore() : null;
const auth = firebaseApp ? admin.auth() : null;

module.exports = {
  admin,
  db,
  auth,
  firebaseApp
};
