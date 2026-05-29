// src/utils/patternHighlighter.ts

function splitByCommasOutsideBrackets(htmlText: string, delimiters = [':', ';', '.', ',']) {
  const result: string[] = [];
  let currentPart = '';
  let inTag = false;
  let parenDepth = 0;
  let bracketDepth = 0;

  for (let i = 0; i < htmlText.length; i++) {
    const char = htmlText[i];

    if (char === '<') inTag = true;
    else if (char === '>') inTag = false;
    else if (char === '(') parenDepth++;
    else if (char === ')') parenDepth--;
    else if (char === '[') bracketDepth++;
    else if (char === ']') bracketDepth--;

    currentPart += char;

    // Check for delimiters outside HTML tags and brackets/parentheses
    if (!inTag && parenDepth === 0 && bracketDepth === 0 && delimiters.includes(char)) {
      result.push(currentPart.trim());
      currentPart = '';
    }
  }

  if (currentPart.trim() !== '') {
    result.push(currentPart.trim());
  }
  return result;
}
// Add colorScheme as the second parameter
export function processWholePattern(multilinePattern: string, colorScheme: 'light' | 'dark' | string): string {
  if (!multilinePattern) return '';

  // 1. Define your two palettes!
  const lightColors = ["#c23b53", "#8658d6", "#2a9d8f", "#b57d22", "#3b6cb5"]; 
  const darkColors = ["#f7768e", "#bb9af7", "#73daca", "#e0af68", "#7aa2f7"];
  
  // 2. Pick the active palette based on the parameter
  const activeColors = colorScheme === 'dark' ? darkColors : lightColors;
  
  const roundColor = colorScheme === 'dark' ? "#7aa2f7" : "var(--mantine-color-blue-filled)"; 
  const astColor = "#002254"; 
  const astBg = colorScheme === 'dark' ? "#e0af68" : "#fff89a"; // Change the highlight background for dark mode too!

  const lines = multilinePattern.split(/<br\s*\/?>|<BR\s*\/?>|<p\s*\/?>|<\/p>/);
  
  const processedLines = lines.map(line => {
    const index = line.indexOf(":");
    if (index === -1) return line;
    if (line.includes("<img")) return line;

    const roundTitle = line.slice(0, index);
    const stepsPart = line.slice(index + 1);

    const highlightedTitle = `<span style="color: ${roundColor};">${roundTitle.trim()}:</span>`;
    if (!stepsPart) return highlightedTitle;

    const steps = splitByCommasOutsideBrackets(stepsPart.trim());

    let highlightedSteps = '';
    if (steps.length > 0) {
      highlightedSteps = steps.map((step, index) => {
        // 3. Use the active colors array here
        const color = activeColors[index % activeColors.length];
        return `<span style="color: ${color};">${step}</span>`;
      }).join(" ");
    }

    const fullyHighlightedSteps = highlightedSteps.replace(/\*/g, match => {
      return `<span style="background-color: ${astBg}; color: ${astColor}; padding: 0 4px; border-radius: 3px;">${match}</span>`;
    });

    return `${highlightedTitle} ${fullyHighlightedSteps}`;
  });

  return processedLines.filter(line => line.trim() !== '').join("<br>");
}