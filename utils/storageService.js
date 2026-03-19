const ImageKit = require('@imagekit/nodejs');
const { toFile } = require('@imagekit/nodejs');

const imagekit = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
});

const saveFile = async (file, subfolder = '') => {
  try {
    const folder = subfolder ? `/riskmarshal/${subfolder}` : '/riskmarshal';
    const fileName = `${Date.now()}-${file.originalname}`;
    const uploadedFile = await toFile(file.buffer, fileName);
    const response = await imagekit.files.upload({
      file: uploadedFile,
      fileName,
      folder,
    });
    return response.url;
  } catch (error) {
    throw new Error(`File save failed: ${error.message}`);
  }
};

const saveBuffer = async (buffer, filename, subfolder = '') => {
  try {
    const folder = subfolder ? `/riskmarshal/${subfolder}` : '/riskmarshal';
    const uploadedFile = await toFile(buffer, filename);
    const response = await imagekit.files.upload({
      file: uploadedFile,
      fileName: filename,
      folder,
    });
    return response.url;
  } catch (error) {
    throw new Error(`Buffer save failed: ${error.message}`);
  }
};

const deleteFile = async (fileId) => {
  try {
    await imagekit.files.delete(fileId);
    return true;
  } catch (error) {
    throw new Error(`File deletion failed: ${error.message}`);
  }
};

module.exports = {
  saveFile,
  saveBuffer,
  deleteFile,
};
