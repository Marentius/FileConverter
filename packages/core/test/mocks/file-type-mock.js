module.exports = {
  fileTypeFromFile: jest.fn().mockResolvedValue({
    ext: 'txt',
    mime: 'text/plain'
  }),
  fileTypeFromBuffer: jest.fn().mockResolvedValue({
    ext: 'txt',
    mime: 'text/plain'
  })
};
