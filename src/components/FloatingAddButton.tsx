import { Affix, ActionIcon, Text, Paper, Box } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';

export function FloatingAddButton({ onClick, text, botOffset = 0 , color = 'olive.5'}: { onClick: () => void; text: string; botOffset?: number, color?: string }) {
  return (
    <Affix position={{ bottom: 30 + botOffset, right: 30 }} zIndex={200}>
      <Paper
        onClick={onClick}
        className="fab-container"
        shadow="lg"
        bg={color}
        radius="xl"
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          overflow: 'hidden',
          height: '36px',
          width: '36px', // Start as a circle
          transition: 'width 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        {/* Icon stays anchored here */}
        <Box style={{ minWidth: '36px', display: 'flex', justifyContent: 'center' }}>
          <IconPlus size={24} color="white" />
        </Box>

        {/* Text sits to the right, hidden until hover */}
        <Text 
          c="white" 
          fw={600} 
          style={{ 
            whiteSpace: 'nowrap', 
            paddingRight: '20px',
            opacity: 0,
            transition: 'opacity 0.2s' 
          }}
        >
          {text}
        </Text>
      </Paper>

      <style jsx global>{`
        .fab-container:hover {
          width: auto !important;
        }
        .fab-container:hover p {
          opacity: 1 !important;
        }
      `}</style>
    </Affix>
  );
}