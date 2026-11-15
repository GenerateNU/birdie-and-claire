import { createContext } from "react";

/** The element inside an open Modal that a SidePanel draws into, so it covers the modal rather
 * than the page. */
export const ModalOverlayContext = createContext<HTMLElement | null>(null);
