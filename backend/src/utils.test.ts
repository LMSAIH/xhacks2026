import { describe, it, expect } from 'vitest';

function splitIntoSentences(text: string): string[] {
  return text
    .replace(/([.!?])\s+/g, '$1|')
    .split('|')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

describe('splitIntoSentences', () => {
  describe('basic splitting', () => {
    it('should split single sentence with period', () => {
      const result = splitIntoSentences('Hello world.');
      expect(result).toEqual(['Hello world.']);
    });

    it('should split single sentence with question mark', () => {
      const result = splitIntoSentences('How are you?');
      expect(result).toEqual(['How are you?']);
    });

    it('should split single sentence with exclamation mark', () => {
      const result = splitIntoSentences('Wow great!');
      expect(result).toEqual(['Wow great!']);
    });
  });

  describe('multiple sentences', () => {
    it('should split two sentences', () => {
      const result = splitIntoSentences('Hello. Goodbye.');
      expect(result).toEqual(['Hello.', 'Goodbye.']);
    });

    it('should split three sentences', () => {
      const result = splitIntoSentences('One. Two. Three.');
      expect(result).toEqual(['One.', 'Two.', 'Three.']);
    });

    it('should split sentences with different punctuation', () => {
      const result = splitIntoSentences('First! Second? Third.');
      expect(result).toEqual(['First!', 'Second?', 'Third.']);
    });
  });

  describe('whitespace handling', () => {
    it('should handle multiple spaces between sentences', () => {
      const result = splitIntoSentences('Hello.   World.');
      expect(result).toEqual(['Hello.', 'World.']);
    });

    it('should handle tabs between sentences', () => {
      const result = splitIntoSentences('Hello.\tWorld.');
      expect(result).toEqual(['Hello.', 'World.']);
    });

    it('should handle newlines between sentences', () => {
      const result = splitIntoSentences('Hello.\nWorld.');
      expect(result).toEqual(['Hello.', 'World.']);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = splitIntoSentences('');
      expect(result).toEqual([]);
    });

    it('should handle string with only spaces', () => {
      const result = splitIntoSentences('     ');
      expect(result).toEqual([]);
    });

    it('should preserve punctuation-only strings', () => {
      const result = splitIntoSentences('...');
      expect(result).toEqual(['...']);
    });

    it('should handle trailing whitespace', () => {
      const result = splitIntoSentences('Hello.   ');
      expect(result).toEqual(['Hello.']);
    });

    it('should handle leading whitespace', () => {
      const result = splitIntoSentences('   Hello.');
      expect(result).toEqual(['Hello.']);
    });

    it('should handle sentence without ending punctuation', () => {
      const result = splitIntoSentences('Hello world');
      expect(result).toEqual(['Hello world']);
    });
  });

  describe('real-world examples', () => {
    it('should handle AI tutor response', () => {
      const response = 'A variable is a named container for storing data. You can think of it like a labeled box.';
      const result = splitIntoSentences(response);
      expect(result).toEqual([
        'A variable is a named container for storing data.',
        'You can think of it like a labeled box.',
      ]);
    });

    it('should handle question and answer', () => {
      const text = 'What is a function? A function is a reusable block of code.';
      const result = splitIntoSentences(text);
      expect(result).toEqual([
        'What is a function?',
        'A function is a reusable block of code.',
      ]);
    });

    it('should split sentences with standard punctuation', () => {
      const text = 'I.e. means "for example". etc.';
      const result = splitIntoSentences(text);
      expect(result).toEqual([
        'I.e.',
        'means "for example".',
        'etc.',
      ]);
    });
  });
});

describe('Audio Chunk Calculation', () => {
  const CHUNK_SIZE = 8192;

  function calculateChunkCount(totalBytes: number): number {
    return Math.ceil(totalBytes / CHUNK_SIZE);
  }

  it('should return 0 for 0 bytes', () => {
    expect(calculateChunkCount(0)).toBe(0);
  });

  it('should return 1 for exactly one chunk size', () => {
    expect(calculateChunkCount(CHUNK_SIZE)).toBe(1);
  });

  it('should return 1 for small data', () => {
    expect(calculateChunkCount(100)).toBe(1);
    expect(calculateChunkCount(1000)).toBe(1);
    expect(calculateChunkCount(8000)).toBe(1);
  });

  it('should return 2 for just over one chunk', () => {
    expect(calculateChunkCount(CHUNK_SIZE + 1)).toBe(2);
  });

  it('should return correct count for multiple chunks', () => {
    expect(calculateChunkCount(CHUNK_SIZE * 2)).toBe(2);
    expect(calculateChunkCount(CHUNK_SIZE * 3)).toBe(3);
    expect(calculateChunkCount(CHUNK_SIZE * 10)).toBe(10);
  });

  it('should handle large audio files', () => {
    expect(calculateChunkCount(100000)).toBe(13);
    expect(calculateChunkCount(500000)).toBe(62);
  });
});

describe('Base64 Encoding', () => {
  function toBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function fromBase64(base64: string): Uint8Array {
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  }

  it('should encode and decode empty buffer', () => {
    const original = new ArrayBuffer(0);
    const encoded = toBase64(original);
    const decoded = fromBase64(encoded);
    expect(decoded.length).toBe(0);
  });

  it('should encode and decode ASCII text', () => {
    const original = new TextEncoder().encode('Hello, World!');
    const encoded = toBase64(original.buffer as ArrayBuffer);
    const decoded = fromBase64(encoded);
    expect(new TextDecoder().decode(decoded)).toBe('Hello, World!');
  });

  it('should handle binary audio data', () => {
    const original = new Uint8Array(100);
    for (let i = 0; i < 100; i++) {
      original[i] = Math.floor(Math.random() * 256);
    }
    const encoded = toBase64(original.buffer as ArrayBuffer);
    const decoded = fromBase64(encoded);
    expect(decoded).toEqual(original);
  });

  it('should preserve byte values exactly', () => {
    const original = new Uint8Array([0, 127, 255]);
    const encoded = toBase64(original.buffer as ArrayBuffer);
    const decoded = fromBase64(encoded);
    expect(decoded).toEqual(original);
  });
});
