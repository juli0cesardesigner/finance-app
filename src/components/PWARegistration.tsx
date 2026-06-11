"use client";

import { useEffect } from "react";

export default function PWARegistration() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Se estiver em desenvolvimento, desregistrar o Service Worker para evitar cache de HMR/Turbopack
      if (process.env.NODE_ENV === "development") {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister().then((success) => {
              if (success) {
                console.log(
                  "PWA: Service Worker desregistrado automaticamente para desenvolvimento."
                );
              }
            });
          }
        });
        return;
      }

      // Código de registro apenas para Produção
      const registerSW = () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log(
              "PWA: Service Worker registrado com escopo:",
              registration.scope
            );
          })
          .catch((error) => {
            console.error("PWA: Erro ao registrar o Service Worker:", error);
          });
      };

      if (document.readyState === "complete") {
        registerSW();
      } else {
        window.addEventListener("load", registerSW);
        return () => window.removeEventListener("load", registerSW);
      }
    }
  }, []);

  return null;
}

