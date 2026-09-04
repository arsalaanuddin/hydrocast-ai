# backend/ml/geojson_to_swmm.py
import json
import os

def build_swmm_inp(manhole_geojson, conduit_geojson, output_inp_path, storm_rain_mm=60.0):
    with open(manhole_geojson, 'r') as f:
        manholes = json.load(f)['features']

    with open(conduit_geojson, 'r') as f:
        conduits = json.load(f)['features']

    lines = [
        "[TITLE]",
        ";; HydroCast AI Coupled Hydrodynamic Model",
        "",
        "[OPTIONS]",
        ";;Option             Value",
        "FLOW_UNITS           CMS",
        "INFILTRATION         CURVE_NUMBER",
        "FLOW_ROUTING         KINWAVE",
        "START_DATE           01/01/2026",
        "START_TIME           00:00:00",
        "REPORT_START_DATE    01/01/2026",
        "REPORT_START_TIME    00:00:00",
        "END_DATE             01/01/2026",
        "END_TIME             03:00:00",
        "WET_STEP             00:05:00",
        "DRY_STEP             01:00:00",
        "ROUTING_STEP         00:00:30",
        "",
        "[JUNCTIONS]",
        ";;Name           Elevation  MaxDepth   InitDepth  SurDepth   Aponded"
    ]

    outfalls = []
    coordinates = []

    for m in manholes:
        props = m['properties']
        geom = m['geometry']['coordinates']
        node_id = str(props['osmid'])
        ground = float(props.get('ground_elev_m', 10.0))
        invert = float(props.get('invert_elev_m', 8.2))
        depth = max(ground - invert, 1.8)
        node_type = props.get('node_type', 'JUNCTION')

        coordinates.append(f"{node_id} {geom[0]:.6f} {geom[1]:.6f}")

        if node_type == 'OUTFALL':
            outfalls.append(f"{node_id} {invert:.2f} FREE NO")
        else:
            lines.append(f"{node_id:<16} {invert:<10.2f} {depth:<10.2f} 0          0          0")

    lines.extend([
        "",
        "[OUTFALLS]",
        ";;Name           Elevation  Type       Stage Data       Gated    Route To",
    ])
    lines.extend(outfalls)

    lines.extend([
        "",
        "[CONDUITS]",
        ";;Name           From Node        To Node          Length     Roughness  InOffset   OutOffset  InitFlow   MaxFlow"
    ])

    xsections = [
        "",
        "[XSECTIONS]",
        ";;Link           Shape        Geom1            Geom2      Geom3      Geom4      Barrels    Culvert"
    ]

    for c in conduits:
        props = c['properties']
        cid = props['conduit_id']
        u = str(props['from_node'])
        v = str(props['to_node'])
        length = float(props.get('length_m', 50.0))
        roughness = float(props.get('manning_n', 0.013))
        diam_m = float(props.get('diameter_mm', 600)) / 1000.0

        lines.append(f"{cid:<16} {u:<16} {v:<16} {length:<10.2f} {roughness:<10.4f} 0          0          0          0")
        xsections.append(f"{cid:<16} CIRCULAR     {diam_m:<16.2f} 0          0          0          1")

    lines.extend(xsections)

    lines.extend([
        "",
        "[COORDINATES]",
        ";;Node           X-Coord            Y-Coord"
    ])
    lines.extend(coordinates)

    lines.append("")
    with open(output_inp_path, 'w') as f:
        f.write("\n".join(lines))

    print(f"[✓] Compiled SWMM input model: {output_inp_path}")