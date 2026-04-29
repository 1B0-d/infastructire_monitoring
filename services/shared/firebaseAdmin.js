import fs from "node:fs";
import admin from "firebase-admin";

const credentialsPath =
  process.env.FIREBASE_CREDENTIALS_PATH ||
  "/etc/secrets/serviceAccountKey.json";

const loadCredential = () => {
  if (credentialsPath && fs.existsSync(credentialsPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
    return admin.credential.cert(serviceAccount);
  }

  return admin.credential.applicationDefault();
};

export const getFirebaseAuth = () => {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: loadCredential(),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
  }

  return admin.auth();
};
