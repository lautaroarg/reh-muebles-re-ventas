# Guardado en la nube · REH Muebles Re

## Qué guarda cada parte

- **GitHub:** el código y sus versiones.
- **Alojamiento web:** los archivos que se abren al visitar la aplicación.
- **Base de datos:** las ventas y el gasto que registran los usuarios.

La versión actual utiliza `localStorage`: los registros no salen del navegador. Publicar `index.html` no cambia esa situación.

## Propuesta

Crear un proyecto nuevo de **Supabase** para `reh-muebles-re-ventas`, separado del backend de otros clientes y del proyecto existente de la cuenta. Cada usuario debe iniciar sesión y acceder solo a los datos autorizados de esta marca. La agencia puede recibir acceso explícito a ambos proyectos sin compartir sus bases.

Una vez implementada la integración, cada alta, edición o eliminación se confirmaría después de que el servidor la guarde. Al abrir desde otro dispositivo e iniciar sesión, se consultaría la misma información. El alojamiento de la web y la base de datos son servicios distintos.

## Pasos pendientes de implementación

1. Elegir la organización de Supabase donde se creará el proyecto y revisar límites y costos de la cuenta. No se creó ni contrató ningún recurso en esta entrega.
2. Crear el proyecto independiente y las tablas `sales` y `spend`; guardar importes como enteros en centavos, fechas válidas e identificadores únicos.
3. Configurar autenticación y autorizaciones en el servidor, con políticas RLS. Dar acceso únicamente a usuarios habilitados de esta marca; no basta con enviar un `clientId` desde el navegador. No permitir lecturas o escrituras anónimas de información comercial.
4. Cambiar las funciones locales `load`/`commit` por operaciones autenticadas contra la API. Conservar validaciones y fórmulas. Eliminar el guardado local como fuente principal en la edición online y no simular éxito ante errores de red.
5. Añadir control de versión de registros para evitar sobrescribir cambios concurrentes, identificadores únicos en reintentos y paginación en la lectura de historiales.
6. Configurar la URL del proyecto y una clave publicable. Las claves secretas o de servicio deben permanecer exclusivamente del lado del servidor. Actualizar la política `connect-src 'none'` del HTML al origen HTTPS permitido; la versión actual bloquea conexiones.
7. Servir la aplicación mediante HTTPS, configurar el inicio de sesión y probar permisos, errores, recarga y acceso desde dos dispositivos. Mantener las tres pantallas principales de negocio.
8. Migrar mediante una copia validada de esta marca y definir un procedimiento de respaldo y restauración según el plan contratado.

## Formato de registros existente

Las copias incluyen `schemaVersion: 1`, `clientId: "reh-muebles-re"`, `sales` y `spend`.

Una venta tiene `id`, `date` (`YYYY-MM-DD`), `amountCents`, `category`, `source` y `description`. Un gasto tiene `id`, `date`, `amountCents`, `platform` y `notes`. `480000000` centavos equivale a $4.800.000. Orígenes válidos: `Meta`, `Google`, `Orgánico`, `Recomendación`, `Otro`. Plataformas de gasto: `Meta`, `Google`.

Antes de importar, el servidor debe validar pertenencia y permisos de la marca. Una copia de otra empresa debe rechazarse, no reasignarse automáticamente.

## Documentación oficial

- [GitHub Pages: alojamiento estático](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Base de datos de Supabase](https://supabase.com/docs/guides/database/overview)
- [Control de acceso con RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)

**Estado:** el código subido sigue siendo local. Esta guía describe una integración pendiente, no una conexión ya activa.
