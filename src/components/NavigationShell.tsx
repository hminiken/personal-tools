// src/components/NavigationShell.tsx
'use client';

import { AppShell, Burger, Group, NavLink, Title, ActionIcon, ScrollArea, useComputedColorScheme, useMantineColorScheme, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconNeedleThread,
  IconHome,
  IconChevronLeft,
  IconCategory,
  IconMoon,
  IconSun,
  IconCoffee,
  IconTool
} from '@tabler/icons-react';
import { useWakeLock } from '@hooks/useWakeLock';
import { useEffect } from 'react';
import { useMediaQuery } from '@mantine/hooks';

// Header title for the current section. Matched by prefix so a detail page
// (/crafting/patterns/12) shows its section's title.
const PAGE_TITLES: [prefix: string, title: string][] = [
  ['/crafting/patterns', 'Pattern Library'],
  ['/crafting/projects', 'Active Projects'],
  ['/crafting/stash', 'Yarn Stash'],
  ['/crafting/media', 'Manage Media'],
  ['/crafting/references', 'References'],
  ['/misc', 'Misc Tools'],
];

const CRAFTING_LINKS = [
  { href: '/crafting/patterns', label: 'Patterns' },
  { href: '/crafting/projects', label: 'Projects' },
  { href: '/crafting/stash', label: 'Yarn Stash' },
  { href: '/crafting/media', label: 'Media' },
  { href: '/crafting/references', label: 'References' },
];

export default function NavigationShell({ children }: { children: React.ReactNode }) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const pathname = usePathname();

  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });

  const pageTitle = PAGE_TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? 'Command Center';

  // On phones the sidebar overlays the page, so close it after navigating.
  const isMobile = useMediaQuery('(max-width: 48em)'); // Mantine's 'sm' breakpoint
  useEffect(() => {
    if (isMobile) close();
  }, [pathname, close, isMobile]);

  const { isAwake, setIsAwake, isSupported } = useWakeLock();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 260,
        breakpoint: 'sm',
        collapsed: { desktop: !opened, mobile: !opened }
      }}
      pl={{ base: "xs", sm: "xl" }}
      pr={{ base: "xs", sm: "xl" }}
    >
      <AppShell.Header bg="olive.8">
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger color="neutrals.1" opened={opened} onClick={toggle} size="sm" />
            <Title c="neutrals.1" order={3}>{pageTitle}</Title>
          </Group>

          <Group>
            {/* Keep-awake toggle (only where the Wake Lock API exists) */}
            {isSupported && (
              <Tooltip label={isAwake ? "Allow screen to sleep" : "Keep screen awake"} withArrow>
                <ActionIcon
                  onClick={() => setIsAwake(!isAwake)}
                  variant={isAwake ? "light" : "default"}
                  color={isAwake ? "mustard" : "gray"}
                  size="lg"
                  aria-label="Toggle screen wake lock"
                >
                  <IconCoffee stroke={1.5} />
                </ActionIcon>
              </Tooltip>
            )}

            <ActionIcon
              onClick={() => setColorScheme(computedColorScheme === 'light' ? 'dark' : 'light')}
              variant="default"
              size="lg"
              aria-label="Toggle color scheme"
            >
              <IconSun stroke={1.5} className="mantine-light-hidden" />
              <IconMoon stroke={1.5} className="mantine-dark-hidden" />
            </ActionIcon>
          </Group>

        </Group>
      </AppShell.Header>

      <AppShell.Navbar>
        {/* TOP BAR OF THE SIDEBAR (Logo and Close Button) */}
        <AppShell.Section>
          <Group justify="space-between" p="md">
            <IconCategory size={28} stroke={1.5} color="var(--mantine-color-olive-6)" />
            <ActionIcon onClick={close} variant="subtle" color="gray" aria-label="Close menu">
              <IconChevronLeft size={20} />
            </ActionIcon>
          </Group>
        </AppShell.Section>

        {/* SCROLLABLE LINKS AREA */}
        <AppShell.Section grow component={ScrollArea} p="md">
          <NavLink
            component={Link}
            href="/"
            label="Dashboard"
            leftSection={<IconHome size="1rem" stroke={1.5} />}
            active={pathname === '/'}
          />

          {/* Crafting submenu */}
          <NavLink
            label="Crochet & Crafting"
            leftSection={<IconNeedleThread size="1rem" stroke={1.5} />}
            childrenOffset={28}
            // Start expanded when you're on a crafting page
            defaultOpened={pathname.startsWith('/crafting')}
          >
            {CRAFTING_LINKS.map((link) => (
              <NavLink
                key={link.href}
                component={Link}
                href={link.href}
                label={link.label}
                active={pathname.startsWith(link.href)}
              />
            ))}
          </NavLink>

          <NavLink
            component={Link}
            href="/misc"
            label="Misc Tools"
            leftSection={<IconTool size="1rem" stroke={1.5} />}
            active={pathname.startsWith('/misc')}
          />
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}