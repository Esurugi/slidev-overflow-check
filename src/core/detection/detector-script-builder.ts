import { DetectionConfig } from '../../types';

export interface DetectionBundle {
  textOverflow: unknown[];
  elementOverflow: unknown[];
  scrollbar: unknown[];
}

export function buildDetectorScript(config: DetectionConfig): string {
  const payload = JSON.stringify({
    exclude: config.exclude,
    threshold: config.threshold,
    textOverflow: config.textOverflow,
    elementOverflow: config.elementOverflow,
    scrollbar: config.scrollbar,
  });

  return `() => {
    const cfg = ${payload};

    const getSelector = (element) => {
      let selector = element.tagName.toLowerCase();
      if (element.id) {
        selector += '#' + element.id;
      } else if (element.className && typeof element.className === 'string') {
        const classes = element.className.trim().split(/\\s+/);
        if (classes.length > 0 && classes[0]) {
          selector += '.' + classes.join('.');
        }
      }
      return selector;
    };

    const resolveActiveSlide = () => {
      let activeSlidePage = document.querySelector('.slidev-page.active');
      if (!activeSlidePage) {
        const urlMatch = window.location.pathname.match(/\\/(\\d+)/) || window.location.hash.match(/#?(\\d+)/);
        if (urlMatch) {
          const slideNum = parseInt(urlMatch[1], 10);
          activeSlidePage = document.querySelector('.slidev-page-' + slideNum) || document.querySelector('[data-slidev-no="' + slideNum + '"]');
        }
      }

      if (!activeSlidePage) {
        const allSlides = document.querySelectorAll('.slidev-page');
        for (const slide of Array.from(allSlides)) {
          const rect = slide.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            activeSlidePage = slide;
            break;
          }
        }
      }

      return activeSlidePage || document.querySelector('.slidev-page');
    };

    const shouldSkip = (element) => {
      for (const selector of cfg.exclude) {
        if (element.matches(selector) || element.closest(selector)) {
          return true;
        }
      }
      return false;
    };

    const isElementVisible = (el) => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      if (el.classList.contains('slidev-vclick-hidden') || el.closest('.slidev-vclick-hidden')) return false;
      return true;
    };

    const activeSlidePage = resolveActiveSlide();
    if (!activeSlidePage) {
      return { textOverflow: [], elementOverflow: [], scrollbar: [] };
    }

    const slideLayout = activeSlidePage.querySelector('.slidev-layout') || document.querySelector('.slidev-layout');
    if (!slideLayout) {
      return { textOverflow: [], elementOverflow: [], scrollbar: [] };
    }

    const slideContent = document.querySelector('.slidev-slide-content') || document.querySelector('#slide-content');
    const slideRect = slideContent ? slideContent.getBoundingClientRect() : slideLayout.getBoundingClientRect();
    const slideBounds = { left: slideRect.left, top: slideRect.top, right: slideRect.right, bottom: slideRect.bottom };

    const textOverflow = [];
    const elementOverflow = [];
    const scrollbar = [];

    const allElements = slideLayout.querySelectorAll('*');
    allElements.forEach((element) => {
      if (shouldSkip(element)) return;

      if (cfg.textOverflow) {
        const computed = window.getComputedStyle(element);
        const hasOverflowHidden = computed.overflow === 'hidden' || computed.overflowX === 'hidden' || computed.overflowY === 'hidden' || computed.textOverflow === 'ellipsis';

        let overflowX = 0;
        let overflowY = 0;
        let containerWidth = element.clientWidth;
        let containerHeight = element.clientHeight;
        let contentWidth = element.scrollWidth;
        let contentHeight = element.scrollHeight;

        if (hasOverflowHidden) {
          overflowX = Math.max(0, contentWidth - containerWidth);
          overflowY = Math.max(0, contentHeight - containerHeight);
        } else {
          const textNodes = [];
          for (const node of Array.from(element.childNodes)) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent && node.textContent.trim()) {
              textNodes.push(node);
            }
          }

          if (textNodes.length > 0) {
            const range = document.createRange();
            range.selectNodeContents(element);
            const rangeRect = range.getBoundingClientRect();
            overflowX = Math.max(0, rangeRect.right - slideRect.right);
            overflowY = Math.max(0, rangeRect.bottom - slideRect.bottom);
            containerWidth = slideRect.width;
            containerHeight = slideRect.height;
            contentWidth = rangeRect.width;
            contentHeight = rangeRect.height;
          }
        }

        if (overflowX > cfg.threshold) {
          let overflowingText = '';
          for (const node of Array.from(element.childNodes)) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent && node.textContent.trim()) {
              overflowingText += node.textContent.trim() + ' ';
            }
          }
          overflowingText = overflowingText.trim() || (element.textContent || '').trim() || '';

          textOverflow.push({
            type: 'text-overflow',
            element: {
              tag: element.tagName.toLowerCase(),
              class: element.className || undefined,
              id: element.id || undefined,
              selector: getSelector(element),
              text: overflowingText.substring(0, 100) || undefined,
            },
            details: {
              containerWidth,
              containerHeight,
              contentWidth,
              contentHeight,
              overflowX,
              overflowY,
            },
          });
        }
      }

      if (cfg.elementOverflow && isElementVisible(element)) {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 || rect.height > 0) {
          const overflowLeft = Math.max(0, slideBounds.left - rect.left);
          const overflowTop = Math.max(0, slideBounds.top - rect.top);
          const overflowRight = Math.max(0, rect.right - slideBounds.right);
          const overflowBottom = Math.max(0, rect.bottom - slideBounds.bottom);

          if (overflowLeft > cfg.threshold || overflowTop > cfg.threshold || overflowRight > cfg.threshold || overflowBottom > cfg.threshold) {
            const tag = element.tagName.toLowerCase();
            const entry = {
              type: 'element-overflow',
              element: {
                tag,
                class: element.className || undefined,
                id: element.id || undefined,
                selector: getSelector(element),
                text: (element.textContent || '').trim().substring(0, 100) || undefined,
              },
              details: {
                slideBounds,
                elementBounds: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
                overflow: { left: overflowLeft, top: overflowTop, right: overflowRight, bottom: overflowBottom },
              },
            };

            if (tag === 'img') {
              entry.element.src = element.src;
            }

            elementOverflow.push(entry);
          }
        }
      }

      if (cfg.scrollbar) {
        const computed = window.getComputedStyle(element);
        const overflowX = computed.overflowX;
        const overflowY = computed.overflowY;

        const hasVerticalScrollbar = element.scrollHeight > element.clientHeight;
        const hasHorizontalScrollbar = element.scrollWidth > element.clientWidth;
        const showsVertical = hasVerticalScrollbar && (overflowY === 'scroll' || overflowY === 'auto');
        const showsHorizontal = hasHorizontalScrollbar && (overflowX === 'scroll' || overflowX === 'auto');

        if (showsVertical || showsHorizontal) {
          const scrollbarType = showsVertical && showsHorizontal ? 'both' : showsVertical ? 'vertical' : 'horizontal';
          const overflow = scrollbarType === 'vertical'
            ? element.scrollHeight - element.clientHeight
            : scrollbarType === 'horizontal'
            ? element.scrollWidth - element.clientWidth
            : Math.max(element.scrollHeight - element.clientHeight, element.scrollWidth - element.clientWidth);

          scrollbar.push({
            type: 'scrollbar',
            element: {
              tag: element.tagName.toLowerCase(),
              class: element.className || undefined,
              id: element.id || undefined,
              selector: getSelector(element),
            },
            details: {
              scrollbarType,
              containerWidth: element.clientWidth,
              containerHeight: element.clientHeight,
              contentWidth: element.scrollWidth,
              contentHeight: element.scrollHeight,
              overflow,
            },
          });
        }
      }
    });

    return { textOverflow, elementOverflow, scrollbar };
  }`;
}
