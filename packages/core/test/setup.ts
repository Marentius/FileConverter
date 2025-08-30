import path from 'path';
import fs from 'fs';

// Opprett test-mapper hvis de ikke eksisterer
const testDirs = [
  'test-output',
  'test-temp',
  'test-artifacts'
];

testDirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (error) {
    console.warn(`Kunne ikke opprette mappe ${dirPath}:`, error);
  }
});

// Mock console.log for renere test-output (kun i test-miljø)
if (typeof jest !== 'undefined') {
  global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Test utilities
export const createTestFile = (filename: string, content: string): string => {
  const dirPath = path.join(__dirname, '..', 'test-temp');
  const filePath = path.join(dirPath, filename);
  
  // Sikre at mappen eksisterer
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  fs.writeFileSync(filePath, content);
  return filePath;
};

export const cleanupTestFiles = (): void => {
  // Ikke rydd opp automatisk - la Jest håndtere dette
  // Dette forhindrer at filer slettes mellom testene
};

export const cleanupAllTestFiles = (): void => {
  const testTemp = path.join(__dirname, '..', 'test-temp');
  if (fs.existsSync(testTemp)) {
    try {
      fs.rmSync(testTemp, { recursive: true, force: true });
    } catch (error) {
      // Ignorer feil hvis filer er låst
      console.warn('Kunne ikke rydde opp test-filer:', error);
    }
  }
};

export const getTestFilePath = (filename: string): string => {
  const dirPath = path.join(__dirname, '..', 'test-temp');
  
  // Sikre at mappen eksisterer
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  return path.join(dirPath, filename);
};
