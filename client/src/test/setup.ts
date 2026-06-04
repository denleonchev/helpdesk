import "@testing-library/jest-dom";

// Radix UI uses pointer/scroll APIs not implemented in jsdom
HTMLElement.prototype.hasPointerCapture = () => false;
HTMLElement.prototype.setPointerCapture = () => {};
HTMLElement.prototype.releasePointerCapture = () => {};
Element.prototype.scrollIntoView = () => {};
