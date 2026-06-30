# Suite GesCar OS - Ecosistema Integral de Automoción

**Desarrollado por:** M2 Code Systems (Manuel Arjona Carrera y Miriam Olmo Fernández)
**Versión:** 1.0.0
**Año:** 2026

---

## 📌 Descripción General
Este repositorio contiene la arquitectura completa del ecosistema de software diseñado para la gestión integral, logística, preparación y entrega de vehículos. Para garantizar la máxima seguridad de datos, escalabilidad y rendimiento en entornos de producción, el código fuente está modularizado en tres aplicaciones independientes que interactúan de forma asíncrona a través de una base de datos centralizada en tiempo real.

---

## 🏗️ Arquitectura del Sistema (Módulos y Funcionalidades)

El ecosistema está dividido de forma estricta en los siguientes tres directorios principales:

### 1. Módulo Gestor Interno (`/Modulo_Gestor_Interno`)
El núcleo operativo de la concesión. Es un panel de control avanzado (Dashboard de administración) diseñado con un sistema restrictivo de roles y permisos en vivo.
* **Funcionalidades Clave:**
  * Control de roles de usuario (Entregas, Taller, Recambios, BackOffice).
  * Agenda interactiva mensual con validación de estados (*Pendiente de aprobación* por entregas / *Confirmada*).
  * Tarjetas de vehículos dinámicas con seguimiento logístico de fases (*Documentación*, *En Transporte*, *En Preparación*, *Listo para Entrega*).
  * Historial premium paginado con motores de búsqueda localizados.
  * Módulo de mensajería interna global e individual entre departamentos.
  * Exportación analítica automatizada a archivos `.xlsx` (Excel) y hojas de preparación operativas en `.pdf`.

### 2. Módulo App Clientes (`/Modulo_App_Clientes`)
Aplicación ligera orientada al usuario final, optimizada para dispositivos móviles (PWA/Mobile Web App). Permite al comprador interactuar de forma segura con el estado de su pedido sin acceso a datos administrativos.
* **Funcionalidades Clave:**
  * **Gestor de Citas:** Herramienta interactiva para agendar y modificar la fecha/hora de recogida del vehículo.
  * **Cuenta Atrás:** Contador dinámico en tiempo real que indica los días, horas y minutos restantes hasta el momento exacto de la entrega.
  * **Visualizador Multimedia:** Sección optimizada para la reproducción de vídeos personalizados del coche del cliente.
  * **Catálogo de Accesorios:** Escaparate digital de componentes y añadidos específicos para su modelo.
  * **Manual de Asistencia:** Repositorio de consulta rápida y guías de soporte para el conductor.
  * **Checklist Pre-Entrega:** Listado interactivo de tareas y documentación obligatoria que el cliente debe preparar antes de acudir a la cita.
  * **Botón "Ya estoy aquí":** Disparador de geolocalización/presencia pasiva que avisa instantáneamente al Gestor Interno de que el cliente ha entrado en el concesionario.

### 3. Módulo Web Renting (`/Modulo_Web_Renting`)
Portal B2B (Business to Business) diseñado específicamente para centralizar la operativa con las compañías y operadoras de flotas externas.
* **Funcionalidades Clave:**
  * **Acceso Seguro (Login):** Panel restringido para credenciales de agencias de Renting aliadas (Arval, ALD, LeasePlan, etc.).
  * **Marca Blanca (Co-branding):** Personalización dinámica de la interfaz. Al iniciar sesión, el sistema inyecta el logotipo y el nombre comercial de la agencia activa.
  * **Rastreador de Estado por Matrícula:** Buscador directo donde las agencias introducen la matrícula y la web les devuelve la fase logística exacta en la que se encuentra el coche.
  * **Central de Notificaciones Automatizada:** Al marcarse un coche como "Listo", el sistema despliega una pasarela para enviar la confirmación al cliente final mediante tres canales:
    * Envío de correo electrónico corporativo automatizado.
    * Conexión directa con la API/Ventana de WhatsApp.
    * Portapapeles dinámico para copiar el mensaje preformateado y enviarlo de manera manual.

---

## 🛠️ Pila Tecnológica (Tech Stack)

* **Frontend:** HTML5 (Estructuración semántica), CSS3, JavaScript (Vanilla JS / ES6+ Asíncrono).
* **Framework de Estilos:** Tailwind CSS (Arquitectura visual mediante utilidades/clases).
* **Base de Datos y Autenticación:** Firebase Suite (Cloud Firestore para sincronización en tiempo real de nodos y Firebase Authentication para cifrado de usuarios).
* **Librerías de Interfaz y Datos:** * `SweetAlert2` (Diseño de modales interactivos y flujos de usuario estilo WhatsApp).
  * `SheetJS / XLSX` (Procesamiento y exportación de datos vectoriales).
  * `html2pdf.js` (Renderizado de vistas HTML a documentos PDF planos).

---

## 🚀 Despliegue Técnico en Entorno Local

1. Extraer el paquete principal de la Suite en vuestro entorno de desarrollo.
2. Acceder al módulo que se desea levantar (ej. `cd Modulo_Gestor_Interno`).
3. Inicializar un servidor web local (ej. extensión *Live Server* de VS Code, o por terminal mediante `python -m http.server 5500`).
4. **Nota de seguridad:** Las credenciales del nodo `firebaseConfig` deben estar debidamente configuradas e inicializadas en el Core de cada módulo para asegurar el flujo de datos.

---
*Este documento es de uso exclusivamente técnico e informativo. Para consultar los derechos de autor, licencias y prohibiciones de explotación comercial, acuda al archivo `LICENSE.md` ubicado en la raíz de este repositorio.*
