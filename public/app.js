const $ = selector => document.querySelector(selector)

const companySelect = $('#company')
const dialog = $('#campaign-dialog')
const form = $('#campaign-form')
const search = $('#search')

let drafts = []
let driveAccounts = []
let mediaList = []
let editingId = null
let companies = []
let busy = false
let loaded = false
let loadMessage = 'Carregando rascunhos…'
let toastTimer

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})

const pages = {
  media: {
    title: 'Biblioteca de mídias',
    description: 'Os vídeos e imagens continuam nas contas Google que vocês já usam.'
  },
  overview: {
    title: 'Visão geral',
    description: 'Acompanhe os resultados reais das campanhas nos últimos 30 dias.'
  },
  campaigns: {
    title: 'Campanhas',
    description: 'Consulte campanhas reais na Meta e seus rascunhos de planejamento.'
  },
  integrations: {
    title: 'Integrações',
    description: 'Consulte e configure as integrações de cada clínica.'
  }
}

const formError = document.createElement('p')
formError.setAttribute('role', 'alert')
formError.hidden = true
form.querySelector('.dialog-actions').before(formError)

async function api (url, method = 'GET', body) {
  const options = {
    method,
    credentials: 'same-origin',
    cache: 'no-store'
  }

  if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' }
    options.body = JSON.stringify(body)
  }

  const response = await fetch(url, options)

  if (response.status === 401) {
    window.location.replace('/login')
    throw new Error('Sua sessão expirou.')
  }

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Não foi possível concluir.')
  }

  return data
}

function canWrite () {
  const company = companies.find(item => item.id === companySelect.value)

  return ['owner', 'admin'].includes(company?.role)
}

function endpoint () {
  return (
    '/api/companies/' + encodeURIComponent(companySelect.value) + '/campaigns'
  )
}

function notify (message) {
  const toast = $('#toast')

  clearTimeout(toastTimer)
  toast.textContent = message
  toast.hidden = false

  toastTimer = setTimeout(() => {
    toast.hidden = true
  }, 4500)
}

function changeView (view) {
  if (!pages[view]) view = 'overview'
  $('#page-title').textContent = pages[view].title
  $('#page-description').textContent = pages[view].description

  $('#overview-section').hidden = view !== 'overview'
  $('#campaign-section').hidden = view !== 'campaigns'
  $('#meta-real-campaigns').hidden = view !== 'campaigns'
  $('#media-section').hidden = view !== 'media'
  $('#integrations-section').hidden = view !== 'integrations'
  $('#new-campaign').hidden = true

  document.querySelectorAll('[data-view]').forEach(button => {
    const active = button.dataset.view === view
    button.classList.toggle('active', active)

    if (active) {
      button.setAttribute('aria-current', 'page')
    } else {
      button.removeAttribute('aria-current')
    }
  })

  render()
  if (typeof window.loadHomeMeta === 'function') window.loadHomeMeta()
}

function addCell (row, text) {
  const cell = document.createElement('td')
  cell.textContent = text
  row.append(cell)
  return cell
}

function render () {
  const companyDrafts = drafts.filter(
    draft => draft.company === companySelect.value
  )

  const query = search.value.trim().toLocaleLowerCase('pt-BR')

  const visible = companyDrafts.filter(draft =>
    `${draft.name} ${draft.objective}`
      .toLocaleLowerCase('pt-BR')
      .includes(query)
  )

  $('#company-name').textContent =
    companySelect.selectedOptions[0]?.textContent || 'Suas clínicas'

  $('#draft-count').textContent = loaded ? companyDrafts.length : '—'

  $('#planned-budget').textContent = loaded
    ? money.format(
        companyDrafts.reduce((total, draft) => total + draft.budgetCents, 0) /
          100
      )
    : '—'

  $('#empty-state').hidden = !loaded || companyDrafts.length > 0
  $('#table-wrapper').hidden = visible.length === 0

  $('#no-results').hidden =
    loaded && (companyDrafts.length === 0 || visible.length > 0)

  $('#no-results').textContent = loaded
    ? 'Nenhum rascunho corresponde à busca.'
    : loadMessage

  companySelect.disabled = busy || companies.length === 0
  // Sair deve permanecer acessível durante carregamentos e falhas da API.
  $('#logout').disabled = false

  for (const id of ['#new-campaign', '#hero-create', '#empty-create']) {
    if ($(id)) $(id).disabled = busy || !loaded || !canWrite()
  }

  form.querySelectorAll('input, select, textarea').forEach(control => {
    control.disabled = busy || !canWrite()
  })

  form.querySelectorAll('button').forEach(control => {
    control.disabled = busy
  })

  renderMedia()

  const rows = $('#campaign-rows')
  rows.replaceChildren()

  for (const draft of visible) {
    const row = document.createElement('tr')

    addCell(row, draft.name)
    addCell(row, draft.objective)
    addCell(row, money.format(draft.budgetCents / 100))

    const statusCell = addCell(row, '')
    const status = document.createElement('span')
    status.className = 'status'
    status.textContent = 'Rascunho'
    statusCell.append(status)

    const actionCell = addCell(row, '')
    const edit = document.createElement('button')
    edit.type = 'button'
    edit.className = 'secondary'
    edit.textContent = canWrite() ? 'Editar' : 'Ver'
    edit.disabled = busy
    edit.setAttribute(
      'aria-label',
      `${canWrite() ? 'Editar' : 'Ver'} rascunho ${draft.name}`
    )
    edit.addEventListener('click', () => openDialog(draft))
    actionCell.append(edit, document.createTextNode(' '))
    const remove = document.createElement('button')
    remove.className = 'remove-button'
    remove.textContent = 'Excluir'
    remove.disabled = busy || !canWrite()
    remove.setAttribute('aria-label', `Excluir rascunho ${draft.name}`)
    remove.addEventListener('click', () => removeDraft(draft))

    actionCell.append(remove)
    rows.append(row)
  }
}

async function loadDrafts () {
  drafts = []
  driveAccounts = []
  mediaList = []
  loaded = false
  busy = true
  loadMessage = 'Carregando rascunhos…'
  render()

  try {
    if (!companySelect.value) {
      loadMessage = 'Seu usuário ainda não tem uma clínica vinculada.'
      return
    }

    const [data, accounts, media] = await Promise.all([
      api(endpoint()),
      api(mediaEndpoint('drive-accounts')),
      api(mediaEndpoint('media'))
    ])
    drafts = data.campaigns
    driveAccounts = accounts.accounts
    mediaList = media.media
    loaded = true
  } catch (error) {
    loadMessage = error.message + ' Atualize a página para tentar novamente.'
  } finally {
    busy = false
    render()
  }
}

async function removeDraft (draft) {
  if (busy || !canWrite()) return

  if (!window.confirm(`Excluir o rascunho "${draft.name}"?`)) return

  busy = true
  render()

  try {
    await api(endpoint() + '/' + encodeURIComponent(draft.id), 'DELETE', {})

    drafts = drafts.filter(item => item.id !== draft.id)
    notify('Rascunho excluído.')
  } catch (error) {
    notify(error.message)
  } finally {
    busy = false
    render()
  }
}

function openDialog (draft = null) {
  if (busy || !loaded) return
  if (!draft && !canWrite()) return

  const readOnly = !canWrite()
  editingId = draft ? draft.id : null

  formError.hidden = true
  form.reset()
  $('#campaign-name').setCustomValidity('')

  $('#dialog-title').textContent = readOnly
    ? 'Consultar campanha'
    : draft
    ? 'Editar campanha'
    : 'Nova campanha'

  const submitButton = form.querySelector('button[type="submit"]')
  submitButton.hidden = readOnly
  submitButton.textContent = draft ? 'Salvar alterações' : 'Salvar rascunho'

  $('#cancel-dialog').textContent = readOnly ? 'Fechar' : 'Cancelar'

  if (draft) {
    $('#campaign-name').value = draft.name
    $('#campaign-objective').value = draft.objective
    $('#campaign-budget').value = (draft.budgetCents / 100).toFixed(2)
  }

  form.querySelectorAll('[data-briefing]').forEach(control => {
    control.value = draft?.briefing?.[control.dataset.briefing] ?? ''
  })

  $('#campaign-briefing').open = true

  render()
  $('#campaign-media').value = draft?.mediaId || ''
  updateCampaignMediaLink()
  dialog.showModal()

  if (readOnly) {
    $('#close-dialog').focus()
  } else {
    $('#campaign-name').focus()
  }
}

$('#new-campaign').addEventListener('click', () => openDialog())
$('#hero-create')?.addEventListener('click', () => openDialog())
$('#empty-create').addEventListener('click', () => openDialog())

$('#close-dialog').addEventListener('click', () => dialog.close())
$('#cancel-dialog').addEventListener('click', () => dialog.close())

dialog.addEventListener('cancel', event => {
  if (busy) event.preventDefault()
})

$('#campaign-name').addEventListener('input', event => {
  event.target.setCustomValidity('')
})

form.addEventListener('submit', async event => {
  event.preventDefault()

  if (busy || !loaded || !canWrite()) return

  const nameInput = $('#campaign-name')
  const name = nameInput.value.trim()

  if (!name) {
    nameInput.setCustomValidity('Informe um nome para a campanha.')
    nameInput.reportValidity()
    return
  }

  if (!form.reportValidity()) return

  const budget = Number($('#campaign-budget').value)

  if (!Number.isFinite(budget) || budget < 1 || budget > 100000) return

  const briefing = {}

  form.querySelectorAll('[data-briefing]').forEach(control => {
    briefing[control.dataset.briefing] = control.value.trim()
  })

  const payload = {
    name,
    objective: $('#campaign-objective').value,
    budgetCents: Math.round(budget * 100),
    briefing,
    mediaId: $('#campaign-media').value || null
  }

  busy = true
  formError.hidden = true
  render()

  try {
    const isEditing = editingId !== null

    const url = isEditing
      ? endpoint() + '/' + encodeURIComponent(editingId)
      : endpoint()

    const data = await api(url, isEditing ? 'PUT' : 'POST', payload)

    if (isEditing) {
      drafts = drafts.map(draft =>
        draft.id === data.campaign.id ? data.campaign : draft
      )
    } else {
      drafts.unshift(data.campaign)
    }

    editingId = null
    dialog.close()
    search.value = ''
    changeView('campaigns')

    notify(isEditing ? 'Alterações salvas.' : 'Rascunho salvo.')
  } catch (error) {
    formError.textContent = error.message
    formError.hidden = false
  } finally {
    busy = false
    render()
  }
})

document.querySelectorAll('[data-view]').forEach(button => {
  button.addEventListener('click', () => changeView(button.dataset.view))
})

companySelect.addEventListener('change', () => {
  search.value = ''
  loadDrafts()
  if (typeof window.loadHomeMeta === 'function') window.loadHomeMeta()
})

search.addEventListener('input', render)

async function loadProfile () {
  busy = true
  render()

  try {
    const data = await api('/api/me')
    companies = data.companies
    $('#user-name').textContent = data.user.name
    companySelect.replaceChildren()

    for (const company of companies) {
      const option = document.createElement('option')
      option.value = company.id
      option.textContent = company.name
      companySelect.append(option)
    }

    await loadDrafts()
    changeView(new URLSearchParams(location.search).get('view') || 'overview')
    if (typeof window.loadHomeMeta === 'function') window.loadHomeMeta()
  } catch (error) {
    loadMessage = error.message + ' Atualize a página para tentar novamente.'
  } finally {
    busy = false
    render()
  }
}

$('#logout').addEventListener('click', async () => {
  const button = $('#logout')
  button.disabled = true

  try {
    const response = await fetch('/api/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    })

    if (!response.ok && response.status !== 401) {
      throw new Error('Falha ao sair.')
    }

    window.location.replace('/login')
  } catch {
    notify('Não foi possível sair. Tente novamente.')
    button.disabled = false
  }
})

// Initialization runs from media-library.js after both scripts have loaded.

