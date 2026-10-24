const $ = (selector) => document.querySelector(selector);

const companySelect = $("#company");
const dialog = $("#campaign-dialog");
const form = $("#campaign-form");
const search = $("#search");

const drafts = [];
let currentView = "overview";
let toastTimer;

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const pages = {
  overview: {
    title: "Visão geral",
    description: "Organize suas próximas campanhas em um só lugar."
  },
  campaigns: {
    title: "Campanhas",
    description: "Prepare os rascunhos antes de conectar sua conta de anúncios."
  },
  integrations: {
    title: "Integrações",
    description: "As conexões que vão dar vida ao seu painel."
  }
};

function notify(message) {
  const toast = $("#toast");
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 4500);
}

function changeView(view) {
  currentView = view;

  $("#page-title").textContent = pages[view].title;
  $("#page-description").textContent = pages[view].description;

  $("#overview-section").hidden = view !== "overview";
  $("#campaign-section").hidden = view === "integrations";
  $("#integrations-section").hidden = view !== "integrations";
  $("#new-campaign").hidden = view === "integrations";

  document.querySelectorAll("[data-view]").forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);

    if (active) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  render();
}

function addCell(row, text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  row.append(cell);
  return cell;
}

function render() {
  const company = companySelect.value;
  const companyDrafts = drafts.filter((draft) => draft.company === company);
  const query = search.value.trim().toLocaleLowerCase("pt-BR");

  const visible = companyDrafts.filter((draft) =>
    `${draft.name} ${draft.objective}`
      .toLocaleLowerCase("pt-BR")
      .includes(query)
  );

  $("#company-name").textContent =
    companySelect.selectedOptions[0].textContent;

  $("#draft-count").textContent = companyDrafts.length;
  $("#planned-budget").textContent = money.format(
    companyDrafts.reduce((total, draft) => total + draft.budgetCents, 0) / 100
  );

  $("#empty-state").hidden = companyDrafts.length > 0;
  $("#table-wrapper").hidden = visible.length === 0;
  $("#no-results").hidden = companyDrafts.length === 0 || visible.length > 0;

  const rows = $("#campaign-rows");
  rows.replaceChildren();

  for (const draft of visible) {
    const row = document.createElement("tr");

    addCell(row, draft.name);
    addCell(row, draft.objective);
    addCell(row, money.format(draft.budgetCents / 100));

    const statusCell = addCell(row, "");
    const status = document.createElement("span");
    status.className = "status";
    status.textContent = "Rascunho";
    statusCell.append(status);

    const actionCell = addCell(row, "");
    const remove = document.createElement("button");
    remove.className = "remove-button";
    remove.textContent = "Excluir";
    remove.setAttribute("aria-label", `Excluir rascunho ${draft.name}`);

    remove.addEventListener("click", () => {
      const index = drafts.findIndex((item) => item.id === draft.id);

      if (index >= 0) {
        drafts.splice(index, 1);
        render();
        notify("Rascunho removido desta prévia.");
      }
    });

    actionCell.append(remove);
    rows.append(row);
  }
}

function openDialog() {
  form.reset();
  $("#campaign-name").setCustomValidity("");
  dialog.showModal();
  $("#campaign-name").focus();
}

$("#new-campaign").addEventListener("click", openDialog);
$("#hero-create").addEventListener("click", openDialog);
$("#empty-create").addEventListener("click", openDialog);

$("#close-dialog").addEventListener("click", () => dialog.close());
$("#cancel-dialog").addEventListener("click", () => dialog.close());

$("#campaign-name").addEventListener("input", (event) => {
  event.target.setCustomValidity("");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const nameInput = $("#campaign-name");
  const name = nameInput.value.trim();

  if (!name) {
    nameInput.setCustomValidity("Informe um nome para a campanha.");
    nameInput.reportValidity();
    return;
  }

  if (!form.reportValidity()) return;

  const budget = Number($("#campaign-budget").value);
  if (!Number.isFinite(budget) || budget < 1 || budget > 100000) return;

  drafts.push({
    id: crypto.randomUUID(),
    company: companySelect.value,
    name,
    objective: $("#campaign-objective").value,
    budgetCents: Math.round(budget * 100)
  });

  dialog.close();
  search.value = "";
  changeView("campaigns");
  notify("Rascunho criado nesta prévia. Ele não foi salvo no banco.");
});

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => changeView(button.dataset.view));
});

companySelect.addEventListener("change", () => {
  search.value = "";
  render();
});

search.addEventListener("input", render);

changeView(currentView);