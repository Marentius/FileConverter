const chalkMock = {
  bold: (text) => text,
  blue: (text) => text,
  green: (text) => text,
  red: (text) => text,
  cyan: (text) => text,
  yellow: (text) => text,
  gray: (text) => text,
  white: (text) => text
};

// Legg til nested properties
chalkMock.bold.blue = (text) => text;
chalkMock.bold.green = (text) => text;
chalkMock.bold.red = (text) => text;
chalkMock.bold.cyan = (text) => text;
chalkMock.bold.yellow = (text) => text;
chalkMock.green.bold = (text) => text;
chalkMock.red.bold = (text) => text;
chalkMock.blue.bold = (text) => text;

module.exports = chalkMock;
