const select = document.querySelector("#meta-company");
const feedback = document.querySelector("#feedback");
const tbody = document.querySelector("#campaigns");
const paginationNote = document.querySelector("#pagination-note");
const refresh = document.querySelector("#refresh");
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
let currency = "BRL";
function cell(row, value) {
  const td = document.createElement("td");
  td.textContent = value == null ? "—" : String(value);
  row.append(td);
}
function budget(value) {
  if (value == null) return "No conjunto de anúncios / não informado";
  if (currency !== "BRL") return String(value) + " (centésimos em " + currency + ")";
  return money.format(Number(value) / 100);
}
async function get(url) {
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  if (response.status === 401) { location.replace("/login"); throw Error("Sessão expirada."); }
  const data = await response.json();
  if (!response.ok) throw Error(data.error || "Falha ao consultar.");
  return data;
}
async function load() {
  if (!select.value) return;
  refresh.disabled = true;
  select.disabled = true;
  tbody.replaceChildren();
  paginationNote.textContent = "";
  feedback.textContent = "Consultando a Meta…";
  try {
    const base = "/api/companies/" + encodeURIComponent(select.value);
    const [account, result] = await Promise.all([
      get(base + "/meta-connection"), get(base + "/meta-campaigns")
    ]);
    currency = account.account?.currency || "BRL";
    for (const campaign of result.campaigns) {
      const row = document.createElement("tr");
      cell(row, campaign.name);
      cell(row, campaign.objective);
      cell(row, campaign.effectiveStatus || campaign.status);
      cell(row, budget(campaign.dailyBudget));
      cell(row, budget(campaign.lifetimeBudget));
      tbody.append(row);
    }
    feedback.textContent = result.campaigns.length
      ? result.campaigns.length + " campanha(s) carregada(s) da conta " + (account.account?.name || "")
      : "Nenhuma campanha encontrada nessa conta.";
    if (result.hasMore) paginationNote.textContent = "Exibindo as primeiras 100 campanhas. Paginação será adicionada em uma próxima etapa.";
  } catch (error) {
    feedback.textContent = error.message;
  } finally {
    refresh.disabled = false;
    select.disabled = false;
  }
}
refresh.addEventListener("click", load);
select.addEventListener("change", load);
(async () => {
  try {
    const profile = await get("/api/me");
    select.replaceChildren();
    for (const company of profile.companies) {
      const option = document.createElement("option");
      option.value = company.id;
      option.textContent = company.name;
      select.append(option);
    }
    const alps = profile.companies.find(c => c.name.toLowerCase().includes("alps"));
    if (alps) select.value = alps.id;
    if (!select.value) { feedback.textContent = "Nenhuma clínica vinculada."; return; }
    await load();
  } catch (error) { feedback.textContent = error.message; }
})();
