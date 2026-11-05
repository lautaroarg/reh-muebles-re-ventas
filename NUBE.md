# Guardado en la nube · REH Muebles Re

## Qué guarda cada parte

- **GitHub:** el código y sus versiones.
- **Alojamiento web:** los archivos que se abren al visitar la aplicación.
- **Base de datos:** las ventas y el gasto que registran los usuarios.

La versión actual utiliza `localStorage`: los registros no salen del navegador. Publicar `index.html` no cambia esa situación.

## Arquitectura sin plan pago

Crear **un solo proyecto nuevo de Supabase**, llamado `flowsystem`, en una organización nueva separada de marcobarber. Ese proyecto contiene los espacios `hg-galvan` y `reh-muebles-re`; no consume un proyecto por cliente. Es una base compartida con separación lógica obligatoria por usuario mediante RLS, no dos bases físicamente independientes.

Cada marca mantiene su propia aplicación y sus categorías. Un usuario HG solo recibe una membresía HG; un usuario REH, una membresía REH. La agencia puede recibir ambas. Las membresías solo las modifica el administrador desde Supabase; ningún navegador puede habilitarse acceso por sí mismo.

La cuenta consultada tiene un proyecto activo. Supabase permite dos proyectos gratuitos activos entre todas las organizaciones: este proyecto utilizaría el segundo cupo, sujeto a la validación del servicio. No se contrata Pro, no se agregan tarjetas y no se crean proyectos cobrables. Si no hay cupo o el servicio pide un pago, detener la activación. Las cuotas pueden cambiar; revisar [facturación](https://supabase.com/docs/guides/platform/billing-on-supabase) y [precios](https://supabase.com/pricing).

Los proyectos gratuitos pueden pausarse tras una semana de inactividad y tienen cuotas de base de datos y transferencia. Esto no garantiza disponibilidad permanente ni capacidad ilimitada. No se incluyen mecanismos para generar actividad ficticia. Mantener copias descargadas y revisar el estado desde el panel si se pausa.

## Activar

1. Crear la organización nueva y **un solo proyecto Free `flowsystem`**. Mantener intacto marcobarber. Confirmar que no se pide ningún pago.
2. En el proyecto nuevo, ejecutar `nube/esquema.sql` una sola vez en el editor SQL. Ambos repositorios incluyen el mismo esquema; no ejecutarlo dos veces. Crea `flowsystem_data` con un historial JSON por cliente y revisión incremental, y `flowsystem_memberships` con los permisos. La validación del servidor comprueba marca, categorías, importes y fechas.
3. En Authentication, deshabilitar el registro público y crear los usuarios desde el panel. Elegir sus contraseñas directamente allí; no enviarlas por chat ni guardarlas en GitHub. El acceso de la aplicación usa correo y contraseña; no depende de contratar SMTP ni de enviar invitaciones. Los usuarios administrados deben estar confirmados según la configuración del proyecto.
4. Dar acceso desde el editor SQL, reemplazando el UUID por el identificador real del usuario:

```sql
insert into public.flowsystem_memberships(user_id,client_id)
values ('UUID_DEL_USUARIO', 'reh-muebles-re');
```

Para la agencia, agregar una fila por cada marca autorizada. No asignar ambos espacios a un cliente. No se guardan claves de servicio en los HTML.

5. Obtener la URL del proyecto y su clave **publicable**. Configurar cada repositorio con la misma URL y clave:

```text
node nube/configurar.cjs URL_DEL_PROYECTO CLAVE_PUBLICABLE
```

El ayudante actualiza `BRAND.cloud` y permite únicamente ese origen en `connect-src`. Acepta claves `sb_publishable_...`; rechaza claves secretas. No crea ni contrata recursos. Luego ejecutar las pruebas y subir el `index.html` actualizado a su repositorio.

6. Verificar con dos usuarios reales que HG no pueda leer ni escribir REH, incluso alterando los filtros de la API. Verificar también que un usuario sin membresía y una solicitud sin sesión no tengan acceso. Revisar los asesores de seguridad del proyecto. El SQL todavía no se ejecutó ni se certificó contra un proyecto real.
7. Abrir cada aplicación e ingresar. Conserva sus tres secciones principales; el acceso es una puerta de entrada. El botón **Actualizar** consulta cambios de otros dispositivos. La sesión dura en esta pestaña y no se guardan contraseñas.
8. Antes de activar, descargar una copia de los registros locales de cada marca. Después de iniciar sesión en la nube, importar únicamente la copia correspondiente. No se migra información automáticamente ni se mezcla con otro cliente. Exportar copias regularmente; una base en la nube no reemplaza un respaldo independiente.

## Cómo se guarda

En modo nube, la aplicación nunca usa el historial local como reemplazo silencioso si falla el servidor. Cada cambio lee el estado autorizado y actualiza únicamente la revisión leída. Ante un cambio simultáneo vuelve a consultar, con un máximo de tres intentos; una edición de un registro modificado se rechaza. Una respuesta de guardado perdida se comprueba por lectura antes de confirmar éxito. Los cambios solo aparecen como guardados tras confirmación.

Para mantener la primera versión simple, cada cliente tiene un documento independiente con hasta 20.000 registros, sujeto a las cuotas del servicio. No es un diseño destinado a grandes volúmenes o altas tasas de escritura. Las políticas se verifican en el servidor y no dependen solo del filtro de la pantalla.

## Formato de registros existente

Las copias incluyen `schemaVersion: 1`, `clientId: "reh-muebles-re"`, `sales` y `spend`.

Una venta tiene `id`, `date` (`YYYY-MM-DD`), `amountCents`, `category`, `source` y `description`. Un gasto tiene `id`, `date`, `amountCents`, `platform` y `notes`. `480000000` centavos equivale a $4.800.000. Orígenes válidos: `Meta`, `Google`, `Orgánico`, `Recomendación`, `Otro`. Plataformas de gasto: `Meta`, `Google`.

Antes de importar, el servidor debe validar pertenencia y permisos de la marca. Una copia de otra empresa debe rechazarse, no reasignarse automáticamente.

## Documentación oficial

- [GitHub Pages: alojamiento estático](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Base de datos de Supabase](https://supabase.com/docs/guides/database/overview)
- [Control de acceso con RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)

**Estado:** el código incluye el adaptador y su interfaz de acceso, pero la configuración enviada está vacía: continúa en modo local hasta crear y verificar el proyecto nuevo. No hay una conexión cloud activa ni una suscripción contratada.
