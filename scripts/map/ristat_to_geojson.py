#!/usr/bin/env python3
"""Converte i GeoPackage RISTAT (ramo `data`, scaricati da .github/workflows/fetch-data.yml) in GeoJSON.

Uso:
  git fetch origin data && mkdir -p data-raw/ristat
  git show origin/data:ristat_578935 > data-raw/ristat/ristat_578935   # uezd 1897
  git show origin/data:ristat_578936 > data-raw/ristat/ristat_578936   # governatorati 1897
  pip install pyogrio geopandas && python3 -I scripts/map/ristat_to_geojson.py data-raw/ristat

Fonte: Kessler, Gijs and Andrei Markevich, Electronic Repository of Russian Historical Statistics,
18th - 21st centuries, https://ristat.org/, Version I (2020). Mappe: doi:10.34894/NQOASN (CC0).
"""
import sys
from pathlib import Path

import geopandas as gpd

d = Path(sys.argv[1] if len(sys.argv) > 1 else 'data-raw/ristat')
for src, dst in [('ristat_578935', 'districts1897.geojson'), ('ristat_578936', 'provinces1897.geojson')]:
    g = gpd.read_file(d / src).to_crs(4326)
    g.to_file(d / dst, driver='GeoJSON')
    print(dst, len(g))
