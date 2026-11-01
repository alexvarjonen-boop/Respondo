/**
 * Fit a customer-provided logo/photo *entirely* within a square avatar.
 * Retain aspect ratio, center the content, and never crop either axis.
 * Kept independent of browser APIs so landscape/portrait geometry can be tested.
 */
export function avatarContainRect(sourceWidth,sourceHeight,size=256,padding=12){
  const w=Number(sourceWidth),h=Number(sourceHeight);
  const side=Number(size),pad=Number(padding);
  if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0 ||
     !Number.isFinite(side)||side<=0||!Number.isFinite(pad)||pad<0||pad*2>=side){
    throw new Error('Kuvan mitat ovat virheelliset.');
  }
  const scale=Math.min((side-2*pad)/w,(side-2*pad)/h);
  const width=w*scale,height=h*scale;
  return {x:(side-width)/2,y:(side-height)/2,width,height};
}
