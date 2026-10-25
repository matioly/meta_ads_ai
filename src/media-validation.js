const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(value, label, max, required = false) {
  if (value === undefined && !required) return "";
  if (typeof value !== "string" || value.length > max ||
      (required && !value.trim())) {
    throw new Error(label + ": informe um texto " + (required ? "não vazio " : "") + "de até " + max + " caracteres.");
  }
  return value.trim();
}

function driveLink(value) {
  const raw = text(value, "Link do Drive", 2048, true);
  let url;
  try { url = new URL(raw); } catch { throw new Error("Informe um link válido do Google Drive."); }
  if (url.protocol !== "https:" || url.hostname !== "drive.google.com" ||
      url.port || url.username || url.password) {
    throw new Error("Use um link HTTPS de arquivo em drive.google.com.");
  }
  const match = url.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]+)(?:\/(?:view|preview|edit))?\/?$/);
  const id = match?.[1] || (url.pathname === "/open" ? url.searchParams.get("id") : null);
  if (!id || !/^[A-Za-z0-9_-]{10,200}$/.test(id)) {
    throw new Error("Cole o link de um arquivo do Drive, não de uma pasta.");
  }
  const canonical = new URL("https://drive.google.com/file/d/" + id + "/view");
  const resourceKey = url.searchParams.get("resourcekey");
  if (resourceKey) {
    if (!/^[A-Za-z0-9_-]{1,200}$/.test(resourceKey)) throw new Error("Chave de compartilhamento inválida.");
    canonical.searchParams.set("resourcekey", resourceKey);
  }
  return { id, url: canonical.href };
}

function accountInput(body) {
  const label = text(body?.label, "Apelido", 120, true);
  const email = text(body?.email, "E-mail", 254).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Informe um e-mail válido ou deixe vazio.");
  return { label, email };
}

function mediaInput(body) {
  const name = text(body?.name, "Nome da mídia", 120, true);
  if (!uuid.test(body?.accountId || "")) throw new Error("Selecione uma conta cadastrada.");
  if (!["video", "image"].includes(body?.kind)) throw new Error("Selecione vídeo ou imagem.");
  return { name, accountId: body.accountId, kind: body.kind,
    notes: text(body.notes, "Observações", 500), link: driveLink(body.url) };
}

module.exports = { uuid, driveLink, accountInput, mediaInput };

