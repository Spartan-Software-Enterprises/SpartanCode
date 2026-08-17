function computeLineDiff(oldText = "", newText = "") {
  const oldLines = String(oldText).split(/\r?\n/);
  const newLines = String(newText).split(/\r?\n/);

  const chunks = [];
  let i = 0;
  let j = 0;

  while (i < oldLines.length || j < newLines.length) {
    if (
      i < oldLines.length &&
      j < newLines.length &&
      oldLines[i] === newLines[j]
    ) {
      chunks.push({
        type: "unchanged",
        oldLineNumber: i + 1,
        newLineNumber: j + 1,
        content: oldLines[i],
      });
      i++;
      j++;
    } else if (
      j < newLines.length &&
      (i >= oldLines.length || !oldLines.slice(i).includes(newLines[j]))
    ) {
      chunks.push({
        type: "added",
        oldLineNumber: null,
        newLineNumber: j + 1,
        content: newLines[j],
      });
      j++;
    } else if (i < oldLines.length) {
      chunks.push({
        type: "removed",
        oldLineNumber: i + 1,
        newLineNumber: null,
        content: oldLines[i],
      });
      i++;
    }
  }

  const additions = chunks.filter((c) => c.type === "added").length;
  const deletions = chunks.filter((c) => c.type === "removed").length;

  return {
    chunks,
    additions,
    deletions,
    isEqual: additions === 0 && deletions === 0,
    unified: formatUnifiedDiff(chunks),
  };
}

function formatUnifiedDiff(chunks) {
  return chunks
    .map((c) => {
      const prefix =
        c.type === "added" ? "+" : c.type === "removed" ? "-" : " ";
      return `${prefix} ${c.content}`;
    })
    .join("\n");
}

module.exports = {
  computeLineDiff,
  formatUnifiedDiff,
};
