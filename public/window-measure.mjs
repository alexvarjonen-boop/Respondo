export function measuredWindows(windows, reference) {
  const span = (points,axis) => Math.abs(points[1][axis]-points[0][axis]);
  const length = reference && Math.hypot(span(reference.points,'x'),span(reference.points,'y'));
  const scale = length > 0 && Number.isFinite(reference.centimetres) && reference.centimetres > 0
    ? reference.centimetres / length : null;
  return windows.map(points => scale === null ? null : {
    width:Math.round(span(points,'x') * scale),
    height:Math.round(span(points,'y') * scale)
  });
}
