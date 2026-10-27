/* Loaded after app.js. Uses the same authenticated API and company context. */
let mediaEditingId = null
let accountEditingId = null

function mediaEndpoint(part) {
  return '/api/companies/' + encodeURIComponent(companySelect.value) + '/' + part
}

function driveHref(value) {
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' && url.hostname === 'drive.google.com' &&
        !url.username && !url.password && !url.port &&
        /^\/file\/d\/[A-Za-z0-9_-]+\/view$/.test(url.pathname)) return url.href
  } catch {}
  return null
}

function fillOptions(select, items, placeholder, label) {
  const previous = select.value
  select.replaceChildren()
  const empty = document.createElement('option')
  empty.value = ''
  empty.textContent = placeholder
  select.append(empty)
  for (const item of items) {
    const option = document.createElement('option')
    option.value = item.id
    option.textContent = label(item)
    select.append(option)
  }
  select.value = items.some(item => item.id === previous) ? previous : ''
}

function mediaButton(label, action) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'secondary'
  button.textContent = label
  button.disabled = busy || !canWrite()
  button.addEventListener('click', action)
  return button
}

function appendDriveLink(container, item) {
  const href = driveHref(item.url)
  if (!href) return
  const link = document.createElement('a')
  link.href = href
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  link.referrerPolicy = 'no-referrer'
  link.textContent = 'Abrir no Drive'
  link.className = 'drive-link'
  container.append(link)
}

function updateCampaignMediaLink() {
  const container = $('#campaign-media-link')
  container.replaceChildren()
  const item = mediaList.find(item => item.id === $('#campaign-media').value)
  if (item) appendDriveLink(container, item)
}

function renderMedia() {
  const originFilter = document.getElementById('media-origin-filter')
  if (originFilter) {
    const selected = originFilter.value
    originFilter.replaceChildren(new Option('Todas as contas de origem', ''))
    for (const account of driveAccounts) originFilter.add(new Option(account.label + (account.email ? ' · ' + account.email : ''), String(account.id)))
    originFilter.value = [...originFilter.options].some(option => option.value === selected) ? selected : ''
  }
  const visibleMedia = originFilter?.value ? mediaList.filter(item => String(item.accountId) === originFilter.value) : mediaList
  $('#new-drive-account').disabled = busy || !loaded || !canWrite()
  $('#new-media').disabled = busy || !loaded || !canWrite() || !driveAccounts.length
  $('#media-feedback').textContent = !loaded ? loadMessage : !mediaList.length
    ? (driveAccounts.length ? 'Nenhuma mídia cadastrada. Cadastre um link do Drive.' : 'Comece cadastrando a conta onde os arquivos estão salvos.')
    : ''
  $('#media-table-wrapper').hidden = !mediaList.length
  if (originFilter && mediaList.length && !visibleMedia.length) $('#media-feedback').textContent = 'Nenhuma mídia cadastrada nesta conta de origem.'
  const rows = $('#media-rows')
  rows.replaceChildren()
  for (const item of visibleMedia) {
    const row = document.createElement('tr')
    addCell(row, item.name)
    addCell(row, item.kind === 'video' ? 'Vídeo' : 'Imagem')
    addCell(row, item.accountLabel + (item.accountEmail ? ' · ' + item.accountEmail : ''))
    addCell(row, item.notes || '—')
    const actions = addCell(row, '')
    actions.className = 'media-actions-cell'
    appendDriveLink(actions, item)
    actions.append(
      mediaButton('Editar', () => openMedia(item)),
      mediaButton('Excluir cadastro', () => deleteLibraryItem('media', item))
    )
    rows.append(row)
  }
  const accounts = $('#drive-account-rows')
  accounts.replaceChildren()
  for (const item of driveAccounts) {
    const row = document.createElement('tr')
    addCell(row, item.label)
    addCell(row, item.email || '—')
    const actions = addCell(row, '')
    actions.append(
      mediaButton('Editar', () => openAccount(item)),
      mediaButton('Excluir', () => deleteLibraryItem('drive-accounts', item))
    )
    accounts.append(row)
  }
  fillOptions($('#campaign-media'), mediaList, 'Nenhuma mídia vinculada', item => item.name + ' — ' + item.accountLabel)
  fillOptions($('#media-account'), driveAccounts, 'Selecione uma conta', item => item.label + (item.email ? ' · ' + item.email : ''))
  updateCampaignMediaLink()
  for (const id of ['#media-form', '#drive-account-form']) {
    $(id).querySelectorAll('input, select, textarea, button').forEach(control => {
      control.disabled = busy || !canWrite()
    })
  }
}

function openAccount(item = null) {
  if (busy || !loaded || !canWrite()) return
  accountEditingId = item?.id || null
  $('#drive-account-form').reset()
  $('#drive-account-title').textContent = item ? 'Editar conta' : 'Cadastrar conta'
  $('#drive-account-label').value = item?.label || ''
  $('#drive-account-email').value = item?.email || ''
  $('#drive-account-error').hidden = true
  $('#drive-account-dialog').showModal()
  $('#drive-account-label').focus()
}

function openMedia(item = null) {
  if (busy || !loaded || !canWrite()) return
  mediaEditingId = item?.id || null
  $('#media-form').reset()
  $('#media-title').textContent = item ? 'Editar mídia' : 'Cadastrar mídia'
  $('#media-name').value = item?.name || ''
  $('#media-kind').value = item?.kind || 'video'
  $('#media-account').value = item?.accountId || ''
  $('#media-url').value = item?.url || ''
  $('#media-notes').value = item?.notes || ''
  $('#media-error').hidden = true
  $('#media-dialog').showModal()
  $('#media-name').focus()
}

async function refreshLibrary() {
  // Called while busy: company selection is locked until completion.
  const [accounts, media] = await Promise.all([
    api(mediaEndpoint('drive-accounts')), api(mediaEndpoint('media'))
  ])
  driveAccounts = accounts.accounts
  mediaList = media.media
}

async function saveLibrary(event, part, id, payload, dialogId, errorId) {
  event.preventDefault()
  if (busy || !loaded || !canWrite()) return
  if (!event.currentTarget.reportValidity()) return
  busy = true
  $(errorId).hidden = true
  render()
  let saved = false
  try {
    await api(mediaEndpoint(part) + (id ? '/' + encodeURIComponent(id) : ''), id ? 'PUT' : 'POST', payload)
    saved = true
    $(dialogId).close()
    await refreshLibrary()
    notify('Cadastro salvo.')
  } catch (error) {
    if (saved) {
      loaded = false
      mediaList = []
      driveAccounts = []
      loadMessage = 'Cadastro salvo, mas não foi possível atualizar a lista. Recarregue a página.'
      notify(loadMessage)
    } else {
      $(errorId).textContent = error.message
      $(errorId).hidden = false
    }
  } finally {
    busy = false
    render()
  }
}

async function deleteLibraryItem(part, item) {
  if (busy || !loaded || !canWrite()) return
  if (!window.confirm('Excluir o cadastro "' + (item.name || item.label) + '"? O arquivo no Google Drive não será apagado.')) return
  busy = true
  render()
  let deleted = false
  try {
    await api(mediaEndpoint(part) + '/' + encodeURIComponent(item.id), 'DELETE', {})
    deleted = true
    await refreshLibrary()
    notify('Cadastro excluído.')
  } catch (error) {
    if (deleted) {
      loaded = false
      mediaList = []
      driveAccounts = []
      loadMessage = 'Cadastro excluído. Recarregue a página para atualizar a lista.'
      notify(loadMessage)
    } else notify(error.message)
  } finally {
    busy = false
    render()
  }
}

document.getElementById('media-origin-filter')?.addEventListener('change', renderMedia)
$('#new-drive-account').addEventListener('click', () => openAccount())
$('#new-media').addEventListener('click', () => openMedia())
$('#campaign-media').addEventListener('change', updateCampaignMediaLink)
document.querySelectorAll('[data-close-media]').forEach(button => {
  button.addEventListener('click', () => { if (!busy) $('#' + button.dataset.closeMedia).close() })
})
for (const id of ['#media-dialog', '#drive-account-dialog']) {
  $(id).addEventListener('cancel', event => { if (busy) event.preventDefault() })
}
$('#drive-account-form').addEventListener('submit', event => saveLibrary(event, 'drive-accounts', accountEditingId, {
  label: $('#drive-account-label').value.trim(),
  email: $('#drive-account-email').value.trim()
}, '#drive-account-dialog', '#drive-account-error'))
$('#media-form').addEventListener('submit', event => saveLibrary(event, 'media', mediaEditingId, {
  name: $('#media-name').value.trim(),
  kind: $('#media-kind').value,
  accountId: $('#media-account').value,
  url: $('#media-url').value.trim(),
  notes: $('#media-notes').value.trim()
}, '#media-dialog', '#media-error'))

// Both deferred scripts have executed; initialize the shared application.
loadProfile()

