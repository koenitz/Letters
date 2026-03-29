import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TurndownService from 'turndown'
import { marked } from 'marked'

// ===========================
// Markdown conversion
// ===========================

const turndown = new TurndownService({
  headingStyle: 'atx',
  strongDelimiter: '**',
  emDelimiter: '_',
})

// ===========================
// Color Utilities
// ===========================

function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255
  let g = parseInt(hex.slice(3, 5), 16) / 255
  let b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2
  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
    h *= 360
  }
  return { h, s: s * 100, l: l * 100 }
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = n => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function clamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi)
}

// ===========================
// State
// ===========================

let isDarkMode = false
let currentFilePath = null
let userHex = '#5b6fae'     // user's chosen base color
let fontSize = 17
const FONT_MIN = 13
const FONT_MAX = 26

// ===========================
// Background Color
// ===========================

/** Returns the color to actually display given dark mode state */
function effectiveColor(hex) {
  if (!isDarkMode) return hex
  const { h, s, l } = hexToHsl(hex)
  // Preserve hue, desaturate slightly, darken significantly
  return hslToHex(h, clamp(s * 0.8, 15, 55), clamp(l * 0.28, 7, 18))
}

/** Apply color to background. updatePreview: also update the color button dot. */
function applyColor(hex, updatePreview = true) {
  userHex = hex
  document.documentElement.style.setProperty('--bg-color', effectiveColor(hex))
  if (updatePreview) {
    document.getElementById('color-preview').style.background = hex
    document.getElementById('color-input').value = hex
  }
}

// ===========================
// Vibe Mode  —  RAF interpolation
// ===========================

let vibeMode = false
let vibeAnimFrame = null
let vibeSeed = 0
let vibeFrom = null   // HSL-Objekt: Startfarbe des aktuellen Übergangs
let vibeTo = null     // HSL-Objekt: Zielfarbe
let vibeTransStart = 0
const VIBE_DURATION = 9000   // ms pro Übergang

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

function lerpHsl(a, b, t) {
  // Kürzester Weg auf dem Farbkreis
  let dh = ((b.h - a.h) % 360 + 360) % 360
  if (dh > 180) dh -= 360
  return {
    h: (a.h + dh * t + 360) % 360,
    s: a.s + (b.s - a.s) * t,
    l: a.l + (b.l - a.l) * t,
  }
}

function nextVibeTarget() {
  vibeSeed += 1
  const { h, s, l } = hexToHsl(userHex)
  const hShift = Math.sin(vibeSeed * 0.7)  * 18
  const sShift = Math.sin(vibeSeed * 1.1)  * 8
  const lShift = Math.sin(vibeSeed * 0.9)  * 6

  if (isDarkMode) {
    const darkL = clamp(l * 0.28, 7, 18)
    return {
      h: (h + hShift + 360) % 360,
      s: clamp(s * 0.8 + sShift * 0.5, 12, 60),
      l: clamp(darkL + lShift * 0.4, 5, 22),
    }
  }
  return {
    h: (h + hShift + 360) % 360,
    s: clamp(s + sShift, 15, 88),
    l: clamp(l + lShift, 22, 75),
  }
}

function vibeLoop(timestamp) {
  const t = Math.min((timestamp - vibeTransStart) / VIBE_DURATION, 1)
  const current = lerpHsl(vibeFrom, vibeTo, easeInOut(t))
  document.documentElement.style.setProperty('--bg-color',
    hslToHex(current.h, current.s, current.l))

  if (t >= 1) {
    // Übergang abgeschlossen → nächste Zielfarbe
    vibeFrom = vibeTo
    vibeTo = nextVibeTarget()
    vibeTransStart = timestamp
  }

  vibeAnimFrame = requestAnimationFrame(vibeLoop)
}

function startVibe() {
  vibeMode = true
  vibeSeed = Math.floor(Math.random() * 50)
  vibeFrom = hexToHsl(effectiveColor(userHex))
  vibeTo = nextVibeTarget()
  vibeTransStart = performance.now()
  vibeAnimFrame = requestAnimationFrame(vibeLoop)
}

function stopVibe() {
  vibeMode = false
  cancelAnimationFrame(vibeAnimFrame)
  vibeAnimFrame = null
  applyColor(userHex, false)
}

function toggleVibe() {
  if (vibeMode) {
    stopVibe()
    document.getElementById('btn-vibe').classList.remove('active')
  } else {
    startVibe()
    document.getElementById('btn-vibe').classList.add('active')
  }
}

// ===========================
// Font Size
// ===========================

function setFontSize(size) {
  fontSize = clamp(size, FONT_MIN, FONT_MAX)
  document.documentElement.style.setProperty('--font-size-base', `${fontSize}px`)
  document.getElementById('btn-font-up').disabled = fontSize >= FONT_MAX
  document.getElementById('btn-font-down').disabled = fontSize <= FONT_MIN
}

// ===========================
// Dark / Light Toggle
// ===========================

function toggleTheme() {
  isDarkMode = !isDarkMode
  document.body.classList.toggle('dark', isDarkMode)
  document.querySelector('.icon-moon').style.display = isDarkMode ? 'none' : 'block'
  document.querySelector('.icon-sun').style.display = isDarkMode ? 'block' : 'none'

  // Re-apply color with new dark/light adjustment
  if (vibeMode) {
    // Next vibe tick will pick up the new dark state automatically
    document.documentElement.style.setProperty('--bg-color', vibeColor())
  } else {
    applyColor(userHex, false)
  }
}

// ===========================
// Custom Keyboard Extension
// ===========================

// Cmd+D is handled in the global capture listener below (more reliable in WebKit)

// ===========================
// Editor Initialization
// ===========================

const editor = new Editor({
  element: document.querySelector('#editor'),
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2] },
      blockquote: false,
      codeBlock: false,
      code: false,
      horizontalRule: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
    }),
    Placeholder.configure({ placeholder: 'Schreib etwas …' }),
  ],
  content: '',
  autofocus: true,
  onUpdate() { updateModeIndicator(); updateStructure() },
  onSelectionUpdate() { updateModeIndicator() },
})

// ===========================
// Mode Indicator (top-right)
// ===========================

function updateModeIndicator() {
  const isBold = editor.isActive('bold')
  const isItalic = editor.isActive('italic')
  const el = document.getElementById('mode-indicator')

  if (isBold && isItalic) {
    el.innerHTML = '<span class="mode-b mode-i">BI</span>'
    el.classList.add('visible')
  } else if (isBold) {
    el.innerHTML = '<span class="mode-b">B</span>'
    el.classList.add('visible')
  } else if (isItalic) {
    el.innerHTML = '<span class="mode-i">I</span>'
    el.classList.add('visible')
  } else {
    el.innerHTML = ''
    el.classList.remove('visible')
  }
}

// ===========================
// Document Structure Sidebar
// ===========================

function updateStructure() {
  const container = document.getElementById('structure-content')
  const emptyMsg = document.getElementById('structure-empty')
  const headings = []

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      headings.push({ level: node.attrs.level, text: node.textContent, pos })
    }
  })

  if (headings.length === 0) {
    container.innerHTML = ''
    emptyMsg.classList.add('visible')
    return
  }
  emptyMsg.classList.remove('visible')
  container.innerHTML = headings.map(h =>
    `<div class="structure-item level-${h.level}" data-pos="${h.pos}">${h.text || '(ohne Titel)'}</div>`
  ).join('')

  container.querySelectorAll('.structure-item').forEach(item => {
    item.addEventListener('click', () => {
      editor.chain().focus().setTextSelection(parseInt(item.dataset.pos, 10) + 1).run()
    })
  })
}

// ===========================
// File Operations (Tauri)
// ===========================

async function openFile() {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const { readTextFile } = await import('@tauri-apps/plugin-fs')
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }],
    })
    if (!selected) return
    const text = await readTextFile(selected)
    editor.commands.setContent(await marked.parse(text), false)
    currentFilePath = selected
  } catch (err) { console.error('Öffnen fehlgeschlagen:', err) }
}

async function saveFile() {
  currentFilePath ? await writeMarkdownTo(currentFilePath) : await saveFileAs()
}

async function saveFileAs() {
  try {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const path = await save({
      filters: [{ name: 'Markdown', extensions: ['md'] }],
      defaultPath: 'Dokument.md',
    })
    if (!path) return
    await writeMarkdownTo(path)
    currentFilePath = path
  } catch (err) { console.error('Speichern fehlgeschlagen:', err) }
}

async function writeMarkdownTo(path) {
  try {
    const { writeTextFile } = await import('@tauri-apps/plugin-fs')
    await writeTextFile(path, turndown.turndown(editor.getHTML()))
  } catch (err) { console.error('Schreiben fehlgeschlagen:', err) }
}

// ===========================
// Global Keyboard Shortcuts
// ===========================

document.addEventListener('keydown', async (e) => {
  const mod = e.metaKey || e.ctrlKey
  if (!mod) return

  // Cmd+F in heading → paragraph
  if (e.key === 'f' && editor.isActive('heading')) {
    e.preventDefault()
    editor.chain().focus().setParagraph().run()
    return
  }

  // Cmd+D → Bold + Italic toggle
  if (e.key === 'd') {
    e.preventDefault()
    const isBold = editor.isActive('bold')
    const isItalic = editor.isActive('italic')
    if (isBold && isItalic) {
      editor.chain().focus().unsetMark('bold').unsetMark('italic').run()
    } else {
      editor.chain().focus().setMark('bold').setMark('italic').run()
    }
    return
  }

  // Cmd++ / Cmd+= → font larger
  if (e.key === '+' || e.key === '=') {
    e.preventDefault()
    setFontSize(fontSize + 1)
    return
  }

  // Cmd+- → font smaller
  if (e.key === '-') {
    e.preventDefault()
    setFontSize(fontSize - 1)
    return
  }

  // Cmd+O → open
  if (e.key === 'o') { e.preventDefault(); await openFile(); return }

  // Cmd+S / Cmd+Shift+S → save / save as
  if (e.key === 's') {
    e.preventDefault()
    e.shiftKey ? await saveFileAs() : await saveFile()
    return
  }

  // Cmd+Shift+L → structure sidebar
  if (e.shiftKey && e.key === 'l') { e.preventDefault(); toggleSidebar(); return }
}, true)

// ===========================
// Sidebar
// ===========================

function toggleSidebar() {
  const sidebar = document.getElementById('structure-sidebar')
  const btn = document.getElementById('btn-structure')
  sidebar.classList.toggle('open')
  btn.classList.toggle('active', sidebar.classList.contains('open'))
}

// ===========================
// Event Listeners
// ===========================

document.getElementById('btn-structure').addEventListener('click', toggleSidebar)
document.getElementById('btn-theme').addEventListener('click', toggleTheme)
document.getElementById('btn-vibe').addEventListener('click', toggleVibe)
document.getElementById('btn-font-up').addEventListener('click', () => setFontSize(fontSize + 1))
document.getElementById('btn-font-down').addEventListener('click', () => setFontSize(fontSize - 1))

// Help overlay
function toggleHelp() {
  document.getElementById('help-overlay').classList.toggle('visible')
}

document.getElementById('btn-help').addEventListener('click', toggleHelp)
document.getElementById('btn-help-close').addEventListener('click', toggleHelp)
document.getElementById('help-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) toggleHelp()
})
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('help-overlay').classList.remove('visible')
  }
}, false)

document.getElementById('color-input').addEventListener('input', (e) => {
  applyColor(e.target.value)
  // If vibe mode is on, re-center it around the new color
  if (vibeMode) { vibeSeed = Math.random() * 100 }
})

document.querySelector('.editor-wrapper').addEventListener('click', (e) => {
  if (e.target === e.currentTarget || e.target.id === 'editor') {
    editor.commands.focus('end')
  }
})

// ===========================
// macOS Menü-Events
// ===========================

async function setupMenuListeners() {
  try {
    const { listen } = await import('@tauri-apps/api/event')
    listen('menu:open',    () => openFile())
    listen('menu:save',    () => saveFile())
    listen('menu:save-as', () => saveFileAs())
  } catch {
    // Nicht in Tauri-Umgebung – kein Problem
  }
}
setupMenuListeners()

// ===========================
// Init
// ===========================

applyColor('#5b6fae')
setFontSize(17)
updateStructure()
updateModeIndicator()
