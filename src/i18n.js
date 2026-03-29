// ===========================
// Internationalisation
// DE/AT/CH → Deutsch, alles andere → Englisch
// ===========================

const de = {
  // Placeholder
  placeholder: 'Schreib etwas \u2026',
  untitledHeading: '(ohne Titel)',
  kbdSpace: 'Leer',

  // Sidebar
  structureHeader: 'Struktur',
  structureEmpty: 'Noch keine \u00DCberschriften',

  // Tooltips
  btnStructure: 'Dokumentstruktur (Cmd+Shift+L)',
  btnFontUp: 'Text gr\u00F6\u00DFer (Cmd++)',
  btnFontDown: 'Text kleiner (Cmd+-)',
  btnVibe: 'Vibe-Modus',
  btnColor: 'Hintergrundfarbe',
  btnTheme: 'Hell/Dunkel-Modus',
  btnHelp: 'Tastaturk\u00FCrzel',

  // Help overlay
  helpTitle: 'Tastaturk\u00FCrzel',
  sectionFormatting: 'Formatierung',
  sectionTextSize: 'Textgr\u00F6\u00DFe',
  sectionDocument: 'Dokument',
  sectionEdit: 'Bearbeiten',

  // Help rows
  bold: 'Fett',
  italic: 'Kursiv',
  boldItalic: 'Fett \u0026 Kursiv',
  heading1: '\u00DCberschrift 1',
  heading2: '\u00DCberschrift 2',
  headingToText: '\u00DCberschrift \u2192 Text',
  textLarger: 'Text gr\u00F6\u00DFer',
  textSmaller: 'Text kleiner',
  openFile: 'Datei \u00F6ffnen',
  save: 'Speichern',
  saveAs: 'Speichern unter',
  toggleStructure: 'Struktur ein-/ausblenden',
  undo: 'R\u00FCckg\u00E4ngig',
  redo: 'Wiederholen',

  // macOS menu (Rust-seitig, hier nur als Referenz)
  menuFile: 'Datei',
  menuOpen: 'Laden',
  menuSave: 'Speichern',
  menuSaveAs: 'Speichern als\u2026',
}

const en = {
  placeholder: 'Write something\u2026',
  untitledHeading: '(untitled)',
  kbdSpace: 'Space',

  structureHeader: 'Structure',
  structureEmpty: 'No headings yet',

  btnStructure: 'Document structure (Cmd+Shift+L)',
  btnFontUp: 'Text larger (Cmd++)',
  btnFontDown: 'Text smaller (Cmd+-)',
  btnVibe: 'Vibe mode',
  btnColor: 'Background colour',
  btnTheme: 'Light/Dark mode',
  btnHelp: 'Keyboard shortcuts',

  helpTitle: 'Keyboard Shortcuts',
  sectionFormatting: 'Formatting',
  sectionTextSize: 'Text Size',
  sectionDocument: 'Document',
  sectionEdit: 'Edit',

  bold: 'Bold',
  italic: 'Italic',
  boldItalic: 'Bold \u0026 Italic',
  heading1: 'Heading 1',
  heading2: 'Heading 2',
  headingToText: 'Heading \u2192 Text',
  textLarger: 'Text larger',
  textSmaller: 'Text smaller',
  openFile: 'Open file',
  save: 'Save',
  saveAs: 'Save as',
  toggleStructure: 'Toggle structure',
  undo: 'Undo',
  redo: 'Redo',

  menuFile: 'File',
  menuOpen: 'Open',
  menuSave: 'Save',
  menuSaveAs: 'Save As\u2026',
}

function detectLang() {
  const lang = (navigator.language || navigator.languages?.[0] || 'en').toLowerCase()
  return lang.startsWith('de') ? 'de' : 'en'
}

export const lang = detectLang()
export const t = lang === 'de' ? de : en
