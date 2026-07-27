const escapeLabel = (text) =>
  String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/[\r\n]+/g, ' ')

export function createCursorStyles() {
  const el = document.createElement('style')
  el.dataset.codeforge = 'remote-cursors'
  document.head.appendChild(el)

  return {
    update(peers) {
      el.textContent = peers
        .map(
          ({ clientId, color, name }) => `
.yRemoteSelection-${clientId} {
  background-color: ${color}40;
}
.yRemoteSelectionHead-${clientId} {
  position: absolute;
  box-sizing: border-box;
  height: 100%;
  border-left: 2px solid ${color};
  border-top: 2px solid ${color};
  border-bottom: 2px solid ${color};
}
.yRemoteSelectionHead-${clientId}::after {
  position: absolute;
  content: '${escapeLabel(name)}';
  left: -2px;
  top: -16px;
  padding: 0 4px;
  border-radius: 3px;
  background-color: ${color};
  color: #0b0b0e;
  font-family: ui-monospace, monospace;
  font-size: 10px;
  line-height: 15px;
  white-space: nowrap;
  pointer-events: none;
}`,
        )
        .join('\n')
    },
    destroy() {
      el.remove()
    },
  }
}
