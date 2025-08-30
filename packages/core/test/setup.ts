import path from 'path';
import fs from 'fs';

// Create test directories if they don't exist
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
    console.warn(`Could not create directory ${dirPath}:`, error);
  }
});

// Test utilities
export const createTestFile = (filename: string, content: string): string => {
  const dirPath = path.join(__dirname, '..', 'test-temp');
  const filePath = path.join(dirPath, filename);
  
  // Ensure directory exists
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  fs.writeFileSync(filePath, content);
  return filePath;
};

export const cleanupTestFiles = (): void => {
  // Don't clean up automatically - let Jest handle this
  // This prevents files from being deleted between tests
};

export const cleanupAllTestFiles = (): void => {
  const testTemp = path.join(__dirname, '..', 'test-temp');
  if (fs.existsSync(testTemp)) {
    try {
      fs.rmSync(testTemp, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors if files are locked
      console.warn('Could not clean up test files:', error);
    }
  }
};

export const getTestFilePath = (filename: string): string => {
  const dirPath = path.join(__dirname, '..', 'test-temp');
  
  // Ensure directory exists
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  return path.join(dirPath, filename);
};
