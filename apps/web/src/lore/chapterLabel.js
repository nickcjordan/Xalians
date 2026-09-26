// Named chapters and source passages have separate numbering.
// Display numbers are one-based; stored paragraph indices stay zero-based.
export function chapterLabel(index) {
    return 'Ch. ' + String(index + 1).padStart(2, '0');
}

export function passageLabel(index) {
    return 'Passage ' + String(index + 1).padStart(2, '0');
}
