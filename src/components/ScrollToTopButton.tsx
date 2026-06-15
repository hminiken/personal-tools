'use client';

import { Affix, Transition, ActionIcon } from '@mantine/core';
import { useWindowScroll } from '@mantine/hooks';
import { IconArrowUp } from '@tabler/icons-react';

// Floating "jump to top" button. Appears once the page is scrolled down a bit
// and smooth-scrolls back to the top when clicked.
export function ScrollToTopButton() {
  const [scroll, scrollTo] = useWindowScroll();

  return (
    <Affix position={{ bottom: 20, right: 20 }}>
      <Transition transition="slide-up" mounted={scroll.y > 300}>
        {(styles) => (
          <ActionIcon
            style={styles}
            onClick={() => scrollTo({ y: 0 })}
            size="xl"
            radius="xl"
            color="olive.7"
            variant="filled"
            aria-label="Scroll to top"
          >
            <IconArrowUp size={22} />
          </ActionIcon>
        )}
      </Transition>
    </Affix>
  );
}
