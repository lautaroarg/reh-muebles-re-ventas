# REH Muebles Re · Ventas y publicidad

Aplicación independiente de FlowSystem, adaptada del HTML original de 4Hammer y de la referencia visual de esta marca.

**Estado actual: conexión configurada al proyecto Supabase `tdykpnkndbtevwidgdtj`, compartido por HG y REH. El acceso requiere un usuario habilitado y pruebas de guardado autenticado antes de usarlo con registros reales. No se modificó ningún plan ni se activaron cargos desde esta entrega.**

## Usar

Descargá el repositorio y abrí `index.html` en un navegador actualizado o servilo como sitio estático mediante HTTPS. No necesita instalar bibliotecas externas. Ingresá con el correo y contraseña creados en Authentication del proyecto, y con la membresía de esta marca ya asignada. Las contraseñas se eligen en Supabase; no se guardan en el HTML ni en GitHub.

Tiene exactamente tres pantallas:

1. **Dashboard:** facturación total, cantidad de ventas, gasto manual, facturación atribuida, ROAS y costo por venta atribuida. Indicadores, gráficos y tablas usan el mismo filtro de fechas.
2. **Registrar ventas:** fecha, monto, categoría, origen y descripción opcional. Categorías: Sillones, Juegos de comedor, Muebles a medida y Otros.
3. **Gasto publicitario:** fecha, monto, plataforma Meta o Google y notas opcionales. Carga completamente manual, incluso retroactiva.

Importes en ARS. Ingresá `125000,50` o `125000.50`, sin separador de miles. Podés editar, eliminar y deshacer una eliminación durante 15 segundos. Los historiales muestran todas las fechas y permiten buscar.

**ROAS = facturación de ventas de origen Meta o Google / gasto publicitario del período.** Las ventas orgánicas, por recomendación u otro origen no entran en el numerador. El costo por venta atribuida divide el gasto entre la cantidad de ventas de Meta y Google. Si falta gasto se muestra `—`; si hay gasto sin ventas atribuidas, ROAS es `0×` y el costo por venta es `—`. No se calcula rentabilidad ni se incluyen costos de producción.

## Resguardar los registros

Usá **Descargar copia** regularmente. **Importar copia** agrega registros de esta marca, omite duplicados idénticos y rechaza conflictos. Las copias incluyen el historial completo, independientemente del filtro del dashboard. **Ver ejemplo** solo muestra datos ficticios, sin guardarlos.

La conexión usa únicamente el proyecto `tdykpnkndbtevwidgdtj` y una clave publicable. No hay conexión con 4Hammer ni con cuentas publicitarias. Los HTML y GitHub guardan el programa; los registros de una sesión autenticada se guardan en Supabase tras la confirmación del servidor. Una clave publicable no habilita por sí sola acceso a los datos.

Si usaste una versión local anterior, sus registros no se migran automáticamente. Antes de reemplazarla, descargá una copia desde esa versión. Después de ingresar en la aplicación conectada, importá exclusivamente la copia de esta marca. La clave local anterior era `flowsystem.reh-muebles-re.v1`; no se borra ni se usa como sustituto silencioso si falla la nube.

## Guardar en la nube

La arquitectura y los pasos de activación están en [NUBE.md](NUBE.md). Se utiliza **un único proyecto FlowSystem para HG y REH**, con permisos de base de datos por marca y usuario, separado de marcobarber. La configuración está incluida; todavía se deben habilitar usuarios y comprobar el guardado con sesión real. La verificación sin sesión devolvió HTTP 401 con código PostgreSQL 42501 en ambas tablas, y autenticación respondió HTTP 200 con la clave publicable.

## Verificar

Con Node.js instalado, ejecutá:

```text
node --test verificar.cjs nube/verificar-nube.cjs
```

Las suites incluyen **38 pruebas** sobre el código embebido en `index.html`: fórmulas, importes, fechas, filtros, errores, copias, separación, autenticación y guardado con control de cambios simultáneos. El servidor y el almacenamiento de las pruebas son simulados; no modifican tu historial ni demuestran por sí solos que las políticas RLS estén activas en un proyecto real. Node.js no es necesario para usar la aplicación.

Los flujos de alta de ventas y gastos, edición, eliminación y recuperación, exportación/importación y rechazo de copias de otra marca se comprobaron en navegador por HTTP local. La apertura `file://` quedó fuera de la prueba automatizada por una restricción del navegador integrado. No se certificó una prueba visual en móvil real.

Este repositorio contiene código y ejemplos de prueba ficticios. No cargues respaldos de ventas, datos de clientes ni contraseñas en GitHub.
