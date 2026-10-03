"""Package the built app, audio, credits and local usage instructions."""
import json
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parent.parent
dist = root / "dist"
manifest = json.loads((dist / "offline-manifest.json").read_text())
archive = root / "output" / "ouvir-ingles-listening-offline.zip"
archive.parent.mkdir(exist_ok=True)
instructions = """OUVIR INGLÊS — MÉTODO LISTENING OFFLINE

1. Extraia este ZIP em uma pasta.
2. Abra um terminal nessa pasta e execute:
   python3 -m http.server 4173
3. Abra http://localhost:4173 no navegador.
4. Em Método listening, clique em Preparar modo offline.
5. Aguarde a confirmação. Depois use o mesmo endereço e navegador,
   mesmo com a internet desligada.

Comece com Começar próxima lição. O ciclo é ouvir, escrever, comparar,
microloop, imitar e ouvir sem texto. A trilha tem 24 lições em 8 semanas,
70 microclipes e 7 contrastes de sons com 14 gravações de palavras.
As revisões são agendadas automaticamente. Exporte seu progresso para
guardar um backup; ele fica no navegador, não nos arquivos deste ZIP.

Todos os áudios necessários estão incluídos. Preserve os créditos e as
licenças exibidos no app. Os arquivos ELLLO são para uso educacional
sem fins comerciais. Fontes e contexto da sessão anterior:
docs/listening-method.md.
"""
with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as bundle:
    for file in sorted(dist.rglob("*")):
        if file.is_file():
            bundle.write(file, file.relative_to(dist))
    bundle.write(root / "docs/listening-method.md", "docs/listening-method.md")
    bundle.writestr("COMO-USAR.txt", instructions)

with zipfile.ZipFile(archive) as bundle:
    assert bundle.testzip() is None, "Archive integrity check failed"
    names = set(bundle.namelist())
    missing = [file["url"] for file in manifest["files"] if file["url"].lstrip("/") not in names]
    assert not missing, f"Missing offline files: {missing}"
print(f"Pacote verificado: {archive} ({archive.stat().st_size / 1024**2:.1f} MB)")
