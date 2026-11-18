# Cómo aportar a RutaPoli

Gracias por ayudar. RutaPoli es un mapa **no oficial** hecho por estudiantes, y vale lo que valen sus
datos. Hay una regla que no se rompe: **nada sin fuente y nada inventado**. Si no lo comprobaste, no lo
marques como verificado; si no sabes un horario, déjalo vacío.

## 1. Corregir o agregar un lugar (la mejor vía: OpenStreetMap)

Los lugares, accesos y paradas salen de [OpenStreetMap](https://www.openstreetmap.org) (OSM). Si corriges
algo **allá**, lo ganan RutaPoli y cualquier otro mapa que use OSM.

1. Crea una cuenta en openstreetmap.org y abre el campus.
2. Pulsa **Editar** (editor iD). Selecciona el edificio o punto, o dibuja uno nuevo.
3. Corrige el nombre (`name`), el tipo (por ejemplo `amenity=library`, `amenity=cafe`) y lo que sepas.
   No copies datos de Google Maps ni de otros mapas: solo lo que viste o una fuente libre.
4. Guarda con un comentario claro (por ejemplo: «Nombre de la cafetería de ESCOM, visita del 12-nov»).
5. Avisa en un issue de este repositorio para que alguien reimporte:

   ```bash
   npm run importar:osm -- zacatenco    # o santo-tomas
   npm run generar:ocupacion
   npm test
   ```

   Revisa el `git diff` de `src/data/` antes de hacer commit: OSM cambia y a veces trae cosas raras.

## 2. Aportar enchufes y zonas silenciosas

Esto no está en OSM: vive en `src/data/<campus>.servicios.json`. Cada dato lleva cómo lo comprobaste y
cuándo:

```json
{
  "osm-w293805766": {
    "enchufes": {
      "valor": "pocos",
      "fuente": "Visita a la biblioteca ESFM",
      "fecha": "2026-11-13",
      "verificado": false
    }
  }
}
```

- `enchufes`: `muchos` | `pocos` | `no`. `silencio`: `silencioso` | `moderado` | `ruidoso`.
- El id del lugar lo ves en la URL al abrirlo en la app (`?lugar=osm-w293805766`).
- `verificado: true` solo si **otra persona** lo confirmó (revisión en el pull request).
- `npm test` revisa el archivo: rechaza ids que no existen, valores raros o datos sin fuente.

Si no usas Git, abre un issue con el botón «Sugerir datos» de la app (cuando el proyecto lo tenga
activado) o con el mismo formato.

## 3. Verificar datos existentes

Todo lo importado entra «Sin verificar». Para marcar un lugar como verificado, en
`src/data/<campus>.lugares.json` cambia `verificado` a `true` **y** pon en `fuente` cómo lo comprobaste
(por ejemplo «Visita en campo, 14-nov-2026»). Ojo: reimportar desde OSM sobrescribe ese archivo; por eso,
si algo estaba mal, mejor corrígelo en OSM (sección 1).

## 4. Código

```bash
npm install
npm run dev     # http://localhost:5173
npm test && npm run lint
```

- Pull requests pequeños y con una sola idea; describe qué cambia y cómo lo probaste.
- Interfaz en español de México. Revisa **PC y móvil**, en **tema claro y oscuro**.
- Colores, tamaños y tipografías solo desde `src/styles/tokens.css`.
- Accesibilidad: controles con nombre accesible, objetivos táctiles de 44 px o más, contraste AA.
- Ninguna clave privada en el repositorio (usa `.env.local` y `worker/.dev.vars`, ignorados por Git).
- Toda fuente externa nueva: cita la fuente, muestra la hora de actualización y maneja el error sin romper la app.

## Qué no aceptamos

- El escudo, logotipos o marca del IPN, o cualquier cosa que haga parecer oficial al proyecto.
- Datos copiados de servicios con licencia incompatible (Google Maps, apps de terceros).
- Horarios, teléfonos o rutas «de memoria» sin fuente.
- Datos personales de cualquier persona.

## Licencias de lo que aportas

Los datos que vienen de OSM se publican bajo ODbL (ver README). Lo que aportes a `servicios.json` se
publicará con la licencia de datos del proyecto. Mientras quien mantiene el proyecto no la defina, la
propuesta es ODbL, compatible con OSM. El código tendrá la licencia que se elija (propuesta: MIT).
