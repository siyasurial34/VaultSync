// Demo-only download: the real file bytes will be streamed by the backend later.
export function demoDownload(name, extraLine) {
  const text = 'VaultSync demo download\nFile: ' + name + (extraLine ? '\n' + extraLine : '') +
    '\n\nThe real file content will be served by the backend once it is built.';
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name + '.demo.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function copyText(text, onDone, onFail) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(onDone, onFail);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); onDone(); } catch (e) { onFail(); }
  ta.remove();
}
