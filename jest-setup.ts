import '@testing-library/jest-dom';

if (typeof Touch === 'undefined') {
  global.Touch = function TouchInit({ identifier, target, clientX, clientY }) {
    return {
      identifier,
      target,
      clientX,
      clientY,
      pageX: clientX,
      pageY: clientY,
      screenX: clientX,
      screenY: clientY,
      radiusX: 0,
      radiusY: 0,
      rotationAngle: 0,
      force: 1,
    };
  } as any;
}
