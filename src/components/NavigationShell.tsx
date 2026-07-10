// src/components/NavigationShell.tsx
'use client';

import { AppShell, Burger, Group, NavLink, Title, ActionIcon, ScrollArea, useComputedColorScheme, useMantineColorScheme, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  IconNeedleThread,
  IconBook,
  IconHome,
  IconCurrencyDollar,
  IconChevronLeft,
  IconCategory,
  IconMoon,
  IconSun,
  IconCoffee
} from '@tabler/icons-react';
import { useWakeLock } from '@hooks/useWakeLock';
import { useEffect } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import { usePageTitleSuffix } from '@/components/PageTitleContext';

export default function NavigationShell({ children }: { children: React.ReactNode }) {
  // Start the sidebar closed by default
  const [opened, { toggle, close }] = useDisclosure(false);
  const pathname = usePathname();
  const { suffix } = usePageTitleSuffix();

  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });

  const getPageTitle = () => {
    // If the URL is exactly the root, or maybe a dashboard
    if (pathname === '/') return 'Command Center';
    
    // We use .includes() so that both the gallery (/patterns) 
    // AND the individual item (/patterns/1) show the correct category!
    if (pathname.includes('/crafting/patterns')) return 'Pattern Library';
    if (pathname.includes('/crafting/projects')) return 'Active Projects';
    if (pathname.includes('/crafting/stash')) return 'Yarn Stash'; // Just in case you add this later!
    if (pathname.includes('/crafting/media')) return 'Manage Media'; // Just in case you add this later!
    if (pathname.includes('/crafting/references')) return 'References';
    if (pathname.startsWith('/writing')) return suffix ? `Writing Desk - ${suffix}` : 'Writing Desk';

    return 'Command Center'; // A safe fallback
  };
const isMobile = useMediaQuery('(max-width: 48em)'); // matches 'sm' breakpoint

useEffect(() => {
  if (isMobile) {
    close();
  }
}, [pathname, close, isMobile]);
  
  const { isAwake, setIsAwake, isSupported } = useWakeLock();

  // Writing Desk is meant to feel full-screen, app-like — no site chrome up
  // top. Its own pages provide back navigation; the dark mode toggle moves
  // into the board settings drawer (see BoardView).
  const isWriting = pathname.startsWith('/writing');

  return (
    <AppShell
      header={{ height: isWriting ? 0 : 60 }}
      navbar={{
        width: 260,
        breakpoint: 'sm',
       collapsed: { desktop: !opened, mobile: !opened }
      }}
      pl={{ base: 'xs', sm: 'xl'}}
      pr={{ base: 'xs', sm: 'xl'}}
    >
     {!isWriting && (
       <AppShell.Header bg={"olive.8"}>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger color={"neutrals.1"} opened={opened} onClick={toggle} size="sm" />
            <Title c={"neutrals.1"} order={3}>{getPageTitle()}</Title>
          </Group>

          <Group>
            {/* 3. Add the Keep Awake Toggle (Only renders if the browser supports it) */}
            {isSupported && (
              <Tooltip label={isAwake ? "Allow screen to sleep" : "Keep screen awake"} withArrow>
                <ActionIcon
                  onClick={() => setIsAwake(!isAwake)}
                  variant={isAwake ? "light" : "default"}
                  color={isAwake ? "orange" : "gray"}
                  size="lg"
                  aria-label="Toggle screen wake lock"
                >
                  <IconCoffee stroke={1.5} />
                </ActionIcon>
              </Tooltip>
            )}

            {/* Your Dark Mode Toggle */}
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
     )}

      <AppShell.Navbar>
        {/* TOP BAR OF THE SIDEBAR (Logo and Close Button) */}
        <AppShell.Section>
          <Group justify="space-between" p="md">
            <IconCategory size={28} stroke={1.5} color="olive" />
            <ActionIcon onClick={close} variant="subtle" color="gray">
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
          
    {/* --- NESTED CRAFTING MENU --- */}
          <NavLink 
            label="Crochet & Crafting" 
            leftSection={<IconNeedleThread size="1rem" stroke={1.5} />} 
            childrenOffset={28} // This creates that nice indentation for the sub-links
            // This keeps the folder open if you are currently on any page inside it
            defaultOpened={pathname.startsWith('/crafting')} 
          >
            <NavLink 
              component={Link} 
              href="/crafting/patterns" 
              label="Patterns" 
              active={pathname.includes('/patterns')}
            />
            <NavLink 
              component={Link} 
              href="/crafting/projects" // You can create this route later!
              label="Projects" 
              active={pathname.includes('/projects')}
            />
            <NavLink 
              component={Link} 
              href="/crafting/stash" 
              label="Yarn Stash" 
              active={pathname.includes('/stash')}
            />
             <NavLink
              component={Link}
              href="/crafting/media"
              label="Media"
              active={pathname.includes('/media')}
            />
             <NavLink
              component={Link}
              href="/crafting/references"
              label="References"
              active={pathname.includes('/references')}
            />
          </NavLink>

          <NavLink 
            component={Link} 
            href="/writing" 
            label="Writing Desk" 
            leftSection={<IconBook size="1rem" stroke={1.5} />} 
            active={pathname.startsWith('/writing')}
          />

          <NavLink 
            component={Link} 
            href="/budget" 
            label="Budget" 
            leftSection={<IconCurrencyDollar size="1rem" stroke={1.5} />} 
            active={pathname.startsWith('/budget')}
          />
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}