"""
Recorta el mapa base de Protomaps (OpenStreetMap, esquema v4) a la zona de los campus
y lo guarda como un solo archivo PMTiles servido por el propio sitio: public/mapa/ipn.pmtiles.

Uso (requiere Python 3 y la biblioteca oficial `pmtiles`):

    python3 -m venv .venv-mapa
    .venv-mapa/bin/pip install pmtiles
    .venv-mapa/bin/python scripts/extraer_mapa.py            # build más reciente
    .venv-mapa/bin/python scripts/extraer_mapa.py 20261118   # un build concreto

Solo descarga los bytes necesarios del planeta (peticiones HTTP por rangos), no los ~140 GB.
Protomaps pide no enlazar sus builds desde una app, sino copiar el recorte al propio hosting:
eso es exactamente lo que hace este script. Datos: © colaboradores de OpenStreetMap (ODbL).
"""

import gzip
import json
import math
import sys
import urllib.request
from pathlib import Path

from pmtiles.reader import Reader
from pmtiles.tile import Compression, TileType, zxy_to_tileid
from pmtiles.writer import Writer

UA = "RutaPoli/0.1 (proyecto estudiantil no oficial; recorte de mapa base)"
BUILDS = "https://build-metadata.protomaps.dev/builds.json"
SALIDA = Path(__file__).resolve().parent.parent / "public" / "mapa" / "ipn.pmtiles"
# Versión del recorte: la app la usa para renovar la copia guardada sin conexión.
VERSION = Path(__file__).resolve().parent.parent / "src" / "data" / "mapa-base.json"

# Caja que cubre la zona navegable de TODOS los campus: `limites` de src/data/campus.ts
# más la holgura del mapa (0.02°, ver HOLGURA en Mapa.tsx) y un pequeño margen.
# Si agregas un campus, amplía esta caja para incluirlo.
OESTE, SUR, ESTE, NORTE = -99.2023, 19.4215, -99.1025, 19.5383
ZOOM_MIN = 12  # el mapa no deja alejarse más allá del zoom 13 (minZoom en Mapa.tsx)
ZOOM_MAX = 15  # el máximo del planeta; MapLibre amplía (overzoom) a partir de aquí


def pedir(url, rango=None):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    if rango:
        req.add_header("Range", f"bytes={rango[0]}-{rango[0] + rango[1] - 1}")
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def lector_remoto(url):
    """get_bytes por rangos HTTP; recuerda los directorios (se piden muchas veces)."""
    memoria = {}

    def get_bytes(offset, length):
        clave = (offset, length)
        if clave not in memoria:
            datos = pedir(url, (offset, length))
            if len(datos) != length:
                raise IOError(f"Rango incompleto: pedí {length} bytes y llegaron {len(datos)}")
            # Solo vale la pena recordar lo pequeño (encabezado y directorios).
            if length < 1_000_000:
                memoria[clave] = datos
            return datos
        return memoria[clave]

    return get_bytes


def tesela(lon, lat, z):
    n = 2**z
    x = int((lon + 180) / 360 * n)
    lat_r = math.radians(lat)
    y = int((1 - math.asinh(math.tan(lat_r)) / math.pi) / 2 * n)
    return min(max(x, 0), n - 1), min(max(y, 0), n - 1)


def main():
    if len(sys.argv) > 1:
        build = sys.argv[1].removesuffix(".pmtiles")
    else:
        build = json.loads(pedir(BUILDS))[-1]["key"].removesuffix(".pmtiles")
    url = f"https://build.protomaps.com/{build}.pmtiles"
    print(f"Fuente: {url}")

    lector = Reader(lector_remoto(url))
    cabecera = lector.header()
    metadatos = lector.metadata()

    teselas = []
    for z in range(ZOOM_MIN, ZOOM_MAX + 1):
        x0, y0 = tesela(OESTE, NORTE, z)
        x1, y1 = tesela(ESTE, SUR, z)
        n = 0
        peso = 0
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1):
                datos = lector.get(z, x, y)
                if datos:
                    teselas.append((zxy_to_tileid(z, x, y), datos))
                    n += 1
                    peso += len(datos)
        print(f"  z{z}: {n} teselas, {peso / 1024:.0f} KB")

    teselas.sort(key=lambda t: t[0])
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    with open(SALIDA, "wb") as f:
        escritor = Writer(f)
        for tile_id, datos in teselas:
            escritor.write_tile(tile_id, datos)
        e7 = lambda v: int(v * 10_000_000)  # noqa: E731
        escritor.finalize(
            {
                "tile_type": TileType.MVT,
                "tile_compression": cabecera["tile_compression"],
                "min_lon_e7": e7(OESTE),
                "min_lat_e7": e7(SUR),
                "max_lon_e7": e7(ESTE),
                "max_lat_e7": e7(NORTE),
                "center_zoom": 14,
                "center_lon_e7": e7((OESTE + ESTE) / 2),
                "center_lat_e7": e7((SUR + NORTE) / 2),
            },
            {
                **metadatos,
                "name": "RutaPoli: zona de los campus IPN",
                "description": f"Recorte del basemap de Protomaps, build {build}",
                "attribution": '<a href="https://protomaps.com">Protomaps</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            },
        )

    tamano = SALIDA.stat().st_size
    VERSION.write_text(
        json.dumps({"build": build, "bytes": tamano, "teselas": len(teselas)}, indent=2) + "\n"
    )
    print(f"Listo: {SALIDA} ({len(teselas)} teselas, {tamano / 1_048_576:.1f} MB)")
    # Compresión de las teselas: el estilo (protocolo pmtiles) la detecta sola.
    if cabecera["tile_compression"] not in (Compression.GZIP, Compression.NONE):
        print("Aviso: compresión de teselas poco común:", cabecera["tile_compression"])


if __name__ == "__main__":
    main()
