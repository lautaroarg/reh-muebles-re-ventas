# REH Muebles Re · Ventas y publicidad

Aplicación independiente de FlowSystem, adaptada del HTML original de 4Hammer y de la referencia visual de esta marca.

**Estado actual: aplicación local funcional con conexión a Supabase preparada, pendiente de activar en un proyecto nuevo. No se creó ningún recurso ni se contrató un plan pago.**

## Usar

Descargá el repositorio y abrí `index.html` en un navegador actualizado. No necesita instalación ni bibliotecas externas. También puede servirse como sitio estático; el guardado sigue siendo local hasta integrar el backend.

Tiene exactamente tres pantallas:

1. **Dashboard:** facturación total, cantidad de ventas, gasto manual, facturación atribuida, ROAS y costo por venta atribuida. Indicadores, gráficos y tablas usan el mismo filtro de fechas.
2. **Registrar ventas:** fecha, monto, categoría, origen y descripción opcional. Categorías: Sillones, Juegos de comedor, Muebles a medida y Otros.
3. **Gasto publicitario:** fecha, monto, plataforma Meta o Google y notas opcionales. Carga completamente manual, incluso retroactiva.

Importes en ARS. Ingresá `125000,50` o `125000.50`, sin separador de miles. Podés editar, eliminar y deshacer una eliminación durante 15 segundos. Los historiales muestran todas las fechas y permiten buscar.

**ROAS = facturación de ventas de origen Meta o Google / gasto publicitario del período.** Las ventas orgánicas, por recomendación u otro origen no entran en el numerador. El costo por venta atribuida divide el gasto entre la cantidad de ventas de Meta y Google. Si falta gasto se muestra `—`; si hay gasto sin ventas atribuidas, ROAS es `0×` y el costo por venta es `—`. No se calcula rentabilidad ni se incluyen costos de producción.

## Resguardar los registros

Usá **Descargar copia** regularmente. **Importar copia** agrega registros de esta marca, omite duplicados idénticos y rechaza conflictos. Las copias incluyen el historial completo, independientemente del filtro del dashboard. **Ver ejemplo** solo muestra datos ficticios, sin guardarlos.

La clave local es `flowsystem.reh-muebles-re.v1`. No hay conexión con 4Hammer ni con cuentas publicitarias. Los HTML y GitHub guardan el programa, no las ventas cargadas en el navegador.

Los datos dependen del perfil del navegador y del origen o ubicación del archivo. Exportá antes de mover el archivo, cambiar de navegador o pasar de archivo local a un sitio web. Borrar los datos del navegador o usar incógnito puede hacer perder registros. La separación local evita mezclas accidentales, pero no reemplaza usuarios y permisos.

## Guardar en la nube

La arquitectura y los pasos de activación están en [NUBE.md](NUBE.md). Para evitar sumar un costo mensual, se propone **un único proyecto nuevo FlowSystem para HG y REH**, con permisos de base de datos por marca y usuario, separado de marcobarber. Subir el código a GitHub no activa automáticamente esa conexión.

## Verificar

Con Node.js instalado, ejecutá:

```text
node --test verificar.cjs nube/verificar-nube.cjs
```

Las suites incluyen **38 pruebas** sobre el código embebido en `index.html`: fórmulas, importes, fechas, filtros, errores, copias, separación, autenticación y guardado con control de cambios simultáneos. El servidor y el almacenamiento de las pruebas son simulados; no modifican tu historial ni demuestran por sí solos que las políticas RLS estén activas en un proyecto real. Node.js no es necesario para usar la aplicación.

Los flujos de alta de ventas y gastos, edición, eliminación y recuperación, exportación/importación y rechazo de copias de otra marca se comprobaron en navegador por HTTP local. La apertura `file://` quedó fuera de la prueba automatizada por una restricción del navegador integrado. No se certificó una prueba visual en móvil real.

Este repositorio contiene código y ejemplos de prueba ficticios. No cargues respaldos de ventas, datos de clientes ni contraseñas en GitHub.
