import fs from 'fs';
import path from 'path';

// Define the file path for the persistent ledger
// In a real network, this would be a LevelDB/RocksDB folder
const STORAGE_FILE = path.join(process.cwd(), 'alumni-chain.json');

export class Storage {
  /**
   * Saves the entire blockchain state to disk
   */
  static saveChain(chain) {
    try {
      const data = JSON.stringify(chain, null, 2);
      fs.writeFileSync(STORAGE_FILE, data, 'utf8');
      console.log('💾 Ledger securely flushed to disk.');
    } catch (err) {
      console.error('Failed to save blockchain to disk:', err.message);
    }
  }

  /**
   * Loads the blockchain state from disk if it exists
   */
  static loadChain() {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const data = fs.readFileSync(STORAGE_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (err) {
      console.error('Failed to load blockchain from disk:', err.message);
    }
    return null;
  }
  
  /**
   * Clears the persistent storage (useful for fresh network tests)
   */
  static clearStorage() {
      if (fs.existsSync(STORAGE_FILE)) {
          fs.unlinkSync(STORAGE_FILE);
      }
  }
}
