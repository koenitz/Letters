import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TurndownService from 'turndown'
import { marked } from 'marked'
import { t } from './i18n.js'

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

  // Re-apply color — vibe loop picks up new dark state automatically on next frame
  if (!vibeMode) applyColor(userHex, false)
}

// ===========================
// Custom Keyboard Extension
// ===========================

// Cmd+D is handled in the global capture listener below (more reliable in WebKit)

// ===========================
// Scroll Correction (runs after ProseMirror's own scroll via rAF)
// ===========================

// 100px editor padding + 40px breathing room below rounded corners
// ===========================
// Scroll: keep bottom of editor visible while typing
// ===========================

const SCROLL_MARGIN = 140

function correctScroll() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const scrollEl = document.querySelector('.editor-scroll')
      if (!scrollEl) return
      const { from } = editor.state.selection
      const coords = editor.view.coordsAtPos(from)
      const rect = scrollEl.getBoundingClientRect()
      const overflow = coords.bottom - (rect.bottom - SCROLL_MARGIN)
      if (overflow > 0) scrollEl.scrollTop += overflow
    })
  })
}

// ===========================
// Editor Initialization
// ===========================

const editor = new Editor({
  element: document.querySelector('#editor'),
  editorProps: {
    attributes: {
      autocorrect: 'off',
      autocapitalize: 'off',
      spellcheck: 'true',
    },
  },
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2] },
      blockquote: false,
      codeBlock: false,
      code: false,
      horizontalRule: false,
      orderedList: false,
    }),
    Placeholder.configure({ placeholder: t.placeholder }),
  ],
  content: '',
  autofocus: true,
  onUpdate({ editor }) {
    updateModeIndicator()
    updateStructure()
    correctScroll()

    // Bullet list trigger: runs AFTER the character is in the document.
    // We react to the actual document state, not the key event —
    // this is the only approach that works reliably in WebKit/Tauri.
    const { $from, empty } = editor.state.selection
    if (
      empty &&
      $from.parent.type.name === 'paragraph' &&
      $from.parentOffset === 2 &&
      ($from.parent.textContent === '- ' || $from.parent.textContent === '\u2013 ')
    ) {
      // $from.start() = absolute position of first character in this paragraph.
      // We delete exactly 2 chars (dash + space) then activate the bullet list.
      const nodeStart = $from.start()
      editor.chain()
        .deleteRange({ from: nodeStart, to: nodeStart + 2 })
        .toggleBulletList()
        .run()
    }
  },
  onSelectionUpdate() { updateModeIndicator(); correctScroll() },
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
    `<div class="structure-item level-${h.level}" data-pos="${h.pos}">${h.text || t.untitledHeading}</div>`
  ).join('')

  container.querySelectorAll('.structure-item').forEach(item => {
    item.addEventListener('click', () => {
      const pos = parseInt(item.dataset.pos, 10)
      // Resolve the DOM node at this ProseMirror position and scroll it into view
      const domNode = editor.view.nodeDOM(pos)
      if (domNode) {
        domNode.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      // Also set cursor into the heading
      editor.chain().focus().setTextSelection(pos + 1).run()
    })
  })
}

// ===========================
// File Operations (Electron)
// ===========================

async function openFile() {
  try {
    const result = await window.electronAPI.openFile()
    if (!result) return
    const html = await marked.parse(result.content)
    editor.commands.setContent(html, false)
    currentFilePath = result.filePath
  } catch (err) { console.error('Öffnen fehlgeschlagen:', err) }
}

async function saveFile() {
  try {
    const content = turndown.turndown(editor.getHTML())
    const savedPath = await window.electronAPI.saveFile(currentFilePath, content)
    if (savedPath) currentFilePath = savedPath
  } catch (err) { console.error('Speichern fehlgeschlagen:', err) }
}

async function saveFileAs() {
  try {
    const content = turndown.turndown(editor.getHTML())
    const savedPath = await window.electronAPI.saveFileAs(content)
    if (savedPath) currentFilePath = savedPath
  } catch (err) { console.error('Speichern fehlgeschlagen:', err) }
}

// ===========================
// Global Keyboard Shortcuts
// ===========================


document.addEventListener('keydown', async (e) => {
  const mod = e.metaKey || e.ctrlKey
  if (!mod) return  // only handle modifier combos — never intercept plain keys like Space or '-'

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
})

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
// Menu Events (Electron)
// ===========================

if (window.electronAPI) {
  window.electronAPI.onMenuOpen(()   => openFile())
  window.electronAPI.onMenuSave(()   => saveFile())
  window.electronAPI.onMenuSaveAs(() => saveFileAs())
}

// ===========================
// i18n
// ===========================

function applyTranslations() {
  // Toolbar titles
  document.getElementById('btn-structure').title = t.btnStructure
  document.getElementById('btn-font-up').title = t.btnFontUp
  document.getElementById('btn-font-down').title = t.btnFontDown
  document.getElementById('btn-vibe').title = t.btnVibe
  document.querySelector('.color-btn-wrapper').title = t.btnColor
  document.getElementById('btn-theme').title = t.btnTheme
  document.getElementById('btn-help').title = t.btnHelp

  // Sidebar
  document.querySelector('.sidebar-header').textContent = t.structureHeader
  document.getElementById('structure-empty').textContent = t.structureEmpty

  // Help overlay
  document.querySelector('.help-title').textContent = t.helpTitle
  const sections = document.querySelectorAll('.help-section')
  sections[0].textContent = t.sectionFormatting
  sections[1].textContent = t.sectionTextSize
  sections[2].textContent = t.sectionDocument
  sections[3].textContent = t.sectionEdit

  const spans = document.querySelectorAll('.help-row span')
  const rowKeys = ['bold', 'italic', 'boldItalic', 'heading1', 'heading2', 'headingToText',
                   'bulletList', 'textLarger', 'textSmaller', 'openFile', 'save', 'saveAs',
                   'toggleStructure', 'undo', 'redo']
  spans.forEach((span, i) => { if (rowKeys[i]) span.textContent = t[rowKeys[i]] })

  // Translate "Leer"/"Space" in heading kbd labels
  document.querySelectorAll('.help-row kbd').forEach(kbd => {
    kbd.textContent = kbd.textContent.replace(/Leer|Space/, t.kbdSpace)
  })
}

// ===========================
// Init
// ===========================

applyColor('#5b6fae')
setFontSize(17)
updateStructure()
updateModeIndicator()
applyTranslations()
