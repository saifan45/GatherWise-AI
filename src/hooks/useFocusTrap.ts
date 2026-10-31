/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface UseFocusTrapOptions {
  isOpen: boolean;
  onClose?: () => void;
  disableEscape?: boolean;
}

/**
 * Custom hook to trap keyboard focus within a modal or drawer container,
 * handle the Escape key, and restore focus to the trigger element upon closing.
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>({
  isOpen,
  onClose,
  disableEscape = false,
}: UseFocusTrapOptions) {
  const containerRef = useRef<T | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    // 1. Remember currently focused trigger element before opening
    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;

    // 2. Focus the first interactive element inside the container
    const container = containerRef.current;
    if (container) {
      const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length > 0) {
        // Use requestAnimationFrame to ensure the DOM is rendered
        requestAnimationFrame(() => {
          focusable[0].focus();
        });
      }
    }

    // 3. Trap keyboard navigation & handle Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disableEscape) {
        e.preventDefault();
        onClose?.();
        return;
      }

      if (e.key === 'Tab') {
        const currentContainer = containerRef.current;
        if (!currentContainer) return;

        const focusables = Array.from(
          currentContainer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => el.offsetParent !== null); // only visible elements

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !currentContainer.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !currentContainer.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // 4. On unmount or modal close: restore focus to the previous active element
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocusedElementRef.current && typeof previouslyFocusedElementRef.current.focus === 'function') {
        previouslyFocusedElementRef.current.focus();
      }
    };
  }, [isOpen, onClose, disableEscape]);

  return containerRef;
}
