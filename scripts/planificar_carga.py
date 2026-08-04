#!/usr/bin/env python3
"""Parsea el Excel + carpeta BrandingPlataforma y produce carga_plan.json,
con emparejamiento de fotos y reporte de confianza."""
import zipfile, xml.etree.ElementTree as ET, re, json, os, unicodedata, glob

BASE = "/Users/ivan/Documents/Generando Ideas/plataforma-marca/BrandingPlataforma"
OUT = "/Users/ivan/Documents/Generando Ideas/plataforma-marca/scripts/carga_plan.json"
PASSWORD = "GenerandoIdeas2026"
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", s.lower())

# ---- leer Excel ----
xlsx = f"{BASE}/GIM. Listado de colaboradores.xlsx"
z = zipfile.ZipFile(xlsx)
shared = ["".join(t.text or "" for t in si.iter(f"{NS}t"))
          for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall(f"{NS}si")]
def colnum(ref):
    m = re.match(r"([A-Z]+)", ref); s = 0
    for c in m.group(1): s = s*26 + (ord(c)-64)
    return s-1
rows = []
for row in ET.fromstring(z.read("xl/worksheets/sheet1.xml")).iter(f"{NS}row"):
    cells = {}
    for c in row.findall(f"{NS}c"):
        v = c.find(f"{NS}v"); istr = c.find(f"{NS}is"); val = ""
        if c.get("t") == "s" and v is not None: val = shared[int(v.text)]
        elif istr is not None: val = "".join(x.text or "" for x in istr.iter(f"{NS}t"))
        elif v is not None: val = v.text
        cells[colnum(c.get("r"))] = (val or "").strip()
    if cells:
        rows.append([cells.get(i, "") for i in range(max(cells)+1)])
data = rows[1:]
people = []
for r in data:
    r = r + [""]*(11-len(r))
    if r[8].strip().lower() in ("sí", "si") and "@" in r[5]:
        people.append({"areaNum": r[1], "area": r[2], "nombre": f"{r[3]} {r[4]}".strip(),
                       "firstname": r[3], "apellido": r[4],
                       "email": r[5].lower().strip(), "cargo": r[6]})

# ---- firmas por # de área ----
firmas = {}
for f in os.listdir(f"{BASE}/Contenido/Firmas"):
    m = re.match(r"(\d+)\.", f)
    if m:
        label = re.sub(r".*Firmas_2026_", "", f).replace(".docx", "").strip()
        firmas[m.group(1)] = {"path": f"{BASE}/Contenido/Firmas/{f}", "label": label}

# ---- fotos por # de área ----
foto_dirs = {}
for d in os.listdir(f"{BASE}/Fotografías Corporativas"):
    m = re.match(r"(\d+)\.", d)
    if m and os.path.isdir(f"{BASE}/Fotografías Corporativas/{d}"):
        foto_dirs[m.group(1)] = f"{BASE}/Fotografías Corporativas/{d}"

# ---- emparejar fotos ----
fotos_asignadas = []
rep_alta = []; rep_revisar = []; sin_foto = []; sin_dueno = []
by_area = {}
for p in people:
    by_area.setdefault(p["areaNum"], []).append(p)

for area, ppl in by_area.items():
    d = foto_dirs.get(area)
    photos = []
    if d:
        photos = [pf for pf in os.listdir(d) if pf.lower().endswith((".png", ".jpg", ".jpeg"))]
    used = set()
    # Paso 1: match por nombre (alta / revisar)
    NICK = {"paty": "patricia", "serch": "sergio", "gaby": "gabriela",
            "lalo": "eduardo", "andy": "andrea", "memo": "guillermo",
            "beto": "roberto", "pepe": "jose", "pancho": "francisco",
            "checo": "sergio", "tavo": "gustavo"}
    def best(p):
        fn = norm(p["firstname"]); ln = norm(p["apellido"])
        initials = "".join(w[0] for w in p["firstname"].split() if w)  # "José Carlos" -> "JC"
        ini = norm(initials)
        res = []
        for pf in photos:
            if pf in used: continue
            base = os.path.splitext(pf)[0]
            toks = [t for t in re.split(r"[ .]+", base) if t]
            nb = norm(base)
            score = 0
            if nb == fn: score = 100
            elif len(nb) >= 3 and (fn.startswith(nb) or nb.startswith(fn)): score = 85
            elif nb == ln: score = 75
            elif len(nb) >= 4 and (ln.startswith(nb) or nb.startswith(ln)): score = 65
            # "Fer A" / "Mario G" -> nombre + inicial de apellido
            elif len(toks) == 2 and norm(toks[1]) == ln[:1] and (
                    fn.startswith(norm(toks[0])) or norm(toks[0]).startswith(fn[:3])):
                score = 80
            # apodo conocido
            elif NICK.get(nb) and fn.startswith(NICK[nb]): score = 78
            # iniciales de nombre compuesto ("JC" -> José Carlos)
            elif len(ini) >= 2 and nb == ini: score = 78
            elif len(nb) >= 3 and len(fn) >= 3 and nb[:3] == fn[:3]: score = 45
            if score: res.append((score, pf))
        res.sort(reverse=True)
        return res
    pendientes = []
    for p in ppl:
        cands = best(p)
        if cands and cands[0][0] >= 65:
            score, pf = cands[0]; used.add(pf)
            conf = "alta" if score >= 85 else "revisar"
            fotos_asignadas.append({"email": p["email"], "path": f"{d}/{pf}",
                                     "nombre": "Fotografía corporativa", "confianza": conf})
            (rep_alta if conf == "alta" else rep_revisar).append(f'{p["nombre"]} → {pf}')
        else:
            pendientes.append(p)
    # Paso 2: eliminación (un solo pendiente y una sola foto libre)
    libres = [pf for pf in photos if pf not in used]
    if len(pendientes) == 1 and len(libres) == 1:
        p = pendientes[0]; pf = libres[0]; used.add(pf)
        fotos_asignadas.append({"email": p["email"], "path": f"{d}/{pf}",
                                 "nombre": "Fotografía corporativa", "confianza": "revisar"})
        rep_revisar.append(f'{p["nombre"]} → {pf} (por eliminación)')
        pendientes = []
    for p in pendientes:
        sin_foto.append(f'{p["nombre"]} (área {area})')
    for pf in [x for x in photos if x not in used]:
        sin_dueno.append(f'{pf} (área {area})')

# ---- categorías + recursos ----
def R(nombre, path): return {"nombre": nombre, "path": path}
FC = f"{BASE}/Contenido/Fondos Corporativos"
categorias = [
    {"nombre": "Fondo de Teams", "descripcion": "Captura de tu fondo virtual en Microsoft Teams.",
     "requiereEvidencia": True, "recursos": [R("Fondo Teams", f"{FC}/Fondo Teams/teams_1.png")]},
    {"nombre": "Fondo de escritorio", "descripcion": "Captura del fondo de pantalla de tu computadora.",
     "requiereEvidencia": True, "recursos": [
        R(f"Fondo escritorio V{i}", f"{FC}/Fondo PC y Cel/Fondo_Computadora_V{i}.jpg") for i in (1,2,3)]},
    {"nombre": "Fondo de celular", "descripcion": "Captura del fondo de pantalla de tu celular.",
     "requiereEvidencia": True, "recursos": [
        R(f"Fondo celular V{i}", f"{FC}/Fondo PC y Cel/Fondo_Celular_V{i}.jpg") for i in (1,2,3)]},
    {"nombre": "Fondo de WhatsApp", "descripcion": "Captura del fondo de tu WhatsApp.",
     "requiereEvidencia": True, "recursos": [R("Fondo WhatsApp", f"{FC}/Fondo whats/WALLPAPER_1_whats.jpg")]},
    {"nombre": "Firma de correo", "descripcion": "Captura de tu firma configurada en el correo.",
     "requiereEvidencia": True, "recursos": []},
    {"nombre": "Fotografía corporativa", "descripcion": "Tu fotografía corporativa oficial.",
     "requiereEvidencia": False, "recursos": []},
    {"nombre": "Brand Book", "descripcion": "Manual de identidad de marca 2026.",
     "requiereEvidencia": False, "recursos": [R("Brand Book 2026", f"{BASE}/BrandBook_2026.pdf")]},
    {"nombre": "Política de uso de marca", "descripcion": "Política de uso de marca e identidad corporativa 2026.",
     "requiereEvidencia": False, "recursos": [
        R("Política de Uso de Marca 2026", f"{BASE}/2026. Política de Uso de Marca e Identidad Corporativa.pdf")]},
    {"nombre": "Papelería corporativa", "descripcion": "Plantillas y hoja membretada corporativa.",
     "requiereEvidencia": False, "recursos": [
        R("Plantilla genérica 2026", f"{BASE}/Papalería Corporativa/GIM. 2026_Plantilla Genérica.pptx"),
        R("Hoja membretada 2026", f"{BASE}/Papalería Corporativa/GIM. Hoja membretada.2026.docx")]},
    {"nombre": "Tipografías", "descripcion": "Fuentes corporativas.",
     "requiereEvidencia": False, "recursos": [
        R("Gantari", f"{BASE}/Tipografías/Gantari.zip"),
        R("Open Sans", f"{BASE}/Tipografías/Open_Sans.zip")]},
]
for i, c in enumerate(categorias):
    c["orden"] = i

plan = {"password": PASSWORD, "categorias": categorias,
        "usuarios": [{"nombre": p["nombre"], "email": p["email"], "cargo": p["cargo"], "areaNum": p["areaNum"]} for p in people],
        "firmasPorArea": firmas, "fotos": fotos_asignadas}
json.dump(plan, open(OUT, "w"), ensure_ascii=False, indent=1)

# verificar que existan los recursos
faltan = []
for c in categorias:
    for r in c["recursos"]:
        if not os.path.exists(r["path"]): faltan.append(r["path"])
for a in firmas.values():
    if not os.path.exists(a["path"]): faltan.append(a["path"])

print(f"Usuarios a crear: {len(people)}")
print(f"Firmas mapeadas por área: {sorted(firmas.keys(), key=int)}")
print(f"Fotos asignadas: {len(fotos_asignadas)}  (alta: {len(rep_alta)}, revisar: {len(rep_revisar)})")
print(f"Sin foto: {len(sin_foto)} | Fotos sin dueño: {len(sin_dueno)}")
print(f"Recursos/archivos faltantes: {faltan if faltan else 'ninguno'}")
print("\n--- FOTOS A REVISAR ---")
for x in rep_revisar: print("  ", x)
print("\n--- PERSONAS SIN FOTO ---")
for x in sin_foto: print("  ", x)
print("\n--- FOTOS SIN DUEÑO ---")
for x in sin_dueno: print("  ", x)
json.dump({"alta": rep_alta, "revisar": rep_revisar, "sin_foto": sin_foto, "sin_dueno": sin_dueno},
          open("/Users/ivan/Documents/Generando Ideas/plataforma-marca/scripts/reporte_fotos.json", "w"),
          ensure_ascii=False, indent=1)
